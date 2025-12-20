package routes

import (
	"errors"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/awanio/vapor/internal/auth"
	"github.com/awanio/vapor/internal/libvirt"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

// LibvirtRoutes sets up libvirt VM management routes
func LibvirtRoutes(r *gin.RouterGroup, authService *auth.EnhancedService, service *libvirt.Service) {

	// Exclude from auth header token middleware (WebSocket endpoints)
	// Legacy WebSocket endpoint (backward compatibility)
	r.GET("/virtualization/computes/:id/console/ws", vmConsoleWebSocket(service))

	// New specific WebSocket endpoints for VNC and SPICE
	r.GET("/virtualization/computes/:id/console/vnc/ws", vmVNCWebSocket(service))
	r.GET("/virtualization/computes/:id/console/spice/ws", vmSPICEWebSocket(service))

	r.Use(authService.AuthMiddleware())

	vmGroup := r.Group("/virtualization/computes")
	{
		// Console Access
		// Legacy endpoint (backward compatibility) - returns all available consoles if no type specified
		vmGroup.GET("/:id/console", getConsole(service))

		// New improved endpoints
		vmGroup.GET("/:id/consoles", getAvailableConsoles(service)) // Get all available console types
		vmGroup.GET("/:id/console/vnc", getVNCConsole(service))     // Get VNC console info
		vmGroup.GET("/:id/console/spice", getSPICEConsole(service)) // Get SPICE console info
		vmGroup.GET("/:id/console/stats", getConsoleStats(service)) // Get console connection stats
		// VM Management
		// vmGroup.GET("/:id", getVM(service))                                          // Get VM details
		// vmGroup.POST("", createVM(service))                                          // Create new VM
		// vmGroup.PUT("/:id", updateVM(service))                                       // Update VM config

		// CRUD
		vmGroup.GET("", listVMs(service))              // List all VMs
		vmGroup.GET("/:id", getVMEnhanced(service))    // Get VM details
		vmGroup.POST("", createVMEnhanced(service))    // Create VM with enhanced options
		vmGroup.PUT("/:id", updateVMEnhanced(service)) // Update VM with enhanced options
		vmGroup.DELETE("/:id", deleteVM(service))      // Delete VM

		vmGroup.POST("/:id/action", vmAction(service)) // VM actions (start, stop, etc.)

		// network
		vmGroup.POST("/:id/network-link", setNetworkLinkState(service))                // Set network interface link state
		vmGroup.GET("/:id/network-link/:interface-name", getNetworkLinkState(service)) // Get network interface link state

		// Snapshots
		vmGroup.GET("/:id/snapshots/capabilities", getSnapshotCapabilities(service)) // Check snapshot capabilities
		vmGroup.GET("/:id/snapshots", listSnapshots(service))                        // List VM snapshots
		vmGroup.POST("/:id/snapshots", createSnapshot(service))                      // Create snapshot
		vmGroup.POST("/:id/snapshots/:snapshot/revert", revertSnapshot(service))     // Revert to snapshot
		vmGroup.DELETE("/:id/snapshots/:snapshot", deleteSnapshot(service))          // Delete snapshot
		vmGroup.GET("/:id/snapshots/:snapshot", getSnapshotDetail(service))          // Get snapshot details

		// Backups
		vmGroup.GET("/:id/backups", listBackups(service))            // List VM backups
		vmGroup.POST("/:id/backups", createBackup(service))          // Create backup
		vmGroup.POST("/restore", restoreBackup(service))             // Restore from backup
		vmGroup.DELETE("/backups/:backup_id", deleteBackup(service)) // Delete backup

		// Cloning
		vmGroup.POST("/:id/clone", cloneVM(service)) // Clone VM
		vmGroup.POST("/clone", cloneVM(service))     // Clone VM

		// Metrics & Monitoring
		vmGroup.GET("/:id/metrics", getVMMetrics(service))           // Get VM metrics
		vmGroup.GET("/:id/metrics/stream", streamVMMetrics(service)) // Stream metrics via WebSocket

		// Templates
		vmGroup.GET("/templates", listTemplates(service))             // List VM templates
		vmGroup.GET("/templates/:id", getTemplate(service))           // Get template details
		vmGroup.POST("/templates", createTemplate(service))           // Create new template
		vmGroup.PUT("/templates/:id", updateTemplate(service))        // Update template
		vmGroup.DELETE("/templates/:id", deleteTemplate(service))     // Delete template
		vmGroup.POST("/:id/template", createTemplateFromVM(service))  // Create template from existing VM
		vmGroup.POST("/from-template", createVMFromTemplate(service)) // Create VM from template

		// Migration
		vmGroup.POST("/:id/migrate", migrateVM(service))                  // Migrate VM to another host
		vmGroup.GET("/:id/migration/status", getMigrationStatus(service)) // Get migration status

		// PCI Passthrough
		vmGroup.GET("/pci-devices", listPCIDevices(service))                    // List available PCI devices
		vmGroup.POST("/:id/pci-devices", attachPCIDevice(service))              // Attach PCI device to VM
		vmGroup.DELETE("/:id/pci-devices/:device_id", detachPCIDevice(service)) // Detach PCI device from VM

	}

	// Global Backups
	r.GET("/virtualization/computes/backups", listAllBackups(service))
	r.POST("/virtualization/computes/backups/import", importBackup(service))
	r.GET("/virtualization/computes/backups/:backup_id/download", downloadBackup(service))

	// ISO Management
	isoGroup := r.Group("/virtualization/isos")
	{
		isoGroup.GET("", listISOs(service))
		isoGroup.POST("", uploadISO(service))
		isoGroup.DELETE("/:id", deleteISO(service))
		isoGroup.GET("/:id", getISO(service))
		isoGroup.GET("/:id/download", downloadISO(service))

		// ISO Management with resumable uploads
		upload := isoGroup.Group("/upload")
		{
			// Setup resumable upload handler for ISO images using TUS protocol
			uploadDir := filepath.Join(os.TempDir(), "vapor-uploads", "isos")
			isoUploadHandler := libvirt.NewISOResumableUploadHandler(service, uploadDir)

			// TUS protocol endpoints for ISO uploads
			upload.OPTIONS("", isoUploadHandler.HandleOptions)            // OPTIONS for TUS protocol discovery
			upload.OPTIONS("/:id", isoUploadHandler.HandleOptions)        // OPTIONS for TUS protocol discovery
			upload.POST("", isoUploadHandler.CreateUpload)                // Create new upload session
			upload.GET("", isoUploadHandler.ListUploads)                  // List active upload sessions
			upload.HEAD("/:id", isoUploadHandler.GetUploadInfo)           // Get upload session info (HEAD request for TUS)
			upload.PATCH("/:id", isoUploadHandler.UploadChunk)            // Upload chunk (PATCH request for TUS)
			upload.GET("/:id", isoUploadHandler.GetUploadStatus)          // Get upload status
			upload.POST("/:id/complete", isoUploadHandler.CompleteUpload) // Complete upload and register ISO
			upload.DELETE("/:id", isoUploadHandler.CancelUpload)          // Cancel/delete upload session
		}

	}

	// Storage Management
	storageGroup := r.Group("/virtualization/storages")
	{
		poolsGroup := storageGroup.Group("/pools")
		{
			poolsGroup.GET("", listStoragePools(service))                      // List storage pools
			poolsGroup.POST("", createStoragePool(service))                    // Create storage pool
			poolsGroup.GET("/:name", getStoragePool(service))                  // Get pool details
			poolsGroup.DELETE("/:name", deleteStoragePool(service))            // Delete pool
			poolsGroup.PUT("/:name", updateStoragePool(service))               // Update pool
			poolsGroup.POST("/:name/start", startStoragePool(service))         // Start pool
			poolsGroup.POST("/:name/stop", stopStoragePool(service))           // Stop pool
			poolsGroup.POST("/:name/refresh", refreshStoragePool(service))     // Refresh pool
			poolsGroup.GET("/:name/capacity", getStoragePoolCapacity(service)) // Get capacity

			volumesGroup := poolsGroup.Group("/:name/volumes")
			{
				volumesGroup.GET("", listVolumesInPool(service))                    // List volumes in a pool
				volumesGroup.POST("", createVolumeInPool(service))                  // Create a volume in a pool
				volumesGroup.GET("/:vol_name", getVolume(service))                  // Get volume details
				volumesGroup.DELETE("/:vol_name", deleteVolume(service))            // Delete a volume
				volumesGroup.POST("/:vol_name/resize", resizeVolumeInPool(service)) // Resize a volume
				volumesGroup.POST("/:vol_name/clone", cloneVolumeInPool(service))   // Clone a volume
			}
		}
	}

	// Volumes (across all pools)
	r.GET("/virtualization/volumes", listAllVolumes(service)) // List all volumes across all pools

	// Network Management
	networkGroup := r.Group("/virtualization/networks")
	{
		networkGroup.GET("", listNetworks(service))                           // List virtual networks
		networkGroup.GET("/:name", getNetwork(service))                       // Get network details
		networkGroup.POST("", createNetwork(service))                         // Create network
		networkGroup.PUT("/:name", updateNetwork(service))                    // Update network
		networkGroup.POST("/:name/start", startNetwork(service))              // Start network
		networkGroup.POST("/:name/stop", stopNetwork(service))                // Stop network
		networkGroup.GET("/:name/dhcp-leases", getNetworkDHCPLeases(service)) // Get DHCP leases
		networkGroup.GET("/:name/ports", getNetworkPorts(service))            // Get network ports
		networkGroup.DELETE("/:name", deleteNetwork(service))                 // Delete network
	}
}

// VM Management handlers

// sendComputeError sends a consistent error response for compute/VM operations
func sendComputeError(c *gin.Context, code string, message string, err error, status int) {
	c.JSON(status, gin.H{
		"status": "error",
		"error": gin.H{
			"code":    code,
			"message": message,
			"details": err.Error(),
		},
	})
}

func listVMs(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		vms, err := service.ListVMs(c.Request.Context())
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"status": "error",
				"error": gin.H{
					"code":    "LIST_VMS_FAILED",
					"message": "Failed to list virtual machines",
					"details": err.Error(),
				},
			})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data": gin.H{
				"vms":   vms,
				"count": len(vms),
			},
		})
	}
}

