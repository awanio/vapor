package storage

import (
	"fmt"
)

// MultipathService handles multipath operations
type MultipathService struct {
	executor CommandExecutor
}

// NewMultipathService creates a new multipath service
func NewMultipathService(executor CommandExecutor) *MultipathService {
	return &MultipathService{executor: executor}
}

// ListDevices lists multipath devices
func (s *MultipathService) ListDevices() ([]MultipathDevice, error) {
	output, err := s.executor.Execute("multipath", "-ll", "-v1")
	if err != nil {
		return nil, fmt.Errorf("failed to list multipath devices: %w", err)
	}

	// Parse multipath output
	// This is a simplified parser for multipath -ll output
	// In production, you'd want a more robust parser
	devices := []MultipathDevice{}
	_ = output // TODO: Implement proper parsing
	return devices, nil
}

// GetPaths gets all multipath paths
func (s *MultipathService) GetPaths() ([]Path, error) {
	output, err := s.executor.Execute("multipathd", "show", "paths")
	if err != nil {
		return nil, fmt.Errorf("failed to get multipath paths: %w", err)
	}

	// Parse paths output
	paths := []Path{}
	_ = output // TODO: Implement proper parsing
	return paths, nil
}

// FlushDevice removes a multipath device
func (s *MultipathService) FlushDevice(device string) error {
	if _, err := s.executor.Execute("multipath", "-f", device); err != nil {
		return fmt.Errorf("failed to flush multipath device %s: %w", device, err)
	}
	return nil
}

// RescanDevices rescans for new multipath devices
func (s *MultipathService) RescanDevices() error {
	if _, err := s.executor.Execute("multipath", "-r"); err != nil {
		return fmt.Errorf("failed to rescan multipath devices: %w", err)
	}
	return nil
}

// EnableDevice enables a multipath device
func (s *MultipathService) EnableDevice(device string) error {
	if _, err := s.executor.Execute("multipathd", "enable", "map", device); err != nil {
		return fmt.Errorf("failed to enable multipath device %s: %w", device, err)
	}
	return nil
}

// DisableDevice disables a multipath device
func (s *MultipathService) DisableDevice(device string) error {
	if _, err := s.executor.Execute("multipathd", "disable", "map", device); err != nil {
		return fmt.Errorf("failed to disable multipath device %s: %w", device, err)
	}
	return nil
}
