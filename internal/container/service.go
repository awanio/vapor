package container

import (
	"fmt"
	"io"
	"log"

	"github.com/gin-gonic/gin"
	"github.com/vapor/system-api/internal/common"
)

// Service is the main struct for our container logic.
type Service struct {
	executor ContainerRuntimeExecutor
}

// NewService is the factory function that dynamically creates the correct executor.
func NewService() (*Service, error) {
	// Attempt CRI Connections
	criSockets := []string{"/run/containerd/containerd.sock", "/var/run/crio/crio.sock"}
	for _, socket := range criSockets {
		executor, err := NewCriExecutor(socket)
		if err == nil {
			log.Printf("Connected to CRI using socket %s", socket)
			return &Service{executor: executor}, nil
		}
		log.Printf("Failed to connect to CRI using socket %s: %v", socket, err)
	}

	// Attempt Docker Connection
	dockerExecutor, err := NewDockerExecutor()
	if err == nil {
		log.Println("Connected to Docker daemon")
		return &Service{executor: dockerExecutor}, nil
	}

	return nil, fmt.Errorf("failed to find a supported container runtime")
}

// ListContainers returns a list of all containers
func (s *Service) ListContainers(c *gin.Context) {
	containers, err := s.executor.ListContainers(c.Request.Context())
	if err != nil {
		common.SendError(c, 500, "CONTAINER_LIST_ERROR", err.Error())
		return
	}
	
	common.SendSuccess(c, gin.H{
		"containers": containers,
	})
}

// GetContainerDetails returns detailed information about a container
func (s *Service) GetContainerDetails(c *gin.Context) {
	containerID := c.Param("id")
	if containerID == "" {
		common.SendError(c, 400, "MISSING_CONTAINER_ID", "Container ID is required")
		return
	}

	details, err := s.executor.GetContainerDetails(c.Request.Context(), containerID)
	if err != nil {
		common.SendError(c, 500, "CONTAINER_DETAILS_ERROR", err.Error())
		return
	}

	common.SendSuccess(c, details)
}

// CreateContainer creates a new container
func (s *Service) CreateContainer(c *gin.Context) {
	var req ContainerCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.SendError(c, 400, "INVALID_REQUEST", err.Error())
		return
	}

	// Convert request to ContainerConfig
	config := ContainerConfig{
		Name:        req.Name,
		Image:       req.Image,
		Command:     req.Command,
		Env:         req.Env,
		Ports:       req.Ports,
		Mounts:      req.Mounts,
		Labels:      req.Labels,
		Hostname:    req.Hostname,
		User:        req.User,
		WorkingDir:  req.WorkingDir,
		Privileged:  req.Privileged,
		NetworkMode: req.NetworkMode,
		Resources:   req.Resources,
	}

	containerInfo, err := s.executor.CreateContainer(c.Request.Context(), config)
	if err != nil {
		common.SendError(c, 500, "CONTAINER_CREATE_ERROR", err.Error())
		return
	}

	common.SendSuccess(c, gin.H{
		"container": containerInfo,
	})
}

// StartContainer starts a container
func (s *Service) StartContainer(c *gin.Context) {
	containerID := c.Param("id")
	if containerID == "" {
		common.SendError(c, 400, "MISSING_CONTAINER_ID", "Container ID is required")
		return
	}

	if err := s.executor.StartContainer(c.Request.Context(), containerID); err != nil {
		common.SendError(c, 500, "CONTAINER_START_ERROR", err.Error())
		return
	}

	common.SendSuccess(c, gin.H{
		"message": fmt.Sprintf("Container %s started successfully", containerID),
	})
}

// StopContainer stops a container
func (s *Service) StopContainer(c *gin.Context) {
	containerID := c.Param("id")
	if containerID == "" {
		common.SendError(c, 400, "MISSING_CONTAINER_ID", "Container ID is required")
		return
	}

	if err := s.executor.StopContainer(c.Request.Context(), containerID); err != nil {
		common.SendError(c, 500, "CONTAINER_STOP_ERROR", err.Error())
		return
	}

	common.SendSuccess(c, gin.H{
		"message": fmt.Sprintf("Container %s stopped successfully", containerID),
	})
}

