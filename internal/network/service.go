package network

import (
	"fmt"
	"log"
	"net"
	"net/http"
	"sort"
	"strings"

	"github.com/awanio/vapor/internal/common"
	"github.com/gin-gonic/gin"
	"github.com/vishvananda/netlink"
)

// Service handles network operations
type Service struct {
	persistence        PersistenceBackend
	persistenceEnabled bool
}

// NewService creates a new network service
func NewService() *Service {
	// Phase 2: Enable persistence by default with auto-detection
	persistenceEnabled := true
	backendType := "auto"

	var backend PersistenceBackend
	if persistenceEnabled {
		// Auto-detect backend type
		if backendType == "auto" {
			detected := DetectNetworkBackend()
			backendType = string(detected)
			log.Printf("Network: Auto-detected backend: %s", backendType)
		}

		var err error
		backend, err = NewPersistenceBackend(NetworkBackendType(backendType))
		if err != nil {
			log.Printf("Network: Failed to initialize persistence backend %s: %v. Using NoOp backend.", backendType, err)
			backend = &NoOpBackend{}
		}
	} else {
		backend = &NoOpBackend{}
	}

	log.Printf("Network: Persistence enabled: %v, backend: %s", persistenceEnabled, backend.BackendType())

	return &Service{
		persistence:        backend,
		persistenceEnabled: persistenceEnabled,
	}
}

// persistConfig saves configuration and returns warning message if it fails
// This is a non-blocking operation - it will not cause API requests to fail
func (s *Service) persistConfig(persistFunc func() error) (warning string) {
	if s.persistence == nil || !s.persistenceEnabled {
		return ""
	}

	if err := persistFunc(); err != nil {
		log.Printf("Network: Failed to persist configuration: %v", err)
		return "Configuration applied but not persisted to disk. Changes will be lost on reboot."
	}

	return ""
}

// Interface represents a network interface
type Interface struct {
	Name       string   `json:"name"`
	MAC        string   `json:"mac"`
	MTU        int      `json:"mtu"`
	State      string   `json:"state"`
	Type       string   `json:"type"`
	Addresses  []string `json:"addresses"`
	Interfaces []string `json:"interfaces,omitempty"`
	Statistics *Stats   `json:"statistics"`
}

// Stats represents network interface statistics
type Stats struct {
	RxBytes   uint64 `json:"rx_bytes"`
	TxBytes   uint64 `json:"tx_bytes"`
	RxPackets uint64 `json:"rx_packets"`
	TxPackets uint64 `json:"tx_packets"`
	RxErrors  uint64 `json:"rx_errors"`
	TxErrors  uint64 `json:"tx_errors"`
}

// AddressRequest represents IP address configuration
type AddressRequest struct {
	Address string `json:"address" binding:"required"`
	Netmask int    `json:"netmask" binding:"required,min=0,max=32"`
	Gateway string `json:"gateway"`
}

// BridgeRequest represents bridge creation request
type BridgeRequest struct {
	Name       string   `json:"name" binding:"required"`
	Interfaces []string `json:"interfaces"`
}

// BondRequest represents bond creation request
type BondRequest struct {
	Name       string   `json:"name" binding:"required"`
	Mode       string   `json:"mode" binding:"required"`
	Interfaces []string `json:"interfaces" binding:"required"`
}

// VLANRequest represents VLAN creation request
type VLANRequest struct {
	Interface string `json:"interface" binding:"required"`
	VLANID    int    `json:"vlan_id" binding:"required,min=1,max=4094"`
	Name      string `json:"name"`
}

// GetInterfaceTypes returns unique list of interface types available on the system
func (s *Service) GetInterfaceTypes(c *gin.Context) {
	links, err := netlink.LinkList()
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list interfaces", err.Error())
		return
	}

	// Use a map to collect unique types
	typeMap := make(map[string]bool)
	for _, link := range links {
		typeMap[link.Type()] = true
	}

	// Convert map to sorted slice
	types := make([]string, 0, len(typeMap))
	for t := range typeMap {
		types = append(types, t)
	}
	sort.Strings(types)

	common.SendSuccess(c, gin.H{"types": types})
}

// GetInterfaces returns all network interfaces, optionally filtered by type
func (s *Service) GetInterfaces(c *gin.Context) {
	links, err := netlink.LinkList()
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list interfaces", err.Error())
		return
	}

	// Parse type filter from query parameter
	typeFilter := c.Query("type")
	var typeMap map[string]bool
	if typeFilter != "" {
		// Split by comma and create a map for quick lookup
		types := strings.Split(typeFilter, ",")
		typeMap = make(map[string]bool)
		for _, t := range types {
			typeMap[strings.TrimSpace(t)] = true
		}
	}

	interfaces := make([]Interface, 0, len(links))
	for _, link := range links {
		iface := s.linkToInterface(link)

		// Apply type filter if specified
		if typeMap != nil {
			if !typeMap[iface.Type] {
				continue
			}
		}

		interfaces = append(interfaces, iface)
	}

	common.SendSuccess(c, gin.H{"interfaces": interfaces})
}

