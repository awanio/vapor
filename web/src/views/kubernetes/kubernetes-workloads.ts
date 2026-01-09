import { LitElement, html, css } from 'lit';
import { keyed } from 'lit/directives/keyed.js';
import { customElement, property, state } from 'lit/decorators.js';
import { KubernetesApi } from '../../services/kubernetes-api.js';
import { subscribeToEventsChannel } from '../../stores/shared/events-stream';
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
import '../../components/drawers/logs-drawer.js';
import '../../components/modals/delete-modal.js';
import '../../components/modals/set-image-modal.js';
import '../../components/kubernetes/resource-detail-view.js';
import '../../components/drawers/create-resource-drawer';
import '../../components/ui/notification-container';
import type { Tab } from '../../components/tabs/tab-group.js';
import type { Column } from '../../components/tables/resource-table.js';
import type { ActionItem } from '../../components/ui/action-dropdown.js';
import type { DeleteItem } from '../../components/modals/delete-modal.js';
import type { ContainerImage } from '../../components/modals/set-image-modal.js';

type WorkloadResource = KubernetesPod | KubernetesDeployment | KubernetesStatefulSet | KubernetesDaemonSet | KubernetesJob | KubernetesCronJob;

@customElement('kubernetes-workloads')
export class KubernetesWorkloads extends LitElement {
  @property({ type: Array }) workloads: WorkloadResource[] = [];
  @property({ type: Array }) namespaces: KubernetesNamespace[] = [];
  @property({ type: String }) selectedNamespace = 'default';
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
  @state() private showCreateDrawer = false;
  @state() private createResourceValue = '';
  @state() private createDrawerTitle = 'Create Resource';
  @state() private isCreating = false;
  @state() private showLogsDrawer = false;
  @state() private logsData = '';
  @state() private logsLoading = false;
  @state() private logsError = '';
  @state() private logsPodName = '';
  @state() private logsNamespace = '';
  @state() private resourceFormat: 'yaml' | 'json' = 'yaml';
  @state() private isEditMode = false;
  @state() private editingResource: WorkloadResource | null = null;
  @state() private showRestartModal = false;
  @state() private showRollbackModal = false;
  @state() private showSetImageModal = false;
  @state() private workloadToRestart: WorkloadResource | null = null;
  @state() private workloadToRollback: WorkloadResource | null = null;
  @state() private workloadForSetImage: WorkloadResource | null = null;
  @state() private containerImages: ContainerImage[] = [];
  @state() private isPerformingAction = false;

  // Live events stream (Kubernetes pods)
  @state() private k8sEventsLive = false;
  private unsubscribeK8sEvents: (() => void) | null = null;
  private k8sPollingTimer: number | null = null;
  private k8sRefetchTimer: number | null = null;
  private k8sDropNotified = false;
  private isSwitchingNamespace = false;
  private k8sHasConnectedOnce = false;

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

    .live-indicator {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 999px;
      border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border, #454545));
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      user-select: none;
    }

