package kubernetes

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	apiextensionsclient "k8s.io/apiextensions-apiserver/pkg/client/clientset/clientset"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

// Service represents the Kubernetes service implementation
type Service struct {
	client               kubernetes.Interface
	apiExtensionsClient  apiextensionsclient.Interface
	dynamicClient        dynamic.Interface
	nodeName             string
	isControlPlane       bool
}

// NewService creates a new Kubernetes service
func NewService() (*Service, error) {
	// First, check if Kubernetes is installed by looking for admin.conf
	if _, err := os.Stat("/etc/kubernetes/admin.conf"); err == nil {
		// Try to load from admin.conf first (control plane node)
		config, err := clientcmd.BuildConfigFromFlags("", "/etc/kubernetes/admin.conf")
		if err == nil {
			// Successfully loaded admin config, create clientset and return
			return createServiceWithConfig(config)
		}
		// If admin.conf exists but can't be loaded, log and continue with other methods
		fmt.Printf("Warning: /etc/kubernetes/admin.conf exists but failed to load: %v\n", err)
	}

	// Try to load from default kubeconfig location (~/.kube/config)
	config, err := clientcmd.BuildConfigFromFlags("", clientcmd.RecommendedHomeFile)
	if err != nil {
		// If that fails, try in-cluster config (for pods running inside cluster)
		config, err = rest.InClusterConfig()
		if err != nil {
			// Check if kubectl is available as a fallback indicator
			if !isKubernetesInstalled() {
				return nil, fmt.Errorf("kubernetes is not installed on this system: %w", err)
			}
			return nil, fmt.Errorf("failed to create kubernetes config: %w", err)
		}
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
		client:               clientset,
		apiExtensionsClient:  apiExtensionsClient,
		dynamicClient:        dynamicClient,
		nodeName:             nodeName,
		isControlPlane:       isControlPlane,
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
			Name:      d.Name,
			Namespace: d.Namespace,
			Ready:     fmt.Sprintf("%d/%d", d.Status.ReadyReplicas, d.Status.Replicas),
			UpToDate:  d.Status.UpdatedReplicas,
			Available: d.Status.AvailableReplicas,
			Age:       calculateAge(d.CreationTimestamp.Time),
			Labels:    d.Labels,
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
			Name:      svc.Name,
			Namespace: svc.Namespace,
			Type:      string(svc.Spec.Type),
			ClusterIP: svc.Spec.ClusterIP,
			Ports:     "",
			Labels:    svc.Labels,
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
			Name:      ing.Name,
			Namespace: ing.Namespace,
			Hosts:     hosts,
			Labels:    ing.Labels,
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
			Name:      pvc.Name,
			Namespace: pvc.Namespace,
			Status:    string(pvc.Status.Phase),
			Volume:    pvc.Spec.VolumeName,
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
			Name: pv.Name,
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
			Name:      secret.Name,
			Namespace: secret.Namespace,
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
			Name:      configmap.Name,
			Namespace: configmap.Namespace,
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
			Name: namespace.Name,
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
		nodeList = append(nodeList, NodeInfo{
			Name: node.Name,
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
			Name:      sts.Name,
			Namespace: sts.Namespace,
			Ready:     fmt.Sprintf("%d/%d", sts.Status.ReadyReplicas, sts.Status.Replicas),
			Age:       calculateAge(sts.CreationTimestamp.Time),
			Labels:    sts.Labels,
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
func (s *Service) GetCRDDetail(ctx context.Context, name string) (CRDInfo, error) {
	crd, err := s.apiExtensionsClient.ApiextensionsV1().CustomResourceDefinitions().Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return CRDInfo{}, fmt.Errorf("failed to get CRD detail: %w", err)
	}

	return CRDInfo{
		Name:    crd.Name,
		Group:   crd.Spec.Group,
		Version: crd.Spec.Versions[0].Name, // TODO: handle multiple versions
		Scope:   string(crd.Spec.Scope),
		Kind:    crd.Spec.Names.Kind,
		Labels:  crd.Labels,
	}, nil
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
	if crd.Spec.Scope == "Namespaced" {
		// For namespaced resources, use the provided namespace or default
		targetNamespace := namespace
		if targetNamespace == "" {
			targetNamespace = "default"
		}
		unstructuredList, err = s.dynamicClient.Resource(gvr).Namespace(targetNamespace).List(ctx, metav1.ListOptions{})
	} else {
		// For cluster-scoped resources, ignore namespace parameter
		unstructuredList, err = s.dynamicClient.Resource(gvr).List(ctx, metav1.ListOptions{})
	}

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
func (s *Service) GetCRDObjectDetail(ctx context.Context, crdName, objectName, namespace string) (CRDObjectDetail, error) {
	// First, get the CRD to extract necessary information
	crd, err := s.apiExtensionsClient.ApiextensionsV1().CustomResourceDefinitions().Get(ctx, crdName, metav1.GetOptions{})
	if err != nil {
		return CRDObjectDetail{}, fmt.Errorf("failed to get CRD %s: %w", crdName, err)
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

	// Get object using dynamic client
	var unstructuredObj *unstructured.Unstructured
	if crd.Spec.Scope == "Namespaced" {
		// For namespaced resources, namespace is required and cannot be "-"
		if namespace == "" || namespace == "-" {
			return CRDObjectDetail{}, fmt.Errorf("namespace is required for namespaced CRD %s (use actual namespace, not '-')", crdName)
		}
		unstructuredObj, err = s.dynamicClient.Resource(gvr).Namespace(namespace).Get(ctx, objectName, metav1.GetOptions{})
	} else {
		// For cluster-scoped resources, namespace should be "-" or empty
		if namespace != "" && namespace != "-" {
			return CRDObjectDetail{}, fmt.Errorf("cluster-scoped CRD %s does not use namespaces (use '-' as namespace)", crdName)
		}
		unstructuredObj, err = s.dynamicClient.Resource(gvr).Get(ctx, objectName, metav1.GetOptions{})
	}

	if err != nil {
		return CRDObjectDetail{}, fmt.Errorf("failed to get object %s for CRD %s: %w", objectName, crdName, err)
	}

	// Convert unstructured object to CRDObjectDetail
	crdObjectDetail := CRDObjectDetail{
		CRDObject: CRDObject{
			Name:              unstructuredObj.GetName(),
			Namespace:         unstructuredObj.GetNamespace(),
			Kind:              unstructuredObj.GetKind(),
			APIVersion:        unstructuredObj.GetAPIVersion(),
			CreationTimestamp: unstructuredObj.GetCreationTimestamp().Time,
			Labels:            unstructuredObj.GetLabels(),
			Annotations:       unstructuredObj.GetAnnotations(),
		},
		Raw: unstructuredObj.Object,
	}

	return crdObjectDetail, nil
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
			Name:      pod.Name,
			Namespace: pod.Namespace,
			Status:    string(pod.Status.Phase),
			Ready:     fmt.Sprintf("%d/%d", countReadyContainers(pod), len(pod.Status.ContainerStatuses)),
			Restarts:  countRestarts(pod),
			Age:       calculateAge(pod.CreationTimestamp.Time),
			IP:        pod.Status.PodIP,
			Node:      pod.Spec.NodeName,
			Labels:    pod.Labels,
		})
	}

	return podList, nil
}

// GetPodDetail retrieves detailed information of a specific pod
func (s *Service) GetPodDetail(ctx context.Context, namespace, name string) (PodDetail, error) {
	pod, err := s.client.CoreV1().Pods(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return PodDetail{}, fmt.Errorf("failed to get pod details for %s/%s: %w", namespace, name, err)
	}

	containers := make([]ContainerInfo, len(pod.Spec.Containers))
	for i, c := range pod.Spec.Containers {
		containerInfo := ContainerInfo{
			Name:  c.Name,
			Image: c.Image,
		}

		// Handle container status if available
		if i < len(pod.Status.ContainerStatuses) {
			containerStatus := pod.Status.ContainerStatuses[i]
			containerInfo.Ready = containerStatus.Ready
			containerInfo.RestartCount = containerStatus.RestartCount

			// Determine container state
			if containerStatus.State.Running != nil {
				containerInfo.State = "Running"
			} else if containerStatus.State.Waiting != nil {
				containerInfo.State = "Waiting"
				containerInfo.StateReason = containerStatus.State.Waiting.Reason
			} else if containerStatus.State.Terminated != nil {
				containerInfo.State = "Terminated"
				containerInfo.StateReason = containerStatus.State.Terminated.Reason
			} else {
				containerInfo.State = "Unknown"
			}
		} else {
			containerInfo.State = "Unknown"
			containerInfo.Ready = false
			containerInfo.RestartCount = 0
		}

		containers[i] = containerInfo
	}

	conditions := make([]PodCondition, len(pod.Status.Conditions))
	for i, c := range pod.Status.Conditions {
		conditions[i] = PodCondition{
			Type:               string(c.Type),
			Status:             string(c.Status),
			LastProbeTime:      c.LastProbeTime.Time,
			LastTransitionTime: c.LastTransitionTime.Time,
			Reason:             c.Reason,
			Message:            c.Message,
		}
	}

	// Handle StartTime conversion
	var startTime *time.Time
	if pod.Status.StartTime != nil {
		startTime = &pod.Status.StartTime.Time
	}

	detail := PodDetail{
		Name:              pod.Name,
		Namespace:         pod.Namespace,
		UID:               string(pod.UID),
		ResourceVersion:   pod.ResourceVersion,
		Labels:            pod.Labels,
		Annotations:       pod.Annotations,
		Status:            string(pod.Status.Phase),
		Phase:             string(pod.Status.Phase),
		IP:                pod.Status.PodIP,
		HostIP:            pod.Status.HostIP,
		Node:              pod.Spec.NodeName,
		ServiceAccount:    pod.Spec.ServiceAccountName,
		RestartPolicy:     string(pod.Spec.RestartPolicy),
		DNSPolicy:         string(pod.Spec.DNSPolicy),
		NodeSelector:      pod.Spec.NodeSelector,
		Tolerations:       nil, // Tolerations handling can be implemented as needed
		Containers:        containers,
		InitContainers:    nil, // InitContainers handling can be implemented as needed
		Conditions:        conditions,
		QOSClass:          string(pod.Status.QOSClass),
		StartTime:         startTime,
		CreationTimestamp: pod.CreationTimestamp.Time,
		Age:               calculateAge(pod.CreationTimestamp.Time),
	}

	return detail, nil
}

// GetDeploymentDetail retrieves detailed information of a specific deployment
func (s *Service) GetDeploymentDetail(ctx context.Context, namespace, name string) (DeploymentDetail, error) {
	deployment, err := s.client.AppsV1().Deployments(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return DeploymentDetail{}, fmt.Errorf("failed to get deployment details for %s/%s: %w", namespace, name, err)
	}

	// Convert containers
	containers := make([]ContainerSpec, len(deployment.Spec.Template.Spec.Containers))
	for i, c := range deployment.Spec.Template.Spec.Containers {
		// Convert ports
		ports := make([]ContainerPort, len(c.Ports))
		for j, p := range c.Ports {
			ports[j] = ContainerPort{
				Name:          p.Name,
				HostPort:      p.HostPort,
				ContainerPort: p.ContainerPort,
				Protocol:      string(p.Protocol),
				HostIP:        p.HostIP,
			}
		}

		// Convert environment variables
		env := make([]EnvironmentVariable, len(c.Env))
		for j, e := range c.Env {
			var valueFrom interface{}
			if e.ValueFrom != nil {
				valueFrom = e.ValueFrom
			}
			env[j] = EnvironmentVariable{
				Name:      e.Name,
				Value:     e.Value,
				ValueFrom: valueFrom,
			}
		}

		// Convert volume mounts
		volumeMounts := make([]VolumeMount, len(c.VolumeMounts))
		for j, v := range c.VolumeMounts {
			volumeMounts[j] = VolumeMount{
				Name:             v.Name,
				ReadOnly:         v.ReadOnly,
				MountPath:        v.MountPath,
				MountPropagation: string(safeDeref(v.MountPropagation, "")),
				SubPath:          v.SubPath,
				SubPathExpr:      v.SubPathExpr,
			}
		}

		// Convert resources
		resources := ResourceRequirements{
			Limits:   make(map[string]string),
			Requests: make(map[string]string),
		}
		for k, v := range c.Resources.Limits {
			resources.Limits[string(k)] = v.String()
		}
		for k, v := range c.Resources.Requests {
			resources.Requests[string(k)] = v.String()
		}

		containers[i] = ContainerSpec{
			Name:                     c.Name,
			Image:                    c.Image,
			Command:                  c.Command,
			Args:                     c.Args,
			WorkingDir:               c.WorkingDir,
			Ports:                    ports,
			Env:                      env,
			Resources:                resources,
			VolumeMounts:             volumeMounts,
			ImagePullPolicy:          string(c.ImagePullPolicy),
			TerminationMessagePath:   c.TerminationMessagePath,
			TerminationMessagePolicy: string(c.TerminationMessagePolicy),
		}

		// Store probe information as interface{} to preserve structure
		if c.LivenessProbe != nil {
			containers[i].LivenessProbe = c.LivenessProbe
		}
		if c.ReadinessProbe != nil {
			containers[i].ReadinessProbe = c.ReadinessProbe
		}
		if c.StartupProbe != nil {
			containers[i].StartupProbe = c.StartupProbe
		}
		if c.SecurityContext != nil {
			containers[i].SecurityContext = c.SecurityContext
		}
	}

	// Convert init containers
	initContainers := make([]ContainerSpec, len(deployment.Spec.Template.Spec.InitContainers))
	for i, c := range deployment.Spec.Template.Spec.InitContainers {
		// Similar conversion as above - simplified for brevity
		initContainers[i] = ContainerSpec{
			Name:  c.Name,
			Image: c.Image,
		}
	}

	// Convert volumes to interface{} to preserve their structure
	volumes := make([]interface{}, len(deployment.Spec.Template.Spec.Volumes))
	for i, v := range deployment.Spec.Template.Spec.Volumes {
		volumes[i] = v
	}

	// Convert image pull secrets
	imagePullSecrets := make([]map[string]string, len(deployment.Spec.Template.Spec.ImagePullSecrets))
	for i, s := range deployment.Spec.Template.Spec.ImagePullSecrets {
		imagePullSecrets[i] = map[string]string{"name": s.Name}
	}

	// Convert tolerations
	tolerations := make([]map[string]interface{}, len(deployment.Spec.Template.Spec.Tolerations))
	for i, t := range deployment.Spec.Template.Spec.Tolerations {
		tolerations[i] = map[string]interface{}{
			"key":               t.Key,
			"operator":          string(t.Operator),
			"value":             t.Value,
			"effect":            string(t.Effect),
			"tolerationSeconds": t.TolerationSeconds,
		}
	}

	// Build pod template spec
	podTemplate := PodTemplateSpec{}
	podTemplate.Metadata.Labels = deployment.Spec.Template.Labels
	podTemplate.Metadata.Annotations = deployment.Spec.Template.Annotations
	podTemplate.Spec.Containers = containers
	podTemplate.Spec.InitContainers = initContainers
	podTemplate.Spec.Volumes = volumes
	podTemplate.Spec.ServiceAccountName = deployment.Spec.Template.Spec.ServiceAccountName
	podTemplate.Spec.ImagePullSecrets = imagePullSecrets
	podTemplate.Spec.Hostname = deployment.Spec.Template.Spec.Hostname
	podTemplate.Spec.Subdomain = deployment.Spec.Template.Spec.Subdomain
	podTemplate.Spec.SchedulerName = deployment.Spec.Template.Spec.SchedulerName
	podTemplate.Spec.Tolerations = tolerations
	podTemplate.Spec.PriorityClassName = deployment.Spec.Template.Spec.PriorityClassName
	podTemplate.Spec.Priority = deployment.Spec.Template.Spec.Priority
	podTemplate.Spec.DNSPolicy = string(deployment.Spec.Template.Spec.DNSPolicy)
	podTemplate.Spec.RestartPolicy = string(deployment.Spec.Template.Spec.RestartPolicy)
	podTemplate.Spec.NodeSelector = deployment.Spec.Template.Spec.NodeSelector
	podTemplate.Spec.NodeName = deployment.Spec.Template.Spec.NodeName
	podTemplate.Spec.HostNetwork = deployment.Spec.Template.Spec.HostNetwork
	podTemplate.Spec.HostPID = deployment.Spec.Template.Spec.HostPID
	podTemplate.Spec.HostIPC = deployment.Spec.Template.Spec.HostIPC
	podTemplate.Spec.ShareProcessNamespace = deployment.Spec.Template.Spec.ShareProcessNamespace
	podTemplate.Spec.TerminationGracePeriodSeconds = deployment.Spec.Template.Spec.TerminationGracePeriodSeconds
	podTemplate.Spec.ActiveDeadlineSeconds = deployment.Spec.Template.Spec.ActiveDeadlineSeconds
	podTemplate.Spec.RuntimeClassName = deployment.Spec.Template.Spec.RuntimeClassName
	podTemplate.Spec.EnableServiceLinks = deployment.Spec.Template.Spec.EnableServiceLinks
	podTemplate.Spec.PreemptionPolicy = (*string)(deployment.Spec.Template.Spec.PreemptionPolicy)

	// Store complex fields as interface{} to preserve structure
	if deployment.Spec.Template.Spec.SecurityContext != nil {
		podTemplate.Spec.SecurityContext = deployment.Spec.Template.Spec.SecurityContext
	}
	if deployment.Spec.Template.Spec.Affinity != nil {
		podTemplate.Spec.Affinity = deployment.Spec.Template.Spec.Affinity
	}
	if deployment.Spec.Template.Spec.DNSConfig != nil {
		podTemplate.Spec.DNSConfig = deployment.Spec.Template.Spec.DNSConfig
	}

	// Convert selector
	selector := LabelSelector{
		MatchLabels: deployment.Spec.Selector.MatchLabels,
	}
	if len(deployment.Spec.Selector.MatchExpressions) > 0 {
		selector.MatchExpressions = make([]map[string]interface{}, len(deployment.Spec.Selector.MatchExpressions))
		for i, expr := range deployment.Spec.Selector.MatchExpressions {
			selector.MatchExpressions[i] = map[string]interface{}{
				"key":      expr.Key,
				"operator": string(expr.Operator),
				"values":   expr.Values,
			}
		}
	}

	// Convert strategy
	strategy := DeploymentStrategy{
		Type: string(deployment.Spec.Strategy.Type),
	}
	if deployment.Spec.Strategy.RollingUpdate != nil {
		strategy.RollingUpdate = deployment.Spec.Strategy.RollingUpdate
	}

	// Build deployment spec
	spec := DeploymentSpec{
		Replicas:                deployment.Spec.Replicas,
		Selector:                selector,
		Template:                podTemplate,
		Strategy:                strategy,
		MinReadySeconds:         deployment.Spec.MinReadySeconds,
		RevisionHistoryLimit:    deployment.Spec.RevisionHistoryLimit,
		Paused:                  deployment.Spec.Paused,
		ProgressDeadlineSeconds: deployment.Spec.ProgressDeadlineSeconds,
	}

	// Convert deployment conditions
	conditions := make([]DeploymentCondition, len(deployment.Status.Conditions))
	for i, c := range deployment.Status.Conditions {
		conditions[i] = DeploymentCondition{
			Type:               string(c.Type),
			Status:             string(c.Status),
			LastUpdateTime:     c.LastUpdateTime.Time,
			LastTransitionTime: c.LastTransitionTime.Time,
			Reason:             c.Reason,
			Message:            c.Message,
		}
	}

	// Build deployment status
	status := DeploymentStatus{
		ObservedGeneration:  deployment.Status.ObservedGeneration,
		Replicas:            deployment.Status.Replicas,
		UpdatedReplicas:     deployment.Status.UpdatedReplicas,
		ReadyReplicas:       deployment.Status.ReadyReplicas,
		AvailableReplicas:   deployment.Status.AvailableReplicas,
		UnavailableReplicas: deployment.Status.UnavailableReplicas,
		Conditions:          conditions,
		CollisionCount:      deployment.Status.CollisionCount,
	}

	// Build the complete deployment detail
	return DeploymentDetail{
		Name:              deployment.Name,
		Namespace:         deployment.Namespace,
		UID:               string(deployment.UID),
		ResourceVersion:   deployment.ResourceVersion,
		Generation:        deployment.Generation,
		CreationTimestamp: deployment.CreationTimestamp.Time,
		Labels:            deployment.Labels,
		Annotations:       deployment.Annotations,
		Spec:              spec,
		Status:            status,
		Age:               calculateAge(deployment.CreationTimestamp.Time),
	}, nil
}

// GetServiceDetail retrieves detailed information of a specific service
func (s *Service) GetServiceDetail(ctx context.Context, namespace, name string) (ServiceInfo, error) {
	service, err := s.client.CoreV1().Services(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return ServiceInfo{}, fmt.Errorf("failed to get service details for %s/%s: %w", namespace, name, err)
	}

	// Format port information
	portStr := ""
	for i, port := range service.Spec.Ports {
		if i > 0 {
			portStr += ", "
		}
		portStr += fmt.Sprintf("%d:%d/%s", port.Port, port.TargetPort.IntVal, port.Protocol)
	}

	// Get external IP
	externalIP := ""
	if service.Spec.Type == corev1.ServiceTypeLoadBalancer {
		for _, ingress := range service.Status.LoadBalancer.Ingress {
			if ingress.IP != "" {
				externalIP = ingress.IP
				break
			}
			if ingress.Hostname != "" {
				externalIP = ingress.Hostname
				break
			}
		}
	} else if service.Spec.Type == corev1.ServiceTypeNodePort {
		externalIP = "<nodes>"
	}

	return ServiceInfo{
		Name:              service.Name,
		Namespace:         service.Namespace,
		Type:              string(service.Spec.Type),
		ClusterIP:         service.Spec.ClusterIP,
		ExternalIP:        externalIP,
		Ports:             portStr,
		Age:               calculateAge(service.CreationTimestamp.Time),
		Labels:            service.Labels,
		CreationTimestamp: service.CreationTimestamp.Time,
	}, nil
}

// GetIngressDetail retrieves detailed information of a specific ingress
func (s *Service) GetIngressDetail(ctx context.Context, namespace, name string) (IngressInfo, error) {
	ingress, err := s.client.NetworkingV1().Ingresses(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return IngressInfo{}, fmt.Errorf("failed to get ingress details for %s/%s: %w", namespace, name, err)
	}

	hosts := make([]string, 0, len(ingress.Spec.Rules))
	for _, rule := range ingress.Spec.Rules {
		hosts = append(hosts, rule.Host)
	}

	return IngressInfo{
		Name:      ingress.Name,
		Namespace: ingress.Namespace,
		Hosts:     hosts,
		Labels:    ingress.Labels,
	}, nil
}

// GetPVCDetail retrieves detailed information of a specific persistent volume claim
func (s *Service) GetPVCDetail(ctx context.Context, namespace, name string) (PVCInfo, error) {
	pvc, err := s.client.CoreV1().PersistentVolumeClaims(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return PVCInfo{}, fmt.Errorf("failed to get PVC details for %s/%s: %w", namespace, name, err)
	}

	return PVCInfo{
		Name:      pvc.Name,
		Namespace: pvc.Namespace,
		Status:    string(pvc.Status.Phase),
		Volume:    pvc.Spec.VolumeName,
	}, nil
}

// GetPVDetail retrieves detailed information of a specific persistent volume
func (s *Service) GetPVDetail(ctx context.Context, name string) (PVInfo, error) {
	pv, err := s.client.CoreV1().PersistentVolumes().Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return PVInfo{}, fmt.Errorf("failed to get PV details for %s: %w", name, err)
	}

	return PVInfo{
		Name: pv.Name,
	}, nil
}

// GetSecretDetail retrieves detailed information of a specific secret
func (s *Service) GetSecretDetail(ctx context.Context, namespace, name string) (SecretInfo, error) {
	secret, err := s.client.CoreV1().Secrets(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return SecretInfo{}, fmt.Errorf("failed to get secret details for %s/%s: %w", namespace, name, err)
	}

	return SecretInfo{
		Name:      secret.Name,
		Namespace: secret.Namespace,
	}, nil
}

// GetConfigMapDetail retrieves detailed information of a specific configmap
func (s *Service) GetConfigMapDetail(ctx context.Context, namespace, name string) (ConfigMapInfo, error) {
	configmap, err := s.client.CoreV1().ConfigMaps(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return ConfigMapInfo{}, fmt.Errorf("failed to get configmap details for %s/%s: %w", namespace, name, err)
	}

	return ConfigMapInfo{
		Name:      configmap.Name,
		Namespace: configmap.Namespace,
	}, nil
}

// GetNamespaceDetail retrieves detailed information of a specific namespace
func (s *Service) GetNamespaceDetail(ctx context.Context, name string) (NamespaceInfo, error) {
	namespace, err := s.client.CoreV1().Namespaces().Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return NamespaceInfo{}, fmt.Errorf("failed to get namespace details for %s: %w", name, err)
	}

	return NamespaceInfo{
		Name: namespace.Name,
	}, nil
}

