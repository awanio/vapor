package libvirt

import (
"context"
"fmt"
"io"
"net"
"sync"
"time"

	"net/http"
"github.com/google/uuid"
"github.com/gorilla/websocket"
)

// HandleWebSocket handles a WebSocket connection for console access
func (cp *ConsoleProxy) HandleWebSocket(ws *websocket.Conn, token string) error {
// Validate token
tokenInfo, err := cp.ValidateToken(token)
if err != nil {
return err
}

// Create unique connection ID
connID := uuid.New().String()

// Create context with timeout
ctx, cancel := context.WithTimeout(context.Background(), cp.config.ConnectionTimeout)

// Create proxy connection
proxyConn := &ProxyConnection{
ID:           connID,
Token:        token,
VMName:       tokenInfo.VMName,
VMUuid:       tokenInfo.VMUuid,
Type:         tokenInfo.ConsoleType,
WSConn:       ws,
ctx:          ctx,
cancel:       cancel,
established:  time.Now(),
lastActivity: time.Now(),
}

// Add connection to pool
if err := cp.AddConnection(proxyConn); err != nil {
cancel()
return err
}
defer cp.RemoveConnection(connID)

// Check if host is allowed
if !cp.isHostAllowed(tokenInfo.Host) {
return &ConsoleError{
Code:    ErrCodeUnauthorized,
Message: fmt.Sprintf("Host %s is not allowed", tokenInfo.Host),
}
}

// Connect to VNC/SPICE server
tcpAddr := fmt.Sprintf("%s:%d", tokenInfo.Host, tokenInfo.Port)

dialer := &net.Dialer{
Timeout: cp.config.ConnectionTimeout,
}

tcpConn, err := dialer.DialContext(ctx, "tcp", tcpAddr)
if err != nil {
return &ConsoleError{
Code:    ErrCodeConnectionFailed,
Message: fmt.Sprintf("Failed to connect to console server at %s", tcpAddr),
Err:     err,
}
}

proxyConn.TCPConn = tcpConn
defer tcpConn.Close()

// Start bidirectional proxy
return cp.proxyConnection(proxyConn)
}

// proxyConnection handles bidirectional data flow between WebSocket and TCP
func (cp *ConsoleProxy) proxyConnection(conn *ProxyConnection) error {
var wg sync.WaitGroup
errChan := make(chan error, 2)

// Configure WebSocket
conn.WSConn.SetReadDeadline(time.Time{}) // No deadline for reads
conn.WSConn.SetPongHandler(func(string) error {
conn.UpdateActivity()
return nil
})

// Start ping ticker for WebSocket keepalive
pingTicker := time.NewTicker(30 * time.Second)
defer pingTicker.Stop()

// Goroutine for sending pings
wg.Add(1)
go func() {
defer wg.Done()
for {
select {
case <-pingTicker.C:
conn.WSConn.SetWriteDeadline(time.Now().Add(10 * time.Second))
if err := conn.WSConn.WriteMessage(websocket.PingMessage, nil); err != nil {
return
}
conn.WSConn.SetWriteDeadline(time.Time{})
case <-conn.ctx.Done():
return
}
}
}()

// WebSocket -> TCP
wg.Add(1)
go func() {
defer wg.Done()
buffer := make([]byte, cp.config.BufferSize)

for {
select {
case <-conn.ctx.Done():
return
default:
// Read from WebSocket
messageType, reader, err := conn.WSConn.NextReader()
if err != nil {
errChan <- fmt.Errorf("WebSocket read error: %w", err)
return
}

// Only handle binary messages for VNC/SPICE
if messageType != websocket.BinaryMessage {
continue
}

// Forward to TCP
written, err := io.CopyBuffer(conn.TCPConn, reader, buffer)
if err != nil {
errChan <- fmt.Errorf("TCP write error: %w", err)
return
}

conn.IncrementBytesSent(uint64(written))
conn.UpdateActivity()
}
}
}()

// TCP -> WebSocket
wg.Add(1)
go func() {
defer wg.Done()
buffer := make([]byte, cp.config.BufferSize)

for {
select {
case <-conn.ctx.Done():
return
default:
// Set read deadline to detect idle connections
conn.TCPConn.SetReadDeadline(time.Now().Add(cp.config.IdleTimeout))

// Read from TCP
n, err := conn.TCPConn.Read(buffer)
if err != nil {
if netErr, ok := err.(net.Error); ok && netErr.Timeout() {
// Idle timeout - normal closure
return
}
if err != io.EOF {
errChan <- fmt.Errorf("TCP read error: %w", err)
}
return
}

// Write to WebSocket
conn.WSConn.SetWriteDeadline(time.Now().Add(10 * time.Second))
if err := conn.WSConn.WriteMessage(websocket.BinaryMessage, buffer[:n]); err != nil {
errChan <- fmt.Errorf("WebSocket write error: %w", err)
return
}
conn.WSConn.SetWriteDeadline(time.Time{})

conn.IncrementBytesRecv(uint64(n))
conn.UpdateActivity()
}
}
}()

// Wait for error or context cancellation
select {
case err := <-errChan:
conn.cancel() // Cancel context to stop all goroutines
wg.Wait()
return err
case <-conn.ctx.Done():
wg.Wait()
return nil
}
}

