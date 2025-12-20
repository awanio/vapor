/**
 * Enhanced Virtual Machines List View
 * Integrated with Nanostores for state management
 */

import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { StoreController } from '@nanostores/lit';

// Import UI components
import '../../components/ui/search-input.js';
import '../../components/ui/empty-state.js';
import '../../components/ui/loading-state.js';
import '../../components/ui/status-badge.js';
import '../../components/ui/filter-dropdown.js';
import '../../components/tabs/tab-group.js';
import '../../components/tables/resource-table.js';
import '../../components/virtualization/vm-detail-drawer.js';
import '../../components/modals/delete-modal.js';
import '../../components/ui/notification-container.js';
import '../../components/modal-dialog.js';
import '../../components/virtualization/create-vm-wizard.js';
import '../../components/virtualization/create-vm-wizard-enhanced.js';
import '../../components/virtualization/os-variant-autocomplete.js';

// Import types
import type { Tab } from '../../components/tabs/tab-group.js';
import type { Column } from '../../components/tables/resource-table.js';
import type { ActionItem } from '../../components/ui/action-dropdown.js';


// Import virtualization store and types
import {
  vmStore,
  templateStore,
  templateActions,
  $filteredVMs,
  // $activeVMTab, // Unused - using local state instead
  $vmSearchQuery,
  $vmFilterState,
  // $selectedVM, // Unused - using local state instead
  // $vmWizardState, // Reserved for future use
  vmActions,
  consoleActions,
  wizardActions,
  initializeVirtualizationStores,
  $virtualizationEnabled,
  $virtualizationDisabledMessage,
} from '../../stores/virtualization';
import type { VirtualMachine, VMState, VMTemplate, VMTemplateCreateRequest, VMTemplateUpdateRequest, VMTemplateOsType, VMTemplateDiskFormat, VMTemplateNetworkModel, VMTemplateGraphicsType } from '../../types/virtualization';
import { VirtualizationDisabledError } from '../../utils/api-errors';
import virtualizationAPI from '../../services/virtualization-api';


@customElement('virtualization-vms-enhanced')
export class VirtualizationVMsEnhanced extends LitElement {
  private notificationContainer: HTMLElement | null = null;

  private mapEnhancedVmToFormData(enhanced: any): any {
    const storageDisks = Array.isArray(enhanced.storage?.disks)
      ? enhanced.storage.disks.map((d: any) => ({
          action: 'attach' as const,
          size: d.size,
          format: (d.format === 'vmdk' ? 'qcow2' : d.format) as 'qcow2' | 'raw',
          storage_pool: d.storage_pool,
          path: d.source_path || d.path,
          bus: d.bus,
          device: d.device,
          target: d.target,
          readonly: !!d.readonly,
        }))
      : [];

    const primaryNetwork = Array.isArray(enhanced.networks) && enhanced.networks.length > 0
      ? enhanced.networks[0]
      : undefined;

    const network = primaryNetwork
      ? {
          type: primaryNetwork.type,
          source:
            (primaryNetwork.source &&
              (primaryNetwork.source.network ||
               primaryNetwork.source.bridge ||
               primaryNetwork.source.dev)) ||
            primaryNetwork.source ||
            '',
          model:
            (primaryNetwork.model && primaryNetwork.model.type) ||
            primaryNetwork.model ||
            'virtio',
          mac: primaryNetwork.mac,
        }
      : undefined;

    const primaryGraphics = Array.isArray(enhanced.graphics) && enhanced.graphics.length > 0
      ? enhanced.graphics[0]
      : undefined;

    const graphics = primaryGraphics
      ? {
          type: primaryGraphics.type,
          port: primaryGraphics.port,
          password: primaryGraphics.password,
          autoport: primaryGraphics.autoport ?? true,
          listen: primaryGraphics.listen || '0.0.0.0',
        }
      : undefined;

    return {
      name: enhanced.name,
      memory: enhanced.memory,
      vcpus: enhanced.vcpus,
      storage: {
        default_pool: enhanced.storage?.default_pool || '',
        boot_iso: enhanced.storage?.boot_iso,
        disks: storageDisks,
      },
      os_type: enhanced.os_type,
      architecture: enhanced.architecture,
      uefi: enhanced.uefi,
      secure_boot: enhanced.secure_boot,
      tpm: enhanced.tpm,
      autostart: enhanced.autostart,
      network,
      graphics,
      metadata: enhanced.metadata,
    };
  }

  private handleShowNotification = (event: Event) => {
    const customEvent = event as CustomEvent<{ message?: string; type?: 'success' | 'error' | 'info' | 'warning'; duration?: number }>;
    const detail = customEvent.detail || {};
    const message = detail.message ?? '';
    const type = detail.type ?? 'info';
    const duration = detail.duration;

    if (!this.notificationContainer || typeof (this.notificationContainer as any).addNotification !== 'function') {
      return;
    }

    if (!message) return;

    (this.notificationContainer as any).addNotification({
      message,
      type,
      duration,
    });

    // Prevent further propagation once we've handled it
    event.stopPropagation();
  };

  // Store controllers for reactive updates
  private vmStoreController = new StoreController(this, vmStore.$items);
  private virtualizationEnabledController = new StoreController(this, $virtualizationEnabled);
  private virtualizationDisabledMessageController = new StoreController(this, $virtualizationDisabledMessage);
  // private templateStoreController = new StoreController(this, templateStore.$items); // Using subscription instead
  private filteredVMsController = new StoreController(this, $filteredVMs);
  // private selectedVMController = new StoreController(this, $selectedVM); // Unused
  // private activeTabController = new StoreController(this, $activeVMTab); // Using local state instead
  private searchQueryController = new StoreController(this, $vmSearchQuery);
  // private filterStateController = new StoreController(this, $vmFilterState); // Unused - managed directly
  // private _wizardStateController = new StoreController(this, $vmWizardState); // Reserved for future use

  // Local UI state
  @state() private showDeleteModal = false;
  @state() private vmToDelete: VirtualMachine | null = null;
  @state() private isDeleting = false;
  @state() private showDetailsDrawer = false;
  @state() private useEnhancedWizard = true; // Toggle for enhanced wizard
  @state() private activeMainTab: 'vms' | 'templates' = 'vms';
  @state() private stateFilter: 'all' | VMState = 'all';
  @state() private templates: VMTemplate[] = [];
  @state() private selectedVMForDetails: VirtualMachine | null = null;

  // Templates UI state
  @state() private showTemplateDrawer = false;
  @state() private templateDrawerMode: 'create' | 'edit' = 'create';
  @state() private editingTemplateId: string | null = null;
  @state() private isSavingTemplate = false;

  @state() private templateForm: {
    name: string;
    description: string;
    os_type: VMTemplateOsType;
    os_variant: string;
    min_memory: string;
    recommended_memory: string;
    min_vcpus: string;
    recommended_vcpus: string;
    min_disk: string;
    recommended_disk: string;
    disk_format: '' | VMTemplateDiskFormat;
    network_model: '' | VMTemplateNetworkModel;
    graphics_type: '' | VMTemplateGraphicsType;
    cloud_init: boolean;
    uefi_boot: boolean;
    secure_boot: boolean;
    tpm: boolean;
    default_user: string;
    metadata_json: string;
  } = {
    name: '',
    description: '',
    os_type: 'linux',
    os_variant: '',
    min_memory: '1024',
    recommended_memory: '',
    min_vcpus: '1',
    recommended_vcpus: '',
    min_disk: '10',
    recommended_disk: '',
    disk_format: '',
    network_model: '',
    graphics_type: '',
    cloud_init: false,
    uefi_boot: false,
    secure_boot: false,
    tpm: false,
    default_user: '',
    metadata_json: '',
  };

  @state() private templateFormErrors: Record<string, string> = {};

  @state() private showTemplateDeleteModal = false;
  @state() private templateToDelete: VMTemplate | null = null;
  @state() private isDeletingTemplate = false;

