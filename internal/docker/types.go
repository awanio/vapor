package docker

import "time"

// Container represents a Docker container
type Container struct {
	ID              string            `json:"id"`
	Names           []string          `json:"names"`
	Image           string            `json:"image"`
	ImageID         string            `json:"imageId"`
	Command         string            `json:"command"`
	Created         time.Time         `json:"created"`
	State           string            `json:"state"`
	Status          string            `json:"status"`
	Ports           []Port            `json:"ports"`
	Labels          map[string]string `json:"labels"`
	SizeRw          int64             `json:"sizeRw,omitempty"`
	SizeRootFs      int64             `json:"sizeRootFs,omitempty"`
	HostConfig      HostConfig        `json:"hostConfig"`
	NetworkSettings NetworkSettings   `json:"networkSettings"`
	Mounts          []Mount           `json:"mounts"`
}

// Port represents a container port mapping
type Port struct {
	IP          string `json:"ip,omitempty"`
	PrivatePort int    `json:"privatePort"`
	PublicPort  int    `json:"publicPort,omitempty"`
	Type        string `json:"type"`
}

// HostConfig represents container host configuration
type HostConfig struct {
	NetworkMode string `json:"networkMode"`
}

// NetworkSettings represents container network settings
type NetworkSettings struct {
	Networks map[string]NetworkInfo `json:"networks"`
}

// NetworkInfo represents network information for a container
type NetworkInfo struct {
	NetworkID   string `json:"networkId"`
	EndpointID  string `json:"endpointId"`
	Gateway     string `json:"gateway"`
	IPAddress   string `json:"ipAddress"`
	IPPrefixLen int    `json:"ipPrefixLen"`
	IPv6Gateway string `json:"ipv6Gateway"`
	MacAddress  string `json:"macAddress"`
}

// Mount represents a container mount
type Mount struct {
	Type        string `json:"type"`
	Source      string `json:"source"`
	Destination string `json:"destination"`
	Mode        string `json:"mode"`
	RW          bool   `json:"rw"`
	Propagation string `json:"propagation"`
}

// Image represents a Docker image
type Image struct {
	ID          string            `json:"id"`
	ParentID    string            `json:"parentId"`
	RepoTags    []string          `json:"repoTags"`
	RepoDigests []string          `json:"repoDigests"`
	Created     time.Time         `json:"created"`
	Size        int64             `json:"size"`
	VirtualSize int64             `json:"virtualSize"`
	SharedSize  int64             `json:"sharedSize"`
	Labels      map[string]string `json:"labels"`
	Containers  int64             `json:"containers"`
}

// Network represents a Docker network
type Network struct {
	ID         string                 `json:"id"`
	Name       string                 `json:"name"`
	Driver     string                 `json:"driver"`
	Created    time.Time              `json:"created"`
	Scope      string                 `json:"scope"`
	EnableIPv6 bool                   `json:"enableIPv6"`
	IPAM       IPAM                   `json:"ipam"`
	Internal   bool                   `json:"internal"`
	Attachable bool                   `json:"attachable"`
	Ingress    bool                   `json:"ingress"`
	ConfigOnly bool                   `json:"configOnly"`
	Options    map[string]string      `json:"options"`
	Labels     map[string]string      `json:"labels"`
	Containers map[string]NetworkInfo `json:"containers,omitempty"`
}

// IPAM represents IP Address Management configuration
type IPAM struct {
	Driver  string       `json:"driver"`
	Options map[string]string `json:"options,omitempty"`
	Config  []IPAMConfig `json:"config"`
}

// IPAMConfig represents IPAM configuration
type IPAMConfig struct {
	Subnet     string            `json:"subnet,omitempty"`
	IPRange    string            `json:"ipRange,omitempty"`
	Gateway    string            `json:"gateway,omitempty"`
	AuxAddress map[string]string `json:"auxAddress,omitempty"`
}

// Volume represents a Docker volume
type Volume struct {
	Name       string            `json:"name"`
	Driver     string            `json:"driver"`
	Mountpoint string            `json:"mountpoint"`
	CreatedAt  time.Time         `json:"createdAt"`
	Labels     map[string]string `json:"labels"`
	Scope      string            `json:"scope"`
	Options    map[string]string `json:"options"`
	UsageData  *VolumeUsageData  `json:"usageData,omitempty"`
}

