var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { AnsibleService } from '../../services/ansible';
let PlaybookRunModal = class PlaybookRunModal extends LitElement {
    constructor() {
        super(...arguments);
        this.open = false;
        this.playbookName = '';
        this.inventory = 'localhost';
        this.limit = '';
        this.tags = '';
        this.skipTags = '';
        this.extraVars = '';
        this.check = false;
        this.diff = false;
        this.verbose = 0;
        this.become = false;
        this.becomeUser = 'root';
        this.privateKey = '';
        this.timeout = 10;
        this.forks = 5;
        this.running = false;
        this.showAdvanced = false;
    }
    updated(changedProperties) {
        if (changedProperties.has('open')) {
            if (!this.open) {
                this.reset();
            }
        }
    }
    reset() {
        this.inventory = 'localhost';
        this.limit = '';
        this.tags = '';
        this.skipTags = '';
        this.extraVars = '';
        this.check = false;
        this.diff = false;
        this.verbose = 0;
        this.become = false;
        this.becomeUser = 'root';
        this.privateKey = '';
        this.timeout = 10;
        this.forks = 5;
        this.error = undefined;
        this.running = false;
        this.showAdvanced = false;
    }
    async run() {
        this.running = true;
        this.error = undefined;
        try {
            let extraVarsObj;
            if (this.extraVars.trim()) {
                try {
                    extraVarsObj = JSON.parse(this.extraVars);
                }
                catch {
                    extraVarsObj = {};
                    const lines = this.extraVars.split('\n');
                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (trimmed && trimmed.includes('=')) {
                            const [key, ...valueParts] = trimmed.split('=');
                            extraVarsObj[key.trim()] = valueParts.join('=').trim();
                        }
                    }
                }
            }
            const request = {
                playbook: this.playbookName,
                inventory: this.inventory || undefined,
                limit: this.limit || undefined,
                tags: this.tags ? this.tags.split(',').map(t => t.trim()) : undefined,
                skip_tags: this.skipTags ? this.skipTags.split(',').map(t => t.trim()) : undefined,
                extra_vars: extraVarsObj,
                check: this.check,
                diff: this.diff,
                verbose: this.verbose,
                become: this.become,
                become_user: this.become ? this.becomeUser : undefined,
                private_key: this.privateKey || undefined,
                timeout: this.timeout,
                forks: this.forks,
            };
            const response = await AnsibleService.runPlaybook(request);
            this.dispatchEvent(new CustomEvent('run', {
                detail: {
                    executionId: response.execution_id,
                    status: response.status,
                    streamUrl: response.stream_url,
                }
            }));
            this.close();
        }
        catch (error) {
            console.error('Failed to run playbook:', error);
            this.error = error instanceof Error ? error.message : 'Failed to run playbook';
        }
        finally {
            this.running = false;
        }
    }
    close() {
        this.dispatchEvent(new CustomEvent('close'));
        this.open = false;
    }
    render() {
        return html `
      <div class="modal">
        <div class="header">
          <div class="title">
            Run Playbook: <span class="playbook-name">${this.playbookName}</span>
          </div>
          <button class="close-button" @click=${this.close}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.707.708L7.293 8l-3.647 3.646.708.707L8 8.707z"/>
            </svg>
          </button>
        </div>

        <div class="body">
          ${this.error ? html `
            <div class="error-message">
              <strong>Error:</strong> ${this.error}
            </div>
          ` : ''}

          <div class="section">
            <div class="section-title">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 4v5l3.5 2.1-.6 1L7 9.8V4h1z"/>
                <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 1a6 6 0 110 12A6 6 0 018 2z"/>
              </svg>
              Basic Configuration
            </div>

            <div class="form-group">
              <label class="form-label" for="inventory">Inventory</label>
              <input
                id="inventory"
                class="form-input"
                type="text"
                .value=${this.inventory}
                @input=${(e) => this.inventory = e.target.value}
                placeholder="localhost, production, or path to inventory file"
              />
              <div class="form-hint">Specify inventory hosts or file</div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="limit">Limit Hosts</label>
                <input
                  id="limit"
                  class="form-input"
                  type="text"
                  .value=${this.limit}
                  @input=${(e) => this.limit = e.target.value}
                  placeholder="webservers, host1, *.example.com"
                />
                <div class="form-hint">Pattern to limit execution</div>
              </div>

              <div class="form-group">
                <label class="form-label" for="tags">Tags</label>
                <input
                  id="tags"
                  class="form-input"
                  type="text"
                  .value=${this.tags}
                  @input=${(e) => this.tags = e.target.value}
                  placeholder="deploy, config, update"
                />
                <div class="form-hint">Comma-separated tags to run</div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="extra-vars">Extra Variables</label>
              <textarea
                id="extra-vars"
                class="form-textarea"
                .value=${this.extraVars}
                @input=${(e) => this.extraVars = e.target.value}
                placeholder='{"app_version": "1.0.0", "env": "production"}
or
app_version=1.0.0
env=production'
              ></textarea>
              <div class="form-hint">JSON object or key=value pairs</div>
            </div>

            <div class="form-row">
              <label class="form-checkbox">
                <input
                  type="checkbox"
                  .checked=${this.check}
                  @change=${(e) => this.check = e.target.checked}
                />
                <span>Check mode (dry run)</span>
              </label>

              <label class="form-checkbox">
                <input
                  type="checkbox"
                  .checked=${this.diff}
                  @change=${(e) => this.diff = e.target.checked}
                />
                <span>Show differences</span>
              </label>
            </div>
          </div>

          <button class="toggle-advanced" @click=${() => this.showAdvanced = !this.showAdvanced}>
            <svg class="chevron ${this.showAdvanced ? 'expanded' : ''}" width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M6 4l4 4-4 4z"/>
            </svg>
            Advanced Options
          </button>

          ${this.showAdvanced ? html `
            <div class="collapsible">
              <div class="section">
                <div class="section-title">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M14 5H8V3h6v2zm0 3H8v2h6V8zM14 13H8v2h6v-2zM2 7h4v6H2V7z"/>
                  </svg>
                  Advanced Configuration
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label" for="verbose">Verbosity Level</label>
                    <select
                      id="verbose"
                      class="form-select"
                      .value=${String(this.verbose)}
                      @change=${(e) => this.verbose = Number(e.target.value)}
                    >
                      <option value="0">Normal</option>
                      <option value="1">Verbose (-v)</option>
                      <option value="2">More Verbose (-vv)</option>
                      <option value="3">Debug (-vvv)</option>
                      <option value="4">Connection Debug (-vvvv)</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label class="form-label" for="forks">Parallel Processes</label>
                    <input
                      id="forks"
                      class="form-input"
                      type="number"
                      min="1"
                      max="100"
                      .value=${String(this.forks)}
                      @input=${(e) => this.forks = Number(e.target.value)}
                    />
                  </div>
                </div>

                <div class="form-row">
                  <label class="form-checkbox">
                    <input
                      type="checkbox"
                      .checked=${this.become}
                      @change=${(e) => this.become = e.target.checked}
                    />
                    <span>Enable privilege escalation (become)</span>
                  </label>

                  <div class="form-group">
                    <label class="form-label" for="become-user">Become User</label>
                    <input
                      id="become-user"
                      class="form-input"
                      type="text"
                      .value=${this.becomeUser}
                      @input=${(e) => this.becomeUser = e.target.value}
                      ?disabled=${!this.become}
                    />
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label" for="timeout">Connection Timeout (seconds)</label>
                    <input
                      id="timeout"
                      class="form-input"
                      type="number"
                      min="1"
                      .value=${String(this.timeout)}
                      @input=${(e) => this.timeout = Number(e.target.value)}
                    />
                  </div>

                  <div class="form-group">
                    <label class="form-label" for="skip-tags">Skip Tags</label>
                    <input
                      id="skip-tags"
                      class="form-input"
                      type="text"
                      .value=${this.skipTags}
                      @input=${(e) => this.skipTags = e.target.value}
                      placeholder="backup, cleanup"
                    />
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label" for="private-key">SSH Private Key Path</label>
                  <input
                    id="private-key"
                    class="form-input"
                    type="text"
                    .value=${this.privateKey}
                    @input=${(e) => this.privateKey = e.target.value}
                    placeholder="/home/user/.ssh/id_rsa"
                  />
                  <div class="form-hint">Path to SSH private key file</div>
                </div>
              </div>
            </div>
          ` : ''}
        </div>

        <div class="footer">
          <div class="footer-info">
            ${this.check ? html `<span>🔍 Check mode enabled</span>` : ''}
            ${this.diff ? html `<span>📝 Diff mode enabled</span>` : ''}
          </div>
          <div class="footer-actions">
            <button class="button secondary" @click=${this.close}>
              Cancel
            </button>
            <button 
              class="button" 
              @click=${this.run}
              ?disabled=${this.running}
            >
              ${this.running ? 'Starting...' : 'Run Playbook'}
            </button>
          </div>
        </div>
      </div>
    `;
    }
};
PlaybookRunModal.styles = css `
    :host {
      display: block;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 2000;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s;
    }

    :host([open]) {
      opacity: 1;
      pointer-events: auto;
    }

    .modal {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 90%;
      max-width: 700px;
      max-height: 90vh;
      background: var(--vscode-editor-background, #1e1e1e);
      border: 1px solid var(--vscode-panel-border, #2d2d30);
      border-radius: 8px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      display: flex;
      flex-direction: column;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      border-bottom: 1px solid var(--vscode-panel-border, #2d2d30);
      background: var(--vscode-titleBar-activeBackground, #3c3c3c);
    }

    .title {
      font-size: 16px;
      font-weight: 500;
      color: var(--vscode-titleBar-activeForeground, #cccccc);
    }

    .playbook-name {
      font-family: var(--vscode-editor-font-family, 'Courier New', monospace);
      color: var(--vscode-textLink-foreground, #3794ff);
    }

    .close-button {
      background: none;
      border: none;
      color: var(--vscode-icon-foreground, #c5c5c5);
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: background-color 0.2s;
    }

    .close-button:hover {
      background: var(--vscode-toolbar-hoverBackground, rgba(90, 93, 94, 0.31));
    }

    .body {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }

    .section {
      margin-bottom: 24px;
    }

    .section-title {
      font-size: 14px;
      font-weight: 500;
      color: var(--vscode-foreground, #cccccc);
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-label {
      display: block;
      margin-bottom: 6px;
      color: var(--vscode-foreground, #cccccc);
      font-size: 13px;
    }

    .form-hint {
      color: var(--vscode-descriptionForeground, #8b8b8b);
      font-size: 11px;
      margin-top: 4px;
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
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
    }

    .form-textarea {
      min-height: 60px;
      resize: vertical;
      font-family: var(--vscode-editor-font-family, 'Courier New', monospace);
    }

    .form-input:focus,
    .form-select:focus,
    .form-textarea:focus {
      outline: none;
      border-color: var(--vscode-focusBorder, #007acc);
    }

    .form-checkbox {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .form-checkbox input {
      width: 16px;
      height: 16px;
      cursor: pointer;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .error-message {
      padding: 8px 12px;
      background: var(--vscode-inputValidation-errorBackground, rgba(244, 135, 113, 0.1));
      border: 1px solid var(--vscode-inputValidation-errorBorder, #f48771);
      color: var(--vscode-errorForeground, #f48771);
      border-radius: 4px;
      margin-bottom: 16px;
      font-size: 13px;
    }

    .footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      border-top: 1px solid var(--vscode-panel-border, #2d2d30);
    }

    .footer-info {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--vscode-descriptionForeground, #8b8b8b);
      font-size: 12px;
    }

    .footer-actions {
      display: flex;
      gap: 8px;
    }

    .button {
      padding: 8px 16px;
      background: var(--vscode-button-background, #007acc);
      color: var(--vscode-button-foreground, white);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      transition: background-color 0.2s;
    }

    .button:hover {
      background: var(--vscode-button-hoverBackground, #005a9e);
    }

    .button.secondary {
      background: var(--vscode-button-secondaryBackground, #3a3d41);
      color: var(--vscode-button-secondaryForeground, #cccccc);
    }

    .button.secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground, #45494e);
    }

    .button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .collapsible {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid var(--vscode-panel-border, #2d2d30);
    }

    .toggle-advanced {
      background: none;
      border: none;
      color: var(--vscode-textLink-foreground, #3794ff);
      cursor: pointer;
      font-size: 12px;
      padding: 4px 0;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .toggle-advanced:hover {
      text-decoration: underline;
    }

    .chevron {
      transition: transform 0.2s;
    }

    .chevron.expanded {
      transform: rotate(90deg);
    }
  `;
