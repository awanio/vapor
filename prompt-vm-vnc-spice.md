# Implementation Prompt: VNC/SPICE WebSocket Console Proxy for Vapor VM Management

## Project Context
You are working on the Vapor project, a Go-based VM management API that uses libvirt for virtualization. The project uses the Gin web framework and has existing endpoints for VM console access that are currently placeholders and need to be fully implemented.

## Current State Analysis

### Existing Code Structure
1. **HTTP Endpoints** (in `internal/routes/libvirt.go`):
   - `GET /virtualization/virtualmachines/:id/console` - Returns console connection info
   - `GET /virtualization/virtualmachines/:id/console/ws` - WebSocket endpoint for console proxy

2. **Service Method** (in `internal/libvirt/service.go`):
   - `GetConsole()` method currently returns hardcoded values:
     - Static ports (5900 for VNC, 5930 for SPICE)
     - Doesn't parse actual libvirt XML for real connection details
     - Generates a token but doesn't properly validate it

3. **WebSocket Handler** (in `internal/routes/libvirt.go`):
   - `vmConsoleWebSocket()` only upgrades connection and sends a confirmation message
   - No actual proxying implementation
   - No real VNC/SPICE protocol handling

## Required Implementation

### 1. Parse Actual Console Information from Libvirt

Create a new file `internal/libvirt/console.go` with the following functionality:

```go
// Parse the domain XML to extract real graphics device information
// Expected XML structure:
// <domain>
//   <devices>
//     <graphics type='vnc' port='5901' autoport='yes' listen='0.0.0.0' passwd='secret'>
//       <listen type='address' address='0.0.0.0'/>
//     </graphics>
//   </devices>
// </domain>
```

Key requirements:
- Parse graphics type (vnc/spice)
- Extract actual runtime port (handle autoport="yes" cases)
- Get listen address (security consideration: may need to be localhost)
- Retrieve password if set
- Handle multiple graphics devices (use primary or allow selection)

### 2. Implement WebSocket to TCP Proxy

Create `internal/libvirt/console_proxy.go` with:

#### Core Proxy Components:
```go
type ConsoleProxy struct {
    // Track active connections
    connections map[string]*ProxyConnection
    // Reference to libvirt service
    service *Service
}

type ProxyConnection struct {
    Token      string
    VMName     string
    Type       string // "vnc" or "spice"
    WSConn     *websocket.Conn
    RemoteConn net.Conn
    // Context for cleanup
    ctx        context.Context
    cancel     context.CancelFunc
}
```

#### Bidirectional Data Flow:
1. **WebSocket → TCP (Client to VM)**:
   - Read WebSocket messages (binary frames for VNC/SPICE)
   - Forward raw bytes to TCP connection
   - Handle WebSocket control frames (ping/pong)

2. **TCP → WebSocket (VM to Client)**:
   - Read from TCP socket
   - Package as WebSocket binary frames
   - Send to client

#### Connection Management:
- Proper cleanup on disconnect
- Handle both sides closing
- Timeout management
- Error propagation

### 3. Token-Based Authentication

Enhance the token system:
- Store tokens with expiration (e.g., 5 minutes)
- Associate tokens with specific VMs and user sessions
- Validate token before establishing proxy connection
- Clean up expired tokens

### 4. Protocol-Specific Handling

#### For VNC:
- Handle RFB protocol handshake if needed
- Consider VNC authentication (if not handled by client)
- Support different VNC protocol versions

#### For SPICE:
- Handle SPICE protocol initialization
- Support SPICE channels if needed
- Consider TLS/encryption requirements

### 5. Security Considerations

1. **Network Security**:
   - Only proxy to allowed hosts (typically localhost or internal network)
   - Validate VM ownership before allowing console access
   - Rate limiting to prevent abuse

2. **Token Security**:
   - Use cryptographically secure random tokens
   - Short expiration times
   - One-time use tokens (invalidate after connection)

3. **Connection Isolation**:
   - Each proxy connection should be isolated
   - Prevent cross-VM access
   - Audit logging for console access

### 6. Error Handling and Resilience

1. **Connection Failures**:
   - Graceful handling of TCP connection failures
   - WebSocket disconnection handling
   - Retry logic where appropriate

