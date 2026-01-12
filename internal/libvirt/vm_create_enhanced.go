package libvirt

import (
	"context"
	"encoding/xml"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"libvirt.org/go/libvirt"
)

// VMCreateRequestEnhanced represents an enhanced request to create a new VM
type VMCreateRequestEnhanced struct {
	Name   string `json:"name" binding:"required"`
	Memory uint64 `json:"memory" binding:"required"` // in MB
	VCPUs  uint   `json:"vcpus" binding:"required"`

	// Nested storage configuration
	Storage *StorageConfig `json:"storage" binding:"required"`

	// OS configuration
	// Detailed OS information for metadata
	OSInfo *OSInfoEnhanced `json:"os_info,omitempty"`

	OSType       string `json:"os_type"`              // linux, windows, etc
	OSVariant    string `json:"os_variant,omitempty"` // ubuntu20.04, win10, etc
	Architecture string `json:"architecture"`         // x86_64 by default
	UEFI         bool   `json:"uefi"`                 // Use UEFI boot
	SecureBoot   bool   `json:"secure_boot"`          // Enable secure boot
	TPM          bool   `json:"tpm"`                  // Add TPM device

	// Network configuration
	Networks []NetworkConfig `json:"networks,omitempty"` // Multiple networks

	// Graphics configuration
	Graphics []EnhancedGraphicsConfig `json:"graphics,omitempty"` // Support multiple graphics devices

	// PCI device passthrough at creation
	PCIDevices []PCIDeviceConfig `json:"pci_devices,omitempty"`

	// Cloud-init configuration
	CloudInit *CloudInitConfig `json:"cloud_init,omitempty"`

	// Template to use
	Template string `json:"template,omitempty"`

	// Auto-start on host boot
	AutoStart bool `json:"autostart"`

	// Custom XML overrides (advanced users)
	CustomXML string `json:"custom_xml,omitempty"`

	// Metadata for the VM
	Metadata map[string]string `json:"metadata,omitempty"`
}

// StorageConfig represents the nested storage configuration
type StorageConfig struct {
	Disks []DiskCreateConfig `json:"disks" binding:"required,min=1"` // Array of disk configurations
}

// EnhancedGraphicsConfig extends graphics configuration
type EnhancedGraphicsConfig struct {
	Type     string `json:"type" binding:"required"` // vnc, spice, egl-headless, none
	Port     int    `json:"port,omitempty"`          // -1 for auto
	AutoPort bool   `json:"autoport,omitempty"`      // Auto-assign port
	Listen   string `json:"listen,omitempty"`        // Listen address (default: 127.0.0.1)
	Password string `json:"password,omitempty"`
}

// DiskCreateConfig represents disk configuration for VM creation
type DiskCreateConfig struct {
	// Disk creation action
	Action string `json:"action" binding:"required,oneof=create attach clone"` // "create", "attach", "clone"

	// For create action
	Size   uint64 `json:"size,omitempty"`   // Size in GB for new disk (required for create)
	Format string `json:"format,omitempty"` // qcow2, raw, etc (default: qcow2)

	// For attach/clone action or override
	Path string `json:"path,omitempty"` // Path to existing disk or relative path

	// Storage pool override (if different from default_pool)
	StoragePool string `json:"storage_pool" binding:"required"`

	// For clone action
	CloneFrom string `json:"clone_from,omitempty"` // Path to source disk to clone (required for clone)

	// Common options
	Bus       DiskBus `json:"bus,omitempty"`        // virtio, sata, scsi, ide (default: virtio)
	BootOrder int     `json:"boot_order,omitempty"` // Boot priority (1 = first)
	Cache     string  `json:"cache,omitempty"`      // none, writethrough, writeback
	IOMode    string  `json:"io_mode,omitempty"`    // native, threads
	ReadOnly  bool    `json:"readonly"`
	Device    string  `json:"device,omitempty"` // "disk", "cdrom", "floppy"

	// Target device (auto-generated if not specified)
	Target string `json:"target,omitempty"` // vda, vdb, sda, hdc, etc
}

// PCIDeviceConfig represents PCI device passthrough configuration
type PCIDeviceConfig struct {
	HostAddress   string `json:"host_address" binding:"required"` // Required: PCI address on host (e.g., "0000:01:00.0")
	GuestAddress  string `json:"guest_address,omitempty"`         // Optional: PCI address in guest (auto-assign if omitted)
	ROMFile       string `json:"rom_file,omitempty"`              // Optional: Path to ROM file (for GPU passthrough)
	Multifunction bool   `json:"multifunction,omitempty"`         // Optional: Enable multifunction (default: false)
	PrimaryGPU    bool   `json:"primary_gpu,omitempty"`           // Optional: Set as primary GPU (for GPU passthrough)
}

// CreateVMEnhanced creates a VM with enhanced disk and ISO support
func (s *Service) CreateVMEnhanced(ctx context.Context, req *VMCreateRequestEnhanced) (*VM, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Validate storage is provided
	if req.Storage == nil {
		err := fmt.Errorf("storage configuration is required")
		log.Printf("CreateVMEnhanced error: %v\n", err)
		return nil, err
	}

	// Apply template if specified
	if req.Template != "" {
		if err := s.applyVMTemplate(ctx, req); err != nil {
			log.Printf("CreateVMEnhanced error applying template: %v\n", err)
			return nil, fmt.Errorf("failed to apply template: %w", err)
		}
	}

	// Validate and prepare storage configuration
	diskConfigs, err := s.prepareEnhancedStorageConfig(ctx, req)
	if err != nil {
		log.Printf("CreateVMEnhanced error preparing storage: %v\n", err)
		return nil, fmt.Errorf("failed to prepare storage: %w", err)
	}

	// Validate PCI devices if specified
	if len(req.PCIDevices) > 0 {
		if err := s.validatePCIDevices(ctx, req.PCIDevices); err != nil {
			log.Printf("CreateVMEnhanced error validating PCI devices: %v\n", err)
			return nil, fmt.Errorf("failed to validate PCI devices: %w", err)
		}
	}

	// Generate enhanced domain XML with OS metadata
	domainXML, err := s.generateEnhancedDomainXML(req, diskConfigs)
	if err != nil {
		log.Printf("CreateVMEnhanced error generating domain XML: %v\n", err)
		// Clean up any created disks on failure
		s.cleanupCreatedDisks(diskConfigs)
		return nil, fmt.Errorf("failed to generate domain XML: %w", err)
	}

	// Create the domain
	domain, err := s.conn.DomainDefineXML(domainXML)
	if err != nil {
		log.Printf("CreateVMEnhanced error defining domain: %v\n", err)
		// Clean up any created disks on failure
		s.cleanupCreatedDisks(diskConfigs)
		return nil, fmt.Errorf("failed to define domain: %w", err)
	}
	defer domain.Free()

	// TODO: Attach PCI devices if specified
	// This would require implementing the PCI attachment logic

	// Set autostart if requested
	if req.AutoStart {
		if err := domain.SetAutostart(true); err != nil {
			log.Printf("CreateVMEnhanced warning - failed to set autostart: %v\n", err)
		}
	}

	// Start the VM if boot ISO is provided (for installation)
	// Start the VM if boot ISO is provided
	hasBootISO := false
	for _, disk := range diskConfigs {
		if disk.IsBootISO {
			hasBootISO = true
			break
		}
	}
	if hasBootISO {
		if err := domain.Create(); err != nil {
			log.Printf("CreateVMEnhanced warning - failed to start VM: %v\n", err)
		}
	}

	return s.domainToVM(domain)
}

