package database

import (
	"database/sql"
	"fmt"
	"path/filepath"
	"sync"

	_ "github.com/mattn/go-sqlite3"
)

var (
	instance *DB
	once     sync.Once
)

// DB represents the database connection wrapper
type DB struct {
	*sql.DB
	dbPath string
	mu     sync.RWMutex
}

// Config represents database configuration
type Config struct {
	AppDir         string
	MaxOpenConns   int
	MaxIdleConns   int
	ConnMaxLifetime int
}

// Initialize initializes the database connection (singleton pattern)
func Initialize(cfg *Config) (*DB, error) {
	var initErr error
	
	once.Do(func() {
		dbPath := filepath.Join(cfg.AppDir, "vapor.db")
		
		// Open SQLite database with optimized settings
		db, err := sql.Open("sqlite3", dbPath+"?_journal_mode=WAL&_busy_timeout=5000&_synchronous=NORMAL&_cache_size=10000&_foreign_keys=ON")
		if err != nil {
			initErr = fmt.Errorf("failed to open database: %w", err)
			return
		}
		
		// Configure connection pool
		maxOpenConns := cfg.MaxOpenConns
		if maxOpenConns <= 0 {
			maxOpenConns = 1 // SQLite doesn't benefit from multiple connections
		}
		db.SetMaxOpenConns(maxOpenConns)
		
		maxIdleConns := cfg.MaxIdleConns
		if maxIdleConns <= 0 {
			maxIdleConns = 1
		}
		db.SetMaxIdleConns(maxIdleConns)
		
		db.SetConnMaxLifetime(0) // Connections don't expire
		
		// Test the connection
		if err := db.Ping(); err != nil {
			initErr = fmt.Errorf("failed to ping database: %w", err)
			db.Close()
			return
		}
		
		instance = &DB{
			DB:     db,
			dbPath: dbPath,
		}
		
		// Initialize base schema
		if err := instance.initBaseSchema(); err != nil {
			initErr = fmt.Errorf("failed to initialize base schema: %w", err)
			db.Close()
			instance = nil
			return
		}
		
		// Enable performance optimizations
		if err := instance.enableOptimizations(); err != nil {
			// Log warning but don't fail
			fmt.Printf("Warning: Failed to enable some database optimizations: %v\n", err)
		}
	})
	
	if initErr != nil {
		return nil, initErr
	}
	
	return instance, nil
}

// GetInstance returns the singleton database instance
func GetInstance() (*DB, error) {
	if instance == nil {
		return nil, fmt.Errorf("database not initialized, call Initialize first")
	}
	return instance, nil
}

// initBaseSchema creates the base database schema
func (db *DB) initBaseSchema() error {
	schema := `
	-- Meta table for tracking schema versions
	CREATE TABLE IF NOT EXISTS schema_migrations (
		version INTEGER PRIMARY KEY,
		applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		description TEXT
	);

	-- Insert initial version if not exists
	INSERT OR IGNORE INTO schema_migrations (version, description) 
	VALUES (1, 'Initial schema');

	-- Application settings table
	CREATE TABLE IF NOT EXISTS app_settings (
		key TEXT PRIMARY KEY,
		value TEXT,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	-- Audit log table for tracking important events
	CREATE TABLE IF NOT EXISTS audit_log (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
		user TEXT,
		action TEXT NOT NULL,
		resource TEXT,
		resource_id TEXT,
		details TEXT, -- JSON
		ip_address TEXT
	);

	CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp DESC);
	CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user);
	CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
	`
	
	_, err := db.Exec(schema)
	return err
}

// enableOptimizations enables SQLite performance optimizations
func (db *DB) enableOptimizations() error {
	optimizations := []string{
		"PRAGMA temp_store = MEMORY",
		"PRAGMA mmap_size = 30000000000",
		"PRAGMA page_size = 4096",
		"PRAGMA cache_size = 10000",
		"PRAGMA synchronous = NORMAL",
		"PRAGMA journal_mode = WAL",
		"PRAGMA wal_autocheckpoint = 1000",
		"PRAGMA foreign_keys = ON",
	}
	
	for _, pragma := range optimizations {
		if _, err := db.Exec(pragma); err != nil {
			return fmt.Errorf("failed to execute %s: %w", pragma, err)
		}
	}
	
	return nil
}

// Transaction starts a new database transaction
func (db *DB) Transaction(fn func(*sql.Tx) error) error {
	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	
	defer func() {
		if p := recover(); p != nil {
			tx.Rollback()
			panic(p)
		}
	}()
	
	if err := fn(tx); err != nil {
		tx.Rollback()
		return err
	}
	
	return tx.Commit()
}

