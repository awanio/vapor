import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

/**
 * Namespace dropdown component for filtering Kubernetes resources
 * @element namespace-dropdown
 * 
 * @fires namespace-change - Fired when a namespace is selected
 * 
 * @csspart dropdown - The dropdown container
 * @csspart toggle - The dropdown toggle button
 * @csspart menu - The dropdown menu
 * @csspart search - The search input
 * @csspart option - Individual namespace options
 * @csspart option-selected - Selected namespace option
 */
@customElement('namespace-dropdown')
export class NamespaceDropdown extends LitElement {
  static override styles = css`
    :host {
      display: inline-block;
      position: relative;
    }

    .dropdown {
      position: relative;
    }

    .dropdown-toggle {
      background: var(--dropdown-bg, #2c2f3a);
      color: var(--dropdown-color, #e0e0e0);
      border: 1px solid var(--dropdown-border, #3a3d4a);
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 200px;
      font-size: 14px;
      transition: all 0.2s;
    }

    .dropdown-toggle:hover {
      background: var(--dropdown-hover-bg, #3a3d4a);
      border-color: var(--dropdown-hover-border, #4a4d5a);
    }

    .dropdown-toggle.open {
      background: var(--dropdown-active-bg, #3a3d4a);
      border-color: var(--dropdown-active-border, #4a7c59);
    }

    .dropdown-label {
      flex: 1;
      text-align: left;
    }

    .dropdown-icon {
      transition: transform 0.2s;
    }

    .dropdown-toggle.open .dropdown-icon {
      transform: rotate(180deg);
    }

    .dropdown-menu {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      margin-top: 4px;
      background: var(--menu-bg, #2c2f3a);
      border: 1px solid var(--menu-border, #3a3d4a);
      border-radius: 4px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
      z-index: 1000;
      max-height: 400px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .search-container {
      padding: 12px;
      border-bottom: 1px solid var(--menu-border, #3a3d4a);
    }

    .search-input {
      width: 100%;
      padding: 8px 12px;
      background: var(--input-bg, #1a1d23);
      color: var(--input-color, #e0e0e0);
      border: 1px solid var(--input-border, #3a3d4a);
      border-radius: 4px;
      font-size: 14px;
      outline: none;
    }

    .search-input:focus {
      border-color: var(--input-focus-border, #4a7c59);
    }

    .search-input::placeholder {
      color: var(--input-placeholder, #999);
    }

    .options-container {
      overflow-y: auto;
      max-height: 300px;
    }

    .namespace-option {
      padding: 10px 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: background-color 0.2s;
      font-size: 14px;
    }

    .namespace-option:hover {
      background: var(--option-hover-bg, #3a3d4a);
    }

    .namespace-option.selected {
      background: var(--option-selected-bg, #4a7c59);
      color: var(--option-selected-color, #fff);
    }

    .namespace-icon {
      width: 16px;
      height: 16px;
      opacity: 0.8;
    }

    .namespace-count {
      margin-left: auto;
      font-size: 12px;
      opacity: 0.7;
      background: var(--count-bg, rgba(255, 255, 255, 0.1));
      padding: 2px 8px;
      border-radius: 12px;
    }

    .no-results {
      padding: 20px;
      text-align: center;
      color: var(--no-results-color, #999);
      font-size: 14px;
    }

    .loading {
      padding: 20px;
      text-align: center;
      color: var(--loading-color, #999);
    }

    /* Scrollbar styling */
    .options-container::-webkit-scrollbar {
      width: 8px;
    }

    .options-container::-webkit-scrollbar-track {
      background: var(--scrollbar-track, #1a1d23);
    }

    .options-container::-webkit-scrollbar-thumb {
      background: var(--scrollbar-thumb, #4a4d5a);
      border-radius: 4px;
    }

    .options-container::-webkit-scrollbar-thumb:hover {
      background: var(--scrollbar-thumb-hover, #5a5d6a);
    }
  `;

