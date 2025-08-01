package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"runtime"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/vapor/system-api/internal/auth"
	"github.com/vapor/system-api/internal/common"
	"github.com/vapor/system-api/internal/container"
	"github.com/vapor/system-api/internal/logs"
	"github.com/vapor/system-api/internal/network"
	"github.com/vapor/system-api/internal/storage"
	"github.com/vapor/system-api/internal/system"
	"github.com/vapor/system-api/internal/users"
	"github.com/vapor/system-api/internal/web"
	"github.com/vapor/system-api/internal/websocket"
)

func main() {
	// Check operating system
	if runtime.GOOS != "linux" {
		log.Printf("Warning: This application is designed for Linux. Running on %s/%s may have limited functionality.", runtime.GOOS, runtime.GOARCH)
	} else {
		log.Printf("Running on %s/%s", runtime.GOOS, runtime.GOARCH)
	}

	// Check if running with appropriate privileges (only meaningful on Linux)
	if runtime.GOOS == "linux" && os.Geteuid() != 0 {
		log.Println("Warning: Running without root privileges. Some features may not work.")
	}

	// Initialize Gin router
	router := gin.Default()

	// Add CORS middleware
	router.Use(corsMiddleware())

	// Add JWT authentication middleware
	authService := auth.NewService(getJWTSecret())

	// Public endpoints
	router.POST("/api/v1/auth/login", authService.Login)

	// Protected API routes
	api := router.Group("/api/v1")
	api.Use(authService.AuthMiddleware())
	{
		// Network endpoints
		networkService := network.NewService()
		api.GET("/network/interfaces", networkService.GetInterfaces)
		api.PUT("/network/interfaces/:name/up", networkService.InterfaceUp)
		api.PUT("/network/interfaces/:name/down", networkService.InterfaceDown)
		api.POST("/network/interfaces/:name/address", networkService.SetInterfaceAddress)
		api.PUT("/network/interfaces/:name/address", networkService.UpdateInterfaceAddress)
		api.DELETE("/network/interfaces/:name/address", networkService.DeleteInterfaceAddress)
		api.GET("/network/bridges", networkService.GetBridges)
		api.POST("/network/bridge", networkService.CreateBridge)
		api.PUT("/network/bridge/:name", networkService.UpdateBridge)
		api.DELETE("/network/bridge/:name", networkService.DeleteBridge)
		api.GET("/network/bonds", networkService.GetBonds)
		api.POST("/network/bond", networkService.CreateBond)
		api.PUT("/network/bond/:name", networkService.UpdateBond)
		api.DELETE("/network/bond/:name", networkService.DeleteBond)
		api.GET("/network/vlans", networkService.GetVLANs)
		api.POST("/network/vlan", networkService.CreateVLAN)
		api.PUT("/network/vlan/:name", networkService.UpdateVLAN)
		api.DELETE("/network/vlan/:name", networkService.DeleteVLAN)

		// Storage endpoints
		storageService := storage.NewService()
		api.GET("/storage/disks", storageService.GetDisks)
		api.POST("/storage/mount", storageService.Mount)
		api.POST("/storage/unmount", storageService.Unmount)
		api.POST("/storage/format", storageService.Format)

		// LVM endpoints
		api.GET("/storage/lvm/vgs", storageService.GetVolumeGroups)
		api.GET("/storage/lvm/lvs", storageService.GetLogicalVolumes)
		api.GET("/storage/lvm/pvs", storageService.GetPhysicalVolumes)
		api.POST("/storage/lvm/vg", storageService.CreateVolumeGroup)
		api.POST("/storage/lvm/lv", storageService.CreateLogicalVolume)

		// iSCSI endpoints
		api.POST("/storage/iscsi/discover", storageService.DiscoverISCSITargets)
		api.GET("/storage/iscsi/sessions", storageService.GetISCSISessions)
		api.POST("/storage/iscsi/login", storageService.LoginISCSI)
		api.POST("/storage/iscsi/logout", storageService.LogoutISCSI)

		// Multipath endpoints
		api.GET("/storage/multipath/devices", storageService.GetMultipathDevices)
		api.GET("/storage/multipath/paths", storageService.GetMultipathPaths)

		// BTRFS endpoints
		api.GET("/storage/btrfs/subvolumes", storageService.GetBTRFSSubvolumes)
		api.POST("/storage/btrfs/subvolume", storageService.CreateBTRFSSubvolume)
		api.DELETE("/storage/btrfs/subvolume", storageService.DeleteBTRFSSubvolume)
		api.POST("/storage/btrfs/snapshot", storageService.CreateBTRFSSnapshot)

		// RAID endpoints
		api.GET("/storage/raid/devices", storageService.GetRAIDDevices)
		api.GET("/storage/raid/available-disks", storageService.GetRAIDAvailableDisks)
		api.POST("/storage/raid/create", storageService.CreateRAIDDevice)
		api.POST("/storage/raid/destroy", storageService.DestroyRAIDDevice)

		// Container management endpoints
		containerService := container.NewService(container.NewExecutor())
		api.GET("/containers", containerService.ListContainers)
		api.GET("/containers/:id", containerService.GetContainerDetails)
		api.POST("/containers", containerService.CreateContainer)
		api.POST("/containers/:id/start", containerService.StartContainer)
		api.POST("/containers/:id/stop", containerService.StopContainer)
		api.POST("/containers/:id/restart", containerService.RestartContainer)
		api.DELETE("/containers/:id", containerService.RemoveContainer)
		api.GET("/containers/:id/logs", containerService.GetContainerLogs)

		// Container image endpoints
		api.GET("/images", containerService.ListImages)
		api.GET("/images/:id", containerService.GetImageDetails)
		api.POST("/images/pull", containerService.PullImage)
		api.DELETE("/images/:id", containerService.RemoveImage)

		// User management endpoints
		userService := users.NewService()
		api.GET("/users", userService.GetUsers)
		api.POST("/users", userService.CreateUser)
		api.PUT("/users/:username", userService.UpdateUser)
		api.DELETE("/users/:username", userService.DeleteUser)

		// Log viewer endpoints
		logService := logs.NewService()
		api.GET("/logs", logService.GetLogs)

		// System info endpoints
		systemService := system.NewService()
		api.GET("/system/summary", systemService.GetSummary)
		api.GET("/system/hardware", systemService.GetHardware)
		api.GET("/system/memory", systemService.GetMemory)
		api.GET("/system/cpu", systemService.GetCPU)
	}

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, common.SuccessResponse(gin.H{
			"status": "healthy",
			"time":   time.Now().Unix(),
		}))
	})

	// Serve OpenAPI documentation
	router.Static("/docs", "./docs")

	// Setup WebSocket hub
	metricsHub := websocket.NewHub()
	logsHub := websocket.NewHub()
	terminalHub := websocket.NewHub()

	go metricsHub.Run()
	go logsHub.Run()
	go terminalHub.Run()

	// WebSocket routes
	router.GET("/ws/metrics", websocket.ServeMetricsWebSocket(metricsHub, getJWTSecret()))
	router.GET("/ws/logs", websocket.ServeLogsWebSocket(logsHub, getJWTSecret()))
	router.GET("/ws/terminal", websocket.ServeTerminalWebSocket(terminalHub, getJWTSecret()))

	// Serve embedded web UI
	if web.HasWebUI() {
		webFS, err := web.GetFileSystem()
		if err != nil {
			log.Printf("Warning: Failed to get web filesystem: %v", err)
		} else {
			// Serve all static files using StaticFS
			router.StaticFS("/static", webFS)
			
			// Serve index.html for root
			router.GET("/", func(c *gin.Context) {
				data, err := web.GetIndexHTML()
				if err != nil {
					c.String(http.StatusInternalServerError, "Failed to load index.html")
					return
				}
				c.Data(http.StatusOK, "text/html; charset=utf-8", data)
			})
			
			// Serve index.html explicitly
			router.GET("/index.html", func(c *gin.Context) {
				data, err := web.GetIndexHTML()
				if err != nil {
					c.String(http.StatusInternalServerError, "Failed to load index.html")
					return
				}
				c.Data(http.StatusOK, "text/html; charset=utf-8", data)
			})
			
			// Catch-all route for SPA routing
			router.NoRoute(func(c *gin.Context) {
				// Skip API routes
				if len(c.Request.URL.Path) > 4 && c.Request.URL.Path[:4] == "/api" {
					c.JSON(http.StatusNotFound, gin.H{"error": "API endpoint not found"})
					return
				}
				// Skip WebSocket routes
				if len(c.Request.URL.Path) > 3 && c.Request.URL.Path[:3] == "/ws" {
					c.JSON(http.StatusNotFound, gin.H{"error": "WebSocket endpoint not found"})
					return
				}
				// Skip static files
				if len(c.Request.URL.Path) > 7 && c.Request.URL.Path[:7] == "/static" {
					c.JSON(http.StatusNotFound, gin.H{"error": "Static file not found"})
					return
				}
				
				// Try to serve the file directly first
				path := c.Request.URL.Path
				// Remove leading slash for http.FS
				if len(path) > 0 && path[0] == '/' {
					path = path[1:]
				}
				
				// Check if file exists
				if file, err := webFS.Open(path); err == nil {
					file.Close()
					// Serve the actual file
					c.FileFromFS(path, webFS)
				} else {
					// For SPA, return index.html for client-side routing
					data, err := web.GetIndexHTML()
					if err != nil {
						c.String(http.StatusInternalServerError, "Failed to load index.html")
						return
					}
					c.Data(http.StatusOK, "text/html; charset=utf-8", data)
				}
			})
			
			log.Println("Web UI enabled and serving at /")
		}
	} else {
		log.Println("Web UI not available (no files found in embedded filesystem)")
		
		// Serve a simple message when no web UI is available
		router.GET("/", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"message": "System Management API",
				"version": "1.0.0",
				"docs":    "/docs",
				"health":  "/health",
			})
		})
	}

	// Create HTTP server
	srv := &http.Server{
		Addr:    getServerAddr(),
		Handler: router,
	}

	// Start server in a goroutine
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	log.Printf("Server started on %s", srv.Addr)

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	// Graceful shutdown with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}

	log.Println("Server exiting")
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

func getServerAddr() string {
	if addr := os.Getenv("SERVER_ADDR"); addr != "" {
		return addr
	}
	return ":8081"
}

func getJWTSecret() string {
	if secret := os.Getenv("JWT_SECRET"); secret != "" {
		return secret
	}
	// In production, this should be a secure, randomly generated secret
	return "default-secret-change-in-production"
}
