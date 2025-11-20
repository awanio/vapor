import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { StoreController } from '@nanostores/lit';
import '../../components/ui/search-input.js';
import '../../components/ui/empty-state.js';
import '../../components/ui/loading-state.js';
import '../../components/ui/status-badge.js';
import '../../components/tabs/tab-group.js';
import '../../components/tables/resource-table.js';
import '../../components/modals/delete-modal.js';
import '../../components/drawers/create-resource-drawer.js';
import type { Tab } from '../../components/tabs/tab-group.js';
import type { Column } from '../../components/tables/resource-table.js';
import type { ActionItem } from '../../components/ui/action-dropdown.js';
import type { DeleteItem } from '../../components/modals/delete-modal.js';
import { virtualizationAPI } from '../../services/virtualization-api';
import type { VirtualNetwork as BaseVirtualNetwork } from '../../types/virtualization';
import { $virtualizationEnabled, $virtualizationDisabledMessage } from '../../stores/virtualization';
import { VirtualizationDisabledError } from '../../utils/api-errors';

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


@customElement('virtualization-networks')
export class VirtualizationNetworks extends LitElement {
  private virtualizationEnabledController = new StoreController(this, $virtualizationEnabled);
  private virtualizationDisabledMessageController = new StoreController(this, $virtualizationDisabledMessage);
  @state() private networks: VirtualNetwork[] = [];
  @state() private searchQuery = '';
  @state() private loading = false;
  @state() private error: string | null = null;
  @state() private activeTab = 'all';
  @state() private showDetailDrawer = false;
  @state() private selectedNetwork: VirtualNetwork | null = null;
  @state() private isLoadingDetail = false;
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