// VolumeUsageData represents volume usage information
type VolumeUsageData struct {
	Size      int64 `json:"size"`
	RefCount  int64 `json:"refCount"`
}

// ContainerListOptions represents options for listing containers
type ContainerListOptions struct {
	All     bool   `json:"all"`
	Running bool   `json:"running"`
	Size    bool   `json:"size"`
	Limit   int    `json:"limit"`
	Filters string `json:"filters"`
}

// ContainerActionResponse represents response for container actions
type ContainerActionResponse struct {
	ContainerID string `json:"containerId"`
	Action      string `json:"action"`
	Message     string `json:"message"`
	Success     bool   `json:"success"`
}

// ContainerLogsResponse represents container logs response
type ContainerLogsResponse struct {
	ContainerID string `json:"containerId"`
	Logs        string `json:"logs"`
}

// ImageActionResponse represents response for image actions
type ImageActionResponse struct {
	ImageID string `json:"imageId"`
	Action  string `json:"action"`
	Message string `json:"message"`
	Success bool   `json:"success"`
}

// VolumeActionResponse represents response for volume actions
type VolumeActionResponse struct {
	VolumeID string `json:"volumeId"`
	Action   string `json:"action"`
	Message  string `json:"message"`
	Success  bool   `json:"success"`
}

// NetworkActionResponse represents response for network actions
type NetworkActionResponse struct {
	NetworkID string `json:"networkId"`
	Action    string `json:"action"`
	Message   string `json:"message"`
	Success   bool   `json:"success"`
}

// ContainerCreateRequest represents a request to create a new container
type ContainerCreateRequest struct {
	Name        string            `json:"name,omitempty"`
	Image       string            `json:"image"`
	Cmd         []string          `json:"cmd,omitempty"`
	Env         []string          `json:"env,omitempty"`
	ExposedPorts map[string]struct{} `json:"exposedPorts,omitempty"`
	PortBindings map[string][]PortBinding `json:"portBindings,omitempty"`
	Labels      map[string]string `json:"labels,omitempty"`
	WorkingDir  string            `json:"workingDir,omitempty"`
	Volumes     []VolumeMount     `json:"volumes,omitempty"`
	NetworkMode string            `json:"networkMode,omitempty"`
	RestartPolicy RestartPolicy   `json:"restartPolicy,omitempty"`
}

// PortBinding represents a port binding configuration
type PortBinding struct {
	HostIP   string `json:"hostIp,omitempty"`
	HostPort string `json:"hostPort"`
}

// VolumeMount represents a volume mount configuration
type VolumeMount struct {
	Source      string `json:"source"`
	Target      string `json:"target"`
	Type        string `json:"type,omitempty"` // bind, volume, tmpfs
	ReadOnly    bool   `json:"readOnly,omitempty"`
	BindOptions *BindOptions `json:"bindOptions,omitempty"`
}

// BindOptions represents bind mount options
type BindOptions struct {
	Propagation string `json:"propagation,omitempty"`
}

// RestartPolicy represents container restart policy
type RestartPolicy struct {
	Name              string `json:"name"` // no, always, on-failure, unless-stopped
	MaximumRetryCount int    `json:"maximumRetryCount,omitempty"`
}

// ContainerCreateResponse represents response from container creation
type ContainerCreateResponse struct {
	ContainerID string   `json:"containerId"`
	Warnings    []string `json:"warnings,omitempty"`
	Message     string   `json:"message"`
	Success     bool     `json:"success"`
}

// ImagePullRequest represents a request to pull an image
type ImagePullRequest struct {
	ImageName string `json:"imageName"`
	Tag       string `json:"tag,omitempty"`
}

// ImagePullResponse represents response from image pull operation
type ImagePullResponse struct {
	ImageName string `json:"imageName"`
	Message   string `json:"message"`
	Success   bool   `json:"success"`
}

// ImageImportRequest represents a request to import an image
type ImageImportRequest struct {
	Source      string `json:"source"`
	Destination string `json:"destination,omitempty"`
	Tag         string `json:"tag,omitempty"`
}

// ImageImportResult represents the result of importing an image
type ImageImportResult struct {
	ImageID    string    `json:"image_id"`
	RepoTags   []string  `json:"repo_tags"`
	Size       int64     `json:"size"`
	ImportedAt time.Time `json:"imported_at"`
	Runtime    string    `json:"runtime"`
	Status     string    `json:"status"`
	Message    string    `json:"message,omitempty"`
}
