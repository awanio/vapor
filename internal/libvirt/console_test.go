package libvirt

import (
	"context"
	"testing"
	"time"
)

func TestParseGraphicsDevices(t *testing.T) {
	tests := []struct {
		name    string
		xml     string
		want    []GraphicsDevice
		wantErr bool
	}{
		{
			name: "VNC graphics device",
			xml: `<domain>
<devices>
<graphics type='vnc' port='5901' autoport='yes' listen='0.0.0.0' passwd='secret'>
<listen type='address' address='0.0.0.0'/>
</graphics>
</devices>
</domain>`,
			want: []GraphicsDevice{
				{
					Type:     "vnc",
					Port:     "5901",
					Autoport: "yes",
					Listen:   "0.0.0.0",
					Password: "secret",
				},
			},
			wantErr: false,
		},
		{
			name: "SPICE graphics device with TLS",
			xml: `<domain>
<devices>
<graphics type='spice' port='5930' tlsPort='5931' autoport='no' listen='127.0.0.1'>
<listen type='address' address='127.0.0.1'/>
</graphics>
</devices>
</domain>`,
			want: []GraphicsDevice{
				{
					Type:     "spice",
					Port:     "5930",
					TLSPort:  "5931",
					Autoport: "no",
					Listen:   "127.0.0.1",
				},
			},
			wantErr: false,
		},
		{
			name: "Multiple graphics devices",
			xml: `<domain>
<devices>
<graphics type='vnc' port='5900' autoport='yes' listen='0.0.0.0'/>
<graphics type='spice' port='5930' autoport='yes' listen='0.0.0.0'/>
</devices>
</domain>`,
			want: []GraphicsDevice{
				{
					Type:     "vnc",
					Port:     "5900",
					Autoport: "yes",
					Listen:   "0.0.0.0",
				},
				{
					Type:     "spice",
					Port:     "5930",
					Autoport: "yes",
					Listen:   "0.0.0.0",
				},
			},
			wantErr: false,
		},
		{
			name: "No graphics devices",
			xml: `<domain>
<devices>
</devices>
</domain>`,
			want:    []GraphicsDevice{},
			wantErr: false,
		},
		{
			name:    "Invalid XML",
			xml:     `<invalid>`,
			want:    nil,
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := parseGraphicsDevices(tt.xml)
			if (err != nil) != tt.wantErr {
				t.Errorf("parseGraphicsDevices() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr && len(got) != len(tt.want) {
				t.Errorf("parseGraphicsDevices() got %d devices, want %d", len(got), len(tt.want))
				return
			}
			for i, device := range got {
				if i >= len(tt.want) {
					break
				}
				if device.Type != tt.want[i].Type {
					t.Errorf("Device %d: Type = %v, want %v", i, device.Type, tt.want[i].Type)
				}
				if device.Port != tt.want[i].Port {
					t.Errorf("Device %d: Port = %v, want %v", i, device.Port, tt.want[i].Port)
				}
				if device.Listen != tt.want[i].Listen {
					t.Errorf("Device %d: Listen = %v, want %v", i, device.Listen, tt.want[i].Listen)
				}
			}
		})
	}
}

func TestGenerateSecureToken(t *testing.T) {
	token1, err := generateSecureToken()
	if err != nil {
		t.Fatalf("generateSecureToken() error = %v", err)
	}

	if len(token1) != 64 { // 32 bytes hex encoded = 64 characters
		t.Errorf("Token length = %d, want 64", len(token1))
	}

	token2, err := generateSecureToken()
	if err != nil {
		t.Fatalf("generateSecureToken() error = %v", err)
	}

	if token1 == token2 {
		t.Error("Generated tokens are not unique")
	}
}

func TestConsoleProxyTokenManagement(t *testing.T) {
	cp := NewConsoleProxy(nil, &ConsoleConfig{
		TokenTTL:        1 * time.Minute,
		CleanupInterval: 1 * time.Minute,
	})
	defer cp.Stop()

	ctx := context.Background()

	// Test storing and validating token
	token := &ConsoleToken{
		Token:       "test-token-123",
		VMName:      "test-vm",
		VMUuid:      "uuid-123",
		ConsoleType: ConsoleTypeVNC,
		Host:        "localhost",
		Port:        5900,
		ExpiresAt:   time.Now().Add(1 * time.Minute),
		Used:        false,
	}

	cp.StoreToken(token)

	// Test valid token
	retrieved, err := cp.ValidateToken("test-token-123")
	if err != nil {
		t.Errorf("ValidateToken() error = %v", err)
	}
	if retrieved.VMName != "test-vm" {
		t.Errorf("Token VMName = %v, want %v", retrieved.VMName, "test-vm")
	}
	if !retrieved.Used {
		t.Error("Token should be marked as used after validation")
	}

	// Test token can't be used twice
	_, err = cp.ValidateToken("test-token-123")
	if err == nil {
		t.Error("Expected error for already used token")
	}
	if consoleErr, ok := err.(*ConsoleError); ok {
		if consoleErr.Code != ErrCodeTokenUsed {
			t.Errorf("Expected error code %s, got %s", ErrCodeTokenUsed, consoleErr.Code)
		}
	}

	// Test invalid token
	_, err = cp.ValidateToken("invalid-token")
	if err == nil {
		t.Error("Expected error for invalid token")
	}
	if consoleErr, ok := err.(*ConsoleError); ok {
		if consoleErr.Code != ErrCodeTokenInvalid {
			t.Errorf("Expected error code %s, got %s", ErrCodeTokenInvalid, consoleErr.Code)
		}
	}

	// Test expired token
	expiredToken := &ConsoleToken{
		Token:     "expired-token",
		VMName:    "test-vm",
		ExpiresAt: time.Now().Add(-1 * time.Minute), // Already expired
		Used:      false,
	}
	cp.StoreToken(expiredToken)

	_, err = cp.ValidateToken("expired-token")
	if err == nil {
		t.Error("Expected error for expired token")
	}
	if consoleErr, ok := err.(*ConsoleError); ok {
		if consoleErr.Code != ErrCodeTokenExpired {
			t.Errorf("Expected error code %s, got %s", ErrCodeTokenExpired, consoleErr.Code)
		}
	}

	_ = ctx // Suppress unused variable warning
}

