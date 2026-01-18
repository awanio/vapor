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
  $filteredVolumes,
  wizardActions,
  vmActions,
  storagePoolStore,
  isoStore,
  templateStore,
  networkStore,
  volumeActions,
} from '../../stores/virtualization';
import type { TemplateWizardContext } from '../../stores/virtualization';
import type { StorageVolume } from '../../types/virtualization';
import type { VirtualNetwork } from '../../types/virtualization';

// Import network store for bridge interfaces
import { $bridges, initializeNetworkStore } from '../../stores/network';

// Import UI components
import '../ui/loading-state.js';
import '../ui/empty-state.js';
import '../modals/delete-modal.js';
import '../modal-dialog';
import './os-variant-autocomplete.js';

interface EnhancedDiskConfig {
  action: 'create' | 'clone' | 'attach';
  size?: number;
  format?: 'qcow2' | 'raw' | 'vmdk' | 'vdi';
  storage_pool: string;
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
  // Basic VM resources
  name: string;
  memory: number;
  max_memory?: number; // Maximum memory in MB (upper limit for memory ballooning)
  max_vcpus?: number; // Maximum vCPUs (upper limit)
  vcpus: number;
  storage: {
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
  private networksController = new StoreController(this, networkStore.$items);
  private bridgesController = new StoreController(this, $bridges);
  private volumesController = new StoreController(this, $filteredVolumes);

  // Component state
  @state() private isCreating = false;
  @state() private showAddDeviceMenu = false;
  @state() private showDeviceModal = false;
  @state() private deviceModalMode: 'disk' | 'iso' = 'disk';
  @state() private deviceDraft: EnhancedDiskConfig | null = null;
  @state() private editingDiskIndex: number | null = null;
  @state() private showNetworkModal = false;
  @state() private networkDraft: NetworkInterface | null = null;
  @state() private editingNetworkIndex: number | null = null;
  @state() private showGraphicsModal = false;
  @state() private graphicsDraft: GraphicsConfig | null = null;
  @state() private editingGraphicsIndex: number | null = null;
  @state() private showPCIModal = false;
  @state() private pciDraft: PCIDevice | null = null;
  @state() private editingPCIDeviceIndex: number | null = null;
  @state() private pciHostSelection = '';
  @state() private validationErrors: Record<string, string> = {};
  @state() private expandedSections: Set<string> = new Set(['basic', 'storage', 'network']);
  @state() private currentStep = 1;
  @state() private availablePCIDevices: any[] = [];
  @state() private isLoadingPCIDevices = false;
  @state() private editMode = false;
  @state() private editingVmId: string | null = null;
  @state() private templateMode = false;
  @state() private templateContext: TemplateWizardContext | null = null;
  @state() private templateDiskSizeGB: number | null = null;
  @state() private showCloseConfirmation = false;
  @state() private formData: Partial<EnhancedVMCreateRequest> = this.buildDefaultFormData();

  private lastInitializedOpenId: number | null = null;

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
      border-left: 1px solid var(--vscode-border);
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
      border-bottom: 1px solid var(--vscode-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }

    .header-title {
      font-size: 18px;
      font-weight: 500;
      color: var(--vscode-foreground);
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .wizard-steps {
      display: flex;
      gap: 16px;
      padding: 16px 20px;
      border-bottom: 1px solid var(--vscode-border);
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
      border-top: 1px solid var(--vscode-border);
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
      border: 1px solid var(--vscode-border);
      border-radius: 6px;
      overflow: visible;
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
      overflow: visible;
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
      border: 1px solid var(--vscode-border);
      border-radius: 4px;
      padding: 12px;
      margin-bottom: 16px;
      background: var(--vscode-bg-lighter, #2d2d30);
    }

    .list-item {
      padding: 12px;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-border);
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

    .storage-table-wrapper {
      border: 1px solid var(--vscode-border);
      border-radius: 4px;
      margin-bottom: 16px;
      background: transparent;
      overflow-x: auto;
    }

    .storage-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    .storage-table th {
      text-align: left;
      padding: 8px 12px;
      background: var(--vscode-bg-lighter, #2d2d30);
      color: var(--vscode-foreground);
      font-weight: 600;
      border-bottom: 1px solid var(--vscode-border);
    }

    .storage-table td {
      padding: 8px 12px;
      color: var(--vscode-foreground, #cccccc);
      border-bottom: 1px solid var(--vscode-border);
      vertical-align: middle;
      white-space: nowrap;
    }

    .storage-table tr:hover {
      background: var(--vscode-list-hoverBackground, rgba(90, 93, 94, 0.1));
    }

    .storage-path {
      font-size: 11px;
      word-break: break-all;
      white-space: normal;
    }

    .storage-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: 500;
      background: var(--vscode-badge-background, #4d4d4d);
      color: var(--vscode-badge-foreground, #ffffff);
    }

    .storage-badge.success {
      background: var(--vscode-charts-green, #89d185);
      color: var(--vscode-editor-background, #1e1e1e);
    }

    .storage-badge.warning {
      background: var(--vscode-charts-yellow, #cca700);
      color: var(--vscode-editor-background, #1e1e1e);
    }

    .btn-icon {
      padding: 4px 8px;
      font-size: 12px;
    }

    .btn-icon-ghost {
      padding: 4px 8px;
      font-size: 12px;
      margin-right: 6px;
      background: transparent;
      color: var(--vscode-foreground, #cccccc);
      border: 1px solid var(--vscode-widget-border, #454545);
    }

    .btn-icon-ghost:hover:not(:disabled) {
      background: var(--vscode-list-hoverBackground, rgba(90, 93, 94, 0.1));
    }

    .monospace {
      font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
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

    .btn-add-dropdown {
      position: relative;
      display: inline-block;
    }

    .btn-add-menu {
      position: absolute;
      top: 100%;
      left: 0;
      margin-top: 4px;
      background: var(--vscode-editor-background, #1e1e1e);
      border: 1px solid var(--vscode-dropdown-border, #3c3c3c);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
      z-index: 10;
      min-width: 160px;
    }

    .btn-add-menu-item {
      width: 100%;
      padding: 6px 10px;
      background: transparent;
      border: none;
      color: inherit;
      text-align: left;
      cursor: pointer;
      font-size: 12px;
    }

    .btn-add-menu-item:hover {
      background: var(--vscode-list-hoverBackground, #2a2d2e);
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
        volumeActions.fetchAll(), // Fetch volumes for clone disk source selection
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
      this.showCloseConfirmation = true;
    }
  }

  private handleConfirmClose() {
    this.showCloseConfirmation = false;
    this.resetFormData();
    wizardActions.closeWizard();
  }

  private handleCancelClose() {
    this.showCloseConfirmation = false;
  }

  private buildDefaultFormData(): Partial<EnhancedVMCreateRequest> {
    return {
      name: this.generateDefaultVmName(),
      memory: 2048,
      max_memory: 0, // 0 means use same as memory
      max_vcpus: 0, // 0 means use same as vcpus
      vcpus: 2,
      os_type: 'linux',
      architecture: 'x86_64',
      storage: {
        disks: [],
      },
      networks: [{
        type: 'network',
        source: 'default',
        model: 'virtio',
      }],
      graphics: [{
        type: 'vnc',
        autoport: true,
        listen: '0.0.0.0',
      }],
    };
  }

  private resetFormData() {
    this.formData = this.buildDefaultFormData();
    this.currentStep = 1;
    this.validationErrors = {};
    this.editMode = false;
    this.editingVmId = null;
    this.templateMode = false;
    this.templateContext = null;
    this.templateDiskSizeGB = null;
    this.lastInitializedOpenId = null;
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
        {
          const t = this.templateMode ? this.templateContext : null;
          const minMemory = t?.min_memory ?? 512;
          const minVcpus = t?.min_vcpus ?? 1;

          if (!this.formData.memory || this.formData.memory < minMemory) {
            errors.memory = t
              ? `Memory must be at least ${minMemory} MB (template min)`
              : 'Memory must be at least 512 MB';
          }
          if (!this.formData.vcpus || this.formData.vcpus < minVcpus) {
            errors.vcpus = t
              ? `At least ${minVcpus} vCPU is required (template min)`
              : 'At least 1 vCPU is required';
          }
        }
        break;
      case 2: { // Storage
        if (this.templateMode && this.templateContext) {
          const size = this.templateDiskSizeGB;
          if (size === null || size === undefined || !Number.isFinite(size) || size <= 0) {
            errors.disk_size = 'Disk size is required';
            break;
          }
          if (size < this.templateContext.min_disk) {
            errors.disk_size = `Disk must be >= template min (${this.templateContext.min_disk} GB)`;
          }
          break;
        }

        const disks = this.formData.storage?.disks || [];
        if (disks.length === 0) {
          errors.storage_pool = 'At least one disk is required';
          break;
        }

        // Require storage_pool on every disk
        if (disks.some(d => !d.storage_pool)) {
          errors.storage_pool = 'Storage pool is required for all disks';
        }

        // Basic per-action validation
        for (const d of disks) {
          if (d.action === 'create' && (!d.size || d.size <= 0)) {
            errors.storage_pool = 'Disk size is required for created disks';
            break;
          }
          if (d.action === 'attach' && !d.path) {
            errors.storage_pool = 'Source volume is required for attached disks';
            break;
          }
          if (d.action === 'clone' && (!d.storage_pool || !d.clone_from)) {
            errors.storage_pool = 'Source volume is required for cloned disks';
            break;
          }
        }
        break;
      }
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

  private buildRequestPayload(): any {
    const disks = (this.formData.storage?.disks || []).map(d => ({
      action: d.action,
      size: d.size,
      format: d.format === 'vmdk' ? 'qcow2' : d.format,
      storage_pool: d.storage_pool,
      path: d.path,
      source: d.clone_from,
      bus: d.bus,
      cache: d.cache,
      target: d.target,
      readonly: d.readonly,
      boot_order: d.boot_order,
      device: d.device || 'disk',
    }));

    const payload: any = {
      name: this.formData.name,
      memory: this.formData.memory,
      max_memory: this.formData.max_memory || 0,
      max_vcpus: this.formData.max_vcpus || 0,
      vcpus: this.formData.vcpus,
      storage: { disks },
      os_type: this.formData.os_type,
      os_variant: this.formData.os_variant,
      architecture: this.formData.architecture,
      uefi: this.formData.uefi,
      secure_boot: this.formData.secure_boot,
      tpm: this.formData.tpm,
      autostart: this.formData.autostart,
      metadata: this.formData.metadata,
    };

    if (this.formData.networks && this.formData.networks.length > 0) {
      payload.networks = this.formData.networks;
    }

    if (this.formData.graphics && this.formData.graphics.length > 0) {
      payload.graphics = this.formData.graphics;
    }

    if (this.formData.pci_devices && this.formData.pci_devices.length > 0) {
      payload.pci_devices = this.formData.pci_devices;
    }

    if (this.formData.cloud_init) {
      payload.cloud_init = this.formData.cloud_init;
    }

    return payload;
  }

  private toggleAddDeviceMenu() {
    this.showAddDeviceMenu = !this.showAddDeviceMenu;
  }

  private openAddDiskModal() {
    this.showAddDeviceMenu = false;
    this.editingDiskIndex = null;
    this.deviceModalMode = 'disk';
    const defaultPool = this.formData.storage?.disks?.[0]?.storage_pool || 'default';
    this.deviceDraft = {
      action: 'create',
      size: 20,
      format: 'qcow2',
      storage_pool: defaultPool,
      bus: 'virtio',
      device: 'disk',
      readonly: false,
    } as EnhancedDiskConfig;
    this.showDeviceModal = true;
  }

  private openAddIsoModal() {
    this.showAddDeviceMenu = false;
    this.editingDiskIndex = null;
    this.deviceModalMode = 'iso';
    const defaultPool = this.formData.storage?.disks?.[0]?.storage_pool || 'default';
    this.deviceDraft = {
      action: 'attach',
      storage_pool: defaultPool,
      bus: 'ide',
      device: 'cdrom',
      readonly: true,
      boot_order: 1,
    } as EnhancedDiskConfig;
    this.showDeviceModal = true;
  }
  private openEditDiskModal(index: number) {
    const existing = this.formData.storage?.disks?.[index];
    if (!existing) return;

    this.showAddDeviceMenu = false;
    this.editingDiskIndex = index;
    this.deviceModalMode = existing.device === 'cdrom' ? 'iso' : 'disk';
    this.deviceDraft = { ...existing };
    this.showDeviceModal = true;
  }



  private handleDeviceModalClose() {
    this.showDeviceModal = false;
    this.deviceDraft = null;
    this.editingDiskIndex = null;
  }

  private handleDeviceModalSave() {
    if (!this.deviceDraft) return;
    const d = this.deviceDraft;

    if (!d.storage_pool) {
      this.showNotification('Storage pool is required', 'error');
      return;
    }

    if (this.deviceModalMode === 'disk') {
      const action = d.action || 'create';

      if (action === 'create') {
        if (!d.size || d.size <= 0) {
          this.showNotification('Disk size must be greater than 0', 'error');
          return;
        }
      } else if (action === 'clone') {
        if (!d.clone_from) {
          this.showNotification('Source volume is required for clone', 'error');
          return;
        }
      } else if (action === 'attach') {
        if (!d.path) {
          this.showNotification('Source volume is required for attach', 'error');
          return;
        }
      }

      d.action = action as any;
      d.device = 'disk';
    } else {
      if (!d.path) {
        this.showNotification('ISO image is required', 'error');
        return;
      }
      d.action = 'attach';
      d.device = 'cdrom';
      d.readonly = true;
      if (!d.boot_order || d.boot_order <= 0) {
        d.boot_order = 1;
      }
    }

    if (!this.formData.storage) {
      this.formData.storage = { disks: [] };
    }
    if (!this.formData.storage.disks) {
      this.formData.storage.disks = [];
    }

    if (this.editingDiskIndex !== null) {
      this.formData.storage.disks[this.editingDiskIndex] = { ...d };
    } else {
      this.formData.storage.disks.push({ ...d });
    }

    this.showDeviceModal = false;
    this.deviceDraft = null;
    this.editingDiskIndex = null;
    this.requestUpdate();
  }

  private renderDeviceModal() {
    if (!this.showDeviceModal || !this.deviceDraft) {
      return null;
    }

    const storagePools = this.storagePoolsController.value || [];
    const isos = this.isosController.value || [];
    const disk = this.deviceDraft as EnhancedDiskConfig;

    return html`
      <modal-dialog
        .open=${this.showDeviceModal}
        .title=${this.deviceModalMode === 'iso' ? (this.editingDiskIndex !== null ? 'Edit ISO/CD-ROM' : 'Add ISO/CD-ROM') : (this.editingDiskIndex !== null ? 'Edit Disk' : 'Add Disk')}
        size="medium"
        @modal-close=${this.handleDeviceModalClose}
      >
        ${this.deviceModalMode === 'disk' ? html`
          <div class="form-group">
            <label>Action</label>
            <select
              .value=${disk.action || 'create'}
              @change=${(e: Event) => {
          disk.action = (e.target as HTMLSelectElement).value as any;
          if (disk.action === 'create') {
            disk.clone_from = '';
            disk.path = '';
          } else if (disk.action === 'clone') {
            disk.path = '';
          } else if (disk.action === 'attach') {
            disk.clone_from = '';
          }
          this.requestUpdate();
        }}
            >
              <option value="create">Create New</option>
              <option value="clone">Clone From</option>
              <option value="attach">Attach Existing</option>
            </select>
          </div>

          <div class="form-group">
            <label>Storage Pool <span class="required">*</span></label>
            <select
              .value=${disk.storage_pool || ''}
              @change=${(e: Event) => {
          disk.storage_pool = (e.target as HTMLSelectElement).value;
          disk.clone_from = '';
          disk.path = '';
          this.requestUpdate();
        }}
            >
              <option value="">Select a storage pool</option>
              ${storagePools.map((pool: any) => html`
                <option value=${pool.name}>${pool.name}</option>
              `)}
            </select>
          </div>

          ${disk.action === 'create' ? html`
            <div class="grid-3">
              <div class="form-group">
                <label>Size (GB)</label>
                <input
                  type="number"
                  min="1"
                  .value=${String(disk.size || 20)}
                  @input=${(e: InputEvent) => {
            disk.size = Number((e.target as HTMLInputElement).value);
            this.requestUpdate();
          }}
                />
              </div>

              <div class="form-group">
                <label>Format</label>
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
              </div>

              <div class="form-group">
                <label>Bus</label>
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
              </div>
            </div>
          ` : disk.action === 'clone' ? html`
            <div class="form-group">
              <label>Source volume</label>
              <select
                .value=${disk.clone_from || ''}
                @change=${(e: Event) => {
            disk.clone_from = (e.target as HTMLSelectElement).value;
            this.requestUpdate();
          }}
                ?disabled=${!disk.storage_pool}
              >
                <option value="">${disk.storage_pool ? 'Select volume to clone...' : 'Select pool first...'}</option>
                ${this.getVolumesForPool(disk.storage_pool || '').map((vol: StorageVolume) => html`
                  <option value="${vol.path}" ?selected=${disk.clone_from === vol.path}>
                    ${vol.name} (${this.formatVolumeSize(vol.capacity)}, ${vol.format})
                  </option>
                `)}
              </select>
            </div>
          ` : html`
            <div class="form-group">
              <label>Source volume</label>
              <select
                .value=${disk.path || ''}
                @change=${(e: Event) => {
            disk.path = (e.target as HTMLSelectElement).value;
            this.requestUpdate();
          }}
                ?disabled=${!disk.storage_pool}
              >
                <option value="">${disk.storage_pool ? 'Select volume to attach...' : 'Select pool first...'}</option>
                ${this.getVolumesForPool(disk.storage_pool || '').map((vol: StorageVolume) => html`
                  <option value="${vol.path}" ?selected=${disk.path === vol.path}>
                    ${vol.name} (${this.formatVolumeSize(vol.capacity)}, ${vol.format})
                  </option>
                `)}
              </select>
            </div>
          `}

          <div class="grid-3">
            <div class="form-group">
              <label>Target (optional)</label>
              <input
                type="text"
                placeholder="e.g. vda"
                .value=${disk.target || ''}
                @input=${(e: InputEvent) => {
          disk.target = (e.target as HTMLInputElement).value;
          this.requestUpdate();
        }}
              />
            </div>

            <div class="form-group">
              <label>Boot order (optional)</label>
              <input
                type="number"
                min="1"
                .value=${String(disk.boot_order || '')}
                @input=${(e: InputEvent) => {
          const v = (e.target as HTMLInputElement).value;
          disk.boot_order = v ? Number(v) : undefined;
          this.requestUpdate();
        }}
              />
            </div>

            <div class="form-group">
              <label>&nbsp;</label>
              <div class="checkbox-group">
                <input
                  type="checkbox"
                  id="disk-readonly"
                  ?checked=${disk.readonly}
                  @change=${(e: Event) => {
          disk.readonly = (e.target as HTMLInputElement).checked;
          this.requestUpdate();
        }}
                />
                <label for="disk-readonly">Read-only</label>
              </div>
            </div>
          </div>
        ` : html`
          <div class="form-group">
            <label>ISO image <span class="required">*</span></label>
            <select
              .value=${disk.path || ''}
              @change=${(e: Event) => {
          const isoPath = (e.target as HTMLSelectElement).value;
          const list: any[] = isos || [];
          const iso = list.find(item => item.path === isoPath);
          if (iso) {
            disk.path = iso.path;
            disk.storage_pool = iso.storage_pool || disk.storage_pool || 'default';
          } else {
            disk.path = '';
          }
          this.requestUpdate();
        }}
            >
              <option value="">Select ISO image...</option>
              ${isos.map((iso: any) => html`
                <option value=${iso.path}>
                  ${iso.name} (${this.formatVolumeSize(iso.size)})
                </option>
              `)}
            </select>
          </div>

          <div class="grid-3">
            <div class="form-group">
              <label>Bus</label>
              <select
                .value=${disk.bus || 'ide'}
                @change=${(e: Event) => {
          disk.bus = (e.target as HTMLSelectElement).value as any;
          this.requestUpdate();
        }}
              >
                <option value="ide">IDE</option>
                <option value="virtio">VirtIO</option>
                <option value="scsi">SCSI</option>
                <option value="sata">SATA</option>
              </select>
            </div>

            <div class="form-group">
              <label>Boot order</label>
              <input
                type="number"
                min="1"
                .value=${String(disk.boot_order || 1)}
                @input=${(e: InputEvent) => {
          const v = (e.target as HTMLInputElement).value;
          disk.boot_order = v ? Number(v) : 1;
          this.requestUpdate();
        }}
              />
            </div>
          </div>
        `}

        <div slot="footer" style="display: flex; justify-content: flex-end; gap: 8px;">
          <button class="btn-secondary" @click=${this.handleDeviceModalClose}>Cancel</button>
          <button class="btn-primary" @click=${this.handleDeviceModalSave}>${this.editingDiskIndex !== null ? 'Save' : 'Add'}</button>
        </div>
      </modal-dialog>
    `;
  }

  private renderNetworkModal() {
    if (!this.showNetworkModal || !this.networkDraft) {
      return null;
    }

    const networksValue = this.networksController.value;
    const networksArray: VirtualNetwork[] = networksValue instanceof Map
      ? Array.from(networksValue.values())
      : Array.isArray(networksValue)
        ? networksValue
        : [];

    const bridges = Array.from(this.bridgesController.value || []);
    const bridgeInterfaces = bridges.filter((iface: any) => iface.type === 'bridge');

    const nic = this.networkDraft;

    return html`
      <modal-dialog
        .open=${this.showNetworkModal}
        .title=${this.editingNetworkIndex !== null ? 'Edit Network Interface' : 'Add Network Interface'}
        size="medium"
        @modal-close=${this.handleNetworkModalClose}
      >
        <div class="grid-3">
          <div class="form-group">
            <label>Type</label>
            <select
              .value=${nic.type}
              @change=${(e: Event) => {
        nic.type = (e.target as HTMLSelectElement).value as any;
        if (nic.type === 'network') nic.source = 'default';
        else nic.source = '';
        this.requestUpdate();
      }}
            >
              <option value="network">Network</option>
              <option value="bridge">Bridge</option>
              <option value="direct">Direct (Macvtap)</option>
              <option value="user">User Mode</option>
            </select>
          </div>

          <div class="form-group">
            <label>Source ${nic.type === 'user' ? '' : html`<span class="required">*</span>`}</label>
            ${nic.type === 'network' ? html`
              <select
                .value=${nic.source || 'default'}
                @change=${(e: Event) => {
          nic.source = (e.target as HTMLSelectElement).value;
          this.requestUpdate();
        }}
              >
                <option value="default">default</option>
                ${networksArray
          .filter(vn => vn.name !== 'default')
          .map(vn => html`
                    <option value=${vn.name}>
                      ${vn.name} ${vn.state === 'active' ? '(Active)' : '(Inactive)'}
                    </option>
                  `)}
              </select>
            ` : nic.type === 'bridge' ? html`
              <select
                .value=${nic.source || ''}
                @change=${(e: Event) => {
          nic.source = (e.target as HTMLSelectElement).value;
          this.requestUpdate();
        }}
              >
                <option value="">Select a bridge</option>
                ${bridgeInterfaces.map(br => html`
                  <option value=${br.name}>
                    ${br.name} ${br.state === 'up' ? '(Up)' : '(Down)'}
                  </option>
                `)}
              </select>
            ` : nic.type === 'direct' ? html`
              <input
                type="text"
                placeholder="Interface (e.g. eth0)"
                .value=${nic.source || ''}
                @input=${(e: InputEvent) => {
          nic.source = (e.target as HTMLInputElement).value;
          this.requestUpdate();
        }}
              />
            ` : html`
              <input
                type="text"
                placeholder="(not required)"
                .value=${nic.source || ''}
                @input=${(e: InputEvent) => {
          nic.source = (e.target as HTMLInputElement).value;
          this.requestUpdate();
        }}
              />
            `}
          </div>

          <div class="form-group">
            <label>Model</label>
            <select
              .value=${nic.model || 'virtio'}
              @change=${(e: Event) => {
        nic.model = (e.target as HTMLSelectElement).value as any;
        this.requestUpdate();
      }}
            >
              <option value="virtio">VirtIO</option>
              <option value="e1000">Intel E1000</option>
              <option value="rtl8139">Realtek RTL8139</option>
              <option value="vmxnet3">VMware vmxnet3</option>
            </select>
          </div>
        </div>

        <div class="form-group" style="margin-top: 12px;">
          <label>MAC Address (optional)</label>
          <input
            type="text"
            placeholder="52:54:00:xx:xx:xx (auto-generated if empty)"
            .value=${nic.mac || ''}
            @input=${(e: InputEvent) => {
        nic.mac = (e.target as HTMLInputElement).value;
        this.requestUpdate();
      }}
          />
          <div class="help-text">Leave empty to auto-generate a MAC address</div>
        </div>

        <div slot="footer" style="display: flex; justify-content: flex-end; gap: 8px;">
          <button class="btn-secondary" @click=${this.handleNetworkModalClose}>Cancel</button>
          <button class="btn-primary" @click=${this.handleNetworkModalSave}>${this.editingNetworkIndex !== null ? 'Save' : 'Add'}</button>
        </div>
      </modal-dialog>
    `;
  }


  private renderGraphicsModal() {
    if (!this.showGraphicsModal || !this.graphicsDraft) {
      return null;
    }

    const g = this.graphicsDraft;

    return html`
      <modal-dialog
        .open=${this.showGraphicsModal}
        .title=${this.editingGraphicsIndex !== null ? 'Edit Graphics' : 'Add Graphics'}
        size="medium"
        @modal-close=${this.handleGraphicsModalClose}
      >
        <div class="grid-3">
          <div class="form-group">
            <label>Type</label>
            <select
              .value=${g.type}
              @change=${(e: Event) => {
        g.type = (e.target as HTMLSelectElement).value as any;
        // Set reasonable defaults when switching types
        if (g.type === 'vnc' || g.type === 'spice') {
          g.listen = g.listen || '0.0.0.0';
          if (g.autoport === undefined) g.autoport = true;
        }
        this.requestUpdate();
      }}
            >
              <option value="vnc">VNC</option>
              <option value="spice">SPICE</option>
              <option value="egl-headless">EGL Headless</option>
              <option value="none">None</option>
            </select>
          </div>

          ${g.type !== 'none' && g.type !== 'egl-headless' ? html`
            <div class="form-group">
              <label>Port (optional)</label>
              <input
                type="number"
                placeholder="(auto if empty)"
                .value=${String(g.port || '')}
                @input=${(e: InputEvent) => {
          const v = (e.target as HTMLInputElement).value;
          g.port = v ? Number(v) : undefined;
          this.requestUpdate();
        }}
              />
            </div>

            <div class="form-group">
              <label>Listen</label>
              <input
                type="text"
                placeholder="0.0.0.0"
                .value=${g.listen || '0.0.0.0'}
                @input=${(e: InputEvent) => {
          g.listen = (e.target as HTMLInputElement).value;
          this.requestUpdate();
        }}
              />
            </div>
          ` : ''}
        </div>

        ${g.type !== 'none' && g.type !== 'egl-headless' ? html`
          <div class="grid-2" style="margin-top: 12px;">
            <input
              type="password"
              placeholder="Password (optional)"
              .value=${g.password || ''}
              @input=${(e: InputEvent) => {
          g.password = (e.target as HTMLInputElement).value;
          this.requestUpdate();
        }}
            />

            <div class="checkbox-group">
              <input
                type="checkbox"
                id="graphics-autoport"
                ?checked=${!!g.autoport}
                @change=${(e: Event) => {
          g.autoport = (e.target as HTMLInputElement).checked;
          this.requestUpdate();
        }}
              />
              <label for="graphics-autoport">Auto-assign port</label>
            </div>
          </div>
        ` : ''}

        <div slot="footer" style="display: flex; justify-content: flex-end; gap: 8px;">
          <button class="btn-secondary" @click=${this.handleGraphicsModalClose}>Cancel</button>
          <button class="btn-primary" @click=${this.handleGraphicsModalSave}>${this.editingGraphicsIndex !== null ? 'Save' : 'Add'}</button>
        </div>
      </modal-dialog>
    `;
  }


  private renderPCIDeviceModal() {
    if (!this.showPCIModal || !this.pciDraft) {
      return null;
    }

    const d = this.pciDraft;
    const selectedDevice = this.availablePCIDevices.find(dev => dev.pci_address === d.host_address);

    return html`
      <modal-dialog
        .open=${this.showPCIModal}
        .title=${this.editingPCIDeviceIndex !== null ? 'Edit PCI Device' : 'Add PCI Device'}
        size="medium"
        @modal-close=${this.handlePCIDeviceModalClose}
      >
        <div class="grid-2">
          <div class="form-group">
            <label>Host PCI Address <span class="required">*</span></label>
            ${this.availablePCIDevices.length > 0 ? html`
              <select
                .value=${this.pciHostSelection}
                @change=${(e: Event) => {
          const value = (e.target as HTMLSelectElement).value;
          this.pciHostSelection = value;
          if (value === 'custom') {
            d.host_address = '';
          } else {
            d.host_address = value;
          }
          this.requestUpdate();
        }}
              >
                <option value="">Select a PCI device</option>
                ${this.availablePCIDevices
          .map(x => html`
                    <option
                      value=${x.pci_address}
                      ?disabled=${!x.is_available && x.pci_address !== d.host_address}
                    >
                      ${x.pci_address} - ${x.product_name || 'Unknown'}
                      (${x.vendor_name || 'Unknown'})
                      ${x.device_type ? `[${String(x.device_type).toUpperCase()}]` : ''}
                      ${x.is_available ? '' : (x.assigned_to_vm ? `(Assigned to: ${x.assigned_to_vm})` : '(In Use)')}
                    </option>
                  `)}
                <option value="custom">Enter custom address...</option>
              </select>

              ${this.pciHostSelection === 'custom' ? html`
                <input
                  type="text"
                  placeholder="0000:01:00.0"
                  style="margin-top: 8px;"
                  .value=${d.host_address || ''}
                  @input=${(e: InputEvent) => {
            d.host_address = (e.target as HTMLInputElement).value;
            this.requestUpdate();
          }}
                />
              ` : ''}
            ` : html`
              <input
                type="text"
                placeholder="0000:01:00.0"
                .value=${d.host_address || ''}
                @input=${(e: InputEvent) => {
          d.host_address = (e.target as HTMLInputElement).value;
          this.requestUpdate();
        }}
              />
            `}

            <div class="help-text">
              PCI address on the host (e.g., 0000:01:00.0)
              ${selectedDevice ? html`<br><strong>IOMMU Group:</strong> ${selectedDevice.iommu_group || 'Unknown'}` : ''}
            </div>
          </div>

          <div class="form-group">
            <label>Guest PCI Address (Optional)</label>
            <input
              type="text"
              placeholder="0000:05:00.0 (auto if empty)"
              .value=${d.guest_address || ''}
              @input=${(e: InputEvent) => {
        d.guest_address = (e.target as HTMLInputElement).value;
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
            .value=${d.rom_file || ''}
            @input=${(e: InputEvent) => {
        d.rom_file = (e.target as HTMLInputElement).value;
        this.requestUpdate();
      }}
          />
          <div class="help-text">Path to option ROM file (required for some GPUs to work properly)</div>
        </div>

        <div class="grid-2" style="margin-top: 12px;">
          <div class="checkbox-group">
            <input
              type="checkbox"
              id="pci-multifunction"
              ?checked=${!!d.multifunction}
              @change=${(e: Event) => {
        d.multifunction = (e.target as HTMLInputElement).checked;
        this.requestUpdate();
      }}
            />
            <label for="pci-multifunction">Multi-function device</label>
            <div class="help-text" style="margin-left: 24px;">Enable for devices with multiple functions (e.g., GPU with audio)</div>
          </div>

          <div class="checkbox-group">
            <input
              type="checkbox"
              id="pci-primary-gpu"
              ?checked=${!!d.primary_gpu}
              @change=${(e: Event) => {
        d.primary_gpu = (e.target as HTMLInputElement).checked;
        this.requestUpdate();
      }}
            />
            <label for="pci-primary-gpu">Primary GPU</label>
            <div class="help-text" style="margin-left: 24px;">Set as the primary display adapter</div>
          </div>
        </div>

        ${selectedDevice && selectedDevice.device_type === 'gpu' ? html`
          <div class="help-text" style="margin-top: 12px; padding: 8px; background: var(--vscode-inputValidation-infoBackground); border-radius: 4px;">
            <strong>GPU Passthrough Tips:</strong>
            <ul style="margin: 4px 0; padding-left: 20px;">
              <li>Ensure the GPU is not being used by the host (blacklist driver or use vfio-pci)</li>
              <li>Consider passing through the audio device (usually at .1 address) as well</li>
              <li>You may need a ROM file for certain NVIDIA GPUs</li>
              <li>Enable "Primary GPU" if this will be the main display</li>
            </ul>
          </div>
        ` : ''}

        <div slot="footer" style="display: flex; justify-content: flex-end; gap: 8px;">
          <button class="btn-secondary" @click=${this.handlePCIDeviceModalClose}>Cancel</button>
          <button class="btn-primary" @click=${this.handlePCIDeviceModalSave}>${this.editingPCIDeviceIndex !== null ? 'Save' : 'Add'}</button>
        </div>
      </modal-dialog>
    `;
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
      if (this.templateMode) {
        const template = this.templateContext;
        if (!template) {
          throw new Error('No template selected');
        }

        const name = (this.formData.name || '').trim();
        const memory = this.formData.memory;
        const vcpus = this.formData.vcpus;
        const disk_size = this.templateDiskSizeGB ?? undefined;

        const network = this.formData.networks?.[0];
        const graphics = this.formData.graphics?.[0];
        const cloud_init = this.formData.cloud_init;
        const metadata = this.formData.metadata;

        const created = await (vmActions as any).createFromTemplate(template.id, {
          name,
          memory,
          vcpus,
          disk_size,
          network,
          graphics,
          cloud_init,
          metadata,
        });

        this.showNotification(
          `VM "${created.name}" created from template "${template.name}"`,
          'success',
        );

        this.dispatchEvent(
          new CustomEvent('vm-created', {
            detail: { vm: created, template },
            bubbles: true,
            composed: true,
          }),
        );

        wizardActions.closeWizard();
        await vmActions.fetchAll();
        return;
      }

      const token =
        localStorage.getItem('jwt_token') ||
        localStorage.getItem('auth_token') ||
        localStorage.getItem('token');
      const payload = this.buildRequestPayload();

      const url = this.editMode && this.editingVmId
        ? getApiUrl(`/virtualization/computes/${this.editingVmId}`)
        : getApiUrl('/virtualization/computes');
      const method = this.editMode && this.editingVmId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        this.showNotification(
          `Virtual machine ${this.editMode ? 'updated' : 'created'} successfully`,
          'success',
        );
      } else {
        const error = await response.json().catch(() => null);
        if (error && error.status === 'error' && error.error) {
          throw new Error(error.error.message || error.error.details || 'VM operation failed');
        } else if (error && error.message) {
          throw new Error(error.message);
        } else {
          throw new Error(`Failed to ${this.editMode ? 'update' : 'create'} virtual machine`);
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



  private removeDisk(index: number) {
    if (this.formData.storage?.disks) {
      this.formData.storage.disks.splice(index, 1);
      this.requestUpdate();
    }
  }
  private openAddNetworkModal() {
    if (this.templateMode && (this.formData.networks?.length || 0) >= 1) {
      this.showNotification('Only one network interface is supported in template mode', 'error');
      return;
    }

    this.editingNetworkIndex = null;
    this.networkDraft = {
      type: 'network',
      source: 'default',
      model: 'virtio',
      mac: '',
    };
    this.showNetworkModal = true;
  }

  private openEditNetworkModal(index: number) {
    const existing = this.formData.networks?.[index];
    if (!existing) return;

    this.editingNetworkIndex = index;
    this.networkDraft = {
      type: existing.type || 'network',
      source: existing.source || '',
      model: existing.model || 'virtio',
      mac: existing.mac || '',
    };
    this.showNetworkModal = true;
  }
  private handleNetworkModalClose() {
    this.showNetworkModal = false;
    this.editingNetworkIndex = null;
    this.networkDraft = null;
  }

  private handleNetworkModalSave() {
    if (!this.networkDraft) return;

    const nic: NetworkInterface = {
      type: this.networkDraft.type,
      source: (this.networkDraft.source || '').trim() || undefined,
      model: this.networkDraft.model || 'virtio',
      mac: (this.networkDraft.mac || '').trim() || undefined,
    };

    if ((nic.type === 'network' || nic.type === 'bridge' || nic.type === 'direct') && !nic.source) {
      this.showNotification('Network source is required', 'error');
      return;
    }
    if (!this.formData.networks) {
      this.formData.networks = [];
    }

    if (this.editingNetworkIndex !== null) {
      this.formData.networks[this.editingNetworkIndex] = nic;
    } else {
      if (this.templateMode && this.formData.networks.length >= 1) {
        this.formData.networks[0] = nic;
      } else {
        this.formData.networks.push(nic);
      }
    }

    this.showNetworkModal = false;
    this.networkDraft = null;
    this.editingNetworkIndex = null;
    this.requestUpdate();
  }

  private removeNetwork(index: number) {
    if (this.formData.networks) {
      this.formData.networks.splice(index, 1);
      this.requestUpdate();
    }
  }

  private openAddGraphicsModal() {
    if (this.templateMode && (this.formData.graphics?.length || 0) >= 1) {
      this.showNotification('Only one graphics device is supported in template mode', 'error');
      return;
    }

    this.editingGraphicsIndex = null;
    this.graphicsDraft = {
      type: 'vnc',
      autoport: true,
      listen: '0.0.0.0',
      port: undefined,
      password: '',
    };
    this.showGraphicsModal = true;
  }

  private openEditGraphicsModal(index: number) {
    const existing = this.formData.graphics?.[index];
    if (!existing) return;

    this.editingGraphicsIndex = index;
    this.graphicsDraft = { ...existing };
    this.showGraphicsModal = true;
  }

  private handleGraphicsModalClose() {
    this.showGraphicsModal = false;
    this.graphicsDraft = null;
    this.editingGraphicsIndex = null;
  }

  private handleGraphicsModalSave() {
    if (!this.graphicsDraft) return;

    const draft = this.graphicsDraft;
    const type = draft.type || 'vnc';

    let gfx: GraphicsConfig = { type };

    if (type !== 'none' && type !== 'egl-headless') {
      const listen = (draft.listen || '').trim() || '0.0.0.0';
      const autoport = !!draft.autoport;
      const port = draft.port ? Number(draft.port) : undefined;
      const password = (draft.password || '').trim() || undefined;

      gfx = {
        type,
        listen,
        autoport,
        port,
        password,
      } as any;

      // If autoport is enabled, we generally don't need a fixed port
      if (autoport) {
        gfx.port = undefined;
      }
    }

    if (!this.formData.graphics) {
      this.formData.graphics = [];
    }

    if (this.editingGraphicsIndex !== null) {
      this.formData.graphics[this.editingGraphicsIndex] = gfx;
    } else {
      if (this.templateMode && this.formData.graphics.length >= 1) {
        this.formData.graphics[0] = gfx;
      } else {
        this.formData.graphics.push(gfx);
      }
    }

    this.showGraphicsModal = false;
    this.graphicsDraft = null;
    this.editingGraphicsIndex = null;
    this.requestUpdate();
  }

  private removeGraphics(index: number) {
    if (this.formData.graphics) {
      this.formData.graphics.splice(index, 1);
      this.requestUpdate();
    }
  }

  private openAddPCIDeviceModal() {
    this.editingPCIDeviceIndex = null;
    this.pciHostSelection = '';
    this.pciDraft = {
      host_address: '',
      guest_address: '',
      rom_file: '',
      multifunction: false,
      primary_gpu: false,
    };
    this.showPCIModal = true;
  }

  private openEditPCIDeviceModal(index: number) {
    const existing = this.formData.pci_devices?.[index];
    if (!existing) return;

    this.editingPCIDeviceIndex = index;
    this.pciDraft = { ...existing };

    const addr = existing.host_address || '';
    const known = this.availablePCIDevices.find(d => d.pci_address === addr);
    this.pciHostSelection = known ? addr : (addr ? 'custom' : '');

    this.showPCIModal = true;
  }

  private handlePCIDeviceModalClose() {
    this.showPCIModal = false;
    this.pciDraft = null;
    this.editingPCIDeviceIndex = null;
    this.pciHostSelection = '';
  }

  private handlePCIDeviceModalSave() {
    if (!this.pciDraft) return;

    const host = (this.pciDraft.host_address || '').trim();
    if (!host) {
      this.showNotification('Host PCI address is required', 'error');
      return;
    }

    const device: PCIDevice = {
      host_address: host,
      guest_address: (this.pciDraft.guest_address || '').trim() || undefined,
      rom_file: (this.pciDraft.rom_file || '').trim() || undefined,
      multifunction: !!this.pciDraft.multifunction,
      primary_gpu: !!this.pciDraft.primary_gpu,
    };

    if (!this.formData.pci_devices) {
      this.formData.pci_devices = [];
    }

    // Ensure only one primary GPU
    if (device.primary_gpu) {
      this.formData.pci_devices.forEach((d, i) => {
        if (this.editingPCIDeviceIndex === null || i != this.editingPCIDeviceIndex) {
          d.primary_gpu = false;
        }
      });
    }

    if (this.editingPCIDeviceIndex !== null) {
      this.formData.pci_devices[this.editingPCIDeviceIndex] = device;
    } else {
      this.formData.pci_devices.push(device);
    }

    this.showPCIModal = false;
    this.pciDraft = null;
    this.editingPCIDeviceIndex = null;
    this.pciHostSelection = '';
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

  /**
   * Get volumes filtered by storage pool name
   */
  private getVolumesForPool(poolName: string): StorageVolume[] {
    const volumes = this.volumesController.value || [];
    if (!poolName) return volumes;
    return volumes.filter((vol: StorageVolume) => vol.pool_name === poolName);
  }

  /**
   * Format volume size from bytes to human readable
   */
  private formatVolumeSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  private generateDefaultVmName(): string {
    // Lowercase, alphanumeric + hyphen only
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).slice(2, 6);
    return `vm-${ts}-${rand}`.toLowerCase().replace(/[^a-z0-9-]/g, '');
  }

  private renderBasicConfig() {
    const t = this.templateMode ? this.templateContext : null;
    const minLine = t
      ? `Min: ${t.min_memory} MB, ${t.min_vcpus} vCPU, ${t.min_disk} GB`
      : '';
    const recLine = t
      ? `Recommended: ${t.recommended_memory ?? '-'} MB, ${t.recommended_vcpus ?? '-'} vCPU, ${t.recommended_disk ?? '-'} GB`
      : '';

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
          ${t ? html`
            <div
              style="margin-bottom: 12px; padding: 10px; border-radius: 6px; background: var(--vscode-inputValidation-infoBackground); border: 1px solid var(--vscode-inputValidation-infoBorder);"
            >
              <div style="font-weight: 600; margin-bottom: 4px;">Creating VM from template: ${t.name}</div>
              <div class="help-text">Only name, memory/vCPU, disk size, network, graphics, and cloud-init can be changed here. Other fields are controlled by the template.</div>
              <div class="help-text" style="margin-top: 6px;">${minLine}</div>
              <div class="help-text">${recLine}</div>
            </div>
          ` : ''}

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
                  min=${t ? String(t.min_memory) : '512'}
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
              <label>Max Memory</label>
              <div class="input-with-unit">
                <input
                  type="number"
                  min="0"
                  max="524288"
                  step="512"
                  placeholder="Same as memory"
                  .value=${String(this.formData.max_memory || '')}
                  @input=${(e: InputEvent) => {
                    const val = (e.target as HTMLInputElement).value;
                    this.updateFormData('max_memory', val ? Number(val) : 0);
                  }}
                />
                <span class="unit">MB</span>
              </div>
              <div class="help-text">Upper limit. Leave empty to use same as Memory.</div>
            </div>
          </div>

          <div class="grid-2">
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

            <div class="form-group">
              <label>Max vCPUs</label>
              <input
                type="number"
                min="0"
                max="128"
                placeholder="Same as vCPUs"
                .value=${String(this.formData.max_vcpus || '')}
                @input=${(e: InputEvent) => {
                  const val = (e.target as HTMLInputElement).value;
                  this.updateFormData('max_vcpus', val ? Number(val) : 0);
                }}
              />
              <div class="help-text">Upper limit. Leave empty to use same as vCPUs.</div>
            </div>
          </div>

          <div class="grid-3">
            <div class="form-group">
              <label>OS Type</label>
              <select
                ?disabled=${this.templateMode}
                @change=${(e: Event) =>
        this.updateFormData('os_type', (e.target as HTMLSelectElement).value)
      }
              >
                <option value="linux" ?selected=${(this.formData.os_type || 'linux') === 'linux'}>Linux</option>
                <option value="windows" ?selected=${this.formData.os_type === 'windows'}>Windows</option>
                <option value="freebsd" ?selected=${this.formData.os_type === 'freebsd'}>FreeBSD</option>
                <option value="other" ?selected=${this.formData.os_type === 'other'}>Other</option>
              </select>
            </div>

            <div class="form-group">
              <label>OS Variant</label>
              <os-variant-autocomplete
                .value=${this.formData.os_variant || ''}
                .family=${this.formData.os_type || 'linux'}
                placeholder="ubuntu22.04"
                ?disabled=${this.templateMode}
                @os-variant-change=${(e: CustomEvent<{ value: string }>) =>
        this.updateFormData('os_variant', e.detail.value)
      }
              ></os-variant-autocomplete>
              <div class="help-text">e.g., ubuntu22.04, win11, rhel9</div>
            </div>

            <div class="form-group">
              <label>Architecture</label>
              <select
                .value=${this.formData.architecture || 'x86_64'}
                ?disabled=${this.templateMode}
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
                ?disabled=${this.templateMode}
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
                ?disabled=${this.templateMode}
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
                ?disabled=${this.templateMode}
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
                ?disabled=${this.templateMode}
              @change=${(e: Event) =>
        this.updateFormData('autostart', (e.target as HTMLInputElement).checked)
      }
            />
            <label for="autostart">Autostart VM with host</label>
          </div>

          
        </div>
      </div>
    `;
  }

  private renderStorageConfig() {
    if (this.templateMode && this.templateContext) {
      const t = this.templateContext;
      const defaultDisk = t.recommended_disk ?? t.min_disk;
      const diskValue = this.templateDiskSizeGB ?? defaultDisk;

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
              <label>Disk Size (GB) <span class="required">*</span></label>
              ${this.validationErrors.disk_size ? html`
                <div class="error-message">${this.validationErrors.disk_size}</div>
              ` : ''}

              <input
                type="number"
                min=${String(t.min_disk)}
                step="1"
                .value=${String(diskValue)}
                @input=${(e: InputEvent) => {
          const n = Number((e.target as HTMLInputElement).value);
          this.templateDiskSizeGB = Number.isFinite(n) ? n : null;
        }}
              />
              <div class="help-text" style="margin-top: 6px;">
                Template min: ${t.min_disk} GB • Recommended: ${t.recommended_disk ?? '-'} GB
              </div>
              <div class="help-text">
                Storage devices are derived from the template. In template mode, you can only override the disk size.
              </div>
            </div>
          </div>
        </div>
      `;
    }

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
            <label>Disks</label>
            ${this.validationErrors.storage_pool ? html`
              <div class="error-message">${this.validationErrors.storage_pool}</div>
            ` : ''}

            ${this.formData.storage?.disks?.length ? html`
              <div class="storage-table-wrapper">
                <table class="storage-table">
                  <thead>
                    <tr>
                      <th>Target</th>
                      <th>Type</th>
                      <th>Source</th>
                      <th>Format</th>
                      <th>Bus</th>
                      <th>Size</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    ${this.formData.storage.disks.map((disk, index) => html`
                      <tr>
                        <td><span class="monospace">${disk.target || 'Auto'}</span></td>
                        <td>
                          <span class="storage-badge ${disk.device === 'cdrom' ? 'warning' : ''}">
                            ${(disk.device || 'disk').toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <span class="monospace storage-path">
                            ${disk.path
      || (disk.action === 'create'
        ? 'New disk'
        : disk.action === 'clone'
          ? (disk.clone_from || '-')
          : '-')}
                          </span>
                        </td>
                        <td>${(disk.format || 'qcow2').toUpperCase()}</td>
                        <td>${(disk.bus || 'virtio').toUpperCase()}</td>
                        <td>${disk.action === 'create' && disk.size ? `${disk.size} GB` : 'N/A'}</td>
                        <td>
                          <span class="storage-badge ${disk.readonly ? 'warning' : 'success'}">
                            ${disk.readonly ? 'Read-Only' : 'Read/Write'}
                          </span>
                        </td>
                        <td>
                          <button
                            class="btn-icon-ghost"
                            title="Edit device"
                            @click=${() => this.openEditDiskModal(index)}
                          >
                            ✎
                          </button>
                          <button
                            class="btn-remove btn-icon"
                            title="Remove device"
                            @click=${() => this.removeDisk(index)}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    `)}
                  </tbody>
                </table>
              </div>
            ` : html`<div class="help-text">No devices configured</div>`}

            <div class="btn-add-dropdown">
              <button class="btn-add" @click=${this.toggleAddDeviceMenu}>
                + Add Device
              </button>
              ${this.showAddDeviceMenu ? html`
                <div class="btn-add-menu">
                  <button class="btn-add-menu-item" @click=${this.openAddDiskModal}>
                    Add Disk
                  </button>
                  <button class="btn-add-menu-item" @click=${this.openAddIsoModal}>
                    Add ISO/CD-ROM
                  </button>
                </div>
              ` : null}
            </div>
            
          </div>
        </div>
      </div>
    `;
  }

  private renderNetworkConfig() {
    const networksValue = this.networksController.value;
    const networksArray: VirtualNetwork[] = networksValue instanceof Map
      ? Array.from(networksValue.values())
      : Array.isArray(networksValue)
        ? networksValue
        : [];

    const bridges = Array.from(this.bridgesController.value || []);
    const bridgeInterfaces = bridges.filter((iface: any) => iface.type === 'bridge');

    const getStatus = (nic: NetworkInterface): { label: string; className: string } => {
      if (nic.type === 'network') {
        const vn = networksArray.find(n => n.name === (nic.source || ''));
        if (!vn) return { label: 'Unknown', className: 'warning' };
        return vn.state === 'active'
          ? { label: 'Active', className: 'success' }
          : { label: 'Inactive', className: 'warning' };
      }
      if (nic.type === 'bridge') {
        const br = bridgeInterfaces.find(b => b.name === (nic.source || ''));
        if (!br) return { label: 'Unknown', className: 'warning' };
        return br.state === 'up'
          ? { label: 'Up', className: 'success' }
          : { label: 'Down', className: 'warning' };
      }
      if (nic.type === 'user') return { label: 'User Mode', className: 'success' };
      return { label: 'N/A', className: '' };
    };

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

            ${this.formData.networks?.length ? html`
              <div class="storage-table-wrapper">
                <table class="storage-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Source</th>
                      <th>Model</th>
                      <th>MAC</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    ${this.formData.networks.map((nic, index) => {
      const status = getStatus(nic);
      return html`
                        <tr>
                          <td>
                            <span class="storage-badge">${(nic.type || 'network').toUpperCase()}</span>
                          </td>
                          <td>
                            <span class="monospace storage-path">${nic.source || '-'}</span>
                          </td>
                          <td>${(nic.model || 'virtio').toUpperCase()}</td>
                          <td><span class="monospace">${nic.mac || '-'}</span></td>
                          <td>
                            <span class="storage-badge ${status.className}">${status.label}</span>
                          </td>
                          <td>
                            <button
                              class="btn-icon-ghost"
                              title="Edit device"
                              @click=${() => this.openEditNetworkModal(index)}
                            >
                              ✎
                            </button>
                            <button
                              class="btn-remove btn-icon"
                              title="Remove device"
                              @click=${() => this.removeNetwork(index)}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      `;
    })}
                  </tbody>
                </table>
              </div>
            ` : html`<div class="help-text">No devices configured</div>`}

            <div class="btn-add-dropdown">
              <button class="btn-add" @click=${this.openAddNetworkModal} ?disabled=${this.templateMode && (this.formData.networks?.length || 0) >= 1}>
                + Add Device
              </button>
            </div>
          </div>

          <div class="form-group">
            <label>Graphics</label>

            ${this.formData.graphics?.length ? html`
              <div class="storage-table-wrapper">
                <table class="storage-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Listen</th>
                      <th>Port</th>
                      <th>Auto Port</th>
                      <th>Password</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    ${this.formData.graphics.map((g, index) => {
      const portLabel = (g.type === 'none' || g.type === 'egl-headless')
        ? '-'
        : (g.autoport ? 'Auto' : (g.port ? String(g.port) : '-'));
      const autoLabel = (g.type === 'none' || g.type === 'egl-headless')
        ? '-'
        : (g.autoport ? 'Yes' : 'No');
      const pwLabel = (g.type === 'none' || g.type === 'egl-headless')
        ? '-'
        : (g.password ? 'Set' : 'None');

      return html`
                        <tr>
                          <td><span class="storage-badge">${(g.type || 'vnc').toUpperCase()}</span></td>
                          <td><span class="monospace">${g.listen || '-'}</span></td>
                          <td><span class="monospace">${portLabel}</span></td>
                          <td>
                            <span class="storage-badge ${autoLabel === 'Yes' ? 'success' : ''}">${autoLabel}</span>
                          </td>
                          <td>
                            <span class="storage-badge ${pwLabel === 'Set' ? 'warning' : ''}">${pwLabel}</span>
                          </td>
                          <td>
                            <button
                              class="btn-icon-ghost"
                              title="Edit device"
                              @click=${() => this.openEditGraphicsModal(index)}
                            >
                              ✎
                            </button>
                            <button
                              class="btn-remove btn-icon"
                              title="Remove device"
                              @click=${() => this.removeGraphics(index)}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      `;
    })}
                  </tbody>
                </table>
              </div>
            ` : html`<div class="help-text">No devices configured</div>`}

            <div class="btn-add-dropdown">
              <button class="btn-add" @click=${this.openAddGraphicsModal} ?disabled=${this.templateMode && (this.formData.graphics?.length || 0) >= 1}>
                + Add Device
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderAdvancedConfig() {
    if (this.templateMode) {
      return html`
        <div class="section ${this.expandedSections.has('advanced') ? 'expanded' : ''}">
          <div class="section-header" @click=${() => this.toggleSection('advanced')}>
            <div class="section-title">
              <span class="section-toggle">▶</span>
              <span>Advanced Configuration</span>
            </div>
          </div>
          <div class="section-content">
            <div
              class="help-text"
              style="padding: 10px; border-radius: 6px; background: var(--vscode-inputValidation-infoBackground); border: 1px solid var(--vscode-inputValidation-infoBorder);"
            >
              Advanced options are controlled by the template and are not editable in template mode.
            </div>
          </div>
        </div>
      `;
    }

    const getDeviceInfo = (addr: string) => this.availablePCIDevices.find(d => d.pci_address === addr);

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
              ${this.formData.pci_devices?.length ? html`
                <div class="storage-table-wrapper">
                  <table class="storage-table">
                    <thead>
                      <tr>
                        <th>Host</th>
                        <th>Device</th>
                        <th>Type</th>
                        <th>IOMMU</th>
                        <th>Flags</th>
                        <th>Guest</th>
                        <th>ROM</th>
                        <th>Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      ${this.formData.pci_devices.map((dev, index) => {
      const info = getDeviceInfo(dev.host_address);
      const typeLabel = info?.device_type ? String(info.device_type).toUpperCase() : '-';
      const status = info
        ? (info.is_available ? { label: 'Available', cls: 'success' } : { label: 'In Use', cls: 'warning' })
        : { label: 'Unknown', cls: 'warning' };

      const flags: string[] = [];
      if (dev.primary_gpu) flags.push('Primary GPU');
      if (dev.multifunction) flags.push('Multi');

      return html`
                          <tr>
                            <td><span class="monospace">${dev.host_address}</span></td>
                            <td>
                              <span class="monospace storage-path">
                                ${info ? `${info.product_name || 'Unknown'} (${info.vendor_name || 'Unknown'})` : '-'}
                              </span>
                            </td>
                            <td><span class="storage-badge">${typeLabel}</span></td>
                            <td>${info?.iommu_group || '-'}</td>
                            <td>
                              ${flags.length ? flags.map(f => html`<span class="storage-badge warning" style="margin-right: 6px;">${f}</span>`) : html`-`}
                            </td>
                            <td><span class="monospace">${dev.guest_address || '-'}</span></td>
                            <td><span class="monospace storage-path">${dev.rom_file || '-'}</span></td>
                            <td><span class="storage-badge ${status.cls}">${status.label}</span></td>
                            <td>
                              <button
                                class="btn-icon-ghost"
                                title="Edit device"
                                @click=${() => this.openEditPCIDeviceModal(index)}
                              >
                                ✎
                              </button>
                              <button
                                class="btn-remove btn-icon"
                                title="Remove device"
                                @click=${() => this.removePCIDevice(index)}
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        `;
    })}
                    </tbody>
                  </table>
                </div>
              ` : html`<div class="help-text">No devices configured</div>`}

              <div class="btn-add-dropdown">
                <button class="btn-add" @click=${this.openAddPCIDeviceModal}>
                  + Add Device
                </button>
              </div>

              ${this.availablePCIDevices.length > 0 ? html`
                <div class="help-text" style="margin-top: 12px;">
                  <strong>Available Devices:</strong> ${this.availablePCIDevices.filter(d => d.is_available).length} of ${this.availablePCIDevices.length} devices available for passthrough
                </div>
              ` : ''}
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
    const disks = this.formData.storage?.disks || [];
    const networks = this.formData.networks || [];
    const graphics = this.formData.graphics || [];
    const pci = this.formData.pci_devices || [];
    const cloud = this.formData.cloud_init;

    const cloudEnabled = !!cloud && Object.keys(cloud).some(k => (cloud as any)[k] && (Array.isArray((cloud as any)[k]) ? (cloud as any)[k].length : true));

    return html`
      <div class="section expanded">
        <div class="section-header">
          <div class="section-title">
            <span>Review Configuration</span>
          </div>
        </div>
        <div class="section-content">
          <div class="tabs">
            <button class="tab active" data-tab="gui">Summary</button>
            <button class="tab" data-tab="json">JSON</button>
          </div>

          <div class="tab-content active" data-content="gui">
            <div class="form-group">
              <label>Basic</label>
              <div class="list-container">
                <div class="grid-2">
                  <div>
                    <div class="help-text">Name</div>
                    <div class="monospace">${this.formData.name || '-'}</div>
                  </div>
                  <div>
                    <div class="help-text">Architecture</div>
                    <div>${this.formData.architecture || '-'}</div>
                  </div>
                </div>

                <div class="grid-2" style="margin-top: 12px;">
                  <div>
                    <div class="help-text">Memory</div>
                    <div>${this.formData.memory || 0} MB${this.formData.max_memory ? ` (max: ${this.formData.max_memory} MB)` : ''}</div>
                  </div>
                  <div>
                    <div class="help-text">vCPUs</div>
                    <div>${this.formData.vcpus || 0}${this.formData.max_vcpus ? ` (max: ${this.formData.max_vcpus})` : ''}</div>
                  </div>
                </div>

                <div class="grid-2" style="margin-top: 12px;">
                  <div>
                    <div class="help-text">OS Type</div>
                    <div>${this.formData.os_type || '-'}</div>
                  </div>
                  <div>
                    <div class="help-text">OS Variant</div>
                    <div>${this.formData.os_variant || '-'}</div>
                  </div>
                </div>

                <div style="margin-top: 12px;">
                  <span class="storage-badge ${this.formData.uefi ? 'success' : ''}" style="margin-right: 6px;">UEFI: ${this.formData.uefi ? 'On' : 'Off'}</span>
                  <span class="storage-badge ${this.formData.secure_boot ? 'success' : ''}" style="margin-right: 6px;">Secure Boot: ${this.formData.secure_boot ? 'On' : 'Off'}</span>
                  <span class="storage-badge ${this.formData.tpm ? 'success' : ''}" style="margin-right: 6px;">TPM: ${this.formData.tpm ? 'On' : 'Off'}</span>
                  <span class="storage-badge ${this.formData.autostart ? 'success' : ''}">Autostart: ${this.formData.autostart ? 'On' : 'Off'}</span>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label>Storage</label>
              ${disks.length ? html`
                <div class="storage-table-wrapper">
                  <table class="storage-table">
                    <thead>
                      <tr>
                        <th>Target</th>
                        <th>Type</th>
                        <th>Source</th>
                        <th>Format</th>
                        <th>Bus</th>
                        <th>Size</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${disks.map(d => html`
                        <tr>
                          <td><span class="monospace">${d.target || 'Auto'}</span></td>
                          <td><span class="storage-badge ${d.device === 'cdrom' ? 'warning' : ''}">${(d.device || 'disk').toUpperCase()}</span></td>
                          <td><span class="monospace storage-path">${d.path || (d.action === 'create' ? 'New disk' : d.action === 'clone' ? (d.clone_from || '-') : '-')}</span></td>
                          <td>${(d.format || 'qcow2').toUpperCase()}</td>
                          <td>${(d.bus || 'virtio').toUpperCase()}</td>
                          <td>${d.action === 'create' && d.size ? `${d.size} GB` : 'N/A'}</td>
                          <td><span class="storage-badge ${d.readonly ? 'warning' : 'success'}">${d.readonly ? 'Read-Only' : 'Read/Write'}</span></td>
                        </tr>
                      `)}
                    </tbody>
                  </table>
                </div>
              ` : html`<div class="help-text">No disks configured</div>`}
            </div>

            <div class="form-group">
              <label>Network Interfaces</label>
              ${networks.length ? html`
                <div class="storage-table-wrapper">
                  <table class="storage-table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Source</th>
                        <th>Model</th>
                        <th>MAC</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${networks.map(n => html`
                        <tr>
                          <td><span class="storage-badge">${(n.type || 'network').toUpperCase()}</span></td>
                          <td><span class="monospace storage-path">${n.source || '-'}</span></td>
                          <td>${(n.model || 'virtio').toUpperCase()}</td>
                          <td><span class="monospace">${n.mac || '-'}</span></td>
                        </tr>
                      `)}
                    </tbody>
                  </table>
                </div>
              ` : html`<div class="help-text">No network interfaces configured</div>`}
            </div>

            <div class="form-group">
              <label>Graphics</label>
              ${graphics.length ? html`
                <div class="storage-table-wrapper">
                  <table class="storage-table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Listen</th>
                        <th>Port</th>
                        <th>Auto Port</th>
                        <th>Password</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${graphics.map(g => {
      const portLabel = (g.type === 'none' || g.type === 'egl-headless')
        ? '-'
        : (g.autoport ? 'Auto' : (g.port ? String(g.port) : '-'));
      const autoLabel = (g.type === 'none' || g.type === 'egl-headless')
        ? '-'
        : (g.autoport ? 'Yes' : 'No');
      const pwLabel = (g.type === 'none' || g.type === 'egl-headless')
        ? '-'
        : (g.password ? 'Set' : 'None');

      return html`
                          <tr>
                            <td><span class="storage-badge">${(g.type || 'vnc').toUpperCase()}</span></td>
                            <td><span class="monospace">${g.listen || '-'}</span></td>
                            <td><span class="monospace">${portLabel}</span></td>
                            <td>${autoLabel}</td>
                            <td>${pwLabel}</td>
                          </tr>
                        `;
    })}
                    </tbody>
                  </table>
                </div>
              ` : html`<div class="help-text">No graphics configured</div>`}
            </div>

            <div class="form-group">
              <label>PCI Devices</label>
              ${pci.length ? html`
                <div class="storage-table-wrapper">
                  <table class="storage-table">
                    <thead>
                      <tr>
                        <th>Host</th>
                        <th>Guest</th>
                        <th>ROM</th>
                        <th>Flags</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${pci.map(d => {
      const flags: string[] = [];
      if (d.primary_gpu) flags.push('Primary GPU');
      if (d.multifunction) flags.push('Multi');
      return html`
                          <tr>
                            <td><span class="monospace">${d.host_address}</span></td>
                            <td><span class="monospace">${d.guest_address || '-'}</span></td>
                            <td><span class="monospace storage-path">${d.rom_file || '-'}</span></td>
                            <td>${flags.length ? flags.join(', ') : '-'}</td>
                          </tr>
                        `;
    })}
                    </tbody>
                  </table>
                </div>
              ` : html`<div class="help-text">No PCI devices configured</div>`}
            </div>

            <div class="form-group">
              <label>Cloud-Init</label>
              <div class="list-container">
                <div style="margin-bottom: 8px;">
                  <span class="storage-badge ${cloudEnabled ? 'success' : ''}">${cloudEnabled ? 'Enabled' : 'Not configured'}</span>
                </div>
                <div class="grid-2">
                  <div>
                    <div class="help-text">Users</div>
                    <div>${cloud?.users?.length || 0}</div>
                  </div>
                  <div>
                    <div class="help-text">Packages</div>
                    <div>${cloud?.packages?.length || 0}</div>
                  </div>
                </div>
                <div class="grid-2" style="margin-top: 12px;">
                  <div>
                    <div class="help-text">SSH Keys</div>
                    <div>${cloud?.ssh_keys?.length || 0}</div>
                  </div>
                  <div>
                    <div class="help-text">Raw user-data</div>
                    <div>${cloud?.user_data ? 'Yes' : 'No'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="tab-content" data-content="json">
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
      </div>
    `;
  }

  override render() {
    const wizardState = this.wizardController.value;

    const openId = (wizardState as any).openId ?? 0;

    // Initialize component state from wizard state only once per openId
    if (openId !== this.lastInitializedOpenId) {
      this.lastInitializedOpenId = openId;
      this.currentStep = 1;
      this.validationErrors = {};

      this.editMode = !!(wizardState as any).editMode;
      this.editingVmId = (wizardState as any).editingVmId || null;
      this.templateMode = !!(wizardState as any).templateMode;
      this.templateContext = (wizardState as any).templateContext || null;

      const base = this.buildDefaultFormData();

      if (this.editMode && wizardState.formData && Object.keys(wizardState.formData).length > 0) {
        // Convert from VMCreateRequest format to EnhancedVMCreateRequest format
        const vmFormData = wizardState.formData as any;
        this.formData = {
          ...base,
          ...vmFormData,
          // Convert single network to array of networks
          networks: vmFormData.network ? [{
            type: vmFormData.network.type,
            source: vmFormData.network.source,
            model: vmFormData.network.model,
            mac: vmFormData.network.mac,
          }] : base.networks,
          // Convert single graphics to array
          graphics: vmFormData.graphics ? [vmFormData.graphics] : base.graphics,
        } as Partial<EnhancedVMCreateRequest>;
        this.templateDiskSizeGB = null;
      } else if (this.templateMode && this.templateContext) {
        const t = this.templateContext;
        const defaults: any = wizardState.formData || {};

        const netModel = (t as any).network_model || 'virtio';
        const gfxType = (t as any).graphics_type || 'vnc';

        this.formData = {
          ...base,
          ...defaults,
          os_type: (t as any).os_type || base.os_type,
          os_variant: (t as any).os_variant || base.os_variant,
          uefi: !!(t as any).uefi_boot,
          secure_boot: !!(t as any).secure_boot,
          tpm: !!(t as any).tpm,
          networks: [{
            type: 'network',
            source: (base.networks?.[0] as any)?.source || 'default',
            model: netModel,
          }],
          graphics: [{
            type: gfxType,
            autoport: true,
            listen: '0.0.0.0',
          }],
        } as Partial<EnhancedVMCreateRequest>;

        this.templateDiskSizeGB = (t.recommended_disk ?? t.min_disk) as any;
      } else {
        // Create mode
        this.formData = {
          ...base,
          ...(wizardState.formData || {}),
        } as Partial<EnhancedVMCreateRequest>;
        this.templateDiskSizeGB = null;
      }
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
          const target = e.currentTarget as HTMLElement;
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
            ${this.editMode ? 'Edit' : (this.templateMode ? 'Create from Template' : 'Create')} Virtual Machine (Enhanced)
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

      ${this.renderDeviceModal()}

      ${this.renderNetworkModal()}

      ${this.renderGraphicsModal()}

      ${this.renderPCIDeviceModal()}

      ${this.showCloseConfirmation ? html`
        <delete-modal
          .show=${this.showCloseConfirmation}
          .item=${{ type: 'Form', name: this.formData.name || 'Unsaved VM' }}
          modal-title="Discard Changes?"
          message="Are you sure you want to close? All unsaved changes will be lost."
          confirm-label="Discard"
          confirm-button-class="delete"
          @confirm-delete=${this.handleConfirmClose}
          @cancel-delete=${this.handleCancelClose}
        ></delete-modal>
      ` : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'create-vm-wizard-enhanced': CreateVMWizardEnhanced;
  }
}
