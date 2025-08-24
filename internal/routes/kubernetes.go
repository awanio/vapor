package routes

import (
	"fmt"
	"log"

	"github.com/awanio/vapor/internal/helm"
	"github.com/awanio/vapor/internal/kubernetes"
	"github.com/gin-gonic/gin"
)

// KubernetesRoutes sets up Kubernetes-related routes
func KubernetesRoutes(r *gin.RouterGroup) {
	fmt.Printf("[DEBUG] Attempting to create Kubernetes service...\n")
	kubernetesService, err := kubernetes.NewService()
	if err != nil {
		fmt.Printf("[ERROR] Failed to create Kubernetes service: %v\n", err)
		log.Printf("Warning: Kubernetes service not available: %v", err)
		
		// Register Kubernetes routes with NoKubernetesHandler
		registerNoKubernetesRoutes(r)
		return
	}

	fmt.Printf("[DEBUG] Successfully created Kubernetes service\n")
	log.Printf("Kubernetes service initialized successfully")
	
	// Register Kubernetes routes
	k8sHandler := kubernetes.NewHandler(kubernetesService)
	
	// CRD routes
	r.GET("/kubernetes/customresourcedefinitions", k8sHandler.ListCRDsGin)
	r.GET("/kubernetes/customresourcedefinitions/:name", k8sHandler.GetCRDDetailGin)
	r.GET("/kubernetes/customresourcedefinitions/:name/instances", k8sHandler.ListCRDObjectsGin)
	r.GET("/kubernetes/customresourcedefinitions/:name/instances/:namespace/:object-name", k8sHandler.GetCRDObjectDetailGin)
	
	// Pod routes
	r.GET("/kubernetes/pods", k8sHandler.ListPodsGin)
	r.GET("/kubernetes/pods/:namespace/:name", k8sHandler.GetPodDetailGin)
	r.GET("/kubernetes/pods/:namespace/:name/logs", k8sHandler.GetPodLogsGin)
	r.DELETE("/kubernetes/pods/:namespace/:name", k8sHandler.DeletePodGin)
	r.POST("/kubernetes/pods", k8sHandler.ApplyPodGin)
	r.PUT("/kubernetes/pods/:namespace/:name", k8sHandler.UpdatePodGin)
	
	// Pod rollout routes (only set-image is supported for Pods)
	r.PATCH("/kubernetes/pods/:namespace/:name/rollout/images", k8sHandler.RolloutSetImagePodGin)
	
	// Deployment routes
	r.GET("/kubernetes/deployments", k8sHandler.ListDeploymentsGin)
	r.GET("/kubernetes/deployments/:namespace/:name", k8sHandler.GetDeploymentDetailGin)
	r.POST("/kubernetes/deployments", k8sHandler.ApplyDeploymentGin)
	r.PUT("/kubernetes/deployments/:namespace/:name", k8sHandler.UpdateDeploymentGin)
	r.DELETE("/kubernetes/deployments/:namespace/:name", k8sHandler.DeleteDeploymentGin)
	
	// Deployment rollout routes
	r.PATCH("/kubernetes/deployments/:namespace/:name/rollout/restart", k8sHandler.RolloutRestartDeploymentGin)
	r.PATCH("/kubernetes/deployments/:namespace/:name/rollout/undo", k8sHandler.RolloutUndoDeploymentGin)
	r.PATCH("/kubernetes/deployments/:namespace/:name/rollout/images", k8sHandler.RolloutSetImageDeploymentGin)
	
	// Service routes
	r.GET("/kubernetes/services", k8sHandler.ListServicesGin)
	r.GET("/kubernetes/services/:namespace/:name", k8sHandler.GetServiceDetailGin)
	r.POST("/kubernetes/services", k8sHandler.ApplyServiceGin)
	r.PUT("/kubernetes/services/:namespace/:name", k8sHandler.UpdateServiceGin)
	r.DELETE("/kubernetes/services/:namespace/:name", k8sHandler.DeleteServiceGin)
	
	// Ingress routes
	r.GET("/kubernetes/ingresses", k8sHandler.ListIngressesGin)
	r.GET("/kubernetes/ingresses/:namespace/:name", k8sHandler.GetIngressDetailGin)
	r.POST("/kubernetes/ingresses", k8sHandler.ApplyIngressGin)
	r.PUT("/kubernetes/ingresses/:namespace/:name", k8sHandler.UpdateIngressGin)
	r.DELETE("/kubernetes/ingresses/:namespace/:name", k8sHandler.DeleteIngressGin)
	
	// PVC routes
	r.GET("/kubernetes/persistentvolumeclaims", k8sHandler.ListPVCsGin)
	r.GET("/kubernetes/persistentvolumeclaims/:namespace/:name", k8sHandler.GetPVCDetailGin)
	r.POST("/kubernetes/persistentvolumeclaims", k8sHandler.ApplyPVCGin)
	r.PUT("/kubernetes/persistentvolumeclaims/:namespace/:name", k8sHandler.UpdatePVCGin)
	r.DELETE("/kubernetes/persistentvolumeclaims/:namespace/:name", k8sHandler.DeletePVCGin)
	
	// PV routes
	r.GET("/kubernetes/persistentvolumes", k8sHandler.ListPVsGin)
	r.GET("/kubernetes/persistentvolumes/:name", k8sHandler.GetPVDetailGin)
	r.POST("/kubernetes/persistentvolumes", k8sHandler.ApplyPVGin)
	r.PUT("/kubernetes/persistentvolumes/:name", k8sHandler.UpdatePVGin)
	r.DELETE("/kubernetes/persistentvolumes/:name", k8sHandler.DeletePVGin)
	
	// Secret routes
	r.GET("/kubernetes/secrets", k8sHandler.ListSecretsGin)
	r.GET("/kubernetes/secrets/:namespace/:name", k8sHandler.GetSecretDetailGin)
	r.POST("/kubernetes/secrets", k8sHandler.ApplySecretGin)
	r.PUT("/kubernetes/secrets/:namespace/:name", k8sHandler.UpdateSecretGin)
	r.DELETE("/kubernetes/secrets/:namespace/:name", k8sHandler.DeleteSecretGin)
	
	// ConfigMap routes
	r.GET("/kubernetes/configmaps", k8sHandler.ListConfigMapsGin)
	r.GET("/kubernetes/configmaps/:namespace/:name", k8sHandler.GetConfigMapDetailGin)
	r.POST("/kubernetes/configmaps", k8sHandler.ApplyConfigMapGin)
	r.PUT("/kubernetes/configmaps/:namespace/:name", k8sHandler.UpdateConfigMapGin)
	r.DELETE("/kubernetes/configmaps/:namespace/:name", k8sHandler.DeleteConfigMapGin)
	
	// Namespace routes
	r.GET("/kubernetes/namespaces", k8sHandler.ListNamespacesGin)
	r.GET("/kubernetes/namespaces/:name", k8sHandler.GetNamespaceDetailGin)
	r.POST("/kubernetes/namespaces", k8sHandler.ApplyNamespaceGin)
	r.PUT("/kubernetes/namespaces/:name", k8sHandler.UpdateNamespaceGin)
	r.DELETE("/kubernetes/namespaces/:name", k8sHandler.DeleteNamespaceGin)
	
	// Node routes
	r.GET("/kubernetes/nodes", k8sHandler.ListNodesGin)
	r.GET("/kubernetes/nodes/:name", k8sHandler.GetNodeDetailGin)
	
	// DaemonSet routes
	r.GET("/kubernetes/daemonsets", k8sHandler.ListDaemonSetsGin)
	r.GET("/kubernetes/daemonsets/:namespace/:name", k8sHandler.GetDaemonSetDetailGin)
	r.POST("/kubernetes/daemonsets", k8sHandler.ApplyDaemonSetGin)
	r.PUT("/kubernetes/daemonsets/:namespace/:name", k8sHandler.UpdateDaemonSetGin)
	r.DELETE("/kubernetes/daemonsets/:namespace/:name", k8sHandler.DeleteDaemonSetGin)
	
	// DaemonSet rollout routes
	r.PATCH("/kubernetes/daemonsets/:namespace/:name/rollout/restart", k8sHandler.RolloutRestartDaemonSetGin)
	r.PATCH("/kubernetes/daemonsets/:namespace/:name/rollout/undo", k8sHandler.RolloutUndoDaemonSetGin)
	r.PATCH("/kubernetes/daemonsets/:namespace/:name/rollout/images", k8sHandler.RolloutSetImageDaemonSetGin)
	
	// StatefulSet routes
	r.GET("/kubernetes/statefulsets", k8sHandler.ListStatefulSetsGin)
	r.GET("/kubernetes/statefulsets/:namespace/:name", k8sHandler.GetStatefulSetDetailGin)
	r.POST("/kubernetes/statefulsets", k8sHandler.ApplyStatefulSetGin)
	r.PUT("/kubernetes/statefulsets/:namespace/:name", k8sHandler.UpdateStatefulSetGin)
	r.DELETE("/kubernetes/statefulsets/:namespace/:name", k8sHandler.DeleteStatefulSetGin)
	
	// StatefulSet rollout routes
	r.PATCH("/kubernetes/statefulsets/:namespace/:name/rollout/restart", k8sHandler.RolloutRestartStatefulSetGin)
	r.PATCH("/kubernetes/statefulsets/:namespace/:name/rollout/undo", k8sHandler.RolloutUndoStatefulSetGin)
	r.PATCH("/kubernetes/statefulsets/:namespace/:name/rollout/images", k8sHandler.RolloutSetImageStatefulSetGin)
	
	// Job routes
	r.GET("/kubernetes/jobs", k8sHandler.ListJobsGin)
	r.GET("/kubernetes/jobs/:namespace/:name", k8sHandler.GetJobDetailGin)
	r.POST("/kubernetes/jobs", k8sHandler.ApplyJobGin)
	r.PUT("/kubernetes/jobs/:namespace/:name", k8sHandler.UpdateJobGin)
	r.DELETE("/kubernetes/jobs/:namespace/:name", k8sHandler.DeleteJobGin)
	
	// CronJob routes
	r.GET("/kubernetes/cronjobs", k8sHandler.ListCronJobsGin)
	r.GET("/kubernetes/cronjobs/:namespace/:name", k8sHandler.GetCronJobDetailGin)
	r.POST("/kubernetes/cronjobs", k8sHandler.ApplyCronJobGin)
	r.PUT("/kubernetes/cronjobs/:namespace/:name", k8sHandler.UpdateCronJobGin)
	r.DELETE("/kubernetes/cronjobs/:namespace/:name", k8sHandler.DeleteCronJobGin)
	
	// Cluster info
	r.GET("/kubernetes/cluster-info", k8sHandler.GetClusterInfoGin)
	
	// IngressClass routes
	r.GET("/kubernetes/ingressclasses", k8sHandler.ListIngressClassesGin)
	r.GET("/kubernetes/ingressclasses/:name", k8sHandler.GetIngressClassDetailGin)
	r.DELETE("/kubernetes/ingressclasses/:name", k8sHandler.DeleteIngressClassGin)
	r.POST("/kubernetes/ingressclasses", k8sHandler.ApplyIngressClassGin)
	r.PUT("/kubernetes/ingressclasses/:name", k8sHandler.UpdateIngressClassGin)
	
	// NetworkPolicy routes
	r.GET("/kubernetes/networkpolicies", k8sHandler.ListNetworkPoliciesGin)
	r.GET("/kubernetes/networkpolicies/:namespace/:name", k8sHandler.GetNetworkPolicyDetailGin)
	r.DELETE("/kubernetes/networkpolicies/:namespace/:name", k8sHandler.DeleteNetworkPolicyGin)
	r.POST("/kubernetes/networkpolicies", k8sHandler.ApplyNetworkPolicyGin)
	r.PUT("/kubernetes/networkpolicies/:namespace/:name", k8sHandler.UpdateNetworkPolicyGin)
	
	// Helm service
	HelmRoutes(r, kubernetesService)
}

