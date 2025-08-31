package kubernetes

import (
	"context"
	"fmt"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// Namespace-scoped list methods for the Service

// ListPodsByNamespace lists pods in a specific namespace
func (s *Service) ListPodsByNamespace(ctx context.Context, namespace string) ([]PodInfo, error) {
	pods, err := s.client.CoreV1().Pods(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list pods in namespace %s: %w", namespace, err)
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

// ListDeploymentsByNamespace lists deployments in a specific namespace
func (s *Service) ListDeploymentsByNamespace(ctx context.Context, namespace string) ([]DeploymentInfo, error) {
	deployments, err := s.client.AppsV1().Deployments(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list deployments in namespace %s: %w", namespace, err)
	}

	deploymentList := make([]DeploymentInfo, 0, len(deployments.Items))
	for _, deployment := range deployments.Items {
		deploymentList = append(deploymentList, DeploymentInfo{
			APIVersion: "apps/v1",
			Kind:       "Deployment",
			Name:       deployment.Name,
			Namespace:  deployment.Namespace,
			Ready:      fmt.Sprintf("%d/%d", deployment.Status.ReadyReplicas, *deployment.Spec.Replicas),
			Available:  deployment.Status.AvailableReplicas,
			Age:        calculateAge(deployment.CreationTimestamp.Time),
			Labels:     deployment.Labels,
		})
	}

	return deploymentList, nil
}

// ListServicesByNamespace lists services in a specific namespace
func (s *Service) ListServicesByNamespace(ctx context.Context, namespace string) ([]ServiceInfo, error) {
	services, err := s.client.CoreV1().Services(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list services in namespace %s: %w", namespace, err)
	}

	serviceList := make([]ServiceInfo, 0, len(services.Items))
	for _, service := range services.Items {
		serviceList = append(serviceList, ServiceInfo{
			APIVersion: "v1",
			Kind:       "Service",
			Name:       service.Name,
			Namespace:  service.Namespace,
			Type:       string(service.Spec.Type),
			ClusterIP:  service.Spec.ClusterIP,
			ExternalIP: getExternalIPs(service),
			Ports:      formatPorts(service.Spec.Ports),
			Age:        calculateAge(service.CreationTimestamp.Time),
			Labels:     service.Labels,
		})
	}

	return serviceList, nil
}

// ListIngressesByNamespace lists ingresses in a specific namespace
func (s *Service) ListIngressesByNamespace(ctx context.Context, namespace string) ([]IngressInfo, error) {
	ingresses, err := s.client.NetworkingV1().Ingresses(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list ingresses in namespace %s: %w", namespace, err)
	}

	ingressList := make([]IngressInfo, 0, len(ingresses.Items))
	for _, ingress := range ingresses.Items {
		ingressList = append(ingressList, IngressInfo{
			APIVersion: "networking.k8s.io/v1",
			Kind:       "Ingress",
			Name:       ingress.Name,
			Namespace:  ingress.Namespace,
			Hosts:      extractIngressHostsArray(ingress),
			Address:    extractIngressAddress(ingress),
			Age:        calculateAge(ingress.CreationTimestamp.Time),
			Labels:     ingress.Labels,
		})
	}

	return ingressList, nil
}

// ListPVCsByNamespace lists persistent volume claims in a specific namespace
func (s *Service) ListPVCsByNamespace(ctx context.Context, namespace string) ([]PVCInfo, error) {
	pvcs, err := s.client.CoreV1().PersistentVolumeClaims(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list PVCs in namespace %s: %w", namespace, err)
	}

	pvcList := make([]PVCInfo, 0, len(pvcs.Items))
	for _, pvc := range pvcs.Items {
		pvcList = append(pvcList, PVCInfo{
			APIVersion:   "v1",
			Kind:         "PersistentVolumeClaim",
			Name:         pvc.Name,
			Namespace:    pvc.Namespace,
			Status:       string(pvc.Status.Phase),
			Volume:       pvc.Spec.VolumeName,
			Capacity:     getPVCCapacity(pvc),
			AccessModes:  formatAccessModes(pvc.Spec.AccessModes),
			StorageClass: getStorageClassName(pvc),
			Age:          calculateAge(pvc.CreationTimestamp.Time),
			Labels:       pvc.Labels,
		})
	}

	return pvcList, nil
}

// ListSecretsByNamespace lists secrets in a specific namespace
func (s *Service) ListSecretsByNamespace(ctx context.Context, namespace string) ([]SecretInfo, error) {
	secrets, err := s.client.CoreV1().Secrets(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list secrets in namespace %s: %w", namespace, err)
	}

	secretList := make([]SecretInfo, 0, len(secrets.Items))
	for _, secret := range secrets.Items {
		secretList = append(secretList, SecretInfo{
			APIVersion: "v1",
			Kind:       "Secret",
			Name:       secret.Name,
			Namespace:  secret.Namespace,
			Type:       string(secret.Type),
			Data:       len(secret.Data),
			Age:        calculateAge(secret.CreationTimestamp.Time),
			Labels:     secret.Labels,
		})
	}

	return secretList, nil
}

// ListConfigMapsByNamespace lists config maps in a specific namespace
func (s *Service) ListConfigMapsByNamespace(ctx context.Context, namespace string) ([]ConfigMapInfo, error) {
	configMaps, err := s.client.CoreV1().ConfigMaps(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list config maps in namespace %s: %w", namespace, err)
	}

	configMapList := make([]ConfigMapInfo, 0, len(configMaps.Items))
	for _, cm := range configMaps.Items {
		configMapList = append(configMapList, ConfigMapInfo{
			APIVersion: "v1",
			Kind:       "ConfigMap",
			Name:       cm.Name,
			Namespace:  cm.Namespace,
			Data:       len(cm.Data),
			Age:        calculateAge(cm.CreationTimestamp.Time),
			Labels:     cm.Labels,
		})
	}

	return configMapList, nil
}

// ListDaemonSetsByNamespace lists daemon sets in a specific namespace
func (s *Service) ListDaemonSetsByNamespace(ctx context.Context, namespace string) ([]DaemonSetInfo, error) {
	daemonSets, err := s.client.AppsV1().DaemonSets(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list daemon sets in namespace %s: %w", namespace, err)
	}

	daemonSetList := make([]DaemonSetInfo, 0, len(daemonSets.Items))
	for _, ds := range daemonSets.Items {
		daemonSetList = append(daemonSetList, DaemonSetInfo{
			APIVersion:   "apps/v1",
			Kind:         "DaemonSet",
			Name:         ds.Name,
			Namespace:    ds.Namespace,
			Desired:      ds.Status.DesiredNumberScheduled,
			Current:      ds.Status.CurrentNumberScheduled,
			Ready:        ds.Status.NumberReady,
			UpToDate:     ds.Status.UpdatedNumberScheduled,
			Available:    ds.Status.NumberAvailable,
			NodeSelector: ds.Spec.Template.Spec.NodeSelector,
			Age:          calculateAge(ds.CreationTimestamp.Time),
			Labels:       ds.Labels,
		})
	}

	return daemonSetList, nil
}

// ListStatefulSetsByNamespace lists stateful sets in a specific namespace
func (s *Service) ListStatefulSetsByNamespace(ctx context.Context, namespace string) ([]StatefulSetInfo, error) {
	statefulSets, err := s.client.AppsV1().StatefulSets(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list stateful sets in namespace %s: %w", namespace, err)
	}

	statefulSetList := make([]StatefulSetInfo, 0, len(statefulSets.Items))
	for _, ss := range statefulSets.Items {
		statefulSetList = append(statefulSetList, StatefulSetInfo{
			APIVersion: "apps/v1",
			Kind:       "StatefulSet",
			Name:       ss.Name,
			Namespace:  ss.Namespace,
			Ready:      fmt.Sprintf("%d/%d", ss.Status.ReadyReplicas, *ss.Spec.Replicas),
			Age:        calculateAge(ss.CreationTimestamp.Time),
			Labels:     ss.Labels,
		})
	}

	return statefulSetList, nil
}

// ListJobsByNamespace lists jobs in a specific namespace
func (s *Service) ListJobsByNamespace(ctx context.Context, namespace string) ([]JobInfo, error) {
	jobs, err := s.client.BatchV1().Jobs(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list jobs in namespace %s: %w", namespace, err)
	}

	jobList := make([]JobInfo, 0, len(jobs.Items))
	for _, job := range jobs.Items {
		jobList = append(jobList, JobInfo{
			APIVersion:  "batch/v1",
			Kind:        "Job",
			Name:        job.Name,
			Namespace:   job.Namespace,
			Completions: getCompletions(job),
			Age:         calculateAge(job.CreationTimestamp.Time),
			Labels:      job.Labels,
		})
	}

	return jobList, nil
}

// ListCronJobsByNamespace lists cron jobs in a specific namespace
func (s *Service) ListCronJobsByNamespace(ctx context.Context, namespace string) ([]CronJobInfo, error) {
	cronJobs, err := s.client.BatchV1().CronJobs(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list cron jobs in namespace %s: %w", namespace, err)
	}

	cronJobList := make([]CronJobInfo, 0, len(cronJobs.Items))
	for _, cj := range cronJobs.Items {
		cronJobList = append(cronJobList, CronJobInfo{
			APIVersion: "batch/v1",
			Kind:       "CronJob",
			Name:       cj.Name,
			Namespace:  cj.Namespace,
			Schedule:   cj.Spec.Schedule,
			Suspend:    cj.Spec.Suspend != nil && *cj.Spec.Suspend,
			Active:     len(cj.Status.Active),
			LastSchedule: func() string {
				if cj.Status.LastScheduleTime != nil {
					return cj.Status.LastScheduleTime.Format("2006-01-02 15:04:05")
				}
				return ""
			}(),
			Age:    calculateAge(cj.CreationTimestamp.Time),
			Labels: cj.Labels,
		})
	}

	return cronJobList, nil
}

// ListNetworkPoliciesByNamespace lists network policies in a specific namespace
func (s *Service) ListNetworkPoliciesByNamespace(ctx context.Context, namespace string) ([]NetworkPolicyInfo, error) {
	networkPolicies, err := s.client.NetworkingV1().NetworkPolicies(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list network policies in namespace %s: %w", namespace, err)
	}

	networkPolicyList := make([]NetworkPolicyInfo, 0, len(networkPolicies.Items))
	for _, np := range networkPolicies.Items {
		networkPolicyList = append(networkPolicyList, NetworkPolicyInfo{
			APIVersion:  "networking.k8s.io/v1",
			Kind:        "NetworkPolicy",
			Name:        np.Name,
			Namespace:   np.Namespace,
			PodSelector: formatPodSelector(np.Spec.PodSelector.MatchLabels),
			PolicyTypes: func() []string {
				types := make([]string, 0, len(np.Spec.PolicyTypes))
				for _, pt := range np.Spec.PolicyTypes {
					types = append(types, string(pt))
				}
				return types
			}(),
			Age:    calculateAge(np.CreationTimestamp.Time),
			Labels: np.Labels,
		})
	}

	return networkPolicyList, nil
}

// ListReplicaSetsByNamespace lists replica sets in a specific namespace
func (s *Service) ListReplicaSetsByNamespace(ctx context.Context, namespace string) ([]ReplicaSetInfo, error) {
	replicaSets, err := s.client.AppsV1().ReplicaSets(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list replica sets in namespace %s: %w", namespace, err)
	}

	replicaSetList := make([]ReplicaSetInfo, 0, len(replicaSets.Items))
	for _, rs := range replicaSets.Items {
		replicaSetList = append(replicaSetList, ReplicaSetInfo{
			APIVersion: "apps/v1",
			Kind:       "ReplicaSet",
			Name:       rs.Name,
			Namespace:  rs.Namespace,
			Desired:    *rs.Spec.Replicas,
			Current:    rs.Status.Replicas,
			Ready:      rs.Status.ReadyReplicas,
			Age:        calculateAge(rs.CreationTimestamp.Time),
			Labels:     rs.Labels,
		})
	}

	return replicaSetList, nil
}

// ListServiceAccountsByNamespace lists service accounts in a specific namespace
func (s *Service) ListServiceAccountsByNamespace(ctx context.Context, namespace string) ([]ServiceAccountInfo, error) {
	serviceAccounts, err := s.client.CoreV1().ServiceAccounts(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list service accounts in namespace %s: %w", namespace, err)
	}

	serviceAccountList := make([]ServiceAccountInfo, 0, len(serviceAccounts.Items))
	for _, sa := range serviceAccounts.Items {
		serviceAccountList = append(serviceAccountList, ServiceAccountInfo{
			APIVersion: "v1",
			Kind:       "ServiceAccount",
			Name:       sa.Name,
			Namespace:  sa.Namespace,
			Secrets:    len(sa.Secrets),
			Age:        calculateAge(sa.CreationTimestamp.Time),
			Labels:     sa.Labels,
		})
	}

	return serviceAccountList, nil
}

// ListRolesByNamespace lists roles in a specific namespace
func (s *Service) ListRolesByNamespace(ctx context.Context, namespace string) ([]RoleInfo, error) {
	roles, err := s.client.RbacV1().Roles(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list roles in namespace %s: %w", namespace, err)
	}

	roleList := make([]RoleInfo, 0, len(roles.Items))
	for _, role := range roles.Items {
		roleList = append(roleList, RoleInfo{
			APIVersion: "rbac.authorization.k8s.io/v1",
			Kind:       "Role",
			Name:       role.Name,
			Namespace:  role.Namespace,
			Rules:      len(role.Rules),
			Age:        calculateAge(role.CreationTimestamp.Time),
			Labels:     role.Labels,
		})
	}

	return roleList, nil
}

// ListRoleBindingsByNamespace lists role bindings in a specific namespace
func (s *Service) ListRoleBindingsByNamespace(ctx context.Context, namespace string) ([]RoleBindingInfo, error) {
	roleBindings, err := s.client.RbacV1().RoleBindings(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list role bindings in namespace %s: %w", namespace, err)
	}

	roleBindingList := make([]RoleBindingInfo, 0, len(roleBindings.Items))
	for _, rb := range roleBindings.Items {
		roleBindingList = append(roleBindingList, RoleBindingInfo{
			APIVersion: "rbac.authorization.k8s.io/v1",
			Kind:       "RoleBinding",
			Name:       rb.Name,
			Namespace:  rb.Namespace,
			RoleRef:    rb.RoleRef.Name,
			Subjects:   len(rb.Subjects),
			Age:        calculateAge(rb.CreationTimestamp.Time),
			Labels:     rb.Labels,
		})
	}

	return roleBindingList, nil
}

// ListHorizontalPodAutoscalersByNamespace lists horizontal pod autoscalers in a specific namespace
func (s *Service) ListHorizontalPodAutoscalersByNamespace(ctx context.Context, namespace string) ([]HorizontalPodAutoscalerInfo, error) {
	hpas, err := s.client.AutoscalingV2().HorizontalPodAutoscalers(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list horizontal pod autoscalers in namespace %s: %w", namespace, err)
	}

	hpaList := make([]HorizontalPodAutoscalerInfo, 0, len(hpas.Items))
	for _, hpa := range hpas.Items {
		hpaList = append(hpaList, HorizontalPodAutoscalerInfo{
			APIVersion: "autoscaling/v2",
			Kind:       "HorizontalPodAutoscaler",
			Name:       hpa.Name,
			Namespace:  hpa.Namespace,
			Reference:  hpa.Spec.ScaleTargetRef.Name,
			MinReplicas: func() int32 {
				if hpa.Spec.MinReplicas != nil {
					return *hpa.Spec.MinReplicas
				}
				return 1
			}(),
			MaxReplicas:     hpa.Spec.MaxReplicas,
			CurrentReplicas: hpa.Status.CurrentReplicas,
			Age:             calculateAge(hpa.CreationTimestamp.Time),
			Labels:          hpa.Labels,
		})
	}

	return hpaList, nil
}
