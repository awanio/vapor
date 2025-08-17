package routes

import (
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/awanio/vapor/internal/libvirt"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

// LibvirtRoutes sets up libvirt VM management routes
func LibvirtRoutes(r *gin.RouterGroup, service *libvirt.Service) {
	vmGroup := r.Group("/virtualization/virtualmachines")
	{
		// VM Management
		vmGroup.GET("", listVMs(service))              // List all VMs
		vmGroup.GET("/:id", getVM(service))            // Get VM details
		vmGroup.POST("", createVM(service))            // Create new VM
		vmGroup.PUT("/:id", updateVM(service))         // Update VM config
		vmGroup.DELETE("/:id", deleteVM(service))      // Delete VM
		vmGroup.POST("/:id/action", vmAction(service)) // VM actions (start, stop, etc.)

		// Snapshots
		vmGroup.GET("/:id/snapshots/capabilities", getSnapshotCapabilities(service)) // Check snapshot capabilities
		vmGroup.GET("/:id/snapshots", listSnapshots(service))                        // List VM snapshots
		vmGroup.POST("/:id/snapshots", createSnapshot(service))                      // Create snapshot
		vmGroup.POST("/:id/snapshots/:snapshot/revert", revertSnapshot(service))     // Revert to snapshot
		vmGroup.DELETE("/:id/snapshots/:snapshot", deleteSnapshot(service))          // Delete snapshot

		// Backups
		vmGroup.GET("/:id/backups", listBackups(service))            // List VM backups
		vmGroup.POST("/:id/backups", createBackup(service))          // Create backup
		vmGroup.POST("/restore", restoreBackup(service))             // Restore from backup
		vmGroup.DELETE("/backups/:backup_id", deleteBackup(service)) // Delete backup

		// Cloning
		vmGroup.POST("/clone", cloneVM(service)) // Clone VM

		// Metrics & Monitoring
		vmGroup.GET("/:id/metrics", getVMMetrics(service))           // Get VM metrics
		vmGroup.GET("/:id/metrics/stream", streamVMMetrics(service)) // Stream metrics via WebSocket

		// Console Access
		vmGroup.GET("/:id/console", getConsole(service))            // Get console connection info
		vmGroup.GET("/:id/console/ws", vmConsoleWebSocket(service)) // WebSocket console

		// Templates
		vmGroup.GET("/templates", listTemplates(service))             // List VM templates
		vmGroup.GET("/templates/:id", getTemplate(service))           // Get template details
		vmGroup.POST("/templates", createTemplate(service))           // Create new template
		vmGroup.PUT("/templates/:id", updateTemplate(service))        // Update template
		vmGroup.DELETE("/templates/:id", deleteTemplate(service))     // Delete template
		vmGroup.POST("/from-template", createVMFromTemplate(service)) // Create VM from template

		// Migration
		vmGroup.POST("/:id/migrate", migrateVM(service))                  // Migrate VM to another host
		vmGroup.GET("/:id/migration/status", getMigrationStatus(service)) // Get migration status

		// PCI Passthrough
		vmGroup.GET("/pci-devices", listPCIDevices(service))                    // List available PCI devices
		vmGroup.POST("/:id/pci-devices", attachPCIDevice(service))              // Attach PCI device to VM
		vmGroup.DELETE("/:id/pci-devices/:device_id", detachPCIDevice(service)) // Detach PCI device from VM

		// Resource Hotplug
		vmGroup.POST("/:id/hotplug", hotplugResource(service)) // Hotplug resources to VM

		// Enhanced VM creation with multiple disks support
		vmGroup.POST("/create-enhanced", createVMEnhanced(service)) // Create VM with enhanced options

		// ISO Management
		vmGroup.GET("/isos", listISOs(service))         // List available ISOs
		vmGroup.POST("/isos", uploadISO(service))       // Upload/register ISO
		vmGroup.DELETE("/isos/:id", deleteISO(service)) // Delete ISO
	}

	// Storage Management
	storageGroup := r.Group("/virtualization/storages")
	{
		poolsGroup := storageGroup.Group("/pools")
		{
			poolsGroup.GET("", listStoragePools(service))           // List storage pools
			poolsGroup.POST("", createStoragePool(service))         // Create storage pool
			poolsGroup.GET("/:name", getStoragePool(service))       // Get pool details
			poolsGroup.DELETE("/:name", deleteStoragePool(service)) // Delete pool

			volumesGroup := poolsGroup.Group("/:name/volumes")
			{
				volumesGroup.GET("", listVolumesInPool(service))         // List volumes in a pool
				volumesGroup.POST("", createVolumeInPool(service))       // Create a volume in a pool
				volumesGroup.GET("/:vol_name", getVolume(service))       // Get volume details
				volumesGroup.DELETE("/:vol_name", deleteVolume(service)) // Delete a volume
			}
		}

		// ISO Management with resumable uploads
		isosGroup := storageGroup.Group("/isos")
		{
			// Setup resumable upload handler for ISO images using TUS protocol
			uploadDir := filepath.Join(os.TempDir(), "vapor-uploads", "isos")
			isoUploadHandler := libvirt.NewISOResumableUploadHandler(service, uploadDir)

			// TUS protocol endpoints for ISO uploads
			isosGroup.POST("/upload", isoUploadHandler.CreateUpload)                // Create new upload session
			isosGroup.GET("/upload", isoUploadHandler.ListUploads)                  // List active upload sessions
			isosGroup.HEAD("/upload/:id", isoUploadHandler.GetUploadInfo)           // Get upload session info (HEAD request for TUS)
			isosGroup.PATCH("/upload/:id", isoUploadHandler.UploadChunk)            // Upload chunk (PATCH request for TUS)
			isosGroup.GET("/upload/:id", isoUploadHandler.GetUploadStatus)          // Get upload status
			isosGroup.POST("/upload/:id/complete", isoUploadHandler.CompleteUpload) // Complete upload and register ISO
			isosGroup.DELETE("/upload/:id", isoUploadHandler.CancelUpload)          // Cancel/delete upload session
		}
	}

	// Network Management
	networkGroup := r.Group("/virtualization/networks")
	{
		networkGroup.GET("", listNetworks(service))           // List virtual networks
		networkGroup.GET("/:name", getNetwork(service))       // Get network details
		networkGroup.POST("", createNetwork(service))         // Create network
		networkGroup.DELETE("/:name", deleteNetwork(service)) // Delete network
	}
}

// VM Management handlers

func listVMs(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		vms, err := service.ListVMs(c.Request.Context())
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"vms": vms})
	}
}