// prepareEnhancedStorageConfig validates and prepares the storage configuration
func (s *Service) prepareEnhancedStorageConfig(ctx context.Context, req *VMCreateRequestEnhanced) ([]PreparedDisk, error) {
	var disks []PreparedDisk
	// Process each disk configuration
	for i, diskConfig := range req.Storage.Disks {

		// Validate action-specific requirements
		switch diskConfig.Action {
		case "create":
			if diskConfig.Size == 0 {
				return nil, fmt.Errorf("disk %d: size is required for create action", i)
			}
		case "attach":
			if diskConfig.Path == "" {
				return nil, fmt.Errorf("disk %d: path is required for attach action", i)
			}
		case "clone":
			if diskConfig.CloneFrom == "" {
				return nil, fmt.Errorf("disk %d: clone_from is required for clone action", i)
			}
		}

		// storage_pool is now required at disk level
		poolName := diskConfig.StoragePool
		// Validate the storage pool exists
		if err := s.validateStoragePool(ctx, poolName); err != nil {
			log.Printf("prepareEnhancedStorageConfig: error validating storage pool: %v\n", err)
			return nil, fmt.Errorf("storage pool %s not found for disk %d: %w", poolName, i, err)
		}

		// Prepare the disk based on action
		var prepDisk PreparedDisk
		prepDisk.StoragePool = poolName
		prepDisk.Config = diskConfig

		switch diskConfig.Action {
		case "create":
			path, err := s.createEnhancedDisk(ctx, diskConfig, poolName, fmt.Sprintf("%s-disk%d", req.Name, i))
			if err != nil {
				log.Printf("prepareEnhancedStorageConfig: warning - in operation for path, err :: %v\n", err)
				// Clean up any previously created disks
				s.cleanupCreatedDisks(disks)
				return nil, fmt.Errorf("failed to create disk %d: %w", i, err)
			}
			prepDisk.Path = path
			prepDisk.Created = true

		case "attach":
			path, err := s.resolveEnhancedDiskPath(ctx, diskConfig.Path, poolName)
			if err != nil {
				log.Printf("prepareEnhancedStorageConfig: error in operation for path, err :: %v\n", err)
				return nil, fmt.Errorf("failed to resolve path for disk %d: %w", i, err)
			}
			prepDisk.Path = path

		case "clone":
			sourcePath, err := s.resolveEnhancedDiskPath(ctx, diskConfig.CloneFrom, poolName)
			if err != nil {
				log.Printf("prepareEnhancedStorageConfig: error in operation for sourcePath, err :: %v\n", err)
				return nil, fmt.Errorf("failed to resolve clone source for disk %d: %w", i, err)
			}
			targetPath, err := s.cloneEnhancedDisk(ctx, sourcePath, poolName, fmt.Sprintf("%s-disk%d", req.Name, i))
			if err != nil {
				log.Printf("prepareEnhancedStorageConfig: warning - in operation for targetPath, err :: %v\n", err)
				s.cleanupCreatedDisks(disks)
				return nil, fmt.Errorf("failed to clone disk %d: %w", i, err)
			}
			prepDisk.Path = targetPath
			prepDisk.Created = true
		}

		// If this is an ISO attachment, normalize disk settings to avoid invalid driver/device combos.
		// ISO images are raw files and should be attached as a read-only CD-ROM.
		if strings.EqualFold(filepath.Ext(prepDisk.Path), ".iso") {
			if prepDisk.Config.Format == "" || !strings.EqualFold(prepDisk.Config.Format, "raw") {
				if prepDisk.Config.Format != "" && !strings.EqualFold(prepDisk.Config.Format, "raw") {
					log.Printf("prepareEnhancedStorageConfig: overriding disk format %q to %q for ISO %q\n", prepDisk.Config.Format, "raw", prepDisk.Path)
				}
				prepDisk.Config.Format = "raw"
			}

			if prepDisk.Config.Device == "" || strings.EqualFold(prepDisk.Config.Device, "disk") || strings.EqualFold(prepDisk.Config.Device, "floppy") {
				prepDisk.Config.Device = "cdrom"
			}

			prepDisk.Config.ReadOnly = true

			// Prefer IDE if caller didn't specify a bus; it's the most compatible for CD-ROMs.
			if prepDisk.Config.Bus == "" {
				prepDisk.Config.Bus = DiskBusIDE
			}

			// Conventional IDE CD-ROM target is hdc; only set when caller didn't specify.
			if prepDisk.Config.Target == "" && prepDisk.Config.Bus == DiskBusIDE {
				prepDisk.Config.Target = "hdc"
			}
		}

		// Set default bus if not specified
		if prepDisk.Config.Bus == "" {
			prepDisk.Config.Bus = DiskBusVirtio
		}

		// Auto-generate target if not specified
		if prepDisk.Config.Target == "" {
			prepDisk.Config.Target = s.generateDiskTarget(prepDisk.Config.Bus, i)
		}

		// Set default format if not specified
		if prepDisk.Config.Format == "" {
			prepDisk.Config.Format = "qcow2"
		}

		disks = append(disks, prepDisk)
	}

	return disks, nil
}

// resolveEnhancedDiskPath resolves a disk path considering storage pools
func (s *Service) resolveEnhancedDiskPath(ctx context.Context, path string, poolName string) (string, error) {
	// If absolute path, use as-is
	if filepath.IsAbs(path) {
		return path, nil
	}

	// Get pool path
	poolPath := fmt.Sprintf("/var/lib/libvirt/images/%s", poolName)
	return filepath.Join(poolPath, path), nil
}

// validateStoragePool checks if a storage pool exists
func (s *Service) validateStoragePool(ctx context.Context, poolName string) error {
	if s.conn == nil {
		return fmt.Errorf("libvirt connection not initialized")
	}
	pool, err := s.conn.LookupStoragePoolByName(poolName)
	if err != nil {
		log.Printf("validateStoragePool: error in operation for pool, err :: %v\n", err)
		return err
	}
	defer pool.Free()
	return nil
}

// createEnhancedDisk creates a new disk in the specified storage pool
func (s *Service) createEnhancedDisk(ctx context.Context, config DiskCreateConfig, poolName string, diskName string) (string, error) {
	if config.Format == "" {
		config.Format = "qcow2"
	}

	// Use the existing createDisk method
	return s.createDisk(poolName, diskName, config.Size)
}

// cloneEnhancedDisk clones an existing disk to a new location
func (s *Service) cloneEnhancedDisk(ctx context.Context, sourcePath string, poolName string, diskName string) (string, error) {
	// Use the existing cloneDisk method
	return s.cloneDisk(poolName, sourcePath, diskName)
}

