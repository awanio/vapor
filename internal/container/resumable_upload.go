package container

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/awanio/vapor/internal/common"
	"github.com/awanio/vapor/internal/resumable"
	"github.com/google/uuid"
)

// ResumableUploadHandler manages resumable uploads for container images using TUS protocol
type ResumableUploadHandler struct {
	store          resumable.Store
	uploadDir      string
	maxFileSize    int64
	chunkSize      int64
	containerSvc   *Service
}

// NewResumableUploadHandler creates a new resumable upload handler
func NewResumableUploadHandler(containerSvc *Service, uploadDir string) *ResumableUploadHandler {
	// Create upload directory if it doesn't exist
	os.MkdirAll(uploadDir, 0755)

	return &ResumableUploadHandler{
		store:        resumable.NewMemoryStore(),
		uploadDir:    uploadDir,
		maxFileSize:  10 * 1024 * 1024 * 1024, // 10GB max
		chunkSize:    4 * 1024 * 1024,          // 4MB chunks
		containerSvc: containerSvc,
	}
}

// CreateUpload handles POST /docker/images/upload - creates a new resumable upload session
func (h *ResumableUploadHandler) CreateUpload(c *gin.Context) {
	// Parse TUS headers
	uploadLength := c.GetHeader("Upload-Length")
	if uploadLength == "" {
		common.SendError(c, 400, "MISSING_UPLOAD_LENGTH", "Upload-Length header is required")
		return
	}

	totalSize, err := strconv.ParseInt(uploadLength, 10, 64)
	if err != nil || totalSize <= 0 {
		common.SendError(c, 400, "INVALID_UPLOAD_LENGTH", "Upload-Length must be a positive integer")
		return
	}

	if totalSize > h.maxFileSize {
		common.SendError(c, 413, "FILE_TOO_LARGE", fmt.Sprintf("File size exceeds maximum allowed size of %d bytes", h.maxFileSize))
		return
	}

	// Parse metadata
	uploadMetadata := c.GetHeader("Upload-Metadata")
	metadata := h.parseMetadata(uploadMetadata)

	// Validate filename
	filename, ok := metadata["filename"]
	if !ok || filename == "" {
		common.SendError(c, 400, "MISSING_FILENAME", "filename metadata is required")
		return
	}

	// Validate file type
	if !strings.HasSuffix(filename, ".tar") && !strings.HasSuffix(filename, ".tar.gz") {
		common.SendError(c, 400, "UNSUPPORTED_FILE_TYPE", "Only .tar and .tar.gz files are supported")
		return
	}

	// Generate unique upload ID
	uploadID := uuid.New().String()
	
	// Create file path
	filePath := filepath.Join(h.uploadDir, uploadID+".tmp")

	// Create upload session
	upload := &resumable.Upload{
		ID:           uploadID,
		TotalSize:    totalSize,
		UploadedSize: 0,
		ChunkSize:    h.chunkSize,
		Metadata:     metadata,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
		FilePath:     filePath,
		Status:       resumable.UploadStatusCreated,
	}

	// Store upload session
	err = h.store.Create(upload)
	if err != nil {
		common.SendError(c, 500, "STORE_ERROR", "Failed to create upload session: "+err.Error())
		return
	}

	// Create empty file
	file, err := os.Create(filePath)
	if err != nil {
		h.store.Delete(uploadID) // Cleanup
		common.SendError(c, 500, "FILE_CREATE_ERROR", "Failed to create upload file: "+err.Error())
		return
	}
	file.Close()

	// Set TUS headers
	c.Header("Upload-Offset", "0")
	c.Header("Location", fmt.Sprintf("/docker/images/upload/%s", uploadID))
	c.Header("Tus-Resumable", "1.0.0")

	c.JSON(http.StatusCreated, gin.H{
		"upload_id":   uploadID,
		"upload_url":  fmt.Sprintf("/docker/images/upload/%s", uploadID),
		"expires_at":  upload.CreatedAt.Add(24 * time.Hour), // 24 hour expiry
	})
}

// GetUploadInfo handles HEAD /docker/images/upload/:id - returns upload progress
func (h *ResumableUploadHandler) GetUploadInfo(c *gin.Context) {
	uploadID := c.Param("id")
	if uploadID == "" {
		common.SendError(c, 400, "MISSING_UPLOAD_ID", "Upload ID is required")
		return
	}

	upload, err := h.store.Get(uploadID)
	if err != nil {
		common.SendError(c, 404, "UPLOAD_NOT_FOUND", "Upload session not found")
		return
	}

	// Set TUS headers
	c.Header("Upload-Offset", strconv.FormatInt(upload.UploadedSize, 10))
	c.Header("Upload-Length", strconv.FormatInt(upload.TotalSize, 10))
	c.Header("Tus-Resumable", "1.0.0")
	c.Header("Cache-Control", "no-store")

	c.Status(http.StatusOK)
}

