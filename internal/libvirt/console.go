package libvirt

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/xml"
	"fmt"
	"strings"
	"time"

	"libvirt.org/go/libvirt"
)

// NewConsoleProxy creates a new console proxy instance
func NewConsoleProxy(service *Service, config *ConsoleConfig) *ConsoleProxy {
	if config == nil {
		config = DefaultConsoleConfig()
	}

	cp := &ConsoleProxy{
		connections: make(map[string]*ProxyConnection),
		tokens:      make(map[string]*ConsoleToken),
		service:     service,
		config:      config,
		stopCleanup: make(chan struct{}),
		cleanupDone: make(chan struct{}),
	}

	// Start cleanup goroutine
	go cp.cleanupRoutine()

	return cp
}

// Stop stops the console proxy and cleans up resources
func (cp *ConsoleProxy) Stop() {
	close(cp.stopCleanup)
	<-cp.cleanupDone

	// Close all active connections
	cp.mu.Lock()
	defer cp.mu.Unlock()

	for _, conn := range cp.connections {
		conn.Close()
	}
}

// cleanupRoutine periodically cleans up expired tokens and idle connections
func (cp *ConsoleProxy) cleanupRoutine() {
	defer close(cp.cleanupDone)

	ticker := time.NewTicker(cp.config.CleanupInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			cp.cleanup()
		case <-cp.stopCleanup:
			return
		}
	}
}

// cleanup removes expired tokens and idle connections
func (cp *ConsoleProxy) cleanup() {
	cp.mu.Lock()
	defer cp.mu.Unlock()

	now := time.Now()

	// Clean up expired tokens
	for token, info := range cp.tokens {
		if now.After(info.ExpiresAt) {
			delete(cp.tokens, token)
		}
	}

	// Clean up idle connections
	for id, conn := range cp.connections {
		conn.mu.RLock()
		lastActivity := conn.lastActivity
		conn.mu.RUnlock()

		if now.Sub(lastActivity) > cp.config.IdleTimeout {
			conn.Close()
			delete(cp.connections, id)
		}
	}
}

// GetConsoleInfo retrieves console information for a VM
// func (s *Service) GetConsoleInfo(ctx context.Context, nameOrUUID string) (*ConsoleInfo, error) {
// 	// Get domain
// 	domain, err := s.getDomainByNameOrUUID(nameOrUUID)
// 	if err != nil {
// 		return nil, &ConsoleError{
// 			Code:    ErrCodeVMNotFound,
// 			Message: "VM not found",
// 			Err:     err,
// 		}
// 	}
// 	defer domain.Free()
//
// 	// Get domain name and UUID
// 	name, err := domain.GetName()
// 	if err != nil {
// 		return nil, err
// 	}
//
// 	uuid, err := domain.GetUUIDString()
// 	if err != nil {
// 		return nil, err
// 	}
//
// 	// Get XML description
// 	xmlDesc, err := domain.GetXMLDesc(0)
// 	if err != nil {
// 		return nil, &ConsoleError{
// 			Code:    ErrCodeInternalError,
// 			Message: "Failed to get domain XML",
// 			Err:     err,
// 		}
// 	}
//
// 	// Parse XML to get graphics devices
// 	graphics, err := parseGraphicsDevices(xmlDesc)
// 	if err != nil {
// 		return nil, &ConsoleError{
// 			Code:    ErrCodeInternalError,
// 			Message: "Failed to parse graphics devices",
// 			Err:     err,
// 		}
// 	}
//
// 	if len(graphics) == 0 {
// 		return nil, &ConsoleError{
// 			Code:    ErrCodeNoConsole,
// 			Message: "No console available for this VM",
// 		}
// 	}
//
// 	// Use the first graphics device (usually primary)
// 	g := graphics[0]
//
// 	// Parse port
// 	port, err := strconv.Atoi(g.Port)
// 	if err != nil || port <= 0 {
// 		// Port might be -1 for autoport, need to get runtime info
// 		port = getAutoPort(domain, g.Type)
// 		if port <= 0 {
// 			return nil, &ConsoleError{
// 				Code:    ErrCodeNoConsole,
// 				Message: "Console port not available",
// 			}
// 		}
// 	}
//
// 	// Determine listen address
// 	listenAddr := g.Listen
// 	if listenAddr == "" || listenAddr == "0.0.0.0" {
// 		listenAddr = "localhost" // For security, default to localhost
// 	}
//
// 	// Parse TLS port if available
// 	tlsPort := 0
// 	if g.TLSPort != "" {
// 		tlsPort, _ = strconv.Atoi(g.TLSPort)
// 	}
//
// 	// Generate access token
// 	token, err := generateSecureToken()
// 	if err != nil {
// 		return nil, &ConsoleError{
// 			Code:    ErrCodeInternalError,
// 			Message: "Failed to generate access token",
// 			Err:     err,
// 		}
// 	}
//
// 	// Determine console type
// 	consoleType := ConsoleTypeVNC
// 	if strings.ToLower(g.Type) == "spice" {
// 		consoleType = ConsoleTypeSPICE
// 	}
//
// 	// Store token with console information
// 	if s.consoleProxy != nil {
// 		s.consoleProxy.StoreToken(&ConsoleToken{
// 			Token:       token,
// 			VMName:      name,
// 			VMUuid:      uuid,
// 			ConsoleType: consoleType,
// 			Host:        listenAddr,
// 			Port:        port,
// 			Password:    g.Password,
// 			ExpiresAt:   time.Now().Add(s.consoleProxy.config.TokenTTL),
// 			Used:        false,
// 		})
// 	}
//
// 	// Build console info response
// 	info := &ConsoleInfo{
// 		Type:       consoleType,
// 		Host:       listenAddr,
// 		Port:       port,
// 		Token:      token,
// 		WSPath:     fmt.Sprintf("/api/v1/virtualization/computes/%s/console/ws", nameOrUUID),
// 		ExpiresAt:  time.Now().Add(5 * time.Minute),
// 		TLSEnabled: tlsPort > 0,
// 		TLSPort:    tlsPort,
// 	}

