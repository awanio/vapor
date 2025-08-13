//go:build linux && libvirt
// +build linux,libvirt

package libvirt

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/xml"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"libvirt.org/go/libvirt"
)

// Service provides libvirt VM management functionality
type Service struct {
	conn            *libvirt.Connect
	mu              sync.RWMutex
	metricsStop     chan struct{}
	templates       map[string]*Template
	db              *sql.DB // Optional database for tracking
	TemplateService *VMTemplateService
}

// NewService creates a new libvirt service
func NewService(uri string) (*Service, error) {
	if uri == "" {
		uri = "qemu:///system"
	}

	conn, err := libvirt.NewConnect(uri)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to libvirt: %w", err)
	}

	// Verify connection
	alive, err := conn.IsAlive()
	if err != nil || !alive {
		conn.Close()
		return nil, fmt.Errorf("libvirt connection is not alive")
	}

	s := &Service{
		conn:        conn,
		metricsStop: make(chan struct{}),
		templates:   make(map[string]*Template),
	}

	// Load default templates
	s.loadDefaultTemplates()

	return s, nil
}

// Close closes the libvirt connection
func (s *Service) Close() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.metricsStop != nil {
		close(s.metricsStop)
	}

	if s.conn != nil {
		_, err := s.conn.Close()
		return err
	}
	return nil
}

// SetDatabase sets the database connection for the service
func (s *Service) SetDatabase(db *sql.DB) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.db = db
	// Initialize TemplateService with database
	if db != nil {
		s.TemplateService = NewVMTemplateService(db)
	}
}

// CreateBackup creates a backup of a VM.
func (s *Service) CreateBackup(ctx context.Context, nameOrUUID string, req *VMBackupRequest) (*VMBackup, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	domain, err := s.lookupDomain(nameOrUUID)
	if err != nil {
		return nil, err
	}
	defer domain.Free()

	vm, err := s.domainToVM(domain)
	if err != nil {
		return nil, err
	}

	// Generate a unique backup ID
	backupID, err := generateRandomID(16)
	if err != nil {
		return nil, fmt.Errorf("failed to generate backup ID: %w", err)
	}

	destPath := req.DestinationPath
	if destPath == "" {
		destPath = filepath.Join("/var/lib/libvirt/vapor-backups", vm.Name)
		if err := os.MkdirAll(destPath, 0755); err != nil {
			return nil, fmt.Errorf("failed to create default backup directory: %w", err)
		}
	}

	backup := &VMBackup{
		ID:              backupID,
		VMUUID:          vm.UUID,
		VMName:          vm.Name,
		Type:            req.Type,
		Status:          BackupStatusRunning,
		DestinationPath: destPath,
		Compression:     req.Compression,
		Encryption:      req.Encryption,
		StartedAt:       time.Now(),
	}

	// Store initial backup record in DB
	if s.db != nil {
		if err := s.saveBackupRecord(backup); err != nil {
			return nil, fmt.Errorf("failed to create initial backup record: %w", err)
		}
	}

	// Run backup asynchronously
	go s.runBackupJob(domain, backup, req)

	return backup, nil
}

// ListBackups lists all backups for a specific VM.
func (s *Service) ListBackups(ctx context.Context, nameOrUUID string) ([]VMBackup, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database is not configured")
	}

	vm, err := s.GetVM(ctx, nameOrUUID)
	if err != nil {
		return nil, err
	}

	rows, err := s.db.QueryContext(ctx, "SELECT id, vm_uuid, vm_name, type, status, destination_path, size_bytes, compression, encryption, parent_backup_id, started_at, completed_at, error_message, retention_days FROM vm_backups WHERE vm_uuid = ? ORDER BY started_at DESC", vm.UUID)
	if err != nil {
		return nil, fmt.Errorf("failed to query backups: %w", err)
	}
	defer rows.Close()

	backups := []VMBackup{}
	for rows.Next() {
		var b VMBackup
		var completedAt sql.NullTime
		var parentID sql.NullString
		var errMsg sql.NullString
		if err := rows.Scan(&b.ID, &b.VMUUID, &b.VMName, &b.Type, &b.Status, &b.DestinationPath, &b.SizeBytes, &b.Compression, &b.Encryption, &parentID, &b.StartedAt, &completedAt, &errMsg, &b.Retention); err != nil {
			return nil, fmt.Errorf("failed to scan backup row: %w", err)
		}
		if completedAt.Valid {
			b.CompletedAt = &completedAt.Time
		}
		if parentID.Valid {
			b.ParentBackupID = parentID.String
		}
		if errMsg.Valid {
			b.ErrorMessage = errMsg.String
		}
		backups = append(backups, b)
	}

	return backups, nil
}

func (s *Service) runBackupJob(domain *libvirt.Domain, backup *VMBackup, req *VMBackupRequest) {
	backupXML, err := s.generateBackupXML(domain, backup, req)
	if err != nil {
		backup.Status = BackupStatusFailed
		backup.ErrorMessage = fmt.Sprintf("failed to generate backup XML: %v", err)
		s.saveBackupRecord(backup)
		return
	}

	// Execute the backup
	if err := domain.BackupBegin(backupXML, 0); err != nil {
		backup.Status = BackupStatusFailed
		backup.ErrorMessage = fmt.Sprintf("backup operation failed: %v", err)
	} else {
		backup.Status = BackupStatusCompleted
	}

	now := time.Now()
	backup.CompletedAt = &now

	// In a real implementation, we would get the actual size
	backup.SizeBytes = 0 // Placeholder

	// Update the database record
	if s.db != nil {
		s.saveBackupRecord(backup)
	}
}

// ListPCIDevices lists all PCI devices available for passthrough
func (s *Service) ListPCIDevices(ctx context.Context) ([]PCIDevice, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	devices := []PCIDevice{}

	// Get node device list
	deviceNames, err := s.conn.ListAllNodeDevices(libvirt.CONNECT_LIST_NODE_DEVICES_CAP_PCI_DEV)
	if err != nil {
		return nil, fmt.Errorf("failed to list PCI devices: %w", err)
	}

	for _, dev := range deviceNames {
		device, err := s.pciDeviceToType(dev)
		if err != nil {
			continue // Skip devices we can't parse
		}
		devices = append(devices, *device)
		dev.Free()
	}

	// Update database with discovered devices if available
	if s.db != nil {
		s.updatePCIDevicesInDB(ctx, devices)
	}

	return devices, nil
}

