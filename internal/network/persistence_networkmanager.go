package network

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
)

// NetworkManagerBackend implements persistence for RHEL 8+/Rocky/Alma/Fedora
type NetworkManagerBackend struct {
	configDir string
}

// NewNetworkManagerBackend creates a new NetworkManager backend
func NewNetworkManagerBackend(configDir string) (*NetworkManagerBackend, error) {
	// Verify NetworkManager is running
	cmd := exec.Command("systemctl", "is-active", "NetworkManager")
	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("NetworkManager is not active: %w", err)
	}

	// Verify config directory exists
	if _, err := os.Stat(configDir); err != nil {
		return nil, fmt.Errorf("NetworkManager config directory not found: %w", err)
	}

	return &NetworkManagerBackend{configDir: configDir}, nil
}

// SaveInterface persists interface configuration
func (b *NetworkManagerBackend) SaveInterface(config InterfaceConfig) error {
	connectionID := fmt.Sprintf("vapor-%s", config.Name)
	filename := fmt.Sprintf("%s.nmconnection", connectionID)

	var keyfile strings.Builder

	// Connection section
	keyfile.WriteString("[connection]\n")
	keyfile.WriteString(fmt.Sprintf("id=%s\n", connectionID))
	keyfile.WriteString(fmt.Sprintf("uuid=%s\n", uuid.New().String()))
	keyfile.WriteString("type=ethernet\n")
	keyfile.WriteString(fmt.Sprintf("interface-name=%s\n", config.Name))
	keyfile.WriteString("autoconnect=true\n")
	keyfile.WriteString("\n")

	// Ethernet section
	keyfile.WriteString("[ethernet]\n")
	keyfile.WriteString("\n")

	// IPv4 section
	keyfile.WriteString("[ipv4]\n")
	if len(config.Addresses) > 0 {
		keyfile.WriteString("method=manual\n")
		for i, addr := range config.Addresses {
			keyfile.WriteString(fmt.Sprintf("address%d=%s/%d\n", i+1, addr.Address, addr.Netmask))
		}
		if config.Gateway != "" {
			keyfile.WriteString(fmt.Sprintf("gateway=%s\n", config.Gateway))
		}
	} else {
		keyfile.WriteString("method=auto\n")
	}
	keyfile.WriteString("\n")

	// IPv6 section
	keyfile.WriteString("[ipv6]\n")
	keyfile.WriteString("method=auto\n")

	return b.writeKeyfile(filename, keyfile.String())
}

// DeleteInterface removes interface configuration
func (b *NetworkManagerBackend) DeleteInterface(name string) error {
	connectionID := fmt.Sprintf("vapor-%s", name)
	filename := fmt.Sprintf("%s.nmconnection", connectionID)
	path := filepath.Join(b.configDir, filename)

	err := os.Remove(path)
	if err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed to delete interface config: %w", err)
	}

	return nil
}

// SaveBridge persists bridge configuration
func (b *NetworkManagerBackend) SaveBridge(config BridgeConfig) error {
	connectionID := fmt.Sprintf("vapor-%s", config.Name)
	filename := fmt.Sprintf("%s.nmconnection", connectionID)

	var keyfile strings.Builder

	// Connection section
	keyfile.WriteString("[connection]\n")
	keyfile.WriteString(fmt.Sprintf("id=%s\n", connectionID))
	keyfile.WriteString(fmt.Sprintf("uuid=%s\n", uuid.New().String()))
	keyfile.WriteString("type=bridge\n")
	keyfile.WriteString(fmt.Sprintf("interface-name=%s\n", config.Name))
	keyfile.WriteString("autoconnect=true\n")
	keyfile.WriteString("\n")

	// Bridge section
	keyfile.WriteString("[bridge]\n")
	if config.STP {
		keyfile.WriteString("stp=true\n")
	} else {
		keyfile.WriteString("stp=false\n")
	}
	keyfile.WriteString("\n")

	// IPv4 section
	keyfile.WriteString("[ipv4]\n")
	if len(config.Addresses) > 0 {
		keyfile.WriteString("method=manual\n")
		for i, addr := range config.Addresses {
			keyfile.WriteString(fmt.Sprintf("address%d=%s/%d\n", i+1, addr.Address, addr.Netmask))
		}
	} else {
		keyfile.WriteString("method=auto\n")
	}
	keyfile.WriteString("\n")

	// IPv6 section
	keyfile.WriteString("[ipv6]\n")
	keyfile.WriteString("method=auto\n")

	// Write bridge connection
	if err := b.writeKeyfile(filename, keyfile.String()); err != nil {
		return err
	}

	// Create port connections for each member interface
	for _, member := range config.Members {
		portID := fmt.Sprintf("vapor-%s-port", member)
		portFilename := fmt.Sprintf("%s.nmconnection", portID)

		var portKeyfile strings.Builder

		portKeyfile.WriteString("[connection]\n")
		portKeyfile.WriteString(fmt.Sprintf("id=%s\n", portID))
		portKeyfile.WriteString(fmt.Sprintf("uuid=%s\n", uuid.New().String()))
		portKeyfile.WriteString("type=ethernet\n")
		portKeyfile.WriteString(fmt.Sprintf("interface-name=%s\n", member))
		portKeyfile.WriteString(fmt.Sprintf("master=%s\n", connectionID))
		portKeyfile.WriteString("slave-type=bridge\n")
		portKeyfile.WriteString("autoconnect=true\n")

		if err := b.writeKeyfile(portFilename, portKeyfile.String()); err != nil {
			return err
		}
	}

	return nil
}

