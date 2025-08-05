package kubernetes

import (
	"time"
)

// ClusterInfo represents Kubernetes cluster information
type ClusterInfo struct {
	Version      string `json:"version"`
	Platform     string `json:"platform"`
	IsControlPlane bool `json:"isControlPlane"`
	NodeName     string `json:"nodeName"`
	NodeRole     string `json:"nodeRole"`
}

// ResourceList represents a generic list of Kubernetes resources
type ResourceList struct {
	Kind       string      `json:"kind"`
	APIVersion string      `json:"apiVersion"`
	Namespace  string      `json:"namespace,omitempty"`
	Items      interface{} `json:"items"`
	Count      int         `json:"count"`
}

// PodInfo represents simplified pod information
type PodInfo struct {
	Name              string            `json:"name"`
	Namespace         string            `json:"namespace"`
	Status            string            `json:"status"`
	Ready             string            `json:"ready"`
	Restarts          int32             `json:"restarts"`
	Age               string            `json:"age"`
	IP                string            `json:"ip"`
	Node              string            `json:"node"`
	Labels            map[string]string `json:"labels"`
	CreationTimestamp time.Time         `json:"creationTimestamp"`
}

// ContainerInfo represents container information within a pod
type ContainerInfo struct {
	Name         string `json:"name"`
	Image        string `json:"image"`
	Ready        bool   `json:"ready"`
	RestartCount int32  `json:"restartCount"`
	State        string `json:"state"`
	StateReason  string `json:"stateReason,omitempty"`
}

// PodCondition represents a pod condition
type PodCondition struct {
	Type               string    `json:"type"`
	Status             string    `json:"status"`
	LastProbeTime      time.Time `json:"lastProbeTime,omitempty"`
	LastTransitionTime time.Time `json:"lastTransitionTime,omitempty"`
	Reason             string    `json:"reason,omitempty"`
	Message            string    `json:"message,omitempty"`
}

// PodDetail represents detailed pod information
type PodDetail struct {
	Name              string                 `json:"name"`
	Namespace         string                 `json:"namespace"`
	UID               string                 `json:"uid"`
	ResourceVersion   string                 `json:"resourceVersion"`
	Labels            map[string]string      `json:"labels"`
	Annotations       map[string]string      `json:"annotations"`
	Status            string                 `json:"status"`
	Phase             string                 `json:"phase"`
	IP                string                 `json:"ip"`
	HostIP            string                 `json:"hostIP"`
	Node              string                 `json:"node"`
	ServiceAccount    string                 `json:"serviceAccount"`
	RestartPolicy     string                 `json:"restartPolicy"`
	DNSPolicy         string                 `json:"dnsPolicy"`
	NodeSelector      map[string]string      `json:"nodeSelector,omitempty"`
	Tolerations       []map[string]interface{} `json:"tolerations,omitempty"`
	Containers        []ContainerInfo        `json:"containers"`
	InitContainers    []ContainerInfo        `json:"initContainers,omitempty"`
	Conditions        []PodCondition         `json:"conditions"`
	QOSClass          string                 `json:"qosClass"`
	StartTime         *time.Time             `json:"startTime,omitempty"`
	CreationTimestamp time.Time              `json:"creationTimestamp"`
	Age               string                 `json:"age"`
}

// DeploymentInfo represents simplified deployment information
type DeploymentInfo struct {
	Name              string            `json:"name"`
	Namespace         string            `json:"namespace"`
	Ready             string            `json:"ready"`
	UpToDate          int32             `json:"upToDate"`
	Available         int32             `json:"available"`
	Age               string            `json:"age"`
	Labels            map[string]string `json:"labels"`
	CreationTimestamp time.Time         `json:"creationTimestamp"`
}

// ServiceInfo represents simplified service information
type ServiceInfo struct {
	Name              string            `json:"name"`
	Namespace         string            `json:"namespace"`
	Type              string            `json:"type"`
	ClusterIP         string            `json:"clusterIP"`
	ExternalIP        string            `json:"externalIP"`
	Ports             string            `json:"ports"`
	Age               string            `json:"age"`
	Labels            map[string]string `json:"labels"`
	CreationTimestamp time.Time         `json:"creationTimestamp"`
}

// IngressInfo represents simplified ingress information
type IngressInfo struct {
	Name              string            `json:"name"`
	Namespace         string            `json:"namespace"`
	Hosts             []string          `json:"hosts"`
	Address           string            `json:"address"`
	Ports             string            `json:"ports"`
	Age               string            `json:"age"`
	Labels            map[string]string `json:"labels"`
	CreationTimestamp time.Time         `json:"creationTimestamp"`
}

