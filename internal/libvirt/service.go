package libvirt

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
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
	templates       map[string]*VMTemplate
	db              *sql.DB // Optional database for tracking
	TemplateService *VMTemplateService
	consoleProxy    *ConsoleProxy
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
		templates:   make(map[string]*VMTemplate),
	}

	// Load default templates

	// Initialize console proxy
	s.consoleProxy = NewConsoleProxy(s, nil)
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

	// Attach persistable metadata
	backup.Compressed = req.Compression != BackupCompressionNone
	backup.Retention = req.RetentionDays
	if req.Description != "" || req.IncludeMemory {
		backup.Metadata = map[string]string{}
		if req.Description != "" {
			backup.Metadata["description"] = req.Description
		}
		backup.Metadata["include_memory"] = fmt.Sprintf("%t", req.IncludeMemory)
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

	rows, err := s.db.QueryContext(ctx, "SELECT id, vm_uuid, vm_name, type, status, destination_path, size_bytes, compression, encryption, parent_backup_id, started_at, completed_at, error_message, retention_days, metadata FROM vm_backups WHERE vm_uuid = ? ORDER BY started_at DESC", vm.UUID)
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
		var metadata sql.NullString
		if err := rows.Scan(&b.ID, &b.VMUUID, &b.VMName, &b.Type, &b.Status, &b.DestinationPath, &b.SizeBytes, &b.Compression, &b.Encryption, &parentID, &b.StartedAt, &completedAt, &errMsg, &b.Retention, &metadata); err != nil {
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
		if metadata.Valid && metadata.String != "" {
			var m map[string]string
			if err := json.Unmarshal([]byte(metadata.String), &m); err == nil {
				b.Metadata = m
			}
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
	if err := domain.BackupBegin(backupXML, "", 0); err != nil {
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
func (s *Service) AttachPCIDevice(ctx context.Context, vmName string, req *PCIPassthroughRequest) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	domain, err := s.lookupDomain(vmName)
	if err != nil {
		return "", fmt.Errorf("VM not found: %w", err)
	}
	defer domain.Free()

	// Check if device is available
	if s.db != nil {
		var isAvailable bool
		err := s.db.QueryRowContext(ctx, "SELECT is_available FROM pci_devices WHERE device_id = ?", req.DeviceID).Scan(&isAvailable)
		if err != nil {
			return "", fmt.Errorf("device not found: %w", err)
		}
		if !isAvailable {
			return "", fmt.Errorf("device is already assigned to another VM")
		}
	}

	// Parse PCI address if not provided
	pciAddr := req.PCIAddress
	if pciAddr == "" {
		// Get PCI address from device ID in database
		if s.db != nil {
			err := s.db.QueryRowContext(ctx, "SELECT pci_address FROM pci_devices WHERE device_id = ?", req.DeviceID).Scan(&pciAddr)
			if err != nil {
				return "", fmt.Errorf("failed to get PCI address: %w", err)
			}
		}
	}

	// Parse PCI address (format: 0000:01:00.0)
	parts := strings.Split(pciAddr, ":")
	if len(parts) != 3 {
		return "", fmt.Errorf("invalid PCI address format: %s", pciAddr)
	}
	funcParts := strings.Split(parts[2], ".")
	if len(funcParts) != 2 {
		return "", fmt.Errorf("invalid PCI address format: %s", pciAddr)
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
	state, _, stErr := domain.GetState()
	if stErr != nil {
		return "", fmt.Errorf("failed to get VM state: %w", stErr)
	}
	flags := libvirt.DOMAIN_DEVICE_MODIFY_CONFIG
	if state == libvirt.DOMAIN_RUNNING {
		flags = flags | libvirt.DOMAIN_DEVICE_MODIFY_LIVE
	}
	if err := domain.AttachDeviceFlags(pciXML, flags); err != nil {
		return "", fmt.Errorf("failed to attach PCI device: %w", err)
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

	return pciAddr, nil
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
	state, _, stErr := domain.GetState()
	if stErr != nil {
		return fmt.Errorf("failed to get VM state: %w", stErr)
	}
	flags := libvirt.DOMAIN_DEVICE_MODIFY_CONFIG
	if state == libvirt.DOMAIN_RUNNING {
		flags = flags | libvirt.DOMAIN_DEVICE_MODIFY_LIVE
	}
	if err := domain.DetachDeviceFlags(pciXML, flags); err != nil {
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

	var parentBackupID any
	if backup.ParentBackupID != "" {
		parentBackupID = backup.ParentBackupID
	}

	var metadata any
	if backup.Metadata != nil && len(backup.Metadata) > 0 {
		b, err := json.Marshal(backup.Metadata)
		if err != nil {
			return fmt.Errorf("failed to marshal backup metadata: %w", err)
		}
		metadata = string(b)
	}

	_, err := s.db.Exec(`
		INSERT OR REPLACE INTO vm_backups (
			id, vm_uuid, vm_name, type, status,
			destination_path, size_bytes, compression, encryption,
			parent_backup_id, started_at, completed_at, error_message,
			retention_days, metadata
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`,
		backup.ID,
		backup.VMUUID,
		backup.VMName,
		backup.Type,
		backup.Status,
		backup.DestinationPath,
		backup.SizeBytes,
		backup.Compression,
		backup.Encryption,
		parentBackupID,
		backup.StartedAt,
		completedAt,
		backup.ErrorMessage,
		backup.Retention,
		metadata,
	)

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
			if err := domain.SetMemoryFlags(memoryKB, libvirt.DomainMemoryModFlags(libvirt.DOMAIN_AFFECT_CONFIG)); err != nil {
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
				if err := domain.SetVcpusFlags(*req.VCPUs, libvirt.DomainVcpuFlags(libvirt.DOMAIN_AFFECT_CONFIG)); err != nil {
					return nil, fmt.Errorf("failed to update vCPUs: %w", err)
				}
			}
		} else {
			if err := domain.SetVcpusFlags(*req.VCPUs, libvirt.DomainVcpuFlags(libvirt.DOMAIN_AFFECT_CONFIG)); err != nil {
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
		xmlDesc, err := domain.GetXMLDesc(0)
		if err != nil {
			return fmt.Errorf("failed to get domain XML for disk removal: %w", err)
		}

		paths, err := parseDomainDiskPaths(xmlDesc)
		if err != nil {
			return fmt.Errorf("failed to parse domain disks: %w", err)
		}

		seen := make(map[string]struct{})
		for _, path := range paths {
			if path == "" {
				continue
			}
			if _, ok := seen[path]; ok {
				continue
			}
			seen[path] = struct{}{}

			usingVMs, err := s.getVMsUsingVolume(ctx, path)
			if err != nil {
				fmt.Printf("Warning: failed to check volume usage for %s: %v\n", path, err)
				continue
			}

			// If more than one VM references this volume, consider it shared and report conflict
			if len(usingVMs) > 1 {
				return fmt.Errorf("shared volume in use by other VMs: %s (used by %v)", path, usingVMs)
			}

			vol, err := s.conn.LookupStorageVolByPath(path)
			if err != nil {
				fmt.Printf("Warning: storage volume for path %s not found in libvirt: %v\n", path, err)
				continue
			}

			if err := vol.Delete(0); err != nil {
				vol.Free()
				return fmt.Errorf("failed to delete storage volume %s: %w", path, err)
			}
			vol.Free()
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
	case "force-stop", "destroy":
		return domain.Destroy()
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

	flags := libvirt.DomainSnapshotCreateFlags(0)
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

	return snapshot.RevertToSnapshot(0)
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
	_, err = sourceDomain.GetXMLDesc(0)
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
		Name:         req.Name,
		Memory:       sourceVM.Memory / 1024, // Convert from KB to MB
		VCPUs:        sourceVM.VCPUs,
		OSType:       sourceVM.OS.Type,
		Architecture: sourceVM.OS.Architecture,
		StoragePool:  req.StoragePool,
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
		case int32(libvirt.DOMAIN_MEMORY_STAT_ACTUAL_BALLOON):
			metrics.MemoryUsed = stat.Val
		case int32(libvirt.DOMAIN_MEMORY_STAT_AVAILABLE):
			if stat.Val > 0 && metrics.MemoryUsed > 0 {
				metrics.MemoryUsage = float64(metrics.MemoryUsed) / float64(stat.Val) * 100
			}
		}
	}

	return metrics, nil
}

// GetConsole returns console access information
// GetConsole returns console connection information for a VM
// parseOSMetadata parses the OS metadata from domain XML
func (s *Service) parseOSMetadata(xmlDesc string) *OSInfoEnhanced {
	// Define structs for XML parsing
	type VaporOS struct {
		XMLName  xml.Name `xml:"os"`
		Family   string   `xml:"family"`
		Distro   string   `xml:"distro"`
		Version  string   `xml:"version"`
		Codename string   `xml:"codename"`
		Variant  string   `xml:"variant"`
	}

	type LibOSInfo struct {
		XMLName xml.Name `xml:"libosinfo"`
		OS      struct {
			ID string `xml:"id,attr"`
		} `xml:"os"`
	}

	type Metadata struct {
		XMLName   xml.Name  `xml:"metadata"`
		VaporOS   VaporOS   `xml:"http://vapor.io/xmlns/libvirt/domain/1.0 os"`
		LibOSInfo LibOSInfo `xml:"http://libosinfo.org/xmlns/libvirt/domain/1.0 libosinfo"`
	}

	type Domain struct {
		XMLName  xml.Name `xml:"domain"`
		Metadata Metadata `xml:"metadata"`
	}

	var domain Domain
	if err := xml.Unmarshal([]byte(xmlDesc), &domain); err != nil {
		// If parsing fails, return nil
		return nil
	}

	// If no vapor metadata found, return nil
	if domain.Metadata.VaporOS.Family == "" &&
		domain.Metadata.VaporOS.Distro == "" &&
		domain.Metadata.VaporOS.Version == "" {
		return nil
	}

	// Return the parsed OS info
	return &OSInfoEnhanced{
		Family:   domain.Metadata.VaporOS.Family,
		Distro:   domain.Metadata.VaporOS.Distro,
		Version:  domain.Metadata.VaporOS.Version,
		Codename: domain.Metadata.VaporOS.Codename,
		Variant:  domain.Metadata.VaporOS.Variant,
	}
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

	// Parse XML for additional details including OS metadata
	xmlDesc, err := domain.GetXMLDesc(0)
	if err == nil {
		// Parse OS metadata
		vm.OSInfoDetail = s.parseOSMetadata(xmlDesc)

		// Parse basic OS info from XML
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

	// Best-effort parse of libvirt snapshot XML (virsh snapshot-dumpxml)
	type parentXML struct {
		Name string `xml:"name"`
	}
	type memoryXML struct {
		Snapshot string `xml:"snapshot,attr"`
	}
	type snapshotXML struct {
		Name         string     `xml:"name"`
		Description  string     `xml:"description"`
		State        string     `xml:"state"`
		CreationTime int64      `xml:"creationTime"`
		Parent       *parentXML `xml:"parent"`
		Memory       memoryXML  `xml:"memory"`
		Metadata     struct {
			InnerXML string `xml:",innerxml"`
		} `xml:"metadata"`
	}

	parsed := snapshotXML{Name: name}
	if err := xml.Unmarshal([]byte(xmlDesc), &parsed); err != nil {
		// If we can't parse XML, still return a usable minimal snapshot.
		return &VMSnapshot{Name: name, CreatedAt: time.Now().UTC()}, nil
	}

	createdAt := time.Now().UTC()
	if parsed.CreationTime > 0 {
		createdAt = time.Unix(parsed.CreationTime, 0).UTC()
	}

	memoryAttr := strings.ToLower(strings.TrimSpace(parsed.Memory.Snapshot))
	memoryIncluded := memoryAttr != "" && memoryAttr != "no" && memoryAttr != "false"

	// Parse Vapor metadata (if present) from the snapshot XML.
	var snapshotType string
	var diskFormats []string
	if parsed.Metadata.InnerXML != "" {
		if m := regexp.MustCompile(`(?s)<vapor:type>\s*([^<]+?)\s*</vapor:type>`).FindStringSubmatch(parsed.Metadata.InnerXML); m != nil {
			snapshotType = strings.TrimSpace(m[1])
		}
		if m := regexp.MustCompile(`(?s)<vapor:disk_formats>\s*([^<]+?)\s*</vapor:disk_formats>`).FindStringSubmatch(parsed.Metadata.InnerXML); m != nil {
			raw := strings.TrimSpace(m[1])
			if raw != "" {
				diskFormats = strings.Split(raw, ",")
				for i := range diskFormats {
					diskFormats[i] = strings.TrimSpace(diskFormats[i])
				}
			}
		}
	}

	if snapshotType == "" {
		// Fallback heuristic if metadata isn't present.
		if memoryIncluded {
			snapshotType = "internal-memory"
		} else {
			snapshotType = "internal"
		}
	}

	vmSnapshot := &VMSnapshot{
		Name:        name,
		Description: parsed.Description,
		CreatedAt:   createdAt,
		Parent:      "",
		Memory:      memoryIncluded,
		Type:        snapshotType,
		DiskFormats: diskFormats,
	}

	if parsed.Parent != nil {
		vmSnapshot.Parent = parsed.Parent.Name
	}

	// Map snapshot state (string) onto our VMState enum for backwards-compatible UI display.
	switch strings.ToLower(strings.TrimSpace(parsed.State)) {
	case "running":
		vmSnapshot.State = VMStateRunning
	case "paused":
		vmSnapshot.State = VMStatePaused
	case "shutoff":
		vmSnapshot.State = VMStateShutoff
	case "shutdown":
		vmSnapshot.State = VMStateStopped
	case "crashed":
		vmSnapshot.State = VMStateCrashed
	default:
		vmSnapshot.State = VMStateUnknown
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
	s.templates["ubuntu-22.04"] = &VMTemplate{
		Name:              "ubuntu-22.04",
		Description:       "Ubuntu 22.04 LTS Server",
		OSType:            "linux",
		OSVariant:         "ubuntu22.04",
		MinMemory:         2048 * 1024 * 1024, // 2GB in bytes
		RecommendedMemory: 4096 * 1024 * 1024, // 4GB in bytes
		MinVCPUs:          2,
		RecommendedVCPUs:  4,
		MinDisk:           20 * 1024 * 1024 * 1024, // 20GB in bytes
		RecommendedDisk:   50 * 1024 * 1024 * 1024, // 50GB in bytes
		DiskFormat:        "qcow2",
		NetworkModel:      "virtio",
		GraphicsType:      "vnc",
		CloudInit:         true,
		UEFIBoot:          false,
		DefaultUser:       "ubuntu",
	}

	s.templates["centos-9"] = &VMTemplate{
		Name:              "centos-9",
		Description:       "CentOS Stream 9",
		OSType:            "linux",
		OSVariant:         "centos-stream9",
		MinMemory:         2048 * 1024 * 1024, // 2GB in bytes
		RecommendedMemory: 4096 * 1024 * 1024, // 4GB in bytes
		MinVCPUs:          2,
		RecommendedVCPUs:  4,
		MinDisk:           20 * 1024 * 1024 * 1024, // 20GB in bytes
		RecommendedDisk:   50 * 1024 * 1024 * 1024, // 50GB in bytes
		DiskFormat:        "qcow2",
		NetworkModel:      "virtio",
		GraphicsType:      "vnc",
		CloudInit:         true,
		UEFIBoot:          true,
		DefaultUser:       "centos",
	}
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
					MigrationID:   "current",
					Status:        domainJobTypeToStatus(jobInfo.Type),
					Progress:      calculateProgress(*jobInfo),
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
	if hostname, err := os.Hostname(); err == nil {
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

// storagePoolToType and storageVolumeToType are already defined earlier in this file

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

	// Best-effort parse of network XML for forward mode, IP range, and DHCP configuration.
	if xmlDesc, err := net.GetXMLDesc(0); err == nil {
		var netXML struct {
			Forward *struct {
				Mode string `xml:"mode,attr"`
				Dev  string `xml:"dev,attr"`
			} `xml:"forward"`
			IPs []struct {
				Address string `xml:"address,attr"`
				Netmask string `xml:"netmask,attr"`
				DHCP    *struct {
					Ranges []struct {
						Start string `xml:"start,attr"`
						End   string `xml:"end,attr"`
					} `xml:"range"`
					Hosts []struct {
						MAC  string `xml:"mac,attr"`
						IP   string `xml:"ip,attr"`
						Name string `xml:"name,attr"`
					} `xml:"host"`
				} `xml:"dhcp"`
			} `xml:"ip"`
		}

		if err := xml.Unmarshal([]byte(xmlDesc), &netXML); err == nil {
			if netXML.Forward != nil {
				n.Mode = netXML.Forward.Mode
			}

			// Prefer IPv4 ip blocks (address+netmask).
			for _, ip := range netXML.IPs {
				if ip.Address == "" || ip.Netmask == "" {
					continue
				}
				n.IPRange = NetworkIPRange{Address: ip.Address, Netmask: ip.Netmask}

				if ip.DHCP != nil && len(ip.DHCP.Ranges) > 0 {
					r := ip.DHCP.Ranges[0]
					dhcp := &DHCPConfig{Start: r.Start, End: r.End}
					if len(ip.DHCP.Hosts) > 0 {
						for _, h := range ip.DHCP.Hosts {
							dhcp.Hosts = append(dhcp.Hosts, DHCPHost{MAC: h.MAC, IP: h.IP, Name: h.Name})
						}
					}
					n.DHCP = dhcp
				}
				break
			}
		}
	}

	return n, nil
}

// func storagePoolStateToString(state libvirt.StoragePoolState) string {
// 	switch state {
// 	case libvirt.STORAGE_POOL_RUNNING:
// 		return "running"
// 	case libvirt.STORAGE_POOL_INACTIVE:
// 		return "inactive"
// 	case libvirt.STORAGE_POOL_BUILDING:
// 		return "building"
// 	default:
// 		return "unknown"
// 	}
// }

// func storageVolumeTypeToString(volType libvirt.StorageVolType) string {
// 	switch volType {
// 	case libvirt.STORAGE_VOL_FILE:
// 		return "file"
// 	case libvirt.STORAGE_VOL_BLOCK:
// 		return "block"
// 	case libvirt.STORAGE_VOL_DIR:
// 		return "dir"
// 	default:
// 		return "unknown"
// 	}
// }

// lookupDomain looks up a domain by name or UUID
func (s *Service) lookupDomain(nameOrUUID string) (*libvirt.Domain, error) {
	// Try by UUID first
	domain, err := s.conn.LookupDomainByUUIDString(nameOrUUID)
	if err == nil {
		return domain, nil
	}

	// Try by name
	domain, err = s.conn.LookupDomainByName(nameOrUUID)
	if err != nil {
		return nil, fmt.Errorf("domain not found: %w", err)
	}

	return domain, nil
}

// GetVMEnhanced retrieves comprehensive virtual machine details with nested objects
// This provides more detailed information than GetVM, including full disk, network,
// PCI device, and cloud-init configuration details
func (s *Service) GetVMEnhanced(ctx context.Context, nameOrUUID string) (*VMEnhanced, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	domain, err := s.lookupDomain(nameOrUUID)
	if err != nil {
		return nil, fmt.Errorf("failed to lookup domain: %w", err)
	}
	defer domain.Free()

	// Get basic VM information
	name, err := domain.GetName()
	if err != nil {
		return nil, fmt.Errorf("failed to get domain name: %w", err)
	}

	uuid, err := domain.GetUUIDString()
	if err != nil {
		return nil, fmt.Errorf("failed to get domain UUID: %w", err)
	}

	state, _, err := domain.GetState()
	if err != nil {
		return nil, fmt.Errorf("failed to get domain state: %w", err)
	}

	info, err := domain.GetInfo()
	if err != nil {
		return nil, fmt.Errorf("failed to get domain info: %w", err)
	}

	autostart, err := domain.GetAutostart()
	if err != nil {
		autostart = false
	}

	persistent, err := domain.IsPersistent()
	if err != nil {
		persistent = false
	}

	// Get domain XML for detailed parsing
	xmlDesc, err := domain.GetXMLDesc(0)
	if err != nil {
		return nil, fmt.Errorf("failed to get domain XML: %w", err)
	}

	// Create enhanced VM response
	vmEnhanced := &VMEnhanced{
		UUID:       uuid,
		Name:       name,
		State:      domainStateToVMState(state),
		Memory:     info.Memory / 1024, // Convert KB to MB
		MaxMemory:  info.MaxMem / 1024, // Convert KB to MB
		VCPUs:      info.NrVirtCpu,
		MaxVCPUs:   info.NrVirtCpu, // Could be parsed from XML for accuracy
		AutoStart:  autostart,
		Persistent: persistent,
		Running:    state == libvirt.DOMAIN_RUNNING,
		CreatedAt:  time.Now(), // Would need to be stored/retrieved properly
		UpdatedAt:  time.Now(),
	}

	// Parse XML for enhanced details
	if err := s.parseEnhancedVMDetails(vmEnhanced, xmlDesc); err != nil {
		// Log error but don't fail - return what we have
		fmt.Printf("Warning: failed to parse some enhanced VM details: %v\n", err)
	}

	// Get metadata if available
	if metadata, err := s.getVMMetadata(domain); err == nil {
		vmEnhanced.Metadata = metadata
	}

	// Get network statistics if VM is running
	if vmEnhanced.Running && len(vmEnhanced.Networks) > 0 {
		s.enrichNetworkStatistics(domain, vmEnhanced)
	}

	// Get storage pool information for disks
	if vmEnhanced.Storage != nil && len(vmEnhanced.Storage.Disks) > 0 {
		s.enrichDiskStorageInfo(vmEnhanced)
	}

	return vmEnhanced, nil
}

// parseEnhancedVMDetails parses the domain XML to extract comprehensive VM details
func (s *Service) parseEnhancedVMDetails(vm *VMEnhanced, xmlDesc string) error {
	// Parse OS configuration
	s.parseOSConfiguration(vm, xmlDesc)

	// Parse storage configuration
	storage, err := s.parseStorageConfiguration(xmlDesc)
	if err == nil {
		vm.Storage = storage
	}

	// Parse network configuration
	networks, err := s.parseNetworkConfiguration(xmlDesc)
	if err == nil {
		vm.Networks = networks
	}

	// Parse graphics configuration
	graphics, err := s.parseGraphicsConfiguration(xmlDesc)
	if err == nil {
		vm.Graphics = graphics
	}

	// Parse PCI devices
	pciDevices, err := s.parsePCIDevices(xmlDesc)
	if err == nil {
		vm.PCIDevices = pciDevices
	}

	// Parse cloud-init configuration (if present)
	cloudInit, err := s.parseCloudInitConfiguration(xmlDesc)
	if err == nil && cloudInit != nil {
		vm.CloudInit = cloudInit
	}

	// Check for template metadata
	if template := s.extractTemplateInfo(xmlDesc); template != "" {
		vm.Template = template
	}

	return nil
}

// Helper method to parse OS configuration from XML
func (s *Service) parseOSConfiguration(vm *VMEnhanced, xmlDesc string) {
	// Basic parsing - would need proper XML unmarshaling in production
	if strings.Contains(xmlDesc, "arch='x86_64'") || strings.Contains(xmlDesc, "arch=\"x86_64\"") {
		vm.Architecture = "x86_64"
	} else if strings.Contains(xmlDesc, "arch='aarch64'") {
		vm.Architecture = "aarch64"
	}

	if strings.Contains(xmlDesc, "<loader") && strings.Contains(xmlDesc, "OVMF") {
		vm.UEFI = true
	}

	if strings.Contains(xmlDesc, "secure='yes'") {
		vm.SecureBoot = true
	}

	if strings.Contains(xmlDesc, "<tpm") {
		vm.TPM = true
	}

	// Set OS type based on domain type
	if strings.Contains(xmlDesc, "type='kvm'") || strings.Contains(xmlDesc, "type='hvm'") {
		vm.OSType = "hvm"
	} else {
		vm.OSType = "linux"
	}
}

// Helper method to parse storage configuration from XML
func (s *Service) parseStorageConfiguration(xmlDesc string) (*StorageConfigDetail, error) {
	storage := &StorageConfigDetail{
		Disks: []DiskDetail{},
	}

	// This is a simplified parser - in production, use proper XML unmarshaling
	// Parse disk devices
	diskPattern := `(?s)<disk[^>]*>(.*?)</disk>`
	re := regexp.MustCompile(diskPattern)
	matches := re.FindAllStringSubmatch(xmlDesc, -1)

	for _, match := range matches {
		diskXML := match[0]
		disk := DiskDetail{}

		// Parse device type
		if strings.Contains(diskXML, "device='disk'") || strings.Contains(diskXML, "device=\"disk\"") {
			disk.Device = "disk"
		} else if strings.Contains(diskXML, "device='cdrom'") || strings.Contains(diskXML, "device=\"cdrom\"") {
			disk.Device = "cdrom"
		} else if strings.Contains(diskXML, "device='floppy'") || strings.Contains(diskXML, "device=\"floppy\"") {
			disk.Device = "floppy"
		}

		// Parse source file
		if sourceRe := regexp.MustCompile(`source file=['"]([^'"]+)['"]`); sourceRe.MatchString(diskXML) {
			if matches := sourceRe.FindStringSubmatch(diskXML); len(matches) > 1 {
				disk.Path = matches[1]
				disk.SourcePath = matches[1]
				disk.SourceType = "file"
			}
		}

		// Parse target device and bus
		if targetRe := regexp.MustCompile(`target dev=['"]([^'"]+)['"].*?bus=['"]([^'"]+)['"]`); targetRe.MatchString(diskXML) {
			if matches := targetRe.FindStringSubmatch(diskXML); len(matches) > 2 {
				disk.Target = matches[1]
				disk.Bus = DiskBus(matches[2])
			}
		}

		// Parse driver type (format)
		if driverRe := regexp.MustCompile(`driver.*?type=['"]([^'"]+)['"]`); driverRe.MatchString(diskXML) {
			if matches := driverRe.FindStringSubmatch(diskXML); len(matches) > 1 {
				disk.Format = matches[1]
			}
		}

		// Parse cache mode
		if cacheRe := regexp.MustCompile(`driver.*?cache=['"]([^'"]+)['"]`); cacheRe.MatchString(diskXML) {
			if matches := cacheRe.FindStringSubmatch(diskXML); len(matches) > 1 {
				disk.Cache = matches[1]
			}
		}

		// Parse IO mode
		if ioRe := regexp.MustCompile(`driver.*?io=['"]([^'"]+)['"]`); ioRe.MatchString(diskXML) {
			if matches := ioRe.FindStringSubmatch(diskXML); len(matches) > 1 {
				disk.IOMode = matches[1]
			}
		}

		// Check if readonly
		if strings.Contains(diskXML, "<readonly/>") {
			disk.ReadOnly = true
		}

		// Parse boot order
		if bootRe := regexp.MustCompile(`boot order=['"](\d+)['"]`); bootRe.MatchString(diskXML) {
			if matches := bootRe.FindStringSubmatch(diskXML); len(matches) > 1 {
				if order, err := strconv.Atoi(matches[1]); err == nil {
					disk.BootOrder = order
				}
			}
		}

		storage.Disks = append(storage.Disks, disk)
	}

	return storage, nil
}

// Helper method to parse network configuration from XML
func (s *Service) parseNetworkConfiguration(xmlDesc string) ([]NetworkConfigDetail, error) {
	var networks []NetworkConfigDetail

	// Parse interface devices
	interfacePattern := `(?s)<interface[^>]*>(.*?)</interface>`
	re := regexp.MustCompile(interfacePattern)
	matches := re.FindAllStringSubmatch(xmlDesc, -1)

	for _, match := range matches {
		ifaceXML := match[0]
		network := NetworkConfigDetail{}

		// Parse interface type
		if strings.Contains(ifaceXML, "type='network'") || strings.Contains(ifaceXML, "type=\"network\"") {
			network.Type = NetworkTypeNetwork
		} else if strings.Contains(ifaceXML, "type='bridge'") || strings.Contains(ifaceXML, "type=\"bridge\"") {
			network.Type = NetworkTypeBridge
		} else if strings.Contains(ifaceXML, "type='direct'") || strings.Contains(ifaceXML, "type=\"direct\"") {
			network.Type = NetworkTypeDirect
		} else if strings.Contains(ifaceXML, "type='user'") || strings.Contains(ifaceXML, "type=\"user\"") {
			network.Type = NetworkTypeUser
		}

		// Parse source
		if sourceRe := regexp.MustCompile(`source (?:network|bridge|dev)=['"]([^'"]+)['"]`); sourceRe.MatchString(ifaceXML) {
			if matches := sourceRe.FindStringSubmatch(ifaceXML); len(matches) > 1 {
				network.Source = matches[1]
				if network.Type == NetworkTypeBridge {
					network.Bridge = matches[1]
				}
			}
		}

		// Parse MAC address
		if macRe := regexp.MustCompile(`mac address=['"]([^'"]+)['"]`); macRe.MatchString(ifaceXML) {
			if matches := macRe.FindStringSubmatch(ifaceXML); len(matches) > 1 {
				network.MAC = matches[1]
			}
		}

		// Parse model
		if modelRe := regexp.MustCompile(`model type=['"]([^'"]+)['"]`); modelRe.MatchString(ifaceXML) {
			if matches := modelRe.FindStringSubmatch(ifaceXML); len(matches) > 1 {
				network.Model = matches[1]
			}
		} else {
			network.Model = "virtio" // default

			// Parse target device name
			if targetRe := regexp.MustCompile(`target dev=['"]([^'"]+)['"]`); targetRe.MatchString(ifaceXML) {
				if matches := targetRe.FindStringSubmatch(ifaceXML); len(matches) > 1 {
					network.Target = matches[1]
				}
			}
		}

		networks = append(networks, network)
	}

	return networks, nil
}

// Helper method to parse graphics configuration from XML
func (s *Service) parseGraphicsConfiguration(xmlDesc string) ([]EnhancedGraphicsDetail, error) {
	var graphics []EnhancedGraphicsDetail

	// Parse graphics devices
	graphicsPattern := `(?s)<graphics[^>]*>(.*?)</graphics>`
	re := regexp.MustCompile(graphicsPattern)
	matches := re.FindAllStringSubmatch(xmlDesc, -1)

	for _, match := range matches {
		graphicsXML := match[0]
		g := EnhancedGraphicsDetail{}

		// Parse type
		if typeRe := regexp.MustCompile(`type=['"]([^'"]+)['"]`); typeRe.MatchString(graphicsXML) {
			if matches := typeRe.FindStringSubmatch(graphicsXML); len(matches) > 1 {
				g.Type = matches[1]
			}
		}

		// Parse port
		if portRe := regexp.MustCompile(`port=['"]([^'"]+)['"]`); portRe.MatchString(graphicsXML) {
			if matches := portRe.FindStringSubmatch(graphicsXML); len(matches) > 1 {
				if port, err := strconv.Atoi(matches[1]); err == nil {
					g.Port = port
				}
			}
		}

		// Parse autoport
		if strings.Contains(graphicsXML, "autoport='yes'") || strings.Contains(graphicsXML, "autoport=\"yes\"") {
			g.AutoPort = true
		}

		// Parse listen address
		if listenRe := regexp.MustCompile(`listen=['"]([^'"]+)['"]`); listenRe.MatchString(graphicsXML) {
			if matches := listenRe.FindStringSubmatch(graphicsXML); len(matches) > 1 {
				g.Listen = matches[1]
			}
		}

		// Parse websocket port
		if websocketRe := regexp.MustCompile(`websocket=['"]([^'"]+)['"]`); websocketRe.MatchString(graphicsXML) {
			if matches := websocketRe.FindStringSubmatch(graphicsXML); len(matches) > 1 {
				if port, err := strconv.Atoi(matches[1]); err == nil {
					g.Websocket = port
				}
			}
		}

		graphics = append(graphics, g)
	}

	return graphics, nil
}

// Helper method to parse PCI devices from XML
func (s *Service) parsePCIDevices(xmlDesc string) ([]PCIDeviceDetail, error) {
	var pciDevices []PCIDeviceDetail

	// Parse hostdev devices (PCI passthrough)
	hostdevPattern := `(?s)<hostdev[^>]*mode=['"']subsystem['"'][^>]*type=['"']pci['"'][^>]*>(.*?)</hostdev>`
	re := regexp.MustCompile(hostdevPattern)
	matches := re.FindAllStringSubmatch(xmlDesc, -1)

	for _, match := range matches {
		hostdevXML := match[0]
		pci := PCIDeviceDetail{}

		// Parse source address (host address)
		if addrRe := regexp.MustCompile(`<source>.*?<address.*?domain=['"]0x([^'"]+)['"].*?bus=['"]0x([^'"]+)['"].*?slot=['"]0x([^'"]+)['"].*?function=['"]0x([^'"]+)['"].*?</source>`); addrRe.MatchString(hostdevXML) {
			if matches := addrRe.FindStringSubmatch(hostdevXML); len(matches) > 4 {
				pci.HostAddress = fmt.Sprintf("%s:%s:%s.%s", matches[1], matches[2], matches[3], matches[4])
			}
		}

		// Parse guest address if present
		if guestAddrRe := regexp.MustCompile(`<address.*?type=['"]pci['"].*?domain=['"]0x([^'"]+)['"].*?bus=['"]0x([^'"]+)['"].*?slot=['"]0x([^'"]+)['"].*?function=['"]0x([^'"]+)['"]`); guestAddrRe.MatchString(hostdevXML) {
			if matches := guestAddrRe.FindStringSubmatch(hostdevXML); len(matches) > 4 {
				pci.GuestAddress = fmt.Sprintf("%s:%s:%s.%s", matches[1], matches[2], matches[3], matches[4])
			}
		}

		// Parse ROM file if present
		if romRe := regexp.MustCompile(`<rom file=['"]([^'"]+)['"]`); romRe.MatchString(hostdevXML) {
			if matches := romRe.FindStringSubmatch(hostdevXML); len(matches) > 1 {
				pci.ROMFile = matches[1]
			}
		}

		// Check if multifunction
		if strings.Contains(hostdevXML, "multifunction='on'") || strings.Contains(hostdevXML, "multifunction=\"on\"") {
			pci.Multifunction = true
		}

		pciDevices = append(pciDevices, pci)
	}

	return pciDevices, nil
}

// Helper method to parse cloud-init configuration from XML
func (s *Service) parseCloudInitConfiguration(xmlDesc string) (*CloudInitDetail, error) {
	// Look for cloud-init disks or metadata
	// This is a simplified implementation - would need more sophisticated parsing

	// Check for cloud-init ISO or disk
	if !strings.Contains(xmlDesc, "cloud-init") && !strings.Contains(xmlDesc, "cidata") {
		return nil, nil
	}

	cloudInit := &CloudInitDetail{}

	// Find cloud-init source
	if sourceRe := regexp.MustCompile(`source file=['"]([^'"]*(?:cloud-init|cidata)[^'"]+)['"]`); sourceRe.MatchString(xmlDesc) {
		if matches := sourceRe.FindStringSubmatch(xmlDesc); len(matches) > 1 {
			cloudInit.Source = matches[1]
			if strings.HasSuffix(cloudInit.Source, ".iso") {
				cloudInit.SourceType = "cdrom"
			} else {
				cloudInit.SourceType = "disk"
			}
		}
	}

	// Try to extract hostname from metadata in XML comments or description
	if hostnameRe := regexp.MustCompile(`hostname:\s*([^\s,]+)`); hostnameRe.MatchString(xmlDesc) {
		if matches := hostnameRe.FindStringSubmatch(xmlDesc); len(matches) > 1 {
			cloudInit.Hostname = matches[1]
		}
	}

	return cloudInit, nil
}

// Helper method to extract template information from XML
func (s *Service) extractTemplateInfo(xmlDesc string) string {
	// Look for template metadata in description or metadata
	if templateRe := regexp.MustCompile(`<metadata>.*?template['":\s]+([^'"<\s]+).*?</metadata>`); templateRe.MatchString(xmlDesc) {
		if matches := templateRe.FindStringSubmatch(xmlDesc); len(matches) > 1 {
			return matches[1]
		}
	}

	// Check description for template info
	if descRe := regexp.MustCompile(`<description>.*?[Tt]emplate:\s*([^<\n]+).*?</description>`); descRe.MatchString(xmlDesc) {
		if matches := descRe.FindStringSubmatch(xmlDesc); len(matches) > 1 {
			return strings.TrimSpace(matches[1])
		}
	}

	return ""
}

// Helper method to get VM metadata
func (s *Service) getVMMetadata(domain *libvirt.Domain) (map[string]string, error) {
	metadata := make(map[string]string)

	// Try to get metadata from domain description
	if desc, err := domain.GetMetadata(libvirt.DOMAIN_METADATA_DESCRIPTION, "", 0); err == nil && desc != "" {
		// Parse key-value pairs from description
		lines := strings.Split(desc, "\n")
		for _, line := range lines {
			if parts := strings.SplitN(line, ":", 2); len(parts) == 2 {
				key := strings.TrimSpace(parts[0])
				value := strings.TrimSpace(parts[1])
				if key != "" && value != "" {
					metadata[key] = value
				}
			}
		}
	}

	return metadata, nil
}

// Helper method to enrich network statistics
func (s *Service) enrichNetworkStatistics(domain *libvirt.Domain, vm *VMEnhanced) {
	for i, network := range vm.Networks {
		if network.MAC == "" {
			continue
		}

		// Get interface statistics
		stats, err := domain.InterfaceStats(network.Target)
		if err == nil {
			vm.Networks[i].RxBytes = stats.RxBytes
			vm.Networks[i].TxBytes = stats.TxBytes
			vm.Networks[i].RxPackets = stats.RxPackets
			vm.Networks[i].TxPackets = stats.TxPackets
		}
	}
}

// Helper method to enrich disk storage information
func (s *Service) enrichDiskStorageInfo(vm *VMEnhanced) {
	for i, disk := range vm.Storage.Disks {
		if disk.Path == "" {
			continue
		}

		// Try to determine storage pool from path
		poolName := s.getStoragePoolFromPath(disk.Path)
		if poolName != "" {
			vm.Storage.Disks[i].StoragePool = poolName
		}

		// Get volume information if possible
		if pool, err := s.conn.LookupStoragePoolByName(poolName); err == nil {
			defer pool.Free()

			volumeName := filepath.Base(disk.Path)
			if vol, err := pool.LookupStorageVolByName(volumeName); err == nil {
				defer vol.Free()

				if info, err := vol.GetInfo(); err == nil {
					vm.Storage.Disks[i].Capacity = info.Capacity
					vm.Storage.Disks[i].Allocation = info.Allocation
					vm.Storage.Disks[i].Size = info.Capacity / (1024 * 1024 * 1024) // Convert to GB
				}
			}
		}
	}
}

// Helper method to determine storage pool from file path
func (s *Service) getStoragePoolFromPath(path string) string {
	// Common storage pool paths
	poolPaths := map[string]string{
		"/var/lib/libvirt/images": "default",
		"/var/lib/vapor/images":   "vapor",
		"/mnt/storage":            "storage",
	}

	for prefix, poolName := range poolPaths {
		if strings.HasPrefix(path, prefix) {
			return poolName
		}
	}

	// Try to extract pool name from path
	if strings.Contains(path, "/libvirt/") {
		parts := strings.Split(path, "/libvirt/")
		if len(parts) > 1 {
			subParts := strings.Split(parts[1], "/")
			if len(subParts) > 0 {
				return subParts[0]
			}
		}
	}

	return "default"
}

// SetNetworkLinkState changes the link state of a VM's network interface
func (s *Service) SetNetworkLinkState(ctx context.Context, nameOrUUID string, req *NetworkLinkStateRequest) (*NetworkLinkStateResponse, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	domain, err := s.lookupDomain(nameOrUUID)
	if err != nil {
		return nil, err
	}
	defer domain.Free()

	// Get domain XML to find the interface
	xmlDesc, err := domain.GetXMLDesc(0)
	if err != nil {
		return nil, fmt.Errorf("failed to get domain XML: %w", err)
	}

	// Parse XML to verify interface exists and get its details
	var domainXML struct {
		XMLName xml.Name `xml:"domain"`
		Devices struct {
			Interfaces []struct {
				XMLName xml.Name `xml:"interface"`
				Type    string   `xml:"type,attr"`
				Target  struct {
					Dev string `xml:"dev,attr"`
				} `xml:"target"`
				MAC struct {
					Address string `xml:"address,attr"`
				} `xml:"mac"`
				Source struct {
					Bridge  string `xml:"bridge,attr,omitempty"`
					Network string `xml:"network,attr,omitempty"`
					Dev     string `xml:"dev,attr,omitempty"`
				} `xml:"source"`
				Model struct {
					Type string `xml:"type,attr,omitempty"`
				} `xml:"model"`
				Link struct {
					State string `xml:"state,attr,omitempty"`
				} `xml:"link"`
			} `xml:"interface"`
		} `xml:"devices"`
	}

	if err := xml.Unmarshal([]byte(xmlDesc), &domainXML); err != nil {
		return nil, fmt.Errorf("failed to parse domain XML: %w", err)
	}

	// Find the interface by name or MAC
	var targetInterfaceIdx int = -1
	var targetInterface string
	var macAddress string

	for idx, iface := range domainXML.Devices.Interfaces {
		if iface.Target.Dev == req.Interface || iface.MAC.Address == req.Interface {
			targetInterfaceIdx = idx
			targetInterface = iface.Target.Dev
			macAddress = iface.MAC.Address
			break
		}
	}

	if targetInterfaceIdx == -1 {
		return nil, fmt.Errorf("interface %s not found", req.Interface)
	}

	// Update the link state in the interface XML
	iface := domainXML.Devices.Interfaces[targetInterfaceIdx]

	// Build the interface XML with updated link state
	interfaceXML := fmt.Sprintf(`<interface type='%s'>`, iface.Type)

	// Add source based on type
	if iface.Source.Bridge != "" {
		interfaceXML += fmt.Sprintf(`<source bridge='%s'/>`, iface.Source.Bridge)
	} else if iface.Source.Network != "" {
		interfaceXML += fmt.Sprintf(`<source network='%s'/>`, iface.Source.Network)
	} else if iface.Source.Dev != "" {
		interfaceXML += fmt.Sprintf(`<source dev='%s'/>`, iface.Source.Dev)
	}

	// Add target device
	if targetInterface != "" {
		interfaceXML += fmt.Sprintf(`<target dev='%s'/>`, targetInterface)
	}

	// Add MAC address
	interfaceXML += fmt.Sprintf(`<mac address='%s'/>`, macAddress)

	// Add model if present
	if iface.Model.Type != "" {
		interfaceXML += fmt.Sprintf(`<model type='%s'/>`, iface.Model.Type)
	}

	// Add link state
	interfaceXML += fmt.Sprintf(`<link state='%s'/>`, req.State)
	interfaceXML += `</interface>`

	// Update the device (this is equivalent to virsh domif-setlink)
	flags := libvirt.DOMAIN_DEVICE_MODIFY_LIVE | libvirt.DOMAIN_DEVICE_MODIFY_CONFIG
	if err := domain.UpdateDeviceFlags(interfaceXML, flags); err != nil {
		// If live update fails, try config only
		if err := domain.UpdateDeviceFlags(interfaceXML, libvirt.DOMAIN_DEVICE_MODIFY_CONFIG); err != nil {
			return nil, fmt.Errorf("failed to set interface link state: %w", err)
		}
	}

	return &NetworkLinkStateResponse{
		Status:    "success",
		Message:   fmt.Sprintf("Network interface %s link state changed to %s", targetInterface, req.State),
		Interface: targetInterface,
		State:     req.State,
		MAC:       macAddress,
	}, nil
}

// GetNetworkLinkState retrieves the current link state of a VM's network interface
func (s *Service) GetNetworkLinkState(ctx context.Context, nameOrUUID string, interfaceName string) (*NetworkLinkStateResponse, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	domain, err := s.lookupDomain(nameOrUUID)
	if err != nil {
		return nil, err
	}
	defer domain.Free()

	// Get domain XML to find the interface
	xmlDesc, err := domain.GetXMLDesc(0)
	if err != nil {
		return nil, fmt.Errorf("failed to get domain XML: %w", err)
	}

	// Parse XML to find interface and get its details
	var domainXML struct {
		XMLName xml.Name `xml:"domain"`
		Devices struct {
			Interfaces []struct {
				XMLName xml.Name `xml:"interface"`
				Type    string   `xml:"type,attr"`
				Target  struct {
					Dev string `xml:"dev,attr"`
				} `xml:"target"`
				MAC struct {
					Address string `xml:"address,attr"`
				} `xml:"mac"`
				Source struct {
					Bridge  string `xml:"bridge,attr,omitempty"`
					Network string `xml:"network,attr,omitempty"`
					Dev     string `xml:"dev,attr,omitempty"`
				} `xml:"source"`
				Model struct {
					Type string `xml:"type,attr,omitempty"`
				} `xml:"model"`
				Link struct {
					State string `xml:"state,attr,omitempty"`
				} `xml:"link"`
			} `xml:"interface"`
		} `xml:"devices"`
	}

	if err := xml.Unmarshal([]byte(xmlDesc), &domainXML); err != nil {
		return nil, fmt.Errorf("failed to parse domain XML: %w", err)
	}

	// Find the interface by name or MAC
	for _, iface := range domainXML.Devices.Interfaces {
		if iface.Target.Dev == interfaceName || iface.MAC.Address == interfaceName {
			// Default link state is "up" if not explicitly set
			linkState := iface.Link.State
			if linkState == "" {
				linkState = "up"
			}

			return &NetworkLinkStateResponse{
				Status:    "success",
				Message:   fmt.Sprintf("Network interface %s link state retrieved", iface.Target.Dev),
				Interface: iface.Target.Dev,
				State:     linkState,
				MAC:       iface.MAC.Address,
			}, nil
		}
	}

	return nil, fmt.Errorf("interface %s not found", interfaceName)
}
