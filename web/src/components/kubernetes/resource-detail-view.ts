import { LitElement, html, css, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '../ui/status-badge.js';

/**
 * Component for rendering Kubernetes resource details in a structured format
 * Handles nested objects and arrays with proper indentation and styling
 */
@customElement('resource-detail-view')
export class ResourceDetailView extends LitElement {
  @property({ type: Object }) resource: any = null;

  static override styles = css`
    :host {
      display: block;
      font-family: var(--vscode-font-family, system-ui, -apple-system, sans-serif);
      font-size: 13px;
      color: var(--vscode-foreground);
    }

    .pod-details-content {
      font-size: 0.875rem;
    }

    .detail-sections {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .detail-section {
      margin-bottom: 24px;
      position: relative;
    }

    .detail-section:last-child {
      margin-bottom: 40px; /* Extra space for last section */
    }

    .detail-section h3 {
      margin: 0px 0px 16px;
      padding: 0px 0px 6px;
      font-size: 16px;
      font-weight: 600;
      color: var(--vscode-foreground);
      border-bottom: 2px solid var(--vscode-focusBorder, var(--vscode-accent, #007acc));
    }

    .section-title {
      margin: 0px 0px 16px;
      padding: 0px 0px 6px;
      font-size: 16px;
      font-weight: 600;
      color: var(--vscode-foreground);
      border-bottom: 2px solid var(--vscode-focusBorder, var(--vscode-accent, #007acc));
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
      padding: 4px 0px;
      border-bottom: 1px solid var(--vscode-widget-border, rgba(128, 128, 128, 0.2));
      display: flex;
      align-items: flex-start;
      gap: 8px;
      line-height: 1.5;
    }

    .detail-item.nested {
      border-left: 3px solid var(--vscode-focusBorder, var(--vscode-accent, #007acc));
      margin-left: 0px;
      background: var(--vscode-list-hoverBackground, rgba(0, 122, 204, 0.05));
      border-radius: 4px;
      padding: 12px;
      margin-bottom: 12px;
      flex-direction: column;
      align-items: stretch;
      border-bottom: none;
    }

    .detail-key {
      font-weight: 600;
      display: inline-block;
      min-width: 140px;
      flex-shrink: 0;
      color: var(--vscode-symbolIcon-variableForeground, var(--vscode-foreground));
    }

    .detail-value {
      flex: 1;
      color: var(--vscode-foreground);
      word-break: break-word;
      display: inline;
    }

    .detail-value.mono {
      font-family: var(--vscode-editor-font-family, 'Consolas', 'Monaco', monospace);
      font-size: 12px;
    }

    /* Nested object styles */
    .nested-object {
      margin-top: 8px;
      padding-left: 16px;
      border-left: 2px solid var(--vscode-widget-border, rgba(128, 128, 128, 0.35));
    }

    .nested-content {
      margin-top: 4px;
    }

    .nested-title {
      font-weight: 500;
      color: var(--vscode-textLink-foreground);
      margin-bottom: 8px;
      font-size: 12px;
      text-transform: capitalize;
    }

    /* Array styles */
    .array-container {
      margin-top: 8px;
    }

    .array-item {
      background: var(--vscode-list-inactiveSelectionBackground, var(--vscode-editor-background, #f3f3f3));
      border: 1px solid var(--vscode-widget-border, rgba(128, 128, 128, 0.35));
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
      color: var(--vscode-badge-foreground, white);
      background: var(--vscode-badge-background, #007acc);
      padding: 2px 6px;
      border-radius: 10px;
    }

    /* Special value styles */
    .value-null,
    .detail-value.null {
      color: var(--vscode-descriptionForeground);
      font-style: italic;
      opacity: 0.7;
    }

    .value-boolean {
      color: var(--vscode-debugTokenExpression-boolean);
    }

    .value-number {
      color: var(--vscode-debugTokenExpression-number);
    }

    .value-string {
      color: var(--vscode-debugTokenExpression-string);
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
      background: var(--vscode-textBlockQuote-background, rgba(127, 127, 127, 0.1));
      color: var(--vscode-foreground);
      border: 1px solid var(--vscode-widget-border, rgba(128, 128, 128, 0.2));
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
      color: var(--vscode-badge-foreground, white);
    }

    .status-badge.pending,
    .status-badge.progressing {
      background: var(--vscode-testing-iconQueued, #cca700);
      color: var(--vscode-badge-foreground, white);
    }

    .status-badge.failed,
    .status-badge.error,
    .status-badge.false {
      background: var(--vscode-testing-iconFailed, #f14c4c);
      color: var(--vscode-badge-foreground, white);
    }

    /* Timestamp */
    .timestamp {
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
      opacity: 0.8;
    }

    /* Code block */
    .code-block,
    .raw-data {
      background: var(--vscode-textCodeBlock-background, var(--vscode-editor-background, #f5f5f5));
      border: 1px solid var(--vscode-widget-border, rgba(128, 128, 128, 0.35));
      border-radius: 4px;
      padding: 12px;
      margin-top: 8px;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 12px;
      overflow-x: auto;
      white-space: pre-wrap;
      max-height: 600px;
      overflow-y: auto;
      color: var(--vscode-editor-foreground, var(--vscode-foreground));
    }

    details {
      margin-top: 8px;
      position: relative;
      z-index: 1;
    }

    details summary {
      cursor: pointer;
      padding: 8px 12px;
      background: var(--vscode-button-background, #007acc);
      color: var(--vscode-button-foreground, white);
      border-radius: 4px;
      font-size: 13px;
      font-weight: 500;
      user-select: none;
      transition: all 0.2s;
      display: block;
      outline: none;
      border: 1px solid transparent;
    }

    details summary::-webkit-details-marker {
      display: none;
    }

    details summary::before {
      content: '▶';
      display: inline-block;
      margin-right: 8px;
      transition: transform 0.2s;
    }

    details[open] summary::before {
      transform: rotate(90deg);
    }

    details summary:hover {
      background: var(--vscode-button-hoverBackground, #0062a3);
      border-color: var(--vscode-button-border, transparent);
    }

    details[open] summary {
      margin-bottom: 12px;
      border-radius: 4px 4px 0 0;
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
      color: var(--vscode-descriptionForeground);
      font-style: italic;
      opacity: 0.7;
    }
  `;

  override render() {
    if (!this.resource) {
      return html`<div class="empty-value">No data available</div>`;
    }

    // Check if this is a Pod resource
    const isPod = this.resource.kind === 'Pod' || 
                  (this.resource.metadata && this.resource.spec && this.resource.status && 
                   'containers' in (this.resource.spec || {}));

    if (isPod) {
      return this.renderPodDetails();
    }

    // Use the same styled layout for all resources
    return html`
      <div class="pod-details-content">
        <div class="detail-sections">
          ${this.renderMetadata()}
          ${this.renderSpec()}
          ${this.renderStatus()}
          ${this.renderData()}
          ${this.renderAdditionalSections()}
        </div>
      </div>
    `;
  }

  private renderMetadata() {
    const metadata = this.resource.metadata;
    if (!metadata) return null;

    // Separate labels and annotations for better organization
    const hasLabels = metadata.labels && Object.keys(metadata.labels).length > 0;
    const hasAnnotations = metadata.annotations && Object.keys(metadata.annotations).length > 0;

    return html`
      <!-- Basic Metadata -->
      <div class="detail-section">
        <h3>Basic Information</h3>
        ${this.renderDetailItem('Name', metadata.name)}
        ${metadata.namespace ? this.renderDetailItem('Namespace', metadata.namespace) : ''}
        ${metadata.uid ? this.renderDetailItem('UID', metadata.uid) : ''}
        ${metadata.resourceVersion ? this.renderDetailItem('Resource Version', metadata.resourceVersion) : ''}
        ${metadata.creationTimestamp ? 
          this.renderDetailItem('Creation Timestamp', this.formatTimestamp(metadata.creationTimestamp)) : ''}
        ${metadata.creationTimestamp ? 
          this.renderDetailItem('Age', this.formatTimestamp(metadata.creationTimestamp)) : ''}
      </div>

      <!-- Labels -->
      ${hasLabels ? html`
        <div class="detail-section">
          <h3>Labels</h3>
          ${Object.entries(metadata.labels).map(([key, value]) => 
            this.renderDetailItem(key, value as string)
          )}
        </div>
      ` : ''}

      <!-- Annotations -->
      ${hasAnnotations ? html`
        <div class="detail-section">
          <h3>Annotations</h3>
          ${Object.entries(metadata.annotations).map(([key, value]) => 
            this.renderDetailItem(key, value as string)
          )}
        </div>
      ` : ''}
    `;
  }

  private renderSpec() {
    const spec = this.resource.spec;
    if (!spec || Object.keys(spec).length === 0) return null;

    return html`
      <div class="detail-section">
        <h3>Specification</h3>
        ${this.renderObjectAsDetailItems(spec)}
      </div>
    `;
  }

  private renderStatus() {
    const status = this.resource.status;
    if (!status || Object.keys(status).length === 0) return null;

    // Special handling for conditions if present
    const conditions = status.conditions;
    const statusWithoutConditions = { ...status };
    delete statusWithoutConditions.conditions;

    return html`
      <div class="detail-section">
        <h3>Status</h3>
        ${this.renderObjectAsDetailItems(statusWithoutConditions, true)}
      </div>
      
      ${conditions && conditions.length > 0 ? html`
        <div class="detail-section">
          <h3>Conditions</h3>
          ${conditions.map((condition: any) => 
            this.renderConditionDetails(condition)
          )}
        </div>
      ` : ''}
    `;
  }

  private renderData() {
    const data = this.resource.data;
    if (!data || Object.keys(data).length === 0) return null;

    return html`
      <div class="detail-section">
        <h3>Data</h3>
        ${this.renderObjectAsDetailItems(data)}
      </div>
    `;
  }

  private renderAdditionalSections() {
    // Render any other top-level sections not covered above
    const excludedKeys = ['metadata', 'spec', 'status', 'data', 'kind', 'apiVersion'];
    const additionalSections: TemplateResult[] = [];

    Object.entries(this.resource).forEach(([key, value]) => {
      if (!excludedKeys.includes(key) && value && typeof value === 'object') {
        additionalSections.push(html`
          <div class="detail-section">
            <h3>${this.formatKey(key)}</h3>
            ${this.renderObjectAsDetailItems(value)}
          </div>
        `);
      }
    });

    // Add Raw Data section at the end
    additionalSections.push(html`
      <div class="detail-section">
        <h3>Raw Data</h3>
        <details>
          <summary>View raw resource data</summary>
          <pre class="raw-data">${JSON.stringify(this.resource, null, 2)}</pre>
        </details>
      </div>
    `);

    return additionalSections;
  }

  private renderObject(obj: any, isStatus = false): TemplateResult {
    if (!obj || typeof obj !== 'object') {
      const rendered = this.renderValue(obj);
      return typeof rendered === 'string' ? html`${rendered}` : rendered;
    }

    const entries = Object.entries(obj);
    if (entries.length === 0) {
      return html`<span class="empty-value">Empty</span>`;
    }

    return html`
      ${entries.map(([key, value]) => this.renderProperty(key, value, isStatus))}
    `;
  }

  private renderProperty(key: string, value: any, isStatus = false): TemplateResult {
    const formattedKey = this.formatKey(key);

    // Handle special cases
    if (key === 'conditions' && Array.isArray(value)) {
      return this.renderConditions(value);
    }

    if (Array.isArray(value)) {
      return html`
        <div class="detail-item">
          <span class="detail-key">${formattedKey}:</span>
          <div class="detail-value">
            ${value.length === 0 ? html`
              <span class="empty-value">Empty array</span>
            ` : html`
              <div class="array-container">
                ${value.map((item, index) => html`
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
      return html`
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

    // Special rendering for certain keys
    if (isStatus && (key === 'phase' || key === 'state' || key === 'status')) {
      return html`
        <div class="detail-item">
          <span class="detail-key">${formattedKey}:</span>
          <span class="detail-value">
            <span class="status-badge ${value.toString().toLowerCase()}">${value}</span>
          </span>
        </div>
      `;
    }

    return html`
      <div class="detail-item">
        <span class="detail-key">${formattedKey}:</span>
        <span class="detail-value ${this.getValueClass(value)}">${this.renderValue(value)}</span>
      </div>
    `;
  }

  private renderConditions(conditions: any[]): TemplateResult {
    return html`
      <div class="detail-item">
        <span class="detail-key">Conditions:</span>
        <div class="detail-value">
          <div class="array-container">
            ${conditions.map(condition => html`
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
                ${condition.reason ? html`
                  <div class="detail-item">
                    <span class="detail-key">Reason:</span>
                    <span class="detail-value">${condition.reason}</span>
                  </div>
                ` : ''}
                ${condition.message ? html`
                  <div class="detail-item">
                    <span class="detail-key">Message:</span>
                    <span class="detail-value">${condition.message}</span>
                  </div>
                ` : ''}
                ${condition.lastTransitionTime ? html`
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

  private renderValue(value: any): TemplateResult | string {
    if (value === null || value === undefined) {
      return html`<span class="value-null">null</span>`;
    }

    if (typeof value === 'boolean') {
      return html`<span class="value-boolean">${value}</span>`;
    }

    if (typeof value === 'number') {
      return html`<span class="value-number">${value}</span>`;
    }

    if (typeof value === 'string') {
      // Check if it's a timestamp
      if (this.isTimestamp(value)) {
        return html`<span class="timestamp">${this.formatTimestamp(value)}</span>`;
      }

      // Check if it's a multi-line string
      if (value.includes('\n')) {
        return html`<div class="code-block">${value}</div>`;
      }

      return value;
    }

    return JSON.stringify(value);
  }

  private getValueClass(value: any): string {
    if (value === null || value === undefined) return 'value-null';
    if (typeof value === 'boolean') return 'value-boolean';
    if (typeof value === 'number') return 'value-number';
    if (typeof value === 'string') return 'value-string';
    return '';
  }

  private formatKey(key: string): string {
    // Convert camelCase or snake_case to Title Case
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  private formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    // If less than 24 hours, show relative time
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000));
      const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
      
      if (hours > 0) {
        return `${hours}h ${minutes}m ago (${date.toLocaleString()})`;
      } else if (minutes > 0) {
        return `${minutes}m ago (${date.toLocaleString()})`;
      } else {
        return `Just now (${date.toLocaleString()})`;
      }
    }

    // Otherwise show full date
    return date.toLocaleString();
  }

  private isTimestamp(value: string): boolean {
    // Check if string matches ISO 8601 format
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value);
  }

  private renderObjectAsDetailItems(obj: any, isStatus = false): TemplateResult[] {
    const results: TemplateResult[] = [];
    
    Object.entries(obj).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        results.push(this.renderDetailItem(this.formatKey(key), null));
      } else if (Array.isArray(value)) {
        if (value.length === 0) {
          results.push(this.renderDetailItem(this.formatKey(key), 'Empty array'));
        } else if (typeof value[0] === 'object') {
          // For array of objects, render as nested items
          results.push(html`
            <div class="detail-item nested">
              <strong class="detail-key">${this.formatKey(key)}:</strong>
              <div class="nested-content">
                ${value.map((item, index) => html`
                  <div class="detail-item nested">
                    <strong class="detail-key">Item ${index + 1}:</strong>
                    <div class="nested-content">
                      ${this.renderObjectAsDetailItems(item)}
                    </div>
                  </div>
                `)}
              </div>
            </div>
          `);
        } else {
          // For simple arrays, render as comma-separated list
          results.push(this.renderDetailItem(this.formatKey(key), value.join(', ')));
        }
      } else if (typeof value === 'object') {
        // For nested objects, use the nested style
        results.push(this.renderNestedObject(this.formatKey(key), value));
      } else {
        // For simple values
        if (isStatus && (key === 'phase' || key === 'state' || key === 'status')) {
          results.push(html`
            <div class="detail-item">
              <strong class="detail-key">${this.formatKey(key)}:</strong>
              <span class="detail-value">
                <span class="status-badge ${value.toString().toLowerCase()}">${value}</span>
              </span>
            </div>
          `);
        } else {
          results.push(this.renderDetailItem(this.formatKey(key), value));
        }
      }
    });
    
    return results;
  }

  private renderPodDetails() {
    const metadata = this.resource.metadata || {};
    const spec = this.resource.spec || {};
    const status = this.resource.status || {};

    return html`
      <div class="pod-details-content">
        <div class="detail-sections">
          <!-- Basic Information -->
          <div class="detail-section">
            <h3>Basic Information</h3>
            ${this.renderDetailItem('Name', metadata.name)}
            ${this.renderDetailItem('Namespace', metadata.namespace)}
            ${this.renderDetailItem('UID', metadata.uid)}
            ${this.renderDetailItem('Resource Version', metadata.resourceVersion)}
            ${this.renderDetailItem('Creation Timestamp', metadata.creationTimestamp ? this.formatTimestamp(metadata.creationTimestamp) : null)}
            ${this.renderDetailItem('Age', metadata.creationTimestamp ? this.formatTimestamp(metadata.creationTimestamp) : null)}
          </div>

          <!-- Status Information -->
          <div class="detail-section">
            <h3>Status</h3>
            ${this.renderDetailItem('Phase', status.phase)}
            ${this.renderDetailItem('QoS Class', status.qosClass)}
            ${this.renderDetailItem('Start Time', status.startTime ? this.formatTimestamp(status.startTime) : null)}
          </div>

          <!-- Network Information -->
          <div class="detail-section">
            <h3>Network</h3>
            ${this.renderDetailItem('Pod IP', status.podIP)}
            ${this.renderDetailItem('Host IP', status.hostIP)}
            ${spec.nodeName ? this.renderDetailItem('Node', spec.nodeName) : ''}
          </div>

          <!-- Configuration -->
          <div class="detail-section">
            <h3>Configuration</h3>
            ${this.renderDetailItem('Restart Policy', spec.restartPolicy)}
            ${this.renderDetailItem('DNS Policy', spec.dnsPolicy)}
            ${this.renderDetailItem('Service Account', spec.serviceAccount || spec.serviceAccountName || 'default')}
            ${spec.nodeSelector && Object.keys(spec.nodeSelector).length > 0 ? 
              this.renderNestedObject('Node Selector', spec.nodeSelector) : ''}
          </div>

          <!-- Labels -->
          ${metadata.labels && Object.keys(metadata.labels).length > 0 ? html`
            <div class="detail-section">
              <h3>Labels</h3>
              ${Object.entries(metadata.labels).map(([key, value]) => 
                this.renderDetailItem(key, value as string)
              )}
            </div>
          ` : ''}

          <!-- Annotations -->
          ${metadata.annotations && Object.keys(metadata.annotations).length > 0 ? html`
            <div class="detail-section">
              <h3>Annotations</h3>
              ${Object.entries(metadata.annotations).map(([key, value]) => 
                this.renderDetailItem(key, value as string)
              )}
            </div>
          ` : ''}

          <!-- Containers -->
          ${spec.containers && spec.containers.length > 0 ? html`
            <div class="detail-section">
              <h3>Containers</h3>
              ${spec.containers.map((container: any, index: number) => 
                this.renderContainerDetails(container, index + 1, status.containerStatuses)
              )}
            </div>
          ` : ''}

          <!-- Conditions -->
          ${status.conditions && status.conditions.length > 0 ? html`
            <div class="detail-section">
              <h3>Conditions</h3>
              ${status.conditions.map((condition: any) => 
                this.renderConditionDetails(condition)
              )}
            </div>
          ` : ''}

          <!-- Raw Data -->
          <div class="detail-section">
            <h3>Raw Data</h3>
            <details>
              <summary>View raw pod data</summary>
              <pre class="raw-data">${JSON.stringify(this.resource, null, 2)}</pre>
            </details>
          </div>
        </div>
      </div>
    `;
  }

  private renderDetailItem(key: string, value: any) {
    if (value === null || value === undefined) {
      return html`
        <div class="detail-item">
          <strong class="detail-key">${key}:</strong>
          <span class="detail-value null">null</span>
        </div>
      `;
    }
    return html`
      <div class="detail-item">
        <strong class="detail-key">${key}:</strong>
        <span class="detail-value">${value}</span>
      </div>
    `;
  }

  private renderNestedObject(title: string, obj: any) {
    return html`
      <div class="detail-item nested">
        <strong class="detail-key">${title}:</strong>
        <div class="nested-content">
          ${Object.entries(obj).map(([key, value]) => html`
            <div class="detail-item">
              <strong class="detail-key">${key}:</strong>
              <span class="detail-value">${value}</span>
            </div>
          `)}
        </div>
      </div>
    `;
  }

  private renderContainerDetails(container: any, index: number, containerStatuses: any[] = []) {
    const containerStatus = containerStatuses?.find(cs => cs.name === container.name);
    
    return html`
      <div class="detail-item nested">
        <strong class="detail-key">Container ${index}:</strong>
        <div class="nested-content">
          ${this.renderDetailItem('Name', container.name)}
          ${this.renderDetailItem('Image', container.image)}
          ${containerStatus ? html`
            ${this.renderDetailItem('Ready', containerStatus.ready)}
            ${this.renderDetailItem('Restart Count', containerStatus.restartCount)}
            ${containerStatus.state ? this.renderDetailItem('State', Object.keys(containerStatus.state)[0]) : ''}
          ` : html`
            ${this.renderDetailItem('Ready', null)}
            ${this.renderDetailItem('Restart Count', null)}
            ${this.renderDetailItem('State', null)}
          `}
        </div>
      </div>
    `;
  }

  private renderConditionDetails(condition: any) {
    return html`
      <div class="detail-item nested">
        <strong class="detail-key">${condition.type}:</strong>
        <div class="nested-content">
          ${this.renderDetailItem('Status', condition.status)}
          ${condition.lastProbeTime ? this.renderDetailItem('Last Probe Time', this.formatTimestamp(condition.lastProbeTime)) : ''}
          ${this.renderDetailItem('Last Transition Time', condition.lastTransitionTime ? this.formatTimestamp(condition.lastTransitionTime) : null)}
          ${this.renderDetailItem('Reason', condition.reason || null)}
          ${this.renderDetailItem('Message', condition.message || null)}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'resource-detail-view': ResourceDetailView;
  }
}
