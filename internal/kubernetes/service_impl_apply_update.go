package kubernetes

import (
	"context"
	"fmt"

	appsv1 "k8s.io/api/apps/v1"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// ApplyDeployment creates or updates a deployment
func (s *Service) ApplyDeployment(ctx context.Context, deployment *appsv1.Deployment) (*appsv1.Deployment, error) {
	// Ensure the deployment has the required fields
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
	// Ensure the deployment has the required fields
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

// DeleteDeployment deletes a specific deployment
func (s *Service) DeleteDeployment(ctx context.Context, namespace, name string) error {
	err := s.client.AppsV1().Deployments(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete deployment: %w", err)
	}
	return nil
}

// ApplyService creates or updates a service
func (s *Service) ApplyService(ctx context.Context, service *corev1.Service) (*corev1.Service, error) {
	// Ensure the service has the required fields
	if service.Name == "" {
		return nil, fmt.Errorf("service name is required")
	}
	if service.Namespace == "" {
		service.Namespace = "default"
	}
	
	// Try to get the existing service first
	existingService, err := s.client.CoreV1().Services(service.Namespace).Get(ctx, service.Name, metav1.GetOptions{})
	if err != nil {
		// Service doesn't exist, create it
		createdService, err := s.client.CoreV1().Services(service.Namespace).Create(ctx, service, metav1.CreateOptions{})
		if err != nil {
			return nil, fmt.Errorf("failed to create service: %w", err)
		}
		return createdService, nil
	}
	
	// Service exists, preserve ClusterIP if it's not specified
	if service.Spec.ClusterIP == "" && existingService.Spec.ClusterIP != "" {
		service.Spec.ClusterIP = existingService.Spec.ClusterIP
	}
	
	// Update the service
	updatedService, err := s.client.CoreV1().Services(service.Namespace).Update(ctx, service, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to update service: %w", err)
	}
	
	return updatedService, nil
}

// UpdateService updates an existing service
func (s *Service) UpdateService(ctx context.Context, namespace, name string, service *corev1.Service) (*corev1.Service, error) {
	// Ensure the service has the required fields
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
	
	// Preserve the resource version and ClusterIP for update
	service.ResourceVersion = existingService.ResourceVersion
	if service.Spec.ClusterIP == "" {
		service.Spec.ClusterIP = existingService.Spec.ClusterIP
	}
	
	// Update the service
	updatedService, err := s.client.CoreV1().Services(namespace).Update(ctx, service, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to update service: %w", err)
	}
	
	return updatedService, nil
}

// DeleteService deletes a specific service
func (s *Service) DeleteService(ctx context.Context, namespace, name string) error {
	err := s.client.CoreV1().Services(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete service: %w", err)
	}
	return nil
}

// ApplyIngress creates or updates an ingress
func (s *Service) ApplyIngress(ctx context.Context, ingress *networkingv1.Ingress) (*networkingv1.Ingress, error) {
	// Ensure the ingress has the required fields
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
	// Ensure the ingress has the required fields
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

// DeleteIngress deletes a specific ingress
func (s *Service) DeleteIngress(ctx context.Context, namespace, name string) error {
	err := s.client.NetworkingV1().Ingresses(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete ingress: %w", err)
	}
	return nil
}

// ApplyPVC creates or updates a persistent volume claim
func (s *Service) ApplyPVC(ctx context.Context, pvc *corev1.PersistentVolumeClaim) (*corev1.PersistentVolumeClaim, error) {
	// Ensure the PVC has the required fields
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
	
	// PVC exists, update it (limited updates allowed for PVCs)
	updatedPVC, err := s.client.CoreV1().PersistentVolumeClaims(pvc.Namespace).Update(ctx, pvc, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to update PVC: %w", err)
	}
	
	return updatedPVC, nil
}

// UpdatePVC updates an existing persistent volume claim
func (s *Service) UpdatePVC(ctx context.Context, namespace, name string, pvc *corev1.PersistentVolumeClaim) (*corev1.PersistentVolumeClaim, error) {
	// Ensure the PVC has the required fields
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

// DeletePVC deletes a specific persistent volume claim
func (s *Service) DeletePVC(ctx context.Context, namespace, name string) error {
	err := s.client.CoreV1().PersistentVolumeClaims(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete PVC: %w", err)
	}
	return nil
}

// ApplyPV creates or updates a persistent volume
func (s *Service) ApplyPV(ctx context.Context, pv *corev1.PersistentVolume) (*corev1.PersistentVolume, error) {
	// Ensure the PV has the required fields
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

// UpdatePV updates an existing persistent volume
func (s *Service) UpdatePV(ctx context.Context, name string, pv *corev1.PersistentVolume) (*corev1.PersistentVolume, error) {
	// Ensure the PV has the required fields
	if pv.Name == "" {
		pv.Name = name
	}
	
	// Validate that the names match
	if pv.Name != name {
		return nil, fmt.Errorf("PV name in body does not match URL parameters")
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

// DeletePV deletes a specific persistent volume
func (s *Service) DeletePV(ctx context.Context, name string) error {
	err := s.client.CoreV1().PersistentVolumes().Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete PV: %w", err)
	}
	return nil
}

// ApplySecret creates or updates a secret
func (s *Service) ApplySecret(ctx context.Context, secret *corev1.Secret) (*corev1.Secret, error) {
	// Ensure the secret has the required fields
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
	// Ensure the secret has the required fields
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

// DeleteSecret deletes a specific secret
func (s *Service) DeleteSecret(ctx context.Context, namespace, name string) error {
	err := s.client.CoreV1().Secrets(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete secret: %w", err)
	}
	return nil
}

// ApplyConfigMap creates or updates a configmap
func (s *Service) ApplyConfigMap(ctx context.Context, configmap *corev1.ConfigMap) (*corev1.ConfigMap, error) {
	// Ensure the configmap has the required fields
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
	// Ensure the configmap has the required fields
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

// DeleteConfigMap deletes a specific configmap
func (s *Service) DeleteConfigMap(ctx context.Context, namespace, name string) error {
	err := s.client.CoreV1().ConfigMaps(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete configmap: %w", err)
	}
	return nil
}

// ApplyNamespace creates or updates a namespace
func (s *Service) ApplyNamespace(ctx context.Context, namespace *corev1.Namespace) (*corev1.Namespace, error) {
	// Ensure the namespace has the required fields
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
	// Ensure the namespace has the required fields
	if namespace.Name == "" {
		namespace.Name = name
	}
	
	// Validate that the names match
	if namespace.Name != name {
		return nil, fmt.Errorf("namespace name in body does not match URL parameters")
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

// DeleteNamespace deletes a specific namespace
func (s *Service) DeleteNamespace(ctx context.Context, name string) error {
	err := s.client.CoreV1().Namespaces().Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete namespace: %w", err)
	}
	return nil
}

// ApplyDaemonSet creates or updates a daemonset
func (s *Service) ApplyDaemonSet(ctx context.Context, daemonset *appsv1.DaemonSet) (*appsv1.DaemonSet, error) {
	// Ensure the daemonset has the required fields
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
	// Ensure the daemonset has the required fields
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

// DeleteDaemonSet deletes a specific daemonset
func (s *Service) DeleteDaemonSet(ctx context.Context, namespace, name string) error {
	err := s.client.AppsV1().DaemonSets(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete daemonset: %w", err)
	}
	return nil
}

// ApplyStatefulSet creates or updates a statefulset
func (s *Service) ApplyStatefulSet(ctx context.Context, statefulset *appsv1.StatefulSet) (*appsv1.StatefulSet, error) {
	// Ensure the statefulset has the required fields
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
	// Ensure the statefulset has the required fields
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

// DeleteStatefulSet deletes a specific statefulset
func (s *Service) DeleteStatefulSet(ctx context.Context, namespace, name string) error {
	err := s.client.AppsV1().StatefulSets(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete statefulset: %w", err)
	}
	return nil
}

// ApplyJob creates or updates a job
func (s *Service) ApplyJob(ctx context.Context, job *batchv1.Job) (*batchv1.Job, error) {
	// Ensure the job has the required fields
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
	
	// Job exists, update it (limited updates allowed for jobs)
	updatedJob, err := s.client.BatchV1().Jobs(job.Namespace).Update(ctx, job, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to update job: %w", err)
	}
	
	return updatedJob, nil
}

// UpdateJob updates an existing job
func (s *Service) UpdateJob(ctx context.Context, namespace, name string, job *batchv1.Job) (*batchv1.Job, error) {
	// Ensure the job has the required fields
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

// DeleteJob deletes a specific job
func (s *Service) DeleteJob(ctx context.Context, namespace, name string) error {
	propagationPolicy := metav1.DeletePropagationBackground
	err := s.client.BatchV1().Jobs(namespace).Delete(ctx, name, metav1.DeleteOptions{
		PropagationPolicy: &propagationPolicy,
	})
	if err != nil {
		return fmt.Errorf("failed to delete job: %w", err)
	}
	return nil
}

// ApplyCronJob creates or updates a cronjob
func (s *Service) ApplyCronJob(ctx context.Context, cronjob *batchv1.CronJob) (*batchv1.CronJob, error) {
	// Ensure the cronjob has the required fields
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
	// Ensure the cronjob has the required fields
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

// DeleteCronJob deletes a specific cronjob
func (s *Service) DeleteCronJob(ctx context.Context, namespace, name string) error {
	propagationPolicy := metav1.DeletePropagationBackground
	err := s.client.BatchV1().CronJobs(namespace).Delete(ctx, name, metav1.DeleteOptions{
		PropagationPolicy: &propagationPolicy,
	})
	if err != nil {
		return fmt.Errorf("failed to delete cronjob: %w", err)
	}
	return nil
}
