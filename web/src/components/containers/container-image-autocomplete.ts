import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('container-image-autocomplete')
export class ContainerImageAutocomplete extends LitElement {
  @property({ type: String }) value = '';
  @property({ type: Array }) suggestions: string[] = [];
  @property({ type: String }) placeholder = 'e.g. nginx:latest';
  @property({ type: Boolean }) disabled = false;

  @state() private open = false;
  @state() private highlightIndex = -1;

  static override styles = css`
    :host {
      display: block;
    }

    .wrapper {
      position: relative;
    }

    .input {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--vscode-input-border, #858585);
      border-radius: 4px;
      background: var(--vscode-input-background, #3c3c3c);
      color: var(--vscode-input-foreground, #cccccc);
      font-size: 13px;
      font-family: inherit;
      transition: all 0.2s;
      outline: none;
      box-sizing: border-box;
    }

    .input:focus {
      outline: none;
      border-color: var(--vscode-focusBorder, #007acc);
      box-shadow: 0 0 0 1px var(--vscode-focusBorder, #007acc);
    }

    .input:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .input::placeholder {
      color: var(--vscode-input-placeholderForeground, rgba(204, 204, 204, 0.6));
    }

    .dropdown {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      background: var(--vscode-editorWidget-background, var(--vscode-editor-background, #1e1e1e));
      border: 1px solid var(--vscode-input-border, #858585);
      border-radius: 4px;
      max-height: 260px;
      overflow: auto;
      z-index: 1000;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
    }

    .row {
      padding: 8px 10px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .row:hover,
    .row.highlight {
      background: var(--vscode-list-hoverBackground, rgba(255, 255, 255, 0.08));
    }

    .primary {
      font-size: 13px;
      color: var(--vscode-foreground, #e0e0e0);
      line-height: 1.2;
      word-break: break-all;
    }

    .secondary {
      font-size: 12px;
      color: var(--vscode-descriptionForeground, #b5b5b5);
      line-height: 1.2;
    }

    .status {
      padding: 8px 10px;
      font-size: 12px;
      color: var(--vscode-descriptionForeground, #b5b5b5);
    }
  `;

  private dispatchChange() {
    this.dispatchEvent(
      new CustomEvent('image-change', {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private handleFocus() {
    this.open = true;
  }

  private handleBlur() {
    window.setTimeout(() => {
      this.open = false;
      this.highlightIndex = -1;
    }, 150);
  }

  private handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.value = target.value;
    this.open = true;
    this.highlightIndex = -1;
    this.dispatchChange();
  }

  private handleKeydown(event: KeyboardEvent) {
    if (!this.open || this.filteredSuggestions.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.highlightIndex = (this.highlightIndex + 1) % this.filteredSuggestions.length;
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.highlightIndex =
        (this.highlightIndex - 1 + this.filteredSuggestions.length) %
        this.filteredSuggestions.length;
    } else if (event.key === 'Enter') {
      if (this.highlightIndex >= 0 && this.highlightIndex < this.filteredSuggestions.length) {
        event.preventDefault();
        const selected = this.filteredSuggestions[this.highlightIndex];
        if (selected) {
          this.selectSuggestion(selected);
        }
      }
    } else if (event.key === 'Escape') {
      this.open = false;
      this.highlightIndex = -1;
    }
  }

  private selectSuggestion(value: string) {
    this.value = value;
    this.dispatchChange();
    this.open = false;
    this.highlightIndex = -1;
  }

  private get filteredSuggestions(): string[] {
    const items = (this.suggestions || []).filter(Boolean);
    const query = (this.value || '').trim().toLowerCase();

    if (!query) {
      return items.slice(0, 20);
    }

    const score = (value: string): number => {
      const lower = value.toLowerCase();
      if (lower === query) return 0;
      if (lower.startsWith(query)) return 1;
      if (lower.includes(query)) return 2;
      return 3;
    };

    const matches = items.filter((item) => item.toLowerCase().includes(query));
    matches.sort((a, b) => score(a) - score(b));
    return matches.slice(0, 20);
  }

  override render() {
    const suggestions = this.filteredSuggestions;

    return html`
      <div class="wrapper">
        <input
          class="input"
          .value=${this.value}
          .placeholder=${this.placeholder}
          ?disabled=${this.disabled}
          @focus=${this.handleFocus}
          @blur=${this.handleBlur}
          @input=${this.handleInput}
          @keydown=${this.handleKeydown}
        />
        ${this.open ? html`
          <div class="dropdown">
            ${suggestions.length === 0
              ? html`<div class="status">No matches</div>`
              : suggestions.map((suggestion, index) => html`
                  <div
                    class="row ${index === this.highlightIndex ? 'highlight' : ''}"
                    @mousedown=${() => this.selectSuggestion(suggestion)}
                  >
                    <div class="primary">${suggestion}</div>
                  </div>
                `)
            }
          </div>
        ` : ''}
      </div>
    `;
  }
}