func getVM(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		vm, err := service.GetVM(c.Request.Context(), id)
		if err != nil {
			if strings.Contains(err.Error(), "not found") {
				c.JSON(http.StatusNotFound, gin.H{
					"status": "error",
					"error": gin.H{
						"code":    "VM_NOT_FOUND",
						"message": "Virtual machine not found",
						"details": err.Error(),
					},
				})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{
				"status": "error",
				"error": gin.H{
					"code":    "GET_VM_FAILED",
					"message": "Failed to get virtual machine",
					"details": err.Error(),
				},
			})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data":   vm,
		})
	}
}

func getVMEnhanced(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		vm, err := service.GetVMEnhanced(c.Request.Context(), c.Param("id"))
		if err != nil {
			if strings.Contains(err.Error(), "not found") {
				c.JSON(http.StatusNotFound, gin.H{
					"status": "error",
					"error": gin.H{
						"code":    "VM_NOT_FOUND",
						"message": "Virtual machine not found",
						"details": err.Error(),
					},
				})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{
				"status": "error",
				"error": gin.H{
					"code":    "GET_VM_FAILED",
					"message": "Failed to get virtual machine",
					"details": err.Error(),
				},
			})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data":   vm,
		})
	}
}

func createVM(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req libvirt.VMCreateRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"status": "error",
				"error": gin.H{
					"code":    "INVALID_REQUEST",
					"message": "Invalid VM creation request",
					"details": err.Error(),
				},
			})
			return
		}

		vm, err := service.CreateVM(c.Request.Context(), &req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"status": "error",
				"error": gin.H{
					"code":    "CREATE_VM_FAILED",
					"message": "Failed to create virtual machine",
					"details": err.Error(),
				},
			})
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"status": "success",
			"data": gin.H{
				"vm":      vm,
				"message": "Virtual machine created successfully",
			},
		})
	}
}

func updateVM(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var req libvirt.VMUpdateRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"status": "error",
				"error": gin.H{
					"code":    "INVALID_REQUEST",
					"message": "Invalid VM update request",
					"details": err.Error(),
				},
			})
			return
		}

		vm, err := service.UpdateVM(c.Request.Context(), id, &req)
		if err != nil {
			if strings.Contains(err.Error(), "not found") {
				c.JSON(http.StatusNotFound, gin.H{
					"status": "error",
					"error": gin.H{
						"code":    "VM_NOT_FOUND",
						"message": "Virtual machine not found",
						"details": err.Error(),
					},
				})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{
				"status": "error",
				"error": gin.H{
					"code":    "UPDATE_VM_FAILED",
					"message": "Failed to update virtual machine",
					"details": err.Error(),
				},
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data": gin.H{
				"vm":      vm,
				"message": "Virtual machine updated successfully",
			},
		})
	}
}

func deleteVM(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")

		// Check if we should remove disks too
		removeDisks := c.Query("remove_disks") == "true"

		if err := service.DeleteVM(c.Request.Context(), id, removeDisks); err != nil {
			msg := err.Error()

			if strings.Contains(msg, "not found") {
				sendComputeError(c, "VM_NOT_FOUND", "Virtual machine not found", err, http.StatusNotFound)
				return
			}

			if strings.Contains(msg, "shared volume in use") {
				sendComputeError(c, "VM_DISK_IN_USE", "One or more disks are still in use by other virtual machines", err, http.StatusConflict)
				return
			}

			// Optional: surface explicit VM_RUNNING conflicts if DeleteVM requires stopped VMs
			if strings.Contains(msg, "require VM to be stopped") || strings.Contains(msg, "VM is running") {
				sendComputeError(c, "VM_RUNNING", "Operation requires VM to be stopped", err, http.StatusConflict)
				return
			}

			sendComputeError(c, "DELETE_VM_FAILED", "Failed to delete virtual machine", err, http.StatusInternalServerError)
			return
		}

		// Successful delete returns 204 No Content per OpenAPI spec
		c.Status(http.StatusNoContent)
	}
}

func vmAction(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var req libvirt.VMActionRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"status": "error",
				"error": gin.H{
					"code":    "INVALID_REQUEST",
					"message": "Invalid VM action request",
					"details": err.Error(),
				},
			})
			return
		}

		err := service.VMAction(c.Request.Context(), id, req.Action, req.Force)
		if err != nil {
			if strings.Contains(err.Error(), "not found") {
				c.JSON(http.StatusNotFound, gin.H{
					"status": "error",
					"error": gin.H{
						"code":    "VM_NOT_FOUND",
						"message": "Virtual machine not found",
						"details": err.Error(),
					},
				})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{
				"status": "error",
				"error": gin.H{
					"code":    "VM_ACTION_FAILED",
					"message": "Failed to perform VM action",
					"details": err.Error(),
				},
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data": gin.H{
				"message": "VM action completed successfully",
				"action":  req.Action,
				"vm_id":   id,
			},
		})
	}
}

// Snapshot handlers

func setNetworkLinkState(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var req libvirt.NetworkLinkStateRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"status": "error",
				"error": gin.H{
					"code":    "INVALID_REQUEST",
					"message": "Invalid network link state request",
					"details": err.Error(),
				},
			})
			return
		}

		resp, err := service.SetNetworkLinkState(c.Request.Context(), id, &req)
		if err != nil {
			if strings.Contains(err.Error(), "not found") {
				c.JSON(http.StatusNotFound, gin.H{
					"status": "error",
					"error": gin.H{
						"code":    "NOT_FOUND",
						"message": err.Error(),
					},
				})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{
				"status": "error",
				"error": gin.H{
					"code":    "INTERNAL_ERROR",
					"message": "Failed to set network link state",
					"details": err.Error(),
				},
			})
			return
		}

		c.JSON(http.StatusOK, resp)
	}
}

func getNetworkLinkState(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		interfaceName := c.Param("interface-name")

		if interfaceName == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"status": "error",
				"error": gin.H{
					"code":    "INVALID_REQUEST",
					"message": "Interface name is required",
				},
			})
			return
		}

		resp, err := service.GetNetworkLinkState(c.Request.Context(), id, interfaceName)
		if err != nil {
			if strings.Contains(err.Error(), "not found") {
				c.JSON(http.StatusNotFound, gin.H{
					"status": "error",
					"error": gin.H{
						"code":    "NOT_FOUND",
						"message": err.Error(),
					},
				})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{
				"status": "error",
				"error": gin.H{
					"code":    "INTERNAL_ERROR",
					"message": "Failed to get network link state",
					"details": err.Error(),
				},
			})
			return
		}

		c.JSON(http.StatusOK, resp)
	}
}

func getSnapshotCapabilities(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		capabilities, err := service.GetSnapshotCapabilities(c.Request.Context(), id)
		if err != nil {
			msg := err.Error()
			if strings.Contains(msg, "domain not found") {
				sendComputeError(c, "VM_NOT_FOUND", "Virtual machine not found", err, http.StatusNotFound)
				return
			}
			sendComputeError(c, "SNAPSHOT_CAPABILITIES_FAILED", "Failed to get snapshot capabilities", err, http.StatusInternalServerError)
			return
		}

		// Map libvirt capabilities into the OpenAPI-ish schema expected by the frontend.
		diskFormats := make([]gin.H, 0, len(capabilities.Disks))
		for _, d := range capabilities.Disks {
			supportsInternal := false
			if dc, ok := capabilities.DiskCapabilities[d.Device]; ok {
				supportsInternal = dc.InternalSnapshots
			}
			diskFormats = append(diskFormats, gin.H{
				"name":              d.Device,
				"path":              d.Path,
				"format":            string(d.Format),
				"supports_internal": supportsInternal,
				"size_bytes":        d.Size,
			})
		}

		apiCaps := gin.H{
			"supports_snapshots": true,
			"supports_internal":  capabilities.OverallCapabilities.InternalSnapshots,
			"supports_external":  capabilities.OverallCapabilities.ExternalSnapshots,
			"supports_memory":    capabilities.OverallCapabilities.MemorySnapshots,
			"disk_formats":       diskFormats,
		}
		if len(capabilities.OverallCapabilities.Limitations) > 0 {
			apiCaps["warnings"] = capabilities.OverallCapabilities.Limitations
		}
		if len(capabilities.Recommendations) > 0 {
			apiCaps["recommendations"] = capabilities.Recommendations
		}

		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data": gin.H{
				"capabilities": apiCaps,
			},
		})
	}
}

func listSnapshots(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		snapshots, err := service.ListSnapshots(c.Request.Context(), id)
		if err != nil {
			if strings.Contains(err.Error(), "not found") {
				c.JSON(http.StatusNotFound, gin.H{
					"status": "error",
					"error": gin.H{
						"code":    "VM_NOT_FOUND",
						"message": "Virtual machine not found",
						"details": err.Error(),
					},
				})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{
				"status": "error",
				"error": gin.H{
					"code":    "LIST_SNAPSHOTS_FAILED",
					"message": "Failed to list VM snapshots",
					"details": err.Error(),
				},
			})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data": gin.H{
				"snapshots": snapshots,
				"count":     len(snapshots),
				"vm_id":     id,
			},
		})
	}
}

