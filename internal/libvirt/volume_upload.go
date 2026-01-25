package libvirt

import (
	"encoding/xml"
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

// VolumeResumableUploadHandler manages resumable uploads for storage volumes using TUS protocol
type VolumeResumableUploadHandler struct {
	store       resumable.Store
	uploadDir   string
	maxFileSize int64
	chunkSize   int64
	service     *Service
}

// NewVolumeResumableUploadHandler creates a new resumable upload handler for volumes
func NewVolumeResumableUploadHandler(service *Service, uploadDir string) *VolumeResumableUploadHandler {
	// Create upload directory if it doesn't exist
	os.MkdirAll(uploadDir, 0755)

	return &VolumeResumableUploadHandler{
		store:       resumable.NewMemoryStore(),
		uploadDir:   uploadDir,
		maxFileSize: 500 * 1024 * 1024 * 1024, // 500GB max for volumes
		chunkSize:   4 * 1024 * 1024,          // 4MB chunks
		service:     service,
	}
}

// CreateUpload handles POST /virtualization/volumes/upload
func (h *VolumeResumableUploadHandler) CreateUpload(c *gin.Context) {
	h.setTUSHeaders(c)

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

	uploadMetadata := c.GetHeader("Upload-Metadata")
	metadata := h.parseMetadata(uploadMetadata)

	filename, ok := metadata["filename"]
	if !ok || filename == "" {
		common.SendError(c, 400, "MISSING_FILENAME", "filename metadata is required")
		return
	}

	poolName := metadata["pool_name"]
	if poolName == "" {
		poolName = "default"
	}
	metadata["pool_name"] = poolName

	// Validate pool (only support dir/fs/netfs for now)
	if h.service != nil && h.service.conn != nil {
		if _, err := h.service.resolvePoolPath(poolName); err != nil {
			common.SendError(c, 400, "INVALID_STORAGE_POOL", "Invalid storage pool for volume upload: "+err.Error())
			return
		}
	}

	uploadID := uuid.New().String()
	filePath := filepath.Join(h.uploadDir, uploadID+".tmp")

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

	if err := h.store.Create(upload); err != nil {
		common.SendError(c, 500, "STORE_ERROR", "Failed to create upload session: "+err.Error())
		return
	}

	file, err := os.Create(filePath)
	if err != nil {
		h.store.Delete(uploadID)
		common.SendError(c, 500, "FILE_CREATE_ERROR", "Failed to create upload file: "+err.Error())
		return
	}
	file.Close()

	c.Header("Upload-Offset", "0")
	c.Header("Location", fmt.Sprintf("/virtualization/volumes/upload/%s", uploadID))
	c.Header("Tus-Resumable", "1.0.0")

	expiresAt := upload.CreatedAt.Add(24 * time.Hour)
	c.Header("Upload-Expires", expiresAt.Format(time.RFC3339))

	c.JSON(http.StatusCreated, gin.H{
		"upload_id":  uploadID,
		"upload_url": fmt.Sprintf("/virtualization/volumes/upload/%s", uploadID),
		"expires_at": expiresAt,
		"metadata":   metadata,
	})
}

// GetUploadInfo handles HEAD /virtualization/volumes/upload/:id
func (h *VolumeResumableUploadHandler) GetUploadInfo(c *gin.Context) {
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

	h.setTUSHeaders(c)
	c.Header("Upload-Offset", strconv.FormatInt(upload.UploadedSize, 10))
	c.Header("Upload-Length", strconv.FormatInt(upload.TotalSize, 10))
	c.Header("Cache-Control", "no-store")

	expiresAt := upload.CreatedAt.Add(24 * time.Hour)
	c.Header("Upload-Expires", expiresAt.Format(time.RFC3339))

	if filename, ok := upload.Metadata["filename"]; ok {
		c.Header("Upload-Metadata", fmt.Sprintf("filename %s", base64Encode(filename)))
	}

	c.Status(http.StatusOK)
}

// UploadChunk handles PATCH /virtualization/volumes/upload/:id
func (h *VolumeResumableUploadHandler) UploadChunk(c *gin.Context) {
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

	contentType := c.GetHeader("Content-Type")
	if contentType != "application/offset+octet-stream" {
		common.SendError(c, 400, "INVALID_CONTENT_TYPE", "Content-Type must be application/offset+octet-stream")
		return
	}

	file, err := os.OpenFile(upload.FilePath, os.O_WRONLY, 0644)
	if err != nil {
		common.SendError(c, 500, "FILE_OPEN_ERROR", "Failed to open upload file: "+err.Error())
		return
	}
	defer file.Close()

	if _, err = file.Seek(offset, 0); err != nil {
		common.SendError(c, 500, "FILE_SEEK_ERROR", "Failed to seek to upload position: "+err.Error())
		return
	}

	upload.Status = resumable.UploadStatusInProgress
	upload.UpdatedAt = time.Now()

	bytesWritten, err := io.Copy(file, c.Request.Body)
	if err != nil {
		upload.Status = resumable.UploadStatusFailed
		h.store.Update(upload)
		common.SendError(c, 500, "WRITE_ERROR", "Failed to write chunk: "+err.Error())
		return
	}

	upload.UploadedSize += bytesWritten
	upload.UpdatedAt = time.Now()

	if upload.UploadedSize >= upload.TotalSize {
		upload.Status = resumable.UploadStatusCompleted
	}

	if err := h.store.Update(upload); err != nil {
		common.SendError(c, 500, "STORE_UPDATE_ERROR", "Failed to update upload progress: "+err.Error())
		return
	}

	c.Header("Upload-Offset", strconv.FormatInt(upload.UploadedSize, 10))

	if upload.Status != resumable.UploadStatusCompleted {
		expiresAt := upload.CreatedAt.Add(24 * time.Hour)
		c.Header("Upload-Expires", expiresAt.Format(time.RFC3339))
	}

	c.Status(http.StatusNoContent)
}

// CompleteUpload handles POST /virtualization/volumes/upload/:id/complete
func (h *VolumeResumableUploadHandler) CompleteUpload(c *gin.Context) {
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

	filename := upload.Metadata["filename"]
	poolName := upload.Metadata["pool_name"]

	// Resolve target directory
	poolPath, err := h.service.resolvePoolPath(poolName)
	if err != nil {
		common.SendError(c, 400, "INVALID_STORAGE_POOL", "Invalid storage pool: "+err.Error())
		return
	}

	// Simple sanitization for filename
	filename = filepath.Base(filename)
	finalPath := filepath.Join(poolPath, filename)

	if _, err := os.Stat(finalPath); err == nil {
		// Collision check
		common.SendError(c, 409, "VOLUME_ALREADY_EXISTS", fmt.Sprintf("Volume '%s' already exists", filename))
		return
	}

	// Move file
	if err := os.Rename(upload.FilePath, finalPath); err != nil {
		// Fallback to copy
		if copyErr := h.copyFile(upload.FilePath, finalPath); copyErr != nil {
			common.SendError(c, 500, "FILE_MOVE_ERROR", "Failed to move volume file: "+copyErr.Error())
			return
		}
		os.Remove(upload.FilePath)
	}

	os.Chmod(finalPath, 0644)

	// Refresh pool to discover the new volume
	if err := h.service.RefreshStoragePool(c.Request.Context(), poolName); err != nil {
		// Log warning but don't fail, volume exists on disk
		log.Printf("Warning: failed to refresh pool %s: %v", poolName, err)
	}

	h.store.Delete(uploadID)

	common.SendSuccess(c, gin.H{
		"message":   "Volume uploaded successfully",
		"pool_name": poolName,
		"filename":  filename,
		"path":      finalPath,
	})
}

// CancelUpload handles DELETE
func (h *VolumeResumableUploadHandler) CancelUpload(c *gin.Context) {
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

	upload.Status = resumable.UploadStatusCancelled
	h.store.Update(upload)
	if upload.FilePath != "" {
		os.Remove(upload.FilePath)
	}
	h.store.Delete(uploadID)

	c.JSON(http.StatusOK, gin.H{"message": "Upload cancelled successfully"})
}

// GetUploadStatus handles GET /status
func (h *VolumeResumableUploadHandler) GetUploadStatus(c *gin.Context) {
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
	})
}

