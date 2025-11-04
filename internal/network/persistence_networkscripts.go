package network

import (
	"fmt"
	"net"
	"os"
	"path/filepath"
	"strings"
)

// NetworkScriptsBackend implements persistence for RHEL 7/CentOS 7
type NetworkScriptsBackend struct {
	configDir string
}

// NewNetworkScriptsBackend creates a new network-scripts backend
func NewNetworkScriptsBackend(configDir string) (*NetworkScriptsBackend, error) {
	// Verify directory exists
	if _, err := os.Stat(configDir); err != nil {
		return nil, fmt.Errorf("network-scripts directory not found: %w", err)
	}

	return &NetworkScriptsBackend{configDir: configDir}, nil
}

// SaveInterface persists interface configuration
func (b *NetworkScriptsBackend) SaveInterface(config InterfaceConfig) error {
	filename := fmt.Sprintf("ifcfg-vapor-%s", config.Name)

	var content strings.Builder

	content.WriteString(fmt.Sprintf("DEVICE=%s\n", config.Name))
	content.WriteString("TYPE=Ethernet\n")

	if len(config.Addresses) > 0 {
		content.WriteString("BOOTPROTO=static\n")
		// Use first address as primary
		addr := config.Addresses[0]
		content.WriteString(fmt.Sprintf("IPADDR=%s\n", addr.Address))
		content.WriteString(fmt.Sprintf("NETMASK=%s\n", cidrToNetmask(addr.Netmask)))

		// Additional addresses
		for i, extraAddr := range config.Addresses[1:] {
			content.WriteString(fmt.Sprintf("IPADDR%d=%s\n", i+1, extraAddr.Address))
			content.WriteString(fmt.Sprintf("NETMASK%d=%s\n", i+1, cidrToNetmask(extraAddr.Netmask)))
		}

		if config.Gateway != "" {
			content.WriteString(fmt.Sprintf("GATEWAY=%s\n", config.Gateway))
		}
	} else {
		content.WriteString("BOOTPROTO=dhcp\n")
	}

	content.WriteString("ONBOOT=yes\n")

	return b.writeConfig(filename, content.String())
}

// DeleteInterface removes interface configuration
func (b *NetworkScriptsBackend) DeleteInterface(name string) error {
	filename := fmt.Sprintf("ifcfg-vapor-%s", name)
	path := filepath.Join(b.configDir, filename)

	err := os.Remove(path)
	if err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed to delete interface config: %w", err)
	}

	return nil
}

// SaveBridge persists bridge configuration
func (b *NetworkScriptsBackend) SaveBridge(config BridgeConfig) error {
	// Create bridge ifcfg file
	filename := fmt.Sprintf("ifcfg-vapor-%s", config.Name)

	var content strings.Builder

	content.WriteString(fmt.Sprintf("DEVICE=%s\n", config.Name))
	content.WriteString("TYPE=Bridge\n")

	if len(config.Addresses) > 0 {
		content.WriteString("BOOTPROTO=static\n")
		addr := config.Addresses[0]
		content.WriteString(fmt.Sprintf("IPADDR=%s\n", addr.Address))
		content.WriteString(fmt.Sprintf("NETMASK=%s\n", cidrToNetmask(addr.Netmask)))

		// Additional addresses
		for i, extraAddr := range config.Addresses[1:] {
			content.WriteString(fmt.Sprintf("IPADDR%d=%s\n", i+1, extraAddr.Address))
			content.WriteString(fmt.Sprintf("NETMASK%d=%s\n", i+1, cidrToNetmask(extraAddr.Netmask)))
		}
	} else {
		content.WriteString("BOOTPROTO=none\n")
	}

	content.WriteString("ONBOOT=yes\n")

	if config.STP {
		content.WriteString("STP=on\n")
	} else {
		content.WriteString("STP=off\n")
	}

	if err := b.writeConfig(filename, content.String()); err != nil {
		return err
	}

	// Create ifcfg files for member interfaces
	for _, member := range config.Members {
		memberFilename := fmt.Sprintf("ifcfg-vapor-%s", member)

		var memberContent strings.Builder
		memberContent.WriteString(fmt.Sprintf("DEVICE=%s\n", member))
		memberContent.WriteString("TYPE=Ethernet\n")
		memberContent.WriteString(fmt.Sprintf("BRIDGE=%s\n", config.Name))
		memberContent.WriteString("ONBOOT=yes\n")

		if err := b.writeConfig(memberFilename, memberContent.String()); err != nil {
			return err
		}
	}

	return nil
}

// DeleteBridge removes bridge configuration
func (b *NetworkScriptsBackend) DeleteBridge(name string) error {
	// Delete main bridge file
	filename := fmt.Sprintf("ifcfg-vapor-%s", name)
	path := filepath.Join(b.configDir, filename)

	if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed to delete bridge config: %w", err)
	}

	// Clean up any member files that reference this bridge
	files, err := os.ReadDir(b.configDir)
	if err != nil {
		return fmt.Errorf("failed to read config directory: %w", err)
	}

	for _, file := range files {
		if strings.HasPrefix(file.Name(), "ifcfg-vapor-") {
			filePath := filepath.Join(b.configDir, file.Name())
			content, err := os.ReadFile(filePath)
			if err == nil && strings.Contains(string(content), fmt.Sprintf("BRIDGE=%s", name)) {
				os.Remove(filePath) // Best effort
			}
		}
	}

	return nil
}

