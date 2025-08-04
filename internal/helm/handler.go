package helm

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/render"

	"github.com/vapor/system-api/internal/response"
)

// Handler represents the HTTP handler for Helm operations
type Handler struct {
	service *Service
}

// NewHandler creates a new Helm handler
func NewHandler(service *Service) *Handler {
	return &Handler{
		service: service,
	}
}

// RegisterRoutes registers the Helm routes
func (h *Handler) RegisterRoutes(r chi.Router) {
	r.Route("/kubernetes/helm", func(r chi.Router) {
		r.Get("/releases", h.listReleases)
		r.Get("/charts", h.listCharts)
	})
}

// listCharts handles listing Helm charts
func (h *Handler) listCharts(w http.ResponseWriter, r *http.Request) {
	// Parse query parameters
	opts := ListChartsOptions{
		Repository:  r.URL.Query().Get("repository"),
		AllVersions: r.URL.Query().Get("all_versions") == "true",
	}

	// List charts
	charts, err := h.service.ListCharts(r.Context(), opts)
	if err != nil {
render.JSON(w, r, response.ErrorResponse("Failed to list charts", err))
		return
	}

	// Return response
	render.JSON(w, r, response.Data(map[string]interface{}{
		"charts": charts,
	}))
}

// listReleases handles listing Helm releases
func (h *Handler) listReleases(w http.ResponseWriter, r *http.Request) {
	// Parse query parameters
	opts := ListReleasesOptions{
		Namespace:     r.URL.Query().Get("namespace"),
		AllNamespaces: r.URL.Query().Get("all") == "true",
		Filter:        r.URL.Query().Get("filter"),
	}

	// List releases
	releases, err := h.service.ListReleases(r.Context(), opts)
	if err != nil {
render.JSON(w, r, response.ErrorResponse("Failed to list releases", err))
		return
	}

	// Return response
	render.JSON(w, r, response.Data(map[string]interface{}{
		"releases": releases,
	}))
}
