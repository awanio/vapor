var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
let SearchInput = class SearchInput extends LitElement {
    constructor() {
        super(...arguments);
        this.value = '';
        this.placeholder = 'Search...';
        this.width = 250;
        this.disabled = false;
    }
    handleInput(event) {
        const target = event.target;
        this.value = target.value;
        this.dispatchEvent(new CustomEvent('search-change', {
            detail: { value: this.value },
            bubbles: true,
            composed: true
        }));
    }
    render() {
        return html `
      <div class="search-wrapper">
        <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
        <input 
          class="search-input"
          type="text" 
          placeholder="${this.placeholder}"
          .value="${this.value}"
          ?disabled="${this.disabled}"
          @input="${this.handleInput}"
          style="width: ${this.width}px"
        />
      </div>
    `;
    }
};
SearchInput.styles = css `
    .search-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      max-width: 400px;
    }

    .search-icon {
      position: absolute;
      left: 12px;
      color: var(--vscode-input-placeholderForeground, #999);
      pointer-events: none;
      width: 16px;
      height: 16px;
    }

    .search-input {
      padding: 6px 12px 6px 32px;
      border: 1px solid var(--vscode-widget-border, var(--vscode-input-border, var(--vscode-panel-border, #454545)));
      border-radius: 4px;
      background-color: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      font-size: 0.875rem;
      transition: all 0.2s;
      outline: none;
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.08);
    }

    .search-input:hover:not(:disabled) {
      border-color: var(--vscode-inputOption-hoverBorder, var(--vscode-widget-border, #858585));
    }

    .search-input:focus {
      border-color: var(--vscode-focusBorder, #007acc);
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1), 0 0 0 1px var(--vscode-focusBorder, #007acc);
    }

    .search-input::placeholder {
      color: var(--vscode-input-placeholderForeground, #999);
      opacity: 0.7;
    }

    .search-input:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `;
__decorate([
    property({ type: String })
], SearchInput.prototype, "value", void 0);
__decorate([
    property({ type: String })
], SearchInput.prototype, "placeholder", void 0);
__decorate([
    property({ type: Number })
], SearchInput.prototype, "width", void 0);
__decorate([
    property({ type: Boolean })
], SearchInput.prototype, "disabled", void 0);
SearchInput = __decorate([
    customElement('search-input')
], SearchInput);
export { SearchInput };
//# sourceMappingURL=search-input.js.map