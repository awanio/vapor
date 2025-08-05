package resumable

import (
	"time"
)

// Upload represents a resumable upload session
type Upload struct {
	ID           string            `json:"id"`
	TotalSize    int64             `json:"total_size"`
	UploadedSize int64             `json:"uploaded_size"`
	ChunkSize    int64             `json:"chunk_size"`
	Metadata     map[string]string `json:"metadata"`
	CreatedAt    time.Time         `json:"created_at"`
	UpdatedAt    time.Time         `json:"updated_at"`
	FilePath     string            `json:"file_path"`
	Status       UploadStatus      `json:"status"`
}

// UploadStatus represents the status of an upload
type UploadStatus string

const (
	UploadStatusCreated    UploadStatus = "created"
	UploadStatusInProgress UploadStatus = "in_progress"
	UploadStatusCompleted  UploadStatus = "completed"
	UploadStatusFailed     UploadStatus = "failed"
	UploadStatusCancelled  UploadStatus = "cancelled"
)

// UploadRequest represents the request to create a new upload
type UploadRequest struct {
	Size     int64             `json:"size"`
	Metadata map[string]string `json:"metadata"`
}

// UploadResponse represents the response when creating an upload
type UploadResponse struct {
	ID       string `json:"id"`
	Location string `json:"location"`
}

// UploadInfo represents upload information for HEAD requests
type UploadInfo struct {
	ID           string            `json:"id"`
	TotalSize    int64             `json:"total_size"`
	UploadedSize int64             `json:"uploaded_size"`
	Metadata     map[string]string `json:"metadata"`
	Status       UploadStatus      `json:"status"`
}

// Store interface for upload persistence
type Store interface {
	Create(upload *Upload) error
	Get(id string) (*Upload, error)
	Update(upload *Upload) error
	Delete(id string) error
	List() ([]*Upload, error)
	Cleanup(olderThan time.Time) error
}

// Handler interface for resumable uploads
type Handler interface {
	CreateUpload(req *UploadRequest) (*UploadResponse, error)
	GetUploadInfo(id string) (*UploadInfo, error)
	WriteChunk(id string, offset int64, data []byte) error
	CompleteUpload(id string) (*Upload, error)
	CancelUpload(id string) error
}
