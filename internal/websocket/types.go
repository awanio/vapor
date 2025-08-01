package websocket

import (
	"time"
)

// MessageType represents the type of WebSocket message
type MessageType string

const (
	// Message types
	MessageTypeAuth        MessageType = "auth"
	MessageTypeSubscribe   MessageType = "subscribe"
	MessageTypeUnsubscribe MessageType = "unsubscribe"
	MessageTypeData        MessageType = "data"
	MessageTypeInput       MessageType = "input"
	MessageTypeOutput      MessageType = "output"
	MessageTypeResize      MessageType = "resize"
	MessageTypeError       MessageType = "error"
	MessageTypePing        MessageType = "ping"
	MessageTypePong        MessageType = "pong"
)

// Message represents a WebSocket message
type Message struct {
	Type    MessageType    `json:"type"`
	Payload interface{}    `json:"payload,omitempty"`
	Error   string         `json:"error,omitempty"`
	ID      string         `json:"id,omitempty"`
}

// AuthPayload represents authentication data
type AuthPayload struct {
	Token string `json:"token"`
}

// SubscribePayload represents subscription request
type SubscribePayload struct {
	Channel string            `json:"channel"`
	Filters map[string]string `json:"filters,omitempty"`
}

// MetricsData represents system metrics
type MetricsData struct {
	Timestamp time.Time    `json:"timestamp"`
	CPU       CPUMetrics   `json:"cpu"`
	Memory    MemoryMetrics `json:"memory"`
	Disk      []DiskMetrics `json:"disk"`
	Network   []NetworkMetrics `json:"network"`
}

// CPUMetrics represents CPU usage data
type CPUMetrics struct {
	Usage       float64   `json:"usage"`
	Cores       int       `json:"cores"`
	PerCore     []float64 `json:"per_core"`
	LoadAverage []float64 `json:"load_average"`
}

// MemoryMetrics represents memory usage data
type MemoryMetrics struct {
	Total       uint64  `json:"total"`
	Used        uint64  `json:"used"`
	Free        uint64  `json:"free"`
	Available   uint64  `json:"available"`
	UsedPercent float64 `json:"used_percent"`
	SwapTotal   uint64  `json:"swap_total"`
	SwapUsed    uint64  `json:"swap_used"`
	SwapFree    uint64  `json:"swap_free"`
}

// DiskMetrics represents disk usage data
type DiskMetrics struct {
	Device      string  `json:"device"`
	Mountpoint  string  `json:"mountpoint"`
	Fstype      string  `json:"fstype"`
	Total       uint64  `json:"total"`
	Used        uint64  `json:"used"`
	Free        uint64  `json:"free"`
	UsedPercent float64 `json:"used_percent"`
}

// NetworkMetrics represents network interface data
type NetworkMetrics struct {
	Interface   string `json:"interface"`
	BytesSent   uint64 `json:"bytes_sent"`
	BytesRecv   uint64 `json:"bytes_recv"`
	PacketsSent uint64 `json:"packets_sent"`
	PacketsRecv uint64 `json:"packets_recv"`
	Errin       uint64 `json:"errin"`
	Errout      uint64 `json:"errout"`
	Dropin      uint64 `json:"dropin"`
	Dropout     uint64 `json:"dropout"`
}

// LogEntry represents a log entry
type LogEntry struct {
	Timestamp time.Time         `json:"timestamp"`
	Level     string            `json:"level"`
	Unit      string            `json:"unit,omitempty"`
	Message   string            `json:"message"`
	Fields    map[string]string `json:"fields,omitempty"`
}

// TerminalSize represents terminal dimensions
type TerminalSize struct {
	Rows int `json:"rows"`
	Cols int `json:"cols"`
}

// TerminalInput represents terminal input
type TerminalInput struct {
	Data string `json:"data"`
}

// TerminalOutput represents terminal output
type TerminalOutput struct {
	Data string `json:"data"`
}

// LogQuery represents log query filters
type LogQuery struct {
	Unit     string `json:"unit,omitempty"`
	Priority string `json:"priority,omitempty"`
	Since    string `json:"since,omitempty"`
	Until    string `json:"until,omitempty"`
	Follow   bool   `json:"follow,omitempty"`
}
