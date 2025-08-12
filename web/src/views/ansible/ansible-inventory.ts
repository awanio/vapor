import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import '../../components/ui/search-input';
import '../../components/ui/loading-state';
import '../../components/ui/empty-state';
import '../../components/tables/resource-table';
import '../../components/ui/action-dropdown';
import type { Column } from '../../components/tables/resource-table';
import type { ActionItem } from '../../components/ui/action-dropdown';

interface InventoryItem {
  id: string;
  name: string;
  type: 'host' | 'group';
  description?: string;
  hosts?: number; // For groups
  groups?: string[]; // Groups this host/group belongs to
  variables?: Record<string, any>;
  enabled: boolean;
  lastSync?: string;
  source?: string; // dynamic, manual, scm
}

@customElement('ansible-inventory')
export class AnsibleInventory extends LitElement {
  @state()
  private loading = false;

  @state()
  private searchQuery = '';

  @state()
  private inventoryItems: InventoryItem[] = [];

  @state()
  private typeFilter: 'all' | 'host' | 'group' = 'all';

  static override styles = css`
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

  override connectedCallback() {
    super.connectedCallback();
    this.loadInventory();
  }

  private async loadInventory() {
    this.loading = true;
    
    // Simulate loading with dummy data
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

  private handleSearch(event: CustomEvent) {
    this.searchQuery = event.detail.value;
  }

  private handleTypeFilter(type: 'all' | 'host' | 'group') {
    this.typeFilter = type;
  }

  private get filteredItems(): InventoryItem[] {
    let items = [...this.inventoryItems];
    
    // Apply type filter
    if (this.typeFilter !== 'all') {
      items = items.filter(item => item.type === this.typeFilter);
    }
    
    // Apply search filter
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      items = items.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        (item.groups && item.groups.some(g => g.toLowerCase().includes(query)))
      );
    }
    
    return items;
  }

  private getColumns(): Column[] {
    return [
      { key: 'nameDisplay', label: 'Name', type: 'link' },
      { key: 'typeDisplay', label: 'Type', width: '100px' },
      { key: 'groupsDisplay', label: 'Groups / Hosts', width: '200px' },
      { key: 'variablesDisplay', label: 'Variables', width: '120px' },
      { key: 'sourceDisplay', label: 'Source', width: '100px' },
      { key: 'lastSyncDisplay', label: 'Last Sync', width: '150px' }
    ];
  }

  private getInventoryActions(item: InventoryItem): ActionItem[] {
    return [
      { action: 'edit', label: 'Edit', icon: '✏️' },
      { action: 'duplicate', label: 'Duplicate', icon: '📋' },
      { action: 'variables', label: 'Manage Variables', icon: '🔧' },
      { action: 'disable', label: item.enabled ? 'Disable' : 'Enable', icon: '🔌' },
      { action: 'delete', label: 'Delete', icon: '🗑️', danger: true }
    ];
  }

  private prepareTableData() {
    return this.filteredItems.map(item => ({
      _original: item, // Store original item for actions
      nameDisplay: `${item.enabled ? '🟢' : '🔴'} ${item.name}`,
      typeDisplay: `${item.type === 'host' ? '🖥️' : '📁'} ${item.type}`,
      groupsDisplay: item.type === 'host' && item.groups 
        ? item.groups.join(', ') 
        : item.type === 'group' && item.hosts !== undefined 
        ? `${item.hosts} hosts`
        : '-',
      variablesDisplay: item.variables 
        ? `${Object.keys(item.variables).length} vars`
        : '-',
      sourceDisplay: item.source 
        ? `${item.source === 'manual' ? '✏️' : item.source === 'dynamic' ? '🔄' : '🔗'} ${item.source}`
        : '-',
      lastSyncDisplay: item.lastSync 
        ? new Date(item.lastSync).toLocaleString()
        : '-'
    }));
  }

  private handleCellClick(e: CustomEvent) {
    const { item, column } = e.detail;
    if (column.key === 'nameDisplay' && item._original) {
      console.log('View details for:', item._original);
      // TODO: Open detail view
    }
  }

  private handleAction(action: string, item: InventoryItem) {
    console.log('Action:', action, 'Item:', item);
    // Handle actions here
    switch (action) {
      case 'edit':
        // Open edit dialog
        break;
      case 'duplicate':
        // Duplicate item
        break;
      case 'variables':
        // Open variables manager
        break;
      case 'disable':
        // Toggle enabled state
        item.enabled = !item.enabled;
        this.requestUpdate();
        break;
      case 'delete':
        // Confirm and delete
        if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
          this.inventoryItems = this.inventoryItems.filter(i => i.id !== item.id);
        }
        break;
    }
  }

  private handleAddHost() {
    console.log('Add new host');
    // Open add host dialog
  }

  private handleAddGroup() {
    console.log('Add new group');
    // Open add group dialog
  }

  private handleSync() {
    console.log('Sync inventory');
    // Sync inventory from sources
    this.loadInventory();
  }

  override render() {
    return html`
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
          ${this.loading ? html`
            <loading-state message="Loading inventory..."></loading-state>
          ` : this.filteredItems.length === 0 ? html`
            <empty-state
              icon="📋"
              title="No inventory items found"
              description="${this.searchQuery ? 
                'Try adjusting your search or filters' : 
                'Add hosts or groups to get started'}"
            ></empty-state>
          ` : html`
            <resource-table
              .columns=${this.getColumns()}
              .data=${this.prepareTableData()}
              .getActions=${(item: any) => this.getInventoryActions(item._original)}
              @action=${(e: CustomEvent) => this.handleAction(e.detail.action, e.detail.item._original)}
              @cell-click=${(e: CustomEvent) => this.handleCellClick(e)}
            ></resource-table>
          `}
        </div>
      </div>
    `;
  }
}
