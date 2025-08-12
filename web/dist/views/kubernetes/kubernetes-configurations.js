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
import '../../components/ui/namespace-dropdown.js';
import '../../components/tabs/tab-group.js';
import '../../components/tables/resource-table.js';
import '../../components/drawers/detail-drawer.js';
import '../../components/modals/delete-modal.js';
import '../../components/kubernetes/resource-detail-view.js';
let KubernetesConfigurations = class KubernetesConfigurations extends LitElement {
    constructor() {
        super(...arguments);
        this.resources = [];
        this.namespaces = [];
        this.selectedNamespace = 'All Namespaces';
        this.searchQuery = '';
        this.loading = false;
        this.error = null;
        this.activeTab = 'configmaps';
        this.showDetails = false;
        this.selectedItem = null;
        this.loadingDetails = false;
        this.detailsData = null;
        this.showDeleteModal = false;
        this.itemToDelete = null;
        this.isDeleting = false;
        this.tabs = [
            { id: 'configmaps', label: 'ConfigMaps' },
            { id: 'secrets', label: 'Secrets' }
        ];
    }
    getColumns() {
        if (this.activeTab === 'configmaps') {
            return [
                { key: 'name', label: 'Name', type: 'link' },
                { key: 'namespace', label: 'Namespace' },
                { key: 'data', label: 'Data Items' },
                { key: 'age', label: 'Age' }
            ];
        }
        else {
            return [
                { key: 'name', label: 'Name', type: 'link' },
                { key: 'namespace', label: 'Namespace' },
                { key: 'type', label: 'Type', type: 'custom' },
                { key: 'data', label: 'Data Items' },
                { key: 'age', label: 'Age' }
            ];
        }
    }
    getActions(_item) {
        return [
            { label: 'View Details', action: 'view' },
            { label: 'Edit', action: 'edit' },
            { label: 'Delete', action: 'delete', danger: true }
        ];
    }
    getFilteredData() {
        let data = this.resources;
        if (this.searchQuery) {
            data = data.filter(item => JSON.stringify(item).toLowerCase().includes(this.searchQuery.toLowerCase()));
        }
        return data;
    }
    getResourceType() {
        return this.activeTab === 'configmaps' ? 'ConfigMap' : 'Secret';
    }
    async handleTabChange(event) {
        this.activeTab = event.detail.tabId;
        await this.fetchData();
    }
    handleSearchChange(event) {
        this.searchQuery = event.detail.value;
    }
    async handleNamespaceChange(event) {
        this.selectedNamespace = event.detail.namespace;
        await this.fetchData();
    }
    handleCellClick(event) {
        const { column, item } = event.detail;
        if (column.type === 'link') {
            this.viewDetails(item);
        }
    }
    getSecretTypeClass(type) {
        if (type.includes('tls'))
            return 'tls';
        if (type.includes('docker'))
            return 'dockercfg';
        if (type === 'Opaque')
            return 'opaque';
        return '';
    }
    getSecretTypeLabel(type) {
        const typeMap = {
            'Opaque': 'Opaque',
            'kubernetes.io/service-account-token': 'Service Account',
            'kubernetes.io/dockercfg': 'Docker Config',
            'kubernetes.io/dockerconfigjson': 'Docker Config JSON',
            'kubernetes.io/basic-auth': 'Basic Auth',
            'kubernetes.io/ssh-auth': 'SSH Auth',
            'kubernetes.io/tls': 'TLS'
        };
        return typeMap[type] || type;
    }
    handleAction(event) {
        const { action, item } = event.detail;
        switch (action) {
            case 'view':
                this.viewDetails(item);
                break;
            case 'edit':
                this.editItem(item);
                break;
            case 'delete':
                this.deleteItem(item);
                break;
        }
    }
    async viewDetails(item) {
        this.selectedItem = item;
        this.showDetails = true;
        this.loadingDetails = true;
        try {
            const resourceType = this.getResourceType();
            this.detailsData = await KubernetesApi.getResourceDetails(resourceType, item.name, item.namespace);
        }
        catch (error) {
            console.error('Failed to fetch details:', error);
            this.detailsData = null;
        }
        finally {
            this.loadingDetails = false;
        }
    }
    editItem(item) {
        console.log('Edit item:', item);
    }
    deleteItem(item) {
        const resourceType = this.getResourceType();
        this.itemToDelete = {
            type: resourceType,
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
            await KubernetesApi.deleteResource(this.itemToDelete.type, this.itemToDelete.name, this.itemToDelete.namespace);
            await this.fetchData();
            this.showDeleteModal = false;
            this.itemToDelete = null;
        }
        catch (error) {
            console.error('Failed to delete resource:', error);
        }
        finally {
            this.isDeleting = false;
        }
    }
    handleCancelDelete() {
        this.showDeleteModal = false;
        this.itemToDelete = null;
    }
    handleCreate() {
        console.log('Create new resource');
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
            const namespace = this.selectedNamespace === 'All Namespaces' ? undefined : this.selectedNamespace;
            if (this.activeTab === 'configmaps') {
                const configMaps = await KubernetesApi.getConfigMaps(namespace);
                this.resources = configMaps;
            }
            else {
                const secrets = await KubernetesApi.getSecrets(namespace);
                this.resources = secrets;
            }
        }
        catch (error) {
            console.error('Failed to fetch configuration resources:', error);
            this.error = error.message || 'Failed to fetch configuration resources';
        }
        finally {
            this.loading = false;
        }
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
          <namespace-dropdown
            .namespaces="${this.namespaces.map(ns => ({ name: ns.name }))}"
            .selectedNamespace="${this.selectedNamespace}"
            @namespace-change="${this.handleNamespaceChange}"
            .loading="${this.loading}"
            .includeAllOption="${true}"
          ></namespace-dropdown>
          
          <search-input
            .value="${this.searchQuery}"
            placeholder="Search configurations..."
            @search-change="${this.handleSearchChange}"
          ></search-input>
          
          <div class="controls">
            <button class="btn-create" @click="${this.handleCreate}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Create
            </button>
          </div>
        </div>

        <div class="content">
          ${this.loading ? html `
            <loading-state message="Loading configurations..."></loading-state>
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
              .customRenderers="${this.activeTab === 'secrets' ? {
            type: (value) => html `
                  <span class="type-badge ${this.getSecretTypeClass(value)}">
                    ${this.getSecretTypeLabel(value)}
                  </span>
                `
        } : {}}"
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
          ${this.detailsData ? html `
            <resource-detail-view .resource="${this.detailsData}"></resource-detail-view>
          ` : ''}
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
KubernetesConfigurations.styles = css `
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
      gap: 1rem;
    }

    search-input {
      flex: 1;
    }

    .content {
      flex: 1;
      overflow-y: auto;
    }

    .btn-create {
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

    .btn-create:hover {
      background: var(--vscode-button-hoverBackground, #005a9e);
    }

    .controls {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    namespace-dropdown {
      --dropdown-bg: var(--vscode-dropdown-background, #3c3c3c);
      --dropdown-color: var(--vscode-dropdown-foreground, #cccccc);
      --dropdown-border: var(--vscode-dropdown-border, #3c3c3c);
      --dropdown-hover-bg: var(--vscode-dropdown-hoverBackground, #2a2a2a);
      --menu-bg: var(--vscode-dropdown-background, #3c3c3c);
      --menu-border: var(--vscode-dropdown-border, #3c3c3c);
      --input-bg: var(--vscode-input-background, #3c3c3c);
      --input-color: var(--vscode-input-foreground, #cccccc);
      --input-border: var(--vscode-input-border, #3c3c3c);
      --option-hover-bg: var(--vscode-list-hoverBackground, #2a2a2a);
      --option-selected-bg: var(--vscode-list-activeSelectionBackground, #094771);
    }

    .type-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      background: var(--vscode-badge-background, #007acc);
      color: var(--vscode-badge-foreground, white);
    }

    .type-badge.opaque {
      background: var(--vscode-testing-iconQueued, #cca700);
    }

    .type-badge.tls {
      background: var(--vscode-testing-iconPassed, #73c991);
      color: var(--vscode-editor-background, #1e1e1e);
    }

    .type-badge.dockercfg {
      background: var(--vscode-terminalCommandDecoration-defaultBackground, #40679e);
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

    .secret-value {
      color: var(--vscode-textPreformat-foreground, #d7ba7d);
      font-style: italic;
    }

    .data-grid {
      display: grid;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }

    .data-item {
      padding: 0.5rem;
      background: var(--vscode-editor-background, #1e1e1e);
      border: 1px solid var(--vscode-widget-border, #303031);
      border-radius: 4px;
    }
  `;
__decorate([
    property({ type: Array })
], KubernetesConfigurations.prototype, "resources", void 0);
__decorate([
    property({ type: Array })
], KubernetesConfigurations.prototype, "namespaces", void 0);
__decorate([
    property({ type: String })
], KubernetesConfigurations.prototype, "selectedNamespace", void 0);
__decorate([
    property({ type: String })
], KubernetesConfigurations.prototype, "searchQuery", void 0);
__decorate([
    property({ type: Boolean })
], KubernetesConfigurations.prototype, "loading", void 0);
__decorate([
    property({ type: String })
], KubernetesConfigurations.prototype, "error", void 0);
__decorate([
    state()
], KubernetesConfigurations.prototype, "activeTab", void 0);
__decorate([
    state()
], KubernetesConfigurations.prototype, "showDetails", void 0);
__decorate([
    state()
], KubernetesConfigurations.prototype, "selectedItem", void 0);
__decorate([
    state()
], KubernetesConfigurations.prototype, "loadingDetails", void 0);
__decorate([
    state()
], KubernetesConfigurations.prototype, "detailsData", void 0);
__decorate([
    state()
], KubernetesConfigurations.prototype, "showDeleteModal", void 0);
__decorate([
    state()
], KubernetesConfigurations.prototype, "itemToDelete", void 0);
__decorate([
    state()
], KubernetesConfigurations.prototype, "isDeleting", void 0);
KubernetesConfigurations = __decorate([
    customElement('kubernetes-configurations')
], KubernetesConfigurations);
export { KubernetesConfigurations };
//# sourceMappingURL=kubernetes-configurations.js.map