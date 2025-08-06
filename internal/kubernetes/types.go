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

// DeploymentCondition represents a deployment condition
type DeploymentCondition struct {
	Type               string    `json:"type"`
	Status             string    `json:"status"`
	LastUpdateTime     time.Time `json:"lastUpdateTime,omitempty"`
	LastTransitionTime time.Time `json:"lastTransitionTime,omitempty"`
	Reason             string    `json:"reason,omitempty"`
	Message            string    `json:"message,omitempty"`
}

// ContainerPort represents a network port in a container
type ContainerPort struct {
	Name          string `json:"name,omitempty"`
	HostPort      int32  `json:"hostPort,omitempty"`
	ContainerPort int32  `json:"containerPort"`
	Protocol      string `json:"protocol,omitempty"`
	HostIP        string `json:"hostIP,omitempty"`
}

// EnvironmentVariable represents an environment variable
type EnvironmentVariable struct {
	Name      string      `json:"name"`
	Value     string      `json:"value,omitempty"`
	ValueFrom interface{} `json:"valueFrom,omitempty"`
}

// VolumeMount represents a mounting of a Volume within a container
type VolumeMount struct {
	Name             string `json:"name"`
	ReadOnly         bool   `json:"readOnly,omitempty"`
	MountPath        string `json:"mountPath"`
	MountPropagation string `json:"mountPropagation,omitempty"`
	SubPath          string `json:"subPath,omitempty"`
	SubPathExpr      string `json:"subPathExpr,omitempty"`
}

// ResourceRequirements describes the compute resource requirements
type ResourceRequirements struct {
	Limits   map[string]string `json:"limits,omitempty"`
	Requests map[string]string `json:"requests,omitempty"`
}

// ContainerSpec represents a container specification in a deployment
type ContainerSpec struct {
	Name                     string                `json:"name"`
	Image                    string                `json:"image"`
	Command                  []string              `json:"command,omitempty"`
	Args                     []string              `json:"args,omitempty"`
	WorkingDir               string                `json:"workingDir,omitempty"`
	Ports                    []ContainerPort       `json:"ports,omitempty"`
	Env                      []EnvironmentVariable `json:"env,omitempty"`
	Resources                ResourceRequirements  `json:"resources,omitempty"`
	VolumeMounts             []VolumeMount         `json:"volumeMounts,omitempty"`
	LivenessProbe            interface{}           `json:"livenessProbe,omitempty"`
	ReadinessProbe           interface{}           `json:"readinessProbe,omitempty"`
	StartupProbe             interface{}           `json:"startupProbe,omitempty"`
	ImagePullPolicy          string                `json:"imagePullPolicy,omitempty"`
	SecurityContext          interface{}           `json:"securityContext,omitempty"`
	TerminationMessagePath   string                `json:"terminationMessagePath,omitempty"`
	TerminationMessagePolicy string                `json:"terminationMessagePolicy,omitempty"`
}

// DeploymentStrategy describes how to replace existing pods with new ones
type DeploymentStrategy struct {
	Type          string      `json:"type,omitempty"`
	RollingUpdate interface{} `json:"rollingUpdate,omitempty"`
}

// LabelSelector represents a label selector
type LabelSelector struct {
	MatchLabels      map[string]string          `json:"matchLabels,omitempty"`
	MatchExpressions []map[string]interface{}   `json:"matchExpressions,omitempty"`
}

