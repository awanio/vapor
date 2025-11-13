import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { KubernetesApi } from '../../services/kubernetes-api.js';
import type {
  KubernetesCRD,
  KubernetesResourceDetails
} from '../../services/kubernetes-api.js';
import '../../components/ui/search-input.js';
import '../../components/ui/empty-state.js';
import '../../components/ui/loading-state.js';
import '../../components/tables/resource-table.js';
import '../../components/drawers/detail-drawer.js';
import '../../components/modals/delete-modal.js';
import '../../components/kubernetes/resource-detail-view.js';
import '../../components/kubernetes/crd-instances-drawer.js';
import '../../components/drawers/create-resource-drawer';
import '../../components/ui/notification-container';
import type { Column } from '../../components/tables/resource-table.js';
import type { ActionItem } from '../../components/ui/action-dropdown.js';
import type { DeleteItem } from '../../components/modals/delete-modal.js';

/**
 * Kubernetes CRDs (Custom Resource Definitions) view component
 * Manages custom resource definitions
 */
@customElement('kubernetes-crds')
export class KubernetesCRDs extends LitElement {
  @property({ type: Array }) resources: KubernetesCRD[] = [];
  @property({ type: String }) searchQuery = '';
  @property({ type: Boolean }) loading = false;
  @property({ type: String }) error: string | null = null;
  
  @state() private showDetails = false;
  @state() private selectedItem: KubernetesCRD | null = null;
  @state() private loadingDetails = false;
  @state() private detailsData: KubernetesResourceDetails | null = null;
  @state() private showDeleteModal = false;
  @state() private itemToDelete: DeleteItem | null = null;
  @state() private isDeleting = false;

  // Create drawer state
  @state() private showCreateDrawer = false;
  @state() private createResourceValue = '';
  @state() private isCreating = false;
  @state() private isEditMode = false;
  @state() private editingResource: KubernetesCRD | null = null;
  @state() private resourceFormat: 'yaml' | 'json' = 'yaml';

