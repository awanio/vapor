//go:build linux && libvirt
// +build linux,libvirt

package libvirt

import (
	"time"
)

// VMState represents the state of a virtual machine
type VMState string

const (
	VMStateRunning   VMState = "running"
	VMStatePaused    VMState = "paused"
	VMStateStopped   VMState = "stopped"
	VMStateSuspended VMState = "suspended"
	VMStateShutoff   VMState = "shutoff"
	VMStateCrashed   VMState = "crashed"
	VMStateUnknown   VMState = "unknown"
)

// DiskBus types
type DiskBus string

const (
	DiskBusVirtio DiskBus = "virtio"
	DiskBusIDE    DiskBus = "ide"
	DiskBusSCSI   DiskBus = "scsi"
	DiskBusSATA   DiskBus = "sata"
	DiskBusUSB    DiskBus = "usb"
)

// NetworkType represents network interface types
type NetworkType string

const (
	NetworkTypeBridge  NetworkType = "bridge"
	NetworkTypeNAT     NetworkType = "nat"
	NetworkTypeDirect  NetworkType = "direct"
	NetworkTypeUser    NetworkType = "user"
	NetworkTypeVirtio  NetworkType = "virtio"
)

// VM represents a virtual machine
type VM struct {
	UUID        string            `json:"uuid"`
	Name        string            `json:"name"`
	State       VMState           `json:"state"`
	Memory      uint64            `json:"memory"`      // in KB
	MaxMemory   uint64            `json:"max_memory"`  // in KB
	VCPUs       uint              `json:"vcpus"`
	MaxVCPUs    uint              `json:"max_vcpus"`
	OS          OSInfo            `json:"os"`
	Disks       []DiskAttachment  `json:"disks"`
	Networks    []NetworkInterface `json:"networks"`
	Graphics    []GraphicsDevice  `json:"graphics,omitempty"`
	Metadata    map[string]string `json:"metadata,omitempty"`
	CreatedAt   time.Time         `json:"created_at"`
	UpdatedAt   time.Time         `json:"updated_at"`
	AutoStart   bool              `json:"autostart"`
	Persistent  bool              `json:"persistent"`
}

// OSInfo contains operating system information
type OSInfo struct {
	Type         string `json:"type"`         // hvm or linux
	Architecture string `json:"architecture"` // x86_64, i686, aarch64
	Machine      string `json:"machine"`      // pc, q35, virt
	Boot         []string `json:"boot"`       // boot order: hd, cdrom, network
	Kernel       string `json:"kernel,omitempty"`
	Initrd       string `json:"initrd,omitempty"`
	Cmdline      string `json:"cmdline,omitempty"`
}

// DiskAttachment represents a disk attached to a VM
type DiskAttachment struct {
	Device     string  `json:"device"`      // disk, cdrom, floppy
	Source     string  `json:"source"`      // path to disk image
	Target     string  `json:"target"`      // target device name (vda, hda, etc)
	Bus        DiskBus `json:"bus"`         // virtio, ide, scsi, sata
	Format     string  `json:"format"`      // qcow2, raw, vmdk
	Size       uint64  `json:"size"`        // size in bytes
	ReadOnly   bool    `json:"readonly"`
	Bootable   bool    `json:"bootable"`
	Cache      string  `json:"cache,omitempty"`      // none, writethrough, writeback
	IOMode     string  `json:"io_mode,omitempty"`    // native, threads
}

// NetworkInterface represents a network interface
type NetworkInterface struct {
	Type       NetworkType `json:"type"`
	Source     string      `json:"source"`      // bridge name, network name
	MAC        string      `json:"mac"`
	Model      string      `json:"model"`       // virtio, e1000, rtl8139
	Target     string      `json:"target,omitempty"`
	IPAddress  string      `json:"ip_address,omitempty"`
}

// GraphicsDevice represents graphics/console configuration
type GraphicsDevice struct {
	Type     string `json:"type"`     // vnc, spice, rdp
	Port     int    `json:"port"`
	Listen   string `json:"listen"`
	Password string `json:"password,omitempty"`
	Keymap   string `json:"keymap,omitempty"`
}

// VMCreateRequest represents a request to create a new VM
type VMCreateRequest struct {
	Name         string             `json:"name" binding:"required"`
	Memory       uint64             `json:"memory" binding:"required"`       // in MB
	VCPUs        uint               `json:"vcpus" binding:"required"`
	DiskSize     uint64             `json:"disk_size,omitempty"`            // in GB, for auto-creation
	DiskPath     string             `json:"disk_path,omitempty"`            // existing disk path
	OSType       string             `json:"os_type"`                        // linux, windows, etc
	Architecture string             `json:"architecture"`                    // x86_64 by default
	ISOPath      string             `json:"iso_path,omitempty"`             // installation ISO
	Network      NetworkConfig      `json:"network"`
	Graphics     GraphicsConfig     `json:"graphics"`
	CloudInit    *CloudInitConfig   `json:"cloud_init,omitempty"`
	Template     string             `json:"template,omitempty"`             // template name to use
	StoragePool  string             `json:"storage_pool,omitempty"`         // storage pool for disk
	AutoStart    bool               `json:"autostart"`
}