__decorate([
    property({ type: Boolean })
], PlaybookRunModal.prototype, "open", void 0);
__decorate([
    property({ type: String })
], PlaybookRunModal.prototype, "playbookName", void 0);
__decorate([
    state()
], PlaybookRunModal.prototype, "inventory", void 0);
__decorate([
    state()
], PlaybookRunModal.prototype, "limit", void 0);
__decorate([
    state()
], PlaybookRunModal.prototype, "tags", void 0);
__decorate([
    state()
], PlaybookRunModal.prototype, "skipTags", void 0);
__decorate([
    state()
], PlaybookRunModal.prototype, "extraVars", void 0);
__decorate([
    state()
], PlaybookRunModal.prototype, "check", void 0);
__decorate([
    state()
], PlaybookRunModal.prototype, "diff", void 0);
__decorate([
    state()
], PlaybookRunModal.prototype, "verbose", void 0);
__decorate([
    state()
], PlaybookRunModal.prototype, "become", void 0);
__decorate([
    state()
], PlaybookRunModal.prototype, "becomeUser", void 0);
__decorate([
    state()
], PlaybookRunModal.prototype, "privateKey", void 0);
__decorate([
    state()
], PlaybookRunModal.prototype, "timeout", void 0);
__decorate([
    state()
], PlaybookRunModal.prototype, "forks", void 0);
__decorate([
    state()
], PlaybookRunModal.prototype, "running", void 0);
__decorate([
    state()
], PlaybookRunModal.prototype, "error", void 0);
__decorate([
    state()
], PlaybookRunModal.prototype, "showAdvanced", void 0);
PlaybookRunModal = __decorate([
    customElement('playbook-run-modal')
], PlaybookRunModal);
export { PlaybookRunModal };
//# sourceMappingURL=playbook-run-modal.js.map