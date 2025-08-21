package libvirt

import (
	"context"
	"fmt"
)

// Network Management

// ListNetworks returns all virtual networks
func (s *Service) ListNetworks(ctx context.Context) ([]Network, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	nets, err := s.conn.ListAllNetworks(0)
	if err != nil {
		return nil, fmt.Errorf("failed to list networks: %w", err)
	}

	networks := make([]Network, 0, len(nets))
	for _, net := range nets {
		n, err := s.networkToType(&net)
		if err != nil {
			continue
		}
		networks = append(networks, *n)
		net.Free()
	}

	return networks, nil
}

// GetNetwork returns a specific network
func (s *Service) GetNetwork(ctx context.Context, name string) (*Network, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	net, err := s.conn.LookupNetworkByName(name)
	if err != nil {
		return nil, fmt.Errorf("network not found: %w", err)
	}
	defer net.Free()

	return s.networkToType(net)
}

// CreateNetwork creates a new virtual network
func (s *Service) CreateNetwork(ctx context.Context, req *NetworkCreateRequest) (*Network, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Generate network XML
	netXML := s.generateNetworkXML(req)

	// Define the network
	net, err := s.conn.NetworkDefineXML(netXML)
	if err != nil {
		return nil, fmt.Errorf("failed to define network: %w", err)
	}
	defer net.Free()

	// Start the network
	if err := net.Create(); err != nil {
		return nil, fmt.Errorf("failed to start network: %w", err)
	}

	// Set autostart if requested
	if req.AutoStart {
		if err := net.SetAutostart(true); err != nil {
			fmt.Printf("Warning: failed to set autostart: %v\n", err)
		}
	}

	return s.networkToType(net)
}

// DeleteNetwork deletes a virtual network
func (s *Service) DeleteNetwork(ctx context.Context, name string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	net, err := s.conn.LookupNetworkByName(name)
	if err != nil {
		return fmt.Errorf("network not found: %w", err)
	}
	defer net.Free()

	// Stop the network if active
	if active, _ := net.IsActive(); active {
		if err := net.Destroy(); err != nil {
			return fmt.Errorf("failed to stop network: %w", err)
		}
	}

	// Undefine the network
	if err := net.Undefine(); err != nil {
		return fmt.Errorf("failed to undefine network: %w", err)
	}

	return nil
}

// UpdateNetwork updates an existing virtual network
func (s *Service) UpdateNetwork(ctx context.Context, name string, req *NetworkUpdateRequest) (*Network, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Look up the existing network
	net, err := s.conn.LookupNetworkByName(name)
	if err != nil {
		return nil, fmt.Errorf("network not found: %w", err)
	}
	defer net.Free()

	// Check if network is active
	active, err := net.IsActive()
	if err != nil {
		return nil, fmt.Errorf("failed to check network state: %w", err)
	}

	// Stop the network if it's active (required for most updates)
	if active {
		if err := net.Destroy(); err != nil {
			return nil, fmt.Errorf("failed to stop network for update: %w", err)
		}
	}

	// Get current network UUID to preserve it
	uuid, err := net.GetUUIDString()
	if err != nil {
		return nil, fmt.Errorf("failed to get network UUID: %w", err)
	}

	// Undefine the old network
	if err := net.Undefine(); err != nil {
		return nil, fmt.Errorf("failed to undefine network: %w", err)
	}

	// Generate new network XML with updated configuration
	netXML := s.generateNetworkXMLForUpdate(name, uuid, req)

	// Define the network with new configuration
	net, err = s.conn.NetworkDefineXML(netXML)
	if err != nil {
		return nil, fmt.Errorf("failed to define updated network: %w", err)
	}
	defer net.Free()

	// Start the network if it was previously active or if requested
	if active || req.AutoStart {
		if err := net.Create(); err != nil {
			return nil, fmt.Errorf("failed to start updated network: %w", err)
		}
	}

	// Set autostart if requested
	if req.AutoStart {
		if err := net.SetAutostart(true); err != nil {
			fmt.Printf("Warning: failed to set autostart: %v\n", err)
		}
	}

	return s.networkToType(net)
}