func createSnapshot(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")

		// Accept both the OpenAPI field names (include_memory/force_external)
		// and the legacy backend field names (memory/external).
		type createSnapshotRequest struct {
			Name          string `json:"name" binding:"required"`
			Description   string `json:"description,omitempty"`
			IncludeMemory *bool  `json:"include_memory,omitempty"`
			Memory        *bool  `json:"memory,omitempty"`
			Quiesce       *bool  `json:"quiesce,omitempty"`
			ForceExternal *bool  `json:"force_external,omitempty"`
			External      *bool  `json:"external,omitempty"`
		}

		var req createSnapshotRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			sendComputeError(c, "INVALID_REQUEST", "Invalid snapshot request", err, http.StatusBadRequest)
			return
		}

		memory := false
		if req.IncludeMemory != nil {
			memory = *req.IncludeMemory
		} else if req.Memory != nil {
			memory = *req.Memory
		}

		quiesce := false
		if req.Quiesce != nil {
			quiesce = *req.Quiesce
		}

		external := false
		if req.ForceExternal != nil {
			external = *req.ForceExternal
		} else if req.External != nil {
			external = *req.External
		}

		libReq := libvirt.VMSnapshotRequest{
			Name:        req.Name,
			Description: req.Description,
			Memory:      memory,
			Quiesce:     quiesce,
			External:    external,
		}

		snapshot, err := service.CreateSnapshotEnhanced(c.Request.Context(), id, &libReq)
		if err != nil {
			msg := err.Error()
			if strings.Contains(msg, "domain not found") {
				sendComputeError(c, "VM_NOT_FOUND", "Virtual machine not found", err, http.StatusNotFound)
				return
			}
			// Treat capability/format/state-related failures as a client error.
			if strings.Contains(msg, "not supported") || strings.Contains(msg, "limitations") || strings.Contains(msg, "unsupported") || strings.Contains(msg, "incompatible") {
				sendComputeError(c, "SNAPSHOT_NOT_SUPPORTED", "Snapshot request not supported for this VM", err, http.StatusBadRequest)
				return
			}
			sendComputeError(c, "CREATE_SNAPSHOT_FAILED", "Failed to create snapshot", err, http.StatusInternalServerError)
			return
		}

		data := gin.H{
			"snapshot": snapshot,
			"message":  "Snapshot created successfully",
		}
		if len(snapshot.Warnings) > 0 {
			data["warnings"] = snapshot.Warnings
		}

		c.JSON(http.StatusCreated, gin.H{
			"status": "success",
			"data":   data,
		})
	}
}

func revertSnapshot(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		snapshotName := c.Param("snapshot")

		if err := service.RevertSnapshot(c.Request.Context(), id, snapshotName); err != nil {
			msg := err.Error()
			if strings.Contains(msg, "domain not found") {
				sendComputeError(c, "VM_NOT_FOUND", "Virtual machine not found", err, http.StatusNotFound)
				return
			}
			if strings.Contains(msg, "snapshot not found") || strings.Contains(msg, "failed to find snapshot") {
				sendComputeError(c, "SNAPSHOT_NOT_FOUND", "Snapshot not found", err, http.StatusNotFound)
				return
			}
			// Default to internal error; specific conflict states can be mapped here if needed
			sendComputeError(c, "REVERT_SNAPSHOT_FAILED", "Failed to revert to snapshot", err, http.StatusInternalServerError)
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data": gin.H{
				"vm_name":       id,
				"snapshot_name": snapshotName,
				"reverted_at":   time.Now().UTC().Format(time.RFC3339),
				"message":       fmt.Sprintf("VM successfully reverted to snapshot '%s'", snapshotName),
			},
		})
	}
}

func deleteSnapshot(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		snapshotName := c.Param("snapshot")

		if err := service.DeleteSnapshot(c.Request.Context(), id, snapshotName); err != nil {
			msg := err.Error()
			if strings.Contains(msg, "domain not found") {
				sendComputeError(c, "VM_NOT_FOUND", "Virtual machine not found", err, http.StatusNotFound)
				return
			}
			if strings.Contains(msg, "snapshot not found") || strings.Contains(msg, "failed to find snapshot") {
				sendComputeError(c, "SNAPSHOT_NOT_FOUND", "Snapshot not found", err, http.StatusNotFound)
				return
			}
			sendComputeError(c, "DELETE_SNAPSHOT_FAILED", "Failed to delete snapshot", err, http.StatusInternalServerError)
			return
		}

		c.Status(http.StatusNoContent)
	}
}

func listBackups(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		backups, err := service.ListBackups(c.Request.Context(), id)
		if err != nil {
			msg := err.Error()
			if strings.Contains(msg, "domain not found") || strings.Contains(msg, "not found") {
				sendComputeError(c, "VM_NOT_FOUND", "Virtual machine not found", err, http.StatusNotFound)
				return
			}
			if strings.Contains(msg, "database is not configured") {
				sendComputeError(c, "BACKUPS_NOT_AVAILABLE", "Backups are not available (database not configured)", err, http.StatusInternalServerError)
				return
			}
			sendComputeError(c, "LIST_BACKUPS_FAILED", "Failed to list VM backups", err, http.StatusInternalServerError)
			return
		}

		apiBackups := make([]gin.H, 0, len(backups))
		for _, b := range backups {
			includeMemory := false
			if b.Metadata != nil {
				if v, ok := b.Metadata["include_memory"]; ok {
					includeMemory = strings.ToLower(strings.TrimSpace(v)) == "true"
				}
			}
			apiBackups = append(apiBackups, gin.H{
				"id":               b.ID,
				"backup_id":        b.ID,
				"vm_uuid":          b.VMUUID,
				"vm_name":          b.VMName,
				"type":             b.Type,
				"backup_type":      b.Type,
				"status":           b.Status,
				"destination_path": b.DestinationPath,
				"size_bytes":       b.SizeBytes,
				"compressed":       b.Compressed,
				"compression":      b.Compression,
				"encryption":       b.Encryption,
				"parent_backup_id": b.ParentBackupID,
				"started_at":       b.StartedAt,
				"completed_at":     b.CompletedAt,
				"retention_days":   b.Retention,
				"include_memory":   includeMemory,
				"error_message":    b.ErrorMessage,
				"metadata":         b.Metadata,
			})
		}

		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data": gin.H{
				"backups": apiBackups,
				"count":   len(apiBackups),
				"vm_id":   id,
			},
		})
	}
}

func listAllBackups(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		backups, err := service.ListAllBackups(c.Request.Context())
		if err != nil {
			msg := err.Error()
			if strings.Contains(msg, "database is not configured") {
				sendComputeError(c, "BACKUPS_NOT_AVAILABLE", "Backups are not available (database not configured)", err, http.StatusInternalServerError)
				return
			}
			sendComputeError(c, "LIST_BACKUPS_FAILED", "Failed to list VM backups", err, http.StatusInternalServerError)
			return
		}

		apiBackups := make([]gin.H, 0, len(backups))
		for _, b := range backups {
			includeMemory := false
			if b.Metadata != nil {
				if v, ok := b.Metadata["include_memory"]; ok {
					includeMemory = strings.ToLower(strings.TrimSpace(v)) == "true"
				}
			}
			apiBackups = append(apiBackups, gin.H{
				"id":               b.ID,
				"backup_id":        b.ID,
				"vm_uuid":          b.VMUUID,
				"vm_name":          b.VMName,
				"type":             b.Type,
				"backup_type":      b.Type,
				"status":           b.Status,
				"destination_path": b.DestinationPath,
				"size_bytes":       b.SizeBytes,
				"compressed":       b.Compressed,
				"compression":      b.Compression,
				"encryption":       b.Encryption,
				"parent_backup_id": b.ParentBackupID,
				"started_at":       b.StartedAt,
				"completed_at":     b.CompletedAt,
				"retention_days":   b.Retention,
				"include_memory":   includeMemory,
				"error_message":    b.ErrorMessage,
				"metadata":         b.Metadata,
			})
		}

		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data": gin.H{
				"backups": apiBackups,
				"count":   len(apiBackups),
			},
		})
	}
}

func createBackup(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")

		// Accept both OpenAPI request fields (backup_type) and legacy/internal fields (type).
		type createBackupRequest struct {
			BackupType      *string `json:"backup_type,omitempty"`
			Type            *string `json:"type,omitempty"`
			DestinationPath string  `json:"destination_path,omitempty"`
			Destination     string  `json:"destination,omitempty"`
			Compression     *string `json:"compression,omitempty"`
			Encryption      *string `json:"encryption,omitempty"`
			EncryptionKey   string  `json:"encryption_key,omitempty"`
			IncludeMemory   *bool   `json:"include_memory,omitempty"`
			RetentionDays   *int    `json:"retention_days,omitempty"`
			Description     string  `json:"description,omitempty"`
		}

		var req createBackupRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			sendComputeError(c, "INVALID_REQUEST", "Invalid backup request", err, http.StatusBadRequest)
			return
		}

		backupType := ""
		if req.BackupType != nil {
			backupType = strings.TrimSpace(*req.BackupType)
		} else if req.Type != nil {
			backupType = strings.TrimSpace(*req.Type)
		}
		if backupType == "" {
			sendComputeError(c, "INVALID_REQUEST", "Invalid backup request", fmt.Errorf("backup_type/type is required"), http.StatusBadRequest)
			return
		}

		dest := req.DestinationPath
		if dest == "" {
			dest = req.Destination
		}

		compression := "none"
		if req.Compression != nil && strings.TrimSpace(*req.Compression) != "" {
			compression = strings.TrimSpace(*req.Compression)
		}

		encryption := "none"
		if req.Encryption != nil && strings.TrimSpace(*req.Encryption) != "" {
			encryption = strings.TrimSpace(*req.Encryption)
		}
		encNorm := strings.ToLower(strings.TrimSpace(encryption))
		encNorm = strings.ReplaceAll(encNorm, "_", "-")
		switch encNorm {
		case "", "none":
			encryption = "none"
		case "aes-256", "aes256":
			encryption = "aes256"
		case "aes-128", "aes128":
			encryption = "aes128"
		default:
			// Keep as-is (best-effort)
			encryption = strings.ReplaceAll(encNorm, "-", "")
		}

		includeMemory := false
		if req.IncludeMemory != nil {
			includeMemory = *req.IncludeMemory
		}

		retentionDays := 0
		if req.RetentionDays != nil {
			retentionDays = *req.RetentionDays
		}

		libReq := libvirt.VMBackupRequest{
			Type:            libvirt.BackupType(backupType),
			DestinationPath: dest,
			Compression:     libvirt.BackupCompressionType(compression),
			Encryption:      libvirt.BackupEncryptionType(encryption),
			EncryptionKey:   req.EncryptionKey,
			Description:     req.Description,
			RetentionDays:   retentionDays,
			IncludeMemory:   includeMemory,
		}

		backup, err := service.CreateBackup(c.Request.Context(), id, &libReq)
		if err != nil {
			msg := err.Error()
			if strings.Contains(msg, "domain not found") || strings.Contains(msg, "not found") {
				sendComputeError(c, "VM_NOT_FOUND", "Virtual machine not found", err, http.StatusNotFound)
				return
			}
			sendComputeError(c, "CREATE_BACKUP_FAILED", "Failed to create backup", err, http.StatusInternalServerError)
			return
		}

		includeMemoryResp := libReq.IncludeMemory
		if backup.Metadata != nil {
			if v, ok := backup.Metadata["include_memory"]; ok {
				includeMemoryResp = strings.ToLower(strings.TrimSpace(v)) == "true"
			}
		}

		backupData := gin.H{
			"id":               backup.ID,
			"backup_id":        backup.ID,
			"vm_uuid":          backup.VMUUID,
			"vm_name":          backup.VMName,
			"type":             backup.Type,
			"backup_type":      backup.Type,
			"status":           backup.Status,
			"destination_path": backup.DestinationPath,
			"size_bytes":       backup.SizeBytes,
			"compressed":       backup.Compressed,
			"compression":      backup.Compression,
			"encryption":       backup.Encryption,
			"parent_backup_id": backup.ParentBackupID,
			"started_at":       backup.StartedAt,
			"completed_at":     backup.CompletedAt,
			"retention_days":   backup.Retention,
			"include_memory":   includeMemoryResp,
			"error_message":    backup.ErrorMessage,
			"metadata":         backup.Metadata,
		}

		c.JSON(http.StatusAccepted, gin.H{
			"status": "success",
			"data": gin.H{
				"backup":  backupData,
				"message": "Backup initiated successfully",
			},
		})
	}
}

