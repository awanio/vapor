var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { KubernetesApi } from '../../services/kubernetes-api.js';
import '../../components/ui/search-input.js';
import '../../components/ui/empty-state.js';
import '../../components/ui/loading-state.js';
import '../../components/tabs/tab-group.js';
import '../../components/tables/resource-table.js';
import '../../components/drawers/detail-drawer.js';
import '../../components/modals/delete-modal.js';
let KubernetesHelm = class KubernetesHelm extends LitElement {
    constructor() {
        super(...arguments);
        this.releases = [];
        this.namespaces = [];
        this.selectedNamespace = 'all';
        this.searchQuery = '';
        this.loading = false;
        this.error = null;
        this.activeTab = 'releases';
        this.showDetails = false;
        this.selectedItem = null;
        this.loadingDetails = false;
        this.detailsData = null;
        this.showDeleteModal = false;
        this.itemToDelete = null;
        this.isDeleting = false;
        this.tabs = [
            { id: 'releases', label: 'Helm Releases' },
            { id: 'repositories', label: 'Repositories' }
        ];
    }
    getColumns() {
        if (this.activeTab === 'releases') {
            return [
                { key: 'name', label: 'Name', type: 'link' },
                { key: 'namespace', label: 'Namespace' },
                { key: 'revision', label: 'Revision', type: 'custom' },
                { key: 'updated', label: 'Updated' },
                { key: 'status', label: 'Status', type: 'custom' },
                { key: 'chart', label: 'Chart', type: 'custom' },
                { key: 'appVersion', label: 'App Version' }
            ];
        }
        else {
            return [
                { key: 'name', label: 'Repository Name' },
                { key: 'url', label: 'URL' },
                { key: 'type', label: 'Type' }
            ];
        }
    }
    getActions(_item) {
        return [
            { label: 'View Details', action: 'view' },
            { label: 'View Values', action: 'values' },
            { label: 'Upgrade', action: 'upgrade' },
            { label: 'Rollback', action: 'rollback' },
            { label: 'Uninstall', action: 'delete', danger: true }
        ];
    }
    getFilteredData() {
        let data = this.releases;
        if (this.selectedNamespace !== 'all') {
            data = data.filter(item => item.namespace === this.selectedNamespace);
        }
        if (this.searchQuery) {
            data = data.filter(item => JSON.stringify(item).toLowerCase().includes(this.searchQuery.toLowerCase()));
        }
        return data;
    }
    async handleTabChange(event) {
        this.activeTab = event.detail.tabId;
        await this.fetchData();
    }
    handleSearchChange(event) {
        this.searchQuery = event.detail.value;
    }
    async handleNamespaceChange(event) {
        const select = event.target;
        this.selectedNamespace = select.value;
        await this.fetchData();
    }
    handleCellClick(event) {
        const { column, item } = event.detail;
        if (column.type === 'link') {
            this.viewDetails(item);
        }
    }
    getStatusClass(status) {
        const statusLower = status.toLowerCase();
        if (statusLower === 'deployed')
            return 'status-deployed';
        if (statusLower === 'failed')
            return 'status-failed';
        if (statusLower === 'pending' || statusLower === 'pending-install' || statusLower === 'pending-upgrade')
            return 'status-pending';
        if (statusLower === 'superseded')
            return 'status-superseded';
        return '';
    }
    handleAction(event) {
        const { action, item } = event.detail;
        switch (action) {
            case 'view':
                this.viewDetails(item);
                break;
            case 'values':
                this.viewValues(item);
                break;
            case 'upgrade':
                this.upgradeRelease(item);
                break;
            case 'rollback':
                this.rollbackRelease(item);
                break;
            case 'delete':
                this.deleteRelease(item);
                break;
        }
    }
    async viewDetails(item) {
        this.selectedItem = item;
        this.showDetails = true;
        this.loadingDetails = true;
        try {
            this.detailsData = await KubernetesApi.getResourceDetails('Release', item.name, item.namespace);
        }
        catch (error) {
            console.error('Failed to fetch release details:', error);
            this.detailsData = null;
        }
        finally {
            this.loadingDetails = false;
        }
    }
    viewValues(item) {
        console.log('View values:', item);
    }
    upgradeRelease(item) {
        console.log('Upgrade release:', item);
    }
    rollbackRelease(item) {
        console.log('Rollback release:', item);
    }
    deleteRelease(item) {
        this.itemToDelete = {
            type: 'Helm Release',
            name: item.name,
            namespace: item.namespace
        };
        this.showDeleteModal = true;
    }
    async handleConfirmDelete() {
        if (!this.itemToDelete)
            return;
        this.isDeleting = true;
        try {
            await KubernetesApi.deleteResource('Release', this.itemToDelete.name, this.itemToDelete.namespace);
            await this.fetchData();
            this.showDeleteModal = false;
            this.itemToDelete = null;
        }
        catch (error) {
            console.error('Failed to uninstall release:', error);
        }
        finally {
            this.isDeleting = false;
        }
    }
    handleCancelDelete() {
        this.showDeleteModal = false;
        this.itemToDelete = null;
    }
    handleInstall() {
        console.log('Install new chart');
    }
    handleDetailsClose() {
        this.showDetails = false;
        this.selectedItem = null;
        this.detailsData = null;
    }
    async fetchData() {
        this.loading = true;
        this.error = null;
        try {
            if (this.namespaces.length === 0) {
                this.namespaces = await KubernetesApi.getNamespaces();
            }
            if (this.activeTab === 'releases') {
                const namespace = this.selectedNamespace === 'all' ? undefined : this.selectedNamespace;
                const releases = await KubernetesApi.getHelmReleases(namespace);
                this.releases = releases;
            }
            else {
                this.releases = [];
            }
        }
        catch (error) {
            console.error('Failed to fetch Helm resources:', error);
            this.error = error.message || 'Failed to fetch Helm resources';
        }
        finally {
            this.loading = false;
        }
    }
    renderDetailContent() {
        if (!this.detailsData && !this.selectedItem)
            return html ``;
        const release = this.selectedItem;
        if (!release)
            return html ``;
        return html `
      <div class="detail-content">
        <div class="detail-section">
          <h3>Release Information</h3>
          <div class="detail-item">
            <span class="detail-key">Name:</span> ${release.name}
          </div>
          <div class="detail-item">
            <span class="detail-key">Namespace:</span> ${release.namespace}
          </div>
          <div class="detail-item">
            <span class="detail-key">Status:</span> 
            <span class="${this.getStatusClass(release.status)}">${release.status}</span>
          </div>
          <div class="detail-item">
            <span class="detail-key">Revision:</span> 
            <span class="revision-badge">${release.revision}</span>
          </div>
          <div class="detail-item">
            <span class="detail-key">Last Updated:</span> ${release.updated}
          </div>
        </div>

        <div class="detail-section">
          <h3>Chart Information</h3>
          <div class="detail-item">
            <span class="detail-key">Chart:</span> 
            <span class="chart-badge">${release.chart}</span>
          </div>
          <div class="detail-item">
            <span class="detail-key">App Version:</span> ${release.appVersion || 'N/A'}
          </div>
        </div>

        ${this.detailsData ? html `
          ${this.detailsData.metadata?.notes ? html `
            <div class="detail-section">
              <h3>Release Notes</h3>
              <div class="notes-content">
                ${this.detailsData.metadata.notes}
              </div>
            </div>
          ` : ''}

          ${this.detailsData.spec?.values ? html `
            <div class="detail-section">
              <h3>Values</h3>
              <div class="values-content">
                ${JSON.stringify(this.detailsData.spec.values, null, 2)}
              </div>
            </div>
          ` : ''}
        ` : ''}
      </div>
    `;
    }
    connectedCallback() {
        super.connectedCallback();
        this.fetchData();
    }
    render() {
        return html `
      <div class="container">
        <tab-group
          .tabs="${this.tabs}"
          .activeTab="${this.activeTab}"
          @tab-change="${this.handleTabChange}"
        ></tab-group>

        <div class="header">
          <search-input
            .value="${this.searchQuery}"
            placeholder="Search Helm releases..."
            @search-change="${this.handleSearchChange}"
          ></search-input>
          
          <div class="controls">
            <div class="namespace-selector">
              <label for="namespace-select">Namespace:</label>
              <select id="namespace-select" @change="${this.handleNamespaceChange}" .value="${this.selectedNamespace}">
                <option value="all">All namespaces</option>
                ${this.namespaces.map(ns => html `
                  <option value="${ns.name}">${ns.name}</option>
                `)}
              </select>
            </div>
            
            <button class="btn-install" @click="${this.handleInstall}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Install Chart
            </button>
          </div>
        </div>

        <div class="content">
          ${this.loading ? html `
            <loading-state message="Loading Helm releases..."></loading-state>
          ` : this.error ? html `
            <empty-state 
              message="${this.error}" 
              icon="⚠️"
            ></empty-state>
          ` : html `
            <resource-table
              .columns="${this.getColumns()}"
              .data="${this.getFilteredData()}"
              .getActions="${(item) => this.getActions(item)}"
              .customRenderers="${{
            status: (value) => html `
                    <span class="${this.getStatusClass(value)}">${value}</span>
                  `,
            chart: (value) => html `
                    <span class="chart-badge">${value}</span>
                  `,
            revision: (value) => html `
                    <span class="revision-badge">${value}</span>
                  `
        }}"
              emptyMessage="No ${this.activeTab} found"
              @cell-click="${this.handleCellClick}"
              @action="${this.handleAction}"
            ></resource-table>
          `}
        </div>

        <detail-drawer
          .show="${this.showDetails}"
          .loading="${this.loadingDetails}"
          title="${this.selectedItem?.name || ''} Details"
          @close="${this.handleDetailsClose}"
        >
          ${this.renderDetailContent()}
        </detail-drawer>

        <delete-modal
          .show="${this.showDeleteModal}"
          .item="${this.itemToDelete}"
          .loading="${this.isDeleting}"
          @confirm-delete="${this.handleConfirmDelete}"
          @cancel-delete="${this.handleCancelDelete}"
        ></delete-modal>
      </div>
    `;
    }
};
KubernetesHelm.styles = css `
    :host {
      display: block;
      height: 100%;
    }

    .container {
      display: flex;
      flex-direction: column;
      height: 100%;
      gap: 1rem;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .content {
      flex: 1;
      overflow-y: auto;
    }

    .btn-install {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      background: var(--vscode-button-background, #007acc);
      color: var(--vscode-button-foreground, white);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s;
    }

    .btn-install:hover {
      background: var(--vscode-button-hoverBackground, #005a9e);
    }

    .controls {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .namespace-selector {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .namespace-selector label {
      font-size: 13px;
      color: var(--vscode-foreground, #cccccc);
    }

    .namespace-selector select {
      padding: 6px 10px;
      background: var(--vscode-dropdown-background, #3c3c3c);
      color: var(--vscode-dropdown-foreground, #cccccc);
      border: 1px solid var(--vscode-dropdown-border, #3c3c3c);
      border-radius: 4px;
      font-size: 13px;
      cursor: pointer;
    }

    .namespace-selector select:hover {
      background: var(--vscode-dropdown-hoverBackground, #2a2a2a);
    }

    .detail-content {
      padding: 1rem;
    }

    .detail-section {
      margin-bottom: 1.5rem;
    }

    .detail-section h3 {
      margin: 0 0 0.5rem 0;
      font-size: 14px;
      font-weight: 600;
      color: var(--vscode-foreground, #cccccc);
    }

    .detail-item {
      margin-bottom: 0.5rem;
      font-size: 13px;
    }

    .detail-key {
      font-weight: 500;
      color: var(--vscode-textLink-foreground, #3794ff);
    }

    .detail-value {
      color: var(--vscode-foreground, #cccccc);
      font-family: var(--vscode-editor-font-family, monospace);
      white-space: pre-wrap;
      word-break: break-all;
    }

    .status-deployed {
      color: var(--vscode-testing-iconPassed, #73c991);
    }

    .status-failed {
      color: var(--vscode-testing-iconFailed, #f14c4c);
    }

    .status-pending {
      color: var(--vscode-testing-iconQueued, #cca700);
    }

    .status-superseded {
      color: var(--vscode-descriptionForeground, #cccccc80);
    }

    .chart-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      background: var(--vscode-badge-background, #007acc);
      color: var(--vscode-badge-foreground, white);
    }

    .revision-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      background: var(--vscode-textPreformat-background, #ffffff1a);
      color: var(--vscode-textPreformat-foreground, #d7ba7d);
    }

    .values-content {
      background: var(--vscode-editor-background, #1e1e1e);
      border: 1px solid var(--vscode-widget-border, #303031);
      border-radius: 4px;
      padding: 1rem;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 12px;
      white-space: pre-wrap;
      overflow-x: auto;
      max-height: 400px;
      overflow-y: auto;
    }

    .notes-content {
      background: var(--vscode-textBlockQuote-background, #7f7f7f1a);
      border-left: 4px solid var(--vscode-textBlockQuote-border, #007acc);
      padding: 0.5rem 1rem;
      margin: 0.5rem 0;
      font-size: 13px;
      white-space: pre-wrap;
    }
  `;
