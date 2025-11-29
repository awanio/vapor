/**
 * Enhanced Virtual Machines List View
 * Integrated with Nanostores for state management
 */

import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { StoreController } from '@nanostores/lit';

// Import UI components
import '../../components/ui/search-input.js';
import '../../components/ui/empty-state.js';
import '../../components/ui/loading-state.js';
import '../../components/ui/status-badge.js';
import '../../components/ui/filter-dropdown.js';
import '../../components/tabs/tab-group.js';
import '../../components/tables/resource-table.js';
import '../../components/virtualization/vm-detail-drawer.js';
import '../../components/modals/delete-modal.js';
import '../../components/ui/notification-container.js';
import '../../components/virtualization/create-vm-wizard.js';
import '../../components/virtualization/create-vm-wizard-enhanced.js';

// Import types
import type { Tab } from '../../components/tabs/tab-group.js';
import type { Column } from '../../components/tables/resource-table.js';
import type { ActionItem } from '../../components/ui/action-dropdown.js';


// Import virtualization store and types
import {
  vmStore,
  templateStore,
  $filteredVMs,
  // $activeVMTab, // Unused - using local state instead
  $vmSearchQuery,
  $vmFilterState,
  // $selectedVM, // Unused - using local state instead
  // $vmWizardState, // Reserved for future use
  vmActions,
  consoleActions,
  wizardActions,
  initializeVirtualizationStores,
  $virtualizationEnabled,
  $virtualizationDisabledMessage,
} from '../../stores/virtualization';
import type { VirtualMachine, VMState, VMTemplate } from '../../types/virtualization';
import { VirtualizationDisabledError } from '../../utils/api-errors';


@customElement('virtualization-vms-enhanced')
export class VirtualizationVMsEnhanced extends LitElement {
  private notificationContainer: HTMLElement | null = null;

  private handleShowNotification = (event: Event) => {
    const customEvent = event as CustomEvent<{ message?: string; type?: 'success' | 'error' | 'info' | 'warning'; duration?: number }>;
    const detail = customEvent.detail || {};
    const message = detail.message ?? '';
    const type = detail.type ?? 'info';
    const duration = detail.duration;

    if (!this.notificationContainer || typeof (this.notificationContainer as any).addNotification !== 'function') {
      return;
    }

    if (!message) return;

    (this.notificationContainer as any).addNotification({
      message,
      type,
      duration,
    });

    // Prevent further propagation once we've handled it
    event.stopPropagation();
  };

  // Store controllers for reactive updates
  private vmStoreController = new StoreController(this, vmStore.$items);
  private virtualizationEnabledController = new StoreController(this, $virtualizationEnabled);
  private virtualizationDisabledMessageController = new StoreController(this, $virtualizationDisabledMessage);
  // private templateStoreController = new StoreController(this, templateStore.$items); // Using subscription instead
  private filteredVMsController = new StoreController(this, $filteredVMs);
  // private selectedVMController = new StoreController(this, $selectedVM); // Unused
  // private activeTabController = new StoreController(this, $activeVMTab); // Using local state instead
  private searchQueryController = new StoreController(this, $vmSearchQuery);
  // private filterStateController = new StoreController(this, $vmFilterState); // Unused - managed directly
  // private _wizardStateController = new StoreController(this, $vmWizardState); // Reserved for future use

  // Local UI state
  @state() private showDeleteModal = false;
  @state() private vmToDelete: VirtualMachine | null = null;
  @state() private isDeleting = false;
  @state() private showDetailsDrawer = false;
  @state() private useEnhancedWizard = true; // Toggle for enhanced wizard
  @state() private activeMainTab: 'vms' | 'templates' = 'vms';
  @state() private stateFilter: 'all' | VMState = 'all';
  @state() private templates: VMTemplate[] = [];
  @state() private selectedVMForDetails: VirtualMachine | null = null;

