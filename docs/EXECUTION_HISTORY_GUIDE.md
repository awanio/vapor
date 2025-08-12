# Ansible Execution History Management in Vapor

## Overview

**Ansible itself does NOT maintain execution history**. Vapor implements its own execution tracking system to provide this essential feature for enterprise automation.

---

## What Ansible Provides (Limited)

### Native Ansible Tracking:
1. **Exit codes** - 0 for success, non-zero for failure
2. **Log files** - Only if `ANSIBLE_LOG_PATH` is configured
3. **`.retry` files** - Lists failed hosts (deprecated)
4. **Callback plugins** - Can send data to external systems (ARA, Tower, etc.)

That's it! No built-in database, no history API, no execution list.

---

## Vapor's Execution History Implementation

### Architecture

```go
// In-memory storage structure (executor.go line 104-106)
type Executor struct {
    executions    map[string]*ExecutionResult  // All executions
    mu            sync.RWMutex                 // Thread-safe access
    outputStreams map[string]chan string       // Real-time output
}
```

### Execution States

Every playbook run goes through these states:

```
"running" → "success" OR "failed"
```

### Data Structure for Each Execution

```go
type ExecutionResult struct {
    ID          string       // Unique UUID
    Type        string       // "playbook" or "adhoc"
    Status      string       // "running", "success", "failed"
    StartTime   time.Time    // When execution started
    EndTime     *time.Time   // When execution completed
    Duration    float64      // Total execution time in seconds
    Output      []string     // Complete output lines
    ExitCode    int          // 0=success, non-zero=failure
    Stats       map[string]interface{}  // Per-host statistics
    Changed     bool         // Any changes made?
    Unreachable []string     // Hosts that couldn't be reached
    Failed      []string     // Hosts with failures
}
```

---

## API Endpoints for Execution History

### 1. **List All Executions**
```bash
GET /api/v1/ansible/executions
```

**Response:**
```json
{
  "executions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "type": "playbook",
      "status": "success",
      "start_time": "2024-01-20T10:00:00Z",
      "end_time": "2024-01-20T10:05:23Z",
      "duration": 323.5,
      "exit_code": 0,
      "changed": true,
      "stats": {
        "web-01": {"ok": 15, "changed": 3, "failed": 0},
        "web-02": {"ok": 15, "changed": 3, "failed": 0}
      }
    },
    {
      "id": "660f9511-f30c-52e5-b827-557766551111",
      "type": "playbook",
      "status": "failed",
      "start_time": "2024-01-20T09:00:00Z",
      "end_time": "2024-01-20T09:02:15Z",
      "duration": 135.2,
      "exit_code": 2,
      "changed": false,
      "failed": ["db-01"],
      "stats": {
        "db-01": {"ok": 3, "changed": 0, "failed": 1}
      }
    },
    {
      "id": "770g0622-g41d-63f6-c938-668877662222",
      "type": "adhoc",
      "status": "running",
      "start_time": "2024-01-20T10:10:00Z",
      "output": ["TASK [Gathering Facts] ***"]
    }
  ]
}
```

### 2. **Get Specific Execution**
```bash
GET /api/v1/ansible/executions/{id}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "playbook",
  "status": "success",
  "start_time": "2024-01-20T10:00:00Z",
  "end_time": "2024-01-20T10:05:23Z",
  "duration": 323.5,
  "output": [
    "PLAY [Deploy Application] ***",
    "TASK [Gathering Facts] ***",
    "ok: [web-01]",
    "ok: [web-02]",
    "TASK [Deploy application code] ***",
    "changed: [web-01]",
    "changed: [web-02]",
    "PLAY RECAP ***",
    "web-01 : ok=15 changed=3 unreachable=0 failed=0 skipped=2",
    "web-02 : ok=15 changed=3 unreachable=0 failed=0 skipped=2"
  ],
  "exit_code": 0,
  "stats": {
    "web-01": {
      "ok": 15,
      "changed": 3,
      "unreachable": 0,
      "failed": 0,
      "skipped": 2
    },
    "web-02": {
      "ok": 15,
      "changed": 3,
      "unreachable": 0,
      "failed": 0,
      "skipped": 2
    }
  },
  "changed": true,
  "unreachable": [],
  "failed": []
}
```

