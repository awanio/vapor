package libvirt

import (
	"context"
	"net"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// ConsoleType represents the type of console (VNC or SPICE)
type ConsoleType string

const (
	ConsoleTypeVNC   ConsoleType = "vnc"
	ConsoleTypeSPICE ConsoleType = "spice"
)

// ConsoleInfo represents console connection information
type ConsoleInfo struct {
	Type       ConsoleType `json:"type"`
	Host       string      `json:"host"`
	Port       int         `json:"port"`
	Password   string      `json:"password,omitempty"`
	Token      string      `json:"token"`
	WSPath     string      `json:"ws_path"`
	ExpiresAt  time.Time   `json:"expires_at"`
	TLSEnabled bool        `json:"tls_enabled,omitempty"`
	TLSPort    int         `json:"tls_port,omitempty"`
}

// ConsoleToken represents a console access token
type ConsoleToken struct {
	Token       string
	VMName      string
	VMUuid      string
	ConsoleType ConsoleType
	Host        string
	Port        int
	Password    string
	ExpiresAt   time.Time
	Used        bool
	CreatedBy   string // User who created the token
}

// ConsoleProxy manages WebSocket to TCP proxying for console connections
type ConsoleProxy struct {
	mu          sync.RWMutex
	connections map[string]*ProxyConnection
	tokens      map[string]*ConsoleToken
	service     *Service
	config      *ConsoleConfig

	// Cleanup goroutine control
	stopCleanup chan struct{}
	cleanupDone chan struct{}
}

// ProxyConnection represents an active console proxy connection
type ProxyConnection struct {
	ID      string
	Token   string
	VMName  string
	VMUuid  string
	Type    ConsoleType
	WSConn  *websocket.Conn
	TCPConn net.Conn

	// Connection state
	ctx          context.Context
	cancel       context.CancelFunc
	established  time.Time
	lastActivity time.Time

	// Statistics
	BytesSent uint64
	BytesRecv uint64

	// Synchronization
	mu        sync.RWMutex
	closeOnce sync.Once
}

// ConsoleConfig holds configuration for console proxy
type ConsoleConfig struct {
	MaxConnectionsPerVM int           `json:"max_connections_per_vm"`
	MaxTotalConnections int           `json:"max_total_connections"`
	TokenTTL            time.Duration `json:"token_ttl"`
	ConnectionTimeout   time.Duration `json:"connection_timeout"`
	IdleTimeout         time.Duration `json:"idle_timeout"`
	AllowedHosts        []string      `json:"allowed_hosts"`
	EnableTLS           bool          `json:"enable_tls"`
	BufferSize          int           `json:"buffer_size"`
	CleanupInterval     time.Duration `json:"cleanup_interval"`
}

// DefaultConsoleConfig returns default console configuration
func DefaultConsoleConfig() *ConsoleConfig {
	return &ConsoleConfig{
		MaxConnectionsPerVM: 5,
		MaxTotalConnections: 100,
		TokenTTL:            5 * time.Minute,
		ConnectionTimeout:   30 * time.Second,
		IdleTimeout:         10 * time.Minute,
		AllowedHosts:        []string{"localhost", "127.0.0.1", "::1"},
		EnableTLS:           false,
		BufferSize:          32 * 1024, // 32KB
		CleanupInterval:     1 * time.Minute,
	}
}

// GraphicsDevice represents a parsed graphics device from libvirt XML
type GraphicsDevice struct {
	Type     string `xml:"type,attr"`
	Port     string `xml:"port,attr"`
	Autoport string `xml:"autoport,attr"`
	Listen   string `xml:"listen,attr"`
	Password string `xml:"passwd,attr,omitempty"`
	TLSPort  string `xml:"tlsPort,attr,omitempty"`
}

// DomainDevices represents the devices section of domain XML
// DiskDevice represents a disk device in domain XML
type DiskDevice struct {
	Type   string `xml:"type,attr"`
	Device string `xml:"device,attr"`
	Source struct {
		File string `xml:"file,attr,omitempty"`
		Dev  string `xml:"dev,attr,omitempty"`
		Name string `xml:"name,attr,omitempty"`
	} `xml:"source"`
	Driver struct {
		Name string `xml:"name,attr"`
		Type string `xml:"type,attr"`
	} `xml:"driver"`
	Target struct {
		Dev string `xml:"dev,attr"`
		Bus string `xml:"bus,attr"`
	} `xml:"target"`
}

type DomainDevices struct {
	Graphics []GraphicsDevice `xml:"graphics"`
	Disks    []DiskDevice     `xml:"disk"`
}

// DomainXML represents minimal domain XML structure for console parsing
type DomainXML struct {
	Devices DomainDevices `xml:"devices"`
}

// ConsoleError represents console-specific errors
type ConsoleError struct {
	Code    string
	Message string
	Err     error
}

func (e *ConsoleError) Error() string {
	if e.Err != nil {
		return e.Message + ": " + e.Err.Error()
	}
	return e.Message
}

// Error codes for console operations
const (
	ErrCodeTokenInvalid     = "INVALID_TOKEN"
	ErrCodeTokenExpired     = "TOKEN_EXPIRED"
	ErrCodeTokenUsed        = "TOKEN_ALREADY_USED"
	ErrCodeVMNotFound       = "VM_NOT_FOUND"
	ErrCodeNoConsole        = "NO_CONSOLE_AVAILABLE"
	ErrCodeConnectionFailed = "CONNECTION_FAILED"
	ErrCodeMaxConnections   = "MAX_CONNECTIONS_REACHED"
	ErrCodeUnauthorized     = "UNAUTHORIZED"
	ErrCodeInternalError    = "INTERNAL_ERROR"
)

// ConsoleAvailability represents the availability of different console types
type ConsoleAvailability struct {
	VNC   *ConsoleInfo `json:"vnc,omitempty"`
	SPICE *ConsoleInfo `json:"spice,omitempty"`
}

// MultiConsoleResponse represents all available console options for a VM
type MultiConsoleResponse struct {
	VMName    string              `json:"vm_name"`
	VMUuid    string              `json:"vm_uuid"`
	Available []string            `json:"available"` // ["vnc", "spice"]
	Consoles  ConsoleAvailability `json:"consoles"`
	Preferred string              `json:"preferred,omitempty"` // Suggested console type
}
