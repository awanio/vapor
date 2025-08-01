package container

import (
	"context"
	"fmt"
	"io"
	"log"
	"time"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/image"
	"github.com/docker/docker/client"
)

// DockerExecutor implements the ContainerRuntimeExecutor using Docker
type DockerExecutor struct {
	dockerClient *client.Client
}

// NewDockerExecutor creates a new Docker executor
func NewDockerExecutor() (*DockerExecutor, error) {
	dockerClient, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return nil, fmt.Errorf("failed to create Docker client: %w", err)
	}
	
	// Test the connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	_, err = dockerClient.Ping(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Docker daemon: %w", err)
	}
	
	log.Println("Successfully connected to Docker daemon")
	
	return &DockerExecutor{dockerClient: dockerClient}, nil
}

func (e *DockerExecutor) ListContainers(ctx context.Context) ([]ContainerInfo, error) {
	containers, err := e.dockerClient.ContainerList(ctx, container.ListOptions{All: true})
	if err != nil {
		return nil, fmt.Errorf("failed to list Docker containers: %w", err)
	}

	var containerInfos []ContainerInfo
	for _, c := range containers {
		containerInfo := ContainerInfo{
			ID:          c.ID,
			Name:        c.Names[0],
			Image:       c.Image,
			ImageID:     c.ImageID,
			CreatedAt:   time.Unix(c.Created, 0).Format(time.RFC3339),
			State:       c.State,
			Status:      c.Status,
			Labels:      c.Labels,
			Runtime:     "docker",
		}
		containerInfos = append(containerInfos, containerInfo)
	}

	return containerInfos, nil
}

func (e *DockerExecutor) GetContainerDetails(ctx context.Context, id string) (*ContainerInfo, error) {
	container, err := e.dockerClient.ContainerInspect(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to inspect Docker container: %w", err)
	}

	containerInfo := &ContainerInfo{
		ID:          container.ID,
		Name:        container.Name,
		Image:       container.Image,
		CreatedAt:   container.Created,
		State:       container.State.Status,
		Labels:      container.Config.Labels,
		Runtime:     "docker",
	}

	return containerInfo, nil
}

func (e *DockerExecutor) CreateContainer(ctx context.Context, config ContainerConfig) (*ContainerInfo, error) {
	// Simplified implementation, assumes image exists
	containerConfig := &container.Config{
		Image:    config.Image,
		Cmd:      config.Command,
		Env:      config.Env,
		Hostname: config.Hostname,
		User:     config.User,
		Labels:   config.Labels,
	}
	
	hostConfig := &container.HostConfig{
		Privileged: config.Privileged,
	}
	
	containerResp, err := e.dockerClient.ContainerCreate(ctx, containerConfig, hostConfig, nil, nil, config.Name)
	if err != nil {
		return nil, fmt.Errorf("failed to create Docker container: %w", err)
	}

	containerInfo, err := e.GetContainerDetails(ctx, containerResp.ID)
	if err != nil {
		return nil, err
	}

	return containerInfo, nil
}

func (e *DockerExecutor) StartContainer(ctx context.Context, id string) error {
	if err := e.dockerClient.ContainerStart(ctx, id, container.StartOptions{}); err != nil {
		return fmt.Errorf("failed to start Docker container: %w", err)
	}
	return nil
}

func (e *DockerExecutor) StopContainer(ctx context.Context, id string) error {
	stopOptions := container.StopOptions{}
	if err := e.dockerClient.ContainerStop(ctx, id, stopOptions); err != nil {
		return fmt.Errorf("failed to stop Docker container: %w", err)
	}
	return nil
}

func (e *DockerExecutor) RestartContainer(ctx context.Context, id string) error {
	stopOptions := container.StopOptions{}
	if err := e.dockerClient.ContainerRestart(ctx, id, stopOptions); err != nil {
		return fmt.Errorf("failed to restart Docker container: %w", err)
	}
	return nil
}

func (e *DockerExecutor) RemoveContainer(ctx context.Context, id string) error {
	removeOptions := container.RemoveOptions{Force: true}
	if err := e.dockerClient.ContainerRemove(ctx, id, removeOptions); err != nil {
		return fmt.Errorf("failed to remove Docker container: %w", err)
	}
	return nil
}

func (e *DockerExecutor) GetContainerLogs(ctx context.Context, id string) (io.Reader, error) {
	logOptions := container.LogsOptions{ShowStdout: true, ShowStderr: true}
	logs, err := e.dockerClient.ContainerLogs(ctx, id, logOptions)
	if err != nil {
		return nil, fmt.Errorf("failed to get Docker container logs: %w", err)
	}
	return logs, nil
}

func (e *DockerExecutor) ListImages(ctx context.Context) ([]ImageInfo, error) {
	images, err := e.dockerClient.ImageList(ctx, image.ListOptions{All: true})
	if err != nil {
		return nil, fmt.Errorf("failed to list Docker images: %w", err)
	}

	var imageInfos []ImageInfo
	for _, img := range images {
		imageInfo := ImageInfo{
			ID:           img.ID,
			RepoTags:     img.RepoTags,
			RepoDigests:  img.RepoDigests,
			Size:         img.Size,
		}
		imageInfos = append(imageInfos, imageInfo)
	}

	return imageInfos, nil
}

func (e *DockerExecutor) GetImageDetails(ctx context.Context, id string) (*ImageInfo, error) {
	imageInspect, _, err := e.dockerClient.ImageInspectWithRaw(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to inspect Docker image: %w", err)
	}

	imageInfo := &ImageInfo{
		ID:           imageInspect.ID,
		RepoTags:     imageInspect.RepoTags,
		RepoDigests:  imageInspect.RepoDigests,
		Size:         imageInspect.Size,
	}

	return imageInfo, nil
}

func (e *DockerExecutor) PullImage(ctx context.Context, name string) error {
	pullResponse, err := e.dockerClient.ImagePull(ctx, name, image.PullOptions{})
	if err != nil {
		return fmt.Errorf("failed to pull Docker image: %w", err)
	}
	defer pullResponse.Close()
	io.Copy(io.Discard, pullResponse)
	return nil
}

func (e *DockerExecutor) RemoveImage(ctx context.Context, id string) error {
	removeOptions := image.RemoveOptions{Force: true}
	if _, err := e.dockerClient.ImageRemove(ctx, id, removeOptions); err != nil {
		return fmt.Errorf("failed to remove Docker image: %w", err)
	}
	return nil
}