// GetNodeDetail retrieves detailed information of a specific node
func (s *Service) GetNodeDetail(ctx context.Context, name string) (NodeInfo, error) {
	node, err := s.client.CoreV1().Nodes().Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return NodeInfo{}, fmt.Errorf("failed to get node details for %s: %w", name, err)
	}

	return NodeInfo{
		Name: node.Name,
	}, nil
}

// GetDaemonSetDetail retrieves detailed information of a specific daemonset
func (s *Service) GetDaemonSetDetail(ctx context.Context, namespace, name string) (DaemonSetInfo, error) {
	daemonset, err := s.client.AppsV1().DaemonSets(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return DaemonSetInfo{}, fmt.Errorf("failed to get daemonset details for %s/%s: %w", namespace, name, err)
	}

	return DaemonSetInfo{
		Name:      daemonset.Name,
		Namespace: daemonset.Namespace,
	}, nil
}

// GetStatefulSetDetail retrieves detailed information of a specific statefulset
func (s *Service) GetStatefulSetDetail(ctx context.Context, namespace, name string) (StatefulSetDetail, error) {
	statefulset, err := s.client.AppsV1().StatefulSets(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return StatefulSetDetail{}, fmt.Errorf("failed to get statefulset details for %s/%s: %w", namespace, name, err)
	}

	// Convert update strategy
	var updateStrategy StatefulSetUpdateStrategy
	updateStrategy.Type = string(statefulset.Spec.UpdateStrategy.Type)
	if statefulset.Spec.UpdateStrategy.RollingUpdate != nil {
		rollingUpdate := &RollingUpdateStatefulSetStrategy{
			Partition: statefulset.Spec.UpdateStrategy.RollingUpdate.Partition,
		}
		if statefulset.Spec.UpdateStrategy.RollingUpdate.MaxUnavailable != nil {
			rollingUpdate.MaxUnavailable = statefulset.Spec.UpdateStrategy.RollingUpdate.MaxUnavailable.String()
		}
		updateStrategy.RollingUpdate = rollingUpdate
	}

	// Convert PVC retention policy
	var pvcRetentionPolicy *PVCRetentionPolicy
	if statefulset.Spec.PersistentVolumeClaimRetentionPolicy != nil {
		pvcRetentionPolicy = &PVCRetentionPolicy{
			WhenDeleted: string(statefulset.Spec.PersistentVolumeClaimRetentionPolicy.WhenDeleted),
			WhenScaled:  string(statefulset.Spec.PersistentVolumeClaimRetentionPolicy.WhenScaled),
		}
	}

	// Convert ordinals
	var ordinals *StatefulSetOrdinals
	if statefulset.Spec.Ordinals != nil {
		ordinals = &StatefulSetOrdinals{
			Start: statefulset.Spec.Ordinals.Start,
		}
	}

	// Convert label selector
	var selector LabelSelector
	if statefulset.Spec.Selector != nil {
		selector.MatchLabels = statefulset.Spec.Selector.MatchLabels
		if len(statefulset.Spec.Selector.MatchExpressions) > 0 {
			selector.MatchExpressions = make([]map[string]interface{}, len(statefulset.Spec.Selector.MatchExpressions))
			for i, expr := range statefulset.Spec.Selector.MatchExpressions {
				selector.MatchExpressions[i] = map[string]interface{}{
					"key":      expr.Key,
					"operator": expr.Operator,
					"values":   expr.Values,
				}
			}
		}
	}

	// Convert pod template
	podTemplate := PodTemplateSpec{}
	podTemplate.Metadata.Labels = statefulset.Spec.Template.Labels
	podTemplate.Metadata.Annotations = statefulset.Spec.Template.Annotations

	// Convert containers in pod template
	containers := make([]ContainerSpec, len(statefulset.Spec.Template.Spec.Containers))
	for i, c := range statefulset.Spec.Template.Spec.Containers {
		// Convert ports
		ports := make([]ContainerPort, len(c.Ports))
		for j, p := range c.Ports {
			ports[j] = ContainerPort{
				Name:          p.Name,
				HostPort:      p.HostPort,
				ContainerPort: p.ContainerPort,
				Protocol:      string(p.Protocol),
				HostIP:        p.HostIP,
			}
		}

		// Convert environment variables
		env := make([]EnvironmentVariable, len(c.Env))
		for j, e := range c.Env {
			var valueFrom interface{}
			if e.ValueFrom != nil {
				valueFrom = e.ValueFrom
			}
			env[j] = EnvironmentVariable{
				Name:      e.Name,
				Value:     e.Value,
				ValueFrom: valueFrom,
			}
		}

		// Convert volume mounts
		volumeMounts := make([]VolumeMount, len(c.VolumeMounts))
		for j, vm := range c.VolumeMounts {
			volumeMounts[j] = VolumeMount{
				Name:             vm.Name,
				ReadOnly:         vm.ReadOnly,
				MountPath:        vm.MountPath,
				MountPropagation: string(safeDeref(vm.MountPropagation, "")),
				SubPath:          vm.SubPath,
				SubPathExpr:      vm.SubPathExpr,
			}
		}

		// Convert resources
		resources := ResourceRequirements{}
		if c.Resources.Limits != nil {
			resources.Limits = make(map[string]string)
			for k, v := range c.Resources.Limits {
				resources.Limits[string(k)] = v.String()
			}
		}
		if c.Resources.Requests != nil {
			resources.Requests = make(map[string]string)
			for k, v := range c.Resources.Requests {
				resources.Requests[string(k)] = v.String()
			}
		}

		containers[i] = ContainerSpec{
			Name:                     c.Name,
			Image:                    c.Image,
			Command:                  c.Command,
			Args:                     c.Args,
			WorkingDir:               c.WorkingDir,
			Ports:                    ports,
			Env:                      env,
			Resources:                resources,
			VolumeMounts:             volumeMounts,
			LivenessProbe:            c.LivenessProbe,
			ReadinessProbe:           c.ReadinessProbe,
			StartupProbe:             c.StartupProbe,
			ImagePullPolicy:          string(c.ImagePullPolicy),
			SecurityContext:          c.SecurityContext,
			TerminationMessagePath:   c.TerminationMessagePath,
			TerminationMessagePolicy: string(c.TerminationMessagePolicy),
		}
	}
	podTemplate.Spec.Containers = containers

	// Convert init containers
	initContainers := make([]ContainerSpec, len(statefulset.Spec.Template.Spec.InitContainers))
	for i, c := range statefulset.Spec.Template.Spec.InitContainers {
		// Similar conversion as containers (simplified for brevity)
		initContainers[i] = ContainerSpec{
			Name:            c.Name,
			Image:           c.Image,
			ImagePullPolicy: string(c.ImagePullPolicy),
		}
	}
	podTemplate.Spec.InitContainers = initContainers

	// Copy other pod spec fields
	podTemplate.Spec.Volumes = convertVolumes(statefulset.Spec.Template.Spec.Volumes)
	podTemplate.Spec.ServiceAccountName = statefulset.Spec.Template.Spec.ServiceAccountName
	podTemplate.Spec.SecurityContext = statefulset.Spec.Template.Spec.SecurityContext
	podTemplate.Spec.ImagePullSecrets = convertImagePullSecrets(statefulset.Spec.Template.Spec.ImagePullSecrets)
	podTemplate.Spec.Hostname = statefulset.Spec.Template.Spec.Hostname
	podTemplate.Spec.Subdomain = statefulset.Spec.Template.Spec.Subdomain
	podTemplate.Spec.Affinity = statefulset.Spec.Template.Spec.Affinity
	podTemplate.Spec.SchedulerName = statefulset.Spec.Template.Spec.SchedulerName
	podTemplate.Spec.Tolerations = convertTolerations(statefulset.Spec.Template.Spec.Tolerations)
	podTemplate.Spec.HostAliases = convertHostAliases(statefulset.Spec.Template.Spec.HostAliases)
	podTemplate.Spec.PriorityClassName = statefulset.Spec.Template.Spec.PriorityClassName
	podTemplate.Spec.Priority = statefulset.Spec.Template.Spec.Priority
	podTemplate.Spec.DNSConfig = statefulset.Spec.Template.Spec.DNSConfig
	podTemplate.Spec.DNSPolicy = string(statefulset.Spec.Template.Spec.DNSPolicy)
	podTemplate.Spec.RestartPolicy = string(statefulset.Spec.Template.Spec.RestartPolicy)
	podTemplate.Spec.NodeSelector = statefulset.Spec.Template.Spec.NodeSelector
	podTemplate.Spec.NodeName = statefulset.Spec.Template.Spec.NodeName
	podTemplate.Spec.HostNetwork = statefulset.Spec.Template.Spec.HostNetwork
	podTemplate.Spec.HostPID = statefulset.Spec.Template.Spec.HostPID
	podTemplate.Spec.HostIPC = statefulset.Spec.Template.Spec.HostIPC
	podTemplate.Spec.ShareProcessNamespace = statefulset.Spec.Template.Spec.ShareProcessNamespace
	podTemplate.Spec.TerminationGracePeriodSeconds = statefulset.Spec.Template.Spec.TerminationGracePeriodSeconds
	podTemplate.Spec.ActiveDeadlineSeconds = statefulset.Spec.Template.Spec.ActiveDeadlineSeconds
	podTemplate.Spec.ReadinessGates = convertReadinessGates(statefulset.Spec.Template.Spec.ReadinessGates)
	podTemplate.Spec.RuntimeClassName = statefulset.Spec.Template.Spec.RuntimeClassName
	podTemplate.Spec.EnableServiceLinks = statefulset.Spec.Template.Spec.EnableServiceLinks
	podTemplate.Spec.PreemptionPolicy = (*string)(statefulset.Spec.Template.Spec.PreemptionPolicy)
	podTemplate.Spec.Overhead = convertResourceList(statefulset.Spec.Template.Spec.Overhead)
	podTemplate.Spec.TopologySpreadConstraints = convertTopologySpreadConstraints(statefulset.Spec.Template.Spec.TopologySpreadConstraints)

	// Convert volume claim templates
	volumeClaimTemplates := make([]VolumeClaimTemplate, len(statefulset.Spec.VolumeClaimTemplates))
	for i, vct := range statefulset.Spec.VolumeClaimTemplates {
		vcTemplate := VolumeClaimTemplate{}
		vcTemplate.Metadata.Name = vct.Name
		vcTemplate.Metadata.Labels = vct.Labels
		vcTemplate.Metadata.Annotations = vct.Annotations
		
		// Convert access modes
		accessModes := make([]string, len(vct.Spec.AccessModes))
		for j, am := range vct.Spec.AccessModes {
			accessModes[j] = string(am)
		}
		vcTemplate.Spec.AccessModes = accessModes
		vcTemplate.Spec.StorageClassName = vct.Spec.StorageClassName
		
		// Convert resource requests
		if vct.Spec.Resources.Requests != nil {
			vcTemplate.Spec.Resources.Requests = make(map[string]string)
			for k, v := range vct.Spec.Resources.Requests {
				vcTemplate.Spec.Resources.Requests[string(k)] = v.String()
			}
		}
		
		volumeClaimTemplates[i] = vcTemplate
	}

	// Build spec
	spec := StatefulSetSpec{
		Replicas:                             statefulset.Spec.Replicas,
		Selector:                             selector,
		Template:                             podTemplate,
		ServiceName:                          statefulset.Spec.ServiceName,
		PodManagementPolicy:                  string(statefulset.Spec.PodManagementPolicy),
		UpdateStrategy:                       updateStrategy,
		RevisionHistoryLimit:                 statefulset.Spec.RevisionHistoryLimit,
		MinReadySeconds:                      statefulset.Spec.MinReadySeconds,
		PersistentVolumeClaimRetentionPolicy: pvcRetentionPolicy,
		Ordinals:                             ordinals,
	}

	// Convert conditions
	conditions := make([]StatefulSetCondition, len(statefulset.Status.Conditions))
	for i, c := range statefulset.Status.Conditions {
		conditions[i] = StatefulSetCondition{
			Type:               string(c.Type),
			Status:             string(c.Status),
			LastTransitionTime: c.LastTransitionTime.Time,
			Reason:             c.Reason,
			Message:            c.Message,
		}
	}

	// Build status
	status := StatefulSetStatus{
		ObservedGeneration:   statefulset.Status.ObservedGeneration,
		Replicas:             statefulset.Status.Replicas,
		ReadyReplicas:        statefulset.Status.ReadyReplicas,
		CurrentReplicas:      statefulset.Status.CurrentReplicas,
		UpdatedReplicas:      statefulset.Status.UpdatedReplicas,
		CurrentRevision:      statefulset.Status.CurrentRevision,
		UpdateRevision:       statefulset.Status.UpdateRevision,
		CollisionCount:       statefulset.Status.CollisionCount,
		Conditions:           conditions,
		AvailableReplicas:    statefulset.Status.AvailableReplicas,
	}

	return StatefulSetDetail{
		Name:                 statefulset.Name,
		Namespace:            statefulset.Namespace,
		UID:                  string(statefulset.UID),
		ResourceVersion:      statefulset.ResourceVersion,
		Generation:           statefulset.Generation,
		CreationTimestamp:    statefulset.CreationTimestamp.Time,
		Labels:               statefulset.Labels,
		Annotations:          statefulset.Annotations,
		Spec:                 spec,
		Status:               status,
		Age:                  calculateAge(statefulset.CreationTimestamp.Time),
		VolumeClaimTemplates: volumeClaimTemplates,
	}, nil
}

