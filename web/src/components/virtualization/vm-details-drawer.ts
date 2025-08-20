/**
 * VM Details Drawer Component
 * Displays comprehensive VM information in a right drawer
 */

import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StoreController } from '@nanostores/lit';
import '../drawers/detail-drawer.js';
import './vm-actions.js';
import '../ui/status-badge.js';
import '../ui/loading-state.js';

import { vmActions, $selectedVM } from '../../stores/virtualization';
import type { 
  VirtualMachine, 
  VMSnapshot, 
  VMBackup,
  VMMetrics 
} from '../../types/virtualization';
import { virtualizationAPI } from '../../services/virtualization-api';

@customElement('vm-details-drawer')
export class VMDetailsDrawer extends LitElement {
  @property({ type: Boolean }) open = false;
  @property({ type: Object }) vm: VirtualMachine | null = null;
  
  private selectedVMController = new StoreController(this, $selectedVM);
  
  @state() private activeTab = 'overview';
  @state() private snapshots: VMSnapshot[] = [];
  @state() private backups: VMBackup[] = [];
  @state() private metrics: VMMetrics[] = [];
  @state() private isLoadingSnapshots = false;
  @state() private isLoadingBackups = false;
  @state() private isLoadingMetrics = false;

  static override styles = css`
    :host {
      display: block;
    }

    .details-container {
      padding: 20px;
      height: 100%;
      overflow-y: auto;
    }

    .tabs {
      display: flex;
      gap: 16px;
      border-bottom: 1px solid var(--vscode-editorWidget-border);
      margin-bottom: 20px;
      padding-bottom: 8px;
    }

    .tab {
      padding: 8px 12px;
      cursor: pointer;
      color: var(--vscode-foreground);
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s;
    }

    .tab:hover {
      color: var(--vscode-textLink-foreground);
    }

    .tab.active {
      color: var(--vscode-textLink-foreground);
      border-bottom-color: var(--vscode-textLink-foreground);
    }

    .section {
      margin-bottom: 24px;
    }

    .section-title {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 12px;
      color: var(--vscode-foreground);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .section-content {
      display: grid;
      gap: 12px;
    }

    .info-row {
      display: grid;
      grid-template-columns: 140px 1fr;
      gap: 12px;
      align-items: start;
      font-size: 13px;
    }

    .info-label {
      color: var(--vscode-descriptionForeground);
      font-weight: 500;
    }

    .info-value {
      color: var(--vscode-foreground);
      word-break: break-word;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-badge.running {
      background: var(--vscode-testing-runAction);
      color: white;
    }

    .status-badge.stopped {
      background: var(--vscode-inputValidation-errorBackground);
      color: var(--vscode-inputValidation-errorForeground);
    }

    .status-badge.paused {
      background: var(--vscode-inputValidation-warningBackground);
      color: var(--vscode-inputValidation-warningForeground);
    }

    .status-badge.suspended {
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
    }

    .disks-list, .network-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .disk-item, .network-item {
      padding: 12px;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-editorWidget-border);
      border-radius: 4px;
      font-size: 13px;
    }

    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      font-weight: 500;
    }

    .item-details {
      display: grid;
      gap: 4px;
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
    }

    .item-detail {
      display: flex;
      gap: 8px;
    }

    .detail-label {
      font-weight: 500;
      min-width: 60px;
    }

    .snapshots-list, .backups-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .snapshot-item, .backup-item {
      padding: 12px;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-editorWidget-border);
      border-radius: 4px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .snapshot-info, .backup-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .snapshot-name, .backup-name {
      font-weight: 500;
      color: var(--vscode-foreground);
      font-size: 13px;
    }

    .snapshot-date, .backup-date {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
    }

    .actions-row {
      display: flex;
      gap: 8px;
    }

    .btn-small {
      padding: 4px 8px;
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: 1px solid var(--vscode-button-border);
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s;
    }

    .btn-small:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    .metric-card {
      padding: 16px;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-editorWidget-border);
      border-radius: 4px;
    }

    .metric-title {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 8px;
    }

    .metric-value {
      font-size: 20px;
      font-weight: 600;
      color: var(--vscode-foreground);
    }

    .metric-unit {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      margin-left: 4px;
    }

    .empty-state {
      padding: 32px;
      text-align: center;
      color: var(--vscode-descriptionForeground);
      font-size: 13px;
    }

    .btn-primary {
      padding: 8px 16px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s;
    }

    .btn-primary:hover {
      background: var(--vscode-button-hoverBackground);
    }

    .tag {
      display: inline-block;
      padding: 2px 8px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      border-radius: 4px;
      font-size: 11px;
      margin-right: 4px;
    }
  `;

