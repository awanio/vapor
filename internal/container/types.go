package container

// ContainerCreateRequest represents a request to create a new container for CRI runtimes
// The JSON fields intentionally mirror the Docker create request for UI reuse.
type ContainerCreateRequest struct {
	Name          string                   `json:"name"`
	Image         string                   `json:"image"`
	Cmd           []string                 `json:"cmd,omitempty"`
	Entrypoint    []string                 `json:"entrypoint,omitempty"`
	Env           []string                 `json:"env,omitempty"`
	ExposedPorts  map[string]struct{}      `json:"exposedPorts,omitempty"`
	PortBindings  map[string][]PortBinding `json:"portBindings,omitempty"`
	Labels        map[string]string        `json:"labels,omitempty"`
	WorkingDir    string                   `json:"workingDir,omitempty"`
	Volumes       []VolumeMount            `json:"volumes,omitempty"`
	NetworkMode   string                   `json:"networkMode,omitempty"`
	RestartPolicy RestartPolicy            `json:"restartPolicy,omitempty"`
	Resources     *ContainerResources      `json:"resources,omitempty"`
	Namespace     string                   `json:"namespace,omitempty"`
	CgroupParent  string                   `json:"cgroupParent,omitempty"`
}

// ContainerResources represents container resource limits
type ContainerResources struct {
	CpuCores float64 `json:"cpuCores,omitempty"`
	MemoryMB int64   `json:"memoryMB,omitempty"`
}

// PortBinding represents a port binding configuration
// HostPort can be empty to let the runtime assign a port.
type PortBinding struct {
	HostIP   string `json:"hostIp,omitempty"`
	HostPort string `json:"hostPort"`
}

// VolumeMount represents a volume mount configuration
// Type can be bind, volume, or tmpfs.
type VolumeMount struct {
	Source      string       `json:"source"`
	Target      string       `json:"target"`
	Type        string       `json:"type,omitempty"`
	ReadOnly    bool         `json:"readOnly,omitempty"`
	BindOptions *BindOptions `json:"bindOptions,omitempty"`
}

// BindOptions represents bind mount options
// Propagation can be private, rprivate, shared, rshared, slave, rslave.
type BindOptions struct {
	Propagation string `json:"propagation,omitempty"`
}

// RestartPolicy represents container restart policy
// Name can be no, always, on-failure, unless-stopped.
type RestartPolicy struct {
	Name              string `json:"name"`
	MaximumRetryCount int    `json:"maximumRetryCount,omitempty"`
}

// ContainerCreateResponse represents response from container creation
type ContainerCreateResponse struct {
	ContainerID  string `json:"containerId"`
	PodSandboxID string `json:"podSandboxId,omitempty"`
	Message      string `json:"message"`
	Success      bool   `json:"success"`
}