// NetworkConfig for VM creation
type NetworkConfig struct {
	Type   NetworkType `json:"type"`
	Source string      `json:"source"`  // bridge/network name
	Model  string      `json:"model"`   // virtio by default
}

// GraphicsConfig for VM creation
type GraphicsConfig struct {
	Type     string `json:"type"`     // vnc or spice
	Port     int    `json:"port"`     // -1 for auto
	Password string `json:"password,omitempty"`
}

// CloudInitConfig for cloud-init based initialization
type CloudInitConfig struct {
	UserData    string            `json:"user_data,omitempty"`
	MetaData    string            `json:"meta_data,omitempty"`
	NetworkData string            `json:"network_data,omitempty"`
	SSHKeys     []string          `json:"ssh_keys,omitempty"`
	Users       []CloudInitUser   `json:"users,omitempty"`
	Packages    []string          `json:"packages,omitempty"`
	RunCmd      []string          `json:"runcmd,omitempty"`
}

// CloudInitUser represents a user to create via cloud-init
type CloudInitUser struct {
	Name              string   `json:"name"`
	SSHAuthorizedKeys []string `json:"ssh_authorized_keys,omitempty"`
	Sudo              string   `json:"sudo,omitempty"`
	Groups            string   `json:"groups,omitempty"`
	Shell             string   `json:"shell,omitempty"`
	Password          string   `json:"password,omitempty"`
}

// VMUpdateRequest for updating VM configuration
type VMUpdateRequest struct {
	Memory    *uint64 `json:"memory,omitempty"`     // in MB
	VCPUs     *uint   `json:"vcpus,omitempty"`
	AutoStart *bool   `json:"autostart,omitempty"`
	// Note: Some changes require VM restart
}

// VMActionRequest for VM state operations
type VMActionRequest struct {
	Action string `json:"action" binding:"required"` // start, stop, restart, pause, resume, reset
	Force  bool   `json:"force"`                     // force stop/restart
}

// VMSnapshotRequest for snapshot operations
type VMSnapshotRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description,omitempty"`
	Memory      bool   `json:"memory"`  // include memory state
}

// VMSnapshot represents a VM snapshot
type VMSnapshot struct {
	Name        string    `json:"name"`
	Description string    `json:"description"`
	State       VMState   `json:"state"`
	CreatedAt   time.Time `json:"created_at"`
	Parent      string    `json:"parent,omitempty"`
	Current     bool      `json:"current"`
	Memory      bool      `json:"memory"`
}

// VMCloneRequest for cloning VMs
type VMCloneRequest struct {
	SourceVM    string `json:"source_vm" binding:"required"`
	Name        string `json:"name" binding:"required"`
	FullClone   bool   `json:"full_clone"`     // full clone vs linked clone
	Snapshots   bool   `json:"snapshots"`      // clone snapshots too
	StoragePool string `json:"storage_pool,omitempty"`
}

// StoragePool represents a storage pool
type StoragePool struct {
	Name       string            `json:"name"`
	Type       string            `json:"type"`       // dir, fs, netfs, logical, disk, iscsi, rbd
	State      string            `json:"state"`      // running, inactive
	Capacity   uint64            `json:"capacity"`   // in bytes
	Allocation uint64            `json:"allocation"` // in bytes
	Available  uint64            `json:"available"`  // in bytes
	Path       string            `json:"path"`
	AutoStart  bool              `json:"autostart"`
	Volumes    []StorageVolume   `json:"volumes,omitempty"`
}

// StorageVolume represents a storage volume
type StorageVolume struct {
	Name       string    `json:"name"`
	Type       string    `json:"type"`       // file, block, dir
	Capacity   uint64    `json:"capacity"`   // in bytes
	Allocation uint64    `json:"allocation"` // in bytes
	Path       string    `json:"path"`
	Format     string    `json:"format"`     // qcow2, raw, vmdk
	CreatedAt  time.Time `json:"created_at"`
}

// Network represents a virtual network
type Network struct {
	Name      string          `json:"name"`
	UUID      string          `json:"uuid"`
	State     string          `json:"state"`      // active, inactive
	Bridge    string          `json:"bridge"`
	Mode      string          `json:"mode"`       // nat, route, bridge, private
	IPRange   NetworkIPRange  `json:"ip_range,omitempty"`
	DHCP      *DHCPConfig     `json:"dhcp,omitempty"`
	AutoStart bool            `json:"autostart"`
	Persistent bool           `json:"persistent"`
}

