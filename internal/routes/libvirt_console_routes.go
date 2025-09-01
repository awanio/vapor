package routes

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/awanio/vapor/internal/libvirt"
	"github.com/gin-gonic/gin"
)

// Console handlers for the new improved endpoints

// getAvailableConsoles returns all available console types for a VM
func getAvailableConsoles(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")

		consoles, err := service.GetAvailableConsoles(c.Request.Context(), id)
		if err != nil {
			if consoleErr, ok := err.(*libvirt.ConsoleError); ok {
				status := http.StatusInternalServerError
				if consoleErr.Code == "VM_NOT_FOUND" {
					status = http.StatusNotFound
				} else if consoleErr.Code == "NO_CONSOLE_AVAILABLE" {
					status = http.StatusServiceUnavailable
				}

				c.JSON(status, gin.H{
					"status": "error",
					"error": gin.H{
						"code":    consoleErr.Code,
						"message": consoleErr.Message,
					},
				})
				return
			}

			c.JSON(http.StatusInternalServerError, gin.H{
				"status": "error",
				"error": gin.H{
					"code":    "GET_CONSOLES_FAILED",
					"message": "Failed to get available consoles",
					"details": err.Error(),
				},
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data":   consoles,
		})
	}
}

// getVNCConsole returns VNC console information for a VM
func getVNCConsole(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")

		console, err := service.GetVNCConsole(c.Request.Context(), id)
		if err != nil {
			if consoleErr, ok := err.(*libvirt.ConsoleError); ok {
				status := http.StatusInternalServerError
				if consoleErr.Code == "VM_NOT_FOUND" {
					status = http.StatusNotFound
				} else if consoleErr.Code == "NO_CONSOLE_AVAILABLE" {
					status = http.StatusServiceUnavailable
				}

				c.JSON(status, gin.H{
					"status": "error",
					"error": gin.H{
						"code":    consoleErr.Code,
						"message": consoleErr.Message,
					},
				})
				return
			}

			c.JSON(http.StatusInternalServerError, gin.H{
				"status": "error",
				"error": gin.H{
					"code":    "GET_VNC_CONSOLE_FAILED",
					"message": "Failed to get VNC console",
					"details": err.Error(),
				},
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data":   console,
		})
	}
}

// getSPICEConsole returns SPICE console information for a VM
func getSPICEConsole(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")

		console, err := service.GetSPICEConsole(c.Request.Context(), id)
		if err != nil {
			if consoleErr, ok := err.(*libvirt.ConsoleError); ok {
				status := http.StatusInternalServerError
				if consoleErr.Code == "VM_NOT_FOUND" {
					status = http.StatusNotFound
				} else if consoleErr.Code == "NO_CONSOLE_AVAILABLE" {
					status = http.StatusServiceUnavailable
				}

				c.JSON(status, gin.H{
					"status": "error",
					"error": gin.H{
						"code":    consoleErr.Code,
						"message": consoleErr.Message,
					},
				})
				return
			}

			c.JSON(http.StatusInternalServerError, gin.H{
				"status": "error",
				"error": gin.H{
					"code":    "GET_SPICE_CONSOLE_FAILED",
					"message": "Failed to get SPICE console",
					"details": err.Error(),
				},
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data":   console,
		})
	}
}

// vmVNCWebSocket handles VNC WebSocket connections
func vmVNCWebSocket(service *libvirt.Service) gin.HandlerFunc {
	return vmConsoleWebSocketByType(service, "vnc")
}

// vmSPICEWebSocket handles SPICE WebSocket connections
func vmSPICEWebSocket(service *libvirt.Service) gin.HandlerFunc {
	return vmConsoleWebSocketByType(service, "spice")
}

// vmConsoleWebSocketByType handles WebSocket connections for a specific console type
func vmConsoleWebSocketByType(service *libvirt.Service, consoleType string) gin.HandlerFunc {
	return func(c *gin.Context) {
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

		// Validate that the token is for the correct console type
		// This would require extending the ConsoleProxy to validate console type
		// For now, we'll proceed with the connection

		// Upgrade to WebSocket
		ws, err := consoleProxy.WebSocketUpgrader().Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": fmt.Sprintf("failed to upgrade to WebSocket for %s", consoleType),
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
					"code":  "CONNECTION_ERROR",
					"error": err.Error(),
				})
			}
		}
	}
}

// Legacy console handler for backward compatibility
func getConsole(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		consoleType := c.DefaultQuery("type", "")

		// If type is not specified, return all available consoles
		if consoleType == "" {
			getAvailableConsoles(service)(c)
			return
		}

		// Otherwise, get the specific console type
		console, err := service.GetConsole(c.Request.Context(), id, consoleType)
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
					"code":    "GET_VM_CONSOLE_FAILED",
					"message": "Failed to get virtual machine console",
					"details": err.Error(),
				},
			})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data":   console,
		})
	}
}

// vmConsoleWebSocket handles WebSocket connections (legacy - kept for backward compatibility)
func vmConsoleWebSocket(service *libvirt.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
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
					"code":  "CONNECTION_ERROR",
					"error": err.Error(),
				})
			}
		}
	}
}