// GetJobDetail retrieves detailed information of a specific job
func (s *Service) GetJobDetail(ctx context.Context, namespace, name string) (JobInfo, error) {
	job, err := s.client.BatchV1().Jobs(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return JobInfo{}, fmt.Errorf("failed to get job details for %s/%s: %w", namespace, name, err)
	}

	return JobInfo{
		Name:      job.Name,
		Namespace: job.Namespace,
	}, nil
}

// GetCronJobDetail retrieves detailed information of a specific cronjob
func (s *Service) GetCronJobDetail(ctx context.Context, namespace, name string) (CronJobInfo, error) {
	cronjob, err := s.client.BatchV1().CronJobs(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return CronJobInfo{}, fmt.Errorf("failed to get cronjob details for %s/%s: %w", namespace, name, err)
	}

	return CronJobInfo{
		Name:      cronjob.Name,
		Namespace: cronjob.Namespace,
	}, nil
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
			Name:        crd.Name,
			Group:       crd.Spec.Group,
			Version:     latestVersion,
			Kind:        crd.Spec.Names.Kind,
			Scope:       scope,
			Names:       names,
			Age:         calculateAge(crd.CreationTimestamp.Time),
			Labels:      crd.Labels,
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
	// Create the clientset
	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create kubernetes clientset: %w", err)
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
		client:               clientset,
		apiExtensionsClient:  apiExtensionsClient,
		dynamicClient:        dynamicClient,
		nodeName:             nodeName,
		isControlPlane:       isControlPlane,
	}, nil
}