  // Create template from VM modal
  @state() private showCreateTemplateFromVmModal = false;
  @state() private vmForTemplateCreation: VirtualMachine | null = null;
  @state() private templateFromVmName = '';
  @state() private templateFromVmDescription = '';
  @state() private isCreatingTemplateFromVm = false;

  static override styles = css`
    :host {
      display: block;
      height: 100%;
      box-sizing: border-box;
    }

    .container {
      display: flex;
      flex-direction: column;
      height: 100%;
      gap: 1rem;
    }



    .stats-bar {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px;
      margin-bottom: 1.5rem;
    }

    .stat-widget {
      display: flex;
      flex-direction: column;
      padding: 14px;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-widget-border, var(--vscode-input-border, var(--vscode-panel-border, #454545)));
      border-radius: 8px;
      transition: all 0.2s ease;
      position: relative;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
    }

    .stat-widget:hover {
      border-color: var(--vscode-focusBorder);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      background: rgba(255, 255, 255, 0.02);
    }

    .stat-widget::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      border-radius: 8px 8px 0 0;
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    .stat-widget:hover::before {
      opacity: 1;
    }

    .stat-widget:nth-child(1)::before {
      background: var(--vscode-charts-blue);
    }

    .stat-widget:nth-child(2)::before {
      background: var(--vscode-charts-green);
    }

    .stat-widget:nth-child(3)::before {
      background: var(--vscode-charts-red);
    }

    .stat-widget:nth-child(4)::before {
      background: var(--vscode-charts-purple);
    }

    .stat-widget:nth-child(5)::before {
      background: var(--vscode-charts-orange);
    }

    .stat-widget:nth-child(6)::before {
      background: var(--vscode-charts-yellow);
    }

    .stat-widget-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .stat-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      font-size: 14px;
    }

    .stat-icon.total {
      color: var(--vscode-charts-blue);
    }

    .stat-icon.running {
      color: var(--vscode-charts-green);
    }

    .stat-icon.stopped {
      color: var(--vscode-charts-red);
    }

    .stat-icon.memory {
      color: var(--vscode-charts-purple);
    }

    .stat-icon.cpu {
      color: var(--vscode-charts-orange);
    }

    .stat-icon.storage {
      color: var(--vscode-charts-yellow);
    }

    .stat-label {
      font-size: 11px;
      font-weight: 500;
      text-transform: uppercase;
      color: var(--vscode-descriptionForeground);
      opacity: 0.8;
    }

    .stat-value {
      font-size: 18px;
      font-weight: 600;
      color: var(--vscode-foreground);
      line-height: 1.2;
    }

    .stat-value.running {
      color: var(--vscode-charts-green);
    }

    .stat-value.stopped {
      color: var(--vscode-charts-red);
    }

    .stat-subtitle {
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
      margin-top: 2px;
      opacity: 0.7;
    }

    .controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      gap: 1rem;
    }

    .filters-section {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
    }

    .actions-section {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    search-input {
      flex: 1;
      max-width: 400px;
    }

    .content {
      flex: 1;
      overflow-y: auto;
    }

    .btn-create {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      background: var(--vscode-button-background, #007acc);
      color: var(--vscode-button-foreground, white);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s;
    }

    .btn-create:hover {
      background: var(--vscode-button-hoverBackground, #005a9e);
    }

    .btn-refresh {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 8px 12px;
      background: transparent;
      color: var(--vscode-foreground);
      border: 1px solid var(--vscode-button-border);
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.2s;
    }

    .btn-refresh:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }

    .state-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .state-badge.running {
      background: var(--vscode-testing-runAction);
      color: white;
    }

    .state-badge.stopped {
      background: var(--vscode-inputValidation-errorBackground);
      color: var(--vscode-inputValidation-errorForeground);
    }

    .state-badge.paused {
      background: var(--vscode-inputValidation-warningBackground);
      color: var(--vscode-inputValidation-warningForeground);
    }

    .state-badge.suspended {
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
    }

    .virtualization-disabled-banner {
      margin-top: 16px;
      padding: 16px 20px;
      border-radius: 8px;
      border: 1px solid var(--vscode-inputValidation-warningBorder, #e2c08d);
      background: var(--vscode-inputValidation-warningBackground, rgba(229, 200, 144, 0.15));
      color: var(--vscode-inputValidation-warningForeground, #e2c08d);
    }

    .virtualization-disabled-banner h2 {
      margin: 0 0 8px 0;
      font-size: 16px;
      font-weight: 500;
    }

    .virtualization-disabled-banner p {
      margin: 0 0 4px 0;
      font-size: 13px;
      color: var(--vscode-descriptionForeground);
    }
    /* Templates drawer + form */
    .drawer-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 999;
    }

    .drawer {
      position: fixed;
      top: 0;
      right: 0;
      width: 520px;
      max-width: calc(100vw - 40px);
      height: 100vh;
      background: var(--vscode-editor-background, var(--vscode-bg-light));
      border-left: 1px solid var(--vscode-widget-border, var(--vscode-panel-border, #454545));
      box-shadow: -2px 0 12px rgba(0, 0, 0, 0.25);
      z-index: 1000;
      display: flex;
      flex-direction: column;
    }

    .drawer-header {
      padding: 16px 20px;
      background: var(--vscode-bg-lighter, #2c2f3a);
      border-bottom: 1px solid var(--vscode-widget-border, var(--vscode-panel-border, #454545));
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }

    .drawer-title {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--vscode-foreground);
    }

    .drawer-close {
      background: none;
      border: none;
      color: var(--vscode-descriptionForeground);
      cursor: pointer;
      padding: 6px 8px;
      border-radius: 4px;
    }

    .drawer-close:hover {
      background: rgba(255, 255, 255, 0.06);
      color: var(--vscode-foreground);
    }

    .drawer-content {
      padding: 16px 20px;
      overflow: auto;
      flex: 1;
    }

    .drawer-footer {
      padding: 14px 20px;
      border-top: 1px solid var(--vscode-widget-border, var(--vscode-panel-border, #454545));
      background: var(--vscode-bg);
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      flex-shrink: 0;
    }

    /* Buttons (match create-vm-wizard-enhanced) */
    .btn {
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border: 1px solid transparent;
      font-family: inherit;
    }

    .btn:disabled {
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

    .btn-secondary:hover:not(:disabled) {
      background: var(--vscode-button-secondaryHoverBackground, rgba(90, 93, 94, 0.25));
    }

    .modal-footer-actions {
      width: 100%;
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    /* Form elements (match create-vm-wizard-enhanced) */
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

    input::placeholder,
    textarea::placeholder {
      color: var(--vscode-input-placeholderForeground, rgba(204, 204, 204, 0.6));
    }

    input:focus,
    select:focus,
    textarea:focus {
      outline: none;
      border-color: var(--vscode-focusBorder, #007acc);
      box-shadow: 0 0 0 1px var(--vscode-focusBorder, #007acc);
    }

    input:disabled,
    select:disabled,
    textarea:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    input[type="checkbox"] {
      width: auto;
      max-width: none;
      padding: 0;
      border-radius: 0;
      box-shadow: none;
    }

    textarea {
      min-height: 90px;
      resize: vertical;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
    }

    .help-text {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      opacity: 0.8;
    }

    .error-text {
      color: var(--vscode-inputValidation-errorForeground, #f48771);
      font-size: 12px;
    }

    .toggle-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin: 10px 0 6px;
    }

    .toggle {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border, #454545));
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.02);
    }

    .toggle input {
      width: 14px;
      height: 14px;
    }

    .flag-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .flag-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 11px;
      border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border, #454545));
      background: rgba(255, 255, 255, 0.02);
    }

    .flag-badge.on {
      border-color: rgba(137, 209, 133, 0.6);
      color: rgba(137, 209, 133, 1);
    }

    .flag-badge.off {
      opacity: 0.6;
    }

    @media (max-width: 820px) {
      .drawer {
        width: 100%;
        max-width: 100%;
      }
      .form-grid {
        grid-template-columns: 1fr;
      }
      .toggle-row {
        grid-template-columns: 1fr;
      }
    }


  `;

