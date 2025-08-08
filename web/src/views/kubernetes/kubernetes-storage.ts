import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { KubernetesApi } from '../../services/kubernetes-api.js';
import type {
  KubernetesNamespace,
  KubernetesPersistentVolume,
  KubernetesPersistentVolumeClaim,
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
import type { Tab } from '../../components/tabs/tab-group.js';
import type { Column } from '../../components/tables/resource-table.js';
import type { ActionItem } from '../../components/ui/action-dropdown.js';
import type { DeleteItem } from '../../components/modals/delete-modal.js';

type StorageResource = KubernetesPersistentVolume | KubernetesPersistentVolumeClaim;

@customElement('kubernetes-storage')
export class KubernetesStorage extends LitElement {
  @property({ type: Array }) resources: StorageResource[] = [];
  @property({ type: Array }) namespaces: KubernetesNamespace[] = [];
  @property({ type: String }) selectedNamespace = 'All Namespaces';
  @property({ type: String }) searchQuery = '';
  @property({ type: Boolean }) loading = false;
  @property({ type: String }) error: string | null = null;
  
  @state() private activeTab = 'pvs';
  @state() private showDetails = false;
  @state() private selectedItem: StorageResource | null = null;
  @state() private loadingDetails = false;
  @state() private detailsData: KubernetesResourceDetails | null = null;
  @state() private showDeleteModal = false;
  @state() private itemToDelete: DeleteItem | null = null;
  @state() private isDeleting = false;

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

    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }

    .status-badge.bound {
      background: var(--vscode-testing-iconPassed, #73c991);
      color: var(--vscode-editor-background, #1e1e1e);
    }

    .status-badge.available {
      background: var(--vscode-testing-iconPassed, #73c991);
      color: var(--vscode-editor-background, #1e1e1e);
    }

    .status-badge.released {
      background: var(--vscode-testing-iconQueued, #cca700);
      color: var(--vscode-editor-background, #1e1e1e);
    }

    .status-badge.pending {
      background: var(--vscode-testing-iconQueued, #cca700);
      color: var(--vscode-editor-background, #1e1e1e);
    }

    .status-badge.failed {
      background: var(--vscode-testing-iconFailed, #f14c4c);
      color: var(--vscode-editor-background, #1e1e1e);
    }
  `;

  private tabs: Tab[] = [
    { id: 'pvs', label: 'Persistent Volumes' },
    { id: 'pvcs', label: 'Persistent Volume Claims' }
  ];

  private getColumns(): Column[] {
    if (this.activeTab === 'pvs') {
      return [
        { key: 'name', label: 'Name', type: 'link' },
        { key: 'capacity', label: 'Capacity' },
        { key: 'accessModes', label: 'Access Modes' },
        { key: 'reclaimPolicy', label: 'Reclaim Policy' },
        { key: 'status', label: 'Status', type: 'custom' },
        { key: 'claim', label: 'Claim' },
        { key: 'storageClass', label: 'Storage Class' },
        { key: 'age', label: 'Age' }
      ];
    } else {
      return [
        { key: 'name', label: 'Name', type: 'link' },
        { key: 'namespace', label: 'Namespace' },
        { key: 'status', label: 'Status', type: 'custom' },
        { key: 'volume', label: 'Volume' },
        { key: 'capacity', label: 'Capacity' },
        { key: 'accessModes', label: 'Access Modes' },
        { key: 'storageClass', label: 'Storage Class' },
        { key: 'age', label: 'Age' }
      ];
    }
  }

  private getActions(_item: StorageResource): ActionItem[] {
    return [
      { label: 'View Details', action: 'view' },
      { label: 'Edit', action: 'edit' },
      { label: 'Delete', action: 'delete', danger: true }
    ];
  }

  private getFilteredData(): StorageResource[] {
    let data = this.resources;

    if (this.searchQuery) {
      data = data.filter(item => 
        JSON.stringify(item).toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    }

    return data;
  }

  private getResourceType(): string {
    return this.activeTab === 'pvs' ? 'PersistentVolume' : 'PersistentVolumeClaim';
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

  private getStatusClass(status: string): string {
    const statusMap: Record<string, string> = {
      'Bound': 'bound',
      'Available': 'available',
      'Released': 'released',
      'Pending': 'pending',
      'Failed': 'failed'
    };
    return statusMap[status] || 'unknown';
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

  private async viewDetails(item: StorageResource) {
    this.selectedItem = item;
    this.showDetails = true;
    this.loadingDetails = true;
    
    try {
      const resourceType = this.getResourceType();
      const namespace = 'namespace' in item ? item.namespace : undefined;
      this.detailsData = await KubernetesApi.getResourceDetails(resourceType, item.name, namespace);
    } catch (error) {
      console.error('Failed to fetch details:', error);
      this.detailsData = null;
    } finally {
      this.loadingDetails = false;
    }
  }

  private editItem(item: StorageResource) {
    console.log('Edit item:', item);
    // TODO: Implement edit functionality
  }

  private deleteItem(item: StorageResource) {
    const resourceType = this.getResourceType();
    const namespace = 'namespace' in item ? item.namespace : undefined;
    this.itemToDelete = {
      type: resourceType,
      name: item.name,
      namespace: namespace || ''
    };
    this.showDeleteModal = true;
  }

  private async handleConfirmDelete() {
    if (!this.itemToDelete) return;

    this.isDeleting = true;
    
    try {
      const namespace = this.itemToDelete.namespace || undefined;
      await KubernetesApi.deleteResource(this.itemToDelete.type, this.itemToDelete.name, namespace);
      
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
    console.log('Create new resource');
    // TODO: Implement create functionality
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
      if (this.activeTab === 'pvs') {
        // PVs are cluster-scoped, no namespace filtering
        const pvs = await KubernetesApi.getPersistentVolumes();
        this.resources = pvs;
      } else {
        // PVCs are namespace-scoped
        const namespace = this.selectedNamespace === 'All Namespaces' ? undefined : this.selectedNamespace;
        const pvcs = await KubernetesApi.getPersistentVolumeClaims(namespace);
        this.resources = pvcs;
      }
    } catch (error: any) {
      console.error('Failed to fetch storage resources:', error);
      this.error = error.message || 'Failed to fetch storage resources';
    } finally {
      this.loading = false;
    }
  }

  override connectedCallback() {
    super.connectedCallback();
    this.fetchData();
  }

  override render() {
    // Show namespace selector only for PVCs
    const showNamespaceSelector = this.activeTab === 'pvcs';

    return html`
      <div class="container">
        <tab-group
          .tabs="${this.tabs}"
          .activeTab="${this.activeTab}"
          @tab-change="${this.handleTabChange}"
        ></tab-group>

        <div class="header">
          ${showNamespaceSelector ? html`
            <namespace-dropdown
              .namespaces="${this.namespaces.map(ns => ({ name: ns.name }))}"
              .selectedNamespace="${this.selectedNamespace}"
              @namespace-change="${this.handleNamespaceChange}"
              .loading="${this.loading}"
              .includeAllOption="${true}"
            ></namespace-dropdown>
          ` : ''}
          
          <search-input
            .value="${this.searchQuery}"
            placeholder="Search storage resources..."
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
            <loading-state message="Loading storage resources..."></loading-state>
          ` : this.error ? html`
            <empty-state 
              message="${this.error}" 
              icon="⚠️"
            ></empty-state>
          ` : html`
            <resource-table
              .columns="${this.getColumns()}"
              .data="${this.getFilteredData()}"
              .getActions="${(item: StorageResource) => this.getActions(item)}"
              .customRenderers="${{
                status: (value: string) => html`
                  <span class="status-badge ${this.getStatusClass(value)}">${value}</span>
                `
              }}"
              emptyMessage="No ${this.activeTab === 'pvs' ? 'persistent volumes' : 'persistent volume claims'} found"
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
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'kubernetes-storage': KubernetesStorage;
  }
}
