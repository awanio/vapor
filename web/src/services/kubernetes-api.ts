import { Api } from '../api';

// Kubernetes resource types
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

export class KubernetesApi {
  // Namespaces
  static async getNamespaces(): Promise<KubernetesNamespace[]> {
    const response = await Api.get<{ namespaces: KubernetesNamespace[] }>('/kubernetes/namespaces');
    return response.namespaces || [];
  }

  // Workloads
  static async getPods(namespace?: string): Promise<KubernetesPod[]> {
    const params = namespace && namespace !== 'all' ? { namespace } : {};
    const response = await Api.get<{ pods: KubernetesPod[] }>('/kubernetes/pods', params);
    return response.pods || [];
  }

  static async getDeployments(namespace?: string): Promise<KubernetesDeployment[]> {
    const params = namespace && namespace !== 'all' ? { namespace } : {};
    const response = await Api.get<{ deployments: KubernetesDeployment[] }>('/kubernetes/deployments', params);
    return response.deployments || [];
  }

  static async getStatefulSets(namespace?: string): Promise<KubernetesStatefulSet[]> {
    const params = namespace && namespace !== 'all' ? { namespace } : {};
    const response = await Api.get<{ statefulsets: KubernetesStatefulSet[] }>('/kubernetes/statefulsets', params);
    return response.statefulsets || [];
  }

  static async getDaemonSets(namespace?: string): Promise<KubernetesDaemonSet[]> {
    const params = namespace && namespace !== 'all' ? { namespace } : {};
    const response = await Api.get<{ daemonsets: KubernetesDaemonSet[] }>('/kubernetes/daemonsets', params);
    return response.daemonsets || [];
  }

  static async getJobs(namespace?: string): Promise<KubernetesJob[]> {
    const params = namespace && namespace !== 'all' ? { namespace } : {};
    const response = await Api.get<{ jobs: KubernetesJob[] }>('/kubernetes/jobs', params);
    return response.jobs || [];
  }

  static async getCronJobs(namespace?: string): Promise<KubernetesCronJob[]> {
    const params = namespace && namespace !== 'all' ? { namespace } : {};
    const response = await Api.get<{ cronjobs: KubernetesCronJob[] }>('/kubernetes/cronjobs', params);
    return response.cronjobs || [];
  }

  // Networks
  static async getServices(namespace?: string): Promise<KubernetesService[]> {
    const params = namespace && namespace !== 'all' ? { namespace } : {};
    const response = await Api.get<{ services: KubernetesService[] }>('/kubernetes/services', params);
    return response.services || [];
  }

  static async getIngresses(namespace?: string): Promise<KubernetesIngress[]> {
    const params = namespace && namespace !== 'all' ? { namespace } : {};
    const response = await Api.get<{ ingresses: KubernetesIngress[] }>('/kubernetes/ingresses', params);
    return response.ingresses || [];
  }

  // Storage
  static async getPersistentVolumes(): Promise<KubernetesPersistentVolume[]> {
    const response = await Api.get<{ pvs: KubernetesPersistentVolume[] }>('/kubernetes/persistentvolumes');
    return response.pvs || [];
  }

  static async getPersistentVolumeClaims(namespace?: string): Promise<KubernetesPersistentVolumeClaim[]> {
    const params = namespace && namespace !== 'all' ? { namespace } : {};
    const response = await Api.get<{ pvcs: KubernetesPersistentVolumeClaim[] }>('/kubernetes/persistentvolumeclaims', params);
    return response.pvcs || [];
  }

  // Configurations
  static async getConfigMaps(namespace?: string): Promise<KubernetesConfigMap[]> {
    const params = namespace && namespace !== 'all' ? { namespace } : {};
    const response = await Api.get<{ configmaps: KubernetesConfigMap[] }>('/kubernetes/configmaps', params);
    return response.configmaps || [];
  }

  static async getSecrets(namespace?: string): Promise<KubernetesSecret[]> {
    const params = namespace && namespace !== 'all' ? { namespace } : {};
    const response = await Api.get<{ secrets: KubernetesSecret[] }>('/kubernetes/secrets', params);
    return response.secrets || [];
  }

