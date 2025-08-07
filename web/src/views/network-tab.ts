import { html, css } from 'lit';
import { state, property } from 'lit/decorators.js';
import { t } from '../i18n';
import { I18nLitElement } from '../i18n-mixin';
import { api } from '../api';
import type { AddressRequest, BridgeRequest, BondRequest, VLANRequest, NetworkInterface } from '../types/api';

// Define BondMode locally until it's exported from api types
type BondMode = 'balance-rr' | 'active-backup' | 'balance-xor' | 'broadcast' | '802.3ad' | 'balance-tlb' | 'balance-alb';
import '../components/modal-dialog';

export class NetworkTab extends I18nLitElement {
  @property({ type: String })
  subRoute: string | null = null;
  static override styles = css`
    :host {
      display: block;
      padding: 16px;
    }

    .tab-container {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .tab-header {
      display: flex;
      border-bottom: 2px solid var(--border-color);
      margin-bottom: 1rem;
    }

    .tab-button {
      padding: 0.75rem 1.5rem;
      background: none;
      border: none;
      cursor: pointer;
      font-size: 0.875rem;
      color: var(--text-secondary);
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      transition: all 0.2s;
    }

    .tab-button:hover {
      color: var(--text-primary);
    }

    .tab-button.active {
      color: var(--primary);
      border-bottom-color: var(--primary);
    }

    .tab-content {
      flex: 1;
      overflow-y: auto;
    }

    .network-interface {
      background-color: var(--surface-1);
      padding: 16px;
      border-radius: 6px;
      margin-bottom: 12px;
      border: 1px solid var(--border-color);
    }

    .interface-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .interface-name {
      font-size: 1.1rem;
      font-weight: 500;
    }

    .interface-state {
      padding: 0.25rem 0.75rem;
      border-radius: 16px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .state-up {
      background-color: var(--success-bg);
      color: var(--success);
    }

    .state-down {
      background-color: var(--error-bg);
      color: var(--error);
    }

    .interface-details {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
    }

    .detail-label {
      font-size: 0.75rem;
      color: var(--text-secondary);
      margin-bottom: 0.25rem;
    }

    .detail-value {
      font-size: 0.875rem;
      color: var(--text-primary);
    }

    .interface-actions {
      display: flex;
      gap: 0.5rem;
    }

    .action-button {
      padding: 0.5rem 1rem;
      background-color: var(--surface-2);
      color: var(--text-primary);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.875rem;
      transition: all 0.2s;
    }

    .action-button:hover {
      background-color: var(--surface-3);
      border-color: var(--primary);
    }

    .action-button.primary {
      background-color: var(--primary);
      color: white;
      border-color: var(--primary);
    }

    .action-button.primary:hover {
      background-color: var(--primary-hover);
    }

    .empty-state {
      text-align: center;
      padding: 3rem;
      color: var(--text-secondary);
    }

    .create-form {
      background-color: var(--surface-1);
      padding: 1.5rem;
      border-radius: 6px;
      border: 1px solid var(--border-color);
      margin-bottom: 1rem;
    }

    .form-group {
      margin-bottom: 1rem;
    }

    .form-label {
      display: block;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
      color: var(--text-primary);
    }

    .form-input,
    .form-select {
      width: 100%;
      padding: 0.5rem;
      background-color: var(--surface-0);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      color: var(--text-primary);
      font-size: 0.875rem;
      box-sizing: border-box;
    }

    .form-input:focus,
    .form-select:focus {
      outline: none;
      border-color: var(--primary);
    }

    .form-actions {
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
      margin-top: 1.5rem;
    }

    h1 {
      margin: 0 0 24px 0;
      font-size: 24px;
      font-weight: 300;
    }

    h2 {
      font-size: 1.5rem;
      margin-bottom: 1rem;
      color: var(--text-primary);
    }

    h3 {
      font-size: 1.2rem;
      margin: 1.5rem 0 1rem 0;
      color: var(--text-primary);
    }

    .network-table {
      width: 100%;
      border-collapse: collapse;
      background-color: var(--surface-1);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 1rem;
    }

    .network-table thead {
      background-color: var(--surface-2);
    }

    .network-table th {
      text-align: left;
      padding: 12px 16px;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-secondary);
      border-bottom: 1px solid var(--border-color);
    }

    .network-table td {
      padding: 12px 16px;
      font-size: 0.875rem;
      color: var(--text-primary);
      border-bottom: 1px solid var(--border-color);
    }

    .network-table tbody tr:last-child td {
      border-bottom: none;
    }

    .network-table tbody tr:hover {
      background-color: var(--surface-0);
    }

    .network-table td.state-up,
    .network-table td.state-down {
      font-weight: 500;
    }

    .network-table td:last-child {
      text-align: right;
    }

    .network-table td button {
      margin-right: 0.5rem;
    }

    .network-table td button:last-child {
      margin-right: 0;
    }

    .status-indicator {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .status-icon {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      display: inline-block;
      position: relative;
    }

    .status-icon.up {
      background-color: #4caf50;
      box-shadow: 0 0 4px #4caf50;
    }

    .status-icon.down {
      background-color: #9e9e9e;
    }

    .status-icon[data-tooltip]:hover::after {
      content: attr(data-tooltip);
      position: absolute;
      left: 15px;
      top: 50%;
      transform: translateY(-50%);
      padding: 6px 12px;
      background-color: var(--surface-1);
      color: var(--text-primary);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      font-size: 14px;
      white-space: nowrap;
      z-index: 1000;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }

    .action-menu {
      position: relative;
      display: inline-block;
    }

    .action-dots {
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px 8px;
      color: var(--text-secondary);
      font-size: 18px;
      line-height: 1;
      transition: background-color 0.2s;
      border-radius: 4px;
    }

    .action-dots:hover {
      background-color: var(--vscode-toolbar-hoverBackground, var(--vscode-list-hoverBackground, rgba(90, 93, 94, 0.1)));
    }

    .action-dropdown {
      position: absolute;
      right: 0;
      top: 100%;
      margin-top: 4px;
      background-color: var(--surface-1);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      z-index: 1000;
      min-width: 150px;
      display: none;
    }

    .action-dropdown.show {
      display: block;
    }

    .action-dropdown button {
      display: block;
      width: 100%;
      text-align: left;
      padding: 8px 16px;
      border: none;
      background: none;
      color: var(--text-primary);
      cursor: pointer;
      font-size: 13px;
      transition: background-color 0.2s;
    }

    .action-dropdown button:hover {
      background-color: var(--vscode-list-hoverBackground, rgba(255, 255, 255, 0.08));
    }

    .action-dropdown button.danger {
      color: var(--vscode-error, #f44336);
    }
    .drawer {
      position: fixed;
      top: 0;
      right: 0;
      width: 400px;
      max-width: 90%;
      height: 100%;
      background: var(--vscode-bg-light);
      border-left: 1px solid var(--vscode-widget-border, var(--vscode-panel-border, #454545));
      box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
      z-index: 1001;
      overflow-y: auto;
      padding: 24px;
      animation: slideIn 0.3s ease-out;
    }

    @media (max-width: 768px) {
      .drawer {
        width: 100%;
        max-width: 100%;
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

    .drawer h2 {
      margin-top: 0;
    }

    .drawer button.close-btn {
      position: absolute;
      top: 16px;
      right: 16px;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      background: var(--vscode-toolbar-hoverBackground, rgba(90, 93, 94, 0.1));
      color: var(--vscode-foreground, var(--vscode-editor-foreground));
      border: 1px solid var(--vscode-widget-border, rgba(0, 0, 0, 0.1));
      transition: all 0.2s;
    }

    .drawer button.close-btn:hover {
      background: var(--vscode-list-hoverBackground, rgba(90, 93, 94, 0.2));
      border-color: var(--vscode-widget-border, rgba(0, 0, 0, 0.2));
    }

    .drawer-content {
      margin-top: 40px;
    }

    .search-container {
      position: relative;
      display: inline-block;
      width: 200px;
    }

    .search-icon {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      width: 16px;
      height: 16px;
      pointer-events: none;
      opacity: 0.5;
    }

    .search-input {
      padding-left: 35px !important;
      width: 100%;
    }
  `;

