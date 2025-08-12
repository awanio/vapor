import { Api } from '../api';
export class KubernetesApi {
    static async getNamespaces() {
        const response = await Api.get('/kubernetes/namespaces');
        return response.namespaces || [];
    }
    static async getPods(namespace) {
        const params = namespace && namespace !== 'all' ? { namespace } : {};
        const response = await Api.get('/kubernetes/pods', params);
        return response.pods || [];
    }
    static async getDeployments(namespace) {
        const params = namespace && namespace !== 'all' ? { namespace } : {};
        const response = await Api.get('/kubernetes/deployments', params);
        return response.deployments || [];
    }
    static async getStatefulSets(namespace) {
        const params = namespace && namespace !== 'all' ? { namespace } : {};
        const response = await Api.get('/kubernetes/statefulsets', params);
        return response.statefulsets || [];
    }
    static async getDaemonSets(namespace) {
        const params = namespace && namespace !== 'all' ? { namespace } : {};
        const response = await Api.get('/kubernetes/daemonsets', params);
        return response.daemonsets || [];
    }
    static async getJobs(namespace) {
        const params = namespace && namespace !== 'all' ? { namespace } : {};
        const response = await Api.get('/kubernetes/jobs', params);
        return response.jobs || [];
    }
    static async getCronJobs(namespace) {
        const params = namespace && namespace !== 'all' ? { namespace } : {};
        const response = await Api.get('/kubernetes/cronjobs', params);
        return response.cronjobs || [];
    }
    static async getServices(namespace) {
        const params = namespace && namespace !== 'all' ? { namespace } : {};
        const response = await Api.get('/kubernetes/services', params);
        return response.services || [];
    }
    static async getIngresses(namespace) {
        const params = namespace && namespace !== 'all' ? { namespace } : {};
        const response = await Api.get('/kubernetes/ingresses', params);
        return response.ingresses || [];
    }
    static async getIngressClasses() {
        const response = await Api.get('/kubernetes/ingressclasses');
        return response.ingressClasses || [];
    }
    static async getNetworkPolicies(namespace) {
        const params = namespace && namespace !== 'all' ? { namespace } : {};
        const response = await Api.get('/kubernetes/networkpolicies', params);
        return response.networkPolicies || [];
    }
    static async getCRDs() {
        const response = await Api.get('/kubernetes/customresourcedefinitions');
        return response.crds || [];
    }
    static async getPersistentVolumes() {
        const response = await Api.get('/kubernetes/persistentvolumes');
        return response.pvs || [];
    }
    static async getPersistentVolumeClaims(namespace) {
        const params = namespace && namespace !== 'all' ? { namespace } : {};
        const response = await Api.get('/kubernetes/persistentvolumeclaims', params);
        return response.pvcs || [];
    }
    static async getConfigMaps(namespace) {
        const params = namespace && namespace !== 'all' ? { namespace } : {};
        const response = await Api.get('/kubernetes/configmaps', params);
        return response.configmaps || [];
    }
    static async getSecrets(namespace) {
        const params = namespace && namespace !== 'all' ? { namespace } : {};
        const response = await Api.get('/kubernetes/secrets', params);
        return response.secrets || [];
    }
    static async getNodes() {
        const response = await Api.get('/kubernetes/nodes');
        return response.nodes || [];
    }
    static async getNodeDetails(name) {
        return Api.get(`/kubernetes/nodes/${name}`);
    }
    static async getCustomResources(apiVersion, kind, namespace) {
        const params = { apiVersion, kind };
        if (namespace && namespace !== 'all') {
            params.namespace = namespace;
        }
        const response = await Api.get('/kubernetes/customresources', params);
        return response.items || [];
    }
    static async getHelmReleases(namespace) {
        const params = namespace && namespace !== 'all' ? { namespace } : {};
        const response = await Api.get('/kubernetes/helm/releases', params);
        return response.items || [];
    }
    static async getResourceDetails(kind, name, namespace) {
        switch (kind.toLowerCase()) {
            case 'pod':
                return this.getPodDetails(namespace, name);
            case 'deployment':
                return this.getDeploymentDetails(namespace, name);
            case 'statefulset':
                return this.getStatefulSetDetails(namespace, name);
            case 'daemonset':
                return this.getDaemonSetDetails(namespace, name);
            case 'job':
                return this.getJobDetails(namespace, name);
            case 'cronjob':
                return this.getCronJobDetails(namespace, name);
            case 'service':
                return this.getServiceDetails(namespace, name);
            case 'ingress':
                return this.getIngressDetails(namespace, name);
            case 'ingressclass':
                return this.getIngressClassDetails(name);
            case 'networkpolicy':
                return this.getNetworkPolicyDetails(namespace, name);
            case 'crd':
            case 'customresourcedefinition':
                return this.getCRDDetails(name);
            case 'persistentvolumeclaim':
            case 'pvc':
                return this.getPVCDetails(namespace, name);
            case 'persistentvolume':
            case 'pv':
                return this.getPVDetails(name);
            case 'configmap':
                return this.getConfigMapDetails(namespace, name);
            case 'secret':
                return this.getSecretDetails(namespace, name);
            default:
                throw new Error(`Unsupported resource kind: ${kind}`);
        }
    }
    static async getPodDetails(namespace, name) {
        const response = await Api.get(`/kubernetes/pods/${namespace}/${name}`);
        return response.pod_detail || response;
    }
    static async getDeploymentDetails(namespace, name) {
        const response = await Api.get(`/kubernetes/deployments/${namespace}/${name}`);
        return response.deployment_detail || response;
    }
    static async getServiceDetails(namespace, name) {
        const response = await Api.get(`/kubernetes/services/${namespace}/${name}`);
        return response.service_detail || response;
    }
    static async getStatefulSetDetails(namespace, name) {
        const response = await Api.get(`/kubernetes/statefulsets/${namespace}/${name}`);
        return response.statefulset_detail || response;
    }
    static async getDaemonSetDetails(namespace, name) {
        const response = await Api.get(`/kubernetes/daemonsets/${namespace}/${name}`);
        return response.daemonset_detail || response;
    }
    static async getJobDetails(namespace, name) {
        const response = await Api.get(`/kubernetes/jobs/${namespace}/${name}`);
        return response.job_detail || response;
    }
    static async getCronJobDetails(namespace, name) {
        const response = await Api.get(`/kubernetes/cronjobs/${namespace}/${name}`);
        return response.cronjob_detail || response;
    }
    static async getIngressDetails(namespace, name) {
        const response = await Api.get(`/kubernetes/ingresses/${namespace}/${name}`);
        return response.ingress_detail || response;
    }
    static async getIngressClassDetails(name) {
        const response = await Api.get(`/kubernetes/ingressclasses/${name}`);
        return response.ingressclass_detail || response;
    }
    static async getNetworkPolicyDetails(namespace, name) {
        const response = await Api.get(`/kubernetes/networkpolicies/${namespace}/${name}`);
        return response.networkpolicy_detail || response;
    }
    static async getCRDDetails(name) {
        const response = await Api.get(`/kubernetes/customresourcedefinitions/${name}`);
        return response.crd || response;
    }
    static async getPVCDetails(namespace, name) {
        const response = await Api.get(`/kubernetes/pvcs/${namespace}/${name}`);
        return response.pvc_detail || response;
    }
    static async getPVDetails(name) {
        const response = await Api.get(`/kubernetes/pvs/${name}`);
        return response.pv_detail || response;
    }
    static async getConfigMapDetails(namespace, name) {
        const response = await Api.get(`/kubernetes/configmaps/${namespace}/${name}`);
        return response.configmap_detail || response;
    }
    static async getSecretDetails(namespace, name) {
        const response = await Api.get(`/kubernetes/secrets/${namespace}/${name}`);
        return response.secret_detail || response;
    }
    static async deleteResource(kind, name, namespace) {
        let endpoint;
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
    static async createResource(content, contentType = 'yaml') {
        const mimeType = contentType === 'json' ? 'application/json' : 'application/yaml';
        return Api.postResource('/kubernetes/resource', content, mimeType);
    }
    static async updateResource(kind, name, namespace, content, contentType = 'yaml') {
        const mimeType = contentType === 'json' ? 'application/json' : 'application/yaml';
        const endpoint = namespace
            ? `/kubernetes/resource/${kind}/${namespace}/${name}`
            : `/kubernetes/resource/${kind}/${name}`;
        return Api.postResource(endpoint, content, mimeType);
    }
    static async getPodLogs(name, namespace, container, follow = false, tailLines = 100) {
        const params = { follow, lines: tailLines };
        if (container) {
            params.container = container;
        }
        const response = await Api.get(`/kubernetes/pods/${namespace}/${name}/logs`, params);
        return response.logs || '';
    }
    static async execPod(name, namespace, container, command) {
        return Api.post(`/kubernetes/pods/${namespace}/${name}/exec`, { container, command });
    }
    static async getCRDInstances(crdName) {
        const response = await Api.get(`/kubernetes/customresourcedefinitions/${crdName}/instances`);
        if (Array.isArray(response)) {
            return response;
        }
        else if (response && typeof response === 'object') {
            if (Array.isArray(response.instances)) {
                return response.instances;
            }
            else if (Array.isArray(response.items)) {
                return response.items;
            }
            else if (Array.isArray(response.resources)) {
                return response.resources;
            }
        }
        return [];
    }
    static async getCRDInstanceDetails(crdName, instanceName, namespace) {
        const endpoint = namespace
            ? `/kubernetes/customresourcedefinitions/${crdName}/instances/${namespace}/${instanceName}`
            : `/kubernetes/customresourcedefinitions/${crdName}/instances/-/${instanceName}`;
        const response = await Api.get(endpoint);
        return response.instance || response;
    }
    static async deleteCRDInstance(crdName, instanceName, namespace) {
        const endpoint = namespace
            ? `/kubernetes/customresourcedefinitions/${crdName}/instances/${namespace}/${instanceName}`
            : `/kubernetes/customresourcedefinitions/${crdName}/instances/-/${instanceName}`;
        await Api.delete(endpoint);
    }
}
//# sourceMappingURL=kubernetes-api.js.map