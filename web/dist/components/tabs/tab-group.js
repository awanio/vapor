var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
let TabGroup = class TabGroup extends LitElement {
    constructor() {
        super(...arguments);
        this.tabs = [];
        this.activeTab = '';
    }
    handleTabClick(tab) {
        this.activeTab = tab.id;
        this.dispatchEvent(new CustomEvent('tab-change', {
            detail: { tabId: tab.id },
            bubbles: true,
            composed: true
        }));
    }
    render() {
        return html `
      <div class="tab-header">
        ${this.tabs.map(tab => html `
          <button 
            class="tab-button ${this.activeTab === tab.id ? 'active' : ''}"
            @click=${() => this.handleTabClick(tab)}
          >
            ${tab.icon ? html `<span class="tab-icon">${tab.icon}</span>` : ''}
            ${tab.label}
          </button>
        `)}
      </div>
    `;
    }
};
TabGroup.styles = css `
    .tab-header {
      display: flex;
      border-bottom: 2px solid var(--border-color);
      margin-bottom: 1rem;
    }

    .tab-button {
      padding: 0.75rem 1.5rem;
      background: none;
      border: none;
      cursor: pointer;
      font-size: 0.875rem;
      color: var(--text-secondary);
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .tab-button:hover {
      color: var(--text-primary);
    }

    .tab-button.active {
      color: var(--primary);
      border-bottom-color: var(--primary);
    }

    .tab-icon {
      font-size: 1rem;
    }
  `;
__decorate([
    property({ type: Array })
], TabGroup.prototype, "tabs", void 0);
__decorate([
    property({ type: String })
], TabGroup.prototype, "activeTab", void 0);
TabGroup = __decorate([
    customElement('tab-group')
], TabGroup);
export { TabGroup };
//# sourceMappingURL=tab-group.js.map