// PodTemplateSpec describes the pod that will be created
type PodTemplateSpec struct {
	Metadata struct {
		Labels      map[string]string `json:"labels,omitempty"`
		Annotations map[string]string `json:"annotations,omitempty"`
	} `json:"metadata,omitempty"`
	Spec struct {
		Containers                    []ContainerSpec          `json:"containers"`
		InitContainers                []ContainerSpec          `json:"initContainers,omitempty"`
		Volumes                       []interface{}            `json:"volumes,omitempty"`
		ServiceAccountName            string                   `json:"serviceAccountName,omitempty"`
		SecurityContext               interface{}              `json:"securityContext,omitempty"`
		ImagePullSecrets              []map[string]string      `json:"imagePullSecrets,omitempty"`
		Hostname                      string                   `json:"hostname,omitempty"`
		Subdomain                     string                   `json:"subdomain,omitempty"`
		Affinity                      interface{}              `json:"affinity,omitempty"`
		SchedulerName                 string                   `json:"schedulerName,omitempty"`
		Tolerations                   []map[string]interface{} `json:"tolerations,omitempty"`
		HostAliases                   []interface{}            `json:"hostAliases,omitempty"`
		PriorityClassName             string                   `json:"priorityClassName,omitempty"`
		Priority                      *int32                   `json:"priority,omitempty"`
		DNSConfig                     interface{}              `json:"dnsConfig,omitempty"`
		DNSPolicy                     string                   `json:"dnsPolicy,omitempty"`
		RestartPolicy                 string                   `json:"restartPolicy,omitempty"`
		NodeSelector                  map[string]string        `json:"nodeSelector,omitempty"`
		NodeName                      string                   `json:"nodeName,omitempty"`
		HostNetwork                   bool                     `json:"hostNetwork,omitempty"`
		HostPID                       bool                     `json:"hostPID,omitempty"`
		HostIPC                       bool                     `json:"hostIPC,omitempty"`
		ShareProcessNamespace         *bool                    `json:"shareProcessNamespace,omitempty"`
		TerminationGracePeriodSeconds *int64                   `json:"terminationGracePeriodSeconds,omitempty"`
		ActiveDeadlineSeconds         *int64                   `json:"activeDeadlineSeconds,omitempty"`
		ReadinessGates                []interface{}            `json:"readinessGates,omitempty"`
		RuntimeClassName              *string                  `json:"runtimeClassName,omitempty"`
		EnableServiceLinks            *bool                    `json:"enableServiceLinks,omitempty"`
		PreemptionPolicy              *string                  `json:"preemptionPolicy,omitempty"`
		Overhead                      map[string]string        `json:"overhead,omitempty"`
		TopologySpreadConstraints     []interface{}            `json:"topologySpreadConstraints,omitempty"`
	} `json:"spec,omitempty"`
}

// DeploymentSpec represents the specification of a deployment
type DeploymentSpec struct {
	Replicas                *int32             `json:"replicas,omitempty"`
	Selector                LabelSelector      `json:"selector"`
	Template                PodTemplateSpec    `json:"template"`
	Strategy                DeploymentStrategy `json:"strategy,omitempty"`
	MinReadySeconds         int32              `json:"minReadySeconds,omitempty"`
	RevisionHistoryLimit    *int32             `json:"revisionHistoryLimit,omitempty"`
	Paused                  bool               `json:"paused,omitempty"`
	ProgressDeadlineSeconds *int32             `json:"progressDeadlineSeconds,omitempty"`
}

// DeploymentStatus represents the current status of a deployment
type DeploymentStatus struct {
	ObservedGeneration  int64                 `json:"observedGeneration,omitempty"`
	Replicas            int32                 `json:"replicas,omitempty"`
	UpdatedReplicas     int32                 `json:"updatedReplicas,omitempty"`
	ReadyReplicas       int32                 `json:"readyReplicas,omitempty"`
	AvailableReplicas   int32                 `json:"availableReplicas,omitempty"`
	UnavailableReplicas int32                 `json:"unavailableReplicas,omitempty"`
	Conditions          []DeploymentCondition `json:"conditions,omitempty"`
	CollisionCount      *int32                `json:"collisionCount,omitempty"`
}

