package kubernetes

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/awanio/vapor/internal/common"
	"github.com/gin-gonic/gin"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	"sigs.k8s.io/yaml"
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

// GetDeploymentDetailGin handles requests to get deployment details
// Supports both JSON and YAML responses based on Accept header
func (h *Handler) GetDeploymentDetailGin(c *gin.Context) {

	namespace := c.Param("namespace")
	name := c.Param("name")

	deploymentDetail, err := h.service.GetDeploymentDetail(c.Request.Context(), namespace, name)
	if err != nil {
		// Check if YAML response is requested for error responses
		if isYAMLRequested(c) {
			respondYAMLError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to get deployment details", err.Error())
			return
		}
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to get deployment details", err.Error())
		return
	}

	// Check Accept header for YAML response
	if isYAMLRequested(c) {
		respondYAML(c, deploymentDetail)
		return
	}

	// Default JSON response
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

	// Log the request details
	fmt.Printf("[DEBUG] GetPVCDetailGin called with namespace=%s, name=%s\n", namespace, name)

	pvcDetail, err := h.service.GetPVCDetail(c.Request.Context(), namespace, name)
	if err != nil {
		// Log the error details
		fmt.Printf("[ERROR] GetPVCDetailGin failed: namespace=%s, name=%s, error=%v\n", namespace, name, err)

		// Check if it's a not found error
		if strings.Contains(err.Error(), "not found") {
			common.SendError(c, http.StatusNotFound, common.ErrCodeNotFound, "PVC not found", err.Error())
		} else {
			common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to get PVC details", err.Error())
		}
		return
	}
	fmt.Printf("[DEBUG] GetPVCDetailGin successful for namespace=%s, name=%s\n", namespace, name)
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

	// Log the request details
	fmt.Printf("[DEBUG] GetPVDetailGin called with name=%s\n", name)

	pvDetail, err := h.service.GetPVDetail(c.Request.Context(), name)
	if err != nil {
		// Log the error details
		fmt.Printf("[ERROR] GetPVDetailGin failed: name=%s, error=%v\n", name, err)

		// Check if it's a not found error
		if strings.Contains(err.Error(), "not found") {
			common.SendError(c, http.StatusNotFound, common.ErrCodeNotFound, "PV not found", err.Error())
		} else {
			common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to get PV details", err.Error())
		}
		return
	}
	fmt.Printf("[DEBUG] GetPVDetailGin successful for name=%s\n", name)
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
	common.SendSuccess(c, gin.H{"instances": crdObjects, "count": len(crdObjects)})
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
	common.SendSuccess(c, gin.H{"instance_detail": crdObjectDetail})
}

func (h *Handler) GetClusterInfoGin(c *gin.Context) {
	clusterInfo, err := h.service.GetClusterInfo(c.Request.Context(), nil)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to get cluster info", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"cluster_info": clusterInfo})
}

// GetPodLogsGin handles retrieving pod logs
func (h *Handler) GetPodLogsGin(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")

	// Parse query parameters
	follow := c.DefaultQuery("follow", "false") == "true"
	linesStr := c.DefaultQuery("lines", "100")
	var lines *int64
	if linesStr != "" {
		l, err := strconv.ParseInt(linesStr, 10, 64)
		if err == nil && l > 0 {
			lines = &l
		}
	}

	logs, err := h.service.GetPodLogs(c.Request.Context(), namespace, name, follow, lines)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to get pod logs", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"logs": logs})
}

// DeletePodGin handles pod deletion
func (h *Handler) DeletePodGin(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")

	err := h.service.DeletePod(c.Request.Context(), namespace, name)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to delete pod", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"message": "Pod deleted successfully"})
}

// ApplyPodGin handles pod creation/update using apply
// Supports both JSON and YAML content types
func (h *Handler) ApplyPodGin(c *gin.Context) {
	contentType := c.GetHeader("Content-Type")
	contentType = strings.ToLower(strings.TrimSpace(contentType))

	// Read the raw body
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Failed to read request body", err.Error())
		return
	}

	if len(body) == 0 {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Request body is empty", "Please provide a valid Pod specification")
		return
	}

	var pod corev1.Pod

	// Parse based on content type
	switch {
	case strings.Contains(contentType, "application/yaml") || strings.Contains(contentType, "text/yaml"):
		// Parse YAML
		err = yaml.Unmarshal(body, &pod)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid YAML pod specification", err.Error())
			return
		}
	case strings.Contains(contentType, "application/json"), contentType == "":
		// Parse JSON (default if no content type specified)
		err = c.ShouldBindJSON(&pod)
		if err != nil {
			// If ShouldBindJSON fails, try manual unmarshal since body was already read
			err = json.Unmarshal(body, &pod)
			if err != nil {
				common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid JSON pod specification", err.Error())
				return
			}
		}
	default:
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest,
			"Unsupported content type",
			"Content-Type must be 'application/json', 'application/yaml', or 'text/yaml'")
		return
	}

	// Validate that we have at least the required fields
	if pod.Name == "" && pod.ObjectMeta.Name == "" {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest,
			"Invalid pod specification",
			"Pod name is required in metadata.name")
		return
	}

	// Apply the pod
	appliedPod, err := h.service.ApplyPod(c.Request.Context(), &pod)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to apply pod", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"pod_detail": appliedPod})
}

