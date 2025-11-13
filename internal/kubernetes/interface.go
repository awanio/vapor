package kubernetes

import (
	"context"

	appsv1 "k8s.io/api/apps/v1"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	apiextensionsv1 "k8s.io/apiextensions-apiserver/pkg/apis/apiextensions/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/client-go/rest"
)

// KubernetesService defines the interface for Kubernetes operations
type KubernetesService interface {
	ListDeployments(ctx context.Context, opts interface{}) ([]DeploymentInfo, error)
	ListServices(ctx context.Context, opts interface{}) ([]ServiceInfo, error)
	ListIngresses(ctx context.Context, opts interface{}) ([]IngressInfo, error)
	ListPVCs(ctx context.Context, opts interface{}) ([]PVCInfo, error)
	ListPVs(ctx context.Context, opts interface{}) ([]PVInfo, error)
	ListSecrets(ctx context.Context, opts interface{}) ([]SecretInfo, error)
	ListConfigMaps(ctx context.Context, opts interface{}) ([]ConfigMapInfo, error)
	ListNamespaces(ctx context.Context, opts interface{}) ([]NamespaceInfo, error)
	ListNodes(ctx context.Context, opts interface{}) ([]NodeInfo, error)
	ListDaemonSets(ctx context.Context, opts interface{}) ([]DaemonSetInfo, error)
	ListStatefulSets(ctx context.Context, opts interface{}) ([]StatefulSetInfo, error)
	ListJobs(ctx context.Context, opts interface{}) ([]JobInfo, error)
	ListCronJobs(ctx context.Context, opts interface{}) ([]CronJobInfo, error)
	ListPods(ctx context.Context, opts interface{}) ([]PodInfo, error)
	ListCRDs(ctx context.Context, opts interface{}) ([]CRDInfo, error)
	GetCRDDetail(ctx context.Context, name string) (*apiextensionsv1.CustomResourceDefinition, error)
	ApplyCRD(ctx context.Context, crd *apiextensionsv1.CustomResourceDefinition) (*apiextensionsv1.CustomResourceDefinition, error)
	UpdateCRD(ctx context.Context, name string, crd *apiextensionsv1.CustomResourceDefinition) (*apiextensionsv1.CustomResourceDefinition, error)
	DeleteCRD(ctx context.Context, name string) error
	ListCRDObjects(ctx context.Context, crdName, namespace string) ([]CRDObject, error)
	GetCRDObjectDetail(ctx context.Context, crdName, objectName, namespace string) (*unstructured.Unstructured, error)
	GetPodDetail(ctx context.Context, namespace, name string) (*corev1.Pod, error)
	CreateCRDObject(ctx context.Context, crdName, namespace string, object *unstructured.Unstructured) (*unstructured.Unstructured, error)
	UpdateCRDObject(ctx context.Context, crdName, namespace, objectName string, object *unstructured.Unstructured) (*unstructured.Unstructured, error)
	DeleteCRDObject(ctx context.Context, crdName, namespace, objectName string) error
	GetClusterInfo(ctx context.Context, opts interface{}) (ClusterInfo, error)
	GetDeploymentDetail(ctx context.Context, namespace, name string) (*appsv1.Deployment, error)
	GetServiceDetail(ctx context.Context, namespace, name string) (*corev1.Service, error)
	GetIngressDetail(ctx context.Context, namespace, name string) (*networkingv1.Ingress, error)
	GetPVCDetail(ctx context.Context, namespace, name string) (*corev1.PersistentVolumeClaim, error)
	GetPVDetail(ctx context.Context, name string) (*corev1.PersistentVolume, error)
	GetSecretDetail(ctx context.Context, namespace, name string) (*corev1.Secret, error)
	GetConfigMapDetail(ctx context.Context, namespace, name string) (*corev1.ConfigMap, error)
	GetNamespaceDetail(ctx context.Context, name string) (*corev1.Namespace, error)
	GetNodeDetail(ctx context.Context, name string) (*corev1.Node, error)
	GetDaemonSetDetail(ctx context.Context, namespace, name string) (*appsv1.DaemonSet, error)
	GetStatefulSetDetail(ctx context.Context, namespace, name string) (*appsv1.StatefulSet, error)
	GetJobDetail(ctx context.Context, namespace, name string) (*batchv1.Job, error)
	GetCronJobDetail(ctx context.Context, namespace, name string) (*batchv1.CronJob, error)
	GetRESTConfig() (*rest.Config, error)
	// Pod management methods
	GetPodLogs(ctx context.Context, namespace, name string, follow bool, lines *int64) (string, error)
	DeletePod(ctx context.Context, namespace, name string) error
	ApplyPod(ctx context.Context, pod *corev1.Pod) (*corev1.Pod, error)
	UpdatePod(ctx context.Context, namespace, name string, pod *corev1.Pod) (*corev1.Pod, error)

	// Deployment management methods
	DeleteDeployment(ctx context.Context, namespace, name string) error
	ApplyDeployment(ctx context.Context, deployment *appsv1.Deployment) (*appsv1.Deployment, error)
	UpdateDeployment(ctx context.Context, namespace, name string, deployment *appsv1.Deployment) (*appsv1.Deployment, error)

	// Service management methods
	DeleteService(ctx context.Context, namespace, name string) error
	ApplyService(ctx context.Context, service *corev1.Service) (*corev1.Service, error)
	UpdateService(ctx context.Context, namespace, name string, service *corev1.Service) (*corev1.Service, error)

	// Ingress management methods
	DeleteIngress(ctx context.Context, namespace, name string) error
	ApplyIngress(ctx context.Context, ingress *networkingv1.Ingress) (*networkingv1.Ingress, error)
	UpdateIngress(ctx context.Context, namespace, name string, ingress *networkingv1.Ingress) (*networkingv1.Ingress, error)

	// PVC management methods
	DeletePVC(ctx context.Context, namespace, name string) error
	ApplyPVC(ctx context.Context, pvc *corev1.PersistentVolumeClaim) (*corev1.PersistentVolumeClaim, error)
	UpdatePVC(ctx context.Context, namespace, name string, pvc *corev1.PersistentVolumeClaim) (*corev1.PersistentVolumeClaim, error)

	// PV management methods
	DeletePV(ctx context.Context, name string) error
	ApplyPV(ctx context.Context, pv *corev1.PersistentVolume) (*corev1.PersistentVolume, error)
	UpdatePV(ctx context.Context, name string, pv *corev1.PersistentVolume) (*corev1.PersistentVolume, error)

	// Secret management methods
	DeleteSecret(ctx context.Context, namespace, name string) error
	ApplySecret(ctx context.Context, secret *corev1.Secret) (*corev1.Secret, error)
	UpdateSecret(ctx context.Context, namespace, name string, secret *corev1.Secret) (*corev1.Secret, error)

	// ConfigMap management methods
	DeleteConfigMap(ctx context.Context, namespace, name string) error
	ApplyConfigMap(ctx context.Context, configmap *corev1.ConfigMap) (*corev1.ConfigMap, error)
	UpdateConfigMap(ctx context.Context, namespace, name string, configmap *corev1.ConfigMap) (*corev1.ConfigMap, error)

	// Namespace management methods
	DeleteNamespace(ctx context.Context, name string) error
	ApplyNamespace(ctx context.Context, namespace *corev1.Namespace) (*corev1.Namespace, error)
	UpdateNamespace(ctx context.Context, name string, namespace *corev1.Namespace) (*corev1.Namespace, error)

	// DaemonSet management methods
	DeleteDaemonSet(ctx context.Context, namespace, name string) error
	ApplyDaemonSet(ctx context.Context, daemonset *appsv1.DaemonSet) (*appsv1.DaemonSet, error)
	UpdateDaemonSet(ctx context.Context, namespace, name string, daemonset *appsv1.DaemonSet) (*appsv1.DaemonSet, error)

	// StatefulSet management methods
	DeleteStatefulSet(ctx context.Context, namespace, name string) error
	ApplyStatefulSet(ctx context.Context, statefulset *appsv1.StatefulSet) (*appsv1.StatefulSet, error)
	UpdateStatefulSet(ctx context.Context, namespace, name string, statefulset *appsv1.StatefulSet) (*appsv1.StatefulSet, error)

	// Job management methods
	DeleteJob(ctx context.Context, namespace, name string) error
	ApplyJob(ctx context.Context, job *batchv1.Job) (*batchv1.Job, error)
	UpdateJob(ctx context.Context, namespace, name string, job *batchv1.Job) (*batchv1.Job, error)

	// CronJob management methods
	DeleteCronJob(ctx context.Context, namespace, name string) error
	ApplyCronJob(ctx context.Context, cronjob *batchv1.CronJob) (*batchv1.CronJob, error)
	UpdateCronJob(ctx context.Context, namespace, name string, cronjob *batchv1.CronJob) (*batchv1.CronJob, error)

	// IngressClass methods
	ListIngressClasses(ctx context.Context, opts interface{}) ([]IngressClassInfo, error)
	GetIngressClassDetail(ctx context.Context, name string) (*networkingv1.IngressClass, error)
	DeleteIngressClass(ctx context.Context, name string) error
	ApplyIngressClass(ctx context.Context, ingressClass *networkingv1.IngressClass) (*networkingv1.IngressClass, error)
	UpdateIngressClass(ctx context.Context, name string, ingressClass *networkingv1.IngressClass) (*networkingv1.IngressClass, error)

	// NetworkPolicy methods
	ListNetworkPolicies(ctx context.Context, opts interface{}) ([]NetworkPolicyInfo, error)
	GetNetworkPolicyDetail(ctx context.Context, namespace, name string) (*networkingv1.NetworkPolicy, error)
	DeleteNetworkPolicy(ctx context.Context, namespace, name string) error
	ApplyNetworkPolicy(ctx context.Context, policy *networkingv1.NetworkPolicy) (*networkingv1.NetworkPolicy, error)
	UpdateNetworkPolicy(ctx context.Context, namespace, name string, policy *networkingv1.NetworkPolicy) (*networkingv1.NetworkPolicy, error)

// Node operation methods
CordonNode(ctx context.Context, nodeName string) error
UncordonNode(ctx context.Context, nodeName string) error
DrainNode(ctx context.Context, nodeName string, options DrainNodeOptions) error
}
