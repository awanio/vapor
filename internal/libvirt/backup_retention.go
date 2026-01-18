package libvirt

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"
)

// BackupRetentionConfig holds configuration for backup retention cleanup
type BackupRetentionConfig struct {
	// CheckInterval is how often to check for expired backups (default: 1 hour)
	CheckInterval time.Duration
	// DryRun if true, only logs what would be deleted without actually deleting
	DryRun bool
}

// DefaultBackupRetentionConfig returns the default retention configuration
func DefaultBackupRetentionConfig() BackupRetentionConfig {
	return BackupRetentionConfig{
		CheckInterval: 1 * time.Hour,
		DryRun:        false,
	}
}

// backupRetentionJob holds state for the retention cleanup background job
type backupRetentionJob struct {
	service  *Service
	config   BackupRetentionConfig
	stopChan chan struct{}
	doneChan chan struct{}
}

// StartBackupRetentionJob starts a background goroutine that periodically
// cleans up expired backups based on their retention_days setting.
// Returns a stop function that should be called to gracefully stop the job.
func (s *Service) StartBackupRetentionJob(config BackupRetentionConfig) func() {
	job := &backupRetentionJob{
		service:  s,
		config:   config,
		stopChan: make(chan struct{}),
		doneChan: make(chan struct{}),
	}

	go job.run()

	return func() {
		close(job.stopChan)
		<-job.doneChan
	}
}

func (j *backupRetentionJob) run() {
	defer close(j.doneChan)

	// Run immediately on startup
	j.cleanupExpiredBackups()

	ticker := time.NewTicker(j.config.CheckInterval)
	defer ticker.Stop()

	for {
		select {
		case <-j.stopChan:
			log.Println("[BackupRetention] Stopping backup retention cleanup job")
			return
		case <-ticker.C:
			j.cleanupExpiredBackups()
		}
	}
}

func (j *backupRetentionJob) cleanupExpiredBackups() {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	expired, err := j.service.GetExpiredBackups(ctx)
	if err != nil {
		log.Printf("[BackupRetention] Error getting expired backups: %v", err)
		return
	}

	if len(expired) == 0 {
		return
	}

	log.Printf("[BackupRetention] Found %d expired backup(s) to clean up", len(expired))

	for _, backup := range expired {
		if j.config.DryRun {
			log.Printf("[BackupRetention] [DRY-RUN] Would delete backup %s (VM: %s, created: %s, retention: %d days)",
				backup.ID, backup.VMName, backup.StartedAt.Format(time.RFC3339), backup.Retention)
			continue
		}

		log.Printf("[BackupRetention] Deleting expired backup %s (VM: %s, created: %s, retention: %d days)",
			backup.ID, backup.VMName, backup.StartedAt.Format(time.RFC3339), backup.Retention)

		if err := j.service.DeleteBackupWithContext(ctx, backup.ID); err != nil {
			log.Printf("[BackupRetention] Error deleting backup %s: %v", backup.ID, err)
		} else {
			log.Printf("[BackupRetention] Successfully deleted expired backup %s", backup.ID)
		}
	}
}

