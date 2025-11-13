package kubernetes

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/exec"
	"strings"
	"time"

	appsv1 "k8s.io/api/apps/v1"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
policyv1 "k8s.io/api/policy/v1"
	apiextensionsv1 "k8s.io/apiextensions-apiserver/pkg/apis/apiextensions/v1"
	apiextensionsclient "k8s.io/apiextensions-apiserver/pkg/client/clientset/clientset"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

// Service represents the Kubernetes service implementation
type Service struct {
	client              kubernetes.Interface
	apiExtensionsClient apiextensionsclient.Interface
	dynamicClient       dynamic.Interface
	nodeName            string
	isControlPlane      bool
}

// NewService creates a new Kubernetes service
func NewService() (*Service, error) {
	fmt.Printf("[DEBUG] NewService: Starting Kubernetes service initialization\n")

	// First, check if Kubernetes is installed by looking for admin.conf
	if _, err := os.Stat("/etc/kubernetes/admin.conf"); err == nil {
		fmt.Printf("[DEBUG] NewService: Found /etc/kubernetes/admin.conf\n")
		// Try to load from admin.conf first (control plane node)
		config, err := clientcmd.BuildConfigFromFlags("", "/etc/kubernetes/admin.conf")
		if err == nil {
			fmt.Printf("[DEBUG] NewService: Successfully loaded config from admin.conf\n")
			// Successfully loaded admin config, create clientset and return
			return createServiceWithConfig(config)
		}
		// If admin.conf exists but can't be loaded, log and continue with other methods
		fmt.Printf("Warning: /etc/kubernetes/admin.conf exists but failed to load: %v\n", err)
	} else {
		fmt.Printf("[DEBUG] NewService: /etc/kubernetes/admin.conf not found: %v\n", err)
	}

	// Try to load from default kubeconfig location (~/.kube/config)
	fmt.Printf("[DEBUG] NewService: Trying default kubeconfig location: %s\n", clientcmd.RecommendedHomeFile)
	config, err := clientcmd.BuildConfigFromFlags("", clientcmd.RecommendedHomeFile)
	if err != nil {
		fmt.Printf("[DEBUG] NewService: Failed to load default kubeconfig: %v\n", err)
		// If that fails, try in-cluster config (for pods running inside cluster)
		fmt.Printf("[DEBUG] NewService: Trying in-cluster config\n")
		config, err = rest.InClusterConfig()
		if err != nil {
			fmt.Printf("[DEBUG] NewService: Failed to load in-cluster config: %v\n", err)
			// Check if kubectl is available as a fallback indicator
			if !isKubernetesInstalled() {
				fmt.Printf("[ERROR] NewService: Kubernetes not installed on this system\n")
				return nil, fmt.Errorf("kubernetes is not installed on this system: %w", err)
			}
			return nil, fmt.Errorf("failed to create kubernetes config: %w", err)
		}
		fmt.Printf("[DEBUG] NewService: Successfully loaded in-cluster config\n")
	} else {
		fmt.Printf("[DEBUG] NewService: Successfully loaded config from default kubeconfig\n")
	}

	// Create the clientset
	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, err
	}

	// Create the API extensions client for CRDs
	apiExtensionsClient, err := apiextensionsclient.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create API extensions client: %w", err)
	}

	// Create the dynamic client for dynamic CRD operations
	dynamicClient, err := dynamic.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create dynamic client: %w", err)
	}

	// Get node name from environment
	nodeName := os.Getenv("NODE_NAME")

	// Check if this is a control plane node
	isControlPlane := false
	if nodeName != "" {
		nodes, err := clientset.CoreV1().Nodes().List(context.TODO(), metav1.ListOptions{})
		if err != nil {
			return nil, err
		}

		for _, node := range nodes.Items {
			if node.Name == nodeName {
				for label := range node.Labels {
					if label == "node-role.kubernetes.io/master" || label == "node-role.kubernetes.io/control-plane" {
						isControlPlane = true
						break
					}
				}
			}
		}
	}

	return &Service{
		client:              clientset,
		apiExtensionsClient: apiExtensionsClient,
		dynamicClient:       dynamicClient,
		nodeName:            nodeName,
		isControlPlane:      isControlPlane,
	}, nil
}

// GetRESTConfig returns the Kubernetes REST config
func (s *Service) GetRESTConfig() (*rest.Config, error) {
	// Try to load from default kubeconfig
	config, err := clientcmd.BuildConfigFromFlags("", clientcmd.RecommendedHomeFile)
	if err != nil {
		// If that fails, try in-cluster config
		config, err = rest.InClusterConfig()
		if err != nil {
			return nil, fmt.Errorf("failed to create kubernetes config: %w", err)
		}
	}
	return config, nil
}

func (s *Service) ListDeployments(ctx context.Context, opts interface{}) ([]DeploymentInfo, error) {
	deployments, err := s.client.AppsV1().Deployments("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list deployments: %w", err)
	}

	deploymentList := make([]DeploymentInfo, 0, len(deployments.Items))
	for _, d := range deployments.Items {
		deploymentList = append(deploymentList, DeploymentInfo{
			APIVersion: "apps/v1",
			Kind:       "Deployment",
			Name:       d.Name,
			Namespace:  d.Namespace,
			Ready:      fmt.Sprintf("%d/%d", d.Status.ReadyReplicas, d.Status.Replicas),
			UpToDate:   d.Status.UpdatedReplicas,
			Available:  d.Status.AvailableReplicas,
			Age:        calculateAge(d.CreationTimestamp.Time),
			Labels:     d.Labels,
		})
	}

	return deploymentList, nil
}

// ListServices lists all services in the cluster
func (s *Service) ListServices(ctx context.Context, opts interface{}) ([]ServiceInfo, error) {
	services, err := s.client.CoreV1().Services("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list services: %w", err)
	}

	serviceList := make([]ServiceInfo, 0, len(services.Items))
	for _, svc := range services.Items {
		serviceList = append(serviceList, ServiceInfo{
			APIVersion: "v1",
			Kind:       "Service",
			Name:       svc.Name,
			Namespace:  svc.Namespace,
			Type:       string(svc.Spec.Type),
			ClusterIP:  svc.Spec.ClusterIP,
			Ports:      "",
			Labels:     svc.Labels,
		})
	}

	return serviceList, nil
}

// ListIngresses lists all ingresses in the cluster
func (s *Service) ListIngresses(ctx context.Context, opts interface{}) ([]IngressInfo, error) {
	ingresses, err := s.client.NetworkingV1().Ingresses("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list ingresses: %w", err)
	}

	ingressList := make([]IngressInfo, 0, len(ingresses.Items))
	for _, ing := range ingresses.Items {
		hosts := make([]string, 0, len(ing.Spec.Rules))
		for _, rule := range ing.Spec.Rules {
			hosts = append(hosts, rule.Host)
		}

		ingressList = append(ingressList, IngressInfo{
			APIVersion: "networking.k8s.io/v1",
			Kind:       "Ingress",
			Name:       ing.Name,
			Namespace:  ing.Namespace,
			Hosts:      hosts,
			Labels:     ing.Labels,
		})
	}

	return ingressList, nil
}

// ListPVCs lists all persistent volume claims in the cluster
func (s *Service) ListPVCs(ctx context.Context, opts interface{}) ([]PVCInfo, error) {
	pvcs, err := s.client.CoreV1().PersistentVolumeClaims("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list PVCs: %w", err)
	}

	pvcList := make([]PVCInfo, 0, len(pvcs.Items))
	for _, pvc := range pvcs.Items {
		pvcList = append(pvcList, PVCInfo{
			APIVersion: "v1",
			Kind:       "PersistentVolumeClaim",
			Name:       pvc.Name,
			Namespace:  pvc.Namespace,
			Status:     string(pvc.Status.Phase),
			Volume:     pvc.Spec.VolumeName,
		})
	}

	return pvcList, nil
}

// ListPVs lists all persistent volumes in the cluster
func (s *Service) ListPVs(ctx context.Context, opts interface{}) ([]PVInfo, error) {
	pvs, err := s.client.CoreV1().PersistentVolumes().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list PVs: %w", err)
	}

	pvList := make([]PVInfo, 0, len(pvs.Items))
	for _, pv := range pvs.Items {
		pvList = append(pvList, PVInfo{
			APIVersion: "v1",
			Kind:       "PersistentVolume",
			Name:       pv.Name,
		})
	}

	return pvList, nil
}

// ListSecrets lists all secrets in the cluster
func (s *Service) ListSecrets(ctx context.Context, opts interface{}) ([]SecretInfo, error) {
	secrets, err := s.client.CoreV1().Secrets("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list secrets: %w", err)
	}

	secretList := make([]SecretInfo, 0, len(secrets.Items))
	for _, secret := range secrets.Items {
		secretList = append(secretList, SecretInfo{
			APIVersion: "v1",
			Kind:       "Secret",
			Name:       secret.Name,
			Namespace:  secret.Namespace,
		})
	}

	return secretList, nil
}

// ListConfigMaps lists all configmaps in the cluster
func (s *Service) ListConfigMaps(ctx context.Context, opts interface{}) ([]ConfigMapInfo, error) {
	configmaps, err := s.client.CoreV1().ConfigMaps("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list configmaps: %w", err)
	}

	configMapList := make([]ConfigMapInfo, 0, len(configmaps.Items))
	for _, configmap := range configmaps.Items {
		configMapList = append(configMapList, ConfigMapInfo{
			APIVersion: "v1",
			Kind:       "ConfigMap",
			Name:       configmap.Name,
			Namespace:  configmap.Namespace,
		})
	}

	return configMapList, nil
}

// ListNamespaces lists all namespaces in the cluster
func (s *Service) ListNamespaces(ctx context.Context, opts interface{}) ([]NamespaceInfo, error) {
	namespaces, err := s.client.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list namespaces: %w", err)
	}

	namespaceList := make([]NamespaceInfo, 0, len(namespaces.Items))
	for _, namespace := range namespaces.Items {
		namespaceList = append(namespaceList, NamespaceInfo{
			APIVersion: "v1",
			Kind:       "Namespace",
			Name:       namespace.Name,
		})
	}

	return namespaceList, nil
}

