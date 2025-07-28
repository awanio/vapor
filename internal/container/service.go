package container

import (
	"fmt"
	"os/exec"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/vapor/system-api/internal/common"
)

// service implements container management
type service struct {
	containerSvc Service
}

// NewService creates a new container service
func NewService(cmdExecutor CommandExecutor) *service {
	var containerSvc Service

	// Check for nerdctl first (more feature-rich)
	if _, err := exec.LookPath("nerdctl"); err == nil {
		containerSvc = NewNerdctlService(cmdExecutor)
	} else if _, err := exec.LookPath("crictl"); err == nil {
		// Fall back to crictl
		containerSvc = NewContainerService(cmdExecutor)
	} else {
		// Use a mock service for development
		containerSvc = &mockContainerService{}
	}

	return &service{
		containerSvc: containerSvc,
	}
}

// ListContainers returns a list of all containers
func (s *service) ListContainers(c *gin.Context) {
	containers, err := s.containerSvc.ListContainers()
	if err != nil {
		common.SendError(c, 500, "CONTAINER_LIST_ERROR", err.Error())
		return
	}

	common.SendSuccess(c, gin.H{
		"containers": containers,
	})
}

// GetContainerDetails returns detailed information about a container
func (s *service) GetContainerDetails(c *gin.Context) {
	containerID := c.Param("id")
	if containerID == "" {
		common.SendError(c, 400, "MISSING_CONTAINER_ID", "Container ID is required")
		return
	}

	details, err := s.containerSvc.GetContainerDetails(containerID)
	if err != nil {
		common.SendError(c, 500, "CONTAINER_DETAILS_ERROR", err.Error())
		return
	}

	common.SendSuccess(c, details)
}

// CreateContainer creates a new container
func (s *service) CreateContainer(c *gin.Context) {
	var req ContainerCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.SendError(c, 400, "INVALID_REQUEST", err.Error())
		return
	}

	container, err := s.containerSvc.CreateContainer(req)
	if err != nil {
		common.SendError(c, 500, "CONTAINER_CREATE_ERROR", err.Error())
		return
	}

	common.SendSuccess(c, gin.H{
		"container": container,
	})
}

// StartContainer starts a container
func (s *service) StartContainer(c *gin.Context) {
	containerID := c.Param("id")
	if containerID == "" {
		common.SendError(c, 400, "MISSING_CONTAINER_ID", "Container ID is required")
		return
	}

	if err := s.containerSvc.StartContainer(containerID); err != nil {
		common.SendError(c, 500, "CONTAINER_START_ERROR", err.Error())
		return
	}

	common.SendSuccess(c, gin.H{
		"message": fmt.Sprintf("Container %s started successfully", containerID),
	})
}

// StopContainer stops a container
func (s *service) StopContainer(c *gin.Context) {
	containerID := c.Param("id")
	if containerID == "" {
		common.SendError(c, 400, "MISSING_CONTAINER_ID", "Container ID is required")
		return
	}

	// Get timeout from request body or query
	timeout := 10 // default timeout
	if timeoutStr := c.Query("timeout"); timeoutStr != "" {
		if t, err := strconv.Atoi(timeoutStr); err == nil && t > 0 {
			timeout = t
		}
	}

	// Also check request body
	var req struct {
		Timeout int `json:"timeout"`
	}
	if c.ShouldBindJSON(&req) == nil && req.Timeout > 0 {
		timeout = req.Timeout
	}

	if err := s.containerSvc.StopContainer(containerID, timeout); err != nil {
		common.SendError(c, 500, "CONTAINER_STOP_ERROR", err.Error())
		return
	}

	common.SendSuccess(c, gin.H{
		"message": fmt.Sprintf("Container %s stopped successfully", containerID),
	})
}

// RestartContainer restarts a container
func (s *service) RestartContainer(c *gin.Context) {
	containerID := c.Param("id")
	if containerID == "" {
		common.SendError(c, 400, "MISSING_CONTAINER_ID", "Container ID is required")
		return
	}

	if err := s.containerSvc.RestartContainer(containerID); err != nil {
		common.SendError(c, 500, "CONTAINER_RESTART_ERROR", err.Error())
		return
	}

	common.SendSuccess(c, gin.H{
		"message": fmt.Sprintf("Container %s restarted successfully", containerID),
	})
}

// RemoveContainer removes a container
func (s *service) RemoveContainer(c *gin.Context) {
	containerID := c.Param("id")
	if containerID == "" {
		common.SendError(c, 400, "MISSING_CONTAINER_ID", "Container ID is required")
		return
	}

	if err := s.containerSvc.RemoveContainer(containerID); err != nil {
		common.SendError(c, 500, "CONTAINER_REMOVE_ERROR", err.Error())
		return
	}

	common.SendSuccess(c, gin.H{
		"message": fmt.Sprintf("Container %s removed successfully", containerID),
	})
}

