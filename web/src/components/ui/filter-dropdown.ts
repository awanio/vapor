import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

/**
 * Filter dropdown component for filtering lists by status or other criteria
 * @element filter-dropdown
 * 
 * @fires filter-change - Fired when a filter option is selected
 * 
 * @csspart dropdown - The dropdown container
 * @csspart toggle - The dropdown toggle button
 * @csspart menu - The dropdown menu
 * @csspart option - Individual filter options
 * @csspart option-selected - Selected filter option
 */
@customElement('filter-dropdown')
export class FilterDropdown extends LitElement {
  static override styles = css`
    :host {
      display: inline-block;
      position: relative;
    }

    .dropdown {
      position: relative;
    }

    .dropdown-toggle {
      background: var(--vscode-button-secondaryBackground, #3a3a3a);
      color: var(--vscode-button-secondaryForeground, #cccccc);
      border: 1px solid var(--vscode-button-border, #555555);
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 120px;
      font-size: 13px;
      transition: all 0.2s;
    }

    .dropdown-toggle:hover {
      background: var(--vscode-button-secondaryHoverBackground, #45494e);
    }

    .dropdown-toggle.open {
      background: var(--vscode-button-background, #0e639c);
      color: var(--vscode-button-foreground, #ffffff);
      border-color: var(--vscode-focusBorder, #007acc);
    }

    .dropdown-label {
      flex: 1;
      text-align: left;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .filter-icon {
      width: 14px;
      height: 14px;
      opacity: 0.8;
    }

    .dropdown-icon {
      transition: transform 0.2s;
      width: 12px;
      height: 12px;
    }

    .dropdown-toggle.open .dropdown-icon {
      transform: rotate(180deg);
    }

    .dropdown-menu {
      position: absolute;
      top: 100%;
      left: 0;
      margin-top: 4px;
      background: var(--vscode-dropdown-background, #252526);
      border: 1px solid var(--vscode-dropdown-border, #454545);
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
      z-index: 1000;
      min-width: 150px;
      max-height: 300px;
      overflow-y: auto;
    }

    .filter-option {
      padding: 8px 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: background-color 0.2s;
      font-size: 13px;
      white-space: nowrap;
    }

    .filter-option:hover {
      background: var(--vscode-list-hoverBackground, #2a2d2e);
    }

    .filter-option.selected {
      background: var(--vscode-list-activeSelectionBackground, #094771);
      color: var(--vscode-list-activeSelectionForeground, #ffffff);
    }

    .option-icon {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
    }

    .option-count {
      margin-left: auto;
      font-size: 11px;
      opacity: 0.7;
      background: var(--vscode-badge-background, #4d4d4d);
      color: var(--vscode-badge-foreground, #ffffff);
      padding: 2px 6px;
      border-radius: 10px;
    }

    /* Status-specific styling */
    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .status-indicator.all {
      background: #888;
    }

    .status-indicator.running {
      background: #1e88e5;
    }

    .status-indicator.successful {
      background: #43a047;
    }

    .status-indicator.failed {
      background: #e53935;
    }

    .status-indicator.canceled {
      background: #757575;
    }

    .status-indicator.pending {
      background: #ffa726;
    }

    /* Scrollbar styling */
    .dropdown-menu::-webkit-scrollbar {
      width: 6px;
    }

    .dropdown-menu::-webkit-scrollbar-track {
      background: transparent;
    }

    .dropdown-menu::-webkit-scrollbar-thumb {
      background: var(--vscode-scrollbarSlider-background, #424242);
      border-radius: 3px;
    }

    .dropdown-menu::-webkit-scrollbar-thumb:hover {
      background: var(--vscode-scrollbarSlider-hoverBackground, #4e4e4e);
    }
  `;

  @property({ type: Array }) 
  options: Array<{
    value: string;
    label: string;
    icon?: string;
    count?: number;
  }> = [];

  @property({ type: String }) selectedValue = '';
  @property({ type: String }) label = 'Filter';
  @property({ type: Boolean }) showIcon = true;
  @property({ type: Boolean }) showCounts = false;
  @property({ type: Boolean }) showStatusIndicators = false;

  @state() private isOpen = false;

  override render() {
    const selectedOption = this.options.find(opt => opt.value === this.selectedValue);
    const displayLabel = selectedOption?.label || this.label;

    return html`
      <div class="dropdown" part="dropdown">
        <button
          class="dropdown-toggle ${this.isOpen ? 'open' : ''}"
          part="toggle"
          @click=${this.toggleDropdown}
          aria-expanded=${this.isOpen}
          aria-haspopup="listbox"
        >
          <span class="dropdown-label">
            ${this.showIcon ? html`
              <svg class="filter-icon" viewBox="0 0 16 16" fill="currentColor">
                <path d="M6 10.5a.5.5 0 01.5-.5h3a.5.5 0 010 1h-3a.5.5 0 01-.5-.5zm-2-3a.5.5 0 01.5-.5h7a.5.5 0 010 1h-7a.5.5 0 01-.5-.5zm-2-3a.5.5 0 01.5-.5h11a.5.5 0 010 1h-11a.5.5 0 01-.5-.5z"/>
              </svg>
            ` : ''}
            ${displayLabel}
          </span>
          <svg class="dropdown-icon" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4 6l4 4 4-4z"/>
          </svg>
        </button>

        ${this.isOpen ? html`
          <div class="dropdown-menu" part="menu" @click=${(e: Event) => e.stopPropagation()}>
            ${this.options.map(option => html`
              <div
                class="filter-option ${this.selectedValue === option.value ? 'selected' : ''}"
                part="option ${this.selectedValue === option.value ? 'option-selected' : ''}"
                @click=${() => this.selectOption(option.value)}
                role="option"
                aria-selected=${this.selectedValue === option.value}
              >
                ${this.showStatusIndicators ? html`
                  <span class="status-indicator ${option.value}"></span>
                ` : option.icon ? html`
                  <span class="option-icon">${option.icon}</span>
                ` : ''}
                <span>${option.label}</span>
                ${this.showCounts && option.count !== undefined ? html`
                  <span class="option-count">${option.count}</span>
                ` : ''}
              </div>
            `)}
          </div>
        ` : ''}
      </div>
    `;
  }

  private toggleDropdown(e: Event) {
    e.stopPropagation();
    this.isOpen = !this.isOpen;

    if (this.isOpen) {
      // Add click outside listener
      setTimeout(() => {
        document.addEventListener('click', this.handleClickOutside);
      }, 0);
    } else {
      document.removeEventListener('click', this.handleClickOutside);
    }
  }

  private handleClickOutside = (e: Event) => {
    if (!this.contains(e.target as Node)) {
      this.closeDropdown();
    }
  };

  private closeDropdown() {
    this.isOpen = false;
    document.removeEventListener('click', this.handleClickOutside);
  }

  private selectOption(value: string) {
    if (this.selectedValue !== value) {
      this.selectedValue = value;
      this.dispatchEvent(new CustomEvent('filter-change', {
        detail: { value },
        bubbles: true,
        composed: true
      }));
    }
    this.closeDropdown();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this.handleClickOutside);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'filter-dropdown': FilterDropdown;
  }
}