// GetBridges returns all network bridges
func (s *Service) GetBridges(c *gin.Context) {
	links, err := netlink.LinkList()
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list bridges", err.Error())
		return
	}

	bridges := make([]Interface, 0)
	for _, link := range links {
		if _, ok := link.(*netlink.Bridge); ok {
			iface := s.linkToInterface(link)
			iface.Interfaces = s.getBridgeMembers(link)
			bridges = append(bridges, iface)
		}
	}

	common.SendSuccess(c, gin.H{"bridges": bridges})
}

// GetBridge returns a specific network bridge by name
func (s *Service) GetBridge(c *gin.Context) {
	name := c.Param("name")

	link, err := netlink.LinkByName(name)
	if err != nil {
		common.SendError(c, http.StatusNotFound, common.ErrCodeNotFound, "Bridge not found", err.Error())
		return
	}

	// Verify it's a bridge
	if _, ok := link.(*netlink.Bridge); !ok {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Interface is not a bridge", "")
		return
	}

	iface := s.linkToInterface(link)
	iface.Interfaces = s.getBridgeMembers(link)

	common.SendSuccess(c, gin.H{"bridge": iface})
}

// GetBonds returns all network bonds
func (s *Service) GetBonds(c *gin.Context) {
	links, err := netlink.LinkList()
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list bonds", err.Error())
		return
	}

	bonds := make([]Interface, 0)
	for _, link := range links {
		if _, ok := link.(*netlink.Bond); ok {
			iface := s.linkToInterface(link)
			bonds = append(bonds, iface)
		}
	}

	common.SendSuccess(c, gin.H{"bonds": bonds})
}

// GetVLANs returns all VLAN interfaces
func (s *Service) GetVLANs(c *gin.Context) {
	links, err := netlink.LinkList()
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list VLANs", err.Error())
		return
	}

	vlans := make([]Interface, 0)
	for _, link := range links {
		if _, ok := link.(*netlink.Vlan); ok {
			iface := s.linkToInterface(link)
			vlans = append(vlans, iface)
		}
	}

	common.SendSuccess(c, gin.H{"vlans": vlans})
}

// InterfaceUp brings an interface up
func (s *Service) InterfaceUp(c *gin.Context) {
	name := c.Param("name")

	link, err := netlink.LinkByName(name)
	if err != nil {
		common.SendError(c, http.StatusNotFound, common.ErrCodeNotFound, "Interface not found", err.Error())
		return
	}

	if err := netlink.LinkSetUp(link); err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to bring interface up", err.Error())
		return
	}

	common.SendSuccess(c, gin.H{"message": fmt.Sprintf("Interface %s is now up", name)})
}

// InterfaceDown brings an interface down
func (s *Service) InterfaceDown(c *gin.Context) {
	name := c.Param("name")

	link, err := netlink.LinkByName(name)
	if err != nil {
		common.SendError(c, http.StatusNotFound, common.ErrCodeNotFound, "Interface not found", err.Error())
		return
	}

	if err := netlink.LinkSetDown(link); err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to bring interface down", err.Error())
		return
	}

	common.SendSuccess(c, gin.H{"message": fmt.Sprintf("Interface %s is now down", name)})
}

// SetInterfaceAddress configures IP address on interface
func (s *Service) SetInterfaceAddress(c *gin.Context) {
	name := c.Param("name")

	var req AddressRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeValidation, "Invalid request", err.Error())
		return
	}

	link, err := netlink.LinkByName(name)
	if err != nil {
		common.SendError(c, http.StatusNotFound, common.ErrCodeNotFound, "Interface not found", err.Error())
		return
	}

	// Parse IP address
	ip := net.ParseIP(req.Address)
	if ip == nil {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeValidation, "Invalid IP address")
		return
	}

	// Determine address family (IPv4 = 32 bits, IPv6 = 128 bits)
	bits := 32
	if ip.To4() == nil {
		bits = 128
	}

	// Create address
	addr := &netlink.Addr{
		IPNet: &net.IPNet{
			IP:   ip,
			Mask: net.CIDRMask(req.Netmask, bits),
		},
	}

	// Add address to interface
	if err := netlink.AddrAdd(link, addr); err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to add address", err.Error())
		return
	}

	// Set gateway if provided
	if req.Gateway != "" {
		gw := net.ParseIP(req.Gateway)
		if gw == nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeValidation, "Invalid gateway address")
			return
		}

		// Add default route via gateway
		_, defaultNet, _ := net.ParseCIDR("0.0.0.0/0")
		route := &netlink.Route{
			LinkIndex: link.Attrs().Index,
			Dst:       defaultNet,
			Gw:        gw,
		}

		if err := netlink.RouteAdd(route); err != nil {
			common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to add default route", err.Error())
			return
		}
	}

	// Persist configuration
	warning := s.persistConfig(func() error {
		config := InterfaceConfig{
			Name: name,
			Addresses: []AddressConfig{{
				Address: req.Address,
				Netmask: req.Netmask,
			}},
			Gateway:   req.Gateway,
			AutoStart: true,
		}
		return s.persistence.SaveInterface(config)
	})

	response := gin.H{"message": fmt.Sprintf("Address %s/%d configured on %s", req.Address, req.Netmask, name)}
	if warning != "" {
		response["persistence_warning"] = warning
	}

	common.SendSuccess(c, response)
}

