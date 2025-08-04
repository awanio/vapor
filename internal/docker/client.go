package docker

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/api/types/image"
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
