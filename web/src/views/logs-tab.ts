import { LitElement, html, css } from 'lit';
import { state } from 'lit/decorators.js';
import { t } from '../i18n';
import { WebSocketManager } from '../api';
import type { WSLogMessage } from '../types/api';

export class LogsTab extends LitElement {
  @state()
  private logs: WSLogMessage[] = [];
  
  @state()
  private serviceFilter = '';
  
  @state()
  private priorityFilter = 'info';
  
  @state()
  private follow = true;
  
  @state()
  private connected = false;
  
  private wsManager: WebSocketManager | null = null;
  private logsContainer: HTMLElement | null = null;
  private maxLogs = 1000; // Maximum number of logs to keep in memory
  
  static override styles = css`
    :host {
      display: block;
      padding: 16px;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    h1 {
      margin: 0 0 24px 0;
      font-size: 24px;
      font-weight: 300;
    }

    .controls {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
      align-items: center;
      flex-wrap: wrap;
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
      background: var(--vscode-bg);
      border: 1px solid var(--vscode-border);
      border-radius: 4px;
      padding: 8px;
      font-family: var(--vscode-font-family-mono);
      font-size: 12px;
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

    .priority-emergency,
    .priority-alert,
    .priority-critical {
      color: var(--vscode-error);
    }

    .priority-error {
      color: var(--error);
    }

    .priority-warning {
      color: var(--warning);
    }

    .priority-notice,
    .priority-info {
      color: var(--vscode-text);
    }

    .priority-debug {
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

  override connectedCallback() {
    super.connectedCallback();
    this.initWebSocket();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.cleanup();
  }

  override firstUpdated() {
    this.logsContainer = this.shadowRoot?.querySelector('.logs-container') as HTMLElement;
  }

  private async initWebSocket() {
    try {
      this.wsManager = new WebSocketManager('/ws/logs');
      
      // Listen for authentication success before subscribing
      this.wsManager.on('auth_success', () => {
        this.connected = true;
        // Subscribe to logs after successful authentication
        this.subscribeToLogs();
      });
      
      this.wsManager.on('log', (message: any) => {
        this.addLog(message);
      });
      
      this.wsManager.on('error', (message) => {
        console.error('WebSocket error:', message.error);
        this.connected = false;
      });

      await this.wsManager.connect();
    } catch (error) {
      console.error('Failed to connect to logs WebSocket:', error);
      this.connected = false;
    }
  }

  private subscribeToLogs() {
    if (!this.wsManager) return;
    
    const filters: any = {
      follow: this.follow
    };
    
    if (this.serviceFilter) {
      filters.services = this.serviceFilter.split(',').map(s => s.trim()).filter(Boolean);
    }
    
    if (this.priorityFilter) {
      filters.priority = this.priorityFilter;
    }
    
    this.wsManager.send({
      type: 'subscribe',
      filters
    });
  }

  private addLog(log: WSLogMessage) {
    this.logs = [...this.logs, log];
    
    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    // Auto-scroll if following
    if (this.follow && this.logsContainer) {
      this.updateComplete.then(() => {
        if (this.logsContainer) {
          this.logsContainer.scrollTop = this.logsContainer.scrollHeight;
        }
      });
    }
  }

  private handleServiceFilterChange(event: Event) {
    this.serviceFilter = (event.target as HTMLInputElement).value;
    if (this.connected) {
      this.subscribeToLogs();
    }
  }

  private handlePriorityChange(event: Event) {
    this.priorityFilter = (event.target as HTMLSelectElement).value;
    if (this.connected) {
      this.subscribeToLogs();
    }
  }

  private handleFollowChange(event: Event) {
    this.follow = (event.target as HTMLInputElement).checked;
    if (this.connected) {
      this.subscribeToLogs();
    }
  }

  private clearLogs() {
    this.logs = [];
  }

  private cleanup() {
    if (this.wsManager) {
      this.wsManager.disconnect();
      this.wsManager = null;
    }
    this.connected = false;
  }

  private formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleString();
  }

  private renderLog(log: WSLogMessage) {
    return html`
      <div class="log-entry">
        <span class="log-timestamp">${this.formatTimestamp(log.timestamp)}</span>
        <span class="log-service" title="${log.service || 'system'}">${log.service || 'system'}</span>
        <span class="log-priority priority-${log.priority || 'info'}">${(log.priority || 'info').toUpperCase()}</span>
        <span class="log-message">${log.message}</span>
      </div>
    `;
  }

  override render() {
    return html`
      <h1>${t('logs.title')}</h1>
      
      <div class="controls">
        <div class="filter-group">
          <input 
            class="filter-input" 
            type="text" 
            placeholder="${t('logs.filterServices')}" 
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
            <option value="debug">Debug</option>
            <option value="info">Info</option>
            <option value="notice">Notice</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
            <option value="critical">Critical</option>
            <option value="alert">Alert</option>
            <option value="emergency">Emergency</option>
          </select>
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
          : html`<div class="empty-state">${t('logs.noLogs')}</div>`
        }
      </div>
    `;
  }
}

customElements.define('logs-tab', LogsTab);
