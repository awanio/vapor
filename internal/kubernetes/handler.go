package kubernetes

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/render"

	"github.com/vapor/system-api/internal/response"
)

// Handler represents the HTTP handler for Kubernetes operations
type Handler struct {
	service *Service
}

// NewHandler creates a new Kubernetes handler
func NewHandler(service *Service) *Handler {
	return &Handler{
		service: service,
	}
}

// RegisterRoutes registers the Kubernetes routes
func (h *Handler) RegisterRoutes(r chi.Router) {
	r.Route("/kubernetes", func(r chi.Router) {
		r.Get("/deployments", h.listDeployments)
		r.Get("/services", h.listServices)
		r.Get("/ingresses", h.listIngresses)
		r.Get("/pvcs", h.listPVCs)
		r.Get("/pvs", h.listPVs)
		r.Get("/secrets", h.listSecrets)
		r.Get("/configmaps", h.listConfigMaps)
		r.Get("/namespaces", h.listNamespaces)
		r.Get("/nodes", h.listNodes)
		r.Get("/daemonsets", h.listDaemonSets)
		r.Get("/statefulsets", h.listStatefulSets)
		r.Get("/jobs", h.listJobs)
		r.Get("/cronjobs", h.listCronJobs)
		r.Get("/pods", h.listPods)
		r.Get("/info", h.getClusterInfo)
	})
}

// listDeployments lists all deployments in the cluster
func (h *Handler) listDeployments(w http.ResponseWriter, r *http.Request) {
deployments, err := h.service.ListDeployments(r.Context(), nil)
	if err != nil {
		render.JSON(w, r, response.ErrorResponse("Failed to list deployments", err))
		return
	}
	render.JSON(w, r, response.Data(map[string]interface{}{
		"deployments": deployments,
		"count":      len(deployments),
	}))
}

// listServices lists all services in the cluster
func (h *Handler) listServices(w http.ResponseWriter, r *http.Request) {
services, err := h.service.ListServices(r.Context(), nil)
	if err != nil {
		render.JSON(w, r, response.ErrorResponse("Failed to list services", err))
		return
	}
	render.JSON(w, r, response.Data(map[string]interface{}{
		"services": services,
		"count":    len(services),
	}))
}

// listIngresses lists all ingresses in the cluster
func (h *Handler) listIngresses(w http.ResponseWriter, r *http.Request) {
ingresses, err := h.service.ListIngresses(r.Context(), nil)
	if err != nil {
		render.JSON(w, r, response.ErrorResponse("Failed to list ingresses", err))
		return
	}
	render.JSON(w, r, response.Data(map[string]interface{}{
		"ingresses": ingresses,
		"count":     len(ingresses),
	}))
}

// listPVCs lists all persistent volume claims in the cluster
func (h *Handler) listPVCs(w http.ResponseWriter, r *http.Request) {
pvcs, err := h.service.ListPVCs(r.Context(), nil)
	if err != nil {
		render.JSON(w, r, response.ErrorResponse("Failed to list PVCs", err))
		return
	}
	render.JSON(w, r, response.Data(map[string]interface{}{
		"pvcs":  pvcs,
		"count": len(pvcs),
	}))
}

// listPVs lists all persistent volumes in the cluster
func (h *Handler) listPVs(w http.ResponseWriter, r *http.Request) {
pvs, err := h.service.ListPVs(r.Context(), nil)
	if err != nil {
		render.JSON(w, r, response.ErrorResponse("Failed to list PVs", err))
		return
	}
	render.JSON(w, r, response.Data(map[string]interface{}{
		"pvs":   pvs,
		"count": len(pvs),
	}))
}

// listSecrets lists all secrets in the cluster
func (h *Handler) listSecrets(w http.ResponseWriter, r *http.Request) {
secrets, err := h.service.ListSecrets(r.Context(), nil)
	if err != nil {
		render.JSON(w, r, response.ErrorResponse("Failed to list secrets", err))
		return
	}
	render.JSON(w, r, response.Data(map[string]interface{}{
		"secrets": secrets,
		"count":   len(secrets),
	}))
}