// 	// Don't expose password directly in response for security
// 	if g.Password != "" {
// 		info.Password = "********" // Indicate password is set but don't reveal it
// 	}
//
// 	return info, nil
// }

// parseGraphicsDevices parses graphics devices from domain XML
func parseGraphicsDevices(xmlDesc string) ([]GraphicsDevice, error) {
	var domain DomainXML
	if err := xml.Unmarshal([]byte(xmlDesc), &domain); err != nil {
		return nil, err
	}

	return domain.Devices.Graphics, nil
}

// getAutoPort attempts to get the runtime port for autoport graphics devices
func getAutoPort(domain DomainWrapper, graphicsType string) int {
	// This is a simplified version - in production, you might need to:
	// 1. Query libvirt for runtime information
	// 2. Check domain state (must be running)
	// 3. Use virDomainGetXMLDesc with VIR_DOMAIN_XML_SECURE flag

	// For now, return common default ports
	switch strings.ToLower(graphicsType) {
	case "vnc":
		return 5900 // Default VNC port
	case "spice":
		return 5930 // Default SPICE port
	default:
		return 0
	}
}

// generateSecureToken generates a cryptographically secure random token
func generateSecureToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// StoreToken stores a console access token
func (cp *ConsoleProxy) StoreToken(token *ConsoleToken) {
	cp.mu.Lock()
	defer cp.mu.Unlock()

	cp.tokens[token.Token] = token
}

// ValidateToken validates and retrieves a console token
func (cp *ConsoleProxy) ValidateToken(tokenStr string) (*ConsoleToken, error) {
	cp.mu.Lock()
	defer cp.mu.Unlock()

	token, exists := cp.tokens[tokenStr]
	if !exists {
		return nil, &ConsoleError{
			Code:    ErrCodeTokenInvalid,
			Message: "Invalid token",
		}
	}

	// Check if token is expired
	if time.Now().After(token.ExpiresAt) {
		delete(cp.tokens, tokenStr)
		return nil, &ConsoleError{
			Code:    ErrCodeTokenExpired,
			Message: "Token has expired",
		}
	}

	// Check if token was already used (one-time use)
	if token.Used {
		return nil, &ConsoleError{
			Code:    ErrCodeTokenUsed,
			Message: "Token has already been used",
		}
	}

	// Mark token as used
	token.Used = true

	return token, nil
}

