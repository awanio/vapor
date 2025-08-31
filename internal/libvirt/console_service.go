package libvirt

import (
	"context"
	"fmt"
)

// GetConsole returns console connection information for a VM (legacy method)
func (s *Service) GetConsole(ctx context.Context, nameOrUUID string, consoleType string) (*ConsoleResponse, error) {
	// Use the new GetConsoleInfo method
	info, err := s.GetConsoleInfo(ctx, nameOrUUID)
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
