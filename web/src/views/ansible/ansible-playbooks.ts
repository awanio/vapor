import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '../../components/ui/search-input';
import '../../components/ui/loading-state';
import '../../components/ui/empty-state';
import '../../components/tables/resource-table';
import '../../components/ui/action-dropdown';
import type { Column } from '../../components/tables/resource-table';
import type { ActionItem } from '../../components/ui/action-dropdown';

interface Playbook {
  id: string;
  name: string;
  description: string;
  path: string;
  hosts: string;
  tags: string[];
  lastModified: string;
  status: 'active' | 'draft' | 'archived';
}

interface Template {
  id: string;
  name: string;
  description: string;
  type: 'job' | 'workflow';
  playbook: string;
  inventory: string;
  credentials: string[];
  variables: Record<string, any>;
  lastUsed: string;
  status: 'enabled' | 'disabled';
}

@customElement('ansible-playbooks')
export class AnsiblePlaybooks extends LitElement {
  @property({ type: String })
  initialTab = 'playbooks';

  @state()
  private loading = false;

  @state()
  private activeTab = 'playbooks';

  @state()
  private searchQuery = '';

  @state()
  private playbooks: Playbook[] = [];

  @state()
  private templates: Template[] = [];

  @state()
  private showCreateDropdown = false;

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
    }

    search-input {
      flex: 1;
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

    .controls {
      display: flex;
      align-items: center;
      gap: 1rem;
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
      text-decoration: none;
      display: inline-block;
    }

    .tab-button:hover {
      color: var(--text-primary);
    }

    .tab-button.active {
      color: var(--primary);
      border-bottom-color: var(--primary);
    }

    .action-menu {
      position: relative;
      display: inline-block;
    }

    .action-dropdown {
      position: absolute;
      right: 0;
      top: 100%;
      margin-top: 4px;
      background: var(--vscode-dropdown-background, var(--vscode-editor-background, #1e1e1e));
      border: 1px solid var(--vscode-dropdown-border, var(--vscode-widget-border, #454545));
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      min-width: 180px;
      z-index: 1000;
      display: none;
      /* Ensure solid background */
      backdrop-filter: none;
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
      color: var(--vscode-foreground);
      cursor: pointer;
      font-size: 13px;
      transition: background-color 0.2s;
    }

    .action-dropdown button:hover {
      background-color: var(--vscode-list-hoverBackground, rgba(255, 255, 255, 0.08));
    }

  `;

  override connectedCallback() {
    super.connectedCallback();
    this.handleLocationChange();
    this.loadData();
    // Add event listeners
    document.addEventListener('click', this.handleOutsideClick);
    window.addEventListener('popstate', this.handleLocationChange);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    // Remove event listeners
    document.removeEventListener('click', this.handleOutsideClick);
    window.removeEventListener('popstate', this.handleLocationChange);
  }

  private handleOutsideClick = (event: Event) => {
    const target = event.target as HTMLElement;
    if (!target.closest('.action-menu')) {
      this.showCreateDropdown = false;
    }
  };

  private handleLocationChange = () => {
    const path = window.location.pathname;
    if (path.includes('/ansible/templates')) {
      this.activeTab = 'templates';
    } else if (path.includes('/ansible/playbooks')) {
      this.activeTab = 'playbooks';
    } else {
      // Use initialTab if set
      this.activeTab = this.initialTab || 'playbooks';
    }
  };

  private async loadData() {
    this.loading = true;
    
    // Simulate loading with dummy data
    await new Promise(resolve => setTimeout(resolve, 500));
    
    this.playbooks = [
      {
        id: '1',
        name: 'deploy-webapp.yml',
        description: 'Deploy web application to production servers',
        path: '/ansible/playbooks/deploy-webapp.yml',
        hosts: 'webservers',
        tags: ['deployment', 'webapp', 'production'],
        lastModified: '2024-01-15T10:30:00Z',
        status: 'active'
      },
      {
        id: '2',
        name: 'update-system.yml',
        description: 'System update and security patches for all servers',
        path: '/ansible/playbooks/update-system.yml',
        hosts: 'all',
        tags: ['maintenance', 'security', 'updates'],
        lastModified: '2024-01-14T15:45:00Z',
        status: 'active'
      },
      {
        id: '3',
        name: 'backup-databases.yml',
        description: 'Automated database backup for MySQL and PostgreSQL',
        path: '/ansible/playbooks/backup-databases.yml',
        hosts: 'dbservers',
        tags: ['backup', 'database', 'scheduled'],
        lastModified: '2024-01-13T08:00:00Z',
        status: 'draft'
      }
    ];

    this.templates = [
      {
        id: '1',
        name: 'Deploy Production App',
        description: 'Template for deploying applications to production environment',
        type: 'job',
        playbook: 'deploy-webapp.yml',
        inventory: 'production',
        credentials: ['ssh-prod', 'vault-prod'],
        variables: { version: 'latest', environment: 'production' },
        lastUsed: '2024-01-15T14:30:00Z',
        status: 'enabled'
      },
      {
        id: '2',
        name: 'System Maintenance Workflow',
        description: 'Complete system maintenance workflow including updates and cleanup',
        type: 'workflow',
        playbook: 'update-system.yml',
        inventory: 'all-servers',
        credentials: ['ssh-admin'],
        variables: { reboot: true, cleanup: true },
        lastUsed: '2024-01-14T20:00:00Z',
        status: 'enabled'
      },
      {
        id: '3',
        name: 'Database Backup Job',
        description: 'Scheduled database backup job template',
        type: 'job',
        playbook: 'backup-databases.yml',
        inventory: 'database-servers',
        credentials: ['ssh-db', 'backup-storage'],
        variables: { compression: 'gzip', retention_days: 30 },
        lastUsed: '2024-01-13T03:00:00Z',
        status: 'disabled'
      }
    ];

    this.loading = false;
  }

  private handleTabClick(event: MouseEvent, tab: string) {
    event.preventDefault();
    this.activeTab = tab;
    
    // Update URL based on tab
    const path = tab === 'templates' ? '/ansible/templates' : '/ansible/playbooks';
    window.history.pushState({}, '', path);
  }

  private handleSearch(e: CustomEvent) {
    this.searchQuery = e.detail.value;
  }

  private get filteredPlaybooks() {
    if (!this.searchQuery) return this.playbooks;
    const query = this.searchQuery.toLowerCase();
    return this.playbooks.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query) ||
      p.tags.some(tag => tag.toLowerCase().includes(query))
    );
  }

  private get filteredTemplates() {
    if (!this.searchQuery) return this.templates;
    const query = this.searchQuery.toLowerCase();
    return this.templates.filter(t => 
      t.name.toLowerCase().includes(query) ||
      t.description.toLowerCase().includes(query) ||
      t.playbook.toLowerCase().includes(query)
    );
  }

  private formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    
    return date.toLocaleDateString();
  }

  private getPlaybooksColumns(): Column[] {
    return [
      { key: 'name', label: 'Name', type: 'link' },
      { key: 'path', label: 'Path' },
      { key: 'hosts', label: 'Hosts' },
      { key: 'status', label: 'Status' },
      { key: 'tags', label: 'Tags' },
      { key: 'lastModified', label: 'Last Modified' }
    ];
  }

  private getTemplatesColumns(): Column[] {
    return [
      { key: 'name', label: 'Name', type: 'link' },
      { key: 'type', label: 'Type' },
      { key: 'playbook', label: 'Playbook' },
      { key: 'inventory', label: 'Inventory' },
      { key: 'status', label: 'Status' },
      { key: 'lastUsed', label: 'Last Used' }
    ];
  }

  private getPlaybookActions(_item: Playbook): ActionItem[] {
    return [
      { label: 'Run', action: 'run' },
      { label: 'Edit', action: 'edit' },
      { label: 'Duplicate', action: 'duplicate' },
      { label: 'Delete', action: 'delete', danger: true }
    ];
  }

  private getTemplateActions(_item: Template): ActionItem[] {
    return [
      { label: 'Run Template', action: 'run' },
      { label: 'Edit', action: 'edit' },
      { label: 'Duplicate', action: 'duplicate' },
      { label: 'Delete', action: 'delete', danger: true }
    ];
  }

  private renderPlaybooks() {
    if (this.loading) {
      return html`<loading-state></loading-state>`;
    }

    const playbooks = this.filteredPlaybooks;

    if (playbooks.length === 0) {
      return html`
        <empty-state
          .message=${'No playbooks found'}
        ></empty-state>
      `;
    }

    const columns = this.getPlaybooksColumns();
    const data = playbooks.map(playbook => ({
      ...playbook,
      tags: playbook.tags.join(', '),
      lastModified: this.formatDate(playbook.lastModified)
    }));

    return html`
      <resource-table
        .columns=${columns}
        .data=${data}
        .actions=${this.getPlaybookActions}
        @action=${this.handlePlaybookAction}
      ></resource-table>
    `;
  }

  private renderTemplates() {
    if (this.loading) {
      return html`<loading-state></loading-state>`;
    }

    const templates = this.filteredTemplates;

    if (templates.length === 0) {
      return html`
        <empty-state
          .message=${'No templates found'}
        ></empty-state>
      `;
    }

    const columns = this.getTemplatesColumns();
    const data = templates.map(template => ({
      ...template,
      lastUsed: this.formatDate(template.lastUsed)
    }));

    return html`
      <resource-table
        .columns=${columns}
        .data=${data}
        .actions=${this.getTemplateActions}
        @action=${this.handleTemplateAction}
      ></resource-table>
    `;
  }

  private handlePlaybookAction(e: CustomEvent) {
    const { action, item } = e.detail;
    console.log('Playbook action:', action, item);
    // TODO: Handle playbook actions
  }

  private handleTemplateAction(e: CustomEvent) {
    const { action, item } = e.detail;
    console.log('Template action:', action, item);
    // TODO: Handle template actions
  }

  private toggleCreateDropdown(event: Event) {
    event.stopPropagation();
    this.showCreateDropdown = !this.showCreateDropdown;
  }

  private handleCreateAction(action: string) {
    this.showCreateDropdown = false;
    console.log('Create action:', action);
    // TODO: Handle different create actions
    switch (action) {
      case 'upload':
        // Handle upload
        break;
      case 'template':
        // Handle create from template
        break;
      case 'git':
        // Handle import from Git
        break;
      case 'url':
        // Handle import from URL
        break;
      case 'galaxy':
        // Handle import from Ansible Galaxy
        break;
    }
  }

  override render() {
    return html`
      <div class="container">
        <div class="tab-header">
          <a 
            href="/ansible/playbooks"
            class="tab-button ${this.activeTab === 'playbooks' ? 'active' : ''}" 
            @click="${(e: MouseEvent) => this.handleTabClick(e, 'playbooks')}"
          >
            Playbooks
          </a>
          <a 
            href="/ansible/templates"
            class="tab-button ${this.activeTab === 'templates' ? 'active' : ''}" 
            @click="${(e: MouseEvent) => this.handleTabClick(e, 'templates')}"
          >
            Templates
          </a>
        </div>

        <div class="header">
          <search-input
            .placeholder=${this.activeTab === 'playbooks' 
              ? 'Search playbooks...' 
              : 'Search templates...'}
            @search=${this.handleSearch}
          ></search-input>
          
          ${this.activeTab === 'playbooks' ? html`
            <div class="action-menu">
              <button class="btn-create" @click=${(e: Event) => this.toggleCreateDropdown(e)}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 2a1 1 0 011 1v4h4a1 1 0 110 2H9v4a1 1 0 11-2 0V9H3a1 1 0 110-2h4V3a1 1 0 011-1z"/>
                </svg>
                Add Playbook
              </button>
              <div class="action-dropdown ${this.showCreateDropdown ? 'show' : ''}">
                <button @click=${() => this.handleCreateAction('upload')}>Upload</button>
                <button @click=${() => this.handleCreateAction('template')}>Template</button>
                <button @click=${() => this.handleCreateAction('git')}>Git</button>
                <button @click=${() => this.handleCreateAction('url')}>URL</button>
                <button @click=${() => this.handleCreateAction('galaxy')}>Ansible Galaxy</button>
              </div>
            </div>
          ` : html`
            <button class="btn-create">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 2a1 1 0 011 1v4h4a1 1 0 110 2H9v4a1 1 0 11-2 0V9H3a1 1 0 110-2h4V3a1 1 0 011-1z"/>
              </svg>
              Create Job Template
            </button>
          `}
        </div>

        <div class="content">
          ${this.activeTab === 'playbooks' 
            ? this.renderPlaybooks() 
            : this.renderTemplates()}
        </div>
      </div>
    `;
  }
}
