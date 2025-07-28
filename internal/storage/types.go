package storage

// VolumeGroup represents an LVM volume group
type VolumeGroup struct {
	Name       string          `json:"name"`
	UUID       string          `json:"uuid"`
	Size       uint64          `json:"size"`
	Free       uint64          `json:"free"`
	PVCount    int             `json:"pv_count"`
	LVCount    int             `json:"lv_count"`
	VGTags     string          `json:"vg_tags"`
	Volumes    []LogicalVolume `json:"logical_volumes,omitempty"`
}

// LogicalVolume represents an LVM logical volume
type LogicalVolume struct {
	Name       string `json:"name"`
	VGName     string `json:"vg_name"`
	UUID       string `json:"uuid"`
	Size       uint64 `json:"size"`
	LVPath     string `json:"lv_path"`
	LVTags     string `json:"lv_tags"`
	Active     bool   `json:"active"`
	DevicePath string `json:"device_path"`
}

// PhysicalVolume represents an LVM physical volume
type PhysicalVolume struct {
	Name     string `json:"name"`
	VGName   string `json:"vg_name"`
	UUID     string `json:"uuid"`
	Size     uint64 `json:"size"`
	Free     uint64 `json:"free"`
	DevPath  string `json:"dev_path"`
}

// ISCSITarget represents an iSCSI target
type ISCSITarget struct {
	Name      string `json:"name"`
	Portal    string `json:"portal"`
	IQN       string `json:"iqn"`
	Connected bool   `json:"connected"`
}

// ISCSISession represents an active iSCSI session
type ISCSISession struct {
	Target       string `json:"target"`
	Portal       string `json:"portal"`
	SessionID    string `json:"session_id"`
	PersistentID string `json:"persistent_id"`
	State        string `json:"state"`
}

// MultipathDevice represents a multipath device
type MultipathDevice struct {
	Name       string   `json:"name"`
	WWID       string   `json:"wwid"`
	Size       uint64   `json:"size"`
	Vendor     string   `json:"vendor"`
	Product    string   `json:"product"`
	Paths      []Path   `json:"paths"`
	PathCount  int      `json:"path_count"`
	ActivePath int      `json:"active_path"`
}

// Path represents a single path in a multipath device
type Path struct {
	Device   string `json:"device"`
	State    string `json:"state"`
	Priority int    `json:"priority"`
	WWID     string `json:"wwid"`
}

// BTRFSVolume represents a BTRFS volume
type BTRFSVolume struct {
	UUID       string          `json:"uuid"`
	Label      string          `json:"label"`
	TotalSize  uint64          `json:"total_size"`
	Used       uint64          `json:"used"`
	DeviceCount int            `json:"device_count"`
	Devices    []string        `json:"devices"`
	Subvolumes []BTRFSSubvolume `json:"subvolumes,omitempty"`
}

// BTRFSSubvolume represents a BTRFS subvolume
type BTRFSSubvolume struct {
	ID         int    `json:"id"`
	Path       string `json:"path"`
	ParentID   int    `json:"parent_id"`
	Generation int    `json:"generation"`
	Snapshots  []BTRFSSnapshot `json:"snapshots,omitempty"`
}

// BTRFSSnapshot represents a BTRFS snapshot
type BTRFSSnapshot struct {
	ID         int    `json:"id"`
	Path       string `json:"path"`
	SourceID   int    `json:"source_id"`
	Generation int    `json:"generation"`
	Created    string `json:"created"`
}

// LVMCreateVGRequest represents a request to create a volume group
type LVMCreateVGRequest struct {
	Name    string   `json:"name" binding:"required"`
	Devices []string `json:"devices" binding:"required,min=1"`
}

// LVMCreateLVRequest represents a request to create a logical volume
type LVMCreateLVRequest struct {
	Name   string `json:"name" binding:"required"`
	VGName string `json:"vg_name" binding:"required"`
	Size   string `json:"size" binding:"required"` // e.g., "10G", "500M", "100%FREE"
}

// LVMResizeLVRequest represents a request to resize a logical volume
type LVMResizeLVRequest struct {
	Name   string `json:"name" binding:"required"`
	VGName string `json:"vg_name" binding:"required"`
	Size   string `json:"size" binding:"required"` // e.g., "+10G", "-500M", "20G"
}

// ISCSIDiscoverRequest represents a request to discover iSCSI targets
type ISCSIDiscoverRequest struct {
	Portal string `json:"portal" binding:"required"` // IP:port
}

// ISCSILoginRequest represents a request to login to an iSCSI target
type ISCSILoginRequest struct {
	Target   string `json:"target" binding:"required"`
	Portal   string `json:"portal" binding:"required"`
	Username string `json:"username"`
	Password string `json:"password"`
}

// BTRFSCreateRequest represents a request to create a BTRFS filesystem
type BTRFSCreateRequest struct {
	Devices []string `json:"devices" binding:"required,min=1"`
	Label   string   `json:"label"`
	Options []string `json:"options"`
}

// BTRFSSnapshotRequest represents a request to create a BTRFS snapshot
type BTRFSSnapshotRequest struct {
	Source   string `json:"source" binding:"required"`
	Snapshot string `json:"snapshot" binding:"required"`
	ReadOnly bool   `json:"readonly"`
}

