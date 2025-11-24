/**
 * Volume Dialog Component
 * Right-side drawer for creating and resizing storage volumes.
 */

import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import type { StoragePool, Volume } from '../../types/virtualization';
import { virtualizationAPI, VirtualizationAPIError } from '../../services/virtualization-api';
import { notificationActions } from '../../stores/notifications';

interface VolumeFormData {
  name: string;
  capacity: number;
  capacityUnit: 'GB' | 'TB';
  allocation: number;
  allocationUnit: 'GB' | 'TB';
  format: 'raw' | 'qcow2' | 'vmdk' | 'qed' | 'vdi';
}

@customElement('volume-dialog')
export class VolumeDialog extends LitElement {
  // Drawer visibility & mode
  @property({ type: Boolean, reflect: true }) show = false;
  @property({ type: String }) mode: 'create' | 'resize' = 'create';

  // Context
  @property({ type: Object }) pool!: StoragePool;
  @property({ type: Object }) volume?: Volume;
  
  @state() private formData: VolumeFormData = {
    name: '',
    capacity: 10,
    capacityUnit: 'GB',
    allocation: 0,
    allocationUnit: 'GB',
    format: 'qcow2',
  };
  
  @state() private isSubmitting = false;
  @state() private errors: Map<string, string> = new Map();