// AttachPCIDevice attaches a PCI device to a VM
func (s *Service) AttachPCIDevice(ctx context.Context, vmName string, req *PCIPassthroughRequest) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	domain, err := s.lookupDomain(vmName)
	if err != nil {
		return fmt.Errorf("VM not found: %w", err)
	}
	defer domain.Free()

	// Check if device is available
	if s.db != nil {
		var isAvailable bool
		err := s.db.QueryRowContext(ctx, "SELECT is_available FROM pci_devices WHERE device_id = ?", req.DeviceID).Scan(&isAvailable)
		if err != nil {
			return fmt.Errorf("device not found: %w", err)
		}
		if !isAvailable {
			return fmt.Errorf("device is already assigned to another VM")
		}
	}

	// Parse PCI address if not provided
	pciAddr := req.PCIAddress
	if pciAddr == "" {
		// Get PCI address from device ID in database
		if s.db != nil {
			err := s.db.QueryRowContext(ctx, "SELECT pci_address FROM pci_devices WHERE device_id = ?", req.DeviceID).Scan(&pciAddr)
			if err != nil {
				return fmt.Errorf("failed to get PCI address: %w", err)
			}
		}
	}

	// Parse PCI address (format: 0000:01:00.0)
	parts := strings.Split(pciAddr, ":")
	if len(parts) != 3 {
		return fmt.Errorf("invalid PCI address format: %s", pciAddr)
	}
	funcParts := strings.Split(parts[2], ".")
	if len(funcParts) != 2 {
		return fmt.Errorf("invalid PCI address format: %s", pciAddr)
	}

	// Generate PCI passthrough XML
	pciXML := fmt.Sprintf(`
		<hostdev mode='subsystem' type='pci' managed='%s'>
			<source>
				<address domain='0x%s' bus='0x%s' slot='0x%s' function='0x%s'/>
			</source>
		</hostdev>
	`, boolToYesNo(req.Managed), parts[0], parts[1], funcParts[0], funcParts[1])

	// Attach the device
	if err := domain.AttachDevice(pciXML); err != nil {
		return fmt.Errorf("failed to attach PCI device: %w", err)
	}

	// Update database
	if s.db != nil {
		uuid, _ := domain.GetUUIDString()
		_, err = s.db.ExecContext(ctx, 
			"UPDATE pci_devices SET is_available = 0, assigned_to_vm = ? WHERE device_id = ?",
			uuid, req.DeviceID)
		if err != nil {
			fmt.Printf("Warning: failed to update PCI device assignment in DB: %v\n", err)
		}
	}

	return nil
}

// DetachPCIDevice detaches a PCI device from a VM
func (s *Service) DetachPCIDevice(ctx context.Context, vmName string, req *PCIDetachRequest) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	domain, err := s.lookupDomain(vmName)
	if err != nil {
		return fmt.Errorf("VM not found: %w", err)
	}
	defer domain.Free()

	// Parse PCI address if not provided
	pciAddr := req.PCIAddress
	if pciAddr == "" {
		// Get PCI address from device ID in database
		if s.db != nil {
			err := s.db.QueryRowContext(ctx, "SELECT pci_address FROM pci_devices WHERE device_id = ?", req.DeviceID).Scan(&pciAddr)
			if err != nil {
				return fmt.Errorf("failed to get PCI address: %w", err)
			}
		}
	}

	// Parse PCI address (format: 0000:01:00.0)
	parts := strings.Split(pciAddr, ":")
	if len(parts) != 3 {
		return fmt.Errorf("invalid PCI address format: %s", pciAddr)
	}
	funcParts := strings.Split(parts[2], ".")
	if len(funcParts) != 2 {
		return fmt.Errorf("invalid PCI address format: %s", pciAddr)
	}

	// Generate PCI detach XML
	pciXML := fmt.Sprintf(`
		<hostdev mode='subsystem' type='pci'>
			<source>
				<address domain='0x%s' bus='0x%s' slot='0x%s' function='0x%s'/>
			</source>
		</hostdev>
	`, parts[0], parts[1], funcParts[0], funcParts[1])

	// Detach the device
	if err := domain.DetachDevice(pciXML); err != nil {
		return fmt.Errorf("failed to detach PCI device: %w", err)
	}

	// Update database
	if s.db != nil {
		_, err = s.db.ExecContext(ctx, 
			"UPDATE pci_devices SET is_available = 1, assigned_to_vm = NULL WHERE device_id = ?",
			req.DeviceID)
		if err != nil {
			fmt.Printf("Warning: failed to update PCI device release in DB: %v\n", err)
		}
	}

	return nil
}

// HotplugResource performs hot-plug operations on VM resources
func (s *Service) HotplugResource(ctx context.Context, vmName string, req *HotplugRequest) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	domain, err := s.lookupDomain(vmName)
	if err != nil {
		return fmt.Errorf("VM not found: %w", err)
	}
	defer domain.Free()

	// Check if VM is running
	state, _, err := domain.GetState()
	if err != nil {
		return fmt.Errorf("failed to get VM state: %w", err)
	}
	if state != libvirt.DOMAIN_RUNNING {
		return fmt.Errorf("VM must be running for hot-plug operations")
	}

	switch req.ResourceType {
	case "cpu":
		return s.hotplugCPU(domain, req.Action, req.Config)
	case "memory":
		return s.hotplugMemory(domain, req.Action, req.Config)
	case "disk":
		return s.hotplugDisk(domain, req.Action, req.Config)
	case "network":
		return s.hotplugNetwork(domain, req.Action, req.Config)
	case "usb":
		return s.hotplugUSB(domain, req.Action, req.Config)
	default:
		return fmt.Errorf("unsupported resource type: %s", req.ResourceType)
	}
}

func (s *Service) saveBackupRecord(backup *VMBackup) error {
	if s.db == nil {
		return nil
	}

	var completedAt *time.Time
	if backup.CompletedAt != nil {
		completedAt = backup.CompletedAt
	}

	_, err := s.db.Exec(`
		INSERT OR REPLACE INTO vm_backups (
			backup_id, vm_uuid, vm_name, backup_type, status, 
			destination_path, size_bytes, compressed, encryption_type, 
			parent_backup_id, started_at, completed_at, error_message
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, backup.ID, backup.VMUUID, backup.VMName, backup.Type, backup.Status,
		backup.DestinationPath, backup.SizeBytes, backup.Compressed, backup.Encryption,
		backup.ParentBackupID, backup.StartedAt, completedAt, backup.ErrorMessage)

	return err
}

// generateBackupXML generates the XML for the backup operation
func (s *Service) generateBackupXML(domain *libvirt.Domain, backup *VMBackup, req *VMBackupRequest) (string, error) {
	// Get domain info
	name, err := domain.GetName()
	if err != nil {
		return "", fmt.Errorf("failed to get domain name: %w", err)
	}

	// Build backup XML
	backupXML := fmt.Sprintf(`
		<domainbackup mode='push'>
			<incremental>%s</incremental>
			<server transport='unix' socket='/var/run/libvirt/backup-%s.sock'/>
			<disks>
				<disk name='vda' backup='yes' type='file'>
					<target file='%s/%s-%s.qcow2'/>
					<driver type='qcow2'/>
				</disk>
			</disks>
		</domainbackup>
	`, backup.ParentBackupID, backup.ID, backup.DestinationPath, name, backup.ID)

	return backupXML, nil
}

// RestoreVMBackup restores a VM from a backup
func (s *Service) RestoreVMBackup(ctx context.Context, backupID string) (*VM, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database is not configured")
	}

	// Get backup info from database
	var backup VMBackup
	err := s.db.QueryRowContext(ctx, 
		"SELECT backup_id, vm_uuid, vm_name, destination_path FROM vm_backups WHERE backup_id = ?",
		backupID).Scan(&backup.ID, &backup.VMUUID, &backup.VMName, &backup.DestinationPath)
	if err != nil {
		return nil, fmt.Errorf("backup not found: %w", err)
	}

	// Create a new VM from the backup
	// This is a simplified implementation
	createReq := &VMCreateRequest{
		Name:     backup.VMName + "-restored",
		Memory:   2048, // Default values, should be read from backup metadata
		VCPUs:    2,
		DiskPath: fmt.Sprintf("%s/%s-%s.qcow2", backup.DestinationPath, backup.VMName, backup.ID),
	}

	return s.CreateVM(ctx, createReq)
        ON CONFLICT(id) DO UPDATE SET
            status = excluded.status,
            completed_at = excluded.completed_at,
            error_message = excluded.error_message,
            size_bytes = excluded.size_bytes
    `, backup.ID, backup.VMUUID, backup.VMName, backup.Type, backup.Status, backup.DestinationPath, backup.SizeBytes, backup.Compression, backup.Encryption, backup.ParentBackupID, backup.StartedAt, backup.CompletedAt, backup.ErrorMessage, backup.Retention)

	return err
}

