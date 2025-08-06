package kubernetes

import (
	"context"

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
	GetCRDDetail(ctx context.Context, name string) (CRDInfo, error)
	ListCRDObjects(ctx context.Context, crdName, namespace string) ([]CRDObject, error)
	GetCRDObjectDetail(ctx context.Context, crdName, objectName, namespace string) (CRDObjectDetail, error)
	GetPodDetail(ctx context.Context, namespace, name string) (PodDetail, error)
	GetClusterInfo(ctx context.Context, opts interface{}) (ClusterInfo, error)
	GetDeploymentDetail(ctx context.Context, namespace, name string) (DeploymentDetail, error)
	GetServiceDetail(ctx context.Context, namespace, name string) (ServiceInfo, error)
	GetIngressDetail(ctx context.Context, namespace, name string) (IngressInfo, error)
	GetPVCDetail(ctx context.Context, namespace, name string) (PVCInfo, error)
	GetPVDetail(ctx context.Context, name string) (PVInfo, error)
	GetSecretDetail(ctx context.Context, namespace, name string) (SecretInfo, error)
	GetConfigMapDetail(ctx context.Context, namespace, name string) (ConfigMapInfo, error)
	GetNamespaceDetail(ctx context.Context, name string) (NamespaceInfo, error)
	GetNodeDetail(ctx context.Context, name string) (NodeInfo, error)
	GetDaemonSetDetail(ctx context.Context, namespace, name string) (DaemonSetInfo, error)
	GetStatefulSetDetail(ctx context.Context, namespace, name string) (StatefulSetInfo, error)
	GetJobDetail(ctx context.Context, namespace, name string) (JobInfo, error)
	GetCronJobDetail(ctx context.Context, namespace, name string) (CronJobInfo, error)
	GetRESTConfig() (*rest.Config, error)
}
