# VNC/SPICE WebSocket Console API Documentation

## Overview
The Vapor VM Management system provides a fully functional WebSocket-based console proxy for accessing VM consoles through VNC and SPICE protocols. This allows browser-based clients to connect to VM consoles securely without direct network access to the virtualization hosts.

## Architecture

### Components
1. **Console Proxy**: Manages WebSocket to TCP proxying
2. **Token Management**: Secure, time-limited access tokens
3. **Connection Pool**: Manages active console connections
4. **XML Parser**: Extracts console information from libvirt domains

### Data Flow
```
Browser Client → WebSocket → Vapor Console Proxy → TCP → VNC/SPICE Server
```

## API Endpoints

### 1. Get Console Information
Retrieves console connection details and generates an access token.

**Endpoint**: `GET /api/v1/virtualization/virtualmachines/:id/console`

**Response**:
```json
{
  "type": "vnc",
  "host": "localhost",
  "port": 5901,
  "token": "a1b2c3d4e5f6...",
  "ws_path": "/api/v1/virtualization/virtualmachines/:id/console/ws",
  "expires_at": "2024-01-15T10:30:00Z",
  "tls_enabled": false,
  "password": "********"  // Indicates password is set but not revealed
}
```

### 2. WebSocket Console Connection
Establishes a WebSocket connection for console access.

**Endpoint**: `GET /api/v1/virtualization/virtualmachines/:id/console/ws?token=<token>`

**Protocol**: WebSocket (ws:// or wss://)

**Query Parameters**:
- `token` (required): Access token from console information endpoint

**WebSocket Messages**:
- Binary frames: VNC/SPICE protocol data
- JSON messages: Error and status information

**Error Response** (sent via WebSocket):
```json
{
  "type": "error",
  "code": "INVALID_TOKEN",
  "error": "Invalid or expired token"
}
```

## Configuration

### Console Settings
Configure in `vapor.conf`:

```yaml
console:
  max_connections_per_vm: 5
  max_total_connections: 100
  token_ttl: "5m"
  connection_timeout: "30s"
  idle_timeout: "10m"
  allowed_hosts:
    - "localhost"
    - "127.0.0.1"
    - "192.168.1.0/24"
  enable_tls: false
  buffer_size: 32  # in KB
  cleanup_interval: "1m"
```

### Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `max_connections_per_vm` | 5 | Maximum concurrent connections per VM |
| `max_total_connections` | 100 | Maximum total concurrent connections |
| `token_ttl` | 5m | Token expiration time |
| `connection_timeout` | 30s | Timeout for establishing connections |
| `idle_timeout` | 10m | Timeout for idle connections |
| `allowed_hosts` | localhost only | Allowed console server hosts |
| `enable_tls` | false | Enable TLS for console connections |
| `buffer_size` | 32KB | Buffer size for data transfer |
| `cleanup_interval` | 1m | Interval for cleaning expired tokens/connections |

## Security Features

### Token-Based Authentication
- Cryptographically secure random tokens (256-bit)
- Time-limited validity (default: 5 minutes)
- One-time use only
- Associated with specific VM and user session

### Network Security
- Host validation against allowed list
- No direct exposure of VNC/SPICE ports
- All traffic proxied through authenticated WebSocket
- Optional TLS encryption

### Connection Limits
- Per-VM connection limits
- Total connection limits
- Automatic cleanup of idle connections
- Resource usage monitoring

## Client Integration

### Using noVNC (for VNC consoles)
```html
<!DOCTYPE html>
<html>
<head>
    <script src="https://cdn.jsdelivr.net/npm/@novnc/novnc/core/rfb.js"></script>
</head>
<body>
    <div id="screen"></div>
    <script>
        // Get console info
        fetch('/api/v1/virtualization/virtualmachines/vm-123/console')
            .then(res => res.json())
            .then(info => {
                // Connect via WebSocket
                const url = `ws://localhost:8080${info.ws_path}?token=${info.token}`;
                const rfb = new RFB(document.getElementById('screen'), url);
                
                rfb.addEventListener('connect', () => {
                    console.log('Connected to VNC console');
                });
                
                rfb.addEventListener('disconnect', () => {
                    console.log('Disconnected from VNC console');
                });
            });
    </script>