// DeleteBridge removes bridge configuration
func (b *NetworkManagerBackend) DeleteBridge(name string) error {
	// Delete main bridge connection
	connectionID := fmt.Sprintf("vapor-%s", name)
	filename := fmt.Sprintf("%s.nmconnection", connectionID)
	path := filepath.Join(b.configDir, filename)

	if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed to delete bridge config: %w", err)
	}

	// Delete all port connections (vapor-*-port.nmconnection)
	files, err := os.ReadDir(b.configDir)
	if err != nil {
		return fmt.Errorf("failed to read config directory: %w", err)
	}

	for _, file := range files {
		if strings.HasPrefix(file.Name(), "vapor-") && strings.HasSuffix(file.Name(), "-port.nmconnection") {
			portPath := filepath.Join(b.configDir, file.Name())
			os.Remove(portPath) // Best effort, ignore errors
		}
	}

	return nil
}

// SaveBond persists bond configuration
func (b *NetworkManagerBackend) SaveBond(config BondConfig) error {
	connectionID := fmt.Sprintf("vapor-%s", config.Name)
	filename := fmt.Sprintf("%s.nmconnection", connectionID)

	var keyfile strings.Builder

	// Connection section
	keyfile.WriteString("[connection]\n")
	keyfile.WriteString(fmt.Sprintf("id=%s\n", connectionID))
	keyfile.WriteString(fmt.Sprintf("uuid=%s\n", uuid.New().String()))
	keyfile.WriteString("type=bond\n")
	keyfile.WriteString(fmt.Sprintf("interface-name=%s\n", config.Name))
	keyfile.WriteString("autoconnect=true\n")
	keyfile.WriteString("\n")

	// Bond section
	keyfile.WriteString("[bond]\n")
	keyfile.WriteString(fmt.Sprintf("mode=%s\n", config.Mode))
	keyfile.WriteString("\n")

	// IPv4 section
	keyfile.WriteString("[ipv4]\n")
	if len(config.Addresses) > 0 {
		keyfile.WriteString("method=manual\n")
		for i, addr := range config.Addresses {
			keyfile.WriteString(fmt.Sprintf("address%d=%s/%d\n", i+1, addr.Address, addr.Netmask))
		}
	} else {
		keyfile.WriteString("method=auto\n")
	}
	keyfile.WriteString("\n")

	// IPv6 section
	keyfile.WriteString("[ipv6]\n")
	keyfile.WriteString("method=auto\n")

	// Write bond connection
	if err := b.writeKeyfile(filename, keyfile.String()); err != nil {
		return err
	}

	// Create slave connections for each member interface
	for _, member := range config.Members {
		slaveID := fmt.Sprintf("vapor-%s-slave", member)
		slaveFilename := fmt.Sprintf("%s.nmconnection", slaveID)

		var slaveKeyfile strings.Builder

		slaveKeyfile.WriteString("[connection]\n")
		slaveKeyfile.WriteString(fmt.Sprintf("id=%s\n", slaveID))
		slaveKeyfile.WriteString(fmt.Sprintf("uuid=%s\n", uuid.New().String()))
		slaveKeyfile.WriteString("type=ethernet\n")
		slaveKeyfile.WriteString(fmt.Sprintf("interface-name=%s\n", member))
		slaveKeyfile.WriteString(fmt.Sprintf("master=%s\n", connectionID))
		slaveKeyfile.WriteString("slave-type=bond\n")
		slaveKeyfile.WriteString("autoconnect=true\n")

		if err := b.writeKeyfile(slaveFilename, slaveKeyfile.String()); err != nil {
			return err
		}
	}

	return nil
}