// CreateBridge creates a network bridge
// CreateBridge creates a network bridge
func (s *Service) CreateBridge(c *gin.Context) {
	var req BridgeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeValidation, "Invalid request", err.Error())
		return
	}

	// Create bridge
	bridge := &netlink.Bridge{
		LinkAttrs: netlink.LinkAttrs{
			Name: req.Name,
		},
	}

	if err := netlink.LinkAdd(bridge); err != nil {
		if strings.Contains(err.Error(), "exists") {
			common.SendError(c, http.StatusConflict, common.ErrCodeConflict, "Bridge already exists")
		} else {
			common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to create bridge", err.Error())
		}
		return
	}

	// Track success and failures
	var successfullyAdded []string
	var failed []map[string]string

	// Add interfaces to bridge
	for _, ifaceName := range req.Interfaces {
		iface, err := netlink.LinkByName(ifaceName)
		if err != nil {
			failed = append(failed, map[string]string{
				"interface": ifaceName,
				"reason":    "Interface not found",
			})
			continue
		}

		// Check if interface is already enslaved
		if iface.Attrs().MasterIndex != 0 {
			masterLink, _ := netlink.LinkByIndex(iface.Attrs().MasterIndex)
			masterName := "unknown"
			if masterLink != nil {
				masterName = masterLink.Attrs().Name
			}
			failed = append(failed, map[string]string{
				"interface": ifaceName,
				"reason":    fmt.Sprintf("Already enslaved to %s", masterName),
			})
			continue
		}

		// Bring interface down before adding to bridge
		if err := netlink.LinkSetDown(iface); err != nil {
			failed = append(failed, map[string]string{
				"interface": ifaceName,
				"reason":    "Failed to bring interface down",
			})
			continue
		}

		// Add to bridge
		if err := netlink.LinkSetMaster(iface, bridge); err != nil {
			failed = append(failed, map[string]string{
				"interface": ifaceName,
				"reason":    fmt.Sprintf("Failed to add to bridge: %v", err),
			})
			netlink.LinkSetUp(iface) // Try to restore interface state
			continue
		}

		successfullyAdded = append(successfullyAdded, ifaceName)
	}

	// Bring bridge up
	if err := netlink.LinkSetUp(bridge); err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Bridge created but failed to bring up", err.Error())
		return
	}

	// Persist configuration
	warning := s.persistConfig(func() error {
		config := BridgeConfig{
			Name:      req.Name,
			Members:   successfullyAdded,
			STP:       false,
			Addresses: []AddressConfig{},
			AutoStart: true,
		}
		return s.persistence.SaveBridge(config)
	})

	// Prepare response
	response := gin.H{
		"message":            fmt.Sprintf("Bridge %s created", req.Name),
		"successfully_added": successfullyAdded,
		"total_requested":    len(req.Interfaces),
		"total_added":        len(successfullyAdded),
	}

	// Add failure information if any
	if len(failed) > 0 {
		response["failed"] = failed
		response["warning"] = fmt.Sprintf("%d out of %d interfaces could not be added", len(failed), len(req.Interfaces))
	}

	// Add persistence warning if any
	if warning != "" {
		response["persistence_warning"] = warning
	}
	if warning != "" {
		response["persistence_warning"] = warning
	}

	// Add persistence warning if any
	if warning != "" {
		response["persistence_warning"] = warning
	}

	common.SendSuccess(c, response)
}