// SaveBond persists bond configuration
func (b *NetworkScriptsBackend) SaveBond(config BondConfig) error {
	// Create bond ifcfg file
	filename := fmt.Sprintf("ifcfg-vapor-%s", config.Name)

	var content strings.Builder

	content.WriteString(fmt.Sprintf("DEVICE=%s\n", config.Name))
	content.WriteString("TYPE=Bond\n")
	content.WriteString("BONDING_MASTER=yes\n")
	content.WriteString(fmt.Sprintf("BONDING_OPTS=\"mode=%s\"\n", config.Mode))

	if len(config.Addresses) > 0 {
		content.WriteString("BOOTPROTO=static\n")
		addr := config.Addresses[0]
		content.WriteString(fmt.Sprintf("IPADDR=%s\n", addr.Address))
		content.WriteString(fmt.Sprintf("NETMASK=%s\n", cidrToNetmask(addr.Netmask)))

		// Additional addresses
		for i, extraAddr := range config.Addresses[1:] {
			content.WriteString(fmt.Sprintf("IPADDR%d=%s\n", i+1, extraAddr.Address))
			content.WriteString(fmt.Sprintf("NETMASK%d=%s\n", i+1, cidrToNetmask(extraAddr.Netmask)))
		}
	} else {
		content.WriteString("BOOTPROTO=none\n")
	}

	content.WriteString("ONBOOT=yes\n")

	if err := b.writeConfig(filename, content.String()); err != nil {
		return err
	}

	// Create ifcfg files for slave interfaces
	for _, member := range config.Members {
		slaveFilename := fmt.Sprintf("ifcfg-vapor-%s", member)

		var slaveContent strings.Builder
		slaveContent.WriteString(fmt.Sprintf("DEVICE=%s\n", member))
		slaveContent.WriteString("TYPE=Ethernet\n")
		slaveContent.WriteString(fmt.Sprintf("MASTER=%s\n", config.Name))
		slaveContent.WriteString("SLAVE=yes\n")
		slaveContent.WriteString("ONBOOT=yes\n")

		if err := b.writeConfig(slaveFilename, slaveContent.String()); err != nil {
			return err
		}
	}

	return nil
}

// DeleteBond removes bond configuration
func (b *NetworkScriptsBackend) DeleteBond(name string) error {
	// Delete main bond file
	filename := fmt.Sprintf("ifcfg-vapor-%s", name)
	path := filepath.Join(b.configDir, filename)

	if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed to delete bond config: %w", err)
	}

	// Clean up any slave files that reference this bond
	files, err := os.ReadDir(b.configDir)
	if err != nil {
		return fmt.Errorf("failed to read config directory: %w", err)
	}

	for _, file := range files {
		if strings.HasPrefix(file.Name(), "ifcfg-vapor-") {
			filePath := filepath.Join(b.configDir, file.Name())
			content, err := os.ReadFile(filePath)
			if err == nil && strings.Contains(string(content), fmt.Sprintf("MASTER=%s", name)) {
				os.Remove(filePath) // Best effort
			}
		}
	}

	return nil
}

// SaveVLAN persists VLAN configuration
func (b *NetworkScriptsBackend) SaveVLAN(config VLANConfig) error {
	filename := fmt.Sprintf("ifcfg-vapor-%s", config.Name)

	var content strings.Builder

	content.WriteString(fmt.Sprintf("DEVICE=%s\n", config.Name))
	content.WriteString("VLAN=yes\n")
	content.WriteString(fmt.Sprintf("PHYSDEV=%s\n", config.ParentInterface))

	if len(config.Addresses) > 0 {
		content.WriteString("BOOTPROTO=static\n")
		addr := config.Addresses[0]
		content.WriteString(fmt.Sprintf("IPADDR=%s\n", addr.Address))
		content.WriteString(fmt.Sprintf("NETMASK=%s\n", cidrToNetmask(addr.Netmask)))

		// Additional addresses
		for i, extraAddr := range config.Addresses[1:] {
			content.WriteString(fmt.Sprintf("IPADDR%d=%s\n", i+1, extraAddr.Address))
			content.WriteString(fmt.Sprintf("NETMASK%d=%s\n", i+1, cidrToNetmask(extraAddr.Netmask)))
		}
	} else {
		content.WriteString("BOOTPROTO=none\n")
	}

	content.WriteString("ONBOOT=yes\n")

	return b.writeConfig(filename, content.String())
}

// DeleteVLAN removes VLAN configuration
func (b *NetworkScriptsBackend) DeleteVLAN(name string) error {
	filename := fmt.Sprintf("ifcfg-vapor-%s", name)
	path := filepath.Join(b.configDir, filename)

	err := os.Remove(path)
	if err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed to delete VLAN config: %w", err)
	}

	return nil
}

// SystemReload reloads network configuration
func (b *NetworkScriptsBackend) SystemReload() error {
	// RHEL 7 uses systemctl restart network
	// Note: This is a potentially disruptive operation
	// In production, you might want to use ifup/ifdown instead
	return nil // Don't actually restart network service automatically
}

// BackendType returns the backend type
func (b *NetworkScriptsBackend) BackendType() NetworkBackendType {
	return BackendNetworkScripts
}

// writeConfig writes a network-scripts config file
func (b *NetworkScriptsBackend) writeConfig(filename, content string) error {
	path := filepath.Join(b.configDir, filename)

	// Write to file with standard permissions (0644)
	err := os.WriteFile(path, []byte(content), 0644)
	if err != nil {
		return fmt.Errorf("failed to write config file: %w", err)
	}

	return nil
}

// cidrToNetmask converts CIDR prefix length to dotted decimal netmask
func cidrToNetmask(cidr int) string {
	mask := net.CIDRMask(cidr, 32)
	return fmt.Sprintf("%d.%d.%d.%d", mask[0], mask[1], mask[2], mask[3])
}