// ListNodes lists all nodes in the cluster
func (s *Service) ListNodes(ctx context.Context, opts interface{}) ([]NodeInfo, error) {
	nodes, err := s.client.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list nodes: %w", err)
	}

	nodeList := make([]NodeInfo, 0, len(nodes.Items))
	for _, node := range nodes.Items {
		// Get node status
		status := "NotReady"
		for _, condition := range node.Status.Conditions {
			if condition.Type == corev1.NodeReady {
				if condition.Status == corev1.ConditionTrue {
					status = "Ready"
				}
				break
			}
		}

		// Get node roles
		roles := []string{}
		for label := range node.Labels {
			if strings.HasPrefix(label, "node-role.kubernetes.io/") {
				role := strings.TrimPrefix(label, "node-role.kubernetes.io/")
				roles = append(roles, role)
			}
		}
		rolesStr := "<none>"
		if len(roles) > 0 {
			rolesStr = strings.Join(roles, ",")
		}

		// Get node IPs
		internalIP := ""
		externalIP := ""
		for _, addr := range node.Status.Addresses {
			switch addr.Type {
			case corev1.NodeInternalIP:
				internalIP = addr.Address
			case corev1.NodeExternalIP:
				externalIP = addr.Address
			}
		}

		// Get node info
		nodeInfo := node.Status.NodeInfo

		nodeList = append(nodeList, NodeInfo{
			APIVersion:        "v1",
			Kind:              "Node",
			Name:              node.Name,
			Status:            status,
			Roles:             rolesStr,
			Age:               calculateAge(node.CreationTimestamp.Time),
			Version:           nodeInfo.KubeletVersion,
			InternalIP:        internalIP,
			ExternalIP:        externalIP,
			OS:                nodeInfo.OSImage,
			KernelVersion:     nodeInfo.KernelVersion,
			ContainerRuntime:  nodeInfo.ContainerRuntimeVersion,
			Labels:            node.Labels,
			CreationTimestamp: node.CreationTimestamp.Time,
		})
	}

	return nodeList, nil
}

// ListDaemonSets lists all daemonsets in the cluster
func (s *Service) ListDaemonSets(ctx context.Context, opts interface{}) ([]DaemonSetInfo, error) {
	daemonSets, err := s.client.AppsV1().DaemonSets("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list daemonsets: %w", err)
	}

	daemonSetList := make([]DaemonSetInfo, 0, len(daemonSets.Items))
	for _, ds := range daemonSets.Items {
		daemonSetList = append(daemonSetList, DaemonSetInfo{
			APIVersion: "apps/v1",
			Kind:       "DaemonSet",
			Name:       ds.Name,
			Namespace:  ds.Namespace,
			Desired:    ds.Status.DesiredNumberScheduled,
			Current:    ds.Status.CurrentNumberScheduled,
			Ready:      ds.Status.NumberReady,
			UpToDate:   ds.Status.UpdatedNumberScheduled,
			Available:  ds.Status.NumberAvailable,
			Age:        calculateAge(ds.CreationTimestamp.Time),
			Labels:     ds.Labels,
		})
	}

	return daemonSetList, nil
}

// ListStatefulSets lists all statefulsets in the cluster
func (s *Service) ListStatefulSets(ctx context.Context, opts interface{}) ([]StatefulSetInfo, error) {
	statefulSets, err := s.client.AppsV1().StatefulSets("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list statefulsets: %w", err)
	}

	statefulSetList := make([]StatefulSetInfo, 0, len(statefulSets.Items))
	for _, sts := range statefulSets.Items {
		statefulSetList = append(statefulSetList, StatefulSetInfo{
			APIVersion: "apps/v1",
			Kind:       "StatefulSet",
			Name:       sts.Name,
			Namespace:  sts.Namespace,
			Ready:      fmt.Sprintf("%d/%d", sts.Status.ReadyReplicas, sts.Status.Replicas),
			Age:        calculateAge(sts.CreationTimestamp.Time),
			Labels:     sts.Labels,
		})
	}

	return statefulSetList, nil
}

// ListJobs lists all jobs in the cluster
func (s *Service) ListJobs(ctx context.Context, opts interface{}) ([]JobInfo, error) {
	jobs, err := s.client.BatchV1().Jobs("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list jobs: %w", err)
	}

	jobList := make([]JobInfo, 0, len(jobs.Items))
	for _, job := range jobs.Items {
		completions := "0/0"
		if job.Spec.Completions != nil {
			completions = fmt.Sprintf("%d/%d", job.Status.Succeeded, *job.Spec.Completions)
		}

		jobList = append(jobList, JobInfo{
			APIVersion:  "batch/v1",
			Kind:        "Job",
			Name:        job.Name,
			Namespace:   job.Namespace,
			Completions: completions,
			Age:         calculateAge(job.CreationTimestamp.Time),
			Labels:      job.Labels,
		})
	}

	return jobList, nil
}

// ListCronJobs lists all cronjobs in the cluster
func (s *Service) ListCronJobs(ctx context.Context, opts interface{}) ([]CronJobInfo, error) {
	cronJobs, err := s.client.BatchV1().CronJobs("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list cronjobs: %w", err)
	}

	cronJobList := make([]CronJobInfo, 0, len(cronJobs.Items))
	for _, cj := range cronJobs.Items {
		lastSchedule := "N/A"
		if cj.Status.LastScheduleTime != nil {
			lastSchedule = calculateAge(cj.Status.LastScheduleTime.Time)
		}

		cronJobList = append(cronJobList, CronJobInfo{
			APIVersion:   "batch/v1",
			Kind:         "CronJob",
			Name:         cj.Name,
			Namespace:    cj.Namespace,
			Schedule:     cj.Spec.Schedule,
			Suspend:      *cj.Spec.Suspend,
			Active:       len(cj.Status.Active),
			LastSchedule: lastSchedule,
			Age:          calculateAge(cj.CreationTimestamp.Time),
			Labels:       cj.Labels,
		})
	}

	return cronJobList, nil
}

// GetCRDDetail retrieves detailed information about a specific CRD
func (s *Service) GetCRDDetail(ctx context.Context, name string) (*apiextensionsv1.CustomResourceDefinition, error) {
	crd, err := s.apiExtensionsClient.ApiextensionsV1().CustomResourceDefinitions().Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get CRD detail: %w", err)
	}
	crd.APIVersion = "apiextensions.k8s.io/v1"
	crd.Kind = "CustomResourceDefinition"
	return crd, nil
}

// ApplyCRD creates or updates a Custom Resource Definition
func (s *Service) ApplyCRD(ctx context.Context, crd *apiextensionsv1.CustomResourceDefinition) (*apiextensionsv1.CustomResourceDefinition, error) {
// Try to get the CRD first to see if it exists
existingCRD, err := s.apiExtensionsClient.ApiextensionsV1().CustomResourceDefinitions().Get(ctx, crd.Name, metav1.GetOptions{})

if err != nil {
// CRD doesn't exist, create it
createdCRD, createErr := s.apiExtensionsClient.ApiextensionsV1().CustomResourceDefinitions().Create(ctx, crd, metav1.CreateOptions{})
if createErr != nil {
return nil, fmt.Errorf("failed to create CRD: %w", createErr)
}
createdCRD.APIVersion = "apiextensions.k8s.io/v1"
createdCRD.Kind = "CustomResourceDefinition"
return createdCRD, nil
}

// CRD exists, update it
crd.ResourceVersion = existingCRD.ResourceVersion
updatedCRD, updateErr := s.apiExtensionsClient.ApiextensionsV1().CustomResourceDefinitions().Update(ctx, crd, metav1.UpdateOptions{})
if updateErr != nil {
return nil, fmt.Errorf("failed to update CRD: %w", updateErr)
}
updatedCRD.APIVersion = "apiextensions.k8s.io/v1"
updatedCRD.Kind = "CustomResourceDefinition"
return updatedCRD, nil
}

// UpdateCRD updates an existing Custom Resource Definition
func (s *Service) UpdateCRD(ctx context.Context, name string, crd *apiextensionsv1.CustomResourceDefinition) (*apiextensionsv1.CustomResourceDefinition, error) {
// Get the existing CRD to obtain its ResourceVersion
existingCRD, err := s.apiExtensionsClient.ApiextensionsV1().CustomResourceDefinitions().Get(ctx, name, metav1.GetOptions{})
if err != nil {
return nil, fmt.Errorf("failed to get existing CRD: %w", err)
}

// Set the ResourceVersion for optimistic concurrency control
crd.ResourceVersion = existingCRD.ResourceVersion
crd.Name = name // Ensure the name matches

updatedCRD, updateErr := s.apiExtensionsClient.ApiextensionsV1().CustomResourceDefinitions().Update(ctx, crd, metav1.UpdateOptions{})
if updateErr != nil {
return nil, fmt.Errorf("failed to update CRD: %w", updateErr)
}
updatedCRD.APIVersion = "apiextensions.k8s.io/v1"
updatedCRD.Kind = "CustomResourceDefinition"
return updatedCRD, nil
}

// DeleteCRD deletes a Custom Resource Definition
func (s *Service) DeleteCRD(ctx context.Context, name string) error {
err := s.apiExtensionsClient.ApiextensionsV1().CustomResourceDefinitions().Delete(ctx, name, metav1.DeleteOptions{})
if err != nil {
return fmt.Errorf("failed to delete CRD: %w", err)
}
return nil
}

// ListCRDObjects lists all objects for a specific CRD
func (s *Service) ListCRDObjects(ctx context.Context, crdName, namespace string) ([]CRDObject, error) {
	// First, get the CRD to extract necessary information
	crd, err := s.apiExtensionsClient.ApiextensionsV1().CustomResourceDefinitions().Get(ctx, crdName, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get CRD %s: %w", crdName, err)
	}

	// Find the served version
	var version string
	for _, v := range crd.Spec.Versions {
		if v.Served {
			version = v.Name
			break
		}
	}
	if version == "" && len(crd.Spec.Versions) > 0 {
		version = crd.Spec.Versions[0].Name
	}

	// Create GroupVersionResource
	gvr := schema.GroupVersionResource{
		Group:    crd.Spec.Group,
		Version:  version,
		Resource: crd.Spec.Names.Plural,
	}

	// List objects using dynamic client
	var unstructuredList *unstructured.UnstructuredList

	// For cluster-scoped resources, ignore namespace parameter
	unstructuredList, err = s.dynamicClient.Resource(gvr).List(ctx, metav1.ListOptions{})

	if err != nil {
		return nil, fmt.Errorf("failed to list objects for CRD %s: %w", crdName, err)
	}

	// Convert unstructured objects to CRDObject
	crdObjects := make([]CRDObject, 0, len(unstructuredList.Items))
	for _, item := range unstructuredList.Items {
		crdObject := CRDObject{
			Name:              item.GetName(),
			Namespace:         item.GetNamespace(),
			Kind:              item.GetKind(),
			APIVersion:        item.GetAPIVersion(),
			CreationTimestamp: item.GetCreationTimestamp().Time,
			Labels:            item.GetLabels(),
			Annotations:       item.GetAnnotations(),
		}
		crdObjects = append(crdObjects, crdObject)
	}

	return crdObjects, nil
}