// RestartContainer restarts a container
func (s *Service) RestartContainer(c *gin.Context) {
	containerID := c.Param("id")
	if containerID == "" {
		common.SendError(c, 400, "MISSING_CONTAINER_ID", "Container ID is required")
		return
	}

	if err := s.executor.RestartContainer(c.Request.Context(), containerID); err != nil {
		common.SendError(c, 500, "CONTAINER_RESTART_ERROR", err.Error())
		return
	}

	common.SendSuccess(c, gin.H{
		"message": fmt.Sprintf("Container %s restarted successfully", containerID),
	})
}

// RemoveContainer removes a container
func (s *Service) RemoveContainer(c *gin.Context) {
	containerID := c.Param("id")
	if containerID == "" {
		common.SendError(c, 400, "MISSING_CONTAINER_ID", "Container ID is required")
		return
	}

	if err := s.executor.RemoveContainer(c.Request.Context(), containerID); err != nil {
		common.SendError(c, 500, "CONTAINER_REMOVE_ERROR", err.Error())
		return
	}

	common.SendSuccess(c, gin.H{
		"message": fmt.Sprintf("Container %s removed successfully", containerID),
	})
}

// GetContainerLogs retrieves logs for a container
func (s *Service) GetContainerLogs(c *gin.Context) {
	containerID := c.Param("id")
	if containerID == "" {
		common.SendError(c, 400, "MISSING_CONTAINER_ID", "Container ID is required")
		return
	}

	logReader, err := s.executor.GetContainerLogs(c.Request.Context(), containerID)
	if err != nil {
		common.SendError(c, 500, "CONTAINER_LOGS_ERROR", err.Error())
		return
	}

	// Read logs from the reader
	logs, err := io.ReadAll(logReader)
	if err != nil {
		common.SendError(c, 500, "CONTAINER_LOGS_ERROR", err.Error())
		return
	}

	common.SendSuccess(c, gin.H{
		"logs": string(logs),
	})
}

// ListImages returns a list of all images
func (s *Service) ListImages(c *gin.Context) {
	images, err := s.executor.ListImages(c.Request.Context())
	if err != nil {
		common.SendError(c, 500, "IMAGE_LIST_ERROR", err.Error())
		return
	}

	common.SendSuccess(c, gin.H{
		"images": images,
	})
}

// GetImageDetails returns detailed information about an image
func (s *Service) GetImageDetails(c *gin.Context) {
	imageID := c.Param("id")
	if imageID == "" {
		common.SendError(c, 400, "MISSING_IMAGE_ID", "Image ID is required")
		return
	}

	image, err := s.executor.GetImageDetails(c.Request.Context(), imageID)
	if err != nil {
		common.SendError(c, 500, "IMAGE_DETAILS_ERROR", err.Error())
		return
	}

	common.SendSuccess(c, gin.H{
		"image": image,
	})
}

// RemoveImage removes an image
func (s *Service) RemoveImage(c *gin.Context) {
	imageID := c.Param("id")
	if imageID == "" {
		common.SendError(c, 400, "MISSING_IMAGE_ID", "Image ID is required")
		return
	}

	if err := s.executor.RemoveImage(c.Request.Context(), imageID); err != nil {
		common.SendError(c, 500, "IMAGE_REMOVE_ERROR", err.Error())
		return
	}

	common.SendSuccess(c, gin.H{
		"message": fmt.Sprintf("Image %s removed successfully", imageID),
	})
}

// PullImage pulls an image
func (s *Service) PullImage(c *gin.Context) {
	var req ImagePullRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.SendError(c, 400, "INVALID_REQUEST", err.Error())
		return
	}

	if err := s.executor.PullImage(c.Request.Context(), req.Name); err != nil {
		common.SendError(c, 500, "IMAGE_PULL_ERROR", err.Error())
		return
	}

	common.SendSuccess(c, gin.H{
		"message": fmt.Sprintf("Image %s pulled successfully", req.Name),
	})
}
