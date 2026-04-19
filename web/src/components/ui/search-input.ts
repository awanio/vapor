import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('search-input')
export class SearchInput extends LitElement {
  @property({ type: String }) value = '';
  @property({ type: String }) placeholder = 'Search...';
  @property({ type: Number }) width = 250;
  @property({ type: Boolean }) disabled = false;

  static override styles = css`
    .search-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      max-width: 400px;
    }

    .search-icon {
      position: absolute;
      left: 16px;
      color: var(--cds-text-placeholder, #6f6f6f);
      pointer-events: none;
      width: 16px;
      height: 16px;
    }

    .search-input {
      padding: 0 16px 0 40px;
      height: 40px;
      border: none;
      border-bottom: 2px solid var(--cds-border-subtle, #393939);
      border-radius: 0;
      background-color: var(--cds-field, #262626);
      color: var(--cds-text-primary, #f4f4f4);
      font-size: 14px;
      font-family: var(--cds-font-sans);
      letter-spacing: 0.16px;
      transition: border-color 0.15s;
      outline: none;
    }

    .search-input:hover:not(:disabled) {
      background-color: var(--cds-field-hover, #353535);
    }

    .search-input:focus {
      border-bottom-color: var(--cds-focus, #0f62fe);
    }

    .search-input::placeholder {
      color: var(--cds-text-placeholder, #6f6f6f);
    }

    .search-input:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `;

  private handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.value = target.value;
    this.dispatchEvent(new CustomEvent('search-change', {
      detail: { value: this.value },
      bubbles: true,
      composed: true
    }));
  }

  override render() {
    return html`
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
}

declare global {
  interface HTMLElementTagNameMap {
    'search-input': SearchInput;
  }
}
