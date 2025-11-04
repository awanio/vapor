package network

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

// NetplanBackend implements persistence for Ubuntu/Debian netplan
type NetplanBackend struct {
	configDir string
}

// NewNetplanBackend creates a new netplan backend
func NewNetplanBackend(configDir string) (*NetplanBackend, error) {
	// Verify netplan is available
	if _, err := exec.LookPath("netplan"); err != nil {
		return nil, fmt.Errorf("netplan not found: %w", err)
	}

	// Verify config directory exists
	if _, err := os.Stat(configDir); err != nil {
		return nil, fmt.Errorf("netplan config directory not found: %w", err)
	}

	return &NetplanBackend{configDir: configDir}, nil
}

// netplanConfig represents the top-level netplan configuration
type netplanConfig struct {
	Network netplanNetwork `yaml:"network"`
}

type netplanNetwork struct {
	Version   int                       `yaml:"version"`
	Ethernets map[string]*netplanDevice `yaml:"ethernets,omitempty"`
	Bridges   map[string]*netplanDevice `yaml:"bridges,omitempty"`
	Bonds     map[string]*netplanDevice `yaml:"bonds,omitempty"`
	VLANs     map[string]*netplanDevice `yaml:"vlans,omitempty"`
}

type netplanDevice struct {
	Addresses  []string           `yaml:"addresses,omitempty"`
	Routes     []netplanRoute     `yaml:"routes,omitempty"`
	Interfaces []string           `yaml:"interfaces,omitempty"` // For bridges/bonds
	Parameters *netplanParameters `yaml:"parameters,omitempty"`
	ID         *int               `yaml:"id,omitempty"`   // For VLANs
	Link       string             `yaml:"link,omitempty"` // For VLANs
}

type netplanRoute struct {
	To  string `yaml:"to"`
	Via string `yaml:"via"`
}

type netplanParameters struct {
	STP  *bool  `yaml:"stp,omitempty"`  // For bridges
	Mode string `yaml:"mode,omitempty"` // For bonds
}

// SaveInterface persists interface configuration
func (b *NetplanBackend) SaveInterface(config InterfaceConfig) error {
	device := &netplanDevice{}

	// Add addresses
	for _, addr := range config.Addresses {
		device.Addresses = append(device.Addresses, fmt.Sprintf("%s/%d", addr.Address, addr.Netmask))
	}

	// Add gateway route if specified
	if config.Gateway != "" {
		device.Routes = []netplanRoute{
			{
				To:  "0.0.0.0/0",
				Via: config.Gateway,
			},
		}
	}

	netplan := &netplanConfig{
		Network: netplanNetwork{
			Version:   2,
			Ethernets: map[string]*netplanDevice{config.Name: device},
		},
	}

	return b.writeConfig(fmt.Sprintf("90-vapor-%s.yaml", config.Name), netplan)
}

// DeleteInterface removes interface configuration
func (b *NetplanBackend) DeleteInterface(name string) error {
	filename := fmt.Sprintf("90-vapor-%s.yaml", name)
	filepath := filepath.Join(b.configDir, filename)

	err := os.Remove(filepath)
	if err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed to delete interface config: %w", err)
	}

	return nil
}

// SaveBridge persists bridge configuration
func (b *NetplanBackend) SaveBridge(config BridgeConfig) error {
	device := &netplanDevice{
		Interfaces: config.Members,
	}

	// Add addresses
	for _, addr := range config.Addresses {
		device.Addresses = append(device.Addresses, fmt.Sprintf("%s/%d", addr.Address, addr.Netmask))
	}

	// Add STP parameter
	stp := config.STP
	device.Parameters = &netplanParameters{
		STP: &stp,
	}

	netplan := &netplanConfig{
		Network: netplanNetwork{
			Version: 2,
			Bridges: map[string]*netplanDevice{config.Name: device},
		},
	}

	return b.writeConfig(fmt.Sprintf("90-vapor-%s.yaml", config.Name), netplan)
}

// DeleteBridge removes bridge configuration
func (b *NetplanBackend) DeleteBridge(name string) error {
	filename := fmt.Sprintf("90-vapor-%s.yaml", name)
	filepath := filepath.Join(b.configDir, filename)

	err := os.Remove(filepath)
	if err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed to delete bridge config: %w", err)
	}

	return nil
}

// SaveBond persists bond configuration
func (b *NetplanBackend) SaveBond(config BondConfig) error {
	device := &netplanDevice{
		Interfaces: config.Members,
	}

	// Add addresses
	for _, addr := range config.Addresses {
		device.Addresses = append(device.Addresses, fmt.Sprintf("%s/%d", addr.Address, addr.Netmask))
	}

	// Add bond mode parameter
	device.Parameters = &netplanParameters{
		Mode: config.Mode,
	}

	netplan := &netplanConfig{
		Network: netplanNetwork{
			Version: 2,
			Bonds:   map[string]*netplanDevice{config.Name: device},
		},
	}

	return b.writeConfig(fmt.Sprintf("90-vapor-%s.yaml", config.Name), netplan)
}

// DeleteBond removes bond configuration
func (b *NetplanBackend) DeleteBond(name string) error {
	filename := fmt.Sprintf("90-vapor-%s.yaml", name)
	filepath := filepath.Join(b.configDir, filename)

	err := os.Remove(filepath)
	if err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed to delete bond config: %w", err)
	}

	return nil
}

// SaveVLAN persists VLAN configuration
func (b *NetplanBackend) SaveVLAN(config VLANConfig) error {
	device := &netplanDevice{
		ID:   &config.VLANID,
		Link: config.ParentInterface,
	}

	// Add addresses
	for _, addr := range config.Addresses {
		device.Addresses = append(device.Addresses, fmt.Sprintf("%s/%d", addr.Address, addr.Netmask))
	}

	netplan := &netplanConfig{
		Network: netplanNetwork{
			Version: 2,
			VLANs:   map[string]*netplanDevice{config.Name: device},
		},
	}

	return b.writeConfig(fmt.Sprintf("90-vapor-%s.yaml", config.Name), netplan)
}

// DeleteVLAN removes VLAN configuration
func (b *NetplanBackend) DeleteVLAN(name string) error {
	filename := fmt.Sprintf("90-vapor-%s.yaml", name)
	filepath := filepath.Join(b.configDir, filename)

	err := os.Remove(filepath)
	if err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed to delete VLAN config: %w", err)
	}

	return nil
}

// SystemReload reloads network configuration using netplan apply
func (b *NetplanBackend) SystemReload() error {
	cmd := exec.Command("netplan", "apply")
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("netplan apply failed: %w, output: %s", err, string(output))
	}
	return nil
}

// BackendType returns the backend type
func (b *NetplanBackend) BackendType() NetworkBackendType {
	return BackendNetplan
}

// writeConfig writes the netplan configuration to a file
func (b *NetplanBackend) writeConfig(filename string, config *netplanConfig) error {
	filepath := filepath.Join(b.configDir, filename)

	// Marshal to YAML
	data, err := yaml.Marshal(config)
	if err != nil {
		return fmt.Errorf("failed to marshal YAML: %w", err)
	}

	// Write to file with restricted permissions (0600)
	err = os.WriteFile(filepath, data, 0600)
	if err != nil {
		return fmt.Errorf("failed to write config file: %w", err)
	}

	return nil
}
