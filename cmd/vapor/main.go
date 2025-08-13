package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"runtime"
	"syscall"
	"time"

	"github.com/awanio/vapor/internal/ansible"
	"github.com/awanio/vapor/internal/auth"
	"github.com/awanio/vapor/internal/common"
	"github.com/awanio/vapor/internal/config"
	"github.com/awanio/vapor/internal/database"
	"github.com/awanio/vapor/internal/docker"
	"github.com/awanio/vapor/internal/libvirt"
	"github.com/awanio/vapor/internal/logs"
	"github.com/awanio/vapor/internal/network"
	"github.com/awanio/vapor/internal/routes"
	"github.com/awanio/vapor/internal/storage"
	"github.com/awanio/vapor/internal/system"
	"github.com/awanio/vapor/internal/users"
	"github.com/awanio/vapor/internal/web"
	"github.com/awanio/vapor/internal/websocket"
	"github.com/gin-gonic/gin"
)

func main() {
	// Check for special flags first (before config.Load which calls flag.Parse)
	if len(os.Args) > 1 {
		switch os.Args[1] {
		case "--generate-config":
			generateConfigCmd()
			return
		case "--help", "-h":
			printHelp()
			return
		case "--version", "-v":
			fmt.Println("Vapor System Management API v1.0.0")
			return
		}
	}

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Print configuration if verbose mode
	if os.Getenv("VAPOR_DEBUG") != "" {
		cfg.Print()
	}

	// Initialize database
	dbConfig := &database.Config{
		AppDir: cfg.AppDir,
	}
	db, err := database.Initialize(dbConfig)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	// Run migrations
	allMigrations := []database.Migration{}
	allMigrations = append(allMigrations, database.GetMigrations()...)
	allMigrations = append(allMigrations, ansible.GetMigrations()...)
	if err := db.Migrate(allMigrations); err != nil {
		log.Fatalf("Failed to run database migrations: %v", err)
	}

	// Enforce Linux-only execution
	if runtime.GOOS != "linux" {
		log.Fatalf("Error: This application requires Linux. Current OS: %s/%s", runtime.GOOS, runtime.GOARCH)
	}

	log.Printf("Running on %s/%s", runtime.GOOS, runtime.GOARCH)

	// Check if running with appropriate privileges
	if os.Geteuid() != 0 {
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
		// Network routes
		networkService := network.NewService()
		routes.NetworkRoutes(api, networkService)

		// Storage routes
		storageService := storage.NewService()
		routes.StorageRoutes(api, storageService)

		// Container routes (for containerd and CRI-O)
		routes.ContainerRoutes(api)

		// Docker routes
		dockerClient, err := docker.NewClient()
		if err != nil {
			log.Printf("Warning: Failed to create Docker client: %v", err)
		} else {
			defer dockerClient.Close() // Close client when server shuts down
			routes.DockerRoutesWithClient(api, dockerClient)
		}

		// Kubernetes routes
		routes.KubernetesRoutes(api)

		// User management routes
		userService := users.NewService()
		routes.UserRoutes(api, userService)

		// Log viewer routes
		logService := logs.NewService()
		routes.LogRoutes(api, logService)

		// System info routes
		systemService := system.NewService()
		routes.SystemRoutes(api, systemService)

		// Ansible integration endpoints
		ansibleDir := cfg.GetAnsibleDir()
		ansibleExec, err := ansible.NewExecutor(ansibleDir)
		if err != nil {
			log.Printf("Warning: Ansible integration disabled: %v", err)
		} else {
			// Initialize execution store with shared database
			ansibleStore, err := ansible.NewExecutionStore(db)
			if err != nil {
				log.Printf("Warning: Failed to initialize Ansible execution store: %v", err)
			} else {
				ansibleExec.SetStore(ansibleStore)
				log.Printf("Ansible integration initialized with base directory: %s", ansibleDir)
				routes.AnsibleRoutes(api, ansibleExec)
				defer ansibleExec.Close() // Close executor when server shuts down
			}
		}

		// Libvirt VM management endpoints
		libvirtURI := cfg.GetLibvirtURI() // You'll need to add this to config
		libvirtService, err := libvirt.NewService(libvirtURI)
		if err != nil {
			log.Printf("Warning: Libvirt integration disabled: %v", err)
		} else {
			// Set database for backup tracking
			libvirtService.SetDatabase(db)
			log.Printf("Libvirt integration initialized with URI: %s", libvirtURI)
			routes.LibvirtRoutes(api, libvirtService)
			defer libvirtService.Close() // Close service when server shuts down
		}
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
		Addr:    cfg.GetServerAddr(),
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

func generateConfigCmd() {
	var outputPath string
	flagSet := flag.NewFlagSet("generate-config", flag.ExitOnError)
	flagSet.StringVar(&outputPath, "output", "vapor.conf", "Output path for the configuration file")
	
	if len(os.Args) > 2 {
		flagSet.Parse(os.Args[2:])
	} else {
		flagSet.Parse([]string{})
	}

	if err := config.GenerateExample(outputPath); err != nil {
		log.Fatalf("Failed to generate config file: %v", err)
	}
	fmt.Printf("Example configuration file generated at: %s\n", outputPath)
}

func printHelp() {
	fmt.Println(`Vapor System Management API Server

Usage:
  vapor [options]
  vapor --generate-config [--output <path>]

Options:
  --config <path>    Path to configuration file (default: search common locations)
  --port <port>      Server port (default: 8080)
  --appdir <path>    Application data directory (default: /var/lib/vapor)
  --generate-config  Generate an example configuration file
  --help, -h         Show this help message
  --version, -v      Show version information

Environment Variables:
  VAPOR_CONFIG       Path to configuration file
  VAPOR_PORT         Server port
  VAPOR_APPDIR       Application data directory
  VAPOR_DEBUG        Enable debug output
  JWT_SECRET         JWT secret key for authentication

Configuration File:
  The server looks for vapor.conf in the following locations (in order):
    1. Path specified by --config flag or VAPOR_CONFIG env var
    2. ./vapor.conf (current directory)
    3. ./config/vapor.conf
    4. /etc/vapor/vapor.conf
    5. /usr/local/etc/vapor/vapor.conf
    6. $HOME/.config/vapor/vapor.conf
    7. $HOME/.vapor.conf

Examples:
  # Run with default settings
  vapor

  # Run with custom config file
  vapor --config /path/to/vapor.conf

  # Run with custom port
  vapor --port 9090

  # Generate example config file
  vapor --generate-config --output /etc/vapor/vapor.conf
`)}

func getJWTSecret() string {
	if secret := os.Getenv("JWT_SECRET"); secret != "" {
		return secret
	}
	// In production, this should be a secure, randomly generated secret
	return "default-secret-change-in-production"
}
