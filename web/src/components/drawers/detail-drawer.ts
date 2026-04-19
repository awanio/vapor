import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('detail-drawer')
export class DetailDrawer extends LitElement {
  @property({ type: String }) override title = '';
  @property({ type: Boolean, reflect: true }) show = false;
  @property({ type: Boolean }) loading = false;
  @property({ type: Number }) width = 600;
  @property({ type: Boolean }) hasFooter = false;

  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && this.show) {
      event.stopPropagation();
      this.handleClose();
    }
  };

  static override styles = css`
    :host {
      display: block;
      position: fixed;
      top: 0;
      right: 0;
      height: 100vh;
      z-index: 2000;
      pointer-events: none;
    }

    :host([show]) {
      pointer-events: auto;
    }

    .drawer {
      width: 100%;
      height: 100%;
      background: var(--cds-layer-01);
      border-left: 1px solid var(--cds-border-subtle);
      box-shadow: var(--cds-shadow-overlay, 0 2px 6px rgba(0, 0, 0, 0.3));
      display: flex;
      flex-direction: column;
      transform: translateX(100%);
      transition: transform 0.15s ease;
    }

    :host([show]) .drawer {
      transform: translateX(0);
    }

    .close-button {
      position: absolute;
      top: 12px;
      right: 16px;
      background: none;
      border: none;
      cursor: pointer;
      color: var(--cds-text-secondary);
      font-size: 18px;
      padding: 0;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 0;
      transition: background-color 0.15s;
      z-index: 10;
    }

    .close-button:hover {
      background-color: var(--cds-layer-02);
      color: var(--cds-text-primary);
    }

    .drawer-header {
      padding: 16px 24px;
      border-bottom: 1px solid var(--cds-border-subtle);
      flex-shrink: 0;
      position: relative;
    }

    h2 {
      margin: 0;
      padding: 0;
      font-size: 20px;
      font-weight: 400;
      color: var(--cds-text-primary);
      letter-spacing: 0.16px;
    }

    .drawer-content {
      font-size: 14px;
      letter-spacing: 0.16px;
      line-height: 1.43;
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }

    .drawer-footer {
      padding: 0;
      background: var(--cds-layer-01);
      border-top: 1px solid var(--cds-border-subtle);
      display: flex;
      justify-content: flex-end;
      gap: 0;
      flex-shrink: 0;
    }
  `;

  private handleClose(event?: Event) {
    if (event) {
      event.stopPropagation();
    }

    this.dispatchEvent(new CustomEvent('close', {
      bubbles: true,
      composed: true
    }));
  }

  override connectedCallback() {
    super.connectedCallback();
    window.addEventListener('keydown', this.handleKeyDown);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('keydown', this.handleKeyDown);
  }

  override render() {
    // Apply width to host specifically
    this.style.width = `${this.width}px`;

    return html`
      <div class="drawer">
        <div class="drawer-header">
          <h2>${this.title}</h2>
          <button class="close-button" @click=${(e: Event) => this.handleClose(e)}>×</button>
        </div>
        <div class="drawer-content">
          ${this.loading ? html`
            <loading-state message="Loading details..."></loading-state>
          ` : html`
            <slot></slot>
          `}
        </div>
        ${this.hasFooter ? html`
          <div class="drawer-footer">
            <slot name="footer"></slot>
          </div>
        ` : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'detail-drawer': DetailDrawer;
  }
}