func (s *Service) generateBackupXML(domain *libvirt.Domain, backup *VMBackup, req *VMBackupRequest) (string, error) {
	// This is a simplified example. A real implementation would be more complex,
	// handling disk lists, incremental points, etc.
	backupXML := fmt.Sprintf(`
		<domainbackup mode='%s'>
			<disks>
				<disk name='vda' type='file' backup='yes'>
					<target file='%s/%s.qcow2'/>
				</disk>
			</disks>
		</domainbackup>`, req.Type, backup.DestinationPath, backup.ID)

	return backupXML, nil
}

// ListVMs returns all VMs
func (s *Service) ListVMs(ctx context.Context) ([]VM, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	domains, err := s.conn.ListAllDomains(0)
	if err != nil {
		return nil, fmt.Errorf("failed to list domains: %w", err)
	}

	vms := make([]VM, 0, len(domains))
	for _, domain := range domains {
		vm, err := s.domainToVM(&domain)
		if err != nil {
			continue // Skip VMs we can't parse
		}
		vms = append(vms, *vm)
		domain.Free()
	}

	return vms, nil
}

// GetVM returns a specific VM by name or UUID
func (s *Service) GetVM(ctx context.Context, nameOrUUID string) (*VM, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	domain, err := s.lookupDomain(nameOrUUID)
	if err != nil {
		return nil, err
	}
	defer domain.Free()

	return s.domainToVM(domain)
}

// CreateVM creates a new virtual machine
func (s *Service) CreateVM(ctx context.Context, req *VMCreateRequest) (*VM, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Apply template settings if template is specified
	if req.Template != "" && s.TemplateService != nil {
		template, err := s.TemplateService.GetTemplateByName(ctx, req.Template)
		if err != nil {
			return nil, fmt.Errorf("failed to get template '%s': %w", req.Template, err)
		}

		// Apply template settings (only if not explicitly set in request)
		if err := s.applyTemplateToRequest(req, template); err != nil {
			return nil, fmt.Errorf("failed to apply template settings: %w", err)
		}
	}

	// Generate domain XML
	domainXML, err := s.generateDomainXML(req)
	if err != nil {
		return nil, fmt.Errorf("failed to generate domain XML: %w", err)
	}

	// Create the domain
	domain, err := s.conn.DomainDefineXML(domainXML)
	if err != nil {
		return nil, fmt.Errorf("failed to define domain: %w", err)
	}
	defer domain.Free()

	// Set autostart if requested
	if req.AutoStart {
		if err := domain.SetAutostart(true); err != nil {
			// Non-fatal error
			fmt.Printf("Warning: failed to set autostart: %v\n", err)
		}
	}

	// Create disk if needed
	if req.DiskSize > 0 && req.DiskPath == "" {
		poolName := req.StoragePool
		if poolName == "" {
			poolName = "default"
		}
		
		diskPath, err := s.createDisk(poolName, req.Name, req.DiskSize)
		if err != nil {
			// Clean up domain definition
			domain.Undefine()
			return nil, fmt.Errorf("failed to create disk: %w", err)
		}
		
		// Attach the disk
		if err := s.attachDisk(domain, diskPath, "vda"); err != nil {
			domain.Undefine()
			return nil, fmt.Errorf("failed to attach disk: %w", err)
		}
	}

	// Start the VM if ISO is not provided (assumes pre-installed disk)
	if req.ISOPath == "" && req.DiskPath != "" {
		if err := domain.Create(); err != nil {
			// Non-fatal - VM is created but not started
			fmt.Printf("Warning: failed to start VM: %v\n", err)
		}
	}

	return s.domainToVM(domain)
}

// UpdateVM updates VM configuration
func (s *Service) UpdateVM(ctx context.Context, nameOrUUID string, req *VMUpdateRequest) (*VM, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	domain, err := s.lookupDomain(nameOrUUID)
	if err != nil {
		return nil, err
	}
	defer domain.Free()

	// Check if VM is running
	state, _, err := domain.GetState()
	if err != nil {
		return nil, fmt.Errorf("failed to get domain state: %w", err)
	}

	isRunning := state == libvirt.DOMAIN_RUNNING

	// Update memory (hot-pluggable if running)
	if req.Memory != nil {
		memoryKB := *req.Memory * 1024
		if isRunning {
			// Try live memory update
			if err := domain.SetMemory(memoryKB); err != nil {
				return nil, fmt.Errorf("failed to update memory: %w", err)
			}
		} else {
			if err := domain.SetMemoryFlags(memoryKB, libvirt.DOMAIN_AFFECT_CONFIG); err != nil {
				return nil, fmt.Errorf("failed to update memory config: %w", err)
			}
		}
	}

	// Update vCPUs (may require restart)
	if req.VCPUs != nil {
		if isRunning {
			// Try hot-plug vCPUs
			if err := domain.SetVcpus(*req.VCPUs); err != nil {
				// If hot-plug fails, update config for next boot
				if err := domain.SetVcpusFlags(*req.VCPUs, libvirt.DOMAIN_AFFECT_CONFIG); err != nil {
					return nil, fmt.Errorf("failed to update vCPUs: %w", err)
				}
			}
		} else {
			if err := domain.SetVcpusFlags(*req.VCPUs, libvirt.DOMAIN_AFFECT_CONFIG); err != nil {
				return nil, fmt.Errorf("failed to update vCPUs config: %w", err)
			}
		}
	}

	// Update autostart
	if req.AutoStart != nil {
		if err := domain.SetAutostart(*req.AutoStart); err != nil {
			return nil, fmt.Errorf("failed to update autostart: %w", err)
		}
	}

	return s.domainToVM(domain)
}

// DeleteVM deletes a virtual machine
func (s *Service) DeleteVM(ctx context.Context, nameOrUUID string, removeDisks bool) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	domain, err := s.lookupDomain(nameOrUUID)
	if err != nil {
		return err
	}
	defer domain.Free()

	// Stop VM if running
	state, _, err := domain.GetState()
	if err != nil {
		return fmt.Errorf("failed to get domain state: %w", err)
	}

	if state == libvirt.DOMAIN_RUNNING {
		if err := domain.Destroy(); err != nil {
			return fmt.Errorf("failed to stop domain: %w", err)
		}
	}

	// Remove disks if requested
	if removeDisks {
		// Get domain XML to find disk paths
		xmlDesc, err := domain.GetXMLDesc(0)
		if err == nil {
			// Parse and remove disk files
			// This would require XML parsing to extract disk paths
			// For now, we'll skip automatic disk removal
		}
	}

	// Undefine the domain
	if err := domain.Undefine(); err != nil {
		return fmt.Errorf("failed to undefine domain: %w", err)
	}

	return nil
}

