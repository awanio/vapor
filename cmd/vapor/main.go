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

	"github.com/awanio/vapor/internal/ansible"
	"github.com/awanio/vapor/internal/auth"
	"github.com/awanio/vapor/internal/common"
	"github.com/awanio/vapor/internal/docker"
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
		ansibleDir := "/var/lib/vapor/ansible"
		if dir := os.Getenv("VAPOR_ANSIBLE_DIR"); dir != "" {
			ansibleDir = dir
		}
		ansibleExec, err := ansible.NewExecutor(ansibleDir)
		if err != nil {
			log.Printf("Warning: Ansible integration disabled: %v", err)
		} else {
			log.Printf("Ansible integration initialized with base directory: %s", ansibleDir)
			routes.AnsibleRoutes(api, ansibleExec)
			defer ansibleExec.Close() // Close executor when server shuts down
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
