import { html, css } from 'lit';
import { property } from 'lit/decorators.js';
import { t } from '../i18n';
import { I18nLitElement } from '../i18n-mixin';

export class ModalDialog extends I18nLitElement {
  private originalParent: Element | null = null;
  private originalNextSibling: Node | null = null;
  
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
      z-index: 10000;
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
      background-color: var(--vscode-bg-light, #252526);
      color: var(--vscode-text, #cccccc);
      margin: 40px auto;
      border: 1px solid var(--vscode-border, #464647);
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
      border-bottom: 1px solid var(--vscode-border, #464647);
      background-color: var(--vscode-bg-lighter, #2d2d30);
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
      color: var(--vscode-text-dim, #9d9d9d);
      border-radius: 4px;
      transition: all 0.2s;
    }

    .modal-close:hover {
      background-color: var(--vscode-bg-light, #252526);
      color: var(--vscode-text, #cccccc);
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
      border-top: 1px solid var(--vscode-border, #464647);
      background-color: var(--vscode-bg, #1e1e1e);
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

    /* ============================================
       Form styles for slotted content
       ============================================ */
    
    /* Form groups */
    ::slotted(.form-group) {
      margin-bottom: 14px;
      width: 100%;
      box-sizing: border-box;
    }
    
    ::slotted(.form-group.checkbox) {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    /* Form hint text */
    ::slotted(.form-hint) {
      font-size: 11px;
      color: var(--vscode-text-dim, #9d9d9d);
      margin-top: 4px;
    }

    /* Footer actions container */
    ::slotted([slot="footer"]) {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
  `;

  override connectedCallback() {
    super.connectedCallback();
    document.addEventListener('keydown', this.handleKeydown);
  }

  override disconnectedCallback() {
    // Only run cleanup if we're not in the process of moving to body
    if (!this._isMovingToBody) {
      window.removeEventListener('keydown', this.handleKeydown);
      this.returnToOriginalPosition();
    }
    super.disconnectedCallback();
  }

  private _isMovingToBody = false;

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

  private moveToBody() {
    // Store original position to restore later
    if (!this.originalParent && this.parentNode) {
      // Get the shadow root host if we're in a shadow DOM
      const rootNode = this.getRootNode();
      if (rootNode instanceof ShadowRoot) {
        this.originalParent = rootNode.host;
      } else {
        this.originalParent = this.parentNode as Element;
      }
      this.originalNextSibling = this.nextSibling;
      
      this._isMovingToBody = true;
      document.body.appendChild(this);
      this._isMovingToBody = false;
    }
  }

  private returnToOriginalPosition() {
    if (this.originalParent && this.parentNode === document.body) {
      // Return to original shadow root position
      const rootNode = this.originalParent.shadowRoot || this.originalParent;
      if (this.originalNextSibling) {
        rootNode.insertBefore(this, this.originalNextSibling);
      } else {
        rootNode.appendChild(this);
      }
      this.originalParent = null;
      this.originalNextSibling = null;
    }
  }

  override updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);
    
    if (changedProperties.has('open') || changedProperties.has('center')) {
      if (this.open && this.center) {
        this.moveToBody();
      } else if (!this.open && this.originalParent) {
        this.returnToOriginalPosition();
      }
    }
  }

  override render() {
    if (!this.open) {
      return html``;
    }

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
}

customElements.define('modal-dialog', ModalDialog);