  private tabs: Tab[] = [
    { id: 'vms', label: 'Virtual Machines' },
    { id: 'templates', label: 'Templates' }
  ];

  override async connectedCallback() {
    super.connectedCallback();
    // Initialize stores
    await this.initializeData();
  }

  override firstUpdated(_changedProperties: any) {
    this.notificationContainer = this.renderRoot.querySelector('notification-container');
    // Listen for bubbled show-notification events from child components (e.g. drawers)
    this.addEventListener('show-notification', this.handleShowNotification as EventListener);
  }

  private async initializeData() {
    try {
      await initializeVirtualizationStores();
      // Subscribe to template store changes
      templateStore.$items.subscribe(items => {
        if (items) {
          if (items instanceof Map) {
            // Convert Map values to array safely
            const values: VMTemplate[] = [];
            items.forEach((value) => {
              if (value && typeof value === 'object') {
                values.push(value as VMTemplate);
              }
            });
            this.templates = values;
          } else if (Array.isArray(items)) {
            this.templates = items.filter(v => v && typeof v === 'object') as VMTemplate[];
          } else if (typeof items === 'object' && items !== null) {
            // Handle plain object - use unknown first to avoid type errors
            const values = Object.values(items as Record<string, unknown>);
            this.templates = values.filter((v): v is VMTemplate =>
              v !== null && typeof v === 'object'
            ) as VMTemplate[];
          }
        }
      });
    } catch (error) {
      console.error('Failed to initialize virtualization stores:', error);
      if (!(error instanceof VirtualizationDisabledError)) {
        this.showNotification('Failed to load virtual machines', 'error');
      }
    }
  }

  private getColumns(): Column[] {
    if (this.activeMainTab === 'templates') {
      return [
        { key: 'name', label: 'Name', type: 'link' },
        { key: 'os', label: 'OS' },
        { key: 'memory', label: 'Memory (MB)' },
        { key: 'vcpus', label: 'vCPUs' },
        { key: 'disk', label: 'Disk (GB)' },
        { key: 'flags', label: 'Flags' },
        { key: 'updated', label: 'Updated' }
      ];
    }
    return [
      { key: 'name', label: 'Name', type: 'link' },
      { key: 'state', label: 'State', type: 'status' },
      { key: 'vcpus', label: 'vCPUs' },
      { key: 'memory', label: 'Memory (MB)' },
      { key: 'disk_size', label: 'Disk (GB)' },
      { key: 'os_type', label: 'Operating System' },
      { key: 'created_at', label: 'Created' }
    ];
  }

