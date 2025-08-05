package kubernetes

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	apiextensionsclient "k8s.io/apiextensions-apiserver/pkg/client/clientset/clientset"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

// Service represents the Kubernetes service implementation
type Service struct {
	client               kubernetes.Interface
	apiExtensionsClient  apiextensionsclient.Interface
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
func (s *Service) GetDeploymentDetail(ctx context.Context, namespace, name string) (DeploymentInfo, error) {
	deployment, err := s.client.AppsV1().Deployments(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return DeploymentInfo{}, fmt.Errorf("failed to get deployment details for %s/%s: %w", namespace, name, err)
	}

	return DeploymentInfo{
		Name:      deployment.Name,
		Namespace: deployment.Namespace,
		Ready:     fmt.Sprintf("%d/%d", deployment.Status.ReadyReplicas, deployment.Status.Replicas),
		UpToDate:  deployment.Status.UpdatedReplicas,
		Available: deployment.Status.AvailableReplicas,
		Age:       calculateAge(deployment.CreationTimestamp.Time),
		Labels:    deployment.Labels,
	}, nil
}

// GetServiceDetail retrieves detailed information of a specific service
func (s *Service) GetServiceDetail(ctx context.Context, namespace, name string) (ServiceInfo, error) {
	service, err := s.client.CoreV1().Services(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return ServiceInfo{}, fmt.Errorf("failed to get service details for %s/%s: %w", namespace, name, err)
	}

	return ServiceInfo{
		Name:      service.Name,
		Namespace: service.Namespace,
		Type:      string(service.Spec.Type),
		ClusterIP: service.Spec.ClusterIP,
		Ports:     "",
		Labels:    service.Labels,
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
func (s *Service) GetStatefulSetDetail(ctx context.Context, namespace, name string) (StatefulSetInfo, error) {
	statefulset, err := s.client.AppsV1().StatefulSets(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return StatefulSetInfo{}, fmt.Errorf("failed to get statefulset details for %s/%s: %w", namespace, name, err)
	}

	return StatefulSetInfo{
		Name:      statefulset.Name,
		Namespace: statefulset.Namespace,
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
		nodeName:             nodeName,
		isControlPlane:       isControlPlane,
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
