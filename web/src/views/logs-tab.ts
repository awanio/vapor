import { html, css } from 'lit';
import { state } from 'lit/decorators.js';
import { t } from '../i18n';
import { I18nLitElement } from '../i18n-mixin';
import { subscribeToEventsChannel } from '../stores/shared/events-stream';
import type { WSLogMessage } from '../types/api';

export class LogsTab extends I18nLitElement {
  @state()
  private logs: WSLogMessage[] = [];

  @state()
  private serviceFilter = '';

  @state()
  private priorityFilter = 'info';

  @state()
  private sinceFilter = '';

  @state()
  private follow = true;

  @state()
  private connected = false;

  @state()
  private autoScroll = true;

  private unsubscribeLogs: (() => void) | null = null;
  private logsContainer: HTMLElement | null = null;
  private maxLogs = 1000; // Maximum number of logs to keep in memory

  private buildFilters(): any {
    const filters: any = {
      follow: this.follow,
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

    return filters;
  }

  static override styles = css`
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
      border: 1px solid var(--cds-border-subtle);
      background: var(--cds-background);
      color: var(--cds-text-primary);
      border-radius: 0;
      font-size: 14px;
      min-width: 200px;
    }

    .priority-select {
      padding: 8px;
      border: 1px solid var(--cds-border-subtle);
      background: var(--cds-background);
      color: var(--cds-text-primary);
      border-radius: 0;
      font-size: 14px;
    }

    .toggle-follow {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }

    .toggle-follow input[type="checkbox"] {
      cursor: pointer;
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: var(--cds-text-secondary);
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--cds-support-error);
    }

    .status-dot.connected {
      background: var(--cds-support-success);
    }

    .logs-container {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      background: var(--cds-background);
      border: 1px solid var(--cds-border-subtle);
      border-radius: 0;
      padding: 8px;
      font-family: var(--cds-font-mono);
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
      background: var(--cds-layer-01);
    }

    .log-timestamp {
      color: var(--cds-text-secondary);
      white-space: nowrap;
    }

    .log-service {
      color: var(--cds-button-primary);
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
      color: var(--cds-support-error);
      background: rgba(255, 0, 0, 0.1);
    }

    .priority-alert,
    .priority-1 {
      color: var(--cds-support-error);
    }

    .priority-crit,
    .priority-critical,
    .priority-2 {
      color: var(--cds-support-error);
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
      color: var(--cds-text-primary);
    }

    .priority-info,
    .priority-6 {
      color: var(--cds-text-primary);
    }

    .priority-debug,
    .priority-7 {
      color: var(--cds-text-secondary);
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
      color: var(--cds-text-secondary);
    }

    button {
      padding: 6px 12px;
      border: none;
      border-radius: 0;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.15s;
      background: var(--cds-button-primary);
      color: white;
    }

    button:hover {
      background: var(--cds-button-primary-hover);
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
    // Logs now stream via the shared /ws/events connection.
    this.subscribeToLogs();
  }

  private subscribeToLogs() {
    // Replace existing subscription to avoid duplicate routers.
    if (this.unsubscribeLogs) {
      this.unsubscribeLogs();
      this.unsubscribeLogs = null;
    }

    const filters = this.buildFilters();

    this.unsubscribeLogs = subscribeToEventsChannel({
      channel: 'log-events',
      routeId: 'logs-tab',
      subscribePayload: { filters },
      onConnectionChange: (connected) => {
        this.connected = connected;
      },
      onEvent: (payload: any) => {
        // Expected payload (from /ws/events): { kind: 'log', entry: { timestamp, level, unit, message, ... } }
        const kind = payload?.kind;
        const entry = payload?.entry ?? payload;

        if (kind && kind !== 'log') return;
        if (!entry) return;

        const messageText = entry.message ?? entry.msg ?? '';
        if (!messageText) return;

        const logEntry: WSLogMessage = {
          type: 'log',
          timestamp: entry.timestamp || new Date().toISOString(),
          service: entry.unit || entry.service || 'system',
          priority: String(entry.level || entry.priority || 'info').toLowerCase(),
          message: String(messageText),
          hostname: entry.hostname,
          pid: entry.pid,
        };

        this.addLog(logEntry);
      },
    });
  }

  private addLog(log: WSLogMessage) {
    // Create a new array to ensure reactive update
    const newLogs = [...this.logs, log];

    // Keep only the last maxLogs entries
    this.logs = newLogs.length > this.maxLogs ? newLogs.slice(-this.maxLogs) : newLogs;

    // Auto-scroll if enabled
    if (this.autoScroll && this.logsContainer) {
      this.updateComplete.then(() => {
        if (this.logsContainer) {
          this.logsContainer.scrollTop = this.logsContainer.scrollHeight;
        }
      });
    }
  }

  private handleServiceFilterChange(event: Event) {
    this.serviceFilter = (event.target as HTMLInputElement).value;
    this.logs = []; // Clear logs when filter changes
    this.subscribeToLogs();
  }

  private handlePriorityChange(event: Event) {
    this.priorityFilter = (event.target as HTMLSelectElement).value;
    this.logs = []; // Clear logs when filter changes
    this.subscribeToLogs();
  }

  private handleSinceFilterChange(event: Event) {
    this.sinceFilter = (event.target as HTMLInputElement).value;
    this.logs = []; // Clear logs when filter changes
    this.subscribeToLogs();
  }

  private handleFollowChange(event: Event) {
    this.follow = (event.target as HTMLInputElement).checked;
    this.subscribeToLogs();
  }

  private handleAutoScrollChange(event: Event) {
    this.autoScroll = (event.target as HTMLInputElement).checked;
    // If turning on auto-scroll, immediately scroll to bottom
    if (this.autoScroll && this.logsContainer) {
      this.logsContainer.scrollTop = this.logsContainer.scrollHeight;
    }
  }

  private clearLogs() {
    this.logs = [];
  }

  private cleanup() {
    if (this.unsubscribeLogs) {
      this.unsubscribeLogs();
      this.unsubscribeLogs = null;
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
          : html`<div class="empty-state">${t('logs.noLogs')}</div>`
        }
      </div>
    `;
  }
}

customElements.define('logs-tab', LogsTab);