  // Instances drawer state
  @state() private showInstancesDrawer = false;
  @state() private selectedCRDForInstances: KubernetesCRD | null = null;

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
  `;

  private getColumns(): Column[] {
    return [
      { key: 'name', label: 'Name', type: 'link' },
      { key: 'group', label: 'Group' },
      { key: 'version', label: 'Version' },
      { key: 'kind', label: 'Kind' },
      { key: 'age', label: 'Age' }
    ];
  }

  private getActions(_item: KubernetesCRD): ActionItem[] {
    return [
      { label: 'View Details', action: 'view' },
      { label: 'View Instances', action: 'instances' },
      { label: 'Edit', action: 'edit' },
      { label: 'Delete', action: 'delete', danger: true }
    ];
  }

  private getFilteredData(): any[] {
    let data = this.resources;

    if (this.searchQuery) {
      data = data.filter(item => 
        JSON.stringify(item).toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    }

    // Return data as-is, let custom renderers handle formatting
    return data;
  }

  private handleSearchChange(event: CustomEvent) {
    this.searchQuery = event.detail.value;
  }

  private handleCellClick(event: CustomEvent) {
    const item = event.detail.item as KubernetesCRD;
    this.viewInstances(item);
  }

  private handleAction(event: CustomEvent) {
    const { action, item } = event.detail;
    
    switch (action) {
      case 'view':
        this.viewDetails(item);
        break;
      case 'instances':
        this.viewInstances(item);
        break;
      case 'edit':
        this.editItem(item);
        break;
      case 'delete':
        this.deleteItem(item);
        break;
    }
  }

  private async editItem(item: KubernetesCRD) {
    this.editingResource = item;
    this.isEditMode = true;
    this.resourceFormat = 'yaml';
    this.showCreateDrawer = true;
    this.isCreating = true;
    
    try {
      // Fetch the CRD - try JSON first to unwrap, then convert to YAML
      const resourceContent = await KubernetesApi.getResourceRaw(
        'CustomResourceDefinition',
        item.name,
        undefined,
        'json'
      );
      
      // Parse the JSON response
      const parsed = JSON.parse(resourceContent);
      
      // Unwrap if it's wrapped in a response object
      let unwrapped = parsed;
      if (parsed.crd_detail) {
        unwrapped = parsed.crd_detail;
      } else if (parsed.crd) {
        unwrapped = parsed.crd;
      } else if (parsed.resource) {
        unwrapped = parsed.resource;
      }
      
      // Remove managedFields from metadata
      if (unwrapped.metadata?.managedFields) {
        unwrapped = JSON.parse(JSON.stringify(unwrapped));
        delete unwrapped.metadata.managedFields;
      }
      
      // Convert to YAML
      const yaml = await import('yaml');
      this.createResourceValue = yaml.stringify(unwrapped);
      this.isCreating = false;
    } catch (error: any) {
      console.error('Failed to fetch CRD for editing:', error);
      this.isCreating = false;
      this.showCreateDrawer = false;
      
      const nc = this.shadowRoot?.querySelector('notification-container') as any;
      if (nc && typeof nc.addNotification === 'function') {
        nc.addNotification({ 
          type: 'error', 
          message: `Failed to fetch CRD: ${error.message || 'Unknown error'}` 
        });
      }
    }
  }


  private async viewDetails(item: KubernetesCRD) {
    this.selectedItem = item;
    this.showDetails = true;
    this.loadingDetails = true;
    
    try {
      const response: any = await KubernetesApi.getResourceDetails('crd', item.name);
      
      // Unwrap the response from various possible wrappers
      let unwrapped = response;
      if (response?.data?.crd_detail) {
        unwrapped = response.data.crd_detail;
      } else if (response?.crd_detail) {
        unwrapped = response.crd_detail;
      } else if (response?.crd) {
        unwrapped = response.crd;
      } else if (response?.resource) {
        unwrapped = response.resource;
      }
      
      // Remove managedFields from metadata
      if (unwrapped?.metadata?.managedFields) {
        delete unwrapped.metadata.managedFields;
      }
      this.detailsData = unwrapped;
    } catch (error) {
      console.error('Failed to fetch CRD details:', error);
      this.detailsData = null;
    } finally {
      this.loadingDetails = false;
    }
  }

  private viewInstances(item: KubernetesCRD) {
    this.selectedCRDForInstances = item;
    this.showInstancesDrawer = true;
  }

  private deleteItem(item: KubernetesCRD) {
    this.itemToDelete = {
      type: 'CustomResourceDefinition',
      name: item.name,
      namespace: undefined
    };
    this.showDeleteModal = true;
  }

  private async handleConfirmDelete() {
    if (!this.itemToDelete) return;

    this.isDeleting = true;
    
    try {
      await KubernetesApi.deleteResource('crd', this.itemToDelete.name);
      
      // Refresh data
      await this.fetchData();
      
      // Close modal
      this.showDeleteModal = false;
      this.itemToDelete = null;

      // Show success notification
      const nc = this.shadowRoot?.querySelector('notification-container') as any;
      if (nc && typeof nc.addNotification === 'function') {
        nc.addNotification({ type: 'success', message: 'CRD deleted successfully' });
      }
    } catch (error) {
      console.error('Failed to delete CRD:', error);
      const nc = this.shadowRoot?.querySelector('notification-container') as any;
      if (nc && typeof nc.addNotification === 'function') {
        nc.addNotification({ type: 'error', message: 'Failed to delete CRD' });
      }
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
    this.resourceFormat = 'yaml';
    this.createResourceValue = `apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: crontabs.example.com
spec:
  group: example.com
  versions:
  - name: v1
    served: true
    storage: true
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              cronSpec:
                type: string
              image:
                type: string
              replicas:
                type: integer
  scope: Namespaced
  names:
    plural: crontabs
    singular: crontab
    kind: CronTab
    shortNames:
    - ct`;
    this.showCreateDrawer = true;
  }

  private async handleCreateResource(event: CustomEvent) {
    const { resource, format } = event.detail as { resource: any; format: 'yaml' | 'json' };
    let content = '';
    try {
      content = format === 'json' ? JSON.stringify(resource) : (resource.yaml as string);
      this.isCreating = true;
      
      if (this.isEditMode && this.editingResource) {
        // Update existing CRD
        await KubernetesApi.updateResource(
          'CustomResourceDefinition',
          this.editingResource.name,
          undefined,
          content,
          format
        );
        
        const nc = this.shadowRoot?.querySelector('notification-container') as any;
        if (nc && typeof nc.addNotification === 'function') {
          nc.addNotification({ type: 'success', message: 'CRD updated successfully' });
        }
      } else {
        // Create new CRD
        await KubernetesApi.createResource(content, format);
        
        const nc = this.shadowRoot?.querySelector('notification-container') as any;
        if (nc && typeof nc.addNotification === 'function') {
          nc.addNotification({ type: 'success', message: 'CRD created successfully' });
        }
      }
      
      await this.fetchData();
      this.showCreateDrawer = false;
      this.createResourceValue = '';
      this.isEditMode = false;
      this.editingResource = null;
    } catch (err: any) {
      const nc = this.shadowRoot?.querySelector('notification-container') as any;
      if (nc && typeof nc.addNotification === 'function') {
        const action = this.isEditMode ? 'update' : 'create';
        nc.addNotification({ type: 'error', message: `Failed to ${action} CRD: ${err?.message || 'Unknown error'}` });
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

  private handleInstancesDrawerClose() {
    this.showInstancesDrawer = false;
    this.selectedCRDForInstances = null;
  }

  async fetchData() {
    this.loading = true;
    this.error = null;
    
    try {
      const crds = await KubernetesApi.getCRDs();
      this.resources = crds;
    } catch (error: any) {
      console.error('Failed to fetch CRDs:', error);
      this.error = error.message || 'Failed to fetch Custom Resource Definitions';
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
        <div class="header">
          <search-input
            .value="${this.searchQuery}"
            placeholder="Search CRDs..."
            @search-change="${this.handleSearchChange}"
          ></search-input>
          
          <div class="controls">
            <button class="btn-create" @click="${this.handleCreate}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Create CRD
            </button>
          </div>
        </div>

        <div class="content">
          ${this.loading ? html`
            <loading-state message="Loading Custom Resource Definitions..."></loading-state>
          ` : this.error ? html`
            <empty-state 
              message="${this.error}" 
              icon="⚠️"
            ></empty-state>
          ` : html`
            <resource-table
              .columns="${this.getColumns()}"
              .data="${this.getFilteredData()}"
              .getActions="${(item: KubernetesCRD) => this.getActions(item)}"
              emptyMessage="No Custom Resource Definitions found"
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
          .title="${this.isEditMode ? 'Edit CRD' : 'Create CRD'}"
          .value="${this.createResourceValue}"
          .format="${this.resourceFormat}"
          .submitLabel="Apply"
          .loading="${this.isCreating}"
          @close="${() => { this.showCreateDrawer = false; }}"
          @create="${this.handleCreateResource}"
        ></create-resource-drawer>

        <notification-container></notification-container>
      </div>

      <crd-instances-drawer
        .show="${this.showInstancesDrawer}"
        .crdName="${this.selectedCRDForInstances?.name || ''}"
        .crdKind="${this.selectedCRDForInstances?.kind || ''}"
        .crdGroup="${this.selectedCRDForInstances?.group || ''}"
        .crdVersion="${this.selectedCRDForInstances?.version || ''}"
        .crdScope="${this.selectedCRDForInstances?.scope || 'Namespaced'}"
        @close="${this.handleInstancesDrawerClose}"
      ></crd-instances-drawer>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'kubernetes-crds': KubernetesCRDs;
  }
}
