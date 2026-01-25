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
      background: var(--vscode-editor-background, var(--vscode-bg-light));
      border-left: 1px solid var(--vscode-border);
      box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;
      transform: translateX(100%);
      transition: transform 0.3s ease;
    }

    :host([show]) .drawer {
      transform: translateX(0);
    }

    .close-button {
      position: absolute;
      top: 16px;
      right: 16px;
      background: none;
      border: none;
      cursor: pointer;
      color: var(--vscode-text);
      font-size: 18px;
      padding: 4px;
      border-radius: 4px;
      transition: background-color 0.2s;
      z-index: 10;
    }

    .close-button:hover {
      background-color: var(--hover-bg);
    }

    .drawer-header {
      padding: 20px;
      border-bottom: 1px solid var(--vscode-border);
      flex-shrink: 0;
      position: relative;
    }

    h2 {
      margin: 0;
      padding: 0;
      font-size: 18px;
      font-weight: 600;
      color: var(--vscode-text);
    }

    .drawer-content {
      font-size: 0.875rem;
      flex: 1;
      overflow-y: auto;
      padding: 20px;
    }

    .drawer-footer {
      padding: 16px 20px;
      background: var(--vscode-bg-lighter, #252526);
      border-top: 1px solid var(--vscode-border);
      display: flex;
      justify-content: flex-end;
      gap: 12px;
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
