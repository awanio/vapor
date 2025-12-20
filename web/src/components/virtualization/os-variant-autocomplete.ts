import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { virtualizationAPI } from '../../services/virtualization-api';
import type { OSVariant } from '../../types/virtualization';

@customElement('os-variant-autocomplete')
export class OSVariantAutocomplete extends LitElement {
  @property({ type: String }) value = '';
  /**
   * OS family filter. Typically driven by an "os_type" selector (e.g. linux/windows).
   */
  @property({ type: String }) family = '';
  @property({ type: String }) placeholder = 'e.g. ubuntu22.04';
  @property({ type: Boolean }) disabled = false;
  @property({ type: Number }) limit = 2000;

  @state() private loaded = false;
  @state() private loading = false;
  @state() private error: string | null = null;
  @state() private open = false;
  @state() private variants: OSVariant[] = [];
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

  override updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('family')) {
      // If the OS family filter changes, refresh suggestions.
      this.loaded = false;
      this.loading = false;
      this.error = null;
      this.variants = [];
      this.highlightIndex = -1;

      if (this.open) {
        void this.ensureLoaded();
      }
    }
  }

  private async ensureLoaded() {
    if (this.loaded || this.loading || this.disabled) return;

    this.loading = true;
    this.error = null;

    try {
      const { variants } = await virtualizationAPI.listOSVariants({
        family: this.family || undefined,
        limit: this.limit,
      });

      this.variants = variants;
      this.loaded = true;
    } catch (err: any) {
      // Do not block free-text entry if suggestions are unavailable.
      this.error = 'Suggestions unavailable';
      this.loaded = true;
      this.variants = [];
    } finally {
      this.loading = false;
    }
  }

  private get filteredVariants(): OSVariant[] {
    const q = (this.value || '').trim().toLowerCase();
    const items = this.variants || [];

    if (!q) return items.slice(0, 20);

    const score = (v: OSVariant): number => {
      const shortId = (v.short_id || '').toLowerCase();
      const name = (v.name || '').toLowerCase();
      if (shortId == q) return 0;
      if (name == q) return 1;
      if (shortId.startsWith(q)) return 2;
      if (name.startsWith(q)) return 3;
      if (shortId.includes(q)) return 4;
      if (name.includes(q)) return 5;
      return 6;
    }

    const matches = items.filter((v) => {
      const fields = [
        v.short_id,
        v.name,
        v.version,
        v.family,
        v.distro,
        v.vendor,
        v.id,
      ]
        .filter(Boolean)
        .map((s) => String(s).toLowerCase());

      return fields.some((f) => f.includes(q));
    });

    matches.sort((a, b) => score(a) - score(b));
    return matches.slice(0, 20);
  }

  private dispatchChange() {
    this.dispatchEvent(
      new CustomEvent('os-variant-change', {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private handleFocus() {
    this.open = true;
    void this.ensureLoaded();
  }

  private handleBlur() {
    // Delay close to allow click selection.
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

    // Lazy-load on first interaction.
    void this.ensureLoaded();
  }

  private handleKeydown(event: KeyboardEvent) {
    if (!this.open) return;

    const suggestions = this.filteredVariants;
    if (event.key === 'Escape') {
      this.open = false;
      this.highlightIndex = -1;
      return;
    }

    if (!suggestions.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.highlightIndex = Math.min(this.highlightIndex + 1, suggestions.length - 1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.highlightIndex = Math.max(this.highlightIndex - 1, 0);
      return;
    }

    if (event.key === 'Enter' && this.highlightIndex >= 0 && this.highlightIndex < suggestions.length) {
      event.preventDefault();
      const selected = suggestions[this.highlightIndex];
      if (selected) this.selectVariant(selected);
    }
  }

  private selectVariant(variant: OSVariant) {
    this.value = variant.short_id;
    this.dispatchChange();
    this.open = false;
    this.highlightIndex = -1;

    const input = this.renderRoot?.querySelector('input');
    input?.focus();
  }

  override render() {
    const suggestions = this.filteredVariants;
    const showDropdown = this.open && !this.disabled && (this.loading || suggestions.length > 0 || !!this.error);

    return html`
      <div class="wrapper">
        <input
          class="input"
          type="text"
          .value=${this.value}
          placeholder=${this.placeholder}
          ?disabled=${this.disabled}
          @focus=${this.handleFocus}
          @blur=${this.handleBlur}
          @input=${this.handleInput}
          @keydown=${this.handleKeydown}
        />

        ${showDropdown
          ? html`
              <div class="dropdown" role="listbox">
                ${this.loading
                  ? html`<div class="status">Loading suggestions…</div>`
                  : this.error
                    ? html`<div class="status">${this.error}</div>`
                    : suggestions.map((v, idx) => {
                        const primary = `${v.name || v.short_id} (${v.short_id})`;
                        const secondaryParts = [v.vendor, v.distro, v.version, v.family].filter(Boolean);
                        const secondary = secondaryParts.length ? secondaryParts.join(' · ') : '';

                        return html`
                          <div
                            class="row ${idx === this.highlightIndex ? 'highlight' : ''}"
                            role="option"
                            @mousedown=${(e: MouseEvent) => {
                              // Prevent blur before selection.
                              e.preventDefault();
                            }}
                            @click=${() => this.selectVariant(v)}
                          >
                            <div class="primary">${primary}</div>
                            ${secondary ? html`<div class="secondary">${secondary}</div>` : nothing}
                          </div>
                        `;
                      })}
              </div>
            `
          : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'os-variant-autocomplete': OSVariantAutocomplete;
  }
}
