import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('empty-state')
export class EmptyState extends LitElement {
  // Back-compat: many views used `message` before `title`/`description` existed.
  @property({ type: String }) message = 'No data available';
  @property({ type: String }) override title = '';
  @property({ type: String }) description = '';
  @property({ type: String }) icon = '📭';
  @property({ type: String }) actionLabel = '';

  static override styles = css`
    :host {
      display: block;
    }

    .empty-state {
      text-align: center;
      padding: 48px 32px;
      color: var(--cds-text-secondary);
    }

    .icon {
      font-size: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    .title {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--cds-text-primary);
      letter-spacing: 0.16px;
    }

    .description {
      font-size: 14px;
      margin-bottom: 16px;
      color: var(--cds-text-secondary);
      white-space: pre-wrap;
      letter-spacing: 0.16px;
      line-height: 1.43;
    }

    .action {
      margin-top: 24px;
    }

    .action button {
      padding: 14px 16px;
      min-height: 48px;
      background: var(--cds-button-primary, #0f62fe);
      color: #ffffff;
      border: none;
      border-radius: 0;
      cursor: pointer;
      font-size: 14px;
      font-weight: 400;
      letter-spacing: 0.16px;
      transition: background-color 0.15s;
      font-family: var(--cds-font-sans);
    }

    .action button:hover {
      background: var(--cds-button-primary-hover, #0353e9);
    }
  `;

  private handleAction() {
    this.dispatchEvent(
      new CustomEvent('action-click', {
        bubbles: true,
        composed: true,
      }),
    );
  }

  override render() {
    const title = this.title || this.message;
    const description = this.description;

    return html`
      <div class="empty-state">
        <div class="icon">${this.icon}</div>
        <div class="title">${title}</div>
        ${description ? html`<div class="description">${description}</div>` : ''}
        ${this.actionLabel
          ? html`
              <div class="action">
                <button @click="${this.handleAction}">${this.actionLabel}</button>
              </div>
            `
          : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'empty-state': EmptyState;
  }
}
