var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '../dialogs/modal-dialog.js';
import '../ui/loading-state.js';
import { virtualizationAPI } from '../../services/virtualization-api';
import { notificationActions } from '../../stores/notifications';
let VolumeDialog = class VolumeDialog extends LitElement {
    constructor() {
        super(...arguments);
        this.formData = {
            name: '',
            capacity: 10,
            capacityUnit: 'GB',
            allocation: 0,
            allocationUnit: 'GB',
            format: 'qcow2'
        };
        this.isCreating = false;
        this.errors = new Map();
    }
    connectedCallback() {
        super.connectedCallback();
        if (this.volume) {
            this.formData = {
                name: this.volume.name,
                capacity: this.convertBytesToUnit(this.volume.capacity, 'GB'),
                capacityUnit: 'GB',
                allocation: this.convertBytesToUnit(this.volume.allocation || 0, 'GB'),
                allocationUnit: 'GB',
                format: this.volume.type || 'qcow2'
            };
        }
    }
    convertBytesToUnit(bytes, unit) {
        const divisor = unit === 'TB' ? 1024 * 1024 * 1024 * 1024 : 1024 * 1024 * 1024;
        return Math.round((bytes / divisor) * 100) / 100;
    }
    convertToBytes(value, unit) {
        const multiplier = unit === 'TB' ? 1024 * 1024 * 1024 * 1024 : 1024 * 1024 * 1024;
        return Math.round(value * multiplier);
    }
    formatSize(bytes) {
        const gb = bytes / (1024 * 1024 * 1024);
        if (gb >= 1024) {
            return `${(gb / 1024).toFixed(2)} TB`;
        }
        return `${gb.toFixed(2)} GB`;
    }
    validateForm() {
        this.errors.clear();
        if (!this.formData.name) {
            this.errors.set('name', 'Volume name is required');
        }
        else if (!/^[a-zA-Z0-9-_]+$/.test(this.formData.name)) {
            this.errors.set('name', 'Volume name can only contain letters, numbers, hyphens, and underscores');
        }
        if (this.formData.capacity <= 0) {
            this.errors.set('capacity', 'Capacity must be greater than 0');
        }
        if (this.formData.allocation < 0) {
            this.errors.set('allocation', 'Allocation cannot be negative');
        }
        const capacityBytes = this.convertToBytes(this.formData.capacity, this.formData.capacityUnit);
        const allocationBytes = this.convertToBytes(this.formData.allocation, this.formData.allocationUnit);
        if (allocationBytes > capacityBytes) {
            this.errors.set('allocation', 'Allocation cannot exceed capacity');
        }
        if (capacityBytes > this.pool.available) {
            this.errors.set('capacity', `Capacity exceeds available space (${this.formatSize(this.pool.available)})`);
        }
        this.requestUpdate();
        return this.errors.size === 0;
    }
    async handleCreate() {
        if (!this.validateForm()) {
            return;
        }
        this.isCreating = true;
        try {
            const capacityBytes = this.convertToBytes(this.formData.capacity, this.formData.capacityUnit);
            const allocationBytes = this.convertToBytes(this.formData.allocation, this.formData.allocationUnit);
            const volume = await virtualizationAPI.createVolume(this.pool.name, {
                name: this.formData.name,
                capacity: capacityBytes,
                allocation: allocationBytes,
                format: this.formData.format
            });
            this.dispatchEvent(new CustomEvent('volume-created', {
                detail: { pool: this.pool, volume },
                bubbles: true,
                composed: true
            }));
            this.handleClose();
        }
        catch (error) {
            notificationActions.addNotification({
                type: 'error',
                title: 'Failed to create volume',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
        finally {
            this.isCreating = false;
        }
    }
    handleClose() {
        this.dispatchEvent(new CustomEvent('close', {
            bubbles: true,
            composed: true
        }));
    }
    handleInputChange(field, value) {
        this.formData = {
            ...this.formData,
            [field]: value
        };
        if (this.errors.has(field)) {
            this.errors.delete(field);
            this.requestUpdate();
        }
    }
    renderFormatOptions() {
        const formats = [
            {
                value: 'qcow2',
                name: 'QCOW2',
                description: 'QEMU copy-on-write, supports snapshots'
            },
            {
                value: 'raw',
                name: 'Raw',
                description: 'Raw disk image, best performance'
            },
            {
                value: 'vmdk',
                name: 'VMDK',
                description: 'VMware disk format'
            },
            {
                value: 'vdi',
                name: 'VDI',
                description: 'VirtualBox disk format'
            }
        ];
        return html `
      <div class="format-options">
        ${formats.map(format => html `
          <div 
            class="format-option ${this.formData.format === format.value ? 'selected' : ''}"
            @click=${() => this.handleInputChange('format', format.value)}
          >
            <div class="format-name">${format.name}</div>
            <div class="format-description">${format.description}</div>
          </div>
        `)}
      </div>
    `;
    }
    render() {
        const isEditing = !!this.volume;
        const title = isEditing ? 'Edit Volume' : 'Create Volume';
        return html `
      <modal-dialog
        .title=${title}
        .open=${true}
        @close=${this.handleClose}
      >
        <div class="form-container">
          <div class="pool-info">
            <div class="info-item">
              <div class="info-label">Pool</div>
              <div class="info-value">${this.pool.name}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Type</div>
              <div class="info-value">${this.pool.type}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Available</div>
              <div class="info-value">${this.formatSize(this.pool.available)}</div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label required">Volume Name</label>
            <input
              type="text"
              class="form-input ${this.errors.has('name') ? 'error' : ''}"
              placeholder="my-volume"
              .value=${this.formData.name}
              @input=${(e) => {
            this.handleInputChange('name', e.target.value);
        }}
              ?disabled=${isEditing}
            />
            ${this.errors.has('name') ? html `
              <div class="error-message">${this.errors.get('name')}</div>
            ` : html `
              <div class="form-hint">
                Only letters, numbers, hyphens, and underscores allowed
              </div>
            `}
          </div>

          <div class="form-group">
            <label class="form-label required">Capacity</label>
            <div class="input-group">
              <input
                type="number"
                class="form-input ${this.errors.has('capacity') ? 'error' : ''}"
                min="1"
                step="1"
                .value=${this.formData.capacity}
                @input=${(e) => {
            this.handleInputChange('capacity', Number(e.target.value));
        }}
              />
              <select
                class="form-select unit-select"
                .value=${this.formData.capacityUnit}
                @change=${(e) => {
            this.handleInputChange('capacityUnit', e.target.value);
        }}
              >
                <option value="GB">GB</option>
                <option value="TB">TB</option>
              </select>
            </div>
            ${this.errors.has('capacity') ? html `
              <div class="error-message">${this.errors.get('capacity')}</div>
            ` : html `
              <div class="form-hint">
                Maximum size of the volume
              </div>
            `}
          </div>

          <div class="form-group">
            <label class="form-label">Initial Allocation</label>
            <div class="input-group">
              <input
                type="number"
                class="form-input ${this.errors.has('allocation') ? 'error' : ''}"
                min="0"
                step="1"
                .value=${this.formData.allocation}
                @input=${(e) => {
            this.handleInputChange('allocation', Number(e.target.value));
        }}
              />
              <select
                class="form-select unit-select"
                .value=${this.formData.allocationUnit}
                @change=${(e) => {
            this.handleInputChange('allocationUnit', e.target.value);
        }}
              >
                <option value="GB">GB</option>
                <option value="TB">TB</option>
              </select>
            </div>
            ${this.errors.has('allocation') ? html `
              <div class="error-message">${this.errors.get('allocation')}</div>
            ` : html `
              <div class="form-hint">
                Initial disk space to allocate (0 for thin provisioning)
              </div>
            `}
          </div>

          <div class="form-group">
            <label class="form-label">Format</label>
            ${this.renderFormatOptions()}
          </div>

          <div class="actions">
            <button 
              class="btn btn-secondary"
              @click=${this.handleClose}
              ?disabled=${this.isCreating}
            >
              Cancel
            </button>
            <button 
              class="btn btn-primary"
              @click=${this.handleCreate}
              ?disabled=${this.isCreating}
            >
              ${this.isCreating ? 'Creating...' : (isEditing ? 'Save' : 'Create Volume')}
            </button>
          </div>
        </div>
      </modal-dialog>
    `;
    }
};
VolumeDialog.styles = css `
    :host {
      display: block;
    }

    .form-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 20px;
      min-width: 500px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .form-label {
      font-size: 13px;
      font-weight: 500;
      color: var(--vscode-foreground);
    }

    .form-label.required::after {
      content: ' *';
      color: var(--vscode-inputValidation-errorForeground);
    }

    .form-input,
    .form-select {
      padding: 8px 12px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      font-size: 13px;
    }

    .form-input:focus,
    .form-select:focus {
      outline: none;
      border-color: var(--vscode-focusBorder);
    }

    .form-input.error,
    .form-select.error {
      border-color: var(--vscode-inputValidation-errorBorder);
    }

    .input-group {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .input-group .form-input {
      flex: 1;
    }

    .unit-select {
      width: 80px;
    }

    .form-hint {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      margin-top: -4px;
    }

    .error-message {
      font-size: 12px;
      color: var(--vscode-inputValidation-errorForeground);
      margin-top: -4px;
    }

    .pool-info {
      padding: 12px;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-editorWidget-border);
      border-radius: 4px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .info-label {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      text-transform: uppercase;
      font-weight: 600;
    }

    .info-value {
      font-size: 13px;
      color: var(--vscode-foreground);
      font-weight: 500;
    }

    .format-options {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }

    .format-option {
      padding: 12px;
      background: var(--vscode-editor-background);
      border: 2px solid var(--vscode-editorWidget-border);
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .format-option:hover {
      border-color: var(--vscode-focusBorder);
    }

    .format-option.selected {
      border-color: var(--vscode-textLink-foreground);
      background: var(--vscode-list-activeSelectionBackground);
    }

    .format-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--vscode-foreground);
      margin-bottom: 4px;
    }

    .format-description {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
    }

    .actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      padding-top: 16px;
      border-top: 1px solid var(--vscode-editorWidget-border);
    }

    .btn {
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }

    .btn-primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }

    .btn-primary:hover:not(:disabled) {
      background: var(--vscode-button-hoverBackground);
    }

    .btn-secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: 1px solid var(--vscode-button-border);
    }

    .btn-secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .advanced-section {
      margin-top: 8px;
      padding-top: 16px;
      border-top: 1px solid var(--vscode-editorWidget-border);
    }

    .section-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--vscode-foreground);
      margin-bottom: 12px;
    }
  `;
__decorate([
    property({ type: Object })
], VolumeDialog.prototype, "pool", void 0);
__decorate([
    property({ type: Object })
], VolumeDialog.prototype, "volume", void 0);
__decorate([
    state()
], VolumeDialog.prototype, "formData", void 0);
__decorate([
    state()
], VolumeDialog.prototype, "isCreating", void 0);
__decorate([
    state()
], VolumeDialog.prototype, "errors", void 0);
VolumeDialog = __decorate([
    customElement('volume-dialog')
], VolumeDialog);
export { VolumeDialog };
//# sourceMappingURL=volume-dialog.js.map