//go:build !linux || !libvirt
// +build !linux !libvirt

package routes

import (
	"github.com/awanio/vapor/internal/libvirt"
	"github.com/gin-gonic/gin"
)

// LibvirtRoutes sets up libvirt VM management routes (stub)
func LibvirtRoutes(r *gin.RouterGroup, service *libvirt.Service) {
	// No routes registered when libvirt is not available
}
