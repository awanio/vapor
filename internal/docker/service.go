package docker

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/network"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/mux"
	"github.com/sirupsen/logrus"
	"github.com/awanio/vapor/internal/common"
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
	r.HandleFunc("/docker/containers", s.createContainer).Methods("POST")
	r.HandleFunc("/docker/images/pull", s.pullImage).Methods("POST")
	r.HandleFunc("/docker/ps", s.listContainers).Methods("GET")
	r.HandleFunc("/docker/images", s.listImages).Methods("GET")
	r.HandleFunc("/docker/networks", s.listNetworks).Methods("GET")
	r.HandleFunc("/docker/volumes", s.listVolumes).Methods("GET")
	
	// Container detail and actions
	r.HandleFunc("/docker/containers/{id}", s.getContainerDetail).Methods("GET")
	r.HandleFunc("/docker/containers/{id}", s.removeContainer).Methods("DELETE")
	r.HandleFunc("/docker/containers/{id}/start", s.startContainer).Methods("POST")
	r.HandleFunc("/docker/containers/{id}/stop", s.stopContainer).Methods("POST")
	r.HandleFunc("/docker/containers/{id}/kill", s.killContainer).Methods("POST")
	r.HandleFunc("/docker/containers/{id}/logs", s.getContainerLogs).Methods("GET")
	
	// Resource deletion
	r.HandleFunc("/docker/images/{id}", s.removeImage).Methods("DELETE")
	r.HandleFunc("/docker/volumes/{id}", s.removeVolume).Methods("DELETE")
	r.HandleFunc("/docker/networks/{id}", s.removeNetwork).Methods("DELETE")
}

func (s *Service) getContainerDetail(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	vars := mux.Vars(r)
	containerID := vars["id"]

	container, err := s.client.ContainerDetail(ctx, containerID)
	if err != nil {
		logrus.Errorf("failed to get container detail: %v", err)
		common.RespondError(w, http.StatusNotFound, "CONTAINER_NOT_FOUND", "Failed to get container detail: "+err.Error())
		return
	}

	common.RespondSuccess(w, container)
}

func (s *Service) startContainer(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	vars := mux.Vars(r)
	containerID := vars["id"]

	err := s.client.StartContainer(ctx, containerID)
	if err != nil {
		logrus.Errorf("failed to start container: %v", err)
		common.RespondError(w, http.StatusInternalServerError, "START_CONTAINER_FAILED", "Failed to start container: "+err.Error())
		return
	}

	common.RespondSuccess(w, ContainerActionResponse{ContainerID: containerID, Action: "start", Message: "Container started successfully", Success: true})
}

func (s *Service) stopContainer(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	vars := mux.Vars(r)
	containerID := vars["id"]

	err := s.client.StopContainer(ctx, containerID)
	if err != nil {
		logrus.Errorf("failed to stop container: %v", err)
		common.RespondError(w, http.StatusInternalServerError, "STOP_CONTAINER_FAILED", "Failed to stop container: "+err.Error())
		return
	}

	common.RespondSuccess(w, ContainerActionResponse{ContainerID: containerID, Action: "stop", Message: "Container stopped successfully", Success: true})
}

func (s *Service) killContainer(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	vars := mux.Vars(r)
	containerID := vars["id"]

	err := s.client.KillContainer(ctx, containerID)
	if err != nil {
		logrus.Errorf("failed to kill container: %v", err)
		common.RespondError(w, http.StatusInternalServerError, "KILL_CONTAINER_FAILED", "Failed to kill container: "+err.Error())
		return
	}

	common.RespondSuccess(w, ContainerActionResponse{ContainerID: containerID, Action: "kill", Message: "Container killed successfully", Success: true})
}

func (s *Service) removeContainer(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	vars := mux.Vars(r)
	containerID := vars["id"]

	err := s.client.RemoveContainer(ctx, containerID)
	if err != nil {
		logrus.Errorf("failed to remove container: %v", err)
		common.RespondError(w, http.StatusInternalServerError, "REMOVE_CONTAINER_FAILED", "Failed to remove container: "+err.Error())
		return
	}

	common.RespondSuccess(w, ContainerActionResponse{ContainerID: containerID, Action: "remove", Message: "Container removed successfully", Success: true})
}

