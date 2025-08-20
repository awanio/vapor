package libvirt

import (
	"encoding/base64"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/awanio/vapor/internal/common"
	"github.com/awanio/vapor/internal/resumable"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// ISOResumableUploadHandler manages resumable uploads for ISO images using TUS protocol
type ISOResumableUploadHandler struct {
	store       resumable.Store
	uploadDir   string
	maxFileSize int64
	chunkSize   int64
	service     *Service
}

// NewISOResumableUploadHandler creates a new resumable upload handler for ISOs
func NewISOResumableUploadHandler(service *Service, uploadDir string) *ISOResumableUploadHandler {
	// Create upload directory if it doesn't exist
	os.MkdirAll(uploadDir, 0755)

	// Create ISO directory in the default libvirt images location
	isoDir := filepath.Join("/var/lib/libvirt/images/iso")
	os.MkdirAll(isoDir, 0755)

	return &ISOResumableUploadHandler{
		store:       resumable.NewMemoryStore(),
		uploadDir:   uploadDir,
		maxFileSize: 10 * 1024 * 1024 * 1024, // 10GB max for ISOs
		chunkSize:   4 * 1024 * 1024,         // 4MB chunks
		service:     service,
	}
}

// CreateUpload handles POST /virtualization/storages/isos/upload - creates a new resumable upload session
func (h *ISOResumableUploadHandler) CreateUpload(c *gin.Context) {
	// Set TUS protocol headers for all responses
	h.setTUSHeaders(c)

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

	// Validate file type - must be an ISO file
	if !strings.HasSuffix(strings.ToLower(filename), ".iso") {
		common.SendError(c, 400, "UNSUPPORTED_FILE_TYPE", "Only .iso files are supported")
		return
	}

	// Extract additional ISO metadata if provided
	osType := metadata["os_type"]
	osVariant := metadata["os_variant"]
	architecture := metadata["architecture"]
	description := metadata["description"]

	// Generate unique upload ID
	uploadID := uuid.New().String()

	// Create file path in temp directory
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
	c.Header("Location", fmt.Sprintf("/virtualization/storages/isos/upload/%s", uploadID))
	c.Header("Tus-Resumable", "1.0.0")

	// Set expiration header
	expiresAt := upload.CreatedAt.Add(24 * time.Hour)
	c.Header("Upload-Expires", expiresAt.Format(time.RFC3339))

	// Return response with upload details
	response := gin.H{
		"upload_id":  uploadID,
		"upload_url": fmt.Sprintf("/virtualization/storages/isos/upload/%s", uploadID),
		"expires_at": expiresAt,
		"metadata": gin.H{
			"filename":     filename,
			"size":         totalSize,
			"os_type":      osType,
			"os_variant":   osVariant,
			"architecture": architecture,
			"description":  description,
		},
	}

	c.JSON(http.StatusCreated, response)
}

// GetUploadInfo handles HEAD /virtualization/storages/isos/upload/:id - returns upload progress
func (h *ISOResumableUploadHandler) GetUploadInfo(c *gin.Context) {
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

	// Set TUS protocol headers
	h.setTUSHeaders(c)

	// Set upload-specific headers
	c.Header("Upload-Offset", strconv.FormatInt(upload.UploadedSize, 10))
	c.Header("Upload-Length", strconv.FormatInt(upload.TotalSize, 10))
	c.Header("Cache-Control", "no-store")

	// Set expiration header
	expiresAt := upload.CreatedAt.Add(24 * time.Hour)
	c.Header("Upload-Expires", expiresAt.Format(time.RFC3339))

	// Add custom metadata headers
	if filename, ok := upload.Metadata["filename"]; ok {
		c.Header("Upload-Metadata", fmt.Sprintf("filename %s", base64Encode(filename)))
	}

	c.Status(http.StatusOK)
}

// UploadChunk handles PATCH /virtualization/storages/isos/upload/:id - uploads a chunk
func (h *ISOResumableUploadHandler) UploadChunk(c *gin.Context) {
	// Set TUS protocol headers
	h.setTUSHeaders(c)

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

	// Get content type
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

	// Set expiration header if upload is not complete
	if upload.Status != resumable.UploadStatusCompleted {
		expiresAt := upload.CreatedAt.Add(24 * time.Hour)
		c.Header("Upload-Expires", expiresAt.Format(time.RFC3339))
	}

	c.Status(http.StatusNoContent)
}

// CompleteUpload handles POST /virtualization/storages/isos/upload/:id/complete - finalizes upload and registers ISO
func (h *ISOResumableUploadHandler) CompleteUpload(c *gin.Context) {
	uploadID := c.Param("id")
	if uploadID == "" {
		common.SendError(c, 400, "MISSING_UPLOAD_ID", "Upload ID is required")
		return
	}

	upload, err := h.store.Get(uploadID)
	if err != nil {
		log.Printf("%v", err)
		common.SendError(c, 404, "UPLOAD_NOT_FOUND", "Upload session not found")
		return
	}

	if upload.Status != resumable.UploadStatusCompleted {
		common.SendError(c, 400, "UPLOAD_NOT_COMPLETE", fmt.Sprintf("Upload is not yet completed. Uploaded: %d/%d bytes", upload.UploadedSize, upload.TotalSize))
		return
	}

	// Extract metadata
	filename := upload.Metadata["filename"]
	osType := upload.Metadata["os_type"]
	osVariant := upload.Metadata["os_variant"]
	architecture := upload.Metadata["architecture"]
	description := upload.Metadata["description"]
	tags := upload.Metadata["tags"]

	// Generate final ISO path
	isoDir := filepath.Join("/var/lib/libvirt/images/iso")
	finalPath := filepath.Join(isoDir, filename)

	// Check if file already exists
	if _, err := os.Stat(finalPath); err == nil {
		// File exists, generate unique name
		timestamp := time.Now().Format("20060102-150405")
		nameWithoutExt := strings.TrimSuffix(filename, ".iso")
		filename = fmt.Sprintf("%s-%s.iso", nameWithoutExt, timestamp)
		finalPath = filepath.Join(isoDir, filename)
	}

	// Move file from temp to final location
	err = os.Rename(upload.FilePath, finalPath)
	if err != nil {
		// Try copying if rename fails (might be across filesystems)
		if err := h.copyFile(upload.FilePath, finalPath); err != nil {
			log.Printf("%v", err)
			common.SendError(c, 500, "FILE_MOVE_ERROR", "Failed to move ISO to final location: "+err.Error())
			return
		}

		log.Printf("%v", err)
		// Remove temp file after successful copy
		os.Remove(upload.FilePath)
	}

	// Set proper permissions
	os.Chmod(finalPath, 0644)

	// Register ISO in the database/service
	isoRequest := &ISOUploadRequest{
		Name:         strings.TrimSuffix(filename, ".iso"),
		Path:         finalPath,
		OSType:       osType,
		OSVariant:    osVariant,
		Architecture: architecture,
		Description:  description,
		Tags:         h.parseTags(tags),
	}

	// Register the ISO using the service
	iso, err := h.service.UploadISO(c.Request.Context(), isoRequest)
	if err != nil {
		// Clean up the file if registration fails
		log.Printf("%v", err)
		os.Remove(finalPath)
		common.SendError(c, 500, "ISO_REGISTER_ERROR", "Failed to register ISO: "+err.Error())
		return
	}

	// Remove upload session from store
	h.store.Delete(uploadID)

	common.SendSuccess(c, gin.H{
		"upload_id": uploadID,
		"iso":       iso,
		"message":   "ISO uploaded and registered successfully",
	})
}

// CancelUpload handles DELETE /virtualization/storages/isos/upload/:id - cancels an upload
func (h *ISOResumableUploadHandler) CancelUpload(c *gin.Context) {
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
	h.store.Update(upload)

	// Remove temporary file
	if upload.FilePath != "" {
		os.Remove(upload.FilePath)
	}

	// Remove from store
	h.store.Delete(uploadID)

	c.JSON(http.StatusOK, gin.H{
		"message":   "Upload cancelled successfully",
		"upload_id": uploadID,
	})
}

// GetUploadStatus handles GET /virtualization/storages/isos/upload/:id - gets upload status
func (h *ISOResumableUploadHandler) GetUploadStatus(c *gin.Context) {
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

	progress := float64(upload.UploadedSize) / float64(upload.TotalSize) * 100

	c.JSON(http.StatusOK, gin.H{
		"upload_id":     upload.ID,
		"status":        upload.Status,
		"total_size":    upload.TotalSize,
		"uploaded_size": upload.UploadedSize,
		"progress":      fmt.Sprintf("%.2f%%", progress),
		"metadata":      upload.Metadata,
		"created_at":    upload.CreatedAt,
		"updated_at":    upload.UpdatedAt,
		"expires_at":    upload.CreatedAt.Add(24 * time.Hour),
	})
}

// ListUploads handles GET /virtualization/storages/isos/upload - lists active upload sessions
func (h *ISOResumableUploadHandler) ListUploads(c *gin.Context) {
	uploads, err := h.store.List()
	if err != nil {
		common.SendError(c, 500, "LIST_ERROR", "Failed to list uploads: "+err.Error())
		return
	}

	// Filter to only ISO uploads and format response
	var isoUploads []gin.H
	for _, upload := range uploads {
		if filename, ok := upload.Metadata["filename"]; ok && strings.HasSuffix(filename, ".iso") {
			progress := float64(upload.UploadedSize) / float64(upload.TotalSize) * 100
			isoUploads = append(isoUploads, gin.H{
				"upload_id":     upload.ID,
				"filename":      filename,
				"status":        upload.Status,
				"progress":      fmt.Sprintf("%.2f%%", progress),
				"total_size":    upload.TotalSize,
				"uploaded_size": upload.UploadedSize,
				"created_at":    upload.CreatedAt,
				"expires_at":    upload.CreatedAt.Add(24 * time.Hour),
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"uploads": isoUploads,
		"count":   len(isoUploads),
	})
}

// Helper functions

func (h *ISOResumableUploadHandler) parseMetadata(header string) map[string]string {
	metadata := make(map[string]string)
	if header == "" {
		return metadata
	}

	pairs := strings.Split(header, ",")
	for _, pair := range pairs {
		parts := strings.SplitN(strings.TrimSpace(pair), " ", 2)
		if len(parts) == 2 {
			key := parts[0]
			value := base64Decode(parts[1])
			metadata[key] = value
		}
	}

	return metadata
}

func (h *ISOResumableUploadHandler) parseTags(tagsStr string) []string {
	if tagsStr == "" {
		return []string{}
	}
	return strings.Split(tagsStr, ",")
}

func (h *ISOResumableUploadHandler) copyFile(src, dst string) error {
	sourceFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer sourceFile.Close()

	destFile, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer destFile.Close()

	_, err = io.Copy(destFile, sourceFile)
	return err
}

func base64Encode(s string) string {
	return base64.StdEncoding.EncodeToString([]byte(s))
}

func base64Decode(s string) string {
	decoded, err := base64.StdEncoding.DecodeString(s)
	if err != nil {
		// Fallback to original string if decoding fails
		return s
	}
	return string(decoded)
}

// HandleOptions handles OPTIONS requests for TUS protocol discovery
func (h *ISOResumableUploadHandler) HandleOptions(c *gin.Context) {
	// Set TUS protocol discovery headers
	c.Header("Tus-Resumable", "1.0.0")
	c.Header("Tus-Version", "1.0.0")
	c.Header("Tus-Max-Size", strconv.FormatInt(h.maxFileSize, 10))
	c.Header("Tus-Extension", "creation,termination,expiration")

	// Set CORS headers for cross-origin support
	h.setCORSHeaders(c)

	c.Status(http.StatusNoContent)
}

// setTUSHeaders sets the standard TUS protocol headers
func (h *ISOResumableUploadHandler) setTUSHeaders(c *gin.Context) {
	c.Header("Tus-Resumable", "1.0.0")
	c.Header("Tus-Version", "1.0.0")
	c.Header("Tus-Max-Size", strconv.FormatInt(h.maxFileSize, 10))
	c.Header("Tus-Extension", "creation,termination,expiration")
}

// setCORSHeaders sets CORS headers for TUS protocol
func (h *ISOResumableUploadHandler) setCORSHeaders(c *gin.Context) {
	c.Header("Access-Control-Allow-Origin", "*")
	c.Header("Access-Control-Allow-Methods", "POST, GET, HEAD, PATCH, DELETE, OPTIONS")
	c.Header("Access-Control-Allow-Headers", "Content-Type, Upload-Length, Upload-Offset, Upload-Metadata, Tus-Resumable, Upload-Defer-Length, Upload-Checksum, Authorization")
	c.Header("Access-Control-Expose-Headers", "Upload-Offset, Upload-Length, Upload-Expires, Tus-Version, Tus-Resumable, Tus-Max-Size, Tus-Extension, Location")
	c.Header("Access-Control-Max-Age", "86400")
}