// GetCRDObjectDetail retrieves detailed information about a specific CRD object
func (s *Service) GetCRDObjectDetail(ctx context.Context, crdName, namespace, objectName string) (*unstructured.Unstructured, error) {
	// First, get the CRD to extract necessary information
	crd, err := s.apiExtensionsClient.ApiextensionsV1().CustomResourceDefinitions().Get(ctx, crdName, metav1.GetOptions{})
	if err != nil {
		log.Printf("%v", err)
		return nil, fmt.Errorf("failed to get CRD %s: %w", crdName, err)
	}

	// Find the served version
	var version string
	for _, v := range crd.Spec.Versions {
		if v.Served {
			version = v.Name
			break
		}
	}
	if version == "" && len(crd.Spec.Versions) > 0 {
		version = crd.Spec.Versions[0].Name
	}

	// Create GroupVersionResource
	gvr := schema.GroupVersionResource{
		Group:    crd.Spec.Group,
		Version:  version,
		Resource: crd.Spec.Names.Plural,
	}

	log.Printf("CRD Group: %v", gvr.Group)
	log.Printf("CRD Version: %v", gvr.Version)
	log.Printf("CRD Resource: %v", gvr.Resource)
	log.Printf("CRD Spec.Scope: %v", crd.Spec.Scope)

	// Get object using dynamic client
	var unstructuredObj *unstructured.Unstructured
	if crd.Spec.Scope == "Namespaced" {
		// For namespaced resources, namespace is required and cannot be "-"
		if namespace == "" || namespace == "-" {
			return nil, fmt.Errorf("namespace is required for namespaced CRD %s (use actual namespace, not '-')", crdName)
		}
		unstructuredObj, err = s.dynamicClient.Resource(gvr).Namespace(namespace).Get(ctx, objectName, metav1.GetOptions{})

		log.Printf("Namespace: %v", namespace)
		log.Printf("objectName: %v", objectName)
		log.Printf("Namespaced error: %v", err)

	} else {
		// For cluster-scoped resources, namespace should be "-" or empty
		if namespace != "" && namespace != "-" {
			return nil, fmt.Errorf("cluster-scoped CRD %s does not use namespaces (use '-' as namespace)", crdName)
		}
		unstructuredObj, err = s.dynamicClient.Resource(gvr).Get(ctx, objectName, metav1.GetOptions{})
	}

	if err != nil {
		log.Printf("%v", err)
		return nil, fmt.Errorf("failed to get object %s for CRD %s: %w", objectName, crdName, err)
	}

	// Set apiVersion and kind on the unstructured object
	if crd.Spec.Group != "" {
		unstructuredObj.SetAPIVersion(crd.Spec.Group + "/" + version)
	} else {
		// For core API resources (empty group)
		unstructuredObj.SetAPIVersion(version)
	}
	unstructuredObj.SetKind(crd.Spec.Names.Kind)
	return unstructuredObj, nil
}

// ListPods lists all pods in the cluster
func (s *Service) ListPods(ctx context.Context, opts interface{}) ([]PodInfo, error) {
	pods, err := s.client.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list pods: %w", err)
	}

	podList := make([]PodInfo, 0, len(pods.Items))
	for _, pod := range pods.Items {
		podList = append(podList, PodInfo{
			APIVersion: "v1",
			Kind:       "Pod",
			Name:       pod.Name,
			Namespace:  pod.Namespace,
			Status:     string(pod.Status.Phase),
			Ready:      fmt.Sprintf("%d/%d", countReadyContainers(pod), len(pod.Status.ContainerStatuses)),
			Restarts:   countRestarts(pod),
			Age:        calculateAge(pod.CreationTimestamp.Time),
			IP:         pod.Status.PodIP,
			Node:       pod.Spec.NodeName,
			Labels:     pod.Labels,
		})
	}

	return podList, nil
}

// GetPodDetail retrieves detailed information of a specific pod
func (s *Service) GetPodDetail(ctx context.Context, namespace, name string) (*corev1.Pod, error) {
	pod, err := s.client.CoreV1().Pods(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get pod details for %s/%s: %w", namespace, name, err)
	}
	pod.APIVersion = "v1"
	pod.Kind = "Pod"
	return pod, nil
}

// GetDeploymentDetail retrieves detailed information of a specific deployment
func (s *Service) GetDeploymentDetail(ctx context.Context, namespace, name string) (*appsv1.Deployment, error) {
	deployment, err := s.client.AppsV1().Deployments(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get deployment details for %s/%s: %w", namespace, name, err)
	}
	deployment.APIVersion = "apps/v1"
	deployment.Kind = "Deployment"
	return deployment, nil
}

// GetServiceDetail retrieves detailed information of a specific service
func (s *Service) GetServiceDetail(ctx context.Context, namespace, name string) (*corev1.Service, error) {
	service, err := s.client.CoreV1().Services(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get service details for %s/%s: %w", namespace, name, err)
	}
	service.APIVersion = "v1"
	service.Kind = "Service"
	return service, nil
}

// GetIngressDetail retrieves detailed information of a specific ingress
func (s *Service) GetIngressDetail(ctx context.Context, namespace, name string) (*networkingv1.Ingress, error) {
	ingress, err := s.client.NetworkingV1().Ingresses(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get ingress details for %s/%s: %w", namespace, name, err)
	}
	ingress.APIVersion = "networking.k8s.io/v1"
	ingress.Kind = "Ingress"
	return ingress, nil
}

// GetPVCDetail retrieves detailed information of a specific persistent volume claim
func (s *Service) GetPVCDetail(ctx context.Context, namespace, name string) (*corev1.PersistentVolumeClaim, error) {
	fmt.Printf("[DEBUG] GetPVCDetail called with namespace=%s, name=%s\n", namespace, name)

	pvc, err := s.client.CoreV1().PersistentVolumeClaims(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		fmt.Printf("[ERROR] Failed to get PVC details: namespace=%s, name=%s, error=%v\n", namespace, name, err)
		return nil, fmt.Errorf("failed to get PVC details for %s/%s: %w", namespace, name, err)
	}

	fmt.Printf("[DEBUG] Successfully retrieved PVC: namespace=%s, name=%s\n", namespace, name)
	pvc.APIVersion = "v1"
	pvc.Kind = "PersistentVolumeClaim"
	return pvc, nil
}

// GetPVDetail retrieves detailed information of a specific persistent volume
func (s *Service) GetPVDetail(ctx context.Context, name string) (*corev1.PersistentVolume, error) {
	fmt.Printf("[DEBUG] GetPVDetail called with name=%s\n", name)

	pv, err := s.client.CoreV1().PersistentVolumes().Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		fmt.Printf("[ERROR] Failed to get PV details: name=%s, error=%v\n", name, err)
		return nil, fmt.Errorf("failed to get PV details for %s: %w", name, err)
	}

	fmt.Printf("[DEBUG] Successfully retrieved PV: name=%s\n", name)
	pv.APIVersion = "v1"
	pv.Kind = "PersistentVolume"
	return pv, nil
}

// GetSecretDetail retrieves detailed information of a specific secret
func (s *Service) GetSecretDetail(ctx context.Context, namespace, name string) (*corev1.Secret, error) {
	secret, err := s.client.CoreV1().Secrets(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get secret details for %s/%s: %w", namespace, name, err)
	}
	secret.APIVersion = "v1"
	secret.Kind = "Secret"
	return secret, nil
}

// GetConfigMapDetail retrieves detailed information of a specific configmap
func (s *Service) GetConfigMapDetail(ctx context.Context, namespace, name string) (*corev1.ConfigMap, error) {
	configmap, err := s.client.CoreV1().ConfigMaps(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get configmap details for %s/%s: %w", namespace, name, err)
	}
	configmap.APIVersion = "v1"
	configmap.Kind = "ConfigMap"
	configmap.APIVersion = "v1"
	configmap.Kind = "ConfigMap"
	return configmap, nil
}

// GetNamespaceDetail retrieves detailed information of a specific namespace
func (s *Service) GetNamespaceDetail(ctx context.Context, name string) (*corev1.Namespace, error) {
	namespace, err := s.client.CoreV1().Namespaces().Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get namespace details for %s: %w", name, err)
	}
	namespace.APIVersion = "v1"
	namespace.Kind = "Namespace"
	return namespace, nil
}

// GetNodeDetail retrieves detailed information of a specific node
func (s *Service) GetNodeDetail(ctx context.Context, name string) (*corev1.Node, error) {
	node, err := s.client.CoreV1().Nodes().Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get node details for %s: %w", name, err)
	}
	node.APIVersion = "v1"
	node.Kind = "Node"
	return node, nil
}

// GetDaemonSetDetail retrieves detailed information of a specific daemonset
func (s *Service) GetDaemonSetDetail(ctx context.Context, namespace, name string) (*appsv1.DaemonSet, error) {
	daemonset, err := s.client.AppsV1().DaemonSets(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get daemonset details for %s/%s: %w", namespace, name, err)
	}
	daemonset.APIVersion = "apps/v1"
	daemonset.Kind = "DaemonSet"
	return daemonset, nil
}

// GetStatefulSetDetail retrieves detailed information of a specific statefulset
func (s *Service) GetStatefulSetDetail(ctx context.Context, namespace, name string) (*appsv1.StatefulSet, error) {
	statefulset, err := s.client.AppsV1().StatefulSets(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get statefulset details for %s/%s: %w", namespace, name, err)
	}
	statefulset.APIVersion = "apps/v1"
	statefulset.Kind = "StatefulSet"
	statefulset.APIVersion = "apps/v1"
	statefulset.Kind = "StatefulSet"
	return statefulset, nil
}

// GetJobDetail retrieves detailed information of a specific job
func (s *Service) GetJobDetail(ctx context.Context, namespace, name string) (*batchv1.Job, error) {
	job, err := s.client.BatchV1().Jobs(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get job details for %s/%s: %w", namespace, name, err)
	}
	job.APIVersion = "batch/v1"
	job.Kind = "Job"
	return job, nil
}

// GetCronJobDetail retrieves detailed information of a specific cronjob
func (s *Service) GetCronJobDetail(ctx context.Context, namespace, name string) (*batchv1.CronJob, error) {
	cronjob, err := s.client.BatchV1().CronJobs(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get cronjob details for %s/%s: %w", namespace, name, err)
	}
	cronjob.APIVersion = "batch/v1"
	cronjob.Kind = "CronJob"
	cronjob.APIVersion = "batch/v1"
	cronjob.Kind = "CronJob"
	return cronjob, nil
}

// ListCRDs lists all custom resource definitions in the cluster
func (s *Service) ListCRDs(ctx context.Context, opts interface{}) ([]CRDInfo, error) {
	crds, err := s.apiExtensionsClient.ApiextensionsV1().CustomResourceDefinitions().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list CRDs: %w", err)
	}

	crdList := make([]CRDInfo, 0, len(crds.Items))
	for _, crd := range crds.Items {
		// Get the scope (Namespaced or Cluster)
		scope := string(crd.Spec.Scope)

		// Get the latest version
		latestVersion := ""
		if len(crd.Spec.Versions) > 0 {
			// Find the served version
			for _, version := range crd.Spec.Versions {
				if version.Served {
					latestVersion = version.Name
					break
				}
			}
			// If no served version found, use the first one
			if latestVersion == "" {
				latestVersion = crd.Spec.Versions[0].Name
			}
		}

		// Get accepted names
		names := []string{crd.Spec.Names.Plural}
		if crd.Spec.Names.Singular != "" {
			names = append(names, crd.Spec.Names.Singular)
		}
		if len(crd.Spec.Names.ShortNames) > 0 {
			names = append(names, crd.Spec.Names.ShortNames...)
		}

		crdList = append(crdList, CRDInfo{
			APIVersion:   "apiextensions.k8s.io/v1",
			Kind:         "CustomResourceDefinition",
			Name:         crd.Name,
			Group:        crd.Spec.Group,
			Version:      latestVersion,
			ResourceKind: crd.Spec.Names.Kind,
			Scope:        scope,
			Names:        names,
			Age:          calculateAge(crd.CreationTimestamp.Time),
			Labels:       crd.Labels,
		})
	}

	return crdList, nil
}

