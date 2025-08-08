import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('loading-state')
export class LoadingState extends LitElement {
  @property({ type: String }) message = 'Loading...';

  static override styles = css`
    .loading-state {
      text-align: center;
      padding: 20px;
      color: var(--vscode-text);
      font-style: italic;
    }

    .spinner {
      display: inline-block;
      width: 24px;
      height: 24px;
      margin-bottom: 12px;
    }

    .spinner::after {
      content: ' ';
      display: block;
      width: 20px;
      height: 20px;
      margin: 2px;
      border-radius: 50%;
      border: 2px solid var(--vscode-focusBorder, #007acc);
      border-color: var(--vscode-focusBorder, #007acc) transparent var(--vscode-focusBorder, #007acc) transparent;
      animation: spinner 1.2s linear infinite;
    }

    @keyframes spinner {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }
  `;

  override render() {
    return html`
      <div class="loading-state">
        <div class="spinner"></div>
        <div>${this.message}</div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'loading-state': LoadingState;
  }
}
