package routes

import (
	"github.com/awanio/vapor/internal/system"
	"github.com/gin-gonic/gin"
)

// SystemRoutes sets up system information routes
func SystemRoutes(r *gin.RouterGroup, systemService *system.Service) {
	r.GET("/system/summary", systemService.GetSummary)
	r.GET("/system/hardware", systemService.GetHardware)
	r.GET("/system/memory", systemService.GetMemory)
	r.GET("/system/cpu", systemService.GetCPU)
}
