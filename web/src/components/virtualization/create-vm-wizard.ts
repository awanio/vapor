/**
 * VM Creation Wizard Component
 * 4-step wizard for creating new virtual machines
 */

import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { StoreController } from '@nanostores/lit';

// Import store and types
import {
  $vmWizardState,
  $availableStoragePools,
  $availableISOs,
  wizardActions,
  vmActions,
  storagePoolStore,
  isoStore,
} from '../../stores/virtualization';
import type {
  VMCreateRequest,
  DiskConfig,
} from '../../types/virtualization';

// Extended type for form data that includes fields not in the API
type ExtendedVMCreateRequest = Partial<VMCreateRequest> & {
  os_type?: string;
};

// Import UI components
import '../ui/loading-state.js';
import '../ui/empty-state.js';

@customElement('create-vm-wizard')
export class CreateVMWizard extends LitElement {
  // Store controllers
  private wizardController = new StoreController(this, $vmWizardState);
  private storagePoolsController = new StoreController(this, $availableStoragePools);
  private isosController = new StoreController(this, $availableISOs);

  // Component state
  @state() private isCreating = false;
  @state() private validationErrors: Record<string, string> = {};
  @state() private showAdvancedOptions = false;

  static override styles = css`
    :host {
      display: block;
    }

    .wizard-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(2px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
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

    .wizard-container {
      /* Use multiple fallback approaches for background */
      background: #1e1e1e;
      background: var(--surface-0, #1e1e1e);
      background: var(--vscode-editor-background, var(--surface-0, #1e1e1e));
      background-color: #1e1e1e;
      background-color: var(--vscode-editor-background, var(--surface-0, #1e1e1e));
      border: 1px solid #464647;
      border: 1px solid var(--vscode-editorWidget-border, var(--border-color, #464647));
      border-radius: 8px;
      width: 90%;
      max-width: 800px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      animation: slideIn 0.3s ease-out;
      /* Ensure opaque background */
      opacity: 1;
      isolation: isolate;
      position: relative;
      z-index: 1;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .wizard-header {
      padding: 20px;
      border-bottom: 1px solid var(--vscode-editorWidget-border, var(--border-color, #464647));
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #252526;
      background: var(--surface-1, #252526);
      background: var(--vscode-editor-background, var(--surface-1, #252526));
    }

    .wizard-title {
      font-size: 18px;
      font-weight: 500;
      color: var(--vscode-foreground);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .wizard-title::before {
      content: '🖥️';
      font-size: 20px;
    }

    .wizard-steps {
      display: flex;
      gap: 24px;
      padding: 20px;
      border-bottom: 1px solid var(--vscode-editorWidget-border);
      background: var(--vscode-editor-inactiveSelectionBackground);
    }

    .step {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--vscode-descriptionForeground);
      font-size: 13px;
    }

    .step.active {
      color: var(--vscode-foreground);
      font-weight: 500;
    }

    .step.completed {
      color: var(--vscode-charts-green);
    }

    .step-number {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--vscode-button-secondaryBackground);
      border: 2px solid var(--vscode-button-border);
      font-size: 12px;
      font-weight: 600;
    }

    .step.active .step-number {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border-color: var(--vscode-button-background);
    }

    .step.completed .step-number {
      background: var(--vscode-charts-green);
      color: white;
      border-color: var(--vscode-charts-green);
    }

    .wizard-body {
      flex: 1;
      padding: 24px;
      overflow-y: auto;
      background: #1e1e1e;
      background: var(--surface-0, #1e1e1e);
      background: var(--vscode-editor-background, var(--surface-0, #1e1e1e));
    }

    .wizard-footer {
      padding: 20px;
      border-top: 1px solid var(--vscode-editorWidget-border, var(--border-color, #464647));
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      background: #252526;
      background: var(--surface-1, #252526);
      background: var(--vscode-editor-background, var(--surface-1, #252526));
    }

    .button-group {
      display: flex;
      gap: 8px;
    }

    button {
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border: 1px solid transparent;
      font-family: inherit;
    }

    button:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    button:focus-visible {
      outline: 2px solid var(--vscode-focusBorder, #007acc);
      outline-offset: 2px;
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
      background: var(--vscode-button-secondaryHoverBackground, #484848);
      border-color: var(--vscode-focusBorder, #007acc);
    }

    .btn-ghost {
      background: transparent;
      color: var(--vscode-foreground);
    }

    .btn-ghost:hover {
      background: var(--vscode-toolbar-hoverBackground);
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-size: 13px;
      font-weight: 500;
      color: var(--vscode-foreground, #cccccc);
    }

    .form-group label.required::after {
      content: ' *';
      color: var(--vscode-errorForeground, #f48771);
    }

    .required {
      color: var(--vscode-errorForeground, #f48771);
    }

    input,
    select,
    textarea {
      width: 100%;
      padding: 8px 12px;
      background: var(--vscode-input-background, #3c3c3c);
      color: var(--vscode-input-foreground, #cccccc);
      border: 1px solid var(--vscode-input-border, #858585);
      border-radius: 4px;
      font-size: 13px;
      font-family: inherit;
      transition: all 0.2s;
    }

    input:focus,
    select:focus,
    textarea:focus {
      outline: none;
      border-color: var(--vscode-focusBorder, #007acc);
      box-shadow: 0 0 0 1px var(--vscode-focusBorder, #007acc);
    }

    input:hover,
    select:hover,
    textarea:hover {
      border-color: var(--vscode-focusBorder, #007acc);
    }

    input::placeholder {
      color: var(--vscode-input-placeholderForeground, #8b8b8b);
    }

    /* Style select dropdown arrow */
    select {
      appearance: none;
      background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23cccccc' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
      background-repeat: no-repeat;
      background-position: right 8px center;
      background-size: 16px;
      padding-right: 32px;
    }

    select option {
      background: var(--vscode-dropdown-background, #3c3c3c);
      color: var(--vscode-dropdown-foreground, #cccccc);
    }

    input[type="number"]::-webkit-inner-spin-button,
    input[type="number"]::-webkit-outer-spin-button {
      opacity: 1;
      height: 30px;
    }

    .error input,
    .error select,
    .error textarea {
      border-color: var(--vscode-inputValidation-errorBorder);
    }

    .error-message {
      margin-top: 6px;
      font-size: 12px;
      color: var(--vscode-errorForeground, #f48771);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .error-message::before {
      content: '⚠';
      font-size: 14px;
    }

    .help-text {
      margin-top: 6px;
      font-size: 12px;
      color: var(--vscode-descriptionForeground, #8b8b8b);
      line-height: 1.4;
    }

    .input-group {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .input-addon {
      padding: 8px 12px;
      background: var(--vscode-button-secondaryBackground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      font-size: 13px;
      white-space: nowrap;
    }

    .slider-container {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    input[type="range"] {
      flex: 1;
      padding: 0;
    }

    .slider-value {
      min-width: 60px;
      text-align: right;
      font-weight: 500;
    }

    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .disk-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .disk-item {
      padding: 12px;
      background: var(--vscode-editor-inactiveSelectionBackground, #2a2a2a);
      border: 1px solid var(--vscode-editorWidget-border, #464647);
      border-radius: 4px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: all 0.2s;
    }

    .disk-item:hover {
      background: var(--vscode-list-hoverBackground, #2a2d2e);
      border-color: var(--vscode-focusBorder, #007acc);
    }

    .disk-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .btn-remove {
      padding: 4px 8px;
      background: var(--vscode-inputValidation-errorBackground);
      color: var(--vscode-inputValidation-errorForeground);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }

    .btn-add {
      padding: 8px 12px;
      background: transparent;
      color: var(--vscode-textLink-foreground, #3794ff);
      border: 1px dashed var(--vscode-textLink-foreground, #3794ff);
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .btn-add:hover {
      background: var(--vscode-textLink-foreground, #3794ff);
      color: white;
      border-style: solid;
    }

    .btn-add::before {
      content: '+';
      font-size: 16px;
      font-weight: bold;
    }

    .review-section {
      margin-bottom: 24px;
    }

    .review-section h3 {
      margin: 0 0 12px 0;
      font-size: 14px;
      font-weight: 500;
      color: var(--vscode-foreground);
    }

    .review-grid {
      display: grid;
      grid-template-columns: 150px 1fr;
      gap: 8px;
      font-size: 13px;
    }

    .review-label {
      color: var(--vscode-descriptionForeground);
    }

    .review-value {
      color: var(--vscode-foreground);
      font-weight: 500;
    }

    .advanced-toggle {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      user-select: none;
      color: var(--vscode-textLink-foreground);
      font-size: 13px;
      margin-bottom: 16px;
    }

    .advanced-toggle:hover {
      color: var(--vscode-textLink-activeForeground);
    }

    .advanced-options {
      padding: 16px;
      background: var(--vscode-editor-inactiveSelectionBackground);
      border: 1px solid var(--vscode-editorWidget-border);
      border-radius: 4px;
      margin-top: 16px;
    }

    .close-button {
      background: transparent;
      border: none;
      color: var(--vscode-foreground);
      cursor: pointer;
      padding: 4px 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      font-size: 18px;
      line-height: 1;
      transition: all 0.2s;
    }

    .close-button:hover {
      background: var(--vscode-toolbar-hoverBackground);
      color: var(--vscode-icon-foreground);
    }
  `;