// HelmRoutes sets up Helm-related routes
func HelmRoutes(r *gin.RouterGroup, kubernetesService *kubernetes.Service) {
	helmService, err := helm.NewService(kubernetesService)
	if err != nil {
		log.Printf("Warning: Helm service not available: %v", err)
		noHelmHandler := helm.NoHelmHandler()
		r.GET("/kubernetes/helm/releases", noHelmHandler)
		r.GET("/kubernetes/helm/charts", noHelmHandler)
		r.GET("/kubernetes/helm/repositories", noHelmHandler)
		r.PUT("/kubernetes/helm/repositories/:name/update", noHelmHandler)
		return
	}
	
	helmHandler := helm.NewServiceHandler(helmService)
	r.GET("/kubernetes/helm/releases", helmHandler.ListReleasesGin)
	r.GET("/kubernetes/helm/charts", helmHandler.ListChartsGin)
	r.GET("/kubernetes/helm/repositories", helmHandler.ListRepositoriesGin)
	r.PUT("/kubernetes/helm/repositories/:name/update", helmHandler.UpdateRepositoryGin)
}

// registerNoKubernetesRoutes registers all Kubernetes routes with a no-op handler
func registerNoKubernetesRoutes(r *gin.RouterGroup) {
	noK8sHandler := kubernetes.NoKubernetesHandler()
	
	// All routes point to the same no-op handler
	r.GET("/kubernetes/customresourcedefinitions", noK8sHandler)
	r.GET("/kubernetes/customresourcedefinitions/:name", noK8sHandler)
	r.GET("/kubernetes/customresourcedefinitions/:name/instances", noK8sHandler)
	r.GET("/kubernetes/customresourcedefinitions/:name/instances/:namespace/:object-name", noK8sHandler)
	r.GET("/kubernetes/pods", noK8sHandler)
	r.GET("/kubernetes/pods/:namespace/:name", noK8sHandler)
	r.GET("/kubernetes/pods/:namespace/:name/logs", noK8sHandler)
	r.DELETE("/kubernetes/pods/:namespace/:name", noK8sHandler)
	r.POST("/kubernetes/pods", noK8sHandler)
	r.PUT("/kubernetes/pods/:namespace/:name", noK8sHandler)
	r.PATCH("/kubernetes/pods/:namespace/:name/rollout/images", noK8sHandler)
	r.GET("/kubernetes/deployments", noK8sHandler)
	r.GET("/kubernetes/deployments/:namespace/:name", noK8sHandler)
	r.POST("/kubernetes/deployments", noK8sHandler)
	r.PUT("/kubernetes/deployments/:namespace/:name", noK8sHandler)
	r.DELETE("/kubernetes/deployments/:namespace/:name", noK8sHandler)
	r.PATCH("/kubernetes/deployments/:namespace/:name/rollout/restart", noK8sHandler)
	r.PATCH("/kubernetes/deployments/:namespace/:name/rollout/undo", noK8sHandler)
	r.PATCH("/kubernetes/deployments/:namespace/:name/rollout/images", noK8sHandler)
	r.GET("/kubernetes/services", noK8sHandler)
	r.GET("/kubernetes/services/:namespace/:name", noK8sHandler)
	r.POST("/kubernetes/services", noK8sHandler)
	r.PUT("/kubernetes/services/:namespace/:name", noK8sHandler)
	r.DELETE("/kubernetes/services/:namespace/:name", noK8sHandler)
	r.GET("/kubernetes/ingresses", noK8sHandler)
	r.GET("/kubernetes/ingresses/:namespace/:name", noK8sHandler)
	r.POST("/kubernetes/ingresses", noK8sHandler)
	r.PUT("/kubernetes/ingresses/:namespace/:name", noK8sHandler)
	r.DELETE("/kubernetes/ingresses/:namespace/:name", noK8sHandler)
	r.GET("/kubernetes/pvcs", noK8sHandler)
	r.GET("/kubernetes/pvcs/:namespace/:name", noK8sHandler)
	r.POST("/kubernetes/pvcs", noK8sHandler)
	r.PUT("/kubernetes/pvcs/:namespace/:name", noK8sHandler)
	r.DELETE("/kubernetes/pvcs/:namespace/:name", noK8sHandler)
	r.GET("/kubernetes/pvs", noK8sHandler)
	r.GET("/kubernetes/pvs/:name", noK8sHandler)
	r.POST("/kubernetes/pvs", noK8sHandler)
	r.PUT("/kubernetes/pvs/:name", noK8sHandler)
	r.DELETE("/kubernetes/pvs/:name", noK8sHandler)
	r.GET("/kubernetes/secrets", noK8sHandler)
	r.GET("/kubernetes/secrets/:namespace/:name", noK8sHandler)
	r.POST("/kubernetes/secrets", noK8sHandler)
	r.PUT("/kubernetes/secrets/:namespace/:name", noK8sHandler)
	r.DELETE("/kubernetes/secrets/:namespace/:name", noK8sHandler)
	r.GET("/kubernetes/configmaps", noK8sHandler)
	r.GET("/kubernetes/configmaps/:namespace/:name", noK8sHandler)
	r.POST("/kubernetes/configmaps", noK8sHandler)
	r.PUT("/kubernetes/configmaps/:namespace/:name", noK8sHandler)
	r.DELETE("/kubernetes/configmaps/:namespace/:name", noK8sHandler)
	r.GET("/kubernetes/namespaces", noK8sHandler)
	r.GET("/kubernetes/namespaces/:name", noK8sHandler)
	r.POST("/kubernetes/namespaces", noK8sHandler)
	r.PUT("/kubernetes/namespaces/:name", noK8sHandler)
	r.DELETE("/kubernetes/namespaces/:name", noK8sHandler)
	r.GET("/kubernetes/nodes", noK8sHandler)
	r.GET("/kubernetes/nodes/:name", noK8sHandler)
	r.GET("/kubernetes/daemonsets", noK8sHandler)
	r.GET("/kubernetes/daemonsets/:namespace/:name", noK8sHandler)
	r.POST("/kubernetes/daemonsets", noK8sHandler)
	r.PUT("/kubernetes/daemonsets/:namespace/:name", noK8sHandler)
	r.DELETE("/kubernetes/daemonsets/:namespace/:name", noK8sHandler)
	r.PATCH("/kubernetes/daemonsets/:namespace/:name/rollout/restart", noK8sHandler)
	r.PATCH("/kubernetes/daemonsets/:namespace/:name/rollout/undo", noK8sHandler)
	r.PATCH("/kubernetes/daemonsets/:namespace/:name/rollout/images", noK8sHandler)
	r.GET("/kubernetes/statefulsets", noK8sHandler)
	r.GET("/kubernetes/statefulsets/:namespace/:name", noK8sHandler)
	r.POST("/kubernetes/statefulsets", noK8sHandler)
	r.PUT("/kubernetes/statefulsets/:namespace/:name", noK8sHandler)
	r.DELETE("/kubernetes/statefulsets/:namespace/:name", noK8sHandler)
	r.PATCH("/kubernetes/statefulsets/:namespace/:name/rollout/restart", noK8sHandler)
	r.PATCH("/kubernetes/statefulsets/:namespace/:name/rollout/undo", noK8sHandler)
	r.PATCH("/kubernetes/statefulsets/:namespace/:name/rollout/images", noK8sHandler)
	r.GET("/kubernetes/jobs", noK8sHandler)
	r.GET("/kubernetes/jobs/:namespace/:name", noK8sHandler)
	r.POST("/kubernetes/jobs", noK8sHandler)
	r.PUT("/kubernetes/jobs/:namespace/:name", noK8sHandler)
	r.DELETE("/kubernetes/jobs/:namespace/:name", noK8sHandler)
	r.GET("/kubernetes/cronjobs", noK8sHandler)
	r.GET("/kubernetes/cronjobs/:namespace/:name", noK8sHandler)
	r.POST("/kubernetes/cronjobs", noK8sHandler)
	r.PUT("/kubernetes/cronjobs/:namespace/:name", noK8sHandler)
	r.DELETE("/kubernetes/cronjobs/:namespace/:name", noK8sHandler)
	r.GET("/kubernetes/cluster-info", noK8sHandler)
	r.GET("/kubernetes/ingressclasses", noK8sHandler)
	r.GET("/kubernetes/ingressclasses/:name", noK8sHandler)
	r.DELETE("/kubernetes/ingressclasses/:name", noK8sHandler)
	r.POST("/kubernetes/ingressclasses", noK8sHandler)
	r.PUT("/kubernetes/ingressclasses/:name", noK8sHandler)
	r.GET("/kubernetes/networkpolicies", noK8sHandler)
	r.GET("/kubernetes/networkpolicies/:namespace/:name", noK8sHandler)
	r.DELETE("/kubernetes/networkpolicies/:namespace/:name", noK8sHandler)
	r.POST("/kubernetes/networkpolicies", noK8sHandler)
	r.PUT("/kubernetes/networkpolicies/:namespace/:name", noK8sHandler)
	
	// Helm routes with NoHelmHandler
	noHelmHandler := helm.NoHelmHandler()
	r.GET("/kubernetes/helm/releases", noHelmHandler)
	r.GET("/kubernetes/helm/charts", noHelmHandler)
	r.GET("/kubernetes/helm/repositories", noHelmHandler)
	r.PUT("/kubernetes/helm/repositories/:name/update", noHelmHandler)
}
