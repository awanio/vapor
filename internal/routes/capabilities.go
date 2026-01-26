package routes

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/awanio/vapor/internal/libvirt"
	"github.com/gin-gonic/gin"
)

// getDomainCapabilities returns libvirt domain capabilities (parsed) for the host.
func getDomainCapabilities(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		includeRaw := false
		if rawParam := strings.TrimSpace(c.Query("include_raw")); rawParam != "" {
			value, err := strconv.ParseBool(rawParam)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{
					"status": "error",
					"error": gin.H{
						"code":    "INVALID_REQUEST",
						"message": "Invalid include_raw parameter",
						"details": err.Error(),
					},
				})
				return
			}
			includeRaw = value
		}

		req := libvirt.DomainCapabilitiesRequest{
			Emulator:   strings.TrimSpace(c.Query("emulator")),
			Arch:       strings.TrimSpace(c.Query("arch")),
			Machine:    strings.TrimSpace(c.Query("machine_type")),
			VirtType:   strings.TrimSpace(c.Query("virt_type")),
			IncludeRaw: includeRaw,
		}

		caps, err := service.GetDomainCapabilities(c.Request.Context(), req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"status": "error",
				"error": gin.H{
					"code":    "CAPABILITIES_FAILED",
					"message": "Failed to get virtualization capabilities",
					"details": err.Error(),
				},
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data":   caps,
		})
	}
}
