package logs

import (
	"bufio"
	"encoding/json"
	"fmt"
	"net/http"
	"os/exec"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/awanio/vapor/internal/common"
)

// Service handles log operations
type Service struct{}

// NewService creates a new logs service
func NewService() *Service {
	return &Service{}
}

// LogEntry represents a single log entry
type LogEntry struct {
	Timestamp time.Time `json:"timestamp"`
	Priority  string    `json:"priority"`
	Unit      string    `json:"unit"`
	Message   string    `json:"message"`
	Hostname  string    `json:"hostname"`
	PID       int       `json:"pid"`
}

// LogsResponse represents the logs query response
type LogsResponse struct {
	Logs       []LogEntry `json:"logs"`
	TotalCount int        `json:"total_count"`
	Page       int        `json:"page"`
	PageSize   int        `json:"page_size"`
}

// GetLogs retrieves system logs from journald
func (s *Service) GetLogs(c *gin.Context) {
	// Check if journalctl is available
	if !isJournalctlAvailable() {
		common.SendError(c, http.StatusNotImplemented, common.ErrCodeNotImplemented, 
			"Log viewing requires systemd journalctl, which is only available on Linux systems with systemd")
		return
	}

	// Parse query parameters
	service := c.Query("service")
	priority := c.Query("priority")
	since := c.Query("since")
	until := c.Query("until")
	pageStr := c.DefaultQuery("page", "1")
	pageSizeStr := c.DefaultQuery("page_size", "100")

	page, _ := strconv.Atoi(pageStr)
	pageSize, _ := strconv.Atoi(pageSizeStr)

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 1000 {
		pageSize = 100
	}

	// Build journalctl command
	args := []string{"-o", "json", "--no-pager"}

	if service != "" {
		args = append(args, "-u", service)
	}

	if priority != "" {
		args = append(args, "-p", priority)
	}

	if since != "" {
		args = append(args, "--since", since)
	}

	if until != "" {
		args = append(args, "--until", until)
	}

	// Add line limit for pagination
	args = append(args, "-n", strconv.Itoa(pageSize*page))

	// Execute journalctl
	cmd := exec.Command("journalctl", args...)
	output, err := cmd.Output()
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to read logs", err.Error())
		return
	}

	// Parse log entries
	logs, err := s.parseJournalOutput(output)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to parse logs", err.Error())
		return
	}

	// Apply pagination
	startIdx := (page - 1) * pageSize
	endIdx := startIdx + pageSize
	
	if startIdx >= len(logs) {
		logs = []LogEntry{}
	} else if endIdx > len(logs) {
		logs = logs[startIdx:]
	} else {
		logs = logs[startIdx:endIdx]
	}

	response := LogsResponse{
		Logs:       logs,
		TotalCount: len(logs),
		Page:       page,
		PageSize:   pageSize,
	}

	common.SendSuccess(c, response)
}

// parseJournalOutput parses journalctl JSON output
func (s *Service) parseJournalOutput(output []byte) ([]LogEntry, error) {
	lines := strings.Split(string(output), "\n")
	logs := make([]LogEntry, 0, len(lines))

	for _, line := range lines {
		if line == "" {
			continue
		}

		var entry journalEntry
		if err := json.Unmarshal([]byte(line), &entry); err != nil {
			continue // Skip malformed entries
		}

		logEntry := s.journalEntryToLogEntry(entry)
		logs = append(logs, logEntry)
	}

	return logs, nil
}

// journalEntry represents the raw journal entry
type journalEntry struct {
	RealtimeTimestamp string `json:"__REALTIME_TIMESTAMP"`
	Priority          string `json:"PRIORITY"`
	SyslogIdentifier  string `json:"SYSLOG_IDENTIFIER"`
	Unit              string `json:"_SYSTEMD_UNIT"`
	Message           string `json:"MESSAGE"`
	Hostname          string `json:"_HOSTNAME"`
	PID               string `json:"_PID"`
}