// isHostAllowed checks if a host is in the allowed list
func (cp *ConsoleProxy) isHostAllowed(host string) bool {
// If no allowed hosts configured, allow localhost only
if len(cp.config.AllowedHosts) == 0 {
return host == "localhost" || host == "127.0.0.1" || host == "::1"
}

// Check against allowed hosts
for _, allowed := range cp.config.AllowedHosts {
if host == allowed {
return true
}
}

return false
}

// GetConnectionStats returns statistics for all active connections
func (cp *ConsoleProxy) GetConnectionStats() map[string]interface{} {
cp.mu.RLock()
defer cp.mu.RUnlock()

stats := make(map[string]interface{})
stats["total_connections"] = len(cp.connections)
stats["total_tokens"] = len(cp.tokens)

vmStats := make(map[string]int)
for _, conn := range cp.connections {
vmStats[conn.VMName]++
}
stats["connections_per_vm"] = vmStats

return stats
}

// CloseVMConnections closes all connections for a specific VM
func (cp *ConsoleProxy) CloseVMConnections(vmName string) {
cp.mu.Lock()
defer cp.mu.Unlock()

for id, conn := range cp.connections {
if conn.VMName == vmName {
conn.Close()
delete(cp.connections, id)
}
}
}

// HandleProtocolHandshake handles initial protocol handshake if needed
func (cp *ConsoleProxy) HandleProtocolHandshake(conn *ProxyConnection, tokenInfo *ConsoleToken) error {
switch conn.Type {
case ConsoleTypeVNC:
// VNC RFB protocol handling
return cp.handleVNCHandshake(conn, tokenInfo)
case ConsoleTypeSPICE:
// SPICE protocol handling
return cp.handleSPICEHandshake(conn, tokenInfo)
default:
return fmt.Errorf("unsupported console type: %s", conn.Type)
}
}

// handleVNCHandshake handles VNC RFB protocol handshake
func (cp *ConsoleProxy) handleVNCHandshake(conn *ProxyConnection, tokenInfo *ConsoleToken) error {
// VNC RFB protocol version negotiation
// This is a simplified version - full implementation would handle:
// 1. Protocol version exchange
// 2. Security type negotiation
// 3. Authentication if required
// 4. Client/Server initialization

// For now, we'll let the client and server handle the handshake directly
// This works for most VNC implementations
return nil
}

// handleSPICEHandshake handles SPICE protocol handshake
func (cp *ConsoleProxy) handleSPICEHandshake(conn *ProxyConnection, tokenInfo *ConsoleToken) error {
// SPICE protocol initialization
// This is a simplified version - full implementation would handle:
// 1. SPICE protocol version
// 2. Channel setup
// 3. Authentication
// 4. Capabilities exchange

// For now, we'll let the client and server handle the handshake directly
return nil
}

// WebSocketUpgrader returns a configured WebSocket upgrader
func (cp *ConsoleProxy) WebSocketUpgrader() *websocket.Upgrader {
return &websocket.Upgrader{
ReadBufferSize:  cp.config.BufferSize,
WriteBufferSize: cp.config.BufferSize,
CheckOrigin: func(r *http.Request) bool {
// In production, implement proper origin checking
return true
},
EnableCompression: false, // Disable compression for better latency
}
}
