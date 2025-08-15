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
import '../../components/tables/resource-table';
import '../../components/ui/action-dropdown';
import '../../components/modals/playbook-editor-modal';
import '../../components/modals/playbook-run-modal';
import '../../components/drawers/playbook-import-drawer';
import { AnsibleService } from '../../services/ansible';
let AnsiblePlaybooks = class AnsiblePlaybooks extends LitElement {
    constructor() {
        super(...arguments);
        this.initialTab = 'playbooks';
        this.loading = false;
        this.activeTab = 'playbooks';
        this.searchQuery = '';
        this.playbooks = [];
        this.templates = [];
        this.showEditorModal = false;
        this.showRunModal = false;
        this.editorMode = 'create';
        this.playbookExtended = new Map();
        this.showCreateDropdown = false;
        this.showImportDrawer = false;
        this.importType = 'upload';
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
        this.error = undefined;
        try {
            const [playbooksResponse, templatesResponse] = await Promise.all([
                AnsibleService.listPlaybooks().catch((error) => {
                    console.error('Failed to load playbooks:', error);
                    return { playbooks: [], count: 0 };
                }),
                AnsibleService.listTemplates().catch((error) => {
                    console.error('Failed to load templates:', error);
                    return { templates: [] };
                })
            ]);
            if (playbooksResponse && typeof playbooksResponse === 'object') {
                this.playbooks = Array.isArray(playbooksResponse.playbooks) ? playbooksResponse.playbooks : [];
            }
            else {
                this.playbooks = [];
            }
            if (templatesResponse && typeof templatesResponse === 'object') {
                this.templates = Array.isArray(templatesResponse.templates) ? templatesResponse.templates : [];
            }
            else {
                this.templates = [];
            }
            this.playbooks.forEach(playbook => {
                this.playbookExtended.set(playbook.name, {
                    description: `Playbook for ${playbook.name}`,
                    tags: ['ansible', 'automation'],
                    hosts: 'all',
                    status: 'Ready'
                });
            });
        }
        catch (error) {
            console.error('Failed to load data:', error);
            this.error = error instanceof Error ? error.message : 'Failed to load playbooks';
            this.playbooks = [];
            this.templates = [];
        }
        finally {
            this.loading = false;
        }
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
            p.path.toLowerCase().includes(query));
    }
    get filteredTemplates() {
        if (!this.searchQuery)
            return this.templates;
        const query = this.searchQuery.toLowerCase();
        return this.templates.filter(t => t.name.toLowerCase().includes(query) ||
            t.description.toLowerCase().includes(query) ||
            t.category.toLowerCase().includes(query));
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
            { label: 'Validate', action: 'validate' },
            { label: 'Download', action: 'download' },
            { label: 'Delete', action: 'delete', danger: true }
        ];
    }
    getTemplateActions(_item) {
        return [
            { label: 'Use Template', action: 'use' },
            { label: 'View Details', action: 'view' },
            { label: 'Clone', action: 'clone' }
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
        const data = playbooks.map(playbook => {
            const extended = this.playbookExtended.get(playbook.name) || {
                description: '',
                tags: [],
                hosts: 'all',
                status: 'Ready'
            };
            return {
                ...playbook,
                hosts: extended.hosts,
                status: extended.status,
                tags: extended.tags.join(', '),
                lastModified: this.formatDate(playbook.modified)
            };
        });
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
            type: template.category,
            playbook: template.name,
            inventory: 'default',
            status: 'Active',
            lastUsed: this.formatDate(new Date().toISOString())
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
    async handlePlaybookAction(e) {
        const { action, item } = e.detail;
        switch (action) {
            case 'run':
                this.selectedPlaybook = item.name;
                this.showRunModal = true;
                break;
            case 'edit':
                this.selectedPlaybook = item.name;
                this.editorMode = 'edit';
                this.showEditorModal = true;
                break;
            case 'validate':
                await this.validatePlaybook(item.name);
                break;
            case 'download':
                await this.downloadPlaybook(item.name);
                break;
            case 'delete':
                if (confirm(`Are you sure you want to delete ${item.name}?`)) {
                    await this.deletePlaybook(item.name);
                }
                break;
        }
    }
    async handleTemplateAction(e) {
        const { action, item } = e.detail;
        switch (action) {
            case 'use':
                console.log('Use template:', item);
                break;
            case 'view':
                console.log('View template:', item);
                break;
            case 'clone':
                console.log('Clone template:', item);
                break;
        }
    }
    async validatePlaybook(name) {
        try {
            const result = await AnsibleService.validatePlaybook(name);
            if (result.valid) {
                alert(`✅ Playbook ${name} is valid`);
            }
            else {
                alert(`❌ Validation failed:\n${result.errors?.join('\n') || result.message}`);
            }
        }
        catch (error) {
            console.error('Validation failed:', error);
            alert(`Failed to validate playbook: ${error}`);
        }
    }
    async downloadPlaybook(name) {
        try {
            const response = await AnsibleService.getPlaybook(name);
            const blob = new Blob([response.playbook.content], { type: 'text/yaml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = name;
            a.click();
            URL.revokeObjectURL(url);
        }
        catch (error) {
            console.error('Download failed:', error);
            alert(`Failed to download playbook: ${error}`);
        }
    }
    async deletePlaybook(name) {
        try {
            await AnsibleService.deletePlaybook(name);
            await this.loadData();
        }
        catch (error) {
            console.error('Delete failed:', error);
            alert(`Failed to delete playbook: ${error}`);
        }
    }
    toggleCreateDropdown(event) {
        event.stopPropagation();
        this.showCreateDropdown = !this.showCreateDropdown;
    }
    handleCreateAction(action) {
        this.showCreateDropdown = false;
        switch (action) {
            case 'create':
                this.selectedPlaybook = undefined;
                this.editorMode = 'create';
                this.showEditorModal = true;
                break;
            case 'upload':
                this.importType = 'upload';
                this.showImportDrawer = true;
                break;
            case 'template':
                this.importType = 'template';
                this.showImportDrawer = true;
                break;
            case 'git':
                this.importType = 'git';
                this.showImportDrawer = true;
                break;
            case 'url':
                this.importType = 'url';
                this.showImportDrawer = true;
                break;
            case 'galaxy':
                this.importType = 'galaxy';
                this.showImportDrawer = true;
                break;
        }
    }
    handleImportComplete() {
        this.showImportDrawer = false;
        this.loadData();
    }
    handleEditorSave() {
        this.showEditorModal = false;
        this.loadData();
    }
    handleRunComplete(e) {
        const { executionId } = e.detail;
        window.location.href = `/ansible/executions?id=${executionId}`;
    }
    render() {
        return html `
      <div class="container">
        <h1>${this.activeTab === 'playbooks' ? 'Playbooks' : 'Templates'}</h1>
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
                <button @click=${() => this.handleCreateAction('create')}>Create New</button>
                <button @click=${() => this.handleCreateAction('upload')}>Upload File</button>
                <button @click=${() => this.handleCreateAction('template')}>From Template</button>
                <button @click=${() => this.handleCreateAction('git')}>From Git</button>
                <button @click=${() => this.handleCreateAction('url')}>From URL</button>
                <button @click=${() => this.handleCreateAction('galaxy')}>From Ansible Galaxy</button>
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

      <!-- Import Drawer -->
      <playbook-import-drawer
        .show=${this.showImportDrawer}
        .importType=${this.importType}
        @close=${() => this.showImportDrawer = false}
        @import-complete=${this.handleImportComplete}
      ></playbook-import-drawer>

      <!-- Editor Modal -->
      ${this.showEditorModal ? html `
        <playbook-editor-modal
          .open=${this.showEditorModal}
          .mode=${this.editorMode}
          .playbook=${this.selectedPlaybook}
          @close=${() => this.showEditorModal = false}
          @save=${this.handleEditorSave}
        ></playbook-editor-modal>
      ` : ''}

      <!-- Run Modal -->
      ${this.showRunModal ? html `
        <playbook-run-modal
          .open=${this.showRunModal}
          .playbook=${this.selectedPlaybook}
          @close=${() => this.showRunModal = false}
          @run-complete=${this.handleRunComplete}
        ></playbook-run-modal>
      ` : ''}
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

    h1 {
      margin: 0 0 24px 0;
      font-size: 24px;
      font-weight: 300;
      flex-shrink: 0;
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
], AnsiblePlaybooks.prototype, "showEditorModal", void 0);
__decorate([
    state()
], AnsiblePlaybooks.prototype, "showRunModal", void 0);
__decorate([
    state()
], AnsiblePlaybooks.prototype, "selectedPlaybook", void 0);
__decorate([
    state()
], AnsiblePlaybooks.prototype, "editorMode", void 0);
__decorate([
    state()
], AnsiblePlaybooks.prototype, "error", void 0);
__decorate([
    state()
], AnsiblePlaybooks.prototype, "showCreateDropdown", void 0);
__decorate([
    state()
], AnsiblePlaybooks.prototype, "showImportDrawer", void 0);
__decorate([
    state()
], AnsiblePlaybooks.prototype, "importType", void 0);
AnsiblePlaybooks = __decorate([
    customElement('ansible-playbooks')
], AnsiblePlaybooks);
export { AnsiblePlaybooks };
//# sourceMappingURL=ansible-playbooks.js.map