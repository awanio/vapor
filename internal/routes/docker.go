package routes

import (
	"log"
	"os"
	"path/filepath"

	"github.com/awanio/vapor/internal/docker"
	"github.com/gin-gonic/gin"
)

// DockerRoutes sets up Docker-related routes
func DockerRoutes(r *gin.RouterGroup) {
	dockerClient, err := docker.NewClient()
	if err != nil {
		log.Printf("Warning: Failed to create Docker client: %v", err)
		return
	}

	dockerService := docker.NewService(dockerClient)
	// Note: The client needs to be closed when the server shuts down
	// This should be handled by the main function

	// Register Docker routes
	r.GET("/docker/ps", dockerService.ListContainersGin)
	r.GET("/docker/images", dockerService.ListImagesGin)
	r.GET("/docker/networks", dockerService.ListNetworksGin)
	r.GET("/docker/volumes", dockerService.ListVolumesGin)

	// Container creation and image pulling
	r.POST("/docker/containers", dockerService.CreateContainerGin)
	r.POST("/docker/images/pull", dockerService.PullImageGin)
	r.POST("/docker/images/import", dockerService.ImportImageGin)

	// Container detail and actions
	r.GET("/docker/containers/:id", dockerService.GetContainerDetailGin)
	r.DELETE("/docker/containers/:id", dockerService.RemoveContainerGin)
	r.POST("/docker/containers/:id/start", dockerService.StartContainerGin)
	r.POST("/docker/containers/:id/stop", dockerService.StopContainerGin)
	r.POST("/docker/containers/:id/kill", dockerService.KillContainerGin)
	r.GET("/docker/containers/:id/logs", dockerService.GetContainerLogsGin)

	// Resource deletion
	r.DELETE("/docker/images/:id", dockerService.RemoveImageGin)
	r.DELETE("/docker/volumes/:id", dockerService.RemoveVolumeGin)
	r.DELETE("/docker/networks/:id", dockerService.RemoveNetworkGin)

	// Volume and Network creation
	r.POST("/docker/volumes", dockerService.CreateVolumeGin)
	r.POST("/docker/networks", dockerService.CreateNetworkGin)

	// Setup resumable upload handler for Docker images using TUS protocol
	// Create a runtime service wrapper that uses the Docker client
	dockerServiceWithRuntime, err := docker.NewServiceWithRuntimeClient(dockerClient)
	if err != nil {
		log.Printf("Warning: Failed to create docker service with runtime client for uploads: %v", err)
	} else if dockerServiceWithRuntime.GetRuntimeClient() != nil {
		uploadDir := filepath.Join(os.TempDir(), "vapor-uploads", "docker")
		resumableHandler := docker.NewResumableUploadHandler(dockerServiceWithRuntime, uploadDir)

		// TUS protocol endpoints for Docker image uploads with OPTIONS support
		r.OPTIONS("/docker/images/upload", resumableHandler.HandleOptions)     // OPTIONS for TUS protocol discovery
		r.OPTIONS("/docker/images/upload/:id", resumableHandler.HandleOptions) // OPTIONS for TUS protocol discovery
		r.POST("/docker/images/upload", resumableHandler.CreateUpload)
		r.GET("/docker/images/upload", resumableHandler.ListUploads)
		r.HEAD("/docker/images/upload/:id", resumableHandler.GetUploadInfo)
		r.PATCH("/docker/images/upload/:id", resumableHandler.UploadChunk)
		r.GET("/docker/images/upload/:id", resumableHandler.GetUploadStatus)
		r.POST("/docker/images/upload/:id/complete", resumableHandler.CompleteUpload)
		r.DELETE("/docker/images/upload/:id", resumableHandler.CancelUpload)
	}
}

// DockerRoutesWithClient sets up Docker routes with an existing client
func DockerRoutesWithClient(r *gin.RouterGroup, dockerClient docker.Client) {
	dockerService := docker.NewService(dockerClient)

	// Register Docker routes
	r.GET("/docker/ps", dockerService.ListContainersGin)
	r.GET("/docker/images", dockerService.ListImagesGin)
	r.GET("/docker/networks", dockerService.ListNetworksGin)
	r.GET("/docker/volumes", dockerService.ListVolumesGin)

	// Container creation and image pulling
	r.POST("/docker/containers", dockerService.CreateContainerGin)
	r.POST("/docker/images/pull", dockerService.PullImageGin)
	r.POST("/docker/images/import", dockerService.ImportImageGin)

	// Container detail and actions
	r.GET("/docker/containers/:id", dockerService.GetContainerDetailGin)
	r.DELETE("/docker/containers/:id", dockerService.RemoveContainerGin)
	r.POST("/docker/containers/:id/start", dockerService.StartContainerGin)
	r.POST("/docker/containers/:id/stop", dockerService.StopContainerGin)
	r.POST("/docker/containers/:id/kill", dockerService.KillContainerGin)
	r.GET("/docker/containers/:id/logs", dockerService.GetContainerLogsGin)

	// Resource deletion
	r.DELETE("/docker/images/:id", dockerService.RemoveImageGin)
	r.DELETE("/docker/volumes/:id", dockerService.RemoveVolumeGin)
	r.DELETE("/docker/networks/:id", dockerService.RemoveNetworkGin)

	// Volume and Network creation
	r.POST("/docker/volumes", dockerService.CreateVolumeGin)
	r.POST("/docker/networks", dockerService.CreateNetworkGin)

	// Setup resumable upload handler for Docker images using TUS protocol
	// Create a runtime service wrapper that uses the Docker client
	dockerServiceWithRuntime, err := docker.NewServiceWithRuntimeClient(dockerClient)
	if err != nil {
		log.Printf("Warning: Failed to create docker service with runtime client for uploads: %v", err)
	} else if dockerServiceWithRuntime.GetRuntimeClient() != nil {
		uploadDir := filepath.Join(os.TempDir(), "vapor-uploads", "docker")
		resumableHandler := docker.NewResumableUploadHandler(dockerServiceWithRuntime, uploadDir)

		// TUS protocol endpoints for Docker image uploads with OPTIONS support
		r.OPTIONS("/docker/images/upload", resumableHandler.HandleOptions)     // OPTIONS for TUS protocol discovery
		r.OPTIONS("/docker/images/upload/:id", resumableHandler.HandleOptions) // OPTIONS for TUS protocol discovery
		r.POST("/docker/images/upload", resumableHandler.CreateUpload)
		r.GET("/docker/images/upload", resumableHandler.ListUploads)
		r.HEAD("/docker/images/upload/:id", resumableHandler.GetUploadInfo)
		r.PATCH("/docker/images/upload/:id", resumableHandler.UploadChunk)
		r.GET("/docker/images/upload/:id", resumableHandler.GetUploadStatus)
		r.POST("/docker/images/upload/:id/complete", resumableHandler.CompleteUpload)
		r.DELETE("/docker/images/upload/:id", resumableHandler.CancelUpload)
	}
}