### 3. **Stream Real-Time Output**
```javascript
// WebSocket connection for live output
const ws = new WebSocket('ws://localhost:8080/api/v1/ansible/executions/{id}/stream');
```

---

## How Execution Tracking Works

### Step 1: Execution Starts
```go
// When playbook runs (executor.go lines 133-146)
execID := uuid.New().String()
result := &ExecutionResult{
    ID:        execID,
    Type:      "playbook",
    Status:    "running",    // Initial status
    StartTime: time.Now(),
}

// Store in memory
e.executions[execID] = result
```

### Step 2: During Execution
```go
// Collect output in real-time (lines 349-353)
scanner := bufio.NewScanner(stdout)
for scanner.Scan() {
    line := scanner.Text()
    result.Output = append(result.Output, line)
    outputChan <- line  // Stream to WebSocket
}
```

### Step 3: Execution Completes
```go
// Update status based on exit code (lines 377-387)
if err != nil {
    result.Status = "failed"
    result.ExitCode = exitError.ExitCode()
} else {
    result.Status = "success"
    result.ExitCode = 0
}

result.EndTime = &endTime
result.Duration = endTime.Sub(result.StartTime).Seconds()
```

### Step 4: Parse Statistics
```go
// Extract PLAY RECAP statistics (lines 399-430)
// Example: "web-01 : ok=15 changed=3 unreachable=0 failed=0"
if strings.Contains(line, "ok=") && strings.Contains(line, "changed=") {
    // Parse and store stats
    stats[host] = hostStats
    
    // Track failures and changes
    if changed > 0 {
        result.Changed = true
    }
    if failed > 0 {
        result.Failed = append(result.Failed, host)
    }
}
```

---

## Current Limitations & Solutions

### Current Implementation (In-Memory)

**Limitations:**
1. **Data Loss on Restart** - All history lost when API restarts
2. **Memory Usage** - Grows unbounded with executions
3. **No Pagination** - Returns all executions at once
4. **No Filtering** - Can't query by status, date, etc.
5. **No Persistence** - Can't analyze historical trends

### Production-Ready Enhancement

Let me create an enhanced version with database persistence:

