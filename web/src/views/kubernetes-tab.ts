import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';
import { Api } from '../api.js';

class KubernetesTab extends LitElement {
  @property({ type: String }) activeSubmenu = 'workloads';
  @property({ type: String }) subRoute: string | null = null;
  @property({ type: Array }) workloads = [];
  @property({ type: Array }) networks = [];
  @property({ type: Array }) storages = [];
  @property({ type: Array }) configurations = [];
  @property({ type: Array }) helms = [];
  @property({ type: String }) error = null;
  @property({ type: String }) activeWorkloadTab = 'pods';
  @property({ type: String }) activeStorageTab = 'pvc';
  @property({ type: String }) activeConfigurationTab = 'secrets';
  @property({ type: String }) activeHelmTab = 'releases';
  @property({ type: Boolean }) showPodDetails = false;
  @property({ type: Object }) selectedPod = null;
  @property({ type: Boolean }) loadingPodDetails = false;
  @property({ type: Array }) namespaces = [];
  @property({ type: String }) selectedNamespace = 'all';
  @property({ type: Boolean }) showNamespaceDropdown = false;
  @property({ type: String }) namespaceSearchQuery = '';

  static styles = css`
    :host {
      display: block;
      padding: 16px;
    }

    .tab-container {
      display: flex;
      flex-direction: column;
      height: 100%;
    }


    .tab-content {
      flex: 1;
      overflow-y: auto;
    }

    .tab-header {
      display: flex;
      border-bottom: 2px solid var(--border-color);
      margin-bottom: 1rem;
    }

    .tab-button {
      padding: 0.75rem 1.5rem;
      background: none;
      border: none;
      cursor: pointer;
      font-size: 0.875rem;
      color: var(--text-secondary);
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      transition: all 0.2s;
    }

    .tab-button:hover {
      color: var(--text-primary);
    }

    .tab-button.active {
      color: var(--primary);
      border-bottom-color: var(--primary);
    }

    .table {
      width: 100%;
      border-collapse: collapse;
      background: var(--vscode-bg-light);
      border-radius: 1px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border, #454545));
    }

    .table thead {
      background: var(--vscode-bg-lighter);
    }

    .table th {
      background: var(--vscode-bg-dark);
      color: var(--vscode-text);
      font-weight: 600;
      text-align: left;
      padding: 12px 16px;
      font-size: 0.875rem;
      border-bottom: 1px solid var(--vscode-widget-border, var(--vscode-panel-border, #454545));
    }

    .table td {
      padding: 12px 16px;
      color: var(--vscode-text);
      font-size: 0.875rem;
      border-bottom: 1px solid var(--vscode-widget-border, var(--vscode-panel-border, #454545));
      position: relative;
    }

    .table tr:hover td {
      background: rgba(255, 255, 255, 0.02);
    }

    .error-state {
      text-align: center;
      padding: 3rem;
      color: var(--vscode-error);
      background: var(--vscode-bg-light);
      border-radius: 6px;
      margin: 2rem 0;
    }

    .empty-state {
      text-align: center;
      padding: 3rem;
      color: var(--text-secondary);
    }

    .action-menu {
      position: relative;
      display: inline-block;
    }

    .action-dots {
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px 8px;
      color: var(--text-secondary);
      font-size: 18px;
      line-height: 1;
      transition: background-color 0.2s;
      border-radius: 4px;
    }

    .action-dots:hover {
      background-color: var(--vscode-toolbar-hoverBackground, var(--vscode-list-hoverBackground, rgba(90, 93, 94, 0.1)));
    }

    .action-dropdown {
      position: absolute;
      right: 0;
      top: 100%;
      margin-top: 4px;
      background: var(--vscode-dropdown-background, var(--vscode-menu-background, var(--vscode-bg-light, #252526)));
      border: 1px solid var(--vscode-dropdown-border, var(--vscode-menu-border, var(--border-color, #454545)));
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      min-width: 160px;
      z-index: 1000;
      display: none;
    }

    .action-dropdown.show {
      display: block;
    }

    .action-dropdown button {
      display: block;
      width: 100%;
      text-align: left;
      padding: 8px 16px;
      border: none;
      background: none;
      color: var(--vscode-menu-foreground, var(--vscode-foreground, var(--vscode-text, #cccccc)));
      cursor: pointer;
      font-size: 13px;
      transition: background-color 0.2s;
    }

    .action-dropdown button:hover {
      background-color: var(--vscode-list-hoverBackground, var(--vscode-toolbar-hoverBackground, rgba(255, 255, 255, 0.08)));
      color: var(--vscode-list-hoverForeground, var(--vscode-foreground));
    }

    .action-dropdown button.danger {
      color: var(--vscode-error);
    }

    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s;
    }

    .btn-primary {
      background: var(--vscode-accent);
      color: white;
    }

    .btn-primary:hover {
      background: var(--vscode-accent-hover);
    }

    h1 {
      margin: 0 0 24px 0;
      padding: 0;
      font-size: 24px;
      font-weight: 300;
    }

    .table tr:last-child td {
      border-bottom: none;
    }

    .table td:last-child {
      text-align: right;
    }

    .status {
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
      text-transform: uppercase;
    }

    .status.running,
    .status.active,
    .status.deployed,
    .status.bound,
    .status.available,
    .status.ready {
      background-color: rgba(34, 197, 94, 0.1);
      color: rgb(34, 197, 94);
    }

    .status.pending {
      background-color: rgba(251, 191, 36, 0.1);
      color: rgb(251, 191, 36);
    }

    .status.failed,
    .status.error {
      background-color: rgba(239, 68, 68, 0.1);
      color: rgb(239, 68, 68);
    }

    .status.enforced {
      background-color: rgba(59, 130, 246, 0.1);
      color: rgb(59, 130, 246);
    }

    .search-container {
      display: flex;
      align-items: center;
      margin-bottom: 1.5rem;
      gap: 1rem;
    }

    .search-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      max-width: 400px;
    }

    .search-icon {
      position: absolute;
      left: 12px;
      color: var(--vscode-input-placeholderForeground, #999);
      pointer-events: none;
      width: 16px;
      height: 16px;
    }

    .search-input {
      padding: 6px 12px 6px 32px;
      border: 1px solid var(--vscode-widget-border, var(--vscode-input-border, var(--vscode-panel-border, #454545)));
      border-radius: 4px;
      background-color: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      font-size: 0.875rem;
      width: 250px;
      transition: all 0.2s;
      outline: none;
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.08);
    }

    .search-input:hover {
      border-color: var(--vscode-inputOption-hoverBorder, var(--vscode-widget-border, #858585));
    }

    .search-input:focus {
      border-color: var(--vscode-focusBorder, #007acc);
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1), 0 0 0 1px var(--vscode-focusBorder, #007acc);
    }

    .search-input::placeholder {
      color: var(--vscode-input-placeholderForeground, #999);
      opacity: 0.7;
    }

    .namespace-filter {
      position: relative;
      display: flex;
      align-items: center;
    }

    .namespace-select {
      padding: 6px 12px;
      border: 1px solid var(--vscode-widget-border, var(--vscode-input-border, var(--vscode-panel-border, #454545)));
      border-radius: 4px;
      background-color: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      font-size: 0.875rem;
      min-width: 150px;
      transition: all 0.2s;
      outline: none;
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.08);
    }

    .namespace-select:hover {
      border-color: var(--vscode-inputOption-hoverBorder, var(--vscode-widget-border, #858585));
    }

    .namespace-select:focus {
      border-color: var(--vscode-focusBorder, #007acc);
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1), 0 0 0 1px var(--vscode-focusBorder, #007acc);
    }

    .namespace-dropdown {
      position: relative;
      min-width: 150px;
    }

    .namespace-button {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 6px 12px;
      border: 1px solid var(--vscode-widget-border, var(--vscode-input-border, var(--vscode-panel-border, #454545)));
      border-radius: 4px;
      background-color: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s;
      outline: none;
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.08);
    }

    .namespace-button:hover {
      border-color: var(--vscode-inputOption-hoverBorder, var(--vscode-widget-border, #858585));
    }

    .namespace-button:focus,
    .namespace-button.active {
      border-color: var(--vscode-focusBorder, #007acc);
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1), 0 0 0 1px var(--vscode-focusBorder, #007acc);
    }

    .namespace-arrow {
      margin-left: 8px;
      transition: transform 0.2s;
      font-size: 12px;
    }

    .namespace-arrow.open {
      transform: rotate(180deg);
    }

    .namespace-dropdown-content {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      margin-top: 4px;
      background: var(--vscode-dropdown-background, var(--vscode-menu-background, var(--vscode-bg-light, #252526)));
      border: 1px solid var(--vscode-dropdown-border, var(--vscode-menu-border, var(--border-color, #454545)));
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      z-index: 1000;
      max-height: 250px;
      overflow: hidden;
      display: none;
    }

    .namespace-dropdown-content.show {
      display: block;
    }

    .namespace-search {
      padding: 8px;
      border-bottom: 1px solid var(--vscode-widget-border, var(--vscode-panel-border, #454545));
    }

    .namespace-search-input {
      width: 100%;
      padding: 6px 8px;
      border: 1px solid var(--vscode-widget-border, var(--vscode-input-border, var(--vscode-panel-border, #454545)));
      border-radius: 3px;
      background-color: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      font-size: 0.8125rem;
      outline: none;
      box-sizing: border-box;
    }

    .namespace-search-input:focus {
      border-color: var(--vscode-focusBorder, #007acc);
    }

    .namespace-search-input::placeholder {
      color: var(--vscode-input-placeholderForeground, #999);
      opacity: 0.7;
    }

    .namespace-options {
      max-height: 180px;
      overflow-y: auto;
    }

    .namespace-option {
      display: block;
      width: 100%;
      text-align: left;
      padding: 8px 12px;
      border: none;
      background: none;
      color: var(--vscode-menu-foreground, var(--vscode-foreground, var(--vscode-text, #cccccc)));
      cursor: pointer;
      font-size: 0.875rem;
      transition: background-color 0.2s;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .namespace-option:hover {
      background-color: var(--vscode-list-hoverBackground, var(--vscode-toolbar-hoverBackground, rgba(255, 255, 255, 0.08)));
      color: var(--vscode-list-hoverForeground, var(--vscode-foreground));
    }

    .namespace-option.selected {
      background-color: var(--vscode-list-activeSelectionBackground, var(--vscode-accent, #007acc));
      color: var(--vscode-list-activeSelectionForeground, white);
    }

    .namespace-option.selected:hover {
      background-color: var(--vscode-list-activeSelectionBackground, var(--vscode-accent, #007acc));
    }

    .no-namespaces {
      padding: 8px 12px;
      color: var(--vscode-descriptionForeground, var(--text-secondary, #999));
      font-style: italic;
      font-size: 0.8125rem;
    }

    .filter-label {
      margin-right: 8px;
      font-size: 0.875rem;
      color: var(--vscode-foreground);
      font-weight: 500;
    }

    .pod-details-drawer {
      position: fixed;
      top: 0;
      right: 0;
      width: 600px;
      height: 100vh;
      background: var(--vscode-editor-background, var(--vscode-bg-light));
      border-left: 0.5px solid var(--vscode-widget-border, var(--vscode-panel-border, #454545));
      box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
      z-index: 1001;
      overflow-y: auto;
      padding: 20px;
    }

    .close-button {
      position: absolute;
      top: 16px;
      right: 16px;
      background: none;
      border: none;
      cursor: pointer;
      color: var(--vscode-text);
      font-size: 18px;
      padding: 4px;
      border-radius: 4px;
      transition: background-color 0.2s;
    }

    .close-button:hover {
      background-color: var(--hover-bg);
    }

    .pod-details-drawer h2 {
      margin: 0 0 20px 0;
      padding: 0;
      font-size: 18px;
      font-weight: 600;
      color: var(--vscode-text);
    }

    .pod-details-drawer ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .pod-details-drawer li {
      padding: 8px 0;
      border-bottom: 1px solid var(--vscode-widget-border, var(--vscode-panel-border, #454545));
      font-size: 0.875rem;
      color: var(--vscode-text);
    }

    .pod-details-drawer li:last-child {
      border-bottom: none;
    }

    .pod-details-drawer strong {
      font-weight: bold;
      font-size: 0.9rem;
    }

    .loading-state {
      text-align: center;
      padding: 20px;
      color: var(--vscode-text);
      font-style: italic;
    }

    .no-data {
      text-align: center;
      padding: 20px;
      color: var(--text-secondary);
      font-style: italic;
    }

    .pod-details-content {
      font-size: 0.875rem;
    }

    .detail-section {
      margin-bottom: 8px;
    }

    .detail-item {
      margin-bottom: 8px;
      padding: 4px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .detail-item:last-child {
      border-bottom: none;
    }

    .detail-key {
      font-weight: 600;
      display: inline-block;
      min-width: 120px;
      margin-right: 8px;
    }

    .detail-value {
      color: var(--vscode-foreground, var(--vscode-text, #cccccc));
      word-break: break-word;
      display: inline;
    }

    .detail-value.null {
      color: var(--vscode-descriptionForeground, var(--text-secondary, #999));
      font-style: italic;
    }

    .detail-item.nested {
      border-left: 1px solid var(--vscode-accent, #007acc);
      padding-left: 8px;
      margin-left: 8px;
    }

    .nested-content {
      margin-top: 4px;
    }

    .detail-item.array {
      border-left: 2px solid var(--vscode-symbolIcon-arrayForeground, #4FC1FF);
      padding-left: 8px;
      margin-left: 8px;
    }

    .array-content {
      margin-top: 4px;
    }

    .array-item {
      margin: 4px 0;
      padding: 2px 0;
    }

    .array-index {
      color: var(--vscode-symbolIcon-numberForeground, #B5CEA8);
      font-weight: 600;
      margin-right: 8px;
      font-size: 0.8rem;
    }

    .array-value {
      color: var(--vscode-text);
    }

    .empty-array {
      color: var(--text-secondary);
      font-style: italic;
    }

    .pod-name-link {
      color: var(--vscode-link-foreground, #0096ff);
      cursor: pointer;
      text-decoration: none;
      border-bottom: 1px solid transparent;
      transition: all 0.2s ease;
    }

    .pod-name-link:hover {
      color: var(--vscode-link-activeForeground, #0096ff);
      text-decoration: underline;
      border-bottom-color: var(--vscode-link-foreground, #0096ff);
    }

    .pod-name-link:active {
      color: var(--vscode-link-activeForeground, #0096ff);
    }

    .detail-sections {
      padding: 0;
    }

    .detail-section {
      margin-bottom: 24px;
      padding: 16px 0;
      border-bottom: 1px solid var(--vscode-widget-border, rgba(255, 255, 255, 0.1));
    }

    .detail-section:last-child {
      border-bottom: none;
    }

    .detail-section h3 {
      margin: 0 0 12px 0;
      padding: 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--vscode-foreground);
      border-bottom: 1px solid var(--vscode-accent, #007acc);
      padding-bottom: 6px;
      margin-bottom: 16px;
    }

    .detail-item {
      margin-bottom: 8px;
      padding: 6px 0;
      display: flex;
      align-items: flex-start;
    }

    .detail-item:last-child {
      margin-bottom: 0;
    }

    .detail-key {
      font-weight: 600;
      min-width: 140px;
      margin-right: 12px;
      flex-shrink: 0;
    }

    .detail-value {
      color: var(--vscode-foreground, var(--vscode-text, #cccccc));
      word-break: break-word;
      flex: 1;
      line-height: 1.4;
    }

    .detail-value.null {
      color: var(--vscode-descriptionForeground, var(--text-secondary, #999));
      font-style: italic;
    }

    .detail-item.nested {
      border-left: 3px solid var(--vscode-accent, #007acc);
      padding-left: 12px;
      margin-left: 0;
      background: rgba(0, 122, 204, 0.05);
      border-radius: 4px;
      padding: 12px;
      margin-bottom: 12px;
      flex-direction: column;
      align-items: stretch;
    }

    .nested-content {
      margin-top: 8px;
    }

    .nested-content .detail-item {
      margin-bottom: 6px;
      padding: 4px 0;
    }
  `;