  override connectedCallback() {
    super.connectedCallback();
    // Load necessary data
    this.loadData();
  }

  private async loadData() {
    try {
      await Promise.all([
        storagePoolStore.fetch(),
        isoStore.fetch(),
      ]);
    } catch (error) {
      console.error('Failed to load data for VM wizard:', error);
    }
  }

  private handleClose() {
    if (!this.isCreating) {
      wizardActions.closeWizard();
    }
  }

  private handleOverlayClick(event: MouseEvent) {
    // Close wizard if clicking outside the container
    if (event.target === event.currentTarget && !this.isCreating) {
      this.handleClose();
    }
  }

  private handlePrevious() {
    wizardActions.previousStep();
  }

  private handleNext() {
    const wizardState = this.wizardController.value;
    
    // Validate current step
    if (this.validateStep(wizardState.currentStep)) {
      wizardActions.nextStep();
    }
  }

  private validateStep(step: number): boolean {
    const wizardState = this.wizardController.value;
    const { formData } = wizardState;
    const errors: Record<string, string> = {};

    switch (step) {
      case 1: // Basic configuration
        if (!formData.name) {
          errors.name = 'VM name is required';
        } else if (!/^[a-zA-Z0-9-_]+$/.test(formData.name)) {
          errors.name = 'VM name can only contain letters, numbers, hyphens, and underscores';
        }
        if (!formData.memory || formData.memory < 512) {
          errors.memory = 'Memory must be at least 512 MB';
        }
        if (!formData.vcpus || formData.vcpus < 1) {
          errors.vcpus = 'At least 1 vCPU is required';
        }
        break;

      case 2: // Storage configuration
        if (!formData.storage?.default_pool) {
          errors.storage_pool = 'Storage pool is required';
        }
        if (!formData.storage?.disks?.length) {
          errors.disks = 'At least one disk is required';
        }
        break;

      case 3: // Network configuration
        // Network is optional, no validation required
        break;
    }

    this.validationErrors = errors;
    return Object.keys(errors).length === 0;
  }