  static override styles = css`
    :host {
      display: block;
      height: 100%;
      box-sizing: border-box;
    }

    .container {
      display: flex;
      flex-direction: column;
      height: 100%;
      gap: 1rem;
    }



    .stats-bar {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px;
      margin-bottom: 1.5rem;
    }

    .stat-widget {
      display: flex;
      flex-direction: column;
      padding: 14px;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-widget-border, var(--vscode-input-border, var(--vscode-panel-border, #454545)));
      border-radius: 8px;
      transition: all 0.2s ease;
      position: relative;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
    }

    .stat-widget:hover {
      border-color: var(--vscode-focusBorder);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      background: rgba(255, 255, 255, 0.02);
    }

    .stat-widget::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      border-radius: 8px 8px 0 0;
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    .stat-widget:hover::before {
      opacity: 1;
    }

    .stat-widget:nth-child(1)::before {
      background: var(--vscode-charts-blue);
    }

    .stat-widget:nth-child(2)::before {
      background: var(--vscode-charts-green);
    }

    .stat-widget:nth-child(3)::before {
      background: var(--vscode-charts-red);
    }

    .stat-widget:nth-child(4)::before {
      background: var(--vscode-charts-purple);
    }

    .stat-widget:nth-child(5)::before {
      background: var(--vscode-charts-orange);
    }

    .stat-widget:nth-child(6)::before {
      background: var(--vscode-charts-yellow);
    }

    .stat-widget-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .stat-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      font-size: 14px;
    }

    .stat-icon.total {
      color: var(--vscode-charts-blue);
    }

    .stat-icon.running {
      color: var(--vscode-charts-green);
    }

    .stat-icon.stopped {
      color: var(--vscode-charts-red);
    }

    .stat-icon.memory {
      color: var(--vscode-charts-purple);
    }

    .stat-icon.cpu {
      color: var(--vscode-charts-orange);
    }

    .stat-icon.storage {
      color: var(--vscode-charts-yellow);
    }

    .stat-label {
      font-size: 11px;
      font-weight: 500;
      text-transform: uppercase;
      color: var(--vscode-descriptionForeground);
      opacity: 0.8;
    }

    .stat-value {
      font-size: 18px;
      font-weight: 600;
      color: var(--vscode-foreground);
      line-height: 1.2;
    }

    .stat-value.running {
      color: var(--vscode-charts-green);
    }

    .stat-value.stopped {
      color: var(--vscode-charts-red);
    }

    .stat-subtitle {
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
      margin-top: 2px;
      opacity: 0.7;
    }

    .controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      gap: 1rem;
    }

    .filters-section {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
    }

    .actions-section {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    search-input {
      flex: 1;
      max-width: 400px;
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

    .btn-refresh {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 8px 12px;
      background: transparent;
      color: var(--vscode-foreground);
      border: 1px solid var(--vscode-button-border);
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.2s;
    }

    .btn-refresh:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }

    .state-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .state-badge.running {
      background: var(--vscode-testing-runAction);
      color: white;
    }

    .state-badge.stopped {
      background: var(--vscode-inputValidation-errorBackground);
      color: var(--vscode-inputValidation-errorForeground);
    }

    .state-badge.paused {
      background: var(--vscode-inputValidation-warningBackground);
      color: var(--vscode-inputValidation-warningForeground);
    }

    .state-badge.suspended {
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
    }

    .virtualization-disabled-banner {
      margin-top: 16px;
      padding: 16px 20px;
      border-radius: 8px;
      border: 1px solid var(--vscode-inputValidation-warningBorder, #e2c08d);
      background: var(--vscode-inputValidation-warningBackground, rgba(229, 200, 144, 0.15));
      color: var(--vscode-inputValidation-warningForeground, #e2c08d);
    }

    .virtualization-disabled-banner h2 {
      margin: 0 0 8px 0;
      font-size: 16px;
      font-weight: 500;
    }

    .virtualization-disabled-banner p {
      margin: 0 0 4px 0;
      font-size: 13px;
      color: var(--vscode-descriptionForeground);
    }

  `;

  private tabs: Tab[] = [
    { id: 'vms', label: 'Virtual Machines' },
    { id: 'templates', label: 'Templates' }
  ];

  override async connectedCallback() {
    super.connectedCallback();
    // Initialize stores
    await this.initializeData();
  }

  override firstUpdated(_changedProperties: any) {
    this.notificationContainer = this.renderRoot.querySelector('notification-container');
    // Listen for bubbled show-notification events from child components (e.g. drawers)
    this.addEventListener('show-notification', this.handleShowNotification as EventListener);
  }

