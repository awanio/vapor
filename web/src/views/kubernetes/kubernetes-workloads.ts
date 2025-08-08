import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { KubernetesApi } from '../../services/kubernetes-api.js';
import type {
  KubernetesNamespace,
  KubernetesPod,
  KubernetesDeployment,
  KubernetesStatefulSet,
  KubernetesDaemonSet,
  KubernetesJob,
  KubernetesCronJob,
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

type WorkloadResource = KubernetesPod | KubernetesDeployment | KubernetesStatefulSet | KubernetesDaemonSet | KubernetesJob | KubernetesCronJob;

@customElement('kubernetes-workloads')
export class KubernetesWorkloads extends LitElement {
  @property({ type: Array }) workloads: WorkloadResource[] = [];
  @property({ type: Array }) namespaces: KubernetesNamespace[] = [];
  @property({ type: String }) selectedNamespace = 'All Namespaces';
  @property({ type: String }) searchQuery = '';
  @property({ type: Boolean }) loading = false;
  @property({ type: String }) error: string | null = null;
  
  @state() private activeTab = 'pods';
  @state() private showDetails = false;
  @state() private selectedItem: WorkloadResource | null = null;
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
  `;

  private tabs: Tab[] = [
    { id: 'pods', label: 'Pods' },
    { id: 'deployments', label: 'Deployments' },
    { id: 'statefulsets', label: 'StatefulSets' },
    { id: 'daemonsets', label: 'DaemonSets' },
    { id: 'jobs', label: 'Jobs' },
    { id: 'cronjobs', label: 'CronJobs' }
  ];

  private getColumns(): Column[] {
    const baseColumns: Column[] = [
      { key: 'name', label: 'Name', type: 'link' },
      { key: 'type', label: 'Type' },
      { key: 'namespace', label: 'Namespace' },
      { key: 'status', label: 'Status', type: 'status' }
    ];

    // Customize columns based on active tab
    if (this.activeTab === 'cronjobs') {
      baseColumns.push({ key: 'replicas', label: 'Schedule' });
    } else if (this.activeTab === 'jobs') {
      baseColumns.push({ key: 'replicas', label: 'Completions' });
    } else {
      baseColumns.push({ key: 'replicas', label: 'Replicas' });
    }

    baseColumns.push({ key: 'age', label: 'Age' });
    return baseColumns;
  }

  private getActions(item: WorkloadResource): ActionItem[] {
    const actions: ActionItem[] = [
      { label: 'View Details', action: 'view' }
    ];

    if ('status' in item && item.type === 'Pod') {
      actions.push({ label: 'View Logs', action: 'logs' });
    }

    actions.push(
      { label: 'Edit', action: 'edit' },
      { label: 'Delete', action: 'delete', danger: true }
    );

    return actions;
  }

  private getFilteredData(): WorkloadResource[] {
    let data = this.workloads;

    if (this.searchQuery) {
      data = data.filter(item => 
        JSON.stringify(item).toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    }

    return data;
  }

  private getResourceType(): string {
    const typeMap: { [key: string]: string } = {
      'pods': 'Pod',
      'deployments': 'Deployment',
      'statefulsets': 'StatefulSet',
      'daemonsets': 'DaemonSet',
      'jobs': 'Job',
      'cronjobs': 'CronJob'
    };
    return typeMap[this.activeTab] || 'Pod';
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
    const item = event.detail.item as WorkloadResource;
    this.viewDetails(item);
  }

  private handleAction(event: CustomEvent) {
    const { action, item } = event.detail;
    
    switch (action) {
      case 'view':
        this.viewDetails(item);
        break;
      case 'logs':
        this.viewLogs(item);
        break;
      case 'edit':
        this.editItem(item);
        break;
      case 'delete':
        this.deleteItem(item);
        break;
    }
  }

  private async viewDetails(item: WorkloadResource) {
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


  private viewLogs(item: WorkloadResource) {
    console.log('View logs for:', item);
    // Implement logs viewer
  }

  private editItem(item: WorkloadResource) {
    console.log('Edit item:', item);
    // Implement edit functionality
  }

  private deleteItem(item: WorkloadResource) {
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
    console.log('Create new resource');
    // Implement create functionality
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
      // Fetch namespaces first
      this.namespaces = await KubernetesApi.getNamespaces();
      
      // Fetch workloads based on active tab
      const namespace = this.selectedNamespace === 'All Namespaces' ? undefined : this.selectedNamespace;
      let data: WorkloadResource[] = [];
      
      switch (this.activeTab) {
        case 'pods':
          const pods = await KubernetesApi.getPods(namespace);
          data = pods.map(pod => ({ ...pod, type: 'Pod' as const }));
          break;
        case 'deployments':
          const deployments = await KubernetesApi.getDeployments(namespace);
          data = deployments.map(dep => ({ ...dep, type: 'Deployment' as const, replicas: dep.ready }));
          break;
        case 'statefulsets':
          const statefulsets = await KubernetesApi.getStatefulSets(namespace);
          data = statefulsets.map(sts => ({ ...sts, type: 'StatefulSet' as const, replicas: sts.ready }));
          break;
        case 'daemonsets':
          const daemonsets = await KubernetesApi.getDaemonSets(namespace);
          data = daemonsets.map(ds => ({ ...ds, type: 'DaemonSet' as const, replicas: `${ds.ready}/${ds.desired}` }));
          break;
        case 'jobs':
          const jobs = await KubernetesApi.getJobs(namespace);
          data = jobs.map(job => ({ ...job, type: 'Job' as const, replicas: job.completions }));
          break;
        case 'cronjobs':
          const cronjobs = await KubernetesApi.getCronJobs(namespace);
          data = cronjobs.map(cj => ({ ...cj, type: 'CronJob' as const, replicas: cj.schedule }));
          break;
      }
      
      this.workloads = data;
    } catch (error: any) {
      console.error('Failed to fetch workloads:', error);
      this.error = error.message || 'Failed to fetch workloads';
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
            placeholder="Search workloads..."
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
            <loading-state message="Loading workloads..."></loading-state>
          ` : this.error ? html`
            <empty-state 
              message="${this.error}" 
              icon="⚠️"
            ></empty-state>
          ` : html`
            <resource-table
              .columns="${this.getColumns()}"
              .data="${this.getFilteredData()}"
              .getActions="${(item: WorkloadResource) => this.getActions(item)}"
              emptyMessage="No ${this.activeTab} found"
              @cell-click="${this.handleCellClick}"
              @action="${this.handleAction}"
            ></resource-table>
          `}
        </div>

        <detail-drawer
          .show="${this.showDetails}"
          .loading="${this.loadingDetails}"
          title="${this.selectedItem?.type} Details"
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
    'kubernetes-workloads': KubernetesWorkloads;
  }
}
