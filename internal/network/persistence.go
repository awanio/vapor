package network

import "fmt"

// NetworkBackendType represents the type of network configuration backend
type NetworkBackendType string

const (
	// BackendNetplan represents Ubuntu/Debian netplan backend
	BackendNetplan NetworkBackendType = "netplan"
	// BackendIfupdown represents Debian/old Ubuntu ifupdown backend
	BackendIfupdown NetworkBackendType = "ifupdown"
	// BackendNetworkScripts represents RHEL 7/CentOS 7 network-scripts backend
	BackendNetworkScripts NetworkBackendType = "network-scripts"
	// BackendNetworkManager represents RHEL 8+/Rocky/Alma/Fedora NetworkManager backend
	BackendNetworkManager NetworkBackendType = "networkmanager"
	// BackendNone represents no persistence (disabled or unavailable)
	BackendNone NetworkBackendType = "none"
)

// AddressConfig represents an IP address configuration
type AddressConfig struct {
	Address string
	Netmask int
}

// InterfaceConfig represents network interface configuration
type InterfaceConfig struct {
	Name      string
	Addresses []AddressConfig
	Gateway   string
	MTU       int
	AutoStart bool
}

// BridgeConfig represents bridge configuration
type BridgeConfig struct {
	Name      string
	Members   []string
	STP       bool
	Addresses []AddressConfig
	AutoStart bool
}

// BondConfig represents bond configuration
type BondConfig struct {
	Name      string
	Mode      string
	Members   []string
	Addresses []AddressConfig
	AutoStart bool
}

// VLANConfig represents VLAN configuration
type VLANConfig struct {
	Name            string
	ParentInterface string
	VLANID          int
	Addresses       []AddressConfig
	AutoStart       bool
}

// PersistenceBackend defines the interface for network configuration persistence
type PersistenceBackend interface {
	// SaveInterface persists interface configuration
	SaveInterface(config InterfaceConfig) error
	// DeleteInterface removes interface configuration
	DeleteInterface(name string) error
	// SaveBridge persists bridge configuration
	SaveBridge(config BridgeConfig) error
	// DeleteBridge removes bridge configuration
	DeleteBridge(name string) error
	// SaveBond persists bond configuration
	SaveBond(config BondConfig) error
	// DeleteBond removes bond configuration
	DeleteBond(name string) error
	// SaveVLAN persists VLAN configuration
	SaveVLAN(config VLANConfig) error
	// DeleteVLAN removes VLAN configuration
	DeleteVLAN(name string) error
	// SystemReload reloads network configuration from persistence
	SystemReload() error
	// BackendType returns the type of backend
	BackendType() NetworkBackendType
}

// NewPersistenceBackend creates a new persistence backend based on the type
func NewPersistenceBackend(backendType NetworkBackendType) (PersistenceBackend, error) {
	switch backendType {
	case BackendNetplan:
		return NewNetplanBackend("/etc/netplan")
	case BackendNetworkManager:
		return NewNetworkManagerBackend("/etc/NetworkManager/system-connections")
	case BackendNetworkScripts:
		return NewNetworkScriptsBackend("/etc/sysconfig/network-scripts")
	case BackendIfupdown:
		return NewIfupdownBackend("/etc/network/interfaces.d")
	case BackendNone:
		return &NoOpBackend{}, nil
	default:
		return nil, fmt.Errorf("unsupported backend type: %s", backendType)
	}
}