  private handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.show && !this.isSubmitting) {
      this.handleClose();
    }
  };

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
      border-left: 1px solid var(--vscode-widget-border, var(--vscode-panel-border, #454545));
    }

    :host([show]) .drawer {
      transform: translateX(0);
    }

    .drawer-header {
      padding: 20px;
      background: var(--vscode-sideBar-background, #252526);
      border-bottom: 1px solid var(--vscode-widget-border, #454545);
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

    /* Alias for consistency with other drawers */
    .drawer-title {
      font-size: 18px;
      font-weight: 500;
      color: var(--vscode-foreground, #cccccc);
    }

    .close-button,
    .close-btn {
      background: none;
      border: none;
      color: var(--vscode-foreground, #cccccc);
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 20px;
      transition: background 0.2s;
    }

    .close-button:hover,
    .close-btn:hover {
      background: var(--vscode-toolbar-hoverBackground, rgba(255, 255, 255, 0.1));
    }

    .drawer-content {
      flex: 1;
      padding: 20px;
      overflow-y: auto;
    }

    .drawer-footer {
      padding: 16px 20px;
      background: var(--vscode-sideBar-background, #252526);
      border-top: 1px solid var(--vscode-widget-border, #454545);
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      flex-shrink: 0;
    }

    .form-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
      min-width: 0;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 20px;
    }

    .form-label {
      display: block;
      margin-bottom: 6px;
      font-size: 13px;
      font-weight: 500;
      color: var(--vscode-foreground, #cccccc);
    }

    .form-label.required::after {
      content: ' *';
      color: var(--vscode-inputValidation-errorForeground, #f48771);
    }

    .form-input,
    .form-select {
      width: 100%;
      padding: 8px 12px;
      background: var(--vscode-input-background, #3c3c3c);
      border: 1px solid var(--vscode-input-border, #5a5a5a);
      border-radius: 4px;
      color: var(--vscode-input-foreground, #cccccc);
      font-size: 13px;
      font-family: inherit;
      outline: none;
      box-sizing: border-box;
      transition: all 0.2s;
    }

    .form-input:focus,
    .form-select:focus {
      border-color: var(--vscode-focusBorder, #007acc);
      box-shadow: 0 0 0 1px var(--vscode-focusBorder, #007acc);
    }

    .form-input.error,
    .form-select.error {
      border-color: var(--vscode-inputValidation-errorBorder, #f48771);
    }

    .form-input:disabled,
    .form-select:disabled {
      opacity: 0.6;
      cursor: not-allowed;
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
      display: block;
      margin-top: 4px;
      font-size: 12px;
      color: var(--vscode-descriptionForeground, #999999);
    }

    .error-message {
      display: block;
      margin-top: 4px;
      font-size: 12px;
      color: var(--vscode-inputValidation-errorForeground, #f48771);
    }

    .form-error {
      display: block;
      margin-top: 4px;
      font-size: 12px;
      color: var(--vscode-inputValidation-errorForeground, #f48771);
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
      background: var(--vscode-editor-background, #1e1e1e);
      border: 2px solid var(--vscode-editorWidget-border, #454545);
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .format-option:hover {
      border-color: var(--vscode-focusBorder, #007acc);
    }

    .format-option.selected {
      border-color: var(--vscode-textLink-foreground, #3794ff);
      background: var(--vscode-list-activeSelectionBackground, #094771);
      box-shadow: 0 0 0 1px var(--vscode-focusBorder, #007acc);
    }

    .format-option.disabled {
      cursor: default;
      opacity: 0.7;
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
      background: var(--vscode-button-background, #0e639c);
      color: var(--vscode-button-foreground, #ffffff);
      border: 1px solid var(--vscode-button-background, #0e639c);
    }

    .btn-primary:hover:not(:disabled) {
      background: var(--vscode-button-hoverBackground, #1177bb);
      border-color: var(--vscode-button-hoverBackground, #1177bb);
    }

    .btn-secondary {
      background: var(--vscode-button-secondaryBackground, #3c3c3c);
      color: var(--vscode-button-secondaryForeground, #cccccc);
      border: 1px solid var(--vscode-button-border, #5a5a5a);
    }

    .btn-secondary:hover:not(:disabled) {
      background: var(--vscode-button-secondaryHoverBackground, #45494e);
      border-color: var(--vscode-button-border, #5a5a5a);
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

  override connectedCallback() {
    super.connectedCallback();
    window.addEventListener('keydown', this.handleEscape);
    this.initializeFormFromProps();
  }

  override disconnectedCallback() {
    window.removeEventListener('keydown', this.handleEscape);
    super.disconnectedCallback();
  }

  override willUpdate(changed: Map<PropertyKey, unknown>) {
    if (changed.has('volume') || changed.has('mode') || changed.has('pool')) {
      this.initializeFormFromProps();
    }

    if (changed.has('show')) {
      if (this.show) {
        // Focus name input shortly after opening
        setTimeout(() => {
          const input = this.shadowRoot?.querySelector<HTMLInputElement>('#volume-name');
          if (input) input.focus();
        }, 100);
      } else {
        // Reset errors when closing
        this.errors.clear();
      }
    }
  }

  private initializeFormFromProps() {
    if (!this.pool) return;

    // Resize mode: derive from existing volume
    if (this.mode === 'resize' && this.volume) {
      this.formData = {
        name: this.volume.name,
        capacity: this.convertBytesToUnit(this.volume.capacity, 'GB'),
        capacityUnit: 'GB',
        allocation: this.convertBytesToUnit(this.volume.allocation || 0, 'GB'),
        allocationUnit: 'GB',
        format: (this.volume.format as any) || 'qcow2',
      };
      this.errors.clear();
      this.requestUpdate();
      return;
    }

    // Default create mode
    this.formData = {
      name: '',
      capacity: 10,
      capacityUnit: 'GB',
      allocation: 0,
      allocationUnit: 'GB',
      format: 'qcow2',
    };
    this.errors.clear();
  }

  private convertBytesToUnit(bytes: number, unit: 'GB' | 'TB'): number {
    const divisor = unit === 'TB' ? 1024 * 1024 * 1024 * 1024 : 1024 * 1024 * 1024;
    return Math.round((bytes / divisor) * 100) / 100;
  }

  private convertToBytes(value: number, unit: 'GB' | 'TB'): number {
    const multiplier = unit === 'TB' ? 1024 * 1024 * 1024 * 1024 : 1024 * 1024 * 1024;
    return Math.round(value * multiplier);
  }

  private formatSize(bytes: number): string {
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1024) {
      return `${(gb / 1024).toFixed(2)} TB`;
    }
    return `${gb.toFixed(2)} GB`;
  }

  private validateForm(): boolean {
    this.errors.clear();

    if (this.mode === 'create') {
      if (!this.formData.name) {
        this.errors.set('name', 'Volume name is required');
      } else if (!/^[a-zA-Z0-9-_]+$/.test(this.formData.name)) {
        this.errors.set('name', 'Volume name can only contain letters, numbers, hyphens, and underscores');
      }
    }
    
    if (this.formData.capacity <= 0) {
      this.errors.set('capacity', 'Capacity must be greater than 0');
    }
    
    if (this.formData.allocation < 0) {
      this.errors.set('allocation', 'Allocation cannot be negative');
    }
    
    const capacityBytes = this.convertToBytes(this.formData.capacity, this.formData.capacityUnit);
    const allocationBytes = this.convertToBytes(this.formData.allocation, this.formData.allocationUnit);
    const currentCapacity = this.volume?.capacity || 0;
    
    if (allocationBytes > capacityBytes) {
      this.errors.set('allocation', 'Allocation cannot exceed capacity');
    }

    if (this.mode === 'create') {
      if (capacityBytes > this.pool.available) {
        this.errors.set('capacity', `Capacity exceeds available space (${this.formatSize(this.pool.available)})`);
      }
    } else if (this.mode === 'resize') {
      if (capacityBytes <= currentCapacity) {
        this.errors.set('capacity', 'New capacity must be greater than current capacity');
      }
      const maxCapacity = currentCapacity + (this.pool.available || 0);
      if (capacityBytes > maxCapacity) {
        this.errors.set('capacity', `Capacity exceeds available space (${this.formatSize(maxCapacity)})`);
      }
    }
    
    this.requestUpdate();
    return this.errors.size === 0;
  }

  private async handleSubmit() {
    if (!this.validateForm() || !this.pool) {
      return;
    }
    
    this.isSubmitting = true;
    
    try {
      const capacityBytes = this.convertToBytes(this.formData.capacity, this.formData.capacityUnit);
      const allocationBytes = this.convertToBytes(this.formData.allocation, this.formData.allocationUnit);

      if (this.mode === 'resize' && this.volume) {
        const updated = await virtualizationAPI.resizeVolume(this.pool.name, this.volume.name, capacityBytes);
        this.dispatchEvent(new CustomEvent('volume-resized', {
          detail: { pool: this.pool, volume: updated },
          bubbles: true,
          composed: true,
        }));
      } else {
        const payload: { name: string; capacity: number; allocation?: number; format?: string } = {
          name: this.formData.name,
          capacity: capacityBytes,
        };
        if (allocationBytes > 0) payload.allocation = allocationBytes;
        if (this.formData.format) payload.format = this.formData.format;

        const volume = await virtualizationAPI.createVolume(this.pool.name, payload);
        this.dispatchEvent(new CustomEvent('volume-created', {
          detail: { pool: this.pool, volume },
          bubbles: true,
          composed: true,
        }));
      }
      
      this.handleClose();
    } catch (error) {
      let message = 'Unknown error';
      if (error instanceof VirtualizationAPIError) {
        switch (error.code) {
          case 'VOLUME_ALREADY_EXISTS':
            message = 'A volume with this name already exists in the pool.';
            break;
          case 'INVALID_VOLUME_REQUEST':
            message = typeof error.details === 'string' ? error.details : error.message;
            break;
          default:
            message = error.message;
        }
      } else if (error instanceof Error) {
        message = error.message;
      }

      const title = this.mode === 'resize' ? 'Failed to resize volume' : 'Failed to create volume';
      notificationActions.addNotification({
        type: 'error',
        title,
        message,
      });
    } finally {
      this.isSubmitting = false;
    }
  }

  private handleClose() {
    this.dispatchEvent(new CustomEvent('close', {
      bubbles: true,
      composed: true,
    }));
  }

  private handleInputChange(field: keyof VolumeFormData, value: any) {
    this.formData = {
      ...this.formData,
      [field]: value,
    };
    
    if (this.errors.has(field)) {
      this.errors.delete(field);
      this.requestUpdate();
    }
  }

  private renderFormatOptions(isResize: boolean) {
    const formats = [
      {
        value: 'qcow2',
        name: 'QCOW2',
        description: 'QEMU copy-on-write, supports snapshots',
      },
      {
        value: 'raw',
        name: 'Raw',
        description: 'Raw disk image, best performance',
      },
      {
        value: 'vmdk',
        name: 'VMDK',
        description: 'VMware disk format',
      },
      {
        value: 'qed',
        name: 'QED',
        description: 'QEMU enhanced disk format',
      },
      {
        value: 'vdi',
        name: 'VDI',
        description: 'VirtualBox disk format',
      },
    ];
    
    return html`
      <div class="format-options">
        ${formats.map(format => {
          const selected = this.formData.format === format.value;
          const classes = [
            'format-option',
            selected ? 'selected' : '',
            isResize ? 'disabled' : '',
          ].filter(Boolean).join(' ');

          return html`
            <div 
              class="${classes}"
              @click=${() => {
                if (!isResize) {
                  this.handleInputChange('format', format.value);
                }
              }}
            >
              <div class="format-name">${format.name}</div>
              <div class="format-description">${format.description}</div>
            </div>
          `;
        })}
      </div>
    `;
  }

  override render() {
    const isResize = this.mode === 'resize';
    const title = isResize ? 'Resize Volume' : 'Create Volume';

    const poolName = this.pool?.name ?? '';
    const poolType = this.pool?.type ?? '';
    const availableText = this.pool ? this.formatSize(this.pool.available) : '';

    const disableName = isResize || this.isSubmitting || !this.pool;
    const disableCapacity = this.isSubmitting || !this.pool;
    const disableAllocation = isResize || this.isSubmitting || !this.pool;

    const currentCapacityText = isResize && this.volume
      ? this.formatSize(this.volume.capacity)
      : '';
    const maxCapacityText = isResize && this.volume && this.pool
      ? this.formatSize(this.volume.capacity + (this.pool.available || 0))
      : '';

    return html`
      <div class="drawer">
        <div class="drawer-header">
          <h2 class="header-title drawer-title">${title}</h2>
          <button class="close-button close-btn" @click=${this.handleClose} ?disabled=${this.isSubmitting}>×</button>
        </div>

        <div class="drawer-content">
          <div class="form-container">
            <div class="pool-info">
              <div class="info-item">
                <div class="info-label">Pool</div>
                <div class="info-value">${poolName}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Type</div>
                <div class="info-value">${poolType}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Available</div>
                <div class="info-value">${availableText}</div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label ${!isResize ? 'required' : ''}">Volume Name</label>
              <input
                id="volume-name"
                type="text"
                class="form-input ${this.errors.has('name') ? 'error' : ''}"
                placeholder="my-volume"
                .value=${this.formData.name}
                @input=${(e: Event) => {
                  this.handleInputChange('name', (e.target as HTMLInputElement).value);
                }}
                ?disabled=${disableName}
              />
              ${this.errors.has('name') ? html`
                <div class="form-error">${this.errors.get('name')}</div>
              ` : html`
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
                  @input=${(e: Event) => {
                    this.handleInputChange('capacity', Number((e.target as HTMLInputElement).value));
                  }}
                  ?disabled=${disableCapacity}
                />
                <select
                  class="form-select unit-select"
                  .value=${this.formData.capacityUnit}
                  @change=${(e: Event) => {
                    this.handleInputChange('capacityUnit', (e.target as HTMLSelectElement).value);
                  }}
                  ?disabled=${disableCapacity}
                >
                  <option value="GB">GB</option>
                  <option value="TB">TB</option>
                </select>
              </div>
              ${this.errors.has('capacity') ? html`
                <div class="form-error">${this.errors.get('capacity')}</div>
              ` : isResize && currentCapacityText ? html`
                <div class="form-hint">
                  Current capacity: ${currentCapacityText}. New capacity must be greater than current and within available space${maxCapacityText ? ` (max ${maxCapacityText})` : ''}.
                </div>
              ` : html`
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
                  @input=${(e: Event) => {
                    this.handleInputChange('allocation', Number((e.target as HTMLInputElement).value));
                  }}
                  ?disabled=${disableAllocation}
                />
                <select
                  class="form-select unit-select"
                  .value=${this.formData.allocationUnit}
                  @change=${(e: Event) => {
                    this.handleInputChange('allocationUnit', (e.target as HTMLSelectElement).value);
                  }}
                  ?disabled=${disableAllocation}
                >
                  <option value="GB">GB</option>
                  <option value="TB">TB</option>
                </select>
              </div>
              ${this.errors.has('allocation') ? html`
                <div class="form-error">${this.errors.get('allocation')}</div>
              ` : html`
                <div class="form-hint">
                  Initial disk space to allocate (0 for thin provisioning)
                </div>
              `}
            </div>

            <div class="form-group">
              <label class="form-label">Format</label>
              ${this.renderFormatOptions(isResize)}
            </div>
          </div>
        </div>

        <div class="drawer-footer">
          <button 
            class="btn btn-secondary"
            @click=${this.handleClose}
            ?disabled=${this.isSubmitting}
          >
            Cancel
          </button>
          <button 
            class="btn btn-primary"
            @click=${this.handleSubmit}
            ?disabled=${this.isSubmitting}
          >
            ${this.isSubmitting
              ? (this.mode === 'resize' ? 'Resizing...' : 'Creating...')
              : (this.mode === 'resize' ? 'Resize' : 'Create Volume')}
          </button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'volume-dialog': VolumeDialog;
  }
}