    .live-indicator .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: rgba(204, 204, 204, 0.5);
    }

    .live-indicator.on {
      border-color: rgba(137, 209, 133, 0.6);
      color: rgba(137, 209, 133, 1);
    }

    .live-indicator.on .dot {
      background: rgba(137, 209, 133, 1);
    }

    .live-indicator.off {
      opacity: 0.75;
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
      // Add Set Image action for Pods (no restart/rollback for pods)
      actions.push({ label: 'Set Image', action: 'set-image' });
    }

    // Add rollout actions for deployable resources
    if (item.type === 'Deployment' || item.type === 'StatefulSet' || item.type === 'DaemonSet') {
      actions.push(
        { label: 'Restart', action: 'restart' },
        { label: 'Rollback', action: 'rollback' },
        { label: 'Set Image', action: 'set-image' }
      );
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
    this.isSwitchingNamespace = true;
    this.stopK8sEventStream();
    this.selectedNamespace = event.detail.namespace;
    try {
      await this.fetchData();
    } finally {
      this.startK8sEventStream();
      this.isSwitchingNamespace = false;
    }
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
      case 'restart':
        this.restartWorkload(item);
        break;
      case 'rollback':
        this.rollbackWorkload(item);
        break;
      case 'set-image':
        this.setWorkloadImage(item);
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


  private async viewLogs(item: WorkloadResource) {
    if (item.type !== 'Pod') return;
    
    this.logsPodName = item.name;
    this.logsNamespace = item.namespace;
    this.showLogsDrawer = true;
    this.logsLoading = true;
    this.logsError = '';
    
    try {
      const logs = await KubernetesApi.getPodLogs(item.name, item.namespace);
      this.logsData = logs;
    } catch (error: any) {
      console.error('Failed to fetch pod logs:', error);
      this.logsError = error.message || 'Failed to fetch logs';
    } finally {
      this.logsLoading = false;
    }
  }

  private async editItem(item: WorkloadResource) {
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
    this.isEditMode = false;
    this.editingResource = null;
    // Reset to YAML format for new resources
    this.resourceFormat = 'yaml';
    const ns = this.selectedNamespace === 'All Namespaces' ? 'default' : this.selectedNamespace;
    switch ((this.activeTab || '').toLowerCase()) {
      case 'pods':
        this.createDrawerTitle = 'Create Pod';
        this.createResourceValue = `apiVersion: v1\nkind: Pod\nmetadata:\n  name: my-pod\n  namespace: ${ns}\nspec:\n  containers:\n  - name: nginx\n    image: nginx:latest\n    ports:\n    - containerPort: 80`;
        break;
      case 'deployments':
        this.createDrawerTitle = 'Create Deployment';
        this.createResourceValue = `apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: my-deployment\n  namespace: ${ns}\nspec:\n  replicas: 3\n  selector:\n    matchLabels:\n      app: my-app\n  template:\n    metadata:\n      labels:\n        app: my-app\n    spec:\n      containers:\n      - name: nginx\n        image: nginx:latest\n        ports:\n        - containerPort: 80`;
        break;
      case 'statefulsets':
        this.createDrawerTitle = 'Create StatefulSet';
        this.createResourceValue = `apiVersion: apps/v1\nkind: StatefulSet\nmetadata:\n  name: my-statefulset\n  namespace: ${ns}\nspec:\n  serviceName: my-service\n  replicas: 3\n  selector:\n    matchLabels:\n      app: my-app\n  template:\n    metadata:\n      labels:\n        app: my-app\n    spec:\n      containers:\n      - name: nginx\n        image: nginx:latest\n        ports:\n        - containerPort: 80`;
        break;
      case 'daemonsets':
        this.createDrawerTitle = 'Create DaemonSet';
        this.createResourceValue = `apiVersion: apps/v1\nkind: DaemonSet\nmetadata:\n  name: my-daemonset\n  namespace: ${ns}\nspec:\n  selector:\n    matchLabels:\n      app: my-app\n  template:\n    metadata:\n      labels:\n        app: my-app\n    spec:\n      containers:\n      - name: nginx\n        image: nginx:latest`;
        break;
      case 'jobs':
        this.createDrawerTitle = 'Create Job';
        this.createResourceValue = `apiVersion: batch/v1\nkind: Job\nmetadata:\n  name: my-job\n  namespace: ${ns}\nspec:\n  template:\n    spec:\n      containers:\n      - name: hello\n        image: busybox\n        command: ['sh', '-c', 'echo "Hello, Kubernetes!" && sleep 30']\n      restartPolicy: Never\n  backoffLimit: 4`;
        break;
      case 'cronjobs':
        this.createDrawerTitle = 'Create CronJob';
        this.createResourceValue = `apiVersion: batch/v1\nkind: CronJob\nmetadata:\n  name: my-cronjob\n  namespace: ${ns}\nspec:\n  schedule: "*/5 * * * *"\n  jobTemplate:\n    spec:\n      template:\n        spec:\n          containers:\n          - name: hello\n            image: busybox\n            command: ['sh', '-c', 'date; echo Hello from the Kubernetes cluster']\n          restartPolicy: OnFailure`;
        break;
      default:
        const nc = this.shadowRoot?.querySelector('notification-container') as any;
        if (nc && typeof nc.addNotification === 'function') {
          nc.addNotification({ type: 'info', message: `Create is not yet available for ${this.activeTab}.` });
        }
        return;
    }
    this.showCreateDrawer = true;
  }

  private async handleCreateResource(event: CustomEvent) {
    // Accept YAML or JSON from drawer
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
        nc.addNotification({ 
          type: 'success', 
          message: this.isEditMode ? 'Resource updated successfully' : 'Resource created successfully' 
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

  private handleLogsClose() {
    this.showLogsDrawer = false;
    this.logsData = '';
    this.logsError = '';
  }

  // Workload rollout actions
  private restartWorkload(workload: WorkloadResource) {
    this.workloadToRestart = workload;
    this.showRestartModal = true;
    
    // Force update modal properties via direct query
    this.updateComplete.then(() => {
      const modal = this.shadowRoot?.querySelector('#restart-modal') as any;
      if (modal) {
        modal.modalTitle = `Restart ${workload.type}`;
        modal.message = `Are you sure you want to restart this ${workload.type?.toLowerCase()}? All pods will be recreated.`;
        modal.confirmLabel = 'Restart';
        modal.confirmButtonClass = 'confirm';
        modal.requestUpdate();
      }
    });
  }

  private async handleConfirmRestart() {
    if (!this.workloadToRestart) return;

    this.isPerformingAction = true;
    
    try {
      // Call the appropriate API method based on workload type
      if (this.workloadToRestart.type === 'Deployment') {
        await KubernetesApi.restartDeployment(
          this.workloadToRestart.namespace,
          this.workloadToRestart.name
        );
      } else if (this.workloadToRestart.type === 'StatefulSet') {
        await KubernetesApi.restartStatefulSet(
          this.workloadToRestart.namespace,
          this.workloadToRestart.name
        );
      } else if (this.workloadToRestart.type === 'DaemonSet') {
        await KubernetesApi.restartDaemonSet(
          this.workloadToRestart.namespace,
          this.workloadToRestart.name
        );
      }
      
      // Refresh data
      await this.fetchData();
      
      // Show success notification
      const workloadName = this.workloadToRestart.name;
      const workloadType = this.workloadToRestart.type;
      
      // Close modal
      this.showRestartModal = false;
      this.workloadToRestart = null;
      const nc = this.shadowRoot?.querySelector('notification-container') as any;
      if (nc && typeof nc.addNotification === 'function') {
        nc.addNotification({ 
          type: 'success', 
          message: `${workloadType} ${workloadName} restarted successfully` 
        });
      }
    } catch (error: any) {
      console.error('Failed to restart workload:', error);
      const nc = this.shadowRoot?.querySelector('notification-container') as any;
      if (nc && typeof nc.addNotification === 'function') {
        nc.addNotification({ 
          type: 'error', 
          message: `Failed to restart ${this.workloadToRestart?.type?.toLowerCase() || 'workload'}: ${error.message || 'Unknown error'}` 
        });
      }
    } finally {
      this.isPerformingAction = false;
    }
  }

  private handleCancelRestart() {
    this.showRestartModal = false;
    this.workloadToRestart = null;
    // Force update to reset modal
    this.requestUpdate();
  }

  private rollbackWorkload(workload: WorkloadResource) {
    this.workloadToRollback = workload;
    this.showRollbackModal = true;
    
    // Force update modal properties via direct query
    this.updateComplete.then(() => {
      const modal = this.shadowRoot?.querySelector('#rollback-modal') as any;
      if (modal) {
        modal.modalTitle = `Rollback ${workload.type}`;
        modal.message = `Are you sure you want to rollback this ${workload.type?.toLowerCase()} to the previous revision?`;
        modal.confirmLabel = 'Rollback';
        modal.confirmButtonClass = 'confirm';
        modal.requestUpdate();
      }
    });
  }

  private async handleConfirmRollback() {
    if (!this.workloadToRollback) return;

    this.isPerformingAction = true;
    
    try {
      // Call the appropriate API method based on workload type
      if (this.workloadToRollback.type === 'Deployment') {
        await KubernetesApi.rollbackDeployment(
          this.workloadToRollback.namespace,
          this.workloadToRollback.name
        );
      } else if (this.workloadToRollback.type === 'StatefulSet') {
        await KubernetesApi.rollbackStatefulSet(
          this.workloadToRollback.namespace,
          this.workloadToRollback.name
        );
      } else if (this.workloadToRollback.type === 'DaemonSet') {
        await KubernetesApi.rollbackDaemonSet(
          this.workloadToRollback.namespace,
          this.workloadToRollback.name
        );
      }
      
      // Refresh data
      await this.fetchData();
      
      // Show success notification
      const workloadName = this.workloadToRollback.name;
      const workloadType = this.workloadToRollback.type;
      
      // Close modal
      this.showRollbackModal = false;
      this.workloadToRollback = null;
      const nc = this.shadowRoot?.querySelector('notification-container') as any;
      if (nc && typeof nc.addNotification === 'function') {
        nc.addNotification({ 
          type: 'success', 
          message: `${workloadType} ${workloadName} rolled back successfully` 
        });
      }
    } catch (error: any) {
      console.error('Failed to rollback workload:', error);
      const nc = this.shadowRoot?.querySelector('notification-container') as any;
      if (nc && typeof nc.addNotification === 'function') {
        nc.addNotification({ 
          type: 'error', 
          message: `Failed to rollback ${this.workloadToRollback?.type?.toLowerCase() || 'workload'}: ${error.message || 'Unknown error'}` 
        });
      }
    } finally {
      this.isPerformingAction = false;
    }
  }

  private handleCancelRollback() {
    this.showRollbackModal = false;
    this.workloadToRollback = null;
    // Force update to reset modal
    this.requestUpdate();
  }

  private async setWorkloadImage(workload: WorkloadResource) {
    console.log('Setting workload image for:', workload);
    this.workloadForSetImage = workload;
    
    try {
      // Fetch container information based on workload type
      let containers: Array<{name: string, image: string}> = [];
      
      if (workload.type === 'Pod') {
        containers = await KubernetesApi.getPodContainers(
          workload.namespace,
          workload.name
        );
      } else if (workload.type === 'Deployment') {
        containers = await KubernetesApi.getDeploymentContainers(
          workload.namespace,
          workload.name
        );
      } else if (workload.type === 'StatefulSet') {
        containers = await KubernetesApi.getStatefulSetContainers(
          workload.namespace,
          workload.name
        );
      } else if (workload.type === 'DaemonSet') {
        containers = await KubernetesApi.getDaemonSetContainers(
          workload.namespace,
          workload.name
        );
      }
      
      console.log('Fetched containers:', containers);
      this.containerImages = containers;
      this.showSetImageModal = true;
      console.log('Modal should be visible now, showSetImageModal:', this.showSetImageModal);
    } catch (error: any) {
      console.error('Failed to fetch workload containers:', error);
      const nc = this.shadowRoot?.querySelector('notification-container') as any;
      if (nc && typeof nc.addNotification === 'function') {
        nc.addNotification({ 
          type: 'error', 
          message: `Failed to fetch ${workload.type?.toLowerCase()} containers: ${error.message || 'Unknown error'}` 
        });
      }
    }
  }

  private async handleConfirmSetImage(event: CustomEvent) {
    if (!this.workloadForSetImage) return;

    const { images } = event.detail;
    this.isPerformingAction = true;
    
    try {
      // Call the appropriate API method based on workload type
      if (this.workloadForSetImage.type === 'Pod') {
        await KubernetesApi.setPodImages(
          this.workloadForSetImage.namespace,
          this.workloadForSetImage.name,
          images
        );
      } else if (this.workloadForSetImage.type === 'Deployment') {
        await KubernetesApi.setDeploymentImages(
          this.workloadForSetImage.namespace,
          this.workloadForSetImage.name,
          images
        );
      } else if (this.workloadForSetImage.type === 'StatefulSet') {
        await KubernetesApi.setStatefulSetImages(
          this.workloadForSetImage.namespace,
          this.workloadForSetImage.name,
          images
        );
      } else if (this.workloadForSetImage.type === 'DaemonSet') {
        await KubernetesApi.setDaemonSetImages(
          this.workloadForSetImage.namespace,
          this.workloadForSetImage.name,
          images
        );
      }
      
      // Refresh data
      await this.fetchData();
      
      // Show success notification
      const workloadType = this.workloadForSetImage?.type || 'Workload';
      const nc = this.shadowRoot?.querySelector('notification-container') as any;
      if (nc && typeof nc.addNotification === 'function') {
        nc.addNotification({ 
          type: 'success', 
          message: `${workloadType} images updated successfully` 
        });
      }
      
      // Close modal
      this.showSetImageModal = false;
      this.workloadForSetImage = null;
      this.containerImages = [];
    } catch (error: any) {
      console.error('Failed to set workload images:', error);
      const nc = this.shadowRoot?.querySelector('notification-container') as any;
      if (nc && typeof nc.addNotification === 'function') {
        nc.addNotification({ 
          type: 'error', 
          message: `Failed to update ${this.workloadForSetImage?.type?.toLowerCase() || 'workload'} images: ${error.message || 'Unknown error'}` 
        });
      }
    } finally {
      this.isPerformingAction = false;
    }
  }

  private handleCancelSetImage() {
    this.showSetImageModal = false;
    this.workloadForSetImage = null;
    this.containerImages = [];
  }

  private async handleLogsRefresh() {
    if (!this.logsPodName || !this.logsNamespace) return;
    
    this.logsLoading = true;
    this.logsError = '';
    
    try {
      const logs = await KubernetesApi.getPodLogs(this.logsPodName, this.logsNamespace);
      this.logsData = logs;
    } catch (error: any) {
      console.error('Failed to refresh pod logs:', error);
      this.logsError = error.message || 'Failed to refresh logs';
    } finally {
      this.logsLoading = false;
    }
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

  private showToast(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
    const nc = this.shadowRoot?.querySelector('notification-container') as any;
    if (nc && typeof nc.addNotification === 'function') {
      nc.addNotification({ type, message });
    }
  }

  private startK8sEventStream() {
    if (this.unsubscribeK8sEvents) return;
    this.unsubscribeK8sEvents = subscribeToEventsChannel({
      channel: this.selectedNamespace === 'All Namespaces' ? 'k8s-events' : 'k8s-events:' + this.selectedNamespace,
      routeId: 'kubernetes:k8s-events',
      onEvent: (payload: any) => this.handleK8sEvent(payload),
      onConnectionChange: (connected) => this.handleK8sEventsConnectionChange(connected),
    });
  }

  private stopK8sEventStream() {
    if (this.unsubscribeK8sEvents) {
      this.unsubscribeK8sEvents();
      this.unsubscribeK8sEvents = null;
    }
    if (this.k8sPollingTimer) {
      window.clearInterval(this.k8sPollingTimer);
      this.k8sPollingTimer = null;
    }
    if (this.k8sRefetchTimer) {
      window.clearTimeout(this.k8sRefetchTimer);
      this.k8sRefetchTimer = null;
    }
    this.k8sEventsLive = false;
    this.k8sDropNotified = false;
  }

  private handleK8sEventsConnectionChange(connected: boolean) {
    this.k8sEventsLive = connected;
    if (!connected) {
      if (this.k8sHasConnectedOnce && !this.k8sDropNotified && !this.isSwitchingNamespace) {
        this.showToast('Live Kubernetes updates disconnected — falling back to polling', 'warning');
        this.k8sDropNotified = true;
      }
      this.ensureK8sPolling();
      return;
    }
    this.k8sHasConnectedOnce = true;
    this.k8sDropNotified = false;
    if (this.k8sPollingTimer) {
      window.clearInterval(this.k8sPollingTimer);
      this.k8sPollingTimer = null;
    }
    this.scheduleK8sRefetch('reconnected');
  }

  private ensureK8sPolling() {
    if (this.k8sPollingTimer) return;
    this.k8sPollingTimer = window.setInterval(() => {
      void this.fetchData();
    }, 30000);
  }

  private scheduleK8sRefetch(_reason: string) {
    if (this.k8sRefetchTimer) return;
    this.k8sRefetchTimer = window.setTimeout(async () => {
      this.k8sRefetchTimer = null;
      try {
        await this.fetchData();
      } catch {}
    }, 700);
  }

  private handleK8sEvent(payload: any) {
    if (!payload || payload.kind !== 'k8s-pod') return;

    // Only apply to the Pods tab; other workload types can be reconciled via normal refresh.
    if (this.activeTab !== 'pods') {
      // If user is not on pods, keep it best-effort and avoid churn.
      return;
    }

    const action = String(payload.action || '');
    const name = String(payload.name || '');
    const namespace = String(payload.namespace || '');
    if (!name || !namespace) return;

    // Filter out events that do not match the selected namespace
    if (this.selectedNamespace !== 'All Namespaces' && namespace !== this.selectedNamespace) {
      return;
    }

    if (action === 'DELETED') {
      this.workloads = this.workloads.filter((w) => !(w.type === 'Pod' && w.name === name && w.namespace === namespace));
      return;
    }

    // ADDED / MODIFIED: refetch to update status/ready/restarts accurately.
    this.scheduleK8sRefetch(action);
  }

  override connectedCallback() {
    super.connectedCallback();
    this.startK8sEventStream();
    this.fetchData();
  }


  override disconnectedCallback() {
    super.disconnectedCallback();
    this.stopK8sEventStream();
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
            <span class="live-indicator ${this.k8sEventsLive ? 'on' : 'off'}" title="${this.k8sEventsLive ? 'Live updates connected' : 'Live updates disconnected'}">
              <span class="dot"></span>
              Live
            </span>
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

        ${keyed('delete-modal', html`
          <delete-modal
            id="delete-modal"
            .show="${this.showDeleteModal}"
            .item="${this.itemToDelete}"
            .loading="${this.isDeleting}"
            @confirm-delete="${this.handleConfirmDelete}"
            @cancel-delete="${this.handleCancelDelete}"
          ></delete-modal>
        `)}

        <!-- Restart Confirmation Modal -->
        ${keyed('restart-modal', html`
          <delete-modal
            id="restart-modal"
            .show="${this.showRestartModal}"
          .item="${
            this.workloadToRestart ? {
              type: this.workloadToRestart.type || 'Workload',
              name: this.workloadToRestart.name,
              namespace: this.workloadToRestart.namespace
            } : null
          }"
          .loading="${this.isPerformingAction}"
          .confirmLabel="Restart"
          .confirmButtonClass="confirm"
          .modalTitle="${this.workloadToRestart ? `Restart ${this.workloadToRestart.type}` : 'Restart'}"
          .message="${this.workloadToRestart ? `Are you sure you want to restart this ${this.workloadToRestart.type?.toLowerCase()}? All pods will be recreated.` : ''}"
          @confirm-delete="${this.handleConfirmRestart}"
          @cancel-delete="${this.handleCancelRestart}"
          ></delete-modal>
        `)}

        <!-- Rollback Confirmation Modal -->
        ${keyed('rollback-modal', html`
          <delete-modal
            id="rollback-modal"
            .show="${this.showRollbackModal}"
          .item="${
            this.workloadToRollback ? {
              type: this.workloadToRollback.type || 'Workload',
              name: this.workloadToRollback.name,
              namespace: this.workloadToRollback.namespace
            } : null
          }"
          .loading="${this.isPerformingAction}"
          .confirmLabel="Rollback"
          .confirmButtonClass="confirm"
          .modalTitle="${this.workloadToRollback ? `Rollback ${this.workloadToRollback.type}` : 'Rollback'}"
          .message="${this.workloadToRollback ? `Are you sure you want to rollback this ${this.workloadToRollback.type?.toLowerCase()} to the previous revision?` : ''}"
          @confirm-delete="${this.handleConfirmRollback}"
          @cancel-delete="${this.handleCancelRollback}"
          ></delete-modal>
        `)}

        <!-- Set Image Modal -->
        <set-image-modal
          .show="${this.showSetImageModal}"
          .loading="${this.isPerformingAction}"
          .deploymentName="${this.workloadForSetImage?.name || ''}"
          .namespace="${this.workloadForSetImage?.namespace || ''}"
          .containers="${this.containerImages}"
          @confirm-set-image="${this.handleConfirmSetImage}"
          @cancel-set-image="${this.handleCancelSetImage}"
        ></set-image-modal>
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

        <logs-drawer
          .show="${this.showLogsDrawer}"
          title="Pod Logs"
          .subtitle="${this.logsPodName} (${this.logsNamespace})"
          .logs="${this.logsData}"
          .loading="${this.logsLoading}"
          .error="${this.logsError}"
          @close="${this.handleLogsClose}"
          @refresh="${this.handleLogsRefresh}"
        ></logs-drawer>

        <notification-container></notification-container>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'kubernetes-workloads': KubernetesWorkloads;
  }
}
