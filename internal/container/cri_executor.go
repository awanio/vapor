package container

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"log"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	v1 "k8s.io/cri-api/pkg/apis/runtime/v1"
)

// CriExecutor implements ContainerRuntimeExecutor using CRI-compliant runtime
type CriExecutor struct {
	criClient v1.RuntimeServiceClient
	imageClient v1.ImageServiceClient
	conn      *grpc.ClientConn
}

// NewCriExecutor creates a new CRI executor
func NewCriExecutor(socketPath string) (*CriExecutor, error) {
	conn, err := grpc.Dial(
		"unix://"+socketPath,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithBlock(),
		grpc.WithTimeout(5*time.Second),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to CRI socket at %s: %w", socketPath, err)
	}

	runtimeClient := v1.NewRuntimeServiceClient(conn)
	imageClient := v1.NewImageServiceClient(conn)

	// Test the connection
	_, err = runtimeClient.Version(context.Background(), &v1.VersionRequest{})
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("failed to get CRI runtime version: %w", err)
	}

	log.Printf("Successfully connected to CRI runtime at %s", socketPath)

	return &CriExecutor{
		criClient:   runtimeClient,
		imageClient: imageClient,
		conn:        conn,
	}, nil
}

// Close closes the gRPC connection
func (e *CriExecutor) Close() error {
	if e.conn != nil {
		return e.conn.Close()
	}
	return nil
}

func (e *CriExecutor) ListContainers(ctx context.Context) ([]ContainerInfo, error) {
	resp, err := e.criClient.ListContainers(ctx, &v1.ListContainersRequest{})
	if err != nil {
		return nil, fmt.Errorf("failed to list containers: %w", err)
	}

	var containers []ContainerInfo
	for _, c := range resp.Containers {
		containerInfo := ContainerInfo{
			ID:          c.Id,
			Name:        c.Metadata.Name,
			Image:       c.Image.Image,
			ImageID:     c.ImageRef,
			CreatedAt:   time.Unix(0, c.CreatedAt).Format(time.RFC3339),
			State:       c.State.String(),
			Labels:      c.Labels,
			Annotations: c.Annotations,
			Runtime:     "cri",
		}
		containers = append(containers, containerInfo)
	}

	return containers, nil
}

func (e *CriExecutor) GetContainerDetails(ctx context.Context, id string) (*ContainerInfo, error) {
	status, err := e.criClient.ContainerStatus(ctx, &v1.ContainerStatusRequest{
		ContainerId: id,
		Verbose:     true,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get container status: %w", err)
	}

	containerInfo := &ContainerInfo{
		ID:          status.Status.Id,
		Name:        status.Status.Metadata.Name,
		Image:       status.Status.Image.Image,
		ImageID:     status.Status.ImageRef,
		CreatedAt:   time.Unix(0, status.Status.CreatedAt).Format(time.RFC3339),
		State:       status.Status.State.String(),
		Labels:      status.Status.Labels,
		Annotations: status.Status.Annotations,
		Runtime:     "cri",
	}

	// Extract additional details from verbose info if available
	if status.Info != nil {
		// Process additional info as needed
	}

	return containerInfo, nil
}

func (e *CriExecutor) CreateContainer(ctx context.Context, config ContainerConfig) (*ContainerInfo, error) {
	// For CRI, container creation is typically done through pods
	// This is a simplified implementation
	return nil, fmt.Errorf("CRI container creation requires pod context - use Kubernetes or crictl")
}

func (e *CriExecutor) StartContainer(ctx context.Context, id string) error {
	_, err := e.criClient.StartContainer(ctx, &v1.StartContainerRequest{
		ContainerId: id,
	})
	if err != nil {
		return fmt.Errorf("failed to start container: %w", err)
	}
	return nil
}

func (e *CriExecutor) StopContainer(ctx context.Context, id string) error {
	_, err := e.criClient.StopContainer(ctx, &v1.StopContainerRequest{
		ContainerId: id,
		Timeout:     10, // 10 seconds timeout
	})
	if err != nil {
		return fmt.Errorf("failed to stop container: %w", err)
	}
	return nil
}

func (e *CriExecutor) RestartContainer(ctx context.Context, id string) error {
	// CRI doesn't have a direct restart command, so we stop and start
	if err := e.StopContainer(ctx, id); err != nil {
		return err
	}
	return e.StartContainer(ctx, id)
}

func (e *CriExecutor) RemoveContainer(ctx context.Context, id string) error {
	_, err := e.criClient.RemoveContainer(ctx, &v1.RemoveContainerRequest{
		ContainerId: id,
	})
	if err != nil {
		return fmt.Errorf("failed to remove container: %w", err)
	}
	return nil
}

func (e *CriExecutor) GetContainerLogs(ctx context.Context, id string) (io.Reader, error) {
	// CRI doesn't provide direct log streaming, typically logs are accessed via the filesystem
	// This would require additional configuration to know where logs are stored
	return bytes.NewReader([]byte("CRI log access requires filesystem access to log directory")), nil
}

func (e *CriExecutor) ListImages(ctx context.Context) ([]ImageInfo, error) {
	resp, err := e.imageClient.ListImages(ctx, &v1.ListImagesRequest{})
	if err != nil {
		return nil, fmt.Errorf("failed to list images: %w", err)
	}

	var images []ImageInfo
	for _, img := range resp.Images {
		imageInfo := ImageInfo{
			ID:          img.Id,
			RepoTags:    img.RepoTags,
			RepoDigests: img.RepoDigests,
			Size:        int64(img.Size_),
		}
		images = append(images, imageInfo)
	}

	return images, nil
}

func (e *CriExecutor) GetImageDetails(ctx context.Context, id string) (*ImageInfo, error) {
	status, err := e.imageClient.ImageStatus(ctx, &v1.ImageStatusRequest{
		Image: &v1.ImageSpec{Image: id},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get image status: %w", err)
	}

	if status.Image == nil {
		return nil, fmt.Errorf("image not found")
	}

	imageInfo := &ImageInfo{
		ID:          status.Image.Id,
		RepoTags:    status.Image.RepoTags,
		RepoDigests: status.Image.RepoDigests,
		Size:        int64(status.Image.Size_),
	}

	return imageInfo, nil
}

func (e *CriExecutor) PullImage(ctx context.Context, name string) error {
	_, err := e.imageClient.PullImage(ctx, &v1.PullImageRequest{
		Image: &v1.ImageSpec{Image: name},
	})
	if err != nil {
		return fmt.Errorf("failed to pull image: %w", err)
	}
	return nil
}

func (e *CriExecutor) RemoveImage(ctx context.Context, id string) error {
	_, err := e.imageClient.RemoveImage(ctx, &v1.RemoveImageRequest{
		Image: &v1.ImageSpec{Image: id},
	})
	if err != nil {
		return fmt.Errorf("failed to remove image: %w", err)
	}
	return nil
}
