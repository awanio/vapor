package routes

import (
	"log"
	"os"
	"path/filepath"

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

	// Setup resumable upload handler for container images using TUS protocol
	uploadDir := filepath.Join(os.TempDir(), "vapor-uploads", "containers")
	resumableHandler := container.NewResumableUploadHandler(containerService, uploadDir)

	// // TUS protocol endpoints for container image uploads
	// // Create new upload session
	// r.POST("/images/upload", resumableHandler.CreateUpload)
	// // List active upload sessions
	// r.GET("/images/upload", resumableHandler.ListUploads)
	// // Get upload session info (HEAD request for TUS)
	// r.HEAD("/images/upload/:id", resumableHandler.GetUploadInfo)
	// // Upload chunk (PATCH request for TUS)
	// r.PATCH("/images/upload/:id", resumableHandler.UploadChunk)
	// // Get upload status
	// r.GET("/images/upload/:id", resumableHandler.GetUploadStatus)
	// // Complete upload and import image
	// r.POST("/images/upload/:id/complete", resumableHandler.CompleteUpload)
	// // Cancel/delete upload session
	// r.DELETE("/images/upload/:id", resumableHandler.CancelUpload)

	// Also register under /containers/images/upload for compatibility

	containersGroup := r.Group("/containers")
	{
		// Register container routes for containerd and CRI-O
		containersGroup.GET("", containerService.ListContainers)
		containersGroup.POST("", containerService.CreateContainer)
		containersGroup.GET("/:id", containerService.GetContainer)
		containersGroup.GET("/:id/logs", containerService.GetContainerLogs)
		containersGroup.GET("/images", containerService.ListImages)
		containersGroup.GET("/images/:id", containerService.GetImage)
		containersGroup.POST("/images/import", containerService.ImportImage)
		containersGroup.POST("/images/pull", containerService.PullImage)
		containersGroup.DELETE("/images/:id", containerService.RemoveImage)

		// TUS protocol endpoints under containers group with OPTIONS support
		containersGroup.OPTIONS("/images/upload", resumableHandler.HandleOptions)     // OPTIONS for TUS protocol discovery
		containersGroup.OPTIONS("/images/upload/:id", resumableHandler.HandleOptions) // OPTIONS for TUS protocol discovery
		containersGroup.POST("/images/upload", resumableHandler.CreateUpload)
		containersGroup.GET("/images/upload", resumableHandler.ListUploads)
		containersGroup.HEAD("/images/upload/:id", resumableHandler.GetUploadInfo)
		containersGroup.PATCH("/images/upload/:id", resumableHandler.UploadChunk)
		containersGroup.GET("/images/upload/:id", resumableHandler.GetUploadStatus)
		containersGroup.POST("/images/upload/:id/complete", resumableHandler.CompleteUpload)
		containersGroup.DELETE("/images/upload/:id", resumableHandler.CancelUpload)
	}
}
