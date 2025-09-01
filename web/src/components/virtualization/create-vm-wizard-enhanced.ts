/**
 * Enhanced VM Creation Wizard Component
 * Comprehensive wizard for creating virtual machines with all available options
 */

import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { StoreController } from '@nanostores/lit';

// Import config for API URL
import { getApiUrl } from '../../config';

// Import store and types
import {
  $vmWizardState,
  $availableStoragePools,
  $availableISOs,
  wizardActions,
  vmActions,
  storagePoolStore,
  isoStore,
  templateStore,
  networkStore,
} from '../../stores/virtualization';
import type { VMTemplate, VirtualNetwork } from '../../types/virtualization';

// Import network store for bridge interfaces
import { $bridges, initializeNetworkStore } from '../../stores/network';

// Import UI components
import '../ui/loading-state.js';
import '../ui/empty-state.js';

interface EnhancedDiskConfig {
  action: 'create' | 'clone' | 'attach';
  size?: number;
  format?: 'qcow2' | 'raw' | 'vmdk' | 'vdi';
  storage_pool?: string;
  clone_from?: string;
  path?: string;
  device?: 'disk' | 'cdrom';
  bus?: 'virtio' | 'scsi' | 'ide' | 'sata';
  boot_order?: number;
  cache?: 'none' | 'writeback' | 'writethrough' | 'directsync' | 'unsafe';
  io_mode?: 'native' | 'threads';
  target?: string;
  readonly?: boolean;
}

interface NetworkInterface {
  type: 'network' | 'bridge' | 'direct' | 'user';
  source?: string;
  model?: 'virtio' | 'e1000' | 'rtl8139' | 'vmxnet3';
  mac?: string;
}

interface GraphicsConfig {
  type: 'vnc' | 'spice' | 'egl-headless' | 'none';
  port?: number;
  autoport?: boolean;
  listen?: string;
  password?: string;
}

interface PCIDevice {
  host_address: string;
  guest_address?: string;
  rom_file?: string;
  multifunction?: boolean;
  primary_gpu?: boolean;
}

interface CloudInitUser {
  name: string;
  ssh_authorized_keys?: string[];
  sudo?: string;
  groups?: string;
  shell?: string;
  password?: string;
}

interface CloudInitConfig {
  user_data?: string;
  meta_data?: string;
  network_data?: string;
  ssh_keys?: string[];
  users?: CloudInitUser[];
  packages?: string[];
}

interface EnhancedVMCreateRequest {
  name: string;
  memory: number;
  vcpus: number;
  storage: {
    default_pool: string;
    boot_iso?: string;
    disks: EnhancedDiskConfig[];
  };
  os_type?: string;
  os_variant?: string;
  architecture?: string;
  uefi?: boolean;
  secure_boot?: boolean;
  tpm?: boolean;
  networks?: NetworkInterface[];
  graphics?: GraphicsConfig[];
  pci_devices?: PCIDevice[];
  cloud_init?: CloudInitConfig;
  template?: string;
  autostart?: boolean;
  custom_xml?: string;
  metadata?: Record<string, string>;
}

@customElement('create-vm-wizard-enhanced')
export class CreateVMWizardEnhanced extends LitElement {
  // Store controllers
  private wizardController = new StoreController(this, $vmWizardState);
  private storagePoolsController = new StoreController(this, $availableStoragePools);
  private isosController = new StoreController(this, $availableISOs);
  private templatesController = new StoreController(this, templateStore.$items);
  private networksController = new StoreController(this, networkStore.$items);
  private bridgesController = new StoreController(this, $bridges);

  // Component state
  @state() private isCreating = false;
  @state() private validationErrors: Record<string, string> = {};
  @state() private expandedSections: Set<string> = new Set(['basic']);
  @state() private currentStep = 1;
  @state() private availablePCIDevices: any[] = [];
  @state() private isLoadingPCIDevices = false;
  @state() private editMode = false;
  @state() private editingVmId: string | null = null;
  @state() private formData: Partial<EnhancedVMCreateRequest> = {
    memory: 2048,
    vcpus: 2,
    os_type: 'linux',
    architecture: 'x86_64',
    storage: {
      default_pool: '',
      disks: []
    },
    networks: [{
      type: 'network',
      source: 'default',
      model: 'virtio'
    }],
    graphics: [{
      type: 'vnc',
      autoport: true,
      listen: '0.0.0.0'
    }]
  };