```go
// Enhanced Execution Storage with Database
package ansible

import (
    "database/sql"
    "encoding/json"
    "time"
    _ "github.com/lib/pq" // PostgreSQL driver
)

type ExecutionStore struct {
    db         *sql.DB
    inMemory   map[string]*ExecutionResult  // Recent cache
    maxInMemory int                         // Cache size limit
}

// Database schema
const createTableSQL = `
CREATE TABLE IF NOT EXISTS ansible_executions (
    id UUID PRIMARY KEY,
    type VARCHAR(20),
    status VARCHAR(20),
    playbook VARCHAR(255),
    inventory VARCHAR(255),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    duration FLOAT,
    exit_code INT,
    changed BOOLEAN,
    output TEXT,
    stats JSONB,
    failed TEXT[],
    unreachable TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_status (status),
    INDEX idx_start_time (start_time),
    INDEX idx_playbook (playbook)
);`

// Save execution to database
func (es *ExecutionStore) SaveExecution(result *ExecutionResult) error {
    outputJSON, _ := json.Marshal(result.Output)
    statsJSON, _ := json.Marshal(result.Stats)
    
    _, err := es.db.Exec(`
        INSERT INTO ansible_executions 
        (id, type, status, start_time, end_time, duration, 
         exit_code, changed, output, stats, failed, unreachable)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO UPDATE SET
            status = $3,
            end_time = $5,
            duration = $6,
            exit_code = $7,
            output = $9,
            stats = $10`,
        result.ID, result.Type, result.Status, result.StartTime,
        result.EndTime, result.Duration, result.ExitCode, result.Changed,
        outputJSON, statsJSON, pq.Array(result.Failed), 
        pq.Array(result.Unreachable))
    
    return err
}

// Query executions with filters
func (es *ExecutionStore) QueryExecutions(filters QueryFilters) ([]*ExecutionResult, error) {
    query := `
        SELECT id, type, status, start_time, end_time, duration,
               exit_code, changed, output, stats, failed, unreachable
        FROM ansible_executions
        WHERE 1=1`
    
    args := []interface{}{}
    argCount := 0
    
    // Add filters
    if filters.Status != "" {
        argCount++
        query += fmt.Sprintf(" AND status = $%d", argCount)
        args = append(args, filters.Status)
    }
    
    if filters.Type != "" {
        argCount++
        query += fmt.Sprintf(" AND type = $%d", argCount)
        args = append(args, filters.Type)
    }
    
    if !filters.StartDate.IsZero() {
        argCount++
        query += fmt.Sprintf(" AND start_time >= $%d", argCount)
        args = append(args, filters.StartDate)
    }
    
    if !filters.EndDate.IsZero() {
        argCount++
        query += fmt.Sprintf(" AND start_time <= $%d", argCount)
        args = append(args, filters.EndDate)
    }
    
    // Add sorting and pagination
    query += fmt.Sprintf(" ORDER BY start_time DESC LIMIT %d OFFSET %d", 
        filters.Limit, filters.Offset)
    
    rows, err := es.db.Query(query, args...)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    
    var results []*ExecutionResult
    for rows.Next() {
        result := &ExecutionResult{}
        // Scan and unmarshal...
        results = append(results, result)
    }
    
    return results, nil
}

// Cleanup old executions
func (es *ExecutionStore) CleanupOldExecutions(retentionDays int) error {
    cutoff := time.Now().AddDate(0, 0, -retentionDays)
    
    _, err := es.db.Exec(`
        DELETE FROM ansible_executions 
        WHERE start_time < $1`, cutoff)
    
    return err
}

// Get execution statistics
func (es *ExecutionStore) GetStatistics(period string) (*ExecutionStats, error) {
    stats := &ExecutionStats{}
    
    // Success rate
    err := es.db.QueryRow(`
        SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN status = 'success' THEN 1 END) as success,
            COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
            AVG(duration) as avg_duration
        FROM ansible_executions
        WHERE start_time >= NOW() - INTERVAL '1 ' || $1`,
        period).Scan(&stats.Total, &stats.Success, 
                     &stats.Failed, &stats.AvgDuration)
    
    if stats.Total > 0 {
        stats.SuccessRate = float64(stats.Success) / float64(stats.Total) * 100
    }
    
    return stats, err
}
```

---

## Usage Examples

### 1. **Check Recent Execution Status**
```bash
# List all executions
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/ansible/executions | jq '.'

# Filter by status (with enhanced version)
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/v1/ansible/executions?status=failed&limit=10"
```

### 2. **Monitor Running Playbook**
```bash
# Start playbook
EXEC_ID=$(curl -X POST http://localhost:8080/api/v1/ansible/playbooks/run \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"playbook": "deploy.yml", "inventory": "prod"}' \
  | jq -r '.id')

# Check status
while true; do
  STATUS=$(curl -s http://localhost:8080/api/v1/ansible/executions/$EXEC_ID \
    -H "Authorization: Bearer $TOKEN" | jq -r '.status')
  
  echo "Status: $STATUS"
  
  if [ "$STATUS" != "running" ]; then
    break
  fi
  
  sleep 5
done
```

### 3. **Analyze Failure Patterns**
```javascript
// Get failed executions
async function getFailedExecutions() {
  const response = await fetch('/api/v1/ansible/executions');
  const data = await response.json();
  
  const failed = data.executions.filter(e => e.status === 'failed');
  
  // Analyze failure patterns
  const failuresByHost = {};
  failed.forEach(exec => {
    exec.failed?.forEach(host => {
      failuresByHost[host] = (failuresByHost[host] || 0) + 1;
    });
  });
  
  console.log('Hosts with most failures:', failuresByHost);
}
```

