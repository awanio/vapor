package container

import "time"

// Container represents a container with unified fields
type Container struct {
	ID        string            `json:"id"`
	Name      string            `json:"name"`
	Image     string            `json:"image"`
	State     string            `json:"state"`
	Status    string            `json:"status"`
	CreatedAt time.Time         `json:"created_at"`
	Labels    map[string]string `json:"labels"`
	Runtime   string            `json:"runtime"` // "docker", "containerd", or "cri-o"
}

// ContainerDetail represents detailed container information
type ContainerDetail struct {
	Container
	ImageID      string                 `json:"image_id"`
	Command      []string               `json:"command"`
	Args         []string               `json:"args"`
	Env          []string               `json:"env"`
	Mounts       []Mount                `json:"mounts"`
	Ports        []Port                 `json:"ports"`
	Networks     []Network              `json:"networks"`
	Resources    Resources              `json:"resources"`
	RestartCount int32                  `json:"restart_count"`
	Pid          int                    `json:"pid"`
	StartedAt    *time.Time             `json:"started_at,omitempty"`
	FinishedAt   *time.Time             `json:"finished_at,omitempty"`
	ExitCode     *int32                 `json:"exit_code,omitempty"`
	User         string                 `json:"user"`
	WorkingDir   string                 `json:"working_dir"`
	Hostname     string                 `json:"hostname"`
	DomainName   string                 `json:"domain_name"`
	Annotations  map[string]string      `json:"annotations,omitempty"`
	Config       map[string]interface{} `json:"config,omitempty"`
}

// Mount represents a container mount
type Mount struct {
	Source      string `json:"source"`
	Destination string `json:"destination"`
	Mode        string `json:"mode"`
	Type        string `json:"type"`
	ReadOnly    bool   `json:"read_only"`
}

// Port represents a container port mapping
type Port struct {
	ContainerPort int32  `json:"container_port"`
	HostPort      int32  `json:"host_port"`
	Protocol      string `json:"protocol"`
	HostIP        string `json:"host_ip"`
}

// Network represents container network information
type Network struct {
	Name        string            `json:"name"`
	ID          string            `json:"id"`
	IPAddress   string            `json:"ip_address"`
	IPPrefixLen int               `json:"ip_prefix_len"`
	Gateway     string            `json:"gateway"`
	MacAddress  string            `json:"mac_address"`
	IPv6Address string            `json:"ipv6_address"`
	IPv6Gateway string            `json:"ipv6_gateway"`
	Aliases     []string          `json:"aliases,omitempty"`
	DriverOpts  map[string]string `json:"driver_opts,omitempty"`
}

// Resources represents container resource limits and usage
type Resources struct {
	CPUShares          int64   `json:"cpu_shares"`
	CPUQuota           int64   `json:"cpu_quota"`
	CPUPeriod          int64   `json:"cpu_period"`
	CPUsetCPUs         string  `json:"cpuset_cpus"`
	CPUsetMems         string  `json:"cpuset_mems"`
	MemoryLimit        int64   `json:"memory_limit"`
	MemoryReservation  int64   `json:"memory_reservation"`
	MemorySwap         int64   `json:"memory_swap"`
	MemoryUsage        int64   `json:"memory_usage"`
	MemoryMaxUsage     int64   `json:"memory_max_usage"`
	CPUUsagePercent    float64 `json:"cpu_usage_percent"`
	PidsLimit          int64   `json:"pids_limit"`
	PidsCurrent        int64   `json:"pids_current"`
	BlkioWeight        uint16  `json:"blkio_weight"`
	IOReadBytes        uint64  `json:"io_read_bytes"`
	IOWriteBytes       uint64  `json:"io_write_bytes"`
	NetworkRxBytes     uint64  `json:"network_rx_bytes"`
	NetworkTxBytes     uint64  `json:"network_tx_bytes"`
}

// Image represents a container image with unified fields
type Image struct {
	ID          string    `json:"id"`
	RepoTags    []string  `json:"repo_tags"`
	RepoDigests []string  `json:"repo_digests"`
	Size        int64     `json:"size"`
	CreatedAt   time.Time `json:"created_at"`
	Runtime     string    `json:"runtime"` // "docker", "containerd", or "cri-o"
}

// ImageDetail represents detailed image information
type ImageDetail struct {
	Image
	Parent       string                 `json:"parent"`
	Author       string                 `json:"author"`
	Architecture string                 `json:"architecture"`
	OS           string                 `json:"os"`
	Variant      string                 `json:"variant,omitempty"`
	Config       ImageConfig            `json:"config"`
	Layers       []Layer                `json:"layers"`
	Labels       map[string]string      `json:"labels"`
	Annotations  map[string]string      `json:"annotations,omitempty"`
	Manifest     map[string]interface{} `json:"manifest,omitempty"`
}

// ImageConfig represents image configuration
type ImageConfig struct {
	User         string            `json:"user"`
	ExposedPorts []string          `json:"exposed_ports"`
	Env          []string          `json:"env"`
	Cmd          []string          `json:"cmd"`
	Entrypoint   []string          `json:"entrypoint"`
	Volumes      []string          `json:"volumes"`
	WorkingDir   string            `json:"working_dir"`
	StopSignal   string            `json:"stop_signal"`
	Labels       map[string]string `json:"labels"`
}

// Layer represents an image layer
type Layer struct {
	ID        string    `json:"id"`
	Size      int64     `json:"size"`
	CreatedAt time.Time `json:"created_at"`
	CreatedBy string    `json:"created_by"`
	Comment   string    `json:"comment,omitempty"`
}

// RuntimeClient defines the interface for container runtime operations
type RuntimeClient interface {
	ListContainers() ([]Container, error)
	GetContainer(id string) (*ContainerDetail, error)
	ListImages() ([]Image, error)
	GetImage(id string) (*ImageDetail, error)
	GetContainerLogs(id string) (string, error)
	GetRuntimeName() string
	Close() error
}
