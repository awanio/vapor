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
	return ":8080"
}

func getJWTSecret() string {
	if secret := os.Getenv("JWT_SECRET"); secret != "" {
		return secret
	}
	// In production, this should be a secure, randomly generated secret
	return "default-secret-change-in-production"
}
