package container

import (
	"context"
	"fmt"
	"strings"
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

// GetContainer gets detailed information about a specific container
func (d *DockerClient) GetContainer(id string) (*ContainerDetail, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Get container inspect data
	containerJSON, err := d.client.ContainerInspect(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to inspect container: %w", err)
	}

	// Get container stats for resource usage (only for running containers)
	// Stats are not available for stopped/exited containers
if containerJSON.State.Running {
		stats, err := d.client.ContainerStatsOneShot(ctx, id)
		if err != nil {
			return nil, fmt.Errorf("failed to get container stats: %w", err)
		}
		defer stats.Body.Close()
		// Process stats here if needed
	}

	// Build detailed container info
	detail := &ContainerDetail{
		Container: Container{
			ID:     containerJSON.ID[:12],
			Name:   strings.TrimPrefix(containerJSON.Name, "/"),
			Image:  containerJSON.Config.Image,
			State:  containerJSON.State.Status,
			Status: containerJSON.State.Status,
			// Parse the created time string
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
	// Always include exit code for stopped/exited containers
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

	// Convert port bindings
	for port, bindings := range containerJSON.HostConfig.PortBindings {
		for _, binding := range bindings {
			containerPort := int32(port.Int())
			hostPort := int32(0)
			if binding.HostPort != "" {
				fmt.Sscanf(binding.HostPort, "%d", &hostPort)
			}
			detail.Ports = append(detail.Ports, Port{
				ContainerPort: containerPort,
				HostPort:      hostPort,
				Protocol:      port.Proto(),
				HostIP:        binding.HostIP,
			})
		}
	}

	// Convert networks
	for netName, netInfo := range containerJSON.NetworkSettings.Networks {
		network := Network{
			Name:        netName,
			ID:          netInfo.NetworkID,
			IPAddress:   netInfo.IPAddress,
			IPPrefixLen: netInfo.IPPrefixLen,
			Gateway:     netInfo.Gateway,
			MacAddress:  netInfo.MacAddress,
			IPv6Address: netInfo.GlobalIPv6Address,
			IPv6Gateway: netInfo.IPv6Gateway,
			Aliases:     netInfo.Aliases,
		}
		if netInfo.DriverOpts != nil {
			network.DriverOpts = netInfo.DriverOpts
		}
		detail.Networks = append(detail.Networks, network)
	}

	// Set resource limits and usage
	detail.Resources = Resources{
		CPUShares:         containerJSON.HostConfig.CPUShares,
		CPUQuota:          containerJSON.HostConfig.CPUQuota,
		CPUPeriod:         containerJSON.HostConfig.CPUPeriod,
		CPUsetCPUs:        containerJSON.HostConfig.CpusetCpus,
		CPUsetMems:        containerJSON.HostConfig.CpusetMems,
		MemoryLimit:       containerJSON.HostConfig.Memory,
		MemoryReservation: containerJSON.HostConfig.MemoryReservation,
		MemorySwap:        containerJSON.HostConfig.MemorySwap,
		PidsLimit:         getPidsLimit(containerJSON.HostConfig.PidsLimit),
		BlkioWeight:       containerJSON.HostConfig.BlkioWeight,
	}

	// TODO: Parse stats.Body to get actual resource usage if needed

	return detail, nil
}

// GetImage gets detailed information about a specific image
func (d *DockerClient) GetImage(id string) (*ImageDetail, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Get image inspect data
	imageInspect, _, err := d.client.ImageInspectWithRaw(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to inspect image: %w", err)
	}

	// Get image history for layers
	history, err := d.client.ImageHistory(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get image history: %w", err)
	}

	// Build detailed image info
	detail := &ImageDetail{
		Image: Image{
			ID:          imageInspect.ID,
			RepoTags:    imageInspect.RepoTags,
			RepoDigests: imageInspect.RepoDigests,
			Size:        imageInspect.Size,
			CreatedAt:   parseDockerTime(imageInspect.Created),
			Runtime:     "docker",
		},
		Parent:       imageInspect.Parent,
		Author:       imageInspect.Author,
		Architecture: imageInspect.Architecture,
		OS:           imageInspect.Os,
		Variant:      imageInspect.Variant,
	}

	// Handle image ID formatting
	if len(detail.ID) > 7 && detail.ID[:7] == "sha256:" {
		detail.ID = detail.ID[7:19]
	} else if len(detail.ID) > 12 {
		detail.ID = detail.ID[:12]
	}

	// Convert config
	if imageInspect.Config != nil {
		detail.Config = ImageConfig{
			User:       imageInspect.Config.User,
			Env:        imageInspect.Config.Env,
			Cmd:        imageInspect.Config.Cmd,
			Entrypoint: imageInspect.Config.Entrypoint,
			WorkingDir: imageInspect.Config.WorkingDir,
			StopSignal: imageInspect.Config.StopSignal,
			Labels:     imageInspect.Config.Labels,
		}

		// Convert exposed ports
		for port := range imageInspect.Config.ExposedPorts {
			detail.Config.ExposedPorts = append(detail.Config.ExposedPorts, string(port))
		}

		// Convert volumes
		for vol := range imageInspect.Config.Volumes {
			detail.Config.Volumes = append(detail.Config.Volumes, vol)
		}
	}

	// Set labels if available
	if imageInspect.Config != nil && imageInspect.Config.Labels != nil {
		detail.Labels = imageInspect.Config.Labels
	}

	// Convert layers from history
	for _, h := range history {
		layer := Layer{
			ID:        h.ID,
			Size:      h.Size,
			CreatedAt: time.Unix(h.Created, 0),
			CreatedBy: h.CreatedBy,
			Comment:   h.Comment,
		}
		detail.Layers = append(detail.Layers, layer)
	}

	return detail, nil
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

// parseDockerTime parses Docker time strings to time.Time
func parseDockerTime(timeStr string) time.Time {
	// Docker can return time in different formats
	// Try RFC3339Nano first (most common)
	if t, err := time.Parse(time.RFC3339Nano, timeStr); err == nil {
		return t
	}
	// Try RFC3339
	if t, err := time.Parse(time.RFC3339, timeStr); err == nil {
		return t
	}
	// Return zero time if parsing fails
	return time.Time{}
}

// getPidsLimit converts *int64 to int64, handling nil pointers
func getPidsLimit(limit *int64) int64 {
	if limit == nil {
		return 0
	}
	return *limit
}
