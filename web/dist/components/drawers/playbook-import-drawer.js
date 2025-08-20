var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { AnsibleService } from '../../services/ansible';
let PlaybookImportDrawer = class PlaybookImportDrawer extends LitElement {
    constructor() {
        super(...arguments);
        this.show = false;
        this.importType = 'upload';
        this.loading = false;
        this.error = '';
        this.templates = [];
        this.uploadName = '';
        this.uploadOverwrite = false;
        this.templateName = '';
        this.templateVariables = {};
        this.gitUrl = '';
        this.gitBranch = 'main';
        this.gitPath = '';
        this.gitAuthToken = '';
        this.gitSshKey = '';
        this.gitSyncAsSymlink = false;
        this.urlSource = '';
        this.urlName = '';
        this.galaxyType = 'collection';
        this.galaxyName = '';
        this.galaxyVersion = '';
        this.galaxyRequirementsFile = '';
        this.galaxyForce = false;
    }
    connectedCallback() {
        super.connectedCallback();
        if (this.importType === 'template') {
            this.loadTemplates();
        }
    }
    async loadTemplates() {
        try {
            const response = await AnsibleService.listTemplates();
            this.templates = response.templates || [];
        }
        catch (error) {
            console.error('Failed to load templates:', error);
            this.error = 'Failed to load templates';
        }
    }
    handleClose() {
        this.show = false;
        this.error = '';
        this.resetForm();
        this.dispatchEvent(new CustomEvent('close', {
            bubbles: true,
            composed: true
        }));
    }
    resetForm() {
        this.uploadFile = undefined;
        this.uploadName = '';
        this.uploadOverwrite = false;
        this.templateName = '';
        this.templateVariables = {};
        this.selectedTemplate = undefined;
        this.gitUrl = '';
        this.gitBranch = 'main';
        this.gitPath = '';
        this.gitAuthToken = '';
        this.gitSshKey = '';
        this.gitSyncAsSymlink = false;
        this.urlSource = '';
        this.urlName = '';
        this.galaxyType = 'collection';
        this.galaxyName = '';
        this.galaxyVersion = '';
        this.galaxyRequirementsFile = '';
        this.galaxyForce = false;
    }
    async handleSubmit() {
        this.loading = true;
        this.error = '';
        try {
            switch (this.importType) {
                case 'upload':
                    await this.handleUpload();
                    break;
                case 'template':
                    await this.handleTemplate();
                    break;
                case 'git':
                    await this.handleGit();
                    break;
                case 'url':
                    await this.handleUrl();
                    break;
                case 'galaxy':
                    await this.handleGalaxy();
                    break;
            }
            this.dispatchEvent(new CustomEvent('import-complete', {
                bubbles: true,
                composed: true,
                detail: { type: this.importType }
            }));
            this.handleClose();
        }
        catch (error) {
            console.error('Import failed:', error);
            this.error = error instanceof Error ? error.message : 'Import failed';
        }
        finally {
            this.loading = false;
        }
    }
    async handleUpload() {
        if (!this.uploadFile) {
            throw new Error('Please select a file to upload');
        }
        const content = await this.uploadFile.text();
        const request = {
            name: this.uploadName || this.uploadFile.name,
            content: btoa(content),
            overwrite: this.uploadOverwrite
        };
        await AnsibleService.uploadPlaybook(request);
    }
    async handleTemplate() {
        if (!this.selectedTemplate) {
            throw new Error('Please select a template');
        }
        if (!this.templateName) {
            throw new Error('Please provide a name for the playbook');
        }
        const request = {
            template_id: this.selectedTemplate.id,
            name: this.templateName,
            variables: this.templateVariables
        };
        await AnsibleService.createFromTemplate(request);
    }
    async handleGit() {
        if (!this.gitUrl) {
            throw new Error('Git repository URL is required');
        }
        const request = {
            url: this.gitUrl,
            branch: this.gitBranch || undefined,
            path: this.gitPath || undefined,
            auth_token: this.gitAuthToken || undefined,
            ssh_key: this.gitSshKey || undefined,
            sync_as_symlink: this.gitSyncAsSymlink
        };
        await AnsibleService.syncFromGit(request);
    }
    async handleUrl() {
        if (!this.urlSource) {
            throw new Error('URL is required');
        }
        if (!this.urlName) {
            throw new Error('Playbook name is required');
        }
        await AnsibleService.downloadFromUrl(this.urlSource, this.urlName);
    }
    async handleGalaxy() {
        if (!this.galaxyName && !this.galaxyRequirementsFile) {
            throw new Error('Either name or requirements file is required');
        }
        const request = {
            type: this.galaxyType,
            name: this.galaxyName || '',
            version: this.galaxyVersion || undefined,
            requirements_file: this.galaxyRequirementsFile || undefined,
            force: this.galaxyForce
        };
        await AnsibleService.installFromGalaxy(request);
    }
    handleFileSelect(e) {
        const input = e.target;
        this.uploadFile = input.files?.[0];
    }
    renderUploadForm() {
        return html `
      <div class="info-message">
        Upload a YAML playbook file from your local machine.
      </div>

      <div class="form-group">
        <label class="form-label required">Select File</label>
        <div class="file-input-wrapper">
          <input
            type="file"
            class="file-input"
            id="file-input"
            accept=".yml,.yaml"
            @change=${this.handleFileSelect}
          />
          <label for="file-input" class="file-input-button">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M14 10v3.5a.5.5 0 01-.5.5h-11a.5.5 0 01-.5-.5V10a.5.5 0 00-1 0v3.5A1.5 1.5 0 002.5 15h11a1.5 1.5 0 001.5-1.5V10a.5.5 0 00-1 0z"/>
              <path d="M7.646 1.146a.5.5 0 01.708 0l3 3a.5.5 0 01-.708.708L8.5 2.707V11a.5.5 0 01-1 0V2.707L5.354 4.854a.5.5 0 11-.708-.708l3-3z"/>
            </svg>
            Choose File
          </label>
        </div>
        ${this.uploadFile ? html `
          <div class="file-name">Selected: ${this.uploadFile.name}</div>
        ` : ''}
      </div>

      <div class="form-group">
        <label class="form-label">Playbook Name</label>
        <input
          type="text"
          class="form-input"
          .value=${this.uploadName}
          @input=${(e) => this.uploadName = e.target.value}
          placeholder="Leave empty to use original filename"
        />
      </div>

      <div class="form-group">
        <label class="form-checkbox-group">
          <input
            type="checkbox"
            class="form-checkbox"
            .checked=${this.uploadOverwrite}
            @change=${(e) => this.uploadOverwrite = e.target.checked}
          />
          <span>Overwrite if exists</span>
        </label>
      </div>
    `;
    }
    renderTemplateForm() {
        return html `
      <div class="info-message">
        Create a new playbook from a pre-defined template.
      </div>

      <div class="form-group">
        <label class="form-label required">Select Template</label>
        <div class="template-grid">
          ${this.templates.map(template => html `
            <div
              class="template-card ${this.selectedTemplate?.id === template.id ? 'selected' : ''}"
              @click=${() => {
            this.selectedTemplate = template;
            this.templateVariables = {};
        }}
            >
              <div class="template-name">${template.name}</div>
              <div class="template-description">${template.description}</div>
            </div>
          `)}
        </div>
      </div>

      ${this.selectedTemplate ? html `
        <div class="form-group">
          <label class="form-label required">Playbook Name</label>
          <input
            type="text"
            class="form-input"
            .value=${this.templateName}
            @input=${(e) => this.templateName = e.target.value}
            placeholder="my-playbook.yml"
          />
        </div>

        ${this.selectedTemplate.variables && this.selectedTemplate.variables.length > 0 ? html `
          <div class="template-variables">
            <h4>Template Variables</h4>
            ${this.selectedTemplate.variables.map(variable => html `
              <div class="form-group">
                <label class="form-label ${variable.required ? 'required' : ''}">
                  ${variable.description || variable.name}
                </label>
                <input
                  type="text"
                  class="form-input"
                  .value=${this.templateVariables[variable.name] || variable.default || ''}
                  @input=${(e) => {
            this.templateVariables = {
                ...this.templateVariables,
                [variable.name]: e.target.value
            };
        }}
                  placeholder=${variable.default || ''}
                />
              </div>
            `)}
          </div>
        ` : ''}
      ` : ''}
    `;
    }
    renderGitForm() {
        return html `
      <div class="info-message">
        Import playbooks from a Git repository.
      </div>

      <div class="form-group">
        <label class="form-label required">Repository URL</label>
        <input
          type="text"
          class="form-input"
          .value=${this.gitUrl}
          @input=${(e) => this.gitUrl = e.target.value}
          placeholder="https://github.com/user/repo.git"
        />
      </div>

      <div class="form-group">
        <label class="form-label">Branch</label>
        <input
          type="text"
          class="form-input"
          .value=${this.gitBranch}
          @input=${(e) => this.gitBranch = e.target.value}
          placeholder="main"
        />
      </div>

      <div class="form-group">
        <label class="form-label">Path</label>
        <input
          type="text"
          class="form-input"
          .value=${this.gitPath}
          @input=${(e) => this.gitPath = e.target.value}
          placeholder="playbooks/ (optional)"
        />
      </div>

      <div class="form-group">
        <label class="form-label">Authentication Token</label>
        <input
          type="password"
          class="form-input"
          .value=${this.gitAuthToken}
          @input=${(e) => this.gitAuthToken = e.target.value}
          placeholder="For private repositories"
        />
      </div>

      <div class="form-group">
        <label class="form-label">SSH Private Key</label>
        <textarea
          class="form-textarea"
          .value=${this.gitSshKey}
          @input=${(e) => this.gitSshKey = e.target.value}
          placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
        ></textarea>
      </div>

      <div class="form-group">
        <label class="form-checkbox-group">
          <input
            type="checkbox"
            class="form-checkbox"
            .checked=${this.gitSyncAsSymlink}
            @change=${(e) => this.gitSyncAsSymlink = e.target.checked}
          />
          <span>Sync as symlink</span>
        </label>
      </div>
    `;
    }
    renderUrlForm() {
        return html `
      <div class="info-message">
        Download a playbook from a URL.
      </div>

      <div class="form-group">
        <label class="form-label required">URL</label>
        <input
          type="text"
          class="form-input"
          .value=${this.urlSource}
          @input=${(e) => this.urlSource = e.target.value}
          placeholder="https://example.com/playbook.yml"
        />
      </div>

      <div class="form-group">
        <label class="form-label required">Playbook Name</label>
        <input
          type="text"
          class="form-input"
          .value=${this.urlName}
          @input=${(e) => this.urlName = e.target.value}
          placeholder="my-playbook.yml"
        />
      </div>
    `;
    }
    renderGalaxyForm() {
        return html `
      <div class="info-message">
        Install roles or collections from Ansible Galaxy.
      </div>

      <div class="form-group">
        <label class="form-label">Type</label>
        <select
          class="form-select"
          .value=${this.galaxyType}
          @change=${(e) => this.galaxyType = e.target.value}
        >
          <option value="collection">Collection</option>
          <option value="role">Role</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Name</label>
        <input
          type="text"
          class="form-input"
          .value=${this.galaxyName}
          @input=${(e) => this.galaxyName = e.target.value}
          placeholder="community.general"
        />
      </div>

      <div class="form-group">
        <label class="form-label">Version</label>
        <input
          type="text"
          class="form-input"
          .value=${this.galaxyVersion}
          @input=${(e) => this.galaxyVersion = e.target.value}
          placeholder="5.0.0 (optional)"
        />
      </div>

      <div class="form-group">
        <label class="form-label">Requirements File</label>
        <input
          type="text"
          class="form-input"
          .value=${this.galaxyRequirementsFile}
          @input=${(e) => this.galaxyRequirementsFile = e.target.value}
          placeholder="requirements.yml (optional)"
        />
      </div>

      <div class="form-group">
        <label class="form-checkbox-group">
          <input
            type="checkbox"
            class="form-checkbox"
            .checked=${this.galaxyForce}
            @change=${(e) => this.galaxyForce = e.target.checked}
          />
          <span>Force reinstall</span>
        </label>
      </div>
    `;
    }
    getTitle() {
        switch (this.importType) {
            case 'upload': return 'Upload Playbook';
            case 'template': return 'Create from Template';
            case 'git': return 'Import from Git';
            case 'url': return 'Import from URL';
            case 'galaxy': return 'Install from Ansible Galaxy';
            default: return 'Import Playbook';
        }
    }
    render() {
        return html `
      <div class="drawer">
        <div class="drawer-header">
          <h2 class="header-title">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 2a1 1 0 011 1v6h6a1 1 0 110 2h-6v6a1 1 0 11-2 0v-6H3a1 1 0 110-2h6V3a1 1 0 011-1z"/>
            </svg>
            ${this.getTitle()}
          </h2>
          <button class="close-button" @click=${this.handleClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
        </div>

        <div class="drawer-content">
          ${this.error ? html `
            <div class="error-message">
              <strong>Error:</strong> ${this.error}
            </div>
          ` : ''}

          ${this.importType === 'upload' ? this.renderUploadForm() : ''}
          ${this.importType === 'template' ? this.renderTemplateForm() : ''}
          ${this.importType === 'git' ? this.renderGitForm() : ''}
          ${this.importType === 'url' ? this.renderUrlForm() : ''}
          ${this.importType === 'galaxy' ? this.renderGalaxyForm() : ''}
        </div>

        <div class="drawer-footer">
          <button class="btn btn-secondary" @click=${this.handleClose}>
            Cancel
          </button>
          <button 
            class="btn btn-primary" 
            @click=${this.handleSubmit}
            ?disabled=${this.loading}
          >
            ${this.loading ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>
    `;
    }
};
PlaybookImportDrawer.styles = css `
    :host {
      display: block;
      position: fixed;
      top: 0;
      right: 0;
      width: 600px;
      height: 100vh;
      z-index: 1000;
      pointer-events: none;
    }

    :host([show]) {
      pointer-events: auto;
    }

    .drawer {
      width: 100%;
      height: 100%;
      background: var(--vscode-editor-background, #1e1e1e);
      box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;
      transform: translateX(100%);
      transition: transform 0.3s ease;
      border-left: 1px solid var(--vscode-widget-border, #454545);
    }

    :host([show]) .drawer {
      transform: translateX(0);
    }

    .drawer-header {
      padding: 20px;
      background: var(--vscode-sideBarSectionHeader-background, #252526);
      border-bottom: 1px solid var(--vscode-widget-border, #454545);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }

    .header-title {
      font-size: 18px;
      font-weight: 500;
      color: var(--vscode-foreground, #cccccc);
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .close-button {
      background: none;
      border: none;
      color: var(--vscode-foreground, #cccccc);
      cursor: pointer;
      padding: 8px;
      border-radius: 4px;
      transition: all 0.2s;
    }

    .close-button:hover {
      background: var(--vscode-toolbar-hoverBackground, rgba(90, 93, 94, 0.31));
    }

    .drawer-content {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-label {
      display: block;
      margin-bottom: 8px;
      color: var(--vscode-foreground, #cccccc);
      font-size: 13px;
      font-weight: 500;
    }

    .form-label.required::after {
      content: ' *';
      color: var(--vscode-errorForeground, #f48771);
    }

    .form-input,
    .form-select,
    .form-textarea {
      width: 100%;
      padding: 8px 12px;
      background: var(--vscode-input-background, #3c3c3c);
      color: var(--vscode-input-foreground, #cccccc);
      border: 1px solid var(--vscode-input-border, #3c3c3c);
      border-radius: 4px;
      font-size: 13px;
      font-family: inherit;
    }

    .form-input:focus,
    .form-select:focus,
    .form-textarea:focus {
      outline: none;
      border-color: var(--vscode-focusBorder, #007acc);
    }

    .form-textarea {
      resize: vertical;
      min-height: 100px;
    }

    .form-checkbox-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .form-checkbox {
      width: auto;
    }

    .file-input-wrapper {
      position: relative;
      display: inline-block;
      width: 100%;
    }

    .file-input {
      display: none;
    }

    .file-input-button {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 8px 12px;
      background: var(--vscode-button-secondaryBackground, #3a3a3a);
      color: var(--vscode-button-secondaryForeground, #cccccc);
      border: 1px solid var(--vscode-button-border, transparent);
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.2s;
    }

    .file-input-button:hover {
      background: var(--vscode-button-secondaryHoverBackground, #45494e);
    }

    .file-name {
      margin-top: 8px;
      color: var(--vscode-descriptionForeground, #969696);
      font-size: 12px;
    }

    .template-grid {
      display: grid;
      gap: 12px;
    }

    .template-card {
      padding: 12px;
      background: var(--vscode-editor-background, #1e1e1e);
      border: 1px solid var(--vscode-widget-border, #454545);
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .template-card:hover {
      border-color: var(--vscode-focusBorder, #007acc);
      background: var(--vscode-list-hoverBackground, rgba(255, 255, 255, 0.08));
    }

    .template-card.selected {
      border-color: var(--vscode-focusBorder, #007acc);
      background: var(--vscode-list-activeSelectionBackground, #094771);
    }

    .template-name {
      font-weight: 500;
      margin-bottom: 4px;
    }

    .template-description {
      font-size: 12px;
      color: var(--vscode-descriptionForeground, #969696);
    }

    .template-variables {
      margin-top: 20px;
      padding: 16px;
      background: var(--vscode-editor-background, #1e1e1e);
      border: 1px solid var(--vscode-widget-border, #454545);
      border-radius: 4px;
    }

    .error-message {
      padding: 12px;
      background: var(--vscode-inputValidation-errorBackground, rgba(244, 67, 54, 0.1));
      border: 1px solid var(--vscode-inputValidation-errorBorder, #f44336);
      border-radius: 4px;
      color: var(--vscode-errorForeground, #f48771);
      margin-bottom: 20px;
    }

    .drawer-footer {
      padding: 20px;
      background: var(--vscode-sideBarSectionHeader-background, #252526);
      border-top: 1px solid var(--vscode-widget-border, #454545);
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      flex-shrink: 0;
    }

    .btn {
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s;
      border: 1px solid transparent;
    }

    .btn-secondary {
      background: var(--vscode-button-secondaryBackground, #3a3a3a);
      color: var(--vscode-button-secondaryForeground, #cccccc);
      border-color: var(--vscode-button-border, transparent);
    }

    .btn-secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground, #45494e);
    }

    .btn-primary {
      background: var(--vscode-button-background, #007acc);
      color: var(--vscode-button-foreground, white);
      border-color: var(--vscode-button-border, transparent);
    }

    .btn-primary:hover {
      background: var(--vscode-button-hoverBackground, #005a9e);
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .info-message {
      padding: 8px 12px;
      background: var(--vscode-editorInfo-background, rgba(33, 150, 243, 0.1));
      border-left: 3px solid var(--vscode-editorInfo-foreground, #2196f3);
      border-radius: 4px;
      color: var(--vscode-foreground, #cccccc);
      font-size: 12px;
      margin-bottom: 16px;
    }
  `;