// safeDeref safely dereferences a pointer, returning the value or a default
func safeDeref[T any](ptr *T, defaultValue T) T {
	if ptr == nil {
		return defaultValue
	}
	return *ptr
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

// convertVolumes converts corev1.Volume slice to interface{} slice
func convertVolumes(volumes []corev1.Volume) []interface{} {
	result := make([]interface{}, len(volumes))
	for i, v := range volumes {
		result[i] = v
	}
	return result
}

// convertImagePullSecrets converts corev1.LocalObjectReference slice to map slice
func convertImagePullSecrets(secrets []corev1.LocalObjectReference) []map[string]string {
	result := make([]map[string]string, len(secrets))
	for i, s := range secrets {
		result[i] = map[string]string{"name": s.Name}
	}
	return result
}

// convertTolerations converts corev1.Toleration slice to map slice
func convertTolerations(tolerations []corev1.Toleration) []map[string]interface{} {
	result := make([]map[string]interface{}, len(tolerations))
	for i, t := range tolerations {
		result[i] = map[string]interface{}{
			"key":               t.Key,
			"operator":          string(t.Operator),
			"value":             t.Value,
			"effect":            string(t.Effect),
			"tolerationSeconds": t.TolerationSeconds,
		}
	}
	return result
}

// convertHostAliases converts corev1.HostAlias slice to interface{} slice  
func convertHostAliases(aliases []corev1.HostAlias) []interface{} {
	result := make([]interface{}, len(aliases))
	for i, a := range aliases {
		result[i] = a
	}
	return result
}

// convertReadinessGates converts corev1.PodReadinessGate slice to interface{} slice
func convertReadinessGates(gates []corev1.PodReadinessGate) []interface{} {
	result := make([]interface{}, len(gates))
	for i, g := range gates {
		result[i] = g
	}
	return result
}

// convertResourceList converts corev1.ResourceList to map[string]string
func convertResourceList(resources corev1.ResourceList) map[string]string {
	if resources == nil {
		return nil
	}
	result := make(map[string]string)
	for k, v := range resources {
		result[string(k)] = v.String()
	}
	return result
}

// convertTopologySpreadConstraints converts corev1.TopologySpreadConstraint slice to interface{} slice
func convertTopologySpreadConstraints(constraints []corev1.TopologySpreadConstraint) []interface{} {
	result := make([]interface{}, len(constraints))
	for i, c := range constraints {
		result[i] = c
	}
	return result
}