  @state()
  private activeTab = 'interfaces';

  @state()
  private interfaces: NetworkInterface[] = [];

  @state()
  private bridges: NetworkInterface[] = [];

  @state()
  private bonds: NetworkInterface[] = [];

  @state()
  private vlans: NetworkInterface[] = [];

  @state()
  private showConfigureDrawer = false;

  @state()
  private showBridgeDrawer = false;

  @state()
  private bridgeFormData = {
    name: '',
    interfaces: ''
  };

  @state()
  private showBondDrawer = false;

  @state()
  private bondFormData = {
    name: '',
    mode: 'balance-rr' as BondMode,
    interfaces: ''
  };

  @state()
  private vlanFormData = {
    interface: '',
    vlanId: 0,
    name: ''
  };

  @state()
  private showVLANDrawer = false;

  @state()
  private searchQuery = '';

  @state()
  private bridgeSearchQuery = '';

  @state()
  private bondSearchQuery = '';

  @state()
  private vlanSearchQuery = '';

  @state()
  private configureNetworkInterface: NetworkInterface | null = null;

  @state()
  private configureFormData = {
    address: '',
    netmask: 24,
    gateway: ''
  };

  @state()
  private showConfirmModal = false;

  @state()
  private confirmAction: (() => void) | null = null;

  @state()
  private confirmTitle = '';

  @state()
  private confirmMessage = '';

