import { Api } from '../api';
import { getAuthHeaders } from '../stores/auth';
import { getApiUrl } from '../config';

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

export interface KubernetesIngressClass {
  name: string;
  controller: string;
  parameters?: {
    apiGroup?: string;
    kind?: string;
    name?: string;
  };
  age: string;
  labels?: { [key: string]: string };
  annotations?: { [key: string]: string };
}

export interface KubernetesNetworkPolicy {
  name: string;
  namespace: string;
  podSelector: { [key: string]: string };
  policyTypes: string[];
  age: string;
  labels?: { [key: string]: string };
  annotations?: { [key: string]: string };
}

export interface KubernetesCRD {
  name: string;
  group: string;
  version: string;
  kind: string;
  scope: string;
  names: string[];
  age: string;
  labels?: { [key: string]: string };
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

export class KubernetesApi {
  // Namespaces
  static async getNamespaces(): Promise<KubernetesNamespace[]> {
    const response = await Api.get<{ namespaces: KubernetesNamespace[] }>('/kubernetes/namespaces');
    return response.namespaces || [];
  }

  // Workloads
  static async getPods(namespace?: string): Promise<KubernetesPod[]> {
    const url = namespace && namespace !== 'all' 
      ? `/kubernetes/pods/${namespace}`
      : '/kubernetes/pods';
    const response = await Api.get<{ pods: KubernetesPod[] }>(url);
    return response.pods || [];
  }

  static async getDeployments(namespace?: string): Promise<KubernetesDeployment[]> {
    const url = namespace && namespace !== 'all' 
      ? `/kubernetes/deployments/${namespace}`
      : '/kubernetes/deployments';
    const response = await Api.get<{ deployments: KubernetesDeployment[] }>(url);
    return response.deployments || [];
  }

  static async getStatefulSets(namespace?: string): Promise<KubernetesStatefulSet[]> {
    const url = namespace && namespace !== 'all' 
      ? `/kubernetes/statefulsets/${namespace}`
      : '/kubernetes/statefulsets';
    const response = await Api.get<{ statefulsets: KubernetesStatefulSet[] }>(url);
    return response.statefulsets || [];
  }

  static async getDaemonSets(namespace?: string): Promise<KubernetesDaemonSet[]> {
    const url = namespace && namespace !== 'all' 
      ? `/kubernetes/daemonsets/${namespace}`
      : '/kubernetes/daemonsets';
    const response = await Api.get<{ daemonsets: KubernetesDaemonSet[] }>(url);
    return response.daemonsets || [];
  }

  static async getJobs(namespace?: string): Promise<KubernetesJob[]> {
    const url = namespace && namespace !== 'all' 
      ? `/kubernetes/jobs/${namespace}`
      : '/kubernetes/jobs';
    const response = await Api.get<{ jobs: KubernetesJob[] }>(url);
    return response.jobs || [];
  }

  static async getCronJobs(namespace?: string): Promise<KubernetesCronJob[]> {
    const url = namespace && namespace !== 'all' 
      ? `/kubernetes/cronjobs/${namespace}`
      : '/kubernetes/cronjobs';
    const response = await Api.get<{ cronjobs: KubernetesCronJob[] }>(url);
    return response.cronjobs || [];
  }

  // Networks
  static async getServices(namespace?: string): Promise<KubernetesService[]> {
    const url = namespace && namespace !== 'all' 
      ? `/kubernetes/services/${namespace}`
      : '/kubernetes/services';
    const response = await Api.get<{ services: KubernetesService[] }>(url);
    return response.services || [];
  }

  static async getIngresses(namespace?: string): Promise<KubernetesIngress[]> {
    const url = namespace && namespace !== 'all' 
      ? `/kubernetes/ingresses/${namespace}`
      : '/kubernetes/ingresses';
    const response = await Api.get<{ ingresses: KubernetesIngress[] }>(url);
    return response.ingresses || [];
  }

  static async getIngressClasses(): Promise<KubernetesIngressClass[]> {
    const response = await Api.get<{ ingressClasses: KubernetesIngressClass[] }>('/kubernetes/ingressclasses');
    return response.ingressClasses || [];
  }

