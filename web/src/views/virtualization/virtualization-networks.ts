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
import '../../components/virtualization/network-form-drawer';
import type { Tab } from '../../components/tabs/tab-group.js';
import type { Column } from '../../components/tables/resource-table.js';
import type { ActionItem } from '../../components/ui/action-dropdown.js';
import type { DeleteItem } from '../../components/modals/delete-modal.js';
import type { NetworkFormData } from '../../components/virtualization/network-form-drawer';
import { virtualizationAPI } from '../../services/virtualization-api';
import { notificationActions } from '../../stores/notifications';
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

  // Detail drawer state
  @state() private showDetailDrawer = false;
  @state() private selectedNetwork: VirtualNetwork | null = null;
  @state() private isLoadingDetail = false;
  @state() private isClosingDetailDrawer = false;
  @state() private detailActiveTab: 'overview' | 'dhcp' | 'ports' = 'overview';
  @state() private dhcpLeases: any[] = [];
  @state() private dhcpLeasesCount = 0;
  @state() private dhcpLeasesLoading = false;
  @state() private dhcpLeasesError: string | null = null;
  @state() private networkPorts: any[] = [];
  @state() private networkPortsCount = 0;
  @state() private networkPortsLoading = false;
  @state() private networkPortsError: string | null = null;

  // Delete modal state
  @state() private showDeleteModal = false;
  @state() private itemToDelete: DeleteItem | null = null;
  @state() private isDeleting = false;

  // Create / edit drawer state
  @state() private showCreateDrawer = false;
  @state() private showEditDrawer = false;
  @state() private isCreating = false;
  @state() private isUpdating = false;
  @state() private editingNetworkForm: NetworkFormData | null = null;
  @state() private editingNetworkName: string | null = null;

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
      background: var(--vscode-editor-background, var(--vscode-bg-light));
      border-left: 1px solid var(--vscode-border);
      box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
      z-index: 1001;
      overflow-y: auto;
      animation: slideIn 0.3s ease-out;
    }

    .drawer.closing {
      animation: slideOut 0.3s ease-in;
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

    @keyframes slideOut {
      from {
        transform: translateX(0);
      }
      to {
        transform: translateX(100%);
      }
    }

    .drawer-header {
      padding: 20px 24px;
      border-bottom: 1px solid var(--vscode-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--vscode-editor-background, var(--vscode-bg-light));
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
      border-top: 1px solid var(--vscode-border);
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      background: var(--vscode-editor-background, var(--vscode-bg-light));
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
      border-bottom: 1px solid var(--vscode-border);
    }

    .detail-item {
      display: flex;
      align-items: flex-start;
      padding: 8px 0;
      font-size: 13px;
      line-height: 1.5;
    }

    .detail-item:not(:last-child) {
      border-bottom: 1px solid var(--vscode-border);
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
      border-left: 2px solid var(--vscode-border);
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
      background: var(--vscode-testing-runAction, rgba(115, 201, 145, 0.2));
      color: var(--vscode-button-foreground, #ffffff);
      border: 1px solid var(--vscode-testing-runAction, rgba(115, 201, 145, 0.3));
    }

    .badge-inactive {
      background: var(--vscode-inputValidation-errorBackground, rgba(161, 38, 13, 0.2));
      color: var(--vscode-inputValidation-errorForeground, #ff8c66);
      border: 1px solid var(--vscode-inputValidation-errorBorder, rgba(161, 38, 13, 0.3));
    }

    .badge-enabled {
      background: var(--vscode-testing-runAction, rgba(56, 138, 52, 0.2));
      color: var(--vscode-button-foreground, #ffffff);
      border: 1px solid var(--vscode-testing-runAction, rgba(56, 138, 52, 0.3));
    }

    .badge-disabled {
      background: var(--vscode-inputValidation-warningBackground, rgba(161, 38, 13, 0.2));
      color: var(--vscode-inputValidation-warningForeground, #ff8c66);
      border: 1px solid var(--vscode-inputValidation-warningBorder, rgba(161, 38, 13, 0.3));
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
      border-bottom: 1px solid var(--vscode-border);
    }

    .dhcp-host-item:last-child {
      border-bottom: none;
    }

    .detail-tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
      border-bottom: 1px solid var(--vscode-border);
    }

    .detail-tab {
      padding: 6px 12px;
      border: none;
      background: transparent;
      color: var(--vscode-foreground, #cccccc);
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      border-bottom: 2px solid transparent;
    }

    .detail-tab.active {
      border-bottom-color: var(--vscode-button-background, #0e639c);
      color: var(--vscode-button-foreground, #ffffff);
    }

    .detail-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-top: 8px;
    }

    .detail-table th,
    .detail-table td {
      border: 1px solid var(--vscode-border);
      padding: 4px 6px;
      text-align: left;
    }

    .detail-table th {
      background: var(--vscode-editor-background, var(--vscode-bg-light));
      font-weight: 500;
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
      background: var(--vscode-editor-background, var(--vscode-bg-light));
      border: 1px solid var(--vscode-border);
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
      const { networks } = await virtualizationAPI.listNetworks();

      console.log('Networks API response:', networks); // Debug log

      // Map the response to match our local interface structure
      this.networks = (networks || []).map(net => ({
        name: net.name || 'Unnamed Network',
        uuid: net.uuid || '',
        state: net.state,
        bridge: (net as any).bridge || '',
        mode: (net as any).mode || '',
        ip_range: {
          address: (net as any).ip_range?.address || (net as any).ip || '',
          netmask: (net as any).ip_range?.netmask || (net as any).netmask || ''
        },
        autostart: (net as any).autostart || false,
        persistent: (net as any).persistent !== undefined ? (net as any).persistent : true,
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
    ];

    if (network.state === 'active') {
      actions.push({ label: 'Stop', action: 'stop' });
      // Optional: allow quick restart from the dropdown
      actions.push({ label: 'Restart', action: 'restart' });
    } else {
      actions.push({ label: 'Start', action: 'start' });
    }

    actions.push(
      { label: 'Edit', action: 'edit' },
      { label: 'Delete', action: 'delete', danger: true },
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
    this.detailActiveTab = 'overview';
    this.dhcpLeases = [];
    this.dhcpLeasesCount = 0;
    this.dhcpLeasesError = null;
    this.networkPorts = [];
    this.networkPortsCount = 0;
    this.networkPortsError = null;

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
    } catch (error: any) {
      console.error('Failed to fetch network details:', error);
      if (error instanceof VirtualizationDisabledError) {
        this.error = error.message;
        this.closeDetailDrawer();
        return;
      }
      const message = this.mapNetworkErrorToMessage(error, 'Failed to load network details');
      notificationActions.addNotification({
        type: 'error',
        title: 'Failed to load network details',
        message,
      });
      if (error?.code === 'NETWORK_NOT_FOUND') {
        this.networks = this.networks.filter(n => n.name !== network.name);
        this.closeDetailDrawer();
      }
      // Keep the basic network info even if detailed fetch fails (for non-fatal errors)
    } finally {
      this.isLoadingDetail = false;
    }
  }

  private closeDetailDrawer() {
    if (!this.showDetailDrawer && !this.selectedNetwork) {
      return;
    }
    this.isClosingDetailDrawer = true;
    setTimeout(() => {
      this.showDetailDrawer = false;
      this.selectedNetwork = null;
      this.isLoadingDetail = false;
      this.detailActiveTab = 'overview';
      this.dhcpLeases = [];
      this.dhcpLeasesCount = 0;
      this.dhcpLeasesError = null;
      this.networkPorts = [];
      this.networkPortsCount = 0;
      this.networkPortsError = null;
      this.isClosingDetailDrawer = false;
    }, 300);
  }

  private async setDetailTab(tab: 'overview' | 'dhcp' | 'ports') {
    this.detailActiveTab = tab;
    const name = this.selectedNetwork?.name;
    if (!name) return;

    try {
      if (tab === 'dhcp') {
        if (this.dhcpLeasesLoading || this.dhcpLeases.length > 0 || this.dhcpLeasesError) return;
        await this.loadDhcpLeases(name);
      } else if (tab === 'ports') {
        if (this.networkPortsLoading || this.networkPorts.length > 0 || this.networkPortsError) return;
        await this.loadNetworkPorts(name);
      }
    } catch (error) {
      console.error('Failed to change detail tab:', error);
    }
  }

  private async loadDhcpLeases(name: string) {
    this.dhcpLeasesLoading = true;
    this.dhcpLeasesError = null;

    try {
      const result = await virtualizationAPI.getNetworkDHCPLeases(name);
      this.dhcpLeases = result.leases || [];
      this.dhcpLeasesCount = result.count ?? this.dhcpLeases.length;
    } catch (error: any) {
      console.error('Failed to load DHCP leases:', error);
      if (error instanceof VirtualizationDisabledError) {
        this.error = error.message;
        this.closeDetailDrawer();
        return;
      }
      const message = this.mapNetworkErrorToMessage(error, 'Failed to load DHCP leases');
      const code = error?.code;
      if (code === 'NETWORK_NOT_FOUND') {
        this.dhcpLeasesError = message;
        this.networks = this.networks.filter(n => n.name !== name);
        this.closeDetailDrawer();
      } else {
        this.dhcpLeasesError = message;
      }
      notificationActions.addNotification({
        type: 'error',
        title: 'Failed to load DHCP leases',
        message,
      });
    } finally {
      this.dhcpLeasesLoading = false;
    }
  }

  private async loadNetworkPorts(name: string) {
    this.networkPortsLoading = true;
    this.networkPortsError = null;

    try {
      const result = await virtualizationAPI.getNetworkPorts(name);
      this.networkPorts = result.ports || [];
      this.networkPortsCount = result.count ?? this.networkPorts.length;
    } catch (error: any) {
      console.error('Failed to load network ports:', error);
      if (error instanceof VirtualizationDisabledError) {
        this.error = error.message;
        this.closeDetailDrawer();
        return;
      }
      const message = this.mapNetworkErrorToMessage(error, 'Failed to load network ports');
      const code = error?.code;
      if (code === 'NETWORK_NOT_FOUND') {
        this.networkPortsError = message;
        this.networks = this.networks.filter(n => n.name !== name);
        this.closeDetailDrawer();
      } else {
        this.networkPortsError = message;
      }
      notificationActions.addNotification({
        type: 'error',
        title: 'Failed to load network ports',
        message,
      });
    } finally {
      this.networkPortsLoading = false;
    }
  }

  private async viewDHCPLeases(network: VirtualNetwork) {
    // Open details on the DHCP tab and load leases
    await this.viewNetworkDetail(network);
    await this.setDetailTab('dhcp');
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
      const verb =
        action === 'start' ? 'started' : action === 'stop' ? 'stopped' : 'restarted';
      notificationActions.addNotification({
        type: 'success',
        title: `Network ${verb}`,
        message: `Virtual network ${network.name} was ${verb} successfully`,
      });
    } catch (error: any) {
      console.error(`Failed to ${action} network:`, error);
      if (error instanceof VirtualizationDisabledError) {
        this.error = error.message;
        return;
      }
      const message = this.mapNetworkErrorToMessage(error, `Failed to ${action} network`);
      notificationActions.addNotification({
        type: 'error',
        title: `Failed to ${action} network`,
        message,
      });
    }
  }

  private cloneNetwork(network: VirtualNetwork) {
    console.log('Cloning network:', network.name);
    // TODO: Implement clone dialog if backend supports it
  }

  private async editNetwork(network: VirtualNetwork) {
    this.isUpdating = false;
    this.editingNetworkName = network.name;

    try {
      // Fetch latest details to populate the form (including DHCP/IP range)
      const detailedNetwork = await virtualizationAPI.getNetwork(network.name);

      const ipRange = (detailedNetwork as any).ip_range || {
        address: (detailedNetwork as any).ip || '',
        netmask: (detailedNetwork as any).netmask || '',
      };
      const dhcp = (detailedNetwork as any).dhcp || {};

      const formData: NetworkFormData = {
        name: detailedNetwork.name || network.name,
        mode: ((detailedNetwork as any).mode || 'nat') as any,
        bridge: (detailedNetwork as any).bridge || '',
        ipAddress: ipRange.address || '',
        netmask: ipRange.netmask || '',
        dhcpStart: dhcp.start || '',
        dhcpEnd: dhcp.end || '',
        autostart: detailedNetwork.autostart ?? network.autostart,
        hosts: Array.isArray(dhcp.hosts)
          ? dhcp.hosts.map((host: any) => ({
            mac: host.mac || '',
            ip: host.ip || '',
            name: host.name || '',
          }))
          : [],
      };

      this.editingNetworkForm = formData;
      this.showEditDrawer = true;
    } catch (error: any) {
      console.error('Failed to load network for editing:', error);
      if (error instanceof VirtualizationDisabledError) {
        this.error = error.message;
      } else {
        const message = this.mapNetworkErrorToMessage(error, 'Failed to load network for editing');
        notificationActions.addNotification({
          type: 'error',
          title: 'Failed to load network for editing',
          message,
        });
        if (error?.code === 'NETWORK_NOT_FOUND') {
          this.networks = this.networks.filter(n => n.name !== network.name);
        }
      }
      this.editingNetworkForm = null;
      this.editingNetworkName = null;
    }
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
        notificationActions.addNotification({
          type: 'success',
          title: 'Network deleted',
          message: `Virtual network ${networkToDelete.name} was deleted successfully`,
        });
      }
    } catch (error: any) {
      console.error('Failed to delete network:', error);
      if (error instanceof VirtualizationDisabledError) {
        this.error = error.message;
        return;
      }
      const message = this.mapNetworkErrorToMessage(error, 'Failed to delete network');
      notificationActions.addNotification({
        type: 'error',
        title: 'Failed to delete network',
        message,
      });
    } finally {
      this.isDeleting = false;
      this.showDeleteModal = false;
      this.itemToDelete = null;
    }
  }

  private handleCreateNew() {
    this.editingNetworkForm = null;
    this.editingNetworkName = null;
    this.showCreateDrawer = true;
  }

  private handleSearchChange(e: CustomEvent) {
    this.searchQuery = e.detail.value;
  }

  private mapNetworkErrorToMessage(error: any, fallback: string): string {
    const code = error?.code;
    const message = error instanceof Error ? error.message : fallback;

    switch (code) {
      case 'INVALID_NETWORK_REQUEST':
      case 'INVALID_REQUEST':
        return 'The network configuration is invalid. Please review the form fields.';
      case 'NETWORK_NOT_FOUND':
        return 'The network was not found. It may have been deleted or renamed.';
      case 'CREATE_NETWORK_FAILED':
        return message || 'Failed to create virtual network.';
      case 'UPDATE_NETWORK_FAILED':
        return message || 'Failed to update virtual network.';
      case 'DELETE_NETWORK_FAILED':
        return message || 'Failed to delete virtual network.';
      default:
        return message || fallback;
    }
  }

  private buildCreatePayload(formData: NetworkFormData) {
    const payload: any = {
      name: formData.name.trim(),
      mode: formData.mode,
      autostart: formData.autostart,
    };

    if (formData.mode === 'bridge' && formData.bridge.trim()) {
      payload.bridge = formData.bridge.trim();
    }

    if (formData.ipAddress && formData.netmask) {
      payload.ip_range = {
        address: formData.ipAddress,
        netmask: formData.netmask,
      };
    }

    if (formData.dhcpStart && formData.dhcpEnd) {
      payload.dhcp = {
        start: formData.dhcpStart,
        end: formData.dhcpEnd,
      } as any;

      if (formData.hosts.length > 0) {
        (payload.dhcp as any).hosts = formData.hosts.map(host => ({
          mac: host.mac,
          ip: host.ip,
          name: host.name || undefined,
        }));
      }
    }

    return payload;
  }

  private buildUpdatePayload(formData: NetworkFormData) {
    const payload: any = {
      autostart: formData.autostart,
      mode: formData.mode,
    };

    if (formData.mode === 'bridge' && formData.bridge.trim()) {
      payload.bridge = formData.bridge.trim();
    }

    if (formData.ipAddress && formData.netmask) {
      payload.ip_range = {
        address: formData.ipAddress,
        netmask: formData.netmask,
      };
    }

    if (formData.dhcpStart && formData.dhcpEnd) {
      payload.dhcp = {
        start: formData.dhcpStart,
        end: formData.dhcpEnd,
      } as any;

      if (formData.hosts.length > 0) {
        (payload.dhcp as any).hosts = formData.hosts.map(host => ({
          mac: host.mac,
          ip: host.ip,
          name: host.name || undefined,
        }));
      }
    }

    return payload;
  }

  private async handleCreateSave(event: CustomEvent<{ formData: NetworkFormData }>) {
    this.isCreating = true;

    try {
      const payload = this.buildCreatePayload(event.detail.formData);
      await virtualizationAPI.createNetwork(payload);
      await this.loadData();
      this.showCreateDrawer = false;
      notificationActions.addNotification({
        type: 'success',
        title: 'Network created',
        message: `Virtual network ${payload.name} was created successfully`,
      });
    } catch (error: any) {
      console.error('Failed to create network:', error);
      if (error instanceof VirtualizationDisabledError) {
        this.error = error.message;
        return;
      }
      const message = this.mapNetworkErrorToMessage(error, 'Failed to create network');
      notificationActions.addNotification({
        type: 'error',
        title: 'Failed to create network',
        message,
      });
    } finally {
      this.isCreating = false;
    }
  }

  private async handleEditSave(event: CustomEvent<{ formData: NetworkFormData }>) {
    if (!this.editingNetworkName) return;

    this.isUpdating = true;

    try {
      const payload = this.buildUpdatePayload(event.detail.formData);
      await virtualizationAPI.updateNetwork(this.editingNetworkName, payload);
      await this.loadData();
      this.showEditDrawer = false;
      this.editingNetworkForm = null;
      const updatedName = this.editingNetworkName;
      this.editingNetworkName = null;
      notificationActions.addNotification({
        type: 'success',
        title: 'Network updated',
        message: `Virtual network ${updatedName} was updated successfully`,
      });
    } catch (error: any) {
      console.error('Failed to update network:', error);
      if (error instanceof VirtualizationDisabledError) {
        this.error = error.message;
        return;
      }
      const message = this.mapNetworkErrorToMessage(error, 'Failed to update network');
      notificationActions.addNotification({
        type: 'error',
        title: 'Failed to update network',
        message,
      });
    } finally {
      this.isUpdating = false;
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
      <div class="drawer ${this.isClosingDetailDrawer ? 'closing' : ''}">
        <div class="drawer-header">
          <h2 class="drawer-title">${network.name}</h2>
          <button class="close-btn" @click=${this.closeDetailDrawer}>✕</button>
        </div>
        
        <div class="drawer-content">
          ${this.isLoadingDetail ? html`
            <loading-state message="Loading network details..."></loading-state>
          ` : html`
            <div class="network-details-content">
              <div class="detail-tabs">
                <button
                  class="detail-tab ${this.detailActiveTab === 'overview' ? 'active' : ''}"
                  @click=${() => this.setDetailTab('overview')}
                >
                  Overview
                </button>
                <button
                  class="detail-tab ${this.detailActiveTab === 'dhcp' ? 'active' : ''}"
                  @click=${() => this.setDetailTab('dhcp')}
                >
                  DHCP Leases
                </button>
                <button
                  class="detail-tab ${this.detailActiveTab === 'ports' ? 'active' : ''}"
                  @click=${() => this.setDetailTab('ports')}
                >
                  Ports
                </button>
              </div>

              ${this.detailActiveTab === 'overview'
          ? html`<div class="detail-sections">
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
                    
                    <!-- DHCP Configuration if available -->
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
                            <div class="nested-content">
                              <div class="dhcp-hosts-list">
                                ${extendedNetwork.dhcp.hosts.map((host: any) => html`
                                  <div class="dhcp-host-item">
                                    <span><strong>MAC:</strong> <span class="monospace">${host.mac}</span></span>
                                    <span><strong>IP:</strong> <span class="monospace">${host.ip}</span></span>
                                    ${host.name ? html`<span><strong>Name:</strong> ${host.name}</span>` : ''}
                                  </div>
                                `)}
                              </div>
                            </div>
                          </div>
                        ` : ''}
                      </div>
                    ` : ''}
                    
                    <!-- Network Forwarding if available -->
                    ${extendedNetwork.forward ? html`
                      <div class="detail-section">
                        <h3>Network Forwarding</h3>
                        
                        <div class="detail-item">
                          <strong class="detail-key">Forward Mode:</strong>
                          <span class="detail-value">
                            <span class="badge-inline">${extendedNetwork.forward.mode || 'Not configured'}</span>
                          </span>
                        </div>
                        
                        ${extendedNetwork.forward.dev ? html`
                          <div class="detail-item">
                            <strong class="detail-key">Physical Device:</strong>
                            <span class="detail-value monospace">${extendedNetwork.forward.dev}</span>
                          </div>
                        ` : ''}
                        
                        ${extendedNetwork.forward.nat ? html`
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
                  </div>`
          : this.detailActiveTab === 'dhcp'
            ? this.renderDhcpLeasesTab()
            : this.renderPortsTab()}
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

  private renderDhcpLeasesTab() {
    if (this.dhcpLeasesLoading) {
      return html`<loading-state message="Loading DHCP leases..."></loading-state>`;
    }

    if (this.dhcpLeasesError) {
      return html`<div class="detail-sections">
        <div class="detail-section">
          <h3>DHCP Leases</h3>
          <div class="error-text">${this.dhcpLeasesError}</div>
        </div>
      </div>`;
    }

    if (this.dhcpLeases.length === 0) {
      return html`<div class="detail-sections">
        <div class="detail-section">
          <h3>DHCP Leases</h3>
          <p class="hint">No active DHCP leases for this network.</p>
        </div>
      </div>`;
    }

    return html`<div class="detail-sections">
      <div class="detail-section">
        <h3>DHCP Leases (${this.dhcpLeasesCount})</h3>
        <table class="detail-table">
          <thead>
            <tr>
              <th>Interface</th>
              <th>MAC</th>
              <th>IP Address</th>
              <th>Prefix</th>
              <th>Type</th>
              <th>Hostname</th>
              <th>Expiry</th>
            </tr>
          </thead>
          <tbody>
            ${this.dhcpLeases.map((lease: any) => html`<tr>
              <td>${lease.iface || lease.interface || '-'}</td>
              <td class="monospace">${lease.mac || '-'}</td>
              <td class="monospace">${lease.ip_address || lease.ip || '-'}</td>
              <td>${lease.prefix ?? '-'}</td>
              <td>${lease.type || '-'}</td>
              <td>${lease.hostname || '-'}</td>
              <td>${lease.expiry_time ? new Date(lease.expiry_time).toLocaleString() : '-'}</td>
            </tr>`)}
          </tbody>
        </table>
      </div>
    </div>`;
  }

  private renderPortsTab() {
    if (this.networkPortsLoading) {
      return html`<loading-state message="Loading attached ports..."></loading-state>`;
    }

    if (this.networkPortsError) {
      return html`<div class="detail-sections">
        <div class="detail-section">
          <h3>Attached Ports</h3>
          <div class="error-text">${this.networkPortsError}</div>
        </div>
      </div>`;
    }

    if (this.networkPorts.length === 0) {
      return html`<div class="detail-sections">
        <div class="detail-section">
          <h3>Attached Ports</h3>
          <p class="hint">No virtual machines are currently attached to this network.</p>
        </div>
      </div>`;
    }

    return html`<div class="detail-sections">
      <div class="detail-section">
        <h3>Attached Ports (${this.networkPortsCount})</h3>
        <table class="detail-table">
          <thead>
            <tr>
              <th>VM Name</th>
              <th>VM UUID</th>
              <th>State</th>
              <th>Interface</th>
              <th>MAC</th>
              <th>Model</th>
              <th>Type</th>
              <th>Target</th>
              <th>IP Address</th>
            </tr>
          </thead>
          <tbody>
            ${this.networkPorts.map((port: any) => html`<tr>
              <td>${port.vm_name || '-'}</td>
              <td class="monospace">${port.vm_uuid || '-'}</td>
              <td>${port.vm_state || port.state || '-'}</td>
              <td>${port.interface || port.iface || '-'}</td>
              <td class="monospace">${port.mac || '-'}</td>
              <td>${port.model || '-'}</td>
              <td>${port.type || '-'}</td>
              <td>${port.target || '-'}</td>
              <td class="monospace">${port.ip_address || port.ip || '-'}</td>
            </tr>`)}
          </tbody>
        </table>
      </div>
    </div>`;
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
          ${this.renderVirtualizationDisabledBanner(details)}
        </div>
      `;
    }

    const filteredData = this.getFilteredData();

    return html`
      <div class="container">

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
        ${(this.showDetailDrawer || this.isClosingDetailDrawer) ? this.renderDetailDrawer() : ''}

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

        <network-form-drawer
          .show=${this.showCreateDrawer}
          .loading=${this.isCreating}
          .editMode=${false}
          .networkData=${null}
          @save=${this.handleCreateSave}
          @close=${() => {
        this.showCreateDrawer = false;
      }}
        ></network-form-drawer>

        <network-form-drawer
          .show=${this.showEditDrawer}
          .loading=${this.isUpdating}
          .editMode=${true}
          .networkData=${this.editingNetworkForm}
          @save=${this.handleEditSave}
          @close=${() => {
        this.showEditDrawer = false;
        this.editingNetworkForm = null;
        this.editingNetworkName = null;
      }}
        ></network-form-drawer>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'virtualization-networks': VirtualizationNetworks;
  }
}