// UpdateBridge updates a network bridge
func (s *Service) UpdateBridge(c *gin.Context) {
	name := c.Param("name")
	var req BridgeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeValidation, "Invalid request", err.Error())
		return
	}

	link, err := netlink.LinkByName(name)
	if err != nil {
		common.SendError(c, http.StatusNotFound, common.ErrCodeNotFound, "Bridge not found", err.Error())
		return
	}

	bridge, ok := link.(*netlink.Bridge)
	if !ok {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeValidation, "Not a bridge interface")
		return
	}

	// Bring bridge down before modification
	if err := netlink.LinkSetDown(bridge); err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to bring bridge down", err.Error())
		return
	}

	// Step 1: Remove all existing members
	allLinks, err := netlink.LinkList()
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list interfaces", err.Error())
		return
	}

	// Track member removal failures
	var removalFailures []string

	for _, link := range allLinks {
		if link.Attrs().MasterIndex == bridge.Attrs().Index {
			if err := netlink.LinkSetNoMaster(link); err != nil {
				removalFailures = append(removalFailures, link.Attrs().Name)
			}
		}
	}

	// Step 2: Validate and add new members
	var successfullyAdded []string
	var failed []map[string]string
	var alreadyEnslaved []string

	for _, ifaceName := range req.Interfaces {
		// Get the interface
		iface, err := netlink.LinkByName(ifaceName)
		if err != nil {
			failed = append(failed, map[string]string{
				"interface": ifaceName,
				"reason":    "Interface not found",
			})
			continue
		}

		// Check if interface is already enslaved to another master
		if iface.Attrs().MasterIndex != 0 && iface.Attrs().MasterIndex != bridge.Attrs().Index {
			// Get master name for better error message
			masterLink, _ := netlink.LinkByIndex(iface.Attrs().MasterIndex)
			masterName := "unknown"
			if masterLink != nil {
				masterName = masterLink.Attrs().Name
			}
			alreadyEnslaved = append(alreadyEnslaved, ifaceName)
			failed = append(failed, map[string]string{
				"interface": ifaceName,
				"reason":    fmt.Sprintf("Already enslaved to %s", masterName),
			})
			continue
		}

		// Bring interface down before adding to bridge (recommended practice)
		if err := netlink.LinkSetDown(iface); err != nil {
			failed = append(failed, map[string]string{
				"interface": ifaceName,
				"reason":    "Failed to bring interface down",
			})
			continue
		}

		// Add to bridge
		if err := netlink.LinkSetMaster(iface, bridge); err != nil {
			failed = append(failed, map[string]string{
				"interface": ifaceName,
				"reason":    fmt.Sprintf("Failed to add to bridge: %v", err),
			})
			// Try to bring the interface back up since we failed
			netlink.LinkSetUp(iface)
			continue
		}

		successfullyAdded = append(successfullyAdded, ifaceName)
	}

	// Bring bridge up
	if err := netlink.LinkSetUp(bridge); err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Bridge updated but failed to bring up", err.Error())
		return
	}

	// Persist configuration
	warning := s.persistConfig(func() error {
		config := BridgeConfig{
			Name:      name,
			Members:   successfullyAdded,
			STP:       false,
			Addresses: []AddressConfig{},
			AutoStart: true,
		}
		return s.persistence.SaveBridge(config)
	})

	// Prepare response with detailed information
	response := gin.H{
		"message":            fmt.Sprintf("Bridge %s updated", name),
		"successfully_added": successfullyAdded,
		"total_requested":    len(req.Interfaces),
		"total_added":        len(successfullyAdded),
	}

	// Add failure information if any
	if len(failed) > 0 {
		response["failed"] = failed
		response["warning"] = fmt.Sprintf("%d out of %d interfaces could not be added", len(failed), len(req.Interfaces))
	}

	// Add persistence warning if any
	if warning != "" {
		response["persistence_warning"] = warning
	}

	// Add member removal warning if any failures
	if len(removalFailures) > 0 {
		if response["warning"] != nil {
			response["warning"] = fmt.Sprintf("%s. Also failed to remove %d old member(s): %s",
				response["warning"], len(removalFailures), strings.Join(removalFailures, ", "))
		} else {
			response["removal_failures"] = removalFailures
			response["warning"] = fmt.Sprintf("Failed to remove %d old member(s): %s",
				len(removalFailures), strings.Join(removalFailures, ", "))
		}
	}
	common.SendSuccess(c, response)

	// Add persistence warning if any
	if warning != "" {
		response["persistence_warning"] = warning
	}
}

// DeleteBridge deletes a network bridge
func (s *Service) DeleteBridge(c *gin.Context) {
	name := c.Param("name")
	link, err := netlink.LinkByName(name)
	if err != nil {
		common.SendError(c, http.StatusNotFound, common.ErrCodeNotFound, "Bridge not found", err.Error())
		return
	}

	if err := netlink.LinkDel(link); err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to delete bridge", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"message": fmt.Sprintf("Bridge %s deleted", name)})
}

