import { LitElement, html, css, render as renderLit } from 'lit';
import { property } from 'lit/decorators.js';
import { t } from '../i18n';
import { I18nLitElement } from '../i18n-mixin';

export class ModalDialog extends I18nLitElement {
  private portalContainer: HTMLElement | null = null;
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ type: String }) override title = '';
  @property({ type: String }) size: 'small' | 'medium' | 'large' = 'medium';
  @property({ type: Boolean }) showFooter = true;
  @property({ type: Boolean }) center = false;

  static override styles = css`
    :host {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1000;
      overflow: auto;
    }

    :host([open]) {
      display: block;
    }

    .overlay.centered { display: flex; align-items: center; justify-content: center; }
    .overlay.centered .modal { margin: 0; }
    .overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      animation: fadeIn 0.2s ease-out;
    }

    .modal {
      position: relative;
      background-color: var(--vscode-bg-light);
      color: var(--vscode-text);
      margin: 40px auto;
      border: 1px solid var(--vscode-border);
      border-radius: 6px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
      animation: slideIn 0.2s ease-out;
      max-height: calc(100vh - 80px);
      display: flex;
      flex-direction: column;
    }

    .modal.small {
      width: 90%;
      max-width: 400px;
    }

    .modal.medium {
      width: 90%;
      max-width: 600px;
    }

    .modal.large {
      width: 90%;
      max-width: 900px;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid var(--vscode-border);
      background-color: var(--vscode-bg-lighter);
    }

    .modal-title {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
    }

    .modal-close {
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      border: none;
      background: none;
      color: var(--vscode-text-dim);
      border-radius: 4px;
      transition: all 0.2s;
    }

    .modal-close:hover {
      background-color: var(--vscode-bg-light);
      color: var(--vscode-text);
    }

    .modal-content {
      flex: 1;
      padding: 20px;
      overflow-y: auto;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding: 16px 20px;
      border-top: 1px solid var(--vscode-border);
      background-color: var(--vscode-bg);
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes slideIn {
      from {
        transform: translateY(-20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    /* Responsive */
    @media (max-width: 768px) {
      .modal {
        margin: 20px;
        width: calc(100% - 40px);
        max-width: none;
      }
    }
  `;

  override connectedCallback() {
    super.connectedCallback();
    document.addEventListener('keydown', this.handleKeydown);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('keydown', this.handleKeydown);
    if (this.portalContainer) {
      document.body.removeChild(this.portalContainer);
      this.portalContainer = null;
    }
  }

  private handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && this.open) {
      this.close();
    }
  };

  private handleOverlayClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  close() {
    this.open = false;
    this.dispatchEvent(new CustomEvent('modal-close', {
      bubbles: true,
      composed: true
    }));
  }

  
  private renderContent() {
    return html`
      <div class="overlay ${this.center ? 'centered' : ''}" @click=${this.handleOverlayClick}>
        <div class="modal ${this.size}">
          <div class="modal-header">
            <h2 class="modal-title">${this.title}</h2>
            <button class="modal-close" @click=${this.close} aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.707.708L7.293 8l-3.647 3.646.708.708L8 8.707z"/>
              </svg>
            </button>
          </div>
          <div class="modal-content">
            <slot></slot>
          </div>
          ${this.showFooter ? html`
            <div class="modal-footer">
              <slot name="footer">
                <button class="btn btn-secondary" @click=${this.close}>
                  ${t('common.close')}
                </button>
              </slot>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  override render() {
    console.log("Modal render called", { open: this.open, center: this.center });

    if (!this.open) {
      if (this.portalContainer) {
        document.body.removeChild(this.portalContainer);
        this.portalContainer = null;
      }
      return html``;
    }

    if (this.center) {
      console.log("Rendering via portal");
      // Portal rendering
      if (!this.portalContainer) {
        this.portalContainer = document.createElement('div');
        this.portalContainer.id = 'modal-portal-container';
        this.portalContainer.style.position = 'fixed';
        this.portalContainer.style.top = '0';
        this.portalContainer.style.left = '0';
        this.portalContainer.style.width = '100%';
        this.portalContainer.style.height = '100%';
        this.portalContainer.style.zIndex = '9999';
        document.body.appendChild(this.portalContainer);
        const shadow = this.portalContainer.attachShadow({ mode: 'open' });
        
        // Adopt styles
        const styles = (this.constructor as typeof LitElement).elementStyles;
        if (styles) {
             shadow.adoptedStyleSheets = styles.map(s => (s instanceof CSSStyleSheet) ? s : s.styleSheet!);
        }
      }
      
      const shadow = this.portalContainer.shadowRoot!;
      renderLit(this.renderContent(), shadow, { host: this });
      return html``;
    }

    return this.renderContent();
  }
}

customElements.define('modal-dialog', ModalDialog);
