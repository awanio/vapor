var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { StoreController } from '@nanostores/lit';
import '../../components/ui/search-input.js';
import '../../components/ui/empty-state.js';
import '../../components/ui/loading-state.js';
import '../../components/ui/status-badge.js';
import '../../components/ui/filter-dropdown.js';
import '../../components/tabs/tab-group.js';
import '../../components/tables/resource-table.js';
import '../../components/drawers/detail-drawer.js';
import '../../components/modals/delete-modal.js';
import '../../components/ui/notification-container.js';
import '../../components/virtualization/create-vm-wizard.js';
import { vmStore, $filteredVMs, $resourceStats, $activeVMTab, $vmSearchQuery, $selectedVM, vmActions, wizardActions, initializeVirtualizationStores, } from '../../stores/virtualization';
let VirtualizationVMsEnhanced = class VirtualizationVMsEnhanced extends LitElement {
    constructor() {
        super(...arguments);
        this.vmStoreController = new StoreController(this, vmStore.$state);
        this.filteredVMsController = new StoreController(this, $filteredVMs);
        this.resourceStatsController = new StoreController(this, $resourceStats);
        this.selectedVMController = new StoreController(this, $selectedVM);
        this.activeTabController = new StoreController(this, $activeVMTab);
        this.searchQueryController = new StoreController(this, $vmSearchQuery);
        this.showDeleteModal = false;
        this.vmToDelete = null;
        this.isDeleting = false;
        this.showDetailsDrawer = false;
        this.tabs = [
            { id: 'all', label: 'All VMs' },
            { id: 'running', label: 'Running' },
            { id: 'stopped', label: 'Stopped' },
            { id: 'templates', label: 'Templates' }
        ];
    }
    async connectedCallback() {
        super.connectedCallback();
        await this.initializeData();
    }
    async initializeData() {
        try {
            await initializeVirtualizationStores();
        }
        catch (error) {
            console.error('Failed to initialize virtualization stores:', error);
            this.showNotification('Failed to load virtual machines', 'error');
        }
    }
    getColumns() {
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
    formatMemory(mb) {
        if (mb >= 1024) {
            return `${(mb / 1024).toFixed(1)} GB`;
        }
        return `${mb} MB`;
    }
    formatDiskSize(gb) {
        if (gb >= 1024) {
            return `${(gb / 1024).toFixed(1)} TB`;
        }
        return `${gb} GB`;
    }
    renderStateCell(state) {
        return html `
      <span class="state-badge ${state}">
        ${state}
      </span>
    `;
    }
    getActions(vm) {
        const actions = [
            { label: 'View Details', action: 'view', icon: 'info' }
        ];
        switch (vm.state) {
            case 'running':
                actions.push({ label: 'Console', action: 'console', icon: 'terminal' }, { label: 'Stop', action: 'stop', icon: 'stop' }, { label: 'Pause', action: 'pause', icon: 'pause' }, { label: 'Restart', action: 'restart', icon: 'refresh' });
                break;
            case 'stopped':
                actions.push({ label: 'Start', action: 'start', icon: 'play' }, { label: 'Clone', action: 'clone', icon: 'copy' });
                break;
            case 'paused':
                actions.push({ label: 'Resume', action: 'resume', icon: 'play' }, { label: 'Stop', action: 'stop', icon: 'stop' });
                break;
            case 'suspended':
                actions.push({ label: 'Resume', action: 'resume', icon: 'play' });
                break;
        }
        actions.push({ label: 'Snapshot', action: 'snapshot', icon: 'save' }, { label: 'Delete', action: 'delete', icon: 'trash', danger: true });
        return actions;
    }
    async handleTabChange(event) {
        const tabId = event.detail.tabId;
        $activeVMTab.set(tabId);
    }
    handleSearchChange(event) {
        $vmSearchQuery.set(event.detail.value);
    }
    handleCellClick(event) {
        const vm = event.detail.item;
        this.viewVMDetails(vm);
    }
    async handleAction(event) {
        const { action, item } = event.detail;
        const vm = item;
        try {
            switch (action) {
                case 'view':
                    this.viewVMDetails(vm);
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
        }
        catch (error) {
            console.error(`Failed to execute action ${action}:`, error);
            this.showNotification(`Failed to ${action} VM: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
    }
    viewVMDetails(vm) {
        vmActions.selectVM(vm.id);
        this.showDetailsDrawer = true;
    }
    async openConsole(vm) {
        try {
            const consoleInfo = await vmActions.getConsoleInfo(vm.id);
            const consoleUrl = `/console?vm=${vm.id}&token=${consoleInfo.token}&type=${consoleInfo.type}`;
            window.open(consoleUrl, `vm-console-${vm.id}`, 'width=1024,height=768');
        }
        catch (error) {
            console.error('Failed to open console:', error);
            this.showNotification('Failed to open console', 'error');
        }
    }
    async cloneVM(vm) {
        console.log('Clone VM:', vm.name);
        this.showNotification('Clone functionality coming soon', 'info');
    }
    async createSnapshot(vm) {
        console.log('Create snapshot for:', vm.name);
        this.showNotification('Snapshot functionality coming soon', 'info');
    }
    confirmDeleteVM(vm) {
        this.vmToDelete = vm;
        this.showDeleteModal = true;
    }
    async handleDelete() {
        if (!this.vmToDelete)
            return;
        this.isDeleting = true;
        try {
            await vmActions.delete(this.vmToDelete.id);
            this.showNotification(`VM "${this.vmToDelete.name}" deleted successfully`, 'success');
            this.showDeleteModal = false;
            this.vmToDelete = null;
        }
        catch (error) {
            console.error('Failed to delete VM:', error);
            this.showNotification(`Failed to delete VM: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
        finally {
            this.isDeleting = false;
        }
    }
    handleCreateNew() {
        wizardActions.openWizard();
    }
    async handleRefresh() {
        try {
            await vmActions.fetchAll();
            this.showNotification('VMs refreshed', 'success');
        }
        catch (error) {
            this.showNotification('Failed to refresh VMs', 'error');
        }
    }
    showNotification(message, type = 'info') {
        this.dispatchEvent(new CustomEvent('show-notification', {
            detail: { message, type },
            bubbles: true,
            composed: true
        }));
    }
    render() {
        const state = this.vmStoreController.value;
        const filteredVMs = this.filteredVMsController.value || [];
        const stats = this.resourceStatsController.value || {
            totalVMs: 0,
            runningVMs: 0,
            stoppedVMs: 0,
            pausedVMs: 0,
            totalMemory: 0,
            totalVCPUs: 0,
            totalDiskSize: 0
        };
        const activeTab = this.activeTabController.value;
        const searchQuery = this.searchQueryController.value;
        const selectedVM = this.selectedVMController.value;
        const tableData = filteredVMs.map(vm => ({
            ...vm,
            state_rendered: this.renderStateCell(vm.state),
            memory_formatted: this.formatMemory(vm.memory),
            disk_formatted: this.formatDiskSize(vm.disk_size),
            created_formatted: new Date(vm.created_at).toLocaleDateString()
        }));
        return html `
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
          .activeTab=${activeTab}
          @tab-change=${this.handleTabChange}
        ></tab-group>

        <!-- Controls -->
        <div class="controls">
          <div class="filters-section">
            <search-input
              .placeholder=${'Search virtual machines...'}
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
          ${state.loading ? html `
            <loading-state message="Loading virtual machines..."></loading-state>
          ` : state.error ? html `
            <empty-state
              icon="❌"
              title="Error loading virtual machines"
              description=${state.error.message}
            ></empty-state>
          ` : filteredVMs.length === 0 ? html `
            <empty-state
              icon="🖥️"
              title="No virtual machines found"
              description=${searchQuery
            ? "No VMs match your search criteria"
            : activeTab === 'templates'
                ? "No templates available"
                : "Create your first virtual machine to get started"}
            ></empty-state>
          ` : html `
            <resource-table
              .columns=${this.getColumns()}
              .data=${tableData}
              .actions=${(item) => this.getActions(item)}
              @cell-click=${this.handleCellClick}
              @action=${this.handleAction}
            ></resource-table>
          `}
        </div>

        <!-- VM Details Drawer -->
        ${this.showDetailsDrawer && selectedVM ? html `
          <detail-drawer
            .title=${selectedVM.name}
            .open=${this.showDetailsDrawer}
            @close=${() => {
            this.showDetailsDrawer = false;
            vmActions.selectVM(null);
        }}
          >
            <div style="padding: 20px;">
              <h3>Virtual Machine Details</h3>
              <div style="display: grid; gap: 12px; margin-top: 16px;">
                <div><strong>ID:</strong> ${selectedVM.id}</div>
                <div><strong>Name:</strong> ${selectedVM.name}</div>
                <div><strong>State:</strong> ${this.renderStateCell(selectedVM.state)}</div>
                <div><strong>OS Type:</strong> ${selectedVM.os_type}</div>
                <div><strong>Memory:</strong> ${this.formatMemory(selectedVM.memory)}</div>
                <div><strong>vCPUs:</strong> ${selectedVM.vcpus}</div>
                <div><strong>Disk Size:</strong> ${this.formatDiskSize(selectedVM.disk_size)}</div>
                <div><strong>Created:</strong> ${new Date(selectedVM.created_at).toLocaleString()}</div>
                ${selectedVM.updated_at ? html `
                  <div><strong>Updated:</strong> ${new Date(selectedVM.updated_at).toLocaleString()}</div>
                ` : ''}
              </div>
              
              ${selectedVM.graphics ? html `
                <h4 style="margin-top: 24px;">Graphics</h4>
                <div style="display: grid; gap: 8px;">
                  <div><strong>Type:</strong> ${selectedVM.graphics.type}</div>
                  ${selectedVM.graphics.port ? html `
                    <div><strong>Port:</strong> ${selectedVM.graphics.port}</div>
                  ` : ''}
                </div>
              ` : ''}
              
              ${selectedVM.network_interfaces?.length ? html `
                <h4 style="margin-top: 24px;">Network Interfaces</h4>
                ${selectedVM.network_interfaces.map(nic => html `
                  <div style="margin-top: 12px; padding: 8px; background: var(--vscode-editor-background); border-radius: 4px;">
                    <div><strong>Name:</strong> ${nic.name}</div>
                    <div><strong>Type:</strong> ${nic.type}</div>
                    ${nic.mac ? html `<div><strong>MAC:</strong> ${nic.mac}</div>` : ''}
                    ${nic.ip ? html `<div><strong>IP:</strong> ${nic.ip}</div>` : ''}
                  </div>
                `)}
              ` : ''}
            </div>
          </detail-drawer>
        ` : ''}

        <!-- Delete Confirmation Modal -->
        ${this.showDeleteModal && this.vmToDelete ? html `
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
        <create-vm-wizard></create-vm-wizard>

        <!-- Notification Container -->
        <notification-container></notification-container>
      </div>
    `;
    }
};
VirtualizationVMsEnhanced.styles = css `
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
__decorate([
    state()
], VirtualizationVMsEnhanced.prototype, "showDeleteModal", void 0);
__decorate([
    state()
], VirtualizationVMsEnhanced.prototype, "vmToDelete", void 0);
__decorate([
    state()
], VirtualizationVMsEnhanced.prototype, "isDeleting", void 0);
__decorate([
    state()
], VirtualizationVMsEnhanced.prototype, "showDetailsDrawer", void 0);
VirtualizationVMsEnhanced = __decorate([
    customElement('virtualization-vms-enhanced')
], VirtualizationVMsEnhanced);
export { VirtualizationVMsEnhanced };
//# sourceMappingURL=virtualization-vms-enhanced.js.map