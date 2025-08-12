var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import '../../components/ui/search-input';
import '../../components/ui/loading-state';
import '../../components/ui/empty-state';
import '../../components/tables/resource-table';
import '../../components/ui/action-dropdown';
let AnsibleInventory = class AnsibleInventory extends LitElement {
    constructor() {
        super(...arguments);
        this.loading = false;
        this.searchQuery = '';
        this.inventoryItems = [];
        this.typeFilter = 'all';
        this.selectedItems = new Set();
    }
    connectedCallback() {
        super.connectedCallback();
        this.loadInventory();
    }
    async loadInventory() {
        this.loading = true;
        await new Promise(resolve => setTimeout(resolve, 500));
        this.inventoryItems = [
            {
                id: '1',
                name: 'web-server-01',
                type: 'host',
                description: 'Primary web server',
                groups: ['webservers', 'production'],
                variables: {
                    ansible_host: '192.168.1.10',
                    ansible_port: 22,
                    ansible_user: 'admin'
                },
                enabled: true,
                lastSync: '2024-01-15T10:30:00Z',
                source: 'manual'
            },
            {
                id: '2',
                name: 'web-server-02',
                type: 'host',
                description: 'Secondary web server',
                groups: ['webservers', 'production'],
                variables: {
                    ansible_host: '192.168.1.11',
                    ansible_port: 22,
                    ansible_user: 'admin'
                },
                enabled: true,
                lastSync: '2024-01-15T10:30:00Z',
                source: 'manual'
            },
            {
                id: '3',
                name: 'db-server-01',
                type: 'host',
                description: 'Primary database server',
                groups: ['databases', 'production'],
                variables: {
                    ansible_host: '192.168.1.20',
                    ansible_port: 22,
                    ansible_user: 'dbadmin',
                    db_port: 5432
                },
                enabled: true,
                lastSync: '2024-01-15T10:30:00Z',
                source: 'manual'
            },
            {
                id: '4',
                name: 'webservers',
                type: 'group',
                description: 'All web servers',
                hosts: 2,
                variables: {
                    http_port: 80,
                    https_port: 443,
                    max_connections: 1000
                },
                enabled: true,
                source: 'manual'
            },
            {
                id: '5',
                name: 'databases',
                type: 'group',
                description: 'All database servers',
                hosts: 1,
                variables: {
                    backup_schedule: '0 2 * * *',
                    replication_enabled: true
                },
                enabled: true,
                source: 'manual'
            },
            {
                id: '6',
                name: 'production',
                type: 'group',
                description: 'Production environment',
                hosts: 3,
                variables: {
                    environment: 'production',
                    monitoring_enabled: true,
                    alert_email: 'ops@example.com'
                },
                enabled: true,
                source: 'manual'
            },
            {
                id: '7',
                name: 'dev-server-01',
                type: 'host',
                description: 'Development server',
                groups: ['development'],
                variables: {
                    ansible_host: '10.0.1.50',
                    ansible_port: 22,
                    ansible_user: 'developer'
                },
                enabled: false,
                lastSync: '2024-01-14T15:45:00Z',
                source: 'dynamic'
            },
            {
                id: '8',
                name: 'monitoring-server',
                type: 'host',
                description: 'Monitoring and alerting server',
                groups: ['monitoring', 'infrastructure'],
                variables: {
                    ansible_host: '192.168.1.100',
                    prometheus_port: 9090,
                    grafana_port: 3000
                },
                enabled: true,
                lastSync: '2024-01-15T10:30:00Z',
                source: 'scm'
            }
        ];
        this.loading = false;
    }
    handleSearch(event) {
        this.searchQuery = event.detail.value;
    }
    handleTypeFilter(type) {
        this.typeFilter = type;
    }
    get filteredItems() {
        let items = [...this.inventoryItems];
        if (this.typeFilter !== 'all') {
            items = items.filter(item => item.type === this.typeFilter);
        }
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            items = items.filter(item => item.name.toLowerCase().includes(query) ||
                item.description?.toLowerCase().includes(query) ||
                (item.groups && item.groups.some(g => g.toLowerCase().includes(query))));
        }
        return items;
    }
    getColumns() {
        return [
            {
                key: 'name',
                title: 'Name',
                sortable: true,
                render: (item) => html `
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="status-indicator ${item.enabled ? 'enabled' : 'disabled'}"></span>
            <div>
              <div style="font-weight: 500;">${item.name}</div>
              ${item.description ? html `
                <div style="font-size: 11px; color: var(--vscode-descriptionForeground); margin-top: 2px;">
                  ${item.description}
                </div>
              ` : ''}
            </div>
          </div>
        `
            },
            {
                key: 'type',
                title: 'Type',
                width: '100px',
                render: (item) => html `
          <span class="type-badge ${item.type}">
            ${item.type === 'host' ? '🖥️' : '📁'} ${item.type}
          </span>
        `
            },
            {
                key: 'groups',
                title: 'Groups / Hosts',
                width: '200px',
                render: (item) => html `
          ${item.type === 'host' && item.groups ? html `
            <div class="groups-list">
              ${item.groups.map(group => html `
                <span class="group-tag">${group}</span>
              `)}
            </div>
          ` : ''}
          ${item.type === 'group' && item.hosts !== undefined ? html `
            <div style="display: flex; align-items: center; gap: 4px;">
              <span style="font-size: 13px;">🖥️</span>
              <span>${item.hosts} hosts</span>
            </div>
          ` : ''}
        `
            },
            {
                key: 'variables',
                title: 'Variables',
                width: '120px',
                render: (item) => html `
          ${item.variables ? html `
            <span class="variables-count">
              ${Object.keys(item.variables).length} vars
            </span>
          ` : html `<span style="color: var(--vscode-descriptionForeground);">—</span>`}
        `
            },
            {
                key: 'source',
                title: 'Source',
                width: '100px',
                render: (item) => html `
          ${item.source ? html `
            <span class="source-badge ${item.source}">
              ${item.source === 'manual' ? '✏️' : ''}
              ${item.source === 'dynamic' ? '🔄' : ''}
              ${item.source === 'scm' ? '🔗' : ''}
              ${item.source}
            </span>
          ` : ''}
        `
            },
            {
                key: 'lastSync',
                title: 'Last Sync',
                width: '150px',
                sortable: true,
                render: (item) => html `
          ${item.lastSync ? html `
            <span style="font-size: 12px; color: var(--vscode-descriptionForeground);">
              ${new Date(item.lastSync).toLocaleString()}
            </span>
          ` : html `<span style="color: var(--vscode-descriptionForeground);">—</span>`}
        `
            },
            {
                key: 'actions',
                title: '',
                width: '50px',
                render: (item) => {
                    const actions = [
                        { id: 'edit', label: 'Edit', icon: '✏️' },
                        { id: 'duplicate', label: 'Duplicate', icon: '📋' },
                        { id: 'variables', label: 'Manage Variables', icon: '🔧' },
                        { id: 'disable', label: item.enabled ? 'Disable' : 'Enable', icon: '🔌' },
                        { type: 'divider' },
                        { id: 'delete', label: 'Delete', icon: '🗑️', variant: 'danger' }
                    ];
                    return html `
            <action-dropdown
              .items=${actions}
              @action=${(e) => this.handleAction(e.detail.action, item)}
            ></action-dropdown>
          `;
                }
            }
        ];
    }
    handleAction(action, item) {
        console.log('Action:', action, 'Item:', item);
        switch (action) {
            case 'edit':
                break;
            case 'duplicate':
                break;
            case 'variables':
                break;
            case 'disable':
                item.enabled = !item.enabled;
                this.requestUpdate();
                break;
            case 'delete':
                if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
                    this.inventoryItems = this.inventoryItems.filter(i => i.id !== item.id);
                }
                break;
        }
    }
    handleAddHost() {
        console.log('Add new host');
    }
    handleAddGroup() {
        console.log('Add new group');
    }
    handleSync() {
        console.log('Sync inventory');
        this.loadInventory();
    }
    render() {
        return html `
      <div class="container">
        <div class="header">
          <h2 class="title">Inventory</h2>
        </div>
        
        <div class="controls">
          <div class="controls-left">
            <search-input
              placeholder="Search inventory..."
              @search=${this.handleSearch}
            ></search-input>
            
            <div class="filter-buttons">
              <button 
                class="filter-btn ${this.typeFilter === 'all' ? 'active' : ''}"
                @click=${() => this.handleTypeFilter('all')}
              >
                All
              </button>
              <button 
                class="filter-btn ${this.typeFilter === 'host' ? 'active' : ''}"
                @click=${() => this.handleTypeFilter('host')}
              >
                Hosts
              </button>
              <button 
                class="filter-btn ${this.typeFilter === 'group' ? 'active' : ''}"
                @click=${() => this.handleTypeFilter('group')}
              >
                Groups
              </button>
            </div>
          </div>
          
          <div class="controls-right">
            <button class="btn-secondary" @click=${this.handleSync}>
              🔄 Sync
            </button>
            <button class="btn-primary" @click=${this.handleAddHost}>
              ➕ Add Host
            </button>
            <button class="btn-primary" @click=${this.handleAddGroup}>
              📁 Add Group
            </button>
          </div>
        </div>
        
        <div class="content">
          ${this.loading ? html `
            <loading-state message="Loading inventory..."></loading-state>
          ` : this.filteredItems.length === 0 ? html `
            <empty-state
              icon="📋"
              title="No inventory items found"
              description="${this.searchQuery ?
            'Try adjusting your search or filters' :
            'Add hosts or groups to get started'}"
            ></empty-state>
          ` : html `
            <resource-table
              .columns=${this.getColumns()}
              .data=${this.filteredItems}
              .selectable=${true}
              @selection-change=${(e) => {
            this.selectedItems = new Set(e.detail.selection);
        }}
            ></resource-table>
          `}
        </div>
      </div>
    `;
    }
};
AnsibleInventory.styles = css `
    :host {
      display: block;
      height: 100%;
    }

    .container {
      display: flex;
      flex-direction: column;
      height: 100%;
      gap: 1rem;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--vscode-panel-border);
    }

    .title {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--vscode-foreground);
    }

    .controls {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-top: 1rem;
    }

    .controls-left {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex: 1;
    }

    .controls-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-primary {
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

    .btn-primary:hover {
      background: var(--vscode-button-hoverBackground, #005a9e);
    }

    .btn-secondary {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: 1px solid var(--vscode-button-border);
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.2s;
    }

    .btn-secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }

    search-input {
      flex: 1;
      max-width: 400px;
    }

    .content {
      flex: 1;
      overflow-y: auto;
    }

    .filter-buttons {
      display: flex;
      gap: 0.5rem;
    }

    .filter-btn {
      padding: 6px 12px;
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: 1px solid var(--vscode-button-border);
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.2s;
    }

    .filter-btn:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }

    .filter-btn.active {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border-color: var(--vscode-focusBorder);
    }

    .type-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }

    .type-badge.host {
      background: rgba(30, 136, 229, 0.2);
      color: #1e88e5;
    }

    .type-badge.group {
      background: rgba(156, 39, 176, 0.2);
      color: #9c27b0;
    }

    .variables-count {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 6px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      border-radius: 10px;
      font-size: 11px;
    }

    .groups-list {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .group-tag {
      display: inline-flex;
      padding: 2px 6px;
      background: var(--vscode-textBlockQuote-background);
      border: 1px solid var(--vscode-textBlockQuote-border);
      border-radius: 3px;
      font-size: 11px;
      color: var(--vscode-textBlockQuote-foreground);
    }

    .source-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: 500;
    }

    .source-badge.manual {
      background: rgba(117, 117, 117, 0.2);
      color: #757575;
    }

    .source-badge.dynamic {
      background: rgba(255, 167, 38, 0.2);
      color: #ffa726;
    }

    .source-badge.scm {
      background: rgba(102, 187, 106, 0.2);
      color: #66bb6a;
    }

    .status-indicator {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-right: 4px;
    }

    .status-indicator.enabled {
      background: #4caf50;
    }

    .status-indicator.disabled {
      background: #9e9e9e;
    }
  `;
__decorate([
    state()
], AnsibleInventory.prototype, "loading", void 0);
__decorate([
    state()
], AnsibleInventory.prototype, "searchQuery", void 0);
__decorate([
    state()
], AnsibleInventory.prototype, "inventoryItems", void 0);
__decorate([
    state()
], AnsibleInventory.prototype, "typeFilter", void 0);
__decorate([
    state()
], AnsibleInventory.prototype, "selectedItems", void 0);
AnsibleInventory = __decorate([
    customElement('ansible-inventory')
], AnsibleInventory);
export { AnsibleInventory };
//# sourceMappingURL=ansible-inventory.js.map