// GetExpiredBackups returns all backups that have exceeded their retention period
func (s *Service) GetExpiredBackups(ctx context.Context) ([]VMBackup, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.db == nil {
		return nil, fmt.Errorf("database is not configured")
	}

	// Query backups where:
	// - retention_days > 0 (retention is set)
	// - status is 'completed'
	// - started_at + retention_days < NOW()
	query := `
SELECT id, vm_uuid, vm_name, type, status, destination_path, size_bytes, 
       compression, encryption, parent_backup_id, started_at, completed_at, 
       error_message, retention_days, metadata
FROM vm_backups 
WHERE status = ? 
  AND retention_days > 0 
  AND datetime(started_at, '+' || retention_days || ' days') < datetime('now')
ORDER BY started_at ASC
`

	rows, err := s.db.QueryContext(ctx, query, BackupStatusCompleted)
	if err != nil {
		return nil, fmt.Errorf("failed to query expired backups: %w", err)
	}
	defer rows.Close()

	var backups []VMBackup
	for rows.Next() {
		var b VMBackup
		var completedAt backupNullTime
		var parentID backupNullString
		var errMsg backupNullString
		var metadata backupNullString

		if err := rows.Scan(
			&b.ID, &b.VMUUID, &b.VMName, &b.Type, &b.Status, &b.DestinationPath,
			&b.SizeBytes, &b.Compression, &b.Encryption, &parentID, &b.StartedAt,
			&completedAt, &errMsg, &b.Retention, &metadata,
		); err != nil {
			return nil, fmt.Errorf("failed to scan backup row: %w", err)
		}

		if completedAt.Valid {
			b.CompletedAt = &completedAt.Time
		}
		if parentID.Valid {
			b.ParentBackupID = parentID.String
		}
		if errMsg.Valid {
			b.ErrorMessage = errMsg.String
		}

		backups = append(backups, b)
	}

	return backups, nil
}

// DeleteBackupWithContext deletes a backup with context support (for use by retention job)
func (s *Service) DeleteBackupWithContext(ctx context.Context, backupID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.db == nil {
		return fmt.Errorf("database is not configured")
	}

	// Get backup information
	var destPath string
	var vmName string
	err := s.db.QueryRowContext(ctx, "SELECT vm_name, destination_path FROM vm_backups WHERE id = ?", backupID).Scan(&vmName, &destPath)
	if err != nil {
		return fmt.Errorf("backup not found: %w", err)
	}

	// Delete backup files
	backupFile := filepath.Join(destPath, fmt.Sprintf("%s-%s.qcow2", vmName, backupID))
	if err := os.Remove(backupFile); err != nil && !os.IsNotExist(err) {
		log.Printf("[BackupRetention] Warning: failed to delete backup file %s: %v", backupFile, err)
	}

	// Backward compatibility: older backups may have been stored as <id>.qcow2
	alt := filepath.Join(destPath, backupID+".qcow2")
	if err := os.Remove(alt); err != nil && !os.IsNotExist(err) {
		log.Printf("[BackupRetention] Warning: failed to delete backup file %s: %v", alt, err)
	}

	// Also try compressed variants
	compressedExts := []string{".gz", ".zst", ".xz", ".bz2"}
	for _, ext := range compressedExts {
		compFile := backupFile + ext
		if err := os.Remove(compFile); err == nil {
			log.Printf("[BackupRetention] Deleted compressed backup file: %s", compFile)
		}
		altComp := alt + ext
		if err := os.Remove(altComp); err == nil {
			log.Printf("[BackupRetention] Deleted compressed backup file: %s", altComp)
		}
	}

	// Update database record
	_, err = s.db.ExecContext(ctx, "UPDATE vm_backups SET status = ? WHERE id = ?", BackupStatusDeleted, backupID)
	if err != nil {
		return fmt.Errorf("failed to update backup status: %w", err)
	}

	return nil
}

// Helper types for nullable database fields
type backupNullTime struct {
	Time  time.Time
	Valid bool
}

func (nt *backupNullTime) Scan(value interface{}) error {
	if value == nil {
		nt.Time, nt.Valid = time.Time{}, false
		return nil
	}
	switch v := value.(type) {
	case time.Time:
		nt.Time, nt.Valid = v, true
	case string:
		t, err := time.Parse(time.RFC3339, v)
		if err != nil {
			// Try SQLite datetime format
			t, err = time.Parse("2006-01-02 15:04:05", v)
			if err != nil {
				return err
			}
		}
		nt.Time, nt.Valid = t, true
	}
	return nil
}

type backupNullString struct {
	String string
	Valid  bool
}

func (ns *backupNullString) Scan(value interface{}) error {
	if value == nil {
		ns.String, ns.Valid = "", false
		return nil
	}
	switch v := value.(type) {
	case string:
		ns.String, ns.Valid = v, true
	case []byte:
		ns.String, ns.Valid = string(v), true
	}
	return nil
}