// PVCInfo represents simplified PVC information
type PVCInfo struct {
	Name              string            `json:"name"`
	Namespace         string            `json:"namespace"`
	Status            string            `json:"status"`
	Volume            string            `json:"volume"`
	Capacity          string            `json:"capacity"`
	AccessModes       string            `json:"accessModes"`
	StorageClass      string            `json:"storageClass"`
	Age               string            `json:"age"`
	Labels            map[string]string `json:"labels"`
	CreationTimestamp time.Time         `json:"creationTimestamp"`
}

// PVInfo represents simplified PV information
type PVInfo struct {
	Name              string            `json:"name"`
	Capacity          string            `json:"capacity"`
	AccessModes       string            `json:"accessModes"`
	ReclaimPolicy     string            `json:"reclaimPolicy"`
	Status            string            `json:"status"`
	Claim             string            `json:"claim"`
	StorageClass      string            `json:"storageClass"`
	Reason            string            `json:"reason"`
	Age               string            `json:"age"`
	Labels            map[string]string `json:"labels"`
	CreationTimestamp time.Time         `json:"creationTimestamp"`
}

// SecretInfo represents simplified secret information
type SecretInfo struct {
	Name              string            `json:"name"`
	Namespace         string            `json:"namespace"`
	Type              string            `json:"type"`
	Data              int               `json:"data"`
	Age               string            `json:"age"`
	Labels            map[string]string `json:"labels"`
	CreationTimestamp time.Time         `json:"creationTimestamp"`
}

// ConfigMapInfo represents simplified configmap information
type ConfigMapInfo struct {
	Name              string            `json:"name"`
	Namespace         string            `json:"namespace"`
	Data              int               `json:"data"`
	Age               string            `json:"age"`
	Labels            map[string]string `json:"labels"`
	CreationTimestamp time.Time         `json:"creationTimestamp"`
}

// NamespaceInfo represents simplified namespace information
type NamespaceInfo struct {
	Name              string            `json:"name"`
	Status            string            `json:"status"`
	Age               string            `json:"age"`
	Labels            map[string]string `json:"labels"`
	CreationTimestamp time.Time         `json:"creationTimestamp"`
}

// NodeInfo represents simplified node information
type NodeInfo struct {
	Name              string            `json:"name"`
	Status            string            `json:"status"`
	Roles             string            `json:"roles"`
	Age               string            `json:"age"`
	Version           string            `json:"version"`
	InternalIP        string            `json:"internalIP"`
	ExternalIP        string            `json:"externalIP"`
	OS                string            `json:"os"`
	KernelVersion     string            `json:"kernelVersion"`
	ContainerRuntime  string            `json:"containerRuntime"`
	Labels            map[string]string `json:"labels"`
	CreationTimestamp time.Time         `json:"creationTimestamp"`
}

// DaemonSetInfo represents simplified daemonset information
type DaemonSetInfo struct {
	Name              string            `json:"name"`
	Namespace         string            `json:"namespace"`
	Desired           int32             `json:"desired"`
	Current           int32             `json:"current"`
	Ready             int32             `json:"ready"`
	UpToDate          int32             `json:"upToDate"`
	Available         int32             `json:"available"`
	Age               string            `json:"age"`
	Labels            map[string]string `json:"labels"`
	CreationTimestamp time.Time         `json:"creationTimestamp"`
}

// StatefulSetInfo represents simplified statefulset information
type StatefulSetInfo struct {
	Name              string            `json:"name"`
	Namespace         string            `json:"namespace"`
	Ready             string            `json:"ready"`
	Age               string            `json:"age"`
	Labels            map[string]string `json:"labels"`
	CreationTimestamp time.Time         `json:"creationTimestamp"`
}

// JobInfo represents simplified job information
type JobInfo struct {
	Name              string            `json:"name"`
	Namespace         string            `json:"namespace"`
	Completions       string            `json:"completions"`
	Duration          string            `json:"duration"`
	Age               string            `json:"age"`
	Labels            map[string]string `json:"labels"`
	CreationTimestamp time.Time         `json:"creationTimestamp"`
}

// CronJobInfo represents simplified cronjob information
type CronJobInfo struct {
	Name              string            `json:"name"`
	Namespace         string            `json:"namespace"`
	Schedule          string            `json:"schedule"`
	Suspend           bool              `json:"suspend"`
	Active            int               `json:"active"`
	LastSchedule      string            `json:"lastSchedule"`
	Age               string            `json:"age"`
	Labels            map[string]string `json:"labels"`
	CreationTimestamp time.Time         `json:"creationTimestamp"`
}