  renderContent() {
    // Use filtered data based on search query
    const data = this.getFilteredData();

    if (data.length === 0) {
      const allData = this[this.activeSubmenu] || [];
      if (allData.length === 0) {
        return html`
          <div class="empty-state">No ${this.activeSubmenu} resources found.</div>
        `;
      } else {
        return html`
          <div class="empty-state">No ${this.activeSubmenu} resources match your search.</div>
        `;
      }
    }

    switch (this.activeSubmenu) {
      case 'workloads':
        return this.renderWorkloadTable(data);
      case 'networks':
        return this.renderNetworksTable(data);
      case 'storages':
        return this.renderStorageTable(data);
      case 'configurations':
        return this.renderConfigurationsTable(data);
      case 'helms':
        return this.renderHelmTable(data);
      default:
        return html`<div class="empty-state">Invalid submenu</div>`;
    }
  }

  renderWorkloadTable(data) {
    // Check if we're showing only CronJobs or Jobs to adjust header
    const isCronJobsOnly = this.activeWorkloadTab === 'cronjobs';
    const isJobsOnly = this.activeWorkloadTab === 'jobs';
    
    let headerText = 'Replicas';
    if (isCronJobsOnly) {
      headerText = 'Schedule';
    } else if (isJobsOnly) {
      headerText = 'Completions';
    }
    
    return html`
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Namespace</th>
            ${!isJobsOnly ? html`<th>Status</th>` : ''}
            <th>${headerText}</th>
            <th>Age</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${data.map((item, index) => html`
            <tr>
              <td>
                ${item.type === 'Pod' 
                  ? html`<span class="pod-name-link" @click=${() => this.viewDetails(item)}>${item.name}</span>`
                  : item.name
                }
              </td>
              <td>${item.type}</td>
              <td>${item.namespace}</td>
              ${!isJobsOnly ? html`<td><span class="status ${item.status.toLowerCase()}">${item.status}</span></td>` : ''}
              <td>${item.replicas || '-'}</td>
              <td>${item.age}</td>
              <td>
                <div class="action-menu">
                  <button class="action-dots" @click=${(e) => this.toggleActionMenu(e, `k8s-workload-${index}`)}>⋮</button>
                  <div class="action-dropdown" id="k8s-workload-${index}">
                    <button @click=${() => { this.closeAllMenus(); this.viewDetails(item); }}>View Details</button>
                    <button @click=${() => { this.closeAllMenus(); this.scalePods(item); }}>Scale</button>
                    <button @click=${() => { this.closeAllMenus(); this.viewLogs(item); }}>View Logs</button>
                    <button class="danger" @click=${() => { this.closeAllMenus(); this.deleteItem(item); }}>Delete</button>
                  </div>
                </div>
              </td>
            </tr>
          `)}
        </tbody>
      </table>
    `;
  }

