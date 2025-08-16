package container

import (
	"context"
	"fmt"
	"time"

	"github.com/awanio/vapor/internal/common"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	criapi "k8s.io/cri-api/pkg/apis/runtime/v1"
)

// CRIClient implements common.RuntimeClient for CRI-compatible runtimes
type CRIClient struct {
	conn          *grpc.ClientConn
	runtimeClient criapi.RuntimeServiceClient
	imageClient   criapi.ImageServiceClient
	socketPath    string
	runtimeName   string
}

// NewCRIClient creates a new CRI client
func NewCRIClient(socketPath string) (*CRIClient, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	conn, err := grpc.DialContext(ctx, fmt.Sprintf("unix://%s", socketPath),
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithBlock(),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to CRI socket %s: %w", socketPath, err)
	}

	runtimeClient := criapi.NewRuntimeServiceClient(conn)
	imageClient := criapi.NewImageServiceClient(conn)

	// Determine runtime name from socket path
	runtimeName := "containerd"
	if socketPath == "/var/run/crio/crio.sock" {
		runtimeName = "cri-o"
	}

	// Test connection by getting version
	versionReq := &criapi.VersionRequest{}
	_, err = runtimeClient.Version(ctx, versionReq)
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("failed to get CRI version: %w", err)
	}

	return &CRIClient{
		conn:          conn,
		runtimeClient: runtimeClient,
		imageClient:   imageClient,
		socketPath:    socketPath,
		runtimeName:   runtimeName,
	}, nil
}

// ListContainers lists all containers
func (c *CRIClient) ListContainers() ([]common.Container, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// List all containers (including stopped ones)
	req := &criapi.ListContainersRequest{}
	resp, err := c.runtimeClient.ListContainers(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("failed to list containers: %w", err)
	}

	containers := make([]common.Container, 0, len(resp.Containers))
	for _, cnt := range resp.Containers {
		container := common.Container{
			ID:        cnt.Id,
			Name:      cnt.Metadata.Name,
			Image:     cnt.Image.Image,
			State:     criapi.ContainerState_name[int32(cnt.State)],
			Status:    cnt.State.String(),
			CreatedAt: time.Unix(0, cnt.CreatedAt),
			Labels:    cnt.Labels,
			Runtime:   c.runtimeName,
		}
		containers = append(containers, container)
	}

	return containers, nil
}

// ListImages lists all images
func (c *CRIClient) ListImages() ([]common.Image, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	req := &criapi.ListImagesRequest{}
	resp, err := c.imageClient.ListImages(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("failed to list images: %w", err)
	}

	images := make([]common.Image, 0, len(resp.Images))
	for _, img := range resp.Images {
		image := common.Image{
			ID:          img.Id,
			RepoTags:    img.RepoTags,
			RepoDigests: img.RepoDigests,
			Size:        int64(img.Size_),
			Runtime:     c.runtimeName,
		}
		
		// CRI doesn't provide creation time directly, so we'll use current time as placeholder
		// In production, you might want to inspect the image for this information
		image.CreatedAt = time.Now()
		
		images = append(images, image)
	}

	return images, nil
}

// GetContainer gets detailed information about a specific container
func (c *CRIClient) GetContainer(id string) (*common.ContainerDetail, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Get container status
	statusReq := &criapi.ContainerStatusRequest{
		ContainerId: id,
		Verbose:     true,
	}
	statusResp, err := c.runtimeClient.ContainerStatus(ctx, statusReq)
	if err != nil {
		return nil, fmt.Errorf("failed to get container status: %w", err)
	}

	status := statusResp.Status
	if status == nil {
		return nil, fmt.Errorf("container status is nil")
	}

	// Get container stats
	statsReq := &criapi.ContainerStatsRequest{
		ContainerId: id,
	}
	statsResp, err := c.runtimeClient.ContainerStats(ctx, statsReq)
	if err != nil {
		// Stats might not be available for stopped containers
		statsResp = nil
	}

	// Build detailed container info
	detail := &common.ContainerDetail{
		Container: common.Container{
			ID:        status.Id,
			Name:      status.Metadata.Name,
			Image:     status.Image.Image,
			State:     criapi.ContainerState_name[int32(status.State)],
			Status:    status.State.String(),
			CreatedAt: time.Unix(0, status.CreatedAt),
			Labels:    status.Labels,
			Runtime:   c.runtimeName,
		},
		ImageID:      status.ImageRef,
		RestartCount: int32(status.Metadata.Attempt),
	}

	// Set timestamps
	if status.StartedAt > 0 {
		startedAt := time.Unix(0, status.StartedAt)
		detail.StartedAt = &startedAt
	}
	if status.FinishedAt > 0 {
		finishedAt := time.Unix(0, status.FinishedAt)
		detail.FinishedAt = &finishedAt
	}
	// Always include exit code for stopped/exited containers
	// Check if container is not running (CONTAINER_EXITED state = 1)
	if status.State == criapi.ContainerState_CONTAINER_EXITED {
		detail.ExitCode = &status.ExitCode
	}

	// Extract annotations
	if status.Annotations != nil {
		detail.Annotations = status.Annotations
	}

	// Extract detailed info from verbose output if available
	if statusResp.Info != nil {
		// Convert map[string]string to map[string]interface{}
		config := make(map[string]interface{})
		for k, v := range statusResp.Info {
			config[k] = v
		}
		detail.Config = config
	}

	// Convert mounts
	for _, mount := range status.Mounts {
		detail.Mounts = append(detail.Mounts, common.Mount{
			Source:      mount.HostPath,
			Destination: mount.ContainerPath,
			ReadOnly:    mount.Readonly,
		})
	}

	// Set resource limits and usage
	detail.Resources = common.Resources{}
	
	// Get resource usage from stats if available
	if statsResp != nil && statsResp.Stats != nil {
		stats := statsResp.Stats
		
		// CPU usage
		if stats.Cpu != nil {
			if stats.Cpu.UsageCoreNanoSeconds != nil {
				// Calculate CPU usage percentage
				// This is a simplified calculation
				detail.Resources.CPUUsagePercent = float64(stats.Cpu.UsageCoreNanoSeconds.Value) / 1e9
			}
		}
		
		// Memory usage
		if stats.Memory != nil {
			if stats.Memory.WorkingSetBytes != nil {
				detail.Resources.MemoryUsage = int64(stats.Memory.WorkingSetBytes.Value)
			}
			if stats.Memory.UsageBytes != nil {
				detail.Resources.MemoryMaxUsage = int64(stats.Memory.UsageBytes.Value)
			}
		}
		
		// Note: CRI v1 stats don't include network stats in the standard API
		// Network monitoring would need to be implemented separately
		
		// Disk I/O stats
		if stats.WritableLayer != nil {
			if stats.WritableLayer.UsedBytes != nil {
				detail.Resources.IOWriteBytes = stats.WritableLayer.UsedBytes.Value
			}
		}
	}

	return detail, nil
}

