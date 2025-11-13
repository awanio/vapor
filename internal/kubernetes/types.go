package kubernetes

import (
	"time"
)

// ClusterInfo represents Kubernetes cluster information
type ClusterInfo struct {
	Version        string `json:"version"`
	Platform       string `json:"platform"`
	IsControlPlane bool   `json:"isControlPlane"`
	NodeName       string `json:"nodeName"`
	NodeRole       string `json:"nodeRole"`
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
	APIVersion        string            `json:"apiVersion"`
	Kind              string            `json:"kind"`
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
	Name              string                   `json:"name"`
	Namespace         string                   `json:"namespace"`
	UID               string                   `json:"uid"`
	ResourceVersion   string                   `json:"resourceVersion"`
	Labels            map[string]string        `json:"labels"`
	Annotations       map[string]string        `json:"annotations"`
	Status            string                   `json:"status"`
	Phase             string                   `json:"phase"`
	IP                string                   `json:"ip"`
	HostIP            string                   `json:"hostIP"`
	Node              string                   `json:"node"`
	ServiceAccount    string                   `json:"serviceAccount"`
	RestartPolicy     string                   `json:"restartPolicy"`
	DNSPolicy         string                   `json:"dnsPolicy"`
	NodeSelector      map[string]string        `json:"nodeSelector,omitempty"`
	Tolerations       []map[string]interface{} `json:"tolerations,omitempty"`
	Containers        []ContainerInfo          `json:"containers"`
	InitContainers    []ContainerInfo          `json:"initContainers,omitempty"`
	Conditions        []PodCondition           `json:"conditions"`
	QOSClass          string                   `json:"qosClass"`
	StartTime         *time.Time               `json:"startTime,omitempty"`
	CreationTimestamp time.Time                `json:"creationTimestamp"`
	Age               string                   `json:"age"`
}

// DeploymentInfo represents simplified deployment information
type DeploymentInfo struct {
	APIVersion        string            `json:"apiVersion"`
	Kind              string            `json:"kind"`
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
	MatchLabels      map[string]string        `json:"matchLabels,omitempty"`
	MatchExpressions []map[string]interface{} `json:"matchExpressions,omitempty"`
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
	Name              string            `json:"name"`
	Namespace         string            `json:"namespace"`
	UID               string            `json:"uid"`
	ResourceVersion   string            `json:"resourceVersion"`
	Generation        int64             `json:"generation"`
	CreationTimestamp time.Time         `json:"creationTimestamp"`
	Labels            map[string]string `json:"labels,omitempty"`
	Annotations       map[string]string `json:"annotations,omitempty"`
	Spec              DeploymentSpec    `json:"spec"`
	Status            DeploymentStatus  `json:"status"`
	Age               string            `json:"age"`
}

// ServiceInfo represents simplified service information
type ServiceInfo struct {
	APIVersion        string            `json:"apiVersion"`
	Kind              string            `json:"kind"`
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
	APIVersion        string            `json:"apiVersion"`
	Kind              string            `json:"kind"`
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
	APIVersion        string            `json:"apiVersion"`
	Kind              string            `json:"kind"`
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
	APIVersion        string            `json:"apiVersion"`
	Kind              string            `json:"kind"`
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
	APIVersion        string            `json:"apiVersion"`
	Kind              string            `json:"kind"`
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
	APIVersion        string            `json:"apiVersion"`
	Kind              string            `json:"kind"`
	Name              string            `json:"name"`
	Namespace         string            `json:"namespace"`
	Data              int               `json:"data"`
	Age               string            `json:"age"`
	Labels            map[string]string `json:"labels"`
	CreationTimestamp time.Time         `json:"creationTimestamp"`
}

// NamespaceInfo represents simplified namespace information
type NamespaceInfo struct {
	APIVersion        string            `json:"apiVersion"`
	Kind              string            `json:"kind"`
	Name              string            `json:"name"`
	Status            string            `json:"status"`
	Age               string            `json:"age"`
	Labels            map[string]string `json:"labels"`
	CreationTimestamp time.Time         `json:"creationTimestamp"`
}

// NodeInfo represents simplified node information
type NodeInfo struct {
	APIVersion        string            `json:"apiVersion"`
	Kind              string            `json:"kind"`
	Name              string            `json:"name"`
	Status            string            `json:"status"`
	Roles             string            `json:"roles"`
	Age               string            `json:"age"`
	Version           string            `json:"version"`
	ResourceKind      string            `json:"resourceKind"`
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
	APIVersion        string            `json:"apiVersion"`
	Kind              string            `json:"kind"`
	Name              string            `json:"name"`
	Namespace         string            `json:"namespace"`
	Desired           int32             `json:"desired"`
	Current           int32             `json:"current"`
	Ready             int32             `json:"ready"`
	UpToDate          int32             `json:"upToDate"`
	Available         int32             `json:"available"`
	Age               string            `json:"age"`
	Labels            map[string]string `json:"labels"`
	NodeSelector      map[string]string `json:"nodeSelector,omitempty"`
	CreationTimestamp time.Time         `json:"creationTimestamp"`
}

