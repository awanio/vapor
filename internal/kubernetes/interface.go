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
	GetClusterInfo(ctx context.Context, opts interface{}) (ClusterInfo, error)
	GetRESTConfig() (*rest.Config, error)
}
