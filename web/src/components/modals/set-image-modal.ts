import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

export interface ContainerImage {
  name: string;
  image: string;
}

@customElement('set-image-modal')
export class SetImageModal extends LitElement {
  @property({ type: Boolean, reflect: true }) show = false;
  @property({ type: Boolean }) loading = false;
  @property({ type: String }) deploymentName = '';
  @property({ type: String }) namespace = '';
  @property({ type: Array }) containers: ContainerImage[] = [];
  
  @state() private containerImages: { [key: string]: string } = {};

  static override styles = css`
    :host {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1000;
    }

    :host([show]) {
      display: block;
    }

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
      background-color: var(--vscode-editor-background, #1e1e1e);
      color: var(--vscode-editor-foreground, #cccccc);
      margin: 50px auto;
      border: 1px solid var(--vscode-panel-border, #464647);
      border-radius: 6px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
      animation: slideIn 0.2s ease-out;
      width: 90%;
      max-width: 600px;
      max-height: calc(100vh - 100px);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid var(--vscode-panel-border, #464647);
      background-color: var(--vscode-editor-background, #252526);
    }

    .modal-title {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
      color: var(--vscode-editor-foreground, #cccccc);
    }

    .modal-subtitle {
      font-size: 12px;
      color: var(--vscode-descriptionForeground, #969696);
      margin-top: 4px;
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
      color: var(--vscode-icon-foreground, #cccccc);
      border-radius: 4px;
      transition: all 0.2s;
    }

    .modal-close:hover {
      background-color: var(--vscode-toolbar-hoverBackground, #2a2a2a);
    }

    .modal-content {
      flex: 1;
      padding: 20px;
      overflow-y: auto;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-label {
      display: block;
      margin-bottom: 8px;
      font-size: 13px;
      color: var(--vscode-editor-foreground, #cccccc);
      font-weight: 500;
    }

    .form-hint {
      font-size: 11px;
      color: var(--vscode-descriptionForeground, #969696);
      margin-top: 4px;
    }

    .form-input {
      width: 100%;
      padding: 8px 12px;
      background: var(--vscode-input-background, #3c3c3c);
      color: var(--vscode-input-foreground, #cccccc);
      border: 1px solid var(--vscode-input-border, #3c3c3c);
      border-radius: 4px;
      font-size: 13px;
      font-family: inherit;
      box-sizing: border-box;
    }

    .form-input:focus {
      outline: none;
      border-color: var(--vscode-focusBorder, #007acc);
    }

    .form-input:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .container-item {
      padding: 12px;
      background: var(--vscode-editor-background, #1e1e1e);
      border: 1px solid var(--vscode-panel-border, #464647);
      border-radius: 4px;
      margin-bottom: 12px;
    }

    .container-name {
      font-size: 12px;
      color: var(--vscode-descriptionForeground, #969696);
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .current-image {
      font-size: 11px;
      color: var(--vscode-descriptionForeground, #969696);
      margin-top: 4px;
      font-family: var(--vscode-editor-font-family, 'Monaco', 'Courier New', monospace);
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding: 16px 20px;
      border-top: 1px solid var(--vscode-panel-border, #464647);
      background-color: var(--vscode-editor-background, #1e1e1e);
    }

    .btn {
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 500;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
      border: 1px solid transparent;
      font-family: inherit;
    }

    .btn-cancel {
      background: transparent;
      color: var(--vscode-button-secondaryForeground, #cccccc);
      border-color: var(--vscode-button-border, #464647);
    }

    .btn-cancel:hover {
      background: var(--vscode-button-secondaryHoverBackground, #2a2a2a);
    }

    .btn-primary {
      background: var(--vscode-button-background, #007acc);
      color: var(--vscode-button-foreground, white);
      border-color: var(--vscode-button-background, #007acc);
    }

    .btn-primary:hover:not(:disabled) {
      background: var(--vscode-button-hoverBackground, #005a9e);
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
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

    .spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: white;
      animation: spin 0.8s linear infinite;
      margin-right: 8px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;

  override updated(changedProperties: Map<PropertyKey, unknown>) {
    if (changedProperties.has('containers')) {
      // Initialize container images when containers change
      this.containerImages = {};
      this.containers.forEach(container => {
        this.containerImages[container.name] = container.image;
      });
    }
  }

  private handleInputChange(containerName: string, event: Event) {
    const input = event.target as HTMLInputElement;
    this.containerImages = {
      ...this.containerImages,
      [containerName]: input.value
    };
  }

  private handleCancel() {
    this.dispatchEvent(new CustomEvent('cancel-set-image'));
  }

  private handleConfirm() {
    // Transform the containerImages object into the required payload format
    const payload = Object.entries(this.containerImages).map(([name, image]) => ({
      [name]: image
    }));
    
    this.dispatchEvent(new CustomEvent('confirm-set-image', {
      detail: { images: payload }
    }));
  }

  private handleOverlayClick(event: Event) {
    if (event.target === event.currentTarget && !this.loading) {
      this.handleCancel();
    }
  }

  override render() {
    if (!this.show) {
      return html``;
    }

    return html`
      <div class="overlay" @click="${this.handleOverlayClick}">
        <div class="modal" @click="${(e: Event) => e.stopPropagation()}">
          <div class="modal-header">
            <div>
              <h2 class="modal-title">Set Container Images</h2>
              <div class="modal-subtitle">${this.deploymentName} (${this.namespace})</div>
            </div>
            <button 
              class="modal-close" 
              @click="${this.handleCancel}"
              ?disabled="${this.loading}"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.707.708L7.293 8l-3.647 3.646.708.708L8 8.707z"/>
              </svg>
            </button>
          </div>
          
          <div class="modal-content">
            ${this.containers.length === 0 ? html`
              <div class="form-hint">No containers found in this deployment.</div>
            ` : html`
              <div class="form-hint" style="margin-bottom: 16px;">
                Update the image for each container in the deployment. Leave unchanged to keep the current image.
              </div>
              ${this.containers.map(container => html`
                <div class="container-item">
                  <div class="container-name">Container: ${container.name}</div>
                  <input
                    type="text"
                    class="form-input"
                    .value="${this.containerImages[container.name] || container.image}"
                    @input="${(e: Event) => this.handleInputChange(container.name, e)}"
                    ?disabled="${this.loading}"
                    placeholder="e.g., nginx:1.21.0"
                  />
                  <div class="current-image">Current: ${container.image}</div>
                </div>
              `)}
            `}
          </div>
          
          <div class="modal-footer">
            <button 
              class="btn btn-cancel" 
              @click="${this.handleCancel}"
              ?disabled="${this.loading}"
            >
              Cancel
            </button>
            <button 
              class="btn btn-primary" 
              @click="${this.handleConfirm}"
              ?disabled="${this.loading || this.containers.length === 0}"
            >
              ${this.loading ? html`<span class="spinner"></span>` : ''}
              ${this.loading ? 'Updating...' : 'Update Images'}
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'set-image-modal': SetImageModal;
  }
}
