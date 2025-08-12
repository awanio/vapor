var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
let LoadingState = class LoadingState extends LitElement {
    constructor() {
        super(...arguments);
        this.message = 'Loading...';
    }
    render() {
        return html `
      <div class="loading-state">
        <div class="spinner"></div>
        <div>${this.message}</div>
      </div>
    `;
    }
};
LoadingState.styles = css `
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
__decorate([
    property({ type: String })
], LoadingState.prototype, "message", void 0);
LoadingState = __decorate([
    customElement('loading-state')
], LoadingState);
export { LoadingState };
//# sourceMappingURL=loading-state.js.map