  static async getNetworkPolicies(namespace?: string): Promise<KubernetesNetworkPolicy[]> {
    const url = namespace && namespace !== 'all' 
      ? `/kubernetes/networkpolicies/${namespace}`
      : '/kubernetes/networkpolicies';
    const response = await Api.get<{ networkPolicies: KubernetesNetworkPolicy[] }>(url);
    return response.networkPolicies || [];
  }

  // CRDs
  static async getCRDs(): Promise<KubernetesCRD[]> {
    // Api.get returns data field directly, not the full response
    const response = await Api.get<{ count: number; crds: KubernetesCRD[] }>('/kubernetes/customresourcedefinitions');
    return response.crds || [];
  }

  // Storage
  static async getPersistentVolumes(): Promise<KubernetesPersistentVolume[]> {
    const response = await Api.get<{ pvs: KubernetesPersistentVolume[] }>('/kubernetes/persistentvolumes');
    return response.pvs || [];
  }

  static async getPersistentVolumeClaims(namespace?: string): Promise<KubernetesPersistentVolumeClaim[]> {
    const url = namespace && namespace !== 'all' 
      ? `/kubernetes/persistentvolumeclaims/${namespace}`
      : '/kubernetes/persistentvolumeclaims';
    const response = await Api.get<{ pvcs: KubernetesPersistentVolumeClaim[] }>(url);
    return response.pvcs || [];
  }

  // Configurations
  static async getConfigMaps(namespace?: string): Promise<KubernetesConfigMap[]> {
    const url = namespace && namespace !== 'all' 
      ? `/kubernetes/configmaps/${namespace}`
      : '/kubernetes/configmaps';
    const response = await Api.get<{ configmaps: KubernetesConfigMap[] }>(url);
    return response.configmaps || [];
  }

  static async getSecrets(namespace?: string): Promise<KubernetesSecret[]> {
    const url = namespace && namespace !== 'all' 
      ? `/kubernetes/secrets/${namespace}`
      : '/kubernetes/secrets';
    const response = await Api.get<{ secrets: KubernetesSecret[] }>(url);
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
    const url = namespace && namespace !== 'all' 
      ? `/kubernetes/helm/releases/${namespace}`
      : '/kubernetes/helm/releases';
    const response = await Api.get<KubernetesListResponse<HelmRelease>>(url);
    return response.items || [];
  }