// VMAction performs an action on a VM (start, stop, restart, etc.)
func (s *Service) VMAction(ctx context.Context, nameOrUUID string, action string, force bool) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	domain, err := s.lookupDomain(nameOrUUID)
	if err != nil {
		return err
	}
	defer domain.Free()

	switch action {
	case "start":
		return domain.Create()
	case "stop":
		if force {
			return domain.Destroy()
		}
		return domain.Shutdown()
	case "restart":
		if force {
			if err := domain.Destroy(); err != nil {
				return err
			}
		} else {
			if err := domain.Reboot(0); err != nil {
				return err
			}
		}
		return domain.Create()
	case "pause":
		return domain.Suspend()
	case "resume":
		return domain.Resume()
	case "reset":
		return domain.Reset(0)
	default:
		return fmt.Errorf("unknown action: %s", action)
	}
}

// CreateSnapshot creates a VM snapshot
func (s *Service) CreateSnapshot(ctx context.Context, nameOrUUID string, req *VMSnapshotRequest) (*VMSnapshot, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	domain, err := s.lookupDomain(nameOrUUID)
	if err != nil {
		return nil, err
	}
	defer domain.Free()

	// Get VM UUID and name for database tracking
	vmUUID, _ := domain.GetUUIDString()
	vmName, _ := domain.GetName()

	// Generate snapshot XML
	snapshotXML := fmt.Sprintf(`
		<domainsnapshot>
			<name>%s</name>
			<description>%s</description>
			<memory snapshot='%s'/>
		</domainsnapshot>`,
		req.Name, req.Description, 
		map[bool]string{true: "internal", false: "no"}[req.Memory])

	flags := uint32(0)
	if !req.Memory {
		flags = libvirt.DOMAIN_SNAPSHOT_CREATE_DISK_ONLY
	}

	snapshot, err := domain.CreateSnapshotXML(snapshotXML, flags)
	if err != nil {
		return nil, fmt.Errorf("failed to create snapshot: %w", err)
	}
	defer snapshot.Free()

	vmSnapshot, err := s.snapshotToVMSnapshot(snapshot)
	if err != nil {
		return nil, err
	}

	// Track in database if available
	if s.db != nil {
		_, dbErr := s.db.Exec(`
			INSERT INTO vm_snapshots (vm_uuid, vm_name, snapshot_name, description, memory_included, state)
			VALUES (?, ?, ?, ?, ?, ?)
			ON CONFLICT(vm_uuid, snapshot_name) DO UPDATE SET
				description = excluded.description,
				memory_included = excluded.memory_included
		`, vmUUID, vmName, req.Name, req.Description, req.Memory, string(vmSnapshot.State))
		if dbErr != nil {
			// Log but don't fail the operation
			fmt.Printf("Warning: failed to track snapshot in database: %v\n", dbErr)
		}
	}

	return vmSnapshot, nil
}

// ListSnapshots lists all snapshots for a VM
func (s *Service) ListSnapshots(ctx context.Context, nameOrUUID string) ([]VMSnapshot, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	domain, err := s.lookupDomain(nameOrUUID)
	if err != nil {
		return nil, err
	}
	defer domain.Free()

	snapshots, err := domain.ListAllSnapshots(0)
	if err != nil {
		return nil, fmt.Errorf("failed to list snapshots: %w", err)
	}

	vmSnapshots := make([]VMSnapshot, 0, len(snapshots))
	for _, snapshot := range snapshots {
		vmSnapshot, err := s.snapshotToVMSnapshot(&snapshot)
		if err != nil {
			continue
		}
		vmSnapshots = append(vmSnapshots, *vmSnapshot)
		snapshot.Free()
	}

	return vmSnapshots, nil
}

// RevertSnapshot reverts VM to a snapshot
func (s *Service) RevertSnapshot(ctx context.Context, nameOrUUID string, snapshotName string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	domain, err := s.lookupDomain(nameOrUUID)
	if err != nil {
		return err
	}
	defer domain.Free()

	snapshot, err := domain.SnapshotLookupByName(snapshotName, 0)
	if err != nil {
		return fmt.Errorf("failed to find snapshot: %w", err)
	}
	defer snapshot.Free()

	return domain.RevertToSnapshot(&snapshot, 0)
}

// DeleteSnapshot deletes a VM snapshot
func (s *Service) DeleteSnapshot(ctx context.Context, nameOrUUID string, snapshotName string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	domain, err := s.lookupDomain(nameOrUUID)
	if err != nil {
		return err
	}
	defer domain.Free()

	snapshot, err := domain.SnapshotLookupByName(snapshotName, 0)
	if err != nil {
		return fmt.Errorf("failed to find snapshot: %w", err)
	}
	defer snapshot.Free()

	return snapshot.Delete(0)
}

// CloneVM clones a virtual machine
func (s *Service) CloneVM(ctx context.Context, req *VMCloneRequest) (*VM, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Get source domain
	sourceDomain, err := s.lookupDomain(req.SourceVM)
	if err != nil {
		return nil, fmt.Errorf("source VM not found: %w", err)
	}
	defer sourceDomain.Free()

	// Get source XML
	sourceXML, err := sourceDomain.GetXMLDesc(0)
	if err != nil {
		return nil, fmt.Errorf("failed to get source XML: %w", err)
	}

	// Modify XML for clone
	// This is simplified - in production you'd parse and modify the XML properly
	// For now, we'll create a new VM based on the source configuration
	
	// Parse source VM
	sourceVM, err := s.domainToVM(sourceDomain)
	if err != nil {
		return nil, fmt.Errorf("failed to parse source VM: %w", err)
	}

	// Create clone request
	createReq := &VMCreateRequest{
		Name:        req.Name,
		Memory:      sourceVM.Memory / 1024, // Convert from KB to MB
		VCPUs:       sourceVM.VCPUs,
		OSType:      sourceVM.OS.Type,
		Architecture: sourceVM.OS.Architecture,
		StoragePool: req.StoragePool,
	}

	// Handle disk cloning
	if req.FullClone && len(sourceVM.Disks) > 0 {
		// Clone the primary disk
		sourceDisk := sourceVM.Disks[0]
		poolName := req.StoragePool
		if poolName == "" {
			poolName = "default"
		}
		
		clonedDiskPath, err := s.cloneDisk(poolName, sourceDisk.Source, req.Name)
		if err != nil {
			return nil, fmt.Errorf("failed to clone disk: %w", err)
		}
		createReq.DiskPath = clonedDiskPath
	}

	return s.CreateVM(ctx, createReq)
}

// ApplyTemplateToRequest applies template settings to a VM creation request
func (s *Service) ApplyTemplateToRequest(req *VMCreateRequest, template *VMTemplate) error {
	return s.applyTemplateToRequest(req, template)
}