// listConfigMaps lists all configmaps in the cluster
func (h *Handler) listConfigMaps(w http.ResponseWriter, r *http.Request) {
configmaps, err := h.service.ListConfigMaps(r.Context(), nil)
	if err != nil {
		render.JSON(w, r, response.ErrorResponse("Failed to list configmaps", err))
		return
	}
	render.JSON(w, r, response.Data(map[string]interface{}{
		"configmaps": configmaps,
		"count":      len(configmaps),
	}))
}

// listNamespaces lists all namespaces in the cluster
func (h *Handler) listNamespaces(w http.ResponseWriter, r *http.Request) {
namespaces, err := h.service.ListNamespaces(r.Context(), nil)
	if err != nil {
		render.JSON(w, r, response.ErrorResponse("Failed to list namespaces", err))
		return
	}
	render.JSON(w, r, response.Data(map[string]interface{}{
		"namespaces": namespaces,
		"count":      len(namespaces),
	}))
}

// listNodes lists all nodes in the cluster
func (h *Handler) listNodes(w http.ResponseWriter, r *http.Request) {
nodes, err := h.service.ListNodes(r.Context(), nil)
	if err != nil {
		render.JSON(w, r, response.ErrorResponse("Failed to list nodes", err))
		return
	}
	render.JSON(w, r, response.Data(map[string]interface{}{
		"nodes": nodes,
		"count": len(nodes),
	}))
}

// listDaemonSets lists all daemonsets in the cluster
func (h *Handler) listDaemonSets(w http.ResponseWriter, r *http.Request) {
daemonsets, err := h.service.ListDaemonSets(r.Context(), nil)
	if err != nil {
		render.JSON(w, r, response.ErrorResponse("Failed to list daemonsets", err))
		return
	}
	render.JSON(w, r, response.Data(map[string]interface{}{
		"daemonsets": daemonsets,
		"count":      len(daemonsets),
	}))
}

// listStatefulSets lists all statefulsets in the cluster
func (h *Handler) listStatefulSets(w http.ResponseWriter, r *http.Request) {
statefulsets, err := h.service.ListStatefulSets(r.Context(), nil)
	if err != nil {
		render.JSON(w, r, response.ErrorResponse("Failed to list statefulsets", err))
		return
	}
	render.JSON(w, r, response.Data(map[string]interface{}{
		"statefulsets": statefulsets,
		"count":        len(statefulsets),
	}))
}

// listJobs lists all jobs in the cluster
func (h *Handler) listJobs(w http.ResponseWriter, r *http.Request) {
jobs, err := h.service.ListJobs(r.Context(), nil)
	if err != nil {
		render.JSON(w, r, response.ErrorResponse("Failed to list jobs", err))
		return
	}
	render.JSON(w, r, response.Data(map[string]interface{}{
		"jobs":  jobs,
		"count": len(jobs),
	}))
}

// listCronJobs lists all cronjobs in the cluster
func (h *Handler) listCronJobs(w http.ResponseWriter, r *http.Request) {
cronjobs, err := h.service.ListCronJobs(r.Context(), nil)
	if err != nil {
		render.JSON(w, r, response.ErrorResponse("Failed to list cronjobs", err))
		return
	}
	render.JSON(w, r, response.Data(map[string]interface{}{
		"cronjobs": cronjobs,
		"count":    len(cronjobs),
	}))
}

// listPods lists all pods in the cluster
func (h *Handler) listPods(w http.ResponseWriter, r *http.Request) {
pods, err := h.service.ListPods(r.Context(), nil)
	if err != nil {
		render.JSON(w, r, response.ErrorResponse("Failed to list pods", err))
		return
	}
	render.JSON(w, r, response.Data(map[string]interface{}{
		"pods":  pods,
		"count": len(pods),
	}))
}

