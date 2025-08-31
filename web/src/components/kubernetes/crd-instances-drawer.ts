import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { KubernetesApi } from '../../services/kubernetes-api.js';
import '../ui/search-input.js';
import '../ui/namespace-dropdown.js';
import '../ui/empty-state.js';
import '../ui/loading-state.js';
import '../tables/resource-table.js';
import '../drawers/detail-drawer.js';
import '../kubernetes/resource-detail-view.js';
import type { Column } from '../tables/resource-table.js';
import type { ActionItem } from '../ui/action-dropdown.js';

export interface CRDInstance {
  name: string;
  namespace?: string;
  apiVersion: string;
  kind: string;
  status?: string;
  age: string;
  labels?: { [key: string]: string };
  annotations?: { [key: string]: string };
}

@customElement('crd-instances-drawer')
export class CRDInstancesDrawer extends LitElement {
  @property({ type: Boolean, reflect: true }) show = false;
  @property({ type: String }) crdName = '';
  @property({ type: String }) crdKind = '';
  @property({ type: String }) crdGroup = '';
  @property({ type: String }) crdVersion = '';
  @property({ type: String }) crdScope = 'Namespaced';
  @property({ type: Boolean }) loading = false;
  @property({ type: String }) width = '80%';
  
  @state() private searchQuery = '';
  @state() private selectedNamespace = 'All Namespaces';
  @state() private instances: CRDInstance[] = [];
  @state() private showInstanceDetails = false;
  @state() private selectedInstance: CRDInstance | null = null;
  @state() private instanceDetailsData: any = null;
  @state() private loadingDetails = false;
  @state() private error: string | null = null;

  static override styles = css`
    :host {
      display: block;
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      width: var(--drawer-width, 60%);
      background: var(--vscode-sideBar-background, #252526);
      border-left: 1px solid var(--vscode-widget-border, #303031);
      transform: translateX(100%);
      transition: transform 0.3s ease;
      z-index: 1000;
      display: flex;
      flex-direction: column;
    }

    :host([show]) {
      transform: translateX(0);
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem;
      border-bottom: 1px solid var(--vscode-widget-border, #303031);
      background: var(--vscode-editor-background, #1e1e1e);
    }

    .title-section {
      flex: 1;
    }

    .title {
      font-size: 1.2rem;
      font-weight: 600;
      margin: 0;
      color: var(--vscode-foreground, #cccccc);
    }

    .subtitle {
      font-size: 0.9rem;
      color: var(--vscode-descriptionForeground, #8e8e8e);
      margin-top: 0.25rem;
    }

    .kind-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      background: var(--vscode-badge-background, #007acc);
      color: var(--vscode-badge-foreground, white);
      margin-left: 0.5rem;
    }

    .close-button {
      background: none;
      border: none;
      color: var(--vscode-foreground, #cccccc);
      cursor: pointer;
      padding: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .close-button:hover {
      color: var(--vscode-button-hoverBackground, #005a9e);
    }

    .controls {
      padding: 1rem;
      display: flex;
      gap: 1rem;
      align-items: center;
      border-bottom: 1px solid var(--vscode-widget-border, #303031);
    }

    search-input {
      flex: 1;
    }

    .content {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
    }

    .stats {
      display: flex;
      gap: 2rem;
      padding: 1rem;
      background: var(--vscode-editor-background, #1e1e1e);
      border-radius: 4px;
      margin-bottom: 1rem;
    }

    .stat {
      display: flex;
      flex-direction: column;
    }

    .stat-label {
      font-size: 0.8rem;
      color: var(--vscode-descriptionForeground, #8e8e8e);
      margin-bottom: 0.25rem;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--vscode-foreground, #cccccc);
    }

    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
    }

    .status-badge.ready {
      background: var(--vscode-testing-iconPassed, #73c991);
      color: var(--vscode-editor-background, #1e1e1e);
    }

    .status-badge.progressing {
      background: var(--vscode-testing-iconQueued, #cca700);
      color: var(--vscode-editor-background, #1e1e1e);
    }

    .status-badge.error {
      background: var(--vscode-testing-iconFailed, #f14c4c);
      color: white;
    }

    .status-badge.unknown {
      background: var(--vscode-descriptionForeground, #8e8e8e);
      color: white;
    }

    .overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
      z-index: 999;
    }

    :host([show]) ~ .overlay,
    .overlay.visible {
      opacity: 1;
      pointer-events: auto;
    }
  `;