func restoreBackup(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req libvirt.VMRestoreRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			sendComputeError(c, "INVALID_REQUEST", "Invalid restore request", err, http.StatusBadRequest)
			return
		}

		vm, err := service.RestoreBackup(c.Request.Context(), &req)
		if err != nil {
			msg := err.Error()

			if strings.Contains(msg, "backup not found") {
				sendComputeError(c, "BACKUP_NOT_FOUND", "Backup not found", err, http.StatusNotFound)
				return
			}

			if strings.Contains(msg, "already exists") {
				sendComputeError(c, "VM_ALREADY_EXISTS", "Virtual machine already exists", err, http.StatusConflict)
				return
			}

			sendComputeError(c, "RESTORE_BACKUP_FAILED", "Failed to restore backup", err, http.StatusInternalServerError)
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data": gin.H{
				"vm":      vm,
				"message": "Virtual machine restored from backup",
			},
		})
	}
}

func deleteBackup(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		backupID := c.Param("backup_id")

		if err := service.DeleteBackup(c.Request.Context(), backupID); err != nil {
			msg := err.Error()

			if strings.Contains(msg, "backup not found") {
				sendComputeError(c, "BACKUP_NOT_FOUND", "Backup not found", err, http.StatusNotFound)
				return
			}

			sendComputeError(c, "DELETE_BACKUP_FAILED", "Failed to delete backup", err, http.StatusInternalServerError)
			return
		}

		c.Status(http.StatusNoContent)
	}
}

func downloadBackup(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		backupID := c.Param("backup_id")

		backup, err := service.GetBackupByID(c.Request.Context(), backupID)
		if err != nil {
			if strings.Contains(err.Error(), "not configured") {
				sendComputeError(c, "BACKUPS_NOT_AVAILABLE", "Backups are not available (database not configured)", err, http.StatusInternalServerError)
				return
			}
			sendComputeError(c, "BACKUP_NOT_FOUND", "Backup not found", err, http.StatusNotFound)
			return
		}

		primaryPath := filepath.Join(backup.DestinationPath, fmt.Sprintf("%s-%s.qcow2", backup.VMName, backup.ID))
		altPath := filepath.Join(backup.DestinationPath, backup.ID+".qcow2")

		filePath := ""
		if stat, err := os.Stat(primaryPath); err == nil && !stat.IsDir() {
			filePath = primaryPath
		} else if stat, err := os.Stat(altPath); err == nil && !stat.IsDir() {
			filePath = altPath
		}

		if filePath == "" {
			sendComputeError(c, "BACKUP_FILE_NOT_FOUND", "Backup file not found on disk", fmt.Errorf("missing backup file"), http.StatusNotFound)
			return
		}

		c.FileAttachment(filePath, fmt.Sprintf("%s-%s.qcow2", backup.VMName, backup.ID))
	}
}

func importBackup(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req libvirt.VMBackupImportRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			sendComputeError(c, "INVALID_REQUEST", "Invalid import backup request", err, http.StatusBadRequest)
			return
		}

		backup, err := service.ImportBackup(c.Request.Context(), &req)
		if err != nil {
			msg := err.Error()
			if strings.Contains(msg, "database is not configured") {
				sendComputeError(c, "BACKUPS_NOT_AVAILABLE", "Backups are not available (database not configured)", err, http.StatusInternalServerError)
				return
			}
			if strings.Contains(msg, "backup file not accessible") || strings.Contains(msg, "must be a file") {
				sendComputeError(c, "BACKUP_FILE_INVALID", "Backup file not accessible", err, http.StatusBadRequest)
				return
			}
			sendComputeError(c, "IMPORT_BACKUP_FAILED", "Failed to import backup", err, http.StatusInternalServerError)
			return
		}

		includeMemory := false
		if backup.Metadata != nil {
			if v, ok := backup.Metadata["include_memory"]; ok {
				includeMemory = strings.ToLower(strings.TrimSpace(v)) == "true"
			}
		}

		c.JSON(http.StatusCreated, gin.H{
			"status": "success",
			"data": gin.H{
				"backup": gin.H{
					"id":               backup.ID,
					"backup_id":        backup.ID,
					"vm_uuid":          backup.VMUUID,
					"vm_name":          backup.VMName,
					"type":             backup.Type,
					"backup_type":      backup.Type,
					"status":           backup.Status,
					"destination_path": backup.DestinationPath,
					"size_bytes":       backup.SizeBytes,
					"compressed":       backup.Compressed,
					"compression":      backup.Compression,
					"encryption":       backup.Encryption,
					"parent_backup_id": backup.ParentBackupID,
					"started_at":       backup.StartedAt,
					"completed_at":     backup.CompletedAt,
					"retention_days":   backup.Retention,
					"include_memory":   includeMemory,
					"metadata":         backup.Metadata,
				},
				"message": "Backup imported successfully",
			},
		})
	}
}

func cloneVM(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		sourceID := strings.TrimSpace(c.Param("id"))

		var req libvirt.VMCloneRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"status": "error",
				"error": gin.H{
					"code":    "INVALID_REQUEST",
					"message": "Invalid VM clone request",
					"details": err.Error(),
				},
			})
			return
		}

		if sourceID == "" {
			sourceID = strings.TrimSpace(req.SourceVM)
		}
		if sourceID == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"status": "error",
				"error": gin.H{
					"code":    "INVALID_REQUEST",
					"message": "Invalid VM clone request",
					"details": "source_vm is required (or provide source VM id in the URL)",
				},
			})
			return
		}

		vm, err := service.CloneVM(c.Request.Context(), sourceID, &req)
		if err != nil {
			msg := err.Error()

			// Not found
			if strings.Contains(msg, "source VM not found") || strings.Contains(msg, "not found") {
				sendComputeError(c, "VM_NOT_FOUND", "Source virtual machine not found", err, http.StatusNotFound)
				return
			}

			// Duplicate
			if strings.Contains(msg, "already exists") || strings.Contains(msg, "exists") {
				sendComputeError(c, "VM_ALREADY_EXISTS", "Virtual machine with the requested name already exists", err, http.StatusConflict)
				return
			}

			// Validation / unsupported
			if strings.Contains(msg, "invalid") || strings.Contains(msg, "required") || strings.Contains(msg, "not supported") {
				sendComputeError(c, "INVALID_REQUEST", "Invalid VM clone request", err, http.StatusBadRequest)
				return
			}

			sendComputeError(c, "CLONE_VM_FAILED", "Failed to clone virtual machine", err, http.StatusInternalServerError)
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"status": "success",
			"data":   vm,
		})
	}
}

// Metrics handlers

func getVMMetrics(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		metrics, err := service.GetVMMetrics(c.Request.Context(), id)

		if err != nil {
			if strings.Contains(err.Error(), "not found") {
				c.JSON(http.StatusNotFound, gin.H{
					"status": "error",
					"error": gin.H{
						"code":    "VM_NOT_FOUND",
						"message": "Virtual machine not found",
						"details": err.Error(),
					},
				})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{
				"status": "error",
				"error": gin.H{
					"code":    "GET_VM_METRICS_FAILED",
					"message": "Failed to get virtual machine metrics",
					"details": err.Error(),
				},
			})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data":   metrics,
		})
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

func listTemplates(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		if service.TemplateService == nil {
			sendComputeError(c, "TEMPLATE_SERVICE_UNAVAILABLE", "Template service unavailable", fmt.Errorf("template service not initialized"), http.StatusServiceUnavailable)
			return
		}

		templates, err := service.TemplateService.ListTemplates(c.Request.Context())
		if err != nil {
			sendComputeError(c, "LIST_TEMPLATES_FAILED", "Failed to list VM templates", err, http.StatusInternalServerError)
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data": gin.H{
				"templates": templates,
				"count":     len(templates),
			},
		})
	}
}

func getTemplate(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		if service.TemplateService == nil {
			sendComputeError(c, "TEMPLATE_SERVICE_UNAVAILABLE", "Template service unavailable", fmt.Errorf("template service not initialized"), http.StatusServiceUnavailable)
			return
		}

		idStr := c.Param("id")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			sendComputeError(c, "INVALID_TEMPLATE_ID", "Invalid template ID", err, http.StatusBadRequest)
			return
		}

		template, err := service.TemplateService.GetTemplate(c.Request.Context(), id)
		if err != nil {
			switch {
			case errors.Is(err, libvirt.ErrTemplateNotFound):
				sendComputeError(c, "TEMPLATE_NOT_FOUND", "Template not found", err, http.StatusNotFound)
			default:
				sendComputeError(c, "GET_TEMPLATE_FAILED", "Failed to get template", err, http.StatusInternalServerError)
			}
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data":   template,
		})
	}
}

