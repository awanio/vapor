//go:build linux && libvirt
// +build linux,libvirt

package libvirt

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

// VMCreateRequestEnhanced represents an enhanced request to create a new VM
type VMCreateRequestEnhanced struct {
	Name         string             `json:"name" binding:"required"`
	Memory       uint64             `json:"memory" binding:"required"`       // in MB
	VCPUs        uint               `json:"vcpus" binding:"required"`
	
	// Disk configuration - supports multiple options
	Disks        []DiskCreateConfig `json:"disks,omitempty"`               // Multiple disks support
	
	// ISO configuration
	ISOPath      string             `json:"iso_path,omitempty"`             // Path or ID from ISO library
	SecondaryISO string             `json:"secondary_iso,omitempty"`        // For additional ISOs (drivers, etc)
	
	// OS configuration
	OSType       string             `json:"os_type"`                        // linux, windows, etc
	OSVariant    string             `json:"os_variant,omitempty"`           // ubuntu20.04, win10, etc
	Architecture string             `json:"architecture"`                    // x86_64 by default
	UEFI         bool               `json:"uefi"`                           // Use UEFI boot
	SecureBoot   bool               `json:"secure_boot"`                    // Enable secure boot
	TPM          bool               `json:"tpm"`                            // Add TPM device
	
	// Network configuration
	Networks     []NetworkConfig    `json:"networks,omitempty"`             // Multiple networks
	
	// Graphics configuration
	Graphics     GraphicsConfig     `json:"graphics"`
	
	// Cloud-init configuration
	CloudInit    *CloudInitConfig   `json:"cloud_init,omitempty"`
	
	// Template to use
	Template     string             `json:"template,omitempty"`
	
	// Storage pool for new disks
	StoragePool  string             `json:"storage_pool,omitempty"`
	
	// Auto-start on host boot
	AutoStart    bool               `json:"autostart"`
	
	// Custom XML overrides (advanced users)
	CustomXML    string             `json:"custom_xml,omitempty"`
}

// DiskCreateConfig represents disk configuration for VM creation
type DiskCreateConfig struct {
	// Option 1: Create new disk
	Size         uint64             `json:"size,omitempty"`                 // Size in GB for new disk
	Format       string             `json:"format,omitempty"`               // qcow2, raw, etc (default: qcow2)
	
	// Option 2: Use existing disk
	Path         string             `json:"path,omitempty"`                 // Path to existing disk
	
	// Option 3: Clone from existing disk
	CloneFrom    string             `json:"clone_from,omitempty"`           // Path to source disk to clone
	
	// Common options
	Bus          DiskBus            `json:"bus,omitempty"`                  // virtio, sata, scsi (default: virtio)
	BootOrder    int                `json:"boot_order,omitempty"`           // Boot priority (1 = first)
	Cache        string             `json:"cache,omitempty"`                // none, writethrough, writeback
	IOMode       string             `json:"io_mode,omitempty"`              // native, threads
	ReadOnly     bool               `json:"readonly"`
	
	// Target device (auto-generated if not specified)
	Target       string             `json:"target,omitempty"`               // vda, vdb, etc
}

// ISOImage represents an ISO image in the library
type ISOImage struct {
	ID           string             `json:"id"`
	Name         string             `json:"name"`
	Path         string             `json:"path"`
	Size         int64              `json:"size"`                           // Size in bytes
	OSType       string             `json:"os_type,omitempty"`             // linux, windows, etc
	OSVariant    string             `json:"os_variant,omitempty"`          // ubuntu20.04, win10, etc
	Architecture string             `json:"architecture,omitempty"`        // x86_64, arm64, etc
	BootType     string             `json:"boot_type,omitempty"`           // bios, uefi, both
	Description  string             `json:"description,omitempty"`
	UploadedAt   time.Time          `json:"uploaded_at"`
	LastUsed     *time.Time         `json:"last_used,omitempty"`
	UseCount     int                `json:"use_count"`
	MD5Hash      string             `json:"md5_hash,omitempty"`
	SHA256Hash   string             `json:"sha256_hash,omitempty"`
	Tags         []string           `json:"tags,omitempty"`                // Custom tags for filtering
}