// GetClusterInfo returns cluster information
func (s *Service) GetClusterInfo(ctx context.Context, opts interface{}) (ClusterInfo, error) {
	version, err := s.client.Discovery().ServerVersion()
	if err != nil {
		return ClusterInfo{}, fmt.Errorf("failed to get server version: %w", err)
	}

	nodeRole := "worker"
	if s.isControlPlane {
		nodeRole = "control-plane"
	}

	clusterInfo := ClusterInfo{
		Version:        version.String(),
		Platform:       version.Platform,
		IsControlPlane: s.isControlPlane,
		NodeName:       s.nodeName,
		NodeRole:       nodeRole,
	}

	return clusterInfo, nil
}

// Helper to count ready containers
func countReadyContainers(pod corev1.Pod) int {
	readyCount := 0
	for _, containerStatus := range pod.Status.ContainerStatuses {
		if containerStatus.Ready {
			readyCount++
		}
	}
	return readyCount
}

// Helper to count restarts
func countRestarts(pod corev1.Pod) int32 {
	restarts := int32(0)
	for _, containerStatus := range pod.Status.ContainerStatuses {
		restarts += containerStatus.RestartCount
	}
	return restarts
}

// Helper to format age
func calculateAge(creationTime time.Time) string {
	duration := time.Since(creationTime)
	return fmt.Sprintf("%dd %dh", int(duration.Hours()/24), int(duration.Hours())%24)
}

// createServiceWithConfig creates a Service instance with the given config
func createServiceWithConfig(config *rest.Config) (*Service, error) {
	fmt.Printf("[DEBUG] Creating Kubernetes service with config\n")

	// Create the clientset
	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create kubernetes clientset: %w", err)
	}
	fmt.Printf("[DEBUG] Successfully created Kubernetes clientset\n")

	// Create the API extensions client for CRDs
	apiExtensionsClient, err := apiextensionsclient.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create API extensions client: %w", err)
	}
	fmt.Printf("[DEBUG] Successfully created API extensions client\n")

	// Create the dynamic client for dynamic CRD operations
	dynamicClient, err := dynamic.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create dynamic client: %w", err)
	}
	fmt.Printf("[DEBUG] Successfully created dynamic client\n")

	// Get node name from environment
	nodeName := os.Getenv("NODE_NAME")

	// Check if this is a control plane node
	isControlPlane := false
	if nodeName != "" {
		nodes, err := clientset.CoreV1().Nodes().List(context.TODO(), metav1.ListOptions{})
		if err != nil {
			// Don't fail if we can't list nodes, just continue without node info
			fmt.Printf("Warning: failed to list nodes: %v\n", err)
		} else {
			for _, node := range nodes.Items {
				if node.Name == nodeName {
					for label := range node.Labels {
						if label == "node-role.kubernetes.io/master" || label == "node-role.kubernetes.io/control-plane" {
							isControlPlane = true
							break
						}
					}
					break
				}
			}
		}
	}

	return &Service{
		client:              clientset,
		apiExtensionsClient: apiExtensionsClient,
		dynamicClient:       dynamicClient,
		nodeName:            nodeName,
		isControlPlane:      isControlPlane,
	}, nil
}

// isKubernetesInstalled checks if Kubernetes is installed on the system
func isKubernetesInstalled() bool {
	// Check for common Kubernetes installation indicators
	kubernetesIndicators := []string{
		"/etc/kubernetes/admin.conf",
		"/etc/kubernetes/kubelet.conf",
		"/var/lib/kubelet",
		"/etc/systemd/system/kubelet.service",
		"/usr/bin/kubelet",
		"/usr/local/bin/kubelet",
	}

	// Check if any of the Kubernetes files/directories exist
	for _, indicator := range kubernetesIndicators {
		if _, err := os.Stat(indicator); err == nil {
			return true
		}
	}

	// Check if kubectl is available in PATH
	if _, err := exec.LookPath("kubectl"); err == nil {
		return true
	}

	// Check if kubelet is available in PATH
	if _, err := exec.LookPath("kubelet"); err == nil {
		return true
	}

	// Check if kubelet service is running (systemd systems)
	if err := exec.Command("systemctl", "is-active", "--quiet", "kubelet").Run(); err == nil {
		return true
	}

	return false
}

// GetPodLogs retrieves logs from a specific pod
func (s *Service) GetPodLogs(ctx context.Context, namespace, name string, follow bool, lines *int64) (string, error) {
	req := s.client.CoreV1().Pods(namespace).GetLogs(name, &corev1.PodLogOptions{
		Follow:    follow,
		TailLines: lines,
	})

	logStream, err := req.Stream(ctx)
	if err != nil {
		return "", fmt.Errorf("failed to get pod logs: %w", err)
	}
	defer logStream.Close()

	buf := make([]byte, 2048)
	var logs string

	for {
		n, err := logStream.Read(buf)
		if err != nil {
			if err.Error() == "EOF" {
				break
			}
			return logs, fmt.Errorf("error reading log stream: %w", err)
		}
		if n > 0 {
			logs += string(buf[:n])
		}
		if !follow {
			continue
		}
	}

	return logs, nil
}

// DeletePod deletes a specific pod
func (s *Service) DeletePod(ctx context.Context, namespace, name string) error {
	err := s.client.CoreV1().Pods(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete pod: %w", err)
	}
	return nil
}

// ApplyPod creates or updates a pod using server-side apply
func (s *Service) ApplyPod(ctx context.Context, pod *corev1.Pod) (*corev1.Pod, error) {
	// Ensure the pod has the required fields
	if pod.Name == "" {
		return nil, fmt.Errorf("pod name is required")
	}
	if pod.Namespace == "" {
		pod.Namespace = "default"
	}

	// Try to get the existing pod first
	_, err := s.client.CoreV1().Pods(pod.Namespace).Get(ctx, pod.Name, metav1.GetOptions{})
	if err != nil {
		// Pod doesn't exist, create it
		createdPod, err := s.client.CoreV1().Pods(pod.Namespace).Create(ctx, pod, metav1.CreateOptions{})
		if err != nil {
			return nil, fmt.Errorf("failed to create pod: %w", err)
		}
		return createdPod, nil
	}

	// Pod exists, update it
	updatedPod, err := s.client.CoreV1().Pods(pod.Namespace).Update(ctx, pod, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to update pod: %w", err)
	}

	return updatedPod, nil
}

// UpdatePod updates an existing pod
func (s *Service) UpdatePod(ctx context.Context, namespace, name string, pod *corev1.Pod) (*corev1.Pod, error) {
	// Ensure the pod has the required fields
	if pod.Name == "" {
		pod.Name = name
	}
	if pod.Namespace == "" {
		pod.Namespace = namespace
	}

	// Validate that the names match
	if pod.Name != name || pod.Namespace != namespace {
		return nil, fmt.Errorf("pod name or namespace in body does not match URL parameters")
	}

	// Get the existing pod first to preserve any fields we're not updating
	existingPod, err := s.client.CoreV1().Pods(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get existing pod: %w", err)
	}

	// Preserve the resource version for update
	pod.ResourceVersion = existingPod.ResourceVersion

	// Update the pod
	updatedPod, err := s.client.CoreV1().Pods(namespace).Update(ctx, pod, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to update pod: %w", err)
	}

	return updatedPod, nil
}

// DeleteDeployment deletes a specific deployment
func (s *Service) DeleteDeployment(ctx context.Context, namespace, name string) error {
	err := s.client.AppsV1().Deployments(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete deployment: %w", err)
	}
	return nil
}

// ApplyDeployment creates or updates a deployment
func (s *Service) ApplyDeployment(ctx context.Context, deployment *appsv1.Deployment) (*appsv1.Deployment, error) {
	if deployment.Name == "" {
		return nil, fmt.Errorf("deployment name is required")
	}
	if deployment.Namespace == "" {
		deployment.Namespace = "default"
	}

	// Try to get the existing deployment first
	_, err := s.client.AppsV1().Deployments(deployment.Namespace).Get(ctx, deployment.Name, metav1.GetOptions{})
	if err != nil {
		// Deployment doesn't exist, create it
		createdDeployment, err := s.client.AppsV1().Deployments(deployment.Namespace).Create(ctx, deployment, metav1.CreateOptions{})
		if err != nil {
			return nil, fmt.Errorf("failed to create deployment: %w", err)
		}
		return createdDeployment, nil
	}

	// Deployment exists, update it
	updatedDeployment, err := s.client.AppsV1().Deployments(deployment.Namespace).Update(ctx, deployment, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to update deployment: %w", err)
	}

	return updatedDeployment, nil
}

// UpdateDeployment updates an existing deployment
func (s *Service) UpdateDeployment(ctx context.Context, namespace, name string, deployment *appsv1.Deployment) (*appsv1.Deployment, error) {
	if deployment.Name == "" {
		deployment.Name = name
	}
	if deployment.Namespace == "" {
		deployment.Namespace = namespace
	}

	// Validate that the names match
	if deployment.Name != name || deployment.Namespace != namespace {
		return nil, fmt.Errorf("deployment name or namespace in body does not match URL parameters")
	}

	// Get the existing deployment first to preserve any fields we're not updating
	existingDeployment, err := s.client.AppsV1().Deployments(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get existing deployment: %w", err)
	}

	// Preserve the resource version for update
	deployment.ResourceVersion = existingDeployment.ResourceVersion

	// Update the deployment
	updatedDeployment, err := s.client.AppsV1().Deployments(namespace).Update(ctx, deployment, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to update deployment: %w", err)
	}

	return updatedDeployment, nil
}

// DeleteService deletes a specific service
func (s *Service) DeleteService(ctx context.Context, namespace, name string) error {
	err := s.client.CoreV1().Services(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete service: %w", err)
	}
	return nil
}

// ApplyService creates or updates a service
func (s *Service) ApplyService(ctx context.Context, service *corev1.Service) (*corev1.Service, error) {
	if service.Name == "" {
		return nil, fmt.Errorf("service name is required")
	}
	if service.Namespace == "" {
		service.Namespace = "default"
	}

	// Try to get the existing service first
	_, err := s.client.CoreV1().Services(service.Namespace).Get(ctx, service.Name, metav1.GetOptions{})
	if err != nil {
		// Service doesn't exist, create it
		createdService, err := s.client.CoreV1().Services(service.Namespace).Create(ctx, service, metav1.CreateOptions{})
		if err != nil {
			return nil, fmt.Errorf("failed to create service: %w", err)
		}
		return createdService, nil
	}

	// Service exists, update it
	updatedService, err := s.client.CoreV1().Services(service.Namespace).Update(ctx, service, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to update service: %w", err)
	}

	return updatedService, nil
}