// UpdatePodGin handles pod updates
// Supports both JSON and YAML content types
func (h *Handler) UpdatePodGin(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")

	contentType := c.GetHeader("Content-Type")
	contentType = strings.ToLower(strings.TrimSpace(contentType))

	// Read the raw body
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Failed to read request body", err.Error())
		return
	}

	if len(body) == 0 {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Request body is empty", "Please provide a valid Pod specification")
		return
	}

	var pod corev1.Pod

	// Parse based on content type
	switch {
	case strings.Contains(contentType, "application/yaml") || strings.Contains(contentType, "text/yaml"):
		// Parse YAML
		err = yaml.Unmarshal(body, &pod)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid YAML pod specification", err.Error())
			return
		}
	case strings.Contains(contentType, "application/json"), contentType == "":
		// Parse JSON (default if no content type specified)
		err = json.Unmarshal(body, &pod)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid JSON pod specification", err.Error())
			return
		}
	default:
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest,
			"Unsupported content type",
			"Content-Type must be 'application/json', 'application/yaml', or 'text/yaml'")
		return
	}

	// Update the pod
	updatedPod, err := h.service.UpdatePod(c.Request.Context(), namespace, name, &pod)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			common.SendError(c, http.StatusNotFound, common.ErrCodeNotFound, "Pod not found", err.Error())
		} else {
			common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to update pod", err.Error())
		}
		return
	}
	common.SendSuccess(c, gin.H{"pod_detail": updatedPod})
}

// ListIngressClassesGin lists all ingress classes
func (h *Handler) ListIngressClassesGin(c *gin.Context) {
	ingressClasses, err := h.service.ListIngressClasses(c.Request.Context(), nil)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list ingress classes", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"ingressClasses": ingressClasses, "count": len(ingressClasses)})
}

// GetIngressClassDetailGin gets ingress class details
func (h *Handler) GetIngressClassDetailGin(c *gin.Context) {
	name := c.Param("name")

	ingressClass, err := h.service.GetIngressClassDetail(c.Request.Context(), name)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			common.SendError(c, http.StatusNotFound, common.ErrCodeNotFound, "IngressClass not found", err.Error())
		} else {
			common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to get ingress class details", err.Error())
		}
		return
	}
	common.SendSuccess(c, gin.H{"ingressClass_detail": ingressClass})
}

// DeleteIngressClassGin handles ingress class deletion
func (h *Handler) DeleteIngressClassGin(c *gin.Context) {
	name := c.Param("name")

	err := h.service.DeleteIngressClass(c.Request.Context(), name)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			common.SendError(c, http.StatusNotFound, common.ErrCodeNotFound, "IngressClass not found", err.Error())
		} else {
			common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to delete ingress class", err.Error())
		}
		return
	}
	common.SendSuccess(c, gin.H{"message": "IngressClass deleted successfully"})
}

// ApplyIngressClassGin handles ingress class creation/update
func (h *Handler) ApplyIngressClassGin(c *gin.Context) {
	contentType := c.GetHeader("Content-Type")
	contentType = strings.ToLower(strings.TrimSpace(contentType))

	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Failed to read request body", err.Error())
		return
	}

	if len(body) == 0 {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Request body is empty", "Please provide a valid IngressClass specification")
		return
	}

	var ingressClass networkingv1.IngressClass

	switch {
	case strings.Contains(contentType, "application/yaml") || strings.Contains(contentType, "text/yaml"):
		err = yaml.Unmarshal(body, &ingressClass)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid YAML ingress class specification", err.Error())
			return
		}
	case strings.Contains(contentType, "application/json"), contentType == "":
		err = json.Unmarshal(body, &ingressClass)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid JSON ingress class specification", err.Error())
			return
		}
	default:
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest,
			"Unsupported content type",
			"Content-Type must be 'application/json', 'application/yaml', or 'text/yaml'")
		return
	}

	if ingressClass.Name == "" && ingressClass.ObjectMeta.Name == "" {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest,
			"Invalid ingress class specification",
			"IngressClass name is required in metadata.name")
		return
	}

	appliedClass, err := h.service.ApplyIngressClass(c.Request.Context(), &ingressClass)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to apply ingress class", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"ingressClass_detail": appliedClass})
}