func getVM(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		vm, err := service.GetVM(c.Request.Context(), id)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, vm)
	}
}

func createVM(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req libvirt.VMCreateRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		vm, err := service.CreateVM(c.Request.Context(), &req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusCreated, vm)
	}
}

func updateVM(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var req libvirt.VMUpdateRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		vm, err := service.UpdateVM(c.Request.Context(), id, &req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, vm)
	}
}

func deleteVM(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")

		// Check if we should remove disks too
		removeDisks := c.Query("remove_disks") == "true"

		err := service.DeleteVM(c.Request.Context(), id, removeDisks)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusNoContent, nil)
	}
}

func vmAction(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var req libvirt.VMActionRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		err := service.VMAction(c.Request.Context(), id, req.Action, req.Force)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "action completed", "action": req.Action})
	}
}

// Snapshot handlers

func getSnapshotCapabilities(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		capabilities, err := service.GetSnapshotCapabilities(c.Request.Context(), id)
		if err != nil {
			if strings.Contains(err.Error(), "not found") {
				c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, capabilities)
	}
}
func listSnapshots(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		snapshots, err := service.ListSnapshots(c.Request.Context(), id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"snapshots": snapshots})
	}
}

func createSnapshot(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var req libvirt.VMSnapshotRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		snapshot, err := service.CreateSnapshot(c.Request.Context(), id, &req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusCreated, snapshot)
	}
}

