package kubernetes

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
)

// Service handles Kubernetes operations
//
// ListDeployments lists all deployments in the cluster
func (s *Service) ListDeployments(c *gin.Context) {
	deployments, err := s.client.AppsV1().Deployments("").List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		c.JSON(500, ErrorResponse(fmt.Errorf("failed to list deployments: %w", err)))
		return
	}
	deploymentList := []DeploymentInfo{}
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
	c.JSON(200, gin.H{"deployments": deploymentList, "count": len(deploymentList)})
}

// ListServices lists all services in the cluster
func (s *Service) ListServices(c *gin.Context) {
	services, err := s.client.CoreV1().Services("").List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		c.JSON(500, ErrorResponse(fmt.Errorf("failed to list services: %w", err)))
		return
	}
	serviceList := []ServiceInfo{}
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
	c.JSON(200, gin.H{"services": serviceList, "count": len(serviceList)})
}

// ListIngresses lists all ingresses in the cluster
func (s *Service) ListIngresses(c *gin.Context) {
	ingresses, err := s.client.NetworkingV1().Ingresses("").List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		c.JSON(500, ErrorResponse(fmt.Errorf("failed to list ingresses: %w", err)))
		return
	}
	ingressList := []IngressInfo{}
	for _, ing := range ingresses.Items {
		hosts := []string{}
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
	c.JSON(200, gin.H{"ingresses": ingressList, "count": len(ingressList)})
}

// ListPVCs lists all persistent volume claims in the cluster
func (s *Service) ListPVCs(c *gin.Context) {
	pvcs, err := s.client.CoreV1().PersistentVolumeClaims("").List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		c.JSON(500, ErrorResponse(fmt.Errorf("failed to list PVCs: %w", err)))
		return
	}
	pvcList := []PVCInfo{}
	for _, pvc := range pvcs.Items {
		pvcList = append(pvcList, PVCInfo{
			Name:      pvc.Name,
			Namespace: pvc.Namespace,
			Status:    string(pvc.Status.Phase),
			Volume:    pvc.Spec.VolumeName,
		})
	}
	c.JSON(200, gin.H{"pvcs": pvcList, "count": len(pvcList)})
}

// ListPVs lists all persistent volumes in the cluster
func (s *Service) ListPVs(c *gin.Context) {
	pvs, err := s.client.CoreV1().PersistentVolumes().List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		c.JSON(500, ErrorResponse(fmt.Errorf("failed to list PVs: %w", err)))
		return
	}
	pvList := []PVInfo{}
	for _, pv := range pvs.Items {
		pvList = append(pvList, PVInfo{
			Name:      pv.Name,
		})
	}
	c.JSON(200, gin.H{"pvs": pvList, "count": len(pvList)})
}

// ListSecrets lists all secrets in the cluster
func (s *Service) ListSecrets(c *gin.Context) {
	secrets, err := s.client.CoreV1().Secrets("").List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		c.JSON(500, ErrorResponse(fmt.Errorf("failed to list secrets: %w", err)))
		return
	}
	secretList := []SecretInfo{}
	for _, secret := range secrets.Items {
		secretList = append(secretList, SecretInfo{
			Name:      secret.Name,
			Namespace: secret.Namespace,
		})
	}
	c.JSON(200, gin.H{"secrets": secretList, "count": len(secretList)})
}

// ListConfigMaps lists all configmaps in the cluster
func (s *Service) ListConfigMaps(c *gin.Context) {
	configmaps, err := s.client.CoreV1().ConfigMaps("").List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		c.JSON(500, ErrorResponse(fmt.Errorf("failed to list configmaps: %w", err)))
		return
	}
	configMapList := []ConfigMapInfo{}
	for _, configmap := range configmaps.Items {
		configMapList = append(configMapList, ConfigMapInfo{
			Name:      configmap.Name,
			Namespace: configmap.Namespace,
		})
	}
	c.JSON(200, gin.H{"configmaps": configMapList, "count": len(configMapList)})
}

// ListNamespaces lists all namespaces in the cluster
func (s *Service) ListNamespaces(c *gin.Context) {
	namespaces, err := s.client.CoreV1().Namespaces().List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		c.JSON(500, ErrorResponse(fmt.Errorf("failed to list namespaces: %w", err)))
		return
	}
	namespaceList := []NamespaceInfo{}
	for _, namespace := range namespaces.Items {
		namespaceList = append(namespaceList, NamespaceInfo{
			Name: namespace.Name,
		})
	}
	c.JSON(200, gin.H{"namespaces": namespaceList, "count": len(namespaceList)})
}

// ListNodes lists all nodes in the cluster
func (s *Service) ListNodes(c *gin.Context) {
	nodes, err := s.client.CoreV1().Nodes().List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		c.JSON(500, ErrorResponse(fmt.Errorf("failed to list nodes: %w", err)))
		return
	}
	nodeList := []NodeInfo{}
	for _, node := range nodes.Items {
		nodeList = append(nodeList, NodeInfo{
			Name: node.Name,
		})
	}
	c.JSON(200, gin.H{"nodes": nodeList, "count": len(nodeList)})
}

