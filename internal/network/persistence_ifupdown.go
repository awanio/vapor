package network

import (
	"fmt"
	"net"
	"os"
	"path/filepath"
	"strings"
)

// IfupdownBackend implements persistence for Debian/old Ubuntu
type IfupdownBackend struct {
	configDir string
}

// NewIfupdownBackend creates a new ifupdown backend
func NewIfupdownBackend(configDir string) (*IfupdownBackend, error) {
	// Verify directory exists
	if _, err := os.Stat(configDir); err != nil {
		return nil, fmt.Errorf("interfaces.d directory not found: %w", err)
	}

	return &IfupdownBackend{configDir: configDir}, nil
}

// SaveInterface persists interface configuration
func (b *IfupdownBackend) SaveInterface(config InterfaceConfig) error {
	filename := fmt.Sprintf("vapor-%s.conf", config.Name)

	var content strings.Builder

	content.WriteString(fmt.Sprintf("auto %s\n", config.Name))

	if len(config.Addresses) > 0 {
		// Primary address
		addr := config.Addresses[0]
		content.WriteString(fmt.Sprintf("iface %s inet static\n", config.Name))
		content.WriteString(fmt.Sprintf("    address %s\n", addr.Address))
		content.WriteString(fmt.Sprintf("    netmask %s\n", cidrToNetmaskIfupdown(addr.Netmask)))

		if config.Gateway != "" {
			content.WriteString(fmt.Sprintf("    gateway %s\n", config.Gateway))
		}

		// Additional addresses
		for _, extraAddr := range config.Addresses[1:] {
			content.WriteString("\n")
			content.WriteString(fmt.Sprintf("iface %s inet static\n", config.Name))
			content.WriteString(fmt.Sprintf("    address %s\n", extraAddr.Address))
			content.WriteString(fmt.Sprintf("    netmask %s\n", cidrToNetmaskIfupdown(extraAddr.Netmask)))
		}
	} else {
		content.WriteString(fmt.Sprintf("iface %s inet dhcp\n", config.Name))
	}

	return b.writeConfig(filename, content.String())
}

// DeleteInterface removes interface configuration
func (b *IfupdownBackend) DeleteInterface(name string) error {
	filename := fmt.Sprintf("vapor-%s.conf", name)
	path := filepath.Join(b.configDir, filename)

	err := os.Remove(path)
	if err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed to delete interface config: %w", err)
	}

	return nil
}

// SaveBridge persists bridge configuration
func (b *IfupdownBackend) SaveBridge(config BridgeConfig) error {
	filename := fmt.Sprintf("vapor-%s.conf", config.Name)

	var content strings.Builder

	content.WriteString(fmt.Sprintf("auto %s\n", config.Name))

	if len(config.Addresses) > 0 {
		addr := config.Addresses[0]
		content.WriteString(fmt.Sprintf("iface %s inet static\n", config.Name))
		content.WriteString(fmt.Sprintf("    bridge_ports %s\n", strings.Join(config.Members, " ")))

		if config.STP {
			content.WriteString("    bridge_stp on\n")
		} else {
			content.WriteString("    bridge_stp off\n")
		}

		content.WriteString(fmt.Sprintf("    address %s\n", addr.Address))
		content.WriteString(fmt.Sprintf("    netmask %s\n", cidrToNetmaskIfupdown(addr.Netmask)))

		// Additional addresses
		for _, extraAddr := range config.Addresses[1:] {
			content.WriteString("\n")
			content.WriteString(fmt.Sprintf("iface %s inet static\n", config.Name))
			content.WriteString(fmt.Sprintf("    address %s\n", extraAddr.Address))
			content.WriteString(fmt.Sprintf("    netmask %s\n", cidrToNetmaskIfupdown(extraAddr.Netmask)))
		}
	} else {
		content.WriteString(fmt.Sprintf("iface %s inet manual\n", config.Name))
		content.WriteString(fmt.Sprintf("    bridge_ports %s\n", strings.Join(config.Members, " ")))

		if config.STP {
			content.WriteString("    bridge_stp on\n")
		} else {
			content.WriteString("    bridge_stp off\n")
		}
	}

	return b.writeConfig(filename, content.String())
}

// DeleteBridge removes bridge configuration
func (b *IfupdownBackend) DeleteBridge(name string) error {
	filename := fmt.Sprintf("vapor-%s.conf", name)
	path := filepath.Join(b.configDir, filename)

	err := os.Remove(path)
	if err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed to delete bridge config: %w", err)
	}

	return nil
}

