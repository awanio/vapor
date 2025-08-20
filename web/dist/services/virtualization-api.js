import { getApiUrl } from '../config';
const API_BASE = '/virtualization';
export class VirtualizationAPIError extends Error {
    constructor(code, message, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'VirtualizationAPIError';
    }
}
function getAuthToken() {
    const token = localStorage.getItem('jwt_token') || localStorage.getItem('auth_token');
    if (!token) {
        throw new VirtualizationAPIError('AUTH_ERROR', 'No authentication token found');
    }
    return token;
}
async function apiRequest(endpoint, options = {}) {
    const token = getAuthToken();
    const config = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers,
        },
    };
    try {
        const url = getApiUrl(`${API_BASE}${endpoint}`);
        const response = await fetch(url, config);
        if (!response.ok) {
            const error = await response.json().catch(() => ({
                code: 'API_ERROR',
                message: response.statusText,
            }));
            throw new VirtualizationAPIError(error.code || 'API_ERROR', error.message || `Request failed: ${response.status}`, error.details);
        }
        if (response.status === 204) {
            return {};
        }
        return await response.json();
    }
    catch (error) {
        if (error instanceof VirtualizationAPIError) {
            throw error;
        }
        throw new VirtualizationAPIError('NETWORK_ERROR', error instanceof Error ? error.message : 'Network request failed');
    }
}
export class VirtualizationAPI {
    async listVMs(params) {
        const queryParams = new URLSearchParams();
        if (params?.page)
            queryParams.append('page', params.page.toString());
        if (params?.pageSize)
            queryParams.append('pageSize', params.pageSize.toString());
        if (params?.filter)
            queryParams.append('filter', params.filter);
        if (params?.sort)
            queryParams.append('sort', params.sort);
        const query = queryParams.toString();
        return apiRequest(`/virtualmachines${query ? `?${query}` : ''}`);
    }
    async getVM(id) {
        return apiRequest(`/virtualmachines/${id}`);
    }
    async createVM(config) {
        return apiRequest('/virtualmachines', {
            method: 'POST',
            body: JSON.stringify(config),
        });
    }
    async createVMEnhanced(config) {
        return apiRequest('/virtualmachines/create-enhanced', {
            method: 'POST',
            body: JSON.stringify(config),
        });
    }
    async updateVM(id, updates) {
        return apiRequest(`/virtualmachines/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
    }
    async deleteVM(id, force = false) {
        return apiRequest(`/virtualmachines/${id}${force ? '?force=true' : ''}`, { method: 'DELETE' });
    }
    async cloneVM(id, name) {
        return apiRequest(`/virtualmachines/${id}/clone`, {
            method: 'POST',
            body: JSON.stringify({ name }),
        });
    }
    async startVM(id) {
        return apiRequest(`/virtualmachines/${id}/start`, {
            method: 'POST',
        });
    }
    async stopVM(id, force = false) {
        return apiRequest(`/virtualmachines/${id}/stop`, {
            method: 'POST',
            body: JSON.stringify({ force }),
        });
    }
    async restartVM(id, force = false) {
        return apiRequest(`/virtualmachines/${id}/restart`, {
            method: 'POST',
            body: JSON.stringify({ force }),
        });
    }
    async pauseVM(id) {
        return apiRequest(`/virtualmachines/${id}/pause`, {
            method: 'POST',
        });
    }
    async resumeVM(id) {
        return apiRequest(`/virtualmachines/${id}/resume`, {
            method: 'POST',
        });
    }
    async resetVM(id) {
        return apiRequest(`/virtualmachines/${id}/reset`, {
            method: 'POST',
        });
    }
    async executeVMAction(id, action) {
        return apiRequest(`/virtualmachines/${id}/action`, {
            method: 'POST',
            body: JSON.stringify(action),
        });
    }
    async getConsoleInfo(id) {
        return apiRequest(`/virtualmachines/${id}/console`);
    }
    async createConsoleSession(id) {
        return apiRequest(`/virtualmachines/${id}/console/session`, {
            method: 'POST',
        });
    }
    async listTemplates() {
        return apiRequest('/virtualmachines/templates');
    }
    async getTemplate(id) {
        return apiRequest(`/virtualmachines/templates/${id}`);
    }
    async createFromTemplate(templateId, config) {
        return apiRequest('/virtualmachines/from-template', {
            method: 'POST',
            body: JSON.stringify({ templateId, ...config }),
        });
    }
    async createTemplate(vmId, name, description) {
        return apiRequest(`/virtualmachines/${vmId}/template`, {
            method: 'POST',
            body: JSON.stringify({ name, description }),
        });
    }
    async listSnapshots(vmId) {
        return apiRequest(`/virtualmachines/${vmId}/snapshots`);
    }
    async createSnapshot(vmId, name, description) {
        return apiRequest(`/virtualmachines/${vmId}/snapshots`, {
            method: 'POST',
            body: JSON.stringify({ name, description }),
        });
    }
    async revertToSnapshot(vmId, snapshotId) {
        return apiRequest(`/virtualmachines/${vmId}/snapshots/${snapshotId}/revert`, { method: 'POST' });
    }
    async deleteSnapshot(vmId, snapshotId) {
        return apiRequest(`/virtualmachines/${vmId}/snapshots/${snapshotId}`, { method: 'DELETE' });
    }
    async listBackups(vmId) {
        return apiRequest(`/virtualmachines/${vmId}/backups`);
    }
    async createBackup(vmId, name, type) {
        return apiRequest(`/virtualmachines/${vmId}/backups`, {
            method: 'POST',
            body: JSON.stringify({ name, type }),
        });
    }
    async restoreFromBackup(vmId, backupId) {
        return apiRequest(`/virtualmachines/${vmId}/backups/${backupId}/restore`, { method: 'POST' });
    }
    async listStoragePools() {
        return apiRequest('/storages/pools');
    }
    async getStoragePool(name) {
        return apiRequest(`/storages/pools/${name}`);
    }
    async createStoragePool(config) {
        return apiRequest('/storages/pools', {
            method: 'POST',
            body: JSON.stringify(config),
        });
    }
    async deleteStoragePool(name) {
        return apiRequest(`/storages/pools/${name}`, {
            method: 'DELETE',
        });
    }
    async startStoragePool(name) {
        return apiRequest(`/storages/pools/${name}/start`, {
            method: 'POST',
        });
    }
    async stopStoragePool(name) {
        return apiRequest(`/storages/pools/${name}/stop`, {
            method: 'POST',
        });
    }
    async setStoragePoolAutostart(name, autostart) {
        return apiRequest(`/storages/pools/${name}/autostart`, {
            method: 'PUT',
            body: JSON.stringify({ autostart }),
        });
    }
    async refreshStoragePool(name) {
        return apiRequest(`/storages/pools/${name}/refresh`, {
            method: 'POST',
        });
    }
    async listVolumes(poolName) {
        return apiRequest(`/storages/pools/${poolName}/volumes`);
    }
    async createVolume(poolName, config) {
        return apiRequest(`/storages/pools/${poolName}/volumes`, {
            method: 'POST',
            body: JSON.stringify(config),
        });
    }
    async deleteVolume(poolName, volumeName) {
        return apiRequest(`/storages/pools/${poolName}/volumes/${volumeName}`, { method: 'DELETE' });
    }
    async listISOs() {
        return apiRequest('/storages/isos');
    }
    async getISO(id) {
        return apiRequest(`/storages/isos/${id}`);
    }
    async initiateISOUpload(metadata) {
        const tusMetadata = {};
        if (metadata.filename) {
            tusMetadata.filename = btoa(metadata.filename);
        }
        if (metadata.os_type) {
            tusMetadata.os_type = btoa(metadata.os_type);
        }
        if (metadata.os_variant) {
            tusMetadata.os_variant = btoa(metadata.os_variant);
        }
        if (metadata.description) {
            tusMetadata.description = btoa(metadata.description);
        }
        if (metadata.architecture) {
            tusMetadata.architecture = btoa(metadata.architecture);
        }
        const uploadMetadata = Object.entries(tusMetadata)
            .map(([key, value]) => `${key} ${value}`)
            .join(',');
        const token = getAuthToken();
        const url = getApiUrl('/virtualization/storages/isos/upload');
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Upload-Length': metadata.size.toString(),
                'Upload-Metadata': uploadMetadata,
                'Tus-Resumable': '1.0.0',
            },
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({
                code: 'API_ERROR',
                message: response.statusText,
            }));
            throw new VirtualizationAPIError(error.code || 'API_ERROR', error.message || `Request failed: ${response.status}`, error.details);
        }
        const location = response.headers.get('Location');
        const responseData = await response.json();
        console.log('[TUS] Session created:', {
            location,
            responseData,
            originalUrl: url
        });
        let tusUploadUrl = location || responseData.upload_url;
        if (tusUploadUrl && !tusUploadUrl.startsWith('http')) {
            const fullUploadPath = tusUploadUrl.startsWith('/api/')
                ? tusUploadUrl
                : `/api/v1/virtualization/storages/isos/upload/${responseData.upload_id}`;
            const baseUrl = url.substring(0, url.indexOf('/api/'));
            tusUploadUrl = baseUrl + fullUploadPath;
        }
        console.log('[TUS] Final upload URL:', tusUploadUrl);
        return {
            uploadUrl: tusUploadUrl,
            uploadId: responseData.upload_id,
        };
    }
    async completeISOUpload(uploadId) {
        return apiRequest(`/storages/isos/upload/${uploadId}/complete`, {
            method: 'POST',
        });
    }
    async getISOUploadProgress(uploadId) {
        return apiRequest(`/storages/isos/upload/${uploadId}/progress`);
    }
    async deleteISO(id) {
        return apiRequest(`/storages/isos/${id}`, {
            method: 'DELETE',
        });
    }
    async listNetworks() {
        return apiRequest('/networks');
    }
    async getNetwork(name) {
        return apiRequest(`/networks/${name}`);
    }
    async createNetwork(config) {
        return apiRequest('/networks', {
            method: 'POST',
            body: JSON.stringify(config),
        });
    }
    async deleteNetwork(name) {
        return apiRequest(`/networks/${name}`, {
            method: 'DELETE',
        });
    }
    async startNetwork(name) {
        return apiRequest(`/networks/${name}/start`, {
            method: 'POST',
        });
    }
    async stopNetwork(name) {
        return apiRequest(`/networks/${name}/stop`, {
            method: 'POST',
        });
    }
    async getVMMetrics(vmId, duration = '1h') {
        return apiRequest(`/virtualmachines/${vmId}/metrics?duration=${duration}`);
    }
    async getHostResources() {
        return apiRequest('/host/resources');
    }
    getMetricsWebSocketUrl(vmId) {
        const token = getAuthToken();
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${protocol}//${window.location.host}${API_BASE}/virtualmachines/${vmId}/metrics/ws?token=${token}`;
    }
    async attachDisk(vmId, disk) {
        return apiRequest(`/virtualmachines/${vmId}/disks/attach`, {
            method: 'POST',
            body: JSON.stringify(disk),
        });
    }
    async detachDisk(vmId, device) {
        return apiRequest(`/virtualmachines/${vmId}/disks/${device}/detach`, {
            method: 'POST',
        });
    }
    async resizeDisk(vmId, device, newSize) {
        return apiRequest(`/virtualmachines/${vmId}/disks/${device}/resize`, {
            method: 'POST',
            body: JSON.stringify({ size: newSize }),
        });
    }
    async migrateVM(vmId, targetHost, live = true) {
        return apiRequest(`/virtualmachines/${vmId}/migrate`, {
            method: 'POST',
            body: JSON.stringify({ targetHost, live }),
        });
    }
    async getMigrationStatus(vmId) {
        return apiRequest(`/virtualmachines/${vmId}/migrate/status`);
    }
}
export const virtualizationAPI = new VirtualizationAPI();
export default virtualizationAPI;
//# sourceMappingURL=virtualization-api.js.map