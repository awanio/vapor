package container

import (
	"context"
	"fmt"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	criapi "k8s.io/cri-api/pkg/apis/runtime/v1"
)

// CRIClient implements RuntimeClient for CRI-compatible runtimes
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
func (c *CRIClient) ListContainers() ([]Container, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// List all containers (including stopped ones)
	req := &criapi.ListContainersRequest{}
	resp, err := c.runtimeClient.ListContainers(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("failed to list containers: %w", err)
	}

	containers := make([]Container, 0, len(resp.Containers))
	for _, cnt := range resp.Containers {
		container := Container{
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
func (c *CRIClient) ListImages() ([]Image, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	req := &criapi.ListImagesRequest{}
	resp, err := c.imageClient.ListImages(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("failed to list images: %w", err)
	}

	images := make([]Image, 0, len(resp.Images))
	for _, img := range resp.Images {
		image := Image{
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

// GetRuntimeName returns the runtime name
func (c *CRIClient) GetRuntimeName() string {
	return c.runtimeName
}

// Close closes the connection
func (c *CRIClient) Close() error {
	if c.conn != nil {
		return c.conn.Close()
	}
	return nil
}
