package ansible

import (
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/awanio/vapor/internal/database"
)

// ExecutionStore manages persistent storage of execution history
type ExecutionStore struct {
	db           *database.DB
	mu           sync.RWMutex
	inMemCache   map[string]*ExecutionResult // Cache for recent/running executions
	maxCacheSize int
}

// NewExecutionStore creates a new execution store using the shared database connection
func NewExecutionStore(db *database.DB) (*ExecutionStore, error) {
	store := &ExecutionStore{
		db:           db,
		inMemCache:   make(map[string]*ExecutionResult),
		maxCacheSize: 100, // Keep last 100 executions in memory
	}
	
	// Load recent executions into cache
	if err := store.loadRecentToCache(); err != nil {
		return nil, fmt.Errorf("failed to load cache: %w", err)
	}
	
	// Start background cleanup routine
	go store.startCleanupRoutine()
	
	return store, nil
}


// GetExecution retrieves a single execution by ID
func (es *ExecutionStore) GetExecution(id string) (*ExecutionResult, error) {
	es.mu.RLock()
	
	// Check cache first
	if result, ok := es.inMemCache[id]; ok {
		es.mu.RUnlock()
		return result, nil
	}
	es.mu.RUnlock()
	
	// Query from database
	result := &ExecutionResult{}
	err := es.db.QueryRow(`
		SELECT id, type, status, start_time, end_time, 
		       duration, exit_code, changed
		FROM executions
		WHERE id = ?
	`, id).Scan(
		&result.ID, &result.Type, &result.Status,
		&result.StartTime, &result.EndTime,
		&result.Duration, &result.ExitCode, &result.Changed,
	)
	
	if err != nil {
		return nil, err
	}
	
	// Load output if exists
	rows, err := es.db.Query(`
		SELECT content FROM execution_output
		WHERE execution_id = ?
		ORDER BY line_number
	`, id)
	if err == nil {
		defer rows.Close()
		result.Output = []string{}
		for rows.Next() {
			var line string
			if err := rows.Scan(&line); err == nil {
				result.Output = append(result.Output, line)
			}
		}
	}
	
	// Load stats
	statRows, err := es.db.Query(`
		SELECT host, ok, changed, unreachable, failed, skipped
		FROM execution_stats
		WHERE execution_id = ?
	`, id)
	if err == nil {
		defer statRows.Close()
		stats := make(map[string]interface{})
		for statRows.Next() {
			var host string
			var ok, changed, unreachable, failed, skipped int
			if err := statRows.Scan(&host, &ok, &changed, &unreachable, &failed, &skipped); err == nil {
				stats[host] = map[string]int{
					"ok":          ok,
					"changed":     changed,
					"unreachable": unreachable,
					"failed":      failed,
					"skipped":     skipped,
				}
			}
		}
		if len(stats) > 0 {
			result.Stats = stats
		}
	}
	
	// Load failed/unreachable hosts
	failRows, err := es.db.Query(`
		SELECT DISTINCT host, failure_type
		FROM execution_failures
		WHERE execution_id = ?
	`, id)
	if err == nil {
		defer failRows.Close()
		for failRows.Next() {
			var host, failureType string
			if err := failRows.Scan(&host, &failureType); err == nil {
				if failureType == "failed" {
					result.Failed = append(result.Failed, host)
				} else if failureType == "unreachable" {
					result.Unreachable = append(result.Unreachable, host)
				}
			}
		}
	}
	
	return result, nil
}

