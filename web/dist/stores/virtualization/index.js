import { atom, computed, map } from 'nanostores';
import { createStore } from '../utils/factory';
import { getApiUrl } from '../../config';
import { StoreEventType } from '../types';
const API_BASE = '/virtualization';
async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('jwt_token') || localStorage.getItem('auth_token');
    const url = getApiUrl(`${API_BASE}${endpoint}`);
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
            ...options.headers,
        },
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        if (errorData.status === 'error' && errorData.error) {
            throw new Error(errorData.error.message || errorData.error.details || `Request failed: ${response.status}`);
        }
        throw new Error(errorData.message || `Request failed: ${response.status}`);
    }
    const jsonData = await response.json();
    if (jsonData.status === 'success' && jsonData.data !== undefined) {
        if (endpoint.includes('/isos') && jsonData.data.isos) {
            return jsonData.data.isos;
        }
        if (endpoint.includes('/virtualmachines') && jsonData.data.vms) {
            return jsonData.data.vms;
        }
        if (endpoint.includes('/pools') && jsonData.data.pools) {
            return jsonData.data.pools;
        }
        if (endpoint.includes('/networks') && jsonData.data.networks) {
            return jsonData.data.networks;
        }
        if (endpoint.includes('/templates') && jsonData.data.templates) {
            return jsonData.data.templates;
        }
        if (jsonData.data.vm || jsonData.data.iso || jsonData.data.pool || jsonData.data.network || jsonData.data.template) {
            return (jsonData.data.vm || jsonData.data.iso || jsonData.data.pool || jsonData.data.network || jsonData.data.template);
        }
        return jsonData.data;
    }
    return jsonData;
}
export const vmStore = createStore({
    name: 'virtualization-vms',
    idField: 'id',
    endpoint: getApiUrl(`${API_BASE}/virtualmachines`),
    persistent: true,
    persistKey: 'vapor.virtualization.vms',
    debug: process.env.NODE_ENV === 'development',
    transform: (data) => ({
        ...data,
        state: (data.state?.toLowerCase() || 'unknown'),
        memory: Number(data.memory),
        vcpus: Number(data.vcpus),
        disk_size: Number(data.disk_size),
    }),
    validate: (vm) => {
        if (!vm.name)
            return { code: 'INVALID_VM', message: 'VM name is required', timestamp: Date.now() };
        if (!vm.memory || vm.memory < 512)
            return { code: 'INVALID_MEMORY', message: 'Memory must be at least 512MB', timestamp: Date.now() };
        if (!vm.vcpus || vm.vcpus < 1)
            return { code: 'INVALID_VCPUS', message: 'At least 1 vCPU required', timestamp: Date.now() };
        return true;
    },
    comparator: (a, b) => a.name.localeCompare(b.name),
});
const baseStoragePoolStore = createStore({
    name: 'virtualization-storage-pools',
    idField: 'name',
    endpoint: getApiUrl(`${API_BASE}/storages/pools`),
    persistent: false,
    debug: process.env.NODE_ENV === 'development',
    transform: (data) => ({
        ...data,
        id: data.name,
    }),
});
export const storagePoolStore = {
    ...baseStoragePoolStore,
    transform: baseStoragePoolStore.transform,
    async fetch() {
        try {
            baseStoragePoolStore.$loading.set(true);
            baseStoragePoolStore.$error.set(null);
            const response = await apiRequest('/storages/pools');
            const items = new Map();
            response.forEach(pool => {
                const transformed = storagePoolStore.transform ?
                    storagePoolStore.transform(pool) :
                    { ...pool, id: pool.name };
                items.set(pool.name, transformed);
            });
            baseStoragePoolStore.$items.set(items);
            baseStoragePoolStore.emit({
                type: StoreEventType.FETCHED,
                payload: response,
                timestamp: Date.now(),
            });
        }
        catch (error) {
            const storeError = {
                code: 'FETCH_ERROR',
                message: error instanceof Error ? error.message : 'Failed to fetch storage pools',
                timestamp: Date.now(),
            };
            baseStoragePoolStore.$error.set(storeError);
            baseStoragePoolStore.emit({
                type: StoreEventType.ERROR,
                payload: storeError,
                timestamp: Date.now(),
            });
            throw error;
        }
        finally {
            baseStoragePoolStore.$loading.set(false);
        }
    },
};
const baseIsoStore = createStore({
    name: 'virtualization-isos',
    idField: 'id',
    endpoint: getApiUrl(`${API_BASE}/storages/isos`),
    persistent: true,
    persistKey: 'vapor.virtualization.isos',
    debug: process.env.NODE_ENV === 'development',
});
function transformISOResponse(apiIso) {
    return {
        id: apiIso.image_id || apiIso.id,
        name: apiIso.filename || apiIso.name,
        path: apiIso.path,
        size: apiIso.size_bytes || apiIso.size || 0,
        os_type: apiIso.os_type,
        os_variant: apiIso.os_variant,
        architecture: apiIso.architecture,
        uploaded_at: apiIso.created_at || apiIso.uploaded_at,
        checksum: apiIso.checksum,
        storage_pool: apiIso.storage_pool || 'default',
    };
}
export const isoStore = {
    ...baseIsoStore,
    async fetch() {
        try {
            baseIsoStore.$loading.set(true);
            baseIsoStore.$error.set(null);
            const response = await apiRequest('/virtualmachines/isos');
            let isos = [];
            if (Array.isArray(response)) {
                isos = response.map(transformISOResponse);
            }
            else if (response && typeof response === 'object') {
                if (response.data && response.data.isos && Array.isArray(response.data.isos)) {
                    isos = response.data.isos.map(transformISOResponse);
                }
                else if (response.data && Array.isArray(response.data)) {
                    isos = response.data.map(transformISOResponse);
                }
                else if (response.isos && Array.isArray(response.isos)) {
                    isos = response.isos.map(transformISOResponse);
                }
                else {
                    console.warn('Unexpected ISO list response format:', response);
                }
            }
            const items = new Map();
            isos.forEach(iso => {
                items.set(iso.id, iso);
            });
            baseIsoStore.$items.set(items);
            baseIsoStore.emit({
                type: StoreEventType.FETCHED,
                payload: isos,
                timestamp: Date.now(),
            });
        }
        catch (error) {
            const storeError = {
                code: 'FETCH_ERROR',
                message: error instanceof Error ? error.message : 'Failed to fetch ISOs',
                timestamp: Date.now(),
            };
            baseIsoStore.$error.set(storeError);
            baseIsoStore.emit({
                type: StoreEventType.ERROR,
                payload: storeError,
                timestamp: Date.now(),
            });
            throw error;
        }
        finally {
            baseIsoStore.$loading.set(false);
        }
    },
};
export const templateStore = createStore({
    name: 'virtualization-templates',
    idField: 'id',
    endpoint: getApiUrl(`${API_BASE}/virtualmachines/templates`),
    persistent: true,
    persistKey: 'vapor.virtualization.templates',
    debug: process.env.NODE_ENV === 'development',
});
export const networkStore = createStore({
    name: 'virtualization-networks',
    idField: 'name',
    endpoint: getApiUrl(`${API_BASE}/networks`),
    persistent: false,
    debug: process.env.NODE_ENV === 'development',
    transform: (data) => ({
        ...data,
        id: data.name,
    }),
});
export const $selectedVMId = atom(null);
export const $vmWizardState = atom({
    isOpen: false,
    currentStep: 1,
    formData: {},
    errors: {},
});
export const $isoUploadState = atom({
    isUploading: false,
    uploadProgress: 0,
    uploadId: null,
    error: null,
});
export const $consoleConnections = map({});
export const $activeVMTab = atom('all');
export const $vmSearchQuery = atom('');
export const $vmFilterState = atom({});
export const $selectedVM = computed([$selectedVMId, vmStore.$items], (id, vms) => {
    if (!id || !vms)
        return null;
    if (vms instanceof Map) {
        return vms.get(id) || null;
    }
    else if (typeof vms === 'object') {
        return vms[id] || null;
    }
    return null;
});
export const $vmsByState = computed([vmStore.$items], (vms) => {
    const grouped = {
        running: [],
        stopped: [],
        paused: [],
        suspended: [],
        unknown: [],
    };
    if (!vms)
        return grouped;
    let vmArray;
    if (vms instanceof Map) {
        vmArray = Array.from(vms.values());
    }
    else if (typeof vms === 'object') {
        vmArray = Object.values(vms);
    }
    else {
        return grouped;
    }
    vmArray.forEach(vm => {
        const state = vm.state || 'unknown';
        if (grouped[state]) {
            grouped[state].push(vm);
        }
        else {
            grouped.unknown?.push(vm);
        }
    });
    return grouped;
});
export const $filteredVMs = computed([vmStore.$items, $vmSearchQuery, $vmFilterState, $activeVMTab], (vms, searchQuery, filters, activeTab) => {
    if (!vms)
        return [];
    let vmArray;
    if (vms instanceof Map) {
        vmArray = Array.from(vms.values());
    }
    else if (typeof vms === 'object') {
        vmArray = Object.values(vms);
    }
    else {
        return [];
    }
    if (activeTab !== 'all' && activeTab !== 'templates') {
        vmArray = vmArray.filter(vm => vm.state === activeTab);
    }
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        vmArray = vmArray.filter(vm => vm.name.toLowerCase().includes(query) ||
            vm.os_type?.toLowerCase().includes(query) ||
            vm.state.toLowerCase().includes(query));
    }
    if (filters?.state && filters.state.length > 0) {
        vmArray = vmArray.filter(vm => filters.state.includes(vm.state));
    }
    if (filters?.os_type && filters.os_type.length > 0) {
        vmArray = vmArray.filter(vm => filters.os_type.includes(vm.os_type));
    }
    return vmArray;
});
export const $resourceStats = computed([vmStore.$items], (vms) => {
    if (!vms) {
        return {
            totalVMs: 0,
            runningVMs: 0,
            stoppedVMs: 0,
            pausedVMs: 0,
            totalMemory: 0,
            totalVCPUs: 0,
            totalDiskSize: 0,
        };
    }
    let vmArray;
    if (vms instanceof Map) {
        vmArray = Array.from(vms.values());
    }
    else if (typeof vms === 'object') {
        vmArray = Object.values(vms);
    }
    else {
        return {
            totalVMs: 0,
            runningVMs: 0,
            stoppedVMs: 0,
            pausedVMs: 0,
            totalMemory: 0,
            totalVCPUs: 0,
            totalDiskSize: 0,
        };
    }
    return {
        totalVMs: vmArray.length,
        runningVMs: vmArray.filter(vm => vm.state === 'running').length,
        stoppedVMs: vmArray.filter(vm => vm.state === 'stopped').length,
        pausedVMs: vmArray.filter(vm => vm.state === 'paused').length,
        totalMemory: vmArray.reduce((sum, vm) => sum + (vm.memory || 0), 0),
        totalVCPUs: vmArray.reduce((sum, vm) => sum + (vm.vcpus || 0), 0),
        totalDiskSize: vmArray.reduce((sum, vm) => sum + (vm.disk_size || 0), 0),
    };
});
export const $availableStoragePools = computed([storagePoolStore.$items], (pools) => {
    if (!pools)
        return [];
    let poolsArray;
    if (pools instanceof Map) {
        poolsArray = Array.from(pools.values());
    }
    else if (typeof pools === 'object') {
        poolsArray = Object.values(pools);
    }
    else {
        return [];
    }
    return poolsArray.filter(pool => pool.state === 'active' && pool.available > 1073741824);
});
export const $availableISOs = computed([isoStore.$items], (isos) => {
    if (!isos)
        return [];
    let isosArray;
    if (isos instanceof Map) {
        isosArray = Array.from(isos.values());
    }
    else if (typeof isos === 'object') {
        isosArray = Object.values(isos);
    }
    else {
        return [];
    }
    return isosArray.sort((a, b) => a.name.localeCompare(b.name));
});
export const vmActions = {
    async fetchAll() {
        await vmStore.fetch();
    },
    async create(vmData) {
        const response = await apiRequest('/virtualmachines/create-enhanced', {
            method: 'POST',
            body: JSON.stringify(vmData),
        });
        const items = new Map(vmStore.$items.get());
        items.set(response.id, response);
        vmStore.$items.set(items);
        $selectedVMId.set(response.id);
        return { success: true, data: response };
    },
    async start(vmId) {
        await apiRequest(`/virtualmachines/${vmId}/start`, { method: 'POST' });
        const vm = vmStore.getById(vmId);
        if (vm) {
            await vmStore.update(vmId, { state: 'running' });
        }
    },
    async stop(vmId, force = false) {
        await apiRequest(`/virtualmachines/${vmId}/stop`, {
            method: 'POST',
            body: JSON.stringify({ force }),
        });
        const vm = vmStore.getById(vmId);
        if (vm) {
            await vmStore.update(vmId, { state: 'stopped' });
        }
    },
    async restart(vmId) {
        await apiRequest(`/virtualmachines/${vmId}/restart`, { method: 'POST' });
    },
    async pause(vmId) {
        await apiRequest(`/virtualmachines/${vmId}/pause`, { method: 'POST' });
        const vm = vmStore.getById(vmId);
        if (vm) {
            await vmStore.update(vmId, { state: 'paused' });
        }
    },
    async resume(vmId) {
        await apiRequest(`/virtualmachines/${vmId}/resume`, { method: 'POST' });
        const vm = vmStore.getById(vmId);
        if (vm) {
            await vmStore.update(vmId, { state: 'running' });
        }
    },
    async delete(vmId) {
        await apiRequest(`/virtualmachines/${vmId}`, { method: 'DELETE' });
        await vmStore.delete(vmId);
        if ($selectedVMId.get() === vmId) {
            $selectedVMId.set(null);
        }
    },
    async getConsoleInfo(vmId) {
        return apiRequest(`/virtualmachines/${vmId}/console`);
    },
    selectVM(vmId) {
        $selectedVMId.set(vmId);
    },
};
export const wizardActions = {
    openWizard() {
        $vmWizardState.set({
            isOpen: true,
            currentStep: 1,
            formData: {
                memory: 2048,
                vcpus: 2,
                storage: {
                    default_pool: 'default',
                    disks: [{ action: 'create', size: 20, format: 'qcow2' }],
                },
            },
            errors: {},
        });
    },
    closeWizard() {
        $vmWizardState.set({
            isOpen: false,
            currentStep: 1,
            formData: {},
            errors: {},
        });
    },
    nextStep() {
        const state = $vmWizardState.get();
        if (state.currentStep < 4) {
            $vmWizardState.set({ ...state, currentStep: state.currentStep + 1 });
        }
    },
    previousStep() {
        const state = $vmWizardState.get();
        if (state.currentStep > 1) {
            $vmWizardState.set({ ...state, currentStep: state.currentStep - 1 });
        }
    },
    updateFormData(updates) {
        const state = $vmWizardState.get();
        $vmWizardState.set({
            ...state,
            formData: { ...state.formData, ...updates },
        });
    },
    setError(field, error) {
        const state = $vmWizardState.get();
        $vmWizardState.set({
            ...state,
            errors: { ...state.errors, [field]: error },
        });
    },
    clearErrors() {
        const state = $vmWizardState.get();
        $vmWizardState.set({ ...state, errors: {} });
    },
    validateStep(step) {
        const { formData } = $vmWizardState.get();
        switch (step) {
            case 1:
                return !!(formData.name && formData.memory && formData.vcpus);
            case 2:
                return !!(formData.storage?.default_pool && formData.storage?.disks?.length);
            case 3:
                return true;
            case 4:
                return true;
            default:
                return false;
        }
    },
};
export const storageActions = {
    async fetchPools() {
        await storagePoolStore.fetch();
    },
    async fetchISOs() {
        await isoStore.fetch();
    },
    async uploadISO(_file, _metadata) {
        $isoUploadState.set({
            isUploading: true,
            uploadProgress: 0,
            uploadId: crypto.randomUUID(),
            error: null,
        });
        return new Promise((resolve) => {
            const interval = setInterval(() => {
                const state = $isoUploadState.get();
                const newProgress = Math.min(state.uploadProgress + 10, 100);
                $isoUploadState.set({
                    ...state,
                    uploadProgress: newProgress,
                });
                if (newProgress >= 100) {
                    clearInterval(interval);
                    $isoUploadState.set({
                        isUploading: false,
                        uploadProgress: 0,
                        uploadId: null,
                        error: null,
                    });
                    resolve({ success: true });
                }
            }, 500);
        });
    },
    async deleteISO(isoId) {
        await apiRequest(`/storages/isos/${isoId}`, { method: 'DELETE' });
        await isoStore.delete(isoId);
    },
};
export async function initializeVirtualizationStores() {
    try {
        await Promise.all([
            vmStore.fetch(),
            storagePoolStore.fetch(),
            isoStore.fetch(),
            templateStore.fetch(),
            networkStore.fetch(),
        ]);
    }
    catch (error) {
        console.error('Failed to initialize virtualization stores:', error);
    }
}
export function cleanupVirtualizationStores() {
    vmStore.clear();
    storagePoolStore.clear();
    isoStore.clear();
    templateStore.clear();
    networkStore.clear();
    $selectedVMId.set(null);
    $vmWizardState.set({
        isOpen: false,
        currentStep: 1,
        formData: {},
        errors: {},
    });
    $consoleConnections.set({});
    $activeVMTab.set('all');
    $vmSearchQuery.set('');
    $vmFilterState.set({});
}
export function connectVMStatusWebSocket() {
    const token = localStorage.getItem('auth_token');
    const ws = new WebSocket(`ws://localhost:8080/api/v1/ws/virtualization/vms?token=${token}`);
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'vm-state-change') {
            const vm = vmStore.getById(data.vm_id);
            if (vm) {
                vmStore.update(data.vm_id, { state: data.new_state });
            }
        }
    };
    ws.onerror = (error) => {
        console.error('VM WebSocket error:', error);
    };
    return ws;
}
export default {
    vmStore,
    storagePoolStore,
    isoStore,
    templateStore,
    networkStore,
    $selectedVMId,
    $vmWizardState,
    $isoUploadState,
    $consoleConnections,
    $activeVMTab,
    $vmSearchQuery,
    $vmFilterState,
    $selectedVM,
    $vmsByState,
    $filteredVMs,
    $resourceStats,
    $availableStoragePools,
    $availableISOs,
    vmActions,
    wizardActions,
    storageActions,
    initializeVirtualizationStores,
    cleanupVirtualizationStores,
    connectVMStatusWebSocket,
};
//# sourceMappingURL=index.js.map