func createTemplate(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		if service.TemplateService == nil {
			sendComputeError(c, "TEMPLATE_SERVICE_UNAVAILABLE", "Template service unavailable", fmt.Errorf("template service not initialized"), http.StatusServiceUnavailable)
			return
		}

		var req libvirt.VMTemplateCreateRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			sendComputeError(c, "INVALID_REQUEST", "Invalid template create request", err, http.StatusBadRequest)
			return
		}

		template, err := service.TemplateService.CreateTemplate(c.Request.Context(), &req)
		if err != nil {
			switch {
			case errors.Is(err, libvirt.ErrTemplateAlreadyExists):
				sendComputeError(c, "TEMPLATE_ALREADY_EXISTS", "Template already exists", err, http.StatusConflict)
			case errors.Is(err, libvirt.ErrTemplateValidation):
				sendComputeError(c, "TEMPLATE_VALIDATION_FAILED", "Invalid template", err, http.StatusBadRequest)
			default:
				sendComputeError(c, "CREATE_TEMPLATE_FAILED", "Failed to create template", err, http.StatusInternalServerError)
			}
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"status": "success",
			"data":   template,
		})
	}
}

func updateTemplate(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		if service.TemplateService == nil {
			sendComputeError(c, "TEMPLATE_SERVICE_UNAVAILABLE", "Template service unavailable", fmt.Errorf("template service not initialized"), http.StatusServiceUnavailable)
			return
		}

		idStr := c.Param("id")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			sendComputeError(c, "INVALID_TEMPLATE_ID", "Invalid template ID", err, http.StatusBadRequest)
			return
		}

		var req libvirt.VMTemplateUpdateRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			sendComputeError(c, "INVALID_REQUEST", "Invalid template update request", err, http.StatusBadRequest)
			return
		}

		template, err := service.TemplateService.UpdateTemplate(c.Request.Context(), id, &req)
		if err != nil {
			switch {
			case errors.Is(err, libvirt.ErrTemplateNotFound):
				sendComputeError(c, "TEMPLATE_NOT_FOUND", "Template not found", err, http.StatusNotFound)
			case errors.Is(err, libvirt.ErrTemplateValidation):
				sendComputeError(c, "TEMPLATE_VALIDATION_FAILED", "Invalid template", err, http.StatusBadRequest)
			default:
				sendComputeError(c, "UPDATE_TEMPLATE_FAILED", "Failed to update template", err, http.StatusInternalServerError)
			}
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data":   template,
		})
	}
}

func deleteTemplate(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		if service.TemplateService == nil {
			sendComputeError(c, "TEMPLATE_SERVICE_UNAVAILABLE", "Template service unavailable", fmt.Errorf("template service not initialized"), http.StatusServiceUnavailable)
			return
		}

		idStr := c.Param("id")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			sendComputeError(c, "INVALID_TEMPLATE_ID", "Invalid template ID", err, http.StatusBadRequest)
			return
		}

		err = service.TemplateService.DeleteTemplate(c.Request.Context(), id)
		if err != nil {
			switch {
			case errors.Is(err, libvirt.ErrTemplateNotFound):
				sendComputeError(c, "TEMPLATE_NOT_FOUND", "Template not found", err, http.StatusNotFound)
			default:
				sendComputeError(c, "DELETE_TEMPLATE_FAILED", "Failed to delete template", err, http.StatusInternalServerError)
			}
			return
		}

		c.Status(http.StatusNoContent)
	}
}

func createTemplateFromVM(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		if service.TemplateService == nil {
			sendComputeError(c, "TEMPLATE_SERVICE_UNAVAILABLE", "Template service unavailable", fmt.Errorf("template service not initialized"), http.StatusServiceUnavailable)
			return
		}

		vmID := c.Param("id")

		var body struct {
			Name        string `json:"name" binding:"required"`
			Description string `json:"description,omitempty"`
		}
		if err := c.ShouldBindJSON(&body); err != nil {
			sendComputeError(c, "INVALID_REQUEST", "Invalid template create-from-VM request", err, http.StatusBadRequest)
			return
		}

		vm, err := service.GetVMEnhanced(c.Request.Context(), vmID)
		if err != nil {
			// Maintain existing error style: treat lookup issues as not-found.
			if strings.Contains(err.Error(), "not found") {
				sendComputeError(c, "VM_NOT_FOUND", "Virtual machine not found", err, http.StatusNotFound)
				return
			}
			sendComputeError(c, "GET_VM_FAILED", "Failed to get virtual machine", err, http.StatusInternalServerError)
			return
		}

		// Pick a primary disk for sizing and format.
		var diskSizeGB uint64
		diskFormat := ""
		if vm.Storage != nil && len(vm.Storage.Disks) > 0 {
			bestIdx := -1
			bestBootOrder := 0
			for i, d := range vm.Storage.Disks {
				if d.Device != "disk" {
					continue
				}
				// Prefer the lowest (best) boot order when present.
				if d.BootOrder > 0 && (bestIdx == -1 || d.BootOrder < bestBootOrder || bestBootOrder == 0) {
					bestIdx = i
					bestBootOrder = d.BootOrder
					continue
				}
				// Fallback: first disk device.
				if bestIdx == -1 {
					bestIdx = i
				}
			}
			if bestIdx >= 0 {
				d := vm.Storage.Disks[bestIdx]
				if d.Size > 0 {
					diskSizeGB = d.Size
				} else if d.Capacity > 0 {
					// Round up bytes to GiB.
					diskSizeGB = (d.Capacity + (1 << 30) - 1) / (1 << 30)
				}
				diskFormat = d.Format
			}
		}

		if diskSizeGB == 0 {
			sendComputeError(c, "INVALID_VM_DISK", "Failed to determine VM disk size for template", fmt.Errorf("vm has no disk size information"), http.StatusBadRequest)
			return
		}
		if diskFormat == "" {
			diskFormat = "qcow2"
		}

		osType := vm.OSType
		if osType == "" {
			osType = "other"
		}

		networkModel := "virtio"
		if len(vm.Networks) > 0 && vm.Networks[0].Model != "" {
			networkModel = vm.Networks[0].Model
		}

		graphicsType := "vnc"
		if len(vm.Graphics) > 0 && vm.Graphics[0].Type != "" {
			graphicsType = vm.Graphics[0].Type
		}

		cloudInit := vm.CloudInit != nil
		defaultUser := ""
		if vm.CloudInit != nil {
			for _, u := range vm.CloudInit.Users {
				if u.Name != "" {
					defaultUser = u.Name
					break
				}
			}
		}

		createReq := &libvirt.VMTemplateCreateRequest{
			Name:              body.Name,
			Description:       body.Description,
			OSType:            osType,
			OSVariant:         vm.OSVariant,
			MinMemory:         vm.Memory,
			RecommendedMemory: vm.Memory,
			MinVCPUs:          vm.VCPUs,
			RecommendedVCPUs:  vm.VCPUs,
			MinDisk:           diskSizeGB,
			RecommendedDisk:   diskSizeGB,
			DiskFormat:        diskFormat,
			NetworkModel:      networkModel,
			GraphicsType:      graphicsType,
			CloudInit:         cloudInit,
			UEFIBoot:          vm.UEFI,
			SecureBoot:        vm.SecureBoot,
			TPM:               vm.TPM,
			DefaultUser:       defaultUser,
			Metadata: map[string]string{
				"source_vm_uuid": vm.UUID,
				"source_vm_name": vm.Name,
			},
		}

		template, err := service.TemplateService.CreateTemplate(c.Request.Context(), createReq)
		if err != nil {
			switch {
			case errors.Is(err, libvirt.ErrTemplateAlreadyExists):
				sendComputeError(c, "TEMPLATE_ALREADY_EXISTS", "Template already exists", err, http.StatusConflict)
			case errors.Is(err, libvirt.ErrTemplateValidation):
				sendComputeError(c, "TEMPLATE_VALIDATION_FAILED", "Invalid template", err, http.StatusBadRequest)
			default:
				sendComputeError(c, "CREATE_TEMPLATE_FAILED", "Failed to create template", err, http.StatusInternalServerError)
			}
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"status": "success",
			"data":   template,
		})
	}
}

func createVMFromTemplate(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		if service.TemplateService == nil {
			sendComputeError(c, "TEMPLATE_SERVICE_UNAVAILABLE", "Template service unavailable", fmt.Errorf("template service not initialized"), http.StatusServiceUnavailable)
			return
		}

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
			sendComputeError(c, "INVALID_REQUEST", "Invalid VM creation from template request", err, http.StatusBadRequest)
			return
		}

		// Get the template
		template, err := service.TemplateService.GetTemplate(c.Request.Context(), req.TemplateID)
		if err != nil {
			switch {
			case errors.Is(err, libvirt.ErrTemplateNotFound):
				sendComputeError(c, "TEMPLATE_NOT_FOUND", "Template not found", err, http.StatusNotFound)
			default:
				sendComputeError(c, "GET_TEMPLATE_FAILED", "Failed to get template", err, http.StatusInternalServerError)
			}
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
			sendComputeError(c, "APPLY_TEMPLATE_FAILED", "Failed to apply template to VM request", err, http.StatusBadRequest)
			return
		}

		// Create the VM with the composed request
		vm, err := service.CreateVM(c.Request.Context(), createReq)
		if err != nil {
			sendComputeError(c, "CREATE_VM_FAILED", "Failed to create virtual machine from template", err, http.StatusInternalServerError)
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"status": "success",
			"data": gin.H{
				"vm":      vm,
				"message": "Virtual machine created successfully from template",
			},
		})
	}
}

// Storage handlers

// sendStorageError sends a consistent error response for storage operations
func sendStorageError(c *gin.Context, code string, message string, err error, status int) {
	c.JSON(status, gin.H{
		"status": "error",
		"error": gin.H{
			"code":    code,
			"message": message,
			"details": err.Error(),
		},
	})
}