// ListExecutions retrieves executions based on filters
func (es *ExecutionStore) ListExecutions(filters ExecutionFilters) ([]*ExecutionResult, error) {
	query := `
		SELECT id, type, status, start_time, end_time, 
		       duration, exit_code, changed
		FROM executions
		WHERE 1=1
	`
	args := []interface{}{}
	
	if filters.Status != "" {
		query += " AND status = ?"
		args = append(args, filters.Status)
	}
	
	if filters.Type != "" {
		query += " AND type = ?"
		args = append(args, filters.Type)
	}
	
	if filters.Playbook != "" {
		query += " AND playbook = ?"
		args = append(args, filters.Playbook)
	}
	
	if !filters.StartDate.IsZero() {
		query += " AND start_time >= ?"
		args = append(args, filters.StartDate)
	}
	
	if !filters.EndDate.IsZero() {
		query += " AND start_time <= ?"
		args = append(args, filters.EndDate)
	}
	
	if filters.OnlyFailed {
		query += " AND status = 'failed'"
	}
	
	if filters.OnlyChanged {
		query += " AND changed = 1"
	}
	
	query += " ORDER BY start_time DESC"
	
	if filters.Limit > 0 {
		query += " LIMIT ?"
		args = append(args, filters.Limit)
		if filters.Offset > 0 {
			query += " OFFSET ?"
			args = append(args, filters.Offset)
		}
	}
	
	rows, err := es.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	results := []*ExecutionResult{}
	for rows.Next() {
		result := &ExecutionResult{}
		err := rows.Scan(
			&result.ID, &result.Type, &result.Status,
			&result.StartTime, &result.EndTime,
			&result.Duration, &result.ExitCode, &result.Changed,
		)
		if err == nil {
			results = append(results, result)
		}
	}
	
	return results, nil
}

// SaveExecution saves or updates an execution
func (es *ExecutionStore) SaveExecution(result *ExecutionResult, req *PlaybookRequest) error {
	es.mu.Lock()
	defer es.mu.Unlock()
	
	// Start transaction
	tx, err := es.db.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()
	
	// Determine playbook and inventory values
	var playbook, inventory string
	if req != nil {
		playbook = req.Playbook
		inventory = req.Inventory
	}
	
	// Save main execution record
	_, err = tx.Exec(`
		INSERT INTO executions (
			id, type, status, playbook, inventory, 
			start_time, end_time, duration, exit_code, changed
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			status = excluded.status,
			end_time = excluded.end_time,
			duration = excluded.duration,
			exit_code = excluded.exit_code,
			changed = excluded.changed,
			updated_at = CURRENT_TIMESTAMP
	`,
		result.ID, result.Type, result.Status,
		playbook, inventory,
		result.StartTime, result.EndTime, result.Duration,
		result.ExitCode, result.Changed,
	)
	if err != nil {
		return fmt.Errorf("failed to save execution: %w", err)
	}
	
	// Save metadata if this is a new execution
	if result.Status == "running" && req != nil {
		tagsJSON, _ := json.Marshal(req.Tags)
		skipTagsJSON, _ := json.Marshal(req.SkipTags)
		extraVarsJSON, _ := json.Marshal(req.ExtraVars)
		
		_, err = tx.Exec(`
			INSERT OR IGNORE INTO execution_metadata (
				execution_id, tags, skip_tags, limit_hosts, extra_vars,
				forks, verbosity, check_mode, diff_mode, become, become_user, timeout
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`,
			result.ID, tagsJSON, skipTagsJSON, req.Limit, extraVarsJSON,
			req.Forks, req.Verbosity, req.Check, req.Diff,
			req.Become, req.BecomeUser, req.Timeout,
		)
		if err != nil {
		return fmt.Errorf("failed to save metadata: %w", err)
		}
	}
	
	// Save output lines if present
	if len(result.Output) > 0 {
		stmt, err := tx.Prepare(`
			INSERT INTO execution_output (execution_id, line_number, content)
			VALUES (?, ?, ?)
		`)
		if err != nil {
			return fmt.Errorf("failed to prepare output statement: %w", err)
		}
		defer stmt.Close()
		
		for i, line := range result.Output {
			_, err = stmt.Exec(result.ID, i+1, line)
			if err != nil {
				return fmt.Errorf("failed to save output line: %w", err)
			}
		}
	}
	
	// Save stats if present
	if result.Stats != nil {
		for host, hostStatsInterface := range result.Stats {
			if hostStats, ok := hostStatsInterface.(map[string]int); ok {
				_, err = tx.Exec(`
					INSERT OR REPLACE INTO execution_stats (
						execution_id, host, ok, changed, unreachable, failed, skipped
					) VALUES (?, ?, ?, ?, ?, ?, ?)
				`,
					result.ID, host,
					hostStats["ok"], hostStats["changed"],
					hostStats["unreachable"], hostStats["failed"],
					hostStats["skipped"],
				)
				if err != nil {
					return fmt.Errorf("failed to save stats: %w", err)
				}
			}
		}
	}
	
	// Save failed/unreachable hosts
	for _, host := range result.Failed {
		_, err = tx.Exec(`
			INSERT OR REPLACE INTO execution_failures (
				execution_id, host, failure_type
			) VALUES (?, ?, 'failed')
		`, result.ID, host)
		if err != nil {
			return fmt.Errorf("failed to save failed host: %w", err)
		}
	}
	
	for _, host := range result.Unreachable {
		_, err = tx.Exec(`
			INSERT OR REPLACE INTO execution_failures (
				execution_id, host, failure_type
			) VALUES (?, ?, 'unreachable')
		`, result.ID, host)
		if err != nil {
			return fmt.Errorf("failed to save unreachable host: %w", err)
		}
	}
	
	// Save output (only last 1000 lines to prevent bloat)
	if len(result.Output) > 0 {
		startIdx := 0
		if len(result.Output) > 1000 {
			startIdx = len(result.Output) - 1000
		}
		
		for i, line := range result.Output[startIdx:] {
			_, err = tx.Exec(`
				INSERT OR REPLACE INTO execution_output (execution_id, line_number, content)
				VALUES (?, ?, ?)
			`, result.ID, startIdx+i, line)
			if err != nil {
				return fmt.Errorf("failed to save output: %w", err)
			}
		}
	}
	
	// Save statistics
	if result.Stats != nil {
		for host, stats := range result.Stats {
			if hostStats, ok := stats.(map[string]int); ok {
				_, err = tx.Exec(`
					INSERT OR REPLACE INTO execution_stats (
						execution_id, host, ok, changed, unreachable, 
						failed, skipped, rescued, ignored
					) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
				`,
					result.ID, host,
					hostStats["ok"], hostStats["changed"],
					hostStats["unreachable"], hostStats["failed"],
					hostStats["skipped"], hostStats["rescued"],
					hostStats["ignored"],
				)
				if err != nil {
					return fmt.Errorf("failed to save stats: %w", err)
				}
			}
		}
	}
	
	// Save failed/unreachable hosts
	for _, host := range result.Failed {
		_, err = tx.Exec(`
			INSERT OR REPLACE INTO execution_failures (execution_id, host, failure_type)
			VALUES (?, ?, 'failed')
		`, result.ID, host)
		if err != nil {
			return fmt.Errorf("failed to save failures: %w", err)
		}
	}
	
	for _, host := range result.Unreachable {
		_, err = tx.Exec(`
			INSERT OR REPLACE INTO execution_failures (execution_id, host, failure_type)
			VALUES (?, ?, 'unreachable')
		`, result.ID, host)
		if err != nil {
			return fmt.Errorf("failed to save unreachable: %w", err)
		}
	}
	
	// Commit transaction
	if err = tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}
	
	// Update cache
	es.inMemCache[result.ID] = result
	es.pruneCache()
	
	return nil
}