  constructor() {
    super();
    this.handlePopState = this.handlePopState.bind(this);
  }

  handlePopState() {
    const pathSegments = window.location.pathname.split('/');
    const tab = pathSegments[pathSegments.length - 1];
    if (tab && ['interfaces', 'bridges', 'bonds', 'vlans'].includes(tab)) {
      this.activeTab = tab;
    }
  }

  override firstUpdated() {
    this.fetchNetworkData();
    document.addEventListener('click', this.handleDocumentClick.bind(this));
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('popstate', this.handlePopState);

    // Initialize tab from URL or subRoute
    const pathSegments = window.location.pathname.split('/');
    const tab = pathSegments[pathSegments.length - 1];
    if (tab && ['interfaces', 'bridges', 'bonds', 'vlans'].includes(tab)) {
      this.activeTab = tab;
    } else {
      this.handleSubRoute();
    }
  }
  
  override updated(changedProperties: Map<string | number | symbol, unknown>) {
    super.updated(changedProperties);
    
    // Handle sub-route changes
    if (changedProperties.has('subRoute')) {
      this.handleSubRoute();
    }
  }
  
  private handleSubRoute() {
    if (this.subRoute && ['interfaces', 'bridges', 'bonds', 'vlans'].includes(this.subRoute)) {
      this.activeTab = this.subRoute;
    } else {
      this.activeTab = 'interfaces'; // Default to interfaces if subRoute is invalid or not set
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this.handleDocumentClick.bind(this));
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
    window.removeEventListener('popstate', this.handlePopState);
  }

  handleDocumentClick(e: Event) {
    const target = e.target as Element;
    if (!target.closest('.action-menu')) {
      this.closeAllMenus();
    }
  }

  handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      // Close action dropdowns first
      this.closeAllMenus();
      
      // Then close drawers if they're open
      if (this.showConfigureDrawer) {
        this.closeConfigureDrawer();
      }
      if (this.showBridgeDrawer) {
        this.closeBridgeDrawer();
      }
      if (this.showBondDrawer) {
        this.closeBondDrawer();
      }
      if (this.showVLANDrawer) {
        this.closeVLANDrawer();
      }
      