// ListDaemonSets lists all daemonsets in the cluster
func (s *Service) ListDaemonSets(c *gin.Context) {
	daemonSets, err := s.client.AppsV1().DaemonSets("").List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		c.JSON(500, ErrorResponse(fmt.Errorf("failed to list daemonsets: %w", err)))
		return
	}
	daemonSetList := []DaemonSetInfo{}
	for _, ds := range daemonSets.Items {
		daemonSetList = append(daemonSetList, DaemonSetInfo{
			Name: ds.Name,
			Namespace: ds.Namespace,
			Desired: ds.Status.DesiredNumberScheduled,
			Current: ds.Status.CurrentNumberScheduled,
			Ready: ds.Status.NumberReady,
			UpToDate: ds.Status.UpdatedNumberScheduled,
			Available: ds.Status.NumberAvailable,
			Age: calculateAge(ds.CreationTimestamp.Time),
			Labels: ds.Labels,
		})
	}
	c.JSON(200, gin.H{"daemonsets": daemonSetList, "count": len(daemonSetList)})
}

// ListStatefulSets lists all statefulsets in the cluster
func (s *Service) ListStatefulSets(c *gin.Context) {
	statefulSets, err := s.client.AppsV1().StatefulSets("").List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		c.JSON(500, ErrorResponse(fmt.Errorf("failed to list statefulsets: %w", err)))
		return
	}
	statefulSetList := []StatefulSetInfo{}
	for _, sts := range statefulSets.Items {
		statefulSetList = append(statefulSetList, StatefulSetInfo{
			Name:      sts.Name,
			Namespace: sts.Namespace,
			Ready:     fmt.Sprintf("%d/%d", sts.Status.ReadyReplicas, sts.Status.Replicas),
			Age:       calculateAge(sts.CreationTimestamp.Time),
			Labels:    sts.Labels,
		})
	}
	c.JSON(200, gin.H{"statefulsets": statefulSetList, "count": len(statefulSetList)})
}

// ListJobs lists all jobs in the cluster
func (s *Service) ListJobs(c *gin.Context) {
	jobs, err := s.client.BatchV1().Jobs("").List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		c.JSON(500, ErrorResponse(fmt.Errorf("failed to list jobs: %w", err)))
		return
	}
	jobList := []JobInfo{}
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
	c.JSON(200, gin.H{"jobs": jobList, "count": len(jobList)})
}

// ListCronJobs lists all cronjobs in the cluster
func (s *Service) ListCronJobs(c *gin.Context) {
	cronJobs, err := s.client.BatchV1().CronJobs("").List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		c.JSON(500, ErrorResponse(fmt.Errorf("failed to list cronjobs: %w", err)))
		return
	}
	cronJobList := []CronJobInfo{}
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
	c.JSON(200, gin.H{"cronjobs": cronJobList, "count": len(cronJobList)})
}

// GetClusterInfo returns cluster information
func (s *Service) GetClusterInfo(c *gin.Context) {
	version, err := s.client.Discovery().ServerVersion()
	if err != nil {
		c.JSON(500, ErrorResponse(fmt.Errorf("failed to get server version: %w", err)))
		return
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

	c.JSON(200, gin.H{"cluster_info": clusterInfo})
}
type Service struct {
	client     *kubernetes.Clientset
	nodeName   string
	isControlPlane bool
}

// NewService creates a new Kubernetes service
func NewService() (*Service, error) {
	if _, err := os.Stat("/usr/bin/kubectl"); os.IsNotExist(err) {
		return nil, fmt.Errorf("Kubernetes is not installed")
	}

	config, err := clientcmd.BuildConfigFromFlags("", clientcmd.RecommendedHomeFile)
	if err != nil {
		return nil, fmt.Errorf("Failed to build Kubernetes configuration: %w", err)
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("Failed to create Kubernetes client: %w", err)
	}

	nodeName := os.Getenv("NODE_NAME")

	nodes, err := clientset.CoreV1().Nodes().List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("Failed to list nodes: %w", err)
	}

	isControlPlane := false
	for _, node := range nodes.Items {
		if node.Name == nodeName {
			for label, _ := range node.Labels {
				if label == "node-role.kubernetes.io/master" || label == "node-role.kubernetes.io/control-plane" {
					isControlPlane = true
				}
			}
		}
	}

	if !isControlPlane {
		return nil, fmt.Errorf("Node %s is not part of the control plane", nodeName)
	}

	return &Service{
		client: clientset,
		nodeName: nodeName,
		isControlPlane: isControlPlane,
	}, nil
}

// ErrorResponse returns a formatted error response
func ErrorResponse(err error) map[string]interface{} {
	return map[string]interface{}{
		"error": err.Error(),
	}
}


// ListPods lists all pods in the cluster
func (s *Service) ListPods(c *gin.Context) {
	pods, err := s.client.CoreV1().Pods("").List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		c.JSON(500, ErrorResponse(fmt.Errorf("failed to list pods: %w", err)))
		return
	}
	// Simplified pod list - convert to []PodInfo
	podInfoList := []PodInfo{}
	for _, pod := range pods.Items {
		podInfoList = append(podInfoList, PodInfo{
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
	c.JSON(200, gin.H{"pods": podInfoList, "count": len(podInfoList)})
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