// journalEntryToLogEntry converts journal entry to LogEntry
func (s *Service) journalEntryToLogEntry(entry journalEntry) LogEntry {
	// Parse timestamp (microseconds since epoch)
	var timestamp time.Time
	if ts, err := strconv.ParseInt(entry.RealtimeTimestamp, 10, 64); err == nil {
		timestamp = time.Unix(0, ts*1000)
	}

	// Parse PID
	pid, _ := strconv.Atoi(entry.PID)

	// Map priority
	priority := s.mapPriority(entry.Priority)

	// Determine unit name
	unit := entry.Unit
	if unit == "" {
		unit = entry.SyslogIdentifier
	}

	return LogEntry{
		Timestamp: timestamp,
		Priority:  priority,
		Unit:      unit,
		Message:   entry.Message,
		Hostname:  entry.Hostname,
		PID:       pid,
	}
}

// mapPriority maps journal priority number to string
func (s *Service) mapPriority(priority string) string {
	switch priority {
	case "0":
		return "emergency"
	case "1":
		return "alert"
	case "2":
		return "critical"
	case "3":
		return "error"
	case "4":
		return "warning"
	case "5":
		return "notice"
	case "6":
		return "info"
	case "7":
		return "debug"
	default:
		return "unknown"
	}
}

// GetLogsSummary returns a summary of logs by priority and service
func (s *Service) GetLogsSummary(c *gin.Context) {
	// Get counts by priority
	priorities := []string{"emergency", "alert", "critical", "error", "warning", "notice", "info", "debug"}
	summary := make(map[string]int)

	for i, priority := range priorities {
		cmd := exec.Command("journalctl", "-p", strconv.Itoa(i), "--no-pager", "-q", "--output=short")
		output, err := cmd.Output()
		if err == nil {
			lines := strings.Split(string(output), "\n")
			count := 0
			for _, line := range lines {
				if line != "" {
					count++
				}
			}
			summary[priority] = count
		}
	}

	// Get top services with errors
	cmd := exec.Command("journalctl", "-p", "3", "--no-pager", "-o", "json")
	output, _ := cmd.Output()
	
	serviceCounts := make(map[string]int)
	lines := strings.Split(string(output), "\n")
	for _, line := range lines {
		if line == "" {
			continue
		}
		var entry journalEntry
		if err := json.Unmarshal([]byte(line), &entry); err == nil {
			if entry.Unit != "" {
				serviceCounts[entry.Unit]++
			}
		}
	}

	common.SendSuccess(c, gin.H{
		"priority_summary": summary,
		"error_by_service": serviceCounts,
	})
}

// StreamLogs streams logs in real-time using Server-Sent Events
func (s *Service) StreamLogs(c *gin.Context) {
	// Set headers for SSE
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")

	service := c.Query("service")
	priority := c.Query("priority")

	// Build journalctl command for following logs
	args := []string{"-f", "-o", "json", "--no-pager"}
	
	if service != "" {
		args = append(args, "-u", service)
	}
	
	if priority != "" {
		args = append(args, "-p", priority)
	}

	cmd := exec.Command("journalctl", args...)
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		fmt.Fprintf(c.Writer, "event: error\ndata: %s\n\n", err.Error())
		return
	}

	if err := cmd.Start(); err != nil {
		fmt.Fprintf(c.Writer, "event: error\ndata: %s\n\n", err.Error())
		return
	}

	// Stream logs
	scanner := bufio.NewScanner(stdout)
	for scanner.Scan() {
		line := scanner.Text()
		if line == "" {
			continue
		}

		var entry journalEntry
		if err := json.Unmarshal([]byte(line), &entry); err == nil {
			logEntry := s.journalEntryToLogEntry(entry)
			data, _ := json.Marshal(logEntry)
			fmt.Fprintf(c.Writer, "event: log\ndata: %s\n\n", string(data))
			c.Writer.Flush()
		}
	}

	cmd.Wait()
}