      // Close modal if it's open
      if (this.showConfirmModal) {
        this.handleCancel();
      }
    }
  }

  toggleActionMenu(event: Event, menuId: string) {
    event.stopPropagation();
    const menu = this.shadowRoot?.getElementById(menuId);
    if (menu) {
      const isOpen = menu.classList.contains('show');
      this.closeAllMenus();
      if (!isOpen) {
        menu.classList.add('show');
        // Focus on the first button in the dropdown for keyboard navigation
        const firstButton = menu.querySelector('button') as HTMLButtonElement;
        if (firstButton) {
          setTimeout(() => firstButton.focus(), 10);
        }
      }
    }
  }

  closeAllMenus() {
    const menus = this.shadowRoot?.querySelectorAll('.action-dropdown');
    menus?.forEach(menu => menu.classList.remove('show'));
  }

  async fetchNetworkData() {
    // Fetch all network data based on active tab
    this.fetchInterfaces();
    this.fetchBridges();
    this.fetchBonds();
    this.fetchVlans();
  }

  async fetchInterfaces() {
    try {
      const data = await api.get('/network/interfaces');
      this.interfaces = data.interfaces || [];
    } catch (error) {
      console.error('Error fetching network interfaces:', error);
    }
  }

  async fetchBridges() {
    try {
      const data = await api.get('/network/bridges');
      this.bridges = data.bridges || [];
    } catch (error) {
      console.error('Error fetching bridges:', error);
    }
  }

  async fetchBonds() {
    try {
      const data = await api.get('/network/bonds');
      this.bonds = data.bonds || [];
    } catch (error) {
      console.error('Error fetching bonds:', error);
    }
  }

  async fetchVlans() {
    try {
      const data = await api.get('/network/vlans');
      this.vlans = data.vlans || [];
    } catch (error) {
      console.error('Error fetching VLANs:', error);
    }
  }

  toggleInterfaceState(iface: NetworkInterface) {
    const isUp = iface.state === 'up';
    const title = t(isUp ? 'network.downInterface' : 'network.upInterface');
    const message = t(isUp ? 'network.confirmBringDown' : 'network.confirmBringUp', { name: iface.name });
    this.showConfirmDialog(
      title,
      message,
      async () => {
        const url = `/network/interfaces/${iface.name}/${iface.state === 'up' ? 'down' : 'up'}`;
        try {
          await api.put(url);
          this.fetchInterfaces();
        } catch (error) {
          console.error(`Error bringing interface ${isUp ? 'down' : 'up'}:`, error);
        }
      }
    );
  }

  async deleteBridge(name: string) {
    this.showConfirmDialog(
      t('network.deleteBridge'),
      t('network.confirmDeleteBridge', { name }),
      async () => {
        try {
          await api.delete(`/network/bridge/${name}`);
          await this.fetchBridges();
        } catch (error) {
          console.error('Error deleting bridge:', error);
        }
      }
    );
  }

  async deleteBond(name: string) {
    this.showConfirmDialog(
      t('network.deleteBond'),
      t('network.confirmDeleteBond', { name }),
      async () => {
        try {
          await api.delete(`/network/bond/${name}`);
          await this.fetchBonds();
        } catch (error) {
          console.error('Error deleting bond:', error);
        }
      }
    );
  }

  async deleteVlan(name: string) {
    this.showConfirmDialog(
      t('network.deleteVlan'),
      t('network.confirmDeleteVlan', { name }),
      async () => {
        try {
          await api.delete(`/network/vlan/${name}`);
          await this.fetchVlans();
        } catch (error) {
          console.error('Error deleting VLAN:', error);
        }
      }
    );
  }

  showConfirmDialog(title: string, message: string, action: () => void) {
    this.confirmTitle = title;
    this.confirmMessage = message;
    this.confirmAction = action;
    this.showConfirmModal = true;

    this.updateComplete.then(() => {
      const cancelButton = this.shadowRoot?.querySelector('modal-dialog button.btn-secondary') as HTMLButtonElement;
      if (cancelButton) {
        setTimeout(() => cancelButton.focus(), 50);
      }
    });
  }

  handleConfirm() {
    if (this.confirmAction) {
      this.confirmAction();
    }
    this.showConfirmModal = false;
    this.confirmAction = null;
  }

  handleCancel() {
    this.showConfirmModal = false;
    this.confirmAction = null;
  }

  openVLANDrawer() {
    this.showVLANDrawer = true;
    this.vlanFormData = {
      interface: '',
      vlanId: 0,
      name: ''
    };
  }

  closeVLANDrawer() {
    this.showVLANDrawer = false;
    this.vlanFormData = {
      interface: '',
      vlanId: 0,
      name: ''
    };
  }

  handleConfigureAddress(iface: NetworkInterface) {
    // Open drawer for configuration without sending any data
    this.configureNetworkInterface = iface;
    this.configureFormData = {
      address: '',
      netmask: 24,
      gateway: ''
    };
    this.showConfigureDrawer = true;
  }

  async submitConfigureAddress() {
    if (!this.configureNetworkInterface || !this.configureFormData.address) {
      return;
    }

    const request: AddressRequest = {
      address: this.configureFormData.address,
      netmask: this.configureFormData.netmask,
      gateway: this.configureFormData.gateway || undefined
    };

    try {
      await api.post(`/network/interfaces/${this.configureNetworkInterface.name}/address`, request);
      this.showConfigureDrawer = false;
      this.configureNetworkInterface = null;
      await this.fetchInterfaces();
    } catch (error) {
      console.error('Error configuring address:', error);
    }
  }

  closeConfigureDrawer() {
    this.showConfigureDrawer = false;
    this.configureNetworkInterface = null;
    this.configureFormData = {
      address: '',
      netmask: 24,
      gateway: ''
    };
  }

  openBridgeDrawer() {
    this.showBridgeDrawer = true;
    this.bridgeFormData = {
      name: '',
      interfaces: ''
    };
  }

  closeBridgeDrawer() {
    this.showBridgeDrawer = false;
    this.bridgeFormData = {
      name: '',
      interfaces: ''
    };
  }

  openBondDrawer() {
    this.showBondDrawer = true;
    this.bondFormData = {
      name: '',
      mode: 'balance-rr',
      interfaces: ''
    };
  }

  closeBondDrawer() {
    this.showBondDrawer = false;
    this.bondFormData = {
      name: '',
      mode: 'balance-rr' as BondMode,
      interfaces: ''
    };
  }

  async handleCreateBridge() {
    if (!this.bridgeFormData.name || !this.bridgeFormData.interfaces) {
      return;
    }

    const request: BridgeRequest = {
      name: this.bridgeFormData.name,
      interfaces: this.bridgeFormData.interfaces.split(',').map(item => item.trim()).filter(Boolean)
    };

    try {
      await api.post('/network/bridge', request);
      this.closeBridgeDrawer();
      await this.fetchBridges();
      await this.fetchInterfaces();
    } catch (error) {
      console.error('Error creating bridge:', error);
    }
  }

  async handleCreateBond() {
    if (!this.bondFormData.name || !this.bondFormData.mode || !this.bondFormData.interfaces) {
      return;
    }

    const request: BondRequest = {
      name: this.bondFormData.name,
      mode: this.bondFormData.mode,
      interfaces: this.bondFormData.interfaces.split(',').map(item => item.trim()).filter(Boolean)
    };

    try {
      await api.post('/network/bond', request);
      this.closeBondDrawer();
      await this.fetchBonds();
      await this.fetchInterfaces();
    } catch (error) {
      console.error('Error creating bond:', error);
    }
  }

  async handleCreateVLANInterface() {
    if (!this.vlanFormData.interface || this.vlanFormData.vlanId <= 0) {
      return;
    }

    const request: VLANRequest = {
      interface: this.vlanFormData.interface,
      vlan_id: this.vlanFormData.vlanId,
      name: this.vlanFormData.name || `${this.vlanFormData.interface}.${this.vlanFormData.vlanId}`
    };

    try {
      await api.post('/network/vlan', request);
      this.closeVLANDrawer();
      this.fetchVlans();
      this.fetchInterfaces();
    } catch (error) {
      console.error('Error creating VLAN:', error);
    }
  }

  renderInterface(iface: NetworkInterface) {
    return html`
      <div class="network-interface">
        <div class="interface-header">
          <span class="interface-name">
            ${iface.name}
          </span>
          <span class="interface-state ${iface.state === 'up' ? 'state-up' : 'state-down'}">
            ${iface.state}
          </span>
        </div>
        <div class="interface-details">
          <div class="detail-item">
            <span class="detail-label">${t('network.rxBytes')}</span>
            <span class="detail-value">${iface.statistics.rx_bytes}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">${t('network.txBytes')}</span>
            <span class="detail-value">${iface.statistics.tx_bytes}</span>
          </div>
        </div>
        <div class="interface-actions">
          <button class="action-button primary" @click="${() => this.toggleInterfaceState(iface)}">
            ${t(iface.state === 'up' ? 'network.bringDown' : 'network.bringUp')}
          </button>
          <button class="action-button" @click="${() => this.handleConfigureAddress(iface)}">
            ${t('network.configure')}
          </button>
        </div>
      </div>
    `;
  }

  private getPageTitle() {
    switch (this.activeTab) {
      case 'interfaces':
        return t('network.interfaces');
      case 'bridges':
        return t('network.bridges');
      case 'bonds':
        return t('network.bonds');
      case 'vlans':
        return t('network.vlans');
      default:
        return t('network.title');
    }
  }

  override render() {
    return html`
      <div class="tab-container">
        <h1>${this.getPageTitle()}</h1>
        <div class="tab-content">
          ${this.activeTab === 'interfaces' ? html`
            <div class="interface-search" style="display: flex; justify-content: flex-start; margin-bottom: 12px;">
              <div class="search-container">
                <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
                <input 
                  class="form-input search-input"
                  type="text"
                  placeholder="${t('network.searchInterfaces')}"
                  .value=${this.searchQuery}
                  @input=${(e: Event) => this.searchQuery = (e.target as HTMLInputElement).value}
                />
              </div>
            </div>
${this.interfaces.length > 0 ? html`
              <table class="network-table">
                <thead>
                  <tr>
                    <th>${t('common.name')}</th>
                    <th>${t('common.state')}</th>
                    <th>${t('network.rxBytes')}</th>
                    <th>${t('network.txBytes')}</th>
                    <th>${t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.interfaces.filter(iface => iface.name.toLowerCase().includes(this.searchQuery.toLowerCase())).map((iface, index) => html`
                    <tr>
                      <td>${iface.name}</td>
                      <td>
                        <div class="status-indicator">
                          <span class="status-icon ${iface.state === 'up' ? 'up' : 'down'}" data-tooltip="${iface.state === 'up' ? 'Up' : 'Down'}"></span>
                        </div>
                      </td>
                      <td>${iface.statistics.rx_bytes}</td>
                      <td>${iface.statistics.tx_bytes}</td>
                      <td>
                        <div class="action-menu">
                          <button class="action-dots" @click=${(e: Event) => this.toggleActionMenu(e, `interface-${index}`)}>⋮</button>
                          <div class="action-dropdown" id="interface-${index}">
                            <button @click=${() => { this.closeAllMenus(); this.toggleInterfaceState(iface); }}>
                              ${iface.state === 'up' ? 'Down' : 'Up'}
                            </button>
                            <button @click=${() => { this.closeAllMenus(); this.handleConfigureAddress(iface); }}>
                              ${t('network.configure')}
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  `)}
                </tbody>
              </table>
            ` : html`<div class="empty-state">${t('network.noInterfaces')}</div>`}
          ` : ''}

          ${this.activeTab === 'bridges' ? html`
            <div class="interface-search" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <div class="search-container">
                <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
                <input 
                  class="form-input search-input"
                  type="text"
                  placeholder="${t('network.searchBridges')}"
                  .value=${this.bridgeSearchQuery}
                  @input=${(e: Event) => this.bridgeSearchQuery = (e.target as HTMLInputElement).value}
                />
              </div>
              <button class="action-button primary" @click="${this.openBridgeDrawer}">
                ${t('network.createBridge')}
              </button>
            </div>
            
            ${this.bridges.length > 0 ? html`
              <table class="network-table">
                <thead>
                  <tr>
                    <th>${t('common.name')}</th>
                    <th>${t('common.state')}</th>
                    <th>${t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.bridges.filter(bridge => bridge.name.toLowerCase().includes(this.bridgeSearchQuery.toLowerCase())).map((bridge, index) => html`
                    <tr>
                      <td>${bridge.name}</td>
                      <td>
                        <div class="status-indicator">
                          <span class="status-icon ${bridge.state === 'up' ? 'up' : 'down'}" data-tooltip="${bridge.state === 'up' ? 'Up' : 'Down'}"></span>
                        </div>
                      </td>
                      <td>
                        <div class="action-menu">
                          <button class="action-dots" @click=${(e: Event) => this.toggleActionMenu(e, `bridge-${index}`)}>${'⋮'}</button>
                          <div class="action-dropdown" id="bridge-${index}">
                            <button class="danger" @click=${() => { this.closeAllMenus(); this.deleteBridge(bridge.name); }}>
                              ${t('common.delete')}
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  `)}
                </tbody>
              </table>
            ` : html`<div class="empty-state">${t('network.noBridges')}</div>`}
          ` : ''}

          ${this.activeTab === 'bonds' ? html`
            <div class="interface-search" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <div class="search-container">
                <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
                <input 
                  class="form-input search-input"
                  type="text"
                  placeholder="${t('network.searchBonds')}"
                  .value=${this.bondSearchQuery}
                  @input=${(e: Event) => this.bondSearchQuery = (e.target as HTMLInputElement).value}
                />
              </div>
              <button class="action-button primary" @click="${this.openBondDrawer}">
                ${t('network.createBond')}
              </button>
            </div>
            
            ${this.bonds.length > 0 ? html`
              <table class="network-table">
                <thead>
                  <tr>
                    <th>${t('common.name')}</th>
                    <th>${t('common.state')}</th>
                    <th>${t('network.mode')}</th>
                    <th>${t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.bonds.filter(bond => bond.name.toLowerCase().includes(this.bondSearchQuery.toLowerCase())).map((bond, index) => html`
                    <tr>
                      <td>${bond.name}</td>
                      <td>
                        <div class="status-indicator">
                          <span class="status-icon ${bond.state === 'up' ? 'up' : 'down'}" data-tooltip="${bond.state === 'up' ? 'Up' : 'Down'}"></span>
                        </div>
                      </td>
                      <td>${(bond as any).mode || 'N/A'}</td>
                      <td>
                        <div class="action-menu">
                          <button class="action-dots" @click=${(e: Event) => this.toggleActionMenu(e, `bond-${index}`)}>${'⋮'}</button>
                          <div class="action-dropdown" id="bond-${index}">
                            <button class="danger" @click=${() => { this.closeAllMenus(); this.deleteBond(bond.name); }}>
                              ${t('common.delete')}
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  `)}
                </tbody>
              </table>
            ` : html`<div class="empty-state">${t('network.noBonds')}</div>`}
          ` : ''}

          ${this.activeTab === 'vlans' ? html`
            <div class="interface-search" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <div class="search-container">
                <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
                <input 
                  class="form-input search-input"
                  type="text"
                  placeholder="${t('network.searchVLANs')}"
                  .value=${this.vlanSearchQuery}
                  @input=${(e: Event) => this.vlanSearchQuery = (e.target as HTMLInputElement).value}
                />
              </div>
              <button class="action-button primary" @click="${this.openVLANDrawer}">
                ${t('network.createVLAN')}
              </button>
            </div>
            
            ${this.vlans.length > 0 ? html`
              <table class="network-table">
                <thead>
                  <tr>
                    <th>${t('common.name')}</th>
                    <th>${t('common.state')}</th>
                    <th>${t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.vlans.filter(vlan => vlan.name.toLowerCase().includes(this.vlanSearchQuery.toLowerCase())).map((vlan, index) => html`
                    <tr>
                      <td>${vlan.name}</td>
                      <td>
                        <div class="status-indicator">
                          <span class="status-icon ${vlan.state === 'up' ? 'up' : 'down'}" data-tooltip="${vlan.state === 'up' ? 'Up' : 'Down'}"></span>
                        </div>
                      </td>
                      <td>
                        <div class="action-menu">
                          <button class="action-dots" @click=${(e: Event) => this.toggleActionMenu(e, `vlan-${index}`)}>${'⋮'}</button>
                          <div class="action-dropdown" id="vlan-${index}">
                            <button class="danger" @click=${() => { this.closeAllMenus(); this.deleteVlan(vlan.name); }}>
                              ${t('common.delete')}
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  `)}
                </tbody>
              </table>
            ` : html`<div class="empty-state">${t('network.noVLANs')}</div>`}
          ` : ''}
        </div>
      </div>

      <modal-dialog
        ?open=${this.showConfirmModal}
        .title=${this.confirmTitle}
        size="small"
        @modal-close=${this.handleCancel}
      >
        <p>${this.confirmMessage}</p>
        <div slot="footer" style="display: flex; gap: 8px; justify-content: flex-end;">
          <button class="action-button" @click=${this.handleCancel}>
            ${t('common.cancel')}
          </button>
          <button class="action-button primary" @click=${this.handleConfirm}>
            ${t('common.confirm')}
          </button>
        </div>
      </modal-dialog>

      ${this.showConfigureDrawer ? html`
        <div class="drawer">
          <button class="close-btn" @click="${() => this.closeConfigureDrawer()}">×</button>
          <div class="drawer-content">
            <h2>${t('network.configureInterface')}</h2>
            ${this.configureNetworkInterface ? html`
              <form @submit=${(e: Event) => { e.preventDefault(); this.submitConfigureAddress(); }}>
                <div class="detail-item" style="margin-bottom: 16px;">
                  <span class="detail-label">${t('network.interfaceName')}</span>
                  <span class="detail-value">${this.configureNetworkInterface.name}</span>
                </div>
                <div class="detail-item" style="margin-bottom: 16px;">
                  <span class="detail-label">${t('network.currentState')}</span>
                  <span class="detail-value">${this.configureNetworkInterface.state}</span>
                </div>
                
                <div class="form-group">
                  <label class="form-label" for="address">${t('network.ipAddressRequired')}</label>
                  <input 
                    id="address"
                    class="form-input" 
                    type="text" 
                    placeholder="192.168.1.100"
                    .value=${this.configureFormData.address}
                    @input=${(e: Event) => this.configureFormData.address = (e.target as HTMLInputElement).value}
                    required
                  />
                </div>
                
                <div class="form-group">
                  <label class="form-label" for="netmask">${t('network.netmaskCidrRequired')}</label>
                  <input 
                    id="netmask"
                    class="form-input" 
                    type="number" 
                    min="0" 
                    max="32" 
                    placeholder="24"
                    .value=${this.configureFormData.netmask}
                    @input=${(e: Event) => this.configureFormData.netmask = parseInt((e.target as HTMLInputElement).value) || 24}
                    required
                  />
                </div>
                
                <div class="form-group">
                  <label class="form-label" for="gateway">${t('network.gatewayOptional')}</label>
                  <input 
                    id="gateway"
                    class="form-input" 
                    type="text" 
                    placeholder="192.168.1.1"
                    .value=${this.configureFormData.gateway}
                    @input=${(e: Event) => this.configureFormData.gateway = (e.target as HTMLInputElement).value}
                  />
                </div>
                
                <div class="form-actions">
                  <button type="button" class="action-button" @click="${() => this.closeConfigureDrawer()}">
                    ${t('common.cancel')}
                  </button>
                  <button type="submit" class="action-button primary">
                    ${t('network.applyConfiguration')}
                  </button>
                </div>
              </form>
            ` : null}
          </div>
        </div>
      ` : null}

      ${this.showBridgeDrawer ? html`
        <div class="drawer">
          <button class="close-btn" @click="${() => this.closeBridgeDrawer()}">×</button>
          <div class="drawer-content">
            <h2>${t('network.createBridgeTitle')}</h2>
            <form @submit=${(e: Event) => { e.preventDefault(); this.handleCreateBridge(); }}>
              <div class="form-group">
                <label class="form-label" for="bridge-name">${t('network.bridgeNameRequired')}</label>
                <input 
                  id="bridge-name"
                  class="form-input" 
                  type="text" 
                  placeholder="br0"
                  .value=${this.bridgeFormData.name}
                  @input=${(e: Event) => this.bridgeFormData.name = (e.target as HTMLInputElement).value}
                  required
                />
              </div>
              
              <div class="form-group">
                <label class="form-label" for="bridge-interfaces">${t('network.interfacesRequired')}</label>
                <input 
                  id="bridge-interfaces"
                  class="form-input" 
                  type="text" 
                  placeholder="eth0, eth1"
                  .value=${this.bridgeFormData.interfaces}
                  @input=${(e: Event) => this.bridgeFormData.interfaces = (e.target as HTMLInputElement).value}
                  required
                />
                <small style="display: block; margin-top: 0.25rem; color: var(--text-secondary); font-size: 0.75rem;">
                  ${t('network.commaSeparatedInterfaces')}
                </small>
              </div>
              
              <div class="form-actions">
                <button type="button" class="action-button" @click="${() => this.closeBridgeDrawer()}">
                  ${t('common.cancel')}
                </button>
                <button type="submit" class="action-button primary">
                  ${t('network.createBridge')}
                </button>
              </div>
            </form>
          </div>
        </div>
      ` : null}

      ${this.showBondDrawer ? html`
        <div class="drawer">
          <button class="close-btn" @click="${() => this.closeBondDrawer()}">×</button>
          <div class="drawer-content">
            <h2>${t('network.createBondTitle')}</h2>
            <form @submit=${(e: Event) => { e.preventDefault(); this.handleCreateBond(); }}>
              <div class="form-group">
                <label class="form-label" for="bond-name">${t('network.bondNameRequired')}</label>
                <input 
                  id="bond-name"
                  class="form-input" 
                  type="text" 
                  placeholder="bond0"
                  .value=${this.bondFormData.name}
                  @input=${(e: Event) => this.bondFormData.name = (e.target as HTMLInputElement).value}
                  required
                />
              </div>
              
              <div class="form-group">
                <label class="form-label" for="bond-mode">${t('network.modeRequired')}</label>
                <select 
                  id="bond-mode"
                  class="form-select" 
                  .value=${this.bondFormData.mode}
                  @input=${(e: Event) => this.bondFormData.mode = (e.target as HTMLSelectElement).value as BondMode}
                  required
                >
                  <option value="balance-rr">balance-rr (Round-robin)</option>
                  <option value="active-backup">active-backup</option>
                  <option value="balance-xor">balance-xor</option>
                  <option value="broadcast">broadcast</option>
                  <option value="802.3ad">802.3ad (LACP)</option>
                  <option value="balance-tlb">balance-tlb</option>
                  <option value="balance-alb">balance-alb</option>
                </select>
              </div>
              
              <div class="form-group">
                <label class="form-label" for="bond-interfaces">${t('network.interfacesRequired')}</label>
                <input 
                  id="bond-interfaces"
                  class="form-input" 
                  type="text" 
                  placeholder="eth2, eth3"
                  .value=${this.bondFormData.interfaces}
                  @input=${(e: Event) => this.bondFormData.interfaces = (e.target as HTMLInputElement).value}
                  required
                />
                <small style="display: block; margin-top: 0.25rem; color: var(--text-secondary); font-size: 0.75rem;">
                  ${t('network.commaSeparatedInterfaces')}
                </small>
              </div>
              
              <div class="form-actions">
                <button type="button" class="action-button" @click="${() => this.closeBondDrawer()}">
                  ${t('common.cancel')}
                </button>
                <button type="submit" class="action-button primary">
                  ${t('network.createBond')}
                </button>
              </div>
            </form>
          </div>
        </div>
      ` : null}

      ${this.showVLANDrawer ? html`
        <div class="drawer">
          <button class="close-btn" @click="${() => this.closeVLANDrawer()}">×</button>
          <div class="drawer-content">
            <h2>${t('network.createVlanTitle')}</h2>
            <form @submit=${(e: Event) => { e.preventDefault(); this.handleCreateVLANInterface(); }}>
              <div class="form-group">
                <label class="form-label" for="vlan-interface">${t('network.baseInterfaceRequired')}</label>
                <input 
                  id="vlan-interface"
                  class="form-input" 
                  type="text" 
                  placeholder="eth0"
                  .value=${this.vlanFormData.interface}
                  @input=${(e: Event) => this.vlanFormData.interface = (e.target as HTMLInputElement).value}
                  required
                />
              </div>
              
              <div class="form-group">
                <label class="form-label" for="vlan-id">${t('network.vlanIdRequired')}</label>
                <input 
                  id="vlan-id"
                  class="form-input" 
                  type="number"
                  min="1"
                  max="4094"
                  placeholder="100"
                  .value=${this.vlanFormData.vlanId}
                  @input=${(e: Event) => this.vlanFormData.vlanId = parseInt((e.target as HTMLInputElement).value) || 0}
                  required
                />
              </div>

              <div class="form-group">
                <label class="form-label" for="vlan-name">${t('network.vlanNameOptional')}</label>
                <input 
                  id="vlan-name"
                  class="form-input" 
                  type="text"
                  placeholder="eth0.100"
                  .value=${this.vlanFormData.name}
                  @input=${(e: Event) => this.vlanFormData.name = (e.target as HTMLInputElement).value}
                />
                <small style="display: block; margin-top: 0.25rem; color: var(--text-secondary); font-size: 0.75rem;">
                  ${t('network.vlanNameDefault')}
                </small>
              </div>

              <div class="form-actions">
                <button type="button" class="action-button" @click="${() => this.closeVLANDrawer()}">
                  ${t('common.cancel')}
                </button>
                <button type="submit" class="action-button primary">
                  ${t('network.createVLAN')}
                </button>
              </div>
            </form>
          </div>
        </div>
      ` : null}
    `;
  }
}

customElements.define('network-tab', NetworkTab);
