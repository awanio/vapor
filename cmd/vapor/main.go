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
	"strings"
	"syscall"
	"time"

	"github.com/awanio/vapor/internal/ansible"
	"github.com/awanio/vapor/internal/auth"
	"github.com/awanio/vapor/internal/common"
	"github.com/awanio/vapor/internal/config"
	"github.com/awanio/vapor/internal/database"
	"github.com/awanio/vapor/internal/database/migrations"
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
		case "--regenerate-certs":
			regenerateCertsCmd()
			return
		case "--help", "-h":
			printHelp()
			return
		case "--version", "-v":
			fmt.Println("Vapor API v0.0.1")
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

	// Run all migrations from centralized location
	allMigrations := migrations.GetAllMigrations()
	if err := db.Migrate(allMigrations); err != nil {
		log.Fatalf("Failed to run database migrations: %v", err)
	}

	// Enforce Linux-only execution
	// NOTE: Temporarily disabled for testing on macOS
	// if runtime.GOOS != "linux" {
	// 	log.Fatalf("Error: This application requires Linux. Current OS: %s/%s", runtime.GOOS, runtime.GOARCH)
	// }

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
	// Use EnhancedService for multi-method authentication (password + SSH keys)
	authService := auth.NewEnhancedService(cfg.GetJWTSecret())

	// Public routes
	router.POST("/api/v1/auth/login", authService.EnhancedLogin)
	router.POST("/api/v1/auth/refresh", authService.RefreshToken) // Token refresh endpoint
	// Additional auth endpoints for SSH key authentication
	router.POST("/api/v1/auth/challenge", authService.CreateSSHChallenge)
	router.POST("/api/v1/auth/challenge/verify", authService.VerifySSHChallenge)
	router.GET("/api/v1/auth/users/:username/keys", authService.GetUserKeys)

	eventsHub := websocket.NewHub()

	api := router.Group("/api/v1")

	// OS info routes (osinfo-query based). These must stay available even if libvirt is unavailable.
	routes.OSInfoRoutes(api, authService)

	// Protected API routes
	// Libvirt VM management endpoints
	libvirtURI := cfg.GetLibvirtURI()
	libvirtService, err := libvirt.NewService(libvirtURI)
	if err != nil {
		log.Printf(
			"Warning: Libvirt VM management disabled. Failed to connect to libvirt at URI %s. "+
				"Install and start libvirt on this host to enable VM features. Underlying error: %v",
			libvirtURI, err,
		)
		// Register virtualization routes that explicitly report virtualization disabled
		routes.LibvirtUnavailableRoutes(api)
	} else {
		// Set database for backup tracking
		libvirtService.SetDatabase(db.DB)
		libvirtService.SetEventHub(eventsHub)
		log.Printf("Libvirt integration initialized with URI: %s", libvirtURI)

		// Start backup retention cleanup job (runs every hour)
		stopRetentionJob := libvirtService.StartBackupRetentionJob(libvirt.DefaultBackupRetentionConfig())
		defer stopRetentionJob()
		log.Println("Backup retention cleanup job started")
		routes.LibvirtRoutes(api, authService, libvirtService)
		defer libvirtService.Close() // Close service when server shuts down
	}

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
			go docker.StartEventForwarder(context.Background(), dockerClient, eventsHub)
			routes.DockerRoutesWithClient(api, dockerClient)
		}

		// Kubernetes routes
		routes.KubernetesRoutes(api, eventsHub)

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
	terminalHub := websocket.NewHub()

	go terminalHub.Run()
	go eventsHub.Run()

	// WebSocket routes
	router.GET("/ws/terminal", websocket.ServeTerminalWebSocket(terminalHub, cfg.GetJWTSecret()))
	router.GET("/ws/containers/exec", websocket.ServeContainerExecWebSocket(terminalHub, cfg.GetJWTSecret()))
	router.GET("/ws/kubernetes/pods/exec", websocket.ServePodExecWebSocket(terminalHub, cfg.GetJWTSecret()))
	router.GET("/ws/events", websocket.ServeEventsWebSocket(eventsHub, cfg.GetJWTSecret()))

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

	// Check if TLS is enabled and ensure certificates exist
	if cfg.IsTLSEnabled() {
		log.Println("TLS enabled, checking for certificates...")

		if err := cfg.EnsureTLSCertificates(); err != nil {
			log.Fatalf("Failed to ensure TLS certificates: %v", err)
		}

		certFile := cfg.GetTLSCertFile()
		keyFile := cfg.GetTLSKeyFile()

		log.Printf("Using TLS certificate: %s", certFile)
		log.Printf("Using TLS key: %s", keyFile)

		// Start HTTPS server in a goroutine
		go func() {
			if err := srv.ListenAndServeTLS(certFile, keyFile); err != nil && err != http.ErrServerClosed {
				log.Fatalf("Failed to start HTTPS server: %v", err)
			}
		}()

		log.Printf("HTTPS server started on %s", srv.Addr)
	} else {
		// Start HTTP server in a goroutine
		go func() {
			if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
				log.Fatalf("Failed to start HTTP server: %v", err)
			}
		}()

		log.Printf("HTTP server started on %s", srv.Addr)
		log.Println("WARNING: TLS is disabled. Consider enabling TLS for production use.")
	}

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("========================================")
	log.Println("Received shutdown signal, starting graceful shutdown...")
	log.Println("========================================")

	// Create shutdown context with timeout
	shutdownTimeout := 30 * time.Second
	ctx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
	defer cancel()

	// Channel to track shutdown completion
	done := make(chan error, 1)

	// Perform graceful shutdown in a goroutine
	go func() {
		log.Println("Stopping HTTP/HTTPS server...")
		if err := srv.Shutdown(ctx); err != nil {
			done <- fmt.Errorf("server shutdown failed: %w", err)
			return
		}
		log.Println("✓ HTTP/HTTPS server stopped")
		done <- nil
	}()

	// Wait for shutdown to complete or timeout
	select {
	case err := <-done:
		if err != nil {
			log.Printf("Error during shutdown: %v", err)
			log.Println("Forcing shutdown...")
			os.Exit(1)
		}
		log.Println("========================================")
		log.Println("Graceful shutdown completed successfully")
		log.Println("========================================")
	case <-ctx.Done():
		log.Printf("Shutdown timeout (%v) exceeded, forcing shutdown...", shutdownTimeout)
		log.Println("Some connections may have been terminated abruptly")
		os.Exit(1)
	}

	log.Println("Server exited")
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		if origin != "" {
			// When Allow-Credentials is true, wildcard origins are not permitted.
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			c.Writer.Header().Set("Vary", "Origin")
		} else {
			// Non-CORS request
			c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		}

		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")

		// Allow headers needed by the web UI and TUS protocol.
		c.Writer.Header().Set("Access-Control-Allow-Headers", strings.Join([]string{
			"Authorization",
			"Content-Type",
			"Content-Length",
			"Accept",
			"Accept-Encoding",
			"Origin",
			"Cache-Control",
			"Pragma",
			"X-Requested-With",
			"X-CSRF-Token",
			// TUS / resumable upload headers
			"Tus-Resumable",
			"Upload-Length",
			"Upload-Offset",
			"Upload-Metadata",
			"Upload-Defer-Length",
			"Upload-Concat",
		}, ", "))

		// Allow methods needed by the API and TUS uploads.
		c.Writer.Header().Set("Access-Control-Allow-Methods", strings.Join([]string{
			"GET",
			"POST",
			"PUT",
			"DELETE",
			"OPTIONS",
			"PATCH",
			"HEAD",
		}, ", "))

		// Expose TUS headers to the browser so the client can read Location/offsets.
		c.Writer.Header().Set("Access-Control-Expose-Headers", strings.Join([]string{
			"Location",
			"Tus-Resumable",
			"Upload-Length",
			"Upload-Offset",
			"Upload-Metadata",
			"Upload-Expires",
			"Upload-Defer-Length",
			"Upload-Concat",
		}, ", "))

		// Cache preflight response
		c.Writer.Header().Set("Access-Control-Max-Age", "86400")

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
	fmt.Print(`Vapor System Management API Server

Usage:
  vapor [options]
  vapor --generate-config [--output <path>]
  vapor --regenerate-certs

Options:
  --config <path>    Path to configuration file (default: search common locations)
  --port <port>      Server port (default: 8080)
  --appdir <path>    Application data directory (default: /var/lib/vapor)
  --generate-config  Generate an example configuration file
  --regenerate-certs  Regenerate TLS certificates (or create new if not exists)
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
`)
}

