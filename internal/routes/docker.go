package routes

import (
	"log"
	"os"
	"path/filepath"

	"github.com/awanio/vapor/internal/container"
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

	// Setup resumable upload handler for Docker images using TUS protocol
	// Create a container service wrapper that uses the Docker client
	containerService, err := container.NewServiceWithDockerClient(dockerClient)
	if err != nil {
		log.Printf("Warning: Failed to create container service for uploads: %v", err)
	} else {
		uploadDir := filepath.Join(os.TempDir(), "vapor-uploads", "docker")
		resumableHandler := container.NewResumableUploadHandler(containerService, uploadDir)

		// TUS protocol endpoints for Docker image uploads
		// Create new upload session
		r.POST("/docker/images/upload", resumableHandler.CreateUpload)
		// List active upload sessions
		r.GET("/docker/images/upload", resumableHandler.ListUploads)
		// Get upload session info (HEAD request for TUS)
		r.HEAD("/docker/images/upload/:id", resumableHandler.GetUploadInfo)
		// Upload chunk (PATCH request for TUS)
		r.PATCH("/docker/images/upload/:id", resumableHandler.UploadChunk)
		// Get upload status
		r.GET("/docker/images/upload/:id", resumableHandler.GetUploadStatus)
		// Complete upload and import image
		r.POST("/docker/images/upload/:id/complete", resumableHandler.CompleteUpload)
		// Cancel/delete upload session
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

	// Setup resumable upload handler for Docker images using TUS protocol
	// Create a container service wrapper that uses the Docker client
	containerService, err := container.NewServiceWithDockerClient(dockerClient)
	if err != nil {
		log.Printf("Warning: Failed to create container service for uploads: %v", err)
	} else {
		uploadDir := filepath.Join(os.TempDir(), "vapor-uploads", "docker")
		resumableHandler := container.NewResumableUploadHandler(containerService, uploadDir)

		// TUS protocol endpoints for Docker image uploads
		// Create new upload session
		r.POST("/docker/images/upload", resumableHandler.CreateUpload)
		// List active upload sessions
		r.GET("/docker/images/upload", resumableHandler.ListUploads)
		// Get upload session info (HEAD request for TUS)
		r.HEAD("/docker/images/upload/:id", resumableHandler.GetUploadInfo)
		// Upload chunk (PATCH request for TUS)
		r.PATCH("/docker/images/upload/:id", resumableHandler.UploadChunk)
		// Get upload status
		r.GET("/docker/images/upload/:id", resumableHandler.GetUploadStatus)
		// Complete upload and import image
		r.POST("/docker/images/upload/:id/complete", resumableHandler.CompleteUpload)
		// Cancel/delete upload session
		r.DELETE("/docker/images/upload/:id", resumableHandler.CancelUpload)
	}
}
