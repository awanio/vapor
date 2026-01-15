import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('detail-drawer')
export class DetailDrawer extends LitElement {
  @property({ type: String }) override title = '';
  @property({ type: Boolean }) show = false;
  @property({ type: Boolean }) loading = false;
  @property({ type: Number }) width = 600;

  @state() private isClosing = false;
  @state() private animationFinished = false;

  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && this.show) {
      // Stop propagation to prevent parent drawer from also closing
      event.stopPropagation();
      this.handleClose();
    }
  };

  static override styles = css`
    .drawer {
      position: fixed;
      top: 0;
      right: 0;
      height: 100vh;
      background: var(--vscode-editor-background, var(--vscode-bg-light));
      border-left: 1px solid var(--vscode-border);
      box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
      z-index: 2000;
      display: flex;
      flex-direction: column;
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

    @keyframes slideOut {
      from {
        transform: translateX(0);
      }
      to {
        transform: translateX(100%);
      }
    }

    .drawer.animation-finished { animation: none !important; transform: none !important; }
    .drawer.closing {
      animation: slideOut 0.3s ease-in forwards;
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

    .drawer-header {
      padding: 20px;
      border-bottom: 1px solid var(--vscode-border);
      flex-shrink: 0;
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
      padding-bottom: 40px; /* Extra padding at bottom to ensure last content is visible */
    }
  `;


  override updated(changedProperties: Map<string, any>) {
    if (changedProperties.has('show') && this.show) {
      this.animationFinished = false;
      setTimeout(() => {
        this.animationFinished = true;
      }, 300);
    }
  }

  private handleClose(event?: Event) {
    // Stop propagation if this was triggered by a UI event
    if (event) {
      event.stopPropagation();
    }

    if (this.isClosing) return; // Prevent double-close

    // Start close animation
    this.isClosing = true;

    // Wait for animation to complete before dispatching close event
    setTimeout(() => {
      this.isClosing = false;
      this.dispatchEvent(new CustomEvent('close', {
        bubbles: false,  // Don't bubble to prevent parent drawer from closing
        composed: true
      }));
    }, 300); // Match animation duration
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
    if (!this.show && !this.isClosing) {
      return null;
    }

    return html`
      <div class="drawer ${this.isClosing ? 'closing' : ''} ${this.animationFinished ? 'animation-finished' : ''}" style="width: ${this.width}px">
        <div class="drawer-header">
          <button class="close-button" @click=${(e: Event) => this.handleClose(e)}>×</button>
          <h2>${this.title}</h2>
        </div>
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
