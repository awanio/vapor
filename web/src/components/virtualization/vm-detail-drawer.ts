/**
 * VM Detail Drawer Component
 * Displays comprehensive information about a virtual machine in a right-side drawer
 */

import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { VirtualMachine } from '../../types/virtualization';
import { getApiUrl } from '../../config';

interface VMMetrics {
  cpu_usage: number;
  memory_usage: number;
  disk_read: number;
  disk_write: number;
  network_rx: number;
  network_tx: number;
  uptime: number;
}

interface VMEnhancedDetails {
  uuid: string;
  name: string;
  state: string;
  memory: number;
  max_memory: number;
  vcpus: number;
  max_vcpus: number;
  os: {
    type: string;
    architecture: string;
    machine: string;
    boot?: string[] | null;
  };
  disks?: Array<{
    device: string;
    type: string;
    driver: string;
    source: {
      file?: string;
      dev?: string;
      pool?: string;
      volume?: string;
    };
    target: {
      dev: string;
      bus: string;
    };
    readonly: boolean;
    size?: number;
  }> | null;
  networks?: Array<{
    type: string;
    mac: string;
    source: {
      network?: string;
      bridge?: string;
      dev?: string;
    };
    model: {
      type: string;
    };
    target?: {
      dev: string;
    };
    alias?: string;
    ip?: string;
  }> | null;
  graphics?: Array<{
    type: string;
    port: number;
    listen: string;
    password?: string;
  }>;
  created_at: string;
  updated_at: string;
  autostart: boolean;
  persistent: boolean;
  metadata?: Record<string, any>;
}

interface DiskInfo {
  name: string;
  path: string;
  size: number;
  used: number;
  format: string;
  bus: string;
  readonly: boolean;
}

interface NetworkInterfaceInfo {
  name: string;
  type: string;
  source: string;
  model: string;
  mac: string;
  ip?: string;
  state: 'up' | 'down';
  rx_bytes: number;
  tx_bytes: number;
}

@customElement('vm-detail-drawer')
export class VMDetailDrawer extends LitElement {
  @property({ type: Boolean, reflect: true }) show = false;
  @property({ type: Object }) vm: VirtualMachine | null = null;
  
  @state() private activeTab = 'overview';
  @state() private isLoading = false;
  @state() private metrics: VMMetrics | null = null;
  @state() private disks: DiskInfo[] = [];
  @state() private networkInterfaces: NetworkInterfaceInfo[] = [];
  @state() private vmDetails: VMEnhancedDetails | null = null;
  @state() private error: string | null = null;

