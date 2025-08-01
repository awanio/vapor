package container

import (
	"context"
	"fmt"
	"time"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/image"
	"github.com/docker/docker/client"
)

// DockerClient implements RuntimeClient for Docker
type DockerClient struct {
	client *client.Client
}

// NewDockerClient creates a new Docker client
func NewDockerClient() (*DockerClient, error) {
	// Create a new Docker client with default options
	// This will use DOCKER_HOST env var or default to /var/run/docker.sock
	cli, err := client.NewClientWithOpts(
		client.FromEnv,
		client.WithAPIVersionNegotiation(),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create Docker client: %w", err)
	}

	// Test connection by pinging the daemon
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	
	_, err = cli.Ping(ctx)
	if err != nil {
		cli.Close()
		return nil, fmt.Errorf("failed to ping Docker daemon: %w", err)
	}

	return &DockerClient{
		client: cli,
	}, nil
}

// ListContainers lists all containers
func (d *DockerClient) ListContainers() ([]Container, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// List all containers (including stopped ones)
	options := container.ListOptions{
		All: true,
	}
	
	dockerContainers, err := d.client.ContainerList(ctx, options)
	if err != nil {
		return nil, fmt.Errorf("failed to list containers: %w", err)
	}

	containers := make([]Container, 0, len(dockerContainers))
	for _, dc := range dockerContainers {
		// Docker returns names with leading slash, remove it
		name := ""
		if len(dc.Names) > 0 {
			name = dc.Names[0]
			if len(name) > 0 && name[0] == '/' {
				name = name[1:]
			}
		}

		container := Container{
			ID:        dc.ID[:12], // Docker typically shows 12 chars
			Name:      name,
			Image:     dc.Image,
			State:     dc.State,
			Status:    dc.Status,
			CreatedAt: time.Unix(dc.Created, 0),
			Labels:    dc.Labels,
			Runtime:   "docker",
		}
		containers = append(containers, container)
	}

	return containers, nil
}

// ListImages lists all images
func (d *DockerClient) ListImages() ([]Image, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	options := image.ListOptions{
		All: true,
	}
	
	dockerImages, err := d.client.ImageList(ctx, options)
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
			CreatedAt:   time.Unix(di.Created, 0),
			Runtime:     "docker",
		}
		
		// Handle case where ID has sha256: prefix
		if len(image.ID) > 7 && image.ID[:7] == "sha256:" {
			image.ID = image.ID[7:19] // Take 12 chars after sha256:
		} else if len(image.ID) > 12 {
			image.ID = image.ID[:12]
		}
		
		images = append(images, image)
	}

	return images, nil
}

// GetRuntimeName returns the runtime name
func (d *DockerClient) GetRuntimeName() string {
	return "docker"
}

// Close closes the connection
func (d *DockerClient) Close() error {
	if d.client != nil {
		return d.client.Close()
	}
	return nil
}
