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
	ListCRDObjects(ctx context.Context, crdName, namespace string) ([]CRDObject, error)
	GetCRDObjectDetail(ctx context.Context, crdName, objectName, namespace string) (*unstructured.Unstructured, error)
	GetPodDetail(ctx context.Context, namespace, name string) (*corev1.Pod, error)
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
}