  static override styles = css`
    :host {
      display: block;
      position: fixed;
      top: 0;
      right: 0;
      width: 60%;
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
        width: 80%;
      }
    }

    @media (max-width: 768px) {
      :host {
        width: 100%;
      }
    }

    .drawer-header {
      padding: 20px 24px;
      background: var(--vscode-editor-inactiveSelectionBackground, #252526);
      border-bottom: 1px solid var(--vscode-widget-border, #454545);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: 16px;
      flex: 1;
    }

    .vm-icon {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--vscode-button-secondaryBackground, #3c3c3c);
      border-radius: 8px;
      font-size: 20px;
    }

    .vm-info {
      flex: 1;
    }

    .vm-name {
      font-size: 18px;
      font-weight: 500;
      color: var(--vscode-foreground, #cccccc);
      margin: 0 0 4px 0;
    }

    .vm-meta {
      display: flex;
      gap: 16px;
      font-size: 12px;
      color: var(--vscode-descriptionForeground, #8b8b8b);
    }

    .close-btn {
      background: transparent;
      border: none;
      color: var(--vscode-foreground, #cccccc);
      cursor: pointer;
      padding: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: all 0.2s;
    }

    .close-btn:hover {
      background: var(--vscode-toolbar-hoverBackground, rgba(90, 93, 94, 0.31));
      color: var(--vscode-icon-foreground, #c5c5c5);
    }

    /* Power State Badge */
    .power-state {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }

    .power-state.running {
      background: var(--vscode-charts-green, #89d185);
      color: var(--vscode-editor-background, #1e1e1e);
    }

    .power-state.stopped {
      background: var(--vscode-charts-red, #f48771);
      color: var(--vscode-editor-background, #1e1e1e);
    }

    .power-state.paused {
      background: var(--vscode-charts-yellow, #cca700);
      color: var(--vscode-editor-background, #1e1e1e);
    }

    .power-state.suspended {
      background: var(--vscode-charts-orange, #ce9178);
      color: var(--vscode-editor-background, #1e1e1e);
    }

    .power-state-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
      animation: pulse 2s infinite;
    }

    .power-state.running .power-state-indicator {
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }

    /* Tabs */
    .tabs {
      display: flex;
      gap: 0;
      padding: 0 24px;
      background: var(--vscode-editor-background, #1e1e1e);
      border-bottom: 1px solid var(--vscode-widget-border, #454545);
      flex-shrink: 0;
    }

    .tab {
      padding: 12px 20px;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: var(--vscode-foreground, #cccccc);
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s;
      position: relative;
    }

    .tab:hover {
      background: var(--vscode-toolbar-hoverBackground, rgba(90, 93, 94, 0.1));
    }

    .tab.active {
      color: var(--vscode-textLink-foreground, #3794ff);
      border-bottom-color: var(--vscode-focusBorder, #007acc);
    }

    /* Content Area */
    .drawer-content {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }

    /* Quick Actions Bar */
    .quick-actions {
      padding: 16px 24px;
      background: var(--vscode-editor-inactiveSelectionBackground, #252526);
      border-bottom: 1px solid var(--vscode-widget-border, #454545);
      display: flex;
      gap: 12px;
      flex-shrink: 0;
    }

    .action-btn {
      padding: 8px 16px;
      background: var(--vscode-button-secondaryBackground, #3c3c3c);
      color: var(--vscode-button-secondaryForeground, #cccccc);
      border: 1px solid var(--vscode-button-border, #5a5a5a);
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .action-btn:hover:not(:disabled) {
      background: var(--vscode-button-secondaryHoverBackground, #45494e);
    }

    .action-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .action-btn.primary {
      background: var(--vscode-button-background, #0e639c);
      color: var(--vscode-button-foreground, #ffffff);
      border-color: var(--vscode-button-background, #0e639c);
    }

    .action-btn.primary:hover:not(:disabled) {
      background: var(--vscode-button-hoverBackground, #1177bb);
      border-color: var(--vscode-button-hoverBackground, #1177bb);
    }

    .action-btn.danger {
      background: var(--vscode-inputValidation-errorBackground, #5a1d1d);
      color: var(--vscode-inputValidation-errorForeground, #f48771);
      border-color: var(--vscode-inputValidation-errorBorder, #be1100);
    }

    .action-btn.danger:hover:not(:disabled) {
      background: var(--vscode-inputValidation-errorBorder, #be1100);
    }

    /* Sections */
    .section {
      margin-bottom: 32px;
    }

    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--vscode-foreground, #cccccc);
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--vscode-widget-border, #454545);
    }

    /* Info Grid */
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .info-label {
      font-size: 12px;
      color: var(--vscode-descriptionForeground, #8b8b8b);
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .info-value {
      font-size: 14px;
      color: var(--vscode-foreground, #cccccc);
      font-weight: 400;
    }

    .info-value.monospace {
      font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
      font-size: 13px;
    }

    /* Metrics Cards */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .metric-card {
      background: var(--vscode-editor-inactiveSelectionBackground, #252526);
      border: 1px solid var(--vscode-widget-border, #454545);
      border-radius: 6px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .metric-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .metric-title {
      font-size: 12px;
      color: var(--vscode-descriptionForeground, #8b8b8b);
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .metric-icon {
      font-size: 16px;
      opacity: 0.6;
    }

    .metric-value {
      font-size: 24px;
      font-weight: 600;
      color: var(--vscode-foreground, #cccccc);
    }

    .metric-unit {
      font-size: 14px;
      font-weight: 400;
      color: var(--vscode-descriptionForeground, #8b8b8b);
      margin-left: 4px;
    }

    .metric-change {
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .metric-change.positive {
      color: var(--vscode-charts-green, #89d185);
    }

    .metric-change.negative {
      color: var(--vscode-charts-red, #f48771);
    }

    /* Progress Bars */
    .progress-bar {
      width: 100%;
      height: 8px;
      background: var(--vscode-progressBar-background, #1e1e1e);
      border-radius: 4px;
      overflow: hidden;
      margin-top: 8px;
    }

    .progress-fill {
      height: 100%;
      background: var(--vscode-progressBar-foreground, #0e639c);
      transition: width 0.3s ease;
      border-radius: 4px;
    }

    .progress-fill.high {
      background: var(--vscode-charts-red, #f48771);
    }

    .progress-fill.medium {
      background: var(--vscode-charts-yellow, #cca700);
    }

    .progress-fill.low {
      background: var(--vscode-charts-green, #89d185);
    }

    /* Tables */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    .data-table th {
      text-align: left;
      padding: 8px 12px;
      background: var(--vscode-editor-inactiveSelectionBackground, #252526);
      color: var(--vscode-foreground, #cccccc);
      font-weight: 600;
      border-bottom: 1px solid var(--vscode-widget-border, #454545);
    }

    .data-table td {
      padding: 10px 12px;
      color: var(--vscode-foreground, #cccccc);
      border-bottom: 1px solid var(--vscode-widget-border, #454545);
    }

    .data-table tr:hover {
      background: var(--vscode-list-hoverBackground, rgba(90, 93, 94, 0.1));
    }

    /* Badges */
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: 500;
      background: var(--vscode-badge-background, #4d4d4d);
      color: var(--vscode-badge-foreground, #ffffff);
    }

    .badge.success {
      background: var(--vscode-charts-green, #89d185);
      color: var(--vscode-editor-background, #1e1e1e);
    }

    .badge.warning {
      background: var(--vscode-charts-yellow, #cca700);
      color: var(--vscode-editor-background, #1e1e1e);
    }

    .badge.error {
      background: var(--vscode-charts-red, #f48771);
      color: var(--vscode-editor-background, #1e1e1e);
    }

    /* Loading State */
    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
      color: var(--vscode-descriptionForeground, #8b8b8b);
    }

    .spinner {
      width: 24px;
      height: 24px;
      border: 2px solid var(--vscode-widget-border, #454545);
      border-top-color: var(--vscode-focusBorder, #007acc);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-right: 12px;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    /* Empty State */
    .empty-state {
      padding: 60px 20px;
      text-align: center;
      color: var(--vscode-descriptionForeground, #8b8b8b);
    }

    .empty-state-icon {
      font-size: 48px;
      opacity: 0.5;
      margin-bottom: 16px;
    }

    .empty-state-message {
      font-size: 14px;
    }

    /* Console Preview */
    .console-preview {
      background: #000;
      border: 1px solid var(--vscode-widget-border, #454545);
      border-radius: 4px;
      padding: 16px;
      min-height: 200px;
      font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
      font-size: 12px;
      color: #00ff00;
      position: relative;
    }

    .console-connect-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      padding: 4px 12px;
      background: var(--vscode-button-background, #0e639c);
      color: var(--vscode-button-foreground, #ffffff);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }

    .console-connect-btn:hover {
      background: var(--vscode-button-hoverBackground, #1177bb);
    }
  `;