// UpdateService updates an existing service
func (s *Service) UpdateService(ctx context.Context, namespace, name string, service *corev1.Service) (*corev1.Service, error) {
	if service.Name == "" {
		service.Name = name
	}
	if service.Namespace == "" {
		service.Namespace = namespace
	}

	// Validate that the names match
	if service.Name != name || service.Namespace != namespace {
		return nil, fmt.Errorf("service name or namespace in body does not match URL parameters")
	}

	// Get the existing service first to preserve any fields we're not updating
	existingService, err := s.client.CoreV1().Services(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get existing service: %w", err)
	}

	// Preserve the resource version for update
	service.ResourceVersion = existingService.ResourceVersion

	// Update the service
	updatedService, err := s.client.CoreV1().Services(namespace).Update(ctx, service, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to update service: %w", err)
	}

	return updatedService, nil
}

// DeleteIngress deletes a specific ingress
func (s *Service) DeleteIngress(ctx context.Context, namespace, name string) error {
	err := s.client.NetworkingV1().Ingresses(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete ingress: %w", err)
	}
	return nil
}

// ApplyIngress creates or updates an ingress
func (s *Service) ApplyIngress(ctx context.Context, ingress *networkingv1.Ingress) (*networkingv1.Ingress, error) {
	if ingress.Name == "" {
		return nil, fmt.Errorf("ingress name is required")
	}
	if ingress.Namespace == "" {
		ingress.Namespace = "default"
	}

	// Try to get the existing ingress first
	_, err := s.client.NetworkingV1().Ingresses(ingress.Namespace).Get(ctx, ingress.Name, metav1.GetOptions{})
	if err != nil {
		// Ingress doesn't exist, create it
		createdIngress, err := s.client.NetworkingV1().Ingresses(ingress.Namespace).Create(ctx, ingress, metav1.CreateOptions{})
		if err != nil {
			return nil, fmt.Errorf("failed to create ingress: %w", err)
		}
		return createdIngress, nil
	}

	// Ingress exists, update it
	updatedIngress, err := s.client.NetworkingV1().Ingresses(ingress.Namespace).Update(ctx, ingress, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to update ingress: %w", err)
	}

	return updatedIngress, nil
}

// UpdateIngress updates an existing ingress
func (s *Service) UpdateIngress(ctx context.Context, namespace, name string, ingress *networkingv1.Ingress) (*networkingv1.Ingress, error) {
	if ingress.Name == "" {
		ingress.Name = name
	}
	if ingress.Namespace == "" {
		ingress.Namespace = namespace
	}

	// Validate that the names match
	if ingress.Name != name || ingress.Namespace != namespace {
		return nil, fmt.Errorf("ingress name or namespace in body does not match URL parameters")
	}

	// Get the existing ingress first to preserve any fields we're not updating
	existingIngress, err := s.client.NetworkingV1().Ingresses(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get existing ingress: %w", err)
	}

	// Preserve the resource version for update
	ingress.ResourceVersion = existingIngress.ResourceVersion

	// Update the ingress
	updatedIngress, err := s.client.NetworkingV1().Ingresses(namespace).Update(ctx, ingress, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to update ingress: %w", err)
	}

	return updatedIngress, nil
}

// ListIngressClasses lists all ingress classes in the cluster
func (s *Service) ListIngressClasses(ctx context.Context, opts interface{}) ([]IngressClassInfo, error) {
	ingressClasses, err := s.client.NetworkingV1().IngressClasses().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list ingress classes: %w", err)
	}

	classList := make([]IngressClassInfo, 0, len(ingressClasses.Items))
	for _, class := range ingressClasses.Items {
		// Check if this is the default ingress class
		isDefault := false
		if class.Annotations != nil {
			if val, ok := class.Annotations["ingressclass.kubernetes.io/is-default-class"]; ok && val == "true" {
				isDefault = true
			}
		}

		classList = append(classList, IngressClassInfo{
			Name:              class.Name,
			Controller:        class.Spec.Controller,
			IsDefault:         isDefault,
			Age:               calculateAge(class.CreationTimestamp.Time),
			Labels:            class.Labels,
			CreationTimestamp: class.CreationTimestamp.Time,
		})
	}

	return classList, nil
}

// GetIngressClassDetail retrieves detailed information of a specific ingress class
func (s *Service) GetIngressClassDetail(ctx context.Context, name string) (*networkingv1.IngressClass, error) {
	ingressClass, err := s.client.NetworkingV1().IngressClasses().Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get ingress class details for %s: %w", name, err)
	}
	return ingressClass, nil
}

// DeleteIngressClass deletes a specific ingress class
func (s *Service) DeleteIngressClass(ctx context.Context, name string) error {
	err := s.client.NetworkingV1().IngressClasses().Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete ingress class: %w", err)
	}
	return nil
}

// ApplyIngressClass creates or updates an ingress class
func (s *Service) ApplyIngressClass(ctx context.Context, ingressClass *networkingv1.IngressClass) (*networkingv1.IngressClass, error) {
	if ingressClass.Name == "" {
		return nil, fmt.Errorf("ingress class name is required")
	}

	// Try to get the existing ingress class first
	_, err := s.client.NetworkingV1().IngressClasses().Get(ctx, ingressClass.Name, metav1.GetOptions{})
	if err != nil {
		// IngressClass doesn't exist, create it
		createdClass, err := s.client.NetworkingV1().IngressClasses().Create(ctx, ingressClass, metav1.CreateOptions{})
		if err != nil {
			return nil, fmt.Errorf("failed to create ingress class: %w", err)
		}
		return createdClass, nil
	}

	// IngressClass exists, update it
	updatedClass, err := s.client.NetworkingV1().IngressClasses().Update(ctx, ingressClass, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to update ingress class: %w", err)
	}

	return updatedClass, nil
}

// UpdateIngressClass updates an existing ingress class
func (s *Service) UpdateIngressClass(ctx context.Context, name string, ingressClass *networkingv1.IngressClass) (*networkingv1.IngressClass, error) {
	if ingressClass.Name == "" {
		ingressClass.Name = name
	}

	// Validate that the names match
	if ingressClass.Name != name {
		return nil, fmt.Errorf("ingress class name in body does not match URL parameter")
	}

	// Get the existing ingress class first to preserve any fields we're not updating
	existingClass, err := s.client.NetworkingV1().IngressClasses().Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get existing ingress class: %w", err)
	}

	// Preserve the resource version for update
	ingressClass.ResourceVersion = existingClass.ResourceVersion

	// Update the ingress class
	updatedClass, err := s.client.NetworkingV1().IngressClasses().Update(ctx, ingressClass, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to update ingress class: %w", err)
	}

	return updatedClass, nil
}

// ListNetworkPolicies lists all network policies in the cluster
func (s *Service) ListNetworkPolicies(ctx context.Context, opts interface{}) ([]NetworkPolicyInfo, error) {
	policies, err := s.client.NetworkingV1().NetworkPolicies("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list network policies: %w", err)
	}

	policyList := make([]NetworkPolicyInfo, 0, len(policies.Items))
	for _, policy := range policies.Items {
		// Format the pod selector
		podSelector := "<none>"
		if policy.Spec.PodSelector.MatchLabels != nil {
			labels := []string{}
			for k, v := range policy.Spec.PodSelector.MatchLabels {
				labels = append(labels, fmt.Sprintf("%s=%s", k, v))
			}
			if len(labels) > 0 {
				podSelector = strings.Join(labels, ",")
			}
		}

		// Get policy types
		policyTypes := []string{}
		for _, pType := range policy.Spec.PolicyTypes {
			policyTypes = append(policyTypes, string(pType))
		}
		// If no policy types specified, default to Ingress
		if len(policyTypes) == 0 {
			policyTypes = []string{"Ingress"}
		}

		policyList = append(policyList, NetworkPolicyInfo{
			Name:              policy.Name,
			Namespace:         policy.Namespace,
			PodSelector:       podSelector,
			PolicyTypes:       policyTypes,
			Age:               calculateAge(policy.CreationTimestamp.Time),
			Labels:            policy.Labels,
			CreationTimestamp: policy.CreationTimestamp.Time,
		})
	}

	return policyList, nil
}

// GetNetworkPolicyDetail retrieves detailed information of a specific network policy
func (s *Service) GetNetworkPolicyDetail(ctx context.Context, namespace, name string) (*networkingv1.NetworkPolicy, error) {
	policy, err := s.client.NetworkingV1().NetworkPolicies(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get network policy details for %s/%s: %w", namespace, name, err)
	}
	return policy, nil
}

// DeleteNetworkPolicy deletes a specific network policy
func (s *Service) DeleteNetworkPolicy(ctx context.Context, namespace, name string) error {
	err := s.client.NetworkingV1().NetworkPolicies(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete network policy: %w", err)
	}
	return nil
}

// ApplyNetworkPolicy creates or updates a network policy
func (s *Service) ApplyNetworkPolicy(ctx context.Context, policy *networkingv1.NetworkPolicy) (*networkingv1.NetworkPolicy, error) {
	if policy.Name == "" {
		return nil, fmt.Errorf("network policy name is required")
	}
	if policy.Namespace == "" {
		policy.Namespace = "default"
	}

	// Try to get the existing network policy first
	_, err := s.client.NetworkingV1().NetworkPolicies(policy.Namespace).Get(ctx, policy.Name, metav1.GetOptions{})
	if err != nil {
		// NetworkPolicy doesn't exist, create it
		createdPolicy, err := s.client.NetworkingV1().NetworkPolicies(policy.Namespace).Create(ctx, policy, metav1.CreateOptions{})
		if err != nil {
			return nil, fmt.Errorf("failed to create network policy: %w", err)
		}
		return createdPolicy, nil
	}

	// NetworkPolicy exists, update it
	updatedPolicy, err := s.client.NetworkingV1().NetworkPolicies(policy.Namespace).Update(ctx, policy, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to update network policy: %w", err)
	}

	return updatedPolicy, nil
}

// UpdateNetworkPolicy updates an existing network policy
func (s *Service) UpdateNetworkPolicy(ctx context.Context, namespace, name string, policy *networkingv1.NetworkPolicy) (*networkingv1.NetworkPolicy, error) {
	if policy.Name == "" {
		policy.Name = name
	}
	if policy.Namespace == "" {
		policy.Namespace = namespace
	}

	// Validate that the names match
	if policy.Name != name || policy.Namespace != namespace {
		return nil, fmt.Errorf("network policy name or namespace in body does not match URL parameters")
	}

	// Get the existing network policy first to preserve any fields we're not updating
	existingPolicy, err := s.client.NetworkingV1().NetworkPolicies(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get existing network policy: %w", err)
	}

	// Preserve the resource version for update
	policy.ResourceVersion = existingPolicy.ResourceVersion

	// Update the network policy
	updatedPolicy, err := s.client.NetworkingV1().NetworkPolicies(namespace).Update(ctx, policy, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to update network policy: %w", err)
	}

	return updatedPolicy, nil
}