// UpdateBond updates a network bond
// UpdateBond updates a network bond
// UpdateBond updates a network bond
func (s *Service) UpdateBond(c *gin.Context) {
	name := c.Param("name")
	var req BondRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeValidation, "Invalid request", err.Error())
		return
	}

	link, err := netlink.LinkByName(name)
	if err != nil {
		common.SendError(c, http.StatusNotFound, common.ErrCodeNotFound, "Bond not found", err.Error())
		return
	}

	bond, ok := link.(*netlink.Bond)
	if !ok {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeValidation, "Not a bond interface")
		return
	}

	// Update bond mode if specified
	if req.Mode != "" {
		bond.Mode = netlink.StringToBondMode(req.Mode)
	}

	// Bring bond down before modification
	if err := netlink.LinkSetDown(bond); err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to bring bond down", err.Error())
		return
	}

	// Step 1: Remove all existing members
	allLinks, err := netlink.LinkList()
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list interfaces", err.Error())
		return
	}

	// Track member removal failures
	var removalFailures []string

	for _, link := range allLinks {
		if link.Attrs().MasterIndex == bond.Attrs().Index {
			if err := netlink.LinkSetNoMaster(link); err != nil {
				removalFailures = append(removalFailures, link.Attrs().Name)
			}
		}
	}

	// Step 2: Validate and add new members
	var successfullyAdded []string
	var failed []map[string]string
	var alreadyEnslaved []string

	for _, ifaceName := range req.Interfaces {
		// Get the interface
		iface, err := netlink.LinkByName(ifaceName)
		if err != nil {
			failed = append(failed, map[string]string{
				"interface": ifaceName,
				"reason":    "Interface not found",
			})
			continue
		}

		// Check if interface is already enslaved to another master
		if iface.Attrs().MasterIndex != 0 && iface.Attrs().MasterIndex != bond.Attrs().Index {
			// Get master name for better error message
			masterLink, _ := netlink.LinkByIndex(iface.Attrs().MasterIndex)
			masterName := "unknown"
			if masterLink != nil {
				masterName = masterLink.Attrs().Name
			}
			alreadyEnslaved = append(alreadyEnslaved, ifaceName)
			failed = append(failed, map[string]string{
				"interface": ifaceName,
				"reason":    fmt.Sprintf("Already enslaved to %s", masterName),
			})
			continue
		}

		// Bring interface down before adding to bond (recommended practice)
		if err := netlink.LinkSetDown(iface); err != nil {
			failed = append(failed, map[string]string{
				"interface": ifaceName,
				"reason":    "Failed to bring interface down",
			})
			continue
		}

		// Add to bond
		if err := netlink.LinkSetMaster(iface, bond); err != nil {
			failed = append(failed, map[string]string{
				"interface": ifaceName,
				"reason":    fmt.Sprintf("Failed to add to bond: %v", err),
			})
			// Try to bring the interface back up since we failed
			netlink.LinkSetUp(iface)
			continue
		}

		successfullyAdded = append(successfullyAdded, ifaceName)
	}

	// Bring bond up
	if err := netlink.LinkSetUp(bond); err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Bond updated but failed to bring up", err.Error())
		return
	}

	// Persist configuration
	warning := s.persistConfig(func() error {
		config := BondConfig{
			Name:      name,
			Mode:      req.Mode,
			Members:   successfullyAdded,
			Addresses: []AddressConfig{},
			AutoStart: true,
		}
		return s.persistence.SaveBond(config)
	})

	// Prepare response with detailed information
	response := gin.H{
		"message":            fmt.Sprintf("Bond %s updated", name),
		"successfully_added": successfullyAdded,
		"total_requested":    len(req.Interfaces),
		"total_added":        len(successfullyAdded),
	}

	// Add failure information if any
	if len(failed) > 0 {
		response["failed"] = failed
		response["warning"] = fmt.Sprintf("%d out of %d interfaces could not be added", len(failed), len(req.Interfaces))
	}

	// Add persistence warning if any
	if warning != "" {
		response["persistence_warning"] = warning
	}

	// Add member removal warning if any failures
	if len(removalFailures) > 0 {
		if response["warning"] != nil {
			response["warning"] = fmt.Sprintf("%s. Also failed to remove %d old member(s): %s",
				response["warning"], len(removalFailures), strings.Join(removalFailures, ", "))
		} else {
			response["removal_failures"] = removalFailures
			response["warning"] = fmt.Sprintf("Failed to remove %d old member(s): %s",
				len(removalFailures), strings.Join(removalFailures, ", "))
		}
	}
	common.SendSuccess(c, response)

	// Add persistence warning if any
	if warning != "" {
		response["persistence_warning"] = warning
	}

}

// DeleteBond deletes a network bond
func (s *Service) DeleteBond(c *gin.Context) {
	name := c.Param("name")
	link, err := netlink.LinkByName(name)
	if err != nil {
		common.SendError(c, http.StatusNotFound, common.ErrCodeNotFound, "Bond not found", err.Error())
		return
	}

	if err := netlink.LinkDel(link); err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to delete bond", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"message": fmt.Sprintf("Bond %s deleted", name)})
}

