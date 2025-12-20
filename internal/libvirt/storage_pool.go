package libvirt

import (
	"context"
	"encoding/xml"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"libvirt.org/go/libvirt"
)

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

	_, err = pool.GetUUIDString()
	if err != nil {
		_ = "" // Non-fatal
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

	createdAt := time.Time{}
	if fi, err := os.Stat(path); err == nil {
		createdAt = fi.ModTime()
	}

	return &StorageVolume{
		Name:       name,
		Type:       volumeType,
		Capacity:   info.Capacity,
		Allocation: info.Allocation,
		Path:       path,
		Format:     volXML.Target.Format.Type,
		CreatedAt:  createdAt,
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

// validateDirPoolPath validates the path for directory-type storage pools
func validateDirPoolPath(path string) error {
	// Check if path is provided
	if strings.TrimSpace(path) == "" {
		return fmt.Errorf("path is required for directory-type storage pools")
	}

	// Check if path is absolute
	if !filepath.IsAbs(path) {
		return fmt.Errorf("path must be an absolute path, got: %s", path)
	}

	// Clean the path
	cleanPath := filepath.Clean(path)

	// Check if parent directory exists and is writable
	parentDir := filepath.Dir(cleanPath)
	parentInfo, err := os.Stat(parentDir)
	if err != nil {
		if os.IsNotExist(err) {
			return fmt.Errorf("parent directory does not exist: %s", parentDir)
		}
		return fmt.Errorf("cannot access parent directory %s: %w", parentDir, err)
	}

	if !parentInfo.IsDir() {
		return fmt.Errorf("parent path is not a directory: %s", parentDir)
	}

	// Check if parent directory is writable
	if parentInfo.Mode().Perm()&0200 == 0 {
		return fmt.Errorf("parent directory is not writable: %s", parentDir)
	}

	// If the target path already exists, check if it's a directory
	if info, err := os.Stat(cleanPath); err == nil {
		if !info.IsDir() {
			return fmt.Errorf("path exists but is not a directory: %s", cleanPath)
		}
	}

	return nil
}

// CreateStoragePool creates a new storage pool
func (s *Service) CreateStoragePool(ctx context.Context, req *StoragePoolCreateRequest) (*StoragePool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Validate path for dir-type pools
	if req.Type == "dir" || req.Type == "" {
		if err := validateDirPoolPath(req.Path); err != nil {
			return nil, err
		}
	}

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

	// Refresh pool to get current volume list
	if active, _ := pool.IsActive(); active {
		pool.Refresh(0) // Ignore refresh errors
	}

	// Check for existing volumes
	volumes, err := pool.ListAllStorageVolumes(0)
	if err != nil {
		return fmt.Errorf("failed to list volumes in pool: %w", err)
	}

	volumeCount := len(volumes)

	// When deleteVolumes is requested, ensure no volume in the pool is in use by any VM.
	// This prevents destructive deletion of backing storage for running guests.
	var inUse []string
	if deleteVolumes && volumeCount > 0 {
		for _, vol := range volumes {
			path, err := vol.GetPath()
			if err != nil {
				vol.Free()
				return fmt.Errorf("failed to get volume path: %w", err)
			}

			usingVMs, err := s.getVMsUsingVolume(ctx, path)
			if err != nil {
				vol.Free()
				return fmt.Errorf("failed to check volume usage: %w", err)
			}

			if len(usingVMs) > 0 {
				name, _ := vol.GetName()
				inUse = append(inUse, fmt.Sprintf("%s: %v", name, usingVMs))
			}

			vol.Free()
		}
	} else {
		// Free volume handles when we're not inspecting usage.
		for _, vol := range volumes {
			vol.Free()
		}
	}

	if len(inUse) > 0 {
		return fmt.Errorf("storage pool contains volume(s) in use by VM(s): %v. Detach volumes or shut down VMs before deleting the pool", inUse)
	}

	// Validate deletion request when volumes exist but cascading delete was not requested.
	if volumeCount > 0 && !deleteVolumes {
		return fmt.Errorf("storage pool contains %d volume(s). Set delete_volumes=true to force deletion, or delete volumes first", volumeCount)
	}

	// Stop the pool if active
	if active, _ := pool.IsActive(); active {
		if err := pool.Destroy(); err != nil {
			return fmt.Errorf("failed to stop storage pool: %w", err)
		}
	}

	// Delete volumes if requested
	if deleteVolumes && volumeCount > 0 {
		if err := pool.Delete(libvirt.STORAGE_POOL_DELETE_NORMAL); err != nil {
			return fmt.Errorf("failed to delete storage pool with volumes: %w", err)
		}
	}

	// Undefine the pool
	if err := pool.Undefine(); err != nil {
		return fmt.Errorf("failed to undefine storage pool: %w", err)
	}

	return nil
}

// UpdateStoragePool updates a storage pool's configuration
func (s *Service) UpdateStoragePool(ctx context.Context, name string, req *StoragePoolUpdateRequest) (*StoragePool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	pool, err := s.conn.LookupStoragePoolByName(name)
	if err != nil {
		return nil, fmt.Errorf("storage pool not found: %w", err)
	}
	defer pool.Free()

	if req.Autostart != nil {
		if err := pool.SetAutostart(*req.Autostart); err != nil {
			return nil, fmt.Errorf("failed to set autostart: %w", err)
		}
	}

	return s.storagePoolToType(pool)
}

// StartStoragePool starts a storage pool
func (s *Service) StartStoragePool(ctx context.Context, name string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	pool, err := s.conn.LookupStoragePoolByName(name)
	if err != nil {
		return fmt.Errorf("storage pool not found: %w", err)
	}
	defer pool.Free()

	active, err := pool.IsActive()
	if err != nil {
		return fmt.Errorf("failed to check pool status: %w", err)
	}
	if active {
		return fmt.Errorf("storage pool is already active")
	}

	if err := pool.Create(0); err != nil {
		return fmt.Errorf("failed to start storage pool: %w", err)
	}

	return nil
}

// StopStoragePool stops a storage pool
func (s *Service) StopStoragePool(ctx context.Context, name string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	pool, err := s.conn.LookupStoragePoolByName(name)
	if err != nil {
		return fmt.Errorf("storage pool not found: %w", err)
	}
	defer pool.Free()

	active, err := pool.IsActive()
	if err != nil {
		return fmt.Errorf("failed to check pool status: %w", err)
	}
	if !active {
		return fmt.Errorf("storage pool is not active")
	}

	if err := pool.Destroy(); err != nil {
		return fmt.Errorf("failed to stop storage pool: %w", err)
	}

	return nil
}

// RefreshStoragePool refreshes a storage pool's volumes
func (s *Service) RefreshStoragePool(ctx context.Context, name string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	pool, err := s.conn.LookupStoragePoolByName(name)
	if err != nil {
		return fmt.Errorf("storage pool not found: %w", err)
	}
	defer pool.Free()

	active, err := pool.IsActive()
	if err != nil {
		return fmt.Errorf("failed to check pool status: %w", err)
	}
	if !active {
		return fmt.Errorf("storage pool is not active, cannot refresh")
	}

	if err := pool.Refresh(0); err != nil {
		return fmt.Errorf("failed to refresh storage pool: %w", err)
	}

	return nil
}

// GetPoolCapacity returns capacity information for a storage pool
func (s *Service) GetPoolCapacity(ctx context.Context, name string) (*StoragePoolCapacity, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	pool, err := s.conn.LookupStoragePoolByName(name)
	if err != nil {
		return nil, fmt.Errorf("storage pool not found: %w", err)
	}
	defer pool.Free()

	info, err := pool.GetInfo()
	if err != nil {
		return nil, fmt.Errorf("failed to get pool info: %w", err)
	}

	active, err := pool.IsActive()
	if err != nil {
		return nil, fmt.Errorf("failed to check pool status: %w", err)
	}

	capacity := &StoragePoolCapacity{
		Name:      name,
		Capacity:  info.Capacity,
		Available: info.Available,
		Used:      info.Capacity - info.Available,
		State:     "inactive",
	}

	if active {
		capacity.State = "active"
	}

	if info.Capacity > 0 {
		capacity.UsagePercent = float64(capacity.Used) / float64(info.Capacity) * 100
	}

	return capacity, nil
}