// UpdateIngressClassGin handles ingress class updates
func (h *Handler) UpdateIngressClassGin(c *gin.Context) {
	name := c.Param("name")

	contentType := c.GetHeader("Content-Type")
	contentType = strings.ToLower(strings.TrimSpace(contentType))

	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Failed to read request body", err.Error())
		return
	}

	if len(body) == 0 {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Request body is empty", "Please provide a valid IngressClass specification")
		return
	}

	var ingressClass networkingv1.IngressClass

	switch {
	case strings.Contains(contentType, "application/yaml") || strings.Contains(contentType, "text/yaml"):
		err = yaml.Unmarshal(body, &ingressClass)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid YAML ingress class specification", err.Error())
			return
		}
	case strings.Contains(contentType, "application/json"), contentType == "":
		err = json.Unmarshal(body, &ingressClass)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid JSON ingress class specification", err.Error())
			return
		}
	default:
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest,
			"Unsupported content type",
			"Content-Type must be 'application/json', 'application/yaml', or 'text/yaml'")
		return
	}

	updatedClass, err := h.service.UpdateIngressClass(c.Request.Context(), name, &ingressClass)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			common.SendError(c, http.StatusNotFound, common.ErrCodeNotFound, "IngressClass not found", err.Error())
		} else {
			common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to update ingress class", err.Error())
		}
		return
	}
	common.SendSuccess(c, gin.H{"ingressClass_detail": updatedClass})
}

// ListNetworkPoliciesGin lists all network policies
func (h *Handler) ListNetworkPoliciesGin(c *gin.Context) {
	policies, err := h.service.ListNetworkPolicies(c.Request.Context(), nil)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list network policies", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"networkPolicies": policies, "count": len(policies)})
}

// GetNetworkPolicyDetailGin gets network policy details
func (h *Handler) GetNetworkPolicyDetailGin(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")

	policy, err := h.service.GetNetworkPolicyDetail(c.Request.Context(), namespace, name)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			common.SendError(c, http.StatusNotFound, common.ErrCodeNotFound, "NetworkPolicy not found", err.Error())
		} else {
			common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to get network policy details", err.Error())
		}
		return
	}
	common.SendSuccess(c, gin.H{"networkPolicy_detail": policy})
}

// DeleteNetworkPolicyGin handles network policy deletion
func (h *Handler) DeleteNetworkPolicyGin(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")

	err := h.service.DeleteNetworkPolicy(c.Request.Context(), namespace, name)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			common.SendError(c, http.StatusNotFound, common.ErrCodeNotFound, "NetworkPolicy not found", err.Error())
		} else {
			common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to delete network policy", err.Error())
		}
		return
	}
	common.SendSuccess(c, gin.H{"message": "NetworkPolicy deleted successfully"})
}

// ApplyNetworkPolicyGin handles network policy creation/update
func (h *Handler) ApplyNetworkPolicyGin(c *gin.Context) {
	contentType := c.GetHeader("Content-Type")
	contentType = strings.ToLower(strings.TrimSpace(contentType))

	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Failed to read request body", err.Error())
		return
	}

	if len(body) == 0 {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Request body is empty", "Please provide a valid NetworkPolicy specification")
		return
	}

	var policy networkingv1.NetworkPolicy

	switch {
	case strings.Contains(contentType, "application/yaml") || strings.Contains(contentType, "text/yaml"):
		err = yaml.Unmarshal(body, &policy)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid YAML network policy specification", err.Error())
			return
		}
	case strings.Contains(contentType, "application/json"), contentType == "":
		err = json.Unmarshal(body, &policy)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid JSON network policy specification", err.Error())
			return
		}
	default:
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest,
			"Unsupported content type",
			"Content-Type must be 'application/json', 'application/yaml', or 'text/yaml'")
		return
	}

	if policy.Name == "" && policy.ObjectMeta.Name == "" {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest,
			"Invalid network policy specification",
			"NetworkPolicy name is required in metadata.name")
		return
	}

	appliedPolicy, err := h.service.ApplyNetworkPolicy(c.Request.Context(), &policy)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to apply network policy", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"networkPolicy_detail": appliedPolicy})
}