// GetContainerLogs retrieves logs for a container
func (s *service) GetContainerLogs(c *gin.Context) {
	containerID := c.Param("id")
	if containerID == "" {
		common.SendError(c, 400, "MISSING_CONTAINER_ID", "Container ID is required")
		return
	}

	// Parse query parameters
	var options ContainerLogsRequest
	if follow := c.Query("follow"); follow == "true" {
		options.Follow = true
	}
	if tail := c.Query("tail"); tail != "" {
		if t, err := strconv.Atoi(tail); err == nil && t > 0 {
			options.Tail = t
		}
	}
	options.Since = c.Query("since")
	options.Until = c.Query("until")
	if timestamps := c.Query("timestamps"); timestamps == "true" {
		options.Timestamps = true
	}

	logs, err := s.containerSvc.GetContainerLogs(containerID, options)
	if err != nil {
		common.SendError(c, 500, "CONTAINER_LOGS_ERROR", err.Error())
		return
	}

	common.SendSuccess(c, gin.H{
		"logs": logs,
	})
}

// ListImages returns a list of all images
func (s *service) ListImages(c *gin.Context) {
	images, err := s.containerSvc.ListImages()
	if err != nil {
		common.SendError(c, 500, "IMAGE_LIST_ERROR", err.Error())
		return
	}

	common.SendSuccess(c, gin.H{
		"images": images,
	})
}

// GetImageDetails returns detailed information about an image
func (s *service) GetImageDetails(c *gin.Context) {
	imageID := c.Param("id")
	if imageID == "" {
		common.SendError(c, 400, "MISSING_IMAGE_ID", "Image ID is required")
		return
	}

	image, err := s.containerSvc.GetImageDetails(imageID)
	if err != nil {
		common.SendError(c, 500, "IMAGE_DETAILS_ERROR", err.Error())
		return
	}

	common.SendSuccess(c, gin.H{
		"image": image,
	})
}

// RemoveImage removes an image
func (s *service) RemoveImage(c *gin.Context) {
	imageID := c.Param("id")
	if imageID == "" {
		common.SendError(c, 400, "MISSING_IMAGE_ID", "Image ID is required")
		return
	}

	if err := s.containerSvc.RemoveImage(imageID); err != nil {
		common.SendError(c, 500, "IMAGE_REMOVE_ERROR", err.Error())
		return
	}

	common.SendSuccess(c, gin.H{
		"message": fmt.Sprintf("Image %s removed successfully", imageID),
	})
}

// PullImage pulls an image
func (s *service) PullImage(c *gin.Context) {
	var req ImagePullRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.SendError(c, 400, "INVALID_REQUEST", err.Error())
		return
	}

	if err := s.containerSvc.PullImage(req.Name); err != nil {
		common.SendError(c, 500, "IMAGE_PULL_ERROR", err.Error())
		return
	}

	common.SendSuccess(c, gin.H{
		"message": fmt.Sprintf("Image %s pulled successfully", req.Name),
	})
}

// mockContainerService is a mock implementation for development
type mockContainerService struct{}

func (m *mockContainerService) ListContainers() ([]Container, error) {
	return []Container{}, nil
}

func (m *mockContainerService) GetContainerDetails(containerID string) (*ContainerDetails, error) {
	return nil, fmt.Errorf("container service not available")
}

func (m *mockContainerService) CreateContainer(req ContainerCreateRequest) (*Container, error) {
	return nil, fmt.Errorf("container service not available")
}

func (m *mockContainerService) StartContainer(containerID string) error {
	return fmt.Errorf("container service not available")
}

func (m *mockContainerService) StopContainer(containerID string, timeout int) error {
	return fmt.Errorf("container service not available")
}

func (m *mockContainerService) RestartContainer(containerID string) error {
	return fmt.Errorf("container service not available")
}

func (m *mockContainerService) RemoveContainer(containerID string) error {
	return fmt.Errorf("container service not available")
}

func (m *mockContainerService) GetContainerLogs(containerID string, options ContainerLogsRequest) (string, error) {
	return "", fmt.Errorf("container service not available")
}

func (m *mockContainerService) ListImages() ([]ContainerImage, error) {
	return []ContainerImage{}, nil
}

func (m *mockContainerService) GetImageDetails(imageID string) (*ContainerImage, error) {
	return nil, fmt.Errorf("container service not available")
}

func (m *mockContainerService) RemoveImage(imageID string) error {
	return fmt.Errorf("container service not available")
}

func (m *mockContainerService) PullImage(imageName string) error {
	return fmt.Errorf("container service not available")
}