  @property({ type: Array }) namespaces: Array<{name: string, count?: number}> = [];
  @property({ type: String }) selectedNamespace = 'All Namespaces';
  @property({ type: Boolean }) loading = false;
  @property({ type: String }) placeholder = 'Select namespace';
  @property({ type: Boolean }) showCounts = false;
  @property({ type: Boolean }) includeAllOption = true;

  @state() private isOpen = false;
  @state() private searchQuery = '';

  override render() {
    const filteredNamespaces = this.getFilteredNamespaces();

    return html`
      <div class="dropdown" part="dropdown">
        <button
          class="dropdown-toggle ${this.isOpen ? 'open' : ''}"
          part="toggle"
          @click=${this.toggleDropdown}
          aria-expanded=${this.isOpen}
          aria-haspopup="listbox"
        >
          <span class="dropdown-label">${this.selectedNamespace}</span>
          <svg class="dropdown-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4 6l4 4 4-4z"/>
          </svg>
        </button>

        ${this.isOpen ? html`
          <div class="dropdown-menu" part="menu" @click=${(e: Event) => e.stopPropagation()}>
            <div class="search-container">
              <input
                type="text"
                class="search-input"
                part="search"
                placeholder="Search namespaces..."
                .value=${this.searchQuery}
                @input=${this.handleSearch}
                @keydown=${this.handleKeydown}
              />
            </div>

            <div class="options-container">
              ${this.loading ? html`
                <div class="loading">Loading namespaces...</div>
              ` : filteredNamespaces.length === 0 ? html`
                <div class="no-results">No namespaces found</div>
              ` : html`
                ${this.includeAllOption ? html`
                  <div
                    class="namespace-option ${this.selectedNamespace === 'All Namespaces' ? 'selected' : ''}"
                    part="option ${this.selectedNamespace === 'All Namespaces' ? 'option-selected' : ''}"
                    @click=${() => this.selectNamespace('All Namespaces')}
                    role="option"
                    aria-selected=${this.selectedNamespace === 'All Namespaces'}
                  >
                    <svg class="namespace-icon" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 1a7 7 0 100 14A7 7 0 008 1zM3 8a5 5 0 119.9.3H9v-1h3.8A5 5 0 0111 4.2V8h-1V4.2A5 5 0 018 3a5 5 0 00-5 5z"/>
                    </svg>
                    <span>All Namespaces</span>
                  </div>
                ` : ''}
                ${filteredNamespaces.map(ns => html`
                  <div
                    class="namespace-option ${this.selectedNamespace === ns.name ? 'selected' : ''}"
                    part="option ${this.selectedNamespace === ns.name ? 'option-selected' : ''}"
                    @click=${() => this.selectNamespace(ns.name)}
                    role="option"
                    aria-selected=${this.selectedNamespace === ns.name}
                  >
                    <svg class="namespace-icon" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M2 2h12v12H2z" opacity="0.3"/>
                      <path d="M4 4h8v8H4z"/>
                    </svg>
                    <span>${ns.name}</span>
                    ${this.showCounts && ns.count !== undefined ? html`
                      <span class="namespace-count">${ns.count}</span>
                    ` : ''}
                  </div>
                `)}
              `}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  private getFilteredNamespaces() {
    if (!this.searchQuery) {
      return this.namespaces;
    }

    const query = this.searchQuery.toLowerCase();
    return this.namespaces.filter(ns => 
      ns.name.toLowerCase().includes(query)
    );
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
    this.searchQuery = '';
    document.removeEventListener('click', this.handleClickOutside);
  }

  private handleSearch(e: Event) {
    const input = e.target as HTMLInputElement;
    this.searchQuery = input.value;
  }

  private handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      this.closeDropdown();
    }
  }

  private selectNamespace(namespace: string) {
    if (this.selectedNamespace !== namespace) {
      this.selectedNamespace = namespace;
      this.dispatchEvent(new CustomEvent('namespace-change', {
        detail: { namespace },
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
    'namespace-dropdown': NamespaceDropdown;
  }
}