  static override styles = css`
    :host {
      display: block;
      position: fixed;
      top: 0;
      right: 0;
      width: 900px;
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
      background: var(--vscode-editor-background, #1e1e1e);
      box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;
      transform: translateX(100%);
      transition: transform 0.3s ease-out;
      border-left: 1px solid var(--vscode-widget-border, #454545);
    }

    :host([show]) .drawer {
      transform: translateX(0);
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0.8;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0.8;
      }
    }

    :host(:not([show])) .drawer {
      animation: slideOut 0.3s ease-in;
    }

    @media (max-width: 1200px) {
      :host {
        width: 75%;
      }
    }

    @media (max-width: 768px) {
      :host {
        width: 100%;
      }
    }

    .drawer-header {
      padding: 20px;
      background: var(--vscode-bg-lighter, #2c2f3a);
      border-bottom: 1px solid var(--vscode-widget-border, #454545);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }

    .header-title {
      font-size: 18px;
      font-weight: 500;
      color: var(--title-color, #e0e0e0);
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .wizard-steps {
      display: flex;
      gap: 16px;
      padding: 16px 20px;
      border-bottom: 1px solid var(--vscode-widget-border, #454545);
      background: var(--vscode-bg-lighter, #2c2f3a);
      flex-shrink: 0;
      overflow-x: auto;
    }

    .step {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--vscode-descriptionForeground);
      font-size: 13px;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .step:hover {
      background: var(--vscode-toolbar-hoverBackground);
    }

    .step.active {
      color: var(--vscode-foreground);
      font-weight: 500;
      background: var(--vscode-list-activeSelectionBackground);
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

    .content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .wizard-body {
      flex: 1;
      padding: 24px;
      overflow-y: auto;
      background: var(--vscode-editor-background);
    }

    .controls {
      padding: 20px;
      border-top: 1px solid var(--vscode-widget-border, #454545);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      background: var(--vscode-bg-lighter, #2c2f3a);
      flex-shrink: 0;
    }

    /* Collapsible sections */
    .section {
      margin-bottom: 24px;
      border: 1px solid var(--vscode-widget-border, #454545);
      border-radius: 6px;
      overflow: hidden;
    }

    .section-header {
      padding: 12px 16px;
      background: var(--vscode-editor-inactiveSelectionBackground);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      user-select: none;
      transition: background 0.2s;
    }

    .section-header:hover {
      background: var(--vscode-list-hoverBackground);
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 500;
      color: var(--vscode-foreground);
    }

    .section-toggle {
      transition: transform 0.2s;
    }

    .section.expanded .section-toggle {
      transform: rotate(90deg);
    }

    .section-content {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease;
    }

    .section.expanded .section-content {
      max-height: none;
      padding: 16px;
    }

    /* Form elements */
    .form-group {
      margin-bottom: 20px;
      width: 100%;
      box-sizing: border-box;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-size: 13px;
      font-weight: 500;
      color: var(--vscode-foreground, #cccccc);
    }

    .required {
      color: var(--vscode-errorForeground, #f48771);
    }

    input,
    select,
    textarea {
      width: 100%;
      max-width: 100%;
      padding: 8px 12px;
      background: var(--vscode-input-background, #3c3c3c);
      color: var(--vscode-input-foreground, #cccccc);
      border: 1px solid var(--vscode-input-border, #858585);
      border-radius: 4px;
      font-size: 13px;
      font-family: inherit;
      transition: all 0.2s;
      box-sizing: border-box;
    }

    input:focus,
    select:focus,
    textarea:focus {
      outline: none;
      border-color: var(--vscode-focusBorder, #007acc);
      box-shadow: 0 0 0 1px var(--vscode-focusBorder, #007acc);
    }

    .checkbox-group {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }

    input[type="checkbox"] {
      width: auto;
      margin: 0;
    }

    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    /* Lists */
    .list-container {
      border: 1px solid var(--vscode-widget-border, #454545);
      border-radius: 4px;
      padding: 12px;
      margin-bottom: 16px;
      background: var(--vscode-editor-inactiveSelectionBackground);
    }

    .list-item {
      padding: 12px;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-widget-border, #454545);
      border-radius: 4px;
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
      align-items: start;
    }

    .list-item-content {
      flex: 1;
    }

    .list-item-actions {
      display: flex;
      gap: 8px;
    }

    /* Buttons */
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

    .btn-ghost {
      background: transparent;
      color: var(--vscode-foreground);
    }

    .btn-add {
      background: transparent;
      color: var(--vscode-textLink-foreground, #3794ff);
      border: 1px dashed var(--vscode-textLink-foreground, #3794ff);
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .btn-add:hover {
      background: var(--vscode-textLink-foreground, #3794ff);
      color: white;
      border-style: solid;
    }

    .btn-remove {
      padding: 4px 8px;
      background: var(--vscode-inputValidation-errorBackground);
      color: var(--vscode-inputValidation-errorForeground);
      border: none;
      font-size: 12px;
    }

    .close-button {
      background: none;
      border: none;
      color: var(--close-color, #999);
      cursor: pointer;
      padding: 8px;
      border-radius: 4px;
      transition: all 0.2s;
    }

    .close-button:hover {
      background: var(--close-hover-bg, rgba(255, 255, 255, 0.1));
      color: var(--close-hover-color, #e0e0e0);
    }

    .help-text {
      margin-top: 6px;
      font-size: 12px;
      color: var(--vscode-descriptionForeground, #8b8b8b);
      line-height: 1.4;
    }

    .error-message {
      margin-top: 6px;
      font-size: 12px;
      color: var(--vscode-errorForeground, #f48771);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    /* Code editor */
    .code-editor {
      font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
      font-size: 12px;
      line-height: 1.5;
      min-height: 200px;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-widget-border);
      border-radius: 4px;
      padding: 12px;
    }

    /* Tabs for sub-sections */
    .tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
      border-bottom: 1px solid var(--vscode-widget-border);
    }

    .tab {
      padding: 8px 16px;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: var(--vscode-foreground);
      cursor: pointer;
      transition: all 0.2s;
    }

    .tab:hover {
      background: var(--vscode-toolbar-hoverBackground);
    }

    .tab.active {
      border-bottom-color: var(--vscode-focusBorder);
      color: var(--vscode-textLink-foreground);
    }

    .tab-content {
      display: none;
    }

    .tab-content.active {
      display: block;
    }

    /* Badge */
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: 500;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
    }

    .input-with-unit {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .input-with-unit input {
      flex: 1;
    }

    .unit {
      padding: 8px 12px;
      background: var(--vscode-button-secondaryBackground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      font-size: 13px;
      color: var(--vscode-descriptionForeground);
      white-space: nowrap;
    }
  `;

  override connectedCallback() {
    super.connectedCallback();
    this.loadData();
  }

  private async loadData() {
    try {
      await Promise.all([
        storagePoolStore.fetch(),
        isoStore.fetch(),
        templateStore.fetch(), // Fetch templates from /virtualization/computes/templates
        networkStore.fetch(), // Fetch networks from /virtualization/networks
        initializeNetworkStore(), // Initialize network store to load bridges and interfaces
        this.loadPCIDevices(), // Load available PCI devices
      ]);
    } catch (error) {
      console.error('Failed to load data for VM wizard:', error);
    }
  }

  private async loadPCIDevices() {
    this.isLoadingPCIDevices = true;
    try {
      // Use the getApiUrl from config for consistency with other API calls
      const token = localStorage.getItem('jwt_token') || localStorage.getItem('auth_token') || localStorage.getItem('token');
      const response = await fetch(getApiUrl('/virtualization/computes/pci-devices'), {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        // Handle the response structure
        if (result.status === 'success' && result.data?.devices) {
          this.availablePCIDevices = result.data.devices;
        } else if (result.devices) {
          this.availablePCIDevices = result.devices;
        } else if (Array.isArray(result)) {
          this.availablePCIDevices = result;
        } else {
          this.availablePCIDevices = [];
          console.warn('Unexpected PCI devices response format:', result);
        }
      } else {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        console.error('Failed to fetch PCI devices:', errorData.message || response.statusText);
        this.availablePCIDevices = [];
      }
    } catch (error) {
      console.error('Failed to load PCI devices:', error);
      this.availablePCIDevices = [];
    } finally {
      this.isLoadingPCIDevices = false;
    }
  }

  private toggleSection(section: string) {
    if (this.expandedSections.has(section)) {
      this.expandedSections.delete(section);
    } else {
      this.expandedSections.add(section);
    }
    this.requestUpdate();
  }

  private handleClose() {
    if (!this.isCreating) {
      wizardActions.closeWizard();
    }
  }

  private goToStep(step: number) {
    this.currentStep = step;
  }

  private handlePrevious() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  private handleNext() {
    if (this.validateStep(this.currentStep)) {
      if (this.currentStep < 6) {
        this.currentStep++;
      }
    }
  }

  private validateStep(step: number): boolean {
    const errors: Record<string, string> = {};

    switch (step) {
      case 1: // Basic configuration
        if (!this.formData.name) {
          errors.name = 'VM name is required';
        }
        if (!this.formData.memory || this.formData.memory < 512) {
          errors.memory = 'Memory must be at least 512 MB';
        }
        if (!this.formData.vcpus || this.formData.vcpus < 1) {
          errors.vcpus = 'At least 1 vCPU is required';
        }
        break;
      case 2: // Storage
        if (!this.formData.storage?.default_pool) {
          errors.storage_pool = 'Storage pool is required';
        }
        break;
      case 3: // Network
        // Optional
        break;
      case 4: // Advanced
        // Optional
        break;
      case 5: // Cloud-Init
        // Optional
        break;
    }

    this.validationErrors = errors;
    return Object.keys(errors).length === 0;
  }

  private async handleCreate() {
    // Validate all steps
    for (let step = 1; step <= 5; step++) {
      if (!this.validateStep(step)) {
        this.currentStep = step;
        return;
      }
    }

    this.isCreating = true;

    try {
      if (this.editMode && this.editingVmId) {
        // Update existing VM
        await vmActions.update(this.editingVmId, this.formData as any);
        this.showNotification('Virtual machine updated successfully', 'success');
      } else {
        // Create new VM
        const token = localStorage.getItem('jwt_token') || localStorage.getItem('auth_token') || localStorage.getItem('token');
        const response = await fetch(getApiUrl('/virtualization/computes'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
          },
          body: JSON.stringify(this.formData),
        });

        if (response.ok) {
          this.showNotification('Virtual machine created successfully', 'success');
        } else {
          const error = await response.json();
          // Handle new error format with status and error fields
          if (error.status === 'error' && error.error) {
            throw new Error(error.error.message || error.error.details || 'Failed to create virtual machine');
          } else {
            throw new Error(error.message || 'Failed to create virtual machine');
          }
        }
      }
      
      wizardActions.closeWizard();
      // Refresh VM list
      await vmActions.fetchAll();
    } catch (error) {
      console.error(`Failed to ${this.editMode ? 'update' : 'create'} VM:`, error);
      this.showNotification(
        error instanceof Error ? error.message : `Failed to ${this.editMode ? 'update' : 'create'} virtual machine`,
        'error'
      );
    } finally {
      this.isCreating = false;
    }
  }

