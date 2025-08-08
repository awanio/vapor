import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('empty-state')
export class EmptyState extends LitElement {
  @property({ type: String }) message = 'No data available';
  @property({ type: String }) icon = '📭';
  @property({ type: String }) actionLabel = '';

  static override styles = css`
    :host {
      display: block;
    }

    .empty-state {
      text-align: center;
      padding: 3rem;
      color: var(--text-secondary);
    }

    .icon {
      font-size: 3rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    .message {
      font-size: 1rem;
      margin-bottom: 1rem;
    }

    .action {
      margin-top: 1rem;
    }

    .action button {
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

    .action button:hover {
      background: var(--vscode-button-hoverBackground, #005a9e);
    }
  `;

  private handleAction() {
    this.dispatchEvent(new CustomEvent('action-click', {
      bubbles: true,
      composed: true
    }));
  }

  override render() {
    return html`
      <div class="empty-state">
        <div class="icon">${this.icon}</div>
        <div class="message">${this.message}</div>
        ${this.actionLabel ? html`
          <div class="action">
            <button @click="${this.handleAction}">${this.actionLabel}</button>
          </div>
        ` : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'empty-state': EmptyState;
  }
}