  private async fetchInstances() {
    this.loading = true;
    this.error = null;
    
    try {
      const response = await KubernetesApi.getCRDInstances(this.crdName);
      
      // Handle different possible response formats
      let instancesArray: any[] = [];
      
      if (Array.isArray(response)) {
        instancesArray = response;
      } else if (response && typeof response === 'object') {
        // Check for common response patterns
        const responseObj = response as any;
        if (Array.isArray(responseObj.items)) {
          instancesArray = responseObj.items;
        } else if (Array.isArray(responseObj.instances)) {
          instancesArray = responseObj.instances;
        } else if (Array.isArray(responseObj.resources)) {
          instancesArray = responseObj.resources;
        } else {
          instancesArray = [];
        }
      }
      
      // Transform the API response to match our CRDInstance interface
      this.instances = instancesArray.map((item: any) => ({
        name: item.metadata?.name || item.name || '',
        namespace: item.metadata?.namespace || item.namespace,
        apiVersion: item.apiVersion || `${this.crdGroup}/${this.crdVersion}`,
        kind: item.kind || this.crdKind,
        status: item.status?.phase || item.status?.state || 'Unknown',
        age: this.calculateAge(item.metadata?.creationTimestamp || item.creationTimestamp),
        labels: item.metadata?.labels || item.labels || {},
        annotations: item.metadata?.annotations || item.annotations || {}
      }));
    } catch (err: any) {
      console.error('Failed to fetch CRD instances:', err);
      this.error = `Failed to fetch instances: ${err?.message || 'Unknown error'}`;
      this.instances = [];
    } finally {
      this.loading = false;
    }
  }

  private async fetchInstanceDetails(instance: CRDInstance) {
    this.loadingDetails = true;
    
    try {
      const isNamespaced = this.crdScope === 'Namespaced';
      const response = await KubernetesApi.getCRDInstanceDetails(
        this.crdName,
        instance.name,
        isNamespaced ? instance.namespace : undefined
      );
      
      this.instanceDetailsData = response;
    } catch (err: any) {
      console.error('Failed to fetch instance details:', err);
      // If fetching details fails, use basic data from the list
      this.instanceDetailsData = {
        apiVersion: instance.apiVersion,
        kind: instance.kind,
        metadata: {
          name: instance.name,
          namespace: instance.namespace,
          labels: instance.labels,
          annotations: instance.annotations
        },
        error: `Failed to fetch details: ${err?.message || 'Unknown error'}`
      };
    } finally {
      this.loadingDetails = false;
    }
  }

  private calculateAge(timestamp: string): string {
    if (!timestamp) return 'Unknown';
    
    const created = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  private getColumns(): Column[] {
    const columns: Column[] = [
      { key: 'name', label: 'Name', type: 'link' }
    ];
    
    // Only show namespace column for namespaced resources
    if (this.crdScope === 'Namespaced') {
      columns.push({ key: 'namespace', label: 'Namespace' });
    }
    
    columns.push(
      { key: 'status', label: 'Status', type: 'custom' },
      { key: 'age', label: 'Age' }
    );
    
    return columns;
  }

  private getActions(_item: CRDInstance): ActionItem[] {
    return [
      { label: 'View Details', action: 'view' },
      { label: 'Edit YAML', action: 'edit' },
      { label: 'Delete', action: 'delete', danger: true }
    ];
  }

  private getFilteredInstances(): CRDInstance[] {
    let instances = this.instances;

    // Filter by namespace (only for namespaced resources)
    if (this.crdScope === 'Namespaced' && this.selectedNamespace !== 'All Namespaces') {
      instances = instances.filter(i => i.namespace === this.selectedNamespace);
    }

    // Filter by search query
    if (this.searchQuery) {
      instances = instances.filter(i =>
        i.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        (i.namespace?.toLowerCase()?.includes(this.searchQuery.toLowerCase()) || false)
      );
    }

    return instances;
  }

  private handleSearchChange(event: CustomEvent) {
    this.searchQuery = event.detail.value;
  }

  private handleNamespaceChange(event: CustomEvent) {
    this.selectedNamespace = event.detail.namespace;
  }

  private handleCellClick(event: CustomEvent) {
    const instance = event.detail.item as CRDInstance;
    this.viewInstanceDetails(instance);
  }

  private async handleAction(event: CustomEvent) {
    const { action, item } = event.detail;
    
    switch (action) {
      case 'view':
        await this.viewInstanceDetails(item);
        break;
      case 'edit':
        console.log('Edit YAML for:', item.name);
        // TODO: Implement edit functionality
        break;
      case 'delete':
        if (confirm(`Are you sure you want to delete ${item.name}?`)) {
          await this.deleteInstance(item);
        }
        break;
    }
  }

  private async deleteInstance(instance: CRDInstance) {
    try {
      const isNamespaced = this.crdScope === 'Namespaced';
      await KubernetesApi.deleteCRDInstance(
        this.crdName,
        instance.name,
        isNamespaced ? instance.namespace : undefined
      );
      
      // Refresh the instances list
      await this.fetchInstances();
      
      // Show success message or notification
      console.log(`Successfully deleted ${instance.name}`);
    } catch (err: any) {
      console.error('Failed to delete instance:', err);
      alert(`Failed to delete instance: ${err?.message || 'Unknown error'}`);
    }
  }

  private async viewInstanceDetails(instance: CRDInstance) {
    this.selectedInstance = instance;
    this.showInstanceDetails = true;
    await this.fetchInstanceDetails(instance);
  }

  private handleInstanceDetailsClose() {
    this.showInstanceDetails = false;
    this.selectedInstance = null;
    this.instanceDetailsData = null;
  }

  private handleClose() {
    this.dispatchEvent(new CustomEvent('close'));
  }

  override connectedCallback() {
    super.connectedCallback();
  }

  override updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);
    // Only load instances when show changes from false to true
    if (changedProperties.has('show') && this.show && !changedProperties.get('show')) {
      // Load real instances when drawer opens
      this.fetchInstances();
      this.searchQuery = '';
      this.selectedNamespace = 'All Namespaces';
      this.error = null;
    }
    