// StatefulSetInfo represents simplified statefulset information
type StatefulSetInfo struct {
	APIVersion        string            `json:"apiVersion"`
	Kind              string            `json:"kind"`
	Name              string            `json:"name"`
	Namespace         string            `json:"namespace"`
	Ready             string            `json:"ready"`
	Age               string            `json:"age"`
	Labels            map[string]string `json:"labels"`
	CreationTimestamp time.Time         `json:"creationTimestamp"`
}

// JobInfo represents simplified job information
type JobInfo struct {
	APIVersion        string            `json:"apiVersion"`
	Kind              string            `json:"kind"`
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
	APIVersion        string            `json:"apiVersion"`
	Kind              string            `json:"kind"`
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
	Replicas                             *int32                    `json:"replicas,omitempty"`
	Selector                             LabelSelector             `json:"selector"`
	Template                             PodTemplateSpec           `json:"template"`
	ServiceName                          string                    `json:"serviceName"`
	PodManagementPolicy                  string                    `json:"podManagementPolicy,omitempty"`
	UpdateStrategy                       StatefulSetUpdateStrategy `json:"updateStrategy,omitempty"`
	RevisionHistoryLimit                 *int32                    `json:"revisionHistoryLimit,omitempty"`
	MinReadySeconds                      int32                     `json:"minReadySeconds,omitempty"`
	PersistentVolumeClaimRetentionPolicy *PVCRetentionPolicy       `json:"persistentVolumeClaimRetentionPolicy,omitempty"`
	Ordinals                             *StatefulSetOrdinals      `json:"ordinals,omitempty"`
}

// StatefulSetUpdateStrategy describes the strategy for updating pods in a StatefulSet
type StatefulSetUpdateStrategy struct {
	Type          string                            `json:"type,omitempty"`
	RollingUpdate *RollingUpdateStatefulSetStrategy `json:"rollingUpdate,omitempty"`
}

// RollingUpdateStatefulSetStrategy is used to control the rolling update of a statefulset
type RollingUpdateStatefulSetStrategy struct {
	Partition      *int32 `json:"partition,omitempty"`
	MaxUnavailable string `json:"maxUnavailable,omitempty"`
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
	ObservedGeneration int64                  `json:"observedGeneration,omitempty"`
	Replicas           int32                  `json:"replicas"`
	ReadyReplicas      int32                  `json:"readyReplicas,omitempty"`
	CurrentReplicas    int32                  `json:"currentReplicas,omitempty"`
	UpdatedReplicas    int32                  `json:"updatedReplicas,omitempty"`
	CurrentRevision    string                 `json:"currentRevision,omitempty"`
	UpdateRevision     string                 `json:"updateRevision,omitempty"`
	CollisionCount     *int32                 `json:"collisionCount,omitempty"`
	Conditions         []StatefulSetCondition `json:"conditions,omitempty"`
	AvailableReplicas  int32                  `json:"availableReplicas,omitempty"`
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
		AccessModes      []string `json:"accessModes,omitempty"`
		StorageClassName *string  `json:"storageClassName,omitempty"`
		Resources        struct {
			Requests map[string]string `json:"requests,omitempty"`
		} `json:"resources,omitempty"`
	} `json:"spec,omitempty"`
}

// StatefulSetDetail represents comprehensive statefulset information
type StatefulSetDetail struct {
	Name                 string                `json:"name"`
	Namespace            string                `json:"namespace"`
	UID                  string                `json:"uid"`
	ResourceVersion      string                `json:"resourceVersion"`
	Generation           int64                 `json:"generation"`
	CreationTimestamp    time.Time             `json:"creationTimestamp"`
	Labels               map[string]string     `json:"labels,omitempty"`
	Annotations          map[string]string     `json:"annotations,omitempty"`
	Spec                 StatefulSetSpec       `json:"spec"`
	Status               StatefulSetStatus     `json:"status"`
	Age                  string                `json:"age"`
	VolumeClaimTemplates []VolumeClaimTemplate `json:"volumeClaimTemplates,omitempty"`
}