// ListUploads handles GET /
func (h *VolumeResumableUploadHandler) ListUploads(c *gin.Context) {
	uploads, err := h.store.List()
	if err != nil {
		common.SendError(c, 500, "LIST_ERROR", "Failed to list uploads: "+err.Error())
		return
	}
	// Filter for volumes? Shared store or specific?
	// Assuming this handler instance uses its own memory store or filtered by prefix if using shared DB (not implemented here)
	// Just return all
	c.JSON(http.StatusOK, gin.H{"uploads": uploads, "count": len(uploads)})
}

// HandleOptions handles OPTIONS
func (h *VolumeResumableUploadHandler) HandleOptions(c *gin.Context) {
	c.Header("Tus-Resumable", "1.0.0")
	c.Header("Tus-Version", "1.0.0")
	c.Header("Tus-Max-Size", strconv.FormatInt(h.maxFileSize, 10))
	c.Header("Tus-Extension", "creation,termination,expiration")
	h.setCORSHeaders(c)
	c.Status(http.StatusNoContent)
}

func (h *VolumeResumableUploadHandler) setTUSHeaders(c *gin.Context) {
	c.Header("Tus-Resumable", "1.0.0")
	c.Header("Tus-Version", "1.0.0")
	c.Header("Tus-Max-Size", strconv.FormatInt(h.maxFileSize, 10))
	c.Header("Tus-Extension", "creation,termination,expiration")
}

