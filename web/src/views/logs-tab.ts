import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';
import { t } from '../i18n';
import { api } from '../api';

export class LogsTab extends LitElement {
  @property({ type: Array }) logs = [];
  @property({ type: String }) filter = '';

  static styles = css`
    :host {
      display: block;
      padding: 16px;
    }

    .filter {
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
    }

    .log {
      background: var(--vscode-bg-light);
      color: var(--vscode-text);
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 8px;
      font-size: 12px;
      white-space: pre-wrap;
    }

    .log-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .log-header div {
      font-weight: bold;
    }

    .log-content {
      margin-top: 8px;
    }

    .filter-input {
      flex: 1;
      padding: 8px;
      border: 1px solid var(--vscode-border);
      background: var(--vscode-bg);
      color: var(--vscode-text);
      border-radius: 4px;
      margin-right: 8px;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.fetchLogs();
  }

  async fetchLogs() {
    try {
      const data = await api.get('/logs', { priority: this.filter });
      this.logs = data.logs;
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  }

  handleFilterChange(event) {
    this.filter = event.target.value;
    this.fetchLogs();
  }

  renderLog(log) {
    return html`
      <div class="log">
        <div class="log-header">
          <div>${log.timestamp}</div>
          <div>${log.priority.toUpperCase()}</div>
        </div>
        <div class="log-content">
          ${log.message}
        </div>
      </div>
    `;
  }

  render() {
    return html`
      <div class="filter">
        <input class="filter-input" type="text" placeholder="${t('logs.service')}" @input="${this.handleFilterChange}" />
        <button @click="${this.fetchLogs}">${t('common.refresh')}</button>
      </div>
      ${this.logs.map((log) => this.renderLog(log))}
    `;
  }
}

customElements.define('logs-tab', LogsTab);
