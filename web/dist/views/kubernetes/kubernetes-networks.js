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
import '../../components/drawers/create-resource-drawer';
import '../../components/ui/notification-container';
let KubernetesNetworks = class KubernetesNetworks extends LitElement {
    constructor() {
        super(...arguments);
        this.resources = [];
        this.namespaces = [];
        this.selectedNamespace = 'All Namespaces';
        this.searchQuery = '';
        this.loading = false;
        this.error = null;
        this.activeTab = 'services';
        this.showDetails = false;
        this.selectedItem = null;
        this.loadingDetails = false;
        this.detailsData = null;
        this.showDeleteModal = false;
        this.itemToDelete = null;
        this.isDeleting = false;
        this.showCreateDrawer = false;
        this.createResourceValue = '';
        this.createDrawerTitle = 'Create Resource';
        this.isCreating = false;
        this.tabs = [
            { id: 'services', label: 'Services' },
            { id: 'ingresses', label: 'Ingresses' },
            { id: 'ingressclasses', label: 'IngressClasses' },
            { id: 'networkpolicies', label: 'NetworkPolicies' }
        ];
    }
    getColumns() {
        if (this.activeTab === 'services') {
            return [
                { key: 'name', label: 'Name', type: 'link' },
                { key: 'namespace', label: 'Namespace' },
                { key: 'type', label: 'Type' },
                { key: 'clusterIP', label: 'Cluster IP' },
                { key: 'ports', label: 'Ports' },
                { key: 'age', label: 'Age' }
            ];
        }
        else if (this.activeTab === 'ingresses') {
            return [
                { key: 'name', label: 'Name', type: 'link' },
                { key: 'namespace', label: 'Namespace' },
                { key: 'class', label: 'Class' },
                { key: 'hosts', label: 'Hosts' },
                { key: 'address', label: 'Address' },
                { key: 'age', label: 'Age' }
            ];
        }
        else if (this.activeTab === 'ingressclasses') {
            return [
                { key: 'name', label: 'Name', type: 'link' },
                { key: 'controller', label: 'Controller' },
                { key: 'parameters', label: 'Parameters' },
                { key: 'age', label: 'Age' }
            ];
        }
        else {
            return [
                { key: 'name', label: 'Name', type: 'link' },
                { key: 'namespace', label: 'Namespace' },
                { key: 'podSelector', label: 'Pod Selector' },
                { key: 'policyTypes', label: 'Policy Types' },
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
        if (this.activeTab === 'ingressclasses') {
            data = data.map(item => {
                const ingressClass = item;
                return {
                    ...ingressClass,
                    parameters: ingressClass.parameters
                        ? `${ingressClass.parameters.kind || '-'}/${ingressClass.parameters.name || '-'}`
                        : '-'
                };
            });
        }
        if (this.activeTab === 'networkpolicies') {
            data = data.map(item => {
                const policy = item;
                return {
                    ...policy,
                    podSelector: policy.podSelector && Object.keys(policy.podSelector).length > 0
                        ? Object.entries(policy.podSelector).map(([k, v]) => `${k}=${v}`).join(', ')
                        : 'All Pods',
                    policyTypes: policy.policyTypes ? policy.policyTypes.join(', ') : '-'
                };
            });
        }
        if (this.searchQuery) {
            data = data.filter(item => JSON.stringify(item).toLowerCase().includes(this.searchQuery.toLowerCase()));
        }
        return data;
    }
    getResourceType() {
        if (this.activeTab === 'services')
            return 'Service';
        if (this.activeTab === 'ingresses')
            return 'Ingress';
        if (this.activeTab === 'ingressclasses')
            return 'IngressClass';
        return 'NetworkPolicy';
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
        const item = event.detail.item;
        this.viewDetails(item);
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
            const namespace = 'namespace' in item ? item.namespace : undefined;
            this.detailsData = await KubernetesApi.getResourceDetails(resourceType, item.name, namespace);
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
        const namespace = 'namespace' in item ? item.namespace : undefined;
        this.itemToDelete = {
            type: resourceType,
            name: item.name,
            namespace: namespace
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
        const ns = this.selectedNamespace === 'All Namespaces' ? 'default' : this.selectedNamespace;
        if (this.activeTab === 'services') {
            this.createDrawerTitle = 'Create Service';
            this.createResourceValue = `apiVersion: v1\nkind: Service\nmetadata:\n  name: my-service\n  namespace: ${ns}\nspec:\n  selector:\n    app: my-app\n  ports:\n    - protocol: TCP\n      port: 80\n      targetPort: 8080\n  type: ClusterIP`;
            this.showCreateDrawer = true;
        }
        else if (this.activeTab === 'ingresses') {
            this.createDrawerTitle = 'Create Ingress';
            this.createResourceValue = `apiVersion: networking.k8s.io/v1\nkind: Ingress\nmetadata:\n  name: my-ingress\n  namespace: ${ns}\nspec:\n  rules:\n    - host: example.com\n      http:\n        paths:\n          - path: /\n            pathType: Prefix\n            backend:\n              service:\n                name: my-service\n                port:\n                  number: 80`;
            this.showCreateDrawer = true;
        }
        else if (this.activeTab === 'ingressclasses') {
            this.createDrawerTitle = 'Create IngressClass';
            this.createResourceValue = `apiVersion: networking.k8s.io/v1\nkind: IngressClass\nmetadata:\n  name: my-ingressclass\n  annotations:\n    ingressclass.kubernetes.io/is-default-class: "false"\nspec:\n  controller: example.com/ingress-controller`;
            this.showCreateDrawer = true;
        }
        else {
            this.createDrawerTitle = 'Create NetworkPolicy';
            this.createResourceValue = `apiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata:\n  name: my-network-policy\n  namespace: ${ns}\nspec:\n  podSelector:\n    matchLabels:\n      app: my-app\n  policyTypes:\n    - Ingress\n    - Egress\n  ingress:\n    - from:\n        - podSelector:\n            matchLabels:\n              app: allowed-app\n      ports:\n        - protocol: TCP\n          port: 80\n  egress:\n    - to:\n        - podSelector:\n            matchLabels:\n              app: database\n      ports:\n        - protocol: TCP\n          port: 5432`;
            this.showCreateDrawer = true;
        }
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
                const createdType = this.getResourceType();
                nc.addNotification({ type: 'success', message: `${createdType} created successfully` });
            }
        }
        catch (err) {
            const nc = this.shadowRoot?.querySelector('notification-container');
            if (nc && typeof nc.addNotification === 'function') {
                nc.addNotification({ type: 'error', message: `Failed to create resource: ${err?.message || 'Unknown error'}` });
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
    async fetchData() {
        this.loading = true;
        this.error = null;
        try {
            if (this.namespaces.length === 0) {
                this.namespaces = await KubernetesApi.getNamespaces();
            }
            const namespace = this.selectedNamespace === 'All Namespaces' ? undefined : this.selectedNamespace;
            if (this.activeTab === 'services') {
                const services = await KubernetesApi.getServices(namespace);
                this.resources = services;
            }
            else if (this.activeTab === 'ingresses') {
                const ingresses = await KubernetesApi.getIngresses(namespace);
                this.resources = ingresses;
            }
            else if (this.activeTab === 'ingressclasses') {
                const ingressClasses = await KubernetesApi.getIngressClasses();
                this.resources = ingressClasses;
            }
            else {
                const networkPolicies = await KubernetesApi.getNetworkPolicies(namespace);
                this.resources = networkPolicies;
            }
        }
        catch (error) {
            console.error('Failed to fetch network resources:', error);
            this.error = error.message || 'Failed to fetch network resources';
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
          ${this.activeTab !== 'ingressclasses' ? html `
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
            placeholder="Search network resources..."
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
            <loading-state message="Loading network resources..."></loading-state>
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

        <create-resource-drawer
          .show="${this.showCreateDrawer}"
          .title="${this.createDrawerTitle}"
          .value="${this.createResourceValue}"
          .submitLabel="Apply"
          .loading="${this.isCreating}"
          @close="${() => { this.showCreateDrawer = false; }}"
          @create="${this.handleCreateResource}"
        ></create-resource-drawer>

        <notification-container></notification-container>
      </div>
    `;
    }
};
KubernetesNetworks.styles = css `
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
  `;
__decorate([
    property({ type: Array })
], KubernetesNetworks.prototype, "resources", void 0);
__decorate([
    property({ type: Array })
], KubernetesNetworks.prototype, "namespaces", void 0);
__decorate([
    property({ type: String })
], KubernetesNetworks.prototype, "selectedNamespace", void 0);
__decorate([
    property({ type: String })
], KubernetesNetworks.prototype, "searchQuery", void 0);
__decorate([
    property({ type: Boolean })
], KubernetesNetworks.prototype, "loading", void 0);
__decorate([
    property({ type: String })
], KubernetesNetworks.prototype, "error", void 0);
__decorate([
    state()
], KubernetesNetworks.prototype, "activeTab", void 0);
__decorate([
    state()
], KubernetesNetworks.prototype, "showDetails", void 0);
__decorate([
    state()
], KubernetesNetworks.prototype, "selectedItem", void 0);
__decorate([
    state()
], KubernetesNetworks.prototype, "loadingDetails", void 0);
__decorate([
    state()
], KubernetesNetworks.prototype, "detailsData", void 0);
__decorate([
    state()
], KubernetesNetworks.prototype, "showDeleteModal", void 0);
__decorate([
    state()
], KubernetesNetworks.prototype, "itemToDelete", void 0);
__decorate([
    state()
], KubernetesNetworks.prototype, "isDeleting", void 0);
__decorate([
    state()
], KubernetesNetworks.prototype, "showCreateDrawer", void 0);
__decorate([
    state()
], KubernetesNetworks.prototype, "createResourceValue", void 0);
__decorate([
    state()
], KubernetesNetworks.prototype, "createDrawerTitle", void 0);
__decorate([
    state()
], KubernetesNetworks.prototype, "isCreating", void 0);
KubernetesNetworks = __decorate([
    customElement('kubernetes-networks')
], KubernetesNetworks);
export { KubernetesNetworks };
//# sourceMappingURL=kubernetes-networks.js.map