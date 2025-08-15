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
import '../../components/tables/resource-table.js';
import '../../components/drawers/detail-drawer.js';
import '../../components/modals/delete-modal.js';
import '../../components/kubernetes/resource-detail-view.js';
import '../../components/kubernetes/crd-instances-drawer.js';
import '../../components/drawers/create-resource-drawer';
import '../../components/ui/notification-container';
let KubernetesCRDs = class KubernetesCRDs extends LitElement {
    constructor() {
        super(...arguments);
        this.resources = [];
        this.searchQuery = '';
        this.loading = false;
        this.error = null;
        this.showDetails = false;
        this.selectedItem = null;
        this.loadingDetails = false;
        this.detailsData = null;
        this.showDeleteModal = false;
        this.itemToDelete = null;
        this.isDeleting = false;
        this.showCreateDrawer = false;
        this.createResourceValue = '';
        this.isCreating = false;
        this.showInstancesDrawer = false;
        this.selectedCRDForInstances = null;
    }
    getColumns() {
        return [
            { key: 'name', label: 'Name', type: 'link' },
            { key: 'group', label: 'Group' },
            { key: 'version', label: 'Version' },
            { key: 'kind', label: 'Kind' },
            { key: 'age', label: 'Age' }
        ];
    }
    getActions(_item) {
        return [
            { label: 'View Details', action: 'view' },
            { label: 'View Instances', action: 'instances' },
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
    handleSearchChange(event) {
        this.searchQuery = event.detail.value;
    }
    handleCellClick(event) {
        const item = event.detail.item;
        this.viewDetails(item);
    }
    handleAction(event) {
        const { action, item } = event.detail;
        switch (action) {
            case 'view':
                this.viewDetails(item);
                break;
            case 'instances':
                this.viewInstances(item);
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
            this.detailsData = await KubernetesApi.getResourceDetails('crd', item.name);
        }
        catch (error) {
            console.error('Failed to fetch CRD details:', error);
            this.detailsData = null;
        }
        finally {
            this.loadingDetails = false;
        }
    }
    viewInstances(item) {
        this.selectedCRDForInstances = item;
        this.showInstancesDrawer = true;
    }
    deleteItem(item) {
        this.itemToDelete = {
            type: 'CustomResourceDefinition',
            name: item.name,
            namespace: undefined
        };
        this.showDeleteModal = true;
    }
    async handleConfirmDelete() {
        if (!this.itemToDelete)
            return;
        this.isDeleting = true;
        try {
            await KubernetesApi.deleteResource('crd', this.itemToDelete.name);
            await this.fetchData();
            this.showDeleteModal = false;
            this.itemToDelete = null;
            const nc = this.shadowRoot?.querySelector('notification-container');
            if (nc && typeof nc.addNotification === 'function') {
                nc.addNotification({ type: 'success', message: 'CRD deleted successfully' });
            }
        }
        catch (error) {
            console.error('Failed to delete CRD:', error);
            const nc = this.shadowRoot?.querySelector('notification-container');
            if (nc && typeof nc.addNotification === 'function') {
                nc.addNotification({ type: 'error', message: 'Failed to delete CRD' });
            }
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
    async handleCreateResource(event) {
        const { resource, format } = event.detail;
        let content = '';
        try {
            content = format === 'json' ? JSON.stringify(resource) : resource.yaml;
            this.isCreating = true;
            await KubernetesApi.createResource(content, format);
            await this.fetchData();
            this.showCreateDrawer = false;
            this.createResourceValue = '';
            const nc = this.shadowRoot?.querySelector('notification-container');
            if (nc && typeof nc.addNotification === 'function') {
                nc.addNotification({ type: 'success', message: 'CRD created successfully' });
            }
        }
        catch (err) {
            const nc = this.shadowRoot?.querySelector('notification-container');
            if (nc && typeof nc.addNotification === 'function') {
                nc.addNotification({ type: 'error', message: `Failed to create CRD: ${err?.message || 'Unknown error'}` });
            }
        }
        finally {
            this.isCreating = false;
        }
    }
    handleDetailsClose() {
        this.showDetails = false;
        this.selectedItem = null;
        this.detailsData = null;
    }
    handleInstancesDrawerClose() {
        this.showInstancesDrawer = false;
        this.selectedCRDForInstances = null;
    }
    async fetchData() {
        this.loading = true;
        this.error = null;
        try {
            const crds = await KubernetesApi.getCRDs();
            this.resources = crds;
        }
        catch (error) {
            console.error('Failed to fetch CRDs:', error);
            this.error = error.message || 'Failed to fetch Custom Resource Definitions';
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
          ${this.loading ? html `
            <loading-state message="Loading Custom Resource Definitions..."></loading-state>
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

        <create-resource-drawer
          .show="${this.showCreateDrawer}"
          .title="Create Custom Resource Definition"
          .value="${this.createResourceValue}"
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
};
KubernetesCRDs.styles = css `
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
__decorate([
    property({ type: Array })
], KubernetesCRDs.prototype, "resources", void 0);
__decorate([
    property({ type: String })
], KubernetesCRDs.prototype, "searchQuery", void 0);
__decorate([
    property({ type: Boolean })
], KubernetesCRDs.prototype, "loading", void 0);
__decorate([
    property({ type: String })
], KubernetesCRDs.prototype, "error", void 0);
__decorate([
    state()
], KubernetesCRDs.prototype, "showDetails", void 0);
__decorate([
    state()
], KubernetesCRDs.prototype, "selectedItem", void 0);
__decorate([
    state()
], KubernetesCRDs.prototype, "loadingDetails", void 0);
__decorate([
    state()
], KubernetesCRDs.prototype, "detailsData", void 0);
__decorate([
    state()
], KubernetesCRDs.prototype, "showDeleteModal", void 0);
__decorate([
    state()
], KubernetesCRDs.prototype, "itemToDelete", void 0);
__decorate([
    state()
], KubernetesCRDs.prototype, "isDeleting", void 0);
__decorate([
    state()
], KubernetesCRDs.prototype, "showCreateDrawer", void 0);
__decorate([
    state()
], KubernetesCRDs.prototype, "createResourceValue", void 0);
__decorate([
    state()
], KubernetesCRDs.prototype, "isCreating", void 0);
__decorate([
    state()
], KubernetesCRDs.prototype, "showInstancesDrawer", void 0);
__decorate([
    state()
], KubernetesCRDs.prototype, "selectedCRDForInstances", void 0);
KubernetesCRDs = __decorate([
    customElement('kubernetes-crds')
], KubernetesCRDs);
export { KubernetesCRDs };
//# sourceMappingURL=kubernetes-crds.js.map