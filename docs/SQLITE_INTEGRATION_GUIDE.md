# SQLite Integration Guide for Vapor Execution History

## Why SQLite is the Best Choice for Vapor

### Comparison: SQLite vs Other Options

| Feature | SQLite | PostgreSQL | MySQL | MongoDB | In-Memory |
|---------|--------|------------|-------|---------|-----------|
| **Zero Configuration** | ✅ Yes | ❌ Requires server | ❌ Requires server | ❌ Requires server | ✅ Yes |
| **Deployment Complexity** | ✅ None | ❌ High | ❌ High | ❌ High | ✅ None |
| **Resource Usage** | ✅ <5MB | ❌ ~100MB+ | ❌ ~200MB+ | ❌ ~300MB+ | ✅ Minimal |
| **Persistence** | ✅ File-based | ✅ Yes | ✅ Yes | ✅ Yes | ❌ Lost on restart |
| **Backup** | ✅ Copy file | ⚠️ Complex | ⚠️ Complex | ⚠️ Complex | ❌ None |
| **Performance (Vapor scale)** | ✅ Excellent | ⚠️ Overkill | ⚠️ Overkill | ⚠️ Overkill | ✅ Fastest |
| **Transactions** | ✅ ACID | ✅ ACID | ✅ ACID | ⚠️ Limited | ❌ None |
| **Query Capabilities** | ✅ Full SQL | ✅ Full SQL | ✅ Full SQL | ✅ NoSQL | ❌ Basic |
| **Migration Path** | ✅ Easy to PostgreSQL | - | ✅ To PostgreSQL | ❌ Different | ❌ None |

**Verdict**: SQLite is perfect for Vapor because it's a single-node API service that doesn't need the complexity of a client-server database.

---

## Integration with Existing Executor

### Step 1: Update the Executor Structure

```go
// internal/ansible/executor.go

type Executor struct {
    baseDir       string
    playbookDir   string
    inventoryDir  string
    logDir        string
    vaultPassFile string
    executions    map[string]*ExecutionResult  // Keep for compatibility
    mu            sync.RWMutex
    outputStreams map[string]chan string
    store         *ExecutionStore              // ADD THIS: SQLite store
}

// Update NewExecutor
func NewExecutor(baseDir string) (*Executor, error) {
    e := &Executor{
        baseDir:       baseDir,
        playbookDir:   filepath.Join(baseDir, "playbooks"),
        inventoryDir:  filepath.Join(baseDir, "inventory"),
        logDir:        filepath.Join(baseDir, "logs"),
        executions:    make(map[string]*ExecutionResult),
        outputStreams: make(map[string]chan string),
    }
    
    // Create directories
    dirs := []string{e.playbookDir, e.inventoryDir, e.logDir}
    for _, dir := range dirs {
        if err := os.MkdirAll(dir, 0755); err != nil {
            return nil, fmt.Errorf("failed to create directory %s: %w", dir, err)
        }
    }
    
    // Initialize SQLite store
    store, err := NewExecutionStore(baseDir)
    if err != nil {
        return nil, fmt.Errorf("failed to initialize execution store: %w", err)
    }
    e.store = store
    
    return e, nil
}
```

### Step 2: Update RunPlaybook to Save to SQLite

```go
// RunPlaybook executes an Ansible playbook
func (e *Executor) RunPlaybook(ctx context.Context, req *PlaybookRequest) (*ExecutionResult, error) {
    execID := uuid.New().String()
    result := &ExecutionResult{
        ID:        execID,
        Type:      "playbook",
        Status:    "running",
        StartTime: time.Now(),
        Output:    []string{},
    }
    
    e.mu.Lock()
    e.executions[execID] = result  // Keep in-memory for compatibility
    outputChan := make(chan string, 100)
    e.outputStreams[execID] = outputChan
    e.mu.Unlock()
    
    // Save initial state to SQLite
    if e.store != nil {
        e.store.SaveExecution(result, req)
    }
    
    // ... rest of the code ...
    
    // Execute in goroutine with SQLite updates
    go e.executeCommandWithStore(ctx, "ansible-playbook", args, result, outputChan, req)
    
    return result, nil
}
```

### Step 3: Update executeCommand to Save Progress

