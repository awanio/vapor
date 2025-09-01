package libvirt

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"
)

// GetAvailableConsoles returns information about all available console types for a VM
func (s *Service) GetAvailableConsoles(ctx context.Context, nameOrUUID string) (*MultiConsoleResponse, error) {
	// Get domain
	domain, err := s.getDomainByNameOrUUID(nameOrUUID)
	if err != nil {
		return nil, &ConsoleError{
			Code:    ErrCodeVMNotFound,
			Message: "VM not found",
			Err:     err,
		}
	}
	defer domain.Free()

	// Get domain name and UUID
	name, err := domain.GetName()
	if err != nil {
		return nil, err
	}

	uuid, err := domain.GetUUIDString()
	if err != nil {
		return nil, err
	}

	// Get XML description
	xmlDesc, err := domain.GetXMLDesc(0)
	if err != nil {
		return nil, &ConsoleError{
			Code:    ErrCodeInternalError,
			Message: "Failed to get domain XML",
			Err:     err,
		}
	}

	// Parse XML to get all graphics devices
	graphics, err := parseGraphicsDevices(xmlDesc)
	if err != nil {
		return nil, &ConsoleError{
			Code:    ErrCodeInternalError,
			Message: "Failed to parse graphics devices",
			Err:     err,
		}
	}

	if len(graphics) == 0 {
		return nil, &ConsoleError{
			Code:    ErrCodeNoConsole,
			Message: "No console available for this VM",
		}
	}

	response := &MultiConsoleResponse{
		VMName:    name,
		VMUuid:    uuid,
		Available: []string{},
		Consoles:  ConsoleAvailability{},
	}

	// Process each graphics device
	for _, g := range graphics {
		consoleInfo, err := s.processGraphicsDevice(g, domain, name, uuid)
		if err != nil {
			continue // Skip this device if there's an error
		}

		switch consoleInfo.Type {
		case ConsoleTypeVNC:
			response.Consoles.VNC = consoleInfo
			response.Available = append(response.Available, "vnc")
		case ConsoleTypeSPICE:
			response.Consoles.SPICE = consoleInfo
			response.Available = append(response.Available, "spice")
		}
	}

	// Set preferred console (SPICE if available, otherwise VNC)
	if response.Consoles.SPICE != nil {
		response.Preferred = "spice"
	} else if response.Consoles.VNC != nil {
		response.Preferred = "vnc"
	}

	if len(response.Available) == 0 {
		return nil, &ConsoleError{
			Code:    ErrCodeNoConsole,
			Message: "No usable console available for this VM",
		}
	}

	return response, nil
}

// GetConsoleByType returns console information for a specific console type
func (s *Service) GetConsoleByType(ctx context.Context, nameOrUUID string, consoleType ConsoleType) (*ConsoleInfo, error) {
	consoles, err := s.GetAvailableConsoles(ctx, nameOrUUID)
	if err != nil {
		return nil, err
	}

	switch consoleType {
	case ConsoleTypeVNC:
		if consoles.Consoles.VNC != nil {
			return consoles.Consoles.VNC, nil
		}
		return nil, &ConsoleError{
			Code:    ErrCodeNoConsole,
			Message: "VNC console not available for this VM",
		}
	case ConsoleTypeSPICE:
		if consoles.Consoles.SPICE != nil {
			return consoles.Consoles.SPICE, nil
		}
		return nil, &ConsoleError{
			Code:    ErrCodeNoConsole,
			Message: "SPICE console not available for this VM",
		}
	default:
		return nil, &ConsoleError{
			Code:    ErrCodeInternalError,
			Message: "Invalid console type specified",
		}
	}
}

// processGraphicsDevice processes a single graphics device and returns ConsoleInfo
func (s *Service) processGraphicsDevice(g GraphicsDevice, domain DomainWrapper, name, uuid string) (*ConsoleInfo, error) {
	// Parse port
	port, err := strconv.Atoi(g.Port)
	if err != nil || port <= 0 {
		// Port might be -1 for autoport, need to get runtime info
		port = getAutoPort(domain, g.Type)
		if port <= 0 {
			return nil, fmt.Errorf("console port not available")
		}
	}

	// Determine listen address
	listenAddr := g.Listen
	if listenAddr == "" || listenAddr == "0.0.0.0" {
		listenAddr = "localhost" // For security, default to localhost
	}

	// Parse TLS port if available
	tlsPort := 0
	if g.TLSPort != "" {
		tlsPort, _ = strconv.Atoi(g.TLSPort)
	}

	// Generate access token
	token, err := generateSecureToken()
	if err != nil {
		return nil, err
	}

	// Determine console type
	consoleType := ConsoleTypeVNC
	if strings.ToLower(g.Type) == "spice" {
		consoleType = ConsoleTypeSPICE
	}

	// Store token with console information
	if s.consoleProxy != nil {
		s.consoleProxy.StoreToken(&ConsoleToken{
			Token:       token,
			VMName:      name,
			VMUuid:      uuid,
			ConsoleType: consoleType,
			Host:        listenAddr,
			Port:        port,
			Password:    g.Password,
			ExpiresAt:   time.Now().Add(s.consoleProxy.config.TokenTTL),
			CreatedBy:   "system", // Could be enhanced to track actual user
		})
	}

	// Build console info
	info := &ConsoleInfo{
		Type:       consoleType,
		Host:       listenAddr,
		Port:       port,
		Password:   g.Password,
		Token:      token,
		WSPath:     fmt.Sprintf("/api/v1/virtualization/computes/%s/console/%s/ws?token=%s", uuid, string(consoleType), token),
		ExpiresAt:  time.Now().Add(5 * time.Minute),
		TLSEnabled: tlsPort > 0,
		TLSPort:    tlsPort,
	}

	return info, nil
}
