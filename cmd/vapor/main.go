package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"runtime"
	"syscall"
	"time"

	"github.com/awanio/vapor/internal/auth"
	"github.com/awanio/vapor/internal/common"
	"github.com/awanio/vapor/internal/container"
	"github.com/awanio/vapor/internal/docker"
	"github.com/awanio/vapor/internal/helm"
	"github.com/awanio/vapor/internal/kubernetes"
	"github.com/awanio/vapor/internal/logs"
	"github.com/awanio/vapor/internal/network"
	"github.com/awanio/vapor/internal/storage"
	"github.com/awanio/vapor/internal/system"
	"github.com/awanio/vapor/internal/users"
	"github.com/awanio/vapor/internal/web"
	"github.com/awanio/vapor/internal/websocket"
	"github.com/gin-gonic/gin"
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
		api.DELETE("/storage/raid/destroy", storageService.DestroyRAIDDevice)

		// Container management endpoints (for containerd and CRI-O)
		containerService, err := container.NewService()
		if err != nil {
			log.Printf("Error initializing container service: %v", err)
		} else {
			// Register container routes for containerd and CRI-O
			api.GET("/containers", containerService.ListContainers)
			api.GET("/images", containerService.ListImages)
			api.GET("/containers/:id", containerService.GetContainer)
			api.GET("/containers/:id/logs", containerService.GetContainerLogs)
			api.GET("/images/:id", containerService.GetImage)
			api.POST("/images/import", containerService.ImportImage)
		}

		// Docker service (separate from container service)
		dockerClient, err := docker.NewClient()
		if err != nil {
			log.Printf("Warning: Failed to create Docker client: %v", err)
		} else {
			dockerService := docker.NewService(dockerClient)
			defer dockerClient.Close() // Close client when server shuts down

			// Register Docker routes
			api.GET("/docker/ps", dockerService.ListContainersGin)
			api.GET("/docker/images", dockerService.ListImagesGin)
			api.GET("/docker/networks", dockerService.ListNetworksGin)
			api.GET("/docker/volumes", dockerService.ListVolumesGin)

			// Container creation and image pulling
			api.POST("/docker/containers", dockerService.CreateContainerGin)
			api.POST("/docker/images/pull", dockerService.PullImageGin)
			api.POST("/docker/images/import", dockerService.ImportImageGin)

			// Container detail and actions
			api.GET("/docker/containers/:id", dockerService.GetContainerDetailGin)
			api.DELETE("/docker/containers/:id", dockerService.RemoveContainerGin)
			api.POST("/docker/containers/:id/start", dockerService.StartContainerGin)
			api.POST("/docker/containers/:id/stop", dockerService.StopContainerGin)
			api.POST("/docker/containers/:id/kill", dockerService.KillContainerGin)
			api.GET("/docker/containers/:id/logs", dockerService.GetContainerLogsGin)

			// Resource deletion
			api.DELETE("/docker/images/:id", dockerService.RemoveImageGin)
			api.DELETE("/docker/volumes/:id", dockerService.RemoveVolumeGin)
			api.DELETE("/docker/networks/:id", dockerService.RemoveNetworkGin)
		}

	// Kubernetes service
	fmt.Printf("[DEBUG] Attempting to create Kubernetes service...\n")
	kubernetesService, err := kubernetes.NewService()
	if err != nil {
		fmt.Printf("[ERROR] Failed to create Kubernetes service: %v\n", err)
		log.Printf("Warning: Kubernetes service not available: %v", err)
		// Register Kubernetes routes with NoKubernetesHandler
			noK8sHandler := kubernetes.NoKubernetesHandler()
			api.GET("/kubernetes/crds", noK8sHandler)
			api.GET("/kubernetes/crds/:name", noK8sHandler)
			api.GET("/kubernetes/crds/:name/list", noK8sHandler)
			api.GET("/kubernetes/crds/:name/detail/:namespace/:object-name", noK8sHandler)
			api.GET("/kubernetes/pods", noK8sHandler)
			api.GET("/kubernetes/pods/:namespace/:name", noK8sHandler)
			api.GET("/kubernetes/pods/:namespace/:name/logs", noK8sHandler)
			api.DELETE("/kubernetes/pods/:namespace/:name", noK8sHandler)
			api.POST("/kubernetes/pods", noK8sHandler)
			api.PUT("/kubernetes/pods/:namespace/:name", noK8sHandler)
			api.GET("/kubernetes/deployments", noK8sHandler)
			api.GET("/kubernetes/deployments/:namespace/:name", noK8sHandler)
			api.POST("/kubernetes/deployments", noK8sHandler)
			api.PUT("/kubernetes/deployments/:namespace/:name", noK8sHandler)
			api.DELETE("/kubernetes/deployments/:namespace/:name", noK8sHandler)
			api.GET("/kubernetes/services", noK8sHandler)
			api.GET("/kubernetes/services/:namespace/:name", noK8sHandler)
			api.POST("/kubernetes/services", noK8sHandler)
			api.PUT("/kubernetes/services/:namespace/:name", noK8sHandler)
			api.DELETE("/kubernetes/services/:namespace/:name", noK8sHandler)
			api.GET("/kubernetes/ingresses", noK8sHandler)
			api.GET("/kubernetes/ingresses/:namespace/:name", noK8sHandler)
			api.POST("/kubernetes/ingresses", noK8sHandler)
			api.PUT("/kubernetes/ingresses/:namespace/:name", noK8sHandler)
			api.DELETE("/kubernetes/ingresses/:namespace/:name", noK8sHandler)
			api.GET("/kubernetes/pvcs", noK8sHandler)
			api.GET("/kubernetes/pvcs/:namespace/:name", noK8sHandler)
			api.POST("/kubernetes/pvcs", noK8sHandler)
			api.PUT("/kubernetes/pvcs/:namespace/:name", noK8sHandler)
			api.DELETE("/kubernetes/pvcs/:namespace/:name", noK8sHandler)
			api.GET("/kubernetes/pvs", noK8sHandler)
			api.GET("/kubernetes/pvs/:name", noK8sHandler)
			api.POST("/kubernetes/pvs", noK8sHandler)
			api.PUT("/kubernetes/pvs/:name", noK8sHandler)
			api.DELETE("/kubernetes/pvs/:name", noK8sHandler)
			api.GET("/kubernetes/secrets", noK8sHandler)
			api.GET("/kubernetes/secrets/:namespace/:name", noK8sHandler)
			api.POST("/kubernetes/secrets", noK8sHandler)
			api.PUT("/kubernetes/secrets/:namespace/:name", noK8sHandler)
			api.DELETE("/kubernetes/secrets/:namespace/:name", noK8sHandler)
			api.GET("/kubernetes/configmaps", noK8sHandler)
			api.GET("/kubernetes/configmaps/:namespace/:name", noK8sHandler)
			api.POST("/kubernetes/configmaps", noK8sHandler)
			api.PUT("/kubernetes/configmaps/:namespace/:name", noK8sHandler)
			api.DELETE("/kubernetes/configmaps/:namespace/:name", noK8sHandler)
			api.GET("/kubernetes/namespaces", noK8sHandler)
			api.GET("/kubernetes/namespaces/:name", noK8sHandler)
			api.POST("/kubernetes/namespaces", noK8sHandler)
			api.PUT("/kubernetes/namespaces/:name", noK8sHandler)
			api.DELETE("/kubernetes/namespaces/:name", noK8sHandler)
			api.GET("/kubernetes/nodes", noK8sHandler)
			api.GET("/kubernetes/nodes/:name", noK8sHandler)
			api.GET("/kubernetes/daemonsets", noK8sHandler)
			api.GET("/kubernetes/daemonsets/:namespace/:name", noK8sHandler)
			api.POST("/kubernetes/daemonsets", noK8sHandler)
			api.PUT("/kubernetes/daemonsets/:namespace/:name", noK8sHandler)
			api.DELETE("/kubernetes/daemonsets/:namespace/:name", noK8sHandler)
			api.GET("/kubernetes/statefulsets", noK8sHandler)
			api.GET("/kubernetes/statefulsets/:namespace/:name", noK8sHandler)
			api.POST("/kubernetes/statefulsets", noK8sHandler)
			api.PUT("/kubernetes/statefulsets/:namespace/:name", noK8sHandler)
			api.DELETE("/kubernetes/statefulsets/:namespace/:name", noK8sHandler)
			api.GET("/kubernetes/jobs", noK8sHandler)
			api.GET("/kubernetes/jobs/:namespace/:name", noK8sHandler)
			api.POST("/kubernetes/jobs", noK8sHandler)
			api.PUT("/kubernetes/jobs/:namespace/:name", noK8sHandler)
			api.DELETE("/kubernetes/jobs/:namespace/:name", noK8sHandler)
			api.GET("/kubernetes/cronjobs", noK8sHandler)
			api.GET("/kubernetes/cronjobs/:namespace/:name", noK8sHandler)
			api.POST("/kubernetes/cronjobs", noK8sHandler)
			api.PUT("/kubernetes/cronjobs/:namespace/:name", noK8sHandler)
			api.DELETE("/kubernetes/cronjobs/:namespace/:name", noK8sHandler)
			api.GET("/kubernetes/cluster-info", noK8sHandler)
			api.GET("/kubernetes/ingressclasses", noK8sHandler)
			api.GET("/kubernetes/ingressclasses/:name", noK8sHandler)
			api.DELETE("/kubernetes/ingressclasses/:name", noK8sHandler)
			api.POST("/kubernetes/ingressclasses", noK8sHandler)
			api.PUT("/kubernetes/ingressclasses/:name", noK8sHandler)
			api.GET("/kubernetes/networkpolicies", noK8sHandler)
			api.GET("/kubernetes/networkpolicies/:namespace/:name", noK8sHandler)
			api.DELETE("/kubernetes/networkpolicies/:namespace/:name", noK8sHandler)
			api.POST("/kubernetes/networkpolicies", noK8sHandler)
			api.PUT("/kubernetes/networkpolicies/:namespace/:name", noK8sHandler)

			// Helm routes with NoHelmHandler
			noHelmHandler := helm.NoHelmHandler()
				api.GET("/kubernetes/helm/releases", noHelmHandler)
				api.GET("/kubernetes/helm/charts", noHelmHandler)
				api.GET("/kubernetes/helm/repositories", noHelmHandler)
			api.PUT("/kubernetes/helm/repositories/:name/update", noHelmHandler)
		} else {
			fmt.Printf("[DEBUG] Successfully created Kubernetes service\n")
			log.Printf("Kubernetes service initialized successfully")
			// Register Kubernetes routes
			k8sHandler := kubernetes.NewHandler(kubernetesService)
			api.GET("/kubernetes/crds", k8sHandler.ListCRDsGin)
			api.GET("/kubernetes/crds/:name", k8sHandler.GetCRDDetailGin)
			api.GET("/kubernetes/crds/:name/list", k8sHandler.ListCRDObjectsGin)
			api.GET("/kubernetes/crds/:name/detail/:namespace/:object-name", k8sHandler.GetCRDObjectDetailGin)
			api.GET("/kubernetes/pods", k8sHandler.ListPodsGin)
			api.GET("/kubernetes/pods/:namespace/:name", k8sHandler.GetPodDetailGin)
			api.GET("/kubernetes/pods/:namespace/:name/logs", k8sHandler.GetPodLogsGin)
			api.DELETE("/kubernetes/pods/:namespace/:name", k8sHandler.DeletePodGin)
			api.POST("/kubernetes/pods", k8sHandler.ApplyPodGin)
			api.PUT("/kubernetes/pods/:namespace/:name", k8sHandler.UpdatePodGin)
			api.GET("/kubernetes/deployments", k8sHandler.ListDeploymentsGin)
			api.GET("/kubernetes/deployments/:namespace/:name", k8sHandler.GetDeploymentDetailGin)
			api.POST("/kubernetes/deployments", k8sHandler.ApplyDeploymentGin)
			api.PUT("/kubernetes/deployments/:namespace/:name", k8sHandler.UpdateDeploymentGin)
			api.DELETE("/kubernetes/deployments/:namespace/:name", k8sHandler.DeleteDeploymentGin)
			api.GET("/kubernetes/services", k8sHandler.ListServicesGin)
			api.GET("/kubernetes/services/:namespace/:name", k8sHandler.GetServiceDetailGin)
			api.POST("/kubernetes/services", k8sHandler.ApplyServiceGin)
			api.PUT("/kubernetes/services/:namespace/:name", k8sHandler.UpdateServiceGin)
			api.DELETE("/kubernetes/services/:namespace/:name", k8sHandler.DeleteServiceGin)
			api.GET("/kubernetes/ingresses", k8sHandler.ListIngressesGin)
			api.GET("/kubernetes/ingresses/:namespace/:name", k8sHandler.GetIngressDetailGin)
			api.POST("/kubernetes/ingresses", k8sHandler.ApplyIngressGin)
			api.PUT("/kubernetes/ingresses/:namespace/:name", k8sHandler.UpdateIngressGin)
			api.DELETE("/kubernetes/ingresses/:namespace/:name", k8sHandler.DeleteIngressGin)
			api.GET("/kubernetes/pvcs", k8sHandler.ListPVCsGin)
			api.GET("/kubernetes/pvcs/:namespace/:name", k8sHandler.GetPVCDetailGin)
			api.POST("/kubernetes/pvcs", k8sHandler.ApplyPVCGin)
			api.PUT("/kubernetes/pvcs/:namespace/:name", k8sHandler.UpdatePVCGin)
			api.DELETE("/kubernetes/pvcs/:namespace/:name", k8sHandler.DeletePVCGin)
			api.GET("/kubernetes/pvs", k8sHandler.ListPVsGin)
			api.GET("/kubernetes/pvs/:name", k8sHandler.GetPVDetailGin)
			api.POST("/kubernetes/pvs", k8sHandler.ApplyPVGin)
			api.PUT("/kubernetes/pvs/:name", k8sHandler.UpdatePVGin)
			api.DELETE("/kubernetes/pvs/:name", k8sHandler.DeletePVGin)
			api.GET("/kubernetes/secrets", k8sHandler.ListSecretsGin)
			api.GET("/kubernetes/secrets/:namespace/:name", k8sHandler.GetSecretDetailGin)
			api.POST("/kubernetes/secrets", k8sHandler.ApplySecretGin)
			api.PUT("/kubernetes/secrets/:namespace/:name", k8sHandler.UpdateSecretGin)
			api.DELETE("/kubernetes/secrets/:namespace/:name", k8sHandler.DeleteSecretGin)
			api.GET("/kubernetes/configmaps", k8sHandler.ListConfigMapsGin)
			api.GET("/kubernetes/configmaps/:namespace/:name", k8sHandler.GetConfigMapDetailGin)
			api.POST("/kubernetes/configmaps", k8sHandler.ApplyConfigMapGin)
			api.PUT("/kubernetes/configmaps/:namespace/:name", k8sHandler.UpdateConfigMapGin)
			api.DELETE("/kubernetes/configmaps/:namespace/:name", k8sHandler.DeleteConfigMapGin)
			api.GET("/kubernetes/namespaces", k8sHandler.ListNamespacesGin)
			api.GET("/kubernetes/namespaces/:name", k8sHandler.GetNamespaceDetailGin)
			api.POST("/kubernetes/namespaces", k8sHandler.ApplyNamespaceGin)
			api.PUT("/kubernetes/namespaces/:name", k8sHandler.UpdateNamespaceGin)
			api.DELETE("/kubernetes/namespaces/:name", k8sHandler.DeleteNamespaceGin)
			api.GET("/kubernetes/nodes", k8sHandler.ListNodesGin)
			api.GET("/kubernetes/nodes/:name", k8sHandler.GetNodeDetailGin)
			api.GET("/kubernetes/daemonsets", k8sHandler.ListDaemonSetsGin)
			api.GET("/kubernetes/daemonsets/:namespace/:name", k8sHandler.GetDaemonSetDetailGin)
			api.POST("/kubernetes/daemonsets", k8sHandler.ApplyDaemonSetGin)
			api.PUT("/kubernetes/daemonsets/:namespace/:name", k8sHandler.UpdateDaemonSetGin)
			api.DELETE("/kubernetes/daemonsets/:namespace/:name", k8sHandler.DeleteDaemonSetGin)
			api.GET("/kubernetes/statefulsets", k8sHandler.ListStatefulSetsGin)
			api.GET("/kubernetes/statefulsets/:namespace/:name", k8sHandler.GetStatefulSetDetailGin)
			api.POST("/kubernetes/statefulsets", k8sHandler.ApplyStatefulSetGin)
			api.PUT("/kubernetes/statefulsets/:namespace/:name", k8sHandler.UpdateStatefulSetGin)
			api.DELETE("/kubernetes/statefulsets/:namespace/:name", k8sHandler.DeleteStatefulSetGin)
			api.GET("/kubernetes/jobs", k8sHandler.ListJobsGin)
			api.GET("/kubernetes/jobs/:namespace/:name", k8sHandler.GetJobDetailGin)
			api.POST("/kubernetes/jobs", k8sHandler.ApplyJobGin)
			api.PUT("/kubernetes/jobs/:namespace/:name", k8sHandler.UpdateJobGin)
			api.DELETE("/kubernetes/jobs/:namespace/:name", k8sHandler.DeleteJobGin)
			api.GET("/kubernetes/cronjobs", k8sHandler.ListCronJobsGin)
			api.GET("/kubernetes/cronjobs/:namespace/:name", k8sHandler.GetCronJobDetailGin)
			api.POST("/kubernetes/cronjobs", k8sHandler.ApplyCronJobGin)
			api.PUT("/kubernetes/cronjobs/:namespace/:name", k8sHandler.UpdateCronJobGin)
			api.DELETE("/kubernetes/cronjobs/:namespace/:name", k8sHandler.DeleteCronJobGin)
			api.GET("/kubernetes/cluster-info", k8sHandler.GetClusterInfoGin)

			// IngressClass routes
			api.GET("/kubernetes/ingressclasses", k8sHandler.ListIngressClassesGin)
			api.GET("/kubernetes/ingressclasses/:name", k8sHandler.GetIngressClassDetailGin)
			api.DELETE("/kubernetes/ingressclasses/:name", k8sHandler.DeleteIngressClassGin)
			api.POST("/kubernetes/ingressclasses", k8sHandler.ApplyIngressClassGin)
			api.PUT("/kubernetes/ingressclasses/:name", k8sHandler.UpdateIngressClassGin)

			// NetworkPolicy routes
			api.GET("/kubernetes/networkpolicies", k8sHandler.ListNetworkPoliciesGin)
			api.GET("/kubernetes/networkpolicies/:namespace/:name", k8sHandler.GetNetworkPolicyDetailGin)
			api.DELETE("/kubernetes/networkpolicies/:namespace/:name", k8sHandler.DeleteNetworkPolicyGin)
			api.POST("/kubernetes/networkpolicies", k8sHandler.ApplyNetworkPolicyGin)
			api.PUT("/kubernetes/networkpolicies/:namespace/:name", k8sHandler.UpdateNetworkPolicyGin)

			// Helm service
			helmService, err := helm.NewService(kubernetesService)
			if err != nil {
				log.Printf("Warning: Helm service not available: %v", err)
				noHelmHandler := helm.NoHelmHandler()
				api.GET("/kubernetes/helm/releases", noHelmHandler)
				api.GET("/kubernetes/helm/charts", noHelmHandler)
				api.GET("/kubernetes/helm/repositories", noHelmHandler)
				api.PUT("/kubernetes/helm/repositories/:name/update", noHelmHandler)
			} else {
				helmHandler := helm.NewServiceHandler(helmService)
				api.GET("/kubernetes/helm/releases", helmHandler.ListReleasesGin)
				api.GET("/kubernetes/helm/charts", helmHandler.ListChartsGin)
				api.GET("/kubernetes/helm/repositories", helmHandler.ListRepositoriesGin)
				api.PUT("/kubernetes/helm/repositories/:name/update", helmHandler.UpdateRepositoryGin)
			}
		}

		// User management endpoints
		userService := users.NewService()
		api.GET("/users", userService.GetUsers)
		api.POST("/users", userService.CreateUser)
		api.PUT("/users/:username", userService.UpdateUser)
		api.DELETE("/users/:username", userService.DeleteUser)
		api.POST("/users/:username/reset-password", userService.ResetPassword)

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
