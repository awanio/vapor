package libvirt

import (
	"context"
	"fmt"
)

// GetConsole returns console connection information for a VM (legacy method - kept for backward compatibility)
func (s *Service) GetConsole(ctx context.Context, nameOrUUID string, consoleType string) (*ConsoleResponse, error) {
	// Convert string to ConsoleType
	var cType ConsoleType
	switch consoleType {
	case "vnc":
		cType = ConsoleTypeVNC
	case "spice":
		cType = ConsoleTypeSPICE
	default:
		// If no type specified, use the preferred one
		consoles, err := s.GetAvailableConsoles(ctx, nameOrUUID)
		if err != nil {
			return nil, err
		}
		if consoles.Preferred == "spice" {
			cType = ConsoleTypeSPICE
		} else {
			cType = ConsoleTypeVNC
		}
	}

	// Get console info for the specific type
	info, err := s.GetConsoleByType(ctx, nameOrUUID, cType)
	if err != nil {
		// If it's a specific console error, return it
		if consoleErr, ok := err.(*ConsoleError); ok {
			return nil, fmt.Errorf("%s: %s", consoleErr.Code, consoleErr.Message)
		}
		return nil, err
	}

	// Convert to legacy ConsoleResponse format for compatibility
	response := &ConsoleResponse{
		Type:     string(info.Type),
		Host:     info.Host,
		Port:     info.Port,
		Token:    info.Token,
		WSPath:   info.WSPath,
		Password: info.Password,
	}

	if info.TLSEnabled {
		response.TLSPort = info.TLSPort
	}

	return response, nil
}

// GetConsoleInfo returns console connection information for a VM
// This is the enhanced version that returns information about all available consoles
func (s *Service) GetConsoleInfo(ctx context.Context, nameOrUUID string) (*ConsoleInfo, error) {
	// For backward compatibility, return the preferred console
	consoles, err := s.GetAvailableConsoles(ctx, nameOrUUID)
	if err != nil {
		return nil, err
	}

	// Return the preferred console
	if consoles.Preferred == "spice" && consoles.Consoles.SPICE != nil {
		return consoles.Consoles.SPICE, nil
	} else if consoles.Consoles.VNC != nil {
		return consoles.Consoles.VNC, nil
	}

	return nil, &ConsoleError{
		Code:    ErrCodeNoConsole,
		Message: "No console available for this VM",
	}
}

// GetVNCConsole returns VNC console information for a VM
func (s *Service) GetVNCConsole(ctx context.Context, nameOrUUID string) (*ConsoleInfo, error) {
	return s.GetConsoleByType(ctx, nameOrUUID, ConsoleTypeVNC)
}

// GetSPICEConsole returns SPICE console information for a VM
func (s *Service) GetSPICEConsole(ctx context.Context, nameOrUUID string) (*ConsoleInfo, error) {
	return s.GetConsoleByType(ctx, nameOrUUID, ConsoleTypeSPICE)
}

// GetConsoleProxy returns the console proxy instance
func (s *Service) GetConsoleProxy() *ConsoleProxy {
	return s.consoleProxy
}

// CloseVMConsoles closes all console connections for a VM
func (s *Service) CloseVMConsoles(vmName string) {
	if s.consoleProxy != nil {
		s.consoleProxy.CloseVMConnections(vmName)
	}
}

// GetConsoleStats returns console proxy statistics
func (s *Service) GetConsoleStats() map[string]interface{} {
	if s.consoleProxy != nil {
		return s.consoleProxy.GetConnectionStats()
	}
	return map[string]interface{}{
		"total_connections": 0,
		"total_tokens":      0,
	}
}