  override connectedCallback() {
    super.connectedCallback();
    if (this.vm) {
      this.loadVMDetails();
    }
  }

  override updated(changedProperties: Map<string, any>) {
    if (changedProperties.has('vm') && this.vm) {
      this.loadVMDetails();
    }
  }

  private async loadVMDetails() {
    if (!this.vm) return;
    
    this.isLoading = true;
    this.error = null;
    
    try {
      // Fetch enhanced VM details from the API
      const response = await this.fetchVMEnhancedDetails(this.vm.id);
      
      if (response) {
        this.vmDetails = response;
        
        // Process disks information
        if (response.disks && response.disks.length > 0) {
          this.disks = response.disks.map((disk, index) => ({
            name: disk.target.dev || `disk${index}`,
            path: disk.source.file || disk.source.dev || 'Unknown',
            size: disk.size || 0,
            used: 0, // This would need to come from monitoring
            format: disk.driver || 'raw',
            bus: disk.target.bus || 'virtio',
            readonly: disk.readonly || false,
          }));
        } else {
          this.disks = [];
        }
        
        // Process network interfaces
        if (response.networks && response.networks.length > 0) {
          this.networkInterfaces = response.networks.map((net, index) => ({
            name: net.target?.dev || net.alias || `eth${index}`,
            type: net.type,
            source: net.source.network || net.source.bridge || net.source.dev || 'Unknown',
            model: net.model.type || 'virtio',
            mac: net.mac,
            ip: net.ip,
            state: 'up' as 'up' | 'down', // Would need actual state from monitoring
            rx_bytes: 0, // Would need actual metrics
            tx_bytes: 0, // Would need actual metrics
          }));
        } else {
          this.networkInterfaces = [];
        }
        
        // Simulate metrics for now (replace with real metrics API later)
        this.metrics = {
          cpu_usage: Math.random() * 100,
          memory_usage: Math.random() * 100,
          disk_read: Math.random() * 1000000,
          disk_write: Math.random() * 1000000,
          network_rx: Math.random() * 10000000,
          network_tx: Math.random() * 10000000,
          uptime: Math.floor(Math.random() * 864000),
        };
      }
    } catch (error) {
      console.error('Failed to load VM details:', error);
      this.error = error instanceof Error ? error.message : 'Failed to load VM details';
    } finally {
      this.isLoading = false;
    }
  }

