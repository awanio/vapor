import { Api } from '../api';
import { WebSocketManager } from '../api';
import type { WSMessage } from '../types/api';
import type {
  // PlaybookInfo,
  // PlaybookDetail,
  PlaybookUploadRequest,
  PlaybookValidationResponse,
  PlaybookRunRequest,
  ExecutionStartResponse,
  ExecutionSummary,
  // ExecutionDetail,
  AdHocRequest,
  // PlaybookTemplate,
  CreateFromTemplateRequest,
  // AnsibleInventory,
  SaveInventoryRequest,
  GitSyncRequest,
  GalaxyInstallRequest,
  // ScheduleInfo,
  CreateScheduleRequest,
  PlaybooksListResponse,
  PlaybookDetailResponse,
  ExecutionsListResponse,
  ExecutionDetailResponse,
  TemplatesListResponse,
  DynamicInventoryResponse,
  SchedulesListResponse,
  ExecutionStreamMessage,
} from '../types/ansible';

/**
 * Ansible API Service
 * Handles all Ansible-related API operations
 */
export class AnsibleService {
  // Playbook Management
  
  /**
   * List all available playbooks
   */
  static async listPlaybooks(): Promise<PlaybooksListResponse> {
    return Api.get<PlaybooksListResponse>('/ansible/playbooks');
  }

  /**
   * Get detailed information about a specific playbook
   */
  static async getPlaybook(name: string): Promise<PlaybookDetailResponse> {
    return Api.get<PlaybookDetailResponse>(`/ansible/playbooks/${encodeURIComponent(name)}`);
  }

  /**
   * Upload a new playbook
   */
  static async uploadPlaybook(request: PlaybookUploadRequest): Promise<{ message: string }> {
    // Convert content to base64 if it's not already
    const base64Content = btoa(request.content);
    return Api.post('/ansible/playbooks/upload', {
      ...request,
      content: base64Content,
    });
  }

  /**
   * Delete a playbook
   */
  static async deletePlaybook(name: string): Promise<{ message: string }> {
    return Api.delete(`/ansible/playbooks/${encodeURIComponent(name)}`);
  }

  /**
   * Validate playbook syntax
   */
  static async validatePlaybook(name: string): Promise<PlaybookValidationResponse> {
    return Api.post('/ansible/playbooks/validate', { name });
  }

  /**
   * Run a playbook
   */
  static async runPlaybook(request: PlaybookRunRequest): Promise<ExecutionStartResponse> {
    return Api.post('/ansible/playbooks/run', request);
  }

  /**
   * Download playbook from URL
   */
  static async downloadFromUrl(url: string, name: string): Promise<{ message: string }> {
    return Api.post('/ansible/playbooks/from-url', { url, name });
  }

  // Template Management

  /**
   * Get available playbook templates
   */
  static async listTemplates(): Promise<TemplatesListResponse> {
    return Api.get<TemplatesListResponse>('/ansible/playbooks/templates');
  }

  /**
   * Create playbook from template
   */
  static async createFromTemplate(request: CreateFromTemplateRequest): Promise<{ message: string }> {
    return Api.post('/ansible/playbooks/from-template', request);
  }

  // Git and Galaxy Integration

  /**
   * Sync playbooks from Git repository
   */
  static async syncFromGit(request: GitSyncRequest): Promise<{ message: string }> {
    return Api.post('/ansible/playbooks/sync-git', request);
  }

  /**
   * Install from Ansible Galaxy
   */
  static async installFromGalaxy(request: GalaxyInstallRequest): Promise<{ message: string }> {
    return Api.post('/ansible/playbooks/from-galaxy', request);
  }

  // Ad-hoc Commands

  /**
   * Run ad-hoc Ansible command
   */
  static async runAdHoc(request: AdHocRequest): Promise<ExecutionStartResponse> {
    return Api.post('/ansible/adhoc', request);
  }

  // Execution Management

  /**
   * List all executions with optional filters
   */
  static async listExecutions(
    status?: 'running' | 'success' | 'failed',
    type?: 'playbook' | 'adhoc',
    limit?: number
  ): Promise<ExecutionsListResponse> {
    const params: Record<string, any> = {};
    if (status) params.status = status;
    if (type) params.type = type;
    if (limit) params.limit = limit;
    
    return Api.get<ExecutionsListResponse>('/ansible/executions', params);
  }

  /**
   * Get detailed information about an execution
   */
  static async getExecution(id: string): Promise<ExecutionDetailResponse> {
    return Api.get<ExecutionDetailResponse>(`/ansible/executions/${id}`);
  }

  /**
   * Cancel a running execution
   */
  static async cancelExecution(id: string): Promise<{ message: string }> {
    return Api.delete(`/ansible/executions/${id}`);
  }

