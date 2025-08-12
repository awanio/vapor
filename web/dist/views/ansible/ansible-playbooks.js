var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '../../components/ui/search-input';
import '../../components/ui/loading-state';
import '../../components/ui/empty-state';
import '../../components/tabs/tab-group';
import '../../components/tables/resource-table';
import '../../components/ui/action-dropdown';
let AnsiblePlaybooks = class AnsiblePlaybooks extends LitElement {
    constructor() {
        super(...arguments);
        this.initialTab = 'playbooks';
        this.loading = false;
        this.activeTab = 'playbooks';
        this.searchQuery = '';
        this.playbooks = [];
        this.templates = [];
        this.showCreateDropdown = false;
        this.handleOutsideClick = (event) => {
            const target = event.target;
            if (!target.closest('.action-menu')) {
                this.showCreateDropdown = false;
            }
        };
        this.handleLocationChange = () => {
            const path = window.location.pathname;
            if (path.includes('/ansible/templates')) {
                this.activeTab = 'templates';
            }
            else if (path.includes('/ansible/playbooks')) {
                this.activeTab = 'playbooks';
            }
            else {
                this.activeTab = this.initialTab || 'playbooks';
            }
        };
    }
    connectedCallback() {
        super.connectedCallback();
        this.handleLocationChange();
        this.loadData();
        document.addEventListener('click', this.handleOutsideClick);
        window.addEventListener('popstate', this.handleLocationChange);
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        document.removeEventListener('click', this.handleOutsideClick);
        window.removeEventListener('popstate', this.handleLocationChange);
    }
    async loadData() {
        this.loading = true;
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
    handleTabClick(event, tab) {
        event.preventDefault();
        this.activeTab = tab;
        const path = tab === 'templates' ? '/ansible/templates' : '/ansible/playbooks';
        window.history.pushState({}, '', path);
    }
    handleSearch(e) {
        this.searchQuery = e.detail.value;
    }
    get filteredPlaybooks() {
        if (!this.searchQuery)
            return this.playbooks;
        const query = this.searchQuery.toLowerCase();
        return this.playbooks.filter(p => p.name.toLowerCase().includes(query) ||
            p.description.toLowerCase().includes(query) ||
            p.tags.some(tag => tag.toLowerCase().includes(query)));
    }
    get filteredTemplates() {
        if (!this.searchQuery)
            return this.templates;
        const query = this.searchQuery.toLowerCase();
        return this.templates.filter(t => t.name.toLowerCase().includes(query) ||
            t.description.toLowerCase().includes(query) ||
            t.playbook.toLowerCase().includes(query));
    }
    formatDate(dateStr) {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        if (days === 0)
            return 'Today';
        if (days === 1)
            return 'Yesterday';
        if (days < 7)
            return `${days} days ago`;
        return date.toLocaleDateString();
    }
    getPlaybooksColumns() {
        return [
            { key: 'name', label: 'Name', type: 'link' },
            { key: 'path', label: 'Path' },
            { key: 'hosts', label: 'Hosts' },
            { key: 'status', label: 'Status' },
            { key: 'tags', label: 'Tags' },
            { key: 'lastModified', label: 'Last Modified' }
        ];
    }
    getTemplatesColumns() {
        return [
            { key: 'name', label: 'Name', type: 'link' },
            { key: 'type', label: 'Type' },
            { key: 'playbook', label: 'Playbook' },
            { key: 'inventory', label: 'Inventory' },
            { key: 'status', label: 'Status' },
            { key: 'lastUsed', label: 'Last Used' }
        ];
    }
    getPlaybookActions(_item) {
        return [
            { label: 'Run', action: 'run' },
            { label: 'Edit', action: 'edit' },
            { label: 'Duplicate', action: 'duplicate' },
            { label: 'Delete', action: 'delete', danger: true }
        ];
    }
    getTemplateActions(_item) {
        return [
            { label: 'Run Template', action: 'run' },
            { label: 'Edit', action: 'edit' },
            { label: 'Duplicate', action: 'duplicate' },
            { label: 'Delete', action: 'delete', danger: true }
        ];
    }
    renderPlaybooks() {
        if (this.loading) {
            return html `<loading-state></loading-state>`;
        }
        const playbooks = this.filteredPlaybooks;
        if (playbooks.length === 0) {
            return html `
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
        return html `
      <resource-table
        .columns=${columns}
        .data=${data}
        .actions=${this.getPlaybookActions}
        @action=${this.handlePlaybookAction}
      ></resource-table>
    `;
    }
    renderTemplates() {
        if (this.loading) {
            return html `<loading-state></loading-state>`;
        }
        const templates = this.filteredTemplates;
        if (templates.length === 0) {
            return html `
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
        return html `
      <resource-table
        .columns=${columns}
        .data=${data}
        .actions=${this.getTemplateActions}
        @action=${this.handleTemplateAction}
      ></resource-table>
    `;
    }
    handlePlaybookAction(e) {
        const { action, item } = e.detail;
        console.log('Playbook action:', action, item);
    }
    handleTemplateAction(e) {
        const { action, item } = e.detail;
        console.log('Template action:', action, item);
    }
    toggleCreateDropdown(event) {
        event.stopPropagation();
        this.showCreateDropdown = !this.showCreateDropdown;
    }
    handleCreateAction(action) {
        this.showCreateDropdown = false;
        console.log('Create action:', action);
        switch (action) {
            case 'upload':
                break;
            case 'template':
                break;
            case 'git':
                break;
            case 'url':
                break;
            case 'galaxy':
                break;
        }
    }
    render() {
        return html `
      <div class="container">
        <div class="tab-header">
          <a 
            href="/ansible/playbooks"
            class="tab-button ${this.activeTab === 'playbooks' ? 'active' : ''}" 
            @click="${(e) => this.handleTabClick(e, 'playbooks')}"
          >
            Playbooks
          </a>
          <a 
            href="/ansible/templates"
            class="tab-button ${this.activeTab === 'templates' ? 'active' : ''}" 
            @click="${(e) => this.handleTabClick(e, 'templates')}"
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
          
          ${this.activeTab === 'playbooks' ? html `
            <div class="action-menu">
              <button class="btn-create" @click=${(e) => this.toggleCreateDropdown(e)}>
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
          ` : html `
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
};
AnsiblePlaybooks.styles = css `
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
__decorate([
    property({ type: String })
], AnsiblePlaybooks.prototype, "initialTab", void 0);
__decorate([
    state()
], AnsiblePlaybooks.prototype, "loading", void 0);
__decorate([
    state()
], AnsiblePlaybooks.prototype, "activeTab", void 0);
__decorate([
    state()
], AnsiblePlaybooks.prototype, "searchQuery", void 0);
__decorate([
    state()
], AnsiblePlaybooks.prototype, "playbooks", void 0);
__decorate([
    state()
], AnsiblePlaybooks.prototype, "templates", void 0);
__decorate([
    state()
], AnsiblePlaybooks.prototype, "showCreateDropdown", void 0);
AnsiblePlaybooks = __decorate([
    customElement('ansible-playbooks')
], AnsiblePlaybooks);
export { AnsiblePlaybooks };
//# sourceMappingURL=ansible-playbooks.js.map