  private async initializeData() {
    try {
      await initializeVirtualizationStores();
      // Subscribe to template store changes
      templateStore.$items.subscribe(items => {
        if (items) {
          if (items instanceof Map) {
            // Convert Map values to array safely
            const values: VMTemplate[] = [];
            items.forEach((value) => {
              if (value && typeof value === 'object') {
                values.push(value as VMTemplate);
              }
            });
            this.templates = values;
          } else if (Array.isArray(items)) {
            this.templates = items.filter(v => v && typeof v === 'object') as VMTemplate[];
          } else if (typeof items === 'object' && items !== null) {
            // Handle plain object - use unknown first to avoid type errors
            const values = Object.values(items as Record<string, unknown>);
            this.templates = values.filter((v): v is VMTemplate =>
              v !== null && typeof v === 'object'
            ) as VMTemplate[];
          }
        }
      });
    } catch (error) {
      console.error('Failed to initialize virtualization stores:', error);
      if (!(error instanceof VirtualizationDisabledError)) {
        this.showNotification('Failed to load virtual machines', 'error');
      }
    }
  }

  private getColumns(): Column[] {
    if (this.activeMainTab === 'templates') {
      return [
        { key: 'name', label: 'Name', type: 'link' },
        { key: 'description', label: 'Description' },
        { key: 'os_type', label: 'OS Type' },
        { key: 'vcpus', label: 'vCPUs' },
        { key: 'memory', label: 'Memory (MB)' },
        { key: 'disk_size', label: 'Disk (GB)' },
        { key: 'created_at', label: 'Created' }
      ];
    }
    return [
      { key: 'name', label: 'Name', type: 'link' },
      { key: 'state', label: 'State', type: 'status' },
      { key: 'vcpus', label: 'vCPUs' },
      { key: 'memory', label: 'Memory (MB)' },
      { key: 'disk_size', label: 'Disk (GB)' },
      { key: 'os_type', label: 'Operating System' },
      { key: 'created_at', label: 'Created' }
    ];
  }

