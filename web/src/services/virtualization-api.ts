/**
 * Virtualization API Service
 * Handles all API communication for virtualization features
 */

import { getApiUrl } from '../config';
import { mapVMError } from '../utils/error-mapper';
import type {
  VirtualMachine,
  StoragePool,
  ISOImage,
  OSVariant,
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
  HotplugRequest,
  HotplugResponse,
  VMCloneRequest,
  VMCloneResponse,
  MigrationRequest,
  MigrationResponse,
  MigrationStatus,
  ConsolesResponse,
  ConsoleConnection,
  VMSnapshotRequest,
  VMSnapshotListResponse,
  VMSnapshotCreateResponse,
  VMSnapshotRevertResponse,
  SnapshotCapabilitiesResponse,
  BackupCreateRequest,
  BackupImportRequest,
  BackupRestoreRequest,
  VMMetricsEnhanced,
} from '../types/virtualization';
import { isVirtualizationDisabled, VirtualizationDisabledError, type ApiErrorBody } from '../utils/api-errors';
import { $virtualizationEnabled, $virtualizationDisabledMessage } from '../stores/virtualization';

/**
 * Base API configuration
 */
const API_BASE = '/virtualization';

/**
 * API Error class
 */
export class VirtualizationAPIError extends Error {
  public userMessage: string;

  constructor(
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'VirtualizationAPIError';
    // Map error code to user-friendly message
    this.userMessage = mapVMError({ code, message });
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
    const status = response.status;

    if (!response.ok) {
      const errorBody: ApiErrorBody | { code?: string; message?: string; details?: string } = await response
        .json()
        .catch(() => ({
          status: 'error',
          error: { code: 'API_ERROR', message: response.statusText },
        } as ApiErrorBody));

      if (isVirtualizationDisabled(status, errorBody as ApiErrorBody)) {
        $virtualizationEnabled.set(false);
        $virtualizationDisabledMessage.set(
          (errorBody as ApiErrorBody).error?.details ||
          (errorBody as ApiErrorBody).error?.message ||
          'Virtualization is disabled on this host.',
        );
        throw new VirtualizationDisabledError(
          (errorBody as ApiErrorBody).error?.message || 'Virtualization is disabled on this host.',
          (errorBody as ApiErrorBody).error?.details,
          status,
        );
      }

      const apiBody: any = errorBody;
      if (apiBody.status === 'error' && apiBody.error) {
        throw new VirtualizationAPIError(
          apiBody.error.code || 'API_ERROR',
          apiBody.error.message || `Request failed: ${status}`,
          apiBody.error.details,
        );
      }

      throw new VirtualizationAPIError(
        apiBody.code || 'API_ERROR',
        apiBody.message || `Request failed: ${status}`,
        apiBody.details,
      );
    }

    // Handle empty responses
    if (response.status === 204) {
      if ($virtualizationEnabled.get() !== true) {
        $virtualizationEnabled.set(true);
        $virtualizationDisabledMessage.set(null);
      }
      return {} as T;
    }

    if ($virtualizationEnabled.get() !== true) {
      $virtualizationEnabled.set(true);
      $virtualizationDisabledMessage.set(null);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof VirtualizationAPIError || error instanceof VirtualizationDisabledError) {
      throw error;
    }
    throw new VirtualizationAPIError(
      'NETWORK_ERROR',
      error instanceof Error ? error.message : 'Network request failed',
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
      `/computes${query ? `?${query}` : ''}`
    );
  }

  /**
   * Get a specific virtual machine
   */
  async getVM(id: string): Promise<VirtualMachine> {
    return apiRequest<VirtualMachine>(`/computes/${id}`);
  }

