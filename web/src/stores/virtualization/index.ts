/**
 * Virtualization Store - State management for virtualization module
 */

import { atom, computed, map } from 'nanostores';
import { createStore } from '../utils/factory';
import { getApiUrl } from '../../config';
import { StoreEventType } from '../types';
import type { 
  VirtualMachine, 
  StoragePool,
  StoragePoolState, 
  ISOImage, 
  VMTemplate,
  VMCreateRequest,
  VMState,
  ConsoleInfo,
  VirtualNetwork
} from '../../types/virtualization';

// ============ API Client Helper ============
const API_BASE = '/virtualization';

async function apiRequest<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  // Check for jwt_token (used by auth.ts) or auth_token (legacy)
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
    // Handle new error format with status and error fields
    if (errorData.status === 'error' && errorData.error) {
      throw new Error(errorData.error.message || errorData.error.details || `Request failed: ${response.status}`);
    }
    throw new Error(errorData.message || `Request failed: ${response.status}`);
  }
  
  const jsonData = await response.json();
  
  // Handle new response format with status and data fields
  if (jsonData.status === 'success' && jsonData.data !== undefined) {
    // Extract the actual data based on the endpoint
    if (endpoint.includes('/isos') && jsonData.data.isos) {
      return jsonData.data.isos as T;
    }
    if ((endpoint.includes('/virtualmachines') || endpoint.includes('/computes')) && jsonData.data.vms) {
      return jsonData.data.vms as T;
    }
    if (endpoint.includes('/pools') && jsonData.data.pools) {
      return jsonData.data.pools as T;
    }
    if (endpoint.includes('/networks') && jsonData.data.networks) {
      return jsonData.data.networks as T;
    }
    if (endpoint.includes('/templates') && jsonData.data.templates) {
      return jsonData.data.templates as T;
    }
    // For single object responses
    if (jsonData.data.vm || jsonData.data.iso || jsonData.data.pool || jsonData.data.network || jsonData.data.template) {
      return (jsonData.data.vm || jsonData.data.iso || jsonData.data.pool || jsonData.data.network || jsonData.data.template) as T;
    }
    // Fallback to returning the data directly
    return jsonData.data as T;
  }
  
  // Fallback for old format or other responses
  return jsonData as T;
}

// ============ VM Store ============
const baseVmStore = createStore<VirtualMachine>({
  name: 'virtualization-vms',
  idField: 'id',
  endpoint: getApiUrl(`${API_BASE}/computes`),
  persistent: true,
  persistKey: 'vapor.virtualization.vms',
  debug: process.env.NODE_ENV === 'development',
  transform: (data: any) => ({
    ...data,
    // Ensure consistent state values
    state: (data.state?.toLowerCase() || 'unknown') as VMState,
    memory: Number(data.memory),
    vcpus: Number(data.vcpus),
    disk_size: Number(data.disk_size),
  }),
  validate: (vm) => {
    if (!vm.name) return { code: 'INVALID_VM', message: 'VM name is required', timestamp: Date.now() };
    if (!vm.memory || vm.memory < 512) return { code: 'INVALID_MEMORY', message: 'Memory must be at least 512MB', timestamp: Date.now() };
    if (!vm.vcpus || vm.vcpus < 1) return { code: 'INVALID_VCPUS', message: 'At least 1 vCPU required', timestamp: Date.now() };
    return true;
  },
  comparator: (a, b) => a.name.localeCompare(b.name),
});

// Transform function to map API response fields to VirtualMachine interface
function transformVMResponse(apiVm: any): VirtualMachine {
  // Map VM state from API to our VMState type
  const mapVMState = (state: string): VMState => {
    const stateMap: Record<string, VMState> = {
      'shutoff': 'stopped',
      'running': 'running',
      'paused': 'paused',
      'suspended': 'suspended',
      'pmsuspended': 'suspended',
      'crashed': 'stopped',
      'dying': 'stopped',
    };
    return stateMap[state.toLowerCase()] || 'unknown';
  };

  return {
    id: apiVm.uuid || apiVm.id,
    name: apiVm.name,
    state: mapVMState(apiVm.state),
    memory: Math.floor((apiVm.memory || 0) / 1024), // Convert from KB to MB
    vcpus: apiVm.vcpus || apiVm.max_vcpus || 0,
    disk_size: 0, // Will be populated from disks if available
    os_type: apiVm.os?.type || 'hvm',
    os_variant: apiVm.os?.machine || undefined,
    created_at: apiVm.created_at,
    updated_at: apiVm.updated_at,
    graphics: apiVm.graphics,
    disks: apiVm.disks,
    network_interfaces: apiVm.networks,
    metadata: {
      architecture: apiVm.os?.architecture || 'x86_64',
      autostart: String(apiVm.autostart || false),
      persistent: String(apiVm.persistent || true),
      max_memory: String(apiVm.max_memory || apiVm.memory),
      max_vcpus: String(apiVm.max_vcpus || apiVm.vcpus),
    },
  };
}

