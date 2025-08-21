/**
 * Virtualization API Service
 * Handles all API communication for virtualization features
 */

import { getApiUrl } from '../config';
import type {
  VirtualMachine,
  StoragePool,
  ISOImage,
  VMTemplate,
  VMSnapshot,
  VMBackup,
  VMCreateRequest,
  VMCreateResponse,
  ConsoleInfo,
  VirtualNetwork,
  VMAction,
  VMMetrics,
  HostResources,
  ListResponse,
  OperationResult,
  Volume,
  DiskConfig,
  ISOUploadProgress,
} from '../types/virtualization';

/**
 * Base API configuration
 */
const API_BASE = '/virtualization';

/**
 * API Error class
 */
export class VirtualizationAPIError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'VirtualizationAPIError';
  }
}

/**
 * Helper function to get auth token
 */
function getAuthToken(): string {
  // Check for jwt_token (used by auth.ts) or auth_token (legacy)
  const token = localStorage.getItem('jwt_token') || localStorage.getItem('auth_token');
  if (!token) {
    throw new VirtualizationAPIError('AUTH_ERROR', 'No authentication token found');
  }
  return token;
}

/**
 * Helper function to make authenticated API requests
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  };

  try {
    // Use getApiUrl to get the correct full URL with host and API version
    const url = getApiUrl(`${API_BASE}${endpoint}`);
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({
        code: 'API_ERROR',
        message: response.statusText,
      }));
      throw new VirtualizationAPIError(
        error.code || 'API_ERROR',
        error.message || `Request failed: ${response.status}`,
        error.details
      );
    }
    
    // Handle empty responses
    if (response.status === 204) {
      return {} as T;
    }
    
    return await response.json();
  } catch (error) {
    if (error instanceof VirtualizationAPIError) {
      throw error;
    }
    throw new VirtualizationAPIError(
      'NETWORK_ERROR',
      error instanceof Error ? error.message : 'Network request failed'
    );
  }
}

/**
 * Virtualization API Service
 */
export class VirtualizationAPI {
  // ============ Virtual Machines ============
  