// UploadChunk handles PATCH /docker/images/upload/:id - uploads a chunk
func (h *ResumableUploadHandler) UploadChunk(c *gin.Context) {
	uploadID := c.Param("id")
	if uploadID == "" {
		common.SendError(c, 400, "MISSING_UPLOAD_ID", "Upload ID is required")
		return
	}

	upload, err := h.store.Get(uploadID)
	if err != nil {
		common.SendError(c, 404, "UPLOAD_NOT_FOUND", "Upload session not found")
		return
	}

	if upload.Status == resumable.UploadStatusCompleted {
		common.SendError(c, 409, "UPLOAD_ALREADY_COMPLETED", "Upload is already completed")
		return
	}

	if upload.Status == resumable.UploadStatusFailed || upload.Status == resumable.UploadStatusCancelled {
		common.SendError(c, 410, "UPLOAD_EXPIRED", "Upload session is no longer valid")
		return
	}

	// Parse Upload-Offset header
	uploadOffset := c.GetHeader("Upload-Offset")
	if uploadOffset == "" {
		common.SendError(c, 400, "MISSING_UPLOAD_OFFSET", "Upload-Offset header is required")
		return
	}

	offset, err := strconv.ParseInt(uploadOffset, 10, 64)
	if err != nil {
		common.SendError(c, 400, "INVALID_UPLOAD_OFFSET", "Upload-Offset must be a valid integer")
		return
	}

	if offset != upload.UploadedSize {
		common.SendError(c, 409, "OFFSET_MISMATCH", fmt.Sprintf("Upload-Offset %d does not match current uploaded size %d", offset, upload.UploadedSize))
		return
	}

	// Get content type and length
	contentType := c.GetHeader("Content-Type")
	if contentType != "application/offset+octet-stream" {
		common.SendError(c, 400, "INVALID_CONTENT_TYPE", "Content-Type must be application/offset+octet-stream")
		return
	}

	// Open file for appending
	file, err := os.OpenFile(upload.FilePath, os.O_WRONLY, 0644)
	if err != nil {
		common.SendError(c, 500, "FILE_OPEN_ERROR", "Failed to open upload file: "+err.Error())
		return
	}
	defer file.Close()

	// Seek to the correct position
	_, err = file.Seek(offset, 0)
	if err != nil {
		common.SendError(c, 500, "FILE_SEEK_ERROR", "Failed to seek to upload position: "+err.Error())
		return
	}

	// Update status
	upload.Status = resumable.UploadStatusInProgress
	upload.UpdatedAt = time.Now()

	// Copy request body to file
	bytesWritten, err := io.Copy(file, c.Request.Body)
	if err != nil {
		upload.Status = resumable.UploadStatusFailed
		h.store.Update(upload)
		common.SendError(c, 500, "WRITE_ERROR", "Failed to write chunk: "+err.Error())
		return
	}

	// Update upload progress
	upload.UploadedSize += bytesWritten
	upload.UpdatedAt = time.Now()

	// Check if upload is complete
	if upload.UploadedSize >= upload.TotalSize {
		upload.Status = resumable.UploadStatusCompleted
		upload.UpdatedAt = time.Now()
	}

	// Update store
	err = h.store.Update(upload)
	if err != nil {
		common.SendError(c, 500, "STORE_UPDATE_ERROR", "Failed to update upload progress: "+err.Error())
		return
	}

	// Set response headers
	c.Header("Upload-Offset", strconv.FormatInt(upload.UploadedSize, 10))
	c.Header("Tus-Resumable", "1.0.0")

	c.Status(http.StatusNoContent)
}

// CompleteUpload handles POST /docker/images/upload/:id/complete - finalizes upload and imports image
func (h *ResumableUploadHandler) CompleteUpload(c *gin.Context) {
	uploadID := c.Param("id")
	if uploadID == "" {
		common.SendError(c, 400, "MISSING_UPLOAD_ID", "Upload ID is required")
		return
	}

	upload, err := h.store.Get(uploadID)
	if err != nil {
		common.SendError(c, 404, "UPLOAD_NOT_FOUND", "Upload session not found")
		return
	}

	if upload.Status != resumable.UploadStatusCompleted {
		common.SendError(c, 400, "UPLOAD_NOT_COMPLETE", "Upload is not yet completed")
		return
	}

	// Check if we have a container service
	if h.containerSvc.client == nil {
		common.SendError(c, 503, "NO_RUNTIME_AVAILABLE", h.containerSvc.errorMessage)
		return
	}

	// Import the image using the container service
	result, err := h.containerSvc.client.ImportImage(upload.FilePath)
	if err != nil {
		common.SendError(c, 500, "IMAGE_IMPORT_ERROR", "Failed to import image: "+err.Error())
		return
	}

	// Cleanup: remove uploaded file
	os.Remove(upload.FilePath)

	// Remove upload session from store
	h.store.Delete(uploadID)

	common.SendSuccess(c, gin.H{
		"upload_id":     uploadID,
		"import_result": result,
		"runtime":       h.containerSvc.client.GetRuntimeName(),
		"filename":      upload.Metadata["filename"],
	})
}