  renderNetworksTable(data) {
    return html`
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Namespace</th>
            <th>Status</th>
            <th>Endpoints</th>
            <th>Age</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${data.map((item, index) => html`
            <tr>
              <td>${item.name}</td>
              <td>${item.type}</td>
              <td>${item.namespace}</td>
              <td><span class="status ${item.status.toLowerCase()}">${item.status}</span></td>
              <td>${item.endpoints}</td>
              <td>${item.age}</td>
              <td>
                <div class="action-menu">
                  <button class="action-dots" @click=${(e) => this.toggleActionMenu(e, `k8s-networks-${index}`)}>⋮</button>
                  <div class="action-dropdown" id="k8s-networks-${index}">
                    <button @click=${() => { this.closeAllMenus(); this.viewDetails(item); }}>View Details</button>
                    <button @click=${() => { this.closeAllMenus(); this.editItem(item); }}>Edit</button>
                    <button @click=${() => { this.closeAllMenus(); this.viewEndpoints(item); }}>View Endpoints</button>
                    <button class="danger" @click=${() => { this.closeAllMenus(); this.deleteItem(item); }}>Delete</button>
                  </div>
                </div>
              </td>
            </tr>
          `)}
        </tbody>
      </table>
    `;
  }

  renderStorageTable(data) {
    return html`
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Namespace</th>
            <th>Status</th>
            <th>Capacity</th>
            <th>Access Mode</th>
            <th>Age</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${data.map((item, index) => html`
            <tr>
              <td>${item.name}</td>
              <td>${item.type}</td>
              <td>${item.namespace}</td>
              <td><span class="status ${item.status.toLowerCase()}">${item.status}</span></td>
              <td>${item.capacity}</td>
              <td>${item.accessMode}</td>
              <td>${item.age}</td>
              <td>
                <div class="action-menu">
                  <button class="action-dots" @click=${(e) => this.toggleActionMenu(e, `k8s-storage-${index}`)}>⋮</button>
                  <div class="action-dropdown" id="k8s-storage-${index}">
                    <button @click=${() => { this.closeAllMenus(); this.viewDetails(item); }}>View Details</button>
                    <button @click=${() => { this.closeAllMenus(); this.editItem(item); }}>Edit</button>
                    <button @click=${() => { this.closeAllMenus(); this.expandVolume(item); }}>Expand</button>
                    <button class="danger" @click=${() => { this.closeAllMenus(); this.deleteItem(item); }}>Delete</button>
                  </div>
                </div>
              </td>
            </tr>
          `)}
        </tbody>
      </table>
    `;
  }

  renderConfigurationsTable(data) {
    return html`
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Namespace</th>
            <th>Status</th>
            <th>Keys</th>
            <th>Age</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${data.map((item, index) => html`
            <tr>
              <td>${item.name}</td>
              <td>${item.type}</td>
              <td>${item.namespace}</td>
              <td><span class="status ${item.status.toLowerCase()}">${item.status}</span></td>
              <td>${item.keys}</td>
              <td>${item.age}</td>
              <td>
                <div class="action-menu">
                  <button class="action-dots" @click=${(e) => this.toggleActionMenu(e, `k8s-configurations-${index}`)}>⋮</button>
                  <div class="action-dropdown" id="k8s-configurations-${index}">
                    <button @click=${() => { this.closeAllMenus(); this.viewDetails(item); }}>View Details</button>
                    <button @click=${() => { this.closeAllMenus(); this.editItem(item); }}>Edit</button>
                    <button @click=${() => { this.closeAllMenus(); this.viewKeys(item); }}>View Keys</button>
                    <button class="danger" @click=${() => { this.closeAllMenus(); this.deleteItem(item); }}>Delete</button>
                  </div>
                </div>
              </td>
            </tr>
          `)}
        </tbody>
      </table>
    `;
  }

  renderHelmTable(data) {
    return html`
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Namespace</th>
            <th>Revision</th>
            <th>Status</th>
            <th>Chart</th>
            <th>Updated</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${data.map((item, index) => html`
            <tr>
              <td>${item.name}</td>
              <td>${item.namespace}</td>
              <td>${item.revision}</td>
              <td><span class="status ${item.status.toLowerCase()}">${item.status}</span></td>
              <td>${item.chart}</td>
              <td>${item.updated}</td>
              <td>
                <div class="action-menu">
                  <button class="action-dots" @click=${(e) => this.toggleActionMenu(e, `k8s-helm-${index}`)}>⋮</button>
                  <div class="action-dropdown" id="k8s-helm-${index}">
                    <button @click=${() => { this.closeAllMenus(); this.viewDetails(item); }}>View Details</button>
                    <button @click=${() => { this.closeAllMenus(); this.upgradeRelease(item); }}>Upgrade</button>
                    <button @click=${() => { this.closeAllMenus(); this.rollbackRelease(item); }}>Rollback</button>
                    <button class="danger" @click=${() => { this.closeAllMenus(); this.uninstallRelease(item); }}>Uninstall</button>
                  </div>
                </div>
              </td>
            </tr>
          `)}
        </tbody>
      </table>
    `;
  }

  private searchQuery: string = '';