// GetVMMetrics returns current metrics for a VM
func (s *Service) GetVMMetrics(ctx context.Context, nameOrUUID string) (*VMMetrics, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	domain, err := s.lookupDomain(nameOrUUID)
	if err != nil {
		return nil, err
	}
	defer domain.Free()

	uuid, err := domain.GetUUIDString()
	if err != nil {
		return nil, fmt.Errorf("failed to get UUID: %w", err)
	}

	// Get CPU stats
	cpuStats, err := domain.GetCPUStats(-1, 1, 0)
	if err != nil {
		return nil, fmt.Errorf("failed to get CPU stats: %w", err)
	}

	// Get memory stats
	memStats, err := domain.MemoryStats(10, 0)
	if err != nil {
		return nil, fmt.Errorf("failed to get memory stats: %w", err)
	}

	// Get block stats (simplified - gets first disk)
	blockStats, err := domain.BlockStats("vda")
	if err != nil {
		// Non-fatal - disk might have different name
		blockStats = &libvirt.DomainBlockStats{}
	}

	// Get network stats (simplified - gets first interface)
	netStats, err := domain.InterfaceStats("vnet0")
	if err != nil {
		// Non-fatal - interface might have different name
		netStats = &libvirt.DomainInterfaceStats{}
	}

	metrics := &VMMetrics{
		UUID:      uuid,
		Timestamp: time.Now(),
		CPUTime:   cpuStats[0].CpuTime,
		DiskRead:  uint64(blockStats.RdBytes),
		DiskWrite: uint64(blockStats.WrBytes),
		NetworkRX: uint64(netStats.RxBytes),
		NetworkTX: uint64(netStats.TxBytes),
	}

	// Calculate memory usage
	for _, stat := range memStats {
		switch stat.Tag {
		case libvirt.DOMAIN_MEMORY_STAT_ACTUAL_BALLOON:
			metrics.MemoryUsed = stat.Val
		case libvirt.DOMAIN_MEMORY_STAT_AVAILABLE:
			if stat.Val > 0 && metrics.MemoryUsed > 0 {
				metrics.MemoryUsage = float64(metrics.MemoryUsed) / float64(stat.Val) * 100
			}
		}
	}

	return metrics, nil
}

// GetConsole returns console access information
func (s *Service) GetConsole(ctx context.Context, nameOrUUID string, consoleType string) (*ConsoleResponse, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	domain, err := s.lookupDomain(nameOrUUID)
	if err != nil {
		return nil, err
	}
	defer domain.Free()

	// Get domain XML to parse console configuration
	xmlDesc, err := domain.GetXMLDesc(0)
	if err != nil {
		return nil, fmt.Errorf("failed to get domain XML: %w", err)
	}

	// Parse XML to find graphics device
	// This is simplified - in production you'd properly parse the XML
	response := &ConsoleResponse{
		Type: consoleType,
		Host: "0.0.0.0",
	}

	// Generate a unique token for WebSocket authentication
	response.Token = generateConsoleToken(nameOrUUID)
	response.WSPath = fmt.Sprintf("/ws/vm/console/%s", response.Token)

	// Default ports based on type
	switch consoleType {
	case "vnc":
		response.Port = 5900 // Would be parsed from XML
	case "spice":
		response.Port = 5930 // Would be parsed from XML
	case "serial":
		response.Port = 0 // Serial over WebSocket only
	}

	return response, nil
}

// Helper functions

func (s *Service) lookupDomain(nameOrUUID string) (*libvirt.Domain, error) {
	// Try by name first
	domain, err := s.conn.LookupDomainByName(nameOrUUID)
	if err == nil {
		return domain, nil
	}

	// Try by UUID
	domain, err = s.conn.LookupDomainByUUIDString(nameOrUUID)
	if err == nil {
		return domain, nil
	}

	return nil, fmt.Errorf("domain not found: %s", nameOrUUID)
}

func (s *Service) domainToVM(domain *libvirt.Domain) (*VM, error) {
	name, err := domain.GetName()
	if err != nil {
		return nil, err
	}

	uuid, err := domain.GetUUIDString()
	if err != nil {
		return nil, err
	}

	state, _, err := domain.GetState()
	if err != nil {
		return nil, err
	}

	info, err := domain.GetInfo()
	if err != nil {
		return nil, err
	}

	autostart, err := domain.GetAutostart()
	if err != nil {
		autostart = false
	}

	persistent, err := domain.IsPersistent()
	if err != nil {
		persistent = false
	}

	vm := &VM{
		UUID:       uuid,
		Name:       name,
		State:      domainStateToVMState(state),
		Memory:     info.Memory,
		MaxMemory:  info.MaxMem,
		VCPUs:      info.NrVirtCpu,
		AutoStart:  autostart,
		Persistent: persistent,
		CreatedAt:  time.Now(), // Would need to be stored/retrieved properly
		UpdatedAt:  time.Now(),
	}

	// Parse XML for additional details
	xmlDesc, err := domain.GetXMLDesc(0)
	if err == nil {
		// Parse OS, disks, networks, etc. from XML
		// This would require proper XML parsing
		vm.OS = OSInfo{
			Type:         "hvm",
			Architecture: "x86_64",
		}
	}

	return vm, nil
}

func (s *Service) snapshotToVMSnapshot(snapshot *libvirt.DomainSnapshot) (*VMSnapshot, error) {
	name, err := snapshot.GetName()
	if err != nil {
		return nil, err
	}

	xmlDesc, err := snapshot.GetXMLDesc(0)
	if err != nil {
		return nil, err
	}

	// Parse XML for details
	// This is simplified - would need proper XML parsing
	vmSnapshot := &VMSnapshot{
		Name:      name,
		CreatedAt: time.Now(), // Would be parsed from XML
	}

	return vmSnapshot, nil
}

func domainStateToVMState(state libvirt.DomainState) VMState {
	switch state {
	case libvirt.DOMAIN_RUNNING:
		return VMStateRunning
	case libvirt.DOMAIN_PAUSED:
		return VMStatePaused
	case libvirt.DOMAIN_SHUTDOWN:
		return VMStateStopped
	case libvirt.DOMAIN_SHUTOFF:
		return VMStateShutoff
	case libvirt.DOMAIN_CRASHED:
		return VMStateCrashed
	case libvirt.DOMAIN_PMSUSPENDED:
		return VMStateSuspended
	default:
		return VMStateUnknown
	}
}

func generateConsoleToken(vmID string) string {
	// Generate a secure random token for WebSocket authentication
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		// Fallback to timestamp-based token if random fails
		return fmt.Sprintf("%s-%d", vmID, time.Now().UnixNano())
	}
	return fmt.Sprintf("%s-%s", vmID, hex.EncodeToString(b))
}

