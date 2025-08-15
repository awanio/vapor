export interface KubernetesNamespace {
    name: string;
    status: string;
    age: string;
}
export interface KubernetesPod {
    name: string;
    namespace: string;
    type?: 'Pod';
    status: string;
    ready: string;
    restarts: number;
    age: string;
    node?: string;
    ip?: string;
}
export interface KubernetesDeployment {
    name: string;
    namespace: string;
    type?: 'Deployment';
    ready: string;
    upToDate: number;
    available: number;
    age: string;
}
export interface KubernetesStatefulSet {
    name: string;
    namespace: string;
    type?: 'StatefulSet';
    ready: string;
    age: string;
}
export interface KubernetesDaemonSet {
    name: string;
    namespace: string;
    type?: 'DaemonSet';
    desired: number;
    current: number;
    ready: number;
    upToDate: number;
    available: number;
    age: string;
}
export interface KubernetesJob {
    name: string;
    namespace: string;
    type?: 'Job';
    completions: string;
    duration: string;
    age: string;
}
export interface KubernetesCronJob {
    name: string;
    namespace: string;
    type?: 'CronJob';
    schedule: string;
    suspend: boolean;
    active: number;
    lastSchedule: string;
    age: string;
}
export interface KubernetesService {
    name: string;
    namespace: string;
    type: string;
    clusterIP: string;
    externalIP?: string;
    ports: string;
    age: string;
}
export interface KubernetesIngress {
    name: string;
    namespace: string;
    class?: string;
    hosts: string;
    address?: string;
    ports: string;
    age: string;
}
export interface KubernetesIngressClass {
    name: string;
    controller: string;
    parameters?: {
        apiGroup?: string;
        kind?: string;
        name?: string;
    };
    age: string;
    labels?: {
        [key: string]: string;
    };
    annotations?: {
        [key: string]: string;
    };
}
export interface KubernetesNetworkPolicy {
    name: string;
    namespace: string;
    podSelector: {
        [key: string]: string;
    };
    policyTypes: string[];
    age: string;
    labels?: {
        [key: string]: string;
    };
    annotations?: {
        [key: string]: string;
    };
}
export interface KubernetesCRD {
    name: string;
    group: string;
    version: string;
    kind: string;
    scope: string;
    names: string[];
    age: string;
    labels?: {
        [key: string]: string;
    };
    creationTimestamp?: string;
}
export interface KubernetesPersistentVolume {
    name: string;
    capacity: string;
    accessModes: string;
    reclaimPolicy: string;
    status: string;
    claim?: string;
    storageClass: string;
    reason?: string;
    age: string;
}
export interface KubernetesPersistentVolumeClaim {
    name: string;
    namespace: string;
    status: string;
    volume?: string;
    capacity: string;
    accessModes: string;
    storageClass: string;
    age: string;
}
export interface KubernetesConfigMap {
    name: string;
    namespace: string;
    data: number;
    age: string;
}
export interface KubernetesSecret {
    name: string;
    namespace: string;
    type: string;
    data: number;
    age: string;
}
export interface KubernetesNode {
    name: string;
    status: string;
    roles: string;
    age: string;
    version: string;
    internalIP?: string;
    externalIP?: string;
    os: string;
    kernelVersion: string;
    containerRuntime: string;
}
export interface KubernetesCustomResource {
    name: string;
    namespace?: string;
    apiVersion: string;
    kind: string;
    age: string;
}
export interface HelmRelease {
    name: string;
    namespace: string;
    revision: string;
    updated: string;
    status: string;
    chart: string;
    appVersion: string;
}
export interface KubernetesListResponse<T> {
    items: T[];
    total: number;
}
export interface KubernetesResourceDetails {
    apiVersion: string;
    kind: string;
    metadata: any;
    spec?: any;
    status?: any;
    data?: any;
}
export declare class KubernetesApi {
    static getNamespaces(): Promise<KubernetesNamespace[]>;
    static getPods(namespace?: string): Promise<KubernetesPod[]>;
    static getDeployments(namespace?: string): Promise<KubernetesDeployment[]>;
    static getStatefulSets(namespace?: string): Promise<KubernetesStatefulSet[]>;
    static getDaemonSets(namespace?: string): Promise<KubernetesDaemonSet[]>;
    static getJobs(namespace?: string): Promise<KubernetesJob[]>;
    static getCronJobs(namespace?: string): Promise<KubernetesCronJob[]>;
    static getServices(namespace?: string): Promise<KubernetesService[]>;
    static getIngresses(namespace?: string): Promise<KubernetesIngress[]>;
    static getIngressClasses(): Promise<KubernetesIngressClass[]>;
    static getNetworkPolicies(namespace?: string): Promise<KubernetesNetworkPolicy[]>;
    static getCRDs(): Promise<KubernetesCRD[]>;
    static getPersistentVolumes(): Promise<KubernetesPersistentVolume[]>;
    static getPersistentVolumeClaims(namespace?: string): Promise<KubernetesPersistentVolumeClaim[]>;
    static getConfigMaps(namespace?: string): Promise<KubernetesConfigMap[]>;
    static getSecrets(namespace?: string): Promise<KubernetesSecret[]>;
    static getNodes(): Promise<KubernetesNode[]>;
    static getNodeDetails(name: string): Promise<any>;
    static getCustomResources(apiVersion: string, kind: string, namespace?: string): Promise<KubernetesCustomResource[]>;
    static getHelmReleases(namespace?: string): Promise<HelmRelease[]>;
    static getResourceDetails(kind: string, name: string, namespace?: string): Promise<KubernetesResourceDetails>;
    static getPodDetails(namespace: string, name: string): Promise<KubernetesResourceDetails>;
    static getDeploymentDetails(namespace: string, name: string): Promise<KubernetesResourceDetails>;
    static getServiceDetails(namespace: string, name: string): Promise<KubernetesResourceDetails>;
    static getStatefulSetDetails(namespace: string, name: string): Promise<KubernetesResourceDetails>;
    static getDaemonSetDetails(namespace: string, name: string): Promise<KubernetesResourceDetails>;
    static getJobDetails(namespace: string, name: string): Promise<KubernetesResourceDetails>;
    static getCronJobDetails(namespace: string, name: string): Promise<KubernetesResourceDetails>;
    static getIngressDetails(namespace: string, name: string): Promise<KubernetesResourceDetails>;
    static getIngressClassDetails(name: string): Promise<KubernetesResourceDetails>;
    static getNetworkPolicyDetails(namespace: string, name: string): Promise<KubernetesResourceDetails>;
    static getCRDDetails(name: string): Promise<KubernetesResourceDetails>;
    static getPVCDetails(namespace: string, name: string): Promise<KubernetesResourceDetails>;
    static getPVDetails(name: string): Promise<KubernetesResourceDetails>;
    static getConfigMapDetails(namespace: string, name: string): Promise<KubernetesResourceDetails>;
    static getSecretDetails(namespace: string, name: string): Promise<KubernetesResourceDetails>;
    static deleteResource(kind: string, name: string, namespace?: string): Promise<void>;
    static createResource(content: string, contentType?: 'json' | 'yaml'): Promise<any>;
    static updateResource(kind: string, name: string, namespace: string | undefined, content: string, contentType?: 'json' | 'yaml'): Promise<any>;
    static getPodLogs(name: string, namespace: string, container?: string, follow?: boolean, tailLines?: number): Promise<string>;
    static execPod(name: string, namespace: string, container: string, command: string[]): Promise<any>;
    static getCRDInstances(crdName: string): Promise<any[]>;
    static getCRDInstanceDetails(crdName: string, instanceName: string, namespace?: string): Promise<any>;
    static deleteCRDInstance(crdName: string, instanceName: string, namespace?: string): Promise<void>;
}
//# sourceMappingURL=kubernetes-api.d.ts.map