// Migrate runs database migrations
func (db *DB) Migrate(migrations []Migration) error {
	// Get current version
	var currentVersion int
	err := db.QueryRow("SELECT COALESCE(MAX(version), 0) FROM schema_migrations").Scan(&currentVersion)
	if err != nil {
		return fmt.Errorf("failed to get current schema version: %w", err)
	}
	
	// Run pending migrations
	for _, migration := range migrations {
		if migration.Version <= currentVersion {
			continue
		}
		
		fmt.Printf("Running migration %d: %s\n", migration.Version, migration.Description)
		
		// Run migration in a transaction
		err := db.Transaction(func(tx *sql.Tx) error {
			// Execute migration SQL
			if _, err := tx.Exec(migration.SQL); err != nil {
				return fmt.Errorf("migration %d failed: %w", migration.Version, err)
			}
			
			// Record migration
			_, err := tx.Exec(
				"INSERT INTO schema_migrations (version, description) VALUES (?, ?)",
				migration.Version, migration.Description,
			)
			return err
		})
		
		if err != nil {
			return fmt.Errorf("failed to run migration %d: %w", migration.Version, err)
		}
	}
	
	return nil
}

// GetPath returns the database file path
func (db *DB) GetPath() string {
	return db.dbPath
}

// GetSize returns the database file size
func (db *DB) GetSize() (int64, error) {
	var pageCount, pageSize int64
	
	err := db.QueryRow("PRAGMA page_count").Scan(&pageCount)
	if err != nil {
		return 0, err
	}
	
	err = db.QueryRow("PRAGMA page_size").Scan(&pageSize)
	if err != nil {
		return 0, err
	}
	
	return pageCount * pageSize, nil
}

// Vacuum performs database vacuum to reclaim space
func (db *DB) Vacuum() error {
	_, err := db.Exec("VACUUM")
	return err
}

// Optimize runs database optimization
func (db *DB) Optimize() error {
	_, err := db.Exec("PRAGMA optimize")
	return err
}

// Checkpoint forces a WAL checkpoint
func (db *DB) Checkpoint() error {
	_, err := db.Exec("PRAGMA wal_checkpoint(TRUNCATE)")
	return err
}

// GetStats returns database statistics
func (db *DB) GetStats() (*Stats, error) {
	stats := &Stats{}
	
	// Get database size
	size, err := db.GetSize()
	if err != nil {
		return nil, err
	}
	stats.Size = size
	
	// Get page count and size
	err = db.QueryRow("PRAGMA page_count").Scan(&stats.PageCount)
	if err != nil {
		return nil, err
	}
	
	err = db.QueryRow("PRAGMA page_size").Scan(&stats.PageSize)
	if err != nil {
		return nil, err
	}
	
	// Get cache statistics
	err = db.QueryRow("PRAGMA cache_size").Scan(&stats.CacheSize)
	if err != nil {
		return nil, err
	}
	
	// Get WAL size
	err = db.QueryRow("PRAGMA wal_checkpoint(PASSIVE)").Scan(
		&stats.WALPages, &stats.WALCheckpointed, &stats.WALTotal,
	)
	if err != nil {
		// Ignore error for WAL stats as it might not be available
		stats.WALPages = 0
		stats.WALCheckpointed = 0
		stats.WALTotal = 0
	}
	
	// Get table count
	err = db.QueryRow(`
		SELECT COUNT(*) FROM sqlite_master 
		WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
	`).Scan(&stats.TableCount)
	if err != nil {
		return nil, err
	}
	
	// Get index count
	err = db.QueryRow(`
		SELECT COUNT(*) FROM sqlite_master 
		WHERE type = 'index' AND name NOT LIKE 'sqlite_%'
	`).Scan(&stats.IndexCount)
	if err != nil {
		return nil, err
	}
	
	stats.Path = db.dbPath
	
	return stats, nil
}

// Close closes the database connection
func (db *DB) Close() error {
	if db.DB != nil {
		return db.DB.Close()
	}
	return nil
}

// Migration represents a database migration
type Migration struct {
	Version     int
	Description string
	SQL         string
}

// Stats represents database statistics
type Stats struct {
	Path            string
	Size            int64
	PageCount       int64
	PageSize        int64
	CacheSize       int64
	TableCount      int
	IndexCount      int
	WALPages        int64
	WALCheckpointed int64
	WALTotal        int64
}

// LogAudit logs an audit event
func (db *DB) LogAudit(user, action, resource, resourceID, details, ipAddress string) error {
	_, err := db.Exec(`
		INSERT INTO audit_log (user, action, resource, resource_id, details, ip_address)
		VALUES (?, ?, ?, ?, ?, ?)
	`, user, action, resource, resourceID, details, ipAddress)
	return err
}

// GetSetting retrieves an application setting
func (db *DB) GetSetting(key string) (string, error) {
	var value string
	err := db.QueryRow("SELECT value FROM app_settings WHERE key = ?", key).Scan(&value)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return value, err
}

// SetSetting sets an application setting
func (db *DB) SetSetting(key, value string) error {
	_, err := db.Exec(`
		INSERT INTO app_settings (key, value, updated_at) 
		VALUES (?, ?, CURRENT_TIMESTAMP)
		ON CONFLICT(key) DO UPDATE SET 
			value = excluded.value,
			updated_at = CURRENT_TIMESTAMP
	`, key, value)
	return err
}