  /**
   * Create a new virtual machine (basic)
   */
  async createVM(config: Partial<VirtualMachine>): Promise<VirtualMachine> {
    return apiRequest<VirtualMachine>('/computes', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  /**
   * Create a new virtual machine (enhanced with wizard data)
   */
  async createVMEnhanced(config: VMCreateRequest): Promise<VMCreateResponse> {
    return apiRequest<VMCreateResponse>('/computes', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  /**
   * Update a virtual machine
   */
  async updateVM(id: string, updates: Partial<VirtualMachine>): Promise<VirtualMachine> {
    return apiRequest<VirtualMachine>(`/computes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Delete a virtual machine
   */
  async deleteVM(id: string, force = false): Promise<OperationResult> {
    return apiRequest<OperationResult>(
      `/computes/${id}${force ? '?force=true' : ''}`,
      { method: 'DELETE' }
    );
  }

  /**
   * Clone a virtual machine
   */
  async cloneVM(id: string, name: string): Promise<VirtualMachine> {
    return apiRequest<VirtualMachine>(`/computes/${id}/clone`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  // ============ VM Power Management ============

  /**
   * Start a virtual machine
   */
  async startVM(id: string): Promise<OperationResult> {
    return apiRequest<OperationResult>(`/computes/${id}/start`, {
      method: 'POST',
    });
  }

  /**
   * Stop a virtual machine
   */
  async stopVM(id: string, force = false): Promise<OperationResult> {
    return apiRequest<OperationResult>(`/computes/${id}/stop`, {
      method: 'POST',
      body: JSON.stringify({ force }),
    });
  }

  /**
   * Restart a virtual machine
   */
  async restartVM(id: string, force = false): Promise<OperationResult> {
    return apiRequest<OperationResult>(`/computes/${id}/restart`, {
      method: 'POST',
      body: JSON.stringify({ force }),
    });
  }

  /**
   * Pause a virtual machine
   */
  async pauseVM(id: string): Promise<OperationResult> {
    return apiRequest<OperationResult>(`/computes/${id}/pause`, {
      method: 'POST',
    });
  }

  /**
   * Resume a paused virtual machine
   */
  async resumeVM(id: string): Promise<OperationResult> {
    return apiRequest<OperationResult>(`/computes/${id}/resume`, {
      method: 'POST',
    });
  }

  /**
   * Reset a virtual machine
   */
  async resetVM(id: string): Promise<OperationResult> {
    return apiRequest<OperationResult>(`/computes/${id}/reset`, {
      method: 'POST',
    });
  }

  /**
   * Execute a VM action
   */
  async executeVMAction(id: string, action: VMAction): Promise<OperationResult> {
    return apiRequest<OperationResult>(`/computes/${id}/action`, {
      method: 'POST',
      body: JSON.stringify(action),
    });
  }

  // ============ Console Access ============

  /**
   * Get console connection information
   */
  async getConsoleInfo(id: string): Promise<ConsoleInfo> {
    return apiRequest<ConsoleInfo>(`/computes/${id}/console`);
  }

  /**
   * Create a console session
   */
  async createConsoleSession(id: string): Promise<ConsoleInfo> {
    return apiRequest<ConsoleInfo>(`/computes/${id}/console/session`, {
      method: 'POST',
    });
  }

  // ============ Templates ============

  /**
   * List VM templates
   */
  async listTemplates(): Promise<VMTemplate[]> {
    return apiRequest<VMTemplate[]>('/computes/templates');
  }

  /**
   * Get a specific template
   */
  async getTemplate(id: string): Promise<VMTemplate> {
    return apiRequest<VMTemplate>(`/computes/templates/${id}`);
  }

  /**
   * Create a VM from template
   */
  async createFromTemplate(
    templateId: string,
    config: Partial<VMCreateRequest>
  ): Promise<VirtualMachine> {
    return apiRequest<VirtualMachine>('/computes/from-template', {
      method: 'POST',
      body: JSON.stringify({ templateId, ...config }),
    });
  }

  /**
   * Create a template from existing VM
   */
  async createTemplate(vmId: string, name: string, description?: string): Promise<VMTemplate> {
    return apiRequest<VMTemplate>(`/computes/${vmId}/template`, {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  }

  // ============ Snapshots ============

  /**
   * List VM snapshots
   */
  async listSnapshots(vmId: string): Promise<VMSnapshot[]> {
    return apiRequest<VMSnapshot[]>(`/computes/${vmId}/snapshots`);
  }

  /**
   * Create a snapshot
   */
  async createSnapshot(
    vmId: string,
    name: string,
    description?: string
  ): Promise<VMSnapshot> {
    return apiRequest<VMSnapshot>(`/computes/${vmId}/snapshots`, {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  }

  /**
   * Revert to snapshot
   */
  async revertToSnapshot(vmId: string, snapshotId: string): Promise<OperationResult> {
    return apiRequest<OperationResult>(
      `/computes/${vmId}/snapshots/${snapshotId}/revert`,
      { method: 'POST' }
    );
  }

  /**
   * Delete a snapshot
   */
  async deleteSnapshot(vmId: string, snapshotId: string): Promise<OperationResult> {
    return apiRequest<OperationResult>(
      `/computes/${vmId}/snapshots/${snapshotId}`,
      { method: 'DELETE' }
    );
  }

  // ============ Backups ============

  /**
   * List backups for a specific VM
   */
  async listBackups(vmId: string): Promise<VMBackup[]> {
    const response = await apiRequest<any>(`/computes/${vmId}/backups`);
    return this.normalizeBackups(response);
  }

  /**
   * List backups across all VMs
   */
  async listAllBackups(params?: { search?: string; status?: string; type?: string }): Promise<VMBackup[]> {
    const query = new URLSearchParams();
    if (params?.search) query.set('q', params.search);
    if (params?.status) query.set('status', params.status);
    if (params?.type) query.set('type', params.type);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    const response = await apiRequest<any>(`/computes/backups${suffix}`);
    return this.normalizeBackups(response);
  }

  /**
   * Create a backup for a VM
   */
  async createBackup(vmId: string, payload: BackupCreateRequest): Promise<VMBackup> {
    const response = await apiRequest<any>(`/computes/${vmId}/backups`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const backups = this.normalizeBackups(response);
    const [first] = backups;
    if (!first) {
      throw new VirtualizationAPIError('INVALID_RESPONSE', 'Backup response missing backup data');
    }
    return first;
  }

  /**
   * Import an existing backup file into Vapor
   */
  async importBackup(payload: BackupImportRequest): Promise<VMBackup> {
    const response = await apiRequest<any>('/computes/backups/import', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const backups = this.normalizeBackups(response);
    const [first] = backups;
    if (first) return first;
    return response as VMBackup;
  }

  /**
   * Restore a backup (optionally to a new VM)
   */
  async restoreBackup(payload: BackupRestoreRequest): Promise<any> {
    return apiRequest<any>('/computes/restore', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Delete a backup by its ID
   */
  async deleteBackup(backupId: string): Promise<void> {
    const result = await apiRequest<any>(`/computes/backups/${backupId}`, { method: 'DELETE' });
    if (result && typeof result === 'object' && result?.status === 'error') {
      throw new VirtualizationAPIError(
        result.error?.code || 'BACKUP_DELETE_FAILED',
        result.error?.message || 'Failed to delete backup',
        result.error?.details,
      );
    }
  }

  /**
   * Get backup download URL
   */
  getBackupDownloadUrl(backupId: string): string {
    const token = getAuthToken();
    const url = getApiUrl(`${API_BASE}/computes/backups/${backupId}/download`);
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}token=${encodeURIComponent(token)}`;
  }

  /**
   * Download a backup qcow2 file
   * @deprecated Use getBackupDownloadUrl instead for large files
   */
  async downloadBackup(backupId: string): Promise<Blob> {
    const token = getAuthToken();
    const url = getApiUrl(`${API_BASE}/computes/backups/${backupId}/download`);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      const code = errorBody?.error?.code || `HTTP_${response.status}`;
      const message = errorBody?.error?.message || response.statusText || 'Failed to download backup';
      throw new VirtualizationAPIError(code, message, errorBody?.error?.details);
    }

    return response.blob();
  }

  private normalizeBackups(response: any): VMBackup[] {
    if (!response) return [];
    if (Array.isArray(response)) return response;
    if (response.data?.backups) return response.data.backups;
    if (response.backups) return response.backups;
    if (response.data?.backup) return [response.data.backup];
    if (response.backup) return [response.backup];
    if (response.data?.backups?.items) return response.data.backups.items;
    return [];
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
  async deleteStoragePool(name: string, deleteVolumes: boolean = false): Promise<OperationResult> {
    const params = deleteVolumes ? '?delete_volumes=true' : '';
    return apiRequest<OperationResult>(`/storages/pools/${name}${params}`, {
      method: 'DELETE',
    });
  }

  /**
   * Update a storage pool (currently supports autostart only)
   */
  async updateStoragePool(name: string, config: { autostart?: boolean }): Promise<StoragePool> {
    return apiRequest<StoragePool>(`/storages/pools/${name}`, {
      method: 'PUT',
      body: JSON.stringify(config),
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
   * Returns { volumes, count } from the envelope
   */
  async listVolumes(poolName: string): Promise<{ volumes: Volume[]; count: number }> {
    const response = await apiRequest<{ status: string; data: { volumes: Volume[]; count: number } }>(
      `/storages/pools/${poolName}/volumes`
    );
    // Unwrap the envelope
    if (response.status === 'success' && response.data) {
      return { volumes: response.data.volumes || [], count: response.data.count || 0 };
    }
    return { volumes: [], count: 0 };
  }

  /**
   * Get volume details
   */
  async getVolume(poolName: string, volumeName: string): Promise<Volume> {
    const response = await apiRequest<{ status: string; data: { volume: Volume } }>(
      `/storages/pools/${poolName}/volumes/${volumeName}`
    );
    // Unwrap the envelope
    if (response.status === 'success' && response.data?.volume) {
      return response.data.volume;
    }
    throw new VirtualizationAPIError('INVALID_RESPONSE', 'Invalid response format from getVolume');
  }

  /**
   * Create a volume in a storage pool
   */
  async createVolume(
    poolName: string,
    config: { name: string; capacity: number; allocation?: number; format?: string }
  ): Promise<Volume> {
    const response = await apiRequest<{ status: string; data: Volume }>(
      `/storages/pools/${poolName}/volumes`,
      {
        method: 'POST',
        body: JSON.stringify(config),
      }
    );
    // Unwrap the envelope
    if (response.status === 'success' && response.data) {
      return response.data;
    }
    throw new VirtualizationAPIError('INVALID_RESPONSE', 'Invalid response format from createVolume');
  }

  /**
   * Resize a volume
   */
  async resizeVolume(poolName: string, volumeName: string, capacity: number): Promise<Volume> {
    const response = await apiRequest<{ status: string; data: Volume }>(
      `/storages/pools/${poolName}/volumes/${volumeName}/resize`,
      {
        method: 'POST',
        body: JSON.stringify({ capacity }),
      }
    );
    // Unwrap the envelope
    if (response.status === 'success' && response.data) {
      return response.data;
    }
    throw new VirtualizationAPIError('INVALID_RESPONSE', 'Invalid response format from resizeVolume');
  }

  /**
   * Clone a volume
   */
  async cloneVolume(
    poolName: string,
    volumeName: string,
    payload: { new_name: string; target_pool?: string }
  ): Promise<Volume & { pool_name: string }> {
    const response = await apiRequest<{ status: string; data: Volume & { pool_name: string } }>(
      `/storages/pools/${poolName}/volumes/${volumeName}/clone`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
    // Unwrap the envelope
    if (response.status === 'success' && response.data) {
      return response.data;
    }
    throw new VirtualizationAPIError('INVALID_RESPONSE', 'Invalid response format from cloneVolume');
  }

  /**
   * Delete a volume
   */
  async deleteVolume(poolName: string, volumeName: string, force = false): Promise<void> {
    const suffix = force ? '?force=true' : '';
    const result = await apiRequest<any>(`/storages/pools/${poolName}/volumes/${volumeName}${suffix}`, {
      method: 'DELETE',
    });

    // Some endpoints may respond with an error envelope while still returning 2xx.
    if (result && typeof result === 'object' && 'status' in result && (result as any).status === 'error') {
      const err = (result as any).error || {};
      throw new VirtualizationAPIError(
        err.code || 'API_ERROR',
        err.message || 'Failed to delete volume',
        err.details,
      );
    }
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
    pool_name?: string;
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
    if (metadata.pool_name) {
      tusMetadata.pool_name = btoa(metadata.pool_name);
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


  // ============ OS Variants ============

  /**
   * List OS variants for autocomplete suggestions.
   * Backend returns an envelope: { status: 'success', data: { variants, count } }.
   */
  async listOSVariants(params?: {
    q?: string;
    family?: string;
    limit?: number;
  }): Promise<{ variants: OSVariant[]; count: number }> {
    const queryParams = new URLSearchParams();
    if (params?.q) queryParams.append('q', params.q);
    if (params?.family) queryParams.append('family', params.family);
    if (typeof params?.limit === 'number') queryParams.append('limit', params.limit.toString());

    const query = queryParams.toString();
    const response = await apiRequest<{
      status: string;
      data?: { variants?: OSVariant[]; count?: number };
    }>(`/os-variants${query ? `?${query}` : ''}`);

    if (response.status === 'success' && response.data) {
      const variants = response.data.variants || [];
      return { variants, count: response.data.count ?? variants.length };
    }

    // Fallbacks for unexpected formats
    const anyResponse: any = response as any;
    if (anyResponse?.data?.variants && Array.isArray(anyResponse.data.variants)) {
      return {
        variants: anyResponse.data.variants as OSVariant[],
        count: anyResponse.data.count ?? anyResponse.data.variants.length,
      };
    }
    if (anyResponse?.variants && Array.isArray(anyResponse.variants)) {
      return { variants: anyResponse.variants as OSVariant[], count: anyResponse.count ?? anyResponse.variants.length };
    }

    return { variants: [], count: 0 };
  }

  // ============ Virtual Networks ============

  /**
   * List virtual networks
   * Returns networks and total count using the standard API envelope.
   */
  async listNetworks(): Promise<{ networks: VirtualNetwork[]; count: number }> {
    const response = await apiRequest<{
      status: string;
      data?: { networks?: VirtualNetwork[]; count?: number };
    }>('/networks');

    if (response.status === 'success' && response.data) {
      return {
        networks: response.data.networks || [],
        count: response.data.count ?? (response.data.networks?.length || 0),
      };
    }

    // Fallbacks for legacy formats
    const anyResponse: any = response as any;
    if (Array.isArray(anyResponse)) {
      return { networks: anyResponse, count: anyResponse.length };
    }
    if (anyResponse.networks && Array.isArray(anyResponse.networks)) {
      return { networks: anyResponse.networks, count: anyResponse.count || anyResponse.networks.length };
    }

    return { networks: [], count: 0 };
  }

  /**
   * Get a specific network
   * Be tolerant of both enveloped and plain responses.
   */
  async getNetwork(name: string): Promise<VirtualNetwork> {
    const response = await apiRequest<any>(`/networks/${name}`);

    if (response && typeof response === 'object') {
      // New envelope format: { status: 'success', data: { network } }
      if (response.status === 'success') {
        if (response.data?.network) {
          return response.data.network as VirtualNetwork;
        }
        if (response.data && !Array.isArray(response.data)) {
          return response.data as VirtualNetwork;
        }
      }

      // Legacy: direct VirtualNetwork object
      if (!('status' in response)) {
        return response as VirtualNetwork;
      }
    }

    throw new VirtualizationAPIError('INVALID_RESPONSE', 'Invalid response format from getNetwork');
  }

  /**
   * Create a virtual network
   */
  async createNetwork(config: any): Promise<VirtualNetwork> {
    const response = await apiRequest<{
      status: string;
      data?: { network?: VirtualNetwork };
    }>('/networks', {
      method: 'POST',
      body: JSON.stringify(config),
    });

    if (response.status === 'success' && response.data?.network) {
      return response.data.network;
    }

    throw new VirtualizationAPIError('INVALID_RESPONSE', 'Invalid response format from createNetwork');
  }

  /**
   * Update a virtual network
   */
  async updateNetwork(name: string, config: any): Promise<VirtualNetwork> {
    const response = await apiRequest<{
      status: string;
      data?: { network?: VirtualNetwork; message?: string };
    }>(`/networks/${name}`, {
      method: 'PUT',
      body: JSON.stringify(config),
    });

    if (response.status === 'success' && response.data?.network) {
      return response.data.network;
    }

    throw new VirtualizationAPIError('INVALID_RESPONSE', 'Invalid response format from updateNetwork');
  }

  /**
   * Get DHCP leases for a virtual network
   */
  async getNetworkDHCPLeases(
    name: string,
  ): Promise<{ network_name: string; leases: any[]; count: number }> {
    const response = await apiRequest<{
      status: string;
      data?: { network_name?: string; leases?: any[]; count?: number };
    }>(`/networks/${name}/dhcp-leases`);

    if (response.status === 'success' && response.data) {
      return {
        network_name: response.data.network_name || name,
        leases: response.data.leases || [],
        count: response.data.count ?? (response.data.leases?.length || 0),
      };
    }

    throw new VirtualizationAPIError('INVALID_RESPONSE', 'Invalid response format from getNetworkDHCPLeases');
  }

  /**
   * Get ports for a virtual network
   */
  async getNetworkPorts(
    name: string,
  ): Promise<{ network_name: string; ports: any[]; count: number }> {
    const response = await apiRequest<{
      status: string;
      data?: { network_name?: string; ports?: any[]; count?: number };
    }>(`/networks/${name}/ports`);

    if (response.status === 'success' && response.data) {
      return {
        network_name: response.data.network_name || name,
        ports: response.data.ports || [],
        count: response.data.count ?? (response.data.ports?.length || 0),
      };
    }

    throw new VirtualizationAPIError('INVALID_RESPONSE', 'Invalid response format from getNetworkPorts');
  }

  /**
   * Delete a virtual network
   */
  async deleteNetwork(name: string): Promise<void> {
    await apiRequest<void>(`/networks/${name}`, {
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
    return apiRequest<VMMetrics[]>(`/computes/${vmId}/metrics?duration=${duration}`);
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
    return `${protocol}//${window.location.host}${API_BASE}/computes/${vmId}/metrics/ws?token=${token}`;
  }

  // ============ Disk Management ============

  /**
   * Attach a disk to VM
   */
  async attachDisk(vmId: string, disk: DiskConfig): Promise<OperationResult> {
    return apiRequest<OperationResult>(`/computes/${vmId}/disks/attach`, {
      method: 'POST',
      body: JSON.stringify(disk),
    });
  }

  /**
   * Detach a disk from VM
   */
  async detachDisk(vmId: string, device: string): Promise<OperationResult> {
    return apiRequest<OperationResult>(`/computes/${vmId}/disks/${device}/detach`, {
      method: 'POST',
    });
  }

  /**
   * Resize a VM disk
   */
  async resizeDisk(vmId: string, device: string, newSize: number): Promise<OperationResult> {
    return apiRequest<OperationResult>(`/computes/${vmId}/disks/${device}/resize`, {
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
    return apiRequest<OperationResult>(`/computes/${vmId}/migrate`, {
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
    return apiRequest(`/computes/${vmId}/migrate/status`);
  }

  // ============ Enhanced API Methods with Full Types ============

  /**
   * Get VM snapshots with full type support
   */
  async getSnapshots(vmId: string): Promise<VMSnapshotListResponse> {
    return apiRequest<VMSnapshotListResponse>(`/computes/${vmId}/snapshots`);
  }

  /**
   * Create a VM snapshot
   */
  async createSnapshotTyped(vmId: string, request: VMSnapshotRequest): Promise<VMSnapshotCreateResponse> {
    return apiRequest<VMSnapshotCreateResponse>(`/computes/${vmId}/snapshots`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Revert VM to a snapshot
   */
  async revertSnapshot(vmId: string, snapshotName: string): Promise<VMSnapshotRevertResponse> {
    return apiRequest<VMSnapshotRevertResponse>(`/computes/${vmId}/snapshots/${snapshotName}/revert`, {
      method: 'POST',
    });
  }

  /**
   * Delete a VM snapshot
   */
  async deleteSnapshotTyped(vmId: string, snapshotName: string): Promise<void> {
    return apiRequest<void>(`/computes/${vmId}/snapshots/${snapshotName}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get snapshot capabilities for a VM
   */
  async getSnapshotCapabilities(vmId: string): Promise<SnapshotCapabilitiesResponse> {
    return apiRequest<SnapshotCapabilitiesResponse>(`/computes/${vmId}/snapshots/capabilities`);
  }

  /**
   * Get VM backups with full type support
   */
  async getBackups(vmId: string): Promise<VMBackup[]> {
    return this.listBackups(vmId);
  }

  /**
   * Create a VM backup
   */
  async createBackupTyped(vmId: string, request: BackupCreateRequest): Promise<VMBackup> {
    return this.createBackup(vmId, request);
  }

  /**
   * Clone a VM
   */
  async cloneVMTyped(vmId: string, request: VMCloneRequest): Promise<VMCloneResponse> {
    return apiRequest<VMCloneResponse>(`/computes/${vmId}/clone`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Hot-plug device to a running VM
   */
  async hotplug(vmId: string, request: HotplugRequest): Promise<HotplugResponse> {
    return apiRequest<HotplugResponse>(`/computes/${vmId}/hotplug`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Hot-unplug device from a running VM
   */
  async hotunplug(vmId: string, request: HotplugRequest): Promise<HotplugResponse> {
    return apiRequest<HotplugResponse>(`/computes/${vmId}/hotunplug`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Migrate VM to another host with full type support
   */
  async migrateVMTyped(vmId: string, request: MigrationRequest): Promise<MigrationResponse> {
    return apiRequest<MigrationResponse>(`/computes/${vmId}/migrate`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Get migration status with full type
   */
  async getMigrationStatusTyped(vmId: string): Promise<MigrationStatus> {
    return apiRequest<MigrationStatus>(`/computes/${vmId}/migrate/status`);
  }

  /**
   * Cancel ongoing migration
   */
  async cancelMigration(vmId: string): Promise<OperationResult> {
    return apiRequest<OperationResult>(`/computes/${vmId}/migrate/cancel`, {
      method: 'POST',
    });
  }

  /**
   * Get available consoles for a VM
   */
  async getConsoles(vmId: string): Promise<ConsolesResponse> {
    return apiRequest<ConsolesResponse>(`/computes/${vmId}/consoles`);
  }

  /**
   * Connect to a specific console type
   */
  async connectConsole(vmId: string, consoleType: string): Promise<ConsoleConnection> {
    return apiRequest<ConsoleConnection>(`/computes/${vmId}/consoles/${consoleType}/connect`, {
      method: 'POST',
    });
  }

  /**
   * Get enhanced VM metrics
   */
  async getVMMetricsEnhanced(vmId: string, duration = '1h'): Promise<VMMetricsEnhanced> {
    return apiRequest<VMMetricsEnhanced>(`/computes/${vmId}/metrics?duration=${duration}&enhanced=true`);
  }
}



// Export singleton instance
export const virtualizationAPI = new VirtualizationAPI();

// Export default
export default virtualizationAPI;