// Extend the VM store with proper fetch implementation
export const vmStore = {
  ...baseVmStore,
  async fetch(): Promise<void> {
    try {
      baseVmStore.$loading.set(true);
      baseVmStore.$error.set(null);
      
      // Make the actual API request to /computes endpoint
      const response = await apiRequest<any>('/computes');
      
      // Handle the response structure from /computes
      let vms: VirtualMachine[] = [];
      
      if (response && typeof response === 'object') {
        // Check for the expected structure: { data: { vms: [...], count: number } }
        if (response.data && response.data.vms && Array.isArray(response.data.vms)) {
          vms = response.data.vms.map(transformVMResponse);
        }
        // Check for direct vms array in response
        else if (response.vms && Array.isArray(response.vms)) {
          vms = response.vms.map(transformVMResponse);
        }
        // Check if response is directly an array
        else if (Array.isArray(response)) {
          vms = response.map(transformVMResponse);
        } else {
          console.warn('Unexpected VM list response format:', response);
        }
      }
      
      // Update the store with fetched data
      const items = new Map<string, VirtualMachine>();
      vms.forEach(vm => {
        items.set(vm.id, vm);
      });
      baseVmStore.$items.set(items);
      
      baseVmStore.emit({
        type: StoreEventType.BATCH_UPDATED,
        payload: vms as any,
        timestamp: Date.now(),
      });
      
      console.log(`Fetched ${vms.length} VMs from /computes endpoint`);
    } catch (error) {
      const storeError = {
        code: 'FETCH_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch VMs',
        timestamp: Date.now(),
      };
      baseVmStore.$error.set(storeError);
      baseVmStore.emit({
        type: StoreEventType.ERROR,
        payload: storeError as any,
        timestamp: Date.now(),
      });
      throw error;
    } finally {
      baseVmStore.$loading.set(false);
    }
  },
  
  // Keep the original getById, update, delete methods from baseVmStore
  getById: baseVmStore.getById.bind(baseVmStore),
  update: baseVmStore.update.bind(baseVmStore),
  delete: baseVmStore.delete.bind(baseVmStore),
  clear: baseVmStore.clear.bind(baseVmStore),
  emit: baseVmStore.emit.bind(baseVmStore),
  
  // Expose the store atoms
  $items: baseVmStore.$items,
  $loading: baseVmStore.$loading,
  $error: baseVmStore.$error,
};

// ============ Storage Pool Store ============
const baseStoragePoolStore = createStore<StoragePool & { id: string }>({
  name: 'virtualization-storage-pools',
  idField: 'name',
  endpoint: getApiUrl(`${API_BASE}/storages/pools`),
  persistent: false, // Storage pools are dynamic
  debug: process.env.NODE_ENV === 'development',
  transform: (data: any) => ({
    ...data,
    id: data.name, // Use name as id to satisfy BaseEntity constraint
  }),
});

// Transform function for storage pools
const transformStoragePool = (data: any): StoragePool & { id: string } => ({
  ...data,
  id: data.name, // Use name as id to satisfy BaseEntity constraint
});

// Extend the storage pool store with proper fetch implementation
export const storagePoolStore = {
  ...baseStoragePoolStore,
  async fetch(): Promise<void> {
    try {
      baseStoragePoolStore.$loading.set(true);
      baseStoragePoolStore.$error.set(null);
      
      // Make the actual API request
      const response = await apiRequest<StoragePool[]>('/storages/pools');
      
      // Transform and update the store with fetched data
      const items = new Map<string, StoragePool & { id: string }>();
      response.forEach(pool => {
        const transformed = transformStoragePool(pool);
        items.set(pool.name, transformed);
      });
      baseStoragePoolStore.$items.set(items);
      
      baseStoragePoolStore.emit({
        type: StoreEventType.BATCH_UPDATED,
        payload: Array.from(items.values()) as any,
        timestamp: Date.now(),
      });
    } catch (error) {
      const storeError = {
        code: 'FETCH_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch storage pools',
        timestamp: Date.now(),
      };
      baseStoragePoolStore.$error.set(storeError);
      baseStoragePoolStore.emit({
        type: StoreEventType.ERROR,
        payload: storeError as any,
        timestamp: Date.now(),
      });
      throw error;
    } finally {
      baseStoragePoolStore.$loading.set(false);
    }
  },
};

// ============ ISO Store ============
const baseIsoStore = createStore<ISOImage>({
  name: 'virtualization-isos',
  idField: 'id',
  endpoint: getApiUrl(`${API_BASE}/isos`),
  persistent: true,
  persistKey: 'vapor.virtualization.isos',
  debug: process.env.NODE_ENV === 'development',
});