// ISOUploadRequest represents a request to upload an ISO
type ISOUploadRequest struct {
	Name         string             `json:"name" binding:"required"`
	URL          string             `json:"url,omitempty"`                 // Download from URL
	Path         string             `json:"path,omitempty"`                // Local path (for server-side)
	OSType       string             `json:"os_type,omitempty"`
	OSVariant    string             `json:"os_variant,omitempty"`
	Architecture string             `json:"architecture,omitempty"`
	Description  string             `json:"description,omitempty"`
	Tags         []string           `json:"tags,omitempty"`
}

// CreateVMEnhanced creates a VM with enhanced disk and ISO support
func (s *Service) CreateVMEnhanced(ctx context.Context, req *VMCreateRequestEnhanced) (*VM, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Validate and prepare disks
	diskConfigs, err := s.prepareDiskConfigs(req)
	if err != nil {
		return nil, fmt.Errorf("failed to prepare disks: %w", err)
	}

	// Validate ISO if specified
	var isoPath string
	if req.ISOPath != "" {
		isoPath, err = s.resolveISOPath(req.ISOPath)
		if err != nil {
			return nil, fmt.Errorf("failed to resolve ISO: %w", err)
		}
	}

	// Generate domain XML with all disks
	domainXML, err := s.generateEnhancedDomainXML(req, diskConfigs, isoPath)
	if err != nil {
		return nil, fmt.Errorf("failed to generate domain XML: %w", err)
	}

	// Create the domain
	domain, err := s.conn.DomainDefineXML(domainXML)
	if err != nil {
		// Clean up any created disks on failure
		s.cleanupDisks(diskConfigs)
		return nil, fmt.Errorf("failed to define domain: %w", err)
	}
	defer domain.Free()

	// Set autostart if requested
	if req.AutoStart {
		if err := domain.SetAutostart(true); err != nil {
			fmt.Printf("Warning: failed to set autostart: %v\n", err)
		}
	}

	// Start the VM if ISO is provided (for installation)
	if isoPath != "" {
		if err := domain.Create(); err != nil {
			fmt.Printf("Warning: failed to start VM: %v\n", err)
		}
	}

	return s.domainToVM(domain)
}

// ListISOs returns available ISO images
func (s *Service) ListISOs(ctx context.Context) ([]ISOImage, error) {
	if s.db == nil {
		// If no database, scan filesystem
		return s.scanISODirectory()
	}

	// Query from database
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, name, path, size_bytes, os_type, os_variant, architecture, 
		       boot_type, description, uploaded_at, last_used, use_count, 
		       md5_hash, sha256_hash
		FROM iso_images 
		ORDER BY uploaded_at DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to query ISOs: %w", err)
	}
	defer rows.Close()

	var isos []ISOImage
	for rows.Next() {
		var iso ISOImage
		var lastUsed *time.Time
		err := rows.Scan(
			&iso.ID, &iso.Name, &iso.Path, &iso.Size,
			&iso.OSType, &iso.OSVariant, &iso.Architecture,
			&iso.BootType, &iso.Description, &iso.UploadedAt,
			&lastUsed, &iso.UseCount, &iso.MD5Hash, &iso.SHA256Hash,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan ISO row: %w", err)
		}
		iso.LastUsed = lastUsed
		isos = append(isos, iso)
	}

	return isos, nil
}

// UploadISO registers or downloads an ISO image
func (s *Service) UploadISO(ctx context.Context, req *ISOUploadRequest) (*ISOImage, error) {
	var isoPath string
	var size int64

	// Determine ISO location
	if req.URL != "" {
		// Download from URL
		isoPath, size, err := s.downloadISO(req.URL, req.Name)
		if err != nil {
			return nil, fmt.Errorf("failed to download ISO: %w", err)
		}
		_ = isoPath
		_ = size
	} else if req.Path != "" {
		// Use existing file
		info, err := os.Stat(req.Path)
		if err != nil {
			return nil, fmt.Errorf("ISO file not found: %w", err)
		}
		isoPath = req.Path
		size = info.Size()
	} else {
		return nil, fmt.Errorf("either URL or path must be specified")
	}

	// Calculate hashes
	md5Hash, sha256Hash, err := s.calculateFileHashes(isoPath)
	if err != nil {
		fmt.Printf("Warning: failed to calculate hashes: %v\n", err)
	}

	iso := &ISOImage{
		ID:           generateRandomID(8),
		Name:         req.Name,
		Path:         isoPath,
		Size:         size,
		OSType:       req.OSType,
		OSVariant:    req.OSVariant,
		Architecture: req.Architecture,
		Description:  req.Description,
		UploadedAt:   time.Now(),
		MD5Hash:      md5Hash,
		SHA256Hash:   sha256Hash,
		Tags:         req.Tags,
	}

	// Store in database if available
	if s.db != nil {
		_, err = s.db.ExecContext(ctx, `
			INSERT INTO iso_images (
				id, name, path, size_bytes, os_type, os_variant, 
				architecture, description, md5_hash, sha256_hash
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`, iso.ID, iso.Name, iso.Path, iso.Size, iso.OSType,
			iso.OSVariant, iso.Architecture, iso.Description,
			iso.MD5Hash, iso.SHA256Hash)
		if err != nil {
			return nil, fmt.Errorf("failed to store ISO in database: %w", err)
		}
	}

	return iso, nil
}

