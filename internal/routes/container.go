package routes

import (
	"log"

	"github.com/awanio/vapor/internal/container"
	"github.com/gin-gonic/gin"
)

// ContainerRoutes sets up container management routes (for containerd and CRI-O)
func ContainerRoutes(r *gin.RouterGroup) {
	containerService, err := container.NewService()
	if err != nil {
		log.Printf("Error initializing container service: %v", err)
		return
	}

	// Register container routes for containerd and CRI-O
	r.GET("/containers", containerService.ListContainers)
	r.GET("/images", containerService.ListImages)
	r.GET("/containers/:id", containerService.GetContainer)
	r.GET("/containers/:id/logs", containerService.GetContainerLogs)
	r.GET("/images/:id", containerService.GetImage)
	r.POST("/images/import", containerService.ImportImage)
}
