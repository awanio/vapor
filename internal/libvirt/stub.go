//go:build !linux || !libvirt
// +build !linux !libvirt

package libvirt

import (
	"context"
	"fmt"
)

// Stub implementations for when libvirt is not available

// Service provides libvirt VM management functionality (stub)
type Service struct{}

// NewService creates a new libvirt service (stub)
func NewService(uri string) (*Service, error) {
	return nil, fmt.Errorf("libvirt support is not available on this platform")
}

// Close closes the libvirt connection (stub)
func (s *Service) Close() error {
	return nil
}

// SetDatabase sets the database connection for the service (stub)
func (s *Service) SetDatabase(db interface{}) {
	// Stub - no operation
}

// ListVMs returns all VMs (stub)
func (s *Service) ListVMs(ctx context.Context) ([]VM, error) {
	return nil, fmt.Errorf("libvirt support is not available")
}

// GetVM returns a specific VM by name or UUID (stub)
func (s *Service) GetVM(ctx context.Context, nameOrUUID string) (*VM, error) {
	return nil, fmt.Errorf("libvirt support is not available")
}

// CreateVM creates a new virtual machine (stub)
func (s *Service) CreateVM(ctx context.Context, req *VMCreateRequest) (*VM, error) {
	return nil, fmt.Errorf("libvirt support is not available")
}

// UpdateVM updates VM configuration (stub)
func (s *Service) UpdateVM(ctx context.Context, nameOrUUID string, req *VMUpdateRequest) (*VM, error) {
	return nil, fmt.Errorf("libvirt support is not available")
}

// DeleteVM deletes a virtual machine (stub)
func (s *Service) DeleteVM(ctx context.Context, nameOrUUID string, removeDisks bool) error {
	return fmt.Errorf("libvirt support is not available")
}

// VMAction performs an action on a VM (stub)
func (s *Service) VMAction(ctx context.Context, nameOrUUID string, action string, force bool) error {
	return fmt.Errorf("libvirt support is not available")
}

// CreateSnapshot creates a VM snapshot (stub)
func (s *Service) CreateSnapshot(ctx context.Context, nameOrUUID string, req *VMSnapshotRequest) (*VMSnapshot, error) {
	return nil, fmt.Errorf("libvirt support is not available")
}

// ListSnapshots lists all snapshots for a VM (stub)
func (s *Service) ListSnapshots(ctx context.Context, nameOrUUID string) ([]VMSnapshot, error) {
	return nil, fmt.Errorf("libvirt support is not available")
}

// RevertSnapshot reverts VM to a snapshot (stub)
func (s *Service) RevertSnapshot(ctx context.Context, nameOrUUID string, snapshotName string) error {
	return fmt.Errorf("libvirt support is not available")
}

// DeleteSnapshot deletes a VM snapshot (stub)
func (s *Service) DeleteSnapshot(ctx context.Context, nameOrUUID string, snapshotName string) error {
	return fmt.Errorf("libvirt support is not available")
}

// CloneVM clones a virtual machine (stub)
func (s *Service) CloneVM(ctx context.Context, req *VMCloneRequest) (*VM, error) {
	return nil, fmt.Errorf("libvirt support is not available")
}

// GetVMMetrics returns current metrics for a VM (stub)
func (s *Service) GetVMMetrics(ctx context.Context, nameOrUUID string) (*VMMetrics, error) {
	return nil, fmt.Errorf("libvirt support is not available")
}

// GetConsole returns console access information (stub)
func (s *Service) GetConsole(ctx context.Context, nameOrUUID string, consoleType string) (*ConsoleResponse, error) {
	return nil, fmt.Errorf("libvirt support is not available")
}

// GetSnapshotCapabilities analyzes a VM's disks and returns snapshot capabilities (stub)
func (s *Service) GetSnapshotCapabilities(ctx context.Context, nameOrUUID string) (*VMSnapshotCapabilities, error) {
	return nil, fmt.Errorf("libvirt support is not available")
}

// CreateSnapshotEnhanced creates a VM snapshot with format-aware handling (stub)
func (s *Service) CreateSnapshotEnhanced(ctx context.Context, nameOrUUID string, req *VMSnapshotRequest) (*VMSnapshot, error) {
	return nil, fmt.Errorf("libvirt support is not available")
}

// ValidateSnapshotRequest validates if a snapshot request is feasible (stub)
func (s *Service) ValidateSnapshotRequest(ctx context.Context, nameOrUUID string, req *VMSnapshotRequest) error {
	return fmt.Errorf("libvirt support is not available")
}
