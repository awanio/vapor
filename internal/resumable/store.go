package resumable

import (
	"fmt"
	"sync"
	"time"
)

// MemoryStore implements Store interface using in-memory storage
type MemoryStore struct {
	uploads map[string]*Upload
	mutex   sync.RWMutex
}

// NewMemoryStore creates a new in-memory store
func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		uploads: make(map[string]*Upload),
	}
}

// Create stores a new upload
func (s *MemoryStore) Create(upload *Upload) error {
	s.mutex.Lock()
	defer s.mutex.Unlock()
	
	if _, exists := s.uploads[upload.ID]; exists {
		return fmt.Errorf("upload with ID %s already exists", upload.ID)
	}
	
	s.uploads[upload.ID] = upload
	return nil
}

// Get retrieves an upload by ID
func (s *MemoryStore) Get(id string) (*Upload, error) {
	s.mutex.RLock()
	defer s.mutex.RUnlock()
	
	upload, exists := s.uploads[id]
	if !exists {
		return nil, fmt.Errorf("upload with ID %s not found", id)
	}
	
	// Return a copy to avoid race conditions
	uploadCopy := *upload
	return &uploadCopy, nil
}

// Update modifies an existing upload
func (s *MemoryStore) Update(upload *Upload) error {
	s.mutex.Lock()
	defer s.mutex.Unlock()
	
	if _, exists := s.uploads[upload.ID]; !exists {
		return fmt.Errorf("upload with ID %s not found", upload.ID)
	}
	
	upload.UpdatedAt = time.Now()
	s.uploads[upload.ID] = upload
	return nil
}

// Delete removes an upload
func (s *MemoryStore) Delete(id string) error {
	s.mutex.Lock()
	defer s.mutex.Unlock()
	
	if _, exists := s.uploads[id]; !exists {
		return fmt.Errorf("upload with ID %s not found", id)
	}
	
	delete(s.uploads, id)
	return nil
}

// List returns all uploads
func (s *MemoryStore) List() ([]*Upload, error) {
	s.mutex.RLock()
	defer s.mutex.RUnlock()
	
	uploads := make([]*Upload, 0, len(s.uploads))
	for _, upload := range s.uploads {
		uploadCopy := *upload
		uploads = append(uploads, &uploadCopy)
	}
	
	return uploads, nil
}

// Cleanup removes uploads older than the specified time
func (s *MemoryStore) Cleanup(olderThan time.Time) error {
	s.mutex.Lock()
	defer s.mutex.Unlock()
	
	for id, upload := range s.uploads {
		if upload.CreatedAt.Before(olderThan) {
			delete(s.uploads, id)
		}
	}
	
	return nil
}