  private handleSearchInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchQuery = target.value.toLowerCase();
    this.requestUpdate();
  }

  private getFilteredData(): Array<any> {
    let data = this[this.activeSubmenu] || [];
    
    // If viewing workloads, filter by active workload tab
    if (this.activeSubmenu === 'workloads') {
      data = this.getFilteredWorkloadData();
    }
    
    // If viewing storages, filter by active storage tab
    if (this.activeSubmenu === 'storages') {
      data = this.getFilteredStorageData();
    }
    
    // If viewing configurations, filter by active configuration tab
    if (this.activeSubmenu === 'configurations') {
      data = this.getFilteredConfigurationData();
    }
    
    // If viewing helms, filter by active helm tab
    if (this.activeSubmenu === 'helms') {
      data = this.getFilteredHelmData();
    }
    
    // Filter by namespace if a specific namespace is selected
    if (this.selectedNamespace !== 'all') {
      data = data.filter(item => item.namespace === this.selectedNamespace);
    }
    
    // Apply search query filter
    if (this.searchQuery) {
      data = data.filter(item => JSON.stringify(item).toLowerCase().includes(this.searchQuery));
    }
    
    return data;
  }

  private getFilteredWorkloadData(): Array<any> {
    const allWorkloads = this.workloads || [];
    
    switch (this.activeWorkloadTab) {
      case 'pods':
        return allWorkloads.filter(item => item.type === 'Pod');
      case 'deployments':
        return allWorkloads.filter(item => item.type === 'Deployment');
      case 'statefulsets':
        return allWorkloads.filter(item => item.type === 'StatefulSet');
      case 'daemonsets':
        return allWorkloads.filter(item => item.type === 'DaemonSet');
      case 'jobs':
        return allWorkloads.filter(item => item.type === 'Job');
      case 'cronjobs':
        return allWorkloads.filter(item => item.type === 'CronJob');
      default:
        return allWorkloads;
    }
  }

  private getFilteredStorageData(): Array<any> {
    const allStorages = this.storages || [];
    
    switch (this.activeStorageTab) {
      case 'pvc':
        return allStorages.filter(item => item.type === 'PersistentVolumeClaim');
      case 'pv':
        return allStorages.filter(item => item.type === 'PersistentVolume');
      default:
        return allStorages;
    }
  }

  private getFilteredConfigurationData(): Array<any> {
    const allConfigurations = this.configurations || [];
    
    switch (this.activeConfigurationTab) {
      case 'secrets':
        return allConfigurations.filter(item => item.type === 'Secret');
      case 'configmap':
        return allConfigurations.filter(item => item.type === 'ConfigMap');
      default:
        return allConfigurations;
    }
  }

  private getFilteredHelmData(): Array<any> {
    const allHelms = this.helms || [];
    
    switch (this.activeHelmTab) {
      case 'releases':
        return allHelms.filter(item => item.type === 'Release');
      case 'charts':
        return allHelms.filter(item => item.type === 'Chart');
      default:
        return allHelms;
    }
  }

  private handleWorkloadTabClick(tab: string) {
    this.activeWorkloadTab = tab;
    this.requestUpdate();
  }

  private handleStorageTabClick(tab: string) {
    this.activeStorageTab = tab;
    this.requestUpdate();
  }

  private handleConfigurationTabClick(tab: string) {
    this.activeConfigurationTab = tab;
    this.requestUpdate();
  }

  private handleHelmTabClick(tab: string) {
    this.activeHelmTab = tab;
    this.requestUpdate();
  }

  private renderWorkloadTabs() {
    return html`
      <div class="tab-header">
        <button 
          class="tab-button ${this.activeWorkloadTab === 'pods' ? 'active' : ''}"
          @click=${() => this.handleWorkloadTabClick('pods')}
        >
          Pods
        </button>
        <button 
          class="tab-button ${this.activeWorkloadTab === 'deployments' ? 'active' : ''}"
          @click=${() => this.handleWorkloadTabClick('deployments')}
        >
          Deployments
        </button>
        <button 
          class="tab-button ${this.activeWorkloadTab === 'statefulsets' ? 'active' : ''}"
          @click=${() => this.handleWorkloadTabClick('statefulsets')}
        >
          StatefulSets
        </button>
        <button 
          class="tab-button ${this.activeWorkloadTab === 'daemonsets' ? 'active' : ''}"
          @click=${() => this.handleWorkloadTabClick('daemonsets')}
        >
          DaemonSets
        </button>
        <button 
          class="tab-button ${this.activeWorkloadTab === 'jobs' ? 'active' : ''}"
          @click=${() => this.handleWorkloadTabClick('jobs')}
        >
          Jobs
        </button>
        <button 
          class="tab-button ${this.activeWorkloadTab === 'cronjobs' ? 'active' : ''}"
          @click=${() => this.handleWorkloadTabClick('cronjobs')}
        >
          CronJobs
        </button>
      </div>
    `;
  }

  private renderStorageTabs() {
    return html`
      <div class="tab-header">
        <button 
          class="tab-button ${this.activeStorageTab === 'pvc' ? 'active' : ''}"
          @click=${() => this.handleStorageTabClick('pvc')}
        >
          PVC
        </button>
        <button 
          class="tab-button ${this.activeStorageTab === 'pv' ? 'active' : ''}"
          @click=${() => this.handleStorageTabClick('pv')}
        >
          PV
        </button>
      </div>
    `;
  }

  private renderConfigurationTabs() {
    return html`
      <div class="tab-header">
        <button 
          class="tab-button ${this.activeConfigurationTab === 'secrets' ? 'active' : ''}"
          @click=${() => this.handleConfigurationTabClick('secrets')}
        >
          Secrets
        </button>
        <button 
          class="tab-button ${this.activeConfigurationTab === 'configmap' ? 'active' : ''}"
          @click=${() => this.handleConfigurationTabClick('configmap')}
        >
          ConfigMap
        </button>
      </div>
    `;
  }

  private renderHelmTabs() {
    return html`
      <div class="tab-header">
        <button 
          class="tab-button ${this.activeHelmTab === 'releases' ? 'active' : ''}"
          @click=${() => this.handleHelmTabClick('releases')}
        >
          Releases
        </button>
        <button 
          class="tab-button ${this.activeHelmTab === 'charts' ? 'active' : ''}"
          @click=${() => this.handleHelmTabClick('charts')}
        >
          Charts
        </button>
      </div>
    `;
  }
  renderPodDetailsDrawer() {
    if (!this.showPodDetails) {
      return null;
    }

    if (this.loadingPodDetails) {
      return html`
        <div class="pod-details-drawer">
          <button class="close-button" @click="${() => this.showPodDetails = false}">&#x2715;</button>
          <h2>Pod Details</h2>
          <div class="loading-state">Loading pod details...</div>
        </div>
      `;
    }

    return html`
      <div class="pod-details-drawer">
        <button class="close-button" @click="${() => this.showPodDetails = false}">&#x2715;</button>
        <h2>Pod Details</h2>
        <div class="pod-details-content">
          ${this.renderPodDetailContent(this.selectedPod)}
        </div>
      </div>
    `;
  }

