
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
	NetworkTypeBridge NetworkType = "bridge"
	NetworkTypeNAT    NetworkType = "nat"
	NetworkTypeDirect NetworkType = "direct"
	NetworkTypeUser   NetworkType = "user"
	NetworkTypeVirtio NetworkType = "virtio"
)

// VM represents a virtual machine
type VM struct {
	UUID       string             `json:"uuid"`
	Name       string             `json:"name"`
	State      VMState            `json:"state"`
	Memory     uint64             `json:"memory"`     // in KB
	MaxMemory  uint64             `json:"max_memory"` // in KB
	VCPUs      uint               `json:"vcpus"`
	MaxVCPUs   uint               `json:"max_vcpus"`
	OS         OSInfo             `json:"os"`
	Disks      []DiskAttachment   `json:"disks"`
	Networks   []NetworkInterface `json:"networks"`
	Graphics   []GraphicsDevice   `json:"graphics,omitempty"`
	Metadata   map[string]string  `json:"metadata,omitempty"`
	CreatedAt  time.Time          `json:"created_at"`
	UpdatedAt  time.Time          `json:"updated_at"`
	AutoStart  bool               `json:"autostart"`
	Persistent bool               `json:"persistent"`
}

// OSInfo contains operating system information
type OSInfo struct {
	Type         string   `json:"type"`         // hvm or linux
	Architecture string   `json:"architecture"` // x86_64, i686, aarch64
	Machine      string   `json:"machine"`      // pc, q35, virt
	Boot         []string `json:"boot"`         // boot order: hd, cdrom, network
	Kernel       string   `json:"kernel,omitempty"`
	Initrd       string   `json:"initrd,omitempty"`
	Cmdline      string   `json:"cmdline,omitempty"`
}

// DiskAttachment represents a disk attached to a VM
type DiskAttachment struct {
	Device   string  `json:"device"` // disk, cdrom, floppy
	Source   string  `json:"source"` // path to disk image
	Target   string  `json:"target"` // target device name (vda, hda, etc)
	Bus      DiskBus `json:"bus"`    // virtio, ide, scsi, sata
	Format   string  `json:"format"` // qcow2, raw, vmdk
	Size     uint64  `json:"size"`   // size in bytes
	ReadOnly bool    `json:"readonly"`
	Bootable bool    `json:"bootable"`
	Cache    string  `json:"cache,omitempty"`   // none, writethrough, writeback
	IOMode   string  `json:"io_mode,omitempty"` // native, threads
}

// NetworkInterface represents a network interface
type NetworkInterface struct {
	Type      NetworkType `json:"type"`
	Source    string      `json:"source"` // bridge name, network name
	MAC       string      `json:"mac"`
	Model     string      `json:"model"` // virtio, e1000, rtl8139
	Target    string      `json:"target,omitempty"`
	IPAddress string      `json:"ip_address,omitempty"`
}

// GraphicsDevice represents graphics/console configuration
type GraphicsDevice struct {
	Type     string `json:"type"` // vnc, spice, rdp
	Port     int    `json:"port"`
	Listen   string `json:"listen"`
	Password string `json:"password,omitempty"`
	Keymap   string `json:"keymap,omitempty"`
}

// VMCreateRequest represents a request to create a new VM
type VMCreateRequest struct {
	Name         string            `json:"name" binding:"required"`
	Memory       uint64            `json:"memory" binding:"required"` // in MB
	VCPUs        uint              `json:"vcpus" binding:"required"`
	DiskSize     uint64            `json:"disk_size,omitempty"` // in GB, for auto-creation
	DiskPath     string            `json:"disk_path,omitempty"` // existing disk path
	OSType       string            `json:"os_type"`             // linux, windows, etc
	Architecture string            `json:"architecture"`        // x86_64 by default
	ISOPath      string            `json:"iso_path,omitempty"`  // installation ISO
	Network      NetworkConfig     `json:"network"`
	Graphics     GraphicsConfig    `json:"graphics"`
	CloudInit    *CloudInitConfig  `json:"cloud_init,omitempty"`
	Template     string            `json:"template,omitempty"`     // template name to use
	StoragePool  string            `json:"storage_pool,omitempty"` // storage pool for disk
	AutoStart    bool              `json:"autostart"`
	Metadata     map[string]string `json:"metadata,omitempty"` // metadata for the VM
}