// Transform function to map API response fields to ISOImage interface
function transformISOResponse(apiIso: any): ISOImage {
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

// Extend the ISO store with proper fetch implementation
export const isoStore = {
  ...baseIsoStore,
  async fetch(): Promise<void> {
    try {
      baseIsoStore.$loading.set(true);
      baseIsoStore.$error.set(null);
      
      // Make the actual API request
      const response = await apiRequest<any>('/isos');
      
      // Handle different response structures
      let isos: ISOImage[] = [];
      
      if (Array.isArray(response)) {
        // Direct array response
        isos = response.map(transformISOResponse);
      } else if (response && typeof response === 'object') {
        // Check for nested data.isos structure (as shown in the example)
        if (response.data && response.data.isos && Array.isArray(response.data.isos)) {
          isos = response.data.isos.map(transformISOResponse);
        } 
        // Check for data array structure
        else if (response.data && Array.isArray(response.data)) {
          isos = response.data.map(transformISOResponse);
        }
        // Check for direct isos array in response
        else if (response.isos && Array.isArray(response.isos)) {
          isos = response.isos.map(transformISOResponse);
        } else {
          console.warn('Unexpected ISO list response format:', response);
        }
      }
      
      // Update the store with fetched data
      const items = new Map<string, ISOImage>();
      isos.forEach(iso => {
        items.set(iso.id, iso);
      });
      baseIsoStore.$items.set(items);
      
      baseIsoStore.emit({
        type: StoreEventType.BATCH_UPDATED,
        payload: isos as any,
        timestamp: Date.now(),
      });
    } catch (error) {
      const storeError = {
        code: 'FETCH_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch ISOs',
        timestamp: Date.now(),
      };
      baseIsoStore.$error.set(storeError);
      baseIsoStore.emit({
        type: StoreEventType.ERROR,
        payload: storeError as any,
        timestamp: Date.now(),
      });
      throw error;
    } finally {
      baseIsoStore.$loading.set(false);
    }
  },
};

// ============ Templates Store ============
const baseTemplateStore = createStore<VMTemplate>({
  name: 'virtualization-templates',
  idField: 'id',
  endpoint: getApiUrl(`${API_BASE}/computes/templates`),
  persistent: true,
  persistKey: 'vapor.virtualization.templates',
  debug: process.env.NODE_ENV === 'development',
});

// Transform function to map API response fields to VMTemplate interface
function transformTemplateResponse(apiTemplate: any): VMTemplate {
  return {
    id: apiTemplate.id || apiTemplate.uuid,
    name: apiTemplate.name,
    description: apiTemplate.description,
    os_type: apiTemplate.os_type || apiTemplate.os?.type || 'unknown',
    os_variant: apiTemplate.os_variant || apiTemplate.os?.variant,
    memory: Math.floor((apiTemplate.memory || 0) / 1024), // Convert from KB to MB if needed
    vcpus: apiTemplate.vcpus || 1,
    disk_size: apiTemplate.disk_size || 20,
    network_type: apiTemplate.network_type || 'bridge',
    graphics_type: apiTemplate.graphics_type || 'vnc',
    created_at: apiTemplate.created_at,
    tags: apiTemplate.tags || [],
  };
}

// Extend the template store with proper fetch implementation
export const templateStore = {
  ...baseTemplateStore,
  async fetch(): Promise<void> {
    try {
      baseTemplateStore.$loading.set(true);
      baseTemplateStore.$error.set(null);
      
      // Make the actual API request to /computes/templates endpoint
      const response = await apiRequest<any>('/computes/templates');
      
      // Handle the response structure
      let templates: VMTemplate[] = [];
      
      if (response && typeof response === 'object') {
        // Check for the expected structure: { data: { templates: [...] } }
        if (response.data && response.data.templates && Array.isArray(response.data.templates)) {
          templates = response.data.templates.map(transformTemplateResponse);
        }
        // Check for direct templates array in response
        else if (response.templates && Array.isArray(response.templates)) {
          templates = response.templates.map(transformTemplateResponse);
        }
        // Check if response is directly an array
        else if (Array.isArray(response)) {
          templates = response.map(transformTemplateResponse);
        } else {
          console.warn('Unexpected template list response format:', response);
        }
      }
      
      // Update the store with fetched data
      const items = new Map<string, VMTemplate>();
      templates.forEach(template => {
        items.set(template.id, template);
      });
      baseTemplateStore.$items.set(items);
      
      baseTemplateStore.emit({
        type: StoreEventType.BATCH_UPDATED,
        payload: templates as any,
        timestamp: Date.now(),
      });
      
      console.log(`Fetched ${templates.length} templates from /computes/templates endpoint`);
    } catch (error) {
      const storeError = {
        code: 'FETCH_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch templates',
        timestamp: Date.now(),
      };
      baseTemplateStore.$error.set(storeError);
      baseTemplateStore.emit({
        type: StoreEventType.ERROR,
        payload: storeError as any,
        timestamp: Date.now(),
      });
      throw error;
    } finally {
      baseTemplateStore.$loading.set(false);
    }
  },
  
  // Keep the original methods from baseTemplateStore
  getById: baseTemplateStore.getById.bind(baseTemplateStore),
  update: baseTemplateStore.update.bind(baseTemplateStore),
  delete: baseTemplateStore.delete.bind(baseTemplateStore),
  clear: baseTemplateStore.clear.bind(baseTemplateStore),
  emit: baseTemplateStore.emit.bind(baseTemplateStore),
  
  // Expose the store atoms
  $items: baseTemplateStore.$items,
  $loading: baseTemplateStore.$loading,
  $error: baseTemplateStore.$error,
};

// ============ Virtual Networks Store ============
export const networkStore = createStore<VirtualNetwork & { id: string }>({
  name: 'virtualization-networks',
  idField: 'name',
  endpoint: getApiUrl(`${API_BASE}/networks`),
  persistent: false,
  debug: process.env.NODE_ENV === 'development',
  transform: (data: any) => ({
    ...data,
    id: data.name, // Use name as id to satisfy BaseEntity constraint
  }),
});

// ============ UI State Atoms ============

// Currently selected VM for details view
export const $selectedVMId = atom<string | null>(null);

// VM creation wizard state
export const $vmWizardState = atom<{
  isOpen: boolean;
  currentStep: number;
  formData: Partial<VMCreateRequest>;
  errors: Record<string, string>;
}>({
  isOpen: false,
  currentStep: 1,
  formData: {},
  errors: {},
});

// ISO upload state
export const $isoUploadState = atom<{
  isUploading: boolean;
  uploadProgress: number;
  uploadId: string | null;
  error: string | null;
}>({
  isUploading: false,
  uploadProgress: 0,
  uploadId: null,
  error: null,
});

// Console connection state
export const $consoleConnections = map<Record<string, {
  vmId: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  type: 'vnc' | 'spice';
  token: string;
  wsUrl: string;
}>>({});

// Active tab in VM list view
export const $activeVMTab = atom<'all' | 'running' | 'stopped' | 'templates'>('all');

// Search query for VM filtering
export const $vmSearchQuery = atom<string>('');

// VM list filter state
export const $vmFilterState = atom<{
  state?: VMState[];
  os_type?: string[];
}>({});

// ============ Storage Pool UI State ============

// Active tab in storage pool list view
export const $activeStoragePoolTab = atom<'all' | 'active' | 'inactive' | 'local' | 'network'>('all');

// Search query for storage pool filtering
export const $storagePoolSearchQuery = atom<string>('');

// Currently selected storage pool for details view
export const $selectedStoragePoolId = atom<string | null>(null);

// Storage pool list filter state
export const $storagePoolFilterState = atom<{
  type?: string[];
  state?: StoragePoolState[];
}>({});

// ============ Network UI State ============

// Active tab in network list view
export const $activeNetworkTab = atom<'all' | 'active' | 'inactive' | 'persistent' | 'autostart'>('all');

// Search query for network filtering
export const $networkSearchQuery = atom<string>('');

// Currently selected network for details view
export const $selectedNetworkId = atom<string | null>(null);

// Network list filter state
export const $networkFilterState = atom<{
  type?: string[];
  state?: ('active' | 'inactive')[];
}>({});

// ============ ISO UI State ============

// Search query for ISO filtering
export const $isoSearchQuery = atom<string>('');

// Currently selected ISO for details view
export const $selectedISOId = atom<string | null>(null);

// ISO list filter state
export const $isoFilterState = atom<{
  os_type?: string[];
  storage_pool?: string[];
}>({});

// ============ Computed Atoms ============

// Get selected VM details
export const $selectedVM = computed(
  [$selectedVMId, vmStore.$items],
  (id, vms) => {
    if (!id || !vms) return null;
    
    // Handle both Map and plain object cases
    if (vms instanceof Map) {
      return vms.get(id) || null;
    } else if (typeof vms === 'object') {
      return vms[id] || null;
    }
    
    return null;
  }
);

// VMs grouped by state
export const $vmsByState = computed(
  [vmStore.$items],
  (vms) => {
    const grouped: Record<string, VirtualMachine[]> = {
      running: [],
      stopped: [],
      paused: [],
      suspended: [],
      unknown: [],
    };
    
    if (!vms) return grouped;
    
    // Handle both Map and plain object cases
    let vmArray: VirtualMachine[];
    if (vms instanceof Map) {
      vmArray = Array.from(vms.values());
    } else if (typeof vms === 'object') {
      // If it's a plain object (from persistence), convert to array
      vmArray = Object.values(vms);
    } else {
      return grouped;
    }
    
    vmArray.forEach(vm => {
      const state = vm.state || 'unknown';
      if (grouped[state]) {
        grouped[state].push(vm);
      } else {
        grouped.unknown?.push(vm);
      }
    });
    
    return grouped;
  }
);

// Filtered VMs based on search and filters
export const $filteredVMs = computed(
  [vmStore.$items, $vmSearchQuery, $vmFilterState, $activeVMTab],
  (vms, searchQuery, filters, activeTab) => {
    if (!vms) return [];
    
    // Handle both Map and plain object cases
    let vmArray: VirtualMachine[];
    if (vms instanceof Map) {
      vmArray = Array.from(vms.values());
    } else if (typeof vms === 'object') {
      // If it's a plain object (from persistence), convert to array
      vmArray = Object.values(vms);
    } else {
      return [];
    }
    
    // Filter by tab
    if (activeTab !== 'all' && activeTab !== 'templates') {
      vmArray = vmArray.filter(vm => vm.state === activeTab);
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      vmArray = vmArray.filter(vm =>
        vm.name.toLowerCase().includes(query) ||
        vm.os_type?.toLowerCase().includes(query) ||
        vm.state.toLowerCase().includes(query)
      );
    }
    
    // Apply additional filters
    if (filters?.state && filters.state.length > 0) {
      vmArray = vmArray.filter(vm => filters.state!.includes(vm.state));
    }
    
    if (filters?.os_type && filters.os_type.length > 0) {
      vmArray = vmArray.filter(vm => filters.os_type!.includes(vm.os_type));
    }
    
    return vmArray;
  }
);

// Resource usage statistics
export const $resourceStats = computed(
  [vmStore.$items],
  (vms) => {
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
    
    // Handle both Map and plain object cases
    let vmArray: VirtualMachine[];
    if (vms instanceof Map) {
      vmArray = Array.from(vms.values());
    } else if (typeof vms === 'object') {
      // If it's a plain object (from persistence), convert to array
      vmArray = Object.values(vms);
    } else {
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
  }
);

// Available storage pools with sufficient space
export const $availableStoragePools = computed(
  [storagePoolStore.$items],
  (pools) => {
    if (!pools) return [];
    
    // Handle both Map and plain object cases
    let poolsArray: (StoragePool & { id: string })[];
    if (pools instanceof Map) {
      poolsArray = Array.from(pools.values());
    } else if (typeof pools === 'object') {
      poolsArray = Object.values(pools);
    } else {
      return [];
    }
    
    return poolsArray.filter(pool => 
      (pool.state === 'active' || pool.state === 'running') && pool.available > 1073741824 // > 1GB
    );
  }
);

// Get selected storage pool details
export const $selectedStoragePool = computed(
  [$selectedStoragePoolId, storagePoolStore.$items],
  (id, pools) => {
    if (!id || !pools) return null;
    
    // Handle both Map and plain object cases
    if (pools instanceof Map) {
      return pools.get(id) || null;
    } else if (typeof pools === 'object') {
      return pools[id] || null;
    }
    
    return null;
  }
);

// Filtered storage pools based on search and filters
export const $filteredStoragePools = computed(
  [storagePoolStore.$items, $storagePoolSearchQuery, $storagePoolFilterState, $activeStoragePoolTab],
  (pools, searchQuery, filters, activeTab) => {
    if (!pools) return [];
    
    // Handle both Map and plain object cases
    let poolsArray: (StoragePool & { id: string })[];
    if (pools instanceof Map) {
      poolsArray = Array.from(pools.values());
    } else if (typeof pools === 'object') {
      poolsArray = Object.values(pools);
    } else {
      return [];
    }
    
    // Filter by tab
    if (activeTab !== 'all') {
      switch (activeTab) {
        case 'active':
          poolsArray = poolsArray.filter(pool => pool.state === 'running' || pool.state === 'active');
          break;
        case 'inactive':
          poolsArray = poolsArray.filter(pool => pool.state === 'inactive');
          break;
        case 'local':
          poolsArray = poolsArray.filter(pool => ['dir', 'fs', 'logical', 'disk'].includes(pool.type));
          break;
        case 'network':
          poolsArray = poolsArray.filter(pool => ['iscsi', 'nfs', 'gluster', 'ceph', 'rbd'].includes(pool.type));
          break;
      }
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      poolsArray = poolsArray.filter(pool =>
        pool.name.toLowerCase().includes(query) ||
        pool.type.toLowerCase().includes(query) ||
        pool.path?.toLowerCase().includes(query) ||
        pool.state.toLowerCase().includes(query)
      );
    }
    
    // Apply additional filters
    if (filters?.state && filters.state.length > 0) {
      poolsArray = poolsArray.filter(pool => filters.state!.includes(pool.state as StoragePoolState));
    }
    
    if (filters?.type && filters.type.length > 0) {
      poolsArray = poolsArray.filter(pool => filters.type!.includes(pool.type));
    }
    
    return poolsArray;
  }
);

// Storage pool statistics
export const $storagePoolStats = computed(
  [storagePoolStore.$items],
  (pools) => {
    if (!pools) {
      return {
        totalPools: 0,
        activePools: 0,
        inactivePools: 0,
        totalCapacity: 0,
        totalAllocated: 0,
        totalAvailable: 0,
        localPools: 0,
        networkPools: 0,
      };
    }
    
    // Handle both Map and plain object cases
    let poolsArray: (StoragePool & { id: string })[];
    if (pools instanceof Map) {
      poolsArray = Array.from(pools.values());
    } else if (typeof pools === 'object') {
      poolsArray = Object.values(pools);
    } else {
      return {
        totalPools: 0,
        activePools: 0,
        inactivePools: 0,
        totalCapacity: 0,
        totalAllocated: 0,
        totalAvailable: 0,
        localPools: 0,
        networkPools: 0,
      };
    }
    
    const localTypes = ['dir', 'fs', 'logical', 'disk'];
    const networkTypes = ['iscsi', 'nfs', 'gluster', 'ceph', 'rbd'];
    
    return {
      totalPools: poolsArray.length,
      activePools: poolsArray.filter(pool => pool.state === 'running' || pool.state === 'active').length,
      inactivePools: poolsArray.filter(pool => pool.state === 'inactive').length,
      totalCapacity: poolsArray.reduce((sum, pool) => sum + (pool.capacity || 0), 0),
      totalAllocated: poolsArray.reduce((sum, pool) => sum + (pool.allocation || 0), 0),
      totalAvailable: poolsArray.reduce((sum, pool) => sum + (pool.available || 0), 0),
      localPools: poolsArray.filter(pool => localTypes.includes(pool.type)).length,
      networkPools: poolsArray.filter(pool => networkTypes.includes(pool.type)).length,
    };
  }
);

// Available ISOs for VM creation
export const $availableISOs = computed(
  [isoStore.$items],
  (isos) => {
    if (!isos) return [];
    
    // Handle both Map and plain object cases
    let isosArray: ISOImage[];
    if (isos instanceof Map) {
      isosArray = Array.from(isos.values());
    } else if (typeof isos === 'object') {
      isosArray = Object.values(isos);
    } else {
      return [];
    }
    
    return isosArray.sort((a, b) => 
      a.name.localeCompare(b.name)
    );
  }
);

// Get selected network details
export const $selectedNetwork = computed(
  [$selectedNetworkId, networkStore.$items],
  (id, networks) => {
    if (!id || !networks) return null;
    
    // Handle both Map and plain object cases
    if (networks instanceof Map) {
      return networks.get(id) || null;
    } else if (typeof networks === 'object') {
      return networks[id] || null;
    }
    
    return null;
  }
);

// Filtered networks based on search and filters
export const $filteredNetworks = computed(
  [networkStore.$items, $networkSearchQuery, $networkFilterState, $activeNetworkTab],
  (networks, searchQuery, filters, activeTab) => {
    if (!networks) return [];
    
    // Handle both Map and plain object cases
    let networksArray: (VirtualNetwork & { id: string })[];
    if (networks instanceof Map) {
      networksArray = Array.from(networks.values());
    } else if (typeof networks === 'object') {
      networksArray = Object.values(networks);
    } else {
      return [];
    }
    
    // Filter by tab
    if (activeTab !== 'all') {
      switch (activeTab) {
        case 'active':
        case 'inactive':
          networksArray = networksArray.filter(net => net.state === activeTab);
          break;
        case 'persistent':
          networksArray = networksArray.filter(net => (net as any).persistent === true);
          break;
        case 'autostart':
          networksArray = networksArray.filter(net => net.autostart === true);
          break;
      }
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      networksArray = networksArray.filter(net =>
        net.name.toLowerCase().includes(query) ||
        net.bridge?.toLowerCase().includes(query) ||
        net.uuid?.toLowerCase().includes(query) ||
        net.ip?.toLowerCase().includes(query)
      );
    }
    
    // Apply additional filters
    if (filters?.state && filters.state.length > 0) {
      networksArray = networksArray.filter(net => filters.state!.includes(net.state));
    }
    
    return networksArray;
  }
);

// Network statistics
export const $networkStats = computed(
  [networkStore.$items],
  (networks) => {
    if (!networks) {
      return {
        totalNetworks: 0,
        activeNetworks: 0,
        inactiveNetworks: 0,
        persistentNetworks: 0,
        autostartNetworks: 0,
      };
    }
    
    // Handle both Map and plain object cases
    let networksArray: (VirtualNetwork & { id: string })[];
    if (networks instanceof Map) {
      networksArray = Array.from(networks.values());
    } else if (typeof networks === 'object') {
      networksArray = Object.values(networks);
    } else {
      return {
        totalNetworks: 0,
        activeNetworks: 0,
        inactiveNetworks: 0,
        persistentNetworks: 0,
        autostartNetworks: 0,
      };
    }
    
    return {
      totalNetworks: networksArray.length,
      activeNetworks: networksArray.filter(net => net.state === 'active').length,
      inactiveNetworks: networksArray.filter(net => net.state === 'inactive').length,
      persistentNetworks: networksArray.filter(net => (net as any).persistent === true).length,
      autostartNetworks: networksArray.filter(net => net.autostart === true).length,
    };
  }
);

// Get selected ISO details
export const $selectedISO = computed(
  [$selectedISOId, isoStore.$items],
  (id, isos) => {
    if (!id || !isos) return null;
    
    // Handle both Map and plain object cases
    if (isos instanceof Map) {
      return isos.get(id) || null;
    } else if (typeof isos === 'object') {
      return isos[id] || null;
    }
    
    return null;
  }
);

// Filtered ISOs based on search and filters
export const $filteredISOs = computed(
  [isoStore.$items, $isoSearchQuery, $isoFilterState],
  (isos, searchQuery, filters) => {
    if (!isos) return [];
    
    // Handle both Map and plain object cases
    let isosArray: ISOImage[];
    if (isos instanceof Map) {
      isosArray = Array.from(isos.values());
    } else if (typeof isos === 'object') {
      isosArray = Object.values(isos);
    } else {
      return [];
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      isosArray = isosArray.filter(iso =>
        iso.name.toLowerCase().includes(query) ||
        iso.os_type?.toLowerCase().includes(query) ||
        iso.os_variant?.toLowerCase().includes(query)
      );
    }
    
    // Apply additional filters
    if (filters?.os_type && filters.os_type.length > 0) {
      isosArray = isosArray.filter(iso => filters.os_type!.includes(iso.os_type || ''));
    }
    
    if (filters?.storage_pool && filters.storage_pool.length > 0) {
      isosArray = isosArray.filter(iso => filters.storage_pool!.includes(iso.storage_pool || ''));
    }
    
    return isosArray.sort((a, b) => a.name.localeCompare(b.name));
  }
);

// ISO statistics
export const $isoStats = computed(
  [isoStore.$items],
  (isos) => {
    if (!isos) {
      return {
        totalISOs: 0,
        totalSize: 0,
        osTypes: [] as string[],
        storagePools: [] as string[],
      };
    }
    
    // Handle both Map and plain object cases
    let isosArray: ISOImage[];
    if (isos instanceof Map) {
      isosArray = Array.from(isos.values());
    } else if (typeof isos === 'object') {
      isosArray = Object.values(isos);
    } else {
      return {
        totalISOs: 0,
        totalSize: 0,
        osTypes: [] as string[],
        storagePools: [] as string[],
      };
    }
    
    const osTypes = new Set<string>();
    const storagePools = new Set<string>();
    let totalSize = 0;
    
    isosArray.forEach(iso => {
      totalSize += iso.size || 0;
      if (iso.os_type) osTypes.add(iso.os_type);
      if (iso.storage_pool) storagePools.add(iso.storage_pool);
    });
    
    return {
      totalISOs: isosArray.length,
      totalSize,
      osTypes: Array.from(osTypes).sort(),
      storagePools: Array.from(storagePools).sort(),
    };
  }
);

// ============ Action Creators ============

// VM Actions
export const vmActions = {
  async fetchAll() {
    await vmStore.fetch();
  },
  
  async create(vmData: VMCreateRequest) {
    const response = await apiRequest<VirtualMachine>(
      '/virtualmachines/create-enhanced',
      {
        method: 'POST',
        body: JSON.stringify(vmData),
      }
    );
    
    // Add to store
    const items = new Map(vmStore.$items.get());
    items.set(response.id, response);
    vmStore.$items.set(items);
    
    // Select the new VM
    $selectedVMId.set(response.id);
    
    return { success: true, data: response };
  },
  
  async start(vmId: string) {
    await apiRequest(`/virtualmachines/${vmId}/start`, { method: 'POST' });
    
    // Update local state
    const vm = vmStore.getById(vmId);
    if (vm) {
      await vmStore.update(vmId, { state: 'running' });
    }
  },
  
  async stop(vmId: string, force = false) {
    await apiRequest(`/virtualmachines/${vmId}/stop`, {
      method: 'POST',
      body: JSON.stringify({ force }),
    });
    
    const vm = vmStore.getById(vmId);
    if (vm) {
      await vmStore.update(vmId, { state: 'stopped' });
    }
  },
  
  async restart(vmId: string) {
    await apiRequest(`/virtualmachines/${vmId}/restart`, { method: 'POST' });
  },
  
  async pause(vmId: string) {
    await apiRequest(`/virtualmachines/${vmId}/pause`, { method: 'POST' });
    
    const vm = vmStore.getById(vmId);
    if (vm) {
      await vmStore.update(vmId, { state: 'paused' });
    }
  },
  
  async resume(vmId: string) {
    await apiRequest(`/virtualmachines/${vmId}/resume`, { method: 'POST' });
    
    const vm = vmStore.getById(vmId);
    if (vm) {
      await vmStore.update(vmId, { state: 'running' });
    }
  },
  
  async delete(vmId: string) {
    await apiRequest(`/virtualmachines/${vmId}`, { method: 'DELETE' });
    await vmStore.delete(vmId);
    
    // Clear selection if deleted VM was selected
    if ($selectedVMId.get() === vmId) {
      $selectedVMId.set(null);
    }
  },
  
  async getConsoleInfo(vmId: string): Promise<ConsoleInfo> {
    return apiRequest<ConsoleInfo>(`/virtualmachines/${vmId}/console`);
  },
  
  selectVM(vmId: string | null) {
    $selectedVMId.set(vmId);
  },
};

// Wizard Actions
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
  
  updateFormData(updates: Partial<VMCreateRequest>) {
    const state = $vmWizardState.get();
    $vmWizardState.set({
      ...state,
      formData: { ...state.formData, ...updates },
    });
  },
  
  setError(field: string, error: string) {
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
  
  validateStep(step: number): boolean {
    const { formData } = $vmWizardState.get();
    
    switch (step) {
      case 1: // Basic config
        return !!(formData.name && formData.memory && formData.vcpus);
      case 2: // Storage
        return !!(formData.storage?.default_pool && formData.storage?.disks?.length);
      case 3: // Network (optional)
        return true;
      case 4: // Review
        return true;
      default:
        return false;
    }
  },
};

// Storage Pool Actions
export const storagePoolActions = {
  async fetchAll() {
    await storagePoolStore.fetch();
  },
  
  async refresh(poolName?: string) {
    if (poolName) {
      // Refresh specific pool
      await apiRequest(`/storages/pools/${poolName}/refresh`, { method: 'POST' });
    }
    // Refresh all pools from API
    await storagePoolStore.fetch();
  },
  
  async start(poolName: string) {
    await apiRequest(`/storages/pools/${poolName}/start`, { method: 'POST' });
    
    // Update local state
    const pool = storagePoolStore.getById(poolName);
    if (pool) {
      await storagePoolStore.update(poolName, { state: 'running' as StoragePoolState });
    }
  },
  
  async stop(poolName: string) {
    await apiRequest(`/storages/pools/${poolName}/stop`, { method: 'POST' });
    
    const pool = storagePoolStore.getById(poolName);
    if (pool) {
      await storagePoolStore.update(poolName, { state: 'inactive' as StoragePoolState });
    }
  },
  
  async delete(poolName: string) {
    await apiRequest(`/storages/pools/${poolName}`, { method: 'DELETE' });
    await storagePoolStore.delete(poolName);
    
    // Clear selection if deleted pool was selected
    if ($selectedStoragePoolId.get() === poolName) {
      $selectedStoragePoolId.set(null);
    }
  },
  
  async create(poolData: any) {
    const response = await apiRequest<StoragePool & { id: string }>(
      '/storages/pools',
      {
        method: 'POST',
        body: JSON.stringify(poolData),
      }
    );
    
    // Add to store
    const items = new Map(storagePoolStore.$items.get());
    items.set(response.name, response);
    storagePoolStore.$items.set(items);
    
    // Select the new pool
    $selectedStoragePoolId.set(response.name);
    
    return { success: true, data: response };
  },
  
  selectPool(poolName: string | null) {
    $selectedStoragePoolId.set(poolName);
  },
  
  setSearchQuery(query: string) {
    $storagePoolSearchQuery.set(query);
  },
  
  setActiveTab(tab: 'all' | 'active' | 'inactive' | 'local' | 'network') {
    $activeStoragePoolTab.set(tab);
  },
  
  setFilters(filters: { type?: string[]; state?: StoragePoolState[] }) {
    $storagePoolFilterState.set(filters);
  },
};

// Network Actions
export const networkActions = {
  async fetchAll() {
    await networkStore.fetch();
  },
  
  async create(networkData: any) {
    const response = await apiRequest<VirtualNetwork & { id: string }>(
      '/networks',
      {
        method: 'POST',
        body: JSON.stringify(networkData),
      }
    );
    
    // Add to store
    const items = new Map(networkStore.$items.get());
    items.set(response.name, response);
    networkStore.$items.set(items);
    
    // Select the new network
    $selectedNetworkId.set(response.name);
    
    return { success: true, data: response };
  },
  
  async start(networkName: string) {
    await apiRequest(`/networks/${networkName}/start`, { method: 'POST' });
    
    // Update local state
    const network = networkStore.getById(networkName);
    if (network) {
      await networkStore.update(networkName, { state: 'active' });
    }
  },
  
  async stop(networkName: string) {
    await apiRequest(`/networks/${networkName}/stop`, { method: 'POST' });
    
    const network = networkStore.getById(networkName);
    if (network) {
      await networkStore.update(networkName, { state: 'inactive' });
    }
  },
  
  async delete(networkName: string) {
    await apiRequest(`/networks/${networkName}`, { method: 'DELETE' });
    await networkStore.delete(networkName);
    
    // Clear selection if deleted network was selected
    if ($selectedNetworkId.get() === networkName) {
      $selectedNetworkId.set(null);
    }
  },
  
  selectNetwork(networkName: string | null) {
    $selectedNetworkId.set(networkName);
  },
  
  setSearchQuery(query: string) {
    $networkSearchQuery.set(query);
  },
  
  setActiveTab(tab: 'all' | 'active' | 'inactive' | 'persistent' | 'autostart') {
    $activeNetworkTab.set(tab);
  },
  
  setFilters(filters: { type?: string[]; state?: ('active' | 'inactive')[] }) {
    $networkFilterState.set(filters);
  },
};

// ISO Actions
export const isoActions = {
  async fetchAll() {
    await isoStore.fetch();
  },
  
  async delete(isoId: string) {
    await apiRequest(`/isos/${isoId}`, { method: 'DELETE' });
    await isoStore.delete(isoId);
    
    // Clear selection if deleted ISO was selected
    if ($selectedISOId.get() === isoId) {
      $selectedISOId.set(null);
    }
  },
  
  selectISO(isoId: string | null) {
    $selectedISOId.set(isoId);
  },
  
  setSearchQuery(query: string) {
    $isoSearchQuery.set(query);
  },
  
  setFilters(filters: { os_type?: string[]; storage_pool?: string[] }) {
    $isoFilterState.set(filters);
  },
  
  async uploadISO(file: File, metadata: Record<string, string>) {
    // This would use TUS protocol for resumable uploads
    // For now, using the existing implementation in storageActions
    return storageActions.uploadISO(file, metadata);
  },
};

// Storage Actions (for ISOs and general storage)
export const storageActions = {
  async fetchPools() {
    await storagePoolStore.fetch();
  },
  
  async fetchISOs() {
    await isoStore.fetch();
  },
  
  async uploadISO(_file: File, _metadata: Record<string, string>) {
    // This would use TUS protocol for resumable uploads
    // Implementation would depend on the TUS client library
    $isoUploadState.set({
      isUploading: true,
      uploadProgress: 0,
      uploadId: crypto.randomUUID(),
      error: null,
    });
    
    // Simulated upload progress
    // Real implementation would use TUS client
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
  
  async deleteISO(isoId: string) {
    await apiRequest(`/isos/${isoId}`, { method: 'DELETE' });
    await isoStore.delete(isoId);
  },
};

// ============ Subscriptions and Effects ============
// Note: Store event subscriptions can be added based on specific store implementation

// ============ Store Initialization ============
export async function initializeVirtualizationStores() {
  try {
    // Fetch initial data in parallel
    await Promise.all([
      vmStore.fetch(),
      storagePoolStore.fetch(),
      isoStore.fetch(),
      templateStore.fetch(),
      networkStore.fetch(),
    ]);
  } catch (error) {
    console.error('Failed to initialize virtualization stores:', error);
  }
}

// ============ Store Cleanup ============
export function cleanupVirtualizationStores() {
  // Clear all stores
  vmStore.clear();
  storagePoolStore.clear();
  isoStore.clear();
  templateStore.clear();
  networkStore.clear();
  
  // Reset UI state
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

// ============ WebSocket Support ============
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

// ============ Export all stores and actions ============
export default {
  // Stores
  vmStore,
  storagePoolStore,
  isoStore,
  templateStore,
  networkStore,
  
  // Atoms
  $selectedVMId,
  $vmWizardState,
  $isoUploadState,
  $consoleConnections,
  $activeVMTab,
  $vmSearchQuery,
  $vmFilterState,
  $activeStoragePoolTab,
  $storagePoolSearchQuery,
  $selectedStoragePoolId,
  $storagePoolFilterState,
  $activeNetworkTab,
  $networkSearchQuery,
  $selectedNetworkId,
  $networkFilterState,
  $isoSearchQuery,
  $selectedISOId,
  $isoFilterState,
  
  // Computed
  $selectedVM,
  $vmsByState,
  $filteredVMs,
  $resourceStats,
  $availableStoragePools,
  $availableISOs,
  $selectedNetwork,
  $filteredNetworks,
  $networkStats,
  $selectedISO,
  $filteredISOs,
  $isoStats,
  $selectedStoragePool,
  $filteredStoragePools,
  $storagePoolStats,
  
  // Actions
  vmActions,
  wizardActions,
  storageActions,
  storagePoolActions,
  networkActions,
  isoActions,
  
  // Lifecycle
  initializeVirtualizationStores,
  cleanupVirtualizationStores,
  connectVMStatusWebSocket,
};