  /**
   * List all virtual machines
   */
  async listVMs(params?: {
    page?: number;
    pageSize?: number;
    filter?: string;
    sort?: string;
  }): Promise<ListResponse<VirtualMachine>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params?.filter) queryParams.append('filter', params.filter);
    if (params?.sort) queryParams.append('sort', params.sort);
    
    const query = queryParams.toString();
    return apiRequest<ListResponse<VirtualMachine>>(
      `/virtualmachines${query ? `?${query}` : ''}`
    );
  }
  
  /**
   * Get a specific virtual machine
   */
  async getVM(id: string): Promise<VirtualMachine> {
    return apiRequest<VirtualMachine>(`/virtualmachines/${id}`);
  }
  
  /**
   * Create a new virtual machine (basic)
   */
  async createVM(config: Partial<VirtualMachine>): Promise<VirtualMachine> {
    return apiRequest<VirtualMachine>('/virtualmachines', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }
  
  /**
   * Create a new virtual machine (enhanced with wizard data)
   */
  async createVMEnhanced(config: VMCreateRequest): Promise<VMCreateResponse> {
    return apiRequest<VMCreateResponse>('/virtualmachines/create-enhanced', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }
  
  /**
   * Update a virtual machine
   */
  async updateVM(id: string, updates: Partial<VirtualMachine>): Promise<VirtualMachine> {
    return apiRequest<VirtualMachine>(`/virtualmachines/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }
  
  /**
   * Delete a virtual machine
   */
  async deleteVM(id: string, force = false): Promise<OperationResult> {
    return apiRequest<OperationResult>(
      `/virtualmachines/${id}${force ? '?force=true' : ''}`,
      { method: 'DELETE' }
    );
  }
  
  /**
   * Clone a virtual machine
   */
  async cloneVM(id: string, name: string): Promise<VirtualMachine> {
    return apiRequest<VirtualMachine>(`/virtualmachines/${id}/clone`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }
  
  // ============ VM Power Management ============
  
  /**
   * Start a virtual machine
   */
  async startVM(id: string): Promise<OperationResult> {
    return apiRequest<OperationResult>(`/virtualmachines/${id}/start`, {
      method: 'POST',
    });
  }
  
  /**
   * Stop a virtual machine
   */
  async stopVM(id: string, force = false): Promise<OperationResult> {
    return apiRequest<OperationResult>(`/virtualmachines/${id}/stop`, {
      method: 'POST',
      body: JSON.stringify({ force }),
    });
  }
  
  /**
   * Restart a virtual machine
   */
  async restartVM(id: string, force = false): Promise<OperationResult> {
    return apiRequest<OperationResult>(`/virtualmachines/${id}/restart`, {
      method: 'POST',
      body: JSON.stringify({ force }),
    });
  }
  
  /**
   * Pause a virtual machine
   */
  async pauseVM(id: string): Promise<OperationResult> {
    return apiRequest<OperationResult>(`/virtualmachines/${id}/pause`, {
      method: 'POST',
    });
  }
  
  /**
   * Resume a paused virtual machine
   */
  async resumeVM(id: string): Promise<OperationResult> {
    return apiRequest<OperationResult>(`/virtualmachines/${id}/resume`, {
      method: 'POST',
    });
  }
  
  /**
   * Reset a virtual machine
   */
  async resetVM(id: string): Promise<OperationResult> {
    return apiRequest<OperationResult>(`/virtualmachines/${id}/reset`, {
      method: 'POST',
    });
  }
  
  /**
   * Execute a VM action
   */
  async executeVMAction(id: string, action: VMAction): Promise<OperationResult> {
    return apiRequest<OperationResult>(`/virtualmachines/${id}/action`, {
      method: 'POST',
      body: JSON.stringify(action),
    });
  }
  
  // ============ Console Access ============
  
  /**
   * Get console connection information
   */
  async getConsoleInfo(id: string): Promise<ConsoleInfo> {
    return apiRequest<ConsoleInfo>(`/virtualmachines/${id}/console`);
  }
  
  /**
   * Create a console session
   */
  async createConsoleSession(id: string): Promise<ConsoleInfo> {
    return apiRequest<ConsoleInfo>(`/virtualmachines/${id}/console/session`, {
      method: 'POST',
    });
  }
  
  // ============ Templates ============
  
  /**
   * List VM templates
   */
  async listTemplates(): Promise<VMTemplate[]> {
    return apiRequest<VMTemplate[]>('/virtualmachines/templates');
  }
  
  /**
   * Get a specific template
   */
  async getTemplate(id: string): Promise<VMTemplate> {
    return apiRequest<VMTemplate>(`/virtualmachines/templates/${id}`);
  }
  
  /**
   * Create a VM from template
   */
  async createFromTemplate(
    templateId: string,
    config: Partial<VMCreateRequest>
  ): Promise<VirtualMachine> {
    return apiRequest<VirtualMachine>('/virtualmachines/from-template', {
      method: 'POST',
      body: JSON.stringify({ templateId, ...config }),
    });
  }
  
  /**
   * Create a template from existing VM
   */
  async createTemplate(vmId: string, name: string, description?: string): Promise<VMTemplate> {
    return apiRequest<VMTemplate>(`/virtualmachines/${vmId}/template`, {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  }
  
  // ============ Snapshots ============
  
  /**
   * List VM snapshots
   */
  async listSnapshots(vmId: string): Promise<VMSnapshot[]> {
    return apiRequest<VMSnapshot[]>(`/virtualmachines/${vmId}/snapshots`);
  }
  
  /**
   * Create a snapshot
   */
  async createSnapshot(
    vmId: string,
    name: string,
    description?: string
  ): Promise<VMSnapshot> {
    return apiRequest<VMSnapshot>(`/virtualmachines/${vmId}/snapshots`, {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  }
  
  /**
   * Revert to snapshot
   */
  async revertToSnapshot(vmId: string, snapshotId: string): Promise<OperationResult> {
    return apiRequest<OperationResult>(
      `/virtualmachines/${vmId}/snapshots/${snapshotId}/revert`,
      { method: 'POST' }
    );
  }
  
  /**
   * Delete a snapshot
   */
  async deleteSnapshot(vmId: string, snapshotId: string): Promise<OperationResult> {
    return apiRequest<OperationResult>(
      `/virtualmachines/${vmId}/snapshots/${snapshotId}`,
      { method: 'DELETE' }
    );
  }
  
  // ============ Backups ============
  
  /**
   * List VM backups
   */
  async listBackups(vmId: string): Promise<VMBackup[]> {
    return apiRequest<VMBackup[]>(`/virtualmachines/${vmId}/backups`);
  }
  
  /**
   * Create a backup
   */
  async createBackup(vmId: string, name: string, type: 'full' | 'incremental'): Promise<VMBackup> {
    return apiRequest<VMBackup>(`/virtualmachines/${vmId}/backups`, {
      method: 'POST',
      body: JSON.stringify({ name, type }),
    });
  }
  
  /**
   * Restore from backup
   */
  async restoreFromBackup(vmId: string, backupId: string): Promise<OperationResult> {
    return apiRequest<OperationResult>(
      `/virtualmachines/${vmId}/backups/${backupId}/restore`,
      { method: 'POST' }
    );
  }
  
  // ============ Storage Pools ============
  
  /**
   * List storage pools
   */
  async listStoragePools(): Promise<StoragePool[]> {
    return apiRequest<StoragePool[]>('/storages/pools');
  }
  
  /**
   * Get a specific storage pool
   */
  async getStoragePool(name: string): Promise<StoragePool> {
    return apiRequest<StoragePool>(`/storages/pools/${name}`);
  }
  
  /**
   * Create a storage pool
   */
  async createStoragePool(config: Partial<StoragePool>): Promise<StoragePool> {
    return apiRequest<StoragePool>('/storages/pools', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }
  
  /**
   * Delete a storage pool
   */
  async deleteStoragePool(name: string): Promise<OperationResult> {
    return apiRequest<OperationResult>(`/storages/pools/${name}`, {
      method: 'DELETE',
    });
  }
  
  /**
   * Start a storage pool
   */
  async startStoragePool(name: string): Promise<OperationResult> {
    return apiRequest<OperationResult>(`/storages/pools/${name}/start`, {
      method: 'POST',
    });
  }
  
  /**
   * Stop a storage pool
   */
  async stopStoragePool(name: string): Promise<OperationResult> {
    return apiRequest<OperationResult>(`/storages/pools/${name}/stop`, {
      method: 'POST',
    });
  }
  
  /**
   * Set storage pool autostart
   */
  async setStoragePoolAutostart(name: string, autostart: boolean): Promise<OperationResult> {
    return apiRequest<OperationResult>(`/storages/pools/${name}/autostart`, {
      method: 'PUT',
      body: JSON.stringify({ autostart }),
    });
  }
  
  /**
   * Refresh storage pool
   */
  async refreshStoragePool(name: string): Promise<OperationResult> {
    return apiRequest<OperationResult>(`/storages/pools/${name}/refresh`, {
      method: 'POST',
    });
  }
  
  /**
   * List volumes in a storage pool
   */
  async listVolumes(poolName: string): Promise<Volume[]> {
    return apiRequest<Volume[]>(`/storages/pools/${poolName}/volumes`);
  }
  
  /**
   * Create a volume in a storage pool
   */
  async createVolume(
    poolName: string,
    config: Partial<Volume>
  ): Promise<Volume> {
    return apiRequest<Volume>(`/storages/pools/${poolName}/volumes`, {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }
  
  /**
   * Delete a volume
   */
  async deleteVolume(poolName: string, volumeName: string): Promise<OperationResult> {
    return apiRequest<OperationResult>(
      `/storages/pools/${poolName}/volumes/${volumeName}`,
      { method: 'DELETE' }
    );
  }
  
  // ============ ISO Management ============
  
  /**
   * List ISO images
   */
  async listISOs(): Promise<ISOImage[]> {
    return apiRequest<ISOImage[]>('/isos');
  }
  
  /**
   * Get ISO details
   */
  async getISO(id: string): Promise<ISOImage> {
    return apiRequest<ISOImage>(`/isos/${id}`);
  }
  
  /**
   * Upload an ISO (returns upload URL for TUS)
   * This creates a TUS upload session following the TUS protocol v1.0.0
   */
  async initiateISOUpload(metadata: {
    filename: string;
    size: number;
    os_type?: string;
    os_variant?: string;
    description?: string;
    architecture?: string;
  }): Promise<{ uploadUrl: string; uploadId: string }> {
    // Prepare TUS metadata in base64 format as per TUS protocol
    const tusMetadata: Record<string, string> = {};
    
    // Encode each metadata field to base64
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
    
    // Build Upload-Metadata header value
    const uploadMetadata = Object.entries(tusMetadata)
      .map(([key, value]) => `${key} ${value}`)
      .join(',');
    
    const token = getAuthToken();
    const url = getApiUrl('/virtualization/isos/upload');
    
    // Make TUS-compliant POST request with proper headers
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
      throw new VirtualizationAPIError(
        error.code || 'API_ERROR',
        error.message || `Request failed: ${response.status}`,
        error.details
      );
    }
    
  // Extract upload URL from Location header and response body
  const location = response.headers.get('Location');
  const responseData = await response.json();
  
  console.log('[TUS] Session created:', {
    location,
    responseData,
    originalUrl: url
  });
  
  // Ensure we have a full URL for the TUS client
  let tusUploadUrl = location || responseData.upload_url;
  
  // If the URL is relative, make it absolute
  if (tusUploadUrl && !tusUploadUrl.startsWith('http')) {
    // The upload URL should include the full path with upload ID
    // Expected format: /api/v1/virtualization/isos/upload/{upload_id}
    const fullUploadPath = tusUploadUrl.startsWith('/api/') 
      ? tusUploadUrl 
      : `/api/v1/virtualization/isos/upload/${responseData.upload_id}`;
    
    // Get the base URL from the config
    const baseUrl = url.substring(0, url.indexOf('/api/'));
    
    // Construct the full URL
    tusUploadUrl = baseUrl + fullUploadPath;
  }
  
  console.log('[TUS] Final upload URL:', tusUploadUrl);
  
  return {
    uploadUrl: tusUploadUrl,
    uploadId: responseData.upload_id,
  };
  }
  
  /**
   * Complete ISO upload
   */
  async completeISOUpload(uploadId: string): Promise<ISOImage> {
    return apiRequest<ISOImage>(`/isos/upload/${uploadId}/complete`, {
      method: 'POST',
    });
  }
  
  /**
   * Get ISO upload progress
   */
  async getISOUploadProgress(uploadId: string): Promise<ISOUploadProgress> {
    return apiRequest<ISOUploadProgress>(`/isos/upload/${uploadId}/progress`);
  }
  
  /**
   * Delete an ISO
   */
  async deleteISO(id: string): Promise<OperationResult> {
    return apiRequest<OperationResult>(`/isos/${id}`, {
      method: 'DELETE',
    });
  }
  
  // ============ Virtual Networks ============
  
  /**
   * List virtual networks
   */
  async listNetworks(): Promise<VirtualNetwork[]> {
    const response = await apiRequest<any>('/networks');
    
    // Handle the wrapped response structure
    if (response.status === 'success' && response.data) {
      return response.data.networks || [];
    }
    
    // Fallback for direct array response
    if (Array.isArray(response)) {
      return response;
    }
    
    return [];
  }
  
  /**
   * Get a specific network
   */
  async getNetwork(name: string): Promise<VirtualNetwork> {
    return apiRequest<VirtualNetwork>(`/networks/${name}`);
  }
  
  /**
   * Create a virtual network
   */
  async createNetwork(config: Partial<VirtualNetwork>): Promise<VirtualNetwork> {
    return apiRequest<VirtualNetwork>('/networks', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }
  
  /**
   * Delete a virtual network
   */
  async deleteNetwork(name: string): Promise<OperationResult> {
    return apiRequest<OperationResult>(`/networks/${name}`, {
      method: 'DELETE',
    });
  }
  
  /**
   * Start a network
   */
  async startNetwork(name: string): Promise<OperationResult> {
    return apiRequest<OperationResult>(`/networks/${name}/start`, {
      method: 'POST',
    });
  }
  
  /**
   * Stop a network
   */
  async stopNetwork(name: string): Promise<OperationResult> {
    return apiRequest<OperationResult>(`/networks/${name}/stop`, {
      method: 'POST',
    });
  }
  
  // ============ Metrics \u0026 Monitoring ============
  
  /**
   * Get VM metrics
   */
  async getVMMetrics(vmId: string, duration = '1h'): Promise<VMMetrics[]> {
    return apiRequest<VMMetrics[]>(`/virtualmachines/${vmId}/metrics?duration=${duration}`);
  }
  
  /**
   * Get host resource usage
   */
  async getHostResources(): Promise<HostResources> {
    return apiRequest<HostResources>('/host/resources');
  }
  
  /**
   * Get real-time VM metrics (WebSocket endpoint info)
   */
  getMetricsWebSocketUrl(vmId: string): string {
    const token = getAuthToken();
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}${API_BASE}/virtualmachines/${vmId}/metrics/ws?token=${token}`;
  }
  
  // ============ Disk Management ============
  
  /**
   * Attach a disk to VM
   */
  async attachDisk(vmId: string, disk: DiskConfig): Promise<OperationResult> {
    return apiRequest<OperationResult>(`/virtualmachines/${vmId}/disks/attach`, {
      method: 'POST',
      body: JSON.stringify(disk),
    });
  }
  
  /**
   * Detach a disk from VM
   */
  async detachDisk(vmId: string, device: string): Promise<OperationResult> {
    return apiRequest<OperationResult>(`/virtualmachines/${vmId}/disks/${device}/detach`, {
      method: 'POST',
    });
  }
  
  /**
   * Resize a VM disk
   */
  async resizeDisk(vmId: string, device: string, newSize: number): Promise<OperationResult> {
    return apiRequest<OperationResult>(`/virtualmachines/${vmId}/disks/${device}/resize`, {
      method: 'POST',
      body: JSON.stringify({ size: newSize }),
    });
  }
  
  // ============ Migration ============
  
  /**
   * Migrate a VM to another host
   */
  async migrateVM(
    vmId: string,
    targetHost: string,
    live = true
  ): Promise<OperationResult> {
    return apiRequest<OperationResult>(`/virtualmachines/${vmId}/migrate`, {
      method: 'POST',
      body: JSON.stringify({ targetHost, live }),
    });
  }
  
  /**
   * Get migration status
   */
  async getMigrationStatus(vmId: string): Promise<{
    status: 'idle' | 'migrating' | 'completed' | 'failed';
    progress?: number;
    error?: string;
  }> {
    return apiRequest(`/virtualmachines/${vmId}/migrate/status`);
  }
}

// Export singleton instance
export const virtualizationAPI = new VirtualizationAPI();

// Export default
export default virtualizationAPI;