func revertSnapshot(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		snapshotName := c.Param("snapshot")

		err := service.RevertSnapshot(c.Request.Context(), id, snapshotName)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "reverted to snapshot"})
	}
}

func deleteSnapshot(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		snapshotName := c.Param("snapshot")

		err := service.DeleteSnapshot(c.Request.Context(), id, snapshotName)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusNoContent, nil)
	}
}

// Backup handlers

func listBackups(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		backups, err := service.ListBackups(c.Request.Context(), id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"backups": backups})
	}
}

func createBackup(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var req libvirt.VMBackupRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		backup, err := service.CreateBackup(c.Request.Context(), id, &req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusAccepted, backup)
	}
}

func restoreBackup(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req libvirt.VMRestoreRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		vm, err := service.RestoreBackup(c.Request.Context(), &req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, vm)
	}
}

func deleteBackup(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		backupID := c.Param("backup_id")
		err := service.DeleteBackup(c.Request.Context(), backupID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusNoContent, nil)
	}
}

// Clone handler

func cloneVM(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req libvirt.VMCloneRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		vm, err := service.CloneVM(c.Request.Context(), &req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusCreated, vm)
	}
}

// Metrics handlers

func getVMMetrics(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		metrics, err := service.GetVMMetrics(c.Request.Context(), id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, metrics)
	}
}

func streamVMMetrics(service *libvirt.Service) gin.HandlerFunc {
	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true // Allow all origins in development
		},
	}

	return func(c *gin.Context) {
		id := c.Param("id")

		// Get interval from query params (default 5 seconds)
		interval := 5
		if i := c.Query("interval"); i != "" {
			if parsed, err := strconv.Atoi(i); err == nil && parsed > 0 {
				interval = parsed
			}
		}

		ws, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to upgrade connection"})
			return
		}
		defer ws.Close()

		ticker := time.NewTicker(time.Duration(interval) * time.Second)
		defer ticker.Stop()

		done := make(chan struct{})

		// Read messages from client (for ping/pong)
		go func() {
			for {
				_, _, err := ws.ReadMessage()
				if err != nil {
					close(done)
					return
				}
			}
		}()

		for {
			select {
			case <-ticker.C:
				metrics, err := service.GetVMMetrics(c.Request.Context(), id)
				if err != nil {
					ws.WriteJSON(gin.H{"error": err.Error()})
					return
				}

				if err := ws.WriteJSON(metrics); err != nil {
					return
				}
			case <-done:
				return
			}
		}
	}
}

// Console handlers

func getConsole(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		consoleType := c.DefaultQuery("type", "vnc")

		console, err := service.GetConsole(c.Request.Context(), id, consoleType)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, console)
	}
}


func vmConsoleWebSocket(service *libvirt.Service) gin.HandlerFunc {
return func(c *gin.Context) {
		// id parameter not used in WebSocket connection
token := c.Query("token")

// Validate token is provided
if token == "" {
c.JSON(http.StatusUnauthorized, gin.H{
"error": "missing token",
"code":  "MISSING_TOKEN",
})
return
}

// Get console proxy from service
consoleProxy := service.GetConsoleProxy()
if consoleProxy == nil {
c.JSON(http.StatusInternalServerError, gin.H{
"error": "console proxy not initialized",
"code":  "PROXY_UNAVAILABLE",
})
return
}

// Upgrade to WebSocket
ws, err := consoleProxy.WebSocketUpgrader().Upgrade(c.Writer, c.Request, nil)
if err != nil {
c.JSON(http.StatusBadRequest, gin.H{
"error": "failed to upgrade to WebSocket",
"code":  "UPGRADE_FAILED",
})
return
}
defer ws.Close()

// Handle the WebSocket connection through the console proxy
if err := consoleProxy.HandleWebSocket(ws, token); err != nil {
// Send error to client before closing
if consoleErr, ok := err.(*libvirt.ConsoleError); ok {
ws.WriteJSON(gin.H{
"type":  "error",
"code":  consoleErr.Code,
"error": consoleErr.Message,
})
} else {
ws.WriteJSON(gin.H{
"type":  "error",
"error": err.Error(),
})
}
return
}
}
}

