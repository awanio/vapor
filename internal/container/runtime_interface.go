package container

import (
	"context"
	"io"
)

// ContainerRuntimeExecutor is the interface for vendor-agnostic runtime client
type ContainerRuntimeExecutor interface {
	ListContainers(ctx context.Context) ([]ContainerInfo, error)
	GetContainerDetails(ctx context.Context, id string) (*ContainerInfo, error)
	CreateContainer(ctx context.Context, config ContainerConfig) (*ContainerInfo, error)
	StartContainer(ctx context.Context, id string) error
	StopContainer(ctx context.Context, id string) error
	RestartContainer(ctx context.Context, id string) error
	RemoveContainer(ctx context.Context, id string) error
	GetContainerLogs(ctx context.Context, id string) (io.Reader, error)
	ListImages(ctx context.Context) ([]ImageInfo, error)
	GetImageDetails(ctx context.Context, id string) (*ImageInfo, error)
	PullImage(ctx context.Context, name string) error
	RemoveImage(ctx context.Context, id string) error
}

// ContainerInfo represents standardized container information
type ContainerInfo struct {
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
	Env         []string            `json:"env,omitempty"`
	Hostname    string              `json:"hostname,omitempty"`
	User        string              `json:"user,omitempty"`
	WorkingDir  string              `json:"working_dir,omitempty"`
	Resources   ContainerResources  `json:"resources,omitempty"`
}

// ImageInfo represents standardized image information
type ImageInfo struct {
	ID           string            `json:"id"`
	RepoTags     []string          `json:"repo_tags"`
	RepoDigests  []string          `json:"repo_digests,omitempty"`
	Size         int64             `json:"size"`
	CreatedAt    string            `json:"created_at,omitempty"`
	Labels       map[string]string `json:"labels,omitempty"`
	Architecture string            `json:"architecture,omitempty"`
	OS           string            `json:"os,omitempty"`
}

// ContainerConfig represents configuration for creating a container
type ContainerConfig struct {
	Name        string                    `json:"name"`
	Image       string                    `json:"image"`
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
