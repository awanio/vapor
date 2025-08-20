var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
let DetailDrawer = class DetailDrawer extends LitElement {
    constructor() {
        super(...arguments);
        this.title = '';
        this.show = false;
        this.loading = false;
        this.width = 600;
        this.handleKeyDown = (event) => {
            if (event.key === 'Escape' && this.show) {
                this.handleClose();
            }
        };
    }
    handleClose() {
        this.dispatchEvent(new CustomEvent('close', {
            bubbles: true,
            composed: true
        }));
    }
    connectedCallback() {
        super.connectedCallback();
        window.addEventListener('keydown', this.handleKeyDown);
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        window.removeEventListener('keydown', this.handleKeyDown);
    }
    render() {
        if (!this.show) {
            return null;
        }
        return html `
      <div class="drawer" style="width: ${this.width}px">
        <div class="drawer-header">
          <button class="close-button" @click=${this.handleClose}>×</button>
          <h2>${this.title}</h2>
        </div>
        <div class="drawer-content">
          ${this.loading ? html `
            <loading-state message="Loading details..."></loading-state>
          ` : html `
            <slot></slot>
          `}
        </div>
      </div>
    `;
    }
};
DetailDrawer.styles = css `
    .drawer {
      position: fixed;
      top: 0;
      right: 0;
      height: 100vh;
      background: var(--vscode-editor-background, var(--vscode-bg-light));
      border-left: 0.5px solid var(--vscode-widget-border, var(--vscode-panel-border, #454545));
      box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
      z-index: 1001;
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
      border-bottom: 1px solid var(--vscode-widget-border, var(--vscode-panel-border, #454545));
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
__decorate([
    property({ type: String })
], DetailDrawer.prototype, "title", void 0);
__decorate([
    property({ type: Boolean })
], DetailDrawer.prototype, "show", void 0);
__decorate([
    property({ type: Boolean })
], DetailDrawer.prototype, "loading", void 0);
__decorate([
    property({ type: Number })
], DetailDrawer.prototype, "width", void 0);
DetailDrawer = __decorate([
    customElement('detail-drawer')
], DetailDrawer);
export { DetailDrawer };
//# sourceMappingURL=detail-drawer.js.map