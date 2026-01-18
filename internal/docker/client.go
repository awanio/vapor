package docker

import (
	"context"
	"fmt"
	"io"
	"os"
	"strings"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/events"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/api/types/image"
	"github.com/docker/docker/api/types/network"
	"github.com/docker/docker/api/types/volume"
	"github.com/docker/docker/client"
)

// Client is an interface for Docker operations
type Client interface {
	ListContainers(ctx context.Context, options ContainerListOptions) ([]Container, error)
	ListImages(ctx context.Context) ([]Image, error)
	ListNetworks(ctx context.Context) ([]Network, error)
	ListVolumes(ctx context.Context) ([]Volume, error)
	Close() error
	ContainerDetail(ctx context.Context, containerID string) (types.ContainerJSON, error)
	StartContainer(ctx context.Context, containerID string) error
	StopContainer(ctx context.Context, containerID string) error
	KillContainer(ctx context.Context, containerID string) error
	RemoveContainer(ctx context.Context, containerID string) error
	ContainerLogs(ctx context.Context, containerID string) (string, error)
	ContainerExecCreate(ctx context.Context, containerID string, cmd []string) (string, error)
	ContainerExecAttach(ctx context.Context, execID string) (types.HijackedResponse, error)
	ContainerExecResize(ctx context.Context, execID string, height, width uint) error
	RemoveImage(ctx context.Context, imageID string) error
	RemoveVolume(ctx context.Context, volumeID string) error
	RemoveNetwork(ctx context.Context, networkID string) error
	CreateContainer(ctx context.Context, config container.Config, hostConfig container.HostConfig, networkConfig network.NetworkingConfig, containerName string) (string, error)
	CreateVolume(ctx context.Context, name string, driver string, labels map[string]string) (Volume, error)
	CreateNetwork(ctx context.Context, name string, driver string, subnet string, gateway string, labels map[string]string) (Network, error)
	PullImage(ctx context.Context, imageName string) error
	ImportImage(ctx context.Context, req ImageImportRequest) (ImageImportResult, error)
	Events(ctx context.Context, opts types.EventsOptions) (<-chan events.Message, <-chan error)
}

// dockerClient implements the Client interface using Docker SDK
type dockerClient struct {
	client *client.Client
}

// NewClient creates a new Docker client
func NewClient() (Client, error) {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return nil, fmt.Errorf("failed to create Docker client: %w", err)
	}

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err = cli.Ping(ctx)
	if err != nil {
		cli.Close()
		return nil, fmt.Errorf("failed to ping Docker daemon: %w", err)
	}

	return &dockerClient{client: cli}, nil
}

// ListContainers lists Docker containers with optional filters
func (c *dockerClient) ListContainers(ctx context.Context, options ContainerListOptions) ([]Container, error) {
	listOptions := container.ListOptions{
		All:   options.All,
		Size:  options.Size,
		Limit: options.Limit,
	}

	// Apply filters
	if options.Running {
		listOptions.Filters = filters.NewArgs()
		listOptions.Filters.Add("status", "running")
	} else if options.Filters != "" {
		listOptions.Filters = filters.NewArgs()
		// Parse custom filters (format: "key=value,key2=value2")
		for _, filter := range strings.Split(options.Filters, ",") {
			parts := strings.SplitN(filter, "=", 2)
			if len(parts) == 2 {
				listOptions.Filters.Add(parts[0], parts[1])
			}
		}
	}

	containers, err := c.client.ContainerList(ctx, listOptions)
	if err != nil {
		return nil, fmt.Errorf("failed to list containers: %w", err)
	}

	result := make([]Container, 0, len(containers))
	for _, container := range containers {
		result = append(result, convertContainer(container))
	}

	return result, nil
}

// ContainerDetail fetches detailed information of a specific container
func (c *dockerClient) ContainerDetail(ctx context.Context, containerID string) (types.ContainerJSON, error) {
	container, err := c.client.ContainerInspect(ctx, containerID)
	if err != nil {
		return types.ContainerJSON{}, fmt.Errorf("failed to inspect container: %w", err)
	}
	return container, nil
}

// StartContainer starts a Docker container
func (c *dockerClient) StartContainer(ctx context.Context, containerID string) error {
	return c.client.ContainerStart(ctx, containerID, container.StartOptions{})
}

