import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { apiTokensService, CreateTokenResponse } from '../../services/api-tokens';
import '../ui/copy-button'; // Assuming this exists or I'll implement a simple copy button

@customElement('api-token-drawer')
export class ApiTokenDrawer extends LitElement {
  @property({ type: Boolean, reflect: true })
  show = false;

  @state()
  private name = '';

  @state()
  private expiration = '30'; // Default 30 days. '0' means never.

  @state()
  private loading = false;

  @state()
  private error = '';

  @state()
  private createdToken: CreateTokenResponse | null = null;

  @state()
  private isClosing = false;

  static override styles = css`
    :host {
      display: block;
    }

    .drawer {
      position: fixed;
      inset-block: 0;
      inset-inline-end: 0;
      width: 480px;
      max-width: 100%;
      background: var(--cds-layer-01);
      border-left: 1px solid var(--cds-border-subtle);
      box-shadow: -2px 0 8px rgba(0, 0, 0, 0.3);
      display: flex;
      flex-direction: column;
      animation: slideIn 0.25s ease-out;
      z-index: 1001;
    }

    .drawer.closing {
      animation: slideOut 0.25s ease-in;
    }

    @keyframes slideIn {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }

    @keyframes slideOut {
      from { transform: translateX(0); }
      to { transform: translateX(100%); }
    }

    .drawer-header {
      padding: 20px;
      background: var(--cds-layer-02);
      border-bottom: 1px solid var(--cds-border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }

    .drawer-title {
      margin: 0;
      font-size: 18px;
      font-weight: 500;
      color: var(--vscode-foreground, #cccccc);
    }

    .close-btn {
      background: transparent;
      border: none;
      color: var(--vscode-foreground, #cccccc);
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 0;
      font-size: 20px;
      transition: background-color 0.15s;
    }

    .close-btn:hover {
      background: var(--vscode-toolbar-hoverBackground, rgba(255, 255, 255, 0.1));
    }

    .drawer-body {
      flex: 1;
      padding: 20px;
      overflow-y: auto;
    }

    .drawer-footer {
      padding: 16px 20px;
      background: var(--cds-layer-02);
      border-top: 1px solid var(--cds-border-subtle);
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      flex-shrink: 0;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 16px;
    }

    label {
      font-size: 12px;
      font-weight: 500;
      color: var(--cds-text-secondary);
    }

    input, select {
      padding: 6px 8px;
      border-radius: 0;
      border: none;
      border-bottom: 2px solid var(--cds-border-subtle);
      background: var(--cds-field);
      padding: 0 12px;
      min-height: 40px;
      color: var(--cds-text-primary);
      font-size: 14px;
      font-family: inherit;
      outline: none;
      box-sizing: border-box;
      width: 100%;
    }

    input:focus, select:focus {
      border-bottom-color: var(--cds-focus);
    }

    .btn {
      padding: 6px 12px;
      border-radius: 0;
      border: 1px solid transparent;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      font-family: inherit;
    }

    .btn-primary {
      background: var(--cds-button-primary);
      color: var(--vscode-button-foreground, #ffffff);
      border-color: var(--cds-button-primary);
    }

    .btn-primary:hover:not(:disabled) {
      background: var(--cds-button-primary-hover);
      border-color: var(--cds-button-primary-hover);
    }

    .btn-secondary {
      background: var(--vscode-button-secondaryBackground, #3c3c3c);
      color: var(--vscode-button-secondaryForeground, #cccccc);
      border-color: var(--cds-border-subtle);
    }

    .btn-secondary:hover:not(:disabled) {
      background: var(--vscode-button-secondaryHoverBackground, #45494e);
    }
    
    .error-msg {
      color: var(--cds-support-error);
      margin-bottom: 16px;
      font-size: 14px;
    }

    .token-display {
      background: var(--cds-layer-02);
      padding: 16px;
      border-radius: 0;
      border: 1px solid var(--cds-border-subtle);
      margin-bottom: 16px;
    }

    .token-value {
      font-family: monospace;
      word-break: break-all;
      color: var(--vscode-text-preformat-foreground, #ce9178);
      font-size: 14px;
      margin: 8px 0;
      padding: 8px;
      background: var(--cds-background);
      border: 1px solid var(--cds-border-subtle);
      border-radius: 0;
    }

    .warning-text {
      color: var(--vscode-inputValidation-warningForeground, #cca700);
      font-size: 12px;
      margin-top: 8px;
    }
    
    .copy-row {
      display: flex;
      gap: 8px;
      align-items: center;
    }
  `;

