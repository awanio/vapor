package docker

import (
	"os"
	"path/filepath"
	"strconv"

	"github.com/awanio/vapor/internal/common"
	"github.com/awanio/vapor/internal/container"
	"github.com/gin-gonic/gin"
)

// ResumableUploadHandler wraps the container upload handler for Docker
type ResumableUploadHandler struct {
	containerHandler *container.ResumableUploadHandler
}

// NewResumableUploadHandler creates a new Docker resumable upload handler
func NewResumableUploadHandler(dockerService *ServiceWithRuntimeClient, uploadDir string) *ResumableUploadHandler {
	// Create upload directory if it doesn't exist
	os.MkdirAll(uploadDir, 0755)

	// Create a container service wrapper that uses the Docker runtime client
	containerSvc := &container.Service{}
	if dockerService != nil && dockerService.runtimeClient != nil {
		containerSvc.SetClient(dockerService.runtimeClient)
	}

	// Create container handler with Docker's upload directory
	containerHandler := container.NewResumableUploadHandler(containerSvc, uploadDir)

	return &ResumableUploadHandler{
		containerHandler: containerHandler,
	}
}

// CreateUpload handles POST /docker/images/upload - creates a new resumable upload session
func (h *ResumableUploadHandler) CreateUpload(c *gin.Context) {
	h.containerHandler.CreateUpload(c)
}

// GetUploadInfo handles HEAD /docker/images/upload/:id - returns upload progress
func (h *ResumableUploadHandler) GetUploadInfo(c *gin.Context) {
	h.containerHandler.GetUploadInfo(c)
}

// UploadChunk handles PATCH /docker/images/upload/:id - uploads a chunk
func (h *ResumableUploadHandler) UploadChunk(c *gin.Context) {
	h.containerHandler.UploadChunk(c)
}

// CompleteUpload handles POST /docker/images/upload/:id/complete - finalizes upload and imports image
func (h *ResumableUploadHandler) CompleteUpload(c *gin.Context) {
	h.containerHandler.CompleteUpload(c)
}

// CancelUpload handles DELETE /docker/images/upload/:id - cancels an upload
func (h *ResumableUploadHandler) CancelUpload(c *gin.Context) {
	h.containerHandler.CancelUpload(c)
}

// ListUploads handles GET /docker/images/upload - lists active uploads
func (h *ResumableUploadHandler) ListUploads(c *gin.Context) {
	h.containerHandler.ListUploads(c)
}

// GetUploadStatus returns detailed status of an upload
func (h *ResumableUploadHandler) GetUploadStatus(c *gin.Context) {
	h.containerHandler.GetUploadStatus(c)
}

// HandleOptions handles OPTIONS requests for TUS protocol discovery
func (h *ResumableUploadHandler) HandleOptions(c *gin.Context) {
	h.containerHandler.HandleOptions(c)
}