// CRDInfo represents simplified Custom Resource Definition information
type CRDInfo struct {
	APIVersion        string            `json:"apiVersion"`
	Kind              string            `json:"kind"`
	Name              string            `json:"name"`
	Group             string            `json:"group"`
	Version           string            `json:"version"`
	ResourceKind      string            `json:"resourceKind"`
	Scope             string            `json:"scope"`
	Names             []string          `json:"names"`
	Age               string            `json:"age"`
	Labels            map[string]string `json:"labels"`
	CreationTimestamp time.Time         `json:"creationTimestamp"`
}

// IngressClassInfo represents simplified ingress class information
type IngressClassInfo struct {
	APIVersion        string            `json:"apiVersion"`
	Kind              string            `json:"kind"`
	Name              string            `json:"name"`
	Controller        string            `json:"controller"`
	IsDefault         bool              `json:"isDefault"`
	Age               string            `json:"age"`
	Labels            map[string]string `json:"labels"`
	CreationTimestamp time.Time         `json:"creationTimestamp"`
}

// NetworkPolicyInfo represents simplified network policy information
type NetworkPolicyInfo struct {
	APIVersion        string            `json:"apiVersion"`
	Kind              string            `json:"kind"`
	Name              string            `json:"name"`
	Namespace         string            `json:"namespace"`
	PodSelector       string            `json:"podSelector"`
	PolicyTypes       []string          `json:"policyTypes"`
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

// ServicePort represents a network port in a service
type ServicePort struct {
	Name       string `json:"name,omitempty"`
	Protocol   string `json:"protocol,omitempty"`
	Port       int32  `json:"port"`
	TargetPort string `json:"targetPort,omitempty"`
	NodePort   int32  `json:"nodePort,omitempty"`
}

// ServiceSpec represents the specification of a service
type ServiceSpec struct {
	Type                          string            `json:"type"`
	ClusterIP                     string            `json:"clusterIP,omitempty"`
	ClusterIPs                    []string          `json:"clusterIPs,omitempty"`
	Ports                         []ServicePort     `json:"ports,omitempty"`
	Selector                      map[string]string `json:"selector,omitempty"`
	ExternalIPs                   []string          `json:"externalIPs,omitempty"`
	SessionAffinity               string            `json:"sessionAffinity,omitempty"`
	LoadBalancerIP                string            `json:"loadBalancerIP,omitempty"`
	LoadBalancerSourceRanges      []string          `json:"loadBalancerSourceRanges,omitempty"`
	ExternalName                  string            `json:"externalName,omitempty"`
	ExternalTrafficPolicy         string            `json:"externalTrafficPolicy,omitempty"`
	HealthCheckNodePort           int32             `json:"healthCheckNodePort,omitempty"`
	PublishNotReadyAddresses      bool              `json:"publishNotReadyAddresses,omitempty"`
	SessionAffinityConfig         interface{}       `json:"sessionAffinityConfig,omitempty"`
	IPFamilies                    []string          `json:"ipFamilies,omitempty"`
	IPFamilyPolicy                string            `json:"ipFamilyPolicy,omitempty"`
	AllocateLoadBalancerNodePorts *bool             `json:"allocateLoadBalancerNodePorts,omitempty"`
	LoadBalancerClass             *string           `json:"loadBalancerClass,omitempty"`
	InternalTrafficPolicy         *string           `json:"internalTrafficPolicy,omitempty"`
}

// ServiceStatus represents the current status of a service
type ServiceStatus struct {
	LoadBalancer struct {
		Ingress []struct {
			IP       string `json:"ip,omitempty"`
			Hostname string `json:"hostname,omitempty"`
		} `json:"ingress,omitempty"`
	} `json:"loadBalancer,omitempty"`
	Conditions []struct {
		Type               string    `json:"type"`
		Status             string    `json:"status"`
		LastTransitionTime time.Time `json:"lastTransitionTime,omitempty"`
		Reason             string    `json:"reason,omitempty"`
		Message            string    `json:"message,omitempty"`
	} `json:"conditions,omitempty"`
}

// ServiceDetail represents comprehensive service information
type ServiceDetail struct {
	Name              string            `json:"name"`
	Namespace         string            `json:"namespace"`
	UID               string            `json:"uid"`
	ResourceVersion   string            `json:"resourceVersion"`
	CreationTimestamp time.Time         `json:"creationTimestamp"`
	Labels            map[string]string `json:"labels,omitempty"`
	Annotations       map[string]string `json:"annotations,omitempty"`
	Spec              ServiceSpec       `json:"spec"`
	Status            ServiceStatus     `json:"status"`
	Age               string            `json:"age"`
}

// IngressRule represents a rule in an ingress spec
type IngressRule struct {
	Host string                `json:"host,omitempty"`
	HTTP *HTTPIngressRuleValue `json:"http,omitempty"`
}

// HTTPIngressRuleValue represents the value of an HTTP ingress rule
type HTTPIngressRuleValue struct {
	Paths []HTTPIngressPath `json:"paths"`
}

// HTTPIngressPath represents a path in an HTTP ingress rule
type HTTPIngressPath struct {
	Path     string         `json:"path,omitempty"`
	PathType string         `json:"pathType"`
	Backend  IngressBackend `json:"backend"`
}

// IngressBackend represents the backend handling matched requests
type IngressBackend struct {
	Service  *IngressServiceBackend `json:"service,omitempty"`
	Resource *interface{}           `json:"resource,omitempty"`
}

// IngressServiceBackend represents a Kubernetes Service used as backend
type IngressServiceBackend struct {
	Name string             `json:"name"`
	Port ServiceBackendPort `json:"port"`
}

// ServiceBackendPort represents a port in a service backend
type ServiceBackendPort struct {
	Name   string `json:"name,omitempty"`
	Number int32  `json:"number,omitempty"`
}

// IngressTLS represents the TLS configuration
type IngressTLS struct {
	Hosts      []string `json:"hosts,omitempty"`
	SecretName string   `json:"secretName,omitempty"`
}

// IngressSpec represents the specification of an ingress
type IngressSpec struct {
	IngressClassName *string         `json:"ingressClassName,omitempty"`
	DefaultBackend   *IngressBackend `json:"defaultBackend,omitempty"`
	TLS              []IngressTLS    `json:"tls,omitempty"`
	Rules            []IngressRule   `json:"rules,omitempty"`
}

// IngressStatus represents the current status of an ingress
type IngressStatus struct {
	LoadBalancer struct {
		Ingress []struct {
			IP       string `json:"ip,omitempty"`
			Hostname string `json:"hostname,omitempty"`
		} `json:"ingress,omitempty"`
	} `json:"loadBalancer,omitempty"`
}

// IngressDetail represents comprehensive ingress information
type IngressDetail struct {
	Name              string            `json:"name"`
	Namespace         string            `json:"namespace"`
	UID               string            `json:"uid"`
	ResourceVersion   string            `json:"resourceVersion"`
	Generation        int64             `json:"generation"`
	CreationTimestamp time.Time         `json:"creationTimestamp"`
	Labels            map[string]string `json:"labels,omitempty"`
	Annotations       map[string]string `json:"annotations,omitempty"`
	Spec              IngressSpec       `json:"spec"`
	Status            IngressStatus     `json:"status"`
	Age               string            `json:"age"`
}

// PVCSpec represents the specification of a PVC
type PVCSpec struct {
	AccessModes      []string             `json:"accessModes,omitempty"`
	Selector         *LabelSelector       `json:"selector,omitempty"`
	Resources        ResourceRequirements `json:"resources,omitempty"`
	VolumeName       string               `json:"volumeName,omitempty"`
	StorageClassName *string              `json:"storageClassName,omitempty"`
	VolumeMode       *string              `json:"volumeMode,omitempty"`
	DataSource       interface{}          `json:"dataSource,omitempty"`
	DataSourceRef    interface{}          `json:"dataSourceRef,omitempty"`
}

// PVCStatus represents the current status of a PVC
type PVCStatus struct {
	Phase       string            `json:"phase,omitempty"`
	AccessModes []string          `json:"accessModes,omitempty"`
	Capacity    map[string]string `json:"capacity,omitempty"`
	Conditions  []struct {
		Type               string    `json:"type"`
		Status             string    `json:"status"`
		LastProbeTime      time.Time `json:"lastProbeTime,omitempty"`
		LastTransitionTime time.Time `json:"lastTransitionTime,omitempty"`
		Reason             string    `json:"reason,omitempty"`
		Message            string    `json:"message,omitempty"`
	} `json:"conditions,omitempty"`
	AllocatedResources map[string]string `json:"allocatedResources,omitempty"`
	ResizeStatus       *string           `json:"resizeStatus,omitempty"`
}

// PVCDetail represents comprehensive PVC information
type PVCDetail struct {
	Name              string            `json:"name"`
	Namespace         string            `json:"namespace"`
	UID               string            `json:"uid"`
	ResourceVersion   string            `json:"resourceVersion"`
	CreationTimestamp time.Time         `json:"creationTimestamp"`
	Labels            map[string]string `json:"labels,omitempty"`
	Annotations       map[string]string `json:"annotations,omitempty"`
	Spec              PVCSpec           `json:"spec"`
	Status            PVCStatus         `json:"status"`
	Age               string            `json:"age"`
}

// PVSpec represents the specification of a PV
type PVSpec struct {
	Capacity                      map[string]string `json:"capacity,omitempty"`
	PersistentVolumeSource        interface{}       `json:"persistentVolumeSource,omitempty"`
	AccessModes                   []string          `json:"accessModes,omitempty"`
	ClaimRef                      *ObjectReference  `json:"claimRef,omitempty"`
	PersistentVolumeReclaimPolicy string            `json:"persistentVolumeReclaimPolicy,omitempty"`
	StorageClassName              string            `json:"storageClassName,omitempty"`
	MountOptions                  []string          `json:"mountOptions,omitempty"`
	VolumeMode                    *string           `json:"volumeMode,omitempty"`
	NodeAffinity                  interface{}       `json:"nodeAffinity,omitempty"`
}

// ObjectReference contains enough information to let you inspect or modify the referred object
type ObjectReference struct {
	Kind            string `json:"kind,omitempty"`
	Namespace       string `json:"namespace,omitempty"`
	Name            string `json:"name,omitempty"`
	UID             string `json:"uid,omitempty"`
	APIVersion      string `json:"apiVersion,omitempty"`
	ResourceVersion string `json:"resourceVersion,omitempty"`
}

// PVStatus represents the current status of a PV
type PVStatus struct {
	Phase   string `json:"phase,omitempty"`
	Message string `json:"message,omitempty"`
	Reason  string `json:"reason,omitempty"`
}

// PVDetail represents comprehensive PV information
type PVDetail struct {
	Name              string            `json:"name"`
	UID               string            `json:"uid"`
	ResourceVersion   string            `json:"resourceVersion"`
	CreationTimestamp time.Time         `json:"creationTimestamp"`
	Labels            map[string]string `json:"labels,omitempty"`
	Annotations       map[string]string `json:"annotations,omitempty"`
	Spec              PVSpec            `json:"spec"`
	Status            PVStatus          `json:"status"`
	Age               string            `json:"age"`
}

// SecretDetail represents comprehensive secret information
type SecretDetail struct {
	Name              string            `json:"name"`
	Namespace         string            `json:"namespace"`
	UID               string            `json:"uid"`
	ResourceVersion   string            `json:"resourceVersion"`
	CreationTimestamp time.Time         `json:"creationTimestamp"`
	Labels            map[string]string `json:"labels,omitempty"`
	Annotations       map[string]string `json:"annotations,omitempty"`
	Type              string            `json:"type"`
	Data              map[string]string `json:"data,omitempty"`
	StringData        map[string]string `json:"stringData,omitempty"`
	Immutable         *bool             `json:"immutable,omitempty"`
	Age               string            `json:"age"`
}

// ConfigMapDetail represents comprehensive configmap information
type ConfigMapDetail struct {
	Name              string            `json:"name"`
	Namespace         string            `json:"namespace"`
	UID               string            `json:"uid"`
	ResourceVersion   string            `json:"resourceVersion"`
	CreationTimestamp time.Time         `json:"creationTimestamp"`
	Labels            map[string]string `json:"labels,omitempty"`
	Annotations       map[string]string `json:"annotations,omitempty"`
	Data              map[string]string `json:"data,omitempty"`
	BinaryData        map[string][]byte `json:"binaryData,omitempty"`
	Immutable         *bool             `json:"immutable,omitempty"`
	Age               string            `json:"age"`
}

// NamespaceSpec represents the specification of a namespace
type NamespaceSpec struct {
	Finalizers []string `json:"finalizers,omitempty"`
}

// NamespaceStatus represents the current status of a namespace
type NamespaceStatus struct {
	Phase      string `json:"phase,omitempty"`
	Conditions []struct {
		Type               string    `json:"type"`
		Status             string    `json:"status"`
		LastTransitionTime time.Time `json:"lastTransitionTime,omitempty"`
		Reason             string    `json:"reason,omitempty"`
		Message            string    `json:"message,omitempty"`
	} `json:"conditions,omitempty"`
}

// NamespaceDetail represents comprehensive namespace information
type NamespaceDetail struct {
	Name              string            `json:"name"`
	UID               string            `json:"uid"`
	ResourceVersion   string            `json:"resourceVersion"`
	CreationTimestamp time.Time         `json:"creationTimestamp"`
	Labels            map[string]string `json:"labels,omitempty"`
	Annotations       map[string]string `json:"annotations,omitempty"`
	Spec              NamespaceSpec     `json:"spec"`
	Status            NamespaceStatus   `json:"status"`
	Age               string            `json:"age"`
}

// NodeAddress contains information for the node's address
type NodeAddress struct {
	Type    string `json:"type"`
	Address string `json:"address"`
}

// NodeCondition contains condition information for a node
type NodeCondition struct {
	Type               string    `json:"type"`
	Status             string    `json:"status"`
	LastHeartbeatTime  time.Time `json:"lastHeartbeatTime,omitempty"`
	LastTransitionTime time.Time `json:"lastTransitionTime,omitempty"`
	Reason             string    `json:"reason,omitempty"`
	Message            string    `json:"message,omitempty"`
}

// NodeSpec represents the specification of a node
type NodeSpec struct {
	PodCIDR       string                   `json:"podCIDR,omitempty"`
	PodCIDRs      []string                 `json:"podCIDRs,omitempty"`
	ProviderID    string                   `json:"providerID,omitempty"`
	Unschedulable bool                     `json:"unschedulable,omitempty"`
	Taints        []map[string]interface{} `json:"taints,omitempty"`
	ConfigSource  interface{}              `json:"configSource,omitempty"`
}

// NodeStatus represents the current status of a node
type NodeStatus struct {
	Capacity        map[string]string `json:"capacity,omitempty"`
	Allocatable     map[string]string `json:"allocatable,omitempty"`
	Phase           string            `json:"phase,omitempty"`
	Conditions      []NodeCondition   `json:"conditions,omitempty"`
	Addresses       []NodeAddress     `json:"addresses,omitempty"`
	DaemonEndpoints struct {
		KubeletEndpoint struct {
			Port int32 `json:"port"`
		} `json:"kubeletEndpoint,omitempty"`
	} `json:"daemonEndpoints,omitempty"`
	NodeInfo struct {
		MachineID               string `json:"machineID"`
		SystemUUID              string `json:"systemUUID"`
		BootID                  string `json:"bootID"`
		KernelVersion           string `json:"kernelVersion"`
		OsImage                 string `json:"osImage"`
		ContainerRuntimeVersion string `json:"containerRuntimeVersion"`
		KubeletVersion          string `json:"kubeletVersion"`
		KubeProxyVersion        string `json:"kubeProxyVersion"`
		OperatingSystem         string `json:"operatingSystem"`
		Architecture            string `json:"architecture"`
	} `json:"nodeInfo,omitempty"`
	Images          []interface{} `json:"images,omitempty"`
	VolumesInUse    []string      `json:"volumesInUse,omitempty"`
	VolumesAttached []interface{} `json:"volumesAttached,omitempty"`
	Config          interface{}   `json:"config,omitempty"`
}

// NodeDetail represents comprehensive node information
type NodeDetail struct {
	Name              string            `json:"name"`
	UID               string            `json:"uid"`
	ResourceVersion   string            `json:"resourceVersion"`
	CreationTimestamp time.Time         `json:"creationTimestamp"`
	Labels            map[string]string `json:"labels,omitempty"`
	Annotations       map[string]string `json:"annotations,omitempty"`
	Spec              NodeSpec          `json:"spec"`
	Status            NodeStatus        `json:"status"`
	Age               string            `json:"age"`
}

// DaemonSetSpec represents the specification of a daemonset
type DaemonSetSpec struct {
	Selector             LabelSelector           `json:"selector"`
	Template             PodTemplateSpec         `json:"template"`
	UpdateStrategy       DaemonSetUpdateStrategy `json:"updateStrategy,omitempty"`
	MinReadySeconds      int32                   `json:"minReadySeconds,omitempty"`
	RevisionHistoryLimit *int32                  `json:"revisionHistoryLimit,omitempty"`
}

// DaemonSetUpdateStrategy describes the strategy for updating pods in a DaemonSet
type DaemonSetUpdateStrategy struct {
	Type          string                  `json:"type,omitempty"`
	RollingUpdate *RollingUpdateDaemonSet `json:"rollingUpdate,omitempty"`
}

// RollingUpdateDaemonSet is used to control the rolling update of a daemonset
type RollingUpdateDaemonSet struct {
	MaxUnavailable string `json:"maxUnavailable,omitempty"`
	MaxSurge       string `json:"maxSurge,omitempty"`
}

// DaemonSetStatus represents the current status of a daemonset
type DaemonSetStatus struct {
	CurrentNumberScheduled int32                `json:"currentNumberScheduled"`
	NumberMisscheduled     int32                `json:"numberMisscheduled"`
	DesiredNumberScheduled int32                `json:"desiredNumberScheduled"`
	NumberReady            int32                `json:"numberReady"`
	ObservedGeneration     int64                `json:"observedGeneration,omitempty"`
	UpdatedNumberScheduled int32                `json:"updatedNumberScheduled,omitempty"`
	NumberAvailable        int32                `json:"numberAvailable,omitempty"`
	NumberUnavailable      int32                `json:"numberUnavailable,omitempty"`
	CollisionCount         *int32               `json:"collisionCount,omitempty"`
	Conditions             []DaemonSetCondition `json:"conditions,omitempty"`
}

// DaemonSetCondition describes the state of a daemonset at a certain point
type DaemonSetCondition struct {
	Type               string    `json:"type"`
	Status             string    `json:"status"`
	LastTransitionTime time.Time `json:"lastTransitionTime,omitempty"`
	Reason             string    `json:"reason,omitempty"`
	Message            string    `json:"message,omitempty"`
}

// DaemonSetDetail represents comprehensive daemonset information
type DaemonSetDetail struct {
	Name              string            `json:"name"`
	Namespace         string            `json:"namespace"`
	UID               string            `json:"uid"`
	ResourceVersion   string            `json:"resourceVersion"`
	Generation        int64             `json:"generation"`
	CreationTimestamp time.Time         `json:"creationTimestamp"`
	Labels            map[string]string `json:"labels,omitempty"`
	Annotations       map[string]string `json:"annotations,omitempty"`
	Spec              DaemonSetSpec     `json:"spec"`
	Status            DaemonSetStatus   `json:"status"`
	Age               string            `json:"age"`
}

// JobSpec represents the specification of a job
type JobSpec struct {
	Parallelism             *int32          `json:"parallelism,omitempty"`
	Completions             *int32          `json:"completions,omitempty"`
	ActiveDeadlineSeconds   *int64          `json:"activeDeadlineSeconds,omitempty"`
	PodFailurePolicy        interface{}     `json:"podFailurePolicy,omitempty"`
	BackoffLimit            *int32          `json:"backoffLimit,omitempty"`
	Selector                *LabelSelector  `json:"selector,omitempty"`
	ManualSelector          *bool           `json:"manualSelector,omitempty"`
	Template                PodTemplateSpec `json:"template"`
	TTLSecondsAfterFinished *int32          `json:"ttlSecondsAfterFinished,omitempty"`
	CompletionMode          *string         `json:"completionMode,omitempty"`
	Suspend                 *bool           `json:"suspend,omitempty"`
}

// JobStatus represents the current status of a job
type JobStatus struct {
	Conditions              []JobCondition `json:"conditions,omitempty"`
	StartTime               *time.Time     `json:"startTime,omitempty"`
	CompletionTime          *time.Time     `json:"completionTime,omitempty"`
	Active                  int32          `json:"active,omitempty"`
	Succeeded               int32          `json:"succeeded,omitempty"`
	Failed                  int32          `json:"failed,omitempty"`
	Terminating             *int32         `json:"terminating,omitempty"`
	CompletedIndexes        string         `json:"completedIndexes,omitempty"`
	FailedIndexes           *string        `json:"failedIndexes,omitempty"`
	UncountedTerminatedPods interface{}    `json:"uncountedTerminatedPods,omitempty"`
	Ready                   *int32         `json:"ready,omitempty"`
}

// JobCondition describes the state of a job at a certain point
type JobCondition struct {
	Type               string    `json:"type"`
	Status             string    `json:"status"`
	LastProbeTime      time.Time `json:"lastProbeTime,omitempty"`
	LastTransitionTime time.Time `json:"lastTransitionTime,omitempty"`
	Reason             string    `json:"reason,omitempty"`
	Message            string    `json:"message,omitempty"`
}

// JobDetail represents comprehensive job information
type JobDetail struct {
	Name              string            `json:"name"`
	Namespace         string            `json:"namespace"`
	UID               string            `json:"uid"`
	ResourceVersion   string            `json:"resourceVersion"`
	Generation        int64             `json:"generation"`
	CreationTimestamp time.Time         `json:"creationTimestamp"`
	Labels            map[string]string `json:"labels,omitempty"`
	Annotations       map[string]string `json:"annotations,omitempty"`
	Spec              JobSpec           `json:"spec"`
	Status            JobStatus         `json:"status"`
	Age               string            `json:"age"`
}

// CronJobSpec represents the specification of a cronjob
type CronJobSpec struct {
	Schedule                   string          `json:"schedule"`
	TimeZone                   *string         `json:"timeZone,omitempty"`
	StartingDeadlineSeconds    *int64          `json:"startingDeadlineSeconds,omitempty"`
	ConcurrencyPolicy          string          `json:"concurrencyPolicy,omitempty"`
	Suspend                    *bool           `json:"suspend,omitempty"`
	JobTemplate                JobTemplateSpec `json:"jobTemplate"`
	SuccessfulJobsHistoryLimit *int32          `json:"successfulJobsHistoryLimit,omitempty"`
	FailedJobsHistoryLimit     *int32          `json:"failedJobsHistoryLimit,omitempty"`
}

// JobTemplateSpec describes the data a Job should have when created from a template
type JobTemplateSpec struct {
	Metadata struct {
		Labels      map[string]string `json:"labels,omitempty"`
		Annotations map[string]string `json:"annotations,omitempty"`
	} `json:"metadata,omitempty"`
	Spec JobSpec `json:"spec"`
}

// CronJobStatus represents the current status of a cronjob
type CronJobStatus struct {
	Active             []ObjectReference `json:"active,omitempty"`
	LastScheduleTime   *time.Time        `json:"lastScheduleTime,omitempty"`
	LastSuccessfulTime *time.Time        `json:"lastSuccessfulTime,omitempty"`
}

// CronJobDetail represents comprehensive cronjob information
type CronJobDetail struct {
	Name              string            `json:"name"`
	Namespace         string            `json:"namespace"`
	UID               string            `json:"uid"`
	ResourceVersion   string            `json:"resourceVersion"`
	Generation        int64             `json:"generation"`
	CreationTimestamp time.Time         `json:"creationTimestamp"`
	Labels            map[string]string `json:"labels,omitempty"`
	Annotations       map[string]string `json:"annotations,omitempty"`
	Spec              CronJobSpec       `json:"spec"`
	Status            CronJobStatus     `json:"status"`
	Age               string            `json:"age"`
}

// ReplicaSetInfo contains basic information about a ReplicaSet
type ReplicaSetInfo struct {
	APIVersion string            `json:"apiVersion"`
	Kind       string            `json:"kind"`
	Name       string            `json:"name"`
	Namespace  string            `json:"namespace"`
	Desired    int32             `json:"desired"`
	Current    int32             `json:"current"`
	Ready      int32             `json:"ready"`
	Age        string            `json:"age"`
	Labels     map[string]string `json:"labels,omitempty"`
}

// ServiceAccountInfo contains basic information about a ServiceAccount
type ServiceAccountInfo struct {
	APIVersion string            `json:"apiVersion"`
	Kind       string            `json:"kind"`
	Name       string            `json:"name"`
	Namespace  string            `json:"namespace"`
	Secrets    int               `json:"secrets"`
	Age        string            `json:"age"`
	Labels     map[string]string `json:"labels,omitempty"`
}

// RoleInfo contains basic information about a Role
type RoleInfo struct {
	APIVersion string            `json:"apiVersion"`
	Kind       string            `json:"kind"`
	Name       string            `json:"name"`
	Namespace  string            `json:"namespace"`
	Rules      int               `json:"rules"`
	Age        string            `json:"age"`
	Labels     map[string]string `json:"labels,omitempty"`
}

// RoleBindingInfo contains basic information about a RoleBinding
type RoleBindingInfo struct {
	APIVersion string            `json:"apiVersion"`
	Kind       string            `json:"kind"`
	Name       string            `json:"name"`
	Namespace  string            `json:"namespace"`
	RoleRef    string            `json:"roleRef"`
	Subjects   int               `json:"subjects"`
	Age        string            `json:"age"`
	Labels     map[string]string `json:"labels,omitempty"`
}

// HorizontalPodAutoscalerInfo contains basic information about a HorizontalPodAutoscaler
type HorizontalPodAutoscalerInfo struct {
	APIVersion      string            `json:"apiVersion"`
	Kind            string            `json:"kind"`
	Name            string            `json:"name"`
	Namespace       string            `json:"namespace"`
	Reference       string            `json:"reference"`
	MinReplicas     int32             `json:"minReplicas"`
	MaxReplicas     int32             `json:"maxReplicas"`
	CurrentReplicas int32             `json:"currentReplicas"`
	Age             string            `json:"age"`
	Labels          map[string]string `json:"labels,omitempty"`
}

// DrainNodeOptions contains options for draining a node
type DrainNodeOptions struct {
GracePeriodSeconds int  `json:"gracePeriodSeconds"`
Timeout            int  `json:"timeout"`
IgnoreDaemonSets   bool `json:"ignoreDaemonSets"`
DeleteEmptyDirData bool `json:"deleteEmptyDirData"`
}