2. **Resource Management**:
   - Limit concurrent connections per VM
   - Timeout idle connections
   - Clean up orphaned connections

3. **Monitoring**:
   - Log connection attempts
   - Track active connections
   - Performance metrics (latency, throughput)

## Implementation Steps

### Step 1: Update Service Layer
Modify `internal/libvirt/service.go`:
```go
func (s *Service) GetConsoleInfo(ctx context.Context, nameOrUUID string) (*ConsoleResponse, error) {
    // 1. Get domain
    // 2. Get XML description
    // 3. Parse graphics devices
    // 4. Extract real connection info
    // 5. Generate and store secure token
    // 6. Return complete console info
}
```

### Step 2: Create Console Proxy
Create `internal/libvirt/console_proxy.go`:
```go
func (cp *ConsoleProxy) HandleWebSocket(ws *websocket.Conn, token string) error {
    // 1. Validate token
    // 2. Get VM console details
    // 3. Establish TCP connection to VNC/SPICE
    // 4. Start bidirectional proxy
    // 5. Handle cleanup on disconnect
}
```

### Step 3: Update Route Handler
Modify `internal/routes/libvirt.go`:
```go
func vmConsoleWebSocket(service *libvirt.Service) gin.HandlerFunc {
    return func(c *gin.Context) {
        // 1. Validate request
        // 2. Upgrade to WebSocket
        // 3. Delegate to console proxy
        // 4. Handle errors
    }
}
```

### Step 4: Add Configuration
Add to config structure:
```go
type ConsoleConfig struct {
    MaxConnections int
    TokenTTL       time.Duration
    AllowedHosts   []string
    EnableTLS      bool
}
```

## Testing Requirements

1. **Unit Tests**:
   - XML parsing for different graphics configurations
   - Token generation and validation
   - Connection state management

2. **Integration Tests**:
   - Full WebSocket to VNC connection flow
   - Multiple concurrent connections
   - Connection cleanup on various disconnect scenarios

3. **Manual Testing**:
   - Test with actual VNC client (like noVNC)
   - Test with SPICE client (like spice-html5)
   - Verify with different VM configurations

## Client Integration

For web browser access, consider integrating:
- **noVNC**: JavaScript VNC client for browsers
- **spice-html5**: JavaScript SPICE client for browsers

These would connect to your WebSocket endpoint and render the console in the browser.

## Performance Considerations

1. **Buffer Sizes**: Optimize buffer sizes for data transfer (typically 4KB-64KB)
2. **Goroutine Management**: One goroutine pair per connection (read/write)
3. **Connection Pooling**: Consider pooling TCP connections if applicable
4. **Monitoring**: Track metrics like latency, bandwidth usage, active connections

## Example Usage Flow

1. Client requests console access: `GET /api/v1/virtualization/virtualmachines/vm-123/console`
2. Server returns: 
   ```json
   {
     "type": "vnc",
     "host": "localhost",
     "port": 5901,
     "token": "secure-random-token-xyz",
     "ws_path": "/ws/vm/console/secure-random-token-xyz"
   }
   ```
3. Client connects to WebSocket: `ws://server/api/v1/virtualization/virtualmachines/vm-123/console/ws?token=secure-random-token-xyz`
4. Server validates token and establishes proxy to `localhost:5901`
5. Bidirectional data flow begins
6. Console is accessible through the WebSocket connection

## Additional Notes

- The implementation should be production-ready with proper error handling
- Consider adding metrics and monitoring capabilities
- Document the API thoroughly for client developers
- Consider rate limiting and DDoS protection
- Plan for horizontal scaling if needed (sticky sessions for WebSocket)

## File Structure

```
internal/libvirt/
├── console.go           # Console information parsing and management
├── console_proxy.go     # WebSocket to TCP proxy implementation
├── console_types.go     # Console-related type definitions
└── console_test.go      # Console functionality tests
```

## Dependencies

You may need to add:
- XML parsing (already available via standard library)
- WebSocket support (already using gorilla/websocket)
- Context for cancellation (standard library)
- Possibly a token store (Redis or in-memory with TTL)

This implementation will provide a fully functional VNC/SPICE console access system through WebSockets, allowing browser-based clients to connect to VM consoles securely.