// generateDiskTarget generates a disk target device name based on bus type
func (s *Service) generateDiskTarget(bus DiskBus, index int) string {
	switch bus {
	case DiskBusVirtio:
		return fmt.Sprintf("vd%c", 'a'+index)
	case DiskBusSATA, DiskBusSCSI:
		return fmt.Sprintf("sd%c", 'a'+index)
	case DiskBusIDE:
		return fmt.Sprintf("hd%c", 'a'+index)
	default:
		return fmt.Sprintf("vd%c", 'a'+index)
	}
}

// cleanupCreatedDisks removes any disks that were created during failed VM creation
func (s *Service) cleanupCreatedDisks(disks []PreparedDisk) {
	for _, disk := range disks {
		if disk.Created {
			os.Remove(disk.Path)
		}
	}
}

// validatePCIDevices validates PCI devices for passthrough
func (s *Service) validatePCIDevices(ctx context.Context, devices []PCIDeviceConfig) error {
	for i, device := range devices {
		// Check if device exists
		if err := s.checkPCIDeviceExists(device.HostAddress); err != nil {
			log.Printf("validatePCIDevices: error in operation: %v\n", err)
			return fmt.Errorf("device %d (%s): %w", i, device.HostAddress, err)
		}

		// Check IOMMU group
		if err := s.checkIOMMUGroup(device.HostAddress); err != nil {
			log.Printf("validatePCIDevices: error in operation: %v\n", err)
			return fmt.Errorf("device %d (%s) IOMMU check failed: %w", i, device.HostAddress, err)
		}

		// Check ROM file if specified
		if device.ROMFile != "" {
			if _, err := os.Stat(device.ROMFile); err != nil {
				return fmt.Errorf("device %d (%s) ROM file not found: %w", i, device.HostAddress, err)
			}
		}
	}
	return nil
}

// checkPCIDeviceExists verifies if a PCI device exists on the host
func (s *Service) checkPCIDeviceExists(address string) error {
	// Check using lspci
	cmd := fmt.Sprintf("lspci -s %s", address)
	output, err := s.executeSystemCommandWithOutput(cmd)
	if err != nil || output == "" {
		log.Printf("checkPCIDeviceExists: error in operation for output, err :: %v\n", err)
		return fmt.Errorf("PCI device not found")
	}
	return nil
}

// checkIOMMUGroup checks if the device's IOMMU group is available
func (s *Service) checkIOMMUGroup(address string) error {
	// Check if IOMMU is enabled
	iommuPath := fmt.Sprintf("/sys/bus/pci/devices/%s/iommu_group", address)
	if _, err := os.Stat(iommuPath); err != nil {
		return fmt.Errorf("IOMMU not enabled or device not in IOMMU group")
	}
	return nil
}

// applyVMTemplate applies a template to the VM creation request
func (s *Service) applyVMTemplate(ctx context.Context, req *VMCreateRequestEnhanced) error {
	// Get template by name
	template, err := s.TemplateService.GetTemplateByName(ctx, req.Template)
	if err != nil {
		log.Printf("applyVMTemplate: error in operation for template, err :: %v\n", err)
		return fmt.Errorf("template '%s' not found: %w", req.Template, err)
	}

	// Apply template values (only if not already set in request)
	// Memory and VCPUs
	if req.Memory == 0 && template.RecommendedMemory > 0 {
		req.Memory = template.RecommendedMemory
	}
	if req.VCPUs == 0 && template.RecommendedVCPUs > 0 {
		req.VCPUs = template.RecommendedVCPUs
	}

	// OS configuration

	if req.OSType == "" {
		req.OSType = template.OSType
	}
	if req.OSVariant == "" {
		req.OSVariant = template.OSVariant
	}

	// Storage - merge strategy (only if storage not fully specified)
	if req.Storage == nil {
		req.Storage = &StorageConfig{
			Disks: []DiskCreateConfig{
				{
					Action:      "create",
					Size:        template.RecommendedDisk,
					Format:      template.DiskFormat,
					Bus:         DiskBusVirtio,
					StoragePool: "default",
				},
			},
		}
	}

	// Network - replace if not specified
	if len(req.Networks) == 0 && template.NetworkModel != "" {
		req.Networks = []NetworkConfig{
			{
				Type:   NetworkTypeNetwork,
				Source: "default",
				Model:  template.NetworkModel,
			},
		}
	}

	// Graphics - replace if not specified
	if len(req.Graphics) == 0 && template.GraphicsType != "" {
		req.Graphics = []EnhancedGraphicsConfig{
			{
				Type:     template.GraphicsType,
				AutoPort: true,
				Listen:   "0.0.0.0",
			},
		}
	}

	// Boot configuration
	req.UEFI = req.UEFI || template.UEFIBoot
	req.SecureBoot = req.SecureBoot || template.SecureBoot
	req.TPM = req.TPM || template.TPM

	// Merge metadata
	if template.Metadata != nil {
		if req.Metadata == nil {
			req.Metadata = make(map[string]string)
		}
		for k, v := range template.Metadata {
			if _, exists := req.Metadata[k]; !exists {
				req.Metadata[k] = v
			}
		}
	}

	return nil
}

// ISOUploadRequest represents a request to upload an ISO
type ISOUploadRequest struct {
	Name         string   `json:"name" binding:"required"`
	URL          string   `json:"url,omitempty"`  // Download from URL
	Path         string   `json:"path,omitempty"` // Local path (for server-side)
	OSType       string   `json:"os_type,omitempty"`
	OSVariant    string   `json:"os_variant,omitempty"`
	Architecture string   `json:"architecture,omitempty"`
	Description  string   `json:"description,omitempty"`
	Tags         []string `json:"tags,omitempty"`
	PoolName     string   `json:"pool_name,omitempty"` // Associated storage pool name (defaults to "default")
}

