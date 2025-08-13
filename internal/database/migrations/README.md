# Database Migrations

## Overview

All database migrations are centralized in this package to maintain consistency, order, and ease of maintenance.

## Best Practices

### ✅ DO:
1. **Keep all migrations in this package** - Single source of truth for database schema
2. **Use sequential version numbers** - Prevents conflicts and ensures order
3. **Make migrations idempotent** - Use `CREATE TABLE IF NOT EXISTS`, etc.
4. **Include rollback considerations** - Document how to undo changes if needed
5. **Test migrations thoroughly** - Both up and down migrations
6. **Keep migrations small and focused** - One logical change per migration
7. **Use descriptive names** - Make it clear what each migration does

### ❌ DON'T:
1. **Don't spread migrations across modules** - Causes ordering issues and conflicts
2. **Don't modify existing migrations** - Create new ones instead
3. **Don't use timestamps as versions** - Sequential integers are clearer
4. **Don't mix schema and data migrations** - Keep them separate
5. **Don't skip version numbers** - Keep them sequential

## Adding a New Migration

1. Add your migration to `all_migrations.go`:
```go
{
    Version:     8, // Next sequential number
    Description: "Add user preferences table",
    SQL: userPreferencesSchema,
},
```

2. Define your schema constant:
```go
const userPreferencesSchema = `
    CREATE TABLE IF NOT EXISTS user_preferences (
        user_id TEXT PRIMARY KEY,
        theme TEXT DEFAULT 'light',
        language TEXT DEFAULT 'en',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_user_prefs_updated 
        ON user_preferences(updated_at DESC);
`
```

## Migration Structure

```
internal/database/migrations/
├── README.md              # This file
├── all_migrations.go      # Central migration registry
└── [future: separate files for complex migrations]
```

## Current Migrations

| Version | Description | Tables/Changes |
|---------|-------------|----------------|
| 1 | Base schema | schema_migrations, app_settings, audit_log |
| 2 | Ansible execution | executions, execution_output, execution_stats, execution_metadata, execution_failures |
| 3 | VM snapshots | vm_snapshots |
| 4 | VM backups | vm_backups |
| 5 | PCI passthrough | pci_devices, vm_pci_assignments |
| 6 | VM templates | vm_templates |
| 7 | ISO images | iso_images |

## Testing Migrations

```bash
# Test migrations on a fresh database
rm -f /tmp/test.db
sqlite3 /tmp/test.db < migrations.sql

# Verify schema
sqlite3 /tmp/test.db ".schema"
```

## Rollback Strategy

While SQLite doesn't support `DROP COLUMN` directly, here's how to handle rollbacks:

1. **For new tables**: Simply `DROP TABLE IF EXISTS table_name`
2. **For new columns**: Create new table without column, copy data, drop old, rename
3. **For indexes**: `DROP INDEX IF EXISTS index_name`

Always test rollback procedures before applying to production!

## Module-Specific Needs

If a module needs database access:
1. **Don't create module-specific migrations**
2. **Instead, add migrations here with clear module prefixes**
3. **Coordinate version numbers with the team**

Example:
```go
// Good: All in one place with clear naming
const ansibleExecutionSchema = `...`
const libvirtBackupSchema = `...`
const kubernetesClusterSchema = `...`
```

## Future Improvements

- [ ] Add migration rollback support
- [ ] Add migration dry-run mode
- [ ] Add migration status command
- [ ] Consider migration tools like golang-migrate
- [ ] Add automated migration testing
