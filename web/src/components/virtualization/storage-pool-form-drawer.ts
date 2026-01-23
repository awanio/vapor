import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { StoragePool, StoragePoolType } from '../../types/virtualization';
import { virtualizationAPI } from '../../services/virtualization-api';

export interface StoragePoolFormData {
  name: string;
  type: StoragePoolType;
  path?: string;
  source?: string;
  target?: string;
  autostart: boolean;
}

@customElement('storage-pool-form-drawer')
export class StoragePoolFormDrawer extends LitElement {
  @property({ type: Boolean, reflect: true }) show = false;
  @property({ type: Boolean }) loading = false;
  @property({ type: Boolean }) editMode = false;
  @property({ type: Object }) poolData: Partial<StoragePool> | null = null;

  @state() private formData: StoragePoolFormData = {
    name: '',
    type: 'dir',
    path: '',
    source: '',
    target: '',
    autostart: true,
  };

  @state() private errors: Record<string, string> = {};

  private handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.show && !this.loading) {
      this.handleClose();
    }
  };

  // Sanitization methods to prevent injection attacks
  private sanitizePath(path: string): string {
    // Remove dangerous characters that could be used for command injection
    return path.trim().replace(/[;|&$`]/g, '');
  }

  private sanitizeName(name: string): string {
    // Ensure only safe characters (already validated by regex, but extra safety)
    return name.trim().replace(/[^\w-]/g, '');
  }

  private sanitizeInput(input: string): string {
    // Generic sanitization for other string inputs
    return input.trim().replace(/[<>]/g, '');
  }

  static override styles = css`
    :host {
      display: block;
      position: fixed;
      top: 0;
      right: 0;
      width: 700px;
      height: 100vh;
      z-index: 1000;
      pointer-events: none;
    }

    :host([show]) {
      pointer-events: auto;
    }

    .drawer {
      width: 100%;
      height: 100%;
      background: var(--vscode-editor-background, var(--vscode-bg-light));
      box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;
      transform: translateX(100%);
      transition: transform 0.3s ease;
      border-left: 1px solid var(--vscode-border);
    }

    :host([show]) .drawer {
      transform: translateX(0);
    }

    .drawer-header {
      padding: 20px;
      background: var(--vscode-bg-lighter, #252526);
      border-bottom: 1px solid var(--vscode-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }

    .header-title {
      font-size: 18px;
      font-weight: 500;
      color: var(--vscode-foreground, #cccccc);
    }

    .close-button {
      background: none;
      border: none;
      color: var(--vscode-foreground, #cccccc);
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 20px;
      transition: background 0.2s;
    }

    .close-button:hover {
      background: var(--vscode-toolbar-hoverBackground, rgba(255, 255, 255, 0.1));
    }

    .drawer-content {
      flex: 1;
      padding: 20px;
      overflow-y: auto;
    }

    .form-field {
      margin-bottom: 20px;
    }

    .form-label {
      display: block;
      margin-bottom: 6px;
      font-size: 13px;
      font-weight: 500;
      color: var(--vscode-foreground, #cccccc);
    }

    .form-input,
    .form-select {
      width: 100%;
      padding: 8px 12px;
      background: var(--vscode-input-background, #3c3c3c);
      border: 1px solid var(--vscode-input-border, #3c3c3c);
      border-radius: 4px;
      color: var(--vscode-input-foreground, #cccccc);
      font-size: 13px;
      font-family: inherit;
      outline: none;
      box-sizing: border-box;
    }

    .form-input:focus,
    .form-select:focus {
      border-color: var(--vscode-focusBorder, #007acc);
    }

    .form-input:disabled,
    .form-select:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .form-input.error {
      border-color: var(--vscode-inputValidation-errorBorder, #f48771);
    }

    .form-hint {
      display: block;
      margin-top: 4px;
      font-size: 12px;
      color: var(--vscode-descriptionForeground, #999999);
    }

    .form-error {
      display: block;
      margin-top: 4px;
      font-size: 12px;
      color: var(--vscode-inputValidation-errorForeground, #f48771);
    }

    .form-checkbox-wrapper {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .form-checkbox {
      width: 16px;
      height: 16px;
      cursor: pointer;
    }

    .edit-note {
      padding: 12px;
      margin-bottom: 16px;
      background: var(--vscode-inputValidation-infoBorder, rgba(0, 122, 204, 0.1));
      border: 1px solid var(--vscode-inputValidation-infoBorder, #007acc);
      border-radius: 4px;
      color: var(--vscode-foreground, #cccccc);
      font-size: 13px;
    }

    .drawer-footer {
      padding: 16px 20px;
      background: var(--vscode-bg-lighter, #252526);
      border-top: 1px solid var(--vscode-border);
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      flex-shrink: 0;
    }

    .btn {
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.2s;
    }

    .btn-cancel {
      background: var(--vscode-button-secondaryBackground, #3a3d41);
      color: var(--vscode-button-secondaryForeground, #cccccc);
    }

    .btn-cancel:hover {
      background: var(--vscode-button-secondaryHoverBackground, #45494e);
    }

    .btn-primary {
      background: var(--vscode-button-background, #0e639c);
      color: var(--vscode-button-foreground, white);
    }

    .btn-primary:hover {
      background: var(--vscode-button-hoverBackground, #1177bb);
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `;

  override connectedCallback() {
    super.connectedCallback();
    window.addEventListener('keydown', this.handleEscape);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('keydown', this.handleEscape);
  }

  override willUpdate(changedProperties: Map<PropertyKey, unknown>) {
    if (changedProperties.has('poolData') && this.poolData) {
      this.formData = {
        name: this.poolData.name || '',
        type: this.poolData.type || 'dir',
        path: this.poolData.path || '',
        source: '',
        target: '',
        autostart: this.poolData.autostart !== undefined ? this.poolData.autostart : true,
      };
      this.errors = {};
    }
    if (changedProperties.has('show')) {
      if (this.show) {
        // Focus first input when drawer opens
        setTimeout(() => {
          const firstInput = this.shadowRoot?.querySelector('#pool-name') as HTMLInputElement;
          if (firstInput) {
            firstInput.focus();
          }
        }, 100);
      } else {
        // Reset form when drawer closes
        setTimeout(() => {
          if (!this.show) {
            this.formData = {
              name: '',
              type: 'dir',
              path: '',
              source: '',
              target: '',
              autostart: true,
            };
            this.errors = {};
          }
        }, 300);
      }
    }
  }

  private handleClose() {
    this.dispatchEvent(new CustomEvent('close', {
      bubbles: true,
      composed: true,
    }));
  }

  private validateField(field: keyof StoragePoolFormData): boolean {
    let error = '';

    switch (field) {
      case 'name':
        if (!this.formData.name) {
          error = 'Name is required';
        } else if (!/^[a-zA-Z0-9_-]+$/.test(this.formData.name)) {
          error = 'Name must contain only alphanumeric characters, hyphens, and underscores';
        }
        break;
      case 'path':
        if (this.formData.type === 'dir' && !this.formData.path) {
          error = 'Path is required for directory pools';
        } else if (this.formData.path && !this.formData.path.startsWith('/')) {
          error = 'Path must be an absolute path (start with /)';
        }
        break;
      case 'source':
        if (this.formData.type === 'netfs' && !this.formData.source) {
          error = 'Source is required for network file system pools';
        }
        break;
      case 'target':
        if (this.formData.type === 'netfs' && !this.formData.target) {
          error = 'Target is required for network file system pools';
        }
        break;
    }

    if (error) {
      this.errors = { ...this.errors, [field]: error };
      return false;
    } else {
      const { [field]: removed, ...rest } = this.errors;
      this.errors = rest;
      return true;
    }
  }

  private validateForm(): boolean {
    const fields: Array<keyof StoragePoolFormData> = ['name'];

    if (this.formData.type === 'dir') {
      fields.push('path');
    } else if (this.formData.type === 'netfs') {
      fields.push('source', 'target');
    }

    let isValid = true;
    fields.forEach(field => {
      if (!this.validateField(field)) {
        isValid = false;
      }
    });

    return isValid;
  }

  private handleInputChange(field: keyof StoragePoolFormData, value: string | boolean) {
    this.formData = { ...this.formData, [field]: value };
    if (typeof value === 'string' && field !== 'type') {
      this.validateField(field);
    }
    this.requestUpdate();
  }

  private handleTypeChange(value: StoragePoolType) {
    this.formData = { ...this.formData, type: value };
    // Clear validation errors for fields that are no longer relevant
    if (value !== 'dir') {
      const { path, ...rest } = this.errors;
      this.errors = rest;
    }
    if (value !== 'netfs') {
      const { source, target, ...rest } = this.errors;
      this.errors = rest;
    }
    this.requestUpdate();
  }

  private showNotification(message: string, type: 'success' | 'error' | 'info' = 'info', duration?: number) {
    this.dispatchEvent(new CustomEvent('show-notification', {
      detail: { message, type, duration },
      bubbles: true,
      composed: true,
    }));
  }

  private async handleSubmit(e: Event) {
    e.preventDefault();
    if (this.loading || !this.validateForm()) {
      return;
    }

    // Sanitize all inputs before sending
    const sanitizedFormData: StoragePoolFormData = {
      name: this.sanitizeName(this.formData.name),
      type: this.formData.type,
      path: this.formData.path ? this.sanitizePath(this.formData.path) : undefined,
      source: this.formData.source ? this.sanitizeInput(this.formData.source) : undefined,
      target: this.formData.target ? this.sanitizePath(this.formData.target) : undefined,
      autostart: this.formData.autostart,
    };

    this.loading = true;

    try {
      if (this.editMode && this.poolData && this.poolData.name) {
        await virtualizationAPI.updateStoragePool(this.poolData.name, {
          autostart: sanitizedFormData.autostart,
        });
        this.showNotification(`Storage pool "${this.poolData.name}" updated successfully`, 'success');
      } else {
        // Create pool payload
        const payload: any = {
          name: sanitizedFormData.name,
          type: sanitizedFormData.type,
          autostart: sanitizedFormData.autostart,
        };

        if (sanitizedFormData.type === 'dir' && sanitizedFormData.path) {
          payload.path = sanitizedFormData.path;
        } else if (sanitizedFormData.type === 'netfs') {
          payload.source = sanitizedFormData.source;
          payload.target = sanitizedFormData.target;
        }

        await virtualizationAPI.createStoragePool(payload);
        this.showNotification(`Storage pool "${sanitizedFormData.name}" created successfully`, 'success');
      }

      this.dispatchEvent(new CustomEvent('success', {
        bubbles: true,
        composed: true,
      }));
      this.handleClose();
    } catch (error: any) {
      console.error('Failed to save storage pool:', error);
      let errorMessage = 'Unknown error';

      // Check for details in the error object (common in VirtualizationAPIError)
      if (error.details) {
        errorMessage = `${error.message || 'Error'}: ${error.details}`;
      } else if (error.error?.details) {
        errorMessage = `${error.error.message || errorMessage}: ${error.error.details}`;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      this.showNotification(`Failed to ${this.editMode ? 'update' : 'create'} storage pool: ${errorMessage}`, 'error');
    } finally {
      this.loading = false;
    }
  }

  override render() {
    const isReadOnly = this.editMode;

    return html`
      <div class="drawer">
        <div class="drawer-header">
          <h2 class="header-title">${this.editMode ? 'Edit Storage Pool' : 'Create Storage Pool'}</h2>
          <button class="close-button" @click=${this.handleClose} ?disabled=${this.loading}>×</button>
        </div>

        <form class="drawer-content" @submit=${this.handleSubmit}>
          ${this.editMode ? html`
            <div class="edit-note">
              <strong>Note:</strong> Currently, only autostart settings can be modified. Pool type and path cannot be changed.
            </div>
          ` : ''}

          <div class="form-field">
            <label class="form-label" for="pool-name">Name *</label>
            <input
              id="pool-name"
              type="text"
              class="form-input ${this.errors.name ? 'error' : ''}"
              .value=${this.formData.name}
              @input=${(e: Event) => this.handleInputChange('name', (e.target as HTMLInputElement).value)}
              ?disabled=${isReadOnly || this.loading}
              placeholder="my-storage-pool"
              aria-label="Storage pool name"
              aria-required="true"
              aria-invalid=${this.errors.name ? 'true' : 'false'}
              aria-describedby=${this.errors.name ? 'name-error' : undefined}
            />
            ${this.errors.name ? html`<span id="name-error" class="form-error" role="alert">${this.errors.name}</span>` : ''}
          </div>

          <div class="form-field">
            <label class="form-label" for="pool-type">Type *</label>
            <select
              id="pool-type"
              class="form-select"
              .value=${this.formData.type}
              @change=${(e: Event) => this.handleTypeChange((e.target as HTMLSelectElement).value as StoragePoolType)}
              ?disabled=${isReadOnly || this.loading}
              aria-label="Storage pool type"
              aria-required="true"
            >
              <option value="dir">Directory</option>
              <option value="netfs">Network File System (NFS)</option>
              <option value="logical">Logical Volume (LVM)</option>
            </select>
          </div>

          ${this.formData.type === 'dir' ? html`
            <div class="form-field">
              <label class="form-label" for="pool-path">Storage Path *</label>
              <input
                id="pool-path"
                type="text"
                class="form-input ${this.errors.path ? 'error' : ''}"
                .value=${this.formData.path || ''}
                @input=${(e: Event) => this.handleInputChange('path', (e.target as HTMLInputElement).value)}
                ?disabled=${isReadOnly || this.loading}
                placeholder="/var/lib/libvirt/images/pool-name"
                aria-label="Storage path"
                aria-required="true"
                aria-invalid=${this.errors.path ? 'true' : 'false'}
                aria-describedby=${this.errors.path ? 'path-error path-hint' : 'path-hint'}
              />
              ${this.errors.path ? html`<span id="path-error" class="form-error" role="alert">${this.errors.path}</span>` : ''}
              <span id="path-hint" class="form-hint">Must be an absolute path (e.g., /path/to/storage)</span>
            </div>
          ` : ''}

          ${this.formData.type === 'netfs' ? html`
            <div class="form-field">
              <label class="form-label" for="pool-source">NFS Server *</label>
              <input
                id="pool-source"
                type="text"
                class="form-input ${this.errors.source ? 'error' : ''}"
                .value=${this.formData.source || ''}
                @input=${(e: Event) => this.handleInputChange('source', (e.target as HTMLInputElement).value)}
                ?disabled=${isReadOnly || this.loading}
                placeholder="nfs.example.com:/export/path"
                aria-label="NFS server source"
                aria-required="true"
                aria-invalid=${this.errors.source ? 'true' : 'false'}
                aria-describedby=${this.errors.source ? 'source-error' : undefined}
              />
              ${this.errors.source ? html`<span id="source-error" class="form-error" role="alert">${this.errors.source}</span>` : ''}
            </div>

            <div class="form-field">
              <label class="form-label" for="pool-target">Mount Point *</label>
              <input
                id="pool-target"
                type="text"
                class="form-input ${this.errors.target ? 'error' : ''}"
                .value=${this.formData.target || ''}
                @input=${(e: Event) => this.handleInputChange('target', (e.target as HTMLInputElement).value)}
                ?disabled=${isReadOnly || this.loading}
                placeholder="/mnt/nfs-storage"
                aria-label="NFS mount point"
                aria-required="true"
                aria-invalid=${this.errors.target ? 'true' : 'false'}
                aria-describedby=${this.errors.target ? 'target-error' : undefined}
              />
              ${this.errors.target ? html`<span id="target-error" class="form-error" role="alert">${this.errors.target}</span>` : ''}
            </div>
          ` : ''}

          <div class="form-field">
            <div class="form-checkbox-wrapper">
              <input
                type="checkbox"
                class="form-checkbox"
                .checked=${this.formData.autostart}
                @change=${(e: Event) => this.handleInputChange('autostart', (e.target as HTMLInputElement).checked)}
                ?disabled=${this.loading}
                id="autostart-checkbox"
              />
              <label class="form-label" for="autostart-checkbox" style="margin: 0;">
                Start pool automatically on boot
              </label>
            </div>
          </div>
        </form>

        <div class="drawer-footer">
          <button
            type="button"
            class="btn btn-cancel"
            @click=${this.handleClose}
            ?disabled=${this.loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            class="btn btn-primary"
            @click=${this.handleSubmit}
            ?disabled=${this.loading}
          >
            ${this.loading ? (this.editMode ? 'Updating...' : 'Creating...') : (this.editMode ? 'Update' : 'Create')}
          </button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'storage-pool-form-drawer': StoragePoolFormDrawer;
  }
}
