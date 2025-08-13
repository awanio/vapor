package database

// GetMigrations returns all database migrations
func GetMigrations() []Migration {
	return []Migration{
		{
			Version:     2,
			Description: "Add VM snapshots tracking",
			SQL: `
				CREATE TABLE IF NOT EXISTS vm_snapshots (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					vm_uuid TEXT NOT NULL,
					vm_name TEXT NOT NULL,
					snapshot_name TEXT NOT NULL,
					description TEXT,
					state TEXT,
					memory_included BOOLEAN DEFAULT 0,
					disk_size INTEGER,
					parent_snapshot TEXT,
					is_current BOOLEAN DEFAULT 0,
					created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
					metadata TEXT, -- JSON for additional metadata
					UNIQUE(vm_uuid, snapshot_name)
				);

				CREATE INDEX IF NOT EXISTS idx_snapshots_vm_uuid ON vm_snapshots(vm_uuid);
				CREATE INDEX IF NOT EXISTS idx_snapshots_created_at ON vm_snapshots(created_at DESC);
			`,
		},
		{
			Version:     3,
			Description: "Add VM backups tracking",
			SQL: `
				CREATE TABLE IF NOT EXISTS vm_backups (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					backup_id TEXT UNIQUE NOT NULL,
					vm_uuid TEXT NOT NULL,
					vm_name TEXT NOT NULL,
					backup_type TEXT NOT NULL, -- 'full', 'incremental'
					status TEXT NOT NULL, -- 'running', 'completed', 'failed', 'deleted'
					source_path TEXT,
					destination_path TEXT NOT NULL,
					size_bytes INTEGER,
					compressed BOOLEAN DEFAULT 0,
					encryption_type TEXT,
					parent_backup_id TEXT, -- For incremental backups
					started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
					completed_at DATETIME,
					error_message TEXT,
					metadata TEXT -- JSON for additional metadata
				);

				CREATE INDEX IF NOT EXISTS idx_backups_vm_uuid ON vm_backups(vm_uuid);
				CREATE INDEX IF NOT EXISTS idx_backups_status ON vm_backups(status);
				CREATE INDEX IF NOT EXISTS idx_backups_started_at ON vm_backups(started_at DESC);
			`,
		},
		{
			Version:     4,
			Description: "Add VM templates",
			SQL: `
				CREATE TABLE IF NOT EXISTS vm_templates (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					template_id TEXT UNIQUE NOT NULL,
					name TEXT UNIQUE NOT NULL,
					description TEXT,
					os_type TEXT NOT NULL,
					os_version TEXT,
					architecture TEXT DEFAULT 'x86_64',
					min_memory INTEGER NOT NULL, -- in MB
					min_vcpus INTEGER NOT NULL,
					min_disk INTEGER NOT NULL, -- in GB
					disk_format TEXT DEFAULT 'qcow2',
					source_path TEXT,
					cloud_init_enabled BOOLEAN DEFAULT 0,
					variables TEXT, -- JSON for template variables
					tags TEXT, -- JSON array of tags
					is_public BOOLEAN DEFAULT 1,
					created_by TEXT,
					created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
					updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
				);

				CREATE INDEX IF NOT EXISTS idx_templates_name ON vm_templates(name);
				CREATE INDEX IF NOT EXISTS idx_templates_os_type ON vm_templates(os_type);
				CREATE INDEX IF NOT EXISTS idx_templates_created_at ON vm_templates(created_at DESC);
			`,
		},
		{
			Version:     5,
			Description: "Add PCI device passthrough tracking",
			SQL: `
				CREATE TABLE IF NOT EXISTS pci_devices (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					device_id TEXT UNIQUE NOT NULL,
					vendor_id TEXT NOT NULL,
					product_id TEXT NOT NULL,
					vendor_name TEXT,
					product_name TEXT,
					device_type TEXT, -- 'gpu', 'network', 'storage', 'usb', 'other'
					pci_address TEXT NOT NULL, -- e.g., '0000:01:00.0'
					iommu_group INTEGER,
					driver TEXT,
					is_available BOOLEAN DEFAULT 1,
					assigned_to_vm TEXT, -- VM UUID if assigned
					capabilities TEXT, -- JSON for device capabilities
					last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
				);

				CREATE TABLE IF NOT EXISTS vm_pci_assignments (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					vm_uuid TEXT NOT NULL,
					device_id TEXT NOT NULL,
					pci_address TEXT NOT NULL,
					assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
					configuration TEXT, -- JSON for device-specific config
					FOREIGN KEY (device_id) REFERENCES pci_devices(device_id),
					UNIQUE(vm_uuid, device_id)
				);

				CREATE INDEX IF NOT EXISTS idx_pci_devices_type ON pci_devices(device_type);
				CREATE INDEX IF NOT EXISTS idx_pci_devices_available ON pci_devices(is_available);
				CREATE INDEX IF NOT EXISTS idx_pci_assignments_vm ON vm_pci_assignments(vm_uuid);
			`,
		},
		{
			Version:     6,
			Description: "Add ISO images management",
			SQL: `
				CREATE TABLE IF NOT EXISTS iso_images (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					image_id TEXT UNIQUE NOT NULL,
					filename TEXT NOT NULL,
					path TEXT NOT NULL,
					size_bytes INTEGER NOT NULL,
					md5_hash TEXT,
					sha256_hash TEXT,
					os_type TEXT,
					os_version TEXT,
					architecture TEXT,
					description TEXT,
					is_public BOOLEAN DEFAULT 1,
					uploaded_by TEXT,
					upload_status TEXT DEFAULT 'pending', -- 'pending', 'uploading', 'completed', 'failed'
					upload_progress INTEGER DEFAULT 0, -- percentage
					created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
					metadata TEXT -- JSON for additional metadata
				);

				CREATE TABLE IF NOT EXISTS iso_upload_sessions (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					session_id TEXT UNIQUE NOT NULL,
					image_id TEXT NOT NULL,
					filename TEXT NOT NULL,
					total_size INTEGER NOT NULL,
					uploaded_size INTEGER DEFAULT 0,
					chunk_size INTEGER DEFAULT 1048576, -- 1MB default
					status TEXT DEFAULT 'active', -- 'active', 'paused', 'completed', 'expired'
					expires_at DATETIME,
					created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
					updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
					FOREIGN KEY (image_id) REFERENCES iso_images(image_id)
				);

				CREATE INDEX IF NOT EXISTS idx_iso_images_filename ON iso_images(filename);
				CREATE INDEX IF NOT EXISTS idx_iso_images_os_type ON iso_images(os_type);
				CREATE INDEX IF NOT EXISTS idx_iso_upload_sessions_status ON iso_upload_sessions(status);
			`,
		},
	}
}
