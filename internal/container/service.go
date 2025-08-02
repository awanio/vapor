package container

import (
	"fmt"
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/vapor/system-api/internal/common"
)

// Service manages container operations
type Service struct {
	client RuntimeClient
	errorMessage string
}

// NewService creates a new container service by attempting connections in order
func NewService() (*Service, error) {
	// Try CRI connections first
	criSockets := []string{
		"/run/containerd/containerd.sock",
		"/var/run/crio/crio.sock",
	}

	var lastError error
	for _, socket := range criSockets {
		// Check if socket exists
		if _, err := os.Stat(socket); err == nil {
			log.Printf("Attempting CRI connection to %s...", socket)
			client, err := NewCRIClient(socket)
			if err == nil {
				log.Printf("Successfully connected to %s runtime via CRI", client.GetRuntimeName())
				return &Service{client: client}, nil
			}
			lastError = err
			log.Printf("Failed to connect to CRI socket %s: %v", socket, err)
		}
	}

	// Try Docker connection
	log.Println("Attempting Docker connection...")
	dockerClient, err := NewDockerClient()
	if err == nil {
		log.Println("Successfully connected to Docker engine")
		return &Service{client: dockerClient}, nil
	}
	lastError = err
	log.Printf("Failed to connect to Docker: %v", err)

	// All connections failed - return a service that will show errors
	errorMsg := fmt.Sprintf("No container runtime found. Tried CRI sockets (%v) and Docker. Last error: %v", criSockets, lastError)
	log.Printf("Warning: %s", errorMsg)
	
	// Return a service with no client but with error message
	return &Service{
		client:       nil,
		errorMessage: errorMsg,
	}, nil
}

// ListContainers handles the GET /containers endpoint
func (s *Service) ListContainers(c *gin.Context) {
	// Check if we have a runtime client
	if s.client == nil {
		common.SendError(c, 503, "NO_RUNTIME_AVAILABLE", s.errorMessage)
		return
	}

	containers, err := s.client.ListContainers()
	if err != nil {
		common.SendError(c, 500, "CONTAINER_LIST_ERROR", err.Error())
		return
	}

	common.SendSuccess(c, gin.H{
		"containers": containers,
		"runtime":    s.client.GetRuntimeName(),
		"count":      len(containers),
	})
}

// ListImages handles the GET /images endpoint
func (s *Service) ListImages(c *gin.Context) {
	// Check if we have a runtime client
	if s.client == nil {
		common.SendError(c, 503, "NO_RUNTIME_AVAILABLE", s.errorMessage)
		return
	}

	images, err := s.client.ListImages()
	if err != nil {
		common.SendError(c, 500, "IMAGE_LIST_ERROR", err.Error())
		return
	}

	common.SendSuccess(c, gin.H{
		"images":  images,
		"runtime": s.client.GetRuntimeName(),
		"count":   len(images),
	})
}

// GetContainer handles the GET /containers/:id endpoint
func (s *Service) GetContainer(c *gin.Context) {
	// Check if we have a runtime client
	if s.client == nil {
		common.SendError(c, 503, "NO_RUNTIME_AVAILABLE", s.errorMessage)
		return
	}

	id := c.Param("id")
	if id == "" {
		common.SendError(c, 400, "INVALID_ID", "Container ID is required")
		return
	}

	container, err := s.client.GetContainer(id)
	if err != nil {
		common.SendError(c, 500, "CONTAINER_GET_ERROR", err.Error())
		return
	}

	common.SendSuccess(c, gin.H{
		"container": container,
		"runtime":   s.client.GetRuntimeName(),
	})
}

// GetImage handles the GET /images/:id endpoint
func (s *Service) GetImage(c *gin.Context) {
	// Check if we have a runtime client
	if s.client == nil {
		common.SendError(c, 503, "NO_RUNTIME_AVAILABLE", s.errorMessage)
		return
	}

	id := c.Param("id")
	if id == "" {
		common.SendError(c, 400, "INVALID_ID", "Image ID is required")
		return
	}

	image, err := s.client.GetImage(id)
	if err != nil {
		common.SendError(c, 500, "IMAGE_GET_ERROR", err.Error())
		return
	}

	common.SendSuccess(c, gin.H{
		"image":   image,
		"runtime": s.client.GetRuntimeName(),
	})
}

// GetContainerLogs handles the GET /containers/:id/logs endpoint
func (s *Service) GetContainerLogs(c *gin.Context) {
	// Check if we have a runtime client
	if s.client == nil {
		common.SendError(c, 503, "NO_RUNTIME_AVAILABLE", s.errorMessage)
		return
	}

	id := c.Param("id")
	if id == "" {
		common.SendError(c, 400, "INVALID_ID", "Container ID is required")
		return
	}

	logs, err := s.client.GetContainerLogs(id)
	if err != nil {
		common.SendError(c, 500, "CONTAINER_LOGS_ERROR", err.Error())
		return
	}

	common.SendSuccess(c, gin.H{
		"container_id": id,
		"logs":         logs,
		"runtime":      s.client.GetRuntimeName(),
	})
}

// Close closes the runtime client connection
func (s *Service) Close() error {
	if s.client != nil {
		return s.client.Close()
	}
	return nil
}