  private async handleCreate() {
    const wizardState = this.wizardController.value;
    
    // Final validation
    if (!this.validateAllSteps()) {
      return;
    }

    this.isCreating = true;

    try {
      const result = await vmActions.create(wizardState.formData as VMCreateRequest);
      
      if (result.success) {
        this.showNotification('Virtual machine created successfully', 'success');
        wizardActions.closeWizard();
      } else {
        this.showNotification(
          'Failed to create virtual machine',
          'error'
        );
      }
    } catch (error) {
      console.error('Failed to create VM:', error);
      this.showNotification(
        error instanceof Error ? error.message : 'Failed to create virtual machine',
        'error'
      );
    } finally {
      this.isCreating = false;
    }
  }

  private validateAllSteps(): boolean {
    for (let step = 1; step <= 3; step++) {
      if (!this.validateStep(step)) {
        return false;
      }
    }
    return true;
  }

  private updateFormData(field: string, value: any) {
    const wizardState = this.wizardController.value;
    const updates: any = {};
    
    // Handle nested fields
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      if (parent && child) {
        updates[parent] = {
          ...(wizardState.formData as any)[parent],
          [child]: value,
        };
      }
    } else {
      updates[field] = value;
    }
    
    wizardActions.updateFormData(updates);
    
    // Clear validation error for this field
    if (this.validationErrors[field]) {
      const newErrors = { ...this.validationErrors };
      delete newErrors[field];
      this.validationErrors = newErrors;
    }
  }

  private addDisk() {
    const wizardState = this.wizardController.value;
    const currentDisks = wizardState.formData.storage?.disks || [];
    
    const newDisk: DiskConfig = {
      action: 'create',
      size: 20,
      format: 'qcow2',
      bus: 'virtio',
    };
    
    wizardActions.updateFormData({
      storage: {
        ...wizardState.formData.storage,
        disks: [...currentDisks, newDisk],
        default_pool: wizardState.formData.storage?.default_pool || '',
        boot_iso: wizardState.formData.storage?.boot_iso,
      },
    });
  }

  private removeDisk(index: number) {
    const wizardState = this.wizardController.value;
    const currentDisks = wizardState.formData.storage?.disks || [];
    
    wizardActions.updateFormData({
      storage: {
        ...wizardState.formData.storage,
        disks: currentDisks.filter((_, i) => i !== index),
        default_pool: wizardState.formData.storage?.default_pool || '',
        boot_iso: wizardState.formData.storage?.boot_iso,
      },
    });
  }

  private updateDisk(index: number, field: string, value: any) {
    const wizardState = this.wizardController.value;
    const currentDisks = [...(wizardState.formData.storage?.disks || [])];
    
    currentDisks[index] = {
      ...currentDisks[index],
      [field]: value,
    } as DiskConfig;
    
    wizardActions.updateFormData({
      storage: {
        ...wizardState.formData.storage,
        disks: currentDisks,
        default_pool: wizardState.formData.storage?.default_pool || '',
        boot_iso: wizardState.formData.storage?.boot_iso,
      },
    });
  }

  private showNotification(message: string, type: 'success' | 'error' | 'info' = 'info') {
    this.dispatchEvent(new CustomEvent('show-notification', {
      detail: { message, type },
      bubbles: true,
      composed: true,
    }));
  }

  private renderBasicConfig() {
    const wizardState = this.wizardController.value;
    const { formData } = wizardState;

    return html`
      <div>
        <div class="form-group ${this.validationErrors.name ? 'error' : ''}">
          <label>
            VM Name <span class="required">*</span>
          </label>
          <input
            type="text"
            placeholder="my-virtual-machine"
            .value=${formData.name || ''}
            @input=${(e: InputEvent) => 
              this.updateFormData('name', (e.target as HTMLInputElement).value)
            }
          />
          ${this.validationErrors.name ? html`
            <div class="error-message">${this.validationErrors.name}</div>
          ` : html`
            <div class="help-text">
              Alphanumeric characters, hyphens, and underscores only
            </div>
          `}
        </div>

        <div class="form-group">
          <label>Description</label>
          <textarea
            rows="3"
            placeholder="Optional description for this virtual machine"
            .value=${formData.description || ''}
            @input=${(e: InputEvent) => 
              this.updateFormData('description', (e.target as HTMLTextAreaElement).value)
            }
          ></textarea>
        </div>

        <div class="grid-2">
          <div class="form-group ${this.validationErrors.memory ? 'error' : ''}">
            <label>
              Memory (MB) <span class="required">*</span>
            </label>
            <div class="slider-container">
              <input
                type="range"
                min="512"
                max="32768"
                step="512"
                .value=${String(formData.memory || 2048)}
                @input=${(e: InputEvent) => 
                  this.updateFormData('memory', Number((e.target as HTMLInputElement).value))
                }
              />
              <input
                type="number"
                min="512"
                max="32768"
                step="512"
                class="slider-value"
                .value=${String(formData.memory || 2048)}
                @input=${(e: InputEvent) => 
                  this.updateFormData('memory', Number((e.target as HTMLInputElement).value))
                }
              />
            </div>
            ${this.validationErrors.memory ? html`
              <div class="error-message">${this.validationErrors.memory}</div>
            ` : ''}
          </div>

          <div class="form-group ${this.validationErrors.vcpus ? 'error' : ''}">
            <label>
              vCPUs <span class="required">*</span>
            </label>
            <select
              .value=${String(formData.vcpus || 2)}
              @change=${(e: Event) => 
                this.updateFormData('vcpus', Number((e.target as HTMLSelectElement).value))
              }
            >
              ${[1, 2, 4, 6, 8, 12, 16, 24, 32].map(cpu => html`
                <option value=${cpu}>${cpu}</option>
              `)}
            </select>
            ${this.validationErrors.vcpus ? html`
              <div class="error-message">${this.validationErrors.vcpus}</div>
            ` : ''}
          </div>
        </div>

        <div class="form-group">
          <label>Operating System Type</label>
          <select
            .value=${(formData as ExtendedVMCreateRequest).os_type || 'linux'}
            @change=${(e: Event) => 
              this.updateFormData('os_type', (e.target as HTMLSelectElement).value)
            }
          >
            <option value="linux">Linux</option>
            <option value="windows">Windows</option>
            <option value="freebsd">FreeBSD</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>
    `;
  }

  private renderStorageConfig() {
    const wizardState = this.wizardController.value;
    const { formData } = wizardState;
    const storagePools = this.storagePoolsController.value;
    const isos = this.isosController.value;
    const disks = formData.storage?.disks || [];

    return html`
      <div>
        <div class="form-group ${this.validationErrors.storage_pool ? 'error' : ''}">
          <label>
            Storage Pool <span class="required">*</span>
          </label>
          <select
            .value=${formData.storage?.default_pool || ''}
            @change=${(e: Event) => 
              this.updateFormData('storage.default_pool', (e.target as HTMLSelectElement).value)
            }
          >
            <option value="">Select a storage pool</option>
            ${storagePools.map(pool => html`
              <option value=${pool.name}>
                ${pool.name} (${this.formatBytes(pool.available)} available)
              </option>
            `)}
          </select>
          ${this.validationErrors.storage_pool ? html`
            <div class="error-message">${this.validationErrors.storage_pool}</div>
          ` : ''}
        </div>

        <div class="form-group">
          <label>Boot ISO (Optional)</label>
          <select
            .value=${formData.storage?.boot_iso || ''}
            @change=${(e: Event) => 
              this.updateFormData('storage.boot_iso', (e.target as HTMLSelectElement).value)
            }
          >
            <option value="">No ISO (network boot or existing disk)</option>
            ${isos.map(iso => html`
              <option value=${iso.id}>
                ${iso.name} (${this.formatBytes(iso.size)})
              </option>
            `)}
          </select>
          <div class="help-text">
            Select an ISO image to boot from during installation
          </div>
        </div>

        <div class="form-group ${this.validationErrors.disks ? 'error' : ''}">
          <label>
            Disks <span class="required">*</span>
          </label>
          <div class="disk-list">
            ${disks.length === 0 ? html`
              <div class="help-text">No disks configured. Add at least one disk.</div>
            ` : disks.map((disk, index) => html`
              <div class="disk-item">
                <div class="disk-info">
                  <div>
                    <strong>Disk ${index + 1}</strong>
                    ${disk.action === 'create' ? `(New ${disk.format || 'qcow2'})` : ''}
                  </div>
                  <div>
                    Size: 
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      style="width: 80px; padding: 4px 8px; margin: 0 4px;"
                      .value=${String(disk.size || 20)}
                      @input=${(e: InputEvent) => 
                        this.updateDisk(index, 'size', Number((e.target as HTMLInputElement).value))
                      }
                    /> GB
                  </div>
                  <div>
                    Format: 
                    <select
                      style="width: 100px; padding: 4px 8px; margin: 0 4px;"
                      .value=${disk.format || 'qcow2'}
                      @change=${(e: Event) => 
                        this.updateDisk(index, 'format', (e.target as HTMLSelectElement).value)
                      }
                    >
                      <option value="qcow2">QCOW2</option>
                      <option value="raw">RAW</option>
                    </select>
                  </div>
                </div>
                <button 
                  class="btn-remove" 
                  @click=${() => this.removeDisk(index)}
                >
                  Remove
                </button>
              </div>
            `)}
          </div>
          ${this.validationErrors.disks ? html`
            <div class="error-message">${this.validationErrors.disks}</div>
          ` : ''}
          <button class="btn-add" @click=${this.addDisk}>
            + Add Disk
          </button>
        </div>
      </div>
    `;
  }

  private renderNetworkConfig() {
    const wizardState = this.wizardController.value;
    const { formData } = wizardState;
    const networkConfig = formData.network || { type: 'nat' };

    return html`
      <div>
        <div class="form-group">
          <label>Network Type</label>
          <select
            .value=${networkConfig.type || 'nat'}
            @change=${(e: Event) => {
              const type = (e.target as HTMLSelectElement).value;
              this.updateFormData('network', { ...networkConfig, type });
            }}
          >
            <option value="nat">NAT (Default)</option>
            <option value="bridge">Bridge</option>
            <option value="user">User Mode</option>
            <option value="direct">Direct (Macvtap)</option>
          </select>
          <div class="help-text">
            NAT provides internet access through the host. Bridge connects directly to the network.
          </div>
        </div>

        ${networkConfig.type === 'bridge' ? html`
          <div class="form-group">
            <label>Bridge Interface</label>
            <input
              type="text"
              placeholder="br0"
              .value=${networkConfig.source || ''}
              @input=${(e: InputEvent) => 
                this.updateFormData('network', {
                  ...networkConfig,
                  source: (e.target as HTMLInputElement).value,
                })
              }
            />
            <div class="help-text">
              Name of the bridge interface to connect to
            </div>
          </div>
        ` : ''}

        <div class="advanced-toggle" @click=${() => this.showAdvancedOptions = !this.showAdvancedOptions}>
          <span>${this.showAdvancedOptions ? '▼' : '▶'}</span>
          <span>Advanced Network Options</span>
        </div>

        ${this.showAdvancedOptions ? html`
          <div class="advanced-options">
            <div class="form-group">
              <label>Network Model</label>
              <select
                .value=${networkConfig.model || 'virtio'}
                @change=${(e: Event) => 
                  this.updateFormData('network', {
                    ...networkConfig,
                    model: (e.target as HTMLSelectElement).value,
                  })
                }
              >
                <option value="virtio">VirtIO (Recommended)</option>
                <option value="e1000">Intel E1000</option>
                <option value="rtl8139">Realtek RTL8139</option>
              </select>
            </div>

            <div class="form-group">
              <label>MAC Address (Optional)</label>
              <input
                type="text"
                placeholder="52:54:00:xx:xx:xx (auto-generated if empty)"
                .value=${networkConfig.mac || ''}
                @input=${(e: InputEvent) => 
                  this.updateFormData('network', {
                    ...networkConfig,
                    mac: (e.target as HTMLInputElement).value,
                  })
                }
              />
              <div class="help-text">
                Leave empty to auto-generate a MAC address
              </div>
            </div>
          </div>
        ` : ''}

        <div class="form-group" style="margin-top: 24px;">
          <label>Graphics</label>
          <select
            .value=${formData.graphics?.type || 'vnc'}
            @change=${(e: Event) => {
              const type = (e.target as HTMLSelectElement).value;
              this.updateFormData('graphics', { type });
            }}
          >
            <option value="vnc">VNC</option>
            <option value="spice">SPICE</option>
            <option value="none">None (Headless)</option>
          </select>
          <div class="help-text">
            VNC or SPICE for remote desktop access
          </div>
        </div>
      </div>
    `;
  }

  private renderReview() {
    const wizardState = this.wizardController.value;
    const { formData } = wizardState;
    const storagePools = this.storagePoolsController.value;
    const selectedPool = storagePools.find(p => p.name === formData.storage?.default_pool);

    return html`
      <div>
        <div class="review-section">
          <h3>Basic Configuration</h3>
          <div class="review-grid">
            <div class="review-label">Name:</div>
            <div class="review-value">${formData.name || 'Not set'}</div>
            
            <div class="review-label">Description:</div>
            <div class="review-value">${formData.description || 'None'}</div>
            
            <div class="review-label">Memory:</div>
            <div class="review-value">${this.formatMemory(formData.memory || 0)}</div>
            
            <div class="review-label">vCPUs:</div>
            <div class="review-value">${formData.vcpus || 0}</div>
            
            <div class="review-label">OS Type:</div>
            <div class="review-value">${(formData as ExtendedVMCreateRequest).os_type || 'linux'}</div>
          </div>
        </div>

        <div class="review-section">
          <h3>Storage Configuration</h3>
          <div class="review-grid">
            <div class="review-label">Storage Pool:</div>
            <div class="review-value">
              ${selectedPool ? `${selectedPool.name} (${this.formatBytes(selectedPool.available)} available)` : 'Not selected'}
            </div>
            
            <div class="review-label">Boot ISO:</div>
            <div class="review-value">
              ${formData.storage?.boot_iso || 'None (network boot or existing disk)'}
            </div>
            
            <div class="review-label">Disks:</div>
            <div class="review-value">
              ${formData.storage?.disks?.map((disk, i) => html`
                <div>Disk ${i + 1}: ${disk.size}GB ${disk.format}</div>
              `) || 'No disks configured'}
            </div>
          </div>
        </div>

        <div class="review-section">
          <h3>Network Configuration</h3>
          <div class="review-grid">
            <div class="review-label">Network Type:</div>
            <div class="review-value">${formData.network?.type || 'NAT'}</div>
            
            ${formData.network?.source ? html`
              <div class="review-label">Bridge:</div>
              <div class="review-value">${formData.network.source}</div>
            ` : ''}
            
            <div class="review-label">Network Model:</div>
            <div class="review-value">${formData.network?.model || 'virtio'}</div>
            
            <div class="review-label">Graphics:</div>
            <div class="review-value">${formData.graphics?.type || 'VNC'}</div>
          </div>
        </div>

        ${this.isCreating ? html`
          <loading-state message="Creating virtual machine..."></loading-state>
        ` : ''}
      </div>
    `;
  }

  private formatMemory(mb: number): string {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb} MB`;
  }

  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  override render() {
    const wizardState = this.wizardController.value;
    
    if (!wizardState.isOpen) {
      return html``;
    }

    const steps = [
      { number: 1, label: 'Basic Configuration' },
      { number: 2, label: 'Storage' },
      { number: 3, label: 'Network' },
      { number: 4, label: 'Review & Create' },
    ];

    return html`
      <div class="wizard-overlay" @click=${this.handleOverlayClick}>
        <div class="wizard-container">
          <div class="wizard-header">
            <div class="wizard-title">Create Virtual Machine</div>
            <button 
              class="close-button" 
              @click=${this.handleClose}
              ?disabled=${this.isCreating}
              title="Close"
            >✕</button>
          </div>

          <div class="wizard-steps">
            ${steps.map(step => html`
              <div class="step ${wizardState.currentStep === step.number ? 'active' : ''} ${wizardState.currentStep > step.number ? 'completed' : ''}">
                <div class="step-number">
                  ${wizardState.currentStep > step.number ? '✓' : step.number}
                </div>
                <span>${step.label}</span>
              </div>
            `)}
          </div>

          <div class="wizard-body">
            ${wizardState.currentStep === 1 ? this.renderBasicConfig() :
              wizardState.currentStep === 2 ? this.renderStorageConfig() :
              wizardState.currentStep === 3 ? this.renderNetworkConfig() :
              wizardState.currentStep === 4 ? this.renderReview() :
              html`<div>Invalid step</div>`
            }
          </div>

          <div class="wizard-footer">
            <button class="btn-ghost" @click=${this.handleClose}>
              Cancel
            </button>
            
            <div class="button-group">
              <button 
                class="btn-secondary" 
                @click=${this.handlePrevious}
                ?disabled=${wizardState.currentStep === 1}
              >
                Previous
              </button>
              
              ${wizardState.currentStep < 4 ? html`
                <button 
                  class="btn-primary" 
                  @click=${this.handleNext}
                >
                  Next
                </button>
              ` : html`
                <button 
                  class="btn-primary" 
                  @click=${this.handleCreate}
                  ?disabled=${this.isCreating}
                >
                  ${this.isCreating ? 'Creating...' : 'Create VM'}
                </button>
              `}
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'create-vm-wizard': CreateVMWizard;
  }
}