  private formatMemory(mb: number): string {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb} MB`;
  }

  private formatDiskSize(gb: number): string {
    if (gb >= 1024) {
      return `${(gb / 1024).toFixed(1)} TB`;
    }
    return `${gb} GB`;
  }

  private renderStateCell(state: VMState): any {
    // const stateColors = {
    //   running: 'green',
    //   stopped: 'red',
    //   paused: 'yellow',
    //   suspended: 'gray',
    //   unknown: 'gray'
    // };

    return html`
      <span class="state-badge ${state}">
        ${state}
      </span>
    `;
  }

  private getActions(vm: VirtualMachine): ActionItem[] {
    const actions: ActionItem[] = [
      { label: 'View Details', action: 'view', icon: 'ℹ️' }
    ];

    // Normalize state to lowercase for comparison
    const vmState = vm.state?.toLowerCase();

    switch (vmState) {
      case 'running':
        actions.push(
          { label: 'Console', action: 'console', icon: '💻' },
          { label: 'Stop', action: 'stop', icon: '⏹️' },
          { label: 'Pause', action: 'pause', icon: '⏸️' },
          { label: 'Restart', action: 'restart', icon: '🔄' }
        );
        break;
      case 'stopped':
      case 'shutoff': // Handle both stopped and shutoff states
      case 'stop':    // Some systems might use 'stop' instead of 'stopped'
        actions.push(
          { label: 'Start', action: 'start', icon: '▶️' },
          { label: 'Edit', action: 'edit', icon: '✏️' },
          { label: 'Clone', action: 'clone', icon: '📋' }
        );
        // Add delete action for stopped VMs
        actions.push(
          { label: 'Delete', action: 'delete', icon: '🗑️', danger: true }
        );
        break;
      case 'paused':
        actions.push(
          { label: 'Resume', action: 'resume', icon: '▶️' },
          { label: 'Stop', action: 'stop', icon: '⏹️' }
        );
        break;
      case 'suspended':
        actions.push(
          { label: 'Resume', action: 'resume', icon: '▶️' }
        );
        break;
      default:
        // For unknown states, at least allow viewing details
        break;
    }

    // Add snapshot action for all states
    actions.push(
      { label: 'Snapshot', action: 'snapshot', icon: '📸' }
    );

    return actions;
  }

  private async handleTabChange(event: CustomEvent) {
    const tabId = event.detail.tabId;
    this.activeMainTab = tabId as 'vms' | 'templates';

    // Load appropriate data
    if (tabId === 'templates') {
      await templateStore.fetch();
    } else {
      await vmActions.fetchAll();
    }
  }

  private handleStateFilterChange(event: CustomEvent) {
    this.stateFilter = event.detail.value as 'all' | VMState;

    if (this.stateFilter === 'all') {
      $vmFilterState.set({});
    } else {
      $vmFilterState.set({ state: [this.stateFilter] });
    }
  }

  private handleSearchChange(event: CustomEvent) {
    $vmSearchQuery.set(event.detail.value);
  }

  private handleCellClick(event: CustomEvent) {
    const { column, item } = event.detail;
    // Check if clicking on the name column for VMs (not templates)
    if (column.key === 'name' && this.activeMainTab === 'vms') {
      this.showVMDetails(item as VirtualMachine);
    }
  }

  private async handleAction(event: CustomEvent) {
    const { action, item } = event.detail;
    const vm = item as VirtualMachine;

    try {
      switch (action) {
        case 'view':
          this.showVMDetails(vm);
          break;
        case 'console':
          await this.openConsole(vm);
          break;
        case 'start':
          await vmActions.start(vm.id);
          this.showNotification(`Starting VM: ${vm.name}`, 'success');
          break;
        case 'stop':
          await vmActions.stop(vm.id);
          this.showNotification(`Stopping VM: ${vm.name}`, 'success');
          break;
        case 'pause':
          await vmActions.pause(vm.id);
          this.showNotification(`Pausing VM: ${vm.name}`, 'success');
          break;
        case 'resume':
          await vmActions.resume(vm.id);
          this.showNotification(`Resuming VM: ${vm.name}`, 'success');
          break;
        case 'restart':
          await vmActions.restart(vm.id);
          this.showNotification(`Restarting VM: ${vm.name}`, 'success');
          break;
        case 'edit':
          await this.editVM(vm);
          break;
        case 'clone':
          await this.cloneVM(vm);
          break;
        case 'snapshot':
          await this.createSnapshot(vm);
          break;
        case 'delete':
          this.confirmDeleteVM(vm);
          break;
      }
    } catch (error) {
      console.error(`Failed to execute action ${action}:`, error);
      this.showNotification(
        `Failed to ${action} VM: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      );
    }
  }

  private showVMDetails(vm: VirtualMachine) {
    this.selectedVMForDetails = vm;
    this.showDetailsDrawer = true;
  }

  private async openConsole(vm: VirtualMachine) {
    try {
      // Get VNC console token from API
      const vncInfo = await consoleActions.getVNC(vm.id);
      if (!vncInfo || !vncInfo.token) {
        throw new Error('Failed to obtain console access token');
      }

      // Build WebSocket URL for VNC console
      const wsUrl = consoleActions.getVNCWebSocketUrl(vm.id, vncInfo.token);
      
      // Open in new tab with the VNC console page
      const vncUrl = `/vnc-console.html?url=${encodeURIComponent(wsUrl)}&fullscreen=true&vmName=${encodeURIComponent(vm.name || vm.id)}`;
      window.open(vncUrl, '_blank');
    } catch (error) {
      console.error('Failed to open console:', error);
      this.showNotification('Failed to open console', 'error');
    }
  }

  private async editVM(vm: VirtualMachine) {
    // Open the wizard in edit mode with the VM data
    wizardActions.openWizardForEdit(vm);
  }

  private async cloneVM(vm: VirtualMachine) {
    // TODO: Open clone dialog
    console.log('Clone VM:', vm.name);
    this.showNotification('Clone functionality coming soon', 'info');
  }

  private async createSnapshot(vm: VirtualMachine) {
    // TODO: Open snapshot dialog
    console.log('Create snapshot for:', vm.name);
    this.showNotification('Snapshot functionality coming soon', 'info');
  }

  private confirmDeleteVM(vm: VirtualMachine) {
    // Check if VM is running and prevent deletion (case-insensitive)
    const vmState = vm.state?.toLowerCase();
    if (vmState === 'running') {
      this.showNotification('Cannot delete a running VM. Please stop it first.', 'error');
      return;
    }

    this.vmToDelete = vm;
    this.showDeleteModal = true;

    // Force a re-render to ensure modal shows
    this.requestUpdate();
  }

  private async handleDelete() {
    if (!this.vmToDelete) return;

    this.isDeleting = true;

    try {
      await vmActions.delete(this.vmToDelete.id);
      this.showNotification(`VM "${this.vmToDelete.name}" deleted successfully`, 'success');
      this.showDeleteModal = false;
      this.vmToDelete = null;
    } catch (error) {
      console.error('Failed to delete VM:', error);
      this.showNotification(
        `Failed to delete VM: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      );
    } finally {
      this.isDeleting = false;
    }
  }

  private handleCreateNew() {
    wizardActions.openWizard();
  }

  private async handleRefresh() {
    try {
      if (this.activeMainTab === 'templates') {
        await templateStore.fetch();
        this.showNotification('Templates refreshed', 'success');
      } else {
        await vmActions.fetchAll();
        this.showNotification('VMs refreshed', 'success');
      }
    } catch (error) {
      if (!(error instanceof VirtualizationDisabledError)) {
        this.showNotification(`Failed to refresh ${this.activeMainTab}`, 'error');
      }
    }
  }

  private showNotification(message: string, type: 'success' | 'error' | 'info' = 'info') {
    // Dispatch event for notification container
    this.dispatchEvent(new CustomEvent('show-notification', {
      detail: { message, type },
      bubbles: true,
      composed: true
    }));
  }

  private async handleVMPowerAction(event: CustomEvent) {
    const { action, vm, success } = event.detail;

    // If the action was already executed successfully by the drawer
    if (success) {
      // Update selectedVMForDetails with the new state from the event
      if (this.selectedVMForDetails && vm) {
        this.selectedVMForDetails = { ...vm };
      }
      
      // Update the store's local state immediately so the table reflects the change
      if (vm?.id && vm?.state) {
        vmActions.updateLocalState(vm.id, vm.state);
      }
      return;
    }

    try {
      switch (action) {
        case 'start':
          await vmActions.start(vm.id);
          this.showNotification(`Starting VM: ${vm.name}`, 'success');
          break;
        case 'stop':
          await vmActions.stop(vm.id);
          this.showNotification(`Stopping VM: ${vm.name}`, 'success');
          break;
        case 'restart':
          await vmActions.restart(vm.id);
          this.showNotification(`Restarting VM: ${vm.name}`, 'success');
          break;
        case 'pause':
          await vmActions.pause(vm.id);
          this.showNotification(`Pausing VM: ${vm.name}`, 'success');
          break;
        case 'resume':
          await vmActions.resume(vm.id);
          this.showNotification(`Resuming VM: ${vm.name}`, 'success');
          break;
        case 'clone':
          await this.cloneVM(vm);
          break;
        case 'snapshot':
          await this.createSnapshot(vm);
          break;
        case 'delete':
          this.confirmDeleteVM(vm);
          break;
        default:
          console.warn(`Unknown VM action: ${action}`);
      }

      // Refresh the VM data to show updated state
      await vmActions.fetchAll();
    } catch (error) {
      console.error(`Failed to execute VM action ${action}:`, error);
      this.showNotification(
        `Failed to ${action} VM: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      );
    }
  }

  private async handleVMConsoleConnect(event: CustomEvent) {
    const { vm } = event.detail;
    await this.openConsole(vm);
  }

  private renderVirtualizationDisabledBanner(details?: string | null) {
    return html`
      <div class="virtualization-disabled-banner">
        <h2>Virtualization is disabled on this host</h2>
        <p>Virtualization features are currently unavailable because libvirt is not installed or not running.\
 To enable VM management, install and start libvirt on this machine, then reload this page.</p>
        ${details ? html`<p>${details}</p>` : ''}
      </div>
    `;
  }

  override render() {
    const virtualizationEnabled = this.virtualizationEnabledController.value;
    if (virtualizationEnabled === false) {
      const details = this.virtualizationDisabledMessageController.value;
      return html`
        <div class="container">
          ${this.renderVirtualizationDisabledBanner(details)}
        </div>
      `;
    }

    const vmItems = this.vmStoreController.value;
    // const templateItems = this.templateStoreController.value; // Unused - using this.templates instead
    const filteredVMs = this.filteredVMsController.value || [];

    // Calculate stats from VMs
    const allVMs: VirtualMachine[] = Array.isArray(vmItems) ? vmItems as VirtualMachine[] :
      vmItems instanceof Map ? [...vmItems.values()] as VirtualMachine[] :
        typeof vmItems === 'object' && vmItems ? Object.values(vmItems) as VirtualMachine[] : [];

    const stats = {
      totalVMs: allVMs.length,
      runningVMs: allVMs.filter(vm => vm.state === 'running').length,
      stoppedVMs: allVMs.filter(vm => vm.state === 'stopped').length,
      pausedVMs: allVMs.filter(vm => vm.state === 'paused').length,
      totalMemory: allVMs.reduce((sum, vm) => sum + (vm.memory || 0), 0),
      totalVCPUs: allVMs.reduce((sum, vm) => sum + (vm.vcpus || 0), 0),
      totalDiskSize: allVMs.reduce((sum, vm) => sum + (vm.disk_size || 0), 0)
    };

    // const activeTab = this.activeTabController.value; // Unused - using this.activeMainTab instead
    const searchQuery = this.searchQueryController.value;
    // const selectedVM = this.selectedVMController.value; // Unused variable
    // const wizardState = this.wizardStateController.value;

    // Get loading and error states
    const isLoading = this.activeMainTab === 'templates'
      ? templateStore.$loading.get()
      : vmStore.$loading.get();
    const error = this.activeMainTab === 'templates'
      ? templateStore.$error.get()
      : vmStore.$error.get();

    // Get filtered VMs based on state filter
    let displayVMs = filteredVMs;
    if (this.stateFilter !== 'all') {
      displayVMs = filteredVMs.filter(vm => vm.state === this.stateFilter);
    }

    // Transform data for table rendering
    const tableData = this.activeMainTab === 'templates'
      ? this.templates.map(template => ({
        ...template,
        memory_formatted: this.formatMemory(template.memory),
        disk_formatted: this.formatDiskSize(template.disk_size),
        created_formatted: new Date(template.created_at).toLocaleDateString()
      }))
      : displayVMs.map(vm => ({
        ...vm,
        state_rendered: this.renderStateCell(vm.state),
        memory_formatted: this.formatMemory(vm.memory),
        disk_formatted: this.formatDiskSize(vm.disk_size),
        created_formatted: new Date(vm.created_at).toLocaleDateString()
      }));

    return html`
      <div class="container">

        <!-- Stats Bar -->
        <div class="stats-bar">
          <div class="stat-widget">
            <div class="stat-widget-header">
              <span class="stat-icon total">🖥️</span>
              <span class="stat-label">Total VMs</span>
            </div>
            <div class="stat-value">${stats.totalVMs}</div>
            <div class="stat-subtitle">virtual machines</div>
          </div>
          
          <div class="stat-widget">
            <div class="stat-widget-header">
              <span class="stat-icon running">▶️</span>
              <span class="stat-label">Running</span>
            </div>
            <div class="stat-value running">${stats.runningVMs}</div>
            <div class="stat-subtitle">${Math.round((stats.runningVMs / stats.totalVMs) * 100) || 0}% active</div>
          </div>
          
          <div class="stat-widget">
            <div class="stat-widget-header">
              <span class="stat-icon stopped">⏹️</span>
              <span class="stat-label">Stopped</span>
            </div>
            <div class="stat-value stopped">${stats.stoppedVMs}</div>
            <div class="stat-subtitle">${Math.round((stats.stoppedVMs / stats.totalVMs) * 100) || 0}% inactive</div>
          </div>
          
          <div class="stat-widget">
            <div class="stat-widget-header">
              <span class="stat-icon memory">🧠</span>
              <span class="stat-label">Total Memory</span>
            </div>
            <div class="stat-value">${this.formatMemory(stats.totalMemory)}</div>
            <div class="stat-subtitle">allocated RAM</div>
          </div>
          
          <div class="stat-widget">
            <div class="stat-widget-header">
              <span class="stat-icon cpu">⚡</span>
              <span class="stat-label">Total vCPUs</span>
            </div>
            <div class="stat-value">${stats.totalVCPUs}</div>
            <div class="stat-subtitle">processing cores</div>
          </div>
          
          <div class="stat-widget">
            <div class="stat-widget-header">
              <span class="stat-icon storage">💾</span>
              <span class="stat-label">Total Storage</span>
            </div>
            <div class="stat-value">${this.formatDiskSize(stats.totalDiskSize)}</div>
            <div class="stat-subtitle">disk space</div>
          </div>
        </div>

        <!-- Tabs -->
        <tab-group
          .tabs=${this.tabs}
          .activeTab=${this.activeMainTab}
          @tab-change=${this.handleTabChange}
        ></tab-group>

        <!-- Controls -->
        <div class="controls">
          <div class="filters-section">
            ${this.activeMainTab === 'vms' ? html`
              <filter-dropdown
                .options=${[
          { value: 'all', label: 'All States' },
          { value: 'running', label: 'Running' },
          { value: 'stopped', label: 'Stopped' },
          { value: 'paused', label: 'Paused' },
          { value: 'suspended', label: 'Suspended' }
        ]}
                .selectedValue=${this.stateFilter}
                .label=${'Filter by State'}
                .showStatusIndicators=${true}
                @filter-change=${this.handleStateFilterChange}
              ></filter-dropdown>
            ` : ''}
            <search-input
              .placeholder=${this.activeMainTab === 'vms' ? 'Search virtual machines...' : 'Search templates...'}
              .value=${searchQuery}
              @search-change=${this.handleSearchChange}
            ></search-input>
          </div>
          <div class="actions-section">
            <button class="btn-refresh" @click=${this.handleRefresh} title="Refresh">
              🔄
            </button>
            <button class="btn-create" @click=${this.handleCreateNew}>
              <span>+ New VM</span>
            </button>
          </div>
        </div>

        <!-- Content -->
        <div class="content">
          ${isLoading ? html`
            <loading-state message="Loading ${this.activeMainTab === 'templates' ? 'templates' : 'virtual machines'}..."></loading-state>
          ` : error ? html`
            <empty-state
              icon="❌"
              title="Error loading ${this.activeMainTab === 'templates' ? 'templates' : 'virtual machines'}"
              description=${error.message}
            ></empty-state>
          ` : tableData.length === 0 ? html`
            <empty-state
              icon="🖥️"
              title="No ${this.activeMainTab === 'templates' ? 'templates' : 'virtual machines'} found"
              description=${searchQuery
          ? `No ${this.activeMainTab === 'templates' ? 'templates' : 'VMs'} match your search criteria`
          : this.activeMainTab === 'templates'
            ? "No templates available"
            : "Create your first virtual machine to get started"}
            ></empty-state>
          ` : html`
            <resource-table
              .columns=${this.getColumns()}
              .data=${tableData}
              .getActions=${(item: any) => this.activeMainTab === 'templates' ? [] : this.getActions(item)}
              @cell-click=${this.handleCellClick}
              @action=${this.handleAction}
            ></resource-table>
          `}
        </div>

        <!-- VM Details Drawer -->
        <vm-detail-drawer
          ?show=${this.showDetailsDrawer}
          .vm=${this.selectedVMForDetails}
          @close=${() => {
        this.showDetailsDrawer = false;
        this.selectedVMForDetails = null;
      }}
          @power-action=${this.handleVMPowerAction}
          @console-connect=${this.handleVMConsoleConnect}
        ></vm-detail-drawer>

        <!-- Delete Confirmation Modal -->
        <delete-modal
          .show=${this.showDeleteModal}
          .item=${this.vmToDelete ? {
        name: this.vmToDelete.name,
        type: 'Virtual Machine'
      } : null}
          .loading=${this.isDeleting}
          @confirm-delete=${this.handleDelete}
          @cancel-delete=${() => {
        this.showDeleteModal = false;
        this.vmToDelete = null;
        this.requestUpdate();
      }}
        ></delete-modal>

        <!-- VM Creation Wizard -->
        ${this.useEnhancedWizard ? html`
          <create-vm-wizard-enhanced></create-vm-wizard-enhanced>
        ` : html`
          <create-vm-wizard></create-vm-wizard>
        `}

        <!-- Notification Container -->
        <notification-container></notification-container>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'virtualization-vms-enhanced': VirtualizationVMsEnhanced;
  }
}
