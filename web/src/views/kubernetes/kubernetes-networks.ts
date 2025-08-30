import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { KubernetesApi } from '../../services/kubernetes-api.js';
import type {
  KubernetesNamespace,
  KubernetesService,
  KubernetesIngress,
  KubernetesIngressClass,
  KubernetesNetworkPolicy,
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

type NetworkResource = KubernetesService | KubernetesIngress | KubernetesIngressClass | KubernetesNetworkPolicy;

@customElement('kubernetes-networks')
export class KubernetesNetworks extends LitElement {
  @property({ type: Array }) resources: NetworkResource[] = [];
  @property({ type: Array }) namespaces: KubernetesNamespace[] = [];
  @property({ type: String }) selectedNamespace = 'All Namespaces';
  @property({ type: String }) searchQuery = '';
  @property({ type: Boolean }) loading = false;
  @property({ type: String }) error: string | null = null;
  
  @state() private activeTab = 'services';
  @state() private showDetails = false;
  @state() private selectedItem: NetworkResource | null = null;
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
  @state() private editingResource: NetworkResource | null = null;

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
  `;

  private tabs: Tab[] = [
    { id: 'services', label: 'Services' },
    { id: 'ingresses', label: 'Ingresses' },
    { id: 'ingressclasses', label: 'IngressClasses' },
    { id: 'networkpolicies', label: 'NetworkPolicies' }
  ];

  private getColumns(): Column[] {
    if (this.activeTab === 'services') {
      return [
        { key: 'name', label: 'Name', type: 'link' },
        { key: 'namespace', label: 'Namespace' },
        { key: 'type', label: 'Type' },
        { key: 'clusterIP', label: 'Cluster IP' },
        { key: 'ports', label: 'Ports' },
        { key: 'age', label: 'Age' }
      ];
    } else if (this.activeTab === 'ingresses') {
      return [
        { key: 'name', label: 'Name', type: 'link' },
        { key: 'namespace', label: 'Namespace' },
        { key: 'class', label: 'Class' },
        { key: 'hosts', label: 'Hosts' },
        { key: 'address', label: 'Address' },
        { key: 'age', label: 'Age' }
      ];
    } else if (this.activeTab === 'ingressclasses') {
      // IngressClasses columns
      return [
        { key: 'name', label: 'Name', type: 'link' },
        { key: 'controller', label: 'Controller' },
        { key: 'parameters', label: 'Parameters' },
        { key: 'age', label: 'Age' }
      ];
    } else {
      // NetworkPolicies columns
      return [
        { key: 'name', label: 'Name', type: 'link' },
        { key: 'namespace', label: 'Namespace' },
        { key: 'podSelector', label: 'Pod Selector' },
        { key: 'policyTypes', label: 'Policy Types' },
        { key: 'age', label: 'Age' }
      ];
    }
  }

  private getActions(_item: NetworkResource): ActionItem[] {
    return [
      { label: 'View Details', action: 'view' },
      { label: 'Edit', action: 'edit' },
      { label: 'Delete', action: 'delete', danger: true }
    ];
  }

  private getFilteredData(): NetworkResource[] {
    let data = this.resources;

    // For IngressClasses, format parameters for display
    if (this.activeTab === 'ingressclasses') {
      data = data.map(item => {
        const ingressClass = item as KubernetesIngressClass;
        return {
          ...ingressClass,
          parameters: ingressClass.parameters 
            ? `${ingressClass.parameters.kind || '-'}/${ingressClass.parameters.name || '-'}`
            : '-'
        } as any;
      });
    }

    // For NetworkPolicies, format pod selector and policy types for display
    if (this.activeTab === 'networkpolicies') {
      data = data.map(item => {
        const policy = item as KubernetesNetworkPolicy;
        return {
          ...policy,
          podSelector: policy.podSelector && Object.keys(policy.podSelector).length > 0
            ? Object.entries(policy.podSelector).map(([k, v]) => `${k}=${v}`).join(', ')
            : 'All Pods',
          policyTypes: policy.policyTypes ? policy.policyTypes.join(', ') : '-'
        } as any;
      });
    }

    if (this.searchQuery) {
      data = data.filter(item => 
        JSON.stringify(item).toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    }

    return data;
  }

  private getResourceType(): string {
    if (this.activeTab === 'services') return 'Service';
    if (this.activeTab === 'ingresses') return 'Ingress';
    if (this.activeTab === 'ingressclasses') return 'IngressClass';
    return 'NetworkPolicy';
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
    const item = event.detail.item as NetworkResource;
    this.viewDetails(item);
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

  private async viewDetails(item: NetworkResource) {
    this.selectedItem = item;
    this.showDetails = true;
    this.loadingDetails = true;
    
    try {
      const resourceType = this.getResourceType();
      // IngressClass doesn't have namespace
      const namespace = 'namespace' in item ? item.namespace : undefined;
      this.detailsData = await KubernetesApi.getResourceDetails(resourceType, item.name, namespace);
    } catch (error) {
      console.error('Failed to fetch details:', error);
      this.detailsData = null;
    } finally {
      this.loadingDetails = false;
    }
  }

  private async editItem(item: NetworkResource) {
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
      // IngressClass doesn't have namespace
      const namespace = 'namespace' in item ? item.namespace : undefined;
      const resourceContent = await KubernetesApi.getResourceRaw(
        resourceType,
        item.name,
        namespace,
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

  private deleteItem(item: NetworkResource) {
    const resourceType = this.getResourceType();
    // IngressClass doesn't have namespace
    const namespace = 'namespace' in item ? item.namespace : undefined;
    this.itemToDelete = {
      type: resourceType,
      name: item.name,
      namespace: namespace
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
    if (this.activeTab === 'services') {
      this.createDrawerTitle = 'Create Service';
      this.createResourceValue = `apiVersion: v1\nkind: Service\nmetadata:\n  name: my-service\n  namespace: ${ns}\nspec:\n  selector:\n    app: my-app\n  ports:\n    - protocol: TCP\n      port: 80\n      targetPort: 8080\n  type: ClusterIP`;
      this.showCreateDrawer = true;
    } else if (this.activeTab === 'ingresses') {
      this.createDrawerTitle = 'Create Ingress';
      this.createResourceValue = `apiVersion: networking.k8s.io/v1\nkind: Ingress\nmetadata:\n  name: my-ingress\n  namespace: ${ns}\nspec:\n  rules:\n    - host: example.com\n      http:\n        paths:\n          - path: /\n            pathType: Prefix\n            backend:\n              service:\n                name: my-service\n                port:\n                  number: 80`;
      this.showCreateDrawer = true;
    } else if (this.activeTab === 'ingressclasses') {
      this.createDrawerTitle = 'Create IngressClass';
      this.createResourceValue = `apiVersion: networking.k8s.io/v1\nkind: IngressClass\nmetadata:\n  name: my-ingressclass\n  annotations:\n    ingressclass.kubernetes.io/is-default-class: "false"\nspec:\n  controller: example.com/ingress-controller`;
      this.showCreateDrawer = true;
    } else {
      this.createDrawerTitle = 'Create NetworkPolicy';
      this.createResourceValue = `apiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata:\n  name: my-network-policy\n  namespace: ${ns}\nspec:\n  podSelector:\n    matchLabels:\n      app: my-app\n  policyTypes:\n    - Ingress\n    - Egress\n  ingress:\n    - from:\n        - podSelector:\n            matchLabels:\n              app: allowed-app\n      ports:\n        - protocol: TCP\n          port: 80\n  egress:\n    - to:\n        - podSelector:\n            matchLabels:\n              app: database\n      ports:\n        - protocol: TCP\n          port: 5432`;
      this.showCreateDrawer = true;
    }
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
        // IngressClass doesn't have namespace
        const namespace = 'namespace' in this.editingResource ? this.editingResource.namespace : undefined;
        await KubernetesApi.updateResource(
          resourceType,
          this.editingResource.name,
          namespace,
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
      
      if (this.activeTab === 'services') {
        const services = await KubernetesApi.getServices(namespace);
        this.resources = services;
      } else if (this.activeTab === 'ingresses') {
        const ingresses = await KubernetesApi.getIngresses(namespace);
        this.resources = ingresses;
      } else if (this.activeTab === 'ingressclasses') {
        // IngressClasses are cluster-scoped, no namespace filter
        const ingressClasses = await KubernetesApi.getIngressClasses();
        this.resources = ingressClasses;
      } else {
        // NetworkPolicies are namespace-scoped
        const networkPolicies = await KubernetesApi.getNetworkPolicies(namespace);
        this.resources = networkPolicies;
      }
    } catch (error: any) {
      console.error('Failed to fetch network resources:', error);
      this.error = error.message || 'Failed to fetch network resources';
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
          ${this.activeTab !== 'ingressclasses' ? html`
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
          ${this.loading ? html`
            <loading-state message="Loading network resources..."></loading-state>
          ` : this.error ? html`
            <empty-state 
              message="${this.error}" 
              icon="⚠️"
            ></empty-state>
          ` : html`
            <resource-table
              .columns="${this.getColumns()}"
              .data="${this.getFilteredData()}"
              .getActions="${(item: NetworkResource) => this.getActions(item)}"
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
    'kubernetes-networks': KubernetesNetworks;
  }
}