    /* Detail Drawer Styles - Similar to ISO management */
    .drawer {
      position: fixed;
      top: 0;
      right: 0;
      width: 50%;
      height: 100%;
      background: var(--vscode-editor-background, #1e1e1e);
      border-left: 1px solid var(--vscode-widget-border, #454545);
      box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
      z-index: 1001;
      overflow-y: auto;
      animation: slideIn 0.3s ease-out;
    }

    @media (max-width: 1024px) {
      .drawer {
        width: 80%;
      }
    }

    @media (max-width: 768px) {
      .drawer {
        width: 100%;
      }
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
      }
      to {
        transform: translateX(0);
      }
    }

    .drawer-header {
      padding: 20px 24px;
      border-bottom: 1px solid var(--vscode-editorWidget-border, #464647);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--vscode-editor-inactiveSelectionBackground, #252526);
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .drawer-title {
      font-size: 18px;
      font-weight: 500;
      color: var(--vscode-foreground, #cccccc);
      margin: 0;
    }

    .drawer-content {
      padding: 24px;
      overflow-y: auto;
    }

    .drawer-footer {
      padding: 16px 24px;
      border-top: 1px solid var(--vscode-editorWidget-border, #464647);
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      background: var(--vscode-editor-inactiveSelectionBackground, #252526);
      position: sticky;
      bottom: 0;
      z-index: 10;
    }

    .close-btn {
      background: transparent;
      border: none;
      color: var(--vscode-foreground, #cccccc);
      cursor: pointer;
      padding: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      font-size: 20px;
      line-height: 1;
      transition: all 0.2s;
    }

    .close-btn:hover {
      background: var(--vscode-toolbar-hoverBackground, rgba(90, 93, 94, 0.31));
      color: var(--vscode-icon-foreground, #c5c5c5);
    }

    .detail-sections {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .detail-section {
      margin-bottom: 20px;
    }

    .detail-section h3 {
      font-size: 14px;
      font-weight: 600;
      color: var(--vscode-foreground, #cccccc);
      margin: 0 0 12px 0;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--vscode-widget-border, #454545);
    }

    .detail-item {
      display: flex;
      align-items: flex-start;
      padding: 8px 0;
      font-size: 13px;
      line-height: 1.5;
    }

    .detail-item:not(:last-child) {
      border-bottom: 1px solid var(--vscode-widget-border, rgba(255, 255, 255, 0.1));
    }

    .detail-key {
      flex: 0 0 180px;
      color: var(--vscode-descriptionForeground, #9d9d9d);
      font-weight: 500;
    }

    .detail-value {
      flex: 1;
      color: var(--vscode-foreground, #cccccc);
      word-break: break-word;
    }

    .detail-value.monospace {
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 12px;
    }

    .detail-item.nested {
      flex-direction: column;
    }

    .nested-content {
      margin-top: 8px;
      margin-left: 180px;
      padding-left: 12px;
      border-left: 2px solid var(--vscode-widget-border, #454545);
    }

    .badge-inline {
      display: inline-flex;
      align-items: center;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: 500;
      gap: 4px;
    }

    .badge-active {
      background: rgba(115, 201, 145, 0.2);
      color: #73c991;
      border: 1px solid rgba(115, 201, 145, 0.3);
    }

    .badge-inactive {
      background: rgba(161, 38, 13, 0.2);
      color: #ff8c66;
      border: 1px solid rgba(161, 38, 13, 0.3);
    }

    .badge-enabled {
      background: rgba(56, 138, 52, 0.2);
      color: #73c991;
      border: 1px solid rgba(56, 138, 52, 0.3);
    }

    .badge-disabled {
      background: rgba(161, 38, 13, 0.2);
      color: #ff8c66;
      border: 1px solid rgba(161, 38, 13, 0.3);
    }

    .dhcp-hosts-list {
      margin-top: 8px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .dhcp-host-item {
      padding: 6px 0;
      display: flex;
      gap: 20px;
      font-size: 12px;
      border-bottom: 1px solid var(--vscode-widget-border, rgba(255, 255, 255, 0.05));
    }

    .dhcp-host-item:last-child {
      border-bottom: none;
    }

    .dhcp-host-item span {
      flex: 1;
      color: var(--vscode-foreground, #cccccc);
    }

    .dhcp-host-item strong {
      color: var(--vscode-descriptionForeground, #9d9d9d);
      font-weight: 500;
      margin-right: 8px;
    }

    .raw-data {
      background: var(--vscode-editor-background, #1e1e1e);
      border: 1px solid var(--vscode-editorWidget-border, #464647);
      border-radius: 4px;
      padding: 12px;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 12px;
      overflow-x: auto;
      max-height: 400px;
      overflow-y: auto;
      margin-top: 8px;
    }

    details {
      cursor: pointer;
    }

    details summary {
      padding: 8px 12px;
      background: var(--vscode-button-secondaryBackground, #3c3c3c);
      color: var(--vscode-button-secondaryForeground, #cccccc);
      border-radius: 4px;
      font-size: 13px;
      font-weight: 500;
      transition: background 0.2s;
      user-select: none;
    }

    details summary:hover {
      background: var(--vscode-button-secondaryHoverBackground, #45494e);
    }

    details[open] summary {
      border-radius: 4px 4px 0 0;
      margin-bottom: 0;
    }


    .btn {
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border: 1px solid transparent;
      font-family: inherit;
    }

    .btn-primary {
      background: var(--vscode-button-background, #0e639c);
      color: var(--vscode-button-foreground, #ffffff);
      border: 1px solid var(--vscode-button-background, #0e639c);
    }

    .btn-primary:hover:not(:disabled) {
      background: var(--vscode-button-hoverBackground, #1177bb);
      border-color: var(--vscode-button-hoverBackground, #1177bb);
    }

    .btn-secondary {
      background: var(--vscode-button-secondaryBackground, #3c3c3c);
      color: var(--vscode-button-secondaryForeground, #cccccc);
      border: 1px solid var(--vscode-button-border, #5a5a5a);
    }

    .btn-secondary:hover:not(:disabled) {
      background: var(--vscode-button-secondaryHoverBackground, #45494e);
      border-color: var(--vscode-button-border, #5a5a5a);
    }

    .btn-secondary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
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
      
      console.log('Networks API response:', response); // Debug log
      
      // Map the response to match our local interface structure
      this.networks = (response || []).map(net => ({
        name: net.name || 'Unnamed Network',
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
    } catch (error) {
      console.error('Failed to load networks:', error);
      if (!(error instanceof VirtualizationDisabledError)) {
        this.error = error instanceof Error ? error.message : 'Failed to load networks';
      }
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
    const { item, column } = event.detail;
    
    // If the name column is clicked, open the detail drawer
    if (column.key === 'name') {
      this.viewNetworkDetail(item as VirtualNetwork);
    }
  }

  private handleAction(event: CustomEvent) {
    const { action, item } = event.detail;
    const network = item as VirtualNetwork;
    
    switch (action) {
      case 'view':
        this.viewNetworkDetail(network);
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

  private async viewNetworkDetail(network: VirtualNetwork) {
    this.showDetailDrawer = true;
    this.isLoadingDetail = true;
    this.selectedNetwork = network;
    
    console.log('Opening detail drawer for network:', network); // Debug log
    
    try {
      // Fetch detailed information from API
      const detailedNetwork = await virtualizationAPI.getNetwork(network.name);
      
      console.log('Detailed network response:', detailedNetwork); // Debug log
      
      // Map the response to match our local interface structure
      this.selectedNetwork = {
        name: detailedNetwork.name || network.name || 'Unnamed Network',
        uuid: detailedNetwork.uuid || network.uuid,
        state: detailedNetwork.state,
        bridge: detailedNetwork.bridge || '',
        mode: (detailedNetwork as any).mode || network.mode || '',
        ip_range: {
          address: (detailedNetwork as any).ip_range?.address || detailedNetwork.ip || '',
          netmask: (detailedNetwork as any).ip_range?.netmask || detailedNetwork.netmask || ''
        },
        autostart: detailedNetwork.autostart || false,
        persistent: (detailedNetwork as any).persistent !== undefined ? (detailedNetwork as any).persistent : true,
        // Include any additional fields from the detailed response
        dhcp: detailedNetwork.dhcp,
        forward: detailedNetwork.forward
      } as VirtualNetwork & { dhcp?: any; forward?: any };
    } catch (error) {
      console.error('Failed to fetch network details:', error);
      if (!(error instanceof VirtualizationDisabledError)) {
        this.error = error instanceof Error ? error.message : 'Failed to load network details';
      }
      // Keep the basic network info even if detailed fetch fails
    } finally {
      this.isLoadingDetail = false;
    }
  }

  private closeDetailDrawer() {
    this.showDetailDrawer = false;
    this.selectedNetwork = null;
    this.isLoadingDetail = false;
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
      if (!(error instanceof VirtualizationDisabledError)) {
        this.error = error instanceof Error ? error.message : 'Failed to delete network';
      }
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
      if (!(error instanceof VirtualizationDisabledError)) {
        this.error = error instanceof Error ? error.message : 'Failed to create network';
      }
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

  private renderDetailDrawer() {
    if (!this.selectedNetwork) return '';
    
    const network = this.selectedNetwork;
    const extendedNetwork = network as any;
    
    return html`
      <div class="drawer">
        <div class="drawer-header">
          <h2 class="drawer-title">${network.name}</h2>
          <button class="close-btn" @click=${this.closeDetailDrawer}>✕</button>
        </div>
        
        <div class="drawer-content">
          ${this.isLoadingDetail ? html`
            <loading-state message="Loading network details..."></loading-state>
          ` : html`
            <div class="network-details-content">
              <div class="detail-sections">
                <!-- Basic Information -->
                <div class="detail-section">
                  <h3>Basic Information</h3>
                  
                  <div class="detail-item">
                    <strong class="detail-key">Name:</strong>
                    <span class="detail-value">${network.name}</span>
                  </div>
                  
                  <div class="detail-item">
                    <strong class="detail-key">UUID:</strong>
                    <span class="detail-value monospace">${network.uuid || 'Not available'}</span>
                  </div>
                  
                  <div class="detail-item">
                    <strong class="detail-key">State:</strong>
                    <span class="detail-value">
                      <span class="badge-inline ${network.state === 'active' ? 'badge-active' : 'badge-inactive'}">
                        ${network.state === 'active' ? '●' : '○'} ${network.state}
                      </span>
                    </span>
                  </div>
                  
                  <div class="detail-item">
                    <strong class="detail-key">Network Mode:</strong>
                    <span class="detail-value">${this.renderNetworkMode(network.mode)}</span>
                  </div>
                  
                  <div class="detail-item">
                    <strong class="detail-key">Bridge Interface:</strong>
                    <span class="detail-value monospace">${network.bridge || 'Not configured'}</span>
                  </div>
                  
                  <div class="detail-item">
                    <strong class="detail-key">Autostart:</strong>
                    <span class="detail-value">
                      <span class="badge-inline ${network.autostart ? 'badge-enabled' : 'badge-disabled'}">
                        ${network.autostart ? 'Enabled' : 'Disabled'}
                      </span>
                    </span>
                  </div>
                  
                  <div class="detail-item">
                    <strong class="detail-key">Persistent:</strong>
                    <span class="detail-value">
                      <span class="badge-inline ${network.persistent ? 'badge-enabled' : 'badge-disabled'}">
                        ${network.persistent ? 'Yes' : 'No'}
                      </span>
                    </span>
                  </div>
                </div>

                <!-- IP Configuration -->
                <div class="detail-section">
                  <h3>IP Configuration</h3>
                  
                  <div class="detail-item">
                    <strong class="detail-key">Network Address:</strong>
                    <span class="detail-value monospace">${network.ip_range.address || 'Not configured'}</span>
                  </div>
                  
                  <div class="detail-item">
                    <strong class="detail-key">Netmask:</strong>
                    <span class="detail-value monospace">${network.ip_range.netmask || 'Not configured'}</span>
                  </div>
                  
                  <div class="detail-item">
                    <strong class="detail-key">CIDR Notation:</strong>
                    <span class="detail-value monospace">${this.formatIPRange(network)}</span>
                  </div>
                  
                  ${network.ip_range.address && network.ip_range.netmask ? html`
                    <div class="detail-item">
                      <strong class="detail-key">Broadcast Address:</strong>
                      <span class="detail-value monospace">${this.calculateBroadcast(network.ip_range.address, network.ip_range.netmask)}</span>
                    </div>
                  ` : ''}
                </div>
                
                <!-- DHCP Configuration -->
                ${extendedNetwork.dhcp ? html`
                  <div class="detail-section">
                    <h3>DHCP Configuration</h3>
                    
                    <div class="detail-item">
                      <strong class="detail-key">DHCP Status:</strong>
                      <span class="detail-value">
                        <span class="badge-inline ${extendedNetwork.dhcp?.enabled ? 'badge-enabled' : 'badge-disabled'}">
                          ${extendedNetwork.dhcp?.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </span>
                    </div>
                    
                    ${extendedNetwork.dhcp?.start && extendedNetwork.dhcp?.end ? html`
                      <div class="detail-item">
                        <strong class="detail-key">DHCP Range:</strong>
                        <span class="detail-value monospace">
                          ${extendedNetwork.dhcp.start} - ${extendedNetwork.dhcp.end}
                        </span>
                      </div>
                      
                      <div class="detail-item">
                        <strong class="detail-key">Pool Size:</strong>
                        <span class="detail-value">
                          ${this.calculatePoolSize(extendedNetwork.dhcp.start, extendedNetwork.dhcp.end)} addresses
                        </span>
                      </div>
                    ` : ''}
                    
                    ${extendedNetwork.dhcp?.hosts && extendedNetwork.dhcp.hosts.length > 0 ? html`
                      <div class="detail-item nested">
                        <strong class="detail-key">Static Leases:</strong>
                        <div class="dhcp-hosts-list">
                          ${extendedNetwork.dhcp.hosts.map((host: any) => html`
                            <div class="dhcp-host-item">
                              <span><strong>MAC:</strong> ${host.mac}</span>
                              <span><strong>IP:</strong> ${host.ip}</span>
                              <span><strong>Name:</strong> ${host.name || 'N/A'}</span>
                            </div>
                          `)}
                        </div>
                      </div>
                    ` : ''}
                  </div>
                ` : ''}
                
                <!-- Forward Configuration -->
                ${extendedNetwork.forward ? html`
                  <div class="detail-section">
                    <h3>Network Forwarding</h3>
                    
                    <div class="detail-item">
                      <strong class="detail-key">Forward Mode:</strong>
                      <span class="detail-value">
                        <span class="badge-inline badge-enabled">
                          ${extendedNetwork.forward.mode || 'Not configured'}
                        </span>
                      </span>
                    </div>
                    
                    ${extendedNetwork.forward?.dev ? html`
                      <div class="detail-item">
                        <strong class="detail-key">Physical Device:</strong>
                        <span class="detail-value monospace">${extendedNetwork.forward.dev}</span>
                      </div>
                    ` : ''}
                    
                    ${extendedNetwork.forward?.nat ? html`
                      <div class="detail-item nested">
                        <strong class="detail-key">NAT Configuration:</strong>
                        <div class="nested-content">
                          ${extendedNetwork.forward.nat.start ? html`
                            <div class="detail-item">
                              <strong class="detail-key">Port Range Start:</strong>
                              <span class="detail-value">${extendedNetwork.forward.nat.start}</span>
                            </div>
                          ` : ''}
                          ${extendedNetwork.forward.nat.end ? html`
                            <div class="detail-item">
                              <strong class="detail-key">Port Range End:</strong>
                              <span class="detail-value">${extendedNetwork.forward.nat.end}</span>
                            </div>
                          ` : ''}
                        </div>
                      </div>
                    ` : ''}
                  </div>
                ` : ''}
                
                <!-- DNS Configuration if available -->
                ${extendedNetwork.dns ? html`
                  <div class="detail-section">
                    <h3>DNS Configuration</h3>
                    
                    ${extendedNetwork.dns.forwarders && extendedNetwork.dns.forwarders.length > 0 ? html`
                      <div class="detail-item">
                        <strong class="detail-key">DNS Forwarders:</strong>
                        <span class="detail-value">
                          ${extendedNetwork.dns.forwarders.map((dns: string) => html`
                            <span class="monospace">${dns}</span>${extendedNetwork.dns.forwarders.indexOf(dns) < extendedNetwork.dns.forwarders.length - 1 ? ', ' : ''}
                          `)}
                        </span>
                      </div>
                    ` : ''}
                    
                    ${extendedNetwork.dns.domain ? html`
                      <div class="detail-item">
                        <strong class="detail-key">Domain:</strong>
                        <span class="detail-value monospace">${extendedNetwork.dns.domain}</span>
                      </div>
                    ` : ''}
                  </div>
                ` : ''}
                
                <!-- Additional Metadata -->
                ${extendedNetwork.metadata ? html`
                  <div class="detail-section">
                    <h3>Metadata</h3>
                    
                    ${extendedNetwork.metadata.created ? html`
                      <div class="detail-item">
                        <strong class="detail-key">Created:</strong>
                        <span class="detail-value">${new Date(extendedNetwork.metadata.created).toLocaleString()}</span>
                      </div>
                    ` : ''}
                    
                    ${extendedNetwork.metadata.modified ? html`
                      <div class="detail-item">
                        <strong class="detail-key">Last Modified:</strong>
                        <span class="detail-value">${new Date(extendedNetwork.metadata.modified).toLocaleString()}</span>
                      </div>
                    ` : ''}
                  </div>
                ` : ''}
                
                <!-- Raw Data -->
                <div class="detail-section">
                  <h3>Raw Data</h3>
                  <details>
                    <summary>View raw network configuration</summary>
                    <pre class="raw-data">${JSON.stringify(network, null, 2)}</pre>
                  </details>
                </div>
              </div>
            </div>
          `}
        </div>
        
        <div class="drawer-footer">
          ${network.state === 'active' ? html`
            <button 
              class="btn btn-secondary" 
              @click=${() => this.changeNetworkState(network, 'stop')}
              ?disabled=${this.isLoadingDetail}
            >
              Stop Network
            </button>
          ` : html`
            <button 
              class="btn btn-secondary" 
              @click=${() => this.changeNetworkState(network, 'start')}
              ?disabled=${this.isLoadingDetail}
            >
              Start Network
            </button>
          `}
          <button 
            class="btn btn-secondary" 
            @click=${() => this.editNetwork(network)}
            ?disabled=${this.isLoadingDetail}
          >
            Edit Configuration
          </button>
          <button class="btn btn-primary" @click=${this.closeDetailDrawer}>
            Close
          </button>
        </div>
      </div>
    `;
  }

  // Helper method to calculate broadcast address
  private calculateBroadcast(ipAddress: string, netmask: string): string {
    try {
      const ipParts = ipAddress.split('.').map(Number);
      const maskParts = netmask.split('.').map(Number);
      
      // Ensure both arrays have 4 parts (valid IPv4)
      if (ipParts.length !== 4 || maskParts.length !== 4) {
        return 'N/A';
      }
      
      const broadcastParts = ipParts.map((ip, i) => {
        const mask = maskParts[i];
        // Add explicit undefined check for TypeScript
        if (mask === undefined) {
          return 0;
        }
        return ip | (~mask & 255);
      });
      return broadcastParts.join('.');
    } catch {
      return 'N/A';
    }
  }

  // Helper method to calculate DHCP pool size
  private calculatePoolSize(startIp: string, endIp: string): number {
    try {
      const start = startIp.split('.').reduce((acc, val) => (acc << 8) + parseInt(val), 0);
      const end = endIp.split('.').reduce((acc, val) => (acc << 8) + parseInt(val), 0);
      return end - start + 1;
    } catch {
      return 0;
    }
  }

  private renderVirtualizationDisabledBanner(details?: string | null) {
    return html`
      <div class="virtualization-disabled-banner">
        <h2>Virtualization is disabled on this host</h2>
        <p>Virtualization features are currently unavailable because libvirt is not installed or not running.\
 To manage virtual networks, install and start libvirt on this machine, then reload this page.</p>
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
          <div class="header">
            <h1>Virtual Networks</h1>
          </div>
          ${this.renderVirtualizationDisabledBanner(details)}
        </div>
      `;
    }

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

        <!-- Detail Drawer -->
        ${this.showDetailDrawer ? this.renderDetailDrawer() : ''}

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
