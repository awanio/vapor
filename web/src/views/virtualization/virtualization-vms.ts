import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '../../components/ui/search-input.js';
import '../../components/ui/empty-state.js';
import '../../components/ui/loading-state.js';
import '../../components/tabs/tab-group.js';
import '../../components/tables/resource-table.js';
import '../../components/drawers/detail-drawer.js';
import '../../components/modals/delete-modal.js';
import '../../components/drawers/create-resource-drawer';
import '../../components/ui/notification-container';
import type { Tab } from '../../components/tabs/tab-group.js';
import type { Column } from '../../components/tables/resource-table.js';
import type { ActionItem } from '../../components/ui/action-dropdown.js';
import type { DeleteItem } from '../../components/modals/delete-modal.js';

interface VirtualMachine {
  id: string;
  name: string;
  state: 'running' | 'stopped' | 'paused' | 'suspended';
  cpu: number;
  memory: string;
  storage: string;
  os: string;
  ipAddress: string;
  created: string;
}

@customElement('virtualization-vms')
export class VirtualizationVMs extends LitElement {
  @property({ type: Array }) vms: VirtualMachine[] = [];
  @property({ type: String }) searchQuery = '';
  @property({ type: Boolean }) loading = false;
  @property({ type: String }) error: string | null = null;
  