func listTemplates(service *libvirt.Service) gin.HandlerFunc {

	return func(c *gin.Context) {
		templates, err := service.TemplateService.ListTemplates(c.Request.Context())
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"templates": templates})
	}
}

func getTemplate(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		idStr := c.Param("id")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid template ID"})
			return
		}

		template, err := service.TemplateService.GetTemplate(c.Request.Context(), id)
		if err != nil {
			if err.Error() == "template not found" {
				c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, template)
	}
}

func createTemplate(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req libvirt.VMTemplateCreateRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		template, err := service.TemplateService.CreateTemplate(c.Request.Context(), &req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusCreated, template)
	}
}

func updateTemplate(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		idStr := c.Param("id")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid template ID"})
			return
		}

		var req libvirt.VMTemplateUpdateRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		template, err := service.TemplateService.UpdateTemplate(c.Request.Context(), id, &req)
		if err != nil {
			if err.Error() == "template not found" {
				c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, template)
	}
}

func deleteTemplate(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		idStr := c.Param("id")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid template ID"})
			return
		}

		err = service.TemplateService.DeleteTemplate(c.Request.Context(), id)
		if err != nil {
			if err.Error() == "template not found" {
				c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusNoContent, nil)
	}
}

func createVMFromTemplate(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			TemplateID int                      `json:"template_id" binding:"required"`
			Name       string                   `json:"name" binding:"required"`
			Memory     uint64                   `json:"memory,omitempty"`
			VCPUs      uint                     `json:"vcpus,omitempty"`
			DiskSize   uint64                   `json:"disk_size,omitempty"`
			Network    *libvirt.NetworkConfig   `json:"network,omitempty"`
			Graphics   *libvirt.GraphicsConfig  `json:"graphics,omitempty"`
			CloudInit  *libvirt.CloudInitConfig `json:"cloud_init,omitempty"`
			Metadata   map[string]string        `json:"metadata,omitempty"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Get the template
		template, err := service.TemplateService.GetTemplate(c.Request.Context(), req.TemplateID)
		if err != nil {
			if err.Error() == "template not found" {
				c.JSON(http.StatusNotFound, gin.H{"error": "template not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Create VM request with user-provided values
		createReq := &libvirt.VMCreateRequest{
			Name:     req.Name,
			Memory:   req.Memory,
			VCPUs:    req.VCPUs,
			DiskSize: req.DiskSize,
			Metadata: req.Metadata,
		}

		// Apply network config if provided
		if req.Network != nil {
			createReq.Network = *req.Network
		}

		// Apply graphics config if provided
		if req.Graphics != nil {
			createReq.Graphics = *req.Graphics
		}

		// Apply cloud-init config if provided
		if req.CloudInit != nil {
			createReq.CloudInit = req.CloudInit
		}

		// Apply template settings to the request
		// This will fill in any missing values with template defaults
		if err := service.ApplyTemplateToRequest(createReq, template); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Create the VM with the composed request
		vm, err := service.CreateVM(c.Request.Context(), createReq)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusCreated, vm)
	}
}

// Storage handlers

func listStoragePools(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		pools, err := service.ListStoragePools(c.Request.Context())
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"pools": pools})
	}
}

func createStoragePool(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req libvirt.StoragePoolCreateRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		pool, err := service.CreateStoragePool(c.Request.Context(), &req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusCreated, pool)
	}
}

func getStoragePool(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		name := c.Param("name")
		pool, err := service.GetStoragePool(c.Request.Context(), name)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, pool)
	}
}

func deleteStoragePool(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		name := c.Param("name")
		deleteVolumes := c.Query("delete_volumes") == "true"

		err := service.DeleteStoragePool(c.Request.Context(), name, deleteVolumes)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusNoContent, nil)
	}
}

func listVolumesInPool(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		poolName := c.Param("name")
		volumes, err := service.ListVolumes(c.Request.Context(), poolName)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"volumes": volumes})
	}
}

func createVolumeInPool(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req libvirt.VolumeCreateRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		req.PoolName = c.Param("name")
		volume, err := service.CreateVolume(c.Request.Context(), &req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusCreated, volume)
	}
}

func getVolume(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		poolName := c.Param("name")
		volName := c.Param("vol_name")
		volume, err := service.GetVolume(c.Request.Context(), poolName, volName)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, volume)
	}
}

func deleteVolume(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		poolName := c.Param("name")
		volName := c.Param("vol_name")
		err := service.DeleteVolume(c.Request.Context(), poolName, volName)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusNoContent, nil)
	}
}

// Network handlers

func listNetworks(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		networks, err := service.ListNetworks(c.Request.Context())
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"networks": networks})
	}
}

func createNetwork(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req libvirt.NetworkCreateRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		network, err := service.CreateNetwork(c.Request.Context(), &req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusCreated, network)
	}
}

func getNetwork(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		name := c.Param("name")
		network, err := service.GetNetwork(c.Request.Context(), name)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, network)
	}
}

func deleteNetwork(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		name := c.Param("name")
		err := service.DeleteNetwork(c.Request.Context(), name)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusNoContent, nil)
	}
}

// Migration handlers

func migrateVM(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var req libvirt.MigrationRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		migrationID, err := service.MigrateVM(c.Request.Context(), id, &req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusAccepted, gin.H{
			"status": "success",
			"data": gin.H{
				"migration_id": migrationID,
				"message":      "Migration started",
				"vm_id":        id,
				"destination":  req.DestinationHost,
			},
		})
	}
}

func getMigrationStatus(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		migrationID := c.Query("migration_id")

		status, err := service.GetMigrationStatus(c.Request.Context(), id, migrationID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data":   status,
		})
	}
}

// PCI Passthrough handlers

func listPCIDevices(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		deviceType := c.Query("type")
		devices, err := service.ListPCIDevices(c.Request.Context())
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Filter by type if specified
		if deviceType != "" {
			var filtered []libvirt.PCIDevice
			for _, device := range devices {
				if string(device.DeviceType) == deviceType {
					filtered = append(filtered, device)
				}
			}
			devices = filtered
		}

		c.JSON(http.StatusOK, gin.H{"devices": devices})
	}
}

func attachPCIDevice(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var req libvirt.PCIPassthroughRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		err := service.AttachPCIDevice(c.Request.Context(), id, &req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message":   "PCI device attached successfully",
			"vm_id":     id,
			"device_id": req.DeviceID,
		})
	}
}

func detachPCIDevice(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		deviceID := c.Param("device_id")

		req := libvirt.PCIDetachRequest{
			DeviceID: deviceID,
		}

		err := service.DetachPCIDevice(c.Request.Context(), id, &req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message":   "PCI device detached successfully",
			"vm_id":     id,
			"device_id": deviceID,
		})
	}
}

// Resource Hotplug handler

func hotplugResource(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var req libvirt.HotplugRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		err := service.HotplugResource(c.Request.Context(), id, &req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message":       "Resource hotplug operation completed successfully",
			"vm_id":         id,
			"resource_type": req.ResourceType,
			"action":        req.Action,
		})
	}
}

// Enhanced VM Creation handler

func createVMEnhanced(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req libvirt.VMCreateRequestEnhanced
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		vm, err := service.CreateVMEnhanced(c.Request.Context(), &req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusCreated, vm)
	}
}

// ISO Management handlers

func listISOs(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		isos, err := service.ListISOs(c.Request.Context())
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"isos": isos})
	}
}

func uploadISO(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req libvirt.ISOUploadRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		iso, err := service.UploadISO(c.Request.Context(), &req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusCreated, iso)
	}
}

func deleteISO(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		err := service.DeleteISO(c.Request.Context(), id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusNoContent, nil)
	}
}