// DeletePVC deletes a specific PVC
func (s *Service) DeletePVC(ctx context.Context, namespace, name string) error {
	err := s.client.CoreV1().PersistentVolumeClaims(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete PVC: %w", err)
	}
	return nil
}

// ApplyPVC creates or updates a PVC
func (s *Service) ApplyPVC(ctx context.Context, pvc *corev1.PersistentVolumeClaim) (*corev1.PersistentVolumeClaim, error) {
	if pvc.Name == "" {
		return nil, fmt.Errorf("PVC name is required")
	}
	if pvc.Namespace == "" {
		pvc.Namespace = "default"
	}

	// Try to get the existing PVC first
	_, err := s.client.CoreV1().PersistentVolumeClaims(pvc.Namespace).Get(ctx, pvc.Name, metav1.GetOptions{})
	if err != nil {
		// PVC doesn't exist, create it
		createdPVC, err := s.client.CoreV1().PersistentVolumeClaims(pvc.Namespace).Create(ctx, pvc, metav1.CreateOptions{})
		if err != nil {
			return nil, fmt.Errorf("failed to create PVC: %w", err)
		}
		return createdPVC, nil
	}

	// PVC exists, update it
	updatedPVC, err := s.client.CoreV1().PersistentVolumeClaims(pvc.Namespace).Update(ctx, pvc, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to update PVC: %w", err)
	}

	return updatedPVC, nil
}

// UpdatePVC updates an existing PVC
func (s *Service) UpdatePVC(ctx context.Context, namespace, name string, pvc *corev1.PersistentVolumeClaim) (*corev1.PersistentVolumeClaim, error) {
	if pvc.Name == "" {
		pvc.Name = name
	}
	if pvc.Namespace == "" {
		pvc.Namespace = namespace
	}

	// Validate that the names match
	if pvc.Name != name || pvc.Namespace != namespace {
		return nil, fmt.Errorf("PVC name or namespace in body does not match URL parameters")
	}

	// Get the existing PVC first to preserve any fields we're not updating
	existingPVC, err := s.client.CoreV1().PersistentVolumeClaims(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get existing PVC: %w", err)
	}

	// Preserve the resource version for update
	pvc.ResourceVersion = existingPVC.ResourceVersion

	// Update the PVC
	updatedPVC, err := s.client.CoreV1().PersistentVolumeClaims(namespace).Update(ctx, pvc, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to update PVC: %w", err)
	}

	return updatedPVC, nil
}

// DeletePV deletes a specific PV
func (s *Service) DeletePV(ctx context.Context, name string) error {
	err := s.client.CoreV1().PersistentVolumes().Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete PV: %w", err)
	}
	return nil
}

// ApplyPV creates or updates a PV
func (s *Service) ApplyPV(ctx context.Context, pv *corev1.PersistentVolume) (*corev1.PersistentVolume, error) {
	if pv.Name == "" {
		return nil, fmt.Errorf("PV name is required")
	}

	// Try to get the existing PV first
	_, err := s.client.CoreV1().PersistentVolumes().Get(ctx, pv.Name, metav1.GetOptions{})
	if err != nil {
		// PV doesn't exist, create it
		createdPV, err := s.client.CoreV1().PersistentVolumes().Create(ctx, pv, metav1.CreateOptions{})
		if err != nil {
			return nil, fmt.Errorf("failed to create PV: %w", err)
		}
		return createdPV, nil
	}

	// PV exists, update it
	updatedPV, err := s.client.CoreV1().PersistentVolumes().Update(ctx, pv, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to update PV: %w", err)
	}

	return updatedPV, nil
}

// UpdatePV updates an existing PV
func (s *Service) UpdatePV(ctx context.Context, name string, pv *corev1.PersistentVolume) (*corev1.PersistentVolume, error) {
	if pv.Name == "" {
		pv.Name = name
	}

	// Validate that the names match
	if pv.Name != name {
		return nil, fmt.Errorf("PV name in body does not match URL parameter")
	}

	// Get the existing PV first to preserve any fields we're not updating
	existingPV, err := s.client.CoreV1().PersistentVolumes().Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get existing PV: %w", err)
	}

	// Preserve the resource version for update
	pv.ResourceVersion = existingPV.ResourceVersion

	// Update the PV
	updatedPV, err := s.client.CoreV1().PersistentVolumes().Update(ctx, pv, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to update PV: %w", err)
	}

	return updatedPV, nil
}

// DeleteSecret deletes a specific secret
func (s *Service) DeleteSecret(ctx context.Context, namespace, name string) error {
	err := s.client.CoreV1().Secrets(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete secret: %w", err)
	}
	return nil
}

// ApplySecret creates or updates a secret
func (s *Service) ApplySecret(ctx context.Context, secret *corev1.Secret) (*corev1.Secret, error) {
	if secret.Name == "" {
		return nil, fmt.Errorf("secret name is required")
	}
	if secret.Namespace == "" {
		secret.Namespace = "default"
	}

	// Try to get the existing secret first
	_, err := s.client.CoreV1().Secrets(secret.Namespace).Get(ctx, secret.Name, metav1.GetOptions{})
	if err != nil {
		// Secret doesn't exist, create it
		createdSecret, err := s.client.CoreV1().Secrets(secret.Namespace).Create(ctx, secret, metav1.CreateOptions{})
		if err != nil {
			return nil, fmt.Errorf("failed to create secret: %w", err)
		}
		return createdSecret, nil
	}

	// Secret exists, update it
	updatedSecret, err := s.client.CoreV1().Secrets(secret.Namespace).Update(ctx, secret, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to update secret: %w", err)
	}

	return updatedSecret, nil
}

// UpdateSecret updates an existing secret
func (s *Service) UpdateSecret(ctx context.Context, namespace, name string, secret *corev1.Secret) (*corev1.Secret, error) {
	if secret.Name == "" {
		secret.Name = name
	}
	if secret.Namespace == "" {
		secret.Namespace = namespace
	}

	// Validate that the names match
	if secret.Name != name || secret.Namespace != namespace {
		return nil, fmt.Errorf("secret name or namespace in body does not match URL parameters")
	}

	// Get the existing secret first to preserve any fields we're not updating
	existingSecret, err := s.client.CoreV1().Secrets(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get existing secret: %w", err)
	}

	// Preserve the resource version for update
	secret.ResourceVersion = existingSecret.ResourceVersion

	// Update the secret
	updatedSecret, err := s.client.CoreV1().Secrets(namespace).Update(ctx, secret, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to update secret: %w", err)
	}

	return updatedSecret, nil
}

// DeleteConfigMap deletes a specific configmap
func (s *Service) DeleteConfigMap(ctx context.Context, namespace, name string) error {
	err := s.client.CoreV1().ConfigMaps(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete configmap: %w", err)
	}
	return nil
}

// ApplyConfigMap creates or updates a configmap
func (s *Service) ApplyConfigMap(ctx context.Context, configmap *corev1.ConfigMap) (*corev1.ConfigMap, error) {
	if configmap.Name == "" {
		return nil, fmt.Errorf("configmap name is required")
	}
	if configmap.Namespace == "" {
		configmap.Namespace = "default"
	}

	// Try to get the existing configmap first
	_, err := s.client.CoreV1().ConfigMaps(configmap.Namespace).Get(ctx, configmap.Name, metav1.GetOptions{})
	if err != nil {
		// ConfigMap doesn't exist, create it
		createdConfigMap, err := s.client.CoreV1().ConfigMaps(configmap.Namespace).Create(ctx, configmap, metav1.CreateOptions{})
		if err != nil {
			return nil, fmt.Errorf("failed to create configmap: %w", err)
		}
		return createdConfigMap, nil
	}

	// ConfigMap exists, update it
	updatedConfigMap, err := s.client.CoreV1().ConfigMaps(configmap.Namespace).Update(ctx, configmap, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to update configmap: %w", err)
	}

	return updatedConfigMap, nil
}

// UpdateConfigMap updates an existing configmap
func (s *Service) UpdateConfigMap(ctx context.Context, namespace, name string, configmap *corev1.ConfigMap) (*corev1.ConfigMap, error) {
	if configmap.Name == "" {
		configmap.Name = name
	}
	if configmap.Namespace == "" {
		configmap.Namespace = namespace
	}

	// Validate that the names match
	if configmap.Name != name || configmap.Namespace != namespace {
		return nil, fmt.Errorf("configmap name or namespace in body does not match URL parameters")
	}

	// Get the existing configmap first to preserve any fields we're not updating
	existingConfigMap, err := s.client.CoreV1().ConfigMaps(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get existing configmap: %w", err)
	}

	// Preserve the resource version for update
	configmap.ResourceVersion = existingConfigMap.ResourceVersion

	// Update the configmap
	updatedConfigMap, err := s.client.CoreV1().ConfigMaps(namespace).Update(ctx, configmap, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to update configmap: %w", err)
	}

	return updatedConfigMap, nil
}

// DeleteNamespace deletes a specific namespace
func (s *Service) DeleteNamespace(ctx context.Context, name string) error {
	err := s.client.CoreV1().Namespaces().Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete namespace: %w", err)
	}
	return nil
}

// ApplyNamespace creates or updates a namespace
func (s *Service) ApplyNamespace(ctx context.Context, namespace *corev1.Namespace) (*corev1.Namespace, error) {
	if namespace.Name == "" {
		return nil, fmt.Errorf("namespace name is required")
	}

	// Try to get the existing namespace first
	_, err := s.client.CoreV1().Namespaces().Get(ctx, namespace.Name, metav1.GetOptions{})
	if err != nil {
		// Namespace doesn't exist, create it
		createdNamespace, err := s.client.CoreV1().Namespaces().Create(ctx, namespace, metav1.CreateOptions{})
		if err != nil {
			return nil, fmt.Errorf("failed to create namespace: %w", err)
		}
		return createdNamespace, nil
	}

	// Namespace exists, update it
	updatedNamespace, err := s.client.CoreV1().Namespaces().Update(ctx, namespace, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to update namespace: %w", err)
	}

	return updatedNamespace, nil
}

// UpdateNamespace updates an existing namespace
func (s *Service) UpdateNamespace(ctx context.Context, name string, namespace *corev1.Namespace) (*corev1.Namespace, error) {
	if namespace.Name == "" {
		namespace.Name = name
	}

	// Validate that the names match
	if namespace.Name != name {
		return nil, fmt.Errorf("namespace name in body does not match URL parameter")
	}

	// Get the existing namespace first to preserve any fields we're not updating
	existingNamespace, err := s.client.CoreV1().Namespaces().Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get existing namespace: %w", err)
	}

	// Preserve the resource version for update
	namespace.ResourceVersion = existingNamespace.ResourceVersion

	// Update the namespace
	updatedNamespace, err := s.client.CoreV1().Namespaces().Update(ctx, namespace, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to update namespace: %w", err)
	}

	return updatedNamespace, nil
}

