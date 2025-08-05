package kubernetes

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/vapor/system-api/internal/common"
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

// Gin handler methods
func (h *Handler) ListPodsGin(c *gin.Context) {
	pods, err := h.service.ListPods(c.Request.Context(), nil)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list pods", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"pods": pods, "count": len(pods)})
}

func (h *Handler) ListDeploymentsGin(c *gin.Context) {
	deployments, err := h.service.ListDeployments(c.Request.Context(), nil)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list deployments", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"deployments": deployments, "count": len(deployments)})
}

func (h *Handler) ListServicesGin(c *gin.Context) {
	services, err := h.service.ListServices(c.Request.Context(), nil)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list services", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"services": services, "count": len(services)})
}

func (h *Handler) ListIngressesGin(c *gin.Context) {
	ingresses, err := h.service.ListIngresses(c.Request.Context(), nil)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list ingresses", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"ingresses": ingresses, "count": len(ingresses)})
}

func (h *Handler) ListPVCsGin(c *gin.Context) {
	pvcs, err := h.service.ListPVCs(c.Request.Context(), nil)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list PVCs", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"pvcs": pvcs, "count": len(pvcs)})
}

func (h *Handler) ListPVsGin(c *gin.Context) {
	pvs, err := h.service.ListPVs(c.Request.Context(), nil)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list PVs", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"pvs": pvs, "count": len(pvs)})
}

func (h *Handler) ListSecretsGin(c *gin.Context) {
	secrets, err := h.service.ListSecrets(c.Request.Context(), nil)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list secrets", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"secrets": secrets, "count": len(secrets)})
}

func (h *Handler) ListConfigMapsGin(c *gin.Context) {
	configmaps, err := h.service.ListConfigMaps(c.Request.Context(), nil)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list configmaps", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"configmaps": configmaps, "count": len(configmaps)})
}

func (h *Handler) ListNamespacesGin(c *gin.Context) {
	namespaces, err := h.service.ListNamespaces(c.Request.Context(), nil)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list namespaces", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"namespaces": namespaces, "count": len(namespaces)})
}

func (h *Handler) ListNodesGin(c *gin.Context) {
	nodes, err := h.service.ListNodes(c.Request.Context(), nil)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list nodes", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"nodes": nodes, "count": len(nodes)})
}

func (h *Handler) ListDaemonSetsGin(c *gin.Context) {
	daemonsets, err := h.service.ListDaemonSets(c.Request.Context(), nil)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list daemonsets", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"daemonsets": daemonsets, "count": len(daemonsets)})
}

func (h *Handler) ListStatefulSetsGin(c *gin.Context) {
	statefulsets, err := h.service.ListStatefulSets(c.Request.Context(), nil)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list statefulsets", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"statefulsets": statefulsets, "count": len(statefulsets)})
}

func (h *Handler) ListJobsGin(c *gin.Context) {
	jobs, err := h.service.ListJobs(c.Request.Context(), nil)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list jobs", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"jobs": jobs, "count": len(jobs)})
}

func (h *Handler) ListCronJobsGin(c *gin.Context) {
	cronjobs, err := h.service.ListCronJobs(c.Request.Context(), nil)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list cronjobs", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"cronjobs": cronjobs, "count": len(cronjobs)})
}

func (h *Handler) GetClusterInfoGin(c *gin.Context) {
	clusterInfo, err := h.service.GetClusterInfo(c.Request.Context(), nil)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to get cluster info", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"cluster_info": clusterInfo})
}

// NoKubernetesHandler returns a handler that responds with Kubernetes not installed error
func NoKubernetesHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		common.SendError(c, http.StatusServiceUnavailable, common.ErrCodeNotImplemented, 
			"Kubernetes is not installed on this system", 
			"The kubelet service was not found on this system. Please install Kubernetes to use these features.")
	}
}
