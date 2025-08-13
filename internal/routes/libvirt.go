//go:build linux && libvirt
// +build linux,libvirt

package routes

import (
	"net/http"
	"strconv"
	"time"

	"github.com/awanio/vapor/internal/libvirt"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

// LibvirtRoutes sets up libvirt VM management routes
func LibvirtRoutes(r *gin.RouterGroup, service *libvirt.Service) {
	vmGroup := r.Group("/virtualmachines")
	{
		// VM Management
		vmGroup.GET("", listVMs(service))                           // List all VMs
		vmGroup.GET("/:id", getVM(service))                        // Get VM details
		vmGroup.POST("", createVM(service))                        // Create new VM
		vmGroup.PUT("/:id", updateVM(service))                     // Update VM config
		vmGroup.DELETE("/:id", deleteVM(service))                  // Delete VM
		vmGroup.POST("/:id/action", vmAction(service))             // VM actions (start, stop, etc.)
		
		// Snapshots
		vmGroup.GET("/:id/snapshots", listSnapshots(service))      // List VM snapshots
		vmGroup.POST("/:id/snapshots", createSnapshot(service))    // Create snapshot
		vmGroup.POST("/:id/snapshots/:snapshot/revert", revertSnapshot(service)) // Revert to snapshot
		vmGroup.DELETE("/:id/snapshots/:snapshot", deleteSnapshot(service))      // Delete snapshot
		
		// Backups
		vmGroup.GET("/:id/backups", listBackups(service))          // List VM backups
		vmGroup.POST("/:id/backups", createBackup(service))        // Create backup
		vmGroup.POST("/restore", restoreBackup(service))           // Restore from backup
		vmGroup.DELETE("/backups/:backup_id", deleteBackup(service)) // Delete backup
		
		// Cloning
		vmGroup.POST("/clone", cloneVM(service))                   // Clone VM
		
		// Metrics & Monitoring
		vmGroup.GET("/:id/metrics", getVMMetrics(service))         // Get VM metrics
		vmGroup.GET("/:id/metrics/stream", streamVMMetrics(service)) // Stream metrics via WebSocket
		
		// Console Access
		vmGroup.GET("/:id/console", getConsole(service))           // Get console connection info
		vmGroup.GET("/:id/console/ws", vmConsoleWebSocket(service)) // WebSocket console
		
		// Templates
		vmGroup.GET("/templates", listTemplates(service))          // List VM templates
		vmGroup.POST("/from-template", createFromTemplate(service)) // Create VM from template
		
		// Migration
		vmGroup.POST("/:id/migrate", migrateVM(service))           // Migrate VM to another host
		vmGroup.GET("/:id/migration/status", getMigrationStatus(service)) // Get migration status
		
		// PCI Passthrough
		vmGroup.GET("/pci-devices", listPCIDevices(service))       // List available PCI devices
		vmGroup.POST("/:id/pci-devices", attachPCIDevice(service)) // Attach PCI device to VM
		vmGroup.DELETE("/:id/pci-devices/:device_id", detachPCIDevice(service)) // Detach PCI device from VM
		
		// Resource Hotplug
		vmGroup.POST("/:id/hotplug", hotplugResource(service))     // Hotplug resources to VM
	}

	// Storage Management
	storageGroup := r.Group("/storage")
	{
		poolsGroup := storageGroup.Group("/pools")
		{
			poolsGroup.GET("", listStoragePools(service))                      // List storage pools
			poolsGroup.POST("", createStoragePool(service))                    // Create storage pool
			poolsGroup.GET("/:name", getStoragePool(service))                  // Get pool details
			poolsGroup.DELETE("/:name", deleteStoragePool(service))             // Delete pool

			volumesGroup := poolsGroup.Group("/:pool_name/volumes")
			{
				volumesGroup.GET("", listVolumesInPool(service))       // List volumes in a pool
				volumesGroup.POST("", createVolumeInPool(service))    // Create a volume in a pool
				volumesGroup.GET("/:vol_name", getVolume(service))       // Get volume details
				volumesGroup.DELETE("/:vol_name", deleteVolume(service)) // Delete a volume
			}
		}
	}

	// Network Management
	networkGroup := r.Group("/networks")
	{
		networkGroup.GET("", listNetworks(service))                // List virtual networks
		networkGroup.GET("/:name", getNetwork(service))            // Get network details
		networkGroup.POST("", createNetwork(service))              // Create network
		networkGroup.DELETE("/:name", deleteNetwork(service))      // Delete network
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
	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true // Allow all origins in development
		},
	}

	return func(c *gin.Context) {
		id := c.Param("id")
		token := c.Query("token")
		
		// Validate token (simplified - implement proper validation)
		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "missing token"})
			return
		}

		ws, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to upgrade connection"})
			return
		}
		defer ws.Close()

		// Here you would implement the actual VNC/SPICE proxy
		// This requires connecting to the VM's VNC/SPICE port and proxying the data
		// For now, this is a placeholder
		
		ws.WriteJSON(gin.H{
			"type": "info",
			"message": "Console connection established for VM: " + id,
		})

		// Keep connection alive
		for {
			_, _, err := ws.ReadMessage()
			if err != nil {
				break
			}
		}
	}
}

// Template handlers

func listTemplates(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		// This would list available VM templates
		// For now, return a static list
		templates := []gin.H{
			{
				"name": "ubuntu-22.04",
				"description": "Ubuntu 22.04 LTS Server",
				"min_memory": 2048,
				"min_vcpus": 2,
				"min_disk": 20,
			},
			{
				"name": "centos-9",
				"description": "CentOS Stream 9",
				"min_memory": 2048,
				"min_vcpus": 2,
				"min_disk": 20,
			},
		}
		c.JSON(http.StatusOK, gin.H{"templates": templates})
	}
}

func createFromTemplate(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Template string `json:"template" binding:"required"`
			Name     string `json:"name" binding:"required"`
			Memory   uint64 `json:"memory"`
			VCPUs    uint   `json:"vcpus"`
			DiskSize uint64 `json:"disk_size"`
		}
		
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Create VM from template
		createReq := &libvirt.VMCreateRequest{
			Name:     req.Name,
			Memory:   req.Memory,
			VCPUs:    req.VCPUs,
			DiskSize: req.DiskSize,
			Template: req.Template,
		}

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
		poolName := c.Param("pool_name")
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

		req.PoolName = c.Param("pool_name")
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
		poolName := c.Param("pool_name")
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
		poolName := c.Param("pool_name")
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
				"message": "Migration started",
				"vm_id": id,
				"destination": req.DestHost,
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
			"data": status,
		})
	}
}

// PCI Passthrough handlers

func listPCIDevices(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		deviceType := c.Query("type")
		devices, err := service.ListPCIDevices(c.Request.Context(), deviceType)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
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
			"message": "PCI device attached successfully",
			"vm_id": id,
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
			"message": "PCI device detached successfully",
			"vm_id": id,
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
			"message": "Resource hotplug operation completed successfully",
			"vm_id": id,
			"resource_type": req.ResourceType,
			"action": req.Action,
		})
	}
}