// NetworkIPRange for network configuration
type NetworkIPRange struct {
	Address string `json:"address"` // 192.168.122.1
	Netmask string `json:"netmask"` // 255.255.255.0
	Gateway string `json:"gateway,omitempty"`
}

// DHCPConfig for network DHCP settings
type DHCPConfig struct {
	Start string         `json:"start"` // 192.168.122.2
	End   string         `json:"end"`   // 192.168.122.254
	Hosts []DHCPHost     `json:"hosts,omitempty"`
}

// DHCPHost for static DHCP assignments
type DHCPHost struct {
	MAC  string `json:"mac"`
	IP   string `json:"ip"`
	Name string `json:"name,omitempty"`
}

// VMMetrics represents performance metrics for a VM
type VMMetrics struct {
	UUID         string    `json:"uuid"`
	Timestamp    time.Time `json:"timestamp"`
	CPUTime      uint64    `json:"cpu_time"`      // nanoseconds
	CPUUsage     float64   `json:"cpu_usage"`     // percentage
	MemoryUsed   uint64    `json:"memory_used"`   // in KB
	MemoryUsage  float64   `json:"memory_usage"`  // percentage
	DiskRead     uint64    `json:"disk_read"`     // bytes
	DiskWrite    uint64    `json:"disk_write"`    // bytes
	NetworkRX    uint64    `json:"network_rx"`    // bytes
	NetworkTX    uint64    `json:"network_tx"`    // bytes
}

// ConsoleRequest for console access
type ConsoleRequest struct {
	Type string `json:"type"` // vnc, spice, serial
}

// ConsoleResponse with connection details
type ConsoleResponse struct {
	Type     string `json:"type"`
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Password string `json:"password,omitempty"`
	Token    string `json:"token,omitempty"`     // for websocket auth
	WSPath   string `json:"ws_path,omitempty"`   // websocket path
}

// MigrationRequest for VM migration
type MigrationRequest struct {
	DestHost   string `json:"dest_host" binding:"required"`
	Live       bool   `json:"live"`         // live migration
	Persistent bool   `json:"persistent"`   // persist on destination
	Offline    bool   `json:"offline"`      // offline migration
	Compressed bool   `json:"compressed"`   // compress during transfer
	Port       int    `json:"port,omitempty"`
}

// BackupRequest for VM backup
type BackupRequest struct {
	VMName      string   `json:"vm_name" binding:"required"`
	Destination string   `json:"destination" binding:"required"` // backup path
	Incremental bool     `json:"incremental"`
	Compress    bool     `json:"compress"`
	Disks       []string `json:"disks,omitempty"` // specific disks to backup
}

// Template represents a VM template
type Template struct {
	Name        string            `json:"name"`
	Description string            `json:"description"`
	OS          OSInfo            `json:"os"`
	MinMemory   uint64            `json:"min_memory"`
	MinVCPUs    uint              `json:"min_vcpus"`
	MinDisk     uint64            `json:"min_disk"`
	DiskFormat  string            `json:"disk_format"`
	Source      string            `json:"source"`      // path to template disk
	CloudInit   bool              `json:"cloud_init"`  // supports cloud-init
	Variables   map[string]string `json:"variables,omitempty"`
	CreatedAt   time.Time         `json:"created_at"`
}

// StoragePoolCreateRequest for creating storage pools
type StoragePoolCreateRequest struct {
	Name      string `json:"name" binding:"required"`
	Type      string `json:"type" binding:"required"` // dir, fs, netfs, logical, disk, iscsi
	Path      string `json:"path"`                    // for dir type
	Source    string `json:"source,omitempty"`        // for netfs (NFS server)
	Target    string `json:"target,omitempty"`        // mount point
	AutoStart bool   `json:"autostart"`
}

// VolumeCreateRequest for creating volumes
type VolumeCreateRequest struct {
	Name     string `json:"name" binding:"required"`
	PoolName string `json:"pool_name" binding:"required"`
	Capacity uint64 `json:"capacity" binding:"required"` // in bytes
	Format   string `json:"format"`                       // qcow2, raw, vmdk
}

// NetworkCreateRequest for creating networks
type NetworkCreateRequest struct {
	Name      string          `json:"name" binding:"required"`
	Mode      string          `json:"mode"` // nat, route, bridge, private
	Bridge    string          `json:"bridge,omitempty"`
	IPRange   *NetworkIPRange `json:"ip_range,omitempty"`
	DHCP      *DHCPConfig     `json:"dhcp,omitempty"`
	AutoStart bool            `json:"autostart"`
}