  /**
   * Create WebSocket connection for streaming execution output
   */
  static createExecutionStream(
    executionId: string,
    onMessage: (message: ExecutionStreamMessage) => void,
    onError?: (error: Error) => void,
    onComplete?: () => void
  ): WebSocketManager {
    const wsManager = new WebSocketManager(`/api/v1/ansible/executions/${executionId}/stream`);
    
    // Subscribe to messages
    wsManager.on('message', (rawMessage: any) => {
      try {
        // Parse the message based on expected format
        if (typeof rawMessage === 'string') {
          // If it's a plain string, treat it as output
          onMessage({
            type: 'output',
            content: rawMessage,
            time: Date.now(),
          });
        } else if (rawMessage.type) {
          // If it has a type field, it's a structured message
          onMessage(rawMessage as ExecutionStreamMessage);
          
          // Handle completion
          if (rawMessage.type === 'complete' && onComplete) {
            onComplete();
          }
        }
      } catch (error) {
        console.error('Error parsing execution stream message:', error);
        if (onError) {
          onError(error as Error);
        }
      }
    });

    // Subscribe to errors
    if (onError) {
      wsManager.on('error', (error: WSMessage) => onError(error as unknown as Error));
    }

    // Subscribe to close event
    wsManager.on('close', () => {
      if (onComplete) {
        onComplete();
      }
    });

    return wsManager;
  }

  // Inventory Management

  /**
   * Get dynamic inventory from system
   */
  static async getDynamicInventory(): Promise<DynamicInventoryResponse> {
    return Api.get<DynamicInventoryResponse>('/ansible/inventory/dynamic');
  }

  /**
   * Save inventory configuration
   */
  static async saveInventory(request: SaveInventoryRequest): Promise<{ message: string }> {
    return Api.post('/ansible/inventory', request);
  }

  /**
   * Get saved inventory
   */
  static async getInventory(name: string): Promise<DynamicInventoryResponse> {
    return Api.get<DynamicInventoryResponse>(`/ansible/inventory/${encodeURIComponent(name)}`);
  }

  // Schedule Management (for future implementation)

  /**
   * List scheduled tasks
   */
  static async listSchedules(): Promise<SchedulesListResponse> {
    return Api.get<SchedulesListResponse>('/ansible/schedules');
  }

  /**
   * Create scheduled task
   */
  static async createSchedule(request: CreateScheduleRequest): Promise<{ message: string }> {
    return Api.post('/ansible/schedules', request);
  }

  /**
   * Delete scheduled task
   */
  static async deleteSchedule(id: string): Promise<{ message: string }> {
    return Api.delete(`/ansible/schedules/${id}`);
  }

  // Utility Methods

  /**
   * Convert playbook content to base64 for upload
   */
  static encodePlaybookContent(content: string): string {
    return btoa(unescape(encodeURIComponent(content)));
  }

  /**
   * Decode base64 playbook content
   */
  static decodePlaybookContent(base64Content: string): string {
    return decodeURIComponent(escape(atob(base64Content)));
  }

  /**
   * Format execution duration from seconds to human-readable string
   */
  static formatDuration(seconds?: number): string {
    if (!seconds) return '0s';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
    
    return parts.join(' ');
  }

  /**
   * Format host summary for display
   */
  static formatHostSummary(summary?: ExecutionSummary['hosts_summary']): string {
    if (!summary) return 'No hosts';
    
    const parts = [];
    if (summary.ok > 0) parts.push(`${summary.ok} ok`);
    if (summary.changed > 0) parts.push(`${summary.changed} changed`);
    if (summary.failed > 0) parts.push(`${summary.failed} failed`);
    if (summary.unreachable > 0) parts.push(`${summary.unreachable} unreachable`);
    if (summary.skipped > 0) parts.push(`${summary.skipped} skipped`);
    
    return parts.length > 0 ? parts.join(', ') : 'No tasks';
  }

  /**
   * Parse YAML content to extract playbook metadata
   */
  static parsePlaybookMetadata(content: string): {
    name?: string;
    hosts?: string;
    tasks?: number;
    plays?: number;
  } {
    try {
      // Basic YAML parsing for metadata extraction
      const lines = content.split('\n');
      let name, hosts;
      let tasks = 0;
      let plays = 0;
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('- name:')) {
          if (plays === 0) {
            name = trimmed.substring(7).trim().replace(/['"]/g, '');
          }
          plays++;
        } else if (trimmed.startsWith('hosts:')) {
          if (!hosts) {
            hosts = trimmed.substring(6).trim().replace(/['"]/g, '');
          }
        } else if (trimmed.startsWith('- name:') && plays > 0) {
          tasks++;
        }
      }
      
      return { name, hosts, tasks, plays };
    } catch (error) {
      console.error('Error parsing playbook metadata:', error);
      return {};
    }
  }
}
