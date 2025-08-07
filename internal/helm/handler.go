package helm

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"github.com/awanio/vapor/internal/common"
)

// Service wrapper for HTTP handlers
type ServiceHandler struct {
	service *Service
}

// NewServiceHandler creates a new Helm service handler
func NewServiceHandler(service *Service) *ServiceHandler {
	return &ServiceHandler{
		service: service,
	}
}

// ListChartsGin handles listing Helm charts for Gin router
func (h *ServiceHandler) ListChartsGin(c *gin.Context) {
	ctx := c.Request.Context()
	// Parse query parameters
	opts := ListChartsOptions{
		Repository:  c.Query("repository"),
		AllVersions: c.Query("all_versions") == "true",
		Devel:       c.Query("devel") == "true",
	}

	// List charts
	charts, err := h.service.ListCharts(ctx, opts)
	if err != nil {
		logrus.Errorf("failed to list helm charts: %v", err)
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list charts", err.Error())
		return
	}

	// Return response
	common.SendSuccess(c, gin.H{
		"charts": charts,
		"count":  len(charts),
	})
}

// ListRepositoriesGin handles listing Helm repositories for Gin router
func (h *ServiceHandler) ListRepositoriesGin(c *gin.Context) {
	ctx := c.Request.Context()
	// Parse query parameters (none for now)
	opts := ListRepositoriesOptions{}

	// List repositories
	repositories, err := h.service.ListRepositories(ctx, opts)
	if err != nil {
		logrus.Errorf("failed to list helm repositories: %v", err)
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list repositories", err.Error())
		return
	}

	// Return response
	common.SendSuccess(c, gin.H{
		"repositories": repositories,
		"count":        len(repositories),
	})
}

// ListReleasesGin handles listing Helm releases for Gin router
func (h *ServiceHandler) ListReleasesGin(c *gin.Context) {
	ctx := c.Request.Context()
	// Parse query parameters
	// Default to all namespaces unless a specific namespace is requested
	allNamespaces := true
	if namespace := c.Query("namespace"); namespace != "" {
		allNamespaces = false
	}
	// Allow explicit override with "all" parameter
	if allParam := c.Query("all"); allParam != "" {
		allNamespaces = allParam == "true"
	}
	
	opts := ListReleasesOptions{
		Namespace:     c.Query("namespace"),
		AllNamespaces: allNamespaces,
		Filter:        c.Query("filter"),
	}

	// List releases
	releases, err := h.service.ListReleases(ctx, opts)
	if err != nil {
		logrus.Errorf("failed to list helm releases: %v", err)
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list releases", err.Error())
		return
	}

	// Return response
	common.SendSuccess(c, gin.H{
		"releases": releases,
		"count":    len(releases),
	})
}

// UpdateRepositoryGin handles updating a specific Helm repository for Gin router
func (h *ServiceHandler) UpdateRepositoryGin(c *gin.Context) {
	ctx := c.Request.Context()
	name := c.Param("name")

	if name == "" {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeInvalidInput, "Repository name is required", "")
		return
	}

	// Update the repository
	message, err := h.service.UpdateRepository(ctx, name)
	if err != nil {
		logrus.Errorf("failed to update helm repository %s: %v", name, err)
		if err.Error() == fmt.Sprintf("no repository named '%s' found", name) {
			common.SendError(c, http.StatusNotFound, "REPOSITORY_NOT_FOUND", 
				fmt.Sprintf("No repository named '%s' found", name), 
				"Run 'helm repo add' to add the repository first")
			return
		}
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to update repository", err.Error())
		return
	}

	// Get updated repository info
	repositories, err := h.service.ListRepositories(ctx, ListRepositoriesOptions{})
	if err != nil {
		logrus.Errorf("failed to get repository info after update: %v", err)
	}

	var updatedRepo *Repository
	for _, repo := range repositories {
		if repo.Name == name {
			updatedRepo = &repo
			break
		}
	}

	// Return response
	response := gin.H{
		"repository": updatedRepo,
		"message":    message,
		"updated_at": time.Now().Format(time.RFC3339),
	}

	common.SendSuccess(c, response)
}

// NoHelmHandler returns a handler that responds with Helm not available error
func NoHelmHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		common.SendError(c, http.StatusServiceUnavailable, common.ErrCodeNotImplemented, 
			"Helm is not available", 
			"Helm requires Kubernetes to be installed and configured. Please ensure Kubernetes is running and accessible.")
	}
}
