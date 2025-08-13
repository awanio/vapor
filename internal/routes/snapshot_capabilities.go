package routes

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"github.com/awanio/vapor/internal/libvirt"
)

// GetVMSnapshotCapabilities checks and returns snapshot capabilities for a VM
func GetVMSnapshotCapabilities(libvirtService *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		vmID := c.Param("id")
		if vmID == "" {
			logrus.WithField("endpoint", "GetVMSnapshotCapabilities").Error("VM ID is required")
			c.JSON(http.StatusBadRequest, gin.H{
				"status": "error",
				"error": gin.H{
					"code":    "INVALID_ID",
					"message": "VM ID is required",
				},
			})
			return
		}

		capabilities, err := libvirtService.GetSnapshotCapabilities(c.Request.Context(), vmID)
		if err != nil {
			logrus.WithField("endpoint", "GetVMSnapshotCapabilities").
				WithField("vm_id", vmID).
				WithError(err).
				Error("Failed to get snapshot capabilities")
			
			if err.Error() == "domain not found" {
				c.JSON(http.StatusNotFound, gin.H{
					"status": "error",
					"error": gin.H{
						"code":    "VM_NOT_FOUND",
						"message": "Virtual machine not found",
					},
				})
				return
			}

			c.JSON(http.StatusInternalServerError, gin.H{
				"status": "error",
				"error": gin.H{
					"code":    "CAPABILITIES_CHECK_FAILED",
					"message": "Failed to check snapshot capabilities",
					"details": err.Error(),
				},
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data": gin.H{
				"capabilities": capabilities,
			},
		})
	}
}

// CreateVMSnapshotEnhanced creates a VM snapshot with format checking
func CreateVMSnapshotEnhanced(libvirtService *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		vmID := c.Param("id")
		if vmID == "" {
			logrus.WithField("endpoint", "CreateVMSnapshotEnhanced").Error("VM ID is required")
			c.JSON(http.StatusBadRequest, gin.H{
				"status": "error",
				"error": gin.H{
					"code":    "INVALID_ID",
					"message": "VM ID is required",
				},
			})
			return
		}

		var req libvirt.VMSnapshotRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			logrus.WithField("endpoint", "CreateVMSnapshotEnhanced").
				WithError(err).
				Error("Invalid request body")
			c.JSON(http.StatusBadRequest, gin.H{
				"status": "error",
				"error": gin.H{
					"code":    "INVALID_REQUEST",
					"message": "Invalid snapshot request",
					"details": err.Error(),
				},
			})
			return
		}

		// First validate the request
		if err := libvirtService.ValidateSnapshotRequest(c.Request.Context(), vmID, &req); err != nil {
			logrus.WithField("endpoint", "CreateVMSnapshotEnhanced").
				WithField("vm_id", vmID).
				WithError(err).
				Warn("Snapshot request validation failed")
			c.JSON(http.StatusBadRequest, gin.H{
				"status": "error",
				"error": gin.H{
					"code":    "SNAPSHOT_NOT_SUPPORTED",
					"message": "Snapshot request not supported for this VM",
					"details": err.Error(),
				},
			})
			return
		}

		// Create the snapshot with enhanced handling
		snapshot, err := libvirtService.CreateSnapshotEnhanced(c.Request.Context(), vmID, &req)
		if err != nil {
			logrus.WithField("endpoint", "CreateVMSnapshotEnhanced").
				WithField("vm_id", vmID).
				WithField("snapshot_name", req.Name).
				WithError(err).
				Error("Failed to create snapshot")
			
			if err.Error() == "domain not found" {
				c.JSON(http.StatusNotFound, gin.H{
					"status": "error",
					"error": gin.H{
						"code":    "VM_NOT_FOUND",
						"message": "Virtual machine not found",
					},
				})
				return
			}

			c.JSON(http.StatusInternalServerError, gin.H{
				"status": "error",
				"error": gin.H{
					"code":    "SNAPSHOT_CREATE_FAILED",
					"message": "Failed to create snapshot",
					"details": err.Error(),
				},
			})
			return
		}

		logrus.WithField("endpoint", "CreateVMSnapshotEnhanced").
			WithField("vm_id", vmID).
			WithField("snapshot_name", snapshot.Name).
			WithField("snapshot_type", snapshot.Type).
			WithField("disk_formats", snapshot.DiskFormats).
			Info("VM snapshot created successfully")

		// Include warnings in response if any
		response := gin.H{
			"status": "success",
			"data": gin.H{
				"snapshot": snapshot,
				"message":  "Snapshot created successfully",
			},
		}

		if len(snapshot.Warnings) > 0 {
			response["warnings"] = snapshot.Warnings
			logrus.WithField("endpoint", "CreateVMSnapshotEnhanced").
				WithField("warnings", snapshot.Warnings).
				Warn("Snapshot created with warnings")
		}

		c.JSON(http.StatusCreated, response)
	}
}
