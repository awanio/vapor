import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export interface DeleteItem {
  type: string;
  name: string;
  namespace?: string;
}

@customElement('delete-modal')
export class DeleteModal extends LitElement {
  @property({ type: Object }) item: DeleteItem | null = null;
  @property({ type: Boolean, reflect: true }) show = false;
  @property({ type: Boolean }) loading = false;
  @property({ type: String, attribute: 'modal-title' }) modalTitle = 'Confirm Delete';
  @property({ type: String, attribute: 'message' }) message = '';
  @property({ type: String, attribute: 'confirm-label' }) confirmLabel = 'Delete';
  @property({ type: String, attribute: 'confirm-button-class' }) confirmButtonClass = 'delete';

  // Enhanced options for dangerous deletions (e.g., storage pools with volumes)
  @property({ type: Boolean, attribute: 'has-volumes' }) hasVolumes = false;
  @property({ type: Number, attribute: 'volume-count' }) volumeCount = 0;
  @property({ type: Boolean, attribute: 'delete-volumes' }) deleteVolumes = false;
  @property({ type: Boolean, attribute: 'acknowledge' }) acknowledge = false;

  static override styles = css`
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

    .modal-button.confirm {
      background: var(--vscode-button-background, #007acc);
      color: var(--vscode-button-foreground, white);
      border-color: var(--vscode-button-background, #007acc);
    }

    .modal-button.confirm:hover {
      background: var(--vscode-button-hoverBackground, #005a9e);
      border-color: var(--vscode-button-hoverBackground, #005a9e);
    }

    .modal-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `;

  private handleOverlayClick(event: MouseEvent) {
    if (event.target === event.currentTarget && !this.loading) {
      this.handleCancel();
    }
  }

  private handleConfirm() {
    this.dispatchEvent(new CustomEvent('confirm-delete', {
      detail: { item: this.item, deleteVolumes: this.deleteVolumes },
      bubbles: true,
      composed: true
    }));
  }

  private handleCancel() {
    this.dispatchEvent(new CustomEvent('cancel-delete', {
      bubbles: true,
      composed: true
    }));
  }

  override willUpdate(changedProperties: Map<PropertyKey, unknown>) {
    // Log property changes for debugging
    if (changedProperties.has('show') && this.show) {
      console.log('Modal opening with properties:', {
        modalTitle: this.modalTitle,
        message: this.message,
        confirmLabel: this.confirmLabel,
        confirmButtonClass: this.confirmButtonClass
      });
    }
  }

  override render() {
    if (!this.show || !this.item) {
      return '';
    }

    // Debug logging
    console.log('Delete Modal Rendering with:', {
      modalTitle: this.modalTitle,
      message: this.message,
      confirmLabel: this.confirmLabel,
      confirmButtonClass: this.confirmButtonClass,
      item: this.item
    });

    return html`
      <div class="modal-overlay" @click=${this.handleOverlayClick}>
        <div class="modal">
          <div class="modal-header">
            <span class="modal-icon warning">⚠️</span>
            <h3 class="modal-title">${this.modalTitle}</h3>
          </div>
          <div class="modal-body">
            ${this.message && this.message.length > 0 ? html`
              <p>${this.message}</p>
            ` : html`
              <p>Are you sure you want to delete this ${this.item.type.toLowerCase()}?</p>
            `}
            <div class="modal-resource-info">
              <div><strong>Type:</strong> ${this.item.type}</div>
              <div><strong>Name:</strong> ${this.item.name}</div>
              ${this.item.namespace ? html`<div><strong>Namespace:</strong> ${this.item.namespace}</div>` : ''}
            </div>
            ${this.hasVolumes ? html`
              <div style="margin:12px 0; padding:12px; border:1px solid var(--vscode-widget-border); border-radius:4px; background: rgba(255, 193, 7, 0.08);">
                <div style="color: var(--vscode-notificationsWarningIcon-foreground,#ff9800); font-weight:600; margin-bottom:6px;">
                  ⚠️ Warning: This resource contains ${this.volumeCount} volume(s).
                </div>
                <label style="display:flex; align-items:center; gap:8px; margin-top:6px;">
                  <input type="checkbox" .checked=${this.deleteVolumes} @change=${(e: Event) => { this.deleteVolumes = (e.target as HTMLInputElement).checked; }} />
                  Delete all volumes with this resource (dangerous - permanent data loss)
                </label>
                ${this.deleteVolumes ? html`
                  <label style="display:flex; align-items:center; gap:8px; margin-top:8px;">
                    <input type="checkbox" .checked=${this.acknowledge} @change=${(e: Event) => { this.acknowledge = (e.target as HTMLInputElement).checked; }} />
                    I understand this will permanently delete all data
                  </label>
                ` : ''}
              </div>
            ` : ''}
            ${this.confirmButtonClass === 'delete' ? html`
              <p><strong>This action cannot be undone.</strong></p>
            ` : ''}
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
              class="modal-button ${this.confirmButtonClass}" 
              @click=${this.handleConfirm}
              ?disabled=${this.loading}
            >
              ${this.loading ? html`${this.confirmLabel}ing...` : this.confirmLabel}
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'delete-modal': DeleteModal;
  }
}
