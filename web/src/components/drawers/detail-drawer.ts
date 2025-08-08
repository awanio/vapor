import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('detail-drawer')
export class DetailDrawer extends LitElement {
  @property({ type: String }) override title = '';
  @property({ type: Boolean }) show = false;
  @property({ type: Boolean }) loading = false;
  @property({ type: Number }) width = 600;

  static override styles = css`
    .drawer {
      position: fixed;
      top: 0;
      right: 0;
      height: 100vh;
      background: var(--vscode-editor-background, var(--vscode-bg-light));
      border-left: 0.5px solid var(--vscode-widget-border, var(--vscode-panel-border, #454545));
      box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
      z-index: 1001;
      overflow-y: auto;
      padding: 20px;
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
      }
      to {
        transform: translateX(0);
      }
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
    }

    .close-button:hover {
      background-color: var(--hover-bg);
    }

    h2 {
      margin: 0 0 20px 0;
      padding: 0;
      font-size: 18px;
      font-weight: 600;
      color: var(--vscode-text);
    }

    .drawer-content {
      font-size: 0.875rem;
    }
  `;

  private handleClose() {
    this.dispatchEvent(new CustomEvent('close', {
      bubbles: true,
      composed: true
    }));
  }

  override render() {
    if (!this.show) {
      return null;
    }

    return html`
      <div class="drawer" style="width: ${this.width}px">
        <button class="close-button" @click=${this.handleClose}>×</button>
        <h2>${this.title}</h2>
        <div class="drawer-content">
          ${this.loading ? html`
            <loading-state message="Loading details..."></loading-state>
          ` : html`
            <slot></slot>
          `}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'detail-drawer': DetailDrawer;
  }
}