// GetActiveConnections returns the number of active connections for a VM
func (cp *ConsoleProxy) GetActiveConnections(vmName string) int {
	cp.mu.RLock()
	defer cp.mu.RUnlock()

	count := 0
	for _, conn := range cp.connections {
		if conn.VMName == vmName {
			count++
		}
	}
	return count
}

// AddConnection adds a new proxy connection
func (cp *ConsoleProxy) AddConnection(conn *ProxyConnection) error {
	cp.mu.Lock()
	defer cp.mu.Unlock()

	// Check max connections per VM
	vmConnections := 0
	for _, c := range cp.connections {
		if c.VMName == conn.VMName {
			vmConnections++
		}
	}

	if vmConnections >= cp.config.MaxConnectionsPerVM {
		return &ConsoleError{
			Code:    ErrCodeMaxConnections,
			Message: fmt.Sprintf("Maximum connections (%d) reached for VM", cp.config.MaxConnectionsPerVM),
		}
	}

	// Check total connections
	if len(cp.connections) >= cp.config.MaxTotalConnections {
		return &ConsoleError{
			Code:    ErrCodeMaxConnections,
			Message: "Maximum total connections reached",
		}
	}

	cp.connections[conn.ID] = conn
	return nil
}

// RemoveConnection removes a proxy connection
func (cp *ConsoleProxy) RemoveConnection(connID string) {
	cp.mu.Lock()
	defer cp.mu.Unlock()

	if conn, exists := cp.connections[connID]; exists {
		conn.Close()
		delete(cp.connections, connID)
	}
}

// Close closes a proxy connection
func (pc *ProxyConnection) Close() {
	pc.closeOnce.Do(func() {
		// Cancel context to stop goroutines
		if pc.cancel != nil {
			pc.cancel()
		}

		// Close connections
		if pc.WSConn != nil {
			pc.WSConn.Close()
		}
		if pc.TCPConn != nil {
			pc.TCPConn.Close()
		}
	})
}

// UpdateActivity updates the last activity time
func (pc *ProxyConnection) UpdateActivity() {
	pc.mu.Lock()
	defer pc.mu.Unlock()
	pc.lastActivity = time.Now()
}

// GetStats returns connection statistics
func (pc *ProxyConnection) GetStats() (bytesSent, bytesRecv uint64) {
	pc.mu.RLock()
	defer pc.mu.RUnlock()
	return pc.BytesSent, pc.BytesRecv
}

// IncrementBytesSent increments bytes sent counter
func (pc *ProxyConnection) IncrementBytesSent(n uint64) {
	pc.mu.Lock()
	defer pc.mu.Unlock()
	pc.BytesSent += n
}

// IncrementBytesRecv increments bytes received counter
func (pc *ProxyConnection) IncrementBytesRecv(n uint64) {
	pc.mu.Lock()
	defer pc.mu.Unlock()
	pc.BytesRecv += n
}

// getDomainByNameOrUUID retrieves a domain by name or UUID
func (s *Service) getDomainByNameOrUUID(nameOrUUID string) (DomainWrapper, error) {
	// Try by UUID first
	domain, err := s.conn.LookupDomainByUUIDString(nameOrUUID)
	if err == nil {
		return &libvirtDomainWrapper{domain: domain}, nil
	}

	// Try by name
	domain, err = s.conn.LookupDomainByName(nameOrUUID)
	if err != nil {
		return nil, fmt.Errorf("domain not found: %w", err)
	}

	return &libvirtDomainWrapper{domain: domain}, nil
}

// DomainWrapper interface for libvirt domain operations
type DomainWrapper interface {
	GetName() (string, error)
	GetUUIDString() (string, error)
	GetXMLDesc(flags uint32) (string, error)
	Free() error
}

// libvirtDomainWrapper wraps libvirt.Domain to implement DomainWrapper
type libvirtDomainWrapper struct {
	domain *libvirt.Domain
}

func (w *libvirtDomainWrapper) GetName() (string, error) {
	return w.domain.GetName()
}

func (w *libvirtDomainWrapper) GetUUIDString() (string, error) {
	return w.domain.GetUUIDString()
}

func (w *libvirtDomainWrapper) GetXMLDesc(flags uint32) (string, error) {
	return w.domain.GetXMLDesc(libvirt.DomainXMLFlags(flags))
}

func (w *libvirtDomainWrapper) Free() error {
	return w.domain.Free()
}