// DeleteBond removes bond configuration
func (b *NetworkManagerBackend) DeleteBond(name string) error {
	// Delete main bond connection
	connectionID := fmt.Sprintf("vapor-%s", name)
	filename := fmt.Sprintf("%s.nmconnection", connectionID)
	path := filepath.Join(b.configDir, filename)

	if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed to delete bond config: %w", err)
	}

	// Delete all slave connections (vapor-*-slave.nmconnection)
	files, err := os.ReadDir(b.configDir)
	if err != nil {
		return fmt.Errorf("failed to read config directory: %w", err)
	}

	for _, file := range files {
		if strings.HasPrefix(file.Name(), "vapor-") && strings.HasSuffix(file.Name(), "-slave.nmconnection") {
			slavePath := filepath.Join(b.configDir, file.Name())
			os.Remove(slavePath) // Best effort, ignore errors
		}
	}

	return nil
}

// SaveVLAN persists VLAN configuration
func (b *NetworkManagerBackend) SaveVLAN(config VLANConfig) error {
	connectionID := fmt.Sprintf("vapor-%s", config.Name)
	filename := fmt.Sprintf("%s.nmconnection", connectionID)

	var keyfile strings.Builder

	// Connection section
	keyfile.WriteString("[connection]\n")
	keyfile.WriteString(fmt.Sprintf("id=%s\n", connectionID))
	keyfile.WriteString(fmt.Sprintf("uuid=%s\n", uuid.New().String()))
	keyfile.WriteString("type=vlan\n")
	keyfile.WriteString(fmt.Sprintf("interface-name=%s\n", config.Name))
	keyfile.WriteString("autoconnect=true\n")
	keyfile.WriteString("\n")

	// VLAN section
	keyfile.WriteString("[vlan]\n")
	keyfile.WriteString(fmt.Sprintf("parent=%s\n", config.ParentInterface))
	keyfile.WriteString(fmt.Sprintf("id=%d\n", config.VLANID))
	keyfile.WriteString("\n")

	// IPv4 section
	keyfile.WriteString("[ipv4]\n")
	if len(config.Addresses) > 0 {
		keyfile.WriteString("method=manual\n")
		for i, addr := range config.Addresses {
			keyfile.WriteString(fmt.Sprintf("address%d=%s/%d\n", i+1, addr.Address, addr.Netmask))
		}
	} else {
		keyfile.WriteString("method=auto\n")
	}
	keyfile.WriteString("\n")

	// IPv6 section
	keyfile.WriteString("[ipv6]\n")
	keyfile.WriteString("method=auto\n")

	return b.writeKeyfile(filename, keyfile.String())
}

// DeleteVLAN removes VLAN configuration
func (b *NetworkManagerBackend) DeleteVLAN(name string) error {
	connectionID := fmt.Sprintf("vapor-%s", name)
	filename := fmt.Sprintf("%s.nmconnection", connectionID)
	path := filepath.Join(b.configDir, filename)

	err := os.Remove(path)
	if err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed to delete VLAN config: %w", err)
	}

	return nil
}

// SystemReload reloads network configuration using nmcli
func (b *NetworkManagerBackend) SystemReload() error {
	cmd := exec.Command("nmcli", "connection", "reload")
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("nmcli connection reload failed: %w, output: %s", err, string(output))
	}
	return nil
}

// BackendType returns the backend type
func (b *NetworkManagerBackend) BackendType() NetworkBackendType {
	return BackendNetworkManager
}

// writeKeyfile writes a NetworkManager keyfile with secure permissions
func (b *NetworkManagerBackend) writeKeyfile(filename, content string) error {
	path := filepath.Join(b.configDir, filename)

	// Write to file with restricted permissions (0600)
	err := os.WriteFile(path, []byte(content), 0600)
	if err != nil {
		return fmt.Errorf("failed to write keyfile: %w", err)
	}

	return nil
}