### 4. **Dashboard Metrics**
```javascript
// Calculate success rate
function calculateMetrics(executions) {
  const total = executions.length;
  const successful = executions.filter(e => e.status === 'success').length;
  const failed = executions.filter(e => e.status === 'failed').length;
  const running = executions.filter(e => e.status === 'running').length;
  
  const avgDuration = executions
    .filter(e => e.duration)
    .reduce((sum, e) => sum + e.duration, 0) / total;
  
  return {
    total,
    successful,
    failed,
    running,
    successRate: (successful / total * 100).toFixed(2) + '%',
    avgDuration: avgDuration.toFixed(2) + ' seconds'
  };
}
```

---

## Comparison with Other Tools

| Feature | Vapor (Current) | Ansible Tower/AWX | Rundeck | Jenkins |
|---------|----------------|-------------------|---------|---------|
| **Execution History** | ✅ In-memory | ✅ PostgreSQL | ✅ H2/MySQL | ✅ File-based |
| **Persistence** | ❌ Lost on restart | ✅ Permanent | ✅ Permanent | ✅ Permanent |
| **Search/Filter** | ❌ Basic | ✅ Advanced | ✅ Advanced | ✅ Good |
| **Statistics** | ⚠️ Basic | ✅ Dashboards | ✅ Reports | ✅ Trends |
| **Retention Policy** | ❌ None | ✅ Configurable | ✅ Configurable | ✅ Configurable |
| **Export History** | ❌ None | ✅ CSV/JSON | ✅ Multiple formats | ✅ API/Files |

---

## Best Practices

### 1. **Regular Cleanup**
```go
// Implement retention policy
func (e *Executor) CleanupExecutions(maxAge time.Duration) {
    e.mu.Lock()
    defer e.mu.Unlock()
    
    cutoff := time.Now().Add(-maxAge)
    
    for id, result := range e.executions {
        if result.EndTime != nil && result.EndTime.Before(cutoff) {
            delete(e.executions, id)
            delete(e.outputStreams, id)
        }
    }
}
```

### 2. **Memory Management**
```go
// Limit stored output lines
const maxOutputLines = 1000

if len(result.Output) > maxOutputLines {
    // Keep first and last 500 lines
    result.Output = append(
        result.Output[:500],
        result.Output[len(result.Output)-500:]...
    )
}
```

### 3. **Monitoring Integration**
```go
// Export metrics for Prometheus
func (e *Executor) GetMetrics() map[string]float64 {
    e.mu.RLock()
    defer e.mu.RUnlock()
    
    metrics := map[string]float64{
        "ansible_executions_total": float64(len(e.executions)),
        "ansible_executions_running": 0,
        "ansible_executions_failed": 0,
        "ansible_executions_success": 0,
    }
    
    for _, exec := range e.executions {
        switch exec.Status {
        case "running":
            metrics["ansible_executions_running"]++
        case "failed":
            metrics["ansible_executions_failed"]++
        case "success":
            metrics["ansible_executions_success"]++
        }
    }
    
    return metrics
}
```

---

## Future Enhancements

1. **Database Persistence** - PostgreSQL/MySQL storage
2. **Advanced Querying** - Filter by date, status, playbook
3. **Execution Comparison** - Diff between runs
4. **Scheduled Reports** - Daily/weekly summaries
5. **Webhook Notifications** - On completion/failure
6. **Execution Replay** - Re-run with same parameters
7. **Audit Trail** - Who ran what, when, and why
8. **Cost Tracking** - Resource usage per execution

---

## Conclusion

While Ansible doesn't provide execution history, Vapor implements a comprehensive tracking system that:

1. **Tracks all executions** with unique IDs
2. **Maintains complete output** for debugging
3. **Parses statistics** for analysis
4. **Provides real-time streaming** via WebSocket
5. **Enables monitoring** through API endpoints

The current in-memory implementation is suitable for development and small deployments. For production use, adding database persistence would provide permanent history, advanced querying, and better scalability.
