var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { html, css } from 'lit';
import { state } from 'lit/decorators.js';
import { t } from '../i18n';
import { I18nLitElement } from '../i18n-mixin';
import { WebSocketManager } from '../api';
export class LogsTab extends I18nLitElement {
    constructor() {
        super(...arguments);
        this.logs = [];
        this.serviceFilter = '';
        this.priorityFilter = 'info';
        this.sinceFilter = '';
        this.follow = true;
        this.connected = false;
        this.autoScroll = true;
        this.wsManager = null;
        this.logsContainer = null;
        this.maxLogs = 1000;
    }
    update(changedProperties) {
        super.update(changedProperties);
        console.log('Component updated', {
            logs: this.logs.length,
            connected: this.connected
        });
    }
    connectedCallback() {
        super.connectedCallback();
        this.initWebSocket();
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        this.cleanup();
    }
    firstUpdated() {
        this.logsContainer = this.shadowRoot?.querySelector('.logs-container');
    }
    async initWebSocket() {
        try {
            this.wsManager = new WebSocketManager('/ws/logs');
            this.wsManager.on('auth', (message) => {
                if (message.payload?.authenticated === true) {
                    this.connected = true;
                    this.subscribeToLogs();
                }
            });
            this.wsManager.on('data', (message) => {
                console.log('Received data message:', message);
                const logData = message.payload || message;
                if (logData.message) {
                    const logEntry = {
                        type: 'log',
                        timestamp: logData.timestamp || new Date().toISOString(),
                        service: logData.service || logData.unit || 'system',
                        priority: logData.priority || logData.level || 'info',
                        message: logData.message || '',
                        hostname: logData.hostname,
                        pid: logData.pid
                    };
                    this.addLog(logEntry);
                }
            });
            this.wsManager.on('logs', (message) => {
                console.log('Received logs message:', message);
                if (message.payload && Array.isArray(message.payload)) {
                    message.payload.forEach((logData) => {
                        const logEntry = {
                            type: 'log',
                            timestamp: logData.timestamp || new Date().toISOString(),
                            service: logData.service || logData.unit || 'system',
                            priority: logData.priority || logData.level || 'info',
                            message: logData.message || '',
                            hostname: logData.hostname,
                            pid: logData.pid
                        };
                        this.addLog(logEntry);
                    });
                }
            });
            this.wsManager.on('error', (message) => {
                console.error('WebSocket error:', message.error);
                this.connected = false;
            });
            await this.wsManager.connect();
        }
        catch (error) {
            console.error('Failed to connect to logs WebSocket:', error);
            this.connected = false;
        }
    }
    subscribeToLogs() {
        if (!this.wsManager)
            return;
        const filters = {
            follow: this.follow
        };
        if (this.serviceFilter) {
            const serviceName = this.serviceFilter.trim();
            if (serviceName) {
                filters.unit = serviceName;
            }
        }
        if (this.priorityFilter && this.priorityFilter !== 'all') {
            filters.priority = this.priorityFilter;
        }
        if (this.sinceFilter) {
            filters.since = this.sinceFilter;
        }
        const subscribeMessage = {
            type: 'subscribe',
            payload: {
                filters
            }
        };
        console.log('Sending subscribe message:', subscribeMessage);
        this.wsManager.send(subscribeMessage);
    }
    addLog(log) {
        console.log('Adding log entry:', log);
        console.log('Current logs count before:', this.logs.length);
        const newLogs = [...this.logs, log];
        if (newLogs.length > this.maxLogs) {
            this.logs = newLogs.slice(-this.maxLogs);
        }
        else {
            this.logs = newLogs;
        }
        console.log('Current logs count after:', this.logs.length);
        console.log('First log:', this.logs[0]);
        this.requestUpdate();
        if (this.autoScroll && this.logsContainer) {
            this.updateComplete.then(() => {
                if (this.logsContainer) {
                    this.logsContainer.scrollTop = this.logsContainer.scrollHeight;
                }
            });
        }
    }
    handleServiceFilterChange(event) {
        this.serviceFilter = event.target.value;
        if (this.connected) {
            this.logs = [];
            this.subscribeToLogs();
        }
    }
    handlePriorityChange(event) {
        this.priorityFilter = event.target.value;
        if (this.connected) {
            this.logs = [];
            this.subscribeToLogs();
        }
    }
    handleSinceFilterChange(event) {
        this.sinceFilter = event.target.value;
        if (this.connected) {
            this.logs = [];
            this.subscribeToLogs();
        }
    }
    handleFollowChange(event) {
        this.follow = event.target.checked;
        if (this.connected) {
            this.subscribeToLogs();
        }
    }
    handleAutoScrollChange(event) {
        this.autoScroll = event.target.checked;
        if (this.autoScroll && this.logsContainer) {
            this.logsContainer.scrollTop = this.logsContainer.scrollHeight;
        }
    }
    clearLogs() {
        this.logs = [];
    }
    cleanup() {
        if (this.wsManager) {
            this.wsManager.disconnect();
            this.wsManager = null;
        }
        this.connected = false;
    }
    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString();
    }
    renderLog(log) {
        return html `
      <div class="log-entry">
        <span class="log-timestamp">${this.formatTimestamp(log.timestamp)}</span>
        <span class="log-service" title="${log.service || 'system'}">${log.service || 'system'}</span>
        <span class="log-priority priority-${log.priority || 'info'}">${(log.priority || 'info').toUpperCase()}</span>
        <span class="log-message">${log.message}</span>
      </div>
    `;
    }
    render() {
        return html `
      <h1>${t('logs.title')}</h1>
      
      <div class="controls">
        <div class="filter-group">
          <input 
            class="filter-input" 
            type="text" 
            placeholder="${t('logs.filterServices')} (e.g., 'systemd', 'nginx')" 
            .value="${this.serviceFilter}"
            @input="${this.handleServiceFilterChange}"
          />
        </div>
        
        <div class="filter-group">
          <label for="priority">${t('logs.priority')}:</label>
          <select 
            id="priority" 
            class="priority-select" 
            .value="${this.priorityFilter}"
            @change="${this.handlePriorityChange}"
          >
            <option value="all">All</option>
            <option value="debug">Debug (7)</option>
            <option value="info">Info (6) and above</option>
            <option value="notice">Notice (5) and above</option>
            <option value="warning">Warning (4) and above</option>
            <option value="err">Error (3) and above</option>
            <option value="crit">Critical (2) and above</option>
            <option value="alert">Alert (1) and above</option>
            <option value="emerg">Emergency (0) only</option>
          </select>
        </div>
        
        <div class="filter-group">
          <input 
            class="filter-input" 
            type="text" 
            placeholder="${t('logs.since')} (e.g., '10 minutes ago', '1 hour ago')" 
            .value="${this.sinceFilter}"
            @input="${this.handleSinceFilterChange}"
          />
        </div>
        
        <div class="toggle-follow">
          <input 
            type="checkbox" 
            id="follow" 
            .checked="${this.follow}"
            @change="${this.handleFollowChange}"
          />
          <label for="follow">${t('logs.follow')}</label>
        </div>
        
        <div class="toggle-follow">
          <input 
            type="checkbox" 
            id="autoscroll" 
            .checked="${this.autoScroll}"
            @change="${this.handleAutoScrollChange}"
          />
          <label for="autoscroll">Auto-scroll</label>
        </div>
        
        <button @click="${this.clearLogs}" ?disabled="${this.logs.length === 0}">
          ${t('logs.clear')}
        </button>
        
        <div class="status-indicator">
          <div class="status-dot ${this.connected ? 'connected' : ''}"></div>
          <span>${this.connected ? t('common.connected') : t('common.disconnected')}</span>
        </div>
      </div>
      
      <div class="logs-container">
        ${this.logs.length > 0
            ? this.logs.map(log => this.renderLog(log))
            : html `<div class="empty-state">${t('logs.noLogs')}</div>`}
      </div>
    `;
    }
}
LogsTab.styles = css `
    :host {
      display: block;
      padding: 16px;
      height: 100%;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
    }

    h1 {
      margin: 0 0 24px 0;
      font-size: 24px;
      font-weight: 300;
      flex-shrink: 0;
    }

    .controls {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
      align-items: center;
      flex-wrap: wrap;
      flex-shrink: 0;
    }

    .filter-group {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .filter-input {
      padding: 8px;
      border: 1px solid var(--vscode-border);
      background: var(--vscode-bg);
      color: var(--vscode-text);
      border-radius: 4px;
      font-size: 13px;
      min-width: 200px;
    }

    .priority-select {
      padding: 8px;
      border: 1px solid var(--vscode-border);
      background: var(--vscode-bg);
      color: var(--vscode-text);
      border-radius: 4px;
      font-size: 13px;
    }

    .toggle-follow {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
    }

    .toggle-follow input[type="checkbox"] {
      cursor: pointer;
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: var(--vscode-text-dim);
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--vscode-error);
    }

    .status-dot.connected {
      background: var(--vscode-success);
    }

    .logs-container {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      background: var(--vscode-bg);
      border: 1px solid var(--vscode-border);
      border-radius: 4px;
      padding: 8px;
      font-family: var(--vscode-font-family-mono);
      font-size: 12px;
      min-height: 0; /* Important for flexbox overflow */
      position: relative;
    }

    .log-entry {
      padding: 4px 8px;
      margin-bottom: 2px;
      border-radius: 2px;
      display: grid;
      grid-template-columns: 160px 80px 100px 1fr;
      gap: 16px;
      align-items: start;
    }

    .log-entry:hover {
      background: var(--vscode-bg-light);
    }

    .log-timestamp {
      color: var(--vscode-text-dim);
      white-space: nowrap;
    }

    .log-service {
      color: var(--vscode-accent);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .log-priority {
      font-weight: 500;
      white-space: nowrap;
    }

    .priority-emerg,
    .priority-emergency,
    .priority-0 {
      color: var(--vscode-error);
      background: rgba(255, 0, 0, 0.1);
    }

    .priority-alert,
    .priority-1 {
      color: var(--vscode-error);
    }

    .priority-crit,
    .priority-critical,
    .priority-2 {
      color: var(--vscode-error);
    }

    .priority-err,
    .priority-error,
    .priority-3 {
      color: var(--error);
    }

    .priority-warning,
    .priority-4 {
      color: var(--warning);
    }

    .priority-notice,
    .priority-5 {
      color: var(--vscode-text);
    }

    .priority-info,
    .priority-6 {
      color: var(--vscode-text);
    }

    .priority-debug,
    .priority-7 {
      color: var(--vscode-text-dim);
    }

    .log-message {
      white-space: pre-wrap;
      word-break: break-word;
    }

    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 200px;
      color: var(--vscode-text-dim);
    }

    button {
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s;
      background: var(--vscode-accent);
      color: white;
    }

    button:hover {
      background: var(--vscode-accent-hover);
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `;
__decorate([
    state()
], LogsTab.prototype, "logs", void 0);
__decorate([
    state()
], LogsTab.prototype, "serviceFilter", void 0);
__decorate([
    state()
], LogsTab.prototype, "priorityFilter", void 0);
__decorate([
    state()
], LogsTab.prototype, "sinceFilter", void 0);
__decorate([
    state()
], LogsTab.prototype, "follow", void 0);
__decorate([
    state()
], LogsTab.prototype, "connected", void 0);
__decorate([
    state()
], LogsTab.prototype, "autoScroll", void 0);
customElements.define('logs-tab', LogsTab);
//# sourceMappingURL=logs-tab.js.map