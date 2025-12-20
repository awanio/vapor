package migrations

import "github.com/awanio/vapor/internal/database"

// GetAllMigrations returns all database migrations in order
// This is the single source of truth for all database schema changes
func GetAllMigrations() []database.Migration {
	return []database.Migration{
		// Version 1: Base schema (created by initBaseSchema in database.go)
		// Already handled by database initialization

		// Version 2: Ansible execution tracking
		{
			Version:     2,
			Description: "Create Ansible execution tables",
			SQL:         ansibleExecutionSchema,
		},

		// Version 3: VM snapshots
		{
			Version:     3,
			Description: "Create VM snapshot tables",
			SQL:         vmSnapshotSchema,
		},

		// Version 4: VM backups
		{
			Version:     4,
			Description: "Create VM backup tables",
			SQL:         vmBackupSchema,
		},

		// Version 5: PCI passthrough devices
		{
			Version:     5,
			Description: "Create PCI device tracking tables",
			SQL:         pciPassthroughSchema,
		},

		// Version 6: VM templates
		{
			Version:     6,
			Description: "Create VM template tables",
			SQL:         vmTemplateSchema,
		},

		// Version 7: ISO images
		{
			Version:     7,
			Description: "Create ISO image management tables",
			SQL:         isoImageSchema,
		},

		// Version 8: ISO pool_name association
		{
			Version:     8,
			Description: "Add pool_name to ISO images",
			SQL:         isoImagePoolNameSchema,
		},

		// Version 9: VM templates default_user
		{
			Version:     9,
			Description: "Add default_user to VM templates",
			SQL:         vmTemplateDefaultUserSchema,
		}}
}

// Ansible execution schema
const ansibleExecutionSchema = `
	CREATE TABLE IF NOT EXISTS executions (
		id TEXT PRIMARY KEY,
		type TEXT NOT NULL,
		status TEXT NOT NULL,
		playbook TEXT,
		inventory TEXT,
		start_time DATETIME NOT NULL,
		end_time DATETIME,
		duration REAL,
		exit_code INTEGER,
		changed BOOLEAN DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_executions_status ON executions(status);
	CREATE INDEX IF NOT EXISTS idx_executions_start_time ON executions(start_time DESC);
	CREATE INDEX IF NOT EXISTS idx_executions_playbook ON executions(playbook);
	CREATE INDEX IF NOT EXISTS idx_executions_type ON executions(type);

	CREATE TABLE IF NOT EXISTS execution_output (
		execution_id TEXT NOT NULL,
		line_number INTEGER NOT NULL,
		content TEXT NOT NULL,
		timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
		PRIMARY KEY (execution_id, line_number),
		FOREIGN KEY (execution_id) REFERENCES executions(id) ON DELETE CASCADE
	);

	CREATE TABLE IF NOT EXISTS execution_stats (
		execution_id TEXT NOT NULL,
		host TEXT NOT NULL,
		ok INTEGER DEFAULT 0,
		changed INTEGER DEFAULT 0,
		unreachable INTEGER DEFAULT 0,
		failed INTEGER DEFAULT 0,
		skipped INTEGER DEFAULT 0,
		rescued INTEGER DEFAULT 0,
		ignored INTEGER DEFAULT 0,
		PRIMARY KEY (execution_id, host),
		FOREIGN KEY (execution_id) REFERENCES executions(id) ON DELETE CASCADE
	);

	CREATE TABLE IF NOT EXISTS execution_metadata (
		execution_id TEXT PRIMARY KEY,
		tags TEXT,           -- JSON array
		skip_tags TEXT,      -- JSON array
		limit_hosts TEXT,
		extra_vars TEXT,     -- JSON object
		forks INTEGER,
		verbosity INTEGER,
		check_mode BOOLEAN,
		diff_mode BOOLEAN,
		become BOOLEAN,
		become_user TEXT,
		timeout INTEGER,
		FOREIGN KEY (execution_id) REFERENCES executions(id) ON DELETE CASCADE
	);

	CREATE TABLE IF NOT EXISTS execution_failures (
		execution_id TEXT NOT NULL,
		host TEXT NOT NULL,
		failure_type TEXT NOT NULL, -- 'failed' or 'unreachable'
		error_message TEXT,
		task_name TEXT,
		PRIMARY KEY (execution_id, host, failure_type),
		FOREIGN KEY (execution_id) REFERENCES executions(id) ON DELETE CASCADE
	);

	-- Trigger to update updated_at timestamp
	CREATE TRIGGER IF NOT EXISTS update_execution_timestamp 
	AFTER UPDATE ON executions
	BEGIN
		UPDATE executions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
	END;
`

// VM snapshot schema
const vmSnapshotSchema = `
	CREATE TABLE IF NOT EXISTS vm_snapshots (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		vm_uuid TEXT NOT NULL,
		vm_name TEXT NOT NULL,
		snapshot_name TEXT NOT NULL,
		description TEXT,
		memory_included BOOLEAN DEFAULT 0,
		state TEXT,
		parent_snapshot TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		metadata TEXT, -- JSON for additional data
		UNIQUE(vm_uuid, snapshot_name)
	);

	CREATE INDEX IF NOT EXISTS idx_snapshots_vm_uuid ON vm_snapshots(vm_uuid);
	CREATE INDEX IF NOT EXISTS idx_snapshots_created ON vm_snapshots(created_at DESC);
`

