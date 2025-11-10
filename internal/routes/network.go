package routes

import (
	"github.com/awanio/vapor/internal/network"
	"github.com/gin-gonic/gin"
)

// NetworkRoutes sets up network-related routes
func NetworkRoutes(r *gin.RouterGroup, networkService *network.Service) {
	// Network endpoints
	r.GET("/network/interface-types", networkService.GetInterfaceTypes)
	r.GET("/network/interfaces", networkService.GetInterfaces)
	r.PUT("/network/interfaces/:name/up", networkService.InterfaceUp)
	r.PUT("/network/interfaces/:name/down", networkService.InterfaceDown)
	r.POST("/network/interfaces/:name/address", networkService.SetInterfaceAddress)
	r.PUT("/network/interfaces/:name/address", networkService.UpdateInterfaceAddress)
	r.DELETE("/network/interfaces/:name/address", networkService.DeleteInterfaceAddress)
	r.GET("/network/bridges", networkService.GetBridges)
	r.GET("/network/bridge/:name", networkService.GetBridge)
	r.POST("/network/bridge", networkService.CreateBridge)
	r.PUT("/network/bridge/:name", networkService.UpdateBridge)
	r.DELETE("/network/bridge/:name", networkService.DeleteBridge)
	r.GET("/network/bonds", networkService.GetBonds)
	r.POST("/network/bond", networkService.CreateBond)
	r.PUT("/network/bond/:name", networkService.UpdateBond)
	r.DELETE("/network/bond/:name", networkService.DeleteBond)
	r.GET("/network/vlans", networkService.GetVLANs)
	r.POST("/network/vlan", networkService.CreateVLAN)
	r.PUT("/network/vlan/:name", networkService.UpdateVLAN)
	r.DELETE("/network/vlan/:name", networkService.DeleteVLAN)
}
