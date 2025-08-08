import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { KubernetesApi } from '../../services/kubernetes-api.js';
import type {
  KubernetesNamespace,
  HelmRelease,
  KubernetesResourceDetails
} from '../../services/kubernetes-api.js';
import '../../components/ui/search-input.js';
import '../../components/ui/empty-state.js';
import '../../components/ui/loading-state.js';
import '../../components/tabs/tab-group.js';
import '../../components/tables/resource-table.js';
import '../../components/drawers/detail-drawer.js';
import '../../components/modals/delete-modal.js';
import type { Tab } from '../../components/tabs/tab-group.js';
import type { Column } from '../../components/tables/resource-table.js';
import type { ActionItem } from '../../components/ui/action-dropdown.js';
import type { DeleteItem } from '../../components/modals/delete-modal.js';

@customElement('kubernetes-helm')
export class KubernetesHelm extends LitElement {
  @property({ type: Array }) releases: HelmRelease[] = [];
  @property({ type: Array }) namespaces: KubernetesNamespace[] = [];
  @property({ type: String }) selectedNamespace = 'all';
  @property({ type: String }) searchQuery = '';
  @property({ type: Boolean }) loading = false;
  @property({ type: String }) error: string | null = null;
  
  @state() private activeTab = 'releases';
  @state() private showDetails = false;
  @state() private selectedItem: HelmRelease | null = null;
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

  private tabs: Tab[] = [
    { id: 'releases', label: 'Helm Releases' },
    { id: 'repositories', label: 'Repositories' }
  ];

  private getColumns(): Column[] {
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
    } else {
      return [
        { key: 'name', label: 'Repository Name' },
        { key: 'url', label: 'URL' },
        { key: 'type', label: 'Type' }
      ];
    }
  }

  private getActions(_item: HelmRelease): ActionItem[] {
    return [
      { label: 'View Details', action: 'view' },
      { label: 'View Values', action: 'values' },
      { label: 'Upgrade', action: 'upgrade' },
      { label: 'Rollback', action: 'rollback' },
      { label: 'Uninstall', action: 'delete', danger: true }
    ];
  }

  private getFilteredData(): HelmRelease[] {
    let data = this.releases;

    if (this.selectedNamespace !== 'all') {
      data = data.filter(item => item.namespace === this.selectedNamespace);
    }

    if (this.searchQuery) {
      data = data.filter(item => 
        JSON.stringify(item).toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    }

    return data;
  }

  private async handleTabChange(event: CustomEvent) {
    this.activeTab = event.detail.tabId;
    await this.fetchData();
  }

  private handleSearchChange(event: CustomEvent) {
    this.searchQuery = event.detail.value;
  }

  private async handleNamespaceChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.selectedNamespace = select.value;
    await this.fetchData();
  }

  private handleCellClick(event: CustomEvent) {
    const { column, item } = event.detail;
    
    if (column.type === 'link') {
      this.viewDetails(item);
    }
  }

  private getStatusClass(status: string): string {
    const statusLower = status.toLowerCase();
    if (statusLower === 'deployed') return 'status-deployed';
    if (statusLower === 'failed') return 'status-failed';
    if (statusLower === 'pending' || statusLower === 'pending-install' || statusLower === 'pending-upgrade') return 'status-pending';
    if (statusLower === 'superseded') return 'status-superseded';
    return '';
  }

  private handleAction(event: CustomEvent) {
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

  private async viewDetails(item: HelmRelease) {
    this.selectedItem = item;
    this.showDetails = true;
    this.loadingDetails = true;
    
    try {
      // For Helm releases, we might need to fetch additional details
      // For now, we'll use the existing data
      this.detailsData = await KubernetesApi.getResourceDetails('Release', item.name, item.namespace);
    } catch (error) {
      console.error('Failed to fetch release details:', error);
      this.detailsData = null;
    } finally {
      this.loadingDetails = false;
    }
  }

  private viewValues(item: HelmRelease) {
    // TODO: Implement view values functionality
    console.log('View values:', item);
  }

  private upgradeRelease(item: HelmRelease) {
    // TODO: Implement upgrade functionality
    console.log('Upgrade release:', item);
  }

  private rollbackRelease(item: HelmRelease) {
    // TODO: Implement rollback functionality
    console.log('Rollback release:', item);
  }

  private deleteRelease(item: HelmRelease) {
    this.itemToDelete = {
      type: 'Helm Release',
      name: item.name,
      namespace: item.namespace
    };
    this.showDeleteModal = true;
  }

  private async handleConfirmDelete() {
    if (!this.itemToDelete) return;

    this.isDeleting = true;
    
    try {
      await KubernetesApi.deleteResource('Release', this.itemToDelete.name, this.itemToDelete.namespace);
      
      // Refresh data
      await this.fetchData();
      
      // Close modal
      this.showDeleteModal = false;
      this.itemToDelete = null;
    } catch (error) {
      console.error('Failed to uninstall release:', error);
    } finally {
      this.isDeleting = false;
    }
  }

  private handleCancelDelete() {
    this.showDeleteModal = false;
    this.itemToDelete = null;
  }

  private handleInstall() {
    console.log('Install new chart');
    // TODO: Implement install functionality
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
      
      // Fetch Helm releases
      if (this.activeTab === 'releases') {
        const namespace = this.selectedNamespace === 'all' ? undefined : this.selectedNamespace;
        const releases = await KubernetesApi.getHelmReleases(namespace);
        this.releases = releases;
      } else {
        // TODO: Implement repositories fetch
        this.releases = [];
      }
    } catch (error: any) {
      console.error('Failed to fetch Helm resources:', error);
      this.error = error.message || 'Failed to fetch Helm resources';
    } finally {
      this.loading = false;
    }
  }

  private renderDetailContent() {
    if (!this.detailsData && !this.selectedItem) return html``;

    const release = this.selectedItem;
    if (!release) return html``;

    return html`
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

        ${this.detailsData ? html`
          ${this.detailsData.metadata?.notes ? html`
            <div class="detail-section">
              <h3>Release Notes</h3>
              <div class="notes-content">
                ${this.detailsData.metadata.notes}
              </div>
            </div>
          ` : ''}

          ${this.detailsData.spec?.values ? html`
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
                ${this.namespaces.map(ns => html`
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
          ${this.loading ? html`
            <loading-state message="Loading Helm releases..."></loading-state>
          ` : this.error ? html`
            <empty-state 
              message="${this.error}" 
              icon="⚠️"
            ></empty-state>
          ` : html`
            <resource-table
              .columns="${this.getColumns()}"
              .data="${this.getFilteredData()}"
              .getActions="${(item: HelmRelease) => this.getActions(item)}"
              .customRenderers="${
                {
                  status: (value: string) => html`
                    <span class="${this.getStatusClass(value)}">${value}</span>
                  `,
                  chart: (value: string) => html`
                    <span class="chart-badge">${value}</span>
                  `,
                  revision: (value: string) => html`
                    <span class="revision-badge">${value}</span>
                  `
                }
              }"
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
}

declare global {
  interface HTMLElementTagNameMap {
    'kubernetes-helm': KubernetesHelm;
  }
}