// VM backup schema
const vmBackupSchema = `
	CREATE TABLE IF NOT EXISTS vm_backups (
		id TEXT PRIMARY KEY,  -- backup_id
		vm_uuid TEXT NOT NULL,
		vm_name TEXT NOT NULL,
		type TEXT NOT NULL, -- 'full', 'incremental', 'differential'
		status TEXT NOT NULL, -- 'running', 'completed', 'failed', 'deleted'
		destination_path TEXT NOT NULL,
		size_bytes INTEGER,
		compression TEXT, -- 'none', 'gzip', 'bzip2', 'xz', 'zstd'
		encryption TEXT, -- 'none', 'aes256', 'aes128'
		parent_backup_id TEXT, -- For incremental backups
		started_at DATETIME NOT NULL,
		completed_at DATETIME,
		error_message TEXT,
		retention_days INTEGER,
		metadata TEXT, -- JSON for additional data
		FOREIGN KEY (parent_backup_id) REFERENCES vm_backups(id) ON DELETE SET NULL
	);

	CREATE INDEX IF NOT EXISTS idx_backups_vm_uuid ON vm_backups(vm_uuid);
	CREATE INDEX IF NOT EXISTS idx_backups_status ON vm_backups(status);
	CREATE INDEX IF NOT EXISTS idx_backups_started ON vm_backups(started_at DESC);
	CREATE INDEX IF NOT EXISTS idx_backups_parent ON vm_backups(parent_backup_id);
`

// PCI passthrough schema
const pciPassthroughSchema = `
	CREATE TABLE IF NOT EXISTS pci_devices (
		device_id TEXT PRIMARY KEY,
		vendor_id TEXT,
		product_id TEXT,
		vendor_name TEXT,
		product_name TEXT,
		device_type TEXT, -- 'gpu', 'network', 'storage', 'usb', 'other'
		pci_address TEXT NOT NULL,
		iommu_group INTEGER,
		driver TEXT,
		is_available BOOLEAN DEFAULT 1,
		assigned_to_vm TEXT, -- VM UUID if assigned
		last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_pci_available ON pci_devices(is_available);
	CREATE INDEX IF NOT EXISTS idx_pci_type ON pci_devices(device_type);
	CREATE INDEX IF NOT EXISTS idx_pci_vm ON pci_devices(assigned_to_vm);

	CREATE TABLE IF NOT EXISTS vm_pci_assignments (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		vm_uuid TEXT NOT NULL,
		device_id TEXT NOT NULL,
		attached_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		configuration TEXT, -- JSON for device-specific config
		FOREIGN KEY (device_id) REFERENCES pci_devices(device_id) ON DELETE CASCADE
	);

	CREATE INDEX IF NOT EXISTS idx_pci_assign_vm ON vm_pci_assignments(vm_uuid);
`

// VM template schema
const vmTemplateSchema = `
	CREATE TABLE IF NOT EXISTS vm_templates (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL UNIQUE,
		description TEXT,
		os_type TEXT NOT NULL,
		os_variant TEXT,
		min_memory INTEGER NOT NULL, -- in MB
		recommended_memory INTEGER,
		min_vcpus INTEGER NOT NULL,
		recommended_vcpus INTEGER,
		min_disk INTEGER NOT NULL, -- in GB
		recommended_disk INTEGER,
		disk_format TEXT DEFAULT 'qcow2',
		network_model TEXT DEFAULT 'virtio',
		graphics_type TEXT DEFAULT 'vnc',
		cloud_init BOOLEAN DEFAULT 0,
		uefi_boot BOOLEAN DEFAULT 0,
		secure_boot BOOLEAN DEFAULT 0,
		tpm BOOLEAN DEFAULT 0,
		metadata TEXT, -- JSON for additional settings
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_templates_name ON vm_templates(name);
	CREATE INDEX IF NOT EXISTS idx_templates_os_type ON vm_templates(os_type);

	-- Trigger to update updated_at timestamp
	CREATE TRIGGER IF NOT EXISTS update_template_timestamp 
	AFTER UPDATE ON vm_templates
	BEGIN
		UPDATE vm_templates SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
	END;
`

// ISO image schema
const isoImageSchema = `
	CREATE TABLE IF NOT EXISTS iso_images (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		path TEXT NOT NULL UNIQUE,
		size_bytes INTEGER NOT NULL,
		md5_hash TEXT,
		sha256_hash TEXT,
		os_type TEXT,
		os_variant TEXT,
		architecture TEXT,
		boot_type TEXT, -- 'bios', 'uefi', 'both'
		description TEXT,
		uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		last_used DATETIME,
		use_count INTEGER DEFAULT 0
	);

	CREATE INDEX IF NOT EXISTS idx_iso_name ON iso_images(name);
	CREATE INDEX IF NOT EXISTS idx_iso_os_type ON iso_images(os_type);
	CREATE INDEX IF NOT EXISTS idx_iso_uploaded ON iso_images(uploaded_at DESC);
`

// ISO image pool_name extension
const isoImagePoolNameSchema = `
	ALTER TABLE iso_images ADD COLUMN pool_name TEXT;
	CREATE INDEX IF NOT EXISTS idx_iso_pool_name ON iso_images(pool_name);
`

// VM template default_user extension
const vmTemplateDefaultUserSchema = `
	ALTER TABLE vm_templates ADD COLUMN default_user TEXT;
	CREATE INDEX IF NOT EXISTS idx_templates_default_user ON vm_templates(default_user);
`
