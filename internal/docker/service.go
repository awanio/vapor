package docker

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/mux"
	"github.com/sirupsen/logrus"
	"github.com/vapor/system-api/internal/common"
)

// Service represents the Docker service
type Service struct {
	client Client
}

// NewService creates a new Docker service
func NewService(client Client) *Service {
	return &Service{client: client}
}

// RegisterRoutes registers Docker routes with the router
func (s *Service) RegisterRoutes(r *mux.Router) {
	r.HandleFunc("/docker/ps", s.listContainers).Methods("GET")
	r.HandleFunc("/docker/images", s.listImages).Methods("GET")
	r.HandleFunc("/docker/networks", s.listNetworks).Methods("GET")
	r.HandleFunc("/docker/volumes", s.listVolumes).Methods("GET")
}

func (s *Service) listContainers(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	
	// Parse query parameters
	query := r.URL.Query()
	options := ContainerListOptions{
		All:     query.Get("all") == "true",
		Running: query.Get("running") == "true",
		Size:    query.Get("size") == "true",
		Filters: query.Get("filters"),
	}
	
	// Parse limit if provided
	if limitStr := query.Get("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil {
			options.Limit = limit
		}
	}
	
	// Default to showing all containers if no specific filter is set
	if !options.Running && query.Get("all") == "" {
		options.All = true
	}
	
	containers, err := s.client.ListContainers(ctx, options)
	if err != nil {
		logrus.Errorf("failed to list containers: %v", err)
		common.RespondError(w, http.StatusServiceUnavailable, "DOCKER_ERROR", "Failed to list containers: "+err.Error())
		return
	}
	
	common.RespondSuccess(w, containers)
}

func (s *Service) listImages(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	images, err := s.client.ListImages(ctx)
	if err != nil {
		logrus.Errorf("failed to list images: %v", err)
		common.RespondError(w, http.StatusServiceUnavailable, "DOCKER_ERROR", "Failed to list images: "+err.Error())
		return
	}
	
	common.RespondSuccess(w, images)
}

func (s *Service) listNetworks(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	networks, err := s.client.ListNetworks(ctx)
	if err != nil {
		logrus.Errorf("failed to list networks: %v", err)
		common.RespondError(w, http.StatusServiceUnavailable, "DOCKER_ERROR", "Failed to list networks: "+err.Error())
		return
	}
	
	common.RespondSuccess(w, networks)
}

func (s *Service) listVolumes(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	volumes, err := s.client.ListVolumes(ctx)
	if err != nil {
		logrus.Errorf("failed to list volumes: %v", err)
		common.RespondError(w, http.StatusServiceUnavailable, "DOCKER_ERROR", "Failed to list volumes: "+err.Error())
		return
	}
	
	common.RespondSuccess(w, volumes)
}

// Gin handlers for compatibility with gin router

// ListContainersGin handles container listing for Gin router
func (s *Service) ListContainersGin(c *gin.Context) {
	ctx := c.Request.Context()
	
	// Parse query parameters
	options := ContainerListOptions{
		All:     c.Query("all") == "true",
		Running: c.Query("running") == "true",
		Size:    c.Query("size") == "true",
		Filters: c.Query("filters"),
	}
	
	// Parse limit if provided
	if limitStr := c.Query("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil {
			options.Limit = limit
		}
	}
	
	// Default to showing all containers if no specific filter is set
	if !options.Running && c.Query("all") == "" {
		options.All = true
	}
	
	containers, err := s.client.ListContainers(ctx, options)
	if err != nil {
		logrus.Errorf("failed to list containers: %v", err)
		c.JSON(http.StatusServiceUnavailable, common.ErrorResponse("DOCKER_ERROR", "Failed to list containers: "+err.Error()))
		return
	}
	
	c.JSON(http.StatusOK, common.SuccessResponse(gin.H{
		"containers": containers,
		"count":      len(containers),
	}))
}

// ListImagesGin handles image listing for Gin router
func (s *Service) ListImagesGin(c *gin.Context) {
	ctx := c.Request.Context()
	images, err := s.client.ListImages(ctx)
	if err != nil {
		logrus.Errorf("failed to list images: %v", err)
		c.JSON(http.StatusServiceUnavailable, common.ErrorResponse("DOCKER_ERROR", "Failed to list images: "+err.Error()))
		return
	}
	
	c.JSON(http.StatusOK, common.SuccessResponse(gin.H{
		"images": images,
		"count":  len(images),
	}))
}

// ListNetworksGin handles network listing for Gin router
func (s *Service) ListNetworksGin(c *gin.Context) {
	ctx := c.Request.Context()
	networks, err := s.client.ListNetworks(ctx)
	if err != nil {
		logrus.Errorf("failed to list networks: %v", err)
		c.JSON(http.StatusServiceUnavailable, common.ErrorResponse("DOCKER_ERROR", "Failed to list networks: "+err.Error()))
		return
	}
	
	c.JSON(http.StatusOK, common.SuccessResponse(gin.H{
		"networks": networks,
		"count":    len(networks),
	}))
}

// ListVolumesGin handles volume listing for Gin router
func (s *Service) ListVolumesGin(c *gin.Context) {
	ctx := c.Request.Context()
	volumes, err := s.client.ListVolumes(ctx)
	if err != nil {
		logrus.Errorf("failed to list volumes: %v", err)
		c.JSON(http.StatusServiceUnavailable, common.ErrorResponse("DOCKER_ERROR", "Failed to list volumes: "+err.Error()))
		return
	}
	
	c.JSON(http.StatusOK, common.SuccessResponse(gin.H{
		"volumes": volumes,
		"count":   len(volumes),
	}))
}

