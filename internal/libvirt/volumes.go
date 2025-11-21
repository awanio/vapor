package libvirt

import (
	"context"
	"fmt"
)

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

	// Validate request parameters
	if err := validateVolumeCreateRequest(req); err != nil {
		return nil, err
	}

	pool, err := s.conn.LookupStoragePoolByName(req.PoolName)
	if err != nil {
		return nil, fmt.Errorf("storage pool not found: %w", err)
	}
	defer pool.Free()

	// Ensure the pool is active before creating volumes
	active, err := pool.IsActive()
	if err != nil {
		return nil, fmt.Errorf("failed to check pool status: %w", err)
	}
	if !active {
		return nil, fmt.Errorf("storage pool must be active to create volumes")
	}

	// Check for duplicate volume name in the pool
	if _, err := pool.LookupStorageVolByName(req.Name); err == nil {
		return nil, fmt.Errorf("volume with name '%s' already exists in pool", req.Name)
	}

	// Check pool has enough available capacity
	poolInfo, err := pool.GetInfo()
	if err != nil {
		return nil, fmt.Errorf("failed to get pool info: %w", err)
	}
	if poolInfo.Available < req.Capacity {
		return nil, fmt.Errorf("insufficient space in pool: available %d bytes, requested %d bytes", poolInfo.Available, req.Capacity)
	}

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
// If force is false, the volume must not be attached to any VM.
func (s *Service) DeleteVolume(ctx context.Context, poolName, volumeName string, force bool) error {
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

	// Check if the volume is in use by any VM unless force deletion is requested
	if !force {
		path, err := vol.GetPath()
		if err != nil {
			return fmt.Errorf("failed to get volume path: %w", err)
		}

		usingVMs, err := s.getVMsUsingVolume(ctx, path)
		if err != nil {
			return fmt.Errorf("failed to check volume usage: %w", err)
		}

		if len(usingVMs) > 0 {
			return fmt.Errorf("volume is in use by VM(s): %v. Detach volume first or use force=true", usingVMs)
		}
	}

	if err := vol.Delete(0); err != nil {
		return fmt.Errorf("failed to delete volume: %w", err)
	}

	return nil
}

// ResizeVolume resizes an existing volume in a pool.
// The new capacity must be greater than the current capacity.
func (s *Service) ResizeVolume(ctx context.Context, poolName, volumeName string, newCapacity uint64) (*StorageVolume, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if newCapacity == 0 {
		return nil, fmt.Errorf("new capacity must be greater than 0")
	}

	pool, err := s.conn.LookupStoragePoolByName(poolName)
	if err != nil {
		return nil, fmt.Errorf("storage pool not found: %w", err)
	}
	defer pool.Free()

	vol, err := pool.LookupStorageVolByName(volumeName)
	if err != nil {
		return nil, fmt.Errorf("volume not found: %w", err)
	}
	defer vol.Free()

	info, err := vol.GetInfo()
	if err != nil {
		return nil, fmt.Errorf("failed to get volume info: %w", err)
	}

	if newCapacity <= info.Capacity {
		return nil, fmt.Errorf("new capacity must be greater than current capacity (%d bytes)", info.Capacity)
	}

	if err := vol.Resize(newCapacity, 0); err != nil {
		return nil, fmt.Errorf("failed to resize volume: %w", err)
	}

	return s.storageVolumeToType(vol)
}

// CloneVolume performs a full clone of a volume, optionally into a different pool.
func (s *Service) CloneVolume(ctx context.Context, poolName, volumeName string, req *VolumeCloneRequest) (*StorageVolumeWithPool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if req == nil {
		return nil, fmt.Errorf("clone request cannot be nil")
	}

	if !isValidVolumeName(req.NewName) {
		return nil, fmt.Errorf("invalid volume name: must contain only alphanumeric characters, hyphens, and underscores")
	}

	// Source pool and volume
	srcPool, err := s.conn.LookupStoragePoolByName(poolName)
	if err != nil {
		return nil, fmt.Errorf("source storage pool not found: %w", err)
	}
	defer srcPool.Free()

	srcVol, err := srcPool.LookupStorageVolByName(volumeName)
	if err != nil {
		return nil, fmt.Errorf("source volume not found: %w", err)
	}
	defer srcVol.Free()

	// Determine target pool (defaults to source pool)
	targetPoolName := poolName
	if req.TargetPool != "" {
		targetPoolName = req.TargetPool
	}

	dstPool, err := s.conn.LookupStoragePoolByName(targetPoolName)
	if err != nil {
		return nil, fmt.Errorf("target storage pool not found: %w", err)
	}
	defer dstPool.Free()

	// Optional: ensure target pool is active
	active, err := dstPool.IsActive()
	if err != nil {
		return nil, fmt.Errorf("failed to check target pool status: %w", err)
	}
	if !active {
		return nil, fmt.Errorf("target storage pool must be active to clone volumes")
	}

	// Check duplicate name in target pool
	if _, err := dstPool.LookupStorageVolByName(req.NewName); err == nil {
		return nil, fmt.Errorf("volume with name '%s' already exists in pool '%s'", req.NewName, targetPoolName)
	}

	// Inspect source volume to derive capacity and format
	srcInfo, err := srcVol.GetInfo()
	if err != nil {
		return nil, fmt.Errorf("failed to get source volume info: %w", err)
	}

	srcVolType, err := s.storageVolumeToType(srcVol)
	if err != nil {
		return nil, fmt.Errorf("failed to inspect source volume: %w", err)
	}

	format := srcVolType.Format
	if format == "" {
		format = "qcow2"
	}

	// Build clone volume XML
	volXML := fmt.Sprintf(`
		<volume>
			<name>%s</name>
			<capacity unit='bytes'>%d</capacity>
			<target>
				<format type='%s'/>
			</target>
		</volume>
	`, req.NewName, srcInfo.Capacity, format)

	// Perform the clone
	newVol, err := dstPool.StorageVolCreateXMLFrom(volXML, srcVol, 0)
	if err != nil {
		return nil, fmt.Errorf("failed to clone volume: %w", err)
	}
	defer newVol.Free()

	cloned, err := s.storageVolumeToType(newVol)
	if err != nil {
		return nil, err
	}

	return &StorageVolumeWithPool{
		StorageVolume: *cloned,
		PoolName:      targetPoolName,
	}, nil
}

// ListAllVolumes lists all volumes across all storage pools
func (s *Service) ListAllVolumes(ctx context.Context) ([]StorageVolumeWithPool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	// Get all storage pools
	pools, err := s.conn.ListAllStoragePools(0)
	if err != nil {
		return nil, fmt.Errorf("failed to list storage pools: %w", err)
	}

	var allVolumes []StorageVolumeWithPool

	// Iterate through each pool and get its volumes
	for _, pool := range pools {
		poolName, err := pool.GetName()
		if err != nil {
			pool.Free()
			continue
		}

		// Get volumes in this pool
		vols, err := pool.ListAllStorageVolumes(0)
		if err != nil {
			pool.Free()
			continue // Skip pools that can't be accessed
		}

		// Convert each volume to our type
		for _, vol := range vols {
			sv, err := s.storageVolumeToType(&vol)
			if err != nil {
				vol.Free()
				continue
			}

			volumeWithPool := StorageVolumeWithPool{
				StorageVolume: *sv,
				PoolName:      poolName,
			}
			allVolumes = append(allVolumes, volumeWithPool)
			vol.Free()
		}

		pool.Free()
	}

	return allVolumes, nil
}