  // Get raw resource in specified format (JSON or YAML)
  static async getResourceRaw(kind: string, name: string, namespace: string | undefined, format: 'json' | 'yaml' = 'json'): Promise<string> {
    const endpoint = this.getResourceEndpoint(kind, name, namespace);
    const contentType = format === 'yaml' ? 'application/yaml' : 'application/json';
    
    const authHeaders = getAuthHeaders();
    const url = getApiUrl(endpoint);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': contentType,
        ...authHeaders,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch resource: ${response.statusText}`);
    }

    return response.text();
  }

  // Helper to get the correct endpoint for a resource
  private static getResourceEndpoint(kind: string, name: string, namespace?: string): string {
    switch (kind.toLowerCase()) {
      case 'pod':
        return `/kubernetes/pods/${namespace}/${name}`;
      case 'deployment':
        return `/kubernetes/deployments/${namespace}/${name}`;
      case 'statefulset':
        return `/kubernetes/statefulsets/${namespace}/${name}`;
      case 'daemonset':
        return `/kubernetes/daemonsets/${namespace}/${name}`;
      case 'job':
        return `/kubernetes/jobs/${namespace}/${name}`;
      case 'cronjob':
        return `/kubernetes/cronjobs/${namespace}/${name}`;
      case 'service':
        return `/kubernetes/services/${namespace}/${name}`;
      case 'ingress':
        return `/kubernetes/ingresses/${namespace}/${name}`;
      case 'ingressclass':
        return `/kubernetes/ingressclasses/${name}`;
      case 'networkpolicy':
        return `/kubernetes/networkpolicies/${namespace}/${name}`;
      case 'crd':
      case 'customresourcedefinition':
        return `/kubernetes/customresourcedefinitions/${name}`;
      case 'persistentvolumeclaim':
      case 'pvc':
        return `/kubernetes/persistentvolumeclaims/${namespace}/${name}`;
      case 'persistentvolume':
      case 'pv':
        return `/kubernetes/persistentvolumes/${name}`;
      case 'configmap':
        return `/kubernetes/configmaps/${namespace}/${name}`;
      case 'secret':
        return `/kubernetes/secrets/${namespace}/${name}`;
      default:
        throw new Error(`Unsupported resource kind: ${kind}`);
    }
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
      case 'ingressclass':
        return this.getIngressClassDetails(name);
      case 'networkpolicy':
        return this.getNetworkPolicyDetails(namespace!, name);
      case 'crd':
      case 'customresourcedefinition':
        return this.getCRDDetails(name);
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

  static async getIngressClassDetails(name: string): Promise<KubernetesResourceDetails> {
    const response = await Api.get<any>(`/kubernetes/ingressclasses/${name}`);
    return response.ingressclass_detail || response;
  }

  static async getNetworkPolicyDetails(namespace: string, name: string): Promise<KubernetesResourceDetails> {
    const response = await Api.get<any>(`/kubernetes/networkpolicies/${namespace}/${name}`);
    return response.networkpolicy_detail || response;
  }

  static async getCRDDetails(name: string): Promise<KubernetesResourceDetails> {
    const response = await Api.get<any>(`/kubernetes/customresourcedefinitions/${name}`);
    return response.crd || response;
  }

  static async getPVCDetails(namespace: string, name: string): Promise<KubernetesResourceDetails> {
    const response = await Api.get<any>(`/kubernetes/persistentvolumeclaims/${namespace}/${name}`);
    return response.pvc_detail || response;
  }

  static async getPVDetails(name: string): Promise<KubernetesResourceDetails> {
    const response = await Api.get<any>(`/kubernetes/persistentvolumes/${name}`);
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

  // Deployment Rollout Operations
  static async restartDeployment(namespace: string, name: string): Promise<void> {
    await Api.patch(`/kubernetes/deployments/${namespace}/${name}/rollout/restart`, {});
  }

  static async rollbackDeployment(namespace: string, name: string): Promise<void> {
    await Api.patch(`/kubernetes/deployments/${namespace}/${name}/rollout/undo`, {});
  }

  static async setDeploymentImages(namespace: string, name: string, images: Array<{[key: string]: string}>): Promise<void> {
    await Api.patch(`/kubernetes/deployments/${namespace}/${name}/rollout/images`, images);
  }

  // Get deployment containers info (for set image operation)
  static async getDeploymentContainers(namespace: string, name: string): Promise<Array<{name: string, image: string}>> {
    const details = await this.getDeploymentDetails(namespace, name);
    const containers: Array<{name: string, image: string}> = [];
    
    if (details.spec?.template?.spec?.containers) {
      for (const container of details.spec.template.spec.containers) {
        containers.push({
          name: container.name,
          image: container.image
        });
      }
    }
    
    return containers;
  }

  // StatefulSet Rollout Operations
  static async restartStatefulSet(namespace: string, name: string): Promise<void> {
    await Api.patch(`/kubernetes/statefulsets/${namespace}/${name}/rollout/restart`, {});
  }

  static async rollbackStatefulSet(namespace: string, name: string): Promise<void> {
    await Api.patch(`/kubernetes/statefulsets/${namespace}/${name}/rollout/undo`, {});
  }

  static async setStatefulSetImages(namespace: string, name: string, images: Array<{[key: string]: string}>): Promise<void> {
    await Api.patch(`/kubernetes/statefulsets/${namespace}/${name}/rollout/images`, images);
  }

  // Get StatefulSet containers info (for set image operation)
  static async getStatefulSetContainers(namespace: string, name: string): Promise<Array<{name: string, image: string}>> {
    const details = await this.getStatefulSetDetails(namespace, name);
    const containers: Array<{name: string, image: string}> = [];
    
    if (details.spec?.template?.spec?.containers) {
      for (const container of details.spec.template.spec.containers) {
        containers.push({
          name: container.name,
          image: container.image
        });
      }
    }
    
    return containers;
  }

  // DaemonSet Rollout Operations
  static async restartDaemonSet(namespace: string, name: string): Promise<void> {
    await Api.patch(`/kubernetes/daemonsets/${namespace}/${name}/rollout/restart`, {});
  }

  static async rollbackDaemonSet(namespace: string, name: string): Promise<void> {
    await Api.patch(`/kubernetes/daemonsets/${namespace}/${name}/rollout/undo`, {});
  }

  static async setDaemonSetImages(namespace: string, name: string, images: Array<{[key: string]: string}>): Promise<void> {
    await Api.patch(`/kubernetes/daemonsets/${namespace}/${name}/rollout/images`, images);
  }

  // Get DaemonSet containers info (for set image operation)
  static async getDaemonSetContainers(namespace: string, name: string): Promise<Array<{name: string, image: string}>> {
    const details = await this.getDaemonSetDetails(namespace, name);
    const containers: Array<{name: string, image: string}> = [];
    
    if (details.spec?.template?.spec?.containers) {
      for (const container of details.spec.template.spec.containers) {
        containers.push({
          name: container.name,
          image: container.image
        });
      }
    }
    
    return containers;
  }

  // Pod Set Image Operations
  static async setPodImages(namespace: string, name: string, images: Array<{[key: string]: string}>): Promise<void> {
    await Api.patch(`/kubernetes/pods/${namespace}/${name}/images`, images);
  }

  // Get Pod containers info (for set image operation)
  static async getPodContainers(namespace: string, name: string): Promise<Array<{name: string, image: string}>> {
    const details = await this.getPodDetails(namespace, name);
    const containers: Array<{name: string, image: string}> = [];
    
    if (details.spec?.containers) {
      for (const container of details.spec.containers) {
        containers.push({
          name: container.name,
          image: container.image
        });
      }
    }
    
    return containers;
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
      case 'ingressclass':
        endpoint = `/kubernetes/ingressclasses/${name}`;
        break;
      case 'networkpolicy':
        endpoint = `/kubernetes/networkpolicies/${namespace}/${name}`;
        break;
      case 'crd':
      case 'customresourcedefinition':
        endpoint = `/kubernetes/customresourcedefinitions/${name}`;
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
    const endpoint = this.getResourceEndpoint(kind, name, namespace);
    const mimeType = contentType === 'json' ? 'application/json' : 'application/yaml';
    return Api.putResource(endpoint, content, mimeType);
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

  // CRD Instances
  static async getCRDInstances(crdName: string): Promise<any[]> {
    const response = await Api.get<any>(`/kubernetes/customresourcedefinitions/${crdName}/instances`);
    
    // Handle different possible response formats
    if (Array.isArray(response)) {
      return response;
    } else if (response && typeof response === 'object') {
      // Check for common response patterns
      if (Array.isArray(response.instances)) {
        return response.instances;
      } else if (Array.isArray(response.items)) {
        return response.items;
      } else if (Array.isArray(response.resources)) {
        return response.resources;
      }
    }
    
    // If response is not in expected format, return empty array
    return [];
  }

  static async getCRDInstanceDetails(crdName: string, instanceName: string, namespace?: string): Promise<any> {
    const endpoint = namespace 
      ? `/kubernetes/customresourcedefinitions/${crdName}/instances/${namespace}/${instanceName}`
      : `/kubernetes/customresourcedefinitions/${crdName}/instances/-/${instanceName}`;
    
    const response = await Api.get<any>(endpoint);
    return response.instance || response;
  }

  static async deleteCRDInstance(crdName: string, instanceName: string, namespace?: string): Promise<void> {
    const endpoint = namespace 
      ? `/kubernetes/customresourcedefinitions/${crdName}/instances/${namespace}/${instanceName}`
      : `/kubernetes/customresourcedefinitions/${crdName}/instances/-/${instanceName}`;
    
    await Api.delete(endpoint);
  }
}