// UpdateVLAN updates a VLAN interface by recreating it
// Note: Due to Linux kernel limitations, VLAN parameters cannot be changed in-place.
// This implementation deletes the old VLAN and recreates it with new parameters.
func (s *Service) UpdateVLAN(c *gin.Context) {
	name := c.Param("name")
	var req VLANRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeValidation, "Invalid request", err.Error())
		return
	}

	// Get the existing VLAN to verify it exists and get current configuration
	oldLink, err := netlink.LinkByName(name)
	if err != nil {
		common.SendError(c, http.StatusNotFound, common.ErrCodeNotFound, "VLAN not found", err.Error())
		return
	}

	oldVlan, ok := oldLink.(*netlink.Vlan)
	if !ok {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeValidation, "Not a VLAN interface")
		return
	}

	// Save current state (addresses, up/down status, MTU, etc.)
	wasUp := oldLink.Attrs().Flags&net.FlagUp != 0
	currentMTU := oldLink.Attrs().MTU
	oldParentIndex := oldVlan.ParentIndex
	oldVlanId := oldVlan.VlanId
	oldName := oldLink.Attrs().Name

	// Get current IP addresses
	addrs, err := netlink.AddrList(oldLink, 0)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to get addresses", err.Error())
		return
	}

	// Get parent interface for recreation
	parent, err := netlink.LinkByName(req.Interface)
	if err != nil {
		common.SendError(c, http.StatusNotFound, common.ErrCodeNotFound, "Parent interface not found", err.Error())
		return
	}

	// Step 1: Bring the VLAN down
	if wasUp {
		if err := netlink.LinkSetDown(oldVlan); err != nil {
			common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to bring VLAN down", err.Error())
			return
		}
	}

	// Step 2: Delete the old VLAN
	if err := netlink.LinkDel(oldVlan); err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to delete old VLAN", err.Error())
		return
	}

	// Step 3: Create new VLAN with updated parameters
	newVlanName := req.Name
	if newVlanName == "" {
		newVlanName = name // Use the same name if not specified
	}

	newVlan := &netlink.Vlan{
		LinkAttrs: netlink.LinkAttrs{
			Name:        newVlanName,
			ParentIndex: parent.Attrs().Index,
			MTU:         currentMTU,
		},
		VlanId: req.VLANID,
	}

	if err := netlink.LinkAdd(newVlan); err != nil {
		// Critical: VLAN deleted but recreation failed
		// Attempt to rollback by recreating the old VLAN
		rollbackVlan := &netlink.Vlan{
			LinkAttrs: netlink.LinkAttrs{
				Name:        oldName,
				ParentIndex: oldParentIndex,
				MTU:         currentMTU,
			},
			VlanId: oldVlanId,
		}

		rollbackErr := netlink.LinkAdd(rollbackVlan)
		if rollbackErr == nil {
			// Rollback successful - restore addresses and state
			rollbackLink, _ := netlink.LinkByName(oldName)
			if rollbackLink != nil {
				// Restore IP addresses
				for _, addr := range addrs {
					netlink.AddrAdd(rollbackLink, &addr)
				}
				// Restore up state
				if wasUp {
					netlink.LinkSetUp(rollbackLink)
				}
			}
			common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal,
				"Failed to create new VLAN. Original VLAN has been restored",
				fmt.Sprintf("New VLAN creation error: %v", err))
		} else {
			// Rollback also failed - worst case
			common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal,
				"Failed to recreate VLAN and rollback failed. Old VLAN was deleted but could not be restored",
				fmt.Sprintf("Creation error: %v, Rollback error: %v", err, rollbackErr))
		}
		return
	}

	// Step 4: Restore IP addresses
	// Get the newly created link
	newLink, err := netlink.LinkByName(newVlanName)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "VLAN created but failed to retrieve it", err.Error())
		return
	}

	// Track address restoration failures
	var addressFailures []string
	for _, addr := range addrs {
		if err := netlink.AddrAdd(newLink, &addr); err != nil {
			addressFailures = append(addressFailures, addr.IPNet.String())
		}
	}

	// Step 5: Bring the VLAN up if it was up before
	var upWarning string
	if wasUp {
		if err := netlink.LinkSetUp(newLink); err != nil {
			upWarning = "VLAN created but failed to bring up"
		}
	}

	// Persist configuration
	persistWarning := s.persistConfig(func() error {
		config := VLANConfig{
			Name:            newVlanName,
			ParentInterface: req.Interface,
			VLANID:          req.VLANID,
			Addresses:       []AddressConfig{},
			AutoStart:       true,
		}
		return s.persistence.SaveVLAN(config)
	})

	// Prepare response
	response := gin.H{
		"message": fmt.Sprintf("VLAN %s updated successfully", newVlanName),
	}

	// Add warnings if any
	var warnings []string
	if len(addressFailures) > 0 {
		warnings = append(warnings, fmt.Sprintf("Failed to restore %d IP address(es): %s",
			len(addressFailures), strings.Join(addressFailures, ", ")))
		response["address_restoration_failures"] = addressFailures
	}
	if upWarning != "" {
		warnings = append(warnings, upWarning)
	}
	if len(warnings) > 0 {
		response["warning"] = strings.Join(warnings, ". ")
	}

	if persistWarning != "" {
		if response["warning"] != nil {
			response["warning"] = fmt.Sprintf("%s. %s", response["warning"], persistWarning)
		} else {
			response["warning"] = persistWarning
		}
	}

	common.SendSuccess(c, response)
}