  @state() private activeTab = 'all';
  @state() private showDetails = false;
  @state() private selectedVM: VirtualMachine | null = null;
  @state() private showDeleteModal = false;
  @state() private itemToDelete: DeleteItem | null = null;
  @state() private isDeleting = false;
  @state() private showCreateDrawer = false;
  @state() private createResourceValue = '';
  @state() private isCreating = false;

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
      margin-bottom: 1.5rem;
    }

    .header h1 {
      margin: 0 0 24px 0;
      font-size: 24px;
      font-weight: 300;
      flex-shrink: 0;
    }

    .controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      gap: 1rem;
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
  `;

  private tabs: Tab[] = [
    { id: 'all', label: 'All VMs' },
    { id: 'running', label: 'Running' },
    { id: 'stopped', label: 'Stopped' },
    { id: 'templates', label: 'Templates' }
  ];

  private dummyVMs: VirtualMachine[] = [
    {
      id: 'vm-001',
      name: 'web-server-01',
      state: 'running',
      cpu: 4,
      memory: '8 GB',
      storage: '100 GB',
      os: 'Ubuntu 22.04 LTS',
      ipAddress: '192.168.1.10',
      created: '2024-01-15'
    },
    {
      id: 'vm-002',
      name: 'database-server',
      state: 'running',
      cpu: 8,
      memory: '16 GB',
      storage: '500 GB',
      os: 'CentOS 8',
      ipAddress: '192.168.1.11',
      created: '2024-01-10'
    },
    {
      id: 'vm-003',
      name: 'dev-workstation',
      state: 'stopped',
      cpu: 2,
      memory: '4 GB',
      storage: '50 GB',
      os: 'Debian 11',
      ipAddress: '192.168.1.12',
      created: '2024-02-01'
    },
    {
      id: 'vm-004',
      name: 'test-server',
      state: 'paused',
      cpu: 2,
      memory: '4 GB',
      storage: '80 GB',
      os: 'Fedora 38',
      ipAddress: '192.168.1.13',
      created: '2024-02-15'
    },
    {
      id: 'vm-005',
      name: 'backup-server',
      state: 'running',
      cpu: 4,
      memory: '8 GB',
      storage: '1 TB',
      os: 'Ubuntu 20.04 LTS',
      ipAddress: '192.168.1.14',
      created: '2024-01-20'
    }
  ];

  override connectedCallback() {
    super.connectedCallback();
    this.loadData();
  }

  private async loadData() {
    this.loading = true;
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    this.vms = this.dummyVMs;
    this.loading = false;
  }

  private getColumns(): Column[] {
    return [
      { key: 'name', label: 'Name', type: 'link' },
      { key: 'state', label: 'State', type: 'status' },
      { key: 'cpu', label: 'CPU Cores' },
      { key: 'memory', label: 'Memory' },
      { key: 'storage', label: 'Storage' },
      { key: 'os', label: 'Operating System' },
      { key: 'ipAddress', label: 'IP Address' },
      { key: 'created', label: 'Created' }
    ];
  }

  private getActions(vm: VirtualMachine): ActionItem[] {
    const actions: ActionItem[] = [
      { label: 'View Details', action: 'view' }
    ];

    if (vm.state === 'running') {
      actions.push(
        { label: 'Console', action: 'console' },
        { label: 'Stop', action: 'stop' },
        { label: 'Pause', action: 'pause' },
        { label: 'Restart', action: 'restart' }
      );
    } else if (vm.state === 'stopped') {
      actions.push(
        { label: 'Start', action: 'start' },
        { label: 'Clone', action: 'clone' }
      );
    } else if (vm.state === 'paused') {
      actions.push(
        { label: 'Resume', action: 'resume' },
        { label: 'Stop', action: 'stop' }
      );
    }

    actions.push(
      { label: 'Edit', action: 'edit' },
      { label: 'Snapshot', action: 'snapshot' },
      { label: 'Delete', action: 'delete', danger: true }
    );

    return actions;
  }

  private getFilteredData(): VirtualMachine[] {
    let data = this.vms;

    // Filter by tab
    if (this.activeTab !== 'all' && this.activeTab !== 'templates') {
      data = data.filter(vm => vm.state === this.activeTab);
    }

    // Filter by search query
    if (this.searchQuery) {
      data = data.filter(vm => 
        JSON.stringify(vm).toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    }

    return data;
  }

  private async handleTabChange(event: CustomEvent) {
    this.activeTab = event.detail.tabId;
  }


  private handleCellClick(event: CustomEvent) {
    const vm = event.detail.item as VirtualMachine;
    this.viewDetails(vm);
  }

  private handleAction(event: CustomEvent) {
    const { action, item } = event.detail;
    const vm = item as VirtualMachine;
    
    switch (action) {
      case 'view':
        this.viewDetails(vm);
        break;
      case 'console':
        this.openConsole(vm);
        break;
      case 'start':
      case 'stop':
      case 'pause':
      case 'resume':
      case 'restart':
        this.changeVMState(vm, action);
        break;
      case 'clone':
        this.cloneVM(vm);
        break;
      case 'edit':
        this.editVM(vm);
        break;
      case 'snapshot':
        this.createSnapshot(vm);
        break;
      case 'delete':
        this.deleteVM(vm);
        break;
    }
  }

  private viewDetails(vm: VirtualMachine) {
    this.selectedVM = vm;
    this.showDetails = true;
  }

  private openConsole(vm: VirtualMachine) {
    console.log('Opening console for:', vm.name);
    // Would open console in new window/tab
  }

  private changeVMState(vm: VirtualMachine, action: string) {
    console.log(`Changing VM ${vm.name} state to:`, action);
    // Would call API to change VM state
  }

  private cloneVM(vm: VirtualMachine) {
    console.log('Cloning VM:', vm.name);
    // Would open clone dialog
  }

  private editVM(vm: VirtualMachine) {
    console.log('Editing VM:', vm.name);
    // Would open edit dialog
  }

  private createSnapshot(vm: VirtualMachine) {
    console.log('Creating snapshot for:', vm.name);
    // Would open snapshot dialog
  }

  private deleteVM(vm: VirtualMachine) {
    this.itemToDelete = {
      name: vm.name,
      type: 'Virtual Machine'
    };
    this.showDeleteModal = true;
  }

  private async handleDelete(event: CustomEvent) {
    const item = event.detail.item;
    this.isDeleting = true;
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Remove from list
    this.vms = this.vms.filter(vm => vm.id !== item.id);
    
    this.isDeleting = false;
    this.showDeleteModal = false;
    this.itemToDelete = null;
  }

  private handleCreateNew() {
    this.createResourceValue = JSON.stringify({
      apiVersion: 'v1',
      kind: 'VirtualMachine',
      metadata: {
        name: 'new-vm',
        namespace: 'default'
      },
      spec: {
        cpu: 2,
        memory: '4Gi',
        storage: '50Gi',
        os: 'ubuntu-22.04'
      }
    }, null, 2);
    this.showCreateDrawer = true;
  }

  private handleSearchChange(e: CustomEvent) {
    this.searchQuery = e.detail.value;
  }

  private async handleCreateResource(event: CustomEvent) {
    this.isCreating = true;
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Creating VM with:', event.detail.value);
      
      // Add to list (in real app, would refresh from API)
      const newVm: VirtualMachine = {
        id: `vm-${Date.now()}`,
        name: 'new-vm',
        state: 'stopped',
        cpu: 2,
        memory: '4 GB',
        storage: '50 GB',
        os: 'Ubuntu 22.04',
        ipAddress: '192.168.1.99',
        created: new Date().toISOString().split('T')[0] || ''
      };
      this.vms = [...this.vms, newVm];
      
      this.showCreateDrawer = false;
      this.createResourceValue = '';
    } catch (error) {
      console.error('Failed to create VM:', error);
    } finally {
      this.isCreating = false;
    }
  }

  override render() {
    const filteredData = this.getFilteredData();

    return html`
      <div class="container">
        <div class="header">
          <h1>Virtual Machines</h1>
        </div>

        <tab-group
          .tabs=${this.tabs}
          .activeTab=${this.activeTab}
          @tab-change=${this.handleTabChange}
        ></tab-group>

        <div class="controls">
          <search-input
            .placeholder=${'Search virtual machines...'}
            .value=${this.searchQuery}
            @search-change=${this.handleSearchChange}
          ></search-input>
          <button class="btn-create" @click=${this.handleCreateNew}>
            <span>+ New VM</span>
          </button>
        </div>

        <div class="content">
          ${this.loading ? html`
            <loading-state message="Loading virtual machines..."></loading-state>
          ` : filteredData.length === 0 ? html`
            <empty-state
              icon="🖥️"
              title="No virtual machines found"
              description=${this.searchQuery 
                ? "No VMs match your search criteria" 
                : "Create your first virtual machine to get started"}
            ></empty-state>
          ` : html`
            <resource-table
              .columns=${this.getColumns()}
              .data=${filteredData}
              .actions=${(item: VirtualMachine) => this.getActions(item)}
              @cell-click=${this.handleCellClick}
              @action=${this.handleAction}
            ></resource-table>
          `}
        </div>

        ${this.showDetails ? html`
          <detail-drawer
            .title=${this.selectedVM?.name || 'VM Details'}
            .open=${this.showDetails}
            @close=${() => { this.showDetails = false; this.selectedVM = null; }}
          >
            <div style="padding: 20px;">
              <h3>Virtual Machine Information</h3>
              <pre>${JSON.stringify(this.selectedVM, null, 2)}</pre>
            </div>
          </detail-drawer>
        ` : ''}

        ${this.showDeleteModal ? html`
          <delete-modal
            .open=${this.showDeleteModal}
            .item=${this.itemToDelete}
            .loading=${this.isDeleting}
            @delete=${this.handleDelete}
            @close=${() => { this.showDeleteModal = false; this.itemToDelete = null; }}
          ></delete-modal>
        ` : ''}

        ${this.showCreateDrawer ? html`
          <create-resource-drawer
            .open=${this.showCreateDrawer}
            .title=${'Create Virtual Machine'}
            .value=${this.createResourceValue}
            .loading=${this.isCreating}
            @save=${this.handleCreateResource}
            @close=${() => { this.showCreateDrawer = false; this.createResourceValue = ''; }}
          ></create-resource-drawer>
        ` : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'virtualization-vms': VirtualizationVMs;
  }
}
