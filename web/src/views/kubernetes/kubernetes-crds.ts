import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { Api } from '../../utils/api';
import '../../components/tables/resource-table';
import '../../components/ui/search-input';
import '../../components/ui/loading-state';
import '../../components/ui/empty-state';
import '../../components/ui/notification-container';
import '../../components/modals/delete-modal';
import '../../components/drawers/detail-drawer';
import '../../components/drawers/create-resource-drawer';

/**
 * Kubernetes CRDs (Custom Resource Definitions) view component
 * Manages custom resource definitions and their instances
 */
@customElement('kubernetes-crds')
export class KubernetesCRDs extends LitElement {
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

    .controls {
      display: flex;
      align-items: center;
      gap: 1rem;
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

    .filters {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .resource-count {
      font-size: 13px;
      color: var(--vscode-descriptionForeground, #cccccc80);
      margin-left: auto;
    }

    /* Detail styles */
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

    .version-item {
      background: var(--vscode-editor-background, #1e1e1e);
      border: 1px solid var(--vscode-widget-border, #303031);
      border-radius: 4px;
      padding: 0.75rem;
      margin-bottom: 0.5rem;
    }

    .version-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .version-name {
      font-weight: 500;
      color: var(--vscode-textLink-foreground, #3794ff);
    }

    .version-badges {
      display: flex;
      gap: 0.5rem;
    }

    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      background: var(--vscode-badge-background, #007acc);
      color: var(--vscode-badge-foreground, white);
    }

    .badge.served {
      background: var(--vscode-notificationsInfoIcon-foreground, #3794ff);
    }

    .badge.storage {
      background: var(--vscode-notificationsWarningIcon-foreground, #cca700);
    }

    .schema-section {
      background: var(--vscode-editor-background, #1e1e1e);
      border: 1px solid var(--vscode-widget-border, #303031);
      border-radius: 4px;
      padding: 1rem;
      margin-top: 0.75rem;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 12px;
      white-space: pre-wrap;
      max-height: 400px;
      overflow-y: auto;
    }

    .instances-section {
      margin-top: 1.5rem;
    }

    .instance-item {
      background: var(--vscode-list-hoverBackground, #2a2a2a);
      border-radius: 4px;
      padding: 0.75rem;
      margin-bottom: 0.5rem;
      cursor: pointer;
      transition: background 0.2s;
    }

    .instance-item:hover {
      background: var(--vscode-list-activeSelectionBackground, #094771);
    }

    .instance-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .instance-name {
      font-weight: 500;
      color: var(--vscode-foreground, #cccccc);
    }

    .instance-namespace {
      font-size: 12px;
      color: var(--vscode-descriptionForeground, #cccccc80);
    }
  `;

  @property({ type: String }) searchQuery = '';
  @property({ type: Boolean }) showInstances = false;
  
  @state() private loading = false;
  @state() private crds: any[] = [];
  @state() private selectedCRD: any = null;
  @state() private crdInstances: any[] = [];
  
  // UI state
  @state() private showDetailDrawer = false;
  @state() private showDeleteModal = false;
  @state() private showCreateDrawer = false;
  @state() private selectedResource: any = null;
  @state() private detailType = '';

  private api = new Api();

  override connectedCallback() {
    super.connectedCallback();
    this.fetchCRDs();
  }

  override render() {
    return html`
      <div class="container">
        <div class="header">
          <h1>Custom Resource Definitions</h1>
          <div class="controls">
            <button class="btn-create" @click=${this.handleCreate}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Create CRD
            </button>
          </div>
        </div>

        <div class="content">
          <div class="filters">
            <search-input
              .value=${this.searchQuery}
              placeholder="Search CRDs..."
              @search-change=${this.handleSearch}
            ></search-input>

            <span class="resource-count">
              ${this.getFilteredCRDs().length} CRDs
            </span>
          </div>

          ${this.loading ? html`
            <loading-state message="Loading CRDs..."></loading-state>
          ` : this.renderContent()}
        </div>

        <detail-drawer
          .show=${this.showDetailDrawer}
          .title=${this.getDetailTitle()}
          .width="800px"
          @close=${() => this.showDetailDrawer = false}
        >
          ${this.renderResourceDetail()}
        </detail-drawer>

        <delete-modal
          .show=${this.showDeleteModal}
          .item=${this.selectedResource}
          @confirm-delete=${this.handleDelete}
          @cancel-delete=${this.handleCancelDelete}
        ></delete-modal>

        <create-resource-drawer
          .show=${this.showCreateDrawer}
          .title="Create Custom Resource Definition"
          @close=${() => this.showCreateDrawer = false}
          @create=${this.handleCreateResource}
        ></create-resource-drawer>

        <notification-container></notification-container>
      </div>
    `;
  }

  private renderContent() {
    const crds = this.getFilteredCRDs();

    if (crds.length === 0) {
      return html`
        <empty-state
          message="No CRDs found"
          icon="crds"
        ></empty-state>
      `;
    }

    return html`
      <resource-table
        .columns=${this.getColumns()}
        .data=${crds}
        .getActions=${(item: any) => this.getCRDActions(item)}
        @cell-click=${this.handleCellClick}
        @action=${this.handleAction}
      ></resource-table>
    `;
  }

  private getColumns() {
    return [
      { key: 'name', label: 'Name', type: 'link' },
      { key: 'group', label: 'Group' },
      { key: 'version', label: 'Version' },
      { key: 'scope', label: 'Scope' },
      { key: 'kind', label: 'Kind' },
      { key: 'instances', label: 'Instances', type: 'custom' },
      { key: 'age', label: 'Age' }
    ];
  }

  private getFilteredCRDs() {
    if (!this.searchQuery) {
      return this.crds;
    }

    const query = this.searchQuery.toLowerCase();
    return this.crds.filter(crd => 
      crd.name.toLowerCase().includes(query) ||
      crd.group.toLowerCase().includes(query) ||
      crd.kind.toLowerCase().includes(query)
    );
  }

  private getCRDActions(_crd: any) {
    return [
      { label: 'View Details', action: 'view' },
      { label: 'View Instances', action: 'instances' },
      { label: 'Create Instance', action: 'create-instance' },
      { label: 'Delete', action: 'delete', danger: true }
    ];
  }

  private async fetchCRDs() {
    this.loading = true;
    
    try {
      const response = await this.api.get('/kubernetes/customresourcedefinitions');
      this.crds = await this.processCRDs(response.items || []);
    } catch (error) {
      console.error('Failed to fetch CRDs:', error);
      this.showNotification('Failed to load CRDs', 'error');
    } finally {
      this.loading = false;
    }
  }

  private async processCRDs(crds: any[]): Promise<any[]> {
    const processed = await Promise.all(crds.map(async crd => {
      const primaryVersion = crd.spec.versions.find((v: any) => v.storage) || crd.spec.versions[0];
      
      // Count instances for each CRD
      let instanceCount = 0;
      try {
        const instances = await this.api.get(
          `/apis/${crd.spec.group}/${primaryVersion.name}/${crd.spec.names.plural}`
        );
        instanceCount = instances.items?.length || 0;
      } catch {
        // Ignore errors when fetching instances
      }
      
      return {
        name: crd.metadata.name,
        group: crd.spec.group,
        version: primaryVersion.name,
        scope: crd.spec.scope,
        kind: crd.spec.names.kind,
        instances: instanceCount,
        age: this.getAge(crd.metadata.creationTimestamp),
        raw: crd
      };
    }));
    
    return processed;
  }

  private getAge(timestamp: string): string {
    const created = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - created.getTime();
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    return '<1h';
  }

  private handleSearch(e: CustomEvent) {
    this.searchQuery = e.detail.value;
  }

  private handleCellClick(e: CustomEvent) {
    if (e.detail.column.type === 'link') {
      this.showCRDDetail(e.detail.item);
    }
  }

  private handleAction(e: CustomEvent) {
    const { action, item } = e.detail;
    
    switch (action) {
      case 'view':
        this.showCRDDetail(item);
        break;
      case 'instances':
        this.viewInstances(item);
        break;
      case 'create-instance':
        this.createInstance(item);
        break;
      case 'delete':
        this.confirmDelete(item);
        break;
    }
  }

  private showCRDDetail(crd: any) {
    this.selectedResource = crd;
    this.detailType = 'crd';
    this.showDetailDrawer = true;
  }

  private async viewInstances(crd: any) {
    this.selectedCRD = crd;
    this.detailType = 'instances';
    this.showDetailDrawer = true;
    
    // Fetch instances
    try {
      const primaryVersion = crd.raw.spec.versions.find((v: any) => v.storage) || crd.raw.spec.versions[0];
      const response = await this.api.get(
        `/apis/${crd.group}/${primaryVersion.name}/${crd.raw.spec.names.plural}`
      );
      this.crdInstances = response.items || [];
    } catch (error) {
      console.error('Failed to fetch CRD instances:', error);
      this.crdInstances = [];
    }
  }

  private createInstance(crd: any) {
    this.selectedCRD = crd;
    this.showCreateDrawer = true;
  }

  private confirmDelete(resource: any) {
    this.selectedResource = resource;
    this.showDeleteModal = true;
  }

  private handleCreate() {
    this.showCreateDrawer = true;
  }

  private async handleCreateResource(e: CustomEvent) {
    const { resource } = e.detail;
    
    try {
      if (this.selectedCRD) {
        // Create instance of CRD
        const primaryVersion = this.selectedCRD.raw.spec.versions.find((v: any) => v.storage) || 
                              this.selectedCRD.raw.spec.versions[0];
        await this.api.post(
          `/apis/${this.selectedCRD.group}/${primaryVersion.name}/${this.selectedCRD.raw.spec.names.plural}`,
          resource
        );
        this.showNotification('Resource instance created successfully', 'success');
      } else {
        // Create new CRD
        await this.api.post('/apis/apiextensions.k8s.io/v1/customresourcedefinitions', resource);
        this.showNotification('CRD created successfully', 'success');
      }
      
      this.showCreateDrawer = false;
      this.fetchCRDs();
    } catch (error) {
      this.showNotification('Failed to create resource', 'error');
    }
  }

  private async handleDelete() {
    if (!this.selectedResource) return;
    
    try {
      const name = this.selectedResource.name;
      
      await this.api.delete(`/apis/apiextensions.k8s.io/v1/customresourcedefinitions/${name}`);
      this.showNotification(`${name} deleted successfully`, 'success');
      this.showDeleteModal = false;
      this.fetchCRDs();
    } catch (error) {
      this.showNotification('Failed to delete CRD', 'error');
    }
  }

  private handleCancelDelete() {
    this.showDeleteModal = false;
    this.selectedResource = null;
  }

  private getDetailTitle(): string {
    if (this.detailType === 'instances' && this.selectedCRD) {
      return `${this.selectedCRD.kind} Instances`;
    }
    
    return this.selectedResource ? `CRD Details: ${this.selectedResource.name}` : '';
  }

  private renderResourceDetail() {
    if (this.detailType === 'instances') {
      return this.renderInstancesList();
    }
    
    if (!this.selectedResource) return html``;
    
    return this.renderCRDDetail();
  }

  private renderCRDDetail() {
    const crd = this.selectedResource.raw;
    const names = crd.spec.names;
    const versions = crd.spec.versions || [];
    
    return html`
      <div class="detail-content">
        <h3>Basic Information</h3>
        <div class="detail-item">
          <span class="label">Name:</span>
          <span class="value">${crd.metadata.name}</span>
        </div>
        <div class="detail-item">
          <span class="label">Group:</span>
          <span class="value">${crd.spec.group}</span>
        </div>
        <div class="detail-item">
          <span class="label">Scope:</span>
          <span class="value">${crd.spec.scope}</span>
        </div>
        <div class="detail-item">
          <span class="label">Created:</span>
          <span class="value">${new Date(crd.metadata.creationTimestamp).toLocaleString()}</span>
        </div>
        
        <h3>Names</h3>
        <div class="detail-item">
          <span class="label">Kind:</span>
          <span class="value">${names.kind}</span>
        </div>
        <div class="detail-item">
          <span class="label">List Kind:</span>
          <span class="value">${names.listKind}</span>
        </div>
        <div class="detail-item">
          <span class="label">Plural:</span>
          <span class="value">${names.plural}</span>
        </div>
        <div class="detail-item">
          <span class="label">Singular:</span>
          <span class="value">${names.singular}</span>
        </div>
        ${names.shortNames && names.shortNames.length > 0 ? html`
          <div class="detail-item">
            <span class="label">Short Names:</span>
            <span class="value">${names.shortNames.join(', ')}</span>
          </div>
        ` : ''}
        
        <h3>Versions</h3>
        ${versions.map((version: any) => html`
          <div class="version-item">
            <div class="version-header">
              <span class="version-name">${version.name}</span>
              <div class="version-badges">
                ${version.served ? html`<span class="badge served">Served</span>` : ''}
                ${version.storage ? html`<span class="badge storage">Storage</span>` : ''}
              </div>
            </div>
            ${version.schema?.openAPIV3Schema ? html`
              <div class="detail-item">
                <span class="label">Schema:</span>
                <span class="value">Defined</span>
              </div>
            ` : ''}
            ${version.additionalPrinterColumns && version.additionalPrinterColumns.length > 0 ? html`
              <div class="detail-item">
                <span class="label">Additional Columns:</span>
                <span class="value">
                  ${version.additionalPrinterColumns.map((col: any) => col.name).join(', ')}
                </span>
              </div>
            ` : ''}
          </div>
        `)}
        
        ${crd.spec.conversion && crd.spec.conversion.strategy !== 'None' ? html`
          <h3>Conversion</h3>
          <div class="detail-item">
            <span class="label">Strategy:</span>
            <span class="value">${crd.spec.conversion.strategy}</span>
          </div>
          ${crd.spec.conversion.webhook ? html`
            <div class="detail-item">
              <span class="label">Webhook Service:</span>
              <span class="value">
                ${crd.spec.conversion.webhook.clientConfig.service.namespace}/${crd.spec.conversion.webhook.clientConfig.service.name}
              </span>
            </div>
          ` : ''}
        ` : ''}
        
        ${crd.status && crd.status.conditions ? html`
          <h3>Status</h3>
          ${crd.status.conditions.map((condition: any) => html`
            <div class="detail-item">
              <span class="label">${condition.type}:</span>
              <span class="value">${condition.status}</span>
            </div>
          `)}
        ` : ''}
        
        ${crd.spec.versions[0]?.schema?.openAPIV3Schema ? html`
          <h3>Schema (OpenAPI v3)</h3>
          <div class="schema-section">
            ${JSON.stringify(crd.spec.versions[0].schema.openAPIV3Schema, null, 2)}
          </div>
        ` : ''}
      </div>
    `;
  }

  private renderInstancesList() {
    if (!this.selectedCRD) return html``;
    
    return html`
      <div class="detail-content">
        <h3>${this.selectedCRD.kind} Resources</h3>
        
        ${this.crdInstances.length === 0 ? html`
          <p style="color: #999; margin: 20px 0;">No instances found</p>
        ` : html`
          <div class="instances-section">
            ${this.crdInstances.map(instance => html`
              <div class="instance-item" @click=${() => this.viewInstanceDetail(instance)}>
                <div class="instance-header">
                  <span class="instance-name">${instance.metadata.name}</span>
                  ${instance.metadata.namespace ? html`
                    <span class="instance-namespace">${instance.metadata.namespace}</span>
                  ` : ''}
                </div>
                <div style="font-size: 12px; color: #999; margin-top: 4px;">
                  Created: ${new Date(instance.metadata.creationTimestamp).toLocaleString()}
                </div>
              </div>
            `)}
          </div>
        `}
      </div>
    `;
  }

  private viewInstanceDetail(_instance: any) {
    // TODO: Implement instance detail view
    this.showNotification('Instance detail view coming soon', 'info');
  }

  private showNotification(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') {
    const container = this.shadowRoot?.querySelector('notification-container') as any;
    if (container) {
      container.addNotification({ type, message });
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'kubernetes-crds': KubernetesCRDs;
  }
}