</body>
</html>
```

### Using spice-html5 (for SPICE consoles)
```javascript
// Similar integration with spice-html5 client library
const sc = new SpiceMainConn({
    uri: `ws://localhost:8080${info.ws_path}?token=${info.token}`,
    screen_id: 'spice-screen',
    password: info.password  // If required
});
```

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_TOKEN` | Token is invalid or not found |
| `TOKEN_EXPIRED` | Token has expired |
| `TOKEN_ALREADY_USED` | Token has already been used |
| `VM_NOT_FOUND` | Virtual machine not found |
| `NO_CONSOLE_AVAILABLE` | No console configured for VM |
| `CONNECTION_FAILED` | Failed to connect to console server |
| `MAX_CONNECTIONS_REACHED` | Connection limit exceeded |
| `UNAUTHORIZED` | Unauthorized access attempt |
| `INTERNAL_ERROR` | Internal server error |

## Monitoring and Statistics

### Get Console Statistics
```go
stats := service.GetConsoleStats()
// Returns:
// {
//   "total_connections": 15,
//   "total_tokens": 20,
//   "connections_per_vm": {
//     "vm-1": 2,
//     "vm-2": 3
//   }
// }
```

### Connection Metrics
- Bytes sent/received per connection
- Connection duration
- Last activity timestamp
- Active connection count

## Troubleshooting

### Common Issues

1. **"No console available"**
   - Ensure VM has graphics device configured
   - Check VM is running
   - Verify libvirt XML contains graphics element

2. **"Connection failed"**
   - Check VNC/SPICE server is running
   - Verify port is accessible from Vapor server
   - Check firewall rules

3. **"Token expired"**
   - Request new token from console info endpoint
   - Increase `token_ttl` if needed

4. **"Max connections reached"**
   - Close unused console sessions
   - Increase `max_connections_per_vm` or `max_total_connections`

### Debug Logging
Enable debug logging for console operations:
```bash
export VAPOR_LOG_LEVEL=debug
```

## Performance Tuning

### Buffer Size
Adjust `buffer_size` based on network conditions:
- Low latency networks: 16-32 KB
- High latency networks: 64-128 KB

### Connection Timeouts
- Reduce `idle_timeout` to free resources faster
- Increase `connection_timeout` for slow networks

### Cleanup Interval
- Shorter intervals (30s) for high-traffic environments
- Longer intervals (5m) for low-traffic environments

## Limitations

1. **Protocol Support**: Currently supports VNC (RFB) and SPICE protocols
2. **Audio**: SPICE audio channels not yet implemented
3. **USB Redirection**: Not supported in current version
4. **Clipboard Sharing**: Not implemented for security reasons

## Future Enhancements

- [ ] Multiple display support
- [ ] Audio channel for SPICE
- [ ] Recording/playback of console sessions
- [ ] Enhanced authentication (MFA)
- [ ] Bandwidth throttling
- [ ] Console sharing (view-only mode)

## Example Full Flow

```bash
# 1. Get console information
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/virtualization/virtualmachines/vm-123/console

# Response:
{
  "type": "vnc",
  "host": "localhost",
  "port": 5901,
  "token": "abc123def456...",
  "ws_path": "/api/v1/virtualization/virtualmachines/vm-123/console/ws",
  "expires_at": "2024-01-15T10:30:00Z"
}

# 2. Connect via WebSocket (using wscat for testing)
wscat -c "ws://localhost:8080/api/v1/virtualization/virtualmachines/vm-123/console/ws?token=abc123def456..."

# 3. Console connection established
# Binary VNC/SPICE data flows bidirectionally
```

---

*Last Updated: 2025-08-16*
*Version: 1.0.0*