// GetStatistics returns execution statistics
func (es *ExecutionStore) GetStatistics(period string) (*ExecutionStatistics, error) {
	stats := &ExecutionStatistics{}
	
	// Determine time range
	var since time.Time
	switch period {
	case "hour":
		since = time.Now().Add(-1 * time.Hour)
	case "day":
		since = time.Now().Add(-24 * time.Hour)
	case "week":
		since = time.Now().Add(-7 * 24 * time.Hour)
	case "month":
		since = time.Now().Add(-30 * 24 * time.Hour)
	default:
		since = time.Now().Add(-24 * time.Hour)
	}
	
	// Get overall statistics
	err := es.db.QueryRow(`
		SELECT 
			COUNT(*) as total,
			COUNT(CASE WHEN status = 'success' THEN 1 END) as success,
			COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
			COUNT(CASE WHEN status = 'running' THEN 1 END) as running,
			AVG(CASE WHEN duration > 0 THEN duration END) as avg_duration,
			MAX(duration) as max_duration,
			MIN(CASE WHEN duration > 0 THEN duration END) as min_duration
		FROM executions
		WHERE start_time >= ?
	`, since).Scan(
		&stats.Total, &stats.Success, &stats.Failed, &stats.Running,
		&stats.AvgDuration, &stats.MaxDuration, &stats.MinDuration,
	)
	
	if err != nil {
		return nil, err
	}
	
	if stats.Total > 0 {
		stats.SuccessRate = float64(stats.Success) / float64(stats.Total) * 100
	}
	
	// Get most failed hosts
	rows, err := es.db.Query(`
		SELECT host, COUNT(*) as fail_count
		FROM execution_failures
		WHERE execution_id IN (
			SELECT id FROM executions WHERE start_time >= ?
		)
		AND failure_type = 'failed'
		GROUP BY host
		ORDER BY fail_count DESC
		LIMIT 10
	`, since)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	stats.TopFailedHosts = make(map[string]int)
	for rows.Next() {
		var host string
		var count int
		if err := rows.Scan(&host, &count); err == nil {
			stats.TopFailedHosts[host] = count
		}
	}
	
	// Get most run playbooks
	pbRows, err := es.db.Query(`
		SELECT playbook, COUNT(*) as run_count
		FROM executions
		WHERE start_time >= ? AND playbook IS NOT NULL
		GROUP BY playbook
		ORDER BY run_count DESC
		LIMIT 10
	`, since)
	if err != nil {
		return nil, err
	}
	defer pbRows.Close()
	
	stats.TopPlaybooks = make(map[string]int)
	for pbRows.Next() {
		var playbook string
		var count int
		if err := pbRows.Scan(&playbook, &count); err == nil {
			stats.TopPlaybooks[playbook] = count
		}
	}
	
	return stats, nil
}

