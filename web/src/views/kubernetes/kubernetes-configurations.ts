import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { KubernetesApi } from '../../services/kubernetes-api.js';
import type {
  KubernetesNamespace,
  KubernetesConfigMap,
  KubernetesSecret,
  KubernetesResourceDetails
} from '../../services/kubernetes-api.js';
import '../../components/ui/search-input.js';
import '../../components/ui/empty-state.js';
import '../../components/ui/loading-state.js';
import '../../components/ui/namespace-dropdown.js';
import '../../components/tabs/tab-group.js';
import '../../components/tables/resource-table.js';
import '../../components/drawers/detail-drawer.js';
import '../../components/modals/delete-modal.js';
import '../../components/kubernetes/resource-detail-view.js';
import '../../components/drawers/create-resource-drawer';
import '../../components/ui/notification-container';
import type { Tab } from '../../components/tabs/tab-group.js';
import type { Column } from '../../components/tables/resource-table.js';
import type { ActionItem } from '../../components/ui/action-dropdown.js';
import type { DeleteItem } from '../../components/modals/delete-modal.js';

type ConfigResource = KubernetesConfigMap | KubernetesSecret;

@customElement('kubernetes-configurations')
export class KubernetesConfigurations extends LitElement {
  @property({ type: Array }) resources: ConfigResource[] = [];
  @property({ type: Array }) namespaces: KubernetesNamespace[] = [];
  @property({ type: String }) selectedNamespace = 'All Namespaces';
  @property({ type: String }) searchQuery = '';
  @property({ type: Boolean }) loading = false;
  @property({ type: String }) error: string | null = null;

  @state() private activeTab = 'configmaps';
  @state() private showDetails = false;
  @state() private selectedItem: ConfigResource | null = null;
  @state() private loadingDetails = false;
  @state() private detailsData: KubernetesResourceDetails | null = null;
  @state() private showDeleteModal = false;
  @state() private itemToDelete: DeleteItem | null = null;
  @state() private isDeleting = false;

  // Create/Edit drawer state
  @state() private showCreateDrawer = false;
  @state() private createResourceValue = '';
  @state() private createDrawerTitle = 'Create Resource';
  @state() private isCreating = false;
  @state() private resourceFormat: 'yaml' | 'json' = 'yaml';
  @state() private isEditMode = false;
  @state() private editingResource: ConfigResource | null = null;

  static override styles = css`
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
      border: 1px solid var(--vscode-border);
      border-radius: 4px;
    }
  `;

  private tabs: Tab[] = [
    { id: 'configmaps', label: 'ConfigMaps' },
    { id: 'secrets', label: 'Secrets' }
  ];

  private getColumns(): Column[] {
    if (this.activeTab === 'configmaps') {
      return [
        { key: 'name', label: 'Name', type: 'link' },
        { key: 'namespace', label: 'Namespace' },
        { key: 'data', label: 'Data Items' },
        { key: 'age', label: 'Age' }
      ];
    } else {
      return [
        { key: 'name', label: 'Name', type: 'link' },
        { key: 'namespace', label: 'Namespace' },
        { key: 'type', label: 'Type', type: 'custom' },
        { key: 'data', label: 'Data Items' },
        { key: 'age', label: 'Age' }
      ];
    }
  }

  private getActions(_item: ConfigResource): ActionItem[] {
    return [
      { label: 'View Details', action: 'view' },
      { label: 'Edit', action: 'edit' },
      { label: 'Delete', action: 'delete', danger: true }
    ];
  }

