package storage

import (
	"fmt"
)

// BTRFSService handles BTRFS operations
type BTRFSService struct {
	executor CommandExecutor
}

// NewBTRFSService creates a new BTRFS service
func NewBTRFSService(executor CommandExecutor) *BTRFSService {
	return &BTRFSService{executor: executor}
}

// ListSubvolumes lists all BTRFS subvolumes
func (s *BTRFSService) ListSubvolumes(mountPoint string) ([]string, error) {
	output, err := s.executor.Execute("btrfs", "subvolume", "list", mountPoint)
	if err != nil {
		return nil, fmt.Errorf("failed to list BTRFS subvolumes: %w", err)
	}

	// Parse subvolume output
	subvolumes := []string{}
	_ = output // TODO: Implement parsing
	return subvolumes, nil
}

// CreateSubvolume creates a new BTRFS subvolume
func (s *BTRFSService) CreateSubvolume(path string) error {
	if _, err := s.executor.Execute("btrfs", "subvolume", "create", path); err != nil {
		return fmt.Errorf("failed to create BTRFS subvolume at %s: %w", path, err)
	}
	return nil
}

// DeleteSubvolume deletes a BTRFS subvolume
func (s *BTRFSService) DeleteSubvolume(path string) error {
	if _, err := s.executor.Execute("btrfs", "subvolume", "delete", path); err != nil {
		return fmt.Errorf("failed to delete BTRFS subvolume at %s: %w", path, err)
	}
	return nil
}

// Snapshot creates a snapshot of a BTRFS subvolume
func (s *BTRFSService) Snapshot(source, dest string) error {
	if _, err := s.executor.Execute("btrfs", "subvolume", "snapshot", source, dest); err != nil {
		return fmt.Errorf("failed to create snapshot from %s to %s: %w", source, dest, err)
	}
	return nil
}

// Balance rebalance a BTRFS filesystem
func (s *BTRFSService) Balance(mountPoint string) error {
	if _, err := s.executor.Execute("btrfs", "balance", "start", mountPoint); err != nil {
		return fmt.Errorf("failed to start BTRFS balance on %s: %w", mountPoint, err)
	}
	return nil
}