// RegisterISO registers an ISO that has been uploaded via resumable upload
func (s *Service) RegisterISO(ctx context.Context, req *ISOUploadRequest) (*ISOImage, error) {
	var size int64
	
	// Validate the file exists
	if req.Path == "" {
		return nil, fmt.Errorf("ISO path is required")
	}
	
	info, err := os.Stat(req.Path)
	if err != nil {
		return nil, fmt.Errorf("ISO file not found at %s: %w", req.Path, err)
	}
	size = info.Size()
	
	// Calculate hashes
	md5Hash, sha256Hash, err := s.calculateFileHashes(req.Path)
	if err != nil {
		fmt.Printf("Warning: failed to calculate hashes: %v\n", err)
	}
	
	iso := &ISOImage{
		ID:           generateRandomID(8),
		Name:         req.Name,
		Path:         req.Path,
		Size:         size,
		OSType:       req.OSType,
		OSVariant:    req.OSVariant,
		Architecture: req.Architecture,
		Description:  req.Description,
		UploadedAt:   time.Now(),
		MD5Hash:      md5Hash,
		SHA256Hash:   sha256Hash,
		Tags:         req.Tags,
	}
	
	// Store in database if available
	if s.db != nil {
		_, err = s.db.ExecContext(ctx, `
			INSERT INTO iso_images (
				id, name, path, size_bytes, os_type, os_variant, 
				architecture, description, md5_hash, sha256_hash, uploaded_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`, iso.ID, iso.Name, iso.Path, iso.Size, iso.OSType,
			iso.OSVariant, iso.Architecture, iso.Description,
			iso.MD5Hash, iso.SHA256Hash, iso.UploadedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to store ISO in database: %w", err)
		}
	}
	
	return iso, nil
}

// DeleteISO removes an ISO from the library
func (s *Service) DeleteISO(ctx context.Context, isoID string) error {
	if s.db == nil {
		return fmt.Errorf("database not configured")
	}

	// Get ISO info
	var isoPath string
	err := s.db.QueryRowContext(ctx, "SELECT path FROM iso_images WHERE id = ?", isoID).Scan(&isoPath)
	if err != nil {
		return fmt.Errorf("ISO not found: %w", err)
	}

	// Delete from database
	_, err = s.db.ExecContext(ctx, "DELETE FROM iso_images WHERE id = ?", isoID)
	if err != nil {
		return fmt.Errorf("failed to delete ISO record: %w", err)
	}

	// Optionally delete the file (check if it's in managed directory)
	if isInManagedDirectory(isoPath) {
		if err := os.Remove(isoPath); err != nil && !os.IsNotExist(err) {
			fmt.Printf("Warning: failed to delete ISO file: %v\n", err)
		}
	}

	return nil
}

// Helper functions