  override connectedCallback() {
    super.connectedCallback();
    if (this.vm) {
      this.loadAdditionalData();
    }
  }

  override updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);
    if (changedProperties.has('vm') && this.vm) {
      this.loadAdditionalData();
    }
  }

  private async loadAdditionalData() {
    if (!this.vm) return;
    
    // Load data based on active tab
    switch (this.activeTab) {
      case 'snapshots':
        await this.loadSnapshots();
        break;
      case 'backups':
        await this.loadBackups();
        break;
      case 'metrics':
        await this.loadMetrics();
        break;
    }
  }

  private async loadSnapshots() {
    if (!this.vm) return;
    
    this.isLoadingSnapshots = true;
    try {
      this.snapshots = await virtualizationAPI.listSnapshots(this.vm.id);
    } catch (error) {
      console.error('Failed to load snapshots:', error);
    } finally {
      this.isLoadingSnapshots = false;
    }
  }

  private async loadBackups() {
    if (!this.vm) return;
    
    this.isLoadingBackups = true;
    try {
      this.backups = await virtualizationAPI.listBackups(this.vm.id);
    } catch (error) {
      console.error('Failed to load backups:', error);
    } finally {
      this.isLoadingBackups = false;
    }
  }

  private async loadMetrics() {
    if (!this.vm || this.vm.state !== 'running') return;
    
    this.isLoadingMetrics = true;
    try {
      this.metrics = await virtualizationAPI.getVMMetrics(this.vm.id, '1h');
    } catch (error) {
      console.error('Failed to load metrics:', error);
    } finally {
      this.isLoadingMetrics = false;
    }
  }

  private handleTabChange(tab: string) {
    this.activeTab = tab;
    this.loadAdditionalData();
  }

  private handleClose() {
    vmActions.selectVM(null);
    this.dispatchEvent(new CustomEvent('close'));
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

  private formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  private renderOverview() {
    if (!this.vm) return html``;
    
    return html`
      <div class="section">
        <div class="section-title">Basic Information</div>
        <div class="section-content">
          <div class="info-row">
            <div class="info-label">ID</div>
            <div class="info-value">${this.vm.id}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Name</div>
            <div class="info-value">${this.vm.name}</div>
          </div>
          <div class="info-row">
            <div class="info-label">State</div>
            <div class="info-value">
              <span class="status-badge ${this.vm.state}">${this.vm.state}</span>
            </div>
          </div>
          <div class="info-row">
            <div class="info-label">OS Type</div>
            <div class="info-value">${this.vm.os_type}</div>
          </div>
          ${this.vm.os_variant ? html`
            <div class="info-row">
              <div class="info-label">OS Variant</div>
              <div class="info-value">${this.vm.os_variant}</div>
            </div>
          ` : ''}
          <div class="info-row">
            <div class="info-label">Created</div>
            <div class="info-value">${this.formatDate(this.vm.created_at)}</div>
          </div>
          ${this.vm.updated_at ? html`
            <div class="info-row">
              <div class="info-label">Last Updated</div>
              <div class="info-value">${this.formatDate(this.vm.updated_at)}</div>
            </div>
          ` : ''}
        </div>
      </div>

      <div class="section">
        <div class="section-title">Resources</div>
        <div class="section-content">
          <div class="info-row">
            <div class="info-label">Memory</div>
            <div class="info-value">${this.formatMemory(this.vm.memory)}</div>
          </div>
          <div class="info-row">
            <div class="info-label">vCPUs</div>
            <div class="info-value">${this.vm.vcpus}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Disk Size</div>
            <div class="info-value">${this.formatDiskSize(this.vm.disk_size)}</div>
          </div>
        </div>
      </div>

      ${this.vm.graphics ? html`
        <div class="section">
          <div class="section-title">Graphics</div>
          <div class="section-content">
            <div class="info-row">
              <div class="info-label">Type</div>
              <div class="info-value">${this.vm.graphics.type}</div>
            </div>
            ${this.vm.graphics.port ? html`
              <div class="info-row">
                <div class="info-label">Port</div>
                <div class="info-value">${this.vm.graphics.port}</div>
              </div>
            ` : ''}
          </div>
        </div>
      ` : ''}

      <div class="section">
        <div class="section-title">Actions</div>
        <vm-actions .vm=${this.vm}></vm-actions>
      </div>
    `;
  }

  private renderStorage() {
    if (!this.vm) return html``;
    
    return html`
      <div class="section">
        <div class="section-title">
          <span>Disks</span>
          <button class="btn-small">+ Add Disk</button>
        </div>
        <div class="disks-list">
          ${this.vm.disks && this.vm.disks.length > 0 ? 
            this.vm.disks.map(disk => html`
              <div class="disk-item">
                <div class="item-header">
                  <span>${disk.device}</span>
                  <span class="tag">${disk.format}</span>
                </div>
                <div class="item-details">
                  <div class="item-detail">
                    <span class="detail-label">Path:</span>
                    <span>${disk.path}</span>
                  </div>
                  <div class="item-detail">
                    <span class="detail-label">Size:</span>
                    <span>${this.formatDiskSize(disk.size)}</span>
                  </div>
                  ${disk.bus ? html`
                    <div class="item-detail">
                      <span class="detail-label">Bus:</span>
                      <span>${disk.bus}</span>
                    </div>
                  ` : ''}
                  ${disk.used !== undefined ? html`
                    <div class="item-detail">
                      <span class="detail-label">Used:</span>
                      <span>${this.formatDiskSize(disk.used)} (${Math.round((disk.used / disk.size) * 100)}%)</span>
                    </div>
                  ` : ''}
                </div>
              </div>
            `) : html`
              <div class="empty-state">No disks configured</div>
            `
          }
        </div>
      </div>
    `;
  }

  private renderNetwork() {
    if (!this.vm) return html``;
    
    return html`
      <div class="section">
        <div class="section-title">
          <span>Network Interfaces</span>
          <button class="btn-small">+ Add Interface</button>
        </div>
        <div class="network-list">
          ${this.vm.network_interfaces && this.vm.network_interfaces.length > 0 ?
            this.vm.network_interfaces.map(nic => html`
              <div class="network-item">
                <div class="item-header">
                  <span>${nic.name}</span>
                  <span class="tag">${nic.type}</span>
                </div>
                <div class="item-details">
                  ${nic.source ? html`
                    <div class="item-detail">
                      <span class="detail-label">Source:</span>
                      <span>${nic.source}</span>
                    </div>
                  ` : ''}
                  ${nic.model ? html`
                    <div class="item-detail">
                      <span class="detail-label">Model:</span>
                      <span>${nic.model}</span>
                    </div>
                  ` : ''}
                  ${nic.mac ? html`
                    <div class="item-detail">
                      <span class="detail-label">MAC:</span>
                      <span>${nic.mac}</span>
                    </div>
                  ` : ''}
                  ${nic.ip ? html`
                    <div class="item-detail">
                      <span class="detail-label">IP:</span>
                      <span>${nic.ip}</span>
                    </div>
                  ` : ''}
                </div>
              </div>
            `) : html`
              <div class="empty-state">No network interfaces configured</div>
            `
          }
        </div>
      </div>
    `;
  }

  private renderSnapshots() {
    if (!this.vm) return html``;
    
    return html`
      <div class="section">
        <div class="section-title">
          <span>Snapshots</span>
          <button class="btn-primary" @click=${this.createSnapshot}>
            Create Snapshot
          </button>
        </div>
        ${this.isLoadingSnapshots ? html`
          <loading-state message="Loading snapshots..."></loading-state>
        ` : this.snapshots.length > 0 ? html`
          <div class="snapshots-list">
            ${this.snapshots.map(snapshot => html`
              <div class="snapshot-item">
                <div class="snapshot-info">
                  <div class="snapshot-name">${snapshot.name}</div>
                  <div class="snapshot-date">${this.formatDate(snapshot.created_at)}</div>
                  ${snapshot.description ? html`
                    <div class="snapshot-date">${snapshot.description}</div>
                  ` : ''}
                </div>
                <div class="actions-row">
                  <button class="btn-small" @click=${() => this.revertSnapshot(snapshot)}>
                    Revert
                  </button>
                  <button class="btn-small" @click=${() => this.deleteSnapshot(snapshot)}>
                    Delete
                  </button>
                </div>
              </div>
            `)}
          </div>
        ` : html`
          <div class="empty-state">
            No snapshots available. Create a snapshot to save the current VM state.
          </div>
        `}
      </div>
    `;
  }

  private renderBackups() {
    if (!this.vm) return html``;
    
    return html`
      <div class="section">
        <div class="section-title">
          <span>Backups</span>
          <button class="btn-primary" @click=${this.createBackup}>
            Create Backup
          </button>
        </div>
        ${this.isLoadingBackups ? html`
          <loading-state message="Loading backups..."></loading-state>
        ` : this.backups.length > 0 ? html`
          <div class="backups-list">
            ${this.backups.map(backup => html`
              <div class="backup-item">
                <div class="backup-info">
                  <div class="backup-name">${backup.name}</div>
                  <div class="backup-date">${this.formatDate(backup.created_at)}</div>
                  <div class="backup-date">
                    <span class="tag">${backup.type}</span>
                    <span class="tag">${backup.status}</span>
                  </div>
                </div>
                <div class="actions-row">
                  ${backup.status === 'completed' ? html`
                    <button class="btn-small" @click=${() => this.restoreBackup(backup)}>
                      Restore
                    </button>
                  ` : ''}
                  <button class="btn-small" @click=${() => this.deleteBackup(backup)}>
                    Delete
                  </button>
                </div>
              </div>
            `)}
          </div>
        ` : html`
          <div class="empty-state">
            No backups available. Create a backup to protect your VM data.
          </div>
        `}
      </div>
    `;
  }

  private renderMetrics() {
    if (!this.vm) return html``;
    
    if (this.vm.state !== 'running') {
      return html`
        <div class="empty-state">
          Metrics are only available when the VM is running.
        </div>
      `;
    }
    
    if (this.isLoadingMetrics) {
      return html`<loading-state message="Loading metrics..."></loading-state>`;
    }
    
    const latestMetrics = this.metrics[this.metrics.length - 1];
    
    if (!latestMetrics) {
      return html`
        <div class="empty-state">
          No metrics data available.
        </div>
      `;
    }
    
    return html`
      <div class="section">
        <div class="section-title">Current Usage</div>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-title">CPU Usage</div>
            <div class="metric-value">
              ${latestMetrics.cpu_usage.toFixed(1)}
              <span class="metric-unit">%</span>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-title">Memory Usage</div>
            <div class="metric-value">
              ${this.formatMemory(latestMetrics.memory_used)}
              <span class="metric-unit">/ ${this.formatMemory(latestMetrics.memory_total)}</span>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-title">Disk Read</div>
            <div class="metric-value">
              ${(latestMetrics.disk_read / 1024 / 1024).toFixed(1)}
              <span class="metric-unit">MB/s</span>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-title">Disk Write</div>
            <div class="metric-value">
              ${(latestMetrics.disk_write / 1024 / 1024).toFixed(1)}
              <span class="metric-unit">MB/s</span>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-title">Network RX</div>
            <div class="metric-value">
              ${(latestMetrics.network_rx / 1024 / 1024).toFixed(1)}
              <span class="metric-unit">MB/s</span>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-title">Network TX</div>
            <div class="metric-value">
              ${(latestMetrics.network_tx / 1024 / 1024).toFixed(1)}
              <span class="metric-unit">MB/s</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private async createSnapshot() {
    // Dispatch event to parent to handle snapshot creation
    this.dispatchEvent(new CustomEvent('create-snapshot', {
      detail: { vm: this.vm },
      bubbles: true,
      composed: true,
    }));
  }

  private async revertSnapshot(snapshot: VMSnapshot) {
    // Dispatch event to parent to handle snapshot revert
    this.dispatchEvent(new CustomEvent('revert-snapshot', {
      detail: { vm: this.vm, snapshot },
      bubbles: true,
      composed: true,
    }));
  }

  private async deleteSnapshot(snapshot: VMSnapshot) {
    // Dispatch event to parent to handle snapshot deletion
    this.dispatchEvent(new CustomEvent('delete-snapshot', {
      detail: { vm: this.vm, snapshot },
      bubbles: true,
      composed: true,
    }));
  }

  private async createBackup() {
    // Dispatch event to parent to handle backup creation
    this.dispatchEvent(new CustomEvent('create-backup', {
      detail: { vm: this.vm },
      bubbles: true,
      composed: true,
    }));
  }

  private async restoreBackup(backup: VMBackup) {
    // Dispatch event to parent to handle backup restore
    this.dispatchEvent(new CustomEvent('restore-backup', {
      detail: { vm: this.vm, backup },
      bubbles: true,
      composed: true,
    }));
  }

  private async deleteBackup(backup: VMBackup) {
    // Dispatch event to parent to handle backup deletion
    this.dispatchEvent(new CustomEvent('delete-backup', {
      detail: { vm: this.vm, backup },
      bubbles: true,
      composed: true,
    }));
  }

  override render() {
    // Use either prop or store value
    const vm = this.vm || this.selectedVMController.value;
    
    if (!vm) return html``;
    
    return html`
      <detail-drawer
        .title=${vm.name}
        .open=${this.open}
        @close=${this.handleClose}
      >
        <div class="details-container">
          <div class="tabs">
            <button 
              class="tab ${this.activeTab === 'overview' ? 'active' : ''}"
              @click=${() => this.handleTabChange('overview')}
            >
              Overview
            </button>
            <button 
              class="tab ${this.activeTab === 'storage' ? 'active' : ''}"
              @click=${() => this.handleTabChange('storage')}
            >
              Storage
            </button>
            <button 
              class="tab ${this.activeTab === 'network' ? 'active' : ''}"
              @click=${() => this.handleTabChange('network')}
            >
              Network
            </button>
            <button 
              class="tab ${this.activeTab === 'snapshots' ? 'active' : ''}"
              @click=${() => this.handleTabChange('snapshots')}
            >
              Snapshots
            </button>
            <button 
              class="tab ${this.activeTab === 'backups' ? 'active' : ''}"
              @click=${() => this.handleTabChange('backups')}
            >
              Backups
            </button>
            ${vm.state === 'running' ? html`
              <button 
                class="tab ${this.activeTab === 'metrics' ? 'active' : ''}"
                @click=${() => this.handleTabChange('metrics')}
              >
                Metrics
              </button>
            ` : ''}
          </div>

          ${this.activeTab === 'overview' ? this.renderOverview() :
            this.activeTab === 'storage' ? this.renderStorage() :
            this.activeTab === 'network' ? this.renderNetwork() :
            this.activeTab === 'snapshots' ? this.renderSnapshots() :
            this.activeTab === 'backups' ? this.renderBackups() :
            this.activeTab === 'metrics' ? this.renderMetrics() :
            ''
          }
        </div>
      </detail-drawer>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'vm-details-drawer': VMDetailsDrawer;
  }
}