    // Update CSS variable when width property changes
    if (changedProperties.has('width')) {
      this.style.setProperty('--drawer-width', this.width);
    }
  }

  override render() {
    const filteredInstances = this.getFilteredInstances();
    const totalInstances = this.instances.length;
    const namespacesSet = new Set(this.instances.map(i => i.namespace).filter(Boolean));
    const namespaces = Array.from(namespacesSet).sort();

    const statusCounts = {
      ready: this.instances.filter(i => i.status === 'Ready').length,
      progressing: this.instances.filter(i => i.status === 'Progressing').length,
      error: this.instances.filter(i => i.status === 'Error').length
    };

    return html`
      <div class="header">
        <div class="title-section">
          <h2 class="title">
            ${this.crdKind} Instances
            <span class="kind-badge">${this.crdGroup}/${this.crdVersion}</span>
          </h2>
          <div class="subtitle">
            Viewing instances of ${this.crdName}
          </div>
        </div>
        <button class="close-button" @click="${this.handleClose}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="controls">
        ${this.crdScope === 'Namespaced' ? html`
          <namespace-dropdown
            .namespaces="${namespaces.map(ns => ({ name: ns }))}"
            .selectedNamespace="${this.selectedNamespace}"
            @namespace-change="${this.handleNamespaceChange}"
            .loading="${this.loading}"
            .includeAllOption="${true}"
          ></namespace-dropdown>
        ` : ''}
        
        <search-input
          .value="${this.searchQuery}"
          placeholder="Search instances..."
          @search-change="${this.handleSearchChange}"
        ></search-input>
      </div>

      <div class="content">
        ${this.error ? html`
          <div style="padding: 1rem; color: var(--vscode-errorForeground, #f48771); background: var(--vscode-inputValidation-errorBackground, #5a1d1d); border-radius: 4px; margin-bottom: 1rem;">
            ${this.error}
          </div>
        ` : ''}
        
        ${!this.error ? html`
          <div class="stats">
            <div class="stat">
              <div class="stat-label">Total Instances</div>
              <div class="stat-value">${totalInstances}</div>
            </div>
            <div class="stat">
              <div class="stat-label">Ready</div>
              <div class="stat-value" style="color: var(--vscode-testing-iconPassed, #73c991)">
                ${statusCounts.ready}
              </div>
            </div>
            <div class="stat">
              <div class="stat-label">Progressing</div>
              <div class="stat-value" style="color: var(--vscode-testing-iconQueued, #cca700)">
                ${statusCounts.progressing}
              </div>
            </div>
            <div class="stat">
              <div class="stat-label">Error</div>
              <div class="stat-value" style="color: var(--vscode-testing-iconFailed, #f14c4c)">
                ${statusCounts.error}
              </div>
            </div>
          </div>
        ` : ''}

        ${this.loading ? html`
          <loading-state message="Loading instances..."></loading-state>
        ` : this.error ? '' : filteredInstances.length === 0 ? html`
          <empty-state 
            message="${this.searchQuery || this.selectedNamespace !== 'All Namespaces' 
              ? 'No instances found matching your filters' 
              : `No ${this.crdKind} instances found`}"
            icon="📦"
          ></empty-state>
        ` : html`
          <resource-table
            .columns="${this.getColumns()}"
            .data="${filteredInstances}"
            .getActions="${(item: CRDInstance) => this.getActions(item)}"
            .customRenderers="${{
              status: (value: string) => {
                const statusClass = value?.toLowerCase() || 'unknown';
                return html`
                  <span class="status-badge ${statusClass}">
                    ${value || 'Unknown'}
                  </span>
                `;
              }
            }}"
            @cell-click="${this.handleCellClick}"
            @action="${this.handleAction}"
          ></resource-table>
        `}
      </div>

      <detail-drawer
        .show="${this.showInstanceDetails}"
        title="${this.selectedInstance?.name || ''} Details"
        @close="${this.handleInstanceDetailsClose}"
      >
        ${this.loadingDetails ? html`
          <loading-state message="Loading instance details..."></loading-state>
        ` : this.instanceDetailsData ? html`
          <resource-detail-view .resource="${this.instanceDetailsData}"></resource-detail-view>
        ` : ''}
      </detail-drawer>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'crd-instances-drawer': CRDInstancesDrawer;
  }
}