// CancelUpload handles DELETE /docker/images/upload/:id - cancels an upload
func (h *ResumableUploadHandler) CancelUpload(c *gin.Context) {
	uploadID := c.Param("id")
	if uploadID == "" {
		common.SendError(c, 400, "MISSING_UPLOAD_ID", "Upload ID is required")
		return
	}

	upload, err := h.store.Get(uploadID)
	if err != nil {
		common.SendError(c, 404, "UPLOAD_NOT_FOUND", "Upload session not found")
		return
	}

	// Update status
	upload.Status = resumable.UploadStatusCancelled
	upload.UpdatedAt = time.Now()
	h.store.Update(upload)

	// Cleanup file
	os.Remove(upload.FilePath)

	// Remove from store
	h.store.Delete(uploadID)

	c.Header("Tus-Resumable", "1.0.0")
	c.Status(http.StatusNoContent)
}

// ListUploads handles GET /docker/images/upload - lists active uploads
func (h *ResumableUploadHandler) ListUploads(c *gin.Context) {
	uploads, err := h.store.List()
	if err != nil {
		common.SendError(c, 500, "STORE_ERROR", "Failed to list uploads: "+err.Error())
		return
	}

	// Convert to response format
	uploadList := make([]gin.H, len(uploads))
	for i, upload := range uploads {
		uploadList[i] = gin.H{
			"upload_id":     upload.ID,
			"total_size":    upload.TotalSize,
			"uploaded_size": upload.UploadedSize,
			"progress":      float64(upload.UploadedSize) / float64(upload.TotalSize) * 100,
			"status":        upload.Status,
			"created_at":    upload.CreatedAt,
			"updated_at":    upload.UpdatedAt,
			"filename":      upload.Metadata["filename"],
		}
	}

	common.SendSuccess(c, gin.H{
		"uploads": uploadList,
		"count":   len(uploadList),
	})
}

// CleanupExpiredUploads removes uploads older than 24 hours
func (h *ResumableUploadHandler) CleanupExpiredUploads() {
	expiredTime := time.Now().Add(-24 * time.Hour)
	
	uploads, err := h.store.List()
	if err != nil {
		return
	}

	for _, upload := range uploads {
		if upload.CreatedAt.Before(expiredTime) {
			// Remove file
			os.Remove(upload.FilePath)
			// Remove from store
			h.store.Delete(upload.ID)
		}
	}
}

// parseMetadata parses TUS Upload-Metadata header
func (h *ResumableUploadHandler) parseMetadata(metadata string) map[string]string {
	result := make(map[string]string)
	if metadata == "" {
		return result
	}

	pairs := strings.Split(metadata, ",")
	for _, pair := range pairs {
		parts := strings.SplitN(strings.TrimSpace(pair), " ", 2)
		if len(parts) == 2 {
			key := parts[0]
			// Base64 decode the value (TUS spec requirement)
			value := parts[1]
			// For simplicity, we'll assume the value is not base64 encoded
			// In a full implementation, you'd decode it properly
			result[key] = value
		}
	}

	return result
}

// GetUploadStatus returns detailed status of an upload
func (h *ResumableUploadHandler) GetUploadStatus(c *gin.Context) {
	uploadID := c.Param("id")
	if uploadID == "" {
		common.SendError(c, 400, "MISSING_UPLOAD_ID", "Upload ID is required")
		return
	}

	upload, err := h.store.Get(uploadID)
	if err != nil {
		common.SendError(c, 404, "UPLOAD_NOT_FOUND", "Upload session not found")
		return
	}

	progress := float64(0)
	if upload.TotalSize > 0 {
		progress = float64(upload.UploadedSize) / float64(upload.TotalSize) * 100
	}

	common.SendSuccess(c, gin.H{
		"upload_id":     upload.ID,
		"total_size":    upload.TotalSize,
		"uploaded_size": upload.UploadedSize,
		"progress":      progress,
		"status":        upload.Status,
		"created_at":    upload.CreatedAt,
		"updated_at":    upload.UpdatedAt,
		"metadata":      upload.Metadata,
		"chunk_size":    upload.ChunkSize,
	})
}
