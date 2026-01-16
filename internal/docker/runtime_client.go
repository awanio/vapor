package docker

import (
	"context"
	"fmt"
	"io"
	"os"
	"strings"
	"time"

	"github.com/awanio/vapor/internal/common"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/image"
	"github.com/docker/docker/client"
)

// RuntimeClient implements common.RuntimeClient for Docker
type RuntimeClient struct {
	client *client.Client
}

// NewRuntimeClient creates a new Docker runtime client
func NewRuntimeClient() (*RuntimeClient, error) {
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

	return &RuntimeClient{
		client: cli,
	}, nil
}

// NewRuntimeClientFromExisting creates a runtime client from an existing Docker client
func NewRuntimeClientFromExisting(dockerClient Client) (*RuntimeClient, error) {
	// We need to access the underlying Docker SDK client
	// Since we control the creation of the Client interface, we know it's our implementation
	// For now, create a new runtime client instead
	runtimeClient, err := NewRuntimeClient()
	if err != nil {
		return nil, fmt.Errorf("failed to create runtime client: %w", err)
	}
	return runtimeClient, nil
}

// ListContainers lists all containers
func (d *RuntimeClient) ListContainers() ([]common.Container, error) {
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

	containers := make([]common.Container, 0, len(dockerContainers))
	for _, dc := range dockerContainers {
		// Docker returns names with leading slash, remove it
		name := ""
		if len(dc.Names) > 0 {
			name = dc.Names[0]
			if len(name) > 0 && name[0] == '/' {
				name = name[1:]
			}
		}

		container := common.Container{
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

// GetContainer gets detailed information about a specific container
func (d *RuntimeClient) GetContainer(id string) (*common.ContainerDetail, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Get container inspect data
	containerJSON, err := d.client.ContainerInspect(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to inspect container: %w", err)
	}

	// Build detailed container info
	detail := &common.ContainerDetail{
		Container: common.Container{
			ID:        containerJSON.ID[:12],
			Name:      strings.TrimPrefix(containerJSON.Name, "/"),
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
	// Always include exit code for stopped/exited containers
	if containerJSON.State.Status == "exited" || containerJSON.State.Status == "stopped" || containerJSON.State.Status == "dead" {
		exitCode := int32(containerJSON.State.ExitCode)
		detail.ExitCode = &exitCode
	}

	// Convert mounts
	for _, mount := range containerJSON.Mounts {
		detail.Mounts = append(detail.Mounts, common.Mount{
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
			detail.Ports = append(detail.Ports, common.Port{
				ContainerPort: containerPort,
				HostPort:      hostPort,
				Protocol:      port.Proto(),
				HostIP:        binding.HostIP,
			})
		}
	}

	// Convert networks
	for netName, netInfo := range containerJSON.NetworkSettings.Networks {
		network := common.Network{
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
	detail.Resources = common.Resources{
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

	return detail, nil
}

// GetContainerLogs gets logs of a specific container
func (d *RuntimeClient) GetContainerLogs(id string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	options := container.LogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Timestamps: true,
		Tail:       "1000", // Limit to last 1000 lines to avoid huge responses
	}

	reader, err := d.client.ContainerLogs(ctx, id, options)
	if err != nil {
		return "", fmt.Errorf("failed to get container logs: %w", err)
	}
	defer reader.Close()

	// Docker multiplexes stdout and stderr into a single stream with headers
	// We need to parse this format
	var buf strings.Builder
	buffer := make([]byte, 8*1024) // 8KB buffer

	for {
		n, err := reader.Read(buffer)
		if err != nil {
			if err == io.EOF {
				break
			}
			return "", fmt.Errorf("failed to read container logs: %w", err)
		}
		
		// When TTY is false, Docker uses a multiplexed stream format
		// Each frame has an 8-byte header: [stream_type, 0, 0, 0, size1, size2, size3, size4]
		// For now, we'll just append the raw data, but in production you might want to parse the headers
		buf.Write(buffer[:n])
	}

	return buf.String(), nil
}

// ListImages lists all images
func (d *RuntimeClient) ListImages() ([]common.Image, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	options := image.ListOptions{
		All: true,
	}

	dockerImages, err := d.client.ImageList(ctx, options)
	if err != nil {
		return nil, fmt.Errorf("failed to list images: %w", err)
	}

	images := make([]common.Image, 0, len(dockerImages))
	for _, di := range dockerImages {
		img := common.Image{
			ID:          di.ID,
			RepoTags:    di.RepoTags,
			RepoDigests: di.RepoDigests,
			Size:        di.Size,
			CreatedAt:   time.Unix(di.Created, 0),
			Runtime:     "docker",
		}

		// Handle case where ID has sha256: prefix
		if len(img.ID) > 7 && img.ID[:7] == "sha256:" {
			img.ID = img.ID[7:19] // Take 12 chars after sha256:
		} else if len(img.ID) > 12 {
			img.ID = img.ID[:12]
		}

		images = append(images, img)
	}

	return images, nil
}

// GetImage gets detailed information about a specific image
func (d *RuntimeClient) GetImage(id string) (*common.ImageDetail, error) {
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
	detail := &common.ImageDetail{
		Image: common.Image{
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
		detail.Config = common.ImageConfig{
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
		layer := common.Layer{
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

// ImportImage imports a Docker image from a tar.gz file
func (d *RuntimeClient) ImportImage(filePath string) (*common.ImageImportResult, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute) // Set a timeout for large operations
	defer cancel()

	file, err := os.Open(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	// Load the image using Docker SDK
	imageLoadResponse, err := d.client.ImageLoad(ctx, file, false)
	if err != nil {
		return nil, fmt.Errorf("failed to load image: %w", err)
	}
	defer imageLoadResponse.Body.Close()

	// Read the load response to get information
	respContent, err := io.ReadAll(imageLoadResponse.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read image load response: %w", err)
	}

	responseText := string(respContent)
	
	// Parse the response to extract image information
	// Docker load response typically contains "Loaded image: name:tag" or "Loaded image ID: sha256:..."
	imageID := ""
	repoTags := []string{}
	size := int64(0)

	// Try to get the most recent image (the one we just loaded)
	images, err := d.client.ImageList(ctx, image.ListOptions{})
	if err == nil && len(images) > 0 {
		// Sort by created time and get the most recent
		var newestImage image.Summary
		newestTime := time.Unix(0, 0)
		for _, img := range images {
			created := time.Unix(img.Created, 0)
			if created.After(newestTime) {
				newestTime = created
				newestImage = img
			}
		}
		
		if newestImage.ID != "" {
			imageID = newestImage.ID
			repoTags = newestImage.RepoTags
			size = newestImage.Size
		}
	}

	return &common.ImageImportResult{
		ImageID:    imageID,
		RepoTags:   repoTags,
		Size:       size,
		ImportedAt: time.Now(),
		Runtime:    "docker",
		Status:     "success",
		Message:    responseText,
	}, nil
}

// GetRuntimeName returns the runtime name
func (d *RuntimeClient) GetRuntimeName() string {
	return "docker"
}

// Close closes the connection
func (d *RuntimeClient) Close() error {
	if d.client != nil {
		return d.client.Close()
	}
	return nil
}

// Helper functions

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

// PullImage pulls an image from a registry
func (d *RuntimeClient) PullImage(imageRef string) (*common.ImagePullResult, error) {
ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
defer cancel()

// Pull the image using Docker SDK
reader, err := d.client.ImagePull(ctx, imageRef, image.PullOptions{})
if err != nil {
return nil, fmt.Errorf("failed to pull image %s: %w", imageRef, err)
}
defer reader.Close()

// Consume the pull response to ensure the pull completes
_, err = io.Copy(io.Discard, reader)
if err != nil {
return nil, fmt.Errorf("failed to complete image pull for %s: %w", imageRef, err)
}

// Get image details after pull
var imageID string
var size int64
imageInspect, _, err := d.client.ImageInspectWithRaw(ctx, imageRef)
if err == nil {
imageID = imageInspect.ID
size = imageInspect.Size
}

return &common.ImagePullResult{
ImageRef: imageRef,
ImageID:  imageID,
Size:     size,
PulledAt: time.Now(),
Runtime:  "docker",
Status:   "success",
Message:  "Image pulled successfully",
}, nil
}

// RemoveImage removes an image from the local storage
func (d *RuntimeClient) RemoveImage(imageRef string) error {
ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
defer cancel()

// Remove the image using Docker SDK
_, err := d.client.ImageRemove(ctx, imageRef, image.RemoveOptions{
Force:         false,
PruneChildren: true,
})
if err != nil {
return fmt.Errorf("failed to remove image %s: %w", imageRef, err)
}

return nil
}
