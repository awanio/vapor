package container

// Container represents a container
type Container struct {
	ID          string              `json:"id"`
	Name        string              `json:"name"`
	Image       string              `json:"image"`
	ImageID     string              `json:"image_id,omitempty"`
	Command     []string            `json:"command,omitempty"`
	CreatedAt   string              `json:"created_at"`
	State       string              `json:"state"`
	Status      string              `json:"status,omitempty"`
	PID         int                 `json:"pid,omitempty"`
	ExitCode    int                 `json:"exit_code,omitempty"`
	Labels      map[string]string   `json:"labels,omitempty"`
	Annotations map[string]string   `json:"annotations,omitempty"`
	Ports       []ContainerPort     `json:"ports,omitempty"`
	Mounts      []ContainerMount    `json:"mounts,omitempty"`
	Networks    []ContainerNetwork  `json:"networks,omitempty"`
	Runtime     string              `json:"runtime,omitempty"`
}

// ContainerImage represents a container image
type ContainerImage struct {
	ID           string            `json:"id"`
	RepoTags     []string          `json:"repo_tags"`
	RepoDigests  []string          `json:"repo_digests,omitempty"`
	Size         int64             `json:"size"`
	CreatedAt    string            `json:"created_at,omitempty"`
	Labels       map[string]string `json:"labels,omitempty"`
	Architecture string            `json:"architecture,omitempty"`
	OS           string            `json:"os,omitempty"`
}

// ContainerDetails represents detailed container information
type ContainerDetails struct {
	Container
	Env        []string            `json:"env,omitempty"`
	Hostname   string              `json:"hostname,omitempty"`
	User       string              `json:"user,omitempty"`
	WorkingDir string              `json:"working_dir,omitempty"`
	Resources  ContainerResources  `json:"resources,omitempty"`
}

// ContainerPort represents a port mapping
type ContainerPort struct {
	HostPort      int    `json:"host_port"`
	ContainerPort int    `json:"container_port"`
	Protocol      string `json:"protocol"`
	HostIP        string `json:"host_ip,omitempty"`
}

// ContainerMount represents a volume mount
type ContainerMount struct {
	Source      string `json:"source"`
	Destination string `json:"destination"`
	Type        string `json:"type,omitempty"`
	ReadOnly    bool   `json:"read_only"`
}

// ContainerNetwork represents container network information
type ContainerNetwork struct {
	Name       string `json:"name"`
	IPAddress  string `json:"ip_address"`
	Gateway    string `json:"gateway,omitempty"`
	MACAddress string `json:"mac_address,omitempty"`
}

// ContainerResources represents resource limits
type ContainerResources struct {
	CPUShares    int64 `json:"cpu_shares,omitempty"`
	CPUQuota     int64 `json:"cpu_quota,omitempty"`
	CPUPeriod    int64 `json:"cpu_period,omitempty"`
	MemoryLimit  int64 `json:"memory_limit,omitempty"`
	MemorySwap   int64 `json:"memory_swap,omitempty"`
	PidsLimit    int64 `json:"pids_limit,omitempty"`
}

// ContainerCreateRequest represents a request to create a container
type ContainerCreateRequest struct {
	Name        string                    `json:"name" binding:"required"`
	Image       string                    `json:"image" binding:"required"`
	Command     []string                  `json:"command,omitempty"`
	Env         []string                  `json:"env,omitempty"`
	Ports       []ContainerPort           `json:"ports,omitempty"`
	Mounts      []ContainerMount          `json:"mounts,omitempty"`
	Labels      map[string]string         `json:"labels,omitempty"`
	Hostname    string                    `json:"hostname,omitempty"`
	User        string                    `json:"user,omitempty"`
	WorkingDir  string                    `json:"working_dir,omitempty"`
	Privileged  bool                      `json:"privileged,omitempty"`
	NetworkMode string                    `json:"network_mode,omitempty"`
	Resources   ContainerResources        `json:"resources,omitempty"`
}

// ContainerStartRequest represents a request to start a container
type ContainerStartRequest struct {
	ContainerID string `json:"container_id" binding:"required"`
}

// ContainerStopRequest represents a request to stop a container
type ContainerStopRequest struct {
	ContainerID string `json:"container_id" binding:"required"`
	Timeout     int    `json:"timeout,omitempty"` // Timeout in seconds
}

// ContainerRestartRequest represents a request to restart a container
type ContainerRestartRequest struct {
	ContainerID string `json:"container_id" binding:"required"`
}

// ContainerRemoveRequest represents a request to remove a container
type ContainerRemoveRequest struct {
	ContainerID string `json:"container_id" binding:"required"`
}

// ContainerLogsRequest represents a request to get container logs
type ContainerLogsRequest struct {
	Follow     bool   `json:"follow,omitempty"`
	Tail       int    `json:"tail,omitempty"`
	Since      string `json:"since,omitempty"`
	Until      string `json:"until,omitempty"`
	Timestamps bool   `json:"timestamps,omitempty"`
}

// ImagePullRequest represents a request to pull an image
type ImagePullRequest struct {
	Name string `json:"name" binding:"required"`
}

// ImageRemoveRequest represents a request to remove an image
type ImageRemoveRequest struct {
	ImageID string `json:"image_id" binding:"required"`
}