// getClusterInfo returns cluster information
func (h *Handler) getClusterInfo(w http.ResponseWriter, r *http.Request) {
clusterInfo, err := h.service.GetClusterInfo(r.Context(), nil)
	if err != nil {
		render.JSON(w, r, response.ErrorResponse("Failed to get cluster info", err))
		return
	}
	render.JSON(w, r, response.Data(map[string]interface{}{
		"cluster_info": clusterInfo,
	}))
}

// Handler adapter methods for Gin
func (h *Handler) ListPodsGin(c *gin.Context) {
	pods, err := h.service.ListPods(c.Request.Context(), nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"pods": pods, "count": len(pods)})
}

func (h *Handler) ListDeploymentsGin(c *gin.Context) {
	deployments, err := h.service.ListDeployments(c.Request.Context(), nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"deployments": deployments, "count": len(deployments)})
}

func (h *Handler) ListServicesGin(c *gin.Context) {
	services, err := h.service.ListServices(c.Request.Context(), nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"services": services, "count": len(services)})
}

func (h *Handler) ListIngressesGin(c *gin.Context) {
	ingresses, err := h.service.ListIngresses(c.Request.Context(), nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ingresses": ingresses, "count": len(ingresses)})
}

func (h *Handler) ListPVCsGin(c *gin.Context) {
	pvcs, err := h.service.ListPVCs(c.Request.Context(), nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"pvcs": pvcs, "count": len(pvcs)})
}

func (h *Handler) ListPVsGin(c *gin.Context) {
	pvs, err := h.service.ListPVs(c.Request.Context(), nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"pvs": pvs, "count": len(pvs)})
}

func (h *Handler) ListSecretsGin(c *gin.Context) {
	secrets, err := h.service.ListSecrets(c.Request.Context(), nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"secrets": secrets, "count": len(secrets)})
}

func (h *Handler) ListConfigMapsGin(c *gin.Context) {
	configmaps, err := h.service.ListConfigMaps(c.Request.Context(), nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"configmaps": configmaps, "count": len(configmaps)})
}

func (h *Handler) ListNamespacesGin(c *gin.Context) {
	namespaces, err := h.service.ListNamespaces(c.Request.Context(), nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"namespaces": namespaces, "count": len(namespaces)})
}

func (h *Handler) ListNodesGin(c *gin.Context) {
	nodes, err := h.service.ListNodes(c.Request.Context(), nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"nodes": nodes, "count": len(nodes)})
}

func (h *Handler) ListDaemonSetsGin(c *gin.Context) {
	daemonsets, err := h.service.ListDaemonSets(c.Request.Context(), nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"daemonsets": daemonsets, "count": len(daemonsets)})
}

func (h *Handler) ListStatefulSetsGin(c *gin.Context) {
	statefulsets, err := h.service.ListStatefulSets(c.Request.Context(), nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"statefulsets": statefulsets, "count": len(statefulsets)})
}

func (h *Handler) ListJobsGin(c *gin.Context) {
	jobs, err := h.service.ListJobs(c.Request.Context(), nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"jobs": jobs, "count": len(jobs)})
}

func (h *Handler) ListCronJobsGin(c *gin.Context) {
	cronjobs, err := h.service.ListCronJobs(c.Request.Context(), nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"cronjobs": cronjobs, "count": len(cronjobs)})
}

func (h *Handler) GetClusterInfoGin(c *gin.Context) {
	clusterInfo, err := h.service.GetClusterInfo(c.Request.Context(), nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"cluster_info": clusterInfo})
}

// NoKubernetesHandler returns a handler that responds with Kubernetes not installed error
func NoKubernetesHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusForbidden, gin.H{
			"status":  "error",
			"code":    "KUBERNETES_NOT_INSTALLED",
			"message": "Kubernetes is not installed on this system",
			"details": "The kubelet service was not found on this system. Please install Kubernetes to use these features.",
		})
	}
}