// RAIDDevice represents a RAID array
type RAIDDevice struct {
	Name        string   `json:"name"`
	Path        string   `json:"path"`
	Level       string   `json:"level"`
	State       string   `json:"state"`
	Size        uint64   `json:"size"`
	Devices     []string `json:"devices"`
	ActiveDisks int      `json:"active_disks"`
	TotalDisks  int      `json:"total_disks"`
	ChunkSize   string   `json:"chunk_size"`
	UUID        string   `json:"uuid"`
}

// CreateRAIDRequest represents a request to create a RAID array
type CreateRAIDRequest struct {
	Name      string   `json:"name" binding:"required"`
	Level     string   `json:"level" binding:"required,oneof=0 1 5 6 10"`
	Disks     []string `json:"disks" binding:"required,min=2"`
	ChunkSize string   `json:"chunk_size"`
}

// DestroyRAIDRequest represents a request to destroy a RAID array
type DestroyRAIDRequest struct {
	Device string `json:"device" binding:"required"`
}

// RAIDDisk represents a disk that can be used for RAID
type RAIDDisk struct {
	Path      string `json:"path"`
	Size      uint64 `json:"size"`
	Partition bool   `json:"partition"`
	Device    string `json:"device"`
}

// Container represents a container instance
type Container struct {
	ID           string            `json:"id"`
	Name         string            `json:"name"`
	Image        string            `json:"image"`
	ImageID      string            `json:"image_id"`
	Command      []string          `json:"command"`
	CreatedAt    string            `json:"created_at"`
	State        string            `json:"state"` // running, exited, paused, created, dead
	Status       string            `json:"status"` // more detailed status string
	PID          int               `json:"pid"`
	ExitCode     int               `json:"exit_code"`
	Ports        []ContainerPort   `json:"ports"`
	Labels       map[string]string `json:"labels"`
	Annotations  map[string]string `json:"annotations"`
	Mounts       []ContainerMount  `json:"mounts"`
	Runtime      string            `json:"runtime"` // containerd, cri-o, etc.
}

// ContainerPort represents a port mapping for a container
type ContainerPort struct {
	ContainerPort int    `json:"container_port"`
	HostPort      int    `json:"host_port"`
	Protocol      string `json:"protocol"` // tcp, udp
	HostIP        string `json:"host_ip"`
}

// ContainerMount represents a mount point in a container
type ContainerMount struct {
	Source      string `json:"source"`
	Destination string `json:"destination"`
	Type        string `json:"type"` // bind, volume, tmpfs
	ReadOnly    bool   `json:"readonly"`
}

// ContainerImage represents a container image
type ContainerImage struct {
	ID          string            `json:"id"`
	RepoTags    []string          `json:"repo_tags"`
	RepoDigests []string          `json:"repo_digests"`
	Size        int64             `json:"size"`
	CreatedAt   string            `json:"created_at"`
	Labels      map[string]string `json:"labels"`
	Architecture string           `json:"architecture"`
	OS          string            `json:"os"`
}

// ContainerDetails represents detailed information about a container
type ContainerDetails struct {
	Container
	Env          []string          `json:"env"`
	Hostname     string            `json:"hostname"`
	User         string            `json:"user"`
	WorkingDir   string            `json:"working_dir"`
	Networks     []ContainerNetwork `json:"networks"`
	ResourceLimits ContainerResources `json:"resource_limits"`
}

// ContainerNetwork represents network configuration for a container
type ContainerNetwork struct {
	Name       string   `json:"name"`
	ID         string   `json:"id"`
	IPAddress  string   `json:"ip_address"`
	MACAddress string   `json:"mac_address"`
	Gateway    string   `json:"gateway"`
	DNSServers []string `json:"dns_servers"`
}

// ContainerResources represents resource limits for a container
type ContainerResources struct {
	CPUShares   int64  `json:"cpu_shares"`
	CPUQuota    int64  `json:"cpu_quota"`
	CPUPeriod   int64  `json:"cpu_period"`
	MemoryLimit int64  `json:"memory_limit"`
	PidsLimit   int64  `json:"pids_limit"`
}

// ContainerCreateRequest represents a request to create a container
type ContainerCreateRequest struct {
	Name        string            `json:"name" binding:"required"`
	Image       string            `json:"image" binding:"required"`
	Command     []string          `json:"command"`
	Env         []string          `json:"env"`
	Ports       []ContainerPort   `json:"ports"`
	Mounts      []ContainerMount  `json:"mounts"`
	Labels      map[string]string `json:"labels"`
	Annotations map[string]string `json:"annotations"`
	Hostname    string            `json:"hostname"`
	User        string            `json:"user"`
	WorkingDir  string            `json:"working_dir"`
	Privileged  bool              `json:"privileged"`
	NetworkMode string            `json:"network_mode"` // bridge, host, none
	Resources   ContainerResources `json:"resources"`
}

// ContainerActionRequest represents a request to perform an action on a container
type ContainerActionRequest struct {
	ContainerID string `json:"container_id" binding:"required"`
	Timeout     int    `json:"timeout"` // timeout in seconds for stop action
}

// ContainerLogsRequest represents a request to fetch container logs
type ContainerLogsRequest struct {
	ContainerID string `json:"container_id" binding:"required"`
	Follow      bool   `json:"follow"`
	Tail        int    `json:"tail"`
	Since       string `json:"since"` // RFC3339 timestamp
	Until       string `json:"until"` // RFC3339 timestamp
	Timestamps  bool   `json:"timestamps"`
}
