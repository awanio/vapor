package container

// Service interface defines the methods for container management
type Service interface {
	ListContainers() ([]Container, error)
	GetContainerDetails(containerID string) (*ContainerDetails, error)
	CreateContainer(req ContainerCreateRequest) (*Container, error)
	StartContainer(containerID string) error
	StopContainer(containerID string, timeout int) error
	RestartContainer(containerID string) error
	RemoveContainer(containerID string) error
	GetContainerLogs(containerID string, options ContainerLogsRequest) (string, error)
	ListImages() ([]ContainerImage, error)
	GetImageDetails(imageID string) (*ContainerImage, error)
	RemoveImage(imageID string) error
	PullImage(imageName string) error
}

// CommandExecutor defines the interface for executing system commands
type CommandExecutor interface {
	Execute(command string, args ...string) ([]byte, error)
}