func (s *Service) getContainerLogs(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	vars := mux.Vars(r)
	containerID := vars["id"]

	logs, err := s.client.ContainerLogs(ctx, containerID)
	if err != nil {
		logrus.Errorf("failed to get container logs: %v", err)
		common.RespondError(w, http.StatusInternalServerError, "GET_LOGS_FAILED", "Failed to get container logs: "+err.Error())
		return
	}

	common.RespondSuccess(w, ContainerLogsResponse{ContainerID: containerID, Logs: logs})
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

func (s *Service) removeImage(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	vars := mux.Vars(r)
	imageID := vars["id"]

	err := s.client.RemoveImage(ctx, imageID)
	if err != nil {
		logrus.Errorf("failed to remove image: %v", err)
		common.RespondError(w, http.StatusInternalServerError, "REMOVE_IMAGE_FAILED", "Failed to remove image: "+err.Error())
		return
	}

	common.RespondSuccess(w, ImageActionResponse{ImageID: imageID, Action: "remove", Message: "Image removed successfully", Success: true})
}

func (s *Service) removeVolume(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	vars := mux.Vars(r)
	volumeID := vars["id"]

	err := s.client.RemoveVolume(ctx, volumeID)
	if err != nil {
		logrus.Errorf("failed to remove volume: %v", err)
		common.RespondError(w, http.StatusInternalServerError, "REMOVE_VOLUME_FAILED", "Failed to remove volume: "+err.Error())
		return
	}

	common.RespondSuccess(w, VolumeActionResponse{VolumeID: volumeID, Action: "remove", Message: "Volume removed successfully", Success: true})
}

func (s *Service) createContainer(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var req ContainerCreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logrus.Errorf("failed to decode request: %v", err)
		common.RespondError(w, http.StatusBadRequest, "INVALID_REQUEST", "Failed to decode request: "+err.Error())
		return
	}

	containerConfig := container.Config{
		Image: req.Image,
		Cmd:   req.Cmd,
		Env:   req.Env,
	}

	hostConfig := container.HostConfig{}
	networkConfig := network.NetworkingConfig{}

	containerID, err := s.client.CreateContainer(ctx, containerConfig, hostConfig, networkConfig, req.Name)
	if err != nil {
		logrus.Errorf("failed to create container: %v", err)
		common.RespondError(w, http.StatusInternalServerError, "CREATE_CONTAINER_FAILED", "Failed to create container: "+err.Error())
		return
	}

	common.RespondSuccess(w, ContainerCreateResponse{ContainerID: containerID, Message: "Container created successfully", Success: true})
}

func (s *Service) pullImage(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var req ImagePullRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logrus.Errorf("failed to decode request: %v", err)
		common.RespondError(w, http.StatusBadRequest, "INVALID_REQUEST", "Failed to decode request: "+err.Error())
		return
	}

	imageRef := req.ImageName
	if req.Tag != "" {
		imageRef = fmt.Sprintf("%s:%s", req.ImageName, req.Tag)
	}

	err := s.client.PullImage(ctx, imageRef)
	if err != nil {
		logrus.Errorf("failed to pull image: %v", err)
		common.RespondError(w, http.StatusInternalServerError, "PULL_IMAGE_FAILED", "Failed to pull image: "+err.Error())
		return
	}

	common.RespondSuccess(w, ImagePullResponse{ImageName: req.ImageName, Message: "Image pulled successfully", Success: true})
}

func (s *Service) removeNetwork(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	vars := mux.Vars(r)
	networkID := vars["id"]

	err := s.client.RemoveNetwork(ctx, networkID)
	if err != nil {
		logrus.Errorf("failed to remove network: %v", err)
		common.RespondError(w, http.StatusInternalServerError, "REMOVE_NETWORK_FAILED", "Failed to remove network: "+err.Error())
		return
	}

	common.RespondSuccess(w, NetworkActionResponse{NetworkID: networkID, Action: "remove", Message: "Network removed successfully", Success: true})
}