// CleanupOldExecutions removes executions older than retention period
func (es *ExecutionStore) CleanupOldExecutions(retentionDays int) error {
	cutoff := time.Now().AddDate(0, 0, -retentionDays)
	
	result, err := es.db.Exec(`
		DELETE FROM executions 
		WHERE start_time < ? AND status != 'running'
	`, cutoff)
	
	if err != nil {
		return err
	}
	
	rowsAffected, _ := result.RowsAffected()
	if rowsAffected > 0 {
		// Vacuum to reclaim space
		_ = es.db.Vacuum()
	}
	
	return nil
}

// loadRecentToCache loads recent executions into memory cache
func (es *ExecutionStore) loadRecentToCache() error {
	rows, err := es.db.Query(`
		SELECT id, type, status, start_time, end_time, 
		       duration, exit_code, changed
		FROM executions
		WHERE status = 'running' OR start_time >= datetime('now', '-1 hour')
		ORDER BY start_time DESC
		LIMIT ?
	`, es.maxCacheSize)
	
	if err != nil {
		return err
	}
	defer rows.Close()
	
	for rows.Next() {
		result := &ExecutionResult{}
		err := rows.Scan(
			&result.ID, &result.Type, &result.Status,
			&result.StartTime, &result.EndTime,
			&result.Duration, &result.ExitCode, &result.Changed,
		)
		if err == nil {
			es.inMemCache[result.ID] = result
		}
	}
	
	return nil
}

// pruneCache removes old entries from cache if it exceeds max size
func (es *ExecutionStore) pruneCache() {
	if len(es.inMemCache) <= es.maxCacheSize {
		return
	}
	
	// Remove completed executions older than 1 hour
	cutoff := time.Now().Add(-1 * time.Hour)
	for id, result := range es.inMemCache {
		if result.Status != "running" && result.EndTime != nil && result.EndTime.Before(cutoff) {
			delete(es.inMemCache, id)
		}
	}
}

// startCleanupRoutine runs periodic cleanup tasks
func (es *ExecutionStore) startCleanupRoutine() {
	ticker := time.NewTicker(24 * time.Hour) // Run daily
	defer ticker.Stop()
	
	for range ticker.C {
		// Cleanup executions older than 30 days by default
		_ = es.CleanupOldExecutions(30)
		
		// Optimize database
		_ = es.db.Optimize()
	}
}

// GetDatabaseSize returns the size of the database file
func (es *ExecutionStore) GetDatabaseSize() (int64, error) {
	return es.db.GetSize()
}

// ExecutionFilters for querying executions
type ExecutionFilters struct {
	Status      string
	Type        string
	Playbook    string
	StartDate   time.Time
	EndDate     time.Time
	OnlyFailed  bool
	OnlyChanged bool
	Limit       int
	Offset      int
}

// ExecutionStatistics holds aggregated statistics
type ExecutionStatistics struct {
	Total          int
	Success        int
	Failed         int
	Running        int
	SuccessRate    float64
	AvgDuration    float64
	MaxDuration    float64
	MinDuration    float64
	TopFailedHosts map[string]int
	TopPlaybooks   map[string]int
}
