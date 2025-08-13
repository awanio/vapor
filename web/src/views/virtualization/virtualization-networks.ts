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

interface VirtualNetwork {
  id: string;
  name: string;
  type: 'bridge' | 'nat' | 'isolated' | 'open' | 'macvtap' | 'host';
  state: 'active' | 'inactive';
  bridge: string;
  ipRange: string;
  dhcp: boolean;
  autostart: boolean;
  persistent: boolean;
  devices: number;
  created: string;
}

@customElement('virtualization-networks')
export class VirtualizationNetworks extends LitElement {
  @property({ type: Array }) networks: VirtualNetwork[] = [];
  @property({ type: String }) searchQuery = '';
  @property({ type: Boolean }) loading = false;
  @property({ type: String }) error: string | null = null;
  
  @state() private activeTab = 'all';
  @state() private showDetails = false;
  @state() private selectedNetwork: VirtualNetwork | null = null;
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


    .network-type-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: 500;
      text-transform: uppercase;
    }

    .badge-bridge {
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
    }

    .badge-nat {
      background: var(--vscode-testing-iconPassed);
      color: white;
    }

    .badge-isolated {
      background: var(--vscode-testing-iconQueued);
      color: white;
    }

    .badge-host {
      background: var(--vscode-testing-iconFailed);
      color: white;
    }
  `;

  private tabs: Tab[] = [
    { id: 'all', label: 'All Networks' },
    { id: 'active', label: 'Active' },
    { id: 'inactive', label: 'Inactive' },
    { id: 'bridge', label: 'Bridge' },
    { id: 'nat', label: 'NAT' },
    { id: 'isolated', label: 'Isolated' }
  ];

  private dummyNetworks: VirtualNetwork[] = [
    {
      id: 'net-001',
      name: 'default',
      type: 'nat',
      state: 'active',
      bridge: 'virbr0',
      ipRange: '192.168.122.0/24',
      dhcp: true,
      autostart: true,
      persistent: true,
      devices: 3,
      created: '2024-01-01'
    },
    {
      id: 'net-002',
      name: 'br0-bridged',
      type: 'bridge',
      state: 'active',
      bridge: 'br0',
      ipRange: '192.168.1.0/24',
      dhcp: false,
      autostart: true,
      persistent: true,
      devices: 5,
      created: '2024-01-05'
    },
    {
      id: 'net-003',
      name: 'isolated-network',
      type: 'isolated',
      state: 'active',
      bridge: 'virbr1',
      ipRange: '10.0.0.0/24',
      dhcp: true,
      autostart: false,
      persistent: true,
      devices: 2,
      created: '2024-01-10'
    },
    {
      id: 'net-004',
      name: 'test-network',
      type: 'nat',
      state: 'inactive',
      bridge: 'virbr2',
      ipRange: '172.16.0.0/24',
      dhcp: true,
      autostart: false,
      persistent: false,
      devices: 0,
      created: '2024-01-15'
    },
    {
      id: 'net-005',
      name: 'host-only',
      type: 'host',
      state: 'active',
      bridge: 'virbr3',
      ipRange: '192.168.100.0/24',
      dhcp: true,
      autostart: true,
      persistent: true,
      devices: 1,
      created: '2024-01-20'
    },
    {
      id: 'net-006',
      name: 'macvtap-net',
      type: 'macvtap',
      state: 'active',
      bridge: 'eth0',
      ipRange: 'N/A',
      dhcp: false,
      autostart: true,
      persistent: true,
      devices: 2,
      created: '2024-02-01'
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
    this.networks = this.dummyNetworks;
    this.loading = false;
  }

  private getColumns(): Column[] {
    return [
      { key: 'name', label: 'Name', type: 'link' },
      { key: 'type', label: 'Type' },
      { key: 'state', label: 'State', type: 'status' },
      { key: 'bridge', label: 'Bridge/Interface' },
      { key: 'ipRange', label: 'IP Range' },
      { key: 'dhcp', label: 'DHCP' },
      { key: 'devices', label: 'Connected Devices' },
      { key: 'autostart', label: 'Autostart' },
      { key: 'created', label: 'Created' }
    ];
  }

  private getActions(network: VirtualNetwork): ActionItem[] {
    const actions: ActionItem[] = [
      { label: 'View Details', action: 'view' },
      { label: 'View DHCP Leases', action: 'dhcp-leases' }
    ];

    if (network.state === 'active') {
      actions.push(
        { label: 'Stop', action: 'stop' },
        { label: 'Restart', action: 'restart' }
      );
    } else {
      actions.push(
        { label: 'Start', action: 'start' }
      );
    }

    actions.push(
      { label: 'Edit', action: 'edit' },
      { label: 'Clone', action: 'clone' },
      { label: 'Delete', action: 'delete', danger: true }
    );

    return actions;
  }

  private getFilteredData(): VirtualNetwork[] {
    let data = this.networks;

    // Filter by tab
    if (this.activeTab !== 'all') {
      if (this.activeTab === 'active' || this.activeTab === 'inactive') {
        data = data.filter(net => net.state === this.activeTab);
      } else {
        data = data.filter(net => net.type === this.activeTab);
      }
    }

    // Filter by search query
    if (this.searchQuery) {
      data = data.filter(net => 
        JSON.stringify(net).toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    }

    return data;
  }

  private async handleTabChange(event: CustomEvent) {
    this.activeTab = event.detail.tabId;
  }


  private handleCellClick(event: CustomEvent) {
    const network = event.detail.item as VirtualNetwork;
    this.viewDetails(network);
  }

  private handleAction(event: CustomEvent) {
    const { action, item } = event.detail;
    const network = item as VirtualNetwork;
    
    switch (action) {
      case 'view':
        this.viewDetails(network);
        break;
      case 'dhcp-leases':
        this.viewDHCPLeases(network);
        break;
      case 'start':
      case 'stop':
      case 'restart':
        this.changeNetworkState(network, action);
        break;
      case 'clone':
        this.cloneNetwork(network);
        break;
      case 'edit':
        this.editNetwork(network);
        break;
      case 'delete':
        this.deleteNetwork(network);
        break;
    }
  }

  private viewDetails(network: VirtualNetwork) {
    this.selectedNetwork = network;
    this.showDetails = true;
  }

  private viewDHCPLeases(network: VirtualNetwork) {
    console.log('Viewing DHCP leases for:', network.name);
    // Would open DHCP leases dialog
  }

  private changeNetworkState(network: VirtualNetwork, action: string) {
    console.log(`Changing network ${network.name} state to:`, action);
    // Would call API to change network state
  }

  private cloneNetwork(network: VirtualNetwork) {
    console.log('Cloning network:', network.name);
    // Would open clone dialog
  }

  private editNetwork(network: VirtualNetwork) {
    console.log('Editing network:', network.name);
    // Would open edit dialog
  }

  private deleteNetwork(network: VirtualNetwork) {
    this.itemToDelete = {
      name: network.name,
      type: 'Virtual Network'
    };
    this.showDeleteModal = true;
  }

  private async handleDelete(event: CustomEvent) {
    const item = event.detail.item;
    this.isDeleting = true;
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Remove from list
    this.networks = this.networks.filter(net => net.id !== item.id);
    
    this.isDeleting = false;
    this.showDeleteModal = false;
    this.itemToDelete = null;
  }

  private handleCreateNew() {
    this.createResourceValue = JSON.stringify({
      apiVersion: 'v1',
      kind: 'VirtualNetwork',
      metadata: {
        name: 'new-network'
      },
      spec: {
        type: 'nat',
        bridge: 'virbr10',
        ipRange: '192.168.200.0/24',
        dhcp: {
          enabled: true,
          range: {
            start: '192.168.200.2',
            end: '192.168.200.254'
          }
        },
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
      console.log('Creating network with:', event.detail.value);
      
      // Add to list (in real app, would refresh from API)
      const newNetwork: VirtualNetwork = {
        id: `net-${Date.now()}`,
        name: 'new-network',
        type: 'nat',
        state: 'inactive',
        bridge: 'virbr10',
        ipRange: '192.168.200.0/24',
        dhcp: true,
        autostart: true,
        persistent: true,
        devices: 0,
        created: new Date().toISOString().split('T')[0] || ''
      };
      this.networks = [...this.networks, newNetwork];
      
      this.showCreateDrawer = false;
      this.createResourceValue = '';
    } catch (error) {
      console.error('Failed to create network:', error);
    } finally {
      this.isCreating = false;
    }
  }


  private renderNetworkType(type: string) {
    const badgeClass = `badge-${type}`;
    return html`<span class="network-type-badge ${badgeClass}">${type}</span>`;
  }

  override render() {
    const filteredData = this.getFilteredData();

    return html`
      <div class="container">
        <div class="header">
          <h1>Virtual Networks</h1>
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
              placeholder="Search networks..."
              .value=${this.searchQuery}
              @input=${(e: Event) => this.searchQuery = (e.target as HTMLInputElement).value}
            />
          </div>
          <button class="btn-create" @click=${this.handleCreateNew}>
            <span>+ New Network</span>
          </button>
        </div>

        <div class="content">
          ${this.loading ? html`
            <loading-state message="Loading virtual networks..."></loading-state>
          ` : filteredData.length === 0 ? html`
            <empty-state
              icon="🔗"
              title="No virtual networks found"
              description=${this.searchQuery 
                ? "No networks match your search criteria" 
                : "Create your first virtual network to get started"}
            ></empty-state>
          ` : html`
            <resource-table
              .columns=${this.getColumns()}
              .data=${filteredData.map(net => ({
                ...net,
                type: this.renderNetworkType(net.type),
                dhcp: net.dhcp ? 'Enabled' : 'Disabled',
                autostart: net.autostart ? 'Yes' : 'No'
              }))}
              .actions=${(item: VirtualNetwork) => this.getActions(item)}
              @cell-click=${this.handleCellClick}
              @action=${this.handleAction}
            ></resource-table>
          `}
        </div>

        ${this.showDetails ? html`
          <detail-drawer
            .title=${this.selectedNetwork?.name || 'Network Details'}
            .open=${this.showDetails}
            @close=${() => { this.showDetails = false; this.selectedNetwork = null; }}
          >
            <div style="padding: 20px;">
              <h3>Virtual Network Information</h3>
              <pre>${JSON.stringify(this.selectedNetwork, null, 2)}</pre>
              
              ${this.selectedNetwork?.dhcp ? html`
                <h3>DHCP Configuration</h3>
                <p>DHCP Range: ${this.selectedNetwork.ipRange}</p>
                <p>Active Leases: ${this.selectedNetwork.devices}</p>
              ` : ''}
              
              <h3>Bridge Information</h3>
              <p>Bridge Name: ${this.selectedNetwork?.bridge}</p>
              <p>Type: ${this.selectedNetwork?.type}</p>
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
            .title=${'Create Virtual Network'}
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
    'virtualization-networks': VirtualizationNetworks;
  }
}
