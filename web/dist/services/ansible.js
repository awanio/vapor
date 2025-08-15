import { Api } from '../api';
import { WebSocketManager } from '../api';
export class AnsibleService {
    static async listPlaybooks() {
        return Api.get('/ansible/playbooks');
    }
    static async getPlaybook(name) {
        return Api.get(`/ansible/playbooks/${encodeURIComponent(name)}`);
    }
    static async uploadPlaybook(request) {
        const base64Content = btoa(request.content);
        return Api.post('/ansible/playbooks/upload', {
            ...request,
            content: base64Content,
        });
    }
    static async deletePlaybook(name) {
        return Api.delete(`/ansible/playbooks/${encodeURIComponent(name)}`);
    }
    static async validatePlaybook(name) {
        return Api.post('/ansible/playbooks/validate', { name });
    }
    static async runPlaybook(request) {
        return Api.post('/ansible/playbooks/run', request);
    }
    static async downloadFromUrl(url, name) {
        return Api.post('/ansible/playbooks/from-url', { url, name });
    }
    static async listTemplates() {
        return Api.get('/ansible/playbooks/templates');
    }
    static async createFromTemplate(request) {
        return Api.post('/ansible/playbooks/from-template', request);
    }
    static async syncFromGit(request) {
        return Api.post('/ansible/playbooks/sync-git', request);
    }
    static async installFromGalaxy(request) {
        return Api.post('/ansible/playbooks/from-galaxy', request);
    }
    static async runAdHoc(request) {
        return Api.post('/ansible/adhoc', request);
    }
    static async listExecutions(status, type, limit) {
        const params = {};
        if (status)
            params.status = status;
        if (type)
            params.type = type;
        if (limit)
            params.limit = limit;
        return Api.get('/ansible/executions', params);
    }
    static async getExecution(id) {
        return Api.get(`/ansible/executions/${id}`);
    }
    static async cancelExecution(id) {
        return Api.delete(`/ansible/executions/${id}`);
    }
    static createExecutionStream(executionId, onMessage, onError, onComplete) {
        const wsManager = new WebSocketManager(`/api/v1/ansible/executions/${executionId}/stream`);
        wsManager.subscribe('message', (rawMessage) => {
            try {
                if (typeof rawMessage === 'string') {
                    onMessage({
                        type: 'output',
                        content: rawMessage,
                        time: Date.now(),
                    });
                }
                else if (rawMessage.type) {
                    onMessage(rawMessage);
                    if (rawMessage.type === 'complete' && onComplete) {
                        onComplete();
                    }
                }
            }
            catch (error) {
                console.error('Error parsing execution stream message:', error);
                if (onError) {
                    onError(error);
                }
            }
        });
        if (onError) {
            wsManager.subscribe('error', onError);
        }
        wsManager.subscribe('close', () => {
            if (onComplete) {
                onComplete();
            }
        });
        return wsManager;
    }
    static async getDynamicInventory() {
        return Api.get('/ansible/inventory/dynamic');
    }
    static async saveInventory(request) {
        return Api.post('/ansible/inventory', request);
    }
    static async getInventory(name) {
        return Api.get(`/ansible/inventory/${encodeURIComponent(name)}`);
    }
    static async listSchedules() {
        return Api.get('/ansible/schedules');
    }
    static async createSchedule(request) {
        return Api.post('/ansible/schedules', request);
    }
    static async deleteSchedule(id) {
        return Api.delete(`/ansible/schedules/${id}`);
    }
    static encodePlaybookContent(content) {
        return btoa(unescape(encodeURIComponent(content)));
    }
    static decodePlaybookContent(base64Content) {
        return decodeURIComponent(escape(atob(base64Content)));
    }
    static formatDuration(seconds) {
        if (!seconds)
            return '0s';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        const parts = [];
        if (hours > 0)
            parts.push(`${hours}h`);
        if (minutes > 0)
            parts.push(`${minutes}m`);
        if (secs > 0 || parts.length === 0)
            parts.push(`${secs}s`);
        return parts.join(' ');
    }
    static formatHostSummary(summary) {
        if (!summary)
            return 'No hosts';
        const parts = [];
        if (summary.ok > 0)
            parts.push(`${summary.ok} ok`);
        if (summary.changed > 0)
            parts.push(`${summary.changed} changed`);
        if (summary.failed > 0)
            parts.push(`${summary.failed} failed`);
        if (summary.unreachable > 0)
            parts.push(`${summary.unreachable} unreachable`);
        if (summary.skipped > 0)
            parts.push(`${summary.skipped} skipped`);
        return parts.length > 0 ? parts.join(', ') : 'No tasks';
    }
    static parsePlaybookMetadata(content) {
        try {
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
                }
                else if (trimmed.startsWith('hosts:')) {
                    if (!hosts) {
                        hosts = trimmed.substring(6).trim().replace(/['"]/g, '');
                    }
                }
                else if (trimmed.startsWith('- name:') && plays > 0) {
                    tasks++;
                }
            }
            return { name, hosts, tasks, plays };
        }
        catch (error) {
            console.error('Error parsing playbook metadata:', error);
            return {};
        }
    }
}
//# sourceMappingURL=ansible.js.map