// DeleteDaemonSet deletes a specific daemonset
func (s *Service) DeleteDaemonSet(ctx context.Context, namespace, name string) error {
	err := s.client.AppsV1().DaemonSets(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete daemonset: %w", err)
	}
	return nil
}

// ApplyDaemonSet creates or updates a daemonset
func (s *Service) ApplyDaemonSet(ctx context.Context, daemonset *appsv1.DaemonSet) (*appsv1.DaemonSet, error) {
	if daemonset.Name == "" {
		return nil, fmt.Errorf("daemonset name is required")
	}
	if daemonset.Namespace == "" {
		daemonset.Namespace = "default"
	}

	// Try to get the existing daemonset first
	_, err := s.client.AppsV1().DaemonSets(daemonset.Namespace).Get(ctx, daemonset.Name, metav1.GetOptions{})
	if err != nil {
		// DaemonSet doesn't exist, create it
		createdDaemonSet, err := s.client.AppsV1().DaemonSets(daemonset.Namespace).Create(ctx, daemonset, metav1.CreateOptions{})
		if err != nil {
			return nil, fmt.Errorf("failed to create daemonset: %w", err)
		}
		return createdDaemonSet, nil
	}

	// DaemonSet exists, update it
	updatedDaemonSet, err := s.client.AppsV1().DaemonSets(daemonset.Namespace).Update(ctx, daemonset, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to update daemonset: %w", err)
	}

	return updatedDaemonSet, nil
}

// UpdateDaemonSet updates an existing daemonset
func (s *Service) UpdateDaemonSet(ctx context.Context, namespace, name string, daemonset *appsv1.DaemonSet) (*appsv1.DaemonSet, error) {
	if daemonset.Name == "" {
		daemonset.Name = name
	}
	if daemonset.Namespace == "" {
		daemonset.Namespace = namespace
	}

	// Validate that the names match
	if daemonset.Name != name || daemonset.Namespace != namespace {
		return nil, fmt.Errorf("daemonset name or namespace in body does not match URL parameters")
	}

	// Get the existing daemonset first to preserve any fields we're not updating
	existingDaemonSet, err := s.client.AppsV1().DaemonSets(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get existing daemonset: %w", err)
	}

	// Preserve the resource version for update
	daemonset.ResourceVersion = existingDaemonSet.ResourceVersion

	// Update the daemonset
	updatedDaemonSet, err := s.client.AppsV1().DaemonSets(namespace).Update(ctx, daemonset, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to update daemonset: %w", err)
	}

	return updatedDaemonSet, nil
}

// DeleteStatefulSet deletes a specific statefulset
func (s *Service) DeleteStatefulSet(ctx context.Context, namespace, name string) error {
	err := s.client.AppsV1().StatefulSets(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete statefulset: %w", err)
	}
	return nil
}

// ApplyStatefulSet creates or updates a statefulset
func (s *Service) ApplyStatefulSet(ctx context.Context, statefulset *appsv1.StatefulSet) (*appsv1.StatefulSet, error) {
	if statefulset.Name == "" {
		return nil, fmt.Errorf("statefulset name is required")
	}
	if statefulset.Namespace == "" {
		statefulset.Namespace = "default"
	}

	// Try to get the existing statefulset first
	_, err := s.client.AppsV1().StatefulSets(statefulset.Namespace).Get(ctx, statefulset.Name, metav1.GetOptions{})
	if err != nil {
		// StatefulSet doesn't exist, create it
		createdStatefulSet, err := s.client.AppsV1().StatefulSets(statefulset.Namespace).Create(ctx, statefulset, metav1.CreateOptions{})
		if err != nil {
			return nil, fmt.Errorf("failed to create statefulset: %w", err)
		}
		return createdStatefulSet, nil
	}

	// StatefulSet exists, update it
	updatedStatefulSet, err := s.client.AppsV1().StatefulSets(statefulset.Namespace).Update(ctx, statefulset, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to update statefulset: %w", err)
	}

	return updatedStatefulSet, nil
}

// UpdateStatefulSet updates an existing statefulset
func (s *Service) UpdateStatefulSet(ctx context.Context, namespace, name string, statefulset *appsv1.StatefulSet) (*appsv1.StatefulSet, error) {
	if statefulset.Name == "" {
		statefulset.Name = name
	}
	if statefulset.Namespace == "" {
		statefulset.Namespace = namespace
	}

	// Validate that the names match
	if statefulset.Name != name || statefulset.Namespace != namespace {
		return nil, fmt.Errorf("statefulset name or namespace in body does not match URL parameters")
	}

	// Get the existing statefulset first to preserve any fields we're not updating
	existingStatefulSet, err := s.client.AppsV1().StatefulSets(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get existing statefulset: %w", err)
	}

	// Preserve the resource version for update
	statefulset.ResourceVersion = existingStatefulSet.ResourceVersion

	// Update the statefulset
	updatedStatefulSet, err := s.client.AppsV1().StatefulSets(namespace).Update(ctx, statefulset, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to update statefulset: %w", err)
	}

	return updatedStatefulSet, nil
}

// DeleteJob deletes a specific job
func (s *Service) DeleteJob(ctx context.Context, namespace, name string) error {
	err := s.client.BatchV1().Jobs(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete job: %w", err)
	}
	return nil
}

// ApplyJob creates or updates a job
func (s *Service) ApplyJob(ctx context.Context, job *batchv1.Job) (*batchv1.Job, error) {
	if job.Name == "" {
		return nil, fmt.Errorf("job name is required")
	}
	if job.Namespace == "" {
		job.Namespace = "default"
	}

	// Try to get the existing job first
	_, err := s.client.BatchV1().Jobs(job.Namespace).Get(ctx, job.Name, metav1.GetOptions{})
	if err != nil {
		// Job doesn't exist, create it
		createdJob, err := s.client.BatchV1().Jobs(job.Namespace).Create(ctx, job, metav1.CreateOptions{})
		if err != nil {
			return nil, fmt.Errorf("failed to create job: %w", err)
		}
		return createdJob, nil
	}

	// Job exists, update it
	updatedJob, err := s.client.BatchV1().Jobs(job.Namespace).Update(ctx, job, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to update job: %w", err)
	}

	return updatedJob, nil
}

// UpdateJob updates an existing job
func (s *Service) UpdateJob(ctx context.Context, namespace, name string, job *batchv1.Job) (*batchv1.Job, error) {
	if job.Name == "" {
		job.Name = name
	}
	if job.Namespace == "" {
		job.Namespace = namespace
	}

	// Validate that the names match
	if job.Name != name || job.Namespace != namespace {
		return nil, fmt.Errorf("job name or namespace in body does not match URL parameters")
	}

	// Get the existing job first to preserve any fields we're not updating
	existingJob, err := s.client.BatchV1().Jobs(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get existing job: %w", err)
	}

	// Preserve the resource version for update
	job.ResourceVersion = existingJob.ResourceVersion

	// Update the job
	updatedJob, err := s.client.BatchV1().Jobs(namespace).Update(ctx, job, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to update job: %w", err)
	}

	return updatedJob, nil
}

// DeleteCronJob deletes a specific cronjob
func (s *Service) DeleteCronJob(ctx context.Context, namespace, name string) error {
	err := s.client.BatchV1().CronJobs(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete cronjob: %w", err)
	}
	return nil
}

// ApplyCronJob creates or updates a cronjob
func (s *Service) ApplyCronJob(ctx context.Context, cronjob *batchv1.CronJob) (*batchv1.CronJob, error) {
	if cronjob.Name == "" {
		return nil, fmt.Errorf("cronjob name is required")
	}
	if cronjob.Namespace == "" {
		cronjob.Namespace = "default"
	}

	// Try to get the existing cronjob first
	_, err := s.client.BatchV1().CronJobs(cronjob.Namespace).Get(ctx, cronjob.Name, metav1.GetOptions{})
	if err != nil {
		// CronJob doesn't exist, create it
		createdCronJob, err := s.client.BatchV1().CronJobs(cronjob.Namespace).Create(ctx, cronjob, metav1.CreateOptions{})
		if err != nil {
			return nil, fmt.Errorf("failed to create cronjob: %w", err)
		}
		return createdCronJob, nil
	}

	// CronJob exists, update it
	updatedCronJob, err := s.client.BatchV1().CronJobs(cronjob.Namespace).Update(ctx, cronjob, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to update cronjob: %w", err)
	}

	return updatedCronJob, nil
}

// UpdateCronJob updates an existing cronjob
func (s *Service) UpdateCronJob(ctx context.Context, namespace, name string, cronjob *batchv1.CronJob) (*batchv1.CronJob, error) {
	if cronjob.Name == "" {
		cronjob.Name = name
	}
	if cronjob.Namespace == "" {
		cronjob.Namespace = namespace
	}

	// Validate that the names match
	if cronjob.Name != name || cronjob.Namespace != namespace {
		return nil, fmt.Errorf("cronjob name or namespace in body does not match URL parameters")
	}

	// Get the existing cronjob first to preserve any fields we're not updating
	existingCronJob, err := s.client.BatchV1().CronJobs(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get existing cronjob: %w", err)
	}

	// Preserve the resource version for update
	cronjob.ResourceVersion = existingCronJob.ResourceVersion

	// Update the cronjob
	updatedCronJob, err := s.client.BatchV1().CronJobs(namespace).Update(ctx, cronjob, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to update cronjob: %w", err)
	}

	return updatedCronJob, nil
}

// Helper functions for namespace-scoped methods

func getExternalIPs(service corev1.Service) string {
	if len(service.Status.LoadBalancer.Ingress) > 0 {
		return service.Status.LoadBalancer.Ingress[0].IP
	}
	if len(service.Spec.ExternalIPs) > 0 {
		return service.Spec.ExternalIPs[0]
	}
	return ""
}

func formatPorts(ports []corev1.ServicePort) string {
	if len(ports) == 0 {
		return ""
	}
	var portStrings []string
	for _, port := range ports {
		portStr := fmt.Sprintf("%d", port.Port)
		if port.NodePort != 0 {
			portStr = fmt.Sprintf("%d:%d", port.Port, port.NodePort)
		}
		if port.Name != "" {
			portStr = fmt.Sprintf("%s(%s)", portStr, port.Name)
		}
		portStrings = append(portStrings, portStr)
	}
	return strings.Join(portStrings, ",")
}

func extractIngressHosts(ingress networkingv1.Ingress) string {
	var hosts []string
	for _, rule := range ingress.Spec.Rules {
		if rule.Host != "" {
			hosts = append(hosts, rule.Host)
		}
	}
	return strings.Join(hosts, ",")
}

func extractIngressAddress(ingress networkingv1.Ingress) string {
	if len(ingress.Status.LoadBalancer.Ingress) > 0 {
		return ingress.Status.LoadBalancer.Ingress[0].IP
	}
	return ""
}