func (s *Service) loadDefaultTemplates() {
	// Load some default VM templates
	s.templates["ubuntu-22.04"] = &Template{
		Name:        "ubuntu-22.04",
		Description: "Ubuntu 22.04 LTS Server",
		OS: OSInfo{
			Type:         "hvm",
			Architecture: "x86_64",
			Machine:      "q35",
		},
		MinMemory:  2048 * 1024,  // 2GB
		MinVCPUs:   2,
		MinDisk:    20 * 1024 * 1024 * 1024, // 20GB
		DiskFormat: "qcow2",
		CloudInit:  true,
	}

	s.templates["centos-9"] = &Template{
		Name:        "centos-9",
		Description: "CentOS Stream 9",
		OS: OSInfo{
			Type:         "hvm",
			Architecture: "x86_64",
			Machine:      "q35",
		},
		MinMemory:  2048 * 1024,
		MinVCPUs:   2,
		MinDisk:    20 * 1024 * 1024 * 1024,
		DiskFormat: "qcow2",
		CloudInit:  true,
	}
}

// Storage Pool Management

// ListStoragePools returns all storage pools
func (s *Service) ListStoragePools(ctx context.Context) ([]StoragePool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	pools, err := s.conn.ListAllStoragePools(0)
	if err != nil {
		return nil, fmt.Errorf("failed to list storage pools: %w", err)
	}

	storagePools := make([]StoragePool, 0, len(pools))
	for _, pool := range pools {
		sp, err := s.storagePoolToType(&pool)
		if err != nil {
			continue
		}
		storagePools = append(storagePools, *sp)
		pool.Free()
	}

	return storagePools, nil
}

// storagePoolToType converts libvirt storage pool to our type
func (s *Service) storagePoolToType(pool *libvirt.StoragePool) (*StoragePool, error) {
	name, err := pool.GetName()
	if err != nil {
		return nil, err
	}

	uuid, err := pool.GetUUIDString()
	if err != nil {
		uuid = "" // Non-fatal
	}

	info, err := pool.GetInfo()
	if err != nil {
		return nil, fmt.Errorf("failed to get pool info: %w", err)
	}

	xmlDesc, err := pool.GetXMLDesc(0)
	if err != nil {
		return nil, fmt.Errorf("failed to get pool XML: %w", err)
	}

	// Parse XML to get pool type and path
	var poolXML struct {
		Type   string `xml:"type,attr"`
		Target struct {
			Path string `xml:"path"`
		} `xml:"target"`
	}
	if err := xml.Unmarshal([]byte(xmlDesc), &poolXML); err != nil {
		return nil, fmt.Errorf("failed to parse pool XML: %w", err)
	}

	autostart, err := pool.GetAutostart()
	if err != nil {
		autostart = false // Non-fatal
	}

	state := "inactive"
	if info.State == libvirt.STORAGE_POOL_RUNNING {
		state = "running"
	}

	sp := &StoragePool{
		Name:       name,
		Type:       poolXML.Type,
		State:      state,
		Capacity:   info.Capacity,
		Allocation: info.Allocation,
		Available:  info.Available,
		Path:       poolXML.Target.Path,
		AutoStart:  autostart,
	}

	// Optionally list volumes in the pool
	if state == "running" {
		vols, err := pool.ListAllStorageVolumes(0)
		if err == nil {
			for _, vol := range vols {
				if sv, err := s.storageVolumeToType(&vol); err == nil {
					sp.Volumes = append(sp.Volumes, *sv)
				}
				vol.Free()
			}
		}
	}

	return sp, nil
}

// storageVolumeToType converts libvirt storage volume to our type
func (s *Service) storageVolumeToType(vol *libvirt.StorageVol) (*StorageVolume, error) {
	name, err := vol.GetName()
	if err != nil {
		return nil, err
	}

	path, err := vol.GetPath()
	if err != nil {
		return nil, err
	}

	info, err := vol.GetInfo()
	if err != nil {
		return nil, fmt.Errorf("failed to get volume info: %w", err)
	}

	xmlDesc, err := vol.GetXMLDesc(0)
	if err != nil {
		return nil, fmt.Errorf("failed to get volume XML: %w", err)
	}

	// Parse XML to get format
	var volXML struct {
		Type   string `xml:"type,attr"`
		Target struct {
			Format struct {
				Type string `xml:"type,attr"`
			} `xml:"format"`
		} `xml:"target"`
	}
	if err := xml.Unmarshal([]byte(xmlDesc), &volXML); err != nil {
		return nil, fmt.Errorf("failed to parse volume XML: %w", err)
	}

	volumeType := "file"
	if info.Type == libvirt.STORAGE_VOL_BLOCK {
		volumeType = "block"
	} else if info.Type == libvirt.STORAGE_VOL_DIR {
		volumeType = "dir"
	}

	return &StorageVolume{
		Name:       name,
		Type:       volumeType,
		Capacity:   info.Capacity,
		Allocation: info.Allocation,
		Path:       path,
		Format:     volXML.Target.Format.Type,
		CreatedAt:  time.Now(), // Would need to be retrieved from metadata
	}, nil
}

// GetStoragePool returns a specific storage pool
func (s *Service) GetStoragePool(ctx context.Context, name string) (*StoragePool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	pool, err := s.conn.LookupStoragePoolByName(name)
	if err != nil {
		return nil, fmt.Errorf("storage pool not found: %w", err)
	}
	defer pool.Free()

	return s.storagePoolToType(pool)
}

// CreateStoragePool creates a new storage pool
func (s *Service) CreateStoragePool(ctx context.Context, req *StoragePoolCreateRequest) (*StoragePool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Generate pool XML
	poolXML := s.generateStoragePoolXML(req)

	// Define the pool
	pool, err := s.conn.StoragePoolDefineXML(poolXML, 0)
	if err != nil {
		return nil, fmt.Errorf("failed to define storage pool: %w", err)
	}
	defer pool.Free()

	// Build the pool if needed (creates directory for dir type)
	if err := pool.Build(0); err != nil {
		// Non-fatal - pool might already exist
		fmt.Printf("Warning: failed to build pool: %v\n", err)
	}

	// Start the pool
	if err := pool.Create(0); err != nil {
		return nil, fmt.Errorf("failed to start storage pool: %w", err)
	}

	// Set autostart if requested
	if req.AutoStart {
		if err := pool.SetAutostart(true); err != nil {
			fmt.Printf("Warning: failed to set autostart: %v\n", err)
		}
	}

	return s.storagePoolToType(pool)
}

// DeleteStoragePool deletes a storage pool
func (s *Service) DeleteStoragePool(ctx context.Context, name string, deleteVolumes bool) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	pool, err := s.conn.LookupStoragePoolByName(name)
	if err != nil {
		return fmt.Errorf("storage pool not found: %w", err)
	}
	defer pool.Free()

	// Stop the pool if active
	if active, _ := pool.IsActive(); active {
		if err := pool.Destroy(); err != nil {
			return fmt.Errorf("failed to stop storage pool: %w", err)
		}
	}

	// Delete the pool
	if deleteVolumes {
		if err := pool.Delete(libvirt.STORAGE_POOL_DELETE_NORMAL); err != nil {
			return fmt.Errorf("failed to delete storage pool: %w", err)
		}
	}

	// Undefine the pool
	if err := pool.Undefine(); err != nil {
		return fmt.Errorf("failed to undefine storage pool: %w", err)
	}

	return nil
}

