var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
let ActionDropdown = class ActionDropdown extends LitElement {
    constructor() {
        super(...arguments);
        this.actions = [];
        this.menuId = '';
        this.isOpen = false;
        this.dropdownPosition = { top: 0, left: 0 };
        this.handleOutsideClick = (event) => {
            if (!this.contains(event.target)) {
                this.isOpen = false;
            }
        };
        this.handleScroll = () => {
            if (this.isOpen) {
                this.isOpen = false;
            }
        };
        this.handleResize = () => {
            if (this.isOpen) {
                this.isOpen = false;
            }
        };
    }
    connectedCallback() {
        super.connectedCallback();
        document.addEventListener('click', this.handleOutsideClick);
        window.addEventListener('scroll', this.handleScroll, true);
        window.addEventListener('resize', this.handleResize);
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        document.removeEventListener('click', this.handleOutsideClick);
        window.removeEventListener('scroll', this.handleScroll, true);
        window.removeEventListener('resize', this.handleResize);
    }
    toggleMenu(event) {
        event.stopPropagation();
        if (!this.isOpen) {
            const button = event.currentTarget;
            const rect = button.getBoundingClientRect();
            const dropdownWidth = 160;
            let left = rect.right - dropdownWidth;
            if (left < 10) {
                left = 10;
            }
            if (rect.right > window.innerWidth - 10) {
                left = window.innerWidth - dropdownWidth - 10;
            }
            let top = rect.bottom + 4;
            const dropdownHeight = this.actions.length * 40;
            if (top + dropdownHeight > window.innerHeight - 10) {
                top = rect.top - dropdownHeight - 4;
            }
            this.dropdownPosition = { top, left };
        }
        this.isOpen = !this.isOpen;
    }
    handleAction(event, action) {
        event.stopPropagation();
        if (action.disabled)
            return;
        this.isOpen = false;
        this.dispatchEvent(new CustomEvent('action-click', {
            detail: { action: action.action },
            bubbles: true,
            composed: true
        }));
    }
    render() {
        const dropdownStyle = this.isOpen
            ? `top: ${this.dropdownPosition.top}px; left: ${this.dropdownPosition.left}px;`
            : '';
        return html `
      <button class="action-dots" @click=${this.toggleMenu}>⋮</button>
      <div 
        class="action-dropdown ${this.isOpen ? 'show' : ''}" 
        id="${this.menuId}"
        style="${dropdownStyle}"
      >
        ${this.actions.map(action => html `
          <button 
            class="${action.danger ? 'danger' : ''}"
            ?disabled=${action.disabled}
            @click=${(e) => this.handleAction(e, action)}
          >
            ${action.icon ? html `<span class="icon">${action.icon}</span>` : ''}
            ${action.label}
          </button>
        `)}
      </div>
    `;
    }
};
ActionDropdown.styles = css `
    :host {
      position: relative;
      display: inline-block;
    }

    .action-dots {
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px 8px;
      color: var(--text-secondary);
      font-size: 18px;
      line-height: 1;
      transition: background-color 0.2s;
      border-radius: 4px;
    }

    .action-dots:hover {
      background-color: var(--vscode-toolbar-hoverBackground, var(--vscode-list-hoverBackground, rgba(90, 93, 94, 0.1)));
    }

    .action-dropdown {
      position: fixed;
      background: var(--vscode-dropdown-background, var(--vscode-menu-background, var(--vscode-bg-light, #252526)));
      border: 1px solid var(--vscode-dropdown-border, var(--vscode-menu-border, var(--border-color, #454545)));
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      min-width: 160px;
      z-index: 10000;
      display: none;
    }

    .action-dropdown.show {
      display: block;
    }

    .action-dropdown button {
      display: block;
      width: 100%;
      text-align: left;
      padding: 8px 16px;
      border: none;
      background: none;
      color: var(--vscode-menu-foreground, var(--vscode-foreground, var(--vscode-text, #cccccc)));
      cursor: pointer;
      font-size: 13px;
      transition: background-color 0.2s;
    }

    .action-dropdown button:hover:not(:disabled) {
      background-color: var(--vscode-list-hoverBackground, var(--vscode-toolbar-hoverBackground, rgba(255, 255, 255, 0.08)));
      color: var(--vscode-list-hoverForeground, var(--vscode-foreground));
    }

    .action-dropdown button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .action-dropdown button.danger {
      color: var(--vscode-error);
    }

    .icon {
      margin-right: 8px;
      font-size: 14px;
    }
  `;
__decorate([
    property({ type: Array })
], ActionDropdown.prototype, "actions", void 0);
__decorate([
    property({ type: String })
], ActionDropdown.prototype, "menuId", void 0);
__decorate([
    state()
], ActionDropdown.prototype, "isOpen", void 0);
__decorate([
    state()
], ActionDropdown.prototype, "dropdownPosition", void 0);
ActionDropdown = __decorate([
    customElement('action-dropdown')
], ActionDropdown);
export { ActionDropdown };
//# sourceMappingURL=action-dropdown.js.map