  // Nodes
  static async getNodes(): Promise<KubernetesNode[]> {
    // According to openapi.yaml, the response structure is:
    // { count: number, nodes: NodeInfo[] }
    const response = await Api.get<{ count: number; nodes: KubernetesNode[] }>('/kubernetes/nodes');
    return response.nodes || [];
  }

  static async getNodeDetails(name: string): Promise<any> {
    // According to openapi.yaml, node details are at /kubernetes/nodes/{name}
    return Api.get(`/kubernetes/nodes/${name}`);
  }

  // Custom Resources
  static async getCustomResources(apiVersion: string, kind: string, namespace?: string): Promise<KubernetesCustomResource[]> {
    const params: any = { apiVersion, kind };
    if (namespace && namespace !== 'all') {
      params.namespace = namespace;
    }
    const response = await Api.get<KubernetesListResponse<KubernetesCustomResource>>('/kubernetes/customresources', params);
    return response.items || [];
  }

  // Helm
  static async getHelmReleases(namespace?: string): Promise<HelmRelease[]> {
    const params = namespace && namespace !== 'all' ? { namespace } : {};
    const response = await Api.get<KubernetesListResponse<HelmRelease>>('/kubernetes/helm/releases', params);
    return response.items || [];
  }

  // Resource Details
  static async getResourceDetails(kind: string, name: string, namespace?: string): Promise<KubernetesResourceDetails> {
    // Map resource kinds to specific detail methods
    switch (kind.toLowerCase()) {
      case 'pod':
        return this.getPodDetails(namespace!, name);
      case 'deployment':
        return this.getDeploymentDetails(namespace!, name);
      case 'statefulset':
        return this.getStatefulSetDetails(namespace!, name);
      case 'daemonset':
        return this.getDaemonSetDetails(namespace!, name);
      case 'job':
        return this.getJobDetails(namespace!, name);
      case 'cronjob':
        return this.getCronJobDetails(namespace!, name);
      case 'service':
        return this.getServiceDetails(namespace!, name);
      case 'ingress':
        return this.getIngressDetails(namespace!, name);
      case 'persistentvolumeclaim':
      case 'pvc':
        return this.getPVCDetails(namespace!, name);
      case 'persistentvolume':
      case 'pv':
        return this.getPVDetails(name);
      case 'configmap':
        return this.getConfigMapDetails(namespace!, name);
      case 'secret':
        return this.getSecretDetails(namespace!, name);
      default:
        throw new Error(`Unsupported resource kind: ${kind}`);
    }
  }

  // Specific detail methods
  static async getPodDetails(namespace: string, name: string): Promise<KubernetesResourceDetails> {
    const response = await Api.get<any>(`/kubernetes/pods/${namespace}/${name}`);
    return response.pod_detail || response;
  }

  static async getDeploymentDetails(namespace: string, name: string): Promise<KubernetesResourceDetails> {
    const response = await Api.get<any>(`/kubernetes/deployments/${namespace}/${name}`);
    return response.deployment_detail || response;
  }

  static async getServiceDetails(namespace: string, name: string): Promise<KubernetesResourceDetails> {
    const response = await Api.get<any>(`/kubernetes/services/${namespace}/${name}`);
    return response.service_detail || response;
  }

  static async getStatefulSetDetails(namespace: string, name: string): Promise<KubernetesResourceDetails> {
    const response = await Api.get<any>(`/kubernetes/statefulsets/${namespace}/${name}`);
    return response.statefulset_detail || response;
  }

  static async getDaemonSetDetails(namespace: string, name: string): Promise<KubernetesResourceDetails> {
    const response = await Api.get<any>(`/kubernetes/daemonsets/${namespace}/${name}`);
    return response.daemonset_detail || response;
  }

  static async getJobDetails(namespace: string, name: string): Promise<KubernetesResourceDetails> {
    const response = await Api.get<any>(`/kubernetes/jobs/${namespace}/${name}`);
    return response.job_detail || response;
  }

  static async getCronJobDetails(namespace: string, name: string): Promise<KubernetesResourceDetails> {
    const response = await Api.get<any>(`/kubernetes/cronjobs/${namespace}/${name}`);
    return response.cronjob_detail || response;
  }

