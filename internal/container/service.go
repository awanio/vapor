package container

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/awanio/vapor/internal/common"
	"github.com/gin-gonic/gin"
)

// Service manages CRI container operations
type Service struct {
	client       common.RuntimeClient
	errorMessage string
}

// NewService creates a new CRI container service
func NewService() (*Service, error) {
	// Try CRI connections only
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

	// All CRI connections failed - return a service that will show errors
	errorMsg := fmt.Sprintf("No CRI runtime found. Tried sockets: %v. Last error: %v", criSockets, lastError)
	log.Printf("Warning: %s", errorMsg)

	// Return a service with no client but with error message
	return &Service{
		client:       nil,
		errorMessage: errorMsg,
	}, nil
}

// SetClient sets the runtime client for the service
// This is useful for injecting a Docker runtime client or for testing
func (s *Service) SetClient(client common.RuntimeClient) {
	s.client = client
	if client != nil {
		s.errorMessage = ""
	}
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

// CreateContainer handles the POST /containers endpoint
func (s *Service) CreateContainer(c *gin.Context) {
	if s.client == nil {
		common.SendError(c, 503, "NO_RUNTIME_AVAILABLE", s.errorMessage)
		return
	}

	var req ContainerCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.SendError(c, 400, "INVALID_REQUEST", "Failed to decode request: "+err.Error())
		return
	}

	if strings.TrimSpace(req.Name) == "" || strings.TrimSpace(req.Image) == "" {
		common.SendError(c, 400, "INVALID_REQUEST", "Name and image are required")
		return
	}

	criClient, ok := s.client.(*CRIClient)
	if !ok {
		common.SendError(c, 400, "RUNTIME_UNSUPPORTED", "Container creation is only supported for CRI runtimes")
		return
	}

	containerID, sandboxID, err := criClient.CreateContainer(req)
	if err != nil {
		common.SendError(c, 500, "CONTAINER_CREATE_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusCreated, common.SuccessResponse(ContainerCreateResponse{
		ContainerID:  containerID,
		PodSandboxID: sandboxID,
		Message:      "Container created successfully",
		Success:      true,
	}))
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

// ImportImage handles the POST /images/import endpoint for uploading and importing container images
func (s *Service) ImportImage(c *gin.Context) {
	// Check if we have a runtime client
	if s.client == nil {
		common.SendError(c, 503, "NO_RUNTIME_AVAILABLE", s.errorMessage)
		return
	}

	// Parse multipart form
	file, header, err := c.Request.FormFile("image")
	if err != nil {
		common.SendError(c, 400, "INVALID_FILE", "Failed to get uploaded file: "+err.Error())
		return
	}
	defer file.Close()

	// Validate file extension
	filename := header.Filename
	if !strings.HasSuffix(filename, ".tar.gz") && !strings.HasSuffix(filename, ".tar") {
		common.SendError(c, 400, "INVALID_FILE_TYPE", "Only .tar.gz and .tar files are supported")
		return
	}

	// Create temporary file
	tempFile, err := os.CreateTemp("/tmp", "container-image-*.tar.gz")
	if err != nil {
		common.SendError(c, 500, "TEMP_FILE_ERROR", "Failed to create temporary file: "+err.Error())
		return
	}
	defer os.Remove(tempFile.Name())
	defer tempFile.Close()

	// Copy uploaded file to temporary file
	_, err = io.Copy(tempFile, file)
	if err != nil {
		common.SendError(c, 500, "FILE_COPY_ERROR", "Failed to save uploaded file: "+err.Error())
		return
	}

	// Import the image using the runtime client
	result, err := s.client.ImportImage(tempFile.Name())
	if err != nil {
		common.SendError(c, 500, "IMAGE_IMPORT_ERROR", err.Error())
		return
	}

	common.SendSuccess(c, gin.H{
		"import_result": result,
		"runtime":       s.client.GetRuntimeName(),
		"filename":      filename,
	})
}

// Close closes the runtime client connection
func (s *Service) Close() error {
	if s.client != nil {
		return s.client.Close()
	}
	return nil
}

// ImagePullRequest represents a request to pull an image
type ImagePullRequest struct {
Image string `json:"image" binding:"required"`
}

// PullImage handles the POST /containers/images/pull endpoint
func (s *Service) PullImage(c *gin.Context) {
// Check if we have a runtime client
if s.client == nil {
common.SendError(c, 503, "NO_RUNTIME_AVAILABLE", s.errorMessage)
return
}

var req ImagePullRequest
if err := c.ShouldBindJSON(&req); err != nil {
common.SendError(c, 400, "INVALID_REQUEST", "Failed to decode request: "+err.Error())
return
}

imageRef := strings.TrimSpace(req.Image)
if imageRef == "" {
common.SendError(c, 400, "INVALID_REQUEST", "image is required")
return
}

result, err := s.client.PullImage(imageRef)
if err != nil {
common.SendError(c, 500, "IMAGE_PULL_ERROR", err.Error())
return
}

common.SendSuccess(c, gin.H{
"image":   result.ImageRef,
"imageId": result.ImageID,
"size":    result.Size,
"runtime": result.Runtime,
"status":  result.Status,
"message": result.Message,
})
}

// RemoveImage handles the DELETE /containers/images/:id endpoint
func (s *Service) RemoveImage(c *gin.Context) {
// Check if we have a runtime client
if s.client == nil {
common.SendError(c, 503, "NO_RUNTIME_AVAILABLE", s.errorMessage)
return
}

imageID := c.Param("id")
if imageID == "" {
common.SendError(c, 400, "INVALID_REQUEST", "image ID is required")
return
}

err := s.client.RemoveImage(imageID)
if err != nil {
common.SendError(c, 500, "IMAGE_REMOVE_ERROR", err.Error())
return
}

common.SendSuccess(c, gin.H{
"imageId": imageID,
"message": "Image removed successfully",
"runtime": s.client.GetRuntimeName(),
})
}