// DeploymentDetail represents comprehensive deployment information
type DeploymentDetail struct {
	Name              string               `json:"name"`
	Namespace         string               `json:"namespace"`
	UID               string               `json:"uid"`
	ResourceVersion   string               `json:"resourceVersion"`
	Generation        int64                `json:"generation"`
	CreationTimestamp time.Time            `json:"creationTimestamp"`
	Labels            map[string]string    `json:"labels,omitempty"`
	Annotations       map[string]string    `json:"annotations,omitempty"`
	Spec              DeploymentSpec       `json:"spec"`
	Status            DeploymentStatus     `json:"status"`
	Age               string               `json:"age"`
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

// StatefulSetSpec represents the specification of a statefulset
type StatefulSetSpec struct {
	Replicas             *int32                        `json:"replicas,omitempty"`
	Selector             LabelSelector                 `json:"selector"`
	Template             PodTemplateSpec               `json:"template"`
	ServiceName          string                        `json:"serviceName"`
	PodManagementPolicy  string                        `json:"podManagementPolicy,omitempty"`
	UpdateStrategy       StatefulSetUpdateStrategy     `json:"updateStrategy,omitempty"`
	RevisionHistoryLimit *int32                        `json:"revisionHistoryLimit,omitempty"`
	MinReadySeconds      int32                         `json:"minReadySeconds,omitempty"`
	PersistentVolumeClaimRetentionPolicy *PVCRetentionPolicy `json:"persistentVolumeClaimRetentionPolicy,omitempty"`
	Ordinals             *StatefulSetOrdinals          `json:"ordinals,omitempty"`
}

// StatefulSetUpdateStrategy describes the strategy for updating pods in a StatefulSet
type StatefulSetUpdateStrategy struct {
	Type          string                        `json:"type,omitempty"`
	RollingUpdate *RollingUpdateStatefulSetStrategy `json:"rollingUpdate,omitempty"`
}

// RollingUpdateStatefulSetStrategy is used to control the rolling update of a statefulset
type RollingUpdateStatefulSetStrategy struct {
	Partition       *int32 `json:"partition,omitempty"`
	MaxUnavailable  string `json:"maxUnavailable,omitempty"`
}

// PVCRetentionPolicy describes the policy for retaining/deleting persistent volume claims
type PVCRetentionPolicy struct {
	WhenDeleted string `json:"whenDeleted,omitempty"`
	WhenScaled  string `json:"whenScaled,omitempty"`
}

// StatefulSetOrdinals describes the ordinals to be assigned to StatefulSet replicas
type StatefulSetOrdinals struct {
	Start int32 `json:"start,omitempty"`
}

// StatefulSetStatus represents the current status of a statefulset
type StatefulSetStatus struct {
	ObservedGeneration   int64                          `json:"observedGeneration,omitempty"`
	Replicas             int32                          `json:"replicas"`
	ReadyReplicas        int32                          `json:"readyReplicas,omitempty"`
	CurrentReplicas      int32                          `json:"currentReplicas,omitempty"`
	UpdatedReplicas      int32                          `json:"updatedReplicas,omitempty"`
	CurrentRevision      string                         `json:"currentRevision,omitempty"`
	UpdateRevision       string                         `json:"updateRevision,omitempty"`
	CollisionCount       *int32                         `json:"collisionCount,omitempty"`
	Conditions           []StatefulSetCondition         `json:"conditions,omitempty"`
	AvailableReplicas    int32                          `json:"availableReplicas,omitempty"`
}

// StatefulSetCondition describes the state of a statefulset at a certain point
type StatefulSetCondition struct {
	Type               string    `json:"type"`
	Status             string    `json:"status"`
	LastTransitionTime time.Time `json:"lastTransitionTime,omitempty"`
	Reason             string    `json:"reason,omitempty"`
	Message            string    `json:"message,omitempty"`
}

// VolumeClaimTemplate is used to produce PersistentVolumeClaim objects as part of a StatefulSet
type VolumeClaimTemplate struct {
	Metadata struct {
		Name        string            `json:"name,omitempty"`
		Labels      map[string]string `json:"labels,omitempty"`
		Annotations map[string]string `json:"annotations,omitempty"`
	} `json:"metadata,omitempty"`
	Spec struct {
		AccessModes []string               `json:"accessModes,omitempty"`
		StorageClassName *string         `json:"storageClassName,omitempty"`
		Resources   struct {
			Requests map[string]string `json:"requests,omitempty"`
		} `json:"resources,omitempty"`
	} `json:"spec,omitempty"`
}

// StatefulSetDetail represents comprehensive statefulset information
type StatefulSetDetail struct {
	Name                    string                 `json:"name"`
	Namespace               string                 `json:"namespace"`
	UID                     string                 `json:"uid"`
	ResourceVersion         string                 `json:"resourceVersion"`
	Generation              int64                  `json:"generation"`
	CreationTimestamp       time.Time              `json:"creationTimestamp"`
	Labels                  map[string]string      `json:"labels,omitempty"`
	Annotations             map[string]string      `json:"annotations,omitempty"`
	Spec                    StatefulSetSpec        `json:"spec"`
	Status                  StatefulSetStatus      `json:"status"`
	Age                     string                 `json:"age"`
	VolumeClaimTemplates    []VolumeClaimTemplate  `json:"volumeClaimTemplates,omitempty"`
}

// CRDInfo represents simplified Custom Resource Definition information
type CRDInfo struct {
	Name              string            `json:"name"`
	Group             string            `json:"group"`
	Version           string            `json:"version"`
	Kind              string            `json:"kind"`
	Scope             string            `json:"scope"`
	Names             []string          `json:"names"`
	Age               string            `json:"age"`
	Labels            map[string]string `json:"labels"`
	CreationTimestamp time.Time         `json:"creationTimestamp"`
}

// CRDObject represents a custom resource object instance
type CRDObject struct {
	Name              string            `json:"name"`
	Namespace         string            `json:"namespace,omitempty"`
	Kind              string            `json:"kind"`
	APIVersion        string            `json:"apiVersion"`
	CreationTimestamp time.Time         `json:"creationTimestamp"`
	Labels            map[string]string `json:"labels,omitempty"`
	Annotations       map[string]string `json:"annotations,omitempty"`
}

// CRDObjectDetail represents detailed information about a custom resource object
type CRDObjectDetail struct {
	CRDObject
	Raw interface{} `json:"raw"` // Full Kubernetes object data
}