// ListVolumes returns all volumes in a pool
func (s *Service) ListVolumes(ctx context.Context, poolName string) ([]StorageVolume, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	pool, err := s.conn.LookupStoragePoolByName(poolName)
	if err != nil {
		return nil, fmt.Errorf("storage pool not found: %w", err)
	}
	defer pool.Free()

	vols, err := pool.ListAllStorageVolumes(0)
	if err != nil {
		return nil, fmt.Errorf("failed to list volumes: %w", err)
	}

	volumes := make([]StorageVolume, 0, len(vols))
	for _, vol := range vols {
		sv, err := s.storageVolumeToType(&vol)
		if err != nil {
			continue
		}
		volumes = append(volumes, *sv)
		vol.Free()
	}

	return volumes, nil
}

// CreateVolume creates a new volume in a pool
func (s *Service) CreateVolume(ctx context.Context, req *VolumeCreateRequest) (*StorageVolume, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	pool, err := s.conn.LookupStoragePoolByName(req.PoolName)
	if err != nil {
		return nil, fmt.Errorf("storage pool not found: %w", err)
	}
	defer pool.Free()

	// Generate volume XML
	volXML := s.generateVolumeXML(req)

	// Create the volume
	vol, err := pool.StorageVolCreateXML(volXML, 0)
	if err != nil {
		return nil, fmt.Errorf("failed to create volume: %w", err)
	}
	defer vol.Free()

	return s.storageVolumeToType(vol)
}

// DeleteVolume deletes a volume from a pool
func (s *Service) DeleteVolume(ctx context.Context, poolName, volumeName string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	pool, err := s.conn.LookupStoragePoolByName(poolName)
	if err != nil {
		return fmt.Errorf("storage pool not found: %w", err)
	}
	defer pool.Free()

	vol, err := pool.LookupStorageVolByName(volumeName)
	if err != nil {
		return fmt.Errorf("volume not found: %w", err)
	}
	defer vol.Free()

	if err := vol.Delete(0); err != nil {
		return fmt.Errorf("failed to delete volume: %w", err)
	}

	return nil
}

// Network Management

// ListNetworks returns all virtual networks
func (s *Service) ListNetworks(ctx context.Context) ([]Network, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	nets, err := s.conn.ListAllNetworks(0)
	if err != nil {
		return nil, fmt.Errorf("failed to list networks: %w", err)
	}

	networks := make([]Network, 0, len(nets))
	for _, net := range nets {
		n, err := s.networkToType(&net)
		if err != nil {
			continue
		}
		networks = append(networks, *n)
		net.Free()
	}

	return networks, nil
}

// GetNetwork returns a specific network
func (s *Service) GetNetwork(ctx context.Context, name string) (*Network, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	net, err := s.conn.LookupNetworkByName(name)
	if err != nil {
		return nil, fmt.Errorf("network not found: %w", err)
	}
	defer net.Free()

	return s.networkToType(net)
}

// CreateNetwork creates a new virtual network
func (s *Service) CreateNetwork(ctx context.Context, req *NetworkCreateRequest) (*Network, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Generate network XML
	netXML := s.generateNetworkXML(req)

	// Define the network
	net, err := s.conn.NetworkDefineXML(netXML)
	if err != nil {
		return nil, fmt.Errorf("failed to define network: %w", err)
	}
	defer net.Free()

	// Start the network
	if err := net.Create(); err != nil {
		return nil, fmt.Errorf("failed to start network: %w", err)
	}

	// Set autostart if requested
	if req.AutoStart {
		if err := net.SetAutostart(true); err != nil {
			fmt.Printf("Warning: failed to set autostart: %v\n", err)
		}
	}

	return s.networkToType(net)
}

// DeleteNetwork deletes a virtual network
func (s *Service) DeleteNetwork(ctx context.Context, name string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	net, err := s.conn.LookupNetworkByName(name)
	if err != nil {
		return fmt.Errorf("network not found: %w", err)
	}
	defer net.Free()

	// Stop the network if active
	if active, _ := net.IsActive(); active {
		if err := net.Destroy(); err != nil {
			return fmt.Errorf("failed to stop network: %w", err)
		}
	}

	// Undefine the network
	if err := net.Undefine(); err != nil {
		return fmt.Errorf("failed to undefine network: %w", err)
	}

	return nil
}

// MigrateVM initiates a live migration of a VM to another host
func (s *Service) MigrateVM(ctx context.Context, nameOrUUID string, req *MigrationRequest) (*MigrationResponse, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	domain, err := s.lookupDomain(nameOrUUID)
	if err != nil {
		return nil, err
	}
	defer domain.Free()

	// Generate migration ID
	migrationID := generateMigrationID()

	// Validate destination host
	if req.DestinationHost == "" {
		return nil, fmt.Errorf("destination host is required")
	}

	// Build destination URI
	destURI := fmt.Sprintf("qemu+ssh://%s/system", req.DestinationHost)
	if req.DestinationURI != "" {
		destURI = req.DestinationURI
	}

	// Connect to destination
	destConn, err := libvirt.NewConnect(destURI)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to destination host: %w", err)
	}
	defer destConn.Close()

	// Prepare migration flags
	flags := libvirt.MIGRATE_PERSIST_DEST | libvirt.MIGRATE_UNDEFINE_SOURCE
	if req.Live {
		flags |= libvirt.MIGRATE_LIVE
	}
	if req.Tunneled {
		flags |= libvirt.MIGRATE_TUNNELLED
	}
	if req.Compressed {
		flags |= libvirt.MIGRATE_COMPRESSED
	}
	if req.AutoConverge {
		flags |= libvirt.MIGRATE_AUTO_CONVERGE
	}
	if req.AllowUnsafe {
		flags |= libvirt.MIGRATE_UNSAFE
	}
	
	// Handle storage migration based on copy_storage parameter
	switch req.CopyStorage {
	case "all":
		// Copy all storage (full disk copy)
		flags |= libvirt.MIGRATE_NON_SHARED_DISK
	case "inc":
		// Copy incremental storage changes
		flags |= libvirt.MIGRATE_NON_SHARED_INC
	case "none", "":
		// Default: no storage migration (requires shared storage)
		// No additional flags needed
	default:
		return nil, fmt.Errorf("invalid copy_storage mode: %s (valid: none, all, inc)", req.CopyStorage)
	}

	// Set bandwidth limit if specified
	if req.MaxBandwidth > 0 {
		if err := domain.MigrateSetMaxSpeed(req.MaxBandwidth, 0); err != nil {
			// Non-fatal: log warning but continue
			fmt.Printf("Warning: failed to set migration bandwidth: %v\n", err)
		}
	}

	// Set downtime limit if specified
	if req.MaxDowntime > 0 {
		if err := domain.MigrateSetMaxDowntime(req.MaxDowntime, 0); err != nil {
			// Non-fatal: log warning but continue
			fmt.Printf("Warning: failed to set migration downtime: %v\n", err)
		}
	}

	// Store migration info for status tracking
	vmName, _ := domain.GetName()
	s.storeMigrationInfo(migrationID, vmName, req.DestinationHost, "initiating")

	// Start migration in background
	go func() {
		// Update status to migrating
		s.updateMigrationStatus(migrationID, "migrating", 0)

		// Perform migration
		_, err := domain.Migrate(destConn, flags, "", "", 0)
		if err != nil {
			s.updateMigrationStatus(migrationID, "failed", 100)
			fmt.Printf("Migration failed: %v\n", err)
		} else {
			s.updateMigrationStatus(migrationID, "completed", 100)
		}
	}()

	return &MigrationResponse{
		MigrationID: migrationID,
		Status:      "initiated",
		SourceHost:  getHostname(),
		DestHost:    req.DestinationHost,
		StartedAt:   time.Now(),
	}, nil
}