func listStoragePools(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get query parameters for filtering and pagination
		state := c.DefaultQuery("state", "all") // active, inactive, all
		poolType := c.Query("type")             // dir, logical, disk, etc.
		page := c.DefaultQuery("page", "1")
		pageSize := c.DefaultQuery("page_size", "50")

		// Convert pagination params
		pageNum, err := strconv.Atoi(page)
		if err != nil || pageNum < 1 {
			pageNum = 1
		}
		pageSizeNum, err := strconv.Atoi(pageSize)
		if err != nil || pageSizeNum < 1 {
			pageSizeNum = 50
		}
		if pageSizeNum > 100 {
			pageSizeNum = 100
		}

		// List all pools
		pools, err := service.ListStoragePools(c.Request.Context())
		if err != nil {
			sendStorageError(c, "LIST_POOLS_FAILED", "Failed to list storage pools", err, http.StatusInternalServerError)
			return
		}

		// Filter by state and type
		var filteredPools []libvirt.StoragePool
		for _, pool := range pools {
			// State filter
			if state != "all" {
				if (state == "active" && pool.State != "active") || (state == "inactive" && pool.State == "active") {
					continue
				}
			}
			// Type filter
			if poolType != "" && pool.Type != poolType {
				continue
			}
			filteredPools = append(filteredPools, pool)
		}

		// Pagination
		total := len(filteredPools)
		totalPages := (total + pageSizeNum - 1) / pageSizeNum
		startIdx := (pageNum - 1) * pageSizeNum
		endIdx := startIdx + pageSizeNum

		if startIdx >= total {
			filteredPools = []libvirt.StoragePool{}
		} else {
			if endIdx > total {
				endIdx = total
			}
			filteredPools = filteredPools[startIdx:endIdx]
		}

		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data": gin.H{
				"pools":       filteredPools,
				"total":       total,
				"page":        pageNum,
				"page_size":   pageSizeNum,
				"total_pages": totalPages,
			},
		})
	}
}

func createStoragePool(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req libvirt.StoragePoolCreateRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			sendStorageError(c, "INVALID_REQUEST", "Invalid storage pool create request", err, http.StatusBadRequest)
			return
		}

		pool, err := service.CreateStoragePool(c.Request.Context(), &req)
		if err != nil {
			sendStorageError(c, "CREATE_POOL_FAILED", "Failed to create storage pool", err, http.StatusInternalServerError)
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"status": "success",
			"data":   pool,
		})
	}
}

func getStoragePool(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		name := c.Param("name")
		pool, err := service.GetStoragePool(c.Request.Context(), name)
		if err != nil {
			msg := err.Error()

			// Pool not found
			if strings.Contains(msg, "not found") {
				sendStorageError(c, "POOL_NOT_FOUND", "Storage pool not found", err, http.StatusNotFound)
				return
			}

			// Generic failure
			sendStorageError(c, "GET_POOL_FAILED", "Failed to get storage pool", err, http.StatusInternalServerError)
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data":   pool,
		})
	}
}

func deleteStoragePool(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		name := c.Param("name")
		deleteVolumes := c.Query("delete_volumes") == "true"

		err := service.DeleteStoragePool(c.Request.Context(), name, deleteVolumes)
		if err != nil {
			msg := err.Error()

			// Pool contains volumes that are in use by VMs
			if strings.Contains(msg, "in use by VM(s)") {
				sendStorageError(c, "POOL_NOT_EMPTY", "Cannot delete storage pool because one or more volumes are attached to virtual machines", err, http.StatusConflict)
				return
			}

			// Pool contains volumes and force flag not provided
			if !deleteVolumes && (strings.Contains(msg, "volume(s)") || strings.Contains(msg, "contains")) {
				sendStorageError(c, "POOL_NOT_EMPTY", "Cannot delete storage pool with existing volumes", err, http.StatusConflict)
				return
			}

			// Pool not found
			if strings.Contains(msg, "not found") {
				sendStorageError(c, "POOL_NOT_FOUND", "Storage pool not found", err, http.StatusNotFound)
				return
			}

			// Other errors
			sendStorageError(c, "DELETE_POOL_FAILED", "Failed to delete storage pool", err, http.StatusInternalServerError)
			return
		}

		c.JSON(http.StatusNoContent, nil)
	}
}

func updateStoragePool(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		name := c.Param("name")
		var req libvirt.StoragePoolUpdateRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			sendStorageError(c, "INVALID_REQUEST", "Invalid request payload", err, http.StatusBadRequest)
			return
		}
		// Validate that at least one field is being updated
		if req.Autostart == nil {
			sendStorageError(c, "INVALID_REQUEST", "No fields to update. Provide 'autostart' to change the autostart setting.", nil, http.StatusBadRequest)
			return
		}

		pool, err := service.UpdateStoragePool(c.Request.Context(), name, &req)
		if err != nil {
			sendStorageError(c, "UPDATE_POOL_FAILED", "Failed to update storage pool", err, http.StatusInternalServerError)
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data":   pool,
		})
	}
}

func startStoragePool(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		name := c.Param("name")
		err := service.StartStoragePool(c.Request.Context(), name)
		if err != nil {
			sendStorageError(c, "START_POOL_FAILED", "Failed to start storage pool", err, http.StatusInternalServerError)
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"status":  "success",
			"message": "Storage pool started successfully",
		})
	}
}

func stopStoragePool(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		name := c.Param("name")
		err := service.StopStoragePool(c.Request.Context(), name)
		if err != nil {
			sendStorageError(c, "STOP_POOL_FAILED", "Failed to stop storage pool", err, http.StatusInternalServerError)
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"status":  "success",
			"message": "Storage pool stopped successfully",
		})
	}
}

func refreshStoragePool(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		name := c.Param("name")
		err := service.RefreshStoragePool(c.Request.Context(), name)
		if err != nil {
			sendStorageError(c, "REFRESH_POOL_FAILED", "Failed to refresh storage pool", err, http.StatusInternalServerError)
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"status":  "success",
			"message": "Storage pool refreshed successfully",
		})
	}
}

func getStoragePoolCapacity(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		name := c.Param("name")
		capacity, err := service.GetPoolCapacity(c.Request.Context(), name)
		if err != nil {
			sendStorageError(c, "GET_CAPACITY_FAILED", "Failed to get storage pool capacity", err, http.StatusInternalServerError)
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data":   capacity,
		})
	}
}

// listAllVolumes returns all volumes across all storage pools
func listAllVolumes(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		volumes, err := service.ListAllVolumes(c.Request.Context())
		if err != nil {
			sendStorageError(c, "LIST_ALL_VOLUMES_FAILED", "Failed to list storage volumes", err, http.StatusInternalServerError)
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data":   volumes,
		})
	}
}
func listVolumesInPool(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		poolName := c.Param("name")
		volumes, err := service.ListVolumes(c.Request.Context(), poolName)
		if err != nil {
			msg := err.Error()

			// Pool not found -> 404
			if strings.Contains(msg, "storage pool not found") {
				sendStorageError(c, "POOL_NOT_FOUND", "Storage pool not found", err, http.StatusNotFound)
				return
			}

			// Generic failure -> 500
			sendStorageError(c, "LIST_VOLUMES_FAILED", "Failed to list storage volumes", err, http.StatusInternalServerError)
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data": gin.H{
				"volumes": volumes,
				"count":   len(volumes),
			},
		})
	}
}

func createVolumeInPool(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req libvirt.VolumeCreateRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			sendStorageError(c, "INVALID_VOLUME_REQUEST", "Invalid volume create request", err, http.StatusBadRequest)
			return
		}

		req.PoolName = c.Param("name")
		volume, err := service.CreateVolume(c.Request.Context(), &req)
		if err != nil {
			msg := err.Error()

			// Pool not found
			if strings.Contains(msg, "storage pool not found") {
				sendStorageError(c, "POOL_NOT_FOUND", "Storage pool not found", err, http.StatusNotFound)
				return
			}

			// Validation / user errors
			if strings.Contains(msg, "invalid volume name") ||
				strings.Contains(msg, "volume capacity must") ||
				strings.Contains(msg, "invalid format") ||
				strings.Contains(msg, "insufficient space") {
				sendStorageError(c, "INVALID_VOLUME_REQUEST", "Invalid volume create request", err, http.StatusBadRequest)
				return
			}

			// Duplicate name
			if strings.Contains(msg, "already exists in pool") {
				sendStorageError(c, "VOLUME_ALREADY_EXISTS", "Volume with the same name already exists in the pool", err, http.StatusConflict)
				return
			}

			// Generic failure
			sendStorageError(c, "CREATE_VOLUME_FAILED", "Failed to create storage volume", err, http.StatusInternalServerError)
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"status": "success",
			"data":   volume,
		})
	}
}

func getVolume(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		poolName := c.Param("name")
		volName := c.Param("vol_name")
		volume, err := service.GetVolume(c.Request.Context(), poolName, volName)
		if err != nil {
			msg := err.Error()

			// Not found errors
			if strings.Contains(msg, "storage pool not found") || strings.Contains(msg, "volume not found") {
				sendStorageError(c, "VOLUME_NOT_FOUND", "Storage volume not found", err, http.StatusNotFound)
				return
			}

			// Generic failure
			sendStorageError(c, "GET_VOLUME_FAILED", "Failed to get storage volume", err, http.StatusInternalServerError)
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data": gin.H{
				"volume": volume,
			},
		})
	}
}

func deleteVolume(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		poolName := c.Param("name")
		volName := c.Param("vol_name")
		force := c.Query("force") == "true"

		err := service.DeleteVolume(c.Request.Context(), poolName, volName, force)
		if err != nil {
			msg := err.Error()

			// Volume in use -> 409 Conflict
			if strings.Contains(msg, "in use") {
				sendStorageError(c, "VOLUME_IN_USE", "Cannot delete volume that is in use by one or more VMs", err, http.StatusConflict)
				return
			}

			// Not found errors
			if strings.Contains(msg, "storage pool not found") || strings.Contains(msg, "volume not found") {
				sendStorageError(c, "VOLUME_NOT_FOUND", "Storage volume not found", err, http.StatusNotFound)
				return
			}

			// Generic failure
			sendStorageError(c, "DELETE_VOLUME_FAILED", "Failed to delete storage volume", err, http.StatusInternalServerError)
			return
		}

		c.JSON(http.StatusNoContent, nil)
	}
}

func resizeVolumeInPool(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		poolName := c.Param("name")
		volName := c.Param("vol_name")

		var req libvirt.VolumeResizeRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			sendStorageError(c, "INVALID_VOLUME_REQUEST", "Invalid volume resize request", err, http.StatusBadRequest)
			return
		}

		volume, err := service.ResizeVolume(c.Request.Context(), poolName, volName, req.Capacity)
		if err != nil {
			msg := err.Error()

			// Not found errors
			if strings.Contains(msg, "storage pool not found") || strings.Contains(msg, "volume not found") {
				sendStorageError(c, "VOLUME_NOT_FOUND", "Storage volume not found", err, http.StatusNotFound)
				return
			}

			// Validation / user errors
			if strings.Contains(msg, "new capacity must") {
				sendStorageError(c, "INVALID_VOLUME_REQUEST", "Invalid volume resize request", err, http.StatusBadRequest)
				return
			}

			// Generic failure
			sendStorageError(c, "RESIZE_VOLUME_FAILED", "Failed to resize storage volume", err, http.StatusInternalServerError)
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data":   volume,
		})
	}
}