__decorate([
    property({ type: Boolean, reflect: true })
], PlaybookImportDrawer.prototype, "show", void 0);
__decorate([
    property({ type: String })
], PlaybookImportDrawer.prototype, "importType", void 0);
__decorate([
    state()
], PlaybookImportDrawer.prototype, "loading", void 0);
__decorate([
    state()
], PlaybookImportDrawer.prototype, "error", void 0);
__decorate([
    state()
], PlaybookImportDrawer.prototype, "templates", void 0);
__decorate([
    state()
], PlaybookImportDrawer.prototype, "selectedTemplate", void 0);
__decorate([
    state()
], PlaybookImportDrawer.prototype, "uploadFile", void 0);
__decorate([
    state()
], PlaybookImportDrawer.prototype, "uploadName", void 0);
__decorate([
    state()
], PlaybookImportDrawer.prototype, "uploadOverwrite", void 0);
__decorate([
    state()
], PlaybookImportDrawer.prototype, "templateName", void 0);
__decorate([
    state()
], PlaybookImportDrawer.prototype, "templateVariables", void 0);
__decorate([
    state()
], PlaybookImportDrawer.prototype, "gitUrl", void 0);
__decorate([
    state()
], PlaybookImportDrawer.prototype, "gitBranch", void 0);
__decorate([
    state()
], PlaybookImportDrawer.prototype, "gitPath", void 0);
__decorate([
    state()
], PlaybookImportDrawer.prototype, "gitAuthToken", void 0);
__decorate([
    state()
], PlaybookImportDrawer.prototype, "gitSshKey", void 0);
__decorate([
    state()
], PlaybookImportDrawer.prototype, "gitSyncAsSymlink", void 0);
__decorate([
    state()
], PlaybookImportDrawer.prototype, "urlSource", void 0);
__decorate([
    state()
], PlaybookImportDrawer.prototype, "urlName", void 0);
__decorate([
    state()
], PlaybookImportDrawer.prototype, "galaxyType", void 0);
__decorate([
    state()
], PlaybookImportDrawer.prototype, "galaxyName", void 0);
__decorate([
    state()
], PlaybookImportDrawer.prototype, "galaxyVersion", void 0);
__decorate([
    state()
], PlaybookImportDrawer.prototype, "galaxyRequirementsFile", void 0);
__decorate([
    state()
], PlaybookImportDrawer.prototype, "galaxyForce", void 0);
PlaybookImportDrawer = __decorate([
    customElement('playbook-import-drawer')
], PlaybookImportDrawer);
export { PlaybookImportDrawer };
//# sourceMappingURL=playbook-import-drawer.js.map