// GetContainerDetailGin handles container detail for Gin router
func (s *Service) GetContainerDetailGin(c *gin.Context) {
	ctx := c.Request.Context()
	containerID := c.Param("id")

	container, err := s.client.ContainerDetail(ctx, containerID)
	if err != nil {
		logrus.Errorf("failed to get container detail: %v", err)
		c.JSON(http.StatusNotFound, common.ErrorResponse("CONTAINER_NOT_FOUND", "Failed to get container detail: "+err.Error()))
		return
	}

	c.JSON(http.StatusOK, common.SuccessResponse(container))
}

// StartContainerGin handles container start for Gin router
func (s *Service) StartContainerGin(c *gin.Context) {
	ctx := c.Request.Context()
	containerID := c.Param("id")

	err := s.client.StartContainer(ctx, containerID)
	if err != nil {
		logrus.Errorf("failed to start container: %v", err)
		c.JSON(http.StatusInternalServerError, common.ErrorResponse("START_CONTAINER_FAILED", "Failed to start container: "+err.Error()))
		return
	}

	c.JSON(http.StatusOK, common.SuccessResponse(ContainerActionResponse{
		ContainerID: containerID, 
		Action: "start", 
		Message: "Container started successfully", 
		Success: true,
	}))
}

// StopContainerGin handles container stop for Gin router
func (s *Service) StopContainerGin(c *gin.Context) {
	ctx := c.Request.Context()
	containerID := c.Param("id")

	err := s.client.StopContainer(ctx, containerID)
	if err != nil {
		logrus.Errorf("failed to stop container: %v", err)
		c.JSON(http.StatusInternalServerError, common.ErrorResponse("STOP_CONTAINER_FAILED", "Failed to stop container: "+err.Error()))
		return
	}

	c.JSON(http.StatusOK, common.SuccessResponse(ContainerActionResponse{
		ContainerID: containerID, 
		Action: "stop", 
		Message: "Container stopped successfully", 
		Success: true,
	}))
}

// KillContainerGin handles container kill for Gin router
func (s *Service) KillContainerGin(c *gin.Context) {
	ctx := c.Request.Context()
	containerID := c.Param("id")

	err := s.client.KillContainer(ctx, containerID)
	if err != nil {
		logrus.Errorf("failed to kill container: %v", err)
		c.JSON(http.StatusInternalServerError, common.ErrorResponse("KILL_CONTAINER_FAILED", "Failed to kill container: "+err.Error()))
		return
	}

	c.JSON(http.StatusOK, common.SuccessResponse(ContainerActionResponse{
		ContainerID: containerID, 
		Action: "kill", 
		Message: "Container killed successfully", 
		Success: true,
	}))
}

// RemoveContainerGin handles container removal for Gin router
func (s *Service) RemoveContainerGin(c *gin.Context) {
	ctx := c.Request.Context()
	containerID := c.Param("id")

	err := s.client.RemoveContainer(ctx, containerID)
	if err != nil {
		logrus.Errorf("failed to remove container: %v", err)
		c.JSON(http.StatusInternalServerError, common.ErrorResponse("REMOVE_CONTAINER_FAILED", "Failed to remove container: "+err.Error()))
		return
	}

	c.JSON(http.StatusOK, common.SuccessResponse(ContainerActionResponse{
		ContainerID: containerID, 
		Action: "remove", 
		Message: "Container removed successfully", 
		Success: true,
	}))
}