// UploadISO registers or downloads an ISO image
func (s *Service) UploadISO(ctx context.Context, req *ISOUploadRequest) (*ISOImage, error) {
	var isoPath string

	// Determine ISO location
	if req.Path != "" {
		isoPath = req.Path
	} else if req.URL != "" {
		// Download from URL
		return nil, fmt.Errorf("URL download not implemented")
	} else {
		return nil, fmt.Errorf("either path or URL must be specified")
	}

	// Verify the file exists
	fileInfo, err := os.Stat(isoPath)
	if err != nil {
		log.Printf("UploadISO: error checking file status: %v\n", err)
		return nil, fmt.Errorf("ISO file not found: %w", err)
	}

	// Determine pool name (default to "default" if not specified)
	poolName := req.PoolName
	if poolName == "" {
		poolName = "default"
	}

	// Generate a unique ID
	imageID, err := generateRandomID(8)
	if err != nil {
		log.Printf("UploadISO: error in operation for imageID, err :: %v\n", err)
		return nil, fmt.Errorf("failed to generate ID: %w", err)
	}

	iso := &ISOImage{
		ImageID:      imageID,
		Filename:     req.Name,
		Path:         isoPath,
		SizeBytes:    fileInfo.Size(),
		OSType:       req.OSType,
		OSVersion:    req.OSVariant,
		Architecture: req.Architecture,
		Description:  req.Description,
		CreatedAt:    time.Now(),
		StoragePool:  poolName,
		UploadStatus: "completed",
		IsPublic:     true,
		UploadedBy:   "system",
	}

	// Attach pool_name to metadata so it is visible in API responses
	if iso.Metadata == nil {
		iso.Metadata = make(map[string]string)
	}
	iso.Metadata["pool_name"] = poolName

	// Store in database if available
	if s.db != nil {
		_, err = s.db.ExecContext(ctx, `
INSERT INTO iso_images (
name, path, size_bytes,
os_type, os_variant, architecture,
description, uploaded_at, pool_name
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			iso.Filename, iso.Path, iso.SizeBytes,
			iso.OSType, iso.OSVersion, iso.Architecture,
			iso.Description, iso.CreatedAt, poolName,
		)
		if err != nil {
			log.Printf("UploadISO: error in operation: %v\n", err)
			return nil, fmt.Errorf("failed to store ISO in database: %w", err)
		}
	}

	return iso, nil
}

// ListISOs returns available ISO images
func (s *Service) ListISOs(ctx context.Context) ([]ISOImage, error) {
	if s.db == nil {
		// If no database, return empty list
		return []ISOImage{}, nil
	}

	// Query from database
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, name, path, size_bytes, 
		       COALESCE(os_type, ''), COALESCE(os_variant, ''), COALESCE(architecture, ''), 
		       COALESCE(description, ''), uploaded_at, 
		       COALESCE(md5_hash, ''), COALESCE(sha256_hash, ''),
		       COALESCE(pool_name, 'default')
		FROM iso_images 
		ORDER BY uploaded_at DESC
	`)
	if err != nil {
		log.Printf("ListISOs: error in operation: %v\n", err)
		return nil, fmt.Errorf("failed to query ISOs: %w", err)
	}
	defer rows.Close()

	var isos []ISOImage
	for rows.Next() {
		var id int
		var iso ISOImage
		var poolName string
		err := rows.Scan(
			&id, &iso.Filename, &iso.Path, &iso.SizeBytes,
			&iso.OSType, &iso.OSVersion, &iso.Architecture,
			&iso.Description, &iso.CreatedAt, &iso.MD5Hash, &iso.SHA256Hash, &poolName,
		)
		if err != nil {
			log.Printf("ListISOs: error in operation: %v\n", err)
			return nil, fmt.Errorf("failed to scan ISO row: %w", err)
		}
		// Convert numeric ID to string image_id
		iso.ImageID = fmt.Sprintf("iso-%d", id)
		if iso.Metadata == nil {
			iso.Metadata = make(map[string]string)
		}
		iso.Metadata["pool_name"] = poolName
		iso.StoragePool = poolName
		isos = append(isos, iso)
	}

	return isos, nil
}

// DeleteISO deletes an ISO image
func (s *Service) DeleteISO(ctx context.Context, isoID string) error {
	if s.db == nil {
		return fmt.Errorf("database not configured")
	}

	// Extract numeric ID from image_id (format: "iso-123")
	var numericID int
	if strings.HasPrefix(isoID, "iso-") {
		fmt.Sscanf(isoID, "iso-%d", &numericID)
	} else {
		// Try to parse as plain number
		numericID, _ = strconv.Atoi(isoID)
	}

	// Get ISO info
	var isoPath string
	err := s.db.QueryRowContext(ctx, "SELECT path FROM iso_images WHERE id = ?", numericID).Scan(&isoPath)
	if err != nil {
		log.Printf("DeleteISO: error in operation for err :: %v\n", err)
		return fmt.Errorf("ISO not found: %w", err)
	}

	// Delete from database
	_, err = s.db.ExecContext(ctx, "DELETE FROM iso_images WHERE id = ?", numericID)
	if err != nil {
		log.Printf("DeleteISO: error in operation for _, err: %v\n", err)
		return fmt.Errorf("failed to delete ISO record: %w", err)
	}

	// Optionally delete the file (check if it's in managed directory)
	managedDirs := []string{
		"/var/lib/libvirt/images",
		"/var/lib/vapor/isos",
	}

	for _, dir := range managedDirs {
		if strings.HasPrefix(isoPath, dir) {
			if err := os.Remove(isoPath); err != nil && !os.IsNotExist(err) {
				log.Printf("cleanupBootISO: warning - failed to delete ISO file: %v\n", err)
			}
			break
		}
	}

	return nil
}

func (s *Service) GetISO(ctx context.Context, isoID string) (ISOImage, error) {
	if s.db == nil {
		return ISOImage{}, fmt.Errorf("database not configured")
	}

	// Extract numeric ID from image_id (format: "iso-123")
	var numericID int
	if strings.HasPrefix(isoID, "iso-") {
		fmt.Sscanf(isoID, "iso-%d", &numericID)
	} else {
		// Try to parse as plain number
		numericID, _ = strconv.Atoi(isoID)
	}

	// Get ISO info
	var id int
	var iso ISOImage
	var poolName string
	err := s.db.QueryRowContext(ctx, `SELECT id, name, path, size_bytes, 
		       COALESCE(os_type, ''), COALESCE(os_variant, ''), COALESCE(architecture, ''), 
		       COALESCE(description, ''), uploaded_at, 
		       COALESCE(md5_hash, ''), COALESCE(sha256_hash, ''), COALESCE(pool_name, 'default') FROM iso_images WHERE id = ?`, numericID).Scan(&id, &iso.Filename, &iso.Path, &iso.SizeBytes,
		&iso.OSType, &iso.OSVersion, &iso.Architecture,
		&iso.Description, &iso.CreatedAt, &iso.MD5Hash, &iso.SHA256Hash, &poolName)
	if err != nil {
		log.Printf("GetISO: error in operation: %v\n", err)
		return ISOImage{}, fmt.Errorf("ISO not found: %w", err)
	}

	iso.ImageID = fmt.Sprintf("iso-%d", id)
	if iso.Metadata == nil {
		iso.Metadata = make(map[string]string)
	}
	iso.Metadata["pool_name"] = poolName
	iso.StoragePool = poolName

	return iso, nil
}

// Download an ISO image
func (s *Service) DownloadISO(ctx context.Context, isoID string) (string, string, error) {
	if s.db == nil {
		return "", "", fmt.Errorf("database not configured")
	}

	// Extract numeric ID from image_id (format: "iso-123")
	var numericID int
	if strings.HasPrefix(isoID, "iso-") {
		fmt.Sscanf(isoID, "iso-%d", &numericID)
	} else {
		// Try to parse as plain number
		numericID, _ = strconv.Atoi(isoID)
	}

	// Get ISO info
	var isoPath, name string
	err := s.db.QueryRowContext(ctx, "SELECT path, name FROM iso_images WHERE id = ?", numericID).Scan(&isoPath, &name)
	if err != nil {
		log.Printf("DownloadISO: error in operation for err :: %v\n", err)
		return "", "", fmt.Errorf("ISO not found: %w", err)
	}

	// Check if the file exists.
	if _, err := os.Stat(isoPath); os.IsNotExist(err) {
		return "", "", fmt.Errorf("ISO file not found: %w", err)
	}

	return isoPath, name, nil
}

// UpdateVMEnhanced updates an existing VM with enhanced configuration options

// UpdateVMEnhanced updates an existing VM with enhanced configuration options
// It accepts the same payload as CreateVMEnhanced but applies changes to an existing VM
func (s *Service) UpdateVMEnhanced(ctx context.Context, nameOrUUID string, req *VMCreateRequestEnhanced) (*VM, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	log.Printf("UpdateVMEnhanced: starting update for VM %s", nameOrUUID)

	// Look up the existing domain
	domain, err := s.lookupDomain(nameOrUUID)
	if err != nil {
		log.Printf("UpdateVMEnhanced error looking up domain: %v\n", err)
		return nil, fmt.Errorf("failed to find VM: %w", err)
	}
	defer domain.Free()

	// Check if VM is running
	state, _, err := domain.GetState()
	if err != nil {
		log.Printf("UpdateVMEnhanced error getting domain state: %v\n", err)
		return nil, fmt.Errorf("failed to get VM state: %w", err)
	}

	isRunning := state == libvirt.DOMAIN_RUNNING
	requiresRestart := false

	// Update memory if specified (can be hot-plugged if supported)
	if req.Memory > 0 {
		memoryKB := req.Memory * 1024
		if isRunning {
			// Try live memory update
			if err := domain.SetMemory(memoryKB); err != nil {
				log.Printf("UpdateVMEnhanced warning - live memory update failed, updating config: %v\n", err)
				// Update config for next boot
				if err := domain.SetMemoryFlags(memoryKB, libvirt.DomainMemoryModFlags(libvirt.DOMAIN_AFFECT_CONFIG)); err != nil {
					log.Printf("UpdateVMEnhanced error updating memory config: %v\n", err)
					return nil, fmt.Errorf("failed to update memory configuration: %w", err)
				}
				requiresRestart = true
			}
		} else {
			if err := domain.SetMemoryFlags(memoryKB, libvirt.DomainMemoryModFlags(libvirt.DOMAIN_AFFECT_CONFIG)); err != nil {
				log.Printf("UpdateVMEnhanced error updating memory config: %v\n", err)
				return nil, fmt.Errorf("failed to update memory configuration: %w", err)
			}
		}
	}

	// Update vCPUs if specified
	if req.VCPUs > 0 {
		if isRunning {
			// Try hot-plug vCPUs
			if err := domain.SetVcpus(req.VCPUs); err != nil {
				log.Printf("UpdateVMEnhanced warning - vCPU hot-plug failed, updating config: %v\n", err)
				// Update config for next boot
				if err := domain.SetVcpusFlags(req.VCPUs, libvirt.DomainVcpuFlags(libvirt.DOMAIN_AFFECT_CONFIG)); err != nil {
					log.Printf("UpdateVMEnhanced error updating vCPUs config: %v\n", err)
					return nil, fmt.Errorf("failed to update vCPUs configuration: %w", err)
				}
				requiresRestart = true
			}
		} else {
			if err := domain.SetVcpusFlags(req.VCPUs, libvirt.DomainVcpuFlags(libvirt.DOMAIN_AFFECT_CONFIG)); err != nil {
				log.Printf("UpdateVMEnhanced error updating vCPUs config: %v\n", err)
				return nil, fmt.Errorf("failed to update vCPUs configuration: %w", err)
			}
		}
	}

	// Update autostart setting
	if err := domain.SetAutostart(req.AutoStart); err != nil {
		log.Printf("UpdateVMEnhanced warning - failed to update autostart: %v\n", err)
	}

	// Handle storage updates if specified.
	//
	// We reconcile disks: detach disks not in the desired config, attach new disks.
	// If the VM is running, we attempt live+config changes; otherwise config-only.
	if req.Storage != nil {
		log.Printf("UpdateVMEnhanced: Processing storage updates (reconciliation)")

		xmlDesc, err := domain.GetXMLDesc(0)
		if err != nil {
			log.Printf("UpdateVMEnhanced error getting domain XML: %v\n", err)
			return nil, fmt.Errorf("failed to get VM XML: %w", err)
		}

		// Parse existing disks for reconciliation
		existingDisks, err := parseDomainDiskDetails(xmlDesc)
		if err != nil {
			log.Printf("UpdateVMEnhanced warning: failed to parse existing disks: %v\n", err)
			existingDisks = []existingDiskInfo{}
		}

		// Build sets of desired targets and sources from request
		desiredTargets := map[string]bool{}
		desiredSources := map[string]bool{}
		for _, d := range req.Storage.Disks {
			if d.Target != "" {
				desiredTargets[d.Target] = true
			}
			if d.Path != "" {
				desiredSources[d.Path] = true
			}
		}

		deviceFlags := libvirt.DOMAIN_DEVICE_MODIFY_CONFIG
		if isRunning {
			deviceFlags = deviceFlags | libvirt.DOMAIN_DEVICE_MODIFY_LIVE
		}

		// Detach disks that are not in the desired configuration
		for _, existDisk := range existingDisks {
			if existDisk.Target == "" {
				continue
			}

			// Keep disk if its target OR source is in the desired set
			if desiredTargets[existDisk.Target] || desiredSources[existDisk.Source] {
				log.Printf("UpdateVMEnhanced: keeping disk target=%s source=%s", existDisk.Target, existDisk.Source)
				continue
			}

			// Detach this disk
			log.Printf("UpdateVMEnhanced: detaching disk target=%s source=%s", existDisk.Target, existDisk.Source)
			detachXML := buildDetachDiskXML(existDisk)
			if err := domain.DetachDeviceFlags(detachXML, deviceFlags); err != nil {
				log.Printf("UpdateVMEnhanced error detaching disk target=%s: %v", existDisk.Target, err)
				return nil, fmt.Errorf("failed to detach disk %s: %w", existDisk.Target, err)
			}
		}

		// Prepare new disks to attach
		diskConfigs, err := s.prepareEnhancedStorageConfig(ctx, req)
		if err != nil {
			log.Printf("UpdateVMEnhanced error preparing storage: %v\n", err)
			return nil, fmt.Errorf("failed to prepare storage: %w", err)
		}

		// Refresh XML after detachments to get current state
		xmlDesc, err = domain.GetXMLDesc(0)
		if err != nil {
			log.Printf("UpdateVMEnhanced error getting domain XML after detach: %v\n", err)
			return nil, fmt.Errorf("failed to get VM XML: %w", err)
		}

		existingTargets, existingSources, err := parseDomainDiskAttachments(xmlDesc)
		if err != nil {
			log.Printf("UpdateVMEnhanced warning: failed to parse existing disks: %v\n", err)
			existingTargets = map[string]bool{}
			existingSources = map[string]bool{}
		}

		// Attach new disks
		createdButNotAttached := map[string]bool{}
		for _, d := range diskConfigs {
			if d.Path == "" || d.Config.Target == "" {
				continue
			}

			// Skip if already attached by path or by target
			if existingSources[d.Path] || existingTargets[d.Config.Target] {
				log.Printf("UpdateVMEnhanced: skipping already-attached disk path=%s target=%s", d.Path, d.Config.Target)
				continue
			}

			if d.Created {
				createdButNotAttached[d.Path] = true
			}

			diskXML := s.buildEnhancedAttachDiskXML(d)
			if err := domain.AttachDeviceFlags(diskXML, deviceFlags); err != nil {
				log.Printf("UpdateVMEnhanced error attaching disk: %v\n", err)
				// Best-effort cleanup for newly created disks that were not attached.
				for p := range createdButNotAttached {
					_ = os.Remove(p)
				}
				return nil, fmt.Errorf("failed to attach disk: %w", err)
			}

			delete(createdButNotAttached, d.Path)
			existingSources[d.Path] = true
			existingTargets[d.Config.Target] = true
		}
	}
	// Handle network updates (sync) if specified.
	//
	// If the VM is stopped, we sync the VM's interfaces to match req.Networks:
	// - Detach existing interfaces not present in the desired config.
	// - Attach interfaces present in the desired config but not currently attached.
	//
	// For safety, we require the VM to be stopped for network changes.
	if len(req.Networks) > 0 {
		if isRunning {
			return nil, fmt.Errorf("network changes require VM to be stopped")
		}

		log.Printf("UpdateVMEnhanced: Processing network updates - %d networks", len(req.Networks))

		xmlDesc, err := domain.GetXMLDesc(0)
		if err != nil {
			log.Printf("UpdateVMEnhanced error getting domain XML: %v\n", err)
			return nil, fmt.Errorf("failed to get VM XML: %w", err)
		}

		// Parse existing interfaces.
		existingMACs := map[string]bool{}
		existingKeys := map[string]bool{}
		type existingIface struct {
			ifaceType string
			source    string
			model     string
			mac       string
			key       string
		}
		var existing []existingIface

		var dom DomainInterfaceXML
		if err := xml.Unmarshal([]byte(xmlDesc), &dom); err == nil {
			for _, iface := range dom.Devices.Interfaces {
				ifaceType := strings.ToLower(strings.TrimSpace(iface.Type))
				if ifaceType == "" {
					continue
				}

				model := strings.TrimSpace(iface.Model.Type)
				if model == "" {
					model = "virtio"
				}

				source := ""
				if strings.TrimSpace(iface.Source.Network) != "" {
					source = strings.TrimSpace(iface.Source.Network)
				} else if strings.TrimSpace(iface.Source.Bridge) != "" {
					source = strings.TrimSpace(iface.Source.Bridge)
				} else if strings.TrimSpace(iface.Source.Dev) != "" {
					source = strings.TrimSpace(iface.Source.Dev)
				}

				mac := strings.ToLower(strings.TrimSpace(iface.MAC.Address))
				key := fmt.Sprintf("%s|%s|%s", ifaceType, source, model)

				existing = append(existing, existingIface{ifaceType: ifaceType, source: source, model: model, mac: mac, key: key})
				if mac != "" {
					existingMACs[mac] = true
				}
				existingKeys[key] = true
			}
		}

		// Desired interface sets.
		desiredKeys := map[string]bool{}
		desiredMACs := map[string]bool{}
		desiredKeyMACs := map[string]map[string]bool{} // key -> allowed MACs (if explicitly provided)
		for i, net := range req.Networks {
			ifaceType, source, model, mac, key, hadMAC, err := s.normalizeNetworkForKey(net)
			if err != nil {
				return nil, fmt.Errorf("networks[%d]: %w", i, err)
			}
			_ = ifaceType
			_ = source
			_ = model
			desiredKeys[key] = true
			if hadMAC {
				macLower := strings.ToLower(strings.TrimSpace(mac))
				if macLower != "" {
					desiredMACs[macLower] = true
					if desiredKeyMACs[key] == nil {
						desiredKeyMACs[key] = map[string]bool{}
					}
					desiredKeyMACs[key][macLower] = true
				}
			}
		}

		// Detach interfaces not desired.
		for _, ex := range existing {
			// Skip non-network-ish interfaces (conservative).
			switch ex.ifaceType {
			case string(NetworkTypeNetwork), string(NetworkTypeBridge), string(NetworkTypeDirect), string(NetworkTypeUser):
			// ok
			default:
				continue
			}

			keep := false
			if ex.mac != "" && desiredMACs[ex.mac] {
				keep = true
			} else if desiredKeys[ex.key] {
				// If desired explicitly specifies MAC(s) for this key, only keep if MAC matches.
				if macs := desiredKeyMACs[ex.key]; macs != nil {
					keep = ex.mac != "" && macs[ex.mac]
				} else {
					keep = true
				}
			}

			if keep {
				continue
			}

			if ex.mac == "" {
				log.Printf("UpdateVMEnhanced warning: cannot detach interface without MAC (type=%s key=%s)", ex.ifaceType, ex.key)
				continue
			}

			detachXML := fmt.Sprintf(`
				<interface type='%s'>
					<mac address='%s'/>
				</interface>
			`, ex.ifaceType, ex.mac)
			if err := domain.DetachDeviceFlags(detachXML, libvirt.DOMAIN_DEVICE_MODIFY_CONFIG); err != nil {
				return nil, fmt.Errorf("failed to detach network interface (mac=%s): %w", ex.mac, err)
			}
			delete(existingMACs, ex.mac)
			delete(existingKeys, ex.key)
		}

		// Attach interfaces not already present.
		for i, net := range req.Networks {
			ifaceType, _, _, mac, key, hadMAC, err := s.normalizeNetworkForKey(net)
			if err != nil {
				return nil, fmt.Errorf("networks[%d]: %w", i, err)
			}
			_ = ifaceType

			macLower := strings.ToLower(strings.TrimSpace(mac))
			if hadMAC && macLower != "" && existingMACs[macLower] {
				continue
			}
			if !hadMAC && existingKeys[key] {
				continue
			}

			ifaceXML, _, attachedMAC, _, err := s.buildEnhancedAttachInterfaceXML(net)
			if err != nil {
				return nil, fmt.Errorf("failed to build interface XML for networks[%d]: %w", i, err)
			}

			if err := domain.AttachDeviceFlags(ifaceXML, libvirt.DOMAIN_DEVICE_MODIFY_CONFIG); err != nil {
				return nil, fmt.Errorf("failed to attach network interface: %w", err)
			}

			if attachedMAC != "" {
				existingMACs[strings.ToLower(strings.TrimSpace(attachedMAC))] = true
			}
			existingKeys[key] = true
		}
	}

	// Handle PCI device updates if specified (reconciliation)
	// Note: PCI changes always require VM to be stopped
	if len(req.PCIDevices) > 0 || req.PCIDevices != nil {
		if isRunning {
			log.Printf("UpdateVMEnhanced error: PCI device changes require VM to be stopped")
			return nil, fmt.Errorf("PCI device changes require VM to be stopped")
		}

		log.Printf("UpdateVMEnhanced: Processing PCI device updates (reconciliation)")

		xmlDesc, err := domain.GetXMLDesc(0)
		if err != nil {
			log.Printf("UpdateVMEnhanced error getting domain XML for PCI: %v\n", err)
			return nil, fmt.Errorf("failed to get VM XML: %w", err)
		}

		existingPCIs, err := parseDomainPCIDevices(xmlDesc)
		if err != nil {
			log.Printf("UpdateVMEnhanced warning: failed to parse existing PCI devices: %v\n", err)
			existingPCIs = []existingPCIDeviceInfo{}
		}

		// Build set of desired PCI host addresses
		desiredPCIAddresses := map[string]bool{}
		for _, p := range req.PCIDevices {
			if p.HostAddress != "" {
				desiredPCIAddresses[p.HostAddress] = true
			}
		}

		// Detach PCI devices not in desired configuration
		for _, existPCI := range existingPCIs {
			if existPCI.HostAddress == "" {
				continue
			}

			if desiredPCIAddresses[existPCI.HostAddress] {
				log.Printf("UpdateVMEnhanced: keeping PCI device host=%s", existPCI.HostAddress)
				continue
			}

			log.Printf("UpdateVMEnhanced: detaching PCI device host=%s", existPCI.HostAddress)
			detachXML := buildDetachPCIDeviceXML(existPCI)
			if detachXML == "" {
				log.Printf("UpdateVMEnhanced warning: failed to build detach XML for PCI %s", existPCI.HostAddress)
				continue
			}
			if err := domain.DetachDeviceFlags(detachXML, libvirt.DOMAIN_DEVICE_MODIFY_CONFIG); err != nil {
				log.Printf("UpdateVMEnhanced error detaching PCI device %s: %v", existPCI.HostAddress, err)
				return nil, fmt.Errorf("failed to detach PCI device %s: %w", existPCI.HostAddress, err)
			}
		}

		// Refresh existing PCI devices after detach
		xmlDesc, err = domain.GetXMLDesc(0)
		if err != nil {
			log.Printf("UpdateVMEnhanced error getting domain XML after PCI detach: %v\n", err)
			return nil, fmt.Errorf("failed to get VM XML: %w", err)
		}

		existingPCIs, _ = parseDomainPCIDevices(xmlDesc)
		existingPCIAddrs := map[string]bool{}
		for _, p := range existingPCIs {
			if p.HostAddress != "" {
				existingPCIAddrs[p.HostAddress] = true
			}
		}

		// Attach new PCI devices
		for _, pci := range req.PCIDevices {
			if pci.HostAddress == "" {
				continue
			}

			if existingPCIAddrs[pci.HostAddress] {
				log.Printf("UpdateVMEnhanced: skipping already-attached PCI device host=%s", pci.HostAddress)
				continue
			}

			log.Printf("UpdateVMEnhanced: attaching PCI device host=%s", pci.HostAddress)
			attachXML := buildAttachPCIDeviceXML(pci.HostAddress, pci.GuestAddress, pci.ROMFile, pci.Multifunction)
			if attachXML == "" {
				log.Printf("UpdateVMEnhanced warning: failed to build attach XML for PCI %s", pci.HostAddress)
				continue
			}
			if err := domain.AttachDeviceFlags(attachXML, libvirt.DOMAIN_DEVICE_MODIFY_CONFIG); err != nil {
				log.Printf("UpdateVMEnhanced error attaching PCI device %s: %v", pci.HostAddress, err)
				return nil, fmt.Errorf("failed to attach PCI device %s: %w", pci.HostAddress, err)
			}

			existingPCIAddrs[pci.HostAddress] = true
		}
	}

	// Handle graphics configuration updates if specified (reconciliation)
	if len(req.Graphics) > 0 || req.Graphics != nil {
		log.Printf("UpdateVMEnhanced: Processing graphics updates (reconciliation)")

		graphicsFlags := libvirt.DOMAIN_DEVICE_MODIFY_CONFIG
		if isRunning {
			log.Printf("UpdateVMEnhanced warning: Graphics changes will take effect after restart")
			requiresRestart = true
			// Don't apply live changes for graphics; config-only
		}

		xmlDesc, err := domain.GetXMLDesc(0)
		if err != nil {
			log.Printf("UpdateVMEnhanced error getting domain XML for graphics: %v\n", err)
			return nil, fmt.Errorf("failed to get VM XML: %w", err)
		}

		existingGraphics, err := parseDomainGraphics(xmlDesc)
		if err != nil {
			log.Printf("UpdateVMEnhanced warning: failed to parse existing graphics: %v\n", err)
			existingGraphics = []existingGraphicsInfo{}
		}

		// Build set of desired graphics types
		desiredGraphicsTypes := map[string]bool{}
		for _, g := range req.Graphics {
			gType := strings.ToLower(strings.TrimSpace(g.Type))
			if gType != "" && gType != "none" {
				desiredGraphicsTypes[gType] = true
			}
		}

		// Detach graphics devices not in desired configuration
		for _, existG := range existingGraphics {
			gType := strings.ToLower(strings.TrimSpace(existG.Type))
			if gType == "" {
				continue
			}

			if desiredGraphicsTypes[gType] {
				log.Printf("UpdateVMEnhanced: keeping graphics type=%s", gType)
				continue
			}

			log.Printf("UpdateVMEnhanced: detaching graphics type=%s", gType)
			detachXML := buildDetachGraphicsXML(existG)
			if detachXML == "" {
				log.Printf("UpdateVMEnhanced warning: failed to build detach XML for graphics %s", gType)
				continue
			}
			if err := domain.DetachDeviceFlags(detachXML, graphicsFlags); err != nil {
				log.Printf("UpdateVMEnhanced warning: failed to detach graphics %s: %v (may not be supported)", gType, err)
				// Don't fail on graphics detach errors; some graphics types can't be detached live
			}
		}

		// Refresh existing graphics after detach
		xmlDesc, err = domain.GetXMLDesc(0)
		if err != nil {
			log.Printf("UpdateVMEnhanced error getting domain XML after graphics detach: %v\n", err)
			return nil, fmt.Errorf("failed to get VM XML: %w", err)
		}

		existingGraphics, _ = parseDomainGraphics(xmlDesc)
		existingGraphicsTypes := map[string]bool{}
		for _, g := range existingGraphics {
			gType := strings.ToLower(strings.TrimSpace(g.Type))
			if gType != "" {
				existingGraphicsTypes[gType] = true
			}
		}

		// Attach new graphics devices
		for _, graphics := range req.Graphics {
			gType := strings.ToLower(strings.TrimSpace(graphics.Type))
			if gType == "" || gType == "none" {
				continue
			}

			if existingGraphicsTypes[gType] {
				log.Printf("UpdateVMEnhanced: skipping already-attached graphics type=%s", gType)
				continue
			}

			log.Printf("UpdateVMEnhanced: attaching graphics type=%s", gType)
			attachXML := buildAttachGraphicsXML(gType, graphics.Port, graphics.AutoPort, graphics.Listen, graphics.Password)
			if attachXML == "" {
				log.Printf("UpdateVMEnhanced warning: failed to build attach XML for graphics %s", gType)
				continue
			}
			if err := domain.AttachDeviceFlags(attachXML, graphicsFlags); err != nil {
				log.Printf("UpdateVMEnhanced warning: failed to attach graphics %s: %v (may not be supported)", gType, err)
				// Don't fail on graphics attach errors
			} else {
				existingGraphicsTypes[gType] = true
			}
		}
	}
	// Handle cloud-init updates if specified
	if req.CloudInit != nil {
		log.Printf("UpdateVMEnhanced: Cloud-init updates requested")
		if isRunning {
			log.Printf("UpdateVMEnhanced warning: Cloud-init changes will take effect after restart")
			requiresRestart = true
		}
	}

	// Handle UEFI/SecureBoot/TPM changes if specified
	if req.UEFI || req.SecureBoot || req.TPM {
		if isRunning {
			log.Printf("UpdateVMEnhanced error: Firmware changes require VM to be stopped")
			return nil, fmt.Errorf("firmware changes (UEFI/SecureBoot/TPM) require VM to be stopped")
		}
		log.Printf("UpdateVMEnhanced: Firmware configuration updates requested")
	}

	// Update metadata if provided
	if req.Metadata != nil {
		log.Printf("UpdateVMEnhanced: Updating metadata with %d entries", len(req.Metadata))
		// Metadata updates would typically be stored in a database
		// For now, we just log them
		for key, value := range req.Metadata {
			log.Printf("UpdateVMEnhanced: Metadata[%s] = %s", key, value)
		}
	}

	// If changes require restart and VM is running, notify
	if requiresRestart && isRunning {
		log.Printf("UpdateVMEnhanced: Some changes will take effect after VM restart")
	}

	log.Printf("UpdateVMEnhanced: Successfully processed updates for VM %s", nameOrUUID)

	// Return the updated VM information
	return s.domainToVM(domain)
}

// buildEnhancedAttachDiskXML builds a libvirt <disk> device XML snippet for AttachDeviceFlags.
func (s *Service) buildEnhancedAttachDiskXML(d PreparedDisk) string {
	deviceType := "disk"
	if strings.TrimSpace(d.Config.Device) != "" {
		deviceType = strings.TrimSpace(d.Config.Device)
	}

	busType := string(d.Config.Bus)
	if strings.TrimSpace(busType) == "" {
		busType = "virtio"
	}

	driverType := strings.TrimSpace(d.Config.Format)
	if driverType == "" {
		driverType = "qcow2"
	}

	// Safety: ISO images are raw and should be attached as a read-only CD-ROM.
	if strings.EqualFold(filepath.Ext(d.Path), ".iso") {
		driverType = "raw"
		if deviceType == "" || strings.EqualFold(deviceType, "disk") || strings.EqualFold(deviceType, "floppy") {
			deviceType = "cdrom"
		}
	}

	xml := fmt.Sprintf(`
<disk type='file' device='%s'>
<driver name='qemu' type='%s'/>
<source file='%s'/>
<target dev='%s' bus='%s'/>`, deviceType, driverType, d.Path, d.Config.Target, busType)

	if d.Config.ReadOnly {
		xml += `
<readonly/>`
	}

	if d.Config.BootOrder > 0 {
		xml += fmt.Sprintf(`
<boot order='%d'/>`, d.Config.BootOrder)
	}

	xml += `
</disk>`

	return xml
}

// buildEnhancedAttachInterfaceXML builds a libvirt <interface> device XML snippet for AttachDeviceFlags.
// It returns:
// - xml snippet
// - a key used for best-effort idempotency when MAC is not provided
// - the MAC used (generated if empty)
// - whether the caller explicitly provided MAC
func (s *Service) buildEnhancedAttachInterfaceXML(net NetworkConfig) (string, string, string, bool, error) {
	reqType := strings.ToLower(strings.TrimSpace(string(net.Type)))
	if reqType == "" {
		reqType = string(NetworkTypeNetwork)
	}

	// Treat NAT as an alias of libvirt 'network'.
	if reqType == string(NetworkTypeNAT) {
		reqType = string(NetworkTypeNetwork)
	}

	interfaceType := reqType
	switch interfaceType {
	case string(NetworkTypeNetwork), string(NetworkTypeBridge), string(NetworkTypeDirect), string(NetworkTypeUser):
	// supported
	default:
		return "", "", "", false, fmt.Errorf("unsupported network type: %s", interfaceType)
	}

	source := strings.TrimSpace(net.Source)
	switch interfaceType {
	case string(NetworkTypeNetwork), string(NetworkTypeBridge), string(NetworkTypeDirect):
		if source == "" {
			return "", "", "", false, fmt.Errorf("source is required for type '%s'", interfaceType)
		}
	case string(NetworkTypeUser):
		// source is not used
		source = ""
	}

	model := strings.TrimSpace(net.Model)
	if model == "" {
		model = "virtio"
	}

	mac := strings.TrimSpace(net.MAC)
	hadMAC := mac != ""
	if mac == "" {
		mac = generateMAC()
	}

	key := fmt.Sprintf("%s|%s|%s", interfaceType, source, model)

	xml := fmt.Sprintf(`
<interface type='%s'>`, interfaceType)

	switch interfaceType {
	case string(NetworkTypeBridge):
		xml += fmt.Sprintf(`
<source bridge='%s'/>`, source)
	case string(NetworkTypeDirect):
		// Default direct mode to bridge (most common).
		xml += fmt.Sprintf(`
<source dev='%s' mode='bridge'/>`, source)
	case string(NetworkTypeUser):
	// user-mode networking does not require a <source/>
	default: // network
		xml += fmt.Sprintf(`
<source %s='%s'/>`, getNetworkSourceAttr(NetworkType(interfaceType)), source)
	}

	xml += fmt.Sprintf(`
<mac address='%s'/>
<model type='%s'/>
</interface>`, mac, model)

	return xml, key, mac, hadMAC, nil
}

// normalizeNetworkForKey normalizes a NetworkConfig to the effective libvirt interface type/source/model
// and returns a stable key for idempotency/diffing.
func (s *Service) normalizeNetworkForKey(net NetworkConfig) (ifaceType string, source string, model string, mac string, key string, hadMAC bool, err error) {
	reqType := strings.ToLower(strings.TrimSpace(string(net.Type)))
	if reqType == "" {
		reqType = string(NetworkTypeNetwork)
	}

	// Treat NAT as an alias of libvirt 'network'.
	if reqType == string(NetworkTypeNAT) {
		reqType = string(NetworkTypeNetwork)
	}

	ifaceType = reqType
	switch ifaceType {
	case string(NetworkTypeNetwork), string(NetworkTypeBridge), string(NetworkTypeDirect), string(NetworkTypeUser):
	// supported
	default:
		return "", "", "", "", "", false, fmt.Errorf("unsupported network type: %s", ifaceType)
	}

	source = strings.TrimSpace(net.Source)
	switch ifaceType {
	case string(NetworkTypeNetwork), string(NetworkTypeBridge), string(NetworkTypeDirect):
		if source == "" {
			return "", "", "", "", "", false, fmt.Errorf("source is required for type '%s'", ifaceType)
		}
	case string(NetworkTypeUser):
		source = ""
	}

	model = strings.TrimSpace(net.Model)
	if model == "" {
		model = "virtio"
	}

	mac = strings.TrimSpace(net.MAC)
	hadMAC = mac != ""

	key = fmt.Sprintf("%s|%s|%s", ifaceType, source, model)
	return ifaceType, source, model, mac, key, hadMAC, nil
}
