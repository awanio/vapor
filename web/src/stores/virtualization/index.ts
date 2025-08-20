/**
 * Virtualization Store - State management for virtualization module
 */

import { atom, computed, map } from 'nanostores';
import { createStore } from '../utils/factory';
import { getApiUrl } from '../../config';
import type { 
  VirtualMachine, 
  StoragePool, 
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
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `Request failed: ${response.status}`);
  }
  
  return response.json();
}

// ============ VM Store ============
export const vmStore = createStore<VirtualMachine>({
  name: 'virtualization-vms',
  idField: 'id',
  endpoint: getApiUrl(`${API_BASE}/virtualmachines`),
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

// ============ Storage Pool Store ============
export const storagePoolStore = createStore<StoragePool & { id: string }>({
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

// ============ ISO Store ============
export const isoStore = createStore<ISOImage>({
  name: 'virtualization-isos',
  idField: 'id',
  endpoint: getApiUrl(`${API_BASE}/storages/isos`),
  persistent: true,
  persistKey: 'vapor.virtualization.isos',
  debug: process.env.NODE_ENV === 'development',
});

// ============ Templates Store ============
export const templateStore = createStore<VMTemplate>({
  name: 'virtualization-templates',
  idField: 'id',
  endpoint: getApiUrl(`${API_BASE}/virtualmachines/templates`),
  persistent: true,
  persistKey: 'vapor.virtualization.templates',
  debug: process.env.NODE_ENV === 'development',
});

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
      pool.state === 'active' && pool.available > 1073741824 // > 1GB
    );
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

// Storage Actions
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
    await apiRequest(`/storages/isos/${isoId}`, { method: 'DELETE' });
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
  
  // Computed
  $selectedVM,
  $vmsByState,
  $filteredVMs,
  $resourceStats,
  $availableStoragePools,
  $availableISOs,
  
  // Actions
  vmActions,
  wizardActions,
  storageActions,
  
  // Lifecycle
  initializeVirtualizationStores,
  cleanupVirtualizationStores,
  connectVMStatusWebSocket,
};
