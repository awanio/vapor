//go:build !linux || !libvirt
// +build !linux !libvirt

package libvirt

import "time"

// Stub type definitions for when libvirt is not available

// VMState represents the state of a virtual machine
type VMState string

// VM represents a virtual machine (stub)
type VM struct {
	UUID  string  `json:"uuid"`
	Name  string  `json:"name"`
	State VMState `json:"state"`
}

// VMCreateRequest represents a request to create a new VM (stub)
type VMCreateRequest struct {
	Name   string `json:"name"`
	Memory uint64 `json:"memory"`
	VCPUs  uint   `json:"vcpus"`
}

// VMUpdateRequest for updating VM configuration (stub)
type VMUpdateRequest struct {
	Memory    *uint64 `json:"memory,omitempty"`
	VCPUs     *uint   `json:"vcpus,omitempty"`
	AutoStart *bool   `json:"autostart,omitempty"`
}

// VMActionRequest for VM state operations (stub)
type VMActionRequest struct {
	Action string `json:"action"`
	Force  bool   `json:"force"`
}

// VMSnapshotRequest for snapshot operations (stub)
type VMSnapshotRequest struct {
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	Memory      bool   `json:"memory"`
}

// VMSnapshot represents a VM snapshot (stub)
type VMSnapshot struct {
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
}

// VMCloneRequest for cloning VMs (stub)
type VMCloneRequest struct {
	SourceVM string `json:"source_vm"`
	Name     string `json:"name"`
}

// VMMetrics represents performance metrics for a VM (stub)
type VMMetrics struct {
	UUID      string    `json:"uuid"`
	Timestamp time.Time `json:"timestamp"`
}

// ConsoleRequest for console access (stub)
type ConsoleRequest struct {
	Type string `json:"type"`
}

// ConsoleResponse with connection details (stub)
type ConsoleResponse struct {
	Type string `json:"type"`
	Host string `json:"host"`
	Port int    `json:"port"`
}