// GetContainerLogsGin handles container logs for Gin router
func (s *Service) GetContainerLogsGin(c *gin.Context) {
	ctx := c.Request.Context()
	containerID := c.Param("id")

	logs, err := s.client.ContainerLogs(ctx, containerID)
	if err != nil {
		logrus.Errorf("failed to get container logs: %v", err)
		c.JSON(http.StatusInternalServerError, common.ErrorResponse("GET_LOGS_FAILED", "Failed to get container logs: "+err.Error()))
		return
	}

	c.JSON(http.StatusOK, common.SuccessResponse(ContainerLogsResponse{
		ContainerID: containerID, 
		Logs: logs,
	}))
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

// RemoveImageGin handles image removal for Gin router
func (s *Service) RemoveImageGin(c *gin.Context) {
	ctx := c.Request.Context()
	imageID := c.Param("id")

	err := s.client.RemoveImage(ctx, imageID)
	if err != nil {
		logrus.Errorf("failed to remove image: %v", err)
		c.JSON(http.StatusInternalServerError, common.ErrorResponse("REMOVE_IMAGE_FAILED", "Failed to remove image: "+err.Error()))
		return
	}

	c.JSON(http.StatusOK, common.SuccessResponse(ImageActionResponse{
		ImageID: imageID,
		Action:  "remove",
		Message: "Image removed successfully",
		Success: true,
	}))
}

// RemoveVolumeGin handles volume removal for Gin router
func (s *Service) RemoveVolumeGin(c *gin.Context) {
	ctx := c.Request.Context()
	volumeID := c.Param("id")

	err := s.client.RemoveVolume(ctx, volumeID)
	if err != nil {
		logrus.Errorf("failed to remove volume: %v", err)
		c.JSON(http.StatusInternalServerError, common.ErrorResponse("REMOVE_VOLUME_FAILED", "Failed to remove volume: "+err.Error()))
		return
	}

	c.JSON(http.StatusOK, common.SuccessResponse(VolumeActionResponse{
		VolumeID: volumeID,
		Action:   "remove",
		Message:  "Volume removed successfully",
		Success:  true,
	}))
}

// CreateContainerGin handles container creation for Gin router
func (s *Service) CreateContainerGin(c *gin.Context) {
	ctx := c.Request.Context()
	var req ContainerCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logrus.Errorf("failed to decode request: %v", err)
		c.JSON(http.StatusBadRequest, common.ErrorResponse("INVALID_REQUEST", "Failed to decode request: "+err.Error()))
		return
	}

	containerConfig := container.Config{
		Image: req.Image,
		Cmd:   req.Cmd,
		Env:   req.Env,
	}

	hostConfig := container.HostConfig{}
	networkConfig := network.NetworkingConfig{}

	containerID, err := s.client.CreateContainer(ctx, containerConfig, hostConfig, networkConfig, req.Name)
	if err != nil {
		logrus.Errorf("failed to create container: %v", err)
		c.JSON(http.StatusInternalServerError, common.ErrorResponse("CREATE_CONTAINER_FAILED", "Failed to create container: "+err.Error()))
		return
	}

	c.JSON(http.StatusCreated, common.SuccessResponse(ContainerCreateResponse{
		ContainerID: containerID,
		Message:     "Container created successfully",
		Success:     true,
	}))
}

// PullImageGin handles image pulling for Gin router
func (s *Service) PullImageGin(c *gin.Context) {
	ctx := c.Request.Context()
	var req ImagePullRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logrus.Errorf("failed to decode request: %v", err)
		c.JSON(http.StatusBadRequest, common.ErrorResponse("INVALID_REQUEST", "Failed to decode request: "+err.Error()))
		return
	}

	imageRef := req.ImageName
	if req.Tag != "" {
		imageRef = fmt.Sprintf("%s:%s", req.ImageName, req.Tag)
	}

	err := s.client.PullImage(ctx, imageRef)
	if err != nil {
		logrus.Errorf("failed to pull image: %v", err)
		c.JSON(http.StatusInternalServerError, common.ErrorResponse("PULL_IMAGE_FAILED", "Failed to pull image: "+err.Error()))
		return
	}

	c.JSON(http.StatusOK, common.SuccessResponse(ImagePullResponse{
		ImageName: req.ImageName,
		Message:   "Image pulled successfully",
		Success:   true,
	}))
}

// RemoveNetworkGin handles network removal for Gin router
func (s *Service) RemoveNetworkGin(c *gin.Context) {
	ctx := c.Request.Context()
	networkID := c.Param("id")

	err := s.client.RemoveNetwork(ctx, networkID)
	if err != nil {
		logrus.Errorf("failed to remove network: %v", err)
		c.JSON(http.StatusInternalServerError, common.ErrorResponse("REMOVE_NETWORK_FAILED", "Failed to remove network: "+err.Error()))
		return
	}

	c.JSON(http.StatusOK, common.SuccessResponse(NetworkActionResponse{
		NetworkID: networkID,
		Action:    "remove",
		Message:   "Network removed successfully",
		Success:   true,
	}))
}