func cloneVolumeInPool(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		poolName := c.Param("name")
		volName := c.Param("vol_name")

		var req libvirt.VolumeCloneRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			sendStorageError(c, "INVALID_VOLUME_REQUEST", "Invalid volume clone request", err, http.StatusBadRequest)
			return
		}

		cloned, err := service.CloneVolume(c.Request.Context(), poolName, volName, &req)
		if err != nil {
			msg := err.Error()

			// Source/target pool or volume not found
			if strings.Contains(msg, "source storage pool not found") ||
				strings.Contains(msg, "source volume not found") ||
				strings.Contains(msg, "target storage pool not found") {
				sendStorageError(c, "VOLUME_NOT_FOUND", "Source or target resource not found", err, http.StatusNotFound)
				return
			}

			// Validation / user errors
			if strings.Contains(msg, "invalid volume name") {
				sendStorageError(c, "INVALID_VOLUME_REQUEST", "Invalid volume clone request", err, http.StatusBadRequest)
				return
			}

			// Duplicate name
			if strings.Contains(msg, "already exists in pool") {
				sendStorageError(c, "VOLUME_ALREADY_EXISTS", "Volume with the same name already exists in the target pool", err, http.StatusConflict)
				return
			}

			// Generic failure
			sendStorageError(c, "CLONE_VOLUME_FAILED", "Failed to clone storage volume", err, http.StatusInternalServerError)
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"status": "success",
			"data":   cloned,
		})
	}
}

// Network handlers
func listNetworks(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		networks, err := service.ListNetworks(c.Request.Context())
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"status": "error",
				"error": gin.H{
					"code":    "LIST_NETWORKS_FAILED",
					"message": "Failed to list virtual networks",
					"details": err.Error(),
				},
			})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data": gin.H{
				"networks": networks,
				"count":    len(networks),
			},
		})
	}
}

func createNetwork(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req libvirt.NetworkCreateRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"status": "error",
				"error": gin.H{
					"code":    "INVALID_NETWORK_REQUEST",
					"message": "Invalid network create request",
					"details": err.Error(),
				},
			})
			return
		}

		network, err := service.CreateNetwork(c.Request.Context(), &req)
		// Basic validation: NAT/route networks require an IP range (libvirt will reject forward mode without it).
		if req.Mode == "nat" || req.Mode == "route" {
			if req.IPRange == nil || strings.TrimSpace(req.IPRange.Address) == "" || strings.TrimSpace(req.IPRange.Netmask) == "" {
				c.JSON(http.StatusBadRequest, gin.H{
					"status": "error",
					"error": gin.H{
						"code":    "INVALID_NETWORK_REQUEST",
						"message": "Invalid network create request",
						"details": "ip_range.address and ip_range.netmask are required for nat/route networks",
					},
				})
				return
			}
		}

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"status": "error",
				"error": gin.H{
					"code":    "CREATE_NETWORK_FAILED",
					"message": "Failed to create virtual network",
					"details": err.Error(),
				},
			})
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"status": "success",
			"data": gin.H{
				"network": network,
				"message": "Virtual network created successfully",
			},
		})
	}
}

func getNetwork(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		name := c.Param("name")
		network, err := service.GetNetwork(c.Request.Context(), name)

		if err != nil {
			if strings.Contains(err.Error(), "not found") {
				c.JSON(http.StatusNotFound, gin.H{
					"status": "error",
					"error": gin.H{
						"code":    "NETWORK_NOT_FOUND",
						"message": "Virtual network not found",
						"details": err.Error(),
					},
				})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{
				"status": "error",
				"error": gin.H{
					"code":    "GET_NETWORK_FAILED",
					"message": "Failed to get virtual network",
					"details": err.Error(),
				},
			})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data":   network,
		})
	}
}

func updateNetwork(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		name := c.Param("name")
		var req libvirt.NetworkUpdateRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"status": "error",
				"error": gin.H{
					"code":    "INVALID_REQUEST",
					"message": "Invalid network update request",
					"details": err.Error(),
				},
			})
			return
		}

		network, err := service.UpdateNetwork(c.Request.Context(), name, &req)
		// Basic validation: NAT/route networks require an IP range.
		if req.Mode != nil && (*req.Mode == "nat" || *req.Mode == "route") {
			if req.IPRange == nil || strings.TrimSpace(req.IPRange.Address) == "" || strings.TrimSpace(req.IPRange.Netmask) == "" {
				c.JSON(http.StatusBadRequest, gin.H{
					"status": "error",
					"error": gin.H{
						"code":    "INVALID_REQUEST",
						"message": "Invalid network update request",
						"details": "ip_range.address and ip_range.netmask are required for nat/route networks",
					},
				})
				return
			}
		}

		if err != nil {
			if strings.Contains(err.Error(), "not found") {
				c.JSON(http.StatusNotFound, gin.H{
					"status": "error",
					"error": gin.H{
						"code":    "NETWORK_NOT_FOUND",
						"message": "Virtual network not found",
						"details": err.Error(),
					},
				})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{
				"status": "error",
				"error": gin.H{
					"code":    "UPDATE_NETWORK_FAILED",
					"message": "Failed to update virtual network",
					"details": err.Error(),
				},
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data": gin.H{
				"network": network,
				"message": "Virtual network updated successfully",
			},
		})
	}
}

func startNetwork(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		name := c.Param("name")
		err := service.StartNetwork(c.Request.Context(), name)
		if err != nil {
			if strings.Contains(err.Error(), "not found") {
				c.JSON(http.StatusNotFound, gin.H{
					"status": "error",
					"error": gin.H{
						"code":    "NETWORK_NOT_FOUND",
						"message": "Virtual network not found",
						"details": err.Error(),
					},
				})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{
				"status": "error",
				"error": gin.H{
					"code":    "START_NETWORK_FAILED",
					"message": "Failed to start virtual network",
					"details": err.Error(),
				},
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data": gin.H{
				"message": "Virtual network started successfully",
			},
		})
	}
}

func stopNetwork(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		name := c.Param("name")
		err := service.StopNetwork(c.Request.Context(), name)
		if err != nil {
			if strings.Contains(err.Error(), "not found") {
				c.JSON(http.StatusNotFound, gin.H{
					"status": "error",
					"error": gin.H{
						"code":    "NETWORK_NOT_FOUND",
						"message": "Virtual network not found",
						"details": err.Error(),
					},
				})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{
				"status": "error",
				"error": gin.H{
					"code":    "STOP_NETWORK_FAILED",
					"message": "Failed to stop virtual network",
					"details": err.Error(),
				},
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data": gin.H{
				"message": "Virtual network stopped successfully",
			},
		})
	}
}

func getNetworkDHCPLeases(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		name := c.Param("name")

		leases, err := service.GetNetworkDHCPLeases(c.Request.Context(), name)
		if err != nil {
			if strings.Contains(err.Error(), "not found") {
				c.JSON(http.StatusNotFound, gin.H{
					"status": "error",
					"error": gin.H{
						"code":    "NETWORK_NOT_FOUND",
						"message": "Virtual network not found",
						"details": err.Error(),
					},
				})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{
				"status": "error",
				"error": gin.H{
					"code":    "GET_DHCP_LEASES_FAILED",
					"message": "Failed to get DHCP leases",
					"details": err.Error(),
				},
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data":   leases,
		})
	}
}

func getNetworkPorts(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		name := c.Param("name")

		ports, err := service.GetNetworkPorts(c.Request.Context(), name)
		if err != nil {
			if strings.Contains(err.Error(), "not found") {
				c.JSON(http.StatusNotFound, gin.H{
					"status": "error",
					"error": gin.H{
						"code":    "NETWORK_NOT_FOUND",
						"message": "Virtual network not found",
						"details": err.Error(),
					},
				})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{
				"status": "error",
				"error": gin.H{
					"code":    "GET_NETWORK_PORTS_FAILED",
					"message": "Failed to get network ports",
					"details": err.Error(),
				},
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data":   ports,
		})
	}
}
func deleteNetwork(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		name := c.Param("name")
		err := service.DeleteNetwork(c.Request.Context(), name)
		if err != nil {
			if strings.Contains(err.Error(), "not found") {
				c.JSON(http.StatusNotFound, gin.H{
					"status": "error",
					"error": gin.H{
						"code":    "NETWORK_NOT_FOUND",
						"message": "Virtual network not found",
						"details": err.Error(),
					},
				})
				return
			}

			c.JSON(http.StatusInternalServerError, gin.H{
				"status": "error",
				"error": gin.H{
					"code":    "DELETE_NETWORK_FAILED",
					"message": "Failed to delete virtual network",
					"details": err.Error(),
				},
			})
			return
		}

		c.Status(http.StatusNoContent)
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
			c.JSON(http.StatusInternalServerError, gin.H{
				"status": "error",
				"error": gin.H{
					"code":    "LIST_PCI_DEVICES_FAILED",
					"message": "Failed to list PCI devices",
					"details": err.Error(),
				},
			})
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

		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data": gin.H{
				"devices":     devices,
				"count":       len(devices),
				"device_type": deviceType,
			},
		})
	}
}