// UpdateNetworkPolicyGin handles network policy updates
func (h *Handler) UpdateNetworkPolicyGin(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")

	contentType := c.GetHeader("Content-Type")
	contentType = strings.ToLower(strings.TrimSpace(contentType))

	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Failed to read request body", err.Error())
		return
	}

	if len(body) == 0 {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Request body is empty", "Please provide a valid NetworkPolicy specification")
		return
	}

	var policy networkingv1.NetworkPolicy

	switch {
	case strings.Contains(contentType, "application/yaml") || strings.Contains(contentType, "text/yaml"):
		err = yaml.Unmarshal(body, &policy)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid YAML network policy specification", err.Error())
			return
		}
	case strings.Contains(contentType, "application/json"), contentType == "":
		err = json.Unmarshal(body, &policy)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid JSON network policy specification", err.Error())
			return
		}
	default:
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest,
			"Unsupported content type",
			"Content-Type must be 'application/json', 'application/yaml', or 'text/yaml'")
		return
	}

	updatedPolicy, err := h.service.UpdateNetworkPolicy(c.Request.Context(), namespace, name, &policy)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			common.SendError(c, http.StatusNotFound, common.ErrCodeNotFound, "NetworkPolicy not found", err.Error())
		} else {
			common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to update network policy", err.Error())
		}
		return
	}
	common.SendSuccess(c, gin.H{"networkPolicy_detail": updatedPolicy})
}

// NoKubernetesHandler returns a handler that responds with Kubernetes not installed error
func NoKubernetesHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		common.SendError(c, http.StatusServiceUnavailable, common.ErrCodeNotImplemented,
			"Kubernetes is not installed on this system",
			"The kubelet service was not found on this system. Please install Kubernetes to use these features.")
	}
}

// Helper functions for YAML response support

// isYAMLRequested checks if the client requested YAML format
func isYAMLRequested(c *gin.Context) bool {
	accept := c.GetHeader("Accept")
	accept = strings.ToLower(accept)

	// Check for various YAML content types
	yamlTypes := []string{
		"application/yaml",
		"application/x-yaml",
		"application/yml",
		"text/yaml",
		"text/yml",
		"text/x-yaml",
	}

	for _, yamlType := range yamlTypes {
		if strings.Contains(accept, yamlType) {
			return true
		}
	}

	return false
}

// respondYAML sends a YAML response

// respondYAML sends a YAML response, removing managedFields from Kubernetes objects
func respondYAML(c *gin.Context, data interface{}) {
// Clean the data by removing managedFields
cleanedData := removeManagedFields(data)

yamlData, err := yaml.Marshal(cleanedData)
if err != nil {
// Fallback to JSON if YAML marshaling fails
common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to marshal response to YAML", err.Error())
return
}

c.Data(http.StatusOK, "application/yaml", yamlData)
}

// removeManagedFields removes the managedFields from Kubernetes objects
// This field contains internal metadata that's usually not useful for clients
func removeManagedFields(data interface{}) interface{} {
// First, try to handle it as a Kubernetes object with TypeMeta
// We'll use JSON marshaling/unmarshaling to work with a generic structure

jsonBytes, err := json.Marshal(data)
if err != nil {
// If we can't marshal, return original data
return data
}

// Try to unmarshal as a generic map
var obj map[string]interface{}
if err := json.Unmarshal(jsonBytes, &obj); err != nil {
// If it's not a JSON object, return original data
return data
}

// Clean the object
cleanKubernetesObject(obj)

return obj
}

// cleanKubernetesObject recursively removes managedFields from Kubernetes objects
func cleanKubernetesObject(obj map[string]interface{}) {
// Check if this object has metadata
if metadata, ok := obj["metadata"].(map[string]interface{}); ok {
// Remove managedFields
delete(metadata, "managedFields")

// Also remove other verbose fields that clutter the output
// These fields are usually not needed when viewing/editing resources
delete(metadata, "selfLink")        // deprecated field
delete(metadata, "uid")              // unique identifier, auto-generated
// Keep resourceVersion and generation as they might be needed for updates
}

// Handle lists (like PodList, DeploymentList, etc.)
if items, ok := obj["items"].([]interface{}); ok {
for _, item := range items {
if itemMap, ok := item.(map[string]interface{}); ok {
cleanKubernetesObject(itemMap)
}
}
}

// Handle nested objects that might contain Kubernetes resources
for _, value := range obj {
switch v := value.(type) {
case map[string]interface{}:
// Check if this looks like a Kubernetes object (has metadata)
if _, hasMetadata := v["metadata"]; hasMetadata {
cleanKubernetesObject(v)
}
case []interface{}:
// Handle arrays of objects
for _, item := range v {
if itemMap, ok := item.(map[string]interface{}); ok {
if _, hasMetadata := itemMap["metadata"]; hasMetadata {
cleanKubernetesObject(itemMap)
}
}
}
}
}
}

// respondYAMLError sends an error response in YAML format
func respondYAMLError(c *gin.Context, statusCode int, code, message string, details ...string) {
errResponse := common.ErrorResponse(code, message, details...)

yamlData, err := yaml.Marshal(errResponse)
if err != nil {
// Fallback to JSON if YAML marshaling fails
common.SendError(c, statusCode, code, message, details...)
return
}

c.Data(statusCode, "application/yaml", yamlData)
}
