package kubernetes

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/awanio/vapor/internal/common"
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

func (h *Handler) GetPodDetailGin(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")

	podDetail, err := h.service.GetPodDetail(c.Request.Context(), namespace, name)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to get pod details", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"pod_detail": podDetail})
}

func (h *Handler) ListDeploymentsGin(c *gin.Context) {
	deployments, err := h.service.ListDeployments(c.Request.Context(), nil)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list deployments", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"deployments": deployments, "count": len(deployments)})
}

func (h *Handler) GetDeploymentDetailGin(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")

	deploymentDetail, err := h.service.GetDeploymentDetail(c.Request.Context(), namespace, name)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to get deployment details", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"deployment_detail": deploymentDetail})
}

func (h *Handler) ListServicesGin(c *gin.Context) {
	services, err := h.service.ListServices(c.Request.Context(), nil)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list services", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"services": services, "count": len(services)})
}

func (h *Handler) GetServiceDetailGin(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")

	serviceDetail, err := h.service.GetServiceDetail(c.Request.Context(), namespace, name)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to get service details", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"service_detail": serviceDetail})
}

func (h *Handler) ListIngressesGin(c *gin.Context) {
	ingresses, err := h.service.ListIngresses(c.Request.Context(), nil)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list ingresses", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"ingresses": ingresses, "count": len(ingresses)})
}

func (h *Handler) GetIngressDetailGin(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")

	ingressDetail, err := h.service.GetIngressDetail(c.Request.Context(), namespace, name)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to get ingress details", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"ingress_detail": ingressDetail})
}

func (h *Handler) ListPVCsGin(c *gin.Context) {
	pvcs, err := h.service.ListPVCs(c.Request.Context(), nil)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list PVCs", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"pvcs": pvcs, "count": len(pvcs)})
}

func (h *Handler) GetPVCDetailGin(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")

	pvcDetail, err := h.service.GetPVCDetail(c.Request.Context(), namespace, name)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to get PVC details", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"pvc_detail": pvcDetail})
}

func (h *Handler) ListPVsGin(c *gin.Context) {
	pvs, err := h.service.ListPVs(c.Request.Context(), nil)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list PVs", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"pvs": pvs, "count": len(pvs)})
}

func (h *Handler) GetPVDetailGin(c *gin.Context) {
	name := c.Param("name")

	pvDetail, err := h.service.GetPVDetail(c.Request.Context(), name)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to get PV details", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"pv_detail": pvDetail})
}

func (h *Handler) ListSecretsGin(c *gin.Context) {
	secrets, err := h.service.ListSecrets(c.Request.Context(), nil)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list secrets", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"secrets": secrets, "count": len(secrets)})
}

func (h *Handler) GetSecretDetailGin(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")

	secretDetail, err := h.service.GetSecretDetail(c.Request.Context(), namespace, name)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to get secret details", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"secret_detail": secretDetail})
}

func (h *Handler) ListConfigMapsGin(c *gin.Context) {
	configmaps, err := h.service.ListConfigMaps(c.Request.Context(), nil)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list configmaps", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"configmaps": configmaps, "count": len(configmaps)})
}

func (h *Handler) GetConfigMapDetailGin(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")

	configmapDetail, err := h.service.GetConfigMapDetail(c.Request.Context(), namespace, name)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to get configmap details", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"configmap_detail": configmapDetail})
}

func (h *Handler) ListNamespacesGin(c *gin.Context) {
	namespaces, err := h.service.ListNamespaces(c.Request.Context(), nil)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list namespaces", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"namespaces": namespaces, "count": len(namespaces)})
}

func (h *Handler) GetNamespaceDetailGin(c *gin.Context) {
	name := c.Param("name")

	namespaceDetail, err := h.service.GetNamespaceDetail(c.Request.Context(), name)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to get namespace details", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"namespace_detail": namespaceDetail})
}

func (h *Handler) ListNodesGin(c *gin.Context) {
	nodes, err := h.service.ListNodes(c.Request.Context(), nil)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list nodes", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"nodes": nodes, "count": len(nodes)})
}

func (h *Handler) GetNodeDetailGin(c *gin.Context) {
	name := c.Param("name")

	nodeDetail, err := h.service.GetNodeDetail(c.Request.Context(), name)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to get node details", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"node_detail": nodeDetail})
}

func (h *Handler) ListDaemonSetsGin(c *gin.Context) {
	daemonsets, err := h.service.ListDaemonSets(c.Request.Context(), nil)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list daemonsets", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"daemonsets": daemonsets, "count": len(daemonsets)})
}

func (h *Handler) GetDaemonSetDetailGin(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")

	daemonsetDetail, err := h.service.GetDaemonSetDetail(c.Request.Context(), namespace, name)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to get daemonset details", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"daemonset_detail": daemonsetDetail})
}

func (h *Handler) ListStatefulSetsGin(c *gin.Context) {
	statefulsets, err := h.service.ListStatefulSets(c.Request.Context(), nil)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list statefulsets", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"statefulsets": statefulsets, "count": len(statefulsets)})
}

func (h *Handler) GetStatefulSetDetailGin(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")

	statefulsetDetail, err := h.service.GetStatefulSetDetail(c.Request.Context(), namespace, name)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to get statefulset details", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"statefulset_detail": statefulsetDetail})
}

func (h *Handler) ListJobsGin(c *gin.Context) {
	jobs, err := h.service.ListJobs(c.Request.Context(), nil)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list jobs", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"jobs": jobs, "count": len(jobs)})
}

func (h *Handler) GetJobDetailGin(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")

	jobDetail, err := h.service.GetJobDetail(c.Request.Context(), namespace, name)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to get job details", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"job_detail": jobDetail})
}

func (h *Handler) ListCronJobsGin(c *gin.Context) {
	cronjobs, err := h.service.ListCronJobs(c.Request.Context(), nil)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list cronjobs", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"cronjobs": cronjobs, "count": len(cronjobs)})
}

func (h *Handler) GetCronJobDetailGin(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")

	cronjobDetail, err := h.service.GetCronJobDetail(c.Request.Context(), namespace, name)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to get cronjob details", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"cronjob_detail": cronjobDetail})
}

func (h *Handler) ListCRDsGin(c *gin.Context) {
	crds, err := h.service.ListCRDs(c.Request.Context(), nil)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list CRDs", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"crds": crds, "count": len(crds)})
}

func (h *Handler) GetCRDDetailGin(c *gin.Context) {
	name := c.Param("name")

	crdDetail, err := h.service.GetCRDDetail(c.Request.Context(), name)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to get CRD details", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"crd_detail": crdDetail})
}

func (h *Handler) ListCRDObjectsGin(c *gin.Context) {
	crdName := c.Param("name")
	namespace := c.Query("namespace")

	crdObjects, err := h.service.ListCRDObjects(c.Request.Context(), crdName, namespace)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list CRD objects", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"crd_objects": crdObjects, "count": len(crdObjects)})
}

func (h *Handler) GetCRDObjectDetailGin(c *gin.Context) {
	crdName := c.Param("name")
	namespace := c.Param("namespace")
	objectName := c.Param("object-name")

	crdObjectDetail, err := h.service.GetCRDObjectDetail(c.Request.Context(), crdName, objectName, namespace)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to get CRD object details", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"crd_object_detail": crdObjectDetail})
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
