import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';

class KubernetesTab extends LitElement {
  @property({ type: String }) activeSubmenu = 'workload';
  @property({ type: Array }) workloads = [];
  @property({ type: Array }) networks = [];
  @property({ type: Array }) storages = [];
  @property({ type: Array }) configurations = [];
  @property({ type: Array }) helms = [];
  @property({ type: String }) error = null;

  static styles = css`
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

    .table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 1.5rem;
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

    .table tr:hover td {
      background: rgba(255, 255, 255, 0.02);
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
      background-color: var(--hover-bg);
    }

    .action-dropdown {
      position: absolute;
      right: 0;
      top: 100%;
      background: var(--vscode-dropdown-background, var(--vscode-menu-background));
      border: 1px solid var(--vscode-dropdown-border, var(--vscode-menu-border));
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      z-index: 1000;
      display: none;
    }

    .action-dropdown.show {
      display: block;
    }

    .action-dropdown button {
      display: block;
      width: 100%;
      padding: 8px 16px;
      border: none;
      background: none;
      text-align: left;
      cursor: pointer;
      color: var(--vscode-text);
      transition: background-color 0.2s;
    }

    .action-dropdown button:hover {
      background-color: var(--hover-bg);
    }

    .action-dropdown button.danger {
      color: var(--vscode-error);
    }

    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s;
    }

    .btn-primary {
      background: var(--vscode-accent);
      color: white;
    }

    .btn-primary:hover {
      background: var(--vscode-accent-hover);
    }

    h1 {
      margin: 0 0 24px 0;
      padding: 0;
      font-size: 24px;
      font-weight: 300;
    }

    .table tr:last-child td {
      border-bottom: none;
    }

    .table td:last-child {
      text-align: right;
    }
  `;
  renderTabs() {
    return html`
      <div class="tab-header">
        <button 
          class="tab-button ${this.activeSubmenu === 'workload' ? 'active' : ''}" 
          @click="${() => this.handleTabClick('workload')}"
        >
          Workload
        </button>
        <button 
          class="tab-button ${this.activeSubmenu === 'networks' ? 'active' : ''}" 
          @click="${() => this.handleTabClick('networks')}"
        >
          Networks
        </button>
        <button 
          class="tab-button ${this.activeSubmenu === 'storage' ? 'active' : ''}" 
          @click="${() => this.handleTabClick('storage')}"
        >
          Storages
        </button>
        <button 
          class="tab-button ${this.activeSubmenu === 'configurations' ? 'active' : ''}" 
          @click="${() => this.handleTabClick('configurations')}"
        >
          Configurations
        </button>
        <button 
          class="tab-button ${this.activeSubmenu === 'helm' ? 'active' : ''}" 
          @click="${() => this.handleTabClick('helm')}"
        >
          Helm
        </button>
      </div>
    `;
  }

  renderTable() {
    const data = this[this.activeSubmenu] || [];
    
    if (data.length === 0) {
      return html`
        <div class="empty-state">No ${this.activeSubmenu} found.</div>
      `;
    }

    return html`
      <table class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${data.map((item, index) => html`
            <tr>
              <td>${item.id || `${this.activeSubmenu}-${index + 1}`}</td>
              <td>${item.name || `Sample ${this.activeSubmenu} ${index + 1}`}</td>
              <td>${item.status || 'Running'}</td>
              <td>
                <div class="action-menu">
                  <button class="action-dots" @click=${(e) => this.toggleActionMenu(e, `k8s-${this.activeSubmenu}-${index}`)}>⋮</button>
                  <div class="action-dropdown" id="k8s-${this.activeSubmenu}-${index}">
                    <button @click=${() => { this.closeAllMenus(); this.viewDetails(item); }}>View Details</button>
                    <button @click=${() => { this.closeAllMenus(); this.editItem(item); }}>Edit</button>
                    <button class="danger" @click=${() => { this.closeAllMenus(); this.deleteItem(item); }}>Delete</button>
                  </div>
                </div>
              </td>
            </tr>
          `)}
        </tbody>
      </table>
    `;
  }

  render() {
    return html`
      <div class="tab-container">
        <h1>Kubernetes</h1>
        ${this.renderTabs()}
        <div class="tab-content">
          ${this.error ? html`
            <div class="error-state">
              <h3>Error</h3>
              <p>${this.error}</p>
            </div>` : this.renderTable()}
        </div>
      </div>
    `;
  }

  connectedCallback() {
    super.connectedCallback();
    this.initializeMockData();
  }

  initializeMockData() {
    // Initialize with mock data for demonstration
    this.workloads = [
      { id: 'wl-1', name: 'nginx-deployment', status: 'Running' },
      { id: 'wl-2', name: 'api-service', status: 'Pending' }
    ];
    this.networks = [
      { id: 'net-1', name: 'cluster-network', status: 'Active' },
      { id: 'net-2', name: 'ingress-network', status: 'Active' }
    ];
    this.storages = [
      { id: 'pv-1', name: 'database-volume', status: 'Bound' },
      { id: 'pv-2', name: 'logs-volume', status: 'Available' }
    ];
    this.configurations = [
      { id: 'cm-1', name: 'app-config', status: 'Active' },
      { id: 'sec-1', name: 'db-secrets', status: 'Active' }
    ];
    this.helms = [
      { id: 'helm-1', name: 'prometheus', status: 'Deployed' },
      { id: 'helm-2', name: 'grafana', status: 'Failed' }
    ];
  }

  handleTabClick(tab) {
    this.activeSubmenu = tab;
    // You can add route handling here if needed
    // window.history.pushState({}, '', `/kubernetes/${tab}`);
  }

  toggleActionMenu(event, menuId) {
    event.stopPropagation();
    
    // Close all other menus first
    this.closeAllMenus();
    
    // Toggle the clicked menu
    const menu = this.shadowRoot?.querySelector(`#${menuId}`);
    if (menu) {
      menu.classList.toggle('show');
    }
    
    // Add click listener to close menu when clicking outside
    if (menu?.classList.contains('show')) {
      setTimeout(() => {
        document.addEventListener('click', this.handleOutsideClick);
      }, 0);
    }
  }

  closeAllMenus() {
    const menus = this.shadowRoot?.querySelectorAll('.action-dropdown');
    menus?.forEach(menu => menu.classList.remove('show'));
    document.removeEventListener('click', this.handleOutsideClick);
  }

  handleOutsideClick = () => {
    this.closeAllMenus();
  }

  async fetchData() {
    try {
      // Replace this URL with the actual API endpoint
      const response = await fetch(`/api/kubernetes/${this.activeSubmenu}`);
      const data = await response.json();
      this[this.activeSubmenu] = data.items || [];
      this.error = null;
    } catch (error) {
      this.error = 'Failed to fetch data';
    }
  }

  viewDetails(item) {
    // Implement detailed view logic here
    console.log('Viewing details for:', item);
    alert(`Viewing details for ${item.name || item.id}`);
  }

  editItem(item) {
    // Implement edit logic here
    console.log('Editing item:', item);
    alert(`Editing ${item.name || item.id}`);
  }

  deleteItem(item) {
    // Implement delete logic here
    console.log('Deleting item:', item);
    if (confirm(`Are you sure you want to delete ${item.name || item.id}?`)) {
      // Remove item from the appropriate array
      const currentData = this[this.activeSubmenu];
      const index = currentData.indexOf(item);
      if (index > -1) {
        currentData.splice(index, 1);
        this.requestUpdate();
      }
    }
  }
}

customElements.define('kubernetes-tab', KubernetesTab);