  private getFilteredData(): ConfigResource[] {
    let data = this.resources;

    if (this.searchQuery) {
      data = data.filter(item =>
        JSON.stringify(item).toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    }

    return data;
  }

  private getResourceType(): string {
    return this.activeTab === 'configmaps' ? 'ConfigMap' : 'Secret';
  }

  private async handleTabChange(event: CustomEvent) {
    this.activeTab = event.detail.tabId;
    await this.fetchData();
  }

  private handleSearchChange(event: CustomEvent) {
    this.searchQuery = event.detail.value;
  }

  private async handleNamespaceChange(event: CustomEvent) {
    this.selectedNamespace = event.detail.namespace;
    await this.fetchData();
  }

  private handleCellClick(event: CustomEvent) {
    const { column, item } = event.detail;

    if (column.type === 'link') {
      this.viewDetails(item);
    }
  }

  private getSecretTypeClass(type: string): string {
    if (type.includes('tls')) return 'tls';
    if (type.includes('docker')) return 'dockercfg';
    if (type === 'Opaque') return 'opaque';
    return '';
  }

  private getSecretTypeLabel(type: string): string {
    const typeMap: Record<string, string> = {
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

  private handleAction(event: CustomEvent) {
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

  private async viewDetails(item: ConfigResource) {
    this.selectedItem = item;
    this.showDetails = true;
    this.loadingDetails = true;

    try {
      const resourceType = this.getResourceType();
      this.detailsData = await KubernetesApi.getResourceDetails(resourceType, item.name, item.namespace);
    } catch (error) {
      console.error('Failed to fetch details:', error);
      this.detailsData = null;
    } finally {
      this.loadingDetails = false;
    }
  }

  private async editItem(item: ConfigResource) {
    this.editingResource = item;
    this.isEditMode = true;
    this.createDrawerTitle = `Edit ${this.getResourceType()}`;
    // Always start with YAML format for editing
    this.resourceFormat = 'yaml';
    this.showCreateDrawer = true;
    this.isCreating = true;

    try {
      // Fetch the resource in YAML format by default
      const resourceType = this.getResourceType();
      const resourceContent = await KubernetesApi.getResourceRaw(
        resourceType,
        item.name,
        item.namespace,
        'yaml'  // Always fetch as YAML initially
      );

      this.createResourceValue = resourceContent;
      this.isCreating = false;
    } catch (error: any) {
      console.error('Failed to fetch resource for editing:', error);
      this.isCreating = false;
      this.showCreateDrawer = false;

      const nc = this.shadowRoot?.querySelector('notification-container') as any;
      if (nc && typeof nc.addNotification === 'function') {
        nc.addNotification({
          type: 'error',
          message: `Failed to fetch resource: ${error.message || 'Unknown error'}`
        });
      }
    }
  }

  private deleteItem(item: ConfigResource) {
    const resourceType = this.getResourceType();
    this.itemToDelete = {
      type: resourceType,
      name: item.name,
      namespace: item.namespace
    };
    this.showDeleteModal = true;
  }

  private async handleConfirmDelete() {
    if (!this.itemToDelete) return;

    this.isDeleting = true;

    try {
      await KubernetesApi.deleteResource(this.itemToDelete.type, this.itemToDelete.name, this.itemToDelete.namespace);

      // Refresh data
      await this.fetchData();

      // Close modal
      this.showDeleteModal = false;
      this.itemToDelete = null;
    } catch (error) {
      console.error('Failed to delete resource:', error);
    } finally {
      this.isDeleting = false;
    }
  }

  private handleCancelDelete() {
    this.showDeleteModal = false;
    this.itemToDelete = null;
  }

  private handleCreate() {
    this.isEditMode = false;
    this.editingResource = null;
    // Reset to YAML format for new resources
    this.resourceFormat = 'yaml';
    const ns = this.selectedNamespace === 'All Namespaces' ? 'default' : this.selectedNamespace;

    if (this.activeTab === 'configmaps') {
      this.createDrawerTitle = 'Create ConfigMap';
      this.createResourceValue = `apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: my-config\n  namespace: ${ns}\ndata:\n  config.yaml: |\n    server:\n      port: 8080\n      host: localhost\n    database:\n      host: db.example.com\n      port: 5432\n  app.properties: |\n    app.name=MyApp\n    app.version=1.0.0\n    debug=true`;
    } else {
      this.createDrawerTitle = 'Create Secret';
      this.createResourceValue = `apiVersion: v1\nkind: Secret\nmetadata:\n  name: my-secret\n  namespace: ${ns}\ntype: Opaque\ndata:\n  # Note: Values must be base64 encoded\n  # Example: echo -n 'admin' | base64\n  username: YWRtaW4=\n  password: cGFzc3dvcmQ=`;
    }
    this.showCreateDrawer = true;
  }

  private async handleCreateResource(event: CustomEvent) {
    const { resource, format } = event.detail as { resource: any; format: 'yaml' | 'json' };
    let content = '';
    try {
      if (format === 'json') {
        content = JSON.stringify(resource);
      } else {
        content = resource.yaml as string;
      }
      this.isCreating = true;

      if (this.isEditMode && this.editingResource) {
        // Update existing resource
        const resourceType = this.getResourceType();
        await KubernetesApi.updateResource(
          resourceType,
          this.editingResource.name,
          this.editingResource.namespace,
          content,
          format
        );
      } else {
        // Create new resource
        await KubernetesApi.createResource(content, format);
      }

      // Refresh data
      await this.fetchData();

      // Close drawer and reset
      this.showCreateDrawer = false;
      this.createResourceValue = '';
      this.isEditMode = false;
      this.editingResource = null;

      const nc = this.shadowRoot?.querySelector('notification-container') as any;
      if (nc && typeof nc.addNotification === 'function') {
        const resourceType = this.getResourceType();
        nc.addNotification({
          type: 'success',
          message: this.isEditMode ? `${resourceType} updated successfully` : `${resourceType} created successfully`
        });
      }
    } catch (err: any) {
      const nc = this.shadowRoot?.querySelector('notification-container') as any;
      if (nc && typeof nc.addNotification === 'function') {
        nc.addNotification({
          type: 'error',
          message: `Failed to ${this.isEditMode ? 'update' : 'create'} resource: ${err?.message || 'Unknown error'}`
        });
      }
    } finally {
      this.isCreating = false;
    }
  }

  private handleDetailsClose() {
    this.showDetails = false;
    this.selectedItem = null;
    this.detailsData = null;
  }

  async fetchData() {
    this.loading = true;
    this.error = null;

    try {
      // Fetch namespaces first if not already loaded
      if (this.namespaces.length === 0) {
        this.namespaces = await KubernetesApi.getNamespaces();
      }

      // Fetch resources based on active tab
      const namespace = this.selectedNamespace === 'All Namespaces' ? undefined : this.selectedNamespace;

      if (this.activeTab === 'configmaps') {
        const configMaps = await KubernetesApi.getConfigMaps(namespace);
        this.resources = configMaps;
      } else {
        const secrets = await KubernetesApi.getSecrets(namespace);
        this.resources = secrets;
      }
    } catch (error: any) {
      console.error('Failed to fetch configuration resources:', error);
      this.error = error.message || 'Failed to fetch configuration resources';
    } finally {
      this.loading = false;
    }
  }

  override connectedCallback() {
    super.connectedCallback();
    this.fetchData();
  }

  override render() {
    return html`
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
          ${this.loading ? html`
            <loading-state message="Loading configurations..."></loading-state>
          ` : this.error ? html`
            <empty-state 
              message="${this.error}" 
              icon="⚠️"
            ></empty-state>
          ` : html`
            <resource-table
              .columns="${this.getColumns()}"
              .data="${this.getFilteredData()}"
              .getActions="${(item: ConfigResource) => this.getActions(item)}"
              .customRenderers="${this.activeTab === 'secrets' ? {
          type: (value: string) => html`
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
          ${this.detailsData ? html`
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

        <create-resource-drawer
          .show="${this.showCreateDrawer}"
          ?show="${this.showCreateDrawer}"
          .title="${this.createDrawerTitle}"
          .value="${this.createResourceValue}"
          .submitLabel="${this.isEditMode ? 'Update' : 'Apply'}"
          .loading="${this.isCreating}"
          .format="${this.resourceFormat}"
          @close="${() => {
        this.showCreateDrawer = false;
        this.isEditMode = false;
        this.editingResource = null;
        this.resourceFormat = 'yaml';  // Reset format
      }}"
          @create="${this.handleCreateResource}"
        ></create-resource-drawer>

        <notification-container></notification-container>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'kubernetes-configurations': KubernetesConfigurations;
  }
}
