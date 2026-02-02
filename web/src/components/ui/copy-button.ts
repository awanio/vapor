import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('copy-button')
export class CopyButton extends LitElement {
  @property({ type: String }) value = '';
  @property({ type: String }) label = 'Copy';
  @state() private copied = false;
  private timeoutId: number | null = null;

  static override styles = css`
    :host {
      display: inline-block;
    }

    button {
      background: transparent;
      border: 1px solid var(--vscode-button-border, #5a5a5a);
      color: var(--vscode-button-secondaryForeground, #cccccc);
      cursor: pointer;
      padding: 4px 8px;
      font-size: 12px;
      border-radius: 4px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
      font-family: inherit;
    }

    button:hover {
      background: var(--vscode-toolbar-hoverBackground, rgba(255, 255, 255, 0.1));
    }

    button.copied {
      color: var(--vscode-testing-iconPassed, #73c991);
      border-color: var(--vscode-testing-iconPassed, #73c991);
    }

    .icon {
      width: 14px;
      height: 14px;
      fill: currentColor;
    }
  `;

  async copy() {
    if (!this.value) return;

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(this.value);
      } else {
        // Fallback for non-secure contexts
        const textArea = document.createElement("textarea");
        textArea.value = this.value;

        // Ensure it's not visible but part of DOM
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);

        textArea.focus();
        textArea.select();

        try {
          document.execCommand('copy');
        } catch (err) {
          console.error('Fallback: Oops, unable to copy', err);
          throw err;
        }

        document.body.removeChild(textArea);
      }

      this.copied = true;
      this.dispatchEvent(new CustomEvent('copy', {
        detail: { value: this.value },
        bubbles: true,
        composed: true
      }));

      if (this.timeoutId) window.clearTimeout(this.timeoutId);
      this.timeoutId = window.setTimeout(() => {
        this.copied = false;
        this.timeoutId = null;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  }

  override render() {
    return html`
      <button @click=${this.copy} class="${this.copied ? 'copied' : ''}" type="button">
        ${this.copied
        ? html`<svg class="icon" viewBox="0 0 16 16"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z"/></svg>`
        : html`<svg class="icon" viewBox="0 0 16 16"><path d="M13 4h-2V3q0-.425-.288-.712T10 2H4q-.425 0-.712.288T3 3v2H2q-.425 0-.712.288T1 6v8q0 .425.288.712T2 15h8q.425 0 .712-.288T11 14v-2h2q.425 0 .712-.288T14 11V5q0-.425-.288-.712T13 4m-2 10H2V6h9zM4 3h6v1H4z"/></svg>`
      }
        ${this.label}
      </button>
    `;
  }
}