renderPodDetailContent(data: any) {
    if (!data) {
      return html`<div class="no-data">No data available</div>`;
    }

    // Handle the actual API response structure where data is under 'pod_detail' key
    const podData = data.pod_detail || data;
    
    console.log('Processing pod data:', podData);

    return html`
      <div class="detail-sections">
        <!-- Basic Information -->
        <div class="detail-section">
          <h3>Basic Information</h3>
          ${this.renderDetailItem('Name', podData.name)}
          ${this.renderDetailItem('Namespace', podData.namespace)}
          ${this.renderDetailItem('UID', podData.uid)}
          ${this.renderDetailItem('Resource Version', podData.resourceVersion)}
          ${this.renderDetailItem('Creation Timestamp', podData.creationTimestamp)}
          ${this.renderDetailItem('Age', podData.age)}
        </div>

        <!-- Status Information -->
        <div class="detail-section">
          <h3>Status</h3>
          ${this.renderDetailItem('Status', podData.status)}
          ${this.renderDetailItem('Phase', podData.phase)}
          ${this.renderDetailItem('QoS Class', podData.qosClass)}
          ${this.renderDetailItem('Start Time', podData.startTime)}
        </div>

        <!-- Network Information -->
        <div class="detail-section">
          <h3>Network</h3>
          ${this.renderDetailItem('Pod IP', podData.ip)}
          ${this.renderDetailItem('Host IP', podData.hostIP)}
          ${this.renderDetailItem('Node', podData.node)}
        </div>

        <!-- Configuration -->
        <div class="detail-section">
          <h3>Configuration</h3>
          ${this.renderDetailItem('Restart Policy', podData.restartPolicy)}
          ${this.renderDetailItem('DNS Policy', podData.dnsPolicy)}
          ${this.renderDetailItem('Service Account', podData.serviceAccount)}
          ${this.renderDetailItem('Node Selector', podData.nodeSelector, true)}
        </div>

        <!-- Labels -->
        ${podData.labels ? html`
          <div class="detail-section">
            <h3>Labels</h3>
            ${this.renderObjectAsKeyValue(podData.labels)}
          </div>
        ` : ''}

        <!-- Annotations -->
        ${podData.annotations ? html`
          <div class="detail-section">
            <h3>Annotations</h3>
            ${this.renderObjectAsKeyValue(podData.annotations)}
          </div>
        ` : ''}

        <!-- Containers -->
        ${podData.containers && podData.containers.length > 0 ? html`
          <div class="detail-section">
            <h3>Containers</h3>
            ${podData.containers.map((container, index) => html`
              <div class="detail-item nested">
                <strong class="detail-key">Container ${index + 1}:</strong>
                <div class="nested-content">
                  ${this.renderDetailItem('Name', container.name)}
                  ${this.renderDetailItem('Image', container.image)}
                  ${this.renderDetailItem('Ready', container.ready)}
                  ${this.renderDetailItem('Restart Count', container.restartCount)}
                  ${this.renderDetailItem('State', container.state)}
                </div>
              </div>
            `)}
          </div>
        ` : ''}

        <!-- Conditions -->
        ${podData.conditions && podData.conditions.length > 0 ? html`
          <div class="detail-section">
            <h3>Conditions</h3>
            ${podData.conditions.map((condition, index) => html`
              <div class="detail-item nested">
                <strong class="detail-key">${condition.type}:</strong>
                <div class="nested-content">
                  ${this.renderDetailItem('Status', condition.status)}
                  ${this.renderDetailItem('Last Probe Time', condition.lastProbeTime)}
                  ${this.renderDetailItem('Last Transition Time', condition.lastTransitionTime)}
                  ${this.renderDetailItem('Reason', condition.reason)}
                  ${this.renderDetailItem('Message', condition.message)}
                </div>
              </div>
            `)}
          </div>
        ` : ''}
      </div>
    `;
  }

  renderDetailItem(label: string, value: any, isObject: boolean = false) {
    if (value === null || value === undefined) {
      return html`
        <div class="detail-item">
          <strong class="detail-key">${label}:</strong>
          <span class="detail-value null">null</span>
        </div>
      `;
    }

    if (isObject && typeof value === 'object') {
      return html`
        <div class="detail-item nested">
          <strong class="detail-key">${label}:</strong>
          <div class="nested-content">
            ${this.renderObjectAsKeyValue(value)}
          </div>
        </div>
      `;
    }

    return html`
      <div class="detail-item">
        <strong class="detail-key">${label}:</strong>
        <span class="detail-value">${this.formatValue(value)}</span>
      </div>
    `;
  }

  renderObjectAsKeyValue(obj: any) {
    if (!obj || typeof obj !== 'object') {
      return html`<span class="detail-value null">N/A</span>`;
    }

    const entries = Object.entries(obj);
    if (entries.length === 0) {
      return html`<span class="detail-value null">Empty</span>`;
    }

    return html`
      ${entries.map(([key, value]) => html`
        <div class="detail-item">
          <strong class="detail-key">${key}:</strong>
          <span class="detail-value">${this.formatValue(value)}</span>
        </div>
      `)}
    `;
  }

  formatValue(value: any): string {
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (Array.isArray(value)) {
      return `[${value.length} items]`;
    }
    if (typeof value === 'object' && value !== null) {
      try {
        const str = JSON.stringify(value, null, 2);
        // If it's a short object, show it inline, otherwise show a summary
        if (str.length < 100) {
          return str;
        } else {
          const keys = Object.keys(value);
          return `{${keys.length} properties: ${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''}}`;
        }
      } catch {
        return String(value);
      }
    }
    return String(value);
  }

  render() {
    return html`
      <div class="tab-container">
        <h1>${this.renderTitle()}</h1>
        ${this.activeSubmenu === 'workloads' ? this.renderWorkloadTabs() : ''}
        ${this.activeSubmenu === 'storages' ? this.renderStorageTabs() : ''}
        ${this.activeSubmenu === 'configurations' ? this.renderConfigurationTabs() : ''}
        ${this.activeSubmenu === 'helms' ? this.renderHelmTabs() : ''}
        <div class="search-container">
          <div class="namespace-filter">
          <div class="namespace-dropdown">
            <button class="namespace-button" @click=${(e) => this.toggleNamespaceDropdown(e)}>
              ${this.getSelectedNamespaceDisplayName()}
              <span class="namespace-arrow ${this.showNamespaceDropdown ? 'open' : ''}">▼</span>
            </button>
            <div class="namespace-dropdown-content ${this.showNamespaceDropdown ? 'show' : ''}">
              <div class="namespace-search">
                <input 
                  type="text" 
                  class="namespace-search-input" 
                  .value=${this.namespaceSearchQuery}
                  @input=${this.handleNamespaceSearch}
                  placeholder="Filter namespaces..."
                />
              </div>
              <div class="namespace-options">
                ${this.getFilteredNamespaces().map(namespace => html`
                  <button class="namespace-option ${namespace === this.selectedNamespace ? 'selected' : ''}"
                    @click=${() => this.selectNamespace(namespace)}>
                    ${namespace}
                  </button>`
                )}
                ${this.getFilteredNamespaces().length === 0 ? 
                  html`<div class="no-namespaces">No namespaces found</div>` : ''}
              </div>
            </div>
          </div>
          </div>
          <div class="search-wrapper">
            <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input 
              class="search-input"
              type="text" 
              placeholder="Search..."
              .value=${this.searchQuery}
              @input=${this.handleSearchInput}
            />
          </div>
        </div>
        <div class="tab-content">
          ${this.error ? html`
            <div class="error-state">
              <h3>Error</h3>
              <p>${this.error}</p>
            </div>` : this.renderContent()}
        </div>
        ${this.renderPodDetailsDrawer()}
      </div>
    `;
  }

  renderTitle() {
    const titles = {
      workloads: 'Kubernetes Workloads',
      networks: 'Kubernetes Networks',
      storages: 'Kubernetes Storages',
      configurations: 'Kubernetes Configurations',
      helms: 'Kubernetes Helms'
    };
    return titles[this.activeSubmenu] || 'Kubernetes';
  }

  
  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('popstate', this.handleRouteChange);
    window.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('click', this.handleNamespaceDropdownOutsideClick);
  }
  
  private handleRouteChange = () => {
    const path = window.location.pathname;
    if (path.includes('/kubernetes/')) {
      const submenu = path.split('/kubernetes/')[1];
      if (submenu && ['workloads', 'networks', 'storages', 'configurations', 'helms'].includes(submenu)) {
        this.activeSubmenu = submenu;
      }
    }
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && this.showPodDetails) {
      this.showPodDetails = false;
      this.requestUpdate();
    }
  };

  private updateActiveSubmenu() {
    // Priority: subRoute property > URL path > default
    if (this.subRoute && ['workloads', 'networks', 'storages', 'configurations', 'helms'].includes(this.subRoute)) {
      this.activeSubmenu = this.subRoute;
    } else {
      // Fallback to URL detection
      const path = window.location.pathname;
      if (path.includes('/kubernetes/')) {
        const submenu = path.split('/kubernetes/')[1];
        if (submenu && ['workloads', 'networks', 'storages', 'configurations', 'helms'].includes(submenu)) {
          this.activeSubmenu = submenu;
        }
      }
    }
  }

  // Watch for changes to subRoute property
  override updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);
    if (changedProperties.has('subRoute')) {
      this.updateActiveSubmenu();
    }
  }

  initializeMockData() {
    // Workload mock data - Deployments, Services, Pods
    this.workloads = [
      { 
        name: 'nginx-deployment', 
        type: 'Deployment', 
        namespace: 'default', 
        status: 'Running', 
        replicas: '3/3', 
        age: '2d' 
      },
      { 
        name: 'api-gateway', 
        type: 'Deployment', 
        namespace: 'production', 
        status: 'Running', 
        replicas: '2/2', 
        age: '5d' 
      },
      { 
        name: 'redis-deployment', 
        type: 'Deployment', 
        namespace: 'database', 
        status: 'Running', 
        replicas: '1/1', 
        age: '3d' 
      },
      { 
        name: 'web-frontend', 
        type: 'Deployment', 
        namespace: 'frontend', 
        status: 'Running', 
        replicas: '5/5', 
        age: '1w' 
      },
      { 
        name: 'auth-service', 
        type: 'Deployment', 
        namespace: 'auth', 
        status: 'Failed', 
        replicas: '0/2', 
        age: '1h' 
      },
      { 
        name: 'frontend-service', 
        type: 'Service', 
        namespace: 'default', 
        status: 'Active', 
        replicas: '-', 
        age: '1d' 
      },
      { 
        name: 'database-service', 
        type: 'Service', 
        namespace: 'database', 
        status: 'Active', 
        replicas: '-', 
        age: '1w' 
      },
      { 
        name: 'api-loadbalancer', 
        type: 'Service', 
        namespace: 'production', 
        status: 'Active', 
        replicas: '-', 
        age: '2w' 
      },
      { 
        name: 'worker-pod-xyz', 
        type: 'Pod', 
        namespace: 'default', 
        status: 'Pending', 
        replicas: '-', 
        age: '5m' 
      },
      { 
        name: 'nginx-pod-abc', 
        type: 'Pod', 
        namespace: 'default', 
        status: 'Running', 
        replicas: '-', 
        age: '2d' 
      },
      { 
        name: 'redis-pod-def', 
        type: 'Pod', 
        namespace: 'database', 
        status: 'Running', 
        replicas: '-', 
        age: '3d' 
      },
      { 
        name: 'auth-pod-ghi', 
        type: 'Pod', 
        namespace: 'auth', 
        status: 'Error', 
        replicas: '-', 
        age: '30m' 
      },
      { 
        name: 'monitoring-daemon', 
        type: 'DaemonSet', 
        namespace: 'kube-system', 
        status: 'Running', 
        replicas: '3/3', 
        age: '10d' 
      },
      { 
        name: 'log-collector', 
        type: 'DaemonSet', 
        namespace: 'logging', 
        status: 'Running', 
        replicas: '3/3', 
        age: '7d' 
      }
    ];
    
    // Network mock data - Services, Ingress, NetworkPolicies
    this.networks = [
      { 
        name: 'main-ingress', 
        type: 'Ingress', 
        namespace: 'default', 
        status: 'Active', 
        endpoints: 'api.example.com', 
        age: '3d' 
      },
      { 
        name: 'load-balancer', 
        type: 'Service', 
        namespace: 'production', 
        status: 'Active', 
        endpoints: '10.0.1.100:80', 
        age: '7d' 
      },
      { 
        name: 'deny-all-policy', 
        type: 'NetworkPolicy', 
        namespace: 'default', 
        status: 'Enforced', 
        endpoints: '-', 
        age: '1d' 
      },
      { 
        name: 'external-endpoint', 
        type: 'Endpoints', 
        namespace: 'default', 
        status: 'Ready', 
        endpoints: '192.168.1.100:8080', 
        age: '6h' 
      }
    ];
    
    // Storage mock data - PVs, PVCs, StorageClasses
    this.storages = [
      { 
        name: 'mysql-volume', 
        type: 'PersistentVolume', 
        namespace: 'database', 
        status: 'Bound', 
        capacity: '10Gi', 
        accessMode: 'ReadWriteOnce', 
        age: '10d' 
      },
      { 
        name: 'app-data-claim', 
        type: 'PersistentVolumeClaim', 
        namespace: 'default', 
        status: 'Bound', 
        capacity: '5Gi', 
        accessMode: 'ReadWriteOnce', 
        age: '3d' 
      },
      { 
        name: 'redis-data-claim', 
        type: 'PersistentVolumeClaim', 
        namespace: 'database', 
        status: 'Bound', 
        capacity: '2Gi', 
        accessMode: 'ReadWriteOnce', 
        age: '5d' 
      },
      { 
        name: 'log-storage-claim', 
        type: 'PersistentVolumeClaim', 
        namespace: 'logging', 
        status: 'Pending', 
        capacity: '20Gi', 
        accessMode: 'ReadWriteMany', 
        age: '2h' 
      },
      { 
        name: 'media-files-claim', 
        type: 'PersistentVolumeClaim', 
        namespace: 'frontend', 
        status: 'Bound', 
        capacity: '50Gi', 
        accessMode: 'ReadWriteMany', 
        age: '1w' 
      },
      { 
        name: 'fast-ssd', 
        type: 'StorageClass', 
        namespace: '-', 
        status: 'Available', 
        capacity: '-', 
        accessMode: 'ReadWriteOnce', 
        age: '30d' 
      },
      { 
        name: 'standard-hdd', 
        type: 'StorageClass', 
        namespace: '-', 
        status: 'Available', 
        capacity: '-', 
        accessMode: 'ReadWriteOnce', 
        age: '45d' 
      },
      { 
        name: 'network-storage', 
        type: 'StorageClass', 
        namespace: '-', 
        status: 'Available', 
        capacity: '-', 
        accessMode: 'ReadWriteMany', 
        age: '60d' 
      },
      { 
        name: 'backup-storage', 
        type: 'PersistentVolume', 
        namespace: 'backup', 
        status: 'Available', 
        capacity: '100Gi', 
        accessMode: 'ReadWriteMany', 
        age: '15d' 
      },
      { 
        name: 'prometheus-storage', 
        type: 'PersistentVolume', 
        namespace: 'monitoring', 
        status: 'Bound', 
        capacity: '25Gi', 
        accessMode: 'ReadWriteOnce', 
        age: '1w' 
      },
      { 
        name: 'grafana-storage', 
        type: 'PersistentVolume', 
        namespace: 'monitoring', 
        status: 'Bound', 
        capacity: '5Gi', 
        accessMode: 'ReadWriteOnce', 
        age: '1w' 
      },
      { 
        name: 'shared-cache', 
        type: 'PersistentVolume', 
        namespace: 'cache', 
        status: 'Available', 
        capacity: '15Gi', 
        accessMode: 'ReadWriteMany', 
        age: '3d' 
      }
    ];
    
    // Configuration mock data - ConfigMaps, Secrets, ServiceAccounts
    this.configurations = [
      { 
        name: 'app-config', 
        type: 'ConfigMap', 
        namespace: 'default', 
        status: 'Active', 
        keys: '3', 
        age: '2d' 
      },
      { 
        name: 'db-credentials', 
        type: 'Secret', 
        namespace: 'database', 
        status: 'Active', 
        keys: '2', 
        age: '7d' 
      },
      { 
        name: 'api-service-account', 
        type: 'ServiceAccount', 
        namespace: 'default', 
        status: 'Active', 
        keys: '-', 
        age: '5d' 
      },
      { 
        name: 'tls-certificates', 
        type: 'Secret', 
        namespace: 'production', 
        status: 'Active', 
        keys: '4', 
        age: '1d' 
      }
    ];
    
    // Helm mock data - Charts and Releases
    this.helms = [
      { 
        name: 'prometheus-stack', 
        type: 'Release',
        namespace: 'monitoring', 
        revision: '3', 
        status: 'Deployed', 
        chart: 'kube-prometheus-stack-45.7.1', 
        updated: '2024-01-15 10:30:00' 
      },
      { 
        name: 'grafana-dashboard', 
        type: 'Release',
        namespace: 'monitoring', 
        revision: '1', 
        status: 'Deployed', 
        chart: 'grafana-6.50.7', 
        updated: '2024-01-14 14:22:00' 
      },
      { 
        name: 'nginx-ingress', 
        type: 'Release',
        namespace: 'ingress-nginx', 
        revision: '2', 
        status: 'Failed', 
        chart: 'ingress-nginx-4.4.2', 
        updated: '2024-01-16 09:15:00' 
      },
      { 
        name: 'cert-manager', 
        type: 'Release',
        namespace: 'cert-manager', 
        revision: '1', 
        status: 'Pending', 
        chart: 'cert-manager-v1.13.3', 
        updated: '2024-01-16 11:45:00' 
      },
      { 
        name: 'redis-cluster', 
        type: 'Release',
        namespace: 'database', 
        revision: '4', 
        status: 'Deployed', 
        chart: 'redis-17.3.7', 
        updated: '2024-01-10 16:20:00' 
      },
      { 
        name: 'mysql-primary', 
        type: 'Release',
        namespace: 'database', 
        revision: '2', 
        status: 'Deployed', 
        chart: 'mysql-9.4.6', 
        updated: '2024-01-12 09:45:00' 
      },
      { 
        name: 'elasticsearch', 
        type: 'Release',
        namespace: 'logging', 
        revision: '1', 
        status: 'Deployed', 
        chart: 'elasticsearch-19.5.0', 
        updated: '2024-01-13 14:30:00' 
      },
      { 
        name: 'kibana', 
        type: 'Release',
        namespace: 'logging', 
        revision: '1', 
        status: 'Deployed', 
        chart: 'kibana-10.2.3', 
        updated: '2024-01-13 15:15:00' 
      },
      { 
        name: 'wordpress', 
        type: 'Release',
        namespace: 'frontend', 
        revision: '3', 
        status: 'Deployed', 
        chart: 'wordpress-15.2.5', 
        updated: '2024-01-11 11:20:00' 
      },
      { 
        name: 'jenkins', 
        type: 'Release',
        namespace: 'ci-cd', 
        revision: '1', 
        status: 'Failed', 
        chart: 'jenkins-4.2.17', 
        updated: '2024-01-16 13:45:00' 
      },
      { 
        name: 'argocd', 
        type: 'Release',
        namespace: 'argocd', 
        revision: '2', 
        status: 'Deployed', 
        chart: 'argo-cd-5.16.13', 
        updated: '2024-01-09 08:30:00' 
      },
      { 
        name: 'vault', 
        type: 'Release',
        namespace: 'vault', 
        revision: '1', 
        status: 'Pending', 
        chart: 'vault-0.22.1', 
        updated: '2024-01-16 16:00:00' 
      },
      // Chart examples
      { 
        name: 'nginx-chart', 
        type: 'Chart',
        namespace: '-', 
        revision: '-', 
        status: 'Available', 
        chart: 'nginx-1.25.3', 
        updated: '2024-01-10 08:00:00' 
      },
      { 
        name: 'mysql-chart', 
        type: 'Chart',
        namespace: '-', 
        revision: '-', 
        status: 'Available', 
        chart: 'mysql-9.4.6', 
        updated: '2024-01-12 10:00:00' 
      },
      { 
        name: 'redis-chart', 
        type: 'Chart',
        namespace: '-', 
        revision: '-', 
        status: 'Available', 
        chart: 'redis-17.3.7', 
        updated: '2024-01-08 12:00:00' 
      },
      { 
        name: 'postgresql-chart', 
        type: 'Chart',
        namespace: '-', 
        revision: '-', 
        status: 'Available', 
        chart: 'postgresql-12.1.2', 
        updated: '2024-01-14 16:00:00' 
      }
    ];
  }


  toggleActionMenu(event, menuId) {
    event.stopPropagation();
    
    // Close all other menus first
    this.closeAllMenus();
    
    // Toggle the clicked menu
    const menu = this.shadowRoot?.querySelector(`#${menuId}`);
    if (menu) {
      menu.classList.toggle('show');
    }
    
    // Add click listener to close menu when clicking outside
    if (menu?.classList.contains('show')) {
      setTimeout(() => {
        document.addEventListener('click', this.handleOutsideClick);
      }, 0);
    }
  }

  closeAllMenus() {
    const menus = this.shadowRoot?.querySelectorAll('.action-dropdown');
    menus?.forEach(menu => menu.classList.remove('show'));
    document.removeEventListener('click', this.handleOutsideClick);
  }

  handleOutsideClick = () => {
    this.closeAllMenus();
  }

  async fetchPods() {
    try {
      const data = await Api.get('/kubernetes/pods');
      const pods = data.pods.map(pod => ({
        name: pod.name,
        type: 'Pod',
        namespace: pod.namespace,
        status: pod.status,
        replicas: pod.ready,
        age: pod.age
      }));
      return pods;
    } catch (error) {
      console.error('Failed to fetch pods:', error);
      return [];
    }
  }

  async fetchDeployments() {
    try {
      const data = await Api.get('/kubernetes/deployments');
      const deployments = data.deployments.map(dep => ({
        name: dep.name,
        type: 'Deployment',
        namespace: dep.namespace,
        status: dep.available > 0 ? 'Running' : 'Pending',
        replicas: `${dep.available}/${dep.replicas}`,
        age: dep.age
      }));
      return deployments;
    } catch (error) {
      console.error('Failed to fetch deployments:', error);
      return [];
    }
  }

  async fetchStatefulSets() {
    try {
      const data = await Api.get('/kubernetes/statefulsets');
      const statefulsets = data.statefulsets.map(set => ({
        name: set.name,
        type: 'StatefulSet',
        namespace: set.namespace,
        status: set.ready_replicas > 0 ? 'Running' : 'Pending',
        replicas: `${set.ready_replicas}/${set.replicas}`,
        age: set.age
      }));
      return statefulsets;
    } catch (error) {
      console.error('Failed to fetch stateful sets:', error);
      return [];
    }
  }

  async fetchDaemonSets() {
    try {
      const data = await Api.get('/kubernetes/daemonsets');
      const daemonsets = data.daemonsets.map(ds => ({
        name: ds.name,
        type: 'DaemonSet',
        namespace: ds.namespace,
        status: ds.ready > 0 ? 'Running' : 'Pending',
        replicas: `${ds.ready}/${ds.desired}`,
        age: ds.age
      }));
      return daemonsets;
    } catch (error) {
      console.error('Failed to fetch daemon sets:', error);
      return [];
    }
  }

  async fetchJobs() {
    try {
      const data = await Api.get('/kubernetes/jobs');
      const jobs = data.jobs.map(job => ({
        name: job.name,
        type: 'Job',
        namespace: job.namespace,
        replicas: job.completions,
        age: job.age
      }));
      return jobs;
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
      return [];
    }
  }

  async fetchCronJobs() {
    try {
      const data = await Api.get('/kubernetes/cronjobs');
      const cronjobs = data.cronjobs.map(cj => ({
        name: cj.name,
        type: 'CronJob',
        namespace: cj.namespace,
        status: cj.suspended ? 'Suspended' : 'Active',
        replicas: cj.schedule,
        age: cj.age
      }));
      return cronjobs;
    } catch (error) {
      console.error('Failed to fetch cron jobs:', error);
      return [];
    }
  }

  async fetchServices() {
    try {
      const data = await Api.get('/kubernetes/services');
      this.networks = data.services.map(svc => ({
        name: svc.name,
        type: svc.type,
        namespace: svc.namespace,
        status: 'Active',
        endpoints: svc.cluster_ip,
        age: svc.age
      }));
      this.error = null;
    } catch (error) {
      this.error = 'Failed to fetch services';
    }
  }

  async fetchConfigMaps() {
    try {
      const data = await Api.get('/kubernetes/configmaps');
      this.configurations = data.configmaps.map(map => ({
        name: map.name,
        type: 'ConfigMap',
        namespace: map.namespace,
        status: 'Active',
        keys: map.data,
        age: map.age
      }));
      this.error = null;
    } catch (error) {
      this.error = 'Failed to fetch config maps';
    }
  }

  async fetchSecrets() {
    try {
      const data = await Api.get('/kubernetes/secrets');
      this.configurations = this.configurations.concat(data.secrets.map(sec => ({
        name: sec.name,
        type: 'Secret',
        namespace: sec.namespace,
        status: 'Active',
        keys: sec.data,
        age: sec.age
      })));
      this.error = null;
    } catch (error) {
      this.error = 'Failed to fetch secrets';
    }
  }

  async fetchHelmReleases() {
    try {
      const data = await Api.get('/kubernetes/helm/releases');
      this.helms = data.releases.map(release => ({
        name: release.name,
        type: 'Release',
        namespace: release.namespace,
        revision: release.version,
        status: release.status,
        chart: `${release.chart} (${release.chart_version})`,
        updated: release.updated
      }));
      this.error = null;
    } catch (error) {
      this.error = 'Failed to fetch helm releases';
    }
  }

  async fetchHelmCharts() {
    try {
      const data = await Api.get('/kubernetes/helm/charts');
      this.helms = this.helms.concat(data.charts.map(chart => ({
        name: chart.name,
        type: 'Chart',
        namespace: '-',
        revision: '-',
        status: 'Available',
        chart: chart.name,
        updated: '-'  // No updated information available for charts
      })));
      this.error = null;
    } catch (error) {
      this.error = 'Failed to fetch helm charts';
    }
  }

  async fetchNamespaces() {
    try {
      const data = await Api.get('/kubernetes/namespaces');
      this.namespaces = data.namespaces.map(ns => ns.name);
      this.error = null;
    } catch (error) {
      console.error('Failed to fetch namespaces:', error);
      // Set some default namespaces if API fails
      this.namespaces = ['default', 'kube-system', 'kube-public'];
    }
  }

  private handleNamespaceChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.selectedNamespace = target.value;
    this.requestUpdate();
  }

  private toggleNamespaceDropdown(event?: Event) {
    console.log('toggleNamespaceDropdown called, current state:', this.showNamespaceDropdown);
    if (event) {
      event.stopPropagation();
    }
    this.showNamespaceDropdown = !this.showNamespaceDropdown;
    console.log('new state:', this.showNamespaceDropdown);
    if (this.showNamespaceDropdown) {
      this.namespaceSearchQuery = '';
      // Focus on search input after dropdown opens
      setTimeout(() => {
        const searchInput = this.shadowRoot?.querySelector('.namespace-search-input') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }, 0);
    }
    this.requestUpdate();
  }

  private handleNamespaceSearch(event: Event) {
    const target = event.target as HTMLInputElement;
    this.namespaceSearchQuery = target.value.toLowerCase();
    this.requestUpdate();
  }

  private selectNamespace(namespace: string) {
    this.selectedNamespace = namespace;
    this.showNamespaceDropdown = false;
    this.namespaceSearchQuery = '';
    this.requestUpdate();
  }

  private getFilteredNamespaces(): string[] {
    const allNamespaces = ['all', ...this.namespaces];
    if (!this.namespaceSearchQuery.trim()) {
      return allNamespaces;
    }
    return allNamespaces.filter(namespace => 
      namespace.toLowerCase().includes(this.namespaceSearchQuery)
    );
  }

  private getSelectedNamespaceDisplayName(): string {
    return this.selectedNamespace === 'all' ? 'All Namespaces' : this.selectedNamespace;
  }

  private handleNamespaceDropdownOutsideClick = (event: Event) => {
    const dropdown = this.shadowRoot?.querySelector('.namespace-dropdown');
    if (dropdown && !dropdown.contains(event.target as Node)) {
      console.log('Outside click detected, closing dropdown');
      this.showNamespaceDropdown = false;
      this.requestUpdate();
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this.initializeMockData();
    this.updateActiveSubmenu();
    
    // Fetch namespaces and all Kubernetes resources
    this.fetchNamespaces();
    this.fetchAllResources();
    
    window.addEventListener('popstate', this.handleRouteChange);
    window.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('click', this.handleNamespaceDropdownOutsideClick);
  }

  async fetchAllResources() {
    try {
      // Clear existing arrays before fetching
      this.workloads = [];
      this.networks = [];
      this.configurations = [];
      this.helms = [];
      
      // Fetch all workload resources and combine them
      const [pods, deployments, statefulsets, daemonsets, jobs, cronjobs] = await Promise.all([
        this.fetchPods(),
        this.fetchDeployments(),
        this.fetchStatefulSets(),
        this.fetchDaemonSets(),
        this.fetchJobs(),
        this.fetchCronJobs()
      ]);
      
      // Combine all workload data
      this.workloads = [...pods, ...deployments, ...statefulsets, ...daemonsets, ...jobs, ...cronjobs];
      
      // Fetch network resources (services)
      await this.fetchServices();
      
      // Fetch configuration resources
      await Promise.all([
        this.fetchConfigMaps(),
        this.fetchSecrets()
      ]);
      
      // Fetch Helm resources
      await Promise.all([
        this.fetchHelmReleases(),
        this.fetchHelmCharts()
      ]);
      
      this.error = null;
    } catch (error) {
      console.error('Failed to fetch Kubernetes resources:', error);
      this.error = 'Failed to fetch some Kubernetes resources';
    }
  }

  viewDetails(item) {
    console.log('viewDetails called with item:', item);
    
    if (item.type !== 'Pod') {
      console.log('Item is not a Pod, type:', item.type);
      // For non-pod items, show a generic alert for now
      alert(`Viewing details for ${item.name} (${item.type}) - Pod details drawer only supports Pods currently`);
      return;
    }
    
    console.log('Fetching pod details for:', item.name, 'in namespace:', item.namespace);
    this.loadingPodDetails = true;
    this.showPodDetails = true;
    this.selectedPod = null;
    this.requestUpdate();
    
    const url = `/kubernetes/pods/${item.namespace}/${item.name}`;
    console.log('Making API request to:', url);
    
    Api.get(url)
      .then(response => {
        console.log('Pod details response:', response);
        console.log('Response keys:', Object.keys(response));
        console.log('Response metadata:', response.metadata);
        console.log('Response spec:', response.spec);
        console.log('Response status:', response.status);
        this.selectedPod = response;
        console.log('selectedPod set to:', this.selectedPod);
        this.loadingPodDetails = false;
        this.requestUpdate();
      })
      .catch(error => {
        console.error('Failed to fetch pod details:', error);
        this.loadingPodDetails = false;
        this.showPodDetails = false; // Hide drawer on error
        this.requestUpdate();
        alert(`Failed to fetch pod details: ${error.message || error}`);
      });
  }

  editItem(item) {
    // Implement edit logic here
    console.log('Editing item:', item);
    alert(`Editing ${item.name || item.id}`);
  }

  deleteItem(item) {
    // Implement delete logic here
    console.log('Deleting item:', item);
    if (confirm(`Are you sure you want to delete ${item.name || item.id}?`)) {
      // Now activeSubmenu directly matches property names (all plural)
      const currentData = this[this.activeSubmenu];
      if (currentData) {
        const index = currentData.indexOf(item);
        if (index > -1) {
          currentData.splice(index, 1);
          this.requestUpdate();
        }
      }
    }
  }

  // Workload-specific actions
  scalePods(item) {
    console.log('Scaling pods for:', item);
    const replicas = prompt(`Enter new replica count for ${item.name}:`, '3');
    if (replicas && !isNaN(replicas)) {
      alert(`Scaling ${item.name} to ${replicas} replicas`);
      // In a real app, you would make an API call here
    }
  }

  viewLogs(item) {
    console.log('Viewing logs for:', item);
    alert(`Opening logs for ${item.name}`);
    // In a real app, you would open a logs viewer or modal
  }

  // Network-specific actions
  viewEndpoints(item) {
    console.log('Viewing endpoints for:', item);
    alert(`Endpoints for ${item.name}: ${item.endpoints}`);
    // In a real app, you would show detailed endpoint information
  }

  // Storage-specific actions
  expandVolume(item) {
    console.log('Expanding volume:', item);
    const newSize = prompt(`Enter new size for ${item.name} (current: ${item.capacity}):`);
    if (newSize) {
      alert(`Expanding ${item.name} to ${newSize}`);
      // In a real app, you would make an API call to expand the volume
    }
  }

  // Configuration-specific actions
  viewKeys(item) {
    console.log('Viewing keys for:', item);
    alert(`${item.name} has ${item.keys} keys`);
    // In a real app, you would show the actual keys (for ConfigMaps) or key names (for Secrets)
  }

  // Helm-specific actions
  upgradeRelease(item) {
    console.log('Upgrading release:', item);
    const newChart = prompt(`Enter new chart version for ${item.name}:`, item.chart);
    if (newChart) {
      alert(`Upgrading ${item.name} to ${newChart}`);
      // In a real app, you would make an API call to upgrade the Helm release
    }
  }

  rollbackRelease(item) {
    console.log('Rolling back release:', item);
    const targetRevision = prompt(`Enter revision to rollback to for ${item.name}:`, (parseInt(item.revision) - 1).toString());
    if (targetRevision && !isNaN(targetRevision)) {
      alert(`Rolling back ${item.name} to revision ${targetRevision}`);
      // In a real app, you would make an API call to rollback the Helm release
    }
  }

  uninstallRelease(item) {
    console.log('Uninstalling release:', item);
    if (confirm(`Are you sure you want to uninstall ${item.name}? This action cannot be undone.`)) {
      alert(`Uninstalling ${item.name}`);
      // Now activeSubmenu directly matches property names (all plural)
      const currentData = this[this.activeSubmenu];
      if (currentData) {
        const index = currentData.indexOf(item);
        if (index > -1) {
          currentData.splice(index, 1);
          this.requestUpdate();
        }
      }
      // In a real app, you would make an API call to uninstall the Helm release
    }
  }
}

customElements.define('kubernetes-tab', KubernetesTab);
