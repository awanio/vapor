import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

export interface ActionItem {
  label: string;
  action: string;
  danger?: boolean;
  icon?: string;
  disabled?: boolean;
}

@customElement('action-dropdown')
export class ActionDropdown extends LitElement {
  @property({ type: Array }) actions: ActionItem[] = [];
  @property({ type: String }) menuId: string = '';
  @state() private isOpen = false;

  static override styles = css`
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
      position: absolute;
      right: 0;
      top: 100%;
      margin-top: 4px;
      background: var(--vscode-dropdown-background, var(--vscode-menu-background, var(--vscode-bg-light, #252526)));
      border: 1px solid var(--vscode-dropdown-border, var(--vscode-menu-border, var(--border-color, #454545)));
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      min-width: 160px;
      z-index: 1000;
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

  override connectedCallback() {
    super.connectedCallback();
    document.addEventListener('click', this.handleOutsideClick);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this.handleOutsideClick);
  }

  private handleOutsideClick = (event: MouseEvent) => {
    if (!this.contains(event.target as Node)) {
      this.isOpen = false;
    }
  };

  private toggleMenu(event: MouseEvent) {
    event.stopPropagation();
    this.isOpen = !this.isOpen;
  }

  private handleAction(event: MouseEvent, action: ActionItem) {
    event.stopPropagation();
    if (action.disabled) return;
    
    this.isOpen = false;
    this.dispatchEvent(new CustomEvent('action-click', {
      detail: { action: action.action },
      bubbles: true,
      composed: true
    }));
  }

  override render() {
    return html`
      <button class="action-dots" @click=${this.toggleMenu}>⋮</button>
      <div class="action-dropdown ${this.isOpen ? 'show' : ''}" id="${this.menuId}">
        ${this.actions.map(action => html`
          <button 
            class="${action.danger ? 'danger' : ''}"
            ?disabled=${action.disabled}
            @click=${(e: MouseEvent) => this.handleAction(e, action)}
          >
            ${action.icon ? html`<span class="icon">${action.icon}</span>` : ''}
            ${action.label}
          </button>
        `)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'action-dropdown': ActionDropdown;
  }
}