  private async fetchVMEnhancedDetails(vmId: string): Promise<VMEnhancedDetails | null> {
    try {
      // Get token from session storage
      const token = sessionStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const apiUrl = getApiUrl(`/virtualization/computes/${vmId}/enhanced`);
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch VM details: ${response.statusText}`);
      }

      const data = await response.json();
      
      // The API returns a wrapper with data.vms array, but for single VM it should be different
      // Assuming the enhanced endpoint returns a single VM in data
      if (data.status === 'success' && data.data) {
        // If it's wrapped in a vms array, take the first one
        if (data.data.vms && Array.isArray(data.data.vms) && data.data.vms.length > 0) {
          return data.data.vms[0];
        }
        // Or if it's directly in data
        if (data.data.uuid) {
          return data.data;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching VM enhanced details:', error);
      throw error;
    }
  }

  private handleClose() {
    this.show = false;
    this.dispatchEvent(new CustomEvent('close'));
  }

  private handlePowerAction(action: string) {
    this.dispatchEvent(new CustomEvent('power-action', {
      detail: { action, vm: this.vm }
    }));
  }

  private handleConsoleConnect() {
    this.dispatchEvent(new CustomEvent('console-connect', {
      detail: { vm: this.vm }
    }));
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  }

  private formatMemory(kb: number): string {
    // Memory comes in KB from the API
    if (kb >= 1024 * 1024) {
      return `${(kb / (1024 * 1024)).toFixed(1)} GB`;
    } else if (kb >= 1024) {
      return `${(kb / 1024).toFixed(0)} MB`;
    }
    return `${kb} KB`;
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  private getProgressClass(value: number): string {
    if (value > 80) return 'high';
    if (value > 50) return 'medium';
    return 'low';
  }

  private renderOverviewTab() {
    if (!this.vm) return html``;
    
    // Use enhanced details if available, fallback to basic VM data
    const details = this.vmDetails || this.vm;
    const osInfo = this.vmDetails?.os || {};

    return html`
      <div class="section">
        <h3 class="section-title">System Information</h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">VM UUID</span>
            <span class="info-value monospace">${this.vmDetails?.uuid || this.vm.id}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Name</span>
            <span class="info-value">${details.name}</span>
          </div>
          <div class="info-item">
            <span class="info-label">State</span>
            <span class="info-value">${this.vmDetails?.state || this.vm.state}</span>
          </div>
          <div class="info-item">
            <span class="info-label">OS Type</span>
            <span class="info-value">${osInfo.type || this.vm.os_type || 'hvm'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Architecture</span>
            <span class="info-value">${osInfo.architecture || this.vm.metadata?.architecture || 'x86_64'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Machine Type</span>
            <span class="info-value">${osInfo.machine || 'Default'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Persistent</span>
            <span class="info-value">${this.vmDetails?.persistent ? 'Yes' : 'No'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Autostart</span>
            <span class="info-value">${this.vmDetails?.autostart ? 'Enabled' : 'Disabled'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Created</span>
            <span class="info-value">${new Date(this.vmDetails?.created_at || this.vm.created_at || Date.now()).toLocaleString()}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Last Updated</span>
            <span class="info-value">${new Date(this.vmDetails?.updated_at || this.vm.updated_at || Date.now()).toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <h3 class="section-title">Resource Allocation</h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Current Memory</span>
            <span class="info-value">${this.formatMemory(this.vmDetails?.memory || this.vm.memory)}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Max Memory</span>
            <span class="info-value">${this.formatMemory(this.vmDetails?.max_memory || this.vm.memory)}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Current vCPUs</span>
            <span class="info-value">${this.vmDetails?.vcpus || this.vm.vcpus} cores</span>
          </div>
          <div class="info-item">
            <span class="info-label">Max vCPUs</span>
            <span class="info-value">${(this.vmDetails?.max_vcpus || 0) > 0 ? this.vmDetails?.max_vcpus : this.vmDetails?.vcpus || this.vm.vcpus} cores</span>
          </div>
          ${this.vm.disk_size ? html`
            <div class="info-item">
              <span class="info-label">Total Disk Size</span>
              <span class="info-value">${this.formatBytes(this.vm.disk_size * 1024 * 1024 * 1024)}</span>
            </div>
          ` : ''}
        </div>
      </div>

      ${this.vm.graphics ? html`
        <div class="section">
          <h3 class="section-title">Graphics Configuration</h3>
          <div class="info-grid">
            ${this.vm.graphics.map(g => html`
              <div class="info-item">
                <span class="info-label">Type</span>
                <span class="info-value">${g.type?.toUpperCase()}</span>
              </div>
              ${g.port ? html`
                <div class="info-item">
                  <span class="info-label">Port</span>
                  <span class="info-value">${g.port}</span>
                </div>
              ` : ''}
              ${g.listen ? html`
                <div class="info-item">
                  <span class="info-label">Listen Address</span>
                  <span class="info-value monospace">${g.listen}</span>
                </div>
              ` : ''}
            `)}
          </div>
        </div>
      ` : ''}
    `;
  }

  private renderMetricsTab() {
    if (!this.metrics) {
      return html`
        <div class="loading">
          <div class="spinner"></div>
          Loading metrics...
        </div>
      `;
    }

    return html`
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-title">CPU Usage</span>
            <span class="metric-icon">💻</span>
          </div>
          <div>
            <span class="metric-value">${this.metrics.cpu_usage.toFixed(1)}</span>
            <span class="metric-unit">%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill ${this.getProgressClass(this.metrics.cpu_usage)}" 
                 style="width: ${this.metrics.cpu_usage}%"></div>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-title">Memory Usage</span>
            <span class="metric-icon">🧠</span>
          </div>
          <div>
            <span class="metric-value">${this.metrics.memory_usage.toFixed(1)}</span>
            <span class="metric-unit">%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill ${this.getProgressClass(this.metrics.memory_usage)}" 
                 style="width: ${this.metrics.memory_usage}%"></div>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-title">Disk I/O Read</span>
            <span class="metric-icon">📖</span>
          </div>
          <div>
            <span class="metric-value">${(this.metrics.disk_read / 1000000).toFixed(1)}</span>
            <span class="metric-unit">MB/s</span>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-title">Disk I/O Write</span>
            <span class="metric-icon">✍️</span>
          </div>
          <div>
            <span class="metric-value">${(this.metrics.disk_write / 1000000).toFixed(1)}</span>
            <span class="metric-unit">MB/s</span>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-title">Network RX</span>
            <span class="metric-icon">📥</span>
          </div>
          <div>
            <span class="metric-value">${(this.metrics.network_rx / 1000000).toFixed(1)}</span>
            <span class="metric-unit">Mbps</span>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-title">Network TX</span>
            <span class="metric-icon">📤</span>
          </div>
          <div>
            <span class="metric-value">${(this.metrics.network_tx / 1000000).toFixed(1)}</span>
            <span class="metric-unit">Mbps</span>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-title">Uptime</span>
            <span class="metric-icon">⏱️</span>
          </div>
          <div>
            <span class="metric-value">${this.formatUptime(this.metrics.uptime)}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <h3 class="section-title">Performance History</h3>
        <div class="empty-state">
          <div class="empty-state-icon">📊</div>
          <div class="empty-state-message">Performance graphs will be available in a future update</div>
        </div>
      </div>
    `;
  }

  private renderStorageTab() {
    return html`
      <div class="section">
        <h3 class="section-title">Storage Devices</h3>
        <table class="data-table">
          <thead>
            <tr>
              <th>Device</th>
              <th>Path</th>
              <th>Format</th>
              <th>Bus</th>
              <th>Size</th>
              <th>Used</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${this.disks.map(disk => html`
              <tr>
                <td><span class="monospace">${disk.name}</span></td>
                <td><span class="monospace">${disk.path}</span></td>
                <td>${disk.format.toUpperCase()}</td>
                <td>${disk.bus.toUpperCase()}</td>
                <td>${this.formatBytes(disk.size)}</td>
                <td>${this.formatBytes(disk.used)} (${((disk.used / disk.size) * 100).toFixed(1)}%)</td>
                <td>
                  <span class="badge ${disk.readonly ? 'warning' : 'success'}">
                    ${disk.readonly ? 'Read-Only' : 'Read/Write'}
                  </span>
                </td>
              </tr>
            `)}
          </tbody>
        </table>
      </div>

      ${this.vm?.disks ? html`
        <div class="section">
          <h3 class="section-title">Disk Configuration</h3>
          <div class="info-grid">
            ${this.vm.disks.map((disk: any) => html`
              <div class="info-item">
                <span class="info-label">Target: ${disk.target}</span>
                <span class="info-value monospace">${disk.source?.file || disk.source?.dev || 'N/A'}</span>
              </div>
            `)}
          </div>
        </div>
      ` : ''}
    `;
  }

  private renderNetworkTab() {
    return html`
      <div class="section">
        <h3 class="section-title">Network Interfaces</h3>
        <table class="data-table">
          <thead>
            <tr>
              <th>Interface</th>
              <th>Type</th>
              <th>Source</th>
              <th>Model</th>
              <th>MAC Address</th>
              <th>IP Address</th>
              <th>State</th>
              <th>Traffic</th>
            </tr>
          </thead>
          <tbody>
            ${this.networkInterfaces.map(iface => html`
              <tr>
                <td><span class="monospace">${iface.name}</span></td>
                <td>${iface.type}</td>
                <td>${iface.source}</td>
                <td>${iface.model.toUpperCase()}</td>
                <td><span class="monospace">${iface.mac}</span></td>
                <td><span class="monospace">${iface.ip || 'N/A'}</span></td>
                <td>
                  <span class="badge ${iface.state === 'up' ? 'success' : 'error'}">
                    ${iface.state.toUpperCase()}
                  </span>
                </td>
                <td>
                  ↓ ${this.formatBytes(iface.rx_bytes)} / ↑ ${this.formatBytes(iface.tx_bytes)}
                </td>
              </tr>
            `)}
          </tbody>
        </table>
      </div>

      ${this.vm?.network_interfaces ? html`
        <div class="section">
          <h3 class="section-title">Network Configuration</h3>
          <div class="info-grid">
            ${this.vm.network_interfaces.map((net: any) => html`
              <div class="info-item">
                <span class="info-label">Type: ${net.type}</span>
                <span class="info-value">${net.source?.network || net.source?.bridge || 'N/A'}</span>
              </div>
            `)}
          </div>
        </div>
      ` : ''}
    `;
  }

  private renderConsoleTab() {
    return html`
      <div class="section">
        <h3 class="section-title">Console Preview</h3>
        <div class="console-preview">
          <button class="console-connect-btn" @click=${this.handleConsoleConnect}>
            Open Full Console
          </button>
          <div>
            ${this.vm?.state === 'running' ? html`
              <div>Last login: ${new Date().toLocaleString()}</div>
              <div>Welcome to ${this.vm.name}</div>
              <div>[root@${this.vm.name} ~]# _</div>
            ` : html`
              <div style="color: #888;">Console is not available. VM is ${this.vm?.state}.</div>
            `}
          </div>
        </div>
      </div>

      <div class="section">
        <h3 class="section-title">Console Settings</h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Console Type</span>
            <span class="info-value">${this.vm?.graphics?.[0]?.type?.toUpperCase() || 'VNC'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Port</span>
            <span class="info-value">${this.vm?.graphics?.[0]?.port || 'Auto'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Listen Address</span>
            <span class="info-value monospace">${this.vm?.graphics?.[0]?.listen || '0.0.0.0'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Password Protected</span>
            <span class="info-value">${this.vm?.graphics?.[0]?.password ? 'Yes' : 'No'}</span>
          </div>
        </div>
      </div>
    `;
  }

  private renderSnapshotsTab() {
    return html`
      <div class="section">
        <h3 class="section-title">Snapshots</h3>
        <div class="empty-state">
          <div class="empty-state-icon">📸</div>
          <div class="empty-state-message">No snapshots available</div>
        </div>
      </div>
    `;
  }

  override render() {
    if (!this.vm) return html``;

    const powerStateClass = this.vm.state.toLowerCase();
    const powerStateText = this.vm.state.charAt(0).toUpperCase() + this.vm.state.slice(1);

    return html`
      <div class="drawer">
        <div class="drawer-header">
          <div class="header-content">
            <div class="vm-icon">🖥️</div>
            <div class="vm-info">
              <h2 class="vm-name">${this.vm.name}</h2>
              <div class="vm-meta">
                <span class="power-state ${powerStateClass}">
                  <span class="power-state-indicator"></span>
                  ${powerStateText}
                </span>
                <span>${this.vm.memory} MB RAM</span>
                <span>${this.vm.vcpus} vCPUs</span>
                <span>${this.vm.os_type}</span>
              </div>
            </div>
          </div>
          <button class="close-btn" @click=${this.handleClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
        </div>

        <div class="quick-actions">
          ${this.vm.state === 'running' ? html`
            <button class="action-btn" @click=${() => this.handlePowerAction('stop')}>
              ⏹️ Stop
            </button>
            <button class="action-btn" @click=${() => this.handlePowerAction('restart')}>
              🔄 Restart
            </button>
            <button class="action-btn" @click=${() => this.handlePowerAction('pause')}>
              ⏸️ Pause
            </button>
          ` : this.vm.state === 'paused' ? html`
            <button class="action-btn primary" @click=${() => this.handlePowerAction('resume')}>
              ▶️ Resume
            </button>
          ` : html`
            <button class="action-btn primary" @click=${() => this.handlePowerAction('start')}>
              ▶️ Start
            </button>
          `}
          <button class="action-btn" @click=${this.handleConsoleConnect}>
            💻 Console
          </button>
          <button class="action-btn" @click=${() => this.handlePowerAction('clone')}>
            📋 Clone
          </button>
          <button class="action-btn" @click=${() => this.handlePowerAction('snapshot')}>
            📸 Snapshot
          </button>
          <button class="action-btn danger" @click=${() => this.handlePowerAction('delete')}>
            🗑️ Delete
          </button>
        </div>

        <div class="tabs">
          <button class="tab ${this.activeTab === 'overview' ? 'active' : ''}" 
                  @click=${() => this.activeTab = 'overview'}>
            Overview
          </button>
          <button class="tab ${this.activeTab === 'metrics' ? 'active' : ''}" 
                  @click=${() => this.activeTab = 'metrics'}>
            Metrics
          </button>
          <button class="tab ${this.activeTab === 'storage' ? 'active' : ''}" 
                  @click=${() => this.activeTab = 'storage'}>
            Storage
          </button>
          <button class="tab ${this.activeTab === 'network' ? 'active' : ''}" 
                  @click=${() => this.activeTab = 'network'}>
            Network
          </button>
          <button class="tab ${this.activeTab === 'console' ? 'active' : ''}" 
                  @click=${() => this.activeTab = 'console'}>
            Console
          </button>
          <button class="tab ${this.activeTab === 'snapshots' ? 'active' : ''}" 
                  @click=${() => this.activeTab = 'snapshots'}>
            Snapshots
          </button>
        </div>

        <div class="drawer-content">
          ${this.isLoading ? html`
            <div class="loading">
              <div class="spinner"></div>
              Loading VM details...
            </div>
          ` : html`
            ${this.activeTab === 'overview' ? this.renderOverviewTab() :
              this.activeTab === 'metrics' ? this.renderMetricsTab() :
              this.activeTab === 'storage' ? this.renderStorageTab() :
              this.activeTab === 'network' ? this.renderNetworkTab() :
              this.activeTab === 'console' ? this.renderConsoleTab() :
              this.activeTab === 'snapshots' ? this.renderSnapshotsTab() :
              html``}
          `}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'vm-detail-drawer': VMDetailDrawer;
  }
}