// DeleteVLAN deletes a VLAN interface
func (s *Service) DeleteVLAN(c *gin.Context) {
	name := c.Param("name")
	link, err := netlink.LinkByName(name)
	if err != nil {
		common.SendError(c, http.StatusNotFound, common.ErrCodeNotFound, "VLAN not found", err.Error())
		return
	}

	if err := netlink.LinkDel(link); err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to delete VLAN", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"message": fmt.Sprintf("VLAN %s deleted", name)})
}

// CreateBond creates a network bond
// CreateBond creates a network bond
// CreateBond creates a network bond
func (s *Service) CreateBond(c *gin.Context) {
	var req BondRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeValidation, "Invalid request", err.Error())
		return
	}

	// Create bond
	bond := &netlink.Bond{
		LinkAttrs: netlink.LinkAttrs{
			Name: req.Name,
		},
		Mode: netlink.StringToBondMode(req.Mode),
	}

	if err := netlink.LinkAdd(bond); err != nil {
		if strings.Contains(err.Error(), "exists") {
			common.SendError(c, http.StatusConflict, common.ErrCodeConflict, "Bond already exists")
		} else {
			common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to create bond", err.Error())
		}
		return
	}

	// Get bond link for adding interfaces
	bondLink, err := netlink.LinkByName(req.Name)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Bond created but failed to retrieve it", err.Error())
		return
	}

	// Track success and failures
	var successfullyAdded []string
	var failed []map[string]string

	// Add interfaces to bond
	for _, ifaceName := range req.Interfaces {
		iface, err := netlink.LinkByName(ifaceName)
		if err != nil {
			failed = append(failed, map[string]string{
				"interface": ifaceName,
				"reason":    "Interface not found",
			})
			continue
		}

		// Check if interface is already enslaved
		if iface.Attrs().MasterIndex != 0 {
			masterLink, _ := netlink.LinkByIndex(iface.Attrs().MasterIndex)
			masterName := "unknown"
			if masterLink != nil {
				masterName = masterLink.Attrs().Name
			}
			failed = append(failed, map[string]string{
				"interface": ifaceName,
				"reason":    fmt.Sprintf("Already enslaved to %s", masterName),
			})
			continue
		}

		// Bring interface down before adding to bond
		if err := netlink.LinkSetDown(iface); err != nil {
			failed = append(failed, map[string]string{
				"interface": ifaceName,
				"reason":    "Failed to bring interface down",
			})
			continue
		}

		// Add to bond
		if err := netlink.LinkSetMaster(iface, bondLink); err != nil {
			failed = append(failed, map[string]string{
				"interface": ifaceName,
				"reason":    fmt.Sprintf("Failed to add to bond: %v", err),
			})
			netlink.LinkSetUp(iface) // Try to restore interface state
			continue
		}

		successfullyAdded = append(successfullyAdded, ifaceName)
	}

	// Bring bond up
	if err := netlink.LinkSetUp(bond); err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Bond created but failed to bring up", err.Error())
		return
	}

	// Persist configuration
	warning := s.persistConfig(func() error {
		config := BondConfig{
			Name:      req.Name,
			Mode:      req.Mode,
			Members:   successfullyAdded,
			Addresses: []AddressConfig{},
			AutoStart: true,
		}
		return s.persistence.SaveBond(config)
	})

	// Prepare response
	response := gin.H{
		"message":            fmt.Sprintf("Bond %s created", req.Name),
		"successfully_added": successfullyAdded,
		"total_requested":    len(req.Interfaces),
		"total_added":        len(successfullyAdded),
	}

	// Add failure information if any
	if len(failed) > 0 {
		response["failed"] = failed
		response["warning"] = fmt.Sprintf("%d out of %d interfaces could not be added", len(failed), len(req.Interfaces))
	}

	// Add persistence warning if any
	if warning != "" {
		response["persistence_warning"] = warning
	}

	common.SendSuccess(c, response)
}

// UpdateInterfaceAddress updates the IP address of an interface
func (s *Service) UpdateInterfaceAddress(c *gin.Context) {
	name := c.Param("name")

	var req AddressRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeValidation, "Invalid request", err.Error())
		return
	}

	link, err := netlink.LinkByName(name)
	if err != nil {
		common.SendError(c, http.StatusNotFound, common.ErrCodeNotFound, "Interface not found", err.Error())
		return
	}

	// Parse IP address
	ip := net.ParseIP(req.Address)
	if ip == nil {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeValidation, "Invalid IP address")
		return
	}

	// Determine address family (IPv4 = 32 bits, IPv6 = 128 bits)
	bits := 32
	if ip.To4() == nil {
		bits = 128
	}

	// Create address
	addr := &netlink.Addr{
		IPNet: &net.IPNet{
			IP:   ip,
			Mask: net.CIDRMask(req.Netmask, bits),
		},
	}

	// Replace address on interface
	if err := netlink.AddrReplace(link, addr); err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to replace address", err.Error())
		return
	}

	common.SendSuccess(c, gin.H{"message": fmt.Sprintf("Address %s/%d updated on %s", req.Address, req.Netmask, name)})
}

