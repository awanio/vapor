package ansible

import "github.com/awanio/vapor/internal/database"

// GetMigrations returns all Ansible-related database migrations
func GetMigrations() []database.Migration {
	return []database.Migration{
		{
			Version:     2,
			Description: "Create Ansible execution tables",
			SQL: `
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
			`,
		},
	}
}