// NetworkConfig for VM creation
type NetworkConfig struct {
	Type   NetworkType `json:"type"`
	Source string      `json:"source"` // bridge/network name
	Model  string      `json:"model"`  // virtio by default
}

// GraphicsConfig for VM creation
type GraphicsConfig struct {
	Type     string `json:"type"` // vnc or spice
	Port     int    `json:"port"` // -1 for auto
	Password string `json:"password,omitempty"`
}

// CloudInitConfig for cloud-init based initialization
type CloudInitConfig struct {
	UserData    string          `json:"user_data,omitempty"`
	MetaData    string          `json:"meta_data,omitempty"`
	NetworkData string          `json:"network_data,omitempty"`
	SSHKeys     []string        `json:"ssh_keys,omitempty"`
	Users       []CloudInitUser `json:"users,omitempty"`
	Packages    []string        `json:"packages,omitempty"`
	RunCmd      []string        `json:"runcmd,omitempty"`
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

// BackupType represents the type of backup
type BackupType string

const (
	BackupTypeFull         BackupType = "full"
	BackupTypeIncremental  BackupType = "incremental"
	BackupTypeDifferential BackupType = "differential"
)

// BackupStatus represents the status of a backup
type BackupStatus string

const (
	BackupStatusPending   BackupStatus = "pending"
	BackupStatusRunning   BackupStatus = "running"
	BackupStatusCompleted BackupStatus = "completed"
	BackupStatusFailed    BackupStatus = "failed"
	BackupStatusDeleted   BackupStatus = "deleted"
)

// BackupCompressionType represents compression type
type BackupCompressionType string

const (
	BackupCompressionNone  BackupCompressionType = "none"
	BackupCompressionGzip  BackupCompressionType = "gzip"
	BackupCompressionBzip2 BackupCompressionType = "bzip2"
	BackupCompressionXz    BackupCompressionType = "xz"
	BackupCompressionZstd  BackupCompressionType = "zstd"
)

// BackupEncryptionType represents encryption type
type BackupEncryptionType string

const (
	BackupEncryptionNone   BackupEncryptionType = "none"
	BackupEncryptionAES256 BackupEncryptionType = "aes256"
	BackupEncryptionAES128 BackupEncryptionType = "aes128"
)

// VMBackup represents a VM backup
type VMBackup struct {
	ID              string                `json:"id"`
	VMUUID          string                `json:"vm_uuid"`
	VMName          string                `json:"vm_name"`
	Type            BackupType            `json:"type"`
	Status          BackupStatus          `json:"status"`
	SourcePath      string                `json:"source_path,omitempty"`
	DestinationPath string                `json:"destination_path"`
	SizeBytes       int64                 `json:"size_bytes,omitempty"`
	Compression     BackupCompressionType `json:"compression"`
	Compressed      bool                  `json:"compressed"` // For backward compatibility
	Encryption      BackupEncryptionType  `json:"encryption"`
	ParentBackupID  string                `json:"parent_backup_id,omitempty"` // For incremental backups
	StartedAt       time.Time             `json:"started_at"`
	CompletedAt     *time.Time            `json:"completed_at,omitempty"`
	ErrorMessage    string                `json:"error_message,omitempty"`
	Metadata        map[string]string     `json:"metadata,omitempty"`
	Retention       int                   `json:"retention_days,omitempty"` // Days to retain backup
}

// VMBackupRequest represents a request to create a backup
type VMBackupRequest struct {
	Type            BackupType            `json:"type" binding:"required,oneof=full incremental differential"`
	DestinationPath string                `json:"destination_path,omitempty"` // Optional, will use default if not specified
	Compression     BackupCompressionType `json:"compression,omitempty"`
	Encryption      BackupEncryptionType  `json:"encryption,omitempty"`
	EncryptionKey   string                `json:"encryption_key,omitempty"`
	Description     string                `json:"description,omitempty"`
	RetentionDays   int                   `json:"retention_days,omitempty"`
	IncludeMemory   bool                  `json:"include_memory"`
}

// VMRestoreRequest represents a request to restore from backup
type VMRestoreRequest struct {
	BackupID      string `json:"backup_id" binding:"required"`
	NewVMName     string `json:"new_vm_name,omitempty"` // Optional, for restore as new VM
	DecryptionKey string `json:"decryption_key,omitempty"`
	Overwrite     bool   `json:"overwrite"` // Overwrite existing VM
}

// VMUpdateRequest for updating VM configuration
type VMUpdateRequest struct {
	Memory    *uint64 `json:"memory,omitempty"` // in MB
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
	Memory      bool   `json:"memory"`   // include memory state
	Quiesce     bool   `json:"quiesce"`  // quiesce filesystem (requires guest agent)
	External    bool   `json:"external"` // force external snapshot
}

// VMSnapshot represents a VM snapshot
type VMSnapshot struct {
	Name        string    `json:"name"`
	Description string    `json:"description"`
	State       VMState   `json:"state"`
	Type        string    `json:"type,omitempty"` // "internal", "external", "internal-memory"
	CreatedAt   time.Time `json:"created_at"`
	Parent      string    `json:"parent,omitempty"`
	Current     bool      `json:"current"`
	Memory      bool      `json:"memory"`
	DiskFormats []string  `json:"disk_formats,omitempty"` // Formats of disks in snapshot
	Warnings    []string  `json:"warnings,omitempty"`     // Any warnings during creation
}

// VMCloneRequest for cloning VMs
type VMCloneRequest struct {
	SourceVM    string `json:"source_vm" binding:"required"`
	Name        string `json:"name" binding:"required"`
	FullClone   bool   `json:"full_clone"` // full clone vs linked clone
	Snapshots   bool   `json:"snapshots"`  // clone snapshots too
	StoragePool string `json:"storage_pool,omitempty"`
}

// StoragePool represents a storage pool
type StoragePool struct {
	Name       string          `json:"name"`
	Type       string          `json:"type"`       // dir, fs, netfs, logical, disk, iscsi, rbd
	State      string          `json:"state"`      // running, inactive
	Capacity   uint64          `json:"capacity"`   // in bytes
	Allocation uint64          `json:"allocation"` // in bytes
	Available  uint64          `json:"available"`  // in bytes
	Path       string          `json:"path"`
	AutoStart  bool            `json:"autostart"`
	Volumes    []StorageVolume `json:"volumes,omitempty"`
}

// StorageVolume represents a storage volume
type StorageVolume struct {
	Name       string    `json:"name"`
	Type       string    `json:"type"`       // file, block, dir
	Capacity   uint64    `json:"capacity"`   // in bytes
	Allocation uint64    `json:"allocation"` // in bytes
	Path       string    `json:"path"`
	Format     string    `json:"format"` // qcow2, raw, vmdk
	CreatedAt  time.Time `json:"created_at"`
}

// Network represents a virtual network
type Network struct {
	Name       string         `json:"name"`
	UUID       string         `json:"uuid"`
	State      string         `json:"state"` // active, inactive
	Bridge     string         `json:"bridge"`
	Mode       string         `json:"mode"` // nat, route, bridge, private
	IPRange    NetworkIPRange `json:"ip_range,omitempty"`
	DHCP       *DHCPConfig    `json:"dhcp,omitempty"`
	AutoStart  bool           `json:"autostart"`
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
	Start string     `json:"start"` // 192.168.122.2
	End   string     `json:"end"`   // 192.168.122.254
	Hosts []DHCPHost `json:"hosts,omitempty"`
}

// DHCPHost for static DHCP assignments
type DHCPHost struct {
	MAC  string `json:"mac"`
	IP   string `json:"ip"`
	Name string `json:"name,omitempty"`
}

// VMMetrics represents performance metrics for a VM
type VMMetrics struct {
	UUID        string    `json:"uuid"`
	Timestamp   time.Time `json:"timestamp"`
	CPUTime     uint64    `json:"cpu_time"`     // nanoseconds
	CPUUsage    float64   `json:"cpu_usage"`    // percentage
	MemoryUsed  uint64    `json:"memory_used"`  // in KB
	MemoryUsage float64   `json:"memory_usage"` // percentage
	DiskRead    uint64    `json:"disk_read"`    // bytes
	DiskWrite   uint64    `json:"disk_write"`   // bytes
	NetworkRX   uint64    `json:"network_rx"`   // bytes
	NetworkTX   uint64    `json:"network_tx"`   // bytes
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
	Token    string `json:"token,omitempty"`   // for websocket auth
	WSPath   string `json:"ws_path,omitempty"` // websocket path
}

// MigrationRequest for VM migration
type MigrationRequest struct {
	DestinationHost string `json:"destination_host" binding:"required"`
	DestinationURI  string `json:"destination_uri,omitempty"`
	Live            bool   `json:"live"`          // live migration
	Tunneled        bool   `json:"tunneled"`      // tunneled migration
	Compressed      bool   `json:"compressed"`    // compress during transfer
	AutoConverge    bool   `json:"auto_converge"` // auto-converge CPU throttling
	AllowUnsafe     bool   `json:"allow_unsafe"`  // allow unsafe migration
	MaxBandwidth    uint64 `json:"max_bandwidth"` // max bandwidth in MB/s (0 = unlimited)
	MaxDowntime     uint64 `json:"max_downtime"`  // max downtime in milliseconds
	CopyStorage     string `json:"copy_storage"`  // storage migration mode: none, all, inc
}

// BackupRequest for VM backup
type BackupRequest struct {
	VMName      string   `json:"vm_name" binding:"required"`
	Destination string   `json:"destination" binding:"required"` // backup path
	Incremental bool     `json:"incremental"`
	Compress    bool     `json:"compress"`
	Disks       []string `json:"disks,omitempty"` // specific disks to backup
}

// VMTemplate represents a VM template with all fields
type VMTemplate struct {
	ID                int               `json:"id"`
	Name              string            `json:"name"`
	Description       string            `json:"description"`
	OSType            string            `json:"os_type"`
	OSVariant         string            `json:"os_variant,omitempty"`
	MinMemory         uint64            `json:"min_memory"`
	RecommendedMemory uint64            `json:"recommended_memory,omitempty"`
	MinVCPUs          uint              `json:"min_vcpus"`
	RecommendedVCPUs  uint              `json:"recommended_vcpus,omitempty"`
	MinDisk           uint64            `json:"min_disk"`
	RecommendedDisk   uint64            `json:"recommended_disk,omitempty"`
	DiskFormat        string            `json:"disk_format"`
	NetworkModel      string            `json:"network_model"`
	GraphicsType      string            `json:"graphics_type"`
	CloudInit         bool              `json:"cloud_init"`
	UEFIBoot          bool              `json:"uefi_boot"`
	SecureBoot        bool              `json:"secure_boot"`
	TPM               bool              `json:"tpm"`
	DefaultUser       string            `json:"default_user,omitempty"`
	Metadata          map[string]string `json:"metadata,omitempty"`
	CreatedAt         time.Time         `json:"created_at"`
	UpdatedAt         time.Time         `json:"updated_at"`
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
	Format   string `json:"format"`                      // qcow2, raw, vmdk
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

// MigrationResponse for VM migration initiation
type MigrationResponse struct {
	MigrationID string    `json:"migration_id"`
	Status      string    `json:"status"`
	SourceHost  string    `json:"source_host"`
	DestHost    string    `json:"dest_host"`
	StartedAt   time.Time `json:"started_at"`
	Message     string    `json:"message,omitempty"`
}

// MigrationStatusResponse for migration status queries
type MigrationStatusResponse struct {
	MigrationID   string    `json:"migration_id"`
	VMName        string    `json:"vm_name,omitempty"`
	Status        string    `json:"status"`
	Progress      int       `json:"progress"` // 0-100 percentage
	SourceHost    string    `json:"source_host,omitempty"`
	DestHost      string    `json:"dest_host,omitempty"`
	DataProcessed uint64    `json:"data_processed"` // bytes
	DataRemaining uint64    `json:"data_remaining"` // bytes
	MemProcessed  uint64    `json:"mem_processed"`  // bytes
	MemRemaining  uint64    `json:"mem_remaining"`  // bytes
	StartedAt     time.Time `json:"started_at"`
	CompletedAt   time.Time `json:"completed_at,omitempty"`
	ErrorMessage  string    `json:"error_message,omitempty"`
}

// PCIDeviceType represents the type of PCI device
type PCIDeviceType string

const (
	PCIDeviceTypeGPU     PCIDeviceType = "gpu"
	PCIDeviceTypeNetwork PCIDeviceType = "network"
	PCIDeviceTypeStorage PCIDeviceType = "storage"
	PCIDeviceTypeUSB     PCIDeviceType = "usb"
	PCIDeviceTypeOther   PCIDeviceType = "other"
)

// PCIDevice represents a PCI device available for passthrough
type PCIDevice struct {
	DeviceID     string            `json:"device_id"`
	VendorID     string            `json:"vendor_id"`
	ProductID    string            `json:"product_id"`
	VendorName   string            `json:"vendor_name"`
	ProductName  string            `json:"product_name"`
	DeviceType   PCIDeviceType     `json:"device_type"`
	PCIAddress   string            `json:"pci_address"` // e.g., "0000:01:00.0"
	IOMMUGroup   int               `json:"iommu_group"`
	Driver       string            `json:"driver"`
	IsAvailable  bool              `json:"is_available"`
	AssignedToVM string            `json:"assigned_to_vm,omitempty"`
	Capabilities map[string]string `json:"capabilities,omitempty"`
	LastSeen     time.Time         `json:"last_seen"`
}

// PCIPassthroughRequest represents a request to attach a PCI device to a VM
type PCIPassthroughRequest struct {
	DeviceID   string `json:"device_id" binding:"required"`
	PCIAddress string `json:"pci_address,omitempty"`
	Managed    bool   `json:"managed"` // Let libvirt manage driver binding
}

// PCIDetachRequest represents a request to detach a PCI device from a VM
type PCIDetachRequest struct {
	DeviceID   string `json:"device_id" binding:"required"`
	PCIAddress string `json:"pci_address,omitempty"`
}

// HotplugRequest represents a request for resource hot-plugging
type HotplugRequest struct {
	ResourceType string      `json:"resource_type" binding:"required,oneof=cpu memory disk network usb"`
	Action       string      `json:"action" binding:"required,oneof=add remove update"`
	Config       interface{} `json:"config"`
}

// HotplugCPUConfig for CPU hot-plugging
type HotplugCPUConfig struct {
	VCPUs uint `json:"vcpus" binding:"required"`
}

// HotplugMemoryConfig for memory hot-plugging
type HotplugMemoryConfig struct {
	Memory uint64 `json:"memory" binding:"required"` // in MB
}

// HotplugDiskConfig for disk hot-plugging
type HotplugDiskConfig struct {
	Source   string  `json:"source" binding:"required"`
	Target   string  `json:"target,omitempty"` // auto-generate if empty
	Bus      DiskBus `json:"bus,omitempty"`
	ReadOnly bool    `json:"readonly"`
}

// HotplugNetworkConfig for network hot-plugging
type HotplugNetworkConfig struct {
	Type   NetworkType `json:"type" binding:"required"`
	Source string      `json:"source" binding:"required"`
	Model  string      `json:"model,omitempty"`
	MAC    string      `json:"mac,omitempty"` // auto-generate if empty
}

// HotplugUSBConfig for USB device hot-plugging
type HotplugUSBConfig struct {
	VendorID  string `json:"vendor_id"`
	ProductID string `json:"product_id"`
	Bus       int    `json:"bus,omitempty"`
	Device    int    `json:"device,omitempty"`
}

// ISOImage represents an ISO image available for VM installation
type ISOImage struct {
	ImageID        string            `json:"image_id"`
	Filename       string            `json:"filename"`
	Path           string            `json:"path"`
	SizeBytes      int64             `json:"size_bytes"`
	MD5Hash        string            `json:"md5_hash,omitempty"`
	SHA256Hash     string            `json:"sha256_hash,omitempty"`
	OSType         string            `json:"os_type,omitempty"`
	OSVersion      string            `json:"os_version,omitempty"`
	Architecture   string            `json:"architecture,omitempty"`
	Description    string            `json:"description,omitempty"`
	IsPublic       bool              `json:"is_public"`
	UploadedBy     string            `json:"uploaded_by"`
	UploadStatus   string            `json:"upload_status"`
	UploadProgress int               `json:"upload_progress"`
	CreatedAt      time.Time         `json:"created_at"`
	Metadata       map[string]string `json:"metadata,omitempty"`
}

// ISOUploadSession represents an active ISO upload session
type ISOUploadSession struct {
	SessionID    string    `json:"session_id"`
	ImageID      string    `json:"image_id"`
	Filename     string    `json:"filename"`
	TotalSize    int64     `json:"total_size"`
	UploadedSize int64     `json:"uploaded_size"`
	ChunkSize    int64     `json:"chunk_size"`
	Status       string    `json:"status"` // active, paused, completed, expired
	ExpiresAt    time.Time `json:"expires_at"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}