// StopContainer stops a Docker container
func (c *dockerClient) StopContainer(ctx context.Context, containerID string) error {
	return c.client.ContainerStop(ctx, containerID, container.StopOptions{})
}

// KillContainer forcefully kills a Docker container
func (c *dockerClient) KillContainer(ctx context.Context, containerID string) error {
	return c.client.ContainerKill(ctx, containerID, "SIGKILL")
}

// RemoveContainer removes a Docker container
func (c *dockerClient) RemoveContainer(ctx context.Context, containerID string) error {
	return c.client.ContainerRemove(ctx, containerID, container.RemoveOptions{Force: true})
}

// ContainerLogs fetches logs of a Docker container
func (c *dockerClient) ContainerLogs(ctx context.Context, containerID string) (string, error) {
	logReader, err := c.client.ContainerLogs(ctx, containerID, container.LogsOptions{ShowStdout: true, ShowStderr: true})
	if err != nil {
		return "", fmt.Errorf("failed to fetch logs: %w", err)
	}
	defer logReader.Close()

	logs, err := io.ReadAll(logReader)
	if err != nil {
		return "", fmt.Errorf("failed to read logs: %w", err)
	}

	return string(logs), nil
}

// ContainerExecCreate creates an exec session in a container
func (c *dockerClient) ContainerExecCreate(ctx context.Context, containerID string, cmd []string) (string, error) {
	execConfig := types.ExecConfig{
		AttachStdout: true,
		AttachStderr: true,
		AttachStdin:  true,
		Tty:          true,
		Cmd:          cmd,
	}
	resp, err := c.client.ContainerExecCreate(ctx, containerID, execConfig)
	if err != nil {
		return "", fmt.Errorf("failed to create exec: %w", err)
	}
	return resp.ID, nil
}

// ContainerExecAttach attaches to an exec session
func (c *dockerClient) ContainerExecAttach(ctx context.Context, execID string) (types.HijackedResponse, error) {
	resp, err := c.client.ContainerExecAttach(ctx, execID, types.ExecStartCheck{Tty: true})
	if err != nil {
		return types.HijackedResponse{}, fmt.Errorf("failed to attach exec: %w", err)
	}
	return resp, nil
}

// ContainerExecResize resizes the exec session terminal
func (c *dockerClient) ContainerExecResize(ctx context.Context, execID string, height, width uint) error {
	if err := c.client.ContainerExecResize(ctx, execID, container.ResizeOptions{Height: height, Width: width}); err != nil {
		return fmt.Errorf("failed to resize exec: %w", err)
	}
	return nil
}

// RemoveImage removes a Docker image
func (c *dockerClient) RemoveImage(ctx context.Context, imageID string) error {
	_, err := c.client.ImageRemove(ctx, imageID, image.RemoveOptions{Force: true})
	return err
}

// RemoveVolume removes a Docker volume
func (c *dockerClient) RemoveVolume(ctx context.Context, volumeID string) error {
	return c.client.VolumeRemove(ctx, volumeID, true)
}

// RemoveNetwork removes a Docker network
func (c *dockerClient) RemoveNetwork(ctx context.Context, networkID string) error {
	return c.client.NetworkRemove(ctx, networkID)
}

// ListImages lists Docker images
func (c *dockerClient) ListImages(ctx context.Context) ([]Image, error) {
	images, err := c.client.ImageList(ctx, image.ListOptions{All: true})
	if err != nil {
		return nil, fmt.Errorf("failed to list images: %w", err)
	}

	result := make([]Image, 0, len(images))
	for _, image := range images {
		result = append(result, convertImage(image))
	}

	return result, nil
}

// ListNetworks lists Docker networks
func (c *dockerClient) ListNetworks(ctx context.Context) ([]Network, error) {
	networks, err := c.client.NetworkList(ctx, types.NetworkListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list networks: %w", err)
	}

	result := make([]Network, 0, len(networks))
	for _, network := range networks {
		result = append(result, convertNetwork(network))
	}

	return result, nil
}

// ListVolumes lists Docker volumes
func (c *dockerClient) ListVolumes(ctx context.Context) ([]Volume, error) {
	volumes, err := c.client.VolumeList(ctx, volume.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list volumes: %w", err)
	}

	result := make([]Volume, 0, len(volumes.Volumes))
	for _, volume := range volumes.Volumes {
		result = append(result, convertVolume(volume))
	}

	return result, nil
}

