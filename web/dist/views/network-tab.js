var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html, css } from 'lit';
import { state } from 'lit/decorators.js';
import { api } from '../api';
export class NetworkTab extends LitElement {
    constructor() {
        super();
        this.activeTab = 'interfaces';
        this.interfaces = [];
        this.bridges = [];
        this.bonds = [];
        this.vlans = [];
    }
    firstUpdated() {
        this.fetchNetworkData();
    }
    async fetchNetworkData() {
        this.fetchInterfaces();
        this.fetchBridges();
        this.fetchBonds();
        this.fetchVlans();
    }
    async fetchInterfaces() {
        try {
            const data = await api.get('/network/interfaces');
            this.interfaces = data.interfaces || [];
        }
        catch (error) {
            console.error('Error fetching network interfaces:', error);
        }
    }
    async fetchBridges() {
        try {
            const data = await api.get('/network/bridges');
            this.bridges = data.bridges || [];
        }
        catch (error) {
            console.error('Error fetching bridges:', error);
        }
    }
    async fetchBonds() {
        try {
            const data = await api.get('/network/bonds');
            this.bonds = data.bonds || [];
        }
        catch (error) {
            console.error('Error fetching bonds:', error);
        }
    }
    async fetchVlans() {
        try {
            const data = await api.get('/network/vlans');
            this.vlans = data.vlans || [];
        }
        catch (error) {
            console.error('Error fetching VLANs:', error);
        }
    }
    toggleInterfaceState(iface) {
        const url = `/network/interfaces/${iface.name}/${iface.state === 'up' ? 'down' : 'up'}`;
        api.put(url).then(() => this.fetchInterfaces()).catch(console.error);
    }
    async deleteBridge(name) {
        if (confirm(`Are you sure you want to delete bridge ${name}?`)) {
            try {
                await api.delete(`/network/bridge/${name}`);
                await this.fetchBridges();
            }
            catch (error) {
                console.error('Error deleting bridge:', error);
            }
        }
    }
    async deleteBond(name) {
        if (confirm(`Are you sure you want to delete bond ${name}?`)) {
            try {
                await api.delete(`/network/bond/${name}`);
                await this.fetchBonds();
            }
            catch (error) {
                console.error('Error deleting bond:', error);
            }
        }
    }
    async deleteVlan(name) {
        if (confirm(`Are you sure you want to delete VLAN ${name}?`)) {
            try {
                await api.delete(`/network/vlan/${name}`);
                await this.fetchVlans();
            }
            catch (error) {
                console.error('Error deleting VLAN:', error);
            }
        }
    }
    handleConfigureAddress(iface) {
        const request = {
            address: '192.168.1.20',
            netmask: 24,
            gateway: '192.168.1.1'
        };
        api.post(`/network/interfaces/${iface.name}/address`, request)
            .then(() => this.fetchInterfaces())
            .catch(console.error);
    }
    handleCreateBridge() {
        const request = {
            name: 'br0',
            interfaces: ['eth0', 'eth1']
        };
        api.post('/network/bridge', request)
            .then(() => {
            this.fetchBridges();
            this.fetchInterfaces();
        })
            .catch(console.error);
    }
    handleCreateBond() {
        const request = {
            name: 'bond0',
            mode: 'balance-rr',
            interfaces: ['eth2', 'eth3']
        };
        api.post('/network/bond', request)
            .then(() => {
            this.fetchBonds();
            this.fetchInterfaces();
        })
            .catch(console.error);
    }
    handleCreateVLANInterface() {
        const request = {
            interface: 'eth0',
            vlan_id: 100,
            name: 'eth0.100'
        };
        api.post('/network/vlan', request)
            .then(() => {
            this.fetchVlans();
            this.fetchInterfaces();
        })
            .catch(console.error);
    }
    renderInterface(iface) {
        return html `
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
            <span class="detail-label">RX Bytes</span>
            <span class="detail-value">${iface.statistics.rx_bytes}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">TX Bytes</span>
            <span class="detail-value">${iface.statistics.tx_bytes}</span>
          </div>
        </div>
        <div class="interface-actions">
          <button class="action-button primary" @click="${() => this.toggleInterfaceState(iface)}">
            ${iface.state === 'up' ? 'Down' : 'Up'}
          </button>
          <button class="action-button" @click="${() => this.handleConfigureAddress(iface)}">
            Configure
          </button>
        </div>
      </div>
    `;
    }
    renderTabs() {
        return html `
      <div class="tab-header">
        <button class="tab-button ${this.activeTab === 'interfaces' ? 'active' : ''}" @click="${() => this.activeTab = 'interfaces'}">
          Interfaces
        </button>
        <button class="tab-button ${this.activeTab === 'bridges' ? 'active' : ''}" @click="${() => this.activeTab = 'bridges'}">
          Bridges
        </button>
        <button class="tab-button ${this.activeTab === 'bonds' ? 'active' : ''}" @click="${() => this.activeTab = 'bonds'}">
          Bonds
        </button>
        <button class="tab-button ${this.activeTab === 'vlans' ? 'active' : ''}" @click="${() => this.activeTab = 'vlans'}">
          VLANs
        </button>
      </div>
    `;
    }
    render() {
        return html `
      <div class="tab-container">
        <h1>Network Management</h1>
        ${this.renderTabs()}
        <div class="tab-content">
          ${this.activeTab === 'interfaces' ? html `
            <h2>Interfaces</h2>
            ${this.interfaces.length > 0 ? html `
              ${this.interfaces.map(iface => this.renderInterface(iface))}
            ` : html `<div class="empty-state">No interfaces found.</div>`}
          ` : ''}

          ${this.activeTab === 'bridges' ? html `
            <h2>Bridges</h2>
            <div class="create-form">
              <div class="form-group">
                <label class="form-label">Bridge Name</label>
                <input class="form-input" placeholder="br0">
              </div>
              <div class="form-group">
                <label class="form-label">Interfaces</label>
                <input class="form-input" placeholder="eth0, eth1">
              </div>
              <div class="form-actions">
                <button class="action-button primary" @click="${this.handleCreateBridge}">Create Bridge</button>
              </div>
            </div>
            
            ${this.bridges.length > 0 ? html `
              <h3>Existing Bridges</h3>
              ${this.bridges.map(bridge => html `
                <div class="network-interface">
                  <div class="interface-header">
                    <span class="interface-name">${bridge.name}</span>
                    <span class="interface-state ${bridge.state === 'up' ? 'state-up' : 'state-down'}">
                      ${bridge.state}
                    </span>
                  </div>
                  <div class="interface-actions">
                    <button class="action-button" @click="${() => this.deleteBridge(bridge.name)}">
                      Delete
                    </button>
                  </div>
                </div>
              `)}
            ` : html `<div class="empty-state">No bridges configured.</div>`}
          ` : ''}

          ${this.activeTab === 'bonds' ? html `
            <h2>Bonds</h2>
            <div class="create-form">
              <div class="form-group">
                <label class="form-label">Bond Name</label>
                <input class="form-input" placeholder="bond0">
              </div>
              <div class="form-group">
                <label class="form-label">Mode</label>
                <input class="form-input" placeholder="balance-rr">
              </div>
              <div class="form-group">
                <label class="form-label">Interfaces</label>
                <input class="form-input" placeholder="eth2, eth3">
              </div>
              <div class="form-actions">
                <button class="action-button primary" @click="${this.handleCreateBond}">Create Bond</button>
              </div>
            </div>
            
            ${this.bonds.length > 0 ? html `
              <h3>Existing Bonds</h3>
              ${this.bonds.map(bond => html `
                <div class="network-interface">
                  <div class="interface-header">
                    <span class="interface-name">${bond.name}</span>
                    <span class="interface-state ${bond.state === 'up' ? 'state-up' : 'state-down'}">
                      ${bond.state}
                    </span>
                  </div>
                  <div class="interface-actions">
                    <button class="action-button" @click="${() => this.deleteBond(bond.name)}">
                      Delete
                    </button>
                  </div>
                </div>
              `)}
            ` : html `<div class="empty-state">No bonds configured.</div>`}
          ` : ''}

          ${this.activeTab === 'vlans' ? html `
            <h2>VLANs</h2>
            <div class="create-form">
              <div class="form-group">
                <label class="form-label">Base Interface</label>
                <input class="form-input" placeholder="eth0">
              </div>
              <div class="form-group">
                <label class="form-label">VLAN ID</label>
                <input class="form-input" placeholder="100">
              </div>
              <div class="form-actions">
                <button class="action-button primary" @click="${this.handleCreateVLANInterface}">Create VLAN Interface</button>
              </div>
            </div>
            
            ${this.vlans.length > 0 ? html `
              <h3>Existing VLANs</h3>
              ${this.vlans.map(vlan => html `
                <div class="network-interface">
                  <div class="interface-header">
                    <span class="interface-name">${vlan.name}</span>
                    <span class="interface-state ${vlan.state === 'up' ? 'state-up' : 'state-down'}">
                      ${vlan.state}
                    </span>
                  </div>
                  <div class="interface-actions">
                    <button class="action-button" @click="${() => this.deleteVlan(vlan.name)}">
                      Delete
                    </button>
                  </div>
                </div>
              `)}
            ` : html `<div class="empty-state">No VLANs configured.</div>`}
          ` : ''}
        </div>
      </div>
    `;
    }
}
NetworkTab.styles = css `
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
  `;
__decorate([
    state()
], NetworkTab.prototype, "activeTab", void 0);
__decorate([
    state()
], NetworkTab.prototype, "interfaces", void 0);
__decorate([
    state()
], NetworkTab.prototype, "bridges", void 0);
__decorate([
    state()
], NetworkTab.prototype, "bonds", void 0);
__decorate([
    state()
], NetworkTab.prototype, "vlans", void 0);
customElements.define('network-tab', NetworkTab);
//# sourceMappingURL=network-tab.js.map