// GetContainerLogs gets logs of a specific container
func (c *CRIClient) GetContainerLogs(id string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// CRI doesn't provide a direct logs API, we need to use runtime-specific solutions
	// For now, return a message indicating logs are not available via CRI
	// In production, you might want to use the runtime's specific CLI or logging mechanism
	_ = ctx
	return "Container logs not available via CRI API. Please use runtime-specific tools (crictl logs, kubectl logs, etc.)", nil
}

// GetImage gets detailed information about a specific image
func (c *CRIClient) GetImage(id string) (*common.ImageDetail, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Get image status
	statusReq := &criapi.ImageStatusRequest{
		Image: &criapi.ImageSpec{
			Image: id,
		},
		Verbose: true,
	}
	statusResp, err := c.imageClient.ImageStatus(ctx, statusReq)
	if err != nil {
		return nil, fmt.Errorf("failed to get image status: %w", err)
	}

	if statusResp.Image == nil {
		return nil, fmt.Errorf("image not found")
	}

	image := statusResp.Image

	// Build detailed image info
	detail := &common.ImageDetail{
		Image: common.Image{
			ID:          image.Id,
			RepoTags:    image.RepoTags,
			RepoDigests: image.RepoDigests,
			Size:        int64(image.Size_),
			Runtime:     c.runtimeName,
		},
	}
	
	// CRI doesn't provide creation time in ImageStatus, use current time as placeholder
	detail.CreatedAt = time.Now()
	
	// Extract additional info from verbose output if available
	if statusResp.Info != nil {
		// The info map contains runtime-specific information
		// Extract what we can
		if val, ok := statusResp.Info["imageSpec"]; ok {
			// Store the full image spec
			detail.Manifest = map[string]interface{}{
				"imageSpec": val,
			}
		}
		
		// CRI's Info field is map[string]string, so we can't extract structured config
		// Just store the raw config string if available
		if _, ok := statusResp.Info["config"]; ok {
			detail.Config = common.ImageConfig{}
			// For CRI, we'll have limited config information
		}
		
		// Try to extract architecture and OS info
		if arch, ok := statusResp.Info["architecture"]; ok {
			detail.Architecture = arch
		}
		if os, ok := statusResp.Info["os"]; ok {
			detail.OS = os
		}
		if variant, ok := statusResp.Info["variant"]; ok {
			detail.Variant = variant
		}
	}
	
	// CRI doesn't provide layer information directly
	// We would need to implement runtime-specific logic to get this
	detail.Layers = []common.Layer{}

	return detail, nil
}

// GetRuntimeName returns the runtime name
func (c *CRIClient) GetRuntimeName() string {
	return c.runtimeName
}

// ImportImage imports an image from a tar.gz file
func (c *CRIClient) ImportImage(filePath string) (*common.ImageImportResult, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	// CRI doesn't provide a direct import API
	// In production, you would need to use runtime-specific mechanisms
	// For example, for containerd, you might use ctr or nerdctl
	_ = ctx
	_ = filePath
	
	// Return a placeholder result indicating the operation is not supported
	importResult := &common.ImageImportResult{
		ImageID:    "",
		RepoTags:   []string{},
		ImportedAt: time.Now(),
		Runtime:    c.runtimeName,
		Status:     "unsupported",
		Message:    "Image import is not supported via CRI API. Please use runtime-specific tools.",
	}

	return importResult, nil
}

// Close closes the connection
func (c *CRIClient) Close() error {
	if c.conn != nil {
		return c.conn.Close()
	}
	return nil
}