// regenerateCertsCmd regenerates TLS certificates
func regenerateCertsCmd() {
	fmt.Println("Vapor - Regenerate TLS Certificates")
	fmt.Println("====================================")
	fmt.Println()

	// Remove the special command from os.Args so flag.Parse() works
	os.Args = append(os.Args[:1], os.Args[2:]...)
	// Load configuration to get certificate paths
	cfg, err := config.Load()
	if err != nil {
		fmt.Printf("Error: Failed to load configuration: %v\n", err)
		os.Exit(1)
	}

	certFile := cfg.GetTLSCertFile()
	keyFile := cfg.GetTLSKeyFile()
	certDir := cfg.GetTLSCertDir()

	fmt.Printf("Certificate directory: %s\n", certDir)
	fmt.Printf("Certificate file:      %s\n", certFile)
	fmt.Printf("Key file:              %s\n", keyFile)
	fmt.Println()

	// Check if certificates already exist
	certExists := fileExists(certFile)
	keyExists := fileExists(keyFile)

	if certExists || keyExists {
		fmt.Println("⚠️  Existing certificates found:")
		if certExists {
			fmt.Printf("   - %s\n", certFile)
		}
		if keyExists {
			fmt.Printf("   - %s\n", keyFile)
		}
		fmt.Println()
		fmt.Print("Do you want to overwrite them? (yes/no): ")

		var response string
		fmt.Scanln(&response)

		if response != "yes" && response != "y" {
			fmt.Println("\nOperation cancelled.")
			return
		}

		// Remove existing certificates
		if certExists {
			if err := os.Remove(certFile); err != nil {
				fmt.Printf("Error: Failed to remove old certificate: %v\n", err)
				os.Exit(1)
			}
		}
		if keyExists {
			if err := os.Remove(keyFile); err != nil {
				fmt.Printf("Error: Failed to remove old key: %v\n", err)
				os.Exit(1)
			}
		}
		fmt.Println("\n✓ Old certificates removed")
	}

	// Generate new certificates
	fmt.Println("\nGenerating new TLS certificates...")
	if err := cfg.EnsureTLSCertificates(); err != nil {
		fmt.Printf("Error: Failed to generate certificates: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("\n✓ TLS certificates generated successfully!")
	fmt.Println()
	fmt.Println("Certificate details:")
	fmt.Printf("  Location:  %s\n", certDir)
	fmt.Printf("  Cert file: %s\n", certFile)
	fmt.Printf("  Key file:  %s\n", keyFile)
	fmt.Printf("  Valid for: 3 years\n")
	fmt.Println()
	fmt.Println("To use these certificates, ensure your vapor.conf has:")
	fmt.Println("  tls_enabled: true")
	fmt.Println()
	fmt.Println("Then restart the Vapor service:")
	fmt.Println("  sudo systemctl restart vapor")
	fmt.Println()
}

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}