```go
func (e *Executor) executeCommandWithStore(ctx context.Context, command string, 
    args []string, result *ExecutionResult, outputChan chan string, req *PlaybookRequest) {
    
    defer close(outputChan)
    
    // ... existing execution code ...
    
    // After execution completes
    endTime := time.Now()
    result.EndTime = &endTime
    result.Duration = endTime.Sub(result.StartTime).Seconds()
    
    if err != nil {
        result.Status = "failed"
        result.ExitCode = getExitCode(err)
    } else {
        result.Status = "success"
        result.ExitCode = 0
    }
    
    // Parse statistics
    if result.Type == "playbook" {
        e.parsePlaybookStats(result)
    }
    
    // Save final state to SQLite
    if e.store != nil {
        e.store.SaveExecution(result, req)
    }
}
```

### Step 4: Update List/Get Methods to Use SQLite

```go
// GetExecution retrieves from SQLite first, falls back to memory
func (e *Executor) GetExecution(id string) (*ExecutionResult, bool) {
    // Try SQLite first
    if e.store != nil {
        result, err := e.store.GetExecution(id)
        if err == nil {
            return result, true
        }
    }
    
    // Fall back to in-memory
    e.mu.RLock()
    defer e.mu.RUnlock()
    result, ok := e.executions[id]
    return result, ok
}

// ListExecutions returns from SQLite with filtering
func (e *Executor) ListExecutions(filters *ExecutionFilters) []*ExecutionResult {
    // Use SQLite if available
    if e.store != nil {
        results, err := e.store.ListExecutions(filters)
        if err == nil {
            return results
        }
    }
    
    // Fall back to in-memory
    e.mu.RLock()
    defer e.mu.RUnlock()
    
    results := make([]*ExecutionResult, 0, len(e.executions))
    for _, result := range e.executions {
        results = append(results, result)
    }
    return results
}
```

---

## API Enhancements with SQLite

### New Endpoints Enabled by SQLite

```go
// routes/ansible.go - Add these new routes

// Statistics endpoint
ansibleGroup.GET("/executions/stats", getExecutionStats(ansibleExec))

// Filtered queries
ansibleGroup.GET("/executions/search", searchExecutions(ansibleExec))

// Database maintenance
ansibleGroup.POST("/executions/cleanup", cleanupExecutions(ansibleExec))
ansibleGroup.GET("/executions/db/size", getDatabaseSize(ansibleExec))
```

### Example: Statistics Endpoint

```go
func getExecutionStats(exec *ansible.Executor) gin.HandlerFunc {
    return func(c *gin.Context) {
        period := c.DefaultQuery("period", "day")
        
        if exec.store == nil {
            c.JSON(http.StatusNotImplemented, gin.H{"error": "statistics not available"})
            return
        }
        
        stats, err := exec.store.GetStatistics(period)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
            return
        }
        
        c.JSON(http.StatusOK, stats)
    }
}
```

### Example: Search with Filters

```go
func searchExecutions(exec *ansible.Executor) gin.HandlerFunc {
    return func(c *gin.Context) {
        filters := &ansible.ExecutionFilters{
            Status:      c.Query("status"),
            Type:        c.Query("type"),
            Playbook:    c.Query("playbook"),
            OnlyFailed:  c.Query("failed") == "true",
            OnlyChanged: c.Query("changed") == "true",
            Limit:       50,
            Offset:      0,
        }
        
        // Parse pagination
        if limit, err := strconv.Atoi(c.Query("limit")); err == nil {
            filters.Limit = limit
        }
        if offset, err := strconv.Atoi(c.Query("offset")); err == nil {
            filters.Offset = offset
        }
        
        // Parse dates
        if startDate := c.Query("start_date"); startDate != "" {
            if t, err := time.Parse(time.RFC3339, startDate); err == nil {
                filters.StartDate = t
            }
        }
        
        results := exec.ListExecutions(filters)
        c.JSON(http.StatusOK, gin.H{"executions": results})
    }
}
```

---

## Usage Examples

### 1. Get Execution Statistics
```bash
# Get daily statistics
curl http://localhost:8080/api/v1/ansible/executions/stats?period=day

# Response
{
  "total": 245,
  "success": 210,
  "failed": 30,
  "running": 5,
  "success_rate": 85.71,
  "avg_duration": 125.5,
  "max_duration": 890.2,
  "min_duration": 3.1,
  "top_failed_hosts": {
    "web-03": 8,
    "db-02": 5
  },
  "top_playbooks": {
    "deploy.yml": 89,
    "backup.yml": 45,
    "update.yml": 30
  }
}
```

### 2. Search Failed Executions
```bash
# Find failed deployments in last week
curl "http://localhost:8080/api/v1/ansible/executions/search?\
status=failed&\
playbook=deploy.yml&\
start_date=2024-01-13T00:00:00Z"
```

