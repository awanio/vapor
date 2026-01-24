import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { AnsibleService } from '../../services/ansible';
import type { PlaybookValidationResponse } from '../../types/ansible';

@customElement('playbook-editor-modal')
export class PlaybookEditorModal extends LitElement {
  @property({ type: Boolean })
  open = false;

  @property({ type: String })
  playbookName?: string;

  @property({ type: String })
  mode: 'create' | 'edit' = 'create';

  @state()
  private name = '';

  @state()
  private content = '';

  @state()
  private loading = false;

  @state()
  private validating = false;

  @state()
  private saving = false;

  @state()
  private validationResult?: PlaybookValidationResponse;

  @state()
  private error?: string;

  static override styles = css`
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
      max-width: 900px;
      height: 80vh;
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
      display: flex;
      flex-direction: column;
      overflow: hidden;
      padding: 16px;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-label {
      display: block;
      margin-bottom: 8px;
      color: var(--vscode-foreground, #cccccc);
      font-size: 13px;
    }

    .form-input {
      width: 100%;
      padding: 8px 12px;
      background: var(--vscode-input-background, #3c3c3c);
      color: var(--vscode-input-foreground, #cccccc);
      border: 1px solid var(--vscode-input-border, #3c3c3c);
      border-radius: 4px;
      font-size: 13px;
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
    }

    .form-input:focus {
      outline: none;
      border-color: var(--vscode-focusBorder, #007acc);
    }

    .editor-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    .editor-label {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
      color: var(--vscode-foreground, #cccccc);
      font-size: 13px;
    }

    .editor {
      flex: 1;
      width: 100%;
      padding: 12px;
      background: var(--vscode-input-background, #3c3c3c);
      color: var(--vscode-editor-foreground, #d4d4d4);
      border: 1px solid var(--vscode-panel-border, #2d2d30);
      border-radius: 4px;
      font-family: var(--vscode-editor-font-family, 'Courier New', monospace);
      font-size: 13px;
      line-height: 1.6;
      resize: none;
      tab-size: 2;
      overflow: auto;
    }

    .editor:focus {
      outline: none;
      border-color: var(--vscode-focusBorder, #007acc);
    }

    .validation-result {
      margin-top: 8px;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
    }

    .validation-result.valid {
      background: var(--vscode-inputValidation-infoBackground, rgba(67, 160, 71, 0.1));
      border: 1px solid var(--vscode-inputValidation-infoBorder, #43a047);
      color: var(--vscode-inputValidation-infoForeground, #43a047);
    }

    .validation-result.invalid {
      background: var(--vscode-inputValidation-errorBackground, rgba(244, 135, 113, 0.1));
      border: 1px solid var(--vscode-inputValidation-errorBorder, #f48771);
      color: var(--vscode-errorForeground, #f48771);
    }

    .validation-errors {
      margin-top: 4px;
      font-size: 12px;
    }

    .validation-error {
      margin: 2px 0;
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
      gap: 16px;
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

    .loading-text {
      color: var(--vscode-descriptionForeground, #8b8b8b);
      font-size: 12px;
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

    .template-hint {
      padding: 8px 12px;
      background: var(--vscode-textBlockQuote-background, rgba(127, 127, 127, 0.1));
      border-left: 3px solid var(--vscode-textBlockQuote-border, #007acc);
      margin-bottom: 16px;
      font-size: 12px;
      color: var(--vscode-textBlockQuote-foreground, #cccccc);
    }

    pre {
      margin: 0;
      white-space: pre-wrap;
    }
  `;

  override willUpdate(changedProperties: Map<string, any>) {
    if (changedProperties.has('open')) {
      if (this.open) {
        // Defer loading to next microtask to avoid update scheduling warning
        Promise.resolve().then(() => this.loadPlaybook());
      } else {
        this.reset();
      }
    }

    if (changedProperties.has('playbookName') && this.open) {
      // Defer loading to next microtask to avoid update scheduling warning
      Promise.resolve().then(() => this.loadPlaybook());
    }
  }

  private async loadPlaybook() {
    if (this.mode === 'edit' && this.playbookName) {
      this.loading = true;
      this.error = undefined;

      try {
        const response = await AnsibleService.getPlaybook(this.playbookName);
        this.name = response.playbook.name;
        this.content = response.playbook.content;
      } catch (error) {
        console.error('Failed to load playbook:', error);
        this.error = error instanceof Error ? error.message : 'Failed to load playbook';
      } finally {
        this.loading = false;
      }
    } else if (this.mode === 'create') {
      // Set default template for new playbook
      this.name = '';
      this.content = `---
- name: My Playbook
  hosts: all
  become: yes
  
  tasks:
    - name: Example task
      debug:
        msg: "Hello from Ansible!"
`;
    }
  }

  private reset() {
    this.name = '';
    this.content = '';
    this.validationResult = undefined;
    this.error = undefined;
    this.loading = false;
    this.validating = false;
    this.saving = false;
  }

