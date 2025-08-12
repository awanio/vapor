var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html, css } from 'lit';
import { state } from 'lit/decorators.js';
import { api, ApiError } from '../api';
export class DockerNetworksTab extends LitElement {
    constructor() {
        super(...arguments);
        this.networks = [];
        this.filteredNetworks = [];
        this.error = null;
        this.loading = false;
        this.searchTerm = '';
        this.handleDocumentClick = () => {
            this.closeAllMenus();
        };
    }
    connectedCallback() {
        super.connectedCallback();
        this.fetchNetworks();
        document.addEventListener('click', this.handleDocumentClick);
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        document.removeEventListener('click', this.handleDocumentClick);
    }
    toggleActionMenu(event, menuId) {
        event.stopPropagation();
        const menu = this.shadowRoot?.getElementById(menuId);
        if (menu) {
            const isOpen = menu.classList.contains('show');
            this.closeAllMenus();
            if (!isOpen) {
                menu.classList.add('show');
                const firstButton = menu.querySelector('button');
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
    async fetchNetworks() {
        try {
            this.loading = true;
            this.error = null;
            const data = await api.get('/docker/networks');
            this.networks = data.networks || [];
            this.filterNetworks();
        }
        catch (error) {
            console.error('Error fetching Docker networks:', error);
            this.error = error instanceof ApiError ? error.message : 'Failed to fetch Docker networks';
            this.networks = [];
            this.filteredNetworks = [];
        }
        finally {
            this.loading = false;
        }
    }
    handleSearchInput(e) {
        const target = e.target;
        this.searchTerm = target.value;
        this.filterNetworks();
    }
    filterNetworks() {
        if (!this.searchTerm.trim()) {
            this.filteredNetworks = [...this.networks];
        }
        else {
            const term = this.searchTerm.toLowerCase();
            this.filteredNetworks = this.networks.filter(network => {
                const name = network.name.toLowerCase();
                const driver = network.driver.toLowerCase();
                const scope = network.scope.toLowerCase();
                const subnet = this.getSubnetInfo(network).toLowerCase();
                return name.includes(term) ||
                    driver.includes(term) ||
                    scope.includes(term) ||
                    subnet.includes(term);
            });
        }
    }
    isSystemNetwork(network) {
        const systemNetworks = ['bridge', 'host', 'none'];
        return systemNetworks.includes(network.name);
    }
    getSubnetInfo(network) {
        if (network.ipam && network.ipam.config && network.ipam.config.length > 0) {
            return network.ipam.config.map(config => config.subnet).join(', ');
        }
        return 'N/A';
    }
    render() {
        return html `
      ${!this.error && this.networks.length > 0 ? html `
        <div class="search-box">
          <input 
            type="text" 
            placeholder="Search networks by name, driver, scope, or subnet..."
            .value=${this.searchTerm}
            @input=${this.handleSearchInput}
          />
          <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
        </div>
      ` : ''}
      
      ${this.error ? html `
        <div class="error-state">
          <h3>Error</h3>
          <p>${this.error}</p>
        </div>
      ` : ''}

      ${!this.error && this.networks.length === 0 && !this.loading ? html `
        <div class="empty-state">
          <p>No Docker networks found.</p>
        </div>
      ` : ''}

      ${!this.error && this.searchTerm && this.filteredNetworks.length === 0 && this.networks.length > 0 ? html `
        <div class="empty-state">
          <p>No networks match your search criteria.</p>
        </div>
      ` : ''}

      ${!this.error && this.filteredNetworks.length > 0 ? html `
        <table class="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Driver</th>
              <th>Scope</th>
              <th>Subnet</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${this.filteredNetworks.map(network => html `
              <tr>
                <td>
                  <span class="truncate" title="${network.name}">
                    ${network.name}
                  </span>
                </td>
                <td>${network.driver}</td>
                <td>
                  <span class="network-scope">${network.scope}</span>
                </td>
                <td>
                  <div class="subnet-info">
                    ${this.getSubnetInfo(network)}
                  </div>
                </td>
                <td>${new Date(network.created).toLocaleString()}</td>
                <td>
                  <div class="action-menu">
                    <button class="action-dots" @click="${(e) => this.toggleActionMenu(e, `network-${network.id}`)}">⋮</button>
                    <div class="action-dropdown" id="network-${network.id}">
                      <button 
                        class="danger" 
                        ?disabled="${this.isSystemNetwork(network)}"
                        @click="${() => { this.closeAllMenus(); this.deleteNetwork(network.name); }}"
                        title="${this.isSystemNetwork(network) ? 'Cannot delete system network' : 'Delete network'}"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            `)}
          </tbody>
        </table>
      ` : ''}
    `;
    }
    async deleteNetwork(name) {
        if (this.isSystemNetwork({ name })) {
            console.warn('Cannot delete system network:', name);
            return;
        }
        try {
            console.log('Deleting network:', name);
        }
        catch (error) {
            console.error('Error deleting network:', error);
        }
    }
}
DockerNetworksTab.styles = css `
    :host {
      display: block;
      padding: 16px;
    }

    h1 {
      margin: 0 0 24px 0;
      font-size: 24px;
      font-weight: 300;
      color: var(--text-primary);
    }

    .error-state {
      text-align: center;
      padding: 3rem;
      color: var(--vscode-error);
      background: var(--vscode-bg-light);
      border-radius: 6px;
      margin: 2rem 0;
    }

    .empty-state {
      text-align: center;
      padding: 3rem;
      color: var(--text-secondary);
    }

    .table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      background: var(--vscode-bg-light);
      border-radius: 1px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border, #454545));
    }

    .table thead {
      background: var(--vscode-bg-lighter);
    }

    .table th {
      background: var(--vscode-bg-dark);
      color: var(--vscode-text);
      font-weight: 600;
      text-align: left;
      padding: 12px 16px;
      font-size: 0.875rem;
      border-bottom: 1px solid var(--vscode-widget-border, var(--vscode-panel-border, #454545));
    }

    .table td {
      padding: 12px 16px;
      color: var(--vscode-text);
      font-size: 0.875rem;
      border-bottom: 1px solid var(--vscode-widget-border, var(--vscode-panel-border, #454545));
      position: relative;
    }

    .table tr:last-child td {
      border-bottom: none;
    }

    .table tr:hover td {
      background: rgba(255, 255, 255, 0.02);
    }

    .table td:last-child {
      text-align: right;
    }

    .btn {
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      margin-right: 4px;
      transition: all 0.2s;
    }

    .btn-danger {
      background: var(--vscode-error, #f44336);
      color: white;
    }

    .btn-danger:hover {
      opacity: 0.9;
    }

    .btn-danger:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .truncate {
      max-width: 200px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: inline-block;
    }

    .network-scope {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
    }

    .subnet-info {
      font-size: 0.8rem;
      color: var(--text-secondary);
    }

    .search-box {
      position: relative;
      margin-bottom: 1rem;
      max-width: 250px;
    }

    .search-box input {
      width: 100%;
      padding: 8px 36px 8px 36px;
      border: 1px solid var(--vscode-border);
      border-radius: 4px;
      background: var(--vscode-bg-light);
      color: var(--vscode-text);
      font-size: 14px;
      transition: border-color 0.2s;
    }

    .search-box input:focus {
      outline: none;
      border-color: var(--vscode-accent);
    }

    .search-box input::placeholder {
      color: var(--vscode-text-dim);
    }

    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--vscode-text-dim);
      pointer-events: none;
      width: 16px;
      height: 16px;
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
      color: var(--vscode-text-dim);
      font-size: 18px;
      line-height: 1;
      transition: background-color 0.2s;
      border-radius: 4px;
    }

    .action-dots:hover {
      background-color: var(--vscode-toolbar-hoverBackground, rgba(90, 93, 94, 0.1));
    }

    .action-dropdown {
      position: absolute;
      right: 0;
      top: 100%;
      margin-top: 4px;
      background: var(--vscode-dropdown-background, var(--vscode-bg-light));
      border: 1px solid var(--vscode-dropdown-border, var(--vscode-border));
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      min-width: 160px;
      z-index: 1000;
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
      color: var(--vscode-text);
      cursor: pointer;
      font-size: 13px;
      transition: background-color 0.2s;
    }

    .action-dropdown button:hover {
      background-color: var(--vscode-list-hoverBackground, rgba(255, 255, 255, 0.08));
    }

    .action-dropdown button.danger {
      color: var(--vscode-error);
    }

    .action-dropdown button.danger:hover {
      background-color: rgba(244, 67, 54, 0.1);
    }

    .action-dropdown button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .action-dropdown button:disabled:hover {
      background-color: transparent;
    }
  `;
__decorate([
    state()
], DockerNetworksTab.prototype, "networks", void 0);
__decorate([
    state()
], DockerNetworksTab.prototype, "filteredNetworks", void 0);
__decorate([
    state()
], DockerNetworksTab.prototype, "error", void 0);
__decorate([
    state()
], DockerNetworksTab.prototype, "loading", void 0);
__decorate([
    state()
], DockerNetworksTab.prototype, "searchTerm", void 0);
customElements.define('docker-networks-tab', DockerNetworksTab);
//# sourceMappingURL=docker-networks-tab.js.map