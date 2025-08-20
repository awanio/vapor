import { WebSocketManager } from '../api';
import type { PlaybookUploadRequest, PlaybookValidationResponse, PlaybookRunRequest, ExecutionStartResponse, ExecutionSummary, AdHocRequest, CreateFromTemplateRequest, SaveInventoryRequest, GitSyncRequest, GalaxyInstallRequest, CreateScheduleRequest, PlaybooksListResponse, PlaybookDetailResponse, ExecutionsListResponse, ExecutionDetailResponse, TemplatesListResponse, DynamicInventoryResponse, SchedulesListResponse, ExecutionStreamMessage } from '../types/ansible';
export declare class AnsibleService {
    static listPlaybooks(): Promise<PlaybooksListResponse>;
    static getPlaybook(name: string): Promise<PlaybookDetailResponse>;
    static uploadPlaybook(request: PlaybookUploadRequest): Promise<{
        message: string;
    }>;
    static deletePlaybook(name: string): Promise<{
        message: string;
    }>;
    static validatePlaybook(name: string): Promise<PlaybookValidationResponse>;
    static runPlaybook(request: PlaybookRunRequest): Promise<ExecutionStartResponse>;
    static downloadFromUrl(url: string, name: string): Promise<{
        message: string;
    }>;
    static listTemplates(): Promise<TemplatesListResponse>;
    static createFromTemplate(request: CreateFromTemplateRequest): Promise<{
        message: string;
    }>;
    static syncFromGit(request: GitSyncRequest): Promise<{
        message: string;
    }>;
    static installFromGalaxy(request: GalaxyInstallRequest): Promise<{
        message: string;
    }>;
    static runAdHoc(request: AdHocRequest): Promise<ExecutionStartResponse>;
    static listExecutions(status?: 'running' | 'success' | 'failed', type?: 'playbook' | 'adhoc', limit?: number): Promise<ExecutionsListResponse>;
    static getExecution(id: string): Promise<ExecutionDetailResponse>;
    static cancelExecution(id: string): Promise<{
        message: string;
    }>;
    static createExecutionStream(executionId: string, onMessage: (message: ExecutionStreamMessage) => void, onError?: (error: Error) => void, onComplete?: () => void): WebSocketManager;
    static getDynamicInventory(): Promise<DynamicInventoryResponse>;
    static saveInventory(request: SaveInventoryRequest): Promise<{
        message: string;
    }>;
    static getInventory(name: string): Promise<DynamicInventoryResponse>;
    static listSchedules(): Promise<SchedulesListResponse>;
    static createSchedule(request: CreateScheduleRequest): Promise<{
        message: string;
    }>;
    static deleteSchedule(id: string): Promise<{
        message: string;
    }>;
    static encodePlaybookContent(content: string): string;
    static decodePlaybookContent(base64Content: string): string;
    static formatDuration(seconds?: number): string;
    static formatHostSummary(summary?: ExecutionSummary['hosts_summary']): string;
    static parsePlaybookMetadata(content: string): {
        name?: string;
        hosts?: string;
        tasks?: number;
        plays?: number;
    };
}
//# sourceMappingURL=ansible.d.ts.map