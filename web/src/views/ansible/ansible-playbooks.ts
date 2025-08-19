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
import type { Column } from '../../components/tables/resource-table';
import type { ActionItem } from '../../components/ui/action-dropdown';
import type { PlaybookInfo, PlaybookTemplate } from '../../types/ansible';


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
  private playbooks: PlaybookInfo[] = [];

  @state()
  private templates: PlaybookTemplate[] = [];

  @state()
  private showEditorModal = false;

  @state()
  private showRunModal = false;

  @state()
  private selectedPlaybook?: string;

  @state()
  private editorMode: 'create' | 'edit' = 'create';

  // @state()
  // private error?: string;  // TODO: Implement error handling UI

  // Add dummy data fields for UI purposes
  private playbookExtended = new Map<string, {description: string, tags: string[], hosts: string, status: string}>();

  @state()
  private showCreateDropdown = false;

  @state()
  private showImportDrawer = false;

  @state()
  private importType: 'upload' | 'template' | 'git' | 'url' | 'galaxy' = 'upload';

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
    // this.error = undefined;
    
    try {
      // Load playbooks and templates in parallel
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
      
      // Handle the response safely
      if (playbooksResponse && typeof playbooksResponse === 'object') {
        this.playbooks = Array.isArray(playbooksResponse.playbooks) ? playbooksResponse.playbooks : [];
      } else {
        this.playbooks = [];
      }
      
      if (templatesResponse && typeof templatesResponse === 'object') {
        this.templates = Array.isArray(templatesResponse.templates) ? templatesResponse.templates : [];
      } else {
        this.templates = [];
      }
      
      // Set some dummy extended data for playbooks
      this.playbooks.forEach(playbook => {
        this.playbookExtended.set(playbook.name, {
          description: `Playbook for ${playbook.name}`,
          tags: ['ansible', 'automation'],
          hosts: 'all',
          status: 'Ready'
        });
      });
    } catch (error) {
      console.error('Failed to load data:', error);
      // this.error = error instanceof Error ? error.message : 'Failed to load playbooks';
      this.playbooks = [];
      this.templates = [];
    } finally {
      this.loading = false;
    }
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
      p.path.toLowerCase().includes(query)
    );
  }

  private get filteredTemplates() {
    if (!this.searchQuery) return this.templates;
    const query = this.searchQuery.toLowerCase();
    return this.templates.filter(t => 
      t.name.toLowerCase().includes(query) ||
      t.description.toLowerCase().includes(query) ||
      t.category.toLowerCase().includes(query)
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

  private getPlaybookActions(_item: PlaybookInfo): ActionItem[] {
    return [
      { label: 'Run', action: 'run' },
      { label: 'Edit', action: 'edit' },
      { label: 'Validate', action: 'validate' },
      { label: 'Download', action: 'download' },
      { label: 'Delete', action: 'delete', danger: true }
    ];
  }

  private getTemplateActions(_item: PlaybookTemplate): ActionItem[] {
    return [
      { label: 'Use Template', action: 'use' },
      { label: 'View Details', action: 'view' },
      { label: 'Clone', action: 'clone' }
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
      type: template.category,
      playbook: template.name,
      inventory: 'default',
      status: 'Active',
      lastUsed: this.formatDate(new Date().toISOString())
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

  private async handlePlaybookAction(e: CustomEvent) {
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

  private async handleTemplateAction(e: CustomEvent) {
    const { action, item } = e.detail;
    
    switch (action) {
      case 'use':
        // TODO: Open template creation dialog
        console.log('Use template:', item);
        break;
      case 'view':
        // TODO: Show template details
        console.log('View template:', item);
        break;
      case 'clone':
        // TODO: Clone template
        console.log('Clone template:', item);
        break;
    }
  }

  private async validatePlaybook(name: string) {
    try {
      const result = await AnsibleService.validatePlaybook(name);
      if (result.valid) {
        alert(`✅ Playbook ${name} is valid`);
      } else {
        alert(`❌ Validation failed:\n${result.errors?.join('\n') || result.message}`);
      }
    } catch (error) {
      console.error('Validation failed:', error);
      alert(`Failed to validate playbook: ${error}`);
    }
  }

  private async downloadPlaybook(name: string) {
    try {
      const response = await AnsibleService.getPlaybook(name);
      const blob = new Blob([response.playbook.content], { type: 'text/yaml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert(`Failed to download playbook: ${error}`);
    }
  }

  private async deletePlaybook(name: string) {
    try {
      await AnsibleService.deletePlaybook(name);
      await this.loadData(); // Reload the list
    } catch (error) {
      console.error('Delete failed:', error);
      alert(`Failed to delete playbook: ${error}`);
    }
  }

  private toggleCreateDropdown(event: Event) {
    event.stopPropagation();
    this.showCreateDropdown = !this.showCreateDropdown;
  }

  private handleCreateAction(action: string) {
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

  private handleImportComplete() {
    this.showImportDrawer = false;
    this.loadData(); // Reload the list
  }

  private handleEditorSave() {
    this.showEditorModal = false;
    this.loadData(); // Reload the list
  }

  private handleRunComplete(e: CustomEvent) {
    const { executionId } = e.detail;
    // Navigate to executions tab with the execution ID
    window.location.href = `/ansible/executions?id=${executionId}`;
  }

  override render() {
    return html`
      <div class="container">
        <h1>${this.activeTab === 'playbooks' ? 'Playbooks' : 'Templates'}</h1>
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
                <button @click=${() => this.handleCreateAction('create')}>Create New</button>
                <button @click=${() => this.handleCreateAction('upload')}>Upload File</button>
                <button @click=${() => this.handleCreateAction('template')}>From Template</button>
                <button @click=${() => this.handleCreateAction('git')}>From Git</button>
                <button @click=${() => this.handleCreateAction('url')}>From URL</button>
                <button @click=${() => this.handleCreateAction('galaxy')}>From Ansible Galaxy</button>
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

      <!-- Import Drawer -->
      <playbook-import-drawer
        .show=${this.showImportDrawer}
        .importType=${this.importType}
        @close=${() => this.showImportDrawer = false}
        @import-complete=${this.handleImportComplete}
      ></playbook-import-drawer>

      <!-- Editor Modal -->
      ${this.showEditorModal ? html`
        <playbook-editor-modal
          .open=${this.showEditorModal}
          .mode=${this.editorMode}
          .playbook=${this.selectedPlaybook}
          @close=${() => this.showEditorModal = false}
          @save=${this.handleEditorSave}
        ></playbook-editor-modal>
      ` : ''}

      <!-- Run Modal -->
      ${this.showRunModal ? html`
        <playbook-run-modal
          .open=${this.showRunModal}
          .playbook=${this.selectedPlaybook}
          @close=${() => this.showRunModal = false}
          @run-complete=${this.handleRunComplete}
        ></playbook-run-modal>
      ` : ''}
    `;
  }
}
