import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { apiTokensService, ApiToken } from '../services/api-tokens';
import '../components/auth/api-token-drawer';
import '../components/modal-dialog';
import '../components/ui/notification-container';
import { formatDate } from '../utils/formatters';

@customElement('api-tokens-tab')
export class ApiTokensTab extends LitElement {

  @state()
  private tokens: ApiToken[] = [];

  @state()
  private showCreateDrawer = false;

  @state()
  private tokenToRevoke: ApiToken | null = null;

  @state()
  private loading = false;

  @state()
  private error: string | null = null;

  static override styles = css`
    :host {
      display: block;
      padding: 20px;
      height: 100%;
      box-sizing: border-box;
      overflow-y: auto;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 300;
      color: var(--vscode-foreground);
    }

    .table-container {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-border);
      border-radius: 4px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    th, td {
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid var(--vscode-border);
      color: var(--vscode-foreground);
    }

    th {
      background: var(--vscode-bg-lighter, #252526);
      font-weight: 600;
      color: var(--vscode-descriptionForeground);
    }

    tr:last-child td {
      border-bottom: none;
    }

    tr:hover {
      background: var(--vscode-list-hoverBackground, rgba(255, 255, 255, 0.04));
    }

    .action-col {
      text-align: right;
      width: 100px;
    }

    .btn {
      padding: 6px 12px;
      border-radius: 4px;
      border: 1px solid transparent;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      font-family: inherit;
    }

    .btn-primary {
      background: var(--vscode-button-background, #0e639c);
      color: var(--vscode-button-foreground, #ffffff);
      border-color: var(--vscode-button-background, #0e639c);
    }

    .btn-primary:hover {
      background: var(--vscode-button-hoverBackground, #1177bb);
    }

    .btn-danger-ghost {
      background: transparent;
      color: var(--vscode-errorForeground, #f48771);
      border: 1px solid var(--vscode-errorForeground, #f48771);
      padding: 4px 8px;
      font-size: 12px;
    }

    .btn-danger-ghost:hover {
      background: rgba(244, 135, 113, 0.1);
    }

    .btn-secondary {
       background: var(--vscode-button-secondaryBackground, #3c3c3c);
       color: var(--vscode-button-secondaryForeground, #cccccc);
       border: 1px solid var(--vscode-button-border, #5a5a5a);
    }

    .btn-danger {
       background: var(--vscode-button-dangerBackground, #c93c37);
       color: var(--vscode-button-dangerForeground, #ffffff);
    }

    .empty-state {
      padding: 40px;
      text-align: center;
      color: var(--vscode-descriptionForeground);
    }

    .token-name {
      font-weight: 500;
    }

    .error-banner {
      background: rgba(244, 135, 113, 0.1);
      color: var(--vscode-errorForeground, #f48771);
      border: 1px solid var(--vscode-errorForeground, #f48771);
      padding: 12px;
      margin-bottom: 20px;
      border-radius: 4px;
    }
  `;

  override connectedCallback() {
    super.connectedCallback();
    this.loadTokens();
  }

  private async loadTokens() {
    this.loading = true;
    try {
      this.tokens = await apiTokensService.listTokens();
    } catch (err: any) {
      this.error = err.message || 'Failed to list tokens';
    } finally {
      this.loading = false;
    }
  }

  private handleTokenCreated() {
    this.loadTokens();
    // Keep drawer open? No, typically close or let user close.
    // The drawer handles its own "Success" state.
    // If user closes drawer, 'close' event fires.
    // But we should refresh list in background.
  }

  private openRevokeModal(token: ApiToken) {
    this.tokenToRevoke = token;
    const modal = this.shadowRoot?.querySelector('#revokeModal') as any;
    if (modal) modal.open = true;
  }

  private closeRevokeModal() {
    this.tokenToRevoke = null;
    const modal = this.shadowRoot?.querySelector('#revokeModal') as any;
    if (modal) modal.open = false;
  }

  private async confirmRevoke() {
    if (!this.tokenToRevoke) return;
    try {
      await apiTokensService.revokeToken(this.tokenToRevoke.id);
      this.loadTokens();
      this.closeRevokeModal();
      this.showToast('Token revoked successfully', 'success');
    } catch (err: any) {
      this.showToast('Failed to revoke token', 'error');
    }
  }

  private showToast(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
    const container = this.renderRoot?.querySelector('notification-container') as any;
    if (container && typeof container.addNotification === 'function') {
      container.addNotification({ message, type });
    }
  }

  override render() {
    return html`
      <div class="header">
        <h1>API Tokens</h1>
        <button class="btn btn-primary" @click=${() => this.showCreateDrawer = true}>
          Generate New Token
        </button>
      </div>

      ${this.error ? html`<div class="error-banner">${this.error}</div>` : ''}

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Created At</th>
              <th>Expires At</th>
              <th>Last Used</th>
              <th class="action-col">Action</th>
            </tr>
          </thead>
          <tbody>
            ${this.tokens.length === 0 && !this.loading ? html`
              <tr>
                <td colspan="5" class="empty-state">No API tokens found.</td>
              </tr>
            ` : this.tokens.map(token => html`
              <tr>
                <td class="token-name">${token.name}</td>
                <td>${formatDate(token.created_at)}</td>
                <td>${token.expires_at ? formatDate(token.expires_at) : 'Never'}</td>
                <td>${token.last_used_at ? formatDate(token.last_used_at) : 'Never'}</td>
                <td class="action-col">
                  <button class="btn btn-danger-ghost" @click=${() => this.openRevokeModal(token)}>
                    Revoke
                  </button>
                </td>
              </tr>
            `)}
            ${this.loading ? html`
               <tr><td colspan="5" style="text-align:center; padding: 20px;">Loading...</td></tr>
            ` : ''}
          </tbody>
        </table>
      </div>

      <api-token-drawer 
        .show=${this.showCreateDrawer}
        @close=${() => this.showCreateDrawer = false}
        @token-created=${this.handleTokenCreated}
        @copy=${() => this.showToast('Token copied to clipboard', 'success')}
      ></api-token-drawer>

      <modal-dialog 
        id="revokeModal"
        title="Revoke Token"
        @modal-close=${this.closeRevokeModal}
      >
        <p>Are you sure you want to revoke the token "<strong>${this.tokenToRevoke?.name}</strong>"? This action cannot be undone.</p>
        <div slot="footer">
          <button class="btn btn-secondary" @click=${this.closeRevokeModal}>Cancel</button>
          <button class="btn btn-danger" @click=${this.confirmRevoke}>Revoke</button>
        </div>
      </modal-dialog>

      <notification-container></notification-container>
    `;
  }
}