// SaveBond persists bond configuration
func (b *IfupdownBackend) SaveBond(config BondConfig) error {
	filename := fmt.Sprintf("vapor-%s.conf", config.Name)

	var content strings.Builder

	content.WriteString(fmt.Sprintf("auto %s\n", config.Name))

	if len(config.Addresses) > 0 {
		addr := config.Addresses[0]
		content.WriteString(fmt.Sprintf("iface %s inet static\n", config.Name))
		content.WriteString(fmt.Sprintf("    bond-mode %s\n", config.Mode))
		content.WriteString(fmt.Sprintf("    bond-slaves %s\n", strings.Join(config.Members, " ")))
		content.WriteString(fmt.Sprintf("    address %s\n", addr.Address))
		content.WriteString(fmt.Sprintf("    netmask %s\n", cidrToNetmaskIfupdown(addr.Netmask)))

		// Additional addresses
		for _, extraAddr := range config.Addresses[1:] {
			content.WriteString("\n")
			content.WriteString(fmt.Sprintf("iface %s inet static\n", config.Name))
			content.WriteString(fmt.Sprintf("    address %s\n", extraAddr.Address))
			content.WriteString(fmt.Sprintf("    netmask %s\n", cidrToNetmaskIfupdown(extraAddr.Netmask)))
		}
	} else {
		content.WriteString(fmt.Sprintf("iface %s inet manual\n", config.Name))
		content.WriteString(fmt.Sprintf("    bond-mode %s\n", config.Mode))
		content.WriteString(fmt.Sprintf("    bond-slaves %s\n", strings.Join(config.Members, " ")))
	}

	return b.writeConfig(filename, content.String())
}

// DeleteBond removes bond configuration
func (b *IfupdownBackend) DeleteBond(name string) error {
	filename := fmt.Sprintf("vapor-%s.conf", name)
	path := filepath.Join(b.configDir, filename)

	err := os.Remove(path)
	if err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed to delete bond config: %w", err)
	}

	return nil
}

// SaveVLAN persists VLAN configuration
func (b *IfupdownBackend) SaveVLAN(config VLANConfig) error {
	filename := fmt.Sprintf("vapor-%s.conf", config.Name)

	var content strings.Builder

	content.WriteString(fmt.Sprintf("auto %s\n", config.Name))

	if len(config.Addresses) > 0 {
		addr := config.Addresses[0]
		content.WriteString(fmt.Sprintf("iface %s inet static\n", config.Name))
		content.WriteString(fmt.Sprintf("    vlan-raw-device %s\n", config.ParentInterface))
		content.WriteString(fmt.Sprintf("    address %s\n", addr.Address))
		content.WriteString(fmt.Sprintf("    netmask %s\n", cidrToNetmaskIfupdown(addr.Netmask)))

		// Additional addresses
		for _, extraAddr := range config.Addresses[1:] {
			content.WriteString("\n")
			content.WriteString(fmt.Sprintf("iface %s inet static\n", config.Name))
			content.WriteString(fmt.Sprintf("    address %s\n", extraAddr.Address))
			content.WriteString(fmt.Sprintf("    netmask %s\n", cidrToNetmaskIfupdown(extraAddr.Netmask)))
		}
	} else {
		content.WriteString(fmt.Sprintf("iface %s inet manual\n", config.Name))
		content.WriteString(fmt.Sprintf("    vlan-raw-device %s\n", config.ParentInterface))
	}

	return b.writeConfig(filename, content.String())
}

// DeleteVLAN removes VLAN configuration
func (b *IfupdownBackend) DeleteVLAN(name string) error {
	filename := fmt.Sprintf("vapor-%s.conf", name)
	path := filepath.Join(b.configDir, filename)

	err := os.Remove(path)
	if err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed to delete VLAN config: %w", err)
	}

	return nil
}

// SystemReload reloads network configuration
func (b *IfupdownBackend) SystemReload() error {
	// ifupdown doesn't have a single reload command
	// Individual interfaces can be brought up/down with ifup/ifdown
	return nil // Manual interface management required
}

// BackendType returns the backend type
func (b *IfupdownBackend) BackendType() NetworkBackendType {
	return BackendIfupdown
}

// writeConfig writes an ifupdown config file
func (b *IfupdownBackend) writeConfig(filename, content string) error {
	path := filepath.Join(b.configDir, filename)

	// Write to file with standard permissions (0644)
	err := os.WriteFile(path, []byte(content), 0644)
	if err != nil {
		return fmt.Errorf("failed to write config file: %w", err)
	}

	return nil
}

// cidrToNetmaskIfupdown converts CIDR prefix length to dotted decimal netmask
func cidrToNetmaskIfupdown(cidr int) string {
	mask := net.CIDRMask(cidr, 32)
	return fmt.Sprintf("%d.%d.%d.%d", mask[0], mask[1], mask[2], mask[3])
}