func getPVCCapacity(pvc corev1.PersistentVolumeClaim) string {
	if pvc.Status.Capacity != nil {
		if capacity, ok := pvc.Status.Capacity[corev1.ResourceStorage]; ok {
			return capacity.String()
		}
	}
	return ""
}
func convertAccessModes(modes []corev1.PersistentVolumeAccessMode) []string {
	var result []string
	for _, mode := range modes {
		result = append(result, string(mode))
	}
	return result
}

func getStorageClassName(pvc corev1.PersistentVolumeClaim) string {
	if pvc.Spec.StorageClassName != nil {
		return *pvc.Spec.StorageClassName
	}
	return ""
}

func getCompletions(job batchv1.Job) string {
	completions := int32(1)
	if job.Spec.Completions != nil {
		completions = *job.Spec.Completions
	}
	return fmt.Sprintf("%d/%d", job.Status.Succeeded, completions)
}

func extractIngressHostsArray(ingress networkingv1.Ingress) []string {
	var hosts []string
	for _, rule := range ingress.Spec.Rules {
		if rule.Host != "" {
			hosts = append(hosts, rule.Host)
		}
	}
	return hosts
}

func formatAccessModes(modes []corev1.PersistentVolumeAccessMode) string {
	var result []string
	for _, mode := range modes {
		result = append(result, string(mode))
	}
	return strings.Join(result, ",")
}

func formatPodSelector(selector map[string]string) string {
	if len(selector) == 0 {
		return ""
	}
	var parts []string
	for k, v := range selector {
		parts = append(parts, fmt.Sprintf("%s=%s", k, v))
	}
	return strings.Join(parts, ",")
}

// CreateCRDObject creates a new instance of a CRD object
func (s *Service) CreateCRDObject(ctx context.Context, crdName, namespace string, object *unstructured.Unstructured) (*unstructured.Unstructured, error) {
	// First, get the CRD to extract necessary information
	crd, err := s.apiExtensionsClient.ApiextensionsV1().CustomResourceDefinitions().Get(ctx, crdName, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get CRD %s: %w", crdName, err)
	}

	// Find the served version
	var version string
	for _, v := range crd.Spec.Versions {
		if v.Served {
			version = v.Name
			break
		}
	}
	if version == "" && len(crd.Spec.Versions) > 0 {
		version = crd.Spec.Versions[0].Name
	}

	// Create GroupVersionResource
	gvr := schema.GroupVersionResource{
		Group:    crd.Spec.Group,
		Version:  version,
		Resource: crd.Spec.Names.Plural,
	}

	// Set the APIVersion and Kind if not already set
	if object.GetAPIVersion() == "" {
		object.SetAPIVersion(fmt.Sprintf("%s/%s", crd.Spec.Group, version))
	}
	if object.GetKind() == "" {
		object.SetKind(crd.Spec.Names.Kind)
	}

	// Create object using dynamic client
	var createdObj *unstructured.Unstructured
	if crd.Spec.Scope == "Namespaced" {
		// For namespaced resources, namespace is required
		if namespace == "" || namespace == "-" {
			return nil, fmt.Errorf("namespace is required for namespaced CRD %s", crdName)
		}
		createdObj, err = s.dynamicClient.Resource(gvr).Namespace(namespace).Create(ctx, object, metav1.CreateOptions{})
	} else {
		// For cluster-scoped resources
		if namespace != "" && namespace != "-" {
			return nil, fmt.Errorf("cluster-scoped CRD %s does not use namespaces", crdName)
		}
		createdObj, err = s.dynamicClient.Resource(gvr).Create(ctx, object, metav1.CreateOptions{})
	}

	if err != nil {
		return nil, fmt.Errorf("failed to create object for CRD %s: %w", crdName, err)
	}

	return createdObj, nil
}

// UpdateCRDObject updates an existing instance of a CRD object
func (s *Service) UpdateCRDObject(ctx context.Context, crdName, namespace, objectName string, object *unstructured.Unstructured) (*unstructured.Unstructured, error) {
	// First, get the CRD to extract necessary information
	crd, err := s.apiExtensionsClient.ApiextensionsV1().CustomResourceDefinitions().Get(ctx, crdName, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get CRD %s: %w", crdName, err)
	}

	// Find the served version
	var version string
	for _, v := range crd.Spec.Versions {
		if v.Served {
			version = v.Name
			break
		}
	}
	if version == "" && len(crd.Spec.Versions) > 0 {
		version = crd.Spec.Versions[0].Name
	}

	// Create GroupVersionResource
	gvr := schema.GroupVersionResource{
		Group:    crd.Spec.Group,
		Version:  version,
		Resource: crd.Spec.Names.Plural,
	}

	// Set the name to ensure it matches the objectName parameter
	object.SetName(objectName)

	// Set the APIVersion and Kind if not already set
	if object.GetAPIVersion() == "" {
		object.SetAPIVersion(fmt.Sprintf("%s/%s", crd.Spec.Group, version))
	}
	if object.GetKind() == "" {
		object.SetKind(crd.Spec.Names.Kind)
	}

	// Update object using dynamic client
	var updatedObj *unstructured.Unstructured
	if crd.Spec.Scope == "Namespaced" {
		// For namespaced resources, namespace is required
		if namespace == "" || namespace == "-" {
			return nil, fmt.Errorf("namespace is required for namespaced CRD %s", crdName)
		}
		object.SetNamespace(namespace)
		updatedObj, err = s.dynamicClient.Resource(gvr).Namespace(namespace).Update(ctx, object, metav1.UpdateOptions{})
	} else {
		// For cluster-scoped resources
		if namespace != "" && namespace != "-" {
			return nil, fmt.Errorf("cluster-scoped CRD %s does not use namespaces", crdName)
		}
		updatedObj, err = s.dynamicClient.Resource(gvr).Update(ctx, object, metav1.UpdateOptions{})
	}

	if err != nil {
		return nil, fmt.Errorf("failed to update object %s for CRD %s: %w", objectName, crdName, err)
	}

	return updatedObj, nil
}

// DeleteCRDObject deletes an instance of a CRD object
func (s *Service) DeleteCRDObject(ctx context.Context, crdName, namespace, objectName string) error {
	// First, get the CRD to extract necessary information
	crd, err := s.apiExtensionsClient.ApiextensionsV1().CustomResourceDefinitions().Get(ctx, crdName, metav1.GetOptions{})
	if err != nil {
		return fmt.Errorf("failed to get CRD %s: %w", crdName, err)
	}

	// Find the served version
	var version string
	for _, v := range crd.Spec.Versions {
		if v.Served {
			version = v.Name
			break
		}
	}
	if version == "" && len(crd.Spec.Versions) > 0 {
		version = crd.Spec.Versions[0].Name
	}

	// Create GroupVersionResource
	gvr := schema.GroupVersionResource{
		Group:    crd.Spec.Group,
		Version:  version,
		Resource: crd.Spec.Names.Plural,
	}

	// Delete object using dynamic client
	if crd.Spec.Scope == "Namespaced" {
		// For namespaced resources, namespace is required
		if namespace == "" || namespace == "-" {
			return fmt.Errorf("namespace is required for namespaced CRD %s", crdName)
		}
		err = s.dynamicClient.Resource(gvr).Namespace(namespace).Delete(ctx, objectName, metav1.DeleteOptions{})
	} else {
		// For cluster-scoped resources
		if namespace != "" && namespace != "-" {
			return fmt.Errorf("cluster-scoped CRD %s does not use namespaces", crdName)
		}
		err = s.dynamicClient.Resource(gvr).Delete(ctx, objectName, metav1.DeleteOptions{})
	}

	if err != nil {
		return fmt.Errorf("failed to delete object %s for CRD %s: %w", objectName, crdName, err)
	}

	return nil
}

// CordonNode marks a node as unschedulable
func (s *Service) CordonNode(ctx context.Context, nodeName string) error {
node, err := s.client.CoreV1().Nodes().Get(ctx, nodeName, metav1.GetOptions{})
if err != nil {
return fmt.Errorf("failed to get node: %w", err)
}

node.Spec.Unschedulable = true

_, err = s.client.CoreV1().Nodes().Update(ctx, node, metav1.UpdateOptions{})
if err != nil {
return fmt.Errorf("failed to update node: %w", err)
}

return nil
}

// UncordonNode marks a node as schedulable
func (s *Service) UncordonNode(ctx context.Context, nodeName string) error {
node, err := s.client.CoreV1().Nodes().Get(ctx, nodeName, metav1.GetOptions{})
if err != nil {
return fmt.Errorf("failed to get node: %w", err)
}

node.Spec.Unschedulable = false

_, err = s.client.CoreV1().Nodes().Update(ctx, node, metav1.UpdateOptions{})
if err != nil {
return fmt.Errorf("failed to update node: %w", err)
}

return nil
}

// DrainNode safely evicts all pods from a node
func (s *Service) DrainNode(ctx context.Context, nodeName string, options DrainNodeOptions) error {
// First, cordon the node
if err := s.CordonNode(ctx, nodeName); err != nil {
return fmt.Errorf("failed to cordon node: %w", err)
}

// List all pods on the node
pods, err := s.client.CoreV1().Pods("").List(ctx, metav1.ListOptions{
FieldSelector: fmt.Sprintf("spec.nodeName=%s", nodeName),
})
if err != nil {
return fmt.Errorf("failed to list pods: %w", err)
}

// Filter and evict pods
for _, pod := range pods.Items {
// Skip if pod is already terminating
if pod.DeletionTimestamp != nil {
continue
}

// Skip DaemonSet pods if option is set
if options.IgnoreDaemonSets && s.isDaemonSetPod(&pod) {
continue
}

// Skip mirror pods (static pods)
if _, ok := pod.Annotations["kubernetes.io/config.mirror"]; ok {
continue
}

// Check for emptyDir volumes
if !options.DeleteEmptyDirData && s.hasEmptyDirVolume(&pod) {
return fmt.Errorf("pod %s/%s has emptyDir volumes, set deleteEmptyDirData=true to drain", pod.Namespace, pod.Name)
}

// Evict the pod
gracePeriodSeconds := int64(options.GracePeriodSeconds)
eviction := &policyv1.Eviction{
ObjectMeta: metav1.ObjectMeta{
Name:      pod.Name,
Namespace: pod.Namespace,
},
DeleteOptions: &metav1.DeleteOptions{
GracePeriodSeconds: &gracePeriodSeconds,
},
}

err = s.client.CoreV1().Pods(pod.Namespace).EvictV1(ctx, eviction)
if err != nil {
return fmt.Errorf("failed to evict pod %s/%s: %w", pod.Namespace, pod.Name, err)
}
}

return nil
}

// isDaemonSetPod checks if a pod is managed by a DaemonSet
func (s *Service) isDaemonSetPod(pod *corev1.Pod) bool {
for _, owner := range pod.OwnerReferences {
if owner.Kind == "DaemonSet" {
return true
}
}
return false
}

// hasEmptyDirVolume checks if a pod uses emptyDir volumes
func (s *Service) hasEmptyDirVolume(pod *corev1.Pod) bool {
for _, volume := range pod.Spec.Volumes {
if volume.EmptyDir != nil {
return true
}
}
return false
}
