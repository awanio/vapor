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
      background: var(--cds-field, #262626);
      color: var(--cds-text-primary);
      border: none;
      border-bottom: 2px solid var(--cds-border-subtle);
      padding: 0 16px;
      height: 40px;
      border-radius: 0;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 120px;
      font-size: 14px;
      letter-spacing: 0.16px;
      transition: all 0.15s;
      font-family: var(--cds-font-sans);
    }

    .dropdown-toggle:hover {
      background: var(--cds-field-hover, #353535);
    }

    .dropdown-toggle.open {
      border-bottom-color: var(--cds-focus, #0f62fe);
    }

    .dropdown-label {
      flex: 1;
      text-align: left;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .filter-icon {
      width: 14px;
      height: 14px;
      opacity: 0.8;
    }

    .dropdown-icon {
      transition: transform 0.15s;
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
      margin-top: 0;
      background: var(--cds-layer-01);
      border: 1px solid var(--cds-border-subtle);
      border-radius: 0;
      box-shadow: var(--cds-shadow-raised, 0 2px 6px rgba(0, 0, 0, 0.3));
      z-index: 1000;
      min-width: 150px;
      max-height: 300px;
      overflow-y: auto;
    }

    .filter-option {
      padding: 0 16px;
      height: 40px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: background-color 0.15s;
      font-size: 14px;
      letter-spacing: 0.16px;
      color: var(--cds-text-primary);
      white-space: nowrap;
    }

    .filter-option:hover {
      background: var(--cds-layer-02);
    }

    .filter-option.selected {
      background: var(--vscode-sidebar-active);
      color: var(--cds-interactive);
    }

    .option-icon {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
    }

    .option-count {
      margin-left: auto;
      font-size: 12px;
      letter-spacing: 0.32px;
      opacity: 0.7;
      background: var(--cds-layer-02);
      color: var(--cds-text-secondary);
      padding: 2px 8px;
      border-radius: 24px;
    }

    /* Status-specific styling */
    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .status-indicator.all { background: var(--cds-text-secondary); }
    .status-indicator.running { background: var(--cds-support-info); }
    .status-indicator.successful { background: var(--cds-support-success); }
    .status-indicator.failed { background: var(--cds-support-error); }
    .status-indicator.canceled { background: var(--cds-text-disabled); }
    .status-indicator.pending { background: var(--cds-support-warning); }

    /* Scrollbar styling */
    .dropdown-menu::-webkit-scrollbar {
      width: 8px;
    }

    .dropdown-menu::-webkit-scrollbar-track {
      background: transparent;
    }

    .dropdown-menu::-webkit-scrollbar-thumb {
      background: var(--cds-border-subtle);
      border-radius: 0;
    }

    .dropdown-menu::-webkit-scrollbar-thumb:hover {
      background: var(--cds-text-secondary);
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