  protected override willUpdate(changed: Map<string, unknown>): void {
    if (changed.has('show')) {
      if (!this.show) {
        setTimeout(() => {
          this.resetForm();
        }, 300);
      }
    }
  }

  private resetForm() {
    this.name = '';
    this.expiration = '30';
    this.createdToken = null;
    this.error = '';
    this.loading = false;
  }

  private handleClose = () => {
    if (this.loading || this.isClosing) return;
    this.isClosing = true;
    setTimeout(() => {
      this.isClosing = false;
      this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
    }, 250);
  };

  private async handleSubmit(e: Event) {
    e.preventDefault();
    if (!this.name.trim()) {
      this.error = 'Token name is required';
      return;
    }

    this.loading = true;
    this.error = '';

    try {
      let expiresAt: number | null = null;
      if (this.expiration !== '0') {
        const days = parseInt(this.expiration, 10);
        expiresAt = Date.now() + days * 24 * 60 * 60 * 1000;
      }

      const result = await apiTokensService.createToken({
        name: this.name,
        expires_at: expiresAt
      });
      this.createdToken = result;
      this.dispatchEvent(new CustomEvent('token-created', { bubbles: true, composed: true }));
    } catch (err: any) {
      this.error = err.message || 'Failed to create token';
    } finally {
      this.loading = false;
    }
  }

  override render() {
    if (!this.show && !this.isClosing) return null;

    return html`
      <div class="drawer ${this.isClosing ? 'closing' : ''}">
        <div class="drawer-header">
          <h2 class="drawer-title">New API Token</h2>
          <button class="close-btn" @click=${this.handleClose}>×</button>
        </div>
        <div class="drawer-body">
          ${this.createdToken ? this.renderSuccess() : this.renderForm()}
        </div>
        ${!this.createdToken ? html`
        <div class="drawer-footer">
          <button class="btn btn-secondary" @click=${this.handleClose} ?disabled=${this.loading}>Cancel</button>
          <button class="btn btn-primary" @click=${this.handleSubmit} ?disabled=${this.loading}>Create Token</button>
        </div>
        ` : html`
        <div class="drawer-footer">
          <button class="btn btn-primary" @click=${this.handleClose}>Done</button>
        </div>
        `}
      </div>
    `;
  }

  private renderForm() {
    return html`
      ${this.error ? html`<div class="error-msg">${this.error}</div>` : ''}
      <form @submit=${this.handleSubmit}>
        <div class="field">
          <label for="name">Name</label>
          <input 
            id="name" 
            type="text" 
            .value=${this.name} 
            @input=${(e: Event) => this.name = (e.target as HTMLInputElement).value}
            ?disabled=${this.loading}
            placeholder="e.g. CI/CD Pipeline"
            autofocus
          />
        </div>
        <div class="field">
          <label for="expiration">Expiration</label>
          <select 
            id="expiration" 
            .value=${this.expiration}
            @change=${(e: Event) => this.expiration = (e.target as HTMLSelectElement).value}
            ?disabled=${this.loading}
          >
            <option value="7">7 Days</option>
            <option value="30">30 Days</option>
            <option value="60">60 Days</option>
            <option value="90">90 Days</option>
            <option value="365">1 Year</option>
            <option value="0">No Expiration</option>
          </select>
        </div>
      </form>
    `;
  }

  private renderSuccess() {
    return html`
      <div class="token-display">
        <h3>Token Created Successfully</h3>
        <p>Make sure to copy your personal access token now. You won't be able to see it again!</p>
        <div class="token-value">${this.createdToken?.token}</div>
        <div class="copy-row">
            <copy-button .value=${this.createdToken?.token || ''} label="Copy to Clipboard"></copy-button>
        </div>
        <div class="warning-text">
            Treat this token like a password. Do not share it or check it into source control.
        </div>
      </div>
    `;
  }
}
