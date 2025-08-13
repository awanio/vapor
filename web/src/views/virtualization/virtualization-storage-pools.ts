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
import type { Tab } from '../../components/tabs/tab-group.js';
import type { Column } from '../../components/tables/resource-table.js';
import type { ActionItem } from '../../components/ui/action-dropdown.js';
import type { DeleteItem } from '../../components/modals/delete-modal.js';

interface StoragePool {
  id: string;
  name: string;
  type: 'dir' | 'fs' | 'logical' | 'disk' | 'iscsi' | 'nfs' | 'gluster' | 'ceph';
  state: 'active' | 'inactive' | 'building';
  capacity: string;
  allocated: string;
  available: string;
  usage: number; // percentage
  path: string;
  autostart: boolean;
  created: string;
}

@customElement('virtualization-storage-pools')
export class VirtualizationStoragePools extends LitElement {
  @property({ type: Array }) pools: StoragePool[] = [];
  @property({ type: String }) searchQuery = '';
  @property({ type: Boolean }) loading = false;
  @property({ type: String }) error: string | null = null;
  
  @state() private activeTab = 'all';
  @state() private showDetails = false;
  @state() private selectedPool: StoragePool | null = null;
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
      margin: 0 0 1rem 0;
      font-size: 24px;
      font-weight: 500;
      color: var(--vscode-foreground);
    }

    .controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .search-container {
      position: relative;
      flex: 1;
      max-width: 400px;
    }

    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      width: 16px;
      height: 16px;
      color: var(--vscode-input-placeholderForeground);
      pointer-events: none;
    }

    .search-input {
      width: 100%;
      padding: 8px 12px 8px 36px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      font-size: 13px;
      outline: none;
    }

    .search-input:focus {
      border-color: var(--vscode-focusBorder);
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


    .usage-bar {
      width: 100%;
      height: 6px;
      background: var(--vscode-progressBar-background);
      border-radius: 3px;
      overflow: hidden;
      margin-top: 4px;
    }

    .usage-fill {
      height: 100%;
      background: var(--vscode-progressBar-foreground);
      transition: width 0.3s ease;
    }

    .usage-warning {
      background: var(--vscode-testing-iconQueued);
    }

    .usage-danger {
      background: var(--vscode-testing-iconFailed);
    }
  `;

  private tabs: Tab[] = [
    { id: 'all', label: 'All Pools' },
    { id: 'active', label: 'Active' },
    { id: 'inactive', label: 'Inactive' },
    { id: 'local', label: 'Local Storage' },
    { id: 'network', label: 'Network Storage' }
  ];

  private dummyPools: StoragePool[] = [
    {
      id: 'pool-001',
      name: 'default',
      type: 'dir',
      state: 'active',
      capacity: '500 GB',
      allocated: '350 GB',
      available: '150 GB',
      usage: 70,
      path: '/var/lib/libvirt/images',
      autostart: true,
      created: '2024-01-01'
    },
    {
      id: 'pool-002',
      name: 'vm-storage',
      type: 'logical',
      state: 'active',
      capacity: '2 TB',
      allocated: '1.2 TB',
      available: '800 GB',
      usage: 60,
      path: '/dev/vg_vms',
      autostart: true,
      created: '2024-01-05'
    },
    {
      id: 'pool-003',
      name: 'nfs-backup',
      type: 'nfs',
      state: 'active',
      capacity: '10 TB',
      allocated: '6 TB',
      available: '4 TB',
      usage: 60,
      path: '192.168.1.100:/backup',
      autostart: false,
      created: '2024-01-10'
    },
    {
      id: 'pool-004',
      name: 'iscsi-san',
      type: 'iscsi',
      state: 'inactive',
      capacity: '5 TB',
      allocated: '0 GB',
      available: '5 TB',
      usage: 0,
      path: 'iqn.2024-01.com.example:storage',
      autostart: false,
      created: '2024-01-15'
    },
    {
      id: 'pool-005',
      name: 'ceph-pool',
      type: 'ceph',
      state: 'active',
      capacity: '20 TB',
      allocated: '18 TB',
      available: '2 TB',
      usage: 90,
      path: 'rbd:pool=vms',
      autostart: true,
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
    this.pools = this.dummyPools;
    this.loading = false;
  }

  private getColumns(): Column[] {
    return [
      { key: 'name', label: 'Name', type: 'link' },
      { key: 'type', label: 'Type' },
      { key: 'state', label: 'State', type: 'status' },
      { key: 'capacity', label: 'Capacity' },
      { key: 'allocated', label: 'Allocated' },
      { key: 'available', label: 'Available' },
      { key: 'usage', label: 'Usage %' },
      { key: 'path', label: 'Path/Target' },
      { key: 'autostart', label: 'Autostart' }
    ];
  }

  private getActions(pool: StoragePool): ActionItem[] {
    const actions: ActionItem[] = [
      { label: 'View Details', action: 'view' },
      { label: 'Browse', action: 'browse' }
    ];

    if (pool.state === 'active') {
      actions.push(
        { label: 'Refresh', action: 'refresh' },
        { label: 'Stop', action: 'stop' }
      );
    } else {
      actions.push(
        { label: 'Start', action: 'start' }
      );
    }

    actions.push(
      { label: 'Edit', action: 'edit' },
      { label: 'Delete', action: 'delete', danger: true }
    );

    return actions;
  }

  private getFilteredData(): StoragePool[] {
    let data = this.pools;

    // Filter by tab
    if (this.activeTab === 'active') {
      data = data.filter(pool => pool.state === 'active');
    } else if (this.activeTab === 'inactive') {
      data = data.filter(pool => pool.state === 'inactive');
    } else if (this.activeTab === 'local') {
      data = data.filter(pool => ['dir', 'fs', 'logical', 'disk'].includes(pool.type));
    } else if (this.activeTab === 'network') {
      data = data.filter(pool => ['iscsi', 'nfs', 'gluster', 'ceph'].includes(pool.type));
    }

    // Filter by search query
    if (this.searchQuery) {
      data = data.filter(pool => 
        JSON.stringify(pool).toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    }

    return data;
  }

  private async handleTabChange(event: CustomEvent) {
    this.activeTab = event.detail.tabId;
  }


  private handleCellClick(event: CustomEvent) {
    const pool = event.detail.item as StoragePool;
    this.viewDetails(pool);
  }

  private handleAction(event: CustomEvent) {
    const { action, item } = event.detail;
    const pool = item as StoragePool;
    
    switch (action) {
      case 'view':
        this.viewDetails(pool);
        break;
      case 'browse':
        this.browsePool(pool);
        break;
      case 'refresh':
        this.refreshPool(pool);
        break;
      case 'start':
      case 'stop':
        this.changePoolState(pool, action);
        break;
      case 'edit':
        this.editPool(pool);
        break;
      case 'delete':
        this.deletePool(pool);
        break;
    }
  }

  private viewDetails(pool: StoragePool) {
    this.selectedPool = pool;
    this.showDetails = true;
  }

  private browsePool(pool: StoragePool) {
    console.log('Browsing pool:', pool.name);
    // Would open file browser for the pool
  }

  private refreshPool(pool: StoragePool) {
    console.log('Refreshing pool:', pool.name);
    // Would refresh pool statistics
  }

  private changePoolState(pool: StoragePool, action: string) {
    console.log(`Changing pool ${pool.name} state to:`, action);
    // Would call API to change pool state
  }

  private editPool(pool: StoragePool) {
    console.log('Editing pool:', pool.name);
    // Would open edit dialog
  }

  private deletePool(pool: StoragePool) {
    this.itemToDelete = {
      name: pool.name,
      type: 'Storage Pool'
    };
    this.showDeleteModal = true;
  }

  private async handleDelete(event: CustomEvent) {
    const item = event.detail.item;
    this.isDeleting = true;
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Remove from list
    this.pools = this.pools.filter(pool => pool.id !== item.id);
    
    this.isDeleting = false;
    this.showDeleteModal = false;
    this.itemToDelete = null;
  }

  private handleCreateNew() {
    this.createResourceValue = JSON.stringify({
      apiVersion: 'v1',
      kind: 'StoragePool',
      metadata: {
        name: 'new-pool'
      },
      spec: {
        type: 'dir',
        path: '/var/lib/libvirt/new-pool',
        capacity: '100Gi',
        autostart: true
      }
    }, null, 2);
    this.showCreateDrawer = true;
  }

  private async handleCreateResource(event: CustomEvent) {
    this.isCreating = true;
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Creating pool with:', event.detail.value);
      
      // Add to list (in real app, would refresh from API)
      const newPool: StoragePool = {
        id: `pool-${Date.now()}`,
        name: 'new-pool',
        type: 'dir',
        state: 'inactive',
        capacity: '100 GB',
        allocated: '0 GB',
        available: '100 GB',
        usage: 0,
        path: '/var/lib/libvirt/new-pool',
        autostart: true,
        created: new Date().toISOString().split('T')[0] || ''
      };
      this.pools = [...this.pools, newPool];
      
      this.showCreateDrawer = false;
      this.createResourceValue = '';
    } catch (error) {
      console.error('Failed to create pool:', error);
    } finally {
      this.isCreating = false;
    }
  }


  private getUsageClass(usage: number): string {
    if (usage >= 90) return 'usage-danger';
    if (usage >= 75) return 'usage-warning';
    return '';
  }

  override render() {
    const filteredData = this.getFilteredData();

    return html`
      <div class="container">
        <div class="header">
          <h1>Storage Pools</h1>
        </div>

        <tab-group
          .tabs=${this.tabs}
          .activeTab=${this.activeTab}
          @tab-change=${this.handleTabChange}
        ></tab-group>

        <div class="controls">
          <div class="search-container">
            <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input 
              class="search-input"
              type="text"
              placeholder="Search storage pools..."
              .value=${this.searchQuery}
              @input=${(e: Event) => this.searchQuery = (e.target as HTMLInputElement).value}
            />
          </div>
          <button class="btn-create" @click=${this.handleCreateNew}>
            <span>+ New Pool</span>
          </button>
        </div>

        <div class="content">
          ${this.loading ? html`
            <loading-state message="Loading storage pools..."></loading-state>
          ` : filteredData.length === 0 ? html`
            <empty-state
              icon="🗄️"
              title="No storage pools found"
              description=${this.searchQuery 
                ? "No pools match your search criteria" 
                : "Create your first storage pool to get started"}
            ></empty-state>
          ` : html`
            <resource-table
              .columns=${this.getColumns()}
              .data=${filteredData.map(pool => ({
                ...pool,
                autostart: pool.autostart ? 'Yes' : 'No',
                usage: html`
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span>${pool.usage}%</span>
                    <div class="usage-bar" style="width: 60px;">
                      <div class="usage-fill ${this.getUsageClass(pool.usage)}" 
                           style="width: ${pool.usage}%"></div>
                    </div>
                  </div>
                `
              }))}
              .actions=${(item: StoragePool) => this.getActions(item)}
              @cell-click=${this.handleCellClick}
              @action=${this.handleAction}
            ></resource-table>
          `}
        </div>

        ${this.showDetails ? html`
          <detail-drawer
            .title=${this.selectedPool?.name || 'Pool Details'}
            .open=${this.showDetails}
            @close=${() => { this.showDetails = false; this.selectedPool = null; }}
          >
            <div style="padding: 20px;">
              <h3>Storage Pool Information</h3>
              <pre>${JSON.stringify(this.selectedPool, null, 2)}</pre>
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
            .title=${'Create Storage Pool'}
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
    'virtualization-storage-pools': VirtualizationStoragePools;
  }
}
