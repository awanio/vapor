package network

import (
	"fmt"
	"net"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/vapor/system-api/internal/common"
	"github.com/vishvananda/netlink"
)

// Service handles network operations
type Service struct{}

// NewService creates a new network service
func NewService() *Service {
	return &Service{}
}

// Interface represents a network interface
type Interface struct {
	Name        string   `json:"name"`
	MAC         string   `json:"mac"`
	MTU         int      `json:"mtu"`
	State       string   `json:"state"`
	Type        string   `json:"type"`
	Addresses   []string `json:"addresses"`
	Statistics  *Stats   `json:"statistics"`
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

// GetInterfaces returns all network interfaces
func (s *Service) GetInterfaces(c *gin.Context) {
	links, err := netlink.LinkList()
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list interfaces", err.Error())
		return
	}

	interfaces := make([]Interface, 0, len(links))
	for _, link := range links {
		iface := s.linkToInterface(link)
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
			bridges = append(bridges, iface)
		}
	}

	common.SendSuccess(c, gin.H{"bridges": bridges})
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

	// Create address
	addr := &netlink.Addr{
		IPNet: &net.IPNet{
			IP:   ip,
			Mask: net.CIDRMask(req.Netmask, 32),
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

		route := &netlink.Route{
			LinkIndex: link.Attrs().Index,
			Gw:        gw,
		}

		if err := netlink.RouteAdd(route); err != nil {
			common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to add route", err.Error())
			return
		}
	}

	common.SendSuccess(c, gin.H{"message": fmt.Sprintf("Address %s/%d configured on %s", req.Address, req.Netmask, name)})
}

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

	// Add interfaces to bridge
	for _, ifaceName := range req.Interfaces {
		iface, err := netlink.LinkByName(ifaceName)
		if err != nil {
			continue
		}
		netlink.LinkSetMaster(iface, bridge)
	}

	// Bring bridge up
	netlink.LinkSetUp(bridge)

	common.SendSuccess(c, gin.H{"message": fmt.Sprintf("Bridge %s created", req.Name)})
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

	// Update bridge interfaces
	netlink.LinkSetDown(bridge)
	for _, ifaceName := range req.Interfaces {
		iface, err := netlink.LinkByName(ifaceName)
		if err == nil {
			netlink.LinkSetMaster(iface, bridge)
		}
	}
	netlink.LinkSetUp(bridge)
	common.SendSuccess(c, gin.H{"message": fmt.Sprintf("Bridge %s updated", req.Name)})
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

	// Update bond mode and interfaces
	bond.Mode = netlink.StringToBondMode(req.Mode)
	netlink.LinkSetDown(bond)
	for _, ifaceName := range req.Interfaces {
		iface, err := netlink.LinkByName(ifaceName)
		if err == nil {
			netlink.LinkSetMasterByIndex(iface, bond.Index)
		}
	}
	netlink.LinkSetUp(bond)
	common.SendSuccess(c, gin.H{"message": fmt.Sprintf("Bond %s updated", req.Name)})
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

// UpdateVLAN updates a VLAN interface
func (s *Service) UpdateVLAN(c *gin.Context) {
	name := c.Param("name")
	var req VLANRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeValidation, "Invalid request", err.Error())
		return
	}

	link, err := netlink.LinkByName(name)
	if err != nil {
		common.SendError(c, http.StatusNotFound, common.ErrCodeNotFound, "VLAN not found", err.Error())
		return
	}

	vlan, ok := link.(*netlink.Vlan)
	if !ok {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeValidation, "Not a VLAN interface")
		return
	}

	// Update VLAN ID
	vlan.VlanId = req.VLANID
	common.SendSuccess(c, gin.H{"message": fmt.Sprintf("VLAN %s updated", req.Name)})
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
	bondLink, _ := netlink.LinkByName(req.Name)
	
	// Add interfaces to bond
	for _, ifaceName := range req.Interfaces {
		iface, err := netlink.LinkByName(ifaceName)
		if err != nil {
			continue
		}
		netlink.LinkSetMasterByIndex(iface, bondLink.Attrs().Index)
	}

	// Bring bond up
	netlink.LinkSetUp(bond)

	common.SendSuccess(c, gin.H{"message": fmt.Sprintf("Bond %s created", req.Name)})
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

	// Create address
	addr := &netlink.Addr{
		IPNet: &net.IPNet{
			IP:   ip,
			Mask: net.CIDRMask(req.Netmask, 32),
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
	netlink.LinkSetUp(vlan)

	common.SendSuccess(c, gin.H{"message": fmt.Sprintf("VLAN %s created", vlanName)})
}

// linkToInterface converts netlink.Link to Interface
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
