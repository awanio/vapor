package container

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/awanio/vapor/internal/docker"
)

// DockerClientWrapper wraps a docker.Client to implement RuntimeClient interface
type DockerClientWrapper struct {
	client docker.Client
}

// WrapDockerClient wraps a docker.Client interface to implement RuntimeClient
func WrapDockerClient(dockerClient interface{}) (RuntimeClient, error) {
	client, ok := dockerClient.(docker.Client)
	if !ok {
		return nil, fmt.Errorf("provided client does not implement docker.Client interface")
	}

	return &DockerClientWrapper{
		client: client,
	}, nil
}

// GetRuntimeName returns the runtime name
func (w *DockerClientWrapper) GetRuntimeName() string {
	return "docker"
}

// ListContainers lists all containers
func (w *DockerClientWrapper) ListContainers() ([]Container, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	dockerContainers, err := w.client.ListContainers(ctx, docker.ContainerListOptions{
		All: true,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to list containers: %w", err)
	}

	containers := make([]Container, 0, len(dockerContainers))
	for _, dc := range dockerContainers {
		// Extract name from Names array (Docker returns names with leading slash)
		name := ""
		if len(dc.Names) > 0 {
			name = dc.Names[0]
			if strings.HasPrefix(name, "/") {
				name = name[1:]
			}
		}
		
		container := Container{
			ID:        dc.ID,
			Name:      name,
			Image:     dc.Image,
			State:     dc.State,
			Status:    dc.Status,
			CreatedAt: dc.Created,
			Labels:    dc.Labels,
			Runtime:   "docker",
		}
		containers = append(containers, container)
	}

	return containers, nil
}

// ListImages lists all images
func (w *DockerClientWrapper) ListImages() ([]Image, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	dockerImages, err := w.client.ListImages(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to list images: %w", err)
	}

	images := make([]Image, 0, len(dockerImages))
	for _, di := range dockerImages {
		image := Image{
			ID:          di.ID,
			RepoTags:    di.RepoTags,
			RepoDigests: di.RepoDigests,
			Size:        di.Size,
			CreatedAt:   di.Created,
			Runtime:     "docker",
		}
		images = append(images, image)
	}

	return images, nil
}

// GetContainer gets detailed information about a specific container
func (w *DockerClientWrapper) GetContainer(id string) (*ContainerDetail, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	containerJSON, err := w.client.ContainerDetail(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get container details: %w", err)
	}

	detail := &ContainerDetail{
		Container: Container{
			ID:        containerJSON.ID[:min(12, len(containerJSON.ID))],
			Name:      containerJSON.Name,
			Image:     containerJSON.Config.Image,
			State:     containerJSON.State.Status,
			Status:    containerJSON.State.Status,
			CreatedAt: parseDockerTime(containerJSON.Created),
			Labels:    containerJSON.Config.Labels,
			Runtime:   "docker",
		},
		ImageID:      containerJSON.Image,
		Command:      containerJSON.Config.Cmd,
		Args:         containerJSON.Args,
		Env:          containerJSON.Config.Env,
		RestartCount: int32(containerJSON.RestartCount),
		Pid:          containerJSON.State.Pid,
		User:         containerJSON.Config.User,
		WorkingDir:   containerJSON.Config.WorkingDir,
		Hostname:     containerJSON.Config.Hostname,
		DomainName:   containerJSON.Config.Domainname,
	}

	// Set start/finish times if available
	startedAt := parseDockerTime(containerJSON.State.StartedAt)
	if !startedAt.IsZero() {
		detail.StartedAt = &startedAt
	}
	finishedAt := parseDockerTime(containerJSON.State.FinishedAt)
	if !finishedAt.IsZero() {
		detail.FinishedAt = &finishedAt
	}

	// Include exit code for stopped/exited containers
	if containerJSON.State.Status == "exited" || containerJSON.State.Status == "stopped" || containerJSON.State.Status == "dead" {
		exitCode := int32(containerJSON.State.ExitCode)
		detail.ExitCode = &exitCode
	}

	// Convert mounts
	for _, mount := range containerJSON.Mounts {
		detail.Mounts = append(detail.Mounts, Mount{
			Source:      mount.Source,
			Destination: mount.Destination,
			Mode:        mount.Mode,
			Type:        string(mount.Type),
			ReadOnly:    !mount.RW,
		})
	}

	// Convert networks
	for name, network := range containerJSON.NetworkSettings.Networks {
		detail.Networks = append(detail.Networks, Network{
			Name:       name,
			IPAddress:  network.IPAddress,
			Gateway:    network.Gateway,
			MacAddress: network.MacAddress,
		})
	}

	// Convert ports
	for port, bindings := range containerJSON.NetworkSettings.Ports {
		for _, binding := range bindings {
			// Parse host port to int32
			hostPort := int32(0)
			if binding.HostPort != "" {
				if p, err := strconv.Atoi(binding.HostPort); err == nil {
					hostPort = int32(p)
				}
			}
			
			detail.Ports = append(detail.Ports, Port{
				ContainerPort: int32(port.Int()),
				HostPort:      hostPort,
				HostIP:        binding.HostIP,
				Protocol:      port.Proto(),
			})
		}
	}

	return detail, nil
}

// GetImage gets detailed information about a specific image
func (w *DockerClientWrapper) GetImage(id string) (*ImageDetail, error) {
	// Since the docker.Client interface doesn't have a GetImage method,
	// we'll list all images and find the one we need
	images, err := w.ListImages()
	if err != nil {
		return nil, err
	}

	for _, img := range images {
		if img.ID == id {
			return &ImageDetail{
				Image: img,
			}, nil
		}
	}

	return nil, fmt.Errorf("image not found: %s", id)
}

// GetContainerLogs retrieves logs from a container
func (w *DockerClientWrapper) GetContainerLogs(id string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	logs, err := w.client.ContainerLogs(ctx, id)
	if err != nil {
		return "", fmt.Errorf("failed to get container logs: %w", err)
	}

	return logs, nil
}

// ImportImage imports a container image from a tar file
func (w *DockerClientWrapper) ImportImage(filepath string) (*ImageImportResult, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	// Import the image using the Docker client
	result, err := w.client.ImportImage(ctx, docker.ImageImportRequest{
		Source: filepath,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to import image: %w", err)
	}

	// Convert docker.ImageImportResult to our ImageImportResult
	importResult := &ImageImportResult{
		ImageID:    result.ImageID,
		RepoTags:   result.RepoTags,
		ImportedAt: time.Now(),
		Runtime:    "docker",
		Status:     "imported",
		Message:    "Image imported successfully",
	}

	return importResult, nil
}

// Close closes the client connection
func (w *DockerClientWrapper) Close() error {
	return w.client.Close()
}

// Helper function to get minimum of two integers
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