__decorate([
    property({ type: Array })
], KubernetesHelm.prototype, "releases", void 0);
__decorate([
    property({ type: Array })
], KubernetesHelm.prototype, "namespaces", void 0);
__decorate([
    property({ type: String })
], KubernetesHelm.prototype, "selectedNamespace", void 0);
__decorate([
    property({ type: String })
], KubernetesHelm.prototype, "searchQuery", void 0);
__decorate([
    property({ type: Boolean })
], KubernetesHelm.prototype, "loading", void 0);
__decorate([
    property({ type: String })
], KubernetesHelm.prototype, "error", void 0);
__decorate([
    state()
], KubernetesHelm.prototype, "activeTab", void 0);
__decorate([
    state()
], KubernetesHelm.prototype, "showDetails", void 0);
__decorate([
    state()
], KubernetesHelm.prototype, "selectedItem", void 0);
__decorate([
    state()
], KubernetesHelm.prototype, "loadingDetails", void 0);
__decorate([
    state()
], KubernetesHelm.prototype, "detailsData", void 0);
__decorate([
    state()
], KubernetesHelm.prototype, "showDeleteModal", void 0);
__decorate([
    state()
], KubernetesHelm.prototype, "itemToDelete", void 0);
__decorate([
    state()
], KubernetesHelm.prototype, "isDeleting", void 0);
KubernetesHelm = __decorate([
    customElement('kubernetes-helm')
], KubernetesHelm);
export { KubernetesHelm };
//# sourceMappingURL=kubernetes-helm.js.map