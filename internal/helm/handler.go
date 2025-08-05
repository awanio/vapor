package helm

import (
	"net/http"

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

// ListReleasesGin handles listing Helm releases for Gin router
func (h *ServiceHandler) ListReleasesGin(c *gin.Context) {
	ctx := c.Request.Context()
	// Parse query parameters
	opts := ListReleasesOptions{
		Namespace:     c.Query("namespace"),
		AllNamespaces: c.Query("all") == "true",
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

// NoHelmHandler returns a handler that responds with Helm not available error
func NoHelmHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		common.SendError(c, http.StatusServiceUnavailable, common.ErrCodeNotImplemented, 
			"Helm is not available", 
			"Helm requires Kubernetes to be installed and configured. Please ensure Kubernetes is running and accessible.")
	}
}