func attachPCIDevice(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var req libvirt.PCIPassthroughRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			sendComputeError(c, "INVALID_REQUEST", "Invalid PCI attach request", err, http.StatusBadRequest)
			return
		}

		pciAddr, err := service.AttachPCIDevice(c.Request.Context(), id, &req)
		if err != nil {
			msg := err.Error()
			switch {
			case strings.Contains(msg, "VM not found"):
				sendComputeError(c, "VM_NOT_FOUND", "Virtual machine not found", err, http.StatusNotFound)
			case strings.Contains(msg, "invalid PCI address format"):
				sendComputeError(c, "INVALID_PCI_ADDRESS", "Invalid PCI address format", err, http.StatusBadRequest)
			case strings.Contains(msg, "device is already assigned to another VM"):
				sendComputeError(c, "PCI_DEVICE_IN_USE", "PCI device is already assigned to another VM", err, http.StatusConflict)
			default:
				sendComputeError(c, "ATTACH_PCI_DEVICE_FAILED", "Failed to attach PCI device", err, http.StatusInternalServerError)
			}
			return
		}

		parts := strings.Split(pciAddr, ":")
		if len(parts) != 3 {
			sendComputeError(c, "INVALID_PCI_ADDRESS", "Invalid PCI address format", fmt.Errorf("invalid PCI address format: %s", pciAddr), http.StatusInternalServerError)
			return
		}
		funcParts := strings.Split(parts[2], ".")
		if len(funcParts) != 2 {
			sendComputeError(c, "INVALID_PCI_ADDRESS", "Invalid PCI address format", fmt.Errorf("invalid PCI address format: %s", pciAddr), http.StatusInternalServerError)
			return
		}

		domain := fmt.Sprintf("0x%s", parts[0])
		bus := fmt.Sprintf("0x%s", parts[1])
		slot := fmt.Sprintf("0x%s", funcParts[0])
		function := fmt.Sprintf("0x%s", funcParts[1])

		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data": gin.H{
				"message": "PCI device attached successfully",
				"device": gin.H{
					"domain":   domain,
					"bus":      bus,
					"slot":     slot,
					"function": function,
				},
			},
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

		if err := service.DetachPCIDevice(c.Request.Context(), id, &req); err != nil {
			msg := err.Error()
			switch {
			case strings.Contains(msg, "VM not found"):
				sendComputeError(c, "VM_NOT_FOUND", "Virtual machine not found", err, http.StatusNotFound)
			case strings.Contains(msg, "invalid PCI address format"):
				sendComputeError(c, "INVALID_PCI_ADDRESS", "Invalid PCI address format", err, http.StatusBadRequest)
			default:
				sendComputeError(c, "DETACH_PCI_DEVICE_FAILED", "Failed to detach PCI device", err, http.StatusInternalServerError)
			}
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data": gin.H{
				"message": "PCI device detached successfully",
			},
		})
	}
}

// Resource Hotplug handler

func hotplugResource(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var req libvirt.HotplugRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			sendComputeError(c, "INVALID_REQUEST", "Invalid hotplug request", err, http.StatusBadRequest)
			return
		}

		if err := service.HotplugResource(c.Request.Context(), id, &req); err != nil {
			msg := err.Error()
			switch {
			case strings.Contains(msg, "VM not found"):
				sendComputeError(c, "VM_NOT_FOUND", "Virtual machine not found", err, http.StatusNotFound)
			case strings.Contains(msg, "VM must be running for hot-plug operations"):
				sendComputeError(c, "VM_NOT_RUNNING", "VM must be running for hotplug operations", err, http.StatusBadRequest)
			case strings.Contains(msg, "unsupported resource type"):
				sendComputeError(c, "UNSUPPORTED_RESOURCE_TYPE", "Unsupported hotplug resource type", err, http.StatusBadRequest)
			default:
				sendComputeError(c, "HOTPLUG_FAILED", "Failed to perform hotplug operation", err, http.StatusInternalServerError)
			}
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data": gin.H{
				"message":       "Resource hotplug operation completed successfully",
				"vm_id":         id,
				"resource_type": req.ResourceType,
				"action":        req.Action,
			},
		})
	}
}

// Enhanced VM Creation handler

func createVMEnhanced(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req libvirt.VMCreateRequestEnhanced
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"status": "error",
				"error": gin.H{
					"code":    "INVALID_REQUEST",
					"message": "Invalid VM creation request",
					"details": err.Error(),
				},
			})
			return
		}

		vm, err := service.CreateVMEnhanced(c.Request.Context(), &req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"status": "error",
				"error": gin.H{
					"code":    "CREATE_VM_FAILED",
					"message": "Failed to create virtual machine",
					"details": err.Error(),
				},
			})
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"status": "success",
			"data":   vm,
		})
	}
}

// ISO Management handlers

func listISOs(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		isos, err := service.ListISOs(c.Request.Context())
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"status": "error",
				"error": gin.H{
					"code":    "LIST_ISOS_FAILED",
					"message": "Failed to list ISO images",
					"details": err.Error(),
				},
			})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data": gin.H{
				"isos":  isos,
				"count": len(isos),
			},
		})
	}
}

func getISO(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {

		id := c.Param("id")
		vm, err := service.GetISO(c.Request.Context(), id)
		if err != nil {
			if strings.Contains(err.Error(), "not found") {
				c.JSON(http.StatusNotFound, gin.H{
					"status": "error",
					"error": gin.H{
						"code":    "ISO_NOT_FOUND",
						"message": "ISO Image not found",
						"details": err.Error(),
					},
				})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{
				"status": "error",
				"error": gin.H{
					"code":    "GET_ISO_FAILED",
					"message": "Failed to get ISO image",
					"details": err.Error(),
				},
			})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data":   vm,
		})
	}
}

func uploadISO(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req libvirt.ISOUploadRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"status": "error",
				"error": gin.H{
					"code":    "INVALID_REQUEST",
					"message": "Invalid ISO upload request",
					"details": err.Error(),
				},
			})
			return
		}

		iso, err := service.UploadISO(c.Request.Context(), &req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"status": "error",
				"error": gin.H{
					"code":    "UPLOAD_ISO_FAILED",
					"message": "Failed to upload ISO image",
					"details": err.Error(),
				},
			})
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"status": "success",
			"data": gin.H{
				"iso":     iso,
				"message": "ISO uploaded successfully",
			},
		})
	}
}

func deleteISO(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		err := service.DeleteISO(c.Request.Context(), id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"status": "error",
				"error": gin.H{
					"code":    "DELETE_ISO_FAILED",
					"message": "Failed to delete ISO image",
					"details": err.Error(),
				},
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data": gin.H{
				"message": "ISO deleted successfully",
				"id":      id,
			},
		})
	}
}

func downloadISO(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {

		id := c.Param("id")
		isoPath, name, err := service.DownloadISO(c.Request.Context(), id)
		if err != nil {
			if strings.Contains(err.Error(), "not found") {
				c.JSON(http.StatusNotFound, gin.H{
					"status": "error",
					"error": gin.H{
						"code":    "ISO_NOT_FOUND",
						"message": "ISO Image not found",
						"details": err.Error(),
					},
				})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{
				"status": "error",
				"error": gin.H{
					"code":    "GET_ISO_FAILED",
					"message": "Failed to get ISO image",
					"details": err.Error(),
				},
			})
			return
		}

		c.FileAttachment(isoPath, name)
	}
}

// updateVMEnhanced handles enhanced VM update requests
func updateVMEnhanced(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get VM ID from URL parameter
		vmID := c.Param("id")
		if vmID == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"status": "error",
				"error": gin.H{
					"code":    "INVALID_REQUEST",
					"message": "VM ID is required",
				},
			})
			return
		}

		// Parse request body
		var req libvirt.VMCreateRequestEnhanced
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"status": "error",
				"error": gin.H{
					"code":    "INVALID_REQUEST",
					"message": "Invalid update request",
					"details": err.Error(),
				},
			})
			return
		}

		// Call the UpdateVMEnhanced service method
		vm, err := service.UpdateVMEnhanced(c.Request.Context(), vmID, &req)
		if err != nil {
			// Handle specific error cases
			if strings.Contains(err.Error(), "not found") {
				c.JSON(http.StatusNotFound, gin.H{
					"status": "error",
					"error": gin.H{
						"code":    "VM_NOT_FOUND",
						"message": fmt.Sprintf("VM '%s' not found", vmID),
						"details": err.Error(),
					},
				})
				return
			}

			if strings.Contains(err.Error(), "require VM to be stopped") {
				c.JSON(http.StatusConflict, gin.H{
					"status": "error",
					"error": gin.H{
						"code":    "VM_RUNNING",
						"message": "Operation requires VM to be stopped",
						"details": err.Error(),
					},
				})
				return
			}

			// Generic error
			c.JSON(http.StatusInternalServerError, gin.H{
				"status": "error",
				"error": gin.H{
					"code":    "UPDATE_VM_FAILED",
					"message": "Failed to update virtual machine",
					"details": err.Error(),
				},
			})
			return
		}

		// Return success response with updated VM details
		c.JSON(http.StatusOK, gin.H{
			"status":  "success",
			"message": fmt.Sprintf("VM '%s' updated successfully", vmID),
			"data":    vm,
		})
	}
}

// LibvirtUnavailableRoutes registers virtualization routes that always report virtualization disabled.
// This is used when libvirt is not available on the host so the frontend can show a clear message.
func LibvirtUnavailableRoutes(api *gin.RouterGroup) {
	virtualization := api.Group("/virtualization")

	handler := func(c *gin.Context) {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status": "error",
			"error": gin.H{
				"code":    "VIRTUALIZATION_DISABLED",
				"message": "Virtualization features are disabled on this host.",
				"details": "Libvirt is not installed or not running on this host. Install and start libvirt to enable VM management.",
			},
		})
	}

	// NOTE: Don't use a catch-all wildcard (/*any) here, because it prevents registering
	// specific sub-routes like /virtualization/os-variants (Gin will panic on conflicts).
	// Instead, use param-based routes as a "catch-all" that still allows explicit routes.
	virtualization.Any("", handler)
	virtualization.Any("/", handler)
	virtualization.Any("/:first", handler)
	virtualization.Any("/:first/*rest", handler)
}

func getConsoleStats(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")

		// Get console stats from service
		stats := service.GetConsoleStats()

		// Add VM-specific context
		stats["vm_id"] = id

		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data":   stats,
		})
	}
}

func getSnapshotDetail(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		snapshotName := c.Param("snapshot")

		snapshot, err := service.GetSnapshotDetail(c.Request.Context(), id, snapshotName)
		if err != nil {
			msg := err.Error()
			if strings.Contains(msg, "domain not found") {
				sendComputeError(c, "VM_NOT_FOUND", "Virtual machine not found", err, http.StatusNotFound)
				return
			}
			if strings.Contains(msg, "snapshot not found") || strings.Contains(msg, "failed to find snapshot") {
				sendComputeError(c, "SNAPSHOT_NOT_FOUND", "Snapshot not found", err, http.StatusNotFound)
				return
			}
			sendComputeError(c, "GET_SNAPSHOT_FAILED", "Failed to get snapshot details", err, http.StatusInternalServerError)
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data": gin.H{
				"snapshot": snapshot,
			},
		})
	}
}