  static async getIngressDetails(namespace: string, name: string): Promise<KubernetesResourceDetails> {
    const response = await Api.get<any>(`/kubernetes/ingresses/${namespace}/${name}`);
    return response.ingress_detail || response;
  }

  static async getPVCDetails(namespace: string, name: string): Promise<KubernetesResourceDetails> {
    const response = await Api.get<any>(`/kubernetes/pvcs/${namespace}/${name}`);
    return response.pvc_detail || response;
  }

  static async getPVDetails(name: string): Promise<KubernetesResourceDetails> {
    const response = await Api.get<any>(`/kubernetes/pvs/${name}`);
    return response.pv_detail || response;
  }

  static async getConfigMapDetails(namespace: string, name: string): Promise<KubernetesResourceDetails> {
    const response = await Api.get<any>(`/kubernetes/configmaps/${namespace}/${name}`);
    return response.configmap_detail || response;
  }

  static async getSecretDetails(namespace: string, name: string): Promise<KubernetesResourceDetails> {
    const response = await Api.get<any>(`/kubernetes/secrets/${namespace}/${name}`);
    return response.secret_detail || response;
  }

  // Resource Operations
  static async deleteResource(kind: string, name: string, namespace?: string): Promise<void> {
    // Map resource kinds to specific delete endpoints
    let endpoint: string;
    
    switch (kind.toLowerCase()) {
      case 'pod':
        endpoint = `/kubernetes/pods/${namespace}/${name}`;
        break;
      case 'deployment':
        endpoint = `/kubernetes/deployments/${namespace}/${name}`;
        break;
      case 'statefulset':
        endpoint = `/kubernetes/statefulsets/${namespace}/${name}`;
        break;
      case 'daemonset':
        endpoint = `/kubernetes/daemonsets/${namespace}/${name}`;
        break;
      case 'job':
        endpoint = `/kubernetes/jobs/${namespace}/${name}`;
        break;
      case 'cronjob':
        endpoint = `/kubernetes/cronjobs/${namespace}/${name}`;
        break;
      case 'service':
        endpoint = `/kubernetes/services/${namespace}/${name}`;
        break;
      case 'ingress':
        endpoint = `/kubernetes/ingresses/${namespace}/${name}`;
        break;
      case 'persistentvolumeclaim':
      case 'pvc':
        endpoint = `/kubernetes/pvcs/${namespace}/${name}`;
        break;
      case 'persistentvolume':
      case 'pv':
        endpoint = `/kubernetes/pvs/${name}`;
        break;
      case 'configmap':
        endpoint = `/kubernetes/configmaps/${namespace}/${name}`;
        break;
      case 'secret':
        endpoint = `/kubernetes/secrets/${namespace}/${name}`;
        break;
      default:
        throw new Error(`Unsupported resource kind for deletion: ${kind}`);
    }
    
    await Api.delete(endpoint);
  }

  static async createResource(content: string, contentType: 'json' | 'yaml' = 'yaml'): Promise<any> {
    const mimeType = contentType === 'json' ? 'application/json' : 'application/yaml';
    return Api.postResource('/kubernetes/resource', content, mimeType);
  }

  static async updateResource(kind: string, name: string, namespace: string | undefined, content: string, contentType: 'json' | 'yaml' = 'yaml'): Promise<any> {
    const mimeType = contentType === 'json' ? 'application/json' : 'application/yaml';
    const endpoint = namespace 
      ? `/kubernetes/resource/${kind}/${namespace}/${name}`
      : `/kubernetes/resource/${kind}/${name}`;
    return Api.postResource(endpoint, content, mimeType);
  }

  // Pod Logs
  static async getPodLogs(name: string, namespace: string, container?: string, follow: boolean = false, tailLines: number = 100): Promise<string> {
    const params: any = { follow, lines: tailLines };
    if (container) {
      params.container = container;
    }
    const response = await Api.get<{ status: string; logs: string }>(`/kubernetes/pods/${namespace}/${name}/logs`, params);
    return response.logs || '';
  }

  // Exec into Pod
  static async execPod(name: string, namespace: string, container: string, command: string[]): Promise<any> {
    return Api.post(`/kubernetes/pods/${namespace}/${name}/exec`, { container, command });
  }
}
