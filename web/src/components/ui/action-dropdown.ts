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
  @state() private dropdownPosition = { top: 0, left: 0 };
  private dropdownElement: HTMLDivElement | null = null;

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
      color: var(--vscode-foreground, #cccccc);
      font-size: 18px;
      line-height: 1;
      transition: background-color 0.2s;
      border-radius: 4px;
      position: relative;
      z-index: 1;
    }

    .action-dots:hover {
      background-color: var(--vscode-toolbar-hoverBackground, var(--vscode-list-hoverBackground, rgba(90, 93, 94, 0.1)));
    }
  `;

  override connectedCallback() {
    super.connectedCallback();
    document.addEventListener('click', this.handleOutsideClick);
    window.addEventListener('scroll', this.handleScroll, true);
    window.addEventListener('resize', this.handleResize);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this.handleOutsideClick);
    window.removeEventListener('scroll', this.handleScroll, true);
    window.removeEventListener('resize', this.handleResize);
    this.removeDropdown();
  }

  private handleOutsideClick = (event: MouseEvent) => {
    const target = event.target as Node;
    if (!this.contains(target) && !this.dropdownElement?.contains(target)) {
      this.closeDropdown();
    }
  };

  private handleScroll = () => {
    // Close dropdown on scroll to prevent position mismatch
    if (this.isOpen) {
      this.closeDropdown();
    }
  };

  private handleResize = () => {
    // Close dropdown on resize to prevent position mismatch
    if (this.isOpen) {
      this.closeDropdown();
    }
  };

  private createDropdown() {
    if (this.dropdownElement) return;

    this.dropdownElement = document.createElement('div');
    this.dropdownElement.className = 'action-dropdown-portal';
    this.dropdownElement.style.cssText = `
      position: fixed;
      top: ${this.dropdownPosition.top}px;
      left: ${this.dropdownPosition.left}px;
      background: var(--vscode-menu-background, var(--vscode-editorWidget-background, var(--vscode-bg-light)));
      border: 1px solid var(--vscode-menu-border, #464647);
      border-radius: 4px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
      min-width: 160px;
      z-index: 99999;
      display: block;
      overflow: hidden;
    `;

    this.dropdownElement.innerHTML = this.actions.map(action => `
      <button 
        data-action="${action.action}"
        class="${action.danger ? 'danger' : ''}"
        ${action.disabled ? 'disabled' : ''}
        style="
          display: block;
          width: 100%;
          text-align: left;
          padding: 8px 16px;
          border: none;
          background: none;
          color: ${action.danger ? 'var(--vscode-inputValidation-errorForeground, #f14c4c)' : 'var(--vscode-foreground, #cccccc)'};
          cursor: ${action.disabled ? 'not-allowed' : 'pointer'};
          font-size: 13px;
          opacity: ${action.disabled ? '0.5' : '1'};
        "
      >
        ${action.icon ? `<span style="margin-right: 8px;">${action.icon}</span>` : ''}
        ${action.label}
      </button>
    `).join('');

    // Add event listeners to buttons
    this.dropdownElement.querySelectorAll('button').forEach(button => {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        const actionName = button.getAttribute('data-action');
        if (actionName && !button.hasAttribute('disabled')) {
          this.handleActionClick(actionName);
        }
      });
      button.addEventListener('mouseenter', () => {
        if (!button.hasAttribute('disabled')) {
          button.style.backgroundColor = 'var(--vscode-list-hoverBackground, rgba(0, 0, 0, 0.08))';
        }
      });
      button.addEventListener('mouseleave', () => {
        button.style.backgroundColor = 'transparent';
      });
    });

    document.body.appendChild(this.dropdownElement);
  }

  private removeDropdown() {
    if (this.dropdownElement) {
      this.dropdownElement.remove();
      this.dropdownElement = null;
    }
  }

  private closeDropdown() {
    this.isOpen = false;
    this.removeDropdown();
  }

  private handleActionClick(action: string) {
    this.closeDropdown();
    this.dispatchEvent(new CustomEvent('action-click', {
      detail: { action },
      bubbles: true,
      composed: true
    }));
  }

  private toggleMenu = (event: MouseEvent) => {
    event.stopPropagation();
    
    if (!this.isOpen) {
      // Calculate position for fixed dropdown
      const button = event.currentTarget as HTMLElement;
      const rect = button.getBoundingClientRect();
      
      // Simple positioning - just put it below and to the left of the button
      const top = rect.bottom + 4;
      const left = rect.left - 100; // Position to the left of the button
      
      this.dropdownPosition = { top, left };
      
      this.isOpen = true;
      // Create dropdown in light DOM
      setTimeout(() => this.createDropdown(), 0);
    } else {
      this.closeDropdown();
    }
  }

  // This method is now replaced by handleActionClick

  override render() {
    // Dropdown is now rendered in light DOM via createDropdown()
    return html`
      <button class="action-dots" @click=${this.toggleMenu}>⋮</button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'action-dropdown': ActionDropdown;
  }
}