// GetMigrationStatus returns the status of an ongoing or completed migration
func (s *Service) GetMigrationStatus(ctx context.Context, nameOrUUID string, migrationID string) (*MigrationStatusResponse, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	// Get migration info from storage
	migrationInfo := s.getMigrationInfo(migrationID)
	if migrationInfo == nil {
		// If no migration ID provided, try to find active migration for VM
		if migrationID == "" {
			domain, err := s.lookupDomain(nameOrUUID)
			if err != nil {
				return nil, err
			}
			defer domain.Free()

			// Check if domain is being migrated
			jobInfo, err := domain.GetJobInfo()
			if err == nil && jobInfo.Type != libvirt.DOMAIN_JOB_NONE {
				return &MigrationStatusResponse{
					MigrationID: "current",
					Status:      domainJobTypeToStatus(jobInfo.Type),
					Progress:    calculateProgress(jobInfo),
					DataRemaining: jobInfo.DataRemaining,
					DataProcessed: jobInfo.DataProcessed,
					MemProcessed:  jobInfo.MemProcessed,
					MemRemaining:  jobInfo.MemRemaining,
				}, nil
			}
		}
		return nil, fmt.Errorf("migration not found")
	}

	return migrationInfo, nil
}

// CancelMigration cancels an ongoing migration
func (s *Service) CancelMigration(ctx context.Context, nameOrUUID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	domain, err := s.lookupDomain(nameOrUUID)
	if err != nil {
		return err
	}
	defer domain.Free()

	// Abort the migration job
	if err := domain.AbortJob(); err != nil {
		return fmt.Errorf("failed to cancel migration: %w", err)
	}

	return nil
}

// Migration helper functions

var migrationStore = make(map[string]*MigrationStatusResponse)
var migrationStoreMutex sync.RWMutex

func (s *Service) storeMigrationInfo(id, vmName, destHost, status string) {
	migrationStoreMutex.Lock()
	defer migrationStoreMutex.Unlock()
	
	migrationStore[id] = &MigrationStatusResponse{
		MigrationID: id,
		VMName:      vmName,
		Status:      status,
		DestHost:    destHost,
		StartedAt:   time.Now(),
	}
}

func (s *Service) updateMigrationStatus(id, status string, progress int) {
	migrationStoreMutex.Lock()
	defer migrationStoreMutex.Unlock()
	
	if info, exists := migrationStore[id]; exists {
		info.Status = status
		info.Progress = progress
		if status == "completed" || status == "failed" {
			info.CompletedAt = time.Now()
		}
	}
}

func (s *Service) getMigrationInfo(id string) *MigrationStatusResponse {
	migrationStoreMutex.RLock()
	defer migrationStoreMutex.RUnlock()
	
	if info, exists := migrationStore[id]; exists {
		return info
	}
	return nil
}

func generateMigrationID() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func getHostname() string {
	if hostname, err := libvirt.GetHostname(); err == nil {
		return hostname
	}
	return "localhost"
}

func domainJobTypeToStatus(jobType libvirt.DomainJobType) string {
	switch jobType {
	case libvirt.DOMAIN_JOB_BOUNDED:
		return "migrating"
	case libvirt.DOMAIN_JOB_UNBOUNDED:
		return "migrating"
	case libvirt.DOMAIN_JOB_COMPLETED:
		return "completed"
	case libvirt.DOMAIN_JOB_FAILED:
		return "failed"
	case libvirt.DOMAIN_JOB_CANCELLED:
		return "cancelled"
	default:
		return "unknown"
	}
}

func calculateProgress(jobInfo libvirt.DomainJobInfo) int {
	if jobInfo.DataTotal > 0 {
		return int((jobInfo.DataProcessed * 100) / jobInfo.DataTotal)
	}
	if jobInfo.MemTotal > 0 {
		return int((jobInfo.MemProcessed * 100) / jobInfo.MemTotal)
	}
	return 0
}

// Helper conversion functions

func (s *Service) storagePoolToType(pool *libvirt.StoragePool) (*StoragePool, error) {
	name, _ := pool.GetName()
	uuid, _ := pool.GetUUIDString()
	info, _ := pool.GetInfo()
	autostart, _ := pool.GetAutostart()

	sp := &StoragePool{
		Name:       name,
		State:      storagePoolStateToString(info.State),
		Capacity:   info.Capacity,
		Allocation: info.Allocation,
		Available:  info.Available,
		AutoStart:  autostart,
	}

	// Get pool type from XML
	xmlDesc, err := pool.GetXMLDesc(0)
	if err == nil {
		// Parse type from XML (simplified)
		if strings.Contains(xmlDesc, "type='dir'") {
			sp.Type = "dir"
		} else if strings.Contains(xmlDesc, "type='logical'") {
			sp.Type = "logical"
		} else if strings.Contains(xmlDesc, "type='netfs'") {
			sp.Type = "netfs"
		}
	}

	return sp, nil
}

func (s *Service) storageVolumeToType(vol *libvirt.StorageVol) (*StorageVolume, error) {
	name, _ := vol.GetName()
	path, _ := vol.GetPath()
	info, _ := vol.GetInfo()

	sv := &StorageVolume{
		Name:       name,
		Path:       path,
		Type:       storageVolumeTypeToString(info.Type),
		Capacity:   info.Capacity,
		Allocation: info.Allocation,
	}

	return sv, nil
}

func (s *Service) networkToType(net *libvirt.Network) (*Network, error) {
	name, _ := net.GetName()
	uuid, _ := net.GetUUIDString()
	bridge, _ := net.GetBridgeName()
	autostart, _ := net.GetAutostart()
	persistent, _ := net.IsPersistent()
	active, _ := net.IsActive()

	n := &Network{
		Name:       name,
		UUID:       uuid,
		Bridge:     bridge,
		AutoStart:  autostart,
		Persistent: persistent,
	}

	if active {
		n.State = "active"
	} else {
		n.State = "inactive"
	}

	return n, nil
}

func storagePoolStateToString(state libvirt.StoragePoolState) string {
	switch state {
	case libvirt.STORAGE_POOL_RUNNING:
		return "running"
	case libvirt.STORAGE_POOL_INACTIVE:
		return "inactive"
	case libvirt.STORAGE_POOL_BUILDING:
		return "building"
	default:
		return "unknown"
	}
}

func storageVolumeTypeToString(volType libvirt.StorageVolType) string {
	switch volType {
	case libvirt.STORAGE_VOL_FILE:
		return "file"
	case libvirt.STORAGE_VOL_BLOCK:
		return "block"
	case libvirt.STORAGE_VOL_DIR:
		return "dir"
	default:
		return "unknown"
	}
}