  private formatMemory(mb: number): string {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb} MB`;
  }

  private formatDiskSize(gb: number): string {
    if (gb >= 1024) {
      return `${(gb / 1024).toFixed(1)} TB`;
    }
    return `${gb} GB`;
  }

  private renderStateCell(state: VMState): any {
    // const stateColors = {
    //   running: 'green',
    //   stopped: 'red',
    //   paused: 'yellow',
    //   suspended: 'gray',
    //   unknown: 'gray'
    // };

    return html`
      <span class="state-badge ${state}">
        ${state}
      </span>
    `;
  }

  private getActions(vm: VirtualMachine): ActionItem[] {
    const actions: ActionItem[] = [
      { label: 'View Details', action: 'view', icon: 'ℹ️' }
    ];

    // Normalize state to lowercase for comparison
    const vmState = vm.state?.toLowerCase();

    switch (vmState) {
      case 'running':
        actions.push(
          { label: 'Console', action: 'console', icon: '💻' },
          { label: 'Stop', action: 'stop', icon: '⏹️' },
          { label: 'Pause', action: 'pause', icon: '⏸️' },
          { label: 'Restart', action: 'restart', icon: '🔄' }
        );
        break;
      case 'stopped':
      case 'shutoff': // Handle both stopped and shutoff states
      case 'stop':    // Some systems might use 'stop' instead of 'stopped'
        actions.push(
          { label: 'Start', action: 'start', icon: '▶️' },
          { label: 'Edit', action: 'edit', icon: '✏️' },
          { label: 'Clone', action: 'clone', icon: '📋' }
        );
        // Add delete action for stopped VMs
        actions.push(
          { label: 'Delete', action: 'delete', icon: '🗑️', danger: true }
        );
        break;
      case 'paused':
        actions.push(
          { label: 'Resume', action: 'resume', icon: '▶️' },
          { label: 'Stop', action: 'stop', icon: '⏹️' }
        );
        break;
      case 'suspended':
        actions.push(
          { label: 'Resume', action: 'resume', icon: '▶️' }
        );
        break;
      default:
        // For unknown states, at least allow viewing details
        break;
    }

    // Add snapshot and template actions for all states
    actions.push(
      { label: 'Snapshot', action: 'snapshot', icon: '📸' },
      { label: 'Create Template', action: 'create-template', icon: '📄' },
    );

    return actions;
  }

  private async handleTabChange(event: CustomEvent) {
    const tabId = event.detail.tabId;
    this.activeMainTab = tabId as 'vms' | 'templates';

    // Load appropriate data
    if (tabId === 'templates') {
      await templateActions.fetchAll();
    } else {
      await vmActions.fetchAll();
    }
  }

  private handleStateFilterChange(event: CustomEvent) {
    this.stateFilter = event.detail.value as 'all' | VMState;

    if (this.stateFilter === 'all') {
      $vmFilterState.set({});
    } else {
      $vmFilterState.set({ state: [this.stateFilter] });
    }
  }

  private handleSearchChange(event: CustomEvent) {
    $vmSearchQuery.set(event.detail.value);
  }

  private handleCellClick(event: CustomEvent) {
    const { column, item } = event.detail;

    if (column.key !== 'name') return;

    if (this.activeMainTab === 'vms') {
      this.showVMDetails(item as VirtualMachine);
      return;
    }

    this.openEditTemplateDrawer(item as VMTemplate);
  }

  private async handleAction(event: CustomEvent) {
    const { action, item } = event.detail;

    if (this.activeMainTab === 'templates') {
      await this.handleTemplateAction(action as string, item as VMTemplate);
      return;
    }

    const vm = item as VirtualMachine;

    try {
      switch (action) {
        case 'view':
          this.showVMDetails(vm);
          break;
        case 'console':
          await this.openConsole(vm);
          break;
        case 'start':
          await vmActions.start(vm.id);
          this.showNotification(`Starting VM: ${vm.name}`, 'success');
          break;
        case 'stop':
          await vmActions.stop(vm.id);
          this.showNotification(`Stopping VM: ${vm.name}`, 'success');
          break;
        case 'pause':
          await vmActions.pause(vm.id);
          this.showNotification(`Pausing VM: ${vm.name}`, 'success');
          break;
        case 'resume':
          await vmActions.resume(vm.id);
          this.showNotification(`Resuming VM: ${vm.name}`, 'success');
          break;
        case 'restart':
          await vmActions.restart(vm.id);
          this.showNotification(`Restarting VM: ${vm.name}`, 'success');
          break;
        case 'edit':
          await this.editVM(vm);
          break;
        case 'clone':
          await this.cloneVM(vm);
          break;
        case 'snapshot':
          await this.createSnapshot(vm);
          break;
        case 'create-template':
          this.openCreateTemplateFromVmModal(vm);
          break;
        case 'delete':
          this.confirmDeleteVM(vm);
          break;
      }
    } catch (error) {
      console.error(`Failed to execute action ${action}:`, error);
      this.showNotification(
        `Failed to ${action} VM: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      );
    }
  }

  private showVMDetails(vm: VirtualMachine) {
    this.selectedVMForDetails = vm;
    this.showDetailsDrawer = true;
  }

  private async openConsole(vm: VirtualMachine) {
    try {
      // Get VNC console token from API
      const vncInfo = await consoleActions.getVNC(vm.id);
      if (!vncInfo || !vncInfo.token) {
        throw new Error('Failed to obtain console access token');
      }

      // Build WebSocket URL for VNC console
      const wsUrl = consoleActions.getVNCWebSocketUrl(vm.id, vncInfo.token);
      
      // Open in new tab with the VNC console page
      const vncUrl = `/vnc-console.html?url=${encodeURIComponent(wsUrl)}&fullscreen=true&vmName=${encodeURIComponent(vm.name || vm.id)}`;
      window.open(vncUrl, '_blank');
    } catch (error) {
      console.error('Failed to open console:', error);
      this.showNotification('Failed to open console', 'error');
    }
  }

  private async editVM(vm: VirtualMachine) {
    try {
      const envelope: any = await virtualizationAPI.getVM(vm.id);
      const enhanced = envelope?.data || envelope;
      if (enhanced && typeof enhanced === 'object') {
        const formData = this.mapEnhancedVmToFormData(enhanced);
        wizardActions.openEnhancedWizardForEdit(vm.id, formData as any);
        return;
      }
    } catch (error) {
      console.error('Failed to load VM details for edit, falling back to basic data:', error);
    }

    // Fallback: use basic VM data from the store
    wizardActions.openWizardForEdit(vm);
  }

  private async cloneVM(vm: VirtualMachine) {
    // Reuse the clone modal in the VM detail drawer for list dropdown actions
    this.selectedVMForDetails = vm;
    this.showDetailsDrawer = true;

    // Wait for the drawer to render before invoking its public method
    await this.updateComplete;

    const drawer = this.renderRoot.querySelector('vm-detail-drawer') as any;
    if (drawer && typeof drawer.openCloneModal === 'function') {
      drawer.openCloneModal();
    } else {
      this.showNotification('Unable to open clone dialog', 'error');
    }
  }

  private async createSnapshot(vm: VirtualMachine) {
    // TODO: Open snapshot dialog
    console.log('Create snapshot for:', vm.name);
    this.showNotification('Snapshot functionality coming soon', 'info');
  }

  private confirmDeleteVM(vm: VirtualMachine) {
    // Check if VM is running and prevent deletion (case-insensitive)
    const vmState = vm.state?.toLowerCase();
    if (vmState === 'running') {
      this.showNotification('Cannot delete a running VM. Please stop it first.', 'error');
      return;
    }

    this.vmToDelete = vm;
    this.showDeleteModal = true;

    // Force a re-render to ensure modal shows
    this.requestUpdate();
  }

  private async handleDelete() {
    if (!this.vmToDelete) return;

    this.isDeleting = true;

    try {
      await vmActions.delete(this.vmToDelete.id);
      this.showNotification(`VM "${this.vmToDelete.name}" deleted successfully`, 'success');
      this.showDeleteModal = false;
      this.vmToDelete = null;
    } catch (error) {
      console.error('Failed to delete VM:', error);
      this.showNotification(
        `Failed to delete VM: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      );
    } finally {
      this.isDeleting = false;
    }
  }

  private handleCreateNew() {
    if (this.activeMainTab === 'templates') {
      this.openCreateTemplateDrawer();
      return;
    }
    wizardActions.openWizard();
  }

  private async handleRefresh() {
    try {
      if (this.activeMainTab === 'templates') {
        await templateActions.fetchAll();
        this.showNotification('Templates refreshed', 'success');
      } else {
        await vmActions.fetchAll();
        this.showNotification('VMs refreshed', 'success');
      }
    } catch (error) {
      if (!(error instanceof VirtualizationDisabledError)) {
        this.showNotification(`Failed to refresh ${this.activeMainTab}`, 'error');
      }
    }
  }

  private showNotification(message: string, type: 'success' | 'error' | 'info' = 'info') {
    // Dispatch event for notification container
    this.dispatchEvent(new CustomEvent('show-notification', {
      detail: { message, type },
      bubbles: true,
      composed: true
    }));
  }

  private async handleVMPowerAction(event: CustomEvent) {
    const { action, vm, success } = event.detail;

    // If the action was already executed successfully by the drawer
    if (success) {
      // Update selectedVMForDetails with the new state from the event
      if (this.selectedVMForDetails && vm) {
        this.selectedVMForDetails = { ...vm };
      }
      
      // Update the store's local state immediately so the table reflects the change
      if (vm?.id && vm?.state) {
        vmActions.updateLocalState(vm.id, vm.state);
      }
      return;
    }

    try {
      switch (action) {
        case 'start':
          await vmActions.start(vm.id);
          this.showNotification(`Starting VM: ${vm.name}`, 'success');
          break;
        case 'stop':
          await vmActions.stop(vm.id);
          this.showNotification(`Stopping VM: ${vm.name}`, 'success');
          break;
        case 'restart':
          await vmActions.restart(vm.id);
          this.showNotification(`Restarting VM: ${vm.name}`, 'success');
          break;
        case 'pause':
          await vmActions.pause(vm.id);
          this.showNotification(`Pausing VM: ${vm.name}`, 'success');
          break;
        case 'resume':
          await vmActions.resume(vm.id);
          this.showNotification(`Resuming VM: ${vm.name}`, 'success');
          break;
        case 'clone':
          await this.cloneVM(vm);
          break;
        case 'snapshot':
          await this.createSnapshot(vm);
          break;
        case 'delete':
          this.confirmDeleteVM(vm);
          break;
        default:
          console.warn(`Unknown VM action: ${action}`);
      }

      // Refresh the VM data to show updated state
      await vmActions.fetchAll();
    } catch (error) {
      console.error(`Failed to execute VM action ${action}:`, error);
      this.showNotification(
        `Failed to ${action} VM: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      );
    }
  }

  private async handleVMConsoleConnect(event: CustomEvent) {
    const { vm } = event.detail;
    await this.openConsole(vm);
  }
  private async handleVMCloned(event: CustomEvent) {
    try {
      const clonedName: string | undefined = event.detail?.cloned?.name;
      await vmActions.fetchAll();

      if (clonedName) {
        const items: any = vmStore.$items.get();
        let vms: any[] = [];
        if (items instanceof Map) {
          vms = Array.from(items.values());
        } else if (Array.isArray(items)) {
          vms = items;
        } else if (items && typeof items === 'object') {
          vms = Object.values(items);
        }

        const found = vms.find((v: any) => v?.name === clonedName);
        if (found) {
          this.showVMDetails(found);
        }
      }
    } catch (error) {
      console.error('Failed to refresh VMs after clone:', error);
    }
  }


  
  private async handleWizardVmCreated(event: CustomEvent) {
    const vm = (event.detail as any)?.vm;
    if (!vm) return;

    this.activeMainTab = 'vms';
    // Ensure list is fresh, then open details
    try {
      await vmActions.fetchAll();
    } catch {}
    this.showVMDetails(vm);
  }