  private async validatePlaybook() {
    if (!this.name || !this.content) {
      this.error = 'Playbook name and content are required';
      return;
    }

    this.validating = true;
    this.error = undefined;

    try {
      // First save the playbook temporarily for validation
      const tempName = this.mode === 'edit' ? this.name : `_temp_${Date.now()}.yml`;
      await AnsibleService.uploadPlaybook({
        name: tempName,
        content: this.content,
        overwrite: true,
      });

      // Then validate it
      const result = await AnsibleService.validatePlaybook(tempName);
      this.validationResult = result;

      // Clean up temp file if in create mode
      if (this.mode === 'create') {
        await AnsibleService.deletePlaybook(tempName).catch(() => { });
      }
    } catch (error) {
      console.error('Validation failed:', error);
      this.error = error instanceof Error ? error.message : 'Validation failed';
    } finally {
      this.validating = false;
    }
  }

  private async save() {
    if (!this.name || !this.content) {
      this.error = 'Playbook name and content are required';
      return;
    }

    // Ensure name has .yml or .yaml extension
    if (!this.name.endsWith('.yml') && !this.name.endsWith('.yaml')) {
      this.name += '.yml';
    }

    this.saving = true;
    this.error = undefined;

    try {
      await AnsibleService.uploadPlaybook({
        name: this.name,
        content: this.content,
        overwrite: this.mode === 'edit',
      });

      // Dispatch success event
      this.dispatchEvent(new CustomEvent('save', {
        detail: {
          name: this.name,
          mode: this.mode,
        }
      }));

      this.close();
    } catch (error) {
      console.error('Save failed:', error);
      this.error = error instanceof Error ? error.message : 'Failed to save playbook';
    } finally {
      this.saving = false;
    }
  }

  private close() {
    this.dispatchEvent(new CustomEvent('close'));
    this.open = false;
  }

  private handleKeyDown(event: KeyboardEvent) {
    // Handle tab key for indentation
    if (event.key === 'Tab') {
      event.preventDefault();
      const target = event.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const value = target.value;

      // Insert two spaces for tab
      target.value = value.substring(0, start) + '  ' + value.substring(end);
      target.selectionStart = target.selectionEnd = start + 2;

      this.content = target.value;
    }
  }

  override render() {
    return html`
      <div class="modal">
        <div class="header">
          <div class="title">
            ${this.mode === 'create' ? 'Create New Playbook' : 'Edit Playbook'}
          </div>
          <button class="close-button" @click=${this.close}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.707.708L7.293 8l-3.647 3.646.708.707L8 8.707z"/>
            </svg>
          </button>
        </div>

        <div class="body">
          ${this.loading ? html`
            <div class="loading-text">Loading playbook...</div>
          ` : html`
            ${this.error ? html`
              <div class="error-message">
                <strong>Error:</strong> ${this.error}
              </div>
            ` : ''}

            ${this.mode === 'create' ? html`
              <div class="template-hint">
                💡 Tip: Start with the template below or paste your own YAML content. 
                Use Tab for indentation (2 spaces).
              </div>
            ` : ''}

            <div class="form-group">
              <label class="form-label" for="playbook-name">
                Playbook Name
              </label>
              <input
                id="playbook-name"
                class="form-input"
                type="text"
                .value=${this.name}
                @input=${(e: Event) => this.name = (e.target as HTMLInputElement).value}
                placeholder="my-playbook.yml"
                ?disabled=${this.mode === 'edit'}
              />
            </div>

            <div class="editor-container">
              <div class="editor-label">
                <span>Playbook Content (YAML)</span>
                ${this.validationResult ? html`
                  <span class="validation-result ${this.validationResult.valid ? 'valid' : 'invalid'}">
                    ${this.validationResult.valid ? '✓ Valid syntax' : '✗ Invalid syntax'}
                  </span>
                ` : ''}
              </div>
              <textarea
                class="editor"
                .value=${this.content}
                @input=${(e: Event) => this.content = (e.target as HTMLTextAreaElement).value}
                @keydown=${this.handleKeyDown}
                placeholder="---\n- name: My Playbook\n  hosts: all\n  tasks:\n    - name: Example task\n      debug:\n        msg: 'Hello!'"
                spellcheck="false"
              ></textarea>
              ${this.validationResult && !this.validationResult.valid && this.validationResult.errors ? html`
                <div class="validation-errors">
                  ${this.validationResult.errors.map(error => html`
                    <div class="validation-error">• ${error}</div>
                  `)}
                </div>
              ` : ''}
            </div>
          `}
        </div>

        <div class="footer">
          <div class="footer-info">
            ${this.content ? html`
              <span>${this.content.split('\n').length} lines</span>
              <span>${this.content.length} characters</span>
            ` : ''}
          </div>
          <div class="footer-actions">
            <button 
              class="button secondary" 
              @click=${this.validatePlaybook}
              ?disabled=${this.loading || this.validating || !this.content}
            >
              ${this.validating ? 'Validating...' : 'Validate'}
            </button>
            <button 
              class="button" 
              @click=${this.save}
              ?disabled=${this.loading || this.saving || !this.name || !this.content}
            >
              ${this.saving ? 'Saving...' : this.mode === 'create' ? 'Create' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'playbook-editor-modal': PlaybookEditorModal;
  }
}
