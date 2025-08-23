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
  wizardActions,
  initializeVirtualizationStores,
} from '../../stores/virtualization';
import type { VirtualMachine, VMState, VMTemplate } from '../../types/virtualization';


@customElement('virtualization-vms-enhanced')
export class VirtualizationVMsEnhanced extends LitElement {
  // Store controllers for reactive updates
  private vmStoreController = new StoreController(this, vmStore.$items);
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
      padding: 24px;
      box-sizing: border-box;
    }

    .container {
      display: flex;
      flex-direction: column;
      height: 100%;
      gap: 1rem;
    }

    .header {
      margin-bottom: 1rem;
    }

    .header h1 {
      margin: 0 0 16px 0;
      font-size: 24px;
      font-weight: 300;
      flex-shrink: 0;
    }

    .stats-bar {
      display: flex;
      gap: 2rem;
      margin-bottom: 1.5rem;
      padding: 12px 16px;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-editorWidget-border);
      border-radius: 4px;
      font-size: 13px;
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .stat-label {
      color: var(--vscode-descriptionForeground);
    }

    .stat-value {
      font-weight: 600;
      color: var(--vscode-foreground);
    }

    .stat-value.running {
      color: var(--vscode-charts-green);
    }

    .stat-value.stopped {
      color: var(--vscode-charts-red);
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
      // Show error notification
      this.showNotification('Failed to load virtual machines', 'error');
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
      { key: 'state', label: 'State', type: 'custom' },
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
      { label: 'View Details', action: 'view', icon: 'info' }
    ];

    switch (vm.state) {
      case 'running':
        actions.push(
          { label: 'Console', action: 'console', icon: 'terminal' },
          { label: 'Stop', action: 'stop', icon: 'stop' },
          { label: 'Pause', action: 'pause', icon: 'pause' },
          { label: 'Restart', action: 'restart', icon: 'refresh' }
        );
        break;
      case 'stopped':
        actions.push(
          { label: 'Start', action: 'start', icon: 'play' },
          { label: 'Clone', action: 'clone', icon: 'copy' }
        );
        break;
      case 'paused':
        actions.push(
          { label: 'Resume', action: 'resume', icon: 'play' },
          { label: 'Stop', action: 'stop', icon: 'stop' }
        );
        break;
      case 'suspended':
        actions.push(
          { label: 'Resume', action: 'resume', icon: 'play' }
        );
        break;
    }

    actions.push(
      { label: 'Snapshot', action: 'snapshot', icon: 'save' },
      { label: 'Delete', action: 'delete', icon: 'trash', danger: true }
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
      const consoleInfo = await vmActions.getConsoleInfo(vm.id);
      const consoleUrl = `/console?vm=${vm.id}&token=${consoleInfo.token}&type=${consoleInfo.type}`;
      window.open(consoleUrl, `vm-console-${vm.id}`, 'width=1024,height=768');
    } catch (error) {
      console.error('Failed to open console:', error);
      this.showNotification('Failed to open console', 'error');
    }
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
    this.vmToDelete = vm;
    this.showDeleteModal = true;
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
      this.showNotification(`Failed to refresh ${this.activeMainTab}`, 'error');
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
    const { action, vm } = event.detail;
    
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

  override render() {
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
        <div class="header">
          <h1>Virtual Machines</h1>
        </div>

        <!-- Stats Bar -->
        <div class="stats-bar">
          <div class="stat-item">
            <span class="stat-label">Total VMs:</span>
            <span class="stat-value">${stats.totalVMs}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Running:</span>
            <span class="stat-value running">${stats.runningVMs}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Stopped:</span>
            <span class="stat-value stopped">${stats.stoppedVMs}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Total Memory:</span>
            <span class="stat-value">${this.formatMemory(stats.totalMemory)}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Total vCPUs:</span>
            <span class="stat-value">${stats.totalVCPUs}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Total Storage:</span>
            <span class="stat-value">${this.formatDiskSize(stats.totalDiskSize)}</span>
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
              .actions=${(item: any) => this.activeMainTab === 'templates' ? [] : this.getActions(item)}
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
        ${this.showDeleteModal && this.vmToDelete ? html`
          <delete-modal
            .show=${this.showDeleteModal}
            .item={{
              name: this.vmToDelete.name,
              type: 'Virtual Machine'
            }}
            .loading=${this.isDeleting}
            @confirm-delete=${this.handleDelete}
            @cancel-delete=${() => { 
              this.showDeleteModal = false;
              this.vmToDelete = null;
            }}
          ></delete-modal>
        ` : ''}

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
