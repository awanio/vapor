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