// CreateContainer creates a new Docker container
func (c *dockerClient) CreateContainer(ctx context.Context, config container.Config, hostConfig container.HostConfig, networkConfig network.NetworkingConfig, containerName string) (string, error) {
	resp, err := c.client.ContainerCreate(ctx, &config, &hostConfig, &networkConfig, nil, containerName)
	if err != nil {
		return "", fmt.Errorf("failed to create container: %w", err)
	}
	return resp.ID, nil
}

// PullImage pulls an image from the Docker registry
func (c *dockerClient) PullImage(ctx context.Context, imageName string) error {
	reader, err := c.client.ImagePull(ctx, imageName, image.PullOptions{})
	if err != nil {
		return fmt.Errorf("failed to pull image: %w", err)
	}
	defer reader.Close()

	_, err = io.Copy(io.Discard, reader)
	if err != nil {
		return fmt.Errorf("failed to read image pull response: %w", err)
	}

	return nil
}

// ImportImage imports an image from a tarball or URL
func (c *dockerClient) ImportImage(ctx context.Context, req ImageImportRequest) (ImageImportResult, error) {
	// For file-based import, we should use ImageLoad instead of ImageImport
	// ImageLoad is used for Docker save/load format, which is what we expect
	file, err := os.Open(req.Source)
	if err != nil {
		return ImageImportResult{}, fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	// Load the image using Docker SDK
	imageLoadResponse, err := c.client.ImageLoad(ctx, file, false)
	if err != nil {
		return ImageImportResult{}, fmt.Errorf("failed to load image: %w", err)
	}
	defer imageLoadResponse.Body.Close()

	// Read the load response to get information
	respContent, err := io.ReadAll(imageLoadResponse.Body)
	if err != nil {
		return ImageImportResult{}, fmt.Errorf("failed to read image load response: %w", err)
	}

	responseText := string(respContent)

	// Parse the response to extract image information
	// Docker load response typically contains "Loaded image: name:tag" or "Loaded image ID: sha256:..."
	imageID := ""
	repoTags := []string{}
	size := int64(0)

	// Try to get the most recent image (the one we just loaded)
	images, err := c.client.ImageList(ctx, image.ListOptions{})
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

	return ImageImportResult{
		ImageID:    imageID,
		RepoTags:   repoTags,
		Size:       size,
		ImportedAt: time.Now(),
		Runtime:    "docker",
		Status:     "success",
		Message:    responseText,
	}, nil
}

// Close closes the Docker client connection
func (c *dockerClient) Close() error {
	return c.client.Close()
}

// Helper functions to convert Docker SDK types to our types

func convertContainer(container types.Container) Container {
	ports := make([]Port, 0, len(container.Ports))
	for _, port := range container.Ports {
		ports = append(ports, Port{
			IP:          port.IP,
			PrivatePort: int(port.PrivatePort),
			PublicPort:  int(port.PublicPort),
			Type:        port.Type,
		})
	}

	mounts := make([]Mount, 0, len(container.Mounts))
	for _, mount := range container.Mounts {
		mounts = append(mounts, Mount{
			Type:        string(mount.Type),
			Source:      mount.Source,
			Destination: mount.Destination,
			Mode:        mount.Mode,
			RW:          mount.RW,
			Propagation: string(mount.Propagation),
		})
	}

	networks := make(map[string]NetworkInfo)
	if container.NetworkSettings != nil {
		for name, network := range container.NetworkSettings.Networks {
			networks[name] = NetworkInfo{
				NetworkID:   network.NetworkID,
				EndpointID:  network.EndpointID,
				Gateway:     network.Gateway,
				IPAddress:   network.IPAddress,
				IPPrefixLen: network.IPPrefixLen,
				MacAddress:  network.MacAddress,
			}
		}
	}

	return Container{
		ID:         container.ID,
		Names:      container.Names,
		Image:      container.Image,
		ImageID:    container.ImageID,
		Command:    container.Command,
		Created:    time.Unix(container.Created, 0),
		State:      container.State,
		Status:     container.Status,
		Ports:      ports,
		Labels:     container.Labels,
		SizeRw:     container.SizeRw,
		SizeRootFs: container.SizeRootFs,
		HostConfig: HostConfig{
			NetworkMode: container.HostConfig.NetworkMode,
		},
		NetworkSettings: NetworkSettings{
			Networks: networks,
		},
		Mounts: mounts,
	}
}

func convertImage(image image.Summary) Image {
	return Image{
		ID:          image.ID,
		ParentID:    image.ParentID,
		RepoTags:    image.RepoTags,
		RepoDigests: image.RepoDigests,
		Created:     time.Unix(image.Created, 0),
		Size:        image.Size,
		VirtualSize: image.VirtualSize,
		SharedSize:  image.SharedSize,
		Labels:      image.Labels,
		Containers:  image.Containers,
	}
}

func convertNetwork(network types.NetworkResource) Network {
	ipamConfig := make([]IPAMConfig, 0)
	if network.IPAM.Config != nil {
		for _, config := range network.IPAM.Config {
			ipamConfig = append(ipamConfig, IPAMConfig{
				Subnet:     config.Subnet,
				IPRange:    config.IPRange,
				Gateway:    config.Gateway,
				AuxAddress: config.AuxAddress,
			})
		}
	}

	containers := make(map[string]NetworkInfo)
	if network.Containers != nil {
		for id, container := range network.Containers {
			containers[id] = NetworkInfo{
				EndpointID: container.EndpointID,
				MacAddress: container.MacAddress,
			}
		}
	}

	return Network{
		ID:         network.ID,
		Name:       network.Name,
		Driver:     network.Driver,
		Created:    network.Created,
		Scope:      network.Scope,
		EnableIPv6: network.EnableIPv6,
		IPAM: IPAM{
			Driver:  network.IPAM.Driver,
			Options: network.IPAM.Options,
			Config:  ipamConfig,
		},
		Internal:   network.Internal,
		Attachable: network.Attachable,
		Ingress:    network.Ingress,
		ConfigOnly: network.ConfigOnly,
		Options:    network.Options,
		Labels:     network.Labels,
		Containers: containers,
	}
}

func convertVolume(volume *volume.Volume) Volume {
	// Parse CreatedAt string to time.Time
	var createdAt time.Time
	if volume.CreatedAt != "" {
		createdAt, _ = time.Parse(time.RFC3339Nano, volume.CreatedAt)
	}

	v := Volume{
		Name:       volume.Name,
		Driver:     volume.Driver,
		Mountpoint: volume.Mountpoint,
		CreatedAt:  createdAt,
		Labels:     volume.Labels,
		Scope:      volume.Scope,
		Options:    volume.Options,
	}

	if volume.UsageData != nil {
		v.UsageData = &VolumeUsageData{
			Size:     volume.UsageData.Size,
			RefCount: volume.UsageData.RefCount,
		}
	}

	return v
}

func (c *dockerClient) Events(ctx context.Context, opts types.EventsOptions) (<-chan events.Message, <-chan error) {
	return c.client.Events(ctx, opts)
}

// CreateVolume creates a Docker volume
func (c *dockerClient) CreateVolume(ctx context.Context, name string, driver string, labels map[string]string) (Volume, error) {
    opts := volume.CreateOptions{ Name: name }
    if driver != "" {
        opts.Driver = driver
    }
    if labels != nil {
        opts.Labels = labels
    }
    v, err := c.client.VolumeCreate(ctx, opts)
    if err != nil {
        return Volume{}, fmt.Errorf("failed to create volume: %w", err)
    }
    return convertVolume(&v), nil
}

// CreateNetwork creates a Docker network
func (c *dockerClient) CreateNetwork(ctx context.Context, name string, driver string, subnet string, gateway string, labels map[string]string) (Network, error) {
    ipamCfg := []network.IPAMConfig{}
    if subnet != "" || gateway != "" {
        ipamCfg = append(ipamCfg, network.IPAMConfig{ Subnet: subnet, Gateway: gateway })
    }
    create := types.NetworkCreate{
        Driver:     driver,
        Attachable: true,
        Labels:     labels,
    }
    if len(ipamCfg) > 0 {
        create.IPAM = &network.IPAM{ Config: ipamCfg }
    }
    resp, err := c.client.NetworkCreate(ctx, name, create)
    if err != nil {
        return Network{}, fmt.Errorf("failed to create network: %w", err)
    }
    n, err := c.client.NetworkInspect(ctx, resp.ID, types.NetworkInspectOptions{})
    if err != nil {
        return Network{}, fmt.Errorf("failed to inspect network: %w", err)
    }
    return convertNetwork(types.NetworkResource(n)), nil
}