func (h *VolumeResumableUploadHandler) setCORSHeaders(c *gin.Context) {
	c.Header("Access-Control-Allow-Origin", "*")
	c.Header("Access-Control-Allow-Methods", "POST, GET, HEAD, PATCH, DELETE, OPTIONS")
	c.Header("Access-Control-Allow-Headers", "Content-Type, Upload-Length, Upload-Offset, Upload-Metadata, Tus-Resumable, Upload-Defer-Length, Upload-Checksum, Authorization")
	c.Header("Access-Control-Expose-Headers", "Upload-Offset, Upload-Length, Upload-Expires, Tus-Version, Tus-Resumable, Tus-Max-Size, Tus-Extension, Location")
	c.Header("Access-Control-Max-Age", "86400")
}

func (h *VolumeResumableUploadHandler) parseMetadata(header string) map[string]string {
	metadata := make(map[string]string)
	if header == "" {
		return metadata
	}
	pairs := strings.Split(header, ",")
	for _, pair := range pairs {
		parts := strings.SplitN(strings.TrimSpace(pair), " ", 2)
		if len(parts) == 2 {
			metadata[parts[0]] = base64Decode(parts[1])
		}
	}
	return metadata
}

func (h *VolumeResumableUploadHandler) copyFile(src, dst string) error {
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



// resolvePoolPath resolves the directory path for a pool
func (s *Service) resolvePoolPath(poolName string) (string, error) {
	if poolName == "" {
		poolName = "default"
	}
	if s == nil || s.conn == nil {
		if poolName == "default" {
			return "/var/lib/libvirt/images", nil
		}
		return "", fmt.Errorf("libvirt connection not available")
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

	pool, err := s.conn.LookupStoragePoolByName(poolName)
	if err != nil {
		return "", fmt.Errorf("storage pool %q not found: %w", poolName, err)
	}
	defer pool.Free()

	xmlDesc, err := pool.GetXMLDesc(0)
	if err != nil {
		return "", fmt.Errorf("failed to get pool XML: %w", err)
	}

	var poolXML struct {
		Type   string `xml:"type,attr"`
		Target struct {
			Path string `xml:"path"`
		} `xml:"target"`
	}
	if err := xml.Unmarshal([]byte(xmlDesc), &poolXML); err != nil {
		return "", fmt.Errorf("failed to parse pool XML: %w", err)
	}

	switch poolXML.Type {
	case "dir", "fs", "netfs":
		return poolXML.Target.Path, nil
	default:
		return "", fmt.Errorf("unsupported storage pool type %q for direct upload", poolXML.Type)
	}
}


