package kubernetes

import (
	"net/http"

	"github.com/awanio/vapor/internal/common"
	"github.com/gin-gonic/gin"
)

// Namespace-scoped list handler methods

// ListPodsByNamespaceGin lists pods in a specific namespace
func (h *Handler) ListPodsByNamespaceGin(c *gin.Context) {
	namespace := c.Param("namespace")

	pods, err := h.service.ListPodsByNamespace(c.Request.Context(), namespace)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list pods in namespace", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"pods": pods, "count": len(pods), "namespace": namespace})
}

// ListDeploymentsByNamespaceGin lists deployments in a specific namespace
func (h *Handler) ListDeploymentsByNamespaceGin(c *gin.Context) {
	namespace := c.Param("namespace")

	deployments, err := h.service.ListDeploymentsByNamespace(c.Request.Context(), namespace)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list deployments in namespace", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"deployments": deployments, "count": len(deployments), "namespace": namespace})
}

// ListServicesByNamespaceGin lists services in a specific namespace
func (h *Handler) ListServicesByNamespaceGin(c *gin.Context) {
	namespace := c.Param("namespace")

	services, err := h.service.ListServicesByNamespace(c.Request.Context(), namespace)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list services in namespace", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"services": services, "count": len(services), "namespace": namespace})
}

// ListIngressesByNamespaceGin lists ingresses in a specific namespace
func (h *Handler) ListIngressesByNamespaceGin(c *gin.Context) {
	namespace := c.Param("namespace")

	ingresses, err := h.service.ListIngressesByNamespace(c.Request.Context(), namespace)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list ingresses in namespace", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"ingresses": ingresses, "count": len(ingresses), "namespace": namespace})
}

// ListPVCsByNamespaceGin lists persistent volume claims in a specific namespace
func (h *Handler) ListPVCsByNamespaceGin(c *gin.Context) {
	namespace := c.Param("namespace")

	pvcs, err := h.service.ListPVCsByNamespace(c.Request.Context(), namespace)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list PVCs in namespace", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"pvcs": pvcs, "count": len(pvcs), "namespace": namespace})
}

// ListSecretsByNamespaceGin lists secrets in a specific namespace
func (h *Handler) ListSecretsByNamespaceGin(c *gin.Context) {
	namespace := c.Param("namespace")

	secrets, err := h.service.ListSecretsByNamespace(c.Request.Context(), namespace)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list secrets in namespace", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"secrets": secrets, "count": len(secrets), "namespace": namespace})
}

// ListConfigMapsByNamespaceGin lists config maps in a specific namespace
func (h *Handler) ListConfigMapsByNamespaceGin(c *gin.Context) {
	namespace := c.Param("namespace")

	configMaps, err := h.service.ListConfigMapsByNamespace(c.Request.Context(), namespace)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list config maps in namespace", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"configmaps": configMaps, "count": len(configMaps), "namespace": namespace})
}

// ListDaemonSetsByNamespaceGin lists daemon sets in a specific namespace
func (h *Handler) ListDaemonSetsByNamespaceGin(c *gin.Context) {
	namespace := c.Param("namespace")

	daemonSets, err := h.service.ListDaemonSetsByNamespace(c.Request.Context(), namespace)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list daemon sets in namespace", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"daemonsets": daemonSets, "count": len(daemonSets), "namespace": namespace})
}

// ListStatefulSetsByNamespaceGin lists stateful sets in a specific namespace
func (h *Handler) ListStatefulSetsByNamespaceGin(c *gin.Context) {
	namespace := c.Param("namespace")

	statefulSets, err := h.service.ListStatefulSetsByNamespace(c.Request.Context(), namespace)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list stateful sets in namespace", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"statefulsets": statefulSets, "count": len(statefulSets), "namespace": namespace})
}

// ListJobsByNamespaceGin lists jobs in a specific namespace
func (h *Handler) ListJobsByNamespaceGin(c *gin.Context) {
	namespace := c.Param("namespace")

	jobs, err := h.service.ListJobsByNamespace(c.Request.Context(), namespace)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list jobs in namespace", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"jobs": jobs, "count": len(jobs), "namespace": namespace})
}

// ListCronJobsByNamespaceGin lists cron jobs in a specific namespace
func (h *Handler) ListCronJobsByNamespaceGin(c *gin.Context) {
	namespace := c.Param("namespace")

	cronJobs, err := h.service.ListCronJobsByNamespace(c.Request.Context(), namespace)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list cron jobs in namespace", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"cronjobs": cronJobs, "count": len(cronJobs), "namespace": namespace})
}

// ListNetworkPoliciesByNamespaceGin lists network policies in a specific namespace
func (h *Handler) ListNetworkPoliciesByNamespaceGin(c *gin.Context) {
	namespace := c.Param("namespace")

	networkPolicies, err := h.service.ListNetworkPoliciesByNamespace(c.Request.Context(), namespace)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list network policies in namespace", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"networkpolicies": networkPolicies, "count": len(networkPolicies), "namespace": namespace})
}

// ListReplicaSetsByNamespaceGin lists replica sets in a specific namespace
func (h *Handler) ListReplicaSetsByNamespaceGin(c *gin.Context) {
	namespace := c.Param("namespace")

	replicaSets, err := h.service.ListReplicaSetsByNamespace(c.Request.Context(), namespace)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list replica sets in namespace", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"replicasets": replicaSets, "count": len(replicaSets), "namespace": namespace})
}

// ListServiceAccountsByNamespaceGin lists service accounts in a specific namespace
func (h *Handler) ListServiceAccountsByNamespaceGin(c *gin.Context) {
	namespace := c.Param("namespace")

	serviceAccounts, err := h.service.ListServiceAccountsByNamespace(c.Request.Context(), namespace)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list service accounts in namespace", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"serviceaccounts": serviceAccounts, "count": len(serviceAccounts), "namespace": namespace})
}

// ListRolesByNamespaceGin lists roles in a specific namespace
func (h *Handler) ListRolesByNamespaceGin(c *gin.Context) {
	namespace := c.Param("namespace")

	roles, err := h.service.ListRolesByNamespace(c.Request.Context(), namespace)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list roles in namespace", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"roles": roles, "count": len(roles), "namespace": namespace})
}

// ListRoleBindingsByNamespaceGin lists role bindings in a specific namespace
func (h *Handler) ListRoleBindingsByNamespaceGin(c *gin.Context) {
	namespace := c.Param("namespace")

	roleBindings, err := h.service.ListRoleBindingsByNamespace(c.Request.Context(), namespace)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list role bindings in namespace", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"rolebindings": roleBindings, "count": len(roleBindings), "namespace": namespace})
}

// ListHorizontalPodAutoscalersByNamespaceGin lists horizontal pod autoscalers in a specific namespace
func (h *Handler) ListHorizontalPodAutoscalersByNamespaceGin(c *gin.Context) {
	namespace := c.Param("namespace")

	hpas, err := h.service.ListHorizontalPodAutoscalersByNamespace(c.Request.Context(), namespace)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list horizontal pod autoscalers in namespace", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"horizontalpodautoscalers": hpas, "count": len(hpas), "namespace": namespace})
}
