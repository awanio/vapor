var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
let StatusBadge = class StatusBadge extends LitElement {
    constructor() {
        super(...arguments);
        this.status = 'unknown';
    }
    render() {
        const displayText = this.text || this.status;
        const statusClass = this.status.toLowerCase();
        return html `
      <span class="status ${statusClass}">${displayText}</span>
    `;
    }
};
StatusBadge.styles = css `
    .status {
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
      text-transform: uppercase;
      display: inline-block;
    }

    .status.running,
    .status.active,
    .status.deployed,
    .status.bound,
    .status.available,
    .status.ready {
      background-color: rgba(34, 197, 94, 0.1);
      color: rgb(34, 197, 94);
    }

    .status.pending {
      background-color: rgba(251, 191, 36, 0.1);
      color: rgb(251, 191, 36);
    }

    .status.failed,
    .status.error {
      background-color: rgba(239, 68, 68, 0.1);
      color: rgb(239, 68, 68);
    }

    .status.enforced {
      background-color: rgba(59, 130, 246, 0.1);
      color: rgb(59, 130, 246);
    }

    .status.suspended {
      background-color: rgba(156, 163, 175, 0.1);
      color: rgb(156, 163, 175);
    }

    .status.unknown {
      background-color: rgba(107, 114, 128, 0.1);
      color: rgb(107, 114, 128);
    }
  `;
__decorate([
    property({ type: String })
], StatusBadge.prototype, "status", void 0);
__decorate([
    property({ type: String })
], StatusBadge.prototype, "text", void 0);
StatusBadge = __decorate([
    customElement('status-badge')
], StatusBadge);
export { StatusBadge };
//# sourceMappingURL=status-badge.js.map