func TestConsoleProxyConnectionManagement(t *testing.T) {
	config := &ConsoleConfig{
		MaxConnectionsPerVM: 2,
		CleanupInterval:     1 * time.Minute,
		MaxTotalConnections: 5,
	}
	cp := NewConsoleProxy(nil, config)
	defer cp.Stop()

	// Test adding connections
	conn1 := &ProxyConnection{
		ID:     "conn-1",
		VMName: "vm1",
	}
	err := cp.AddConnection(conn1)
	if err != nil {
		t.Errorf("AddConnection() error = %v", err)
	}

	// Test connection count
	count := cp.GetActiveConnections("vm1")
	if count != 1 {
		t.Errorf("GetActiveConnections() = %d, want 1", count)
	}

	// Add another connection for same VM
	conn2 := &ProxyConnection{
		ID:     "conn-2",
		VMName: "vm1",
	}
	err = cp.AddConnection(conn2)
	if err != nil {
		t.Errorf("AddConnection() error = %v", err)
	}

	// Try to exceed per-VM limit
	conn3 := &ProxyConnection{
		ID:     "conn-3",
		VMName: "vm1",
	}
	err = cp.AddConnection(conn3)
	if err == nil {
		t.Error("Expected error when exceeding per-VM connection limit")
	}

	// Add connection for different VM
	conn4 := &ProxyConnection{
		ID:     "conn-4",
		VMName: "vm2",
	}
	err = cp.AddConnection(conn4)
	if err != nil {
		t.Errorf("AddConnection() error = %v", err)
	}

	// Test removing connection
	cp.RemoveConnection("conn-1")
	count = cp.GetActiveConnections("vm1")
	if count != 1 {
		t.Errorf("After removal, GetActiveConnections() = %d, want 1", count)
	}

	// Test closing all connections for a VM
	cp.CloseVMConnections("vm1")
	count = cp.GetActiveConnections("vm1")
	if count != 0 {
		t.Errorf("After CloseVMConnections, count = %d, want 0", count)
	}
}

func TestIsHostAllowed(t *testing.T) {
	tests := []struct {
		name         string
		allowedHosts []string
		host         string
		want         bool
	}{
		{
			name:         "Default allows localhost",
			allowedHosts: []string{},
			host:         "localhost",
			want:         true,
		},
		{
			name:         "Default allows 127.0.0.1",
			allowedHosts: []string{},
			host:         "127.0.0.1",
			want:         true,
		},
		{
			name:         "Default denies other hosts",
			allowedHosts: []string{},
			host:         "192.168.1.1",
			want:         false,
		},
		{
			name:         "Custom allowed host",
			allowedHosts: []string{"192.168.1.1", "localhost"},
			host:         "192.168.1.1",
			want:         true,
		},
		{
			name:         "Host not in custom list",
			allowedHosts: []string{"192.168.1.1"},
			host:         "10.0.0.1",
			want:         false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cp := &ConsoleProxy{
				config: &ConsoleConfig{
					AllowedHosts: tt.allowedHosts,
				},
			}
			if got := cp.isHostAllowed(tt.host); got != tt.want {
				t.Errorf("isHostAllowed() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestProxyConnectionStats(t *testing.T) {
	conn := &ProxyConnection{}

	// Test incrementing stats
	conn.IncrementBytesSent(100)
	conn.IncrementBytesRecv(200)

	sent, recv := conn.GetStats()
	if sent != 100 {
		t.Errorf("BytesSent = %d, want 100", sent)
	}
	if recv != 200 {
		t.Errorf("BytesRecv = %d, want 200", recv)
	}

	// Test activity tracking
	conn.UpdateActivity()
	if conn.lastActivity.IsZero() {
		t.Error("lastActivity not updated")
	}
}

func TestDefaultConsoleConfig(t *testing.T) {
	config := DefaultConsoleConfig()

	if config.MaxConnectionsPerVM != 5 {
		t.Errorf("MaxConnectionsPerVM = %d, want 5", config.MaxConnectionsPerVM)
	}
	if config.TokenTTL != 5*time.Minute {
		t.Errorf("TokenTTL = %v, want 5 minutes", config.TokenTTL)
	}
	if config.BufferSize != 32*1024 {
		t.Errorf("BufferSize = %d, want 32KB", config.BufferSize)
	}
	if len(config.AllowedHosts) != 3 {
		t.Errorf("AllowedHosts length = %d, want 3", len(config.AllowedHosts))
	}
}
