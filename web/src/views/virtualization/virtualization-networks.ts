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
import { virtualizationAPI } from '../../services/virtualization-api';
import type { VirtualNetwork as BaseVirtualNetwork } from '../../types/virtualization';

// Extend the base VirtualNetwork interface to match the actual API response
interface VirtualNetwork extends Omit<BaseVirtualNetwork, 'type' | 'ip' | 'netmask'> {
  uuid: string;
  state: 'active' | 'inactive';
  bridge: string;
  mode: string;
  ip_range: {
    address: string;
    netmask: string;
  };
  autostart: boolean;
  persistent: boolean;
}

interface NetworksResponse {
  count: number;
  networks: VirtualNetwork[];
}

@customElement('virtualization-networks')
export class VirtualizationNetworks extends LitElement {
  @state() private networks: VirtualNetwork[] = [];
  @state() private searchQuery = '';
  @state() private loading = false;
  @state() private error: string | null = null;
  @state() private totalCount = 0;
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
    { id: 'persistent', label: 'Persistent' },
    { id: 'autostart', label: 'Autostart' }
  ];


  override connectedCallback() {
    super.connectedCallback();
    this.loadData();
  }

  private async loadData() {
    this.loading = true;
    this.error = null;
    
    try {
      // Use the virtualizationAPI service which handles authentication and response structure
      const response = await virtualizationAPI.listNetworks();
      
      // Map the response to match our local interface structure
      this.networks = (response || []).map(net => ({
        name: net.name,
        uuid: net.uuid || '',
        state: net.state,
        bridge: net.bridge || '',
        mode: (net as any).mode || '',
        ip_range: {
          address: (net as any).ip_range?.address || net.ip || '',
          netmask: (net as any).ip_range?.netmask || net.netmask || ''
        },
        autostart: net.autostart || false,
        persistent: (net as any).persistent !== undefined ? (net as any).persistent : true
      }));
      this.totalCount = this.networks.length;
    } catch (error) {
      console.error('Failed to load networks:', error);
      this.error = error instanceof Error ? error.message : 'Failed to load networks';
      this.networks = [];
    } finally {
      this.loading = false;
    }
  }

  private getColumns(): Column[] {
    return [
      { key: 'name', label: 'Name', type: 'link' },
      { key: 'state', label: 'State', type: 'status' },
      { key: 'bridge', label: 'Bridge' },
      { key: 'mode', label: 'Mode' },
      { key: 'ip_address', label: 'IP Address' },
      { key: 'netmask', label: 'Netmask' },
      { key: 'autostart', label: 'Autostart' },
      { key: 'persistent', label: 'Persistent' },
      { key: 'uuid', label: 'UUID' }
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
      switch (this.activeTab) {
        case 'active':
        case 'inactive':
          data = data.filter(net => net.state === this.activeTab);
          break;
        case 'persistent':
          data = data.filter(net => net.persistent);
          break;
        case 'autostart':
          data = data.filter(net => net.autostart);
          break;
      }
    }

    // Filter by search query
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      data = data.filter(net => 
        net.name.toLowerCase().includes(query) ||
        net.bridge.toLowerCase().includes(query) ||
        net.uuid.toLowerCase().includes(query) ||
        net.ip_range.address.toLowerCase().includes(query)
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

  private async changeNetworkState(network: VirtualNetwork, action: string) {
    try {
      switch (action) {
        case 'start':
          await virtualizationAPI.startNetwork(network.name);
          break;
        case 'stop':
          await virtualizationAPI.stopNetwork(network.name);
          break;
        case 'restart':
          // Stop then start
          await virtualizationAPI.stopNetwork(network.name);
          await virtualizationAPI.startNetwork(network.name);
          break;
      }
      // Reload data after state change
      await this.loadData();
    } catch (error) {
      console.error(`Failed to ${action} network:`, error);
      this.error = error instanceof Error ? error.message : `Failed to ${action} network`;
    }
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

  private formatIPRange(network: VirtualNetwork): string {
    if (network.ip_range.address && network.ip_range.netmask) {
      return `${network.ip_range.address}/${network.ip_range.netmask}`;
    }
    return 'Not configured';
  }

  private async handleDelete() {
    if (!this.itemToDelete) return;
    
    this.isDeleting = true;
    
    try {
      const networkToDelete = this.networks.find(n => n.name === this.itemToDelete?.name);
      
      if (networkToDelete) {
        await virtualizationAPI.deleteNetwork(networkToDelete.name);
        
        // Reload the data after successful deletion
        await this.loadData();
      }
    } catch (error) {
      console.error('Failed to delete network:', error);
      this.error = error instanceof Error ? error.message : 'Failed to delete network';
    } finally {
      this.isDeleting = false;
      this.showDeleteModal = false;
      this.itemToDelete = null;
    }
  }

  private handleCreateNew() {
    this.createResourceValue = JSON.stringify({
      name: 'new-network',
      bridge: 'virbr99',
      mode: 'nat',
      ip_range: {
        address: '192.168.99.0',
        netmask: '255.255.255.0'
      },
      autostart: false,
      persistent: true
    }, null, 2);
    this.showCreateDrawer = true;
  }

  private handleSearchChange(e: CustomEvent) {
    this.searchQuery = e.detail.value;
  }

  private async handleCreateResource(event: CustomEvent) {
    this.isCreating = true;
    
    try {
      const networkConfig = JSON.parse(event.detail.value);
      
      // Transform the config to match the API expected format
      const apiConfig = {
        name: networkConfig.name,
        type: 'bridge' as const,  // Default type
        state: 'inactive' as const,
        bridge: networkConfig.bridge,
        ip: networkConfig.ip_range?.address,
        netmask: networkConfig.ip_range?.netmask,
        autostart: networkConfig.autostart
      };
      
      await virtualizationAPI.createNetwork(apiConfig);
      
      // Reload the data after successful creation
      await this.loadData();
      
      this.showCreateDrawer = false;
      this.createResourceValue = '';
    } catch (error) {
      console.error('Failed to create network:', error);
      this.error = error instanceof Error ? error.message : 'Failed to create network';
    } finally {
      this.isCreating = false;
    }
  }


  private renderNetworkMode(mode: string) {
    if (!mode) return html`<span>-</span>`;
    const badgeClass = mode === 'nat' ? 'badge-nat' : 
                      mode === 'bridge' ? 'badge-bridge' : 
                      'badge-isolated';
    return html`<span class="network-type-badge ${badgeClass}">${mode || 'Default'}</span>`;
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
          <search-input
            .placeholder=${'Search networks...'}
            .value=${this.searchQuery}
            @search-change=${this.handleSearchChange}
          ></search-input>
          <button class="btn-create" @click=${this.handleCreateNew}>
            <span>+ New Network</span>
          </button>
        </div>

        <div class="content">
          ${this.loading ? html`
            <loading-state message="Loading virtual networks..."></loading-state>
          ` : this.error ? html`
            <empty-state
              icon="❌"
              title="Error loading networks"
              description=${this.error}
            ></empty-state>
          ` : filteredData.length === 0 ? html`
            <empty-state
              icon="🔗"
              title="No virtual networks found"
              description=${this.searchQuery 
                ? "No networks match your search criteria" 
                : this.networks.length === 0 
                  ? "No virtual networks configured. Create your first network to get started."
                  : "No networks match the selected filter"}
            ></empty-state>
          ` : html`
            <resource-table
              .columns=${this.getColumns()}
              .data=${filteredData.map(net => ({
                ...net,
                mode: this.renderNetworkMode(net.mode),
                ip_address: net.ip_range.address || 'Not configured',
                netmask: net.ip_range.netmask || 'Not configured',
                autostart: net.autostart ? 'Yes' : 'No',
                persistent: net.persistent ? 'Yes' : 'No'
              }))}
              .getActions=${(item: VirtualNetwork) => this.getActions(item)}
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
              <h3>Network Configuration</h3>
              <p><strong>UUID:</strong> ${this.selectedNetwork?.uuid}</p>
              <p><strong>State:</strong> ${this.selectedNetwork?.state}</p>
              <p><strong>Bridge:</strong> ${this.selectedNetwork?.bridge}</p>
              <p><strong>Mode:</strong> ${this.selectedNetwork?.mode || 'Default'}</p>
              <p><strong>Autostart:</strong> ${this.selectedNetwork?.autostart ? 'Enabled' : 'Disabled'}</p>
              <p><strong>Persistent:</strong> ${this.selectedNetwork?.persistent ? 'Yes' : 'No'}</p>
              
              <h3>IP Configuration</h3>
              <p><strong>IP Address:</strong> ${this.selectedNetwork?.ip_range.address || 'Not configured'}</p>
              <p><strong>Netmask:</strong> ${this.selectedNetwork?.ip_range.netmask || 'Not configured'}</p>
              <p><strong>IP Range:</strong> ${this.selectedNetwork ? this.formatIPRange(this.selectedNetwork) : 'Not configured'}</p>
              
              <h3>Raw Configuration</h3>
              <pre style="background: var(--vscode-editor-background); padding: 10px; border-radius: 4px;">${JSON.stringify(this.selectedNetwork, null, 2)}</pre>
            </div>
          </detail-drawer>
        ` : ''}

        ${this.showDeleteModal && this.itemToDelete ? html`
          <delete-modal
            .show=${true}
            .item=${this.itemToDelete}
            .loading=${this.isDeleting}
            @confirm-delete=${this.handleDelete}
            @cancel-delete=${() => { 
              this.showDeleteModal = false; 
              this.itemToDelete = null; 
            }}
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