// DeleteInterfaceAddress deletes the IP address of an interface
func (s *Service) DeleteInterfaceAddress(c *gin.Context) {
	name := c.Param("name")

	link, err := netlink.LinkByName(name)
	if err != nil {
		common.SendError(c, http.StatusNotFound, common.ErrCodeNotFound, "Interface not found", err.Error())
		return
	}

	address := c.Query("address")
	ip := net.ParseIP(address)
	if ip == nil {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeValidation, "Invalid IP address")
		return
	}

	// Find address to delete
	addrs, err := netlink.AddrList(link, 0)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list addresses", err.Error())
		return
	}

	for _, addr := range addrs {
		if addr.IP.Equal(ip) {
			if err := netlink.AddrDel(link, &addr); err != nil {
				common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to delete address", err.Error())
				return
			}
			common.SendSuccess(c, gin.H{"message": fmt.Sprintf("Address %s deleted from %s", address, name)})
			return
		}
	}

	common.SendError(c, http.StatusNotFound, common.ErrCodeNotFound, "Address not found")
}

// CreateVLAN creates a VLAN interface
// CreateVLAN creates a VLAN interface
// CreateVLAN creates a VLAN interface
func (s *Service) CreateVLAN(c *gin.Context) {
	var req VLANRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeValidation, "Invalid request", err.Error())
		return
	}

	// Get parent interface
	parent, err := netlink.LinkByName(req.Interface)
	if err != nil {
		common.SendError(c, http.StatusNotFound, common.ErrCodeNotFound, "Parent interface not found", err.Error())
		return
	}

	// Generate VLAN name if not provided
	vlanName := req.Name
	if vlanName == "" {
		vlanName = fmt.Sprintf("%s.%d", req.Interface, req.VLANID)
	}

	// Create VLAN
	vlan := &netlink.Vlan{
		LinkAttrs: netlink.LinkAttrs{
			Name:        vlanName,
			ParentIndex: parent.Attrs().Index,
		},
		VlanId: req.VLANID,
	}

	if err := netlink.LinkAdd(vlan); err != nil {
		if strings.Contains(err.Error(), "exists") {
			common.SendError(c, http.StatusConflict, common.ErrCodeConflict, "VLAN already exists")
		} else {
			common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to create VLAN", err.Error())
		}
		return
	}

	// Bring VLAN up
	if err := netlink.LinkSetUp(vlan); err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "VLAN created but failed to bring up", err.Error())
		return
	}

	// Persist configuration
	warning := s.persistConfig(func() error {
		config := VLANConfig{
			Name:            vlanName,
			ParentInterface: req.Interface,
			VLANID:          req.VLANID,
			Addresses:       []AddressConfig{},
			AutoStart:       true,
		}
		return s.persistence.SaveVLAN(config)
	})

	response := gin.H{"message": fmt.Sprintf("VLAN %s created", vlanName)}
	if warning != "" {
		response["persistence_warning"] = warning
	}

	common.SendSuccess(c, response)
}

// linkToInterface converts netlink.Link to Interface
// getBridgeMembers returns the list of interfaces that are members of a bridge
func (s *Service) getBridgeMembers(bridge netlink.Link) []string {
	bridgeIndex := bridge.Attrs().Index
	members := make([]string, 0)

	// Get all links
	links, err := netlink.LinkList()
	if err != nil {
		return members
	}

	// Find all interfaces whose MasterIndex matches this bridge
	for _, link := range links {
		if link.Attrs().MasterIndex == bridgeIndex {
			members = append(members, link.Attrs().Name)
		}
	}

	return members
}

func (s *Service) linkToInterface(link netlink.Link) Interface {
	attrs := link.Attrs()

	iface := Interface{
		Name:  attrs.Name,
		MAC:   attrs.HardwareAddr.String(),
		MTU:   attrs.MTU,
		State: s.getLinkState(attrs),
		Type:  link.Type(),
	}

	// Get addresses
	addrs, _ := netlink.AddrList(link, 0)
	iface.Addresses = make([]string, 0, len(addrs))
	for _, addr := range addrs {
		iface.Addresses = append(iface.Addresses, addr.IPNet.String())
	}

	// Get statistics
	if attrs.Statistics != nil {
		iface.Statistics = &Stats{
			RxBytes:   attrs.Statistics.RxBytes,
			TxBytes:   attrs.Statistics.TxBytes,
			RxPackets: attrs.Statistics.RxPackets,
			TxPackets: attrs.Statistics.TxPackets,
			RxErrors:  attrs.Statistics.RxErrors,
			TxErrors:  attrs.Statistics.TxErrors,
		}
	}

	return iface
}

// getLinkState returns the state of a network link
func (s *Service) getLinkState(attrs *netlink.LinkAttrs) string {
	if attrs.Flags&net.FlagUp != 0 {
		return "up"
	}
	return "down"
}
