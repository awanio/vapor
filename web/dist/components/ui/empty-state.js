var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
let EmptyState = class EmptyState extends LitElement {
    constructor() {
        super(...arguments);
        this.message = 'No data available';
        this.icon = '📭';
        this.actionLabel = '';
    }
    handleAction() {
        this.dispatchEvent(new CustomEvent('action-click', {
            bubbles: true,
            composed: true
        }));
    }
    render() {
        return html `
      <div class="empty-state">
        <div class="icon">${this.icon}</div>
        <div class="message">${this.message}</div>
        ${this.actionLabel ? html `
          <div class="action">
            <button @click="${this.handleAction}">${this.actionLabel}</button>
          </div>
        ` : ''}
      </div>
    `;
    }
};
EmptyState.styles = css `
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
__decorate([
    property({ type: String })
], EmptyState.prototype, "message", void 0);
__decorate([
    property({ type: String })
], EmptyState.prototype, "icon", void 0);
__decorate([
    property({ type: String })
], EmptyState.prototype, "actionLabel", void 0);
EmptyState = __decorate([
    customElement('empty-state')
], EmptyState);
export { EmptyState };
//# sourceMappingURL=empty-state.js.map