  private updateFormData(path: string, value: any) {
    const keys = path.split('.');
    let obj: any = this.formData;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (key && !obj[key]) {
        obj[key] = {};
      }
      if (key) {
        obj = obj[key];
      }
    }
    
    const lastKey = keys[keys.length - 1];
    if (lastKey) {
      obj[lastKey] = value;
    }
    this.requestUpdate();
  }

  private addDisk() {
    if (!this.formData.storage) {
      this.formData.storage = { default_pool: '', disks: [] };
    }
    if (!this.formData.storage.disks) {
      this.formData.storage.disks = [];
    }
    
    this.formData.storage.disks.push({
      action: 'create',
      size: 20,
      format: 'qcow2',
      bus: 'virtio',
    });
    this.requestUpdate();
  }

  private removeDisk(index: number) {
    if (this.formData.storage?.disks) {
      this.formData.storage.disks.splice(index, 1);
      this.requestUpdate();
    }
  }

  private addNetwork() {
    if (!this.formData.networks) {
      this.formData.networks = [];
    }
    
    this.formData.networks.push({
      type: 'network',
      source: 'default',
      model: 'virtio',
    });
    this.requestUpdate();
  }

  private removeNetwork(index: number) {
    if (this.formData.networks) {
      this.formData.networks.splice(index, 1);
      this.requestUpdate();
    }
  }

  private addGraphics() {
    if (!this.formData.graphics) {
      this.formData.graphics = [];
    }
    
    this.formData.graphics.push({
      type: 'vnc',
      autoport: true,
      listen: '0.0.0.0',
    });
    this.requestUpdate();
  }

  private removeGraphics(index: number) {
    if (this.formData.graphics) {
      this.formData.graphics.splice(index, 1);
      this.requestUpdate();
    }
  }

  private addPCIDevice() {
    if (!this.formData.pci_devices) {
      this.formData.pci_devices = [];
    }
    
    this.formData.pci_devices.push({
      host_address: '',
    });
    this.requestUpdate();
  }

  private removePCIDevice(index: number) {
    if (this.formData.pci_devices) {
      this.formData.pci_devices.splice(index, 1);
      this.requestUpdate();
    }
  }

  private showNotification(message: string, type: 'success' | 'error' | 'info' = 'info') {
    this.dispatchEvent(new CustomEvent('show-notification', {
      detail: { message, type },
      bubbles: true,
      composed: true,
    }));
  }

  private renderBasicConfig() {

    return html`
      <div class="section ${this.expandedSections.has('basic') ? 'expanded' : ''}">
        <div class="section-header" @click=${() => this.toggleSection('basic')}>
          <div class="section-title">
            <span class="section-toggle">▶</span>
            <span>Basic Configuration</span>
            <span class="badge">Required</span>
          </div>
        </div>
        <div class="section-content">
          <div class="form-group">
            <label>VM Name <span class="required">*</span></label>
            <input
              type="text"
              placeholder="my-virtual-machine"
              .value=${this.formData.name || ''}
              @input=${(e: InputEvent) => 
                this.updateFormData('name', (e.target as HTMLInputElement).value)
              }
            />
            ${this.validationErrors.name ? html`
              <div class="error-message">${this.validationErrors.name}</div>
            ` : html`
              <div class="help-text">Alphanumeric characters, hyphens, and underscores only</div>
            `}
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label>Memory <span class="required">*</span></label>
              <div class="input-with-unit">
                <input
                  type="number"
                  min="512"
                  max="524288"
                  step="512"
                  .value=${String(this.formData.memory || 2048)}
                  @input=${(e: InputEvent) => 
                    this.updateFormData('memory', Number((e.target as HTMLInputElement).value))
                  }
                />
                <span class="unit">MB</span>
              </div>
              ${this.validationErrors.memory ? html`
                <div class="error-message">${this.validationErrors.memory}</div>
              ` : ''}
            </div>

            <div class="form-group">
              <label>vCPUs <span class="required">*</span></label>
              <input
                type="number"
                min="1"
                max="128"
                .value=${String(this.formData.vcpus || 2)}
                @input=${(e: InputEvent) => 
                  this.updateFormData('vcpus', Number((e.target as HTMLInputElement).value))
                }
              />
              ${this.validationErrors.vcpus ? html`
                <div class="error-message">${this.validationErrors.vcpus}</div>
              ` : ''}
            </div>
          </div>

          <div class="grid-3">
            <div class="form-group">
              <label>OS Type</label>
              <select
                .value=${this.formData.os_type || 'linux'}
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

            <div class="form-group">
              <label>OS Variant</label>
              <input
                type="text"
                placeholder="ubuntu22.04"
                .value=${this.formData.os_variant || ''}
                @input=${(e: InputEvent) => 
                  this.updateFormData('os_variant', (e.target as HTMLInputElement).value)
                }
              />
              <div class="help-text">e.g., ubuntu22.04, win11, rhel9</div>
            </div>

            <div class="form-group">
              <label>Architecture</label>
              <select
                .value=${this.formData.architecture || 'x86_64'}
                @change=${(e: Event) => 
                  this.updateFormData('architecture', (e.target as HTMLSelectElement).value)
                }
              >
                <option value="x86_64">x86_64</option>
                <option value="aarch64">ARM64</option>
                <option value="ppc64le">PowerPC</option>
                <option value="s390x">s390x</option>
              </select>
            </div>
          </div>

          <div class="grid-3">
            <div class="checkbox-group">
              <input
                type="checkbox"
                id="uefi"
                ?checked=${this.formData.uefi}
                @change=${(e: Event) => 
                  this.updateFormData('uefi', (e.target as HTMLInputElement).checked)
                }
              />
              <label for="uefi">Enable UEFI</label>
            </div>

            <div class="checkbox-group">
              <input
                type="checkbox"
                id="secure_boot"
                ?checked=${this.formData.secure_boot}
                @change=${(e: Event) => 
                  this.updateFormData('secure_boot', (e.target as HTMLInputElement).checked)
                }
              />
              <label for="secure_boot">Secure Boot</label>
            </div>

            <div class="checkbox-group">
              <input
                type="checkbox"
                id="tpm"
                ?checked=${this.formData.tpm}
                @change=${(e: Event) => 
                  this.updateFormData('tpm', (e.target as HTMLInputElement).checked)
                }
              />
              <label for="tpm">Enable TPM</label>
            </div>
          </div>

          <div class="checkbox-group">
            <input
              type="checkbox"
              id="autostart"
              ?checked=${this.formData.autostart}
              @change=${(e: Event) => 
                this.updateFormData('autostart', (e.target as HTMLInputElement).checked)
              }
            />
            <label for="autostart">Autostart VM with host</label>
          </div>

          <div class="form-group">
            <label>Template (Optional)</label>
            <select
              .value=${this.formData.template || ''}
              @change=${(e: Event) => {
                const selectedValue = (e.target as HTMLSelectElement).value;
                this.updateFormData('template', selectedValue);
                
                // If a template is selected, auto-populate form fields
                if (selectedValue) {
                  const templates = this.templatesController.value;
                  const templatesArray = templates instanceof Map ? Array.from(templates.values()) : 
                                         Array.isArray(templates) ? templates : [];
                  const selectedTemplate = templatesArray.find((t: VMTemplate) => t.id === selectedValue);
                  
                  if (selectedTemplate) {
                    // Auto-populate fields from template
                    this.updateFormData('memory', selectedTemplate.memory || 2048);
                    this.updateFormData('vcpus', selectedTemplate.vcpus || 2);
                    this.updateFormData('os_type', selectedTemplate.os_type || 'linux');
                    this.updateFormData('os_variant', selectedTemplate.os_variant || '');
                    
                    // Update disk size if template has it
                    if (selectedTemplate.disk_size && this.formData.storage?.disks?.length === 0) {
                      this.addDisk();
                      if (this.formData.storage?.disks?.[0]) {
                        this.formData.storage.disks[0].size = selectedTemplate.disk_size;
                      }
                    }
                    
                    this.showNotification(`Template "${selectedTemplate.name}" applied`, 'info');
                  }
                }
              }}
            >
              <option value="">No template</option>
              ${(() => {
                const templates = this.templatesController.value;
                const templatesArray = templates instanceof Map ? Array.from(templates.values()) : 
                                       Array.isArray(templates) ? templates : [];
                
                return templatesArray.map((template: VMTemplate) => html`
                  <option value=${template.id}>
                    ${template.name} - ${template.description || `${template.os_type}/${template.os_variant || 'default'}`}
                  </option>
                `);
              })()}
            </select>
            <div class="help-text">Select a VM template to pre-populate configuration</div>
          </div>
        </div>
      </div>
    `;
  }

  private renderStorageConfig() {
    const storagePools = this.storagePoolsController.value;
    const isos = this.isosController.value;

    return html`
      <div class="section ${this.expandedSections.has('storage') ? 'expanded' : ''}">
        <div class="section-header" @click=${() => this.toggleSection('storage')}>
          <div class="section-title">
            <span class="section-toggle">▶</span>
            <span>Storage Configuration</span>
            <span class="badge">Required</span>
          </div>
        </div>
        <div class="section-content">
          <div class="form-group">
            <label>Default Storage Pool <span class="required">*</span></label>
            <select
              .value=${this.formData.storage?.default_pool || ''}
              @change=${(e: Event) => 
                this.updateFormData('storage.default_pool', (e.target as HTMLSelectElement).value)
              }
            >
              <option value="">Select a storage pool</option>
              ${storagePools.map(pool => html`
                <option value=${pool.name}>${pool.name}</option>
              `)}
            </select>
            ${this.validationErrors.storage_pool ? html`
              <div class="error-message">${this.validationErrors.storage_pool}</div>
            ` : ''}
          </div>

          <div class="form-group">
            <label>Boot ISO (Optional)</label>
            <select
              .value=${this.formData.storage?.boot_iso || ''}
              @change=${(e: Event) => 
                this.updateFormData('storage.boot_iso', (e.target as HTMLSelectElement).value)
              }
            >
              <option value="">No ISO</option>
              ${isos.map(iso => html`
                <option value=${iso.path}>${iso.name}</option>
              `)}
            </select>
          </div>

          <div class="form-group">
            <label>Disks</label>
            <div class="list-container">
              ${this.formData.storage?.disks?.map((disk, index) => html`
                <div class="list-item">
                  <div class="list-item-content">
                    <div class="grid-3">
                      <select
                        .value=${disk.action}
                        @change=${(e: Event) => {
                          disk.action = (e.target as HTMLSelectElement).value as any;
                          this.requestUpdate();
                        }}
                      >
                        <option value="create">Create New</option>
                        <option value="clone">Clone From</option>
                        <option value="attach">Attach Existing</option>
                      </select>

                      ${disk.action === 'create' ? html`
                        <input
                          type="number"
                          placeholder="Size (GB)"
                          .value=${String(disk.size || 20)}
                          @input=${(e: InputEvent) => {
                            disk.size = Number((e.target as HTMLInputElement).value);
                            this.requestUpdate();
                          }}
                        />
                        <select
                          .value=${disk.format || 'qcow2'}
                          @change=${(e: Event) => {
                            disk.format = (e.target as HTMLSelectElement).value as any;
                            this.requestUpdate();
                          }}
                        >
                          <option value="qcow2">QCOW2</option>
                          <option value="raw">RAW</option>
                          <option value="vmdk">VMDK</option>
                          <option value="vdi">VDI</option>
                        </select>
                      ` : disk.action === 'clone' ? html`
                        <input
                          type="text"
                          placeholder="Source path"
                          .value=${disk.clone_from || ''}
                          @input=${(e: InputEvent) => {
                            disk.clone_from = (e.target as HTMLInputElement).value;
                            this.requestUpdate();
                          }}
                        />
                      ` : html`
                        <input
                          type="text"
                          placeholder="Disk path"
                          .value=${disk.path || ''}
                          @input=${(e: InputEvent) => {
                            disk.path = (e.target as HTMLInputElement).value;
                            this.requestUpdate();
                          }}
                        />
                      `}
                    </div>

                    <div class="grid-3" style="margin-top: 8px;">
                      <select
                        .value=${disk.bus || 'virtio'}
                        @change=${(e: Event) => {
                          disk.bus = (e.target as HTMLSelectElement).value as any;
                          this.requestUpdate();
                        }}
                      >
                        <option value="virtio">VirtIO</option>
                        <option value="scsi">SCSI</option>
                        <option value="ide">IDE</option>
                        <option value="sata">SATA</option>
                      </select>

                      <input
                        type="text"
                        placeholder="Target (e.g., vda)"
                        .value=${disk.target || ''}
                        @input=${(e: InputEvent) => {
                          disk.target = (e.target as HTMLInputElement).value;
                          this.requestUpdate();
                        }}
                      />

                      <input
                        type="number"
                        placeholder="Boot order"
                        min="1"
                        .value=${String(disk.boot_order || '')}
                        @input=${(e: InputEvent) => {
                          disk.boot_order = Number((e.target as HTMLInputElement).value);
                          this.requestUpdate();
                        }}
                      />
                    </div>

                    <div class="checkbox-group" style="margin-top: 8px;">
                      <input
                        type="checkbox"
                        id="readonly-${index}"
                        ?checked=${disk.readonly}
                        @change=${(e: Event) => {
                          disk.readonly = (e.target as HTMLInputElement).checked;
                          this.requestUpdate();
                        }}
                      />
                      <label for="readonly-${index}">Read-only</label>
                    </div>
                  </div>
                  <div class="list-item-actions">
                    <button class="btn-remove" @click=${() => this.removeDisk(index)}>
                      Remove
                    </button>
                  </div>
                </div>
              `) || html`<div class="help-text">No disks configured</div>`}
              <button class="btn-add" @click=${this.addDisk}>
                + Add Disk
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderNetworkConfig() {
    return html`
      <div class="section ${this.expandedSections.has('network') ? 'expanded' : ''}">
        <div class="section-header" @click=${() => this.toggleSection('network')}>
          <div class="section-title">
            <span class="section-toggle">▶</span>
            <span>Network Configuration</span>
          </div>
        </div>
        <div class="section-content">
          <div class="form-group">
            <label>Network Interfaces</label>
            <div class="list-container">
              ${this.formData.networks?.map((network, index) => html`
                <div class="list-item">
                  <div class="list-item-content">
                    <div class="grid-3">
                      <select
                        .value=${network.type}
                        @change=${(e: Event) => {
                          network.type = (e.target as HTMLSelectElement).value as any;
                          this.requestUpdate();
                        }}
                      >
                        <option value="network">Network</option>
                        <option value="bridge">Bridge</option>
                        <option value="direct">Direct (Macvtap)</option>
                        <option value="user">User Mode</option>
                      </select>

                      ${network.type === 'network' ? html`
                        <select
                          .value=${network.source || 'default'}
                          @change=${(e: Event) => {
                            network.source = (e.target as HTMLSelectElement).value;
                            this.requestUpdate();
                          }}
                        >
                          <option value="default">default</option>
                          ${(() => {
                            const networks = this.networksController.value;
                            const networksArray = networks instanceof Map ? Array.from(networks.values()) : 
                                                   Array.isArray(networks) ? networks : [];
                            
                            return networksArray.map((virtualNetwork: VirtualNetwork) => html`
                              <option value=${virtualNetwork.name}>
                                ${virtualNetwork.name} ${virtualNetwork.state === 'active' ? '(Active)' : '(Inactive)'}
                              </option>
                            `);
                          })()}
                        </select>
                      ` : network.type === 'bridge' ? html`
                        <select
                          .value=${network.source || ''}
                          @change=${(e: Event) => {
                            network.source = (e.target as HTMLSelectElement).value;
                            this.requestUpdate();
                          }}
                        >
                          <option value="">Select a bridge</option>
                          ${(() => {
                            const bridges = this.bridgesController.value || [];
                            // Filter to only show bridge type interfaces
                            const bridgeInterfaces = bridges.filter(iface => 
                              iface.type === 'bridge'
                            );
                            
                            return bridgeInterfaces.map(bridge => html`
                              <option value=${bridge.name}>
                                ${bridge.name} ${bridge.state === 'up' ? '(Up)' : '(Down)'}
                              </option>
                            `);
                          })()}
                        </select>
                      ` : html`
                        <input
                          type="text"
                          placeholder="Source (e.g., default, br0)"
                          .value=${network.source || ''}
                          @input=${(e: InputEvent) => {
                            network.source = (e.target as HTMLInputElement).value;
                            this.requestUpdate();
                          }}
                        />
                      `}

                      <select
                        .value=${network.model || 'virtio'}
                        @change=${(e: Event) => {
                          network.model = (e.target as HTMLSelectElement).value as any;
                          this.requestUpdate();
                        }}
                      >
                        <option value="virtio">VirtIO</option>
                        <option value="e1000">Intel E1000</option>
                        <option value="rtl8139">Realtek RTL8139</option>
                        <option value="vmxnet3">VMware vmxnet3</option>
                      </select>
                    </div>

                    <div class="form-group" style="margin-top: 8px;">
                      <input
                        type="text"
                        placeholder="MAC Address (optional, auto-generated if empty)"
                        .value=${network.mac || ''}
                        @input=${(e: InputEvent) => {
                          network.mac = (e.target as HTMLInputElement).value;
                          this.requestUpdate();
                        }}
                      />
                    </div>
                  </div>
                  <div class="list-item-actions">
                    <button class="btn-remove" @click=${() => this.removeNetwork(index)}>
                      Remove
                    </button>
                  </div>
                </div>
              `) || ''}
              <button class="btn-add" @click=${this.addNetwork}>
                + Add Network Interface
              </button>
            </div>
          </div>

          <div class="form-group">
            <label>Graphics</label>
            <div class="list-container">
              ${this.formData.graphics?.map((graphics, index) => html`
                <div class="list-item">
                  <div class="list-item-content">
                    <div class="grid-3">
                      <select
                        .value=${graphics.type}
                        @change=${(e: Event) => {
                          graphics.type = (e.target as HTMLSelectElement).value as any;
                          this.requestUpdate();
                        }}
                      >
                        <option value="vnc">VNC</option>
                        <option value="spice">SPICE</option>
                        <option value="egl-headless">EGL Headless</option>
                        <option value="none">None</option>
                      </select>

                      ${graphics.type !== 'none' && graphics.type !== 'egl-headless' ? html`
                        <input
                          type="number"
                          placeholder="Port (auto if empty)"
                          .value=${String(graphics.port || '')}
                          @input=${(e: InputEvent) => {
                            graphics.port = Number((e.target as HTMLInputElement).value);
                            this.requestUpdate();
                          }}
                        />

                        <input
                          type="text"
                          placeholder="Listen address"
                          .value=${graphics.listen || '0.0.0.0'}
                          @input=${(e: InputEvent) => {
                            graphics.listen = (e.target as HTMLInputElement).value;
                            this.requestUpdate();
                          }}
                        />
                      ` : ''}
                    </div>

                    ${graphics.type !== 'none' && graphics.type !== 'egl-headless' ? html`
                      <div class="grid-2" style="margin-top: 8px;">
                        <input
                          type="password"
                          placeholder="Password (optional)"
                          .value=${graphics.password || ''}
                          @input=${(e: InputEvent) => {
                            graphics.password = (e.target as HTMLInputElement).value;
                            this.requestUpdate();
                          }}
                        />

                        <div class="checkbox-group">
                          <input
                            type="checkbox"
                            id="autoport-${index}"
                            ?checked=${graphics.autoport}
                            @change=${(e: Event) => {
                              graphics.autoport = (e.target as HTMLInputElement).checked;
                              this.requestUpdate();
                            }}
                          />
                          <label for="autoport-${index}">Auto-assign port</label>
                        </div>
                      </div>
                    ` : ''}
                  </div>
                  <div class="list-item-actions">
                    <button class="btn-remove" @click=${() => this.removeGraphics(index)}>
                      Remove
                    </button>
                  </div>
                </div>
              `) || ''}
              <button class="btn-add" @click=${this.addGraphics}>
                + Add Graphics
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderAdvancedConfig() {
    return html`
      <div class="section ${this.expandedSections.has('advanced') ? 'expanded' : ''}">
        <div class="section-header" @click=${() => this.toggleSection('advanced')}>
          <div class="section-title">
            <span class="section-toggle">▶</span>
            <span>Advanced Configuration</span>
          </div>
        </div>
        <div class="section-content">
          <div class="form-group">
            <label>PCI Device Passthrough</label>
            <div class="help-text">Configure PCI devices (GPUs, network cards, USB controllers) to pass through to the VM</div>
            
            ${this.isLoadingPCIDevices ? html`
              <div class="list-container">
                <div class="help-text">Loading available PCI devices...</div>
              </div>
            ` : html`
              <div class="list-container">
                ${this.formData.pci_devices?.map((device, index) => html`
                  <div class="list-item">
                    <div class="list-item-content">
                      <div class="grid-2">
                        <div class="form-group">
                          <label>Host PCI Address <span class="required">*</span></label>
                          ${this.availablePCIDevices.length > 0 ? html`
                            <select
                              .value=${device.host_address || ''}
                              @change=${(e: Event) => {
                                const value = (e.target as HTMLSelectElement).value;
                                device.host_address = value;
                                
                                // Auto-populate device info if selected from list
                                const selectedDevice = this.availablePCIDevices.find(d => d.pci_address === value);
                                if (selectedDevice) {
                                  // Show device info
                                  this.showNotification(
                                    `Selected: ${selectedDevice.product_name || 'Unknown Device'} (${selectedDevice.vendor_name || 'Unknown Vendor'})`,
                                    'info'
                                  );
                                }
                                this.requestUpdate();
                              }}
                            >
                              <option value="">Select a PCI device</option>
                              ${this.availablePCIDevices
                                .filter(d => d.is_available)
                                .map(d => html`
                                  <option value=${d.pci_address} ?disabled=${!d.is_available}>
                                    ${d.pci_address} - ${d.product_name || 'Unknown'} 
                                    (${d.vendor_name || 'Unknown'})
                                    ${d.device_type ? `[${d.device_type.toUpperCase()}]` : ''}
                                    ${d.assigned_to_vm ? `(Assigned to: ${d.assigned_to_vm})` : ''}
                                  </option>
                                `)}
                              <option value="custom">Enter custom address...</option>
                            </select>
                            ${device.host_address === 'custom' ? html`
                              <input
                                type="text"
                                placeholder="0000:01:00.0"
                                style="margin-top: 8px;"
                                @input=${(e: InputEvent) => {
                                  device.host_address = (e.target as HTMLInputElement).value;
                                  this.requestUpdate();
                                }}
                              />
                            ` : ''}
                          ` : html`
                            <input
                              type="text"
                              placeholder="0000:01:00.0"
                              .value=${device.host_address || ''}
                              @input=${(e: InputEvent) => {
                                device.host_address = (e.target as HTMLInputElement).value;
                                this.requestUpdate();
                              }}
                            />
                          `}
                          <div class="help-text">
                            PCI address on the host (e.g., 0000:01:00.0)
                            ${(() => {
                              const selectedDevice = this.availablePCIDevices.find(d => d.pci_address === device.host_address);
                              if (selectedDevice) {
                                return html`<br><strong>IOMMU Group:</strong> ${selectedDevice.iommu_group || 'Unknown'}`;
                              }
                              return '';
                            })()}
                          </div>
                        </div>

                        <div class="form-group">
                          <label>Guest PCI Address (Optional)</label>
                          <input
                            type="text"
                            placeholder="0000:05:00.0 (auto if empty)"
                            .value=${device.guest_address || ''}
                            @input=${(e: InputEvent) => {
                              device.guest_address = (e.target as HTMLInputElement).value;
                              this.requestUpdate();
                            }}
                          />
                          <div class="help-text">PCI address in the guest VM</div>
                        </div>
                      </div>

                      <div class="form-group">
                        <label>ROM File (Optional)</label>
                        <input
                          type="text"
                          placeholder="/usr/share/vgabios/nvidia.rom"
                          .value=${device.rom_file || ''}
                          @input=${(e: InputEvent) => {
                            device.rom_file = (e.target as HTMLInputElement).value;
                            this.requestUpdate();
                          }}
                        />
                        <div class="help-text">Path to option ROM file (required for some GPUs to work properly)</div>
                      </div>

                      <div class="grid-2" style="margin-top: 12px;">
                        <div class="checkbox-group">
                          <input
                            type="checkbox"
                            id="multifunction-${index}"
                            ?checked=${device.multifunction}
                            @change=${(e: Event) => {
                              device.multifunction = (e.target as HTMLInputElement).checked;
                              this.requestUpdate();
                            }}
                          />
                          <label for="multifunction-${index}">Multi-function device</label>
                          <div class="help-text" style="margin-left: 24px;">Enable for devices with multiple functions (e.g., GPU with audio)</div>
                        </div>

                        <div class="checkbox-group">
                          <input
                            type="checkbox"
                            id="primary-gpu-${index}"
                            ?checked=${device.primary_gpu}
                            @change=${(e: Event) => {
                              device.primary_gpu = (e.target as HTMLInputElement).checked;
                              // If setting as primary GPU, unset others
                              if (device.primary_gpu && this.formData.pci_devices) {
                                this.formData.pci_devices.forEach((d, i) => {
                                  if (i !== index) d.primary_gpu = false;
                                });
                              }
                              this.requestUpdate();
                            }}
                          />
                          <label for="primary-gpu-${index}">Primary GPU</label>
                          <div class="help-text" style="margin-left: 24px;">Set as the primary display adapter</div>
                        </div>
                      </div>

                      ${(() => {
                        const selectedDevice = this.availablePCIDevices.find(d => d.pci_address === device.host_address);
                        if (selectedDevice && selectedDevice.device_type === 'gpu') {
                          return html`
                            <div class="help-text" style="margin-top: 12px; padding: 8px; background: var(--vscode-inputValidation-infoBackground); border-radius: 4px;">
                              <strong>GPU Passthrough Tips:</strong>
                              <ul style="margin: 4px 0; padding-left: 20px;">
                                <li>Ensure the GPU is not being used by the host (blacklist driver or use vfio-pci)</li>
                                <li>Consider passing through the audio device (usually at .1 address) as well</li>
                                <li>You may need a ROM file for certain NVIDIA GPUs</li>
                                <li>Enable "Primary GPU" if this will be the main display</li>
                              </ul>
                            </div>
                          `;
                        }
                        return '';
                      })()}
                    </div>
                    <div class="list-item-actions">
                      <button class="btn-remove" @click=${() => this.removePCIDevice(index)}>
                        Remove
                      </button>
                    </div>
                  </div>
                `) || html`<div class="help-text">No PCI devices configured</div>`}
                
                <button class="btn-add" @click=${this.addPCIDevice}>
                  + Add PCI Device
                </button>
                
                ${this.availablePCIDevices.length > 0 ? html`
                  <div class="help-text" style="margin-top: 12px;">
                    <strong>Available Devices:</strong> ${this.availablePCIDevices.filter(d => d.is_available).length} of ${this.availablePCIDevices.length} devices available for passthrough
                  </div>
                ` : ''}
              </div>
            `}
            
            <div class="help-text" style="margin-top: 12px; padding: 12px; background: var(--vscode-inputValidation-warningBackground); border-radius: 4px;">
              <strong>⚠️ Important:</strong> PCI passthrough requires:
              <ul style="margin: 4px 0; padding-left: 20px;">
                <li>IOMMU support enabled in BIOS (Intel VT-d or AMD-Vi)</li>
                <li>IOMMU enabled in kernel parameters (intel_iommu=on or amd_iommu=on)</li>
                <li>Devices must be in separate IOMMU groups or ACS override may be needed</li>
                <li>Host driver must be unbound from the device (use vfio-pci driver)</li>
              </ul>
            </div>
          </div>

          <div class="form-group">
            <label>Custom XML (Optional)</label>
            <textarea
              class="code-editor"
              rows="10"
              placeholder="Enter custom libvirt XML configuration..."
              .value=${this.formData.custom_xml || ''}
              @input=${(e: InputEvent) => 
                this.updateFormData('custom_xml', (e.target as HTMLTextAreaElement).value)
              }
            ></textarea>
            <div class="help-text">Advanced libvirt XML configuration to be merged with the generated XML</div>
          </div>

          <div class="form-group">
            <label>Metadata Tags</label>
            <div class="help-text">Add custom metadata key-value pairs for organization and automation</div>
            <div class="list-container">
              ${Object.entries(this.formData.metadata || {}).map(([key, value]) => html`
                <div class="list-item">
                  <div class="list-item-content">
                    <div class="grid-2">
                      <input
                        type="text"
                        placeholder="Key"
                        .value=${key}
                        disabled
                      />
                      <input
                        type="text"
                        placeholder="Value"
                        .value=${value}
                        @input=${(e: InputEvent) => {
                          if (this.formData.metadata) {
                            this.formData.metadata[key] = (e.target as HTMLInputElement).value;
                            this.requestUpdate();
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div class="list-item-actions">
                    <button class="btn-remove" @click=${() => {
                      if (this.formData.metadata) {
                        delete this.formData.metadata[key];
                        this.requestUpdate();
                      }
                    }}>
                      Remove
                    </button>
                  </div>
                </div>
              `)}
              <div class="grid-2">
                <input type="text" id="new-metadata-key" placeholder="New key" />
                <input type="text" id="new-metadata-value" placeholder="New value" />
              </div>
              <button class="btn-add" @click=${() => {
                const keyInput = this.shadowRoot?.querySelector('#new-metadata-key') as HTMLInputElement;
                const valueInput = this.shadowRoot?.querySelector('#new-metadata-value') as HTMLInputElement;
                if (keyInput?.value && valueInput?.value) {
                  if (!this.formData.metadata) {
                    this.formData.metadata = {};
                  }
                  this.formData.metadata[keyInput.value] = valueInput.value;
                  keyInput.value = '';
                  valueInput.value = '';
                  this.requestUpdate();
                }
              }}>
                + Add Metadata
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderCloudInitConfig() {
    return html`
      <div class="section ${this.expandedSections.has('cloudinit') ? 'expanded' : ''}">
        <div class="section-header" @click=${() => this.toggleSection('cloudinit')}>
          <div class="section-title">
            <span class="section-toggle">▶</span>
            <span>Cloud-Init Configuration</span>
          </div>
        </div>
        <div class="section-content">
          <div class="tabs">
            <button class="tab active" data-tab="userdata">User Data</button>
            <button class="tab" data-tab="metadata">Meta Data</button>
            <button class="tab" data-tab="networkdata">Network Data</button>
            <button class="tab" data-tab="users">Users</button>
            <button class="tab" data-tab="packages">Packages</button>
          </div>

          <div class="tab-content active" data-content="userdata">
            <div class="form-group">
              <label>User Data (cloud-config)</label>
              <textarea
                class="code-editor"
                rows="15"
                placeholder="#cloud-config&#10;hostname: my-vm&#10;..."
                .value=${this.formData.cloud_init?.user_data || ''}
                @input=${(e: InputEvent) => {
                  if (!this.formData.cloud_init) {
                    this.formData.cloud_init = {};
                  }
                  this.formData.cloud_init.user_data = (e.target as HTMLTextAreaElement).value;
                  this.requestUpdate();
                }}
              ></textarea>
            </div>
          </div>

          <div class="tab-content" data-content="metadata">
            <div class="form-group">
              <label>Meta Data</label>
              <textarea
                class="code-editor"
                rows="10"
                placeholder="instance-id: i-123456&#10;local-hostname: my-vm&#10;..."
                .value=${this.formData.cloud_init?.meta_data || ''}
                @input=${(e: InputEvent) => {
                  if (!this.formData.cloud_init) {
                    this.formData.cloud_init = {};
                  }
                  this.formData.cloud_init.meta_data = (e.target as HTMLTextAreaElement).value;
                  this.requestUpdate();
                }}
              ></textarea>
            </div>
          </div>

          <div class="tab-content" data-content="networkdata">
            <div class="form-group">
              <label>Network Data</label>
              <textarea
                class="code-editor"
                rows="10"
                placeholder="version: 2&#10;ethernets:&#10;  eth0:&#10;    dhcp4: true"
                .value=${this.formData.cloud_init?.network_data || ''}
                @input=${(e: InputEvent) => {
                  if (!this.formData.cloud_init) {
                    this.formData.cloud_init = {};
                  }
                  this.formData.cloud_init.network_data = (e.target as HTMLTextAreaElement).value;
                  this.requestUpdate();
                }}
              ></textarea>
            </div>
          </div>

          <div class="tab-content" data-content="users">
            <div class="form-group">
              <label>SSH Keys</label>
              <textarea
                rows="5"
                placeholder="One SSH public key per line"
                .value=${this.formData.cloud_init?.ssh_keys?.join('\n') || ''}
                @input=${(e: InputEvent) => {
                  if (!this.formData.cloud_init) {
                    this.formData.cloud_init = {};
                  }
                  const value = (e.target as HTMLTextAreaElement).value;
                  this.formData.cloud_init.ssh_keys = value ? value.split('\n').filter(k => k.trim()) : [];
                  this.requestUpdate();
                }}
              ></textarea>
            </div>
          </div>

          <div class="tab-content" data-content="packages">
            <div class="form-group">
              <label>Packages to Install</label>
              <textarea
                rows="5"
                placeholder="One package name per line"
                .value=${this.formData.cloud_init?.packages?.join('\n') || ''}
                @input=${(e: InputEvent) => {
                  if (!this.formData.cloud_init) {
                    this.formData.cloud_init = {};
                  }
                  const value = (e.target as HTMLTextAreaElement).value;
                  this.formData.cloud_init.packages = value ? value.split('\n').filter(p => p.trim()) : [];
                  this.requestUpdate();
                }}
              ></textarea>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderReview() {
    return html`
      <div class="section expanded">
        <div class="section-header">
          <div class="section-title">
            <span>Review Configuration</span>
          </div>
        </div>
        <div class="section-content">
          <div class="form-group">
            <label>Configuration JSON</label>
            <textarea
              class="code-editor"
              rows="20"
              readonly
              .value=${JSON.stringify(this.formData, null, 2)}
            ></textarea>
          </div>
        </div>
      </div>
    `;
  }

  override render() {
    const wizardState = this.wizardController.value;
    
    // Update component state from wizard state
    if ((wizardState as any).editMode !== undefined) {
      this.editMode = (wizardState as any).editMode;
      this.editingVmId = (wizardState as any).editingVmId || null;
    }
    
    // Update form data from wizard state if in edit mode
    if (this.editMode && wizardState.formData && Object.keys(wizardState.formData).length > 0) {
      // Convert from VMCreateRequest format to EnhancedVMCreateRequest format
      const vmFormData = wizardState.formData;
      this.formData = {
        ...vmFormData,
        // Convert single network to array of networks
        networks: vmFormData.network ? [{
          type: vmFormData.network.type,
          source: vmFormData.network.source,
          model: vmFormData.network.model,
          mac: vmFormData.network.mac,
        }] : this.formData.networks,
        // Convert single graphics to array
        graphics: vmFormData.graphics ? [vmFormData.graphics] : this.formData.graphics,
      } as Partial<EnhancedVMCreateRequest>;
    }
    
    if (wizardState.isOpen) {
      this.setAttribute('show', '');
    } else {
      this.removeAttribute('show');
    }
    
    if (!wizardState.isOpen) {
      return html``;
    }

    const steps = [
      { number: 1, label: 'Basic' },
      { number: 2, label: 'Storage' },
      { number: 3, label: 'Network' },
      { number: 4, label: 'Advanced' },
      { number: 5, label: 'Cloud-Init' },
      { number: 6, label: 'Review' },
    ];

    // Add tab click handlers
    setTimeout(() => {
      const tabs = this.shadowRoot?.querySelectorAll('.tab');
      const contents = this.shadowRoot?.querySelectorAll('.tab-content');
      
      tabs?.forEach(tab => {
        tab.addEventListener('click', (e) => {
          const target = e.target as HTMLElement;
          const tabName = target.dataset.tab;
          
          tabs.forEach(t => t.classList.remove('active'));
          contents?.forEach(c => c.classList.remove('active'));
          
          target.classList.add('active');
          this.shadowRoot?.querySelector(`[data-content="${tabName}"]`)?.classList.add('active');
        });
      });
    }, 0);

    return html`
      <div class="drawer">
        <div class="drawer-header">
          <h2 class="header-title">
            <span>🖥️</span>
            ${this.editMode ? 'Edit' : 'Create'} Virtual Machine (Enhanced)
          </h2>
          <button 
            class="close-button" 
            @click=${this.handleClose}
            ?disabled=${this.isCreating}
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
        </div>

        <div class="wizard-steps">
          ${steps.map(step => html`
            <div 
              class="step ${this.currentStep === step.number ? 'active' : ''} ${this.currentStep > step.number ? 'completed' : ''}"
              @click=${() => this.goToStep(step.number)}
            >
              <div class="step-number">
                ${this.currentStep > step.number ? '✓' : step.number}
              </div>
              <span>${step.label}</span>
            </div>
          `)}
        </div>

        <div class="content">
          <div class="wizard-body">
            ${this.currentStep === 1 ? this.renderBasicConfig() :
              this.currentStep === 2 ? this.renderStorageConfig() :
              this.currentStep === 3 ? this.renderNetworkConfig() :
              this.currentStep === 4 ? this.renderAdvancedConfig() :
              this.currentStep === 5 ? this.renderCloudInitConfig() :
              this.currentStep === 6 ? this.renderReview() :
              html`<div>Invalid step</div>`
            }
          </div>
        </div>

        <div class="controls">
          <button class="btn-ghost" @click=${this.handleClose}>
            Cancel
          </button>
          
          <div style="display: flex; gap: 8px;">
            <button 
              class="btn-secondary" 
              @click=${this.handlePrevious}
              ?disabled=${this.currentStep === 1}
            >
              Previous
            </button>
            
            ${this.currentStep < 6 ? html`
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
                ${this.isCreating ? (this.editMode ? 'Updating...' : 'Creating...') : (this.editMode ? 'Update VM' : 'Create VM')}
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'create-vm-wizard-enhanced': CreateVMWizardEnhanced;
  }
}