// ============ Templates helpers ============

  private getTemplateActions(_template: VMTemplate): ActionItem[] {
    return [
      { label: 'Create VM', action: 'create-vm', icon: '🖥️' },
      { label: 'Edit', action: 'edit', icon: '✏️' },
      { label: 'Delete', action: 'delete', icon: '🗑️', danger: true },
    ];
  }

  private renderTemplateFlags(template: VMTemplate) {
    const flags = [
      { label: 'Cloud-Init', on: template.cloud_init },
      { label: 'UEFI', on: template.uefi_boot },
      { label: 'Secure Boot', on: template.secure_boot },
      { label: 'TPM', on: template.tpm },
    ];

    return html`
      <div class="flag-badges">
        ${flags.map(f => html`
          <span class="flag-badge ${f.on ? 'on' : 'off'}">
            ${f.on ? '✓' : '—'} ${f.label}
          </span>
        `)}
      </div>
    `;
  }

  private async handleTemplateAction(action: string, template: VMTemplate) {
    switch (action) {
      case 'create-vm':
        wizardActions.openWizardFromTemplate(template);
        break;
      case 'view':
      case 'edit':
        this.openEditTemplateDrawer(template);
        break;
      case 'delete':
        this.confirmDeleteTemplate(template);
        break;
      default:
        console.warn(`Unknown template action: ${action}`);
    }
  }

  private openCreateTemplateDrawer() {
    this.templateDrawerMode = 'create';
    this.editingTemplateId = null;
    this.templateFormErrors = {};

    this.templateForm = {
      name: '',
      description: '',
      os_type: 'linux',
      os_variant: '',
      min_memory: '1024',
      recommended_memory: '',
      min_vcpus: '1',
      recommended_vcpus: '',
      min_disk: '10',
      recommended_disk: '',
      disk_format: '',
      network_model: '',
      graphics_type: '',
      cloud_init: false,
      uefi_boot: false,
      secure_boot: false,
      tpm: false,
      default_user: '',
      metadata_json: '',
    };

    this.showTemplateDrawer = true;
  }

  private openEditTemplateDrawer(template: VMTemplate) {
    this.templateDrawerMode = 'edit';
    this.editingTemplateId = template.id;
    this.templateFormErrors = {};

    this.templateForm = {
      name: template.name || '',
      description: template.description || '',
      os_type: (template.os_type || 'linux') as VMTemplateOsType,
      os_variant: template.os_variant || '',
      min_memory: String(template.min_memory ?? ''),
      recommended_memory: template.recommended_memory !== undefined && template.recommended_memory !== null
        ? String(template.recommended_memory)
        : '',
      min_vcpus: String(template.min_vcpus ?? ''),
      recommended_vcpus: template.recommended_vcpus !== undefined && template.recommended_vcpus !== null
        ? String(template.recommended_vcpus)
        : '',
      min_disk: String(template.min_disk ?? ''),
      recommended_disk: template.recommended_disk !== undefined && template.recommended_disk !== null
        ? String(template.recommended_disk)
        : '',
      disk_format: template.disk_format || '',
      network_model: template.network_model || '',
      graphics_type: template.graphics_type || '',
      cloud_init: !!template.cloud_init,
      uefi_boot: !!template.uefi_boot,
      secure_boot: !!template.secure_boot,
      tpm: !!template.tpm,
      default_user: template.default_user || '',
      metadata_json: template.metadata ? JSON.stringify(template.metadata, null, 2) : '',
    };

    this.showTemplateDrawer = true;
  }

  private closeTemplateDrawer() {
    this.showTemplateDrawer = false;
    this.templateFormErrors = {};
  }

  private async saveTemplate() {
    const errors: Record<string, string> = {};

    const name = this.templateForm.name.trim();
    if (this.templateDrawerMode === 'create' && !name) {
      errors.name = 'Name is required';
    }

    const min_memory = Number(this.templateForm.min_memory);
    if (!Number.isFinite(min_memory) || min_memory <= 0) {
      errors.min_memory = 'Min memory must be a positive number';
    }

    const min_vcpus = Number(this.templateForm.min_vcpus);
    if (!Number.isFinite(min_vcpus) || min_vcpus <= 0) {
      errors.min_vcpus = 'Min vCPUs must be a positive number';
    }

    const min_disk = Number(this.templateForm.min_disk);
    if (!Number.isFinite(min_disk) || min_disk <= 0) {
      errors.min_disk = 'Min disk must be a positive number';
    }

    const parseOptional = (value: string) => {
      const v = value.trim();
      if (!v) return undefined;
      const n = Number(v);
      if (!Number.isFinite(n)) return undefined;
      return n;
    };

    const recommended_memory = parseOptional(this.templateForm.recommended_memory);
    if (recommended_memory !== undefined && Number.isFinite(min_memory) && recommended_memory < min_memory) {
      errors.recommended_memory = 'Recommended memory must be >= min memory';
    }

    const recommended_vcpus = parseOptional(this.templateForm.recommended_vcpus);
    if (recommended_vcpus !== undefined && Number.isFinite(min_vcpus) && recommended_vcpus < min_vcpus) {
      errors.recommended_vcpus = 'Recommended vCPUs must be >= min vCPUs';
    }

    const recommended_disk = parseOptional(this.templateForm.recommended_disk);
    if (recommended_disk !== undefined && Number.isFinite(min_disk) && recommended_disk < min_disk) {
      errors.recommended_disk = 'Recommended disk must be >= min disk';
    }

    let metadata: Record<string, string> | undefined;
    const metaText = this.templateForm.metadata_json.trim();
    if (metaText) {
      try {
        const parsed = JSON.parse(metaText);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          errors.metadata_json = 'Metadata must be a JSON object (key/value)';
        } else {
          const out: Record<string, string> = {};
          for (const [k, v] of Object.entries(parsed)) {
            if (v === null || v === undefined) continue;
            if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
              out[String(k)] = String(v);
            } else {
              errors.metadata_json = 'Metadata values must be strings/numbers/booleans';
              break;
            }
          }
          if (!errors.metadata_json) {
            metadata = out;
          }
        }
      } catch {
        errors.metadata_json = 'Metadata must be valid JSON';
      }
    }

    if (Object.keys(errors).length > 0) {
      this.templateFormErrors = errors;
      return;
    }

    const common: Omit<VMTemplateCreateRequest, 'name'> = {
      description: this.templateForm.description.trim() || undefined,
      os_type: this.templateForm.os_type,
      os_variant: this.templateForm.os_variant.trim() || undefined,
      min_memory,
      recommended_memory,
      min_vcpus,
      recommended_vcpus,
      min_disk,
      recommended_disk,
      disk_format: this.templateForm.disk_format || undefined,
      network_model: this.templateForm.network_model || undefined,
      graphics_type: this.templateForm.graphics_type || undefined,
      cloud_init: this.templateForm.cloud_init,
      uefi_boot: this.templateForm.uefi_boot,
      secure_boot: this.templateForm.secure_boot,
      tpm: this.templateForm.tpm,
      default_user: this.templateForm.default_user.trim() || undefined,
      metadata,
    };

    this.isSavingTemplate = true;
    try {
      if (this.templateDrawerMode === 'create') {
        const created = await templateActions.create({
          name: this.templateForm.name.trim(),
          ...common,
        });
        this.showNotification(`Template "${created.name}" created`, 'success');
      } else if (this.editingTemplateId) {
        const updated = await templateActions.update(this.editingTemplateId, common as VMTemplateUpdateRequest);
        this.showNotification(`Template "${updated.name}" updated`, 'success');
      }
      this.closeTemplateDrawer();
    } catch (error) {
      const err: any = error;
      const code = err?.code ? ` (${err.code})` : '';
      const details = err?.details ? ` - ${err.details}` : '';
      this.showNotification(`Failed to save template: ${err instanceof Error ? err.message : 'Unknown error'}${details}${code}`, 'error');
    } finally {
      this.isSavingTemplate = false;
    }
  }

  private confirmDeleteTemplate(template: VMTemplate) {
    this.templateToDelete = template;
    this.showTemplateDeleteModal = true;
    this.requestUpdate();
  }

  private async handleDeleteTemplate() {
    if (!this.templateToDelete) return;

    this.isDeletingTemplate = true;
    try {
      await templateActions.delete(this.templateToDelete.id);
      this.showNotification(`Template "${this.templateToDelete.name}" deleted successfully`, 'success');
      this.showTemplateDeleteModal = false;
      this.templateToDelete = null;
    } catch (error) {
      const err: any = error;
      const code = err?.code ? ` (${err.code})` : '';
      const details = err?.details ? ` - ${err.details}` : '';
      this.showNotification(`Failed to delete template: ${err instanceof Error ? err.message : 'Unknown error'}${details}${code}`, 'error');
    } finally {
      this.isDeletingTemplate = false;
    }
  }

  private openCreateTemplateFromVmModal(vm: VirtualMachine) {
    this.vmForTemplateCreation = vm;
    this.templateFromVmName = `${vm.name}-template`;
    this.templateFromVmDescription = '';
    this.showCreateTemplateFromVmModal = true;
  }

  private closeCreateTemplateFromVmModal() {
    this.showCreateTemplateFromVmModal = false;
    this.vmForTemplateCreation = null;
    this.templateFromVmName = '';
    this.templateFromVmDescription = '';
    this.isCreatingTemplateFromVm = false;
  }

  private async submitCreateTemplateFromVm() {
    if (!this.vmForTemplateCreation) return;

    const name = this.templateFromVmName.trim();
    if (!name) {
      this.showNotification('Template name is required', 'error');
      return;
    }

    this.isCreatingTemplateFromVm = true;
    try {
      const created = await templateActions.createFromVM(
        this.vmForTemplateCreation.id,
        name,
        this.templateFromVmDescription.trim() || undefined,
      );
      this.showNotification(`Template "${created.name}" created from VM "${this.vmForTemplateCreation.name}"`, 'success');
      this.activeMainTab = 'templates';
      this.closeCreateTemplateFromVmModal();
    } catch (error) {
      const err: any = error;
      const code = err?.code ? ` (${err.code})` : '';
      const details = err?.details ? ` - ${err.details}` : '';
      this.showNotification(`Failed to create template: ${err instanceof Error ? err.message : 'Unknown error'}${details}${code}`, 'error');
      this.isCreatingTemplateFromVm = false;
    }
  }

  private renderCreateTemplateFromVmModal() {
    return html`
      <modal-dialog
        .open=${this.showCreateTemplateFromVmModal}
        .title=${this.vmForTemplateCreation
          ? `Create Template from ${this.vmForTemplateCreation.name}`
          : 'Create Template from VM'}
        size="small"
        @modal-close=${this.closeCreateTemplateFromVmModal}
      >
        <div class="form-group">
          <label>Template Name</label>
          <input
            type="text"
            .value=${this.templateFromVmName}
            @input=${(e: InputEvent) => {
              this.templateFromVmName = (e.target as HTMLInputElement).value;
            }}
          />
        </div>
        <div class="form-group">
          <label>Description (optional)</label>
          <input
            type="text"
            .value=${this.templateFromVmDescription}
            @input=${(e: InputEvent) => {
              this.templateFromVmDescription = (e.target as HTMLInputElement).value;
            }}
          />
        </div>

        <div slot="footer" class="modal-footer-actions">
          <button class="btn btn-secondary" @click=${this.closeCreateTemplateFromVmModal}>
            Cancel
          </button>
          <button
            class="btn btn-primary"
            @click=${this.submitCreateTemplateFromVm}
            ?disabled=${this.isCreatingTemplateFromVm || !this.templateFromVmName.trim()}
          >
            ${this.isCreatingTemplateFromVm ? 'Creating…' : 'Create Template'}
          </button>
        </div>
      </modal-dialog>
    `;
  }

  private renderTemplateDrawer() {
    if (!this.showTemplateDrawer) return html``;

    const isEdit = this.templateDrawerMode === 'edit';

    return html`
      <div class="drawer-overlay" @click=${this.closeTemplateDrawer}></div>
      <div class="drawer">
        <div class="drawer-header">
          <h2 class="drawer-title">${isEdit ? 'Edit Template' : 'Create Template'}</h2>
          <button class="drawer-close" @click=${this.closeTemplateDrawer} aria-label="Close">✕</button>
        </div>

        <div class="drawer-content">
          <div class="form-group">
            <label>Name${isEdit ? '' : ' *'}</label>
            <input
              type="text"
              .value=${this.templateForm.name}
              ?disabled=${isEdit}
              @input=${(e: InputEvent) => {
                this.templateForm = { ...this.templateForm, name: (e.target as HTMLInputElement).value };
              }}
            />
            ${this.templateFormErrors.name ? html`<div class="error-text">${this.templateFormErrors.name}</div>` : ''}
            ${isEdit ? html`<div class="help-text">Template name cannot be changed.</div>` : ''}
          </div>

          <div class="form-group">
            <label>Description</label>
            <input
              type="text"
              .value=${this.templateForm.description}
              @input=${(e: InputEvent) => {
                this.templateForm = { ...this.templateForm, description: (e.target as HTMLInputElement).value };
              }}
            />
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label>OS Type *</label>
              <select
                .value=${this.templateForm.os_type}
                @change=${(e: Event) => {
                  this.templateForm = { ...this.templateForm, os_type: (e.target as HTMLSelectElement).value as VMTemplateOsType };
                }}
              >
                <option value="linux">linux</option>
                <option value="windows">windows</option>
                <option value="bsd">bsd</option>
                <option value="other">other</option>
                <option value="hvm">hvm</option>
              </select>
            </div>

            <div class="form-group">
              <label>OS Variant</label>
              <os-variant-autocomplete
                .value=${this.templateForm.os_variant}
                .family=${this.templateForm.os_type}
                placeholder="ubuntu22.04"
                @os-variant-change=${(e: CustomEvent<{ value: string }>) => {
                  this.templateForm = { ...this.templateForm, os_variant: e.detail.value };
                }}
              ></os-variant-autocomplete>
            </div>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label>Min Memory (MB) *</label>
              <input
                type="number"
                min="1"
                .value=${this.templateForm.min_memory}
                @input=${(e: InputEvent) => {
                  this.templateForm = { ...this.templateForm, min_memory: (e.target as HTMLInputElement).value };
                }}
              />
              ${this.templateFormErrors.min_memory ? html`<div class="error-text">${this.templateFormErrors.min_memory}</div>` : ''}
            </div>

            <div class="form-group">
              <label>Recommended Memory (MB)</label>
              <input
                type="number"
                min="1"
                .value=${this.templateForm.recommended_memory}
                @input=${(e: InputEvent) => {
                  this.templateForm = { ...this.templateForm, recommended_memory: (e.target as HTMLInputElement).value };
                }}
              />
              ${this.templateFormErrors.recommended_memory ? html`<div class="error-text">${this.templateFormErrors.recommended_memory}</div>` : ''}
            </div>

            <div class="form-group">
              <label>Min vCPUs *</label>
              <input
                type="number"
                min="1"
                .value=${this.templateForm.min_vcpus}
                @input=${(e: InputEvent) => {
                  this.templateForm = { ...this.templateForm, min_vcpus: (e.target as HTMLInputElement).value };
                }}
              />
              ${this.templateFormErrors.min_vcpus ? html`<div class="error-text">${this.templateFormErrors.min_vcpus}</div>` : ''}
            </div>

            <div class="form-group">
              <label>Recommended vCPUs</label>
              <input
                type="number"
                min="1"
                .value=${this.templateForm.recommended_vcpus}
                @input=${(e: InputEvent) => {
                  this.templateForm = { ...this.templateForm, recommended_vcpus: (e.target as HTMLInputElement).value };
                }}
              />
              ${this.templateFormErrors.recommended_vcpus ? html`<div class="error-text">${this.templateFormErrors.recommended_vcpus}</div>` : ''}
            </div>

            <div class="form-group">
              <label>Min Disk (GB) *</label>
              <input
                type="number"
                min="1"
                .value=${this.templateForm.min_disk}
                @input=${(e: InputEvent) => {
                  this.templateForm = { ...this.templateForm, min_disk: (e.target as HTMLInputElement).value };
                }}
              />
              ${this.templateFormErrors.min_disk ? html`<div class="error-text">${this.templateFormErrors.min_disk}</div>` : ''}
            </div>

            <div class="form-group">
              <label>Recommended Disk (GB)</label>
              <input
                type="number"
                min="1"
                .value=${this.templateForm.recommended_disk}
                @input=${(e: InputEvent) => {
                  this.templateForm = { ...this.templateForm, recommended_disk: (e.target as HTMLInputElement).value };
                }}
              />
              ${this.templateFormErrors.recommended_disk ? html`<div class="error-text">${this.templateFormErrors.recommended_disk}</div>` : ''}
            </div>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label>Disk Format</label>
              <select
                .value=${this.templateForm.disk_format}
                @change=${(e: Event) => {
                  this.templateForm = { ...this.templateForm, disk_format: (e.target as HTMLSelectElement).value as ('' | VMTemplateDiskFormat) };
                }}
              >
                <option value="">Default</option>
                <option value="qcow2">qcow2</option>
                <option value="raw">raw</option>
                <option value="vmdk">vmdk</option>
                <option value="qed">qed</option>
                <option value="vdi">vdi</option>
              </select>
            </div>

            <div class="form-group">
              <label>Network Model</label>
              <select
                .value=${this.templateForm.network_model}
                @change=${(e: Event) => {
                  this.templateForm = { ...this.templateForm, network_model: (e.target as HTMLSelectElement).value as ('' | VMTemplateNetworkModel) };
                }}
              >
                <option value="">Default</option>
                <option value="virtio">virtio</option>
                <option value="e1000">e1000</option>
                <option value="rtl8139">rtl8139</option>
              </select>
            </div>

            <div class="form-group">
              <label>Graphics Type</label>
              <select
                .value=${this.templateForm.graphics_type}
                @change=${(e: Event) => {
                  this.templateForm = { ...this.templateForm, graphics_type: (e.target as HTMLSelectElement).value as ('' | VMTemplateGraphicsType) };
                }}
              >
                <option value="">Default</option>
                <option value="vnc">vnc</option>
                <option value="spice">spice</option>
                <option value="none">none</option>
                <option value="egl-headless">egl-headless</option>
              </select>
            </div>

            <div class="form-group">
              <label>Default User</label>
              <input
                type="text"
                .value=${this.templateForm.default_user}
                @input=${(e: InputEvent) => {
                  this.templateForm = { ...this.templateForm, default_user: (e.target as HTMLInputElement).value };
                }}
              />
            </div>
          </div>

          <div class="toggle-row">
            <label class="toggle">
              <input
                type="checkbox"
                .checked=${this.templateForm.cloud_init}
                @change=${(e: Event) => {
                  this.templateForm = { ...this.templateForm, cloud_init: (e.target as HTMLInputElement).checked };
                }}
              />
              Cloud-Init
            </label>
            <label class="toggle">
              <input
                type="checkbox"
                .checked=${this.templateForm.uefi_boot}
                @change=${(e: Event) => {
                  this.templateForm = { ...this.templateForm, uefi_boot: (e.target as HTMLInputElement).checked };
                }}
              />
              UEFI Boot
            </label>
            <label class="toggle">
              <input
                type="checkbox"
                .checked=${this.templateForm.secure_boot}
                @change=${(e: Event) => {
                  this.templateForm = { ...this.templateForm, secure_boot: (e.target as HTMLInputElement).checked };
                }}
              />
              Secure Boot
            </label>
            <label class="toggle">
              <input
                type="checkbox"
                .checked=${this.templateForm.tpm}
                @change=${(e: Event) => {
                  this.templateForm = { ...this.templateForm, tpm: (e.target as HTMLInputElement).checked };
                }}
              />
              TPM
            </label>
          </div>

          <div class="form-group">
            <label>Metadata (JSON)</label>
            <textarea
              .value=${this.templateForm.metadata_json}
              placeholder="{\n  \"key\": \"value\"\n}"
              @input=${(e: InputEvent) => {
                this.templateForm = { ...this.templateForm, metadata_json: (e.target as HTMLTextAreaElement).value };
              }}
            ></textarea>
            ${this.templateFormErrors.metadata_json ? html`<div class="error-text">${this.templateFormErrors.metadata_json}</div>` : ''}
            <div class="help-text">Must be a JSON object with scalar values (strings/numbers/booleans).</div>
          </div>
        </div>

        <div class="drawer-footer">
          <button class="btn btn-secondary" @click=${this.closeTemplateDrawer} ?disabled=${this.isSavingTemplate}>
            Cancel
          </button>
          <button
            class="btn btn-primary"
            @click=${this.saveTemplate}
            ?disabled=${this.isSavingTemplate}
          >
            ${this.isSavingTemplate ? 'Saving…' : (isEdit ? 'Save Changes' : 'Create Template')}
          </button>
        </div>
      </div>
    `;
  }


  private renderVirtualizationDisabledBanner(details?: string | null) {
    return html`
      <div class="virtualization-disabled-banner">
        <h2>Virtualization is disabled on this host</h2>
        <p>Virtualization features are currently unavailable because libvirt is not installed or not running.\
 To enable VM management, install and start libvirt on this machine, then reload this page.</p>
        ${details ? html`<p>${details}</p>` : ''}
      </div>
    `;
  }

  override render() {
    const virtualizationEnabled = this.virtualizationEnabledController.value;
    if (virtualizationEnabled === false) {
      const details = this.virtualizationDisabledMessageController.value;
      return html`
        <div class="container">
          ${this.renderVirtualizationDisabledBanner(details)}
        </div>
      `;
    }

    const vmItems = this.vmStoreController.value;
    // const templateItems = this.templateStoreController.value; // Unused - using this.templates instead
    const filteredVMs = this.filteredVMsController.value || [];

    // Calculate stats from VMs
    const allVMs: VirtualMachine[] = Array.isArray(vmItems) ? vmItems as VirtualMachine[] :
      vmItems instanceof Map ? [...vmItems.values()] as VirtualMachine[] :
        typeof vmItems === 'object' && vmItems ? Object.values(vmItems) as VirtualMachine[] : [];

    const stats = {
      totalVMs: allVMs.length,
      runningVMs: allVMs.filter(vm => vm.state === 'running').length,
      stoppedVMs: allVMs.filter(vm => vm.state === 'stopped').length,
      pausedVMs: allVMs.filter(vm => vm.state === 'paused').length,
      totalMemory: allVMs.reduce((sum, vm) => sum + (vm.memory || 0), 0),
      totalVCPUs: allVMs.reduce((sum, vm) => sum + (vm.vcpus || 0), 0),
      totalDiskSize: allVMs.reduce((sum, vm) => sum + (vm.disk_size || 0), 0)
    };

    // const activeTab = this.activeTabController.value; // Unused - using this.activeMainTab instead
    const searchQuery = this.searchQueryController.value;
    // const selectedVM = this.selectedVMController.value; // Unused variable
    // const wizardState = this.wizardStateController.value;

    // Get loading and error states
    const isLoading = this.activeMainTab === 'templates'
      ? templateStore.$loading.get()
      : vmStore.$loading.get();
    const error = this.activeMainTab === 'templates'
      ? templateStore.$error.get()
      : vmStore.$error.get();

    // Get filtered VMs based on state filter
    let displayVMs = filteredVMs;
    if (this.stateFilter !== 'all') {
      displayVMs = filteredVMs.filter(vm => vm.state === this.stateFilter);
    }
    // Transform data for table rendering
    const query = (searchQuery || '').toLowerCase().trim();

    const displayTemplates = query
      ? this.templates.filter(t => {
          const hay = `${t.name} ${t.description || ''} ${t.os_type} ${t.os_variant || ''}`.toLowerCase();
          return hay.includes(query);
        })
      : this.templates;

    const formatMinRec = (min: number, rec?: number) =>
      rec !== undefined && rec !== null ? `${min} / ${rec}` : `${min}`;

    const tableData = this.activeMainTab === 'templates'
      ? displayTemplates.map(template => ({
          ...template,
          os: template.os_variant ? `${template.os_type} / ${template.os_variant}` : template.os_type,
          memory: formatMinRec(template.min_memory, template.recommended_memory),
          vcpus: formatMinRec(template.min_vcpus, template.recommended_vcpus),
          disk: formatMinRec(template.min_disk, template.recommended_disk),
          flags: template,
          updated: new Date(template.updated_at || template.created_at).toLocaleDateString(),
        }))
      : displayVMs.map(vm => ({
          ...vm,
          state_rendered: this.renderStateCell(vm.state),
          memory_formatted: this.formatMemory(vm.memory),
          disk_formatted: this.formatDiskSize(vm.disk_size),
          created_formatted: new Date(vm.created_at).toLocaleDateString()
        }));

    return html`
      <div class="container">

        <!-- Stats Bar -->
        <div class="stats-bar">
          <div class="stat-widget">
            <div class="stat-widget-header">
              <span class="stat-icon total">🖥️</span>
              <span class="stat-label">Total VMs</span>
            </div>
            <div class="stat-value">${stats.totalVMs}</div>
            <div class="stat-subtitle">virtual machines</div>
          </div>
          
          <div class="stat-widget">
            <div class="stat-widget-header">
              <span class="stat-icon running">▶️</span>
              <span class="stat-label">Running</span>
            </div>
            <div class="stat-value running">${stats.runningVMs}</div>
            <div class="stat-subtitle">${Math.round((stats.runningVMs / stats.totalVMs) * 100) || 0}% active</div>
          </div>
          
          <div class="stat-widget">
            <div class="stat-widget-header">
              <span class="stat-icon stopped">⏹️</span>
              <span class="stat-label">Stopped</span>
            </div>
            <div class="stat-value stopped">${stats.stoppedVMs}</div>
            <div class="stat-subtitle">${Math.round((stats.stoppedVMs / stats.totalVMs) * 100) || 0}% inactive</div>
          </div>
          
          <div class="stat-widget">
            <div class="stat-widget-header">
              <span class="stat-icon memory">🧠</span>
              <span class="stat-label">Total Memory</span>
            </div>
            <div class="stat-value">${this.formatMemory(stats.totalMemory)}</div>
            <div class="stat-subtitle">allocated RAM</div>
          </div>
          
          <div class="stat-widget">
            <div class="stat-widget-header">
              <span class="stat-icon cpu">⚡</span>
              <span class="stat-label">Total vCPUs</span>
            </div>
            <div class="stat-value">${stats.totalVCPUs}</div>
            <div class="stat-subtitle">processing cores</div>
          </div>
          
          <div class="stat-widget">
            <div class="stat-widget-header">
              <span class="stat-icon storage">💾</span>
              <span class="stat-label">Total Storage</span>
            </div>
            <div class="stat-value">${this.formatDiskSize(stats.totalDiskSize)}</div>
            <div class="stat-subtitle">disk space</div>
          </div>
        </div>

        <!-- Tabs -->
        <tab-group
          .tabs=${this.tabs}
          .activeTab=${this.activeMainTab}
          @tab-change=${this.handleTabChange}
        ></tab-group>

        <!-- Controls -->
        <div class="controls">
          <div class="filters-section">
            ${this.activeMainTab === 'vms' ? html`
              <filter-dropdown
                .options=${[
          { value: 'all', label: 'All States' },
          { value: 'running', label: 'Running' },
          { value: 'stopped', label: 'Stopped' },
          { value: 'paused', label: 'Paused' },
          { value: 'suspended', label: 'Suspended' }
        ]}
                .selectedValue=${this.stateFilter}
                .label=${'Filter by State'}
                .showStatusIndicators=${true}
                @filter-change=${this.handleStateFilterChange}
              ></filter-dropdown>
            ` : ''}
            <search-input
              .placeholder=${this.activeMainTab === 'vms' ? 'Search virtual machines...' : 'Search templates...'}
              .value=${searchQuery}
              @search-change=${this.handleSearchChange}
            ></search-input>
          </div>
          <div class="actions-section">
            <button class="btn-refresh" @click=${this.handleRefresh} title="Refresh">
              🔄
            </button>
            <button class="btn-create" @click=${this.handleCreateNew}>
              <span>+ New ${this.activeMainTab === 'templates' ? 'Template' : 'VM'}</span>
            </button>
          </div>
        </div>

        <!-- Content -->
        <div class="content">
          ${isLoading ? html`
            <loading-state message="Loading ${this.activeMainTab === 'templates' ? 'templates' : 'virtual machines'}..."></loading-state>
          ` : error ? html`
            <empty-state
              icon="❌"
              title="Error loading ${this.activeMainTab === 'templates' ? 'templates' : 'virtual machines'}"
              description=${error.message}
            ></empty-state>
          ` : tableData.length === 0 ? html`
            <empty-state
              icon="🖥️"
              title="No ${this.activeMainTab === 'templates' ? 'templates' : 'virtual machines'} found"
              description=${searchQuery
          ? `No ${this.activeMainTab === 'templates' ? 'templates' : 'VMs'} match your search criteria`
          : this.activeMainTab === 'templates'
            ? "No templates available"
            : "Create your first virtual machine to get started"}
            ></empty-state>
          ` : html`
            <resource-table
              .columns=${this.getColumns()}
              .data=${tableData}
              .getActions=${(item: any) =>
                this.activeMainTab === 'templates'
                  ? this.getTemplateActions(item as VMTemplate)
                  : this.getActions(item as VirtualMachine)
              }
              .customRenderers=${this.activeMainTab === 'templates'
                ? { flags: (tpl: any) => this.renderTemplateFlags(tpl as VMTemplate) }
                : {}}
              @cell-click=${this.handleCellClick}
              @action=${this.handleAction}
            ></resource-table>
          `}
        </div>

        <!-- VM Details Drawer -->
        <vm-detail-drawer
          ?show=${this.showDetailsDrawer}
          .vm=${this.selectedVMForDetails}
          @close=${() => {
        this.showDetailsDrawer = false;
        this.selectedVMForDetails = null;
      }}
          @power-action=${this.handleVMPowerAction}
          @console-connect=${this.handleVMConsoleConnect}
          @vm-cloned=${this.handleVMCloned}
        ></vm-detail-drawer>

        <!-- Delete Confirmation Modal -->
        <delete-modal
          .show=${this.showDeleteModal}
          .item=${this.vmToDelete ? {
        name: this.vmToDelete.name,
        type: 'Virtual Machine'
      } : null}
          .loading=${this.isDeleting}
          @confirm-delete=${this.handleDelete}
          @cancel-delete=${() => {
        this.showDeleteModal = false;
        this.vmToDelete = null;
        this.requestUpdate();
      }}
        ></delete-modal>

        <!-- Template Delete Confirmation Modal -->
        <delete-modal
          .show=${this.showTemplateDeleteModal}
          .item=${this.templateToDelete ? {
        name: this.templateToDelete.name,
        type: 'Template'
      } : null}
          .loading=${this.isDeletingTemplate}
          @confirm-delete=${this.handleDeleteTemplate}
          @cancel-delete=${() => {
        this.showTemplateDeleteModal = false;
        this.templateToDelete = null;
        this.requestUpdate();
      }}
        ></delete-modal>

        ${this.renderTemplateDrawer()}
        ${this.renderCreateTemplateFromVmModal()}

        <!-- VM Creation Wizard -->
        ${this.useEnhancedWizard ? html`
          <create-vm-wizard-enhanced @vm-created=${this.handleWizardVmCreated}></create-vm-wizard-enhanced>
        ` : html`
          <create-vm-wizard></create-vm-wizard>
        `}

        <!-- Notification Container -->
        <notification-container></notification-container>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'virtualization-vms-enhanced': VirtualizationVMsEnhanced;
  }
}
