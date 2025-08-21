package libvirt

import (
	"context"
	"encoding/xml"
	"fmt"

	"libvirt.org/go/libvirt"
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

// GetNetworkDHCPLeases returns active DHCP leases for a network
func (s *Service) GetNetworkDHCPLeases(ctx context.Context, name string) (*DHCPLeasesResponse, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	// Look up the network
	net, err := s.conn.LookupNetworkByName(name)
	if err != nil {
		return nil, fmt.Errorf("network not found: %w", err)
	}
	defer net.Free()

	// Get DHCP leases from libvirt
	libvirtLeases, err := net.GetDHCPLeases()
	if err != nil {
		return nil, fmt.Errorf("failed to get DHCP leases: %w", err)
	}

	// Convert libvirt leases to our type
	leases := make([]DHCPLease, 0, len(libvirtLeases))
	for _, l := range libvirtLeases {
		lease := DHCPLease{
			Interface:  l.Iface,
			ExpiryTime: l.ExpiryTime,
			MAC:        l.Mac,
			IAID:       l.Iaid,
			IPAddress:  l.IPaddr,
			Prefix:     l.Prefix,
			Hostname:   l.Hostname,
			ClientID:   l.Clientid,
		}

		// Convert IP type to string
		switch l.Type {
		case 0: // IPv4 (libvirt.IP_ADDR_TYPE_IPV4)
			lease.Type = "ipv4"
		case 1: // IPv6 (libvirt.IP_ADDR_TYPE_IPV6)
			lease.Type = "ipv6"
		default:
			lease.Type = "unknown"
		}

		leases = append(leases, lease)
	}

	return &DHCPLeasesResponse{
		NetworkName: name,
		Leases:      leases,
		Count:       len(leases),
	}, nil
}

// GetNetworkPorts returns the list of ports (VM interfaces) attached to a network
func (s *Service) GetNetworkPorts(ctx context.Context, name string) (*NetworkPortsResponse, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	// First, verify the network exists
	net, err := s.conn.LookupNetworkByName(name)
	if err != nil {
		return nil, fmt.Errorf("network not found: %w", err)
	}
	net.Free()

	// Get all domains
	domains, err := s.conn.ListAllDomains(0)
	if err != nil {
		return nil, fmt.Errorf("failed to list domains: %w", err)
	}

	// Get DHCP leases for IP address mapping
	dhcpLeases := make(map[string]string) // MAC -> IP mapping
	netForLeases, _ := s.conn.LookupNetworkByName(name)
	if netForLeases != nil {
		leases, err := netForLeases.GetDHCPLeases()
		if err == nil {
			for _, lease := range leases {
				dhcpLeases[lease.Mac] = lease.IPaddr
			}
		}
		netForLeases.Free()
	}

	ports := make([]NetworkPort, 0)

	// Check each domain for interfaces connected to this network
	for _, domain := range domains {
		domainName, _ := domain.GetName()
		domainUUID, _ := domain.GetUUIDString()

		// Get domain state
		state, _, err := domain.GetState()
		if err != nil {
			continue
		}
		stateStr := domainStateToString(state)

		// Get domain XML
		xmlDesc, err := domain.GetXMLDesc(0)
		if err != nil {
			domain.Free()
			continue
		}

		// Parse XML to find interfaces
		var domainXML DomainInterfaceXML
		if err := xml.Unmarshal([]byte(xmlDesc), &domainXML); err != nil {
			domain.Free()
			continue
		}

		// Check each interface
		for _, iface := range domainXML.Devices.Interfaces {
			// Check if this interface is connected to our network
			if iface.Type == "network" && iface.Source.Network == name {
				port := NetworkPort{
					VMName:          domainName,
					VMUUID:          domainUUID,
					VMState:         stateStr,
					InterfaceMAC:    iface.MAC.Address,
					InterfaceModel:  iface.Model.Type,
					InterfaceType:   iface.Type,
					InterfaceTarget: iface.Target.Dev,
				}

				// Add IP address if available from DHCP leases
				if ip, ok := dhcpLeases[iface.MAC.Address]; ok {
					port.IPAddress = ip
				}

				ports = append(ports, port)
			}
		}

		domain.Free()
	}

	return &NetworkPortsResponse{
		NetworkName: name,
		Ports:       ports,
		Count:       len(ports),
	}, nil
}

// domainStateToString converts libvirt domain state to string
func domainStateToString(state libvirt.DomainState) string {
	switch state {
	case libvirt.DOMAIN_NOSTATE:
		return "nostate"
	case libvirt.DOMAIN_RUNNING:
		return "running"
	case libvirt.DOMAIN_BLOCKED:
		return "blocked"
	case libvirt.DOMAIN_PAUSED:
		return "paused"
	case libvirt.DOMAIN_SHUTDOWN:
		return "shutdown"
	case libvirt.DOMAIN_SHUTOFF:
		return "shutoff"
	case libvirt.DOMAIN_CRASHED:
		return "crashed"
	case libvirt.DOMAIN_PMSUSPENDED:
		return "pmsuspended"
	default:
		return "unknown"
	}
}
