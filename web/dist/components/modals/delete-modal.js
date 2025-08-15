var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
let DeleteModal = class DeleteModal extends LitElement {
    constructor() {
        super(...arguments);
        this.item = null;
        this.show = false;
        this.loading = false;
    }
    handleOverlayClick(event) {
        if (event.target === event.currentTarget && !this.loading) {
            this.handleCancel();
        }
    }
    handleConfirm() {
        this.dispatchEvent(new CustomEvent('confirm-delete', {
            detail: { item: this.item },
            bubbles: true,
            composed: true
        }));
    }
    handleCancel() {
        this.dispatchEvent(new CustomEvent('cancel-delete', {
            bubbles: true,
            composed: true
        }));
    }
    render() {
        if (!this.show || !this.item) {
            return '';
        }
        return html `
      <div class="modal-overlay" @click=${this.handleOverlayClick}>
        <div class="modal">
          <div class="modal-header">
            <span class="modal-icon warning">⚠️</span>
            <h3 class="modal-title">Confirm Delete</h3>
          </div>
          <div class="modal-body">
            <p>Are you sure you want to delete this ${this.item.type.toLowerCase()}?</p>
            <div class="modal-resource-info">
              <div><strong>Type:</strong> ${this.item.type}</div>
              <div><strong>Name:</strong> ${this.item.name}</div>
              <div><strong>Namespace:</strong> ${this.item.namespace || 'N/A'}</div>
            </div>
            <p><strong>This action cannot be undone.</strong></p>
          </div>
          <div class="modal-footer">
            <button 
              class="modal-button cancel" 
              @click=${this.handleCancel}
              ?disabled=${this.loading}
            >
              Cancel
            </button>
            <button 
              class="modal-button delete" 
              @click=${this.handleConfirm}
              ?disabled=${this.loading}
            >
              ${this.loading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    `;
    }
};
DeleteModal.styles = css `
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      z-index: 2000;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding-top: 80px;
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    .modal {
      background: var(--vscode-editor-background, var(--vscode-bg-light));
      border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border, #454545));
      border-radius: 8px;
      padding: 24px;
      max-width: 500px;
      width: 90%;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
      animation: modalFadeIn 0.3s ease-out;
    }

    @keyframes modalFadeIn {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .modal-header {
      display: flex;
      align-items: center;
      margin-bottom: 16px;
    }

    .modal-icon {
      font-size: 24px;
      margin-right: 12px;
    }

    .modal-icon.warning {
      color: var(--vscode-notificationsWarningIcon-foreground, #ff9800);
    }

    .modal-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--vscode-foreground);
    }

    .modal-body {
      margin-bottom: 24px;
      color: var(--vscode-foreground);
      line-height: 1.5;
    }

    .modal-resource-info {
      background: var(--vscode-editor-inactiveSelectionBackground, rgba(255, 255, 255, 0.05));
      border: 1px solid var(--vscode-widget-border, rgba(255, 255, 255, 0.1));
      border-radius: 4px;
      padding: 12px;
      margin: 12px 0;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 14px;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

    .modal-button {
      padding: 8px 16px;
      border: 1px solid var(--vscode-button-border, transparent);
      border-radius: 4px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .modal-button.cancel {
      background: var(--vscode-button-secondaryBackground, rgba(255, 255, 255, 0.1));
      color: var(--vscode-button-secondaryForeground, var(--vscode-foreground));
    }

    .modal-button.cancel:hover {
      background: var(--vscode-button-secondaryHoverBackground, rgba(255, 255, 255, 0.15));
    }

    .modal-button.delete {
      background: var(--vscode-notificationsErrorIcon-foreground, #f44336);
      color: white;
      border-color: var(--vscode-notificationsErrorIcon-foreground, #f44336);
    }

    .modal-button.delete:hover {
      background: #d32f2f;
      border-color: #d32f2f;
    }

    .modal-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `;
__decorate([
    property({ type: Object })
], DeleteModal.prototype, "item", void 0);
__decorate([
    property({ type: Boolean })
], DeleteModal.prototype, "show", void 0);
__decorate([
    property({ type: Boolean })
], DeleteModal.prototype, "loading", void 0);
DeleteModal = __decorate([
    customElement('delete-modal')
], DeleteModal);
export { DeleteModal };
//# sourceMappingURL=delete-modal.js.map