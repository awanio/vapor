var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '../ui/status-badge.js';
let ResourceDetailView = class ResourceDetailView extends LitElement {
    constructor() {
        super(...arguments);
        this.resource = null;
    }
    render() {
        if (!this.resource) {
            return html `<div class="empty-value">No data available</div>`;
        }
        return html `
      ${this.renderMetadata()}
      ${this.renderSpec()}
      ${this.renderStatus()}
      ${this.renderData()}
      ${this.renderAdditionalSections()}
    `;
    }
    renderMetadata() {
        const metadata = this.resource.metadata;
        if (!metadata)
            return null;
        return html `
      <div class="detail-section">
        <h3 class="section-title">
          <svg class="section-icon" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1a7 7 0 100 14A7 7 0 008 1zM3 8a5 5 0 1110 0A5 5 0 013 8z"/>
            <path d="M8 4a.5.5 0 01.5.5v3h3a.5.5 0 010 1h-3.5a.5.5 0 01-.5-.5v-3.5A.5.5 0 018 4z"/>
          </svg>
          Metadata
        </h3>
        
        <div class="detail-item">
          <span class="detail-key">Name:</span>
          <span class="detail-value mono">${metadata.name}</span>
        </div>
        
        ${metadata.namespace ? html `
          <div class="detail-item">
            <span class="detail-key">Namespace:</span>
            <span class="detail-value mono">${metadata.namespace}</span>
          </div>
        ` : ''}
        
        ${metadata.uid ? html `
          <div class="detail-item">
            <span class="detail-key">UID:</span>
            <span class="detail-value mono">${metadata.uid}</span>
          </div>
        ` : ''}
        
        ${metadata.resourceVersion ? html `
          <div class="detail-item">
            <span class="detail-key">Resource Version:</span>
            <span class="detail-value mono">${metadata.resourceVersion}</span>
          </div>
        ` : ''}
        
        ${metadata.creationTimestamp ? html `
          <div class="detail-item">
            <span class="detail-key">Created:</span>
            <span class="detail-value timestamp">
              ${this.formatTimestamp(metadata.creationTimestamp)}
            </span>
          </div>
        ` : ''}
        
        ${metadata.labels && Object.keys(metadata.labels).length > 0 ? html `
          <div class="detail-item">
            <span class="detail-key">Labels:</span>
            <div class="detail-value">
              <div class="label-container">
                ${Object.entries(metadata.labels).map(([key, value]) => html `
                  <span class="label-item">
                    <span class="label-key">${key}:</span>
                    ${value}
                  </span>
                `)}
              </div>
            </div>
          </div>
        ` : ''}
        
        ${metadata.annotations && Object.keys(metadata.annotations).length > 0 ? html `
          <div class="detail-item">
            <span class="detail-key">Annotations:</span>
            <div class="detail-value">
              <div class="annotation-container">
                ${Object.entries(metadata.annotations).map(([key, value]) => html `
                  <span class="annotation-item" title="${value}">
                    <span class="annotation-key">${key}:</span>
                    ${this.truncateString(value, 50)}
                  </span>
                `)}
              </div>
            </div>
          </div>
        ` : ''}
      </div>
    `;
    }
    renderSpec() {
        const spec = this.resource.spec;
        if (!spec || Object.keys(spec).length === 0)
            return null;
        return html `
      <div class="detail-section">
        <h3 class="section-title">
          <svg class="section-icon" viewBox="0 0 16 16" fill="currentColor">
            <path d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 01-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 01.872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 012.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 012.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 01.872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 01-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 01-2.105-.872l-.1-.34zM8 10.93a2.929 2.929 0 100-5.86 2.929 2.929 0 000 5.858z"/>
          </svg>
          Specification
        </h3>
        ${this.renderObject(spec)}
      </div>
    `;
    }
    renderStatus() {
        const status = this.resource.status;
        if (!status || Object.keys(status).length === 0)
            return null;
        return html `
      <div class="detail-section">
        <h3 class="section-title">
          <svg class="section-icon" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 16A8 8 0 108 0a8 8 0 000 16zm.93-9.412l-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 110-2 1 1 0 010 2z"/>
          </svg>
          Status
        </h3>
        ${this.renderObject(status, true)}
      </div>
    `;
    }
    renderData() {
        const data = this.resource.data;
        if (!data || Object.keys(data).length === 0)
            return null;
        return html `
      <div class="detail-section">
        <h3 class="section-title">
          <svg class="section-icon" viewBox="0 0 16 16" fill="currentColor">
            <path d="M14 4.5V14a2 2 0 01-2 2H4a2 2 0 01-2-2V2a2 2 0 012-2h5.5L14 4.5zm-3 0A1.5 1.5 0 019.5 3V1H4a1 1 0 00-1 1v12a1 1 0 001 1h8a1 1 0 001-1V4.5h-2z"/>
            <path d="M4.5 12.5A.5.5 0 015 12h3a.5.5 0 010 1H5a.5.5 0 01-.5-.5zm0-2A.5.5 0 015 10h6a.5.5 0 010 1H5a.5.5 0 01-.5-.5zm0-2A.5.5 0 015 8h6a.5.5 0 010 1H5a.5.5 0 01-.5-.5zm0-2A.5.5 0 015 6h3a.5.5 0 010 1H5a.5.5 0 01-.5-.5z"/>
          </svg>
          Data
        </h3>
        ${this.renderObject(data)}
      </div>
    `;
    }
    renderAdditionalSections() {
        const excludedKeys = ['metadata', 'spec', 'status', 'data', 'kind', 'apiVersion'];
        const additionalSections = [];
        Object.entries(this.resource).forEach(([key, value]) => {
            if (!excludedKeys.includes(key) && value && typeof value === 'object') {
                additionalSections.push(html `
          <div class="detail-section">
            <h3 class="section-title">${this.formatKey(key)}</h3>
            ${this.renderObject(value)}
          </div>
        `);
            }
        });
        return additionalSections;
    }
    renderObject(obj, isStatus = false) {
        if (!obj || typeof obj !== 'object') {
            const rendered = this.renderValue(obj);
            return typeof rendered === 'string' ? html `${rendered}` : rendered;
        }
        const entries = Object.entries(obj);
        if (entries.length === 0) {
            return html `<span class="empty-value">Empty</span>`;
        }
        return html `
      ${entries.map(([key, value]) => this.renderProperty(key, value, isStatus))}
    `;
    }
    renderProperty(key, value, isStatus = false) {
        const formattedKey = this.formatKey(key);
        if (key === 'conditions' && Array.isArray(value)) {
            return this.renderConditions(value);
        }
        if (Array.isArray(value)) {
            return html `
        <div class="detail-item">
          <span class="detail-key">${formattedKey}:</span>
          <div class="detail-value">
            ${value.length === 0 ? html `
              <span class="empty-value">Empty array</span>
            ` : html `
              <div class="array-container">
                ${value.map((item, index) => html `
                  <div class="array-item">
                    <span class="array-index">[${index}]</span>
                    ${typeof item === 'object' ? this.renderObject(item) : this.renderValue(item)}
                  </div>
                `)}
              </div>
            `}
          </div>
        </div>
      `;
        }
        if (value && typeof value === 'object') {
            return html `
        <div class="detail-item">
          <span class="detail-key">${formattedKey}:</span>
          <div class="detail-value">
            <div class="nested-object">
              ${this.renderObject(value)}
            </div>
          </div>
        </div>
      `;
        }
        if (isStatus && (key === 'phase' || key === 'state' || key === 'status')) {
            return html `
        <div class="detail-item">
          <span class="detail-key">${formattedKey}:</span>
          <span class="detail-value">
            <span class="status-badge ${value.toString().toLowerCase()}">${value}</span>
          </span>
        </div>
      `;
        }
        return html `
      <div class="detail-item">
        <span class="detail-key">${formattedKey}:</span>
        <span class="detail-value ${this.getValueClass(value)}">${this.renderValue(value)}</span>
      </div>
    `;
    }
    renderConditions(conditions) {
        return html `
      <div class="detail-item">
        <span class="detail-key">Conditions:</span>
        <div class="detail-value">
          <div class="array-container">
            ${conditions.map(condition => html `
              <div class="array-item">
                <div class="detail-item">
                  <span class="detail-key">Type:</span>
                  <span class="detail-value">${condition.type}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-key">Status:</span>
                  <span class="detail-value">
                    <span class="status-badge ${condition.status.toLowerCase()}">${condition.status}</span>
                  </span>
                </div>
                ${condition.reason ? html `
                  <div class="detail-item">
                    <span class="detail-key">Reason:</span>
                    <span class="detail-value">${condition.reason}</span>
                  </div>
                ` : ''}
                ${condition.message ? html `
                  <div class="detail-item">
                    <span class="detail-key">Message:</span>
                    <span class="detail-value">${condition.message}</span>
                  </div>
                ` : ''}
                ${condition.lastTransitionTime ? html `
                  <div class="detail-item">
                    <span class="detail-key">Last Transition:</span>
                    <span class="detail-value timestamp">
                      ${this.formatTimestamp(condition.lastTransitionTime)}
                    </span>
                  </div>
                ` : ''}
              </div>
            `)}
          </div>
        </div>
      </div>
    `;
    }
    renderValue(value) {
        if (value === null || value === undefined) {
            return html `<span class="value-null">null</span>`;
        }
        if (typeof value === 'boolean') {
            return html `<span class="value-boolean">${value}</span>`;
        }
        if (typeof value === 'number') {
            return html `<span class="value-number">${value}</span>`;
        }
        if (typeof value === 'string') {
            if (this.isTimestamp(value)) {
                return html `<span class="timestamp">${this.formatTimestamp(value)}</span>`;
            }
            if (value.includes('\n')) {
                return html `<div class="code-block">${value}</div>`;
            }
            return value;
        }
        return JSON.stringify(value);
    }
    getValueClass(value) {
        if (value === null || value === undefined)
            return 'value-null';
        if (typeof value === 'boolean')
            return 'value-boolean';
        if (typeof value === 'number')
            return 'value-number';
        if (typeof value === 'string')
            return 'value-string';
        return '';
    }
    formatKey(key) {
        return key
            .replace(/([A-Z])/g, ' $1')
            .replace(/_/g, ' ')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }
    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        if (diff < 24 * 60 * 60 * 1000) {
            const hours = Math.floor(diff / (60 * 60 * 1000));
            const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
            if (hours > 0) {
                return `${hours}h ${minutes}m ago (${date.toLocaleString()})`;
            }
            else if (minutes > 0) {
                return `${minutes}m ago (${date.toLocaleString()})`;
            }
            else {
                return `Just now (${date.toLocaleString()})`;
            }
        }
        return date.toLocaleString();
    }
    isTimestamp(value) {
        return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value);
    }
    truncateString(str, maxLength) {
        if (str.length <= maxLength)
            return str;
        return str.substring(0, maxLength) + '...';
    }
};
ResourceDetailView.styles = css `
    :host {
      display: block;
      font-family: var(--vscode-font-family, system-ui, -apple-system, sans-serif);
      font-size: 13px;
      color: var(--vscode-foreground, #cccccc);
    }

    .detail-section {
      margin-bottom: 24px;
      border-bottom: 1px solid var(--vscode-widget-border, #303031);
      padding-bottom: 16px;
    }

    .detail-section:last-child {
      border-bottom: none;
      margin-bottom: 0;
    }

    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--vscode-foreground, #cccccc);
      margin-bottom: 12px;
      text-transform: capitalize;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section-icon {
      width: 16px;
      height: 16px;
      opacity: 0.8;
    }

    .detail-item {
      margin-bottom: 8px;
      display: flex;
      align-items: flex-start;
      gap: 8px;
      line-height: 1.5;
    }

    .detail-key {
      font-weight: 500;
      color: var(--vscode-textLink-foreground, #3794ff);
      min-width: 140px;
      flex-shrink: 0;
    }

    .detail-value {
      flex: 1;
      color: var(--vscode-foreground, #cccccc);
      word-break: break-word;
    }

    .detail-value.mono {
      font-family: var(--vscode-editor-font-family, 'Consolas', 'Monaco', monospace);
      font-size: 12px;
    }

    /* Nested object styles */
    .nested-object {
      margin-top: 8px;
      padding-left: 16px;
      border-left: 2px solid var(--vscode-widget-border, #303031);
    }

    .nested-title {
      font-weight: 500;
      color: var(--vscode-textLink-foreground, #3794ff);
      margin-bottom: 8px;
      font-size: 12px;
      text-transform: capitalize;
    }

    /* Array styles */
    .array-container {
      margin-top: 8px;
    }

    .array-item {
      background: var(--vscode-editor-background, #1e1e1e);
      border: 1px solid var(--vscode-widget-border, #303031);
      border-radius: 4px;
      padding: 12px;
      margin-bottom: 8px;
      position: relative;
    }

    .array-item:last-child {
      margin-bottom: 0;
    }

    .array-index {
      position: absolute;
      top: 4px;
      right: 8px;
      font-size: 11px;
      color: var(--vscode-descriptionForeground, #cccccc80);
      background: var(--vscode-badge-background, #007acc);
      padding: 2px 6px;
      border-radius: 10px;
    }

    /* Special value styles */
    .value-null {
      color: var(--vscode-debugTokenExpression-error, #f48771);
      font-style: italic;
    }

    .value-boolean {
      color: var(--vscode-debugTokenExpression-boolean, #4e94ce);
    }

    .value-number {
      color: var(--vscode-debugTokenExpression-number, #b5cea8);
    }

    .value-string {
      color: var(--vscode-debugTokenExpression-string, #ce9178);
    }

    /* Labels and annotations */
    .label-container,
    .annotation-container {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 4px;
    }

    .label-item,
    .annotation-item {
      background: var(--vscode-badge-background, #007acc);
      color: var(--vscode-badge-foreground, white);
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .annotation-item {
      background: var(--vscode-textBlockQuote-background, #7f7f7f1a);
      color: var(--vscode-foreground, #cccccc);
    }

    .label-key,
    .annotation-key {
      opacity: 0.8;
    }

    /* Status badges */
    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
    }

    .status-badge.running,
    .status-badge.active,
    .status-badge.true {
      background: var(--vscode-testing-iconPassed, #73c991);
      color: var(--vscode-editor-background, #1e1e1e);
    }

    .status-badge.pending,
    .status-badge.progressing {
      background: var(--vscode-testing-iconQueued, #cca700);
      color: var(--vscode-editor-background, #1e1e1e);
    }

    .status-badge.failed,
    .status-badge.error,
    .status-badge.false {
      background: var(--vscode-testing-iconFailed, #f14c4c);
      color: white;
    }

    /* Timestamp */
    .timestamp {
      color: var(--vscode-descriptionForeground, #cccccc80);
      font-size: 12px;
    }

    /* Code block */
    .code-block {
      background: var(--vscode-textCodeBlock-background, #0a0a0a);
      border: 1px solid var(--vscode-widget-border, #303031);
      border-radius: 4px;
      padding: 12px;
      margin-top: 8px;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 12px;
      overflow-x: auto;
      white-space: pre-wrap;
    }

    /* Collapsible sections */
    .collapsible {
      cursor: pointer;
      user-select: none;
    }

    .collapsible:hover {
      opacity: 0.8;
    }

    .collapse-icon {
      display: inline-block;
      width: 12px;
      height: 12px;
      margin-right: 4px;
      transition: transform 0.2s;
    }

    .collapsed .collapse-icon {
      transform: rotate(-90deg);
    }

    .collapsed-content {
      display: none;
    }

    /* Empty state */
    .empty-value {
      color: var(--vscode-descriptionForeground, #cccccc80);
      font-style: italic;
    }
  `;
__decorate([
    property({ type: Object })
], ResourceDetailView.prototype, "resource", void 0);
ResourceDetailView = __decorate([
    customElement('resource-detail-view')
], ResourceDetailView);
export { ResourceDetailView };
//# sourceMappingURL=resource-detail-view.js.map