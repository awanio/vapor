import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';

class KubernetesTab extends LitElement {
  @property({ type: String }) activeSubmenu = 'workloads';
  @property({ type: String }) subRoute: string | null = null;
  @property({ type: Array }) workloads = [];
  @property({ type: Array }) networks = [];
  @property({ type: Array }) storages = [];
  @property({ type: Array }) configurations = [];
  @property({ type: Array }) helms = [];
  @property({ type: String }) error = null;
  @property({ type: String }) activeWorkloadTab = 'pods';
  @property({ type: String }) activeStorageTab = 'pvc';
  @property({ type: String }) activeConfigurationTab = 'secrets';
  @property({ type: String }) activeHelmTab = 'releases';

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


    .tab-content {
      flex: 1;
      overflow-y: auto;
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

    .table {
      width: 100%;
      border-collapse: collapse;
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

    .status {
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
      text-transform: uppercase;
    }

    .status.running,
    .status.active,
    .status.deployed,
    .status.bound,
    .status.available,
    .status.ready {
      background-color: rgba(34, 197, 94, 0.1);
      color: rgb(34, 197, 94);
    }

    .status.pending {
      background-color: rgba(251, 191, 36, 0.1);
      color: rgb(251, 191, 36);
    }

    .status.failed,
    .status.error {
      background-color: rgba(239, 68, 68, 0.1);
      color: rgb(239, 68, 68);
    }

    .status.enforced {
      background-color: rgba(59, 130, 246, 0.1);
      color: rgb(59, 130, 246);
    }

    .search-container {
      display: flex;
      align-items: center;
      margin-bottom: 1.5rem;
      gap: 1rem;
    }

    .search-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      max-width: 400px;
    }

    .search-icon {
      position: absolute;
      left: 12px;
      color: var(--vscode-input-placeholderForeground, #999);
      pointer-events: none;
      width: 16px;
      height: 16px;
    }

    .search-input {
      padding: 6px 12px 6px 32px;
      border: 1px solid var(--vscode-widget-border, var(--vscode-input-border, var(--vscode-panel-border, #454545)));
      border-radius: 4px;
      background-color: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      font-size: 0.875rem;
      width: 250px;
      transition: all 0.2s;
      outline: none;
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.08);
    }

    .search-input:hover {
      border-color: var(--vscode-inputOption-hoverBorder, var(--vscode-widget-border, #858585));
    }

    .search-input:focus {
      border-color: var(--vscode-focusBorder, #007acc);
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1), 0 0 0 1px var(--vscode-focusBorder, #007acc);
    }

    .search-input::placeholder {
      color: var(--vscode-input-placeholderForeground, #999);
      opacity: 0.7;
    }
  `;

  renderContent() {
    // Use filtered data based on search query
    const data = this.getFilteredData();

    if (data.length === 0) {
      const allData = this[this.activeSubmenu] || [];
      if (allData.length === 0) {
        return html`
          <div class="empty-state">No ${this.activeSubmenu} resources found.</div>
        `;
      } else {
        return html`
          <div class="empty-state">No ${this.activeSubmenu} resources match your search.</div>
        `;
      }
    }

    switch (this.activeSubmenu) {
      case 'workloads':
        return this.renderWorkloadTable(data);
      case 'networks':
        return this.renderNetworksTable(data);
      case 'storages':
        return this.renderStorageTable(data);
      case 'configurations':
        return this.renderConfigurationsTable(data);
      case 'helms':
        return this.renderHelmTable(data);
      default:
        return html`<div class="empty-state">Invalid submenu</div>`;
    }
  }

  renderWorkloadTable(data) {
    return html`
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Namespace</th>
            <th>Status</th>
            <th>Replicas</th>
            <th>Age</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${data.map((item, index) => html`
            <tr>
              <td>${item.name}</td>
              <td>${item.type}</td>
              <td>${item.namespace}</td>
              <td><span class="status ${item.status.toLowerCase()}">${item.status}</span></td>
              <td>${item.replicas || '-'}</td>
              <td>${item.age}</td>
              <td>
                <div class="action-menu">
                  <button class="action-dots" @click=${(e) => this.toggleActionMenu(e, `k8s-workload-${index}`)}>⋮</button>
                  <div class="action-dropdown" id="k8s-workload-${index}">
                    <button @click=${() => { this.closeAllMenus(); this.viewDetails(item); }}>View Details</button>
                    <button @click=${() => { this.closeAllMenus(); this.scalePods(item); }}>Scale</button>
                    <button @click=${() => { this.closeAllMenus(); this.viewLogs(item); }}>View Logs</button>
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

  renderNetworksTable(data) {
    return html`
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Namespace</th>
            <th>Status</th>
            <th>Endpoints</th>
            <th>Age</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${data.map((item, index) => html`
            <tr>
              <td>${item.name}</td>
              <td>${item.type}</td>
              <td>${item.namespace}</td>
              <td><span class="status ${item.status.toLowerCase()}">${item.status}</span></td>
              <td>${item.endpoints}</td>
              <td>${item.age}</td>
              <td>
                <div class="action-menu">
                  <button class="action-dots" @click=${(e) => this.toggleActionMenu(e, `k8s-networks-${index}`)}>⋮</button>
                  <div class="action-dropdown" id="k8s-networks-${index}">
                    <button @click=${() => { this.closeAllMenus(); this.viewDetails(item); }}>View Details</button>
                    <button @click=${() => { this.closeAllMenus(); this.editItem(item); }}>Edit</button>
                    <button @click=${() => { this.closeAllMenus(); this.viewEndpoints(item); }}>View Endpoints</button>
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

  renderStorageTable(data) {
    return html`
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Namespace</th>
            <th>Status</th>
            <th>Capacity</th>
            <th>Access Mode</th>
            <th>Age</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${data.map((item, index) => html`
            <tr>
              <td>${item.name}</td>
              <td>${item.type}</td>
              <td>${item.namespace}</td>
              <td><span class="status ${item.status.toLowerCase()}">${item.status}</span></td>
              <td>${item.capacity}</td>
              <td>${item.accessMode}</td>
              <td>${item.age}</td>
              <td>
                <div class="action-menu">
                  <button class="action-dots" @click=${(e) => this.toggleActionMenu(e, `k8s-storage-${index}`)}>⋮</button>
                  <div class="action-dropdown" id="k8s-storage-${index}">
                    <button @click=${() => { this.closeAllMenus(); this.viewDetails(item); }}>View Details</button>
                    <button @click=${() => { this.closeAllMenus(); this.editItem(item); }}>Edit</button>
                    <button @click=${() => { this.closeAllMenus(); this.expandVolume(item); }}>Expand</button>
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

  renderConfigurationsTable(data) {
    return html`
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Namespace</th>
            <th>Status</th>
            <th>Keys</th>
            <th>Age</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${data.map((item, index) => html`
            <tr>
              <td>${item.name}</td>
              <td>${item.type}</td>
              <td>${item.namespace}</td>
              <td><span class="status ${item.status.toLowerCase()}">${item.status}</span></td>
              <td>${item.keys}</td>
              <td>${item.age}</td>
              <td>
                <div class="action-menu">
                  <button class="action-dots" @click=${(e) => this.toggleActionMenu(e, `k8s-configurations-${index}`)}>⋮</button>
                  <div class="action-dropdown" id="k8s-configurations-${index}">
                    <button @click=${() => { this.closeAllMenus(); this.viewDetails(item); }}>View Details</button>
                    <button @click=${() => { this.closeAllMenus(); this.editItem(item); }}>Edit</button>
                    <button @click=${() => { this.closeAllMenus(); this.viewKeys(item); }}>View Keys</button>
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

  renderHelmTable(data) {
    return html`
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Namespace</th>
            <th>Revision</th>
            <th>Status</th>
            <th>Chart</th>
            <th>Updated</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${data.map((item, index) => html`
            <tr>
              <td>${item.name}</td>
              <td>${item.namespace}</td>
              <td>${item.revision}</td>
              <td><span class="status ${item.status.toLowerCase()}">${item.status}</span></td>
              <td>${item.chart}</td>
              <td>${item.updated}</td>
              <td>
                <div class="action-menu">
                  <button class="action-dots" @click=${(e) => this.toggleActionMenu(e, `k8s-helm-${index}`)}>⋮</button>
                  <div class="action-dropdown" id="k8s-helm-${index}">
                    <button @click=${() => { this.closeAllMenus(); this.viewDetails(item); }}>View Details</button>
                    <button @click=${() => { this.closeAllMenus(); this.upgradeRelease(item); }}>Upgrade</button>
                    <button @click=${() => { this.closeAllMenus(); this.rollbackRelease(item); }}>Rollback</button>
                    <button class="danger" @click=${() => { this.closeAllMenus(); this.uninstallRelease(item); }}>Uninstall</button>
                  </div>
                </div>
              </td>
            </tr>
          `)}
        </tbody>
      </table>
    `;
  }

  private searchQuery: string = '';

  private handleSearchInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchQuery = target.value.toLowerCase();
    this.requestUpdate();
  }

  private getFilteredData(): Array<any> {
    let data = this[this.activeSubmenu] || [];
    
    // If viewing workloads, filter by active workload tab
    if (this.activeSubmenu === 'workloads') {
      data = this.getFilteredWorkloadData();
    }
    
    // If viewing storages, filter by active storage tab
    if (this.activeSubmenu === 'storages') {
      data = this.getFilteredStorageData();
    }
    
    // If viewing configurations, filter by active configuration tab
    if (this.activeSubmenu === 'configurations') {
      data = this.getFilteredConfigurationData();
    }
    
    // If viewing helms, filter by active helm tab
    if (this.activeSubmenu === 'helms') {
      data = this.getFilteredHelmData();
    }
    
    if (!this.searchQuery) return data;
    return data.filter(item => JSON.stringify(item).toLowerCase().includes(this.searchQuery));
  }

  private getFilteredWorkloadData(): Array<any> {
    const allWorkloads = this.workloads || [];
    
    switch (this.activeWorkloadTab) {
      case 'pods':
        return allWorkloads.filter(item => item.type === 'Pod');
      case 'deployments':
        return allWorkloads.filter(item => item.type === 'Deployment');
      case 'statefulsets':
        return allWorkloads.filter(item => item.type === 'StatefulSet');
      default:
        return allWorkloads;
    }
  }

  private getFilteredStorageData(): Array<any> {
    const allStorages = this.storages || [];
    
    switch (this.activeStorageTab) {
      case 'pvc':
        return allStorages.filter(item => item.type === 'PersistentVolumeClaim');
      case 'pv':
        return allStorages.filter(item => item.type === 'PersistentVolume');
      default:
        return allStorages;
    }
  }

  private getFilteredConfigurationData(): Array<any> {
    const allConfigurations = this.configurations || [];
    
    switch (this.activeConfigurationTab) {
      case 'secrets':
        return allConfigurations.filter(item => item.type === 'Secret');
      case 'configmap':
        return allConfigurations.filter(item => item.type === 'ConfigMap');
      default:
        return allConfigurations;
    }
  }

  private getFilteredHelmData(): Array<any> {
    const allHelms = this.helms || [];
    
    switch (this.activeHelmTab) {
      case 'releases':
        return allHelms.filter(item => item.type === 'Release');
      case 'charts':
        return allHelms.filter(item => item.type === 'Chart');
      default:
        return allHelms;
    }
  }

  private handleWorkloadTabClick(tab: string) {
    this.activeWorkloadTab = tab;
    this.requestUpdate();
  }

  private handleStorageTabClick(tab: string) {
    this.activeStorageTab = tab;
    this.requestUpdate();
  }

  private handleConfigurationTabClick(tab: string) {
    this.activeConfigurationTab = tab;
    this.requestUpdate();
  }

  private handleHelmTabClick(tab: string) {
    this.activeHelmTab = tab;
    this.requestUpdate();
  }

  private renderWorkloadTabs() {
    return html`
      <div class="tab-header">
        <button 
          class="tab-button ${this.activeWorkloadTab === 'pods' ? 'active' : ''}"
          @click=${() => this.handleWorkloadTabClick('pods')}
        >
          Pods
        </button>
        <button 
          class="tab-button ${this.activeWorkloadTab === 'deployments' ? 'active' : ''}"
          @click=${() => this.handleWorkloadTabClick('deployments')}
        >
          Deployments
        </button>
        <button 
          class="tab-button ${this.activeWorkloadTab === 'statefulsets' ? 'active' : ''}"
          @click=${() => this.handleWorkloadTabClick('statefulsets')}
        >
          StatefulSets
        </button>
      </div>
    `;
  }

  private renderStorageTabs() {
    return html`
      <div class="tab-header">
        <button 
          class="tab-button ${this.activeStorageTab === 'pvc' ? 'active' : ''}"
          @click=${() => this.handleStorageTabClick('pvc')}
        >
          PVC
        </button>
        <button 
          class="tab-button ${this.activeStorageTab === 'pv' ? 'active' : ''}"
          @click=${() => this.handleStorageTabClick('pv')}
        >
          PV
        </button>
      </div>
    `;
  }

  private renderConfigurationTabs() {
    return html`
      <div class="tab-header">
        <button 
          class="tab-button ${this.activeConfigurationTab === 'secrets' ? 'active' : ''}"
          @click=${() => this.handleConfigurationTabClick('secrets')}
        >
          Secrets
        </button>
        <button 
          class="tab-button ${this.activeConfigurationTab === 'configmap' ? 'active' : ''}"
          @click=${() => this.handleConfigurationTabClick('configmap')}
        >
          ConfigMap
        </button>
      </div>
    `;
  }

  private renderHelmTabs() {
    return html`
      <div class="tab-header">
        <button 
          class="tab-button ${this.activeHelmTab === 'releases' ? 'active' : ''}"
          @click=${() => this.handleHelmTabClick('releases')}
        >
          Releases
        </button>
        <button 
          class="tab-button ${this.activeHelmTab === 'charts' ? 'active' : ''}"
          @click=${() => this.handleHelmTabClick('charts')}
        >
          Charts
        </button>
      </div>
    `;
  }

  render() {
    return html`
      <div class="tab-container">
        <h1>${this.renderTitle()}</h1>
        ${this.activeSubmenu === 'workloads' ? this.renderWorkloadTabs() : ''}
        ${this.activeSubmenu === 'storages' ? this.renderStorageTabs() : ''}
        ${this.activeSubmenu === 'configurations' ? this.renderConfigurationTabs() : ''}
        ${this.activeSubmenu === 'helms' ? this.renderHelmTabs() : ''}
        <div class="search-container">
          <div class="search-wrapper">
            <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input 
              class="search-input"
              type="text" 
              placeholder="Search..."
              .value=${this.searchQuery}
              @input=${this.handleSearchInput}
            />
          </div>
        </div>
        <div class="tab-content">
          ${this.error ? html`
            <div class="error-state">
              <h3>Error</h3>
              <p>${this.error}</p>
            </div>` : this.renderContent()}
        </div>
      </div>
    `;
  }

  renderTitle() {
    const titles = {
      workloads: 'Kubernetes Workloads',
      networks: 'Kubernetes Networks',
      storages: 'Kubernetes Storages',
      configurations: 'Kubernetes Configurations',
      helms: 'Kubernetes Helms'
    };
    return titles[this.activeSubmenu] || 'Kubernetes';
  }

  connectedCallback() {
    super.connectedCallback();
    this.initializeMockData();
    
    // Set initial activeSubmenu based on subRoute or URL
    this.updateActiveSubmenu();
    
    // Listen for URL changes
    window.addEventListener('popstate', this.handleRouteChange);
  }
  
  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('popstate', this.handleRouteChange);
  }
  
  private handleRouteChange = () => {
    const path = window.location.pathname;
    if (path.includes('/kubernetes/')) {
      const submenu = path.split('/kubernetes/')[1];
      if (submenu && ['workloads', 'networks', 'storages', 'configurations', 'helms'].includes(submenu)) {
        this.activeSubmenu = submenu;
      }
    }
  };

  private updateActiveSubmenu() {
    // Priority: subRoute property > URL path > default
    if (this.subRoute && ['workloads', 'networks', 'storages', 'configurations', 'helms'].includes(this.subRoute)) {
      this.activeSubmenu = this.subRoute;
    } else {
      // Fallback to URL detection
      const path = window.location.pathname;
      if (path.includes('/kubernetes/')) {
        const submenu = path.split('/kubernetes/')[1];
        if (submenu && ['workloads', 'networks', 'storages', 'configurations', 'helms'].includes(submenu)) {
          this.activeSubmenu = submenu;
        }
      }
    }
  }

  // Watch for changes to subRoute property
  override updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);
    if (changedProperties.has('subRoute')) {
      this.updateActiveSubmenu();
    }
  }

  initializeMockData() {
    // Workload mock data - Deployments, Services, Pods
    this.workloads = [
      { 
        name: 'nginx-deployment', 
        type: 'Deployment', 
        namespace: 'default', 
        status: 'Running', 
        replicas: '3/3', 
        age: '2d' 
      },
      { 
        name: 'api-gateway', 
        type: 'Deployment', 
        namespace: 'production', 
        status: 'Running', 
        replicas: '2/2', 
        age: '5d' 
      },
      { 
        name: 'redis-deployment', 
        type: 'Deployment', 
        namespace: 'database', 
        status: 'Running', 
        replicas: '1/1', 
        age: '3d' 
      },
      { 
        name: 'web-frontend', 
        type: 'Deployment', 
        namespace: 'frontend', 
        status: 'Running', 
        replicas: '5/5', 
        age: '1w' 
      },
      { 
        name: 'auth-service', 
        type: 'Deployment', 
        namespace: 'auth', 
        status: 'Failed', 
        replicas: '0/2', 
        age: '1h' 
      },
      { 
        name: 'frontend-service', 
        type: 'Service', 
        namespace: 'default', 
        status: 'Active', 
        replicas: '-', 
        age: '1d' 
      },
      { 
        name: 'database-service', 
        type: 'Service', 
        namespace: 'database', 
        status: 'Active', 
        replicas: '-', 
        age: '1w' 
      },
      { 
        name: 'api-loadbalancer', 
        type: 'Service', 
        namespace: 'production', 
        status: 'Active', 
        replicas: '-', 
        age: '2w' 
      },
      { 
        name: 'worker-pod-xyz', 
        type: 'Pod', 
        namespace: 'default', 
        status: 'Pending', 
        replicas: '-', 
        age: '5m' 
      },
      { 
        name: 'nginx-pod-abc', 
        type: 'Pod', 
        namespace: 'default', 
        status: 'Running', 
        replicas: '-', 
        age: '2d' 
      },
      { 
        name: 'redis-pod-def', 
        type: 'Pod', 
        namespace: 'database', 
        status: 'Running', 
        replicas: '-', 
        age: '3d' 
      },
      { 
        name: 'auth-pod-ghi', 
        type: 'Pod', 
        namespace: 'auth', 
        status: 'Error', 
        replicas: '-', 
        age: '30m' 
      },
      { 
        name: 'monitoring-daemon', 
        type: 'DaemonSet', 
        namespace: 'kube-system', 
        status: 'Running', 
        replicas: '3/3', 
        age: '10d' 
      },
      { 
        name: 'log-collector', 
        type: 'DaemonSet', 
        namespace: 'logging', 
        status: 'Running', 
        replicas: '3/3', 
        age: '7d' 
      }
    ];
    
    // Network mock data - Services, Ingress, NetworkPolicies
    this.networks = [
      { 
        name: 'main-ingress', 
        type: 'Ingress', 
        namespace: 'default', 
        status: 'Active', 
        endpoints: 'api.example.com', 
        age: '3d' 
      },
      { 
        name: 'load-balancer', 
        type: 'Service', 
        namespace: 'production', 
        status: 'Active', 
        endpoints: '10.0.1.100:80', 
        age: '7d' 
      },
      { 
        name: 'deny-all-policy', 
        type: 'NetworkPolicy', 
        namespace: 'default', 
        status: 'Enforced', 
        endpoints: '-', 
        age: '1d' 
      },
      { 
        name: 'external-endpoint', 
        type: 'Endpoints', 
        namespace: 'default', 
        status: 'Ready', 
        endpoints: '192.168.1.100:8080', 
        age: '6h' 
      }
    ];
    
    // Storage mock data - PVs, PVCs, StorageClasses
    this.storages = [
      { 
        name: 'mysql-volume', 
        type: 'PersistentVolume', 
        namespace: 'database', 
        status: 'Bound', 
        capacity: '10Gi', 
        accessMode: 'ReadWriteOnce', 
        age: '10d' 
      },
      { 
        name: 'app-data-claim', 
        type: 'PersistentVolumeClaim', 
        namespace: 'default', 
        status: 'Bound', 
        capacity: '5Gi', 
        accessMode: 'ReadWriteOnce', 
        age: '3d' 
      },
      { 
        name: 'redis-data-claim', 
        type: 'PersistentVolumeClaim', 
        namespace: 'database', 
        status: 'Bound', 
        capacity: '2Gi', 
        accessMode: 'ReadWriteOnce', 
        age: '5d' 
      },
      { 
        name: 'log-storage-claim', 
        type: 'PersistentVolumeClaim', 
        namespace: 'logging', 
        status: 'Pending', 
        capacity: '20Gi', 
        accessMode: 'ReadWriteMany', 
        age: '2h' 
      },
      { 
        name: 'media-files-claim', 
        type: 'PersistentVolumeClaim', 
        namespace: 'frontend', 
        status: 'Bound', 
        capacity: '50Gi', 
        accessMode: 'ReadWriteMany', 
        age: '1w' 
      },
      { 
        name: 'fast-ssd', 
        type: 'StorageClass', 
        namespace: '-', 
        status: 'Available', 
        capacity: '-', 
        accessMode: 'ReadWriteOnce', 
        age: '30d' 
      },
      { 
        name: 'standard-hdd', 
        type: 'StorageClass', 
        namespace: '-', 
        status: 'Available', 
        capacity: '-', 
        accessMode: 'ReadWriteOnce', 
        age: '45d' 
      },
      { 
        name: 'network-storage', 
        type: 'StorageClass', 
        namespace: '-', 
        status: 'Available', 
        capacity: '-', 
        accessMode: 'ReadWriteMany', 
        age: '60d' 
      },
      { 
        name: 'backup-storage', 
        type: 'PersistentVolume', 
        namespace: 'backup', 
        status: 'Available', 
        capacity: '100Gi', 
        accessMode: 'ReadWriteMany', 
        age: '15d' 
      },
      { 
        name: 'prometheus-storage', 
        type: 'PersistentVolume', 
        namespace: 'monitoring', 
        status: 'Bound', 
        capacity: '25Gi', 
        accessMode: 'ReadWriteOnce', 
        age: '1w' 
      },
      { 
        name: 'grafana-storage', 
        type: 'PersistentVolume', 
        namespace: 'monitoring', 
        status: 'Bound', 
        capacity: '5Gi', 
        accessMode: 'ReadWriteOnce', 
        age: '1w' 
      },
      { 
        name: 'shared-cache', 
        type: 'PersistentVolume', 
        namespace: 'cache', 
        status: 'Available', 
        capacity: '15Gi', 
        accessMode: 'ReadWriteMany', 
        age: '3d' 
      }
    ];
    
    // Configuration mock data - ConfigMaps, Secrets, ServiceAccounts
    this.configurations = [
      { 
        name: 'app-config', 
        type: 'ConfigMap', 
        namespace: 'default', 
        status: 'Active', 
        keys: '3', 
        age: '2d' 
      },
      { 
        name: 'db-credentials', 
        type: 'Secret', 
        namespace: 'database', 
        status: 'Active', 
        keys: '2', 
        age: '7d' 
      },
      { 
        name: 'api-service-account', 
        type: 'ServiceAccount', 
        namespace: 'default', 
        status: 'Active', 
        keys: '-', 
        age: '5d' 
      },
      { 
        name: 'tls-certificates', 
        type: 'Secret', 
        namespace: 'production', 
        status: 'Active', 
        keys: '4', 
        age: '1d' 
      }
    ];
    
    // Helm mock data - Charts and Releases
    this.helms = [
      { 
        name: 'prometheus-stack', 
        type: 'Release',
        namespace: 'monitoring', 
        revision: '3', 
        status: 'Deployed', 
        chart: 'kube-prometheus-stack-45.7.1', 
        updated: '2024-01-15 10:30:00' 
      },
      { 
        name: 'grafana-dashboard', 
        type: 'Release',
        namespace: 'monitoring', 
        revision: '1', 
        status: 'Deployed', 
        chart: 'grafana-6.50.7', 
        updated: '2024-01-14 14:22:00' 
      },
      { 
        name: 'nginx-ingress', 
        type: 'Release',
        namespace: 'ingress-nginx', 
        revision: '2', 
        status: 'Failed', 
        chart: 'ingress-nginx-4.4.2', 
        updated: '2024-01-16 09:15:00' 
      },
      { 
        name: 'cert-manager', 
        type: 'Release',
        namespace: 'cert-manager', 
        revision: '1', 
        status: 'Pending', 
        chart: 'cert-manager-v1.13.3', 
        updated: '2024-01-16 11:45:00' 
      },
      { 
        name: 'redis-cluster', 
        type: 'Release',
        namespace: 'database', 
        revision: '4', 
        status: 'Deployed', 
        chart: 'redis-17.3.7', 
        updated: '2024-01-10 16:20:00' 
      },
      { 
        name: 'mysql-primary', 
        type: 'Release',
        namespace: 'database', 
        revision: '2', 
        status: 'Deployed', 
        chart: 'mysql-9.4.6', 
        updated: '2024-01-12 09:45:00' 
      },
      { 
        name: 'elasticsearch', 
        type: 'Release',
        namespace: 'logging', 
        revision: '1', 
        status: 'Deployed', 
        chart: 'elasticsearch-19.5.0', 
        updated: '2024-01-13 14:30:00' 
      },
      { 
        name: 'kibana', 
        type: 'Release',
        namespace: 'logging', 
        revision: '1', 
        status: 'Deployed', 
        chart: 'kibana-10.2.3', 
        updated: '2024-01-13 15:15:00' 
      },
      { 
        name: 'wordpress', 
        type: 'Release',
        namespace: 'frontend', 
        revision: '3', 
        status: 'Deployed', 
        chart: 'wordpress-15.2.5', 
        updated: '2024-01-11 11:20:00' 
      },
      { 
        name: 'jenkins', 
        type: 'Release',
        namespace: 'ci-cd', 
        revision: '1', 
        status: 'Failed', 
        chart: 'jenkins-4.2.17', 
        updated: '2024-01-16 13:45:00' 
      },
      { 
        name: 'argocd', 
        type: 'Release',
        namespace: 'argocd', 
        revision: '2', 
        status: 'Deployed', 
        chart: 'argo-cd-5.16.13', 
        updated: '2024-01-09 08:30:00' 
      },
      { 
        name: 'vault', 
        type: 'Release',
        namespace: 'vault', 
        revision: '1', 
        status: 'Pending', 
        chart: 'vault-0.22.1', 
        updated: '2024-01-16 16:00:00' 
      },
      // Chart examples
      { 
        name: 'nginx-chart', 
        type: 'Chart',
        namespace: '-', 
        revision: '-', 
        status: 'Available', 
        chart: 'nginx-1.25.3', 
        updated: '2024-01-10 08:00:00' 
      },
      { 
        name: 'mysql-chart', 
        type: 'Chart',
        namespace: '-', 
        revision: '-', 
        status: 'Available', 
        chart: 'mysql-9.4.6', 
        updated: '2024-01-12 10:00:00' 
      },
      { 
        name: 'redis-chart', 
        type: 'Chart',
        namespace: '-', 
        revision: '-', 
        status: 'Available', 
        chart: 'redis-17.3.7', 
        updated: '2024-01-08 12:00:00' 
      },
      { 
        name: 'postgresql-chart', 
        type: 'Chart',
        namespace: '-', 
        revision: '-', 
        status: 'Available', 
        chart: 'postgresql-12.1.2', 
        updated: '2024-01-14 16:00:00' 
      }
    ];
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
      // Now activeSubmenu directly matches property names (all plural)
      const currentData = this[this.activeSubmenu];
      if (currentData) {
        const index = currentData.indexOf(item);
        if (index > -1) {
          currentData.splice(index, 1);
          this.requestUpdate();
        }
      }
    }
  }

  // Workload-specific actions
  scalePods(item) {
    console.log('Scaling pods for:', item);
    const replicas = prompt(`Enter new replica count for ${item.name}:`, '3');
    if (replicas && !isNaN(replicas)) {
      alert(`Scaling ${item.name} to ${replicas} replicas`);
      // In a real app, you would make an API call here
    }
  }

  viewLogs(item) {
    console.log('Viewing logs for:', item);
    alert(`Opening logs for ${item.name}`);
    // In a real app, you would open a logs viewer or modal
  }

  // Network-specific actions
  viewEndpoints(item) {
    console.log('Viewing endpoints for:', item);
    alert(`Endpoints for ${item.name}: ${item.endpoints}`);
    // In a real app, you would show detailed endpoint information
  }

  // Storage-specific actions
  expandVolume(item) {
    console.log('Expanding volume:', item);
    const newSize = prompt(`Enter new size for ${item.name} (current: ${item.capacity}):`);
    if (newSize) {
      alert(`Expanding ${item.name} to ${newSize}`);
      // In a real app, you would make an API call to expand the volume
    }
  }

  // Configuration-specific actions
  viewKeys(item) {
    console.log('Viewing keys for:', item);
    alert(`${item.name} has ${item.keys} keys`);
    // In a real app, you would show the actual keys (for ConfigMaps) or key names (for Secrets)
  }

  // Helm-specific actions
  upgradeRelease(item) {
    console.log('Upgrading release:', item);
    const newChart = prompt(`Enter new chart version for ${item.name}:`, item.chart);
    if (newChart) {
      alert(`Upgrading ${item.name} to ${newChart}`);
      // In a real app, you would make an API call to upgrade the Helm release
    }
  }

  rollbackRelease(item) {
    console.log('Rolling back release:', item);
    const targetRevision = prompt(`Enter revision to rollback to for ${item.name}:`, (parseInt(item.revision) - 1).toString());
    if (targetRevision && !isNaN(targetRevision)) {
      alert(`Rolling back ${item.name} to revision ${targetRevision}`);
      // In a real app, you would make an API call to rollback the Helm release
    }
  }

  uninstallRelease(item) {
    console.log('Uninstalling release:', item);
    if (confirm(`Are you sure you want to uninstall ${item.name}? This action cannot be undone.`)) {
      alert(`Uninstalling ${item.name}`);
      // Now activeSubmenu directly matches property names (all plural)
      const currentData = this[this.activeSubmenu];
      if (currentData) {
        const index = currentData.indexOf(item);
        if (index > -1) {
          currentData.splice(index, 1);
          this.requestUpdate();
        }
      }
      // In a real app, you would make an API call to uninstall the Helm release
    }
  }
}

customElements.define('kubernetes-tab', KubernetesTab);