func (s *Service) prepareDiskConfigs(req *VMCreateRequestEnhanced) ([]preparedDisk, error) {
	var disks []preparedDisk

	// If no disks specified but disk_size is set (backward compatibility)
	if len(req.Disks) == 0 && req.Memory > 0 {
		// Create a default 10GB disk if nothing specified
		req.Disks = []DiskCreateConfig{
			{
				Size:   10,
				Format: "qcow2",
				Bus:    DiskBusVirtio,
			},
		}
	}

	for i, diskConfig := range req.Disks {
		var disk preparedDisk

		// Auto-generate target if not specified
		if diskConfig.Target == "" {
			diskConfig.Target = fmt.Sprintf("vd%c", 'a'+i)
		}

		if diskConfig.Size > 0 {
			// Create new disk
			poolName := req.StoragePool
			if poolName == "" {
				poolName = "default"
			}
			diskPath, err := s.createDisk(poolName, req.Name+fmt.Sprintf("-disk%d", i), diskConfig.Size)
			if err != nil {
				return nil, fmt.Errorf("failed to create disk %d: %w", i, err)
			}
			disk.Path = diskPath
			disk.Created = true
		} else if diskConfig.Path != "" {
			// Use existing disk
			if _, err := os.Stat(diskConfig.Path); err != nil {
				return nil, fmt.Errorf("disk %s not found: %w", diskConfig.Path, err)
			}
			disk.Path = diskConfig.Path
		} else if diskConfig.CloneFrom != "" {
			// Clone from existing disk
			poolName := req.StoragePool
			if poolName == "" {
				poolName = "default"
			}
			clonedPath, err := s.cloneDisk(poolName, diskConfig.CloneFrom, req.Name+fmt.Sprintf("-disk%d", i))
			if err != nil {
				return nil, fmt.Errorf("failed to clone disk %d: %w", i, err)
			}
			disk.Path = clonedPath
			disk.Created = true
		} else {
			return nil, fmt.Errorf("disk %d must specify size, path, or clone_from", i)
		}

		disk.Config = diskConfig
		disks = append(disks, disk)
	}

	return disks, nil
}

func (s *Service) resolveISOPath(isoRef string) (string, error) {
	// Check if it's a direct path
	if filepath.IsAbs(isoRef) {
		if _, err := os.Stat(isoRef); err == nil {
			return isoRef, nil
		}
	}

	// Try to find in database by ID or name
	if s.db != nil {
		var path string
		err := s.db.QueryRow(
			"SELECT path FROM iso_images WHERE id = ? OR name = ?",
			isoRef, isoRef,
		).Scan(&path)
		if err == nil {
			// Update usage stats
			s.db.Exec(
				"UPDATE iso_images SET last_used = CURRENT_TIMESTAMP, use_count = use_count + 1 WHERE id = ? OR name = ?",
				isoRef, isoRef,
			)
			return path, nil
		}
	}

	// Check in default ISO directories
	defaultDirs := []string{
		"/var/lib/libvirt/images/iso",
		"/var/lib/vapor/iso",
		"/usr/share/iso",
	}
	for _, dir := range defaultDirs {
		path := filepath.Join(dir, isoRef)
		if _, err := os.Stat(path); err == nil {
			return path, nil
		}
	}

	return "", fmt.Errorf("ISO not found: %s", isoRef)
}

func (s *Service) scanISODirectory() ([]ISOImage, error) {
	var isos []ISOImage
	
	isoDir := "/var/lib/libvirt/images/iso"
	if _, err := os.Stat(isoDir); err != nil {
		isoDir = "/var/lib/vapor/iso"
	}

	err := filepath.Walk(isoDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // Skip inaccessible files
		}
		
		if !info.IsDir() && (filepath.Ext(path) == ".iso" || filepath.Ext(path) == ".ISO") {
			iso := ISOImage{
				ID:         filepath.Base(path),
				Name:       filepath.Base(path),
				Path:       path,
				Size:       info.Size(),
				UploadedAt: info.ModTime(),
			}
			
			// Try to guess OS type from filename
			iso.OSType, iso.OSVariant = guessOSFromFilename(iso.Name)
			
			isos = append(isos, iso)
		}
		return nil
	})

	return isos, err
}

func (s *Service) cleanupDisks(disks []preparedDisk) {
	for _, disk := range disks {
		if disk.Created {
			if err := os.Remove(disk.Path); err != nil {
				fmt.Printf("Warning: failed to cleanup disk %s: %v\n", disk.Path, err)
			}
		}
	}
}

func isInManagedDirectory(path string) bool {
	managedDirs := []string{
		"/var/lib/libvirt/images",
		"/var/lib/vapor",
	}
	for _, dir := range managedDirs {
		if filepath.HasPrefix(path, dir) {
			return true
		}
	}
	return false
}

type preparedDisk struct {
	Path    string
	Config  DiskCreateConfig
	Created bool // Whether we created this disk (for cleanup on failure)
}
