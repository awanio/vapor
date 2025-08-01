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

// Image represents a container image with unified fields
type Image struct {
	ID          string    `json:"id"`
	RepoTags    []string  `json:"repo_tags"`
	RepoDigests []string  `json:"repo_digests"`
	Size        int64     `json:"size"`
	CreatedAt   time.Time `json:"created_at"`
	Runtime     string    `json:"runtime"` // "docker", "containerd", or "cri-o"
}

// RuntimeClient defines the interface for container runtime operations
type RuntimeClient interface {
	ListContainers() ([]Container, error)
	ListImages() ([]Image, error)
	GetRuntimeName() string
	Close() error
}