### 3. Paginated Results
```bash
# Get page 2 of results (items 51-100)
curl "http://localhost:8080/api/v1/ansible/executions?\
limit=50&offset=50"
```

### 4. Database Maintenance
```bash
# Check database size
curl http://localhost:8080/api/v1/ansible/executions/db/size
# Response: {"size_bytes": 2458624, "size_mb": 2.34}

# Cleanup old executions (admin only)
curl -X POST http://localhost:8080/api/v1/ansible/executions/cleanup \
  -d '{"retention_days": 30}'
```

---

## SQLite Database Management

### File Location
```
/ansible/vapor_executions.db      # Main database
/ansible/vapor_executions.db-wal  # Write-ahead log
/ansible/vapor_executions.db-shm  # Shared memory
```

### Backup Strategy
```bash
# Simple backup (while running)
sqlite3 /ansible/vapor_executions.db ".backup /backup/vapor_executions_$(date +%Y%m%d).db"

# Or just copy the file (stop Vapor first)
cp /ansible/vapor_executions.db /backup/
```

### Direct Database Queries
```bash
# Connect to database
sqlite3 /ansible/vapor_executions.db

# Useful queries
.tables                                    # List all tables
.schema executions                         # Show table structure

-- Recent failures
SELECT id, playbook, start_time, exit_code 
FROM executions 
WHERE status = 'failed' 
ORDER BY start_time DESC 
LIMIT 10;

-- Success rate by playbook
SELECT 
  playbook,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
  ROUND(100.0 * SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM executions
WHERE playbook IS NOT NULL
GROUP BY playbook
ORDER BY total DESC;

-- Average duration by playbook
SELECT 
  playbook,
  ROUND(AVG(duration), 2) as avg_duration,
  MAX(duration) as max_duration,
  MIN(duration) as min_duration
FROM executions
WHERE duration > 0
GROUP BY playbook;

-- Failed hosts frequency
SELECT 
  host,
  COUNT(*) as failure_count
FROM execution_failures
WHERE failure_type = 'failed'
GROUP BY host
ORDER BY failure_count DESC;
```

### Migration to PostgreSQL (if needed later)
```bash
# Export from SQLite
sqlite3 vapor_executions.db .dump > vapor_dump.sql

# Convert and import to PostgreSQL
# (Would need some SQL syntax adjustments)
psql vapor_db < vapor_dump.sql
```

---

## Performance Characteristics

### SQLite Performance for Vapor

| Operation | Performance | Notes |
|-----------|------------|-------|
| **Insert execution** | <1ms | Single row insert |
| **Update status** | <1ms | Indexed update |
| **Query by ID** | <1ms | Primary key lookup |
| **List 100 executions** | <10ms | With indexes |
| **Statistics (1 day)** | <20ms | Aggregation queries |
| **Full text search** | <50ms | On output content |
| **Database size** | ~1KB per execution | With 1000 lines output |

### Capacity Planning

- **10,000 executions**: ~10MB database
- **100,000 executions**: ~100MB database
- **1,000,000 executions**: ~1GB database

With 30-day retention and 100 executions/day: ~3000 records = ~3MB

---

## Advantages Over Current In-Memory Storage

1. **Persistence**: Survives API restarts
2. **Filtering**: Complex queries with SQL
3. **Statistics**: Aggregations and analytics
4. **Pagination**: Efficient large result sets
5. **Retention**: Automatic cleanup
6. **Export**: Standard SQL format
7. **Backup**: Simple file copy
8. **Debugging**: Query with standard tools

---

## Migration Commands

To add SQLite to existing Vapor installation:

```bash
# Install SQLite driver (if not already)
go get github.com/mattn/go-sqlite3

# The database will be created automatically on first run
# Location: /ansible/vapor_executions.db

# Import historical data (if you have JSON exports)
curl -X POST http://localhost:8080/api/v1/ansible/executions/import \
  -d @historical_executions.json
```

---

## Conclusion

SQLite is the **ideal choice** for Vapor's execution history because:

1. **Zero operational overhead** - No database server to manage
2. **Perfect scale match** - Handles thousands of executions easily
3. **Simple deployment** - Just a file, ships with the binary
4. **Full SQL power** - Complex queries, aggregations, joins
5. **Production proven** - Used by billions of devices
6. **Easy migration path** - Can move to PostgreSQL if needed

The implementation provides all the benefits of a full database (persistence, querying, statistics) without any of the complexity of running a separate database server. This aligns perfectly with Vapor's philosophy of being a simple, self-contained API service.
