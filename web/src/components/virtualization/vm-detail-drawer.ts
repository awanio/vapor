/**
 * VM Detail Drawer Component
 * Displays comprehensive information about a virtual machine in a right-side drawer
 */

import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { VirtualMachine, VMState, VMSnapshot, SnapshotCapabilities } from '../../types/virtualization';
import { getApiUrl } from '../../config';
import { auth } from '../../auth';
import './vm-console';
import '../modal-dialog';
import './vm-backups-tab';
import { snapshotActions } from '../../stores/virtualization';

interface VMMetrics {
  uuid: string;
  timestamp: string;
  cpu_time: number;
  cpu_usage: number;
  memory_used: number;
  memory_usage: number;
  disk_read: number;
  disk_write: number;
  network_rx: number;
  network_tx: number;
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
  storage?: {
    default_pool: string;
    boot_iso?: string;
    disks?: Array<{
      path: string;
      device: string;
      target: string;
      bus: string;
      format: string;
      storage_pool: string;
      readonly: boolean;
      source_type: string;
      source_path: string;
      size?: number;
    }>;
  };
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
  device?: string;
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
  // @state() private error: string | null = null; // TODO: Display errors in UI
  @state() private isPowerActionLoading = false;
  @state() private showDeleteModal = false;
  @state() private showCloneModal = false;
  @state() private isCloning = false;
  @state() private cloneName = '';
  @state() private cloneStoragePool = '';
  @state() private clonePools: Array<{ name: string; state?: string; type?: string }> = [];
  @state() private isLoadingClonePools = false;
  @state() private clonePoolsError: string | null = null;

  @state() private isDeleting = false;
  @state() private isLoadingMetrics = false;
  @state() private showConsole = false;
  @state() private snapshots: VMSnapshot[] = [];
  @state() private snapshotsLoadedForVmId: string | null = null;
  @state() private isLoadingSnapshots = false;
  @state() private showCreateSnapshotModal = false;
  @state() private snapshotName = '';
  @state() private snapshotDescription = '';
  @state() private createIncludeMemory = false;
  @state() private createQuiesce = false;
  @state() private isCreatingSnapshot = false;
  @state() private snapshotCapabilities: SnapshotCapabilities | null = null;
  @state() private showSnapshotDetailModal = false;
  @state() private isLoadingSnapshotDetail = false;
  @state() private selectedSnapshot: VMSnapshot | null = null;
  @state() private snapshotDetail: VMSnapshot | null = null;
  @state() private showSnapshotActionModal = false;
  @state() private snapshotActionMode: 'revert' | 'delete' = 'delete';
  @state() private snapshotActionName = '';
  @state() private snapshotRevertFlags = 1; // Default: DOMAIN_SNAPSHOT_REVERT_RUNNING
  @state() private isSnapshotActionLoading = false;
  @state() private showStopDropdown = false;

  private metricsRefreshInterval: NodeJS.Timeout | null = null;

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
      background: var(--vscode-bg-lighter, #2d2d30);
      border-bottom: 1px solid var(--vscode-border);
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
      border-bottom: 1px solid var(--vscode-border);
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
      background: var(--vscode-bg-lighter, #2d2d30);
      border-bottom: 1px solid var(--vscode-border);
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

    /* Split Button for Stop action */
    .split-button-container {
      position: relative;
      display: inline-flex;
    }

    .split-button-main {
      padding: 8px 12px;
      background: var(--vscode-button-secondaryBackground, #3c3c3c);
      color: var(--vscode-button-secondaryForeground, #cccccc);
      border: 1px solid var(--vscode-button-border, #5a5a5a);
      border-radius: 4px 0 0 4px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 6px;
      border-right: none;
    }

    .split-button-main:hover:not(:disabled) {
      background: var(--vscode-button-secondaryHoverBackground, #45494e);
    }

    .split-button-main:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .split-button-toggle {
      padding: 8px 6px;
      background: var(--vscode-button-secondaryBackground, #3c3c3c);
      color: var(--vscode-button-secondaryForeground, #cccccc);
      border: 1px solid var(--vscode-button-border, #5a5a5a);
      border-radius: 0 4px 4px 0;
      cursor: pointer;
      font-size: 10px;
      transition: all 0.2s;
      display: flex;
      align-items: center;
    }

    .split-button-toggle:hover:not(:disabled) {
      background: var(--vscode-button-secondaryHoverBackground, #45494e);
    }

    .split-button-toggle:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .split-button-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      margin-top: 4px;
      background: var(--vscode-menu-background, var(--vscode-editorWidget-background, #252526));
      border: 1px solid var(--vscode-menu-border, #464647);
      border-radius: 4px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
      min-width: 140px;
      z-index: 1000;
      overflow: hidden;
    }

    .split-button-dropdown button {
      display: block;
      width: 100%;
      text-align: left;
      padding: 8px 12px;
      border: none;
      background: none;
      color: var(--vscode-foreground, #cccccc);
      cursor: pointer;
      font-size: 13px;
      transition: background 0.15s;
    }

    .split-button-dropdown button:hover:not(:disabled) {
      background: var(--vscode-list-hoverBackground, rgba(90, 93, 94, 0.31));
    }

    .split-button-dropdown button.danger {
      color: var(--vscode-inputValidation-errorForeground, #f48771);
    }

    .split-button-dropdown button.danger:hover:not(:disabled) {
      background: var(--vscode-inputValidation-errorBackground, rgba(255, 0, 0, 0.1));
    }

    .split-button-dropdown button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
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
      border-bottom: 1px solid var(--vscode-border);
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
      background: var(--vscode-bg-lighter, #2d2d30);
      border: 1px solid var(--vscode-border);
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
      background: var(--vscode-bg-lighter, #2d2d30);
      color: var(--vscode-foreground, #cccccc);
      font-weight: 600;
      border-bottom: 1px solid var(--vscode-border);
    }

    .data-table td {
      padding: 10px 12px;
      color: var(--vscode-foreground, #cccccc);
      border-bottom: 1px solid var(--vscode-border);
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
    
    /* Small spinner for buttons */
    .spinner-small {
      display: inline-block;
      width: 12px;
      height: 12px;
      border: 2px solid var(--vscode-widget-border, #454545);
      border-top-color: var(--vscode-foreground, #cccccc);
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
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
      border: 1px solid var(--vscode-border);
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
    
    /* Delete Confirmation Modal */
    .modal-overlay {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 2000;
      align-items: flex-start;
      justify-content: center;
      padding-top: 80px;
    }
    
    .modal-overlay.show {
      display: flex;
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
    
    .modal {
      background: var(--vscode-editor-background, #1e1e1e);
      border: 1px solid var(--vscode-border);
      border-radius: 8px;
      padding: 24px;
      width: 90%;
      max-width: 500px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      animation: slideUp 0.2s ease-out;
    }
    
    @keyframes slideUp {
      from {
        transform: translateY(-20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
    
    .modal-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }
    
    .modal-icon {
      font-size: 24px;
    }
    
    .modal-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--vscode-foreground, #cccccc);
      margin: 0;
    }
    
    .modal-body {
      margin-bottom: 24px;
    }
    
    .modal-message {
      color: var(--vscode-foreground, #cccccc);
      line-height: 1.5;
      margin-bottom: 16px;
    }
    
    .warning-box {
      background: var(--vscode-inputValidation-warningBackground, #5a5012);
      border: 1px solid var(--vscode-inputValidation-warningBorder, #b89500);
      border-radius: 4px;
      padding: 12px;
      color: var(--vscode-inputValidation-warningForeground, #cca700);
      font-size: 13px;
      display: flex;
      align-items: start;
      gap: 8px;
    }
    
    .warning-icon {
      flex-shrink: 0;
      margin-top: 2px;
    }
    
    .vm-info-box {
      background: var(--vscode-bg-lighter, #2d2d30);
      border: 1px solid var(--vscode-border);
      border-radius: 4px;
      padding: 12px;
      margin: 16px 0;
    }
    
    .vm-info-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 13px;
    }
    
    .vm-info-label {
      color: var(--vscode-descriptionForeground, #8b8b8b);
    }
    
    .vm-info-value {
      color: var(--vscode-foreground, #cccccc);
      font-weight: 500;
    }
    
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }
    
    .modal-btn {
      padding: 8px 16px;
      border-radius: 4px;
      border: 1px solid;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    
    .modal-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .modal-btn.cancel {
      background: var(--vscode-button-secondaryBackground, #3c3c3c);
      color: var(--vscode-button-secondaryForeground, #cccccc);
      border-color: var(--vscode-button-border, #5a5a5a);
    }
    
    .modal-btn.cancel:hover:not(:disabled) {
      background: var(--vscode-button-secondaryHoverBackground, #45494e);
    }
    
    .modal-btn.delete {
      background: var(--vscode-inputValidation-errorBackground, #5a1d1d);
      color: var(--vscode-inputValidation-errorForeground, #f48771);
      border-color: var(--vscode-inputValidation-errorBorder, #be1100);
    }
    
    .modal-btn.delete:hover:not(:disabled) {
      background: var(--vscode-inputValidation-errorBorder, #be1100);
    }

    .modal-btn.primary {
      background: var(--vscode-button-background, #0e639c);
      color: var(--vscode-button-foreground, #ffffff);
      border-color: var(--vscode-button-background, #0e639c);
    }

    .modal-btn.primary:hover:not(:disabled) {
      background: var(--vscode-button-hoverBackground, #1177bb);
      border-color: var(--vscode-button-hoverBackground, #1177bb);
    }

    /* Snapshot styles */
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .btn-sm {
      padding: 4px 12px;
      font-size: 12px;
    }

    .btn-danger {
      background: var(--vscode-inputValidation-errorBackground, rgba(190, 17, 0, 0.2));
      border-color: var(--vscode-inputValidation-errorBorder, #be1100);
      color: var(--vscode-inputValidation-errorForeground, #ff6b6b);
    }

    .btn-danger:hover:not(:disabled) {
      background: var(--vscode-inputValidation-errorBorder, #be1100);
      color: white;
    }

    .snapshot-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .snapshot-item {
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: var(--vscode-editor-background, #1e1e1e);
      border: 1px solid var(--vscode-border);
      border-radius: 6px;
    }

    .snapshot-item:hover {
      border-color: var(--vscode-focusBorder, #007fd4);
    }

    .snapshot-info {
      flex: 1;
    }

    .snapshot-name {
      font-weight: 600;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .snapshot-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      font-size: 12px;
      color: var(--vscode-descriptionForeground, #858585);
    }

    .snapshot-desc {
      font-style: italic;
    }

    .snapshot-actions {
      display: flex;
      gap: 8px;
    }

    .loading-state {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 24px;
      color: var(--vscode-descriptionForeground, #858585);
    }

    .empty-state-hint {
      font-size: 12px;
      color: var(--vscode-descriptionForeground, #858585);
      margin-top: 8px;
    }

    .warning-box {
      background: var(--vscode-inputValidation-warningBackground, rgba(255, 204, 0, 0.1));
      border: 1px solid var(--vscode-inputValidation-warningBorder, #cca700);
      border-radius: 4px;
      padding: 12px;
      margin-top: 12px;
      font-size: 13px;
    }

    .warning-box ul {
      margin: 8px 0 0 0;
      padding-left: 20px;
    }

    .warning-box li {
      margin: 4px 0;
    }

    .section-actions {
      display: inline-flex;
      gap: 8px;
      align-items: center;
    }

    /* Generic buttons used in snapshot UI */
    .btn {
      padding: 8px 16px;
      background: var(--vscode-button-secondaryBackground, #3c3c3c);
      color: var(--vscode-button-secondaryForeground, #cccccc);
      border: 1px solid var(--vscode-button-border, #5a5a5a);
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
    }

    .btn:hover:not(:disabled) {
      background: var(--vscode-button-secondaryHoverBackground, #45494e);
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-primary {
      background: var(--vscode-button-background, #0e639c);
      color: var(--vscode-button-foreground, #ffffff);
      border-color: var(--vscode-button-background, #0e639c);
    }

    .btn-primary:hover:not(:disabled) {
      background: var(--vscode-button-hoverBackground, #1177bb);
      border-color: var(--vscode-button-hoverBackground, #1177bb);
    }

    .btn-secondary {
      background: var(--vscode-button-secondaryBackground, #3c3c3c);
      color: var(--vscode-button-secondaryForeground, #cccccc);
      border-color: var(--vscode-button-border, #5a5a5a);
    }

    /* Form controls (snapshot modals) */
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

    .form-hint {
      margin-top: 6px;
      font-size: 12px;
      color: var(--vscode-descriptionForeground, #8b8b8b);
    }

    .form-error {
      margin-top: 6px;
      font-size: 12px;
      color: var(--vscode-inputValidation-errorForeground, #f48771);
    }

    .checkbox-group {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 12px;
    }

    input[type="checkbox"] {
      width: auto;
      margin: 2px 0 0 0;
    }

    .info-box {
      background: var(--vscode-editor-inactiveSelectionBackground, rgba(37, 37, 38, 0.9));
      border: 1px solid var(--vscode-widget-border, #454545);
      border-radius: 4px;
      padding: 12px;
      margin-top: 12px;
      font-size: 13px;
      color: var(--vscode-foreground, #cccccc);
    }

    .info-box ul {
      margin: 8px 0 0 0;
      padding-left: 20px;
    }

    .info-box li {
      margin: 4px 0;
    }

  `;

  override connectedCallback() {
    super.connectedCallback();
    if (this.vm) {
      this.loadVMDetails();
    }
    // Add escape key listener
    document.addEventListener('keydown', this.handleKeyDown);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.stopMetricsRefresh();
    // Remove escape key listener
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  override updated(changedProperties: Map<string, any>) {
    if (changedProperties.has('vm')) {
      const previousVm = changedProperties.get('vm') as VirtualMachine | null | undefined;
      // Only reload details when the selected VM changes, not for in-place state updates
      if (this.vm && (!previousVm || previousVm.id !== this.vm.id)) {
        this.loadVMDetails();

        // Reset snapshot-related state when VM changes
        this.snapshots = [];
        this.snapshotCapabilities = null;
        this.snapshotsLoadedForVmId = null;
        this.showCreateSnapshotModal = false;
        this.showSnapshotDetailModal = false;
        this.selectedSnapshot = null;
        this.snapshotDetail = null;
        this.snapshotName = '';
        this.snapshotDescription = '';
        this.createIncludeMemory = false;
        this.createQuiesce = false;

        if (this.activeTab === 'snapshots' && this.show) {
          this.ensureSnapshotsLoaded();
        }
      }
    }

    // Handle tab changes
    if (changedProperties.has('activeTab')) {
      if (this.activeTab === 'metrics') {
        // Start metrics refresh when metrics tab is active
        this.startMetricsRefresh();
      } else {
        // Stop metrics refresh when leaving metrics tab
        this.stopMetricsRefresh();
      }

      if (this.activeTab === 'snapshots' && this.show) {
        this.ensureSnapshotsLoaded();
      }
    }

    // Handle drawer visibility changes
    if (changedProperties.has('show')) {
      if (!this.show) {
        this.stopMetricsRefresh();
      } else if (this.activeTab === 'metrics') {
        this.startMetricsRefresh();
      }

      if (this.show && this.activeTab === 'snapshots') {
        this.ensureSnapshotsLoaded();
      }
    }
  }

  private startMetricsRefresh() {
    // Only start refresh if VM is running and we're not already refreshing
    const currentState = this.vm?.state || this.vmDetails?.state;
    if (currentState !== 'running' || this.metricsRefreshInterval) {
      return;
    }

    // Fetch immediately
    if (this.vm) {
      console.log('Starting metrics refresh for VM:', this.vm.id);
      this.fetchVMMetrics(this.vm.id);
    }

    // Then set up periodic refresh every 5 seconds
    this.metricsRefreshInterval = setInterval(() => {
      if (this.vm && this.activeTab === 'metrics' && this.show) {
        console.log('Refreshing metrics for VM:', this.vm.id);
        this.fetchVMMetrics(this.vm.id);
      }
    }, 5000);
  }

  private stopMetricsRefresh() {
    if (this.metricsRefreshInterval) {
      console.log('Stopping metrics refresh');
      clearInterval(this.metricsRefreshInterval);
      this.metricsRefreshInterval = null;
    }
  }

  private async loadVMDetails() {
    if (!this.vm) return;

    this.isLoading = true;
    // this.error = null; // TODO: Display errors in UI

    try {
      // Fetch enhanced VM details from the API
      const response = await this.fetchVMEnhancedDetails(this.vm.id);

      if (response) {
        this.vmDetails = response;

        // Update the vm property with fresh state from API
        // This ensures the UI shows the correct state after operations like snapshot revert
        if (this.vm && response.state) {
          this.vm = {
            ...this.vm,
            state: response.state as VMState,
          };
        }

        // Process disks information from storage object
        if (response.storage?.disks && response.storage.disks.length > 0) {
          this.disks = response.storage.disks.map((disk, index) => ({
            name: disk.target || `disk${index}`,
            path: disk.path || disk.source_path || 'Unknown',
            size: disk.size || 0,
            used: 0, // This would need to come from monitoring
            format: disk.format || 'raw',
            bus: disk.bus || 'virtio',
            readonly: disk.readonly || false,
            device: disk.device || 'disk',
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

        // Fetch real metrics if VM is running
        if (this.vm.state === 'running' || this.vmDetails?.state === 'running') {
          await this.fetchVMMetrics(this.vm.id);
        } else {
          this.metrics = null;
        }
      }
    } catch (error) {
      console.error('Failed to load VM details:', error);
      // this.error = error instanceof Error ? error.message : 'Failed to load VM details'; // TODO: Display errors in UI
    } finally {
      this.isLoading = false;
    }
  }

  private async fetchVMMetrics(vmId: string): Promise<void> {
    // Don't fetch if already loading
    if (this.isLoadingMetrics) {
      console.log('Already loading metrics, skipping...');
      return;
    }

    this.isLoadingMetrics = true;

    try {
      const authHeaders = auth.getAuthHeaders();
      if (!authHeaders.Authorization) {
        throw new Error('No authentication token found');
      }

      const apiUrl = getApiUrl(`/virtualization/computes/${vmId}/metrics`);
      console.log('Fetching VM metrics from:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`Failed to fetch VM metrics: ${response.statusText}`);
        this.metrics = null;
        return;
      }

      const data = await response.json();
      console.log('VM metrics response:', data);

      if (data.status === 'success' && data.data) {
        this.metrics = data.data;
        console.log('Metrics updated:', this.metrics);
      } else {
        this.metrics = null;
        console.warn('No metrics data in response');
      }
    } catch (error) {
      console.error('Error fetching VM metrics:', error);
      this.metrics = null;
    } finally {
      this.isLoadingMetrics = false;
    }
  }

  private async fetchVMEnhancedDetails(vmId: string): Promise<VMEnhancedDetails | null> {
    try {
      // Get authentication headers from AuthManager
      const authHeaders = auth.getAuthHeaders();
      if (!authHeaders.Authorization) {
        throw new Error('No authentication token found');
      }

      const apiUrl = getApiUrl(`/virtualization/computes/${vmId}`);
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          ...authHeaders,
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

  private handleKeyDown = (event: KeyboardEvent) => {
    // Only handle escape key when drawer is visible
    if (this.show && event.key === 'Escape') {
      // Check if console is open - if it is, close console first
      if (this.showConsole) {
        this.showConsole = false;
        return;
      }

      // Close snapshot action confirmation modal first
      if (this.showSnapshotActionModal) {
        this.cancelSnapshotAction();
        return;
      }

      // Close snapshot detail modal first
      if (this.showSnapshotDetailModal) {
        this.closeSnapshotDetailModal();
        return;
      }

      // Close create snapshot modal next
      if (this.showCreateSnapshotModal) {
        this.showCreateSnapshotModal = false;
        return;
      }

      // Check if delete modal is open - if it is, close modal first
      if (this.showDeleteModal) {
        this.cancelDelete();
        return;
      }

      // Otherwise close the drawer
      this.handleClose();
    }
  }


  private toggleStopDropdown(e: Event) {
    e.stopPropagation();
    this.showStopDropdown = !this.showStopDropdown;

    if (this.showStopDropdown) {
      setTimeout(() => {
        document.addEventListener('click', this.closeStopDropdown);
      }, 0);
    }
  }

  private closeStopDropdown = () => {
    this.showStopDropdown = false;
    document.removeEventListener('click', this.closeStopDropdown);
  };

  private async handleStopAction(force: boolean) {
    this.closeStopDropdown();
    await this.handlePowerAction('stop', force);
  }

  private renderStopButton() {
    return html`
      <div class="split-button-container">
        <button 
          class="split-button-main" 
          @click=${() => this.handleStopAction(false)}
          ?disabled=${this.isPowerActionLoading}
        >
          ${this.isPowerActionLoading ? html`<span class="spinner-small"></span>` : '⏹️'} Stop
        </button>
        <button 
          class="split-button-toggle"
          @click=${(e: Event) => this.toggleStopDropdown(e)}
          ?disabled=${this.isPowerActionLoading}
        >
          ▼
        </button>
        ${this.showStopDropdown ? html`
          <div class="split-button-dropdown">
            <button @click=${() => this.handleStopAction(false)} ?disabled=${this.isPowerActionLoading}>
              ⏹️ Stop (Graceful)
            </button>
            <button class="danger" @click=${() => this.handleStopAction(true)} ?disabled=${this.isPowerActionLoading}>
              ⚡ Force Stop
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }

  private getExpectedStateAfterAction(action: string): VMState {
    switch (action) {
      case 'start':
        return 'running';
      case 'stop':
        return 'stopped';
      case 'pause':
        return 'paused';
      case 'resume':
        return 'running';
      case 'restart':
        return 'running';
      default:
        return (this.vm?.state as VMState) || (this.vmDetails?.state as VMState) || 'unknown';
    }
  }

  private async handlePowerAction(action: string, force: boolean = false) {
    if (!this.vm || this.isPowerActionLoading) return;

    this.isPowerActionLoading = true;

    try {
      // Execute the power action via API
      const success = await this.executePowerAction(this.vm.id, action, force);

      if (success) {
        // Immediately update local state to reflect expected new state
        const newState = this.getExpectedStateAfterAction(action);
        if (this.vmDetails) {
          this.vmDetails = { ...this.vmDetails, state: newState };
        }
        if (this.vm) {
          this.vm = { ...this.vm, state: newState };
        }

        // Force re-render to update buttons
        this.requestUpdate();

        // Dispatch event for parent component to handle
        this.dispatchEvent(new CustomEvent('power-action', {
          detail: { action, vm: this.vm, success: true }
        }));

        // Show success notification
        this.showNotification(`${action.charAt(0).toUpperCase() + action.slice(1)} action initiated for ${this.vm?.name || 'VM'}`, 'success');
      }
    } catch (error) {
      console.error(`Failed to execute power action ${action}:`, error);
      const message =
        error instanceof Error
          ? error.message
          : `Failed to ${action} VM due to an unknown error`;
      this.showNotification(message, 'error');
    } finally {
      this.isPowerActionLoading = false;
    }
  }

  private buildPowerActionErrorMessage(action: string, responseData: any, statusText: string): string {
    const base = `Failed to ${action} VM`;

    const apiError = responseData?.error;
    const code = apiError?.code || responseData?.code;
    const rawMessage = apiError?.message || responseData?.message;
    const rawDetails = apiError?.details || responseData?.details;

    let detailMessage: string | undefined;
    if (typeof rawDetails === 'string') {
      const match = rawDetails.match(/Message='(.+)'/);
      detailMessage = match?.[1] || rawDetails;
    }

    const parts: string[] = [];
    if (rawMessage) parts.push(rawMessage);
    if (detailMessage && detailMessage !== rawMessage) parts.push(detailMessage);
    if (!parts.length && statusText) parts.push(statusText);

    let full = parts.join(': ');
    if (!full) full = 'Unknown error';

    if (code) {
      return `${base}: [${code}] ${full}`;
    }
    return `${base}: ${full}`;
  }

  private async executePowerAction(vmId: string, action: string, force: boolean = false): Promise<boolean> {
    try {
      // Get authentication headers
      const authHeaders = auth.getAuthHeaders();
      if (!authHeaders.Authorization) {
        throw new Error('No authentication token found');
      }

      const apiUrl = getApiUrl(`/virtualization/computes/${vmId}/action`);
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: action,
          force: force,
        }),
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      const isErrorEnvelope =
        data && typeof data === 'object' && 'status' in data && data.status !== 'success';

      if (!response.ok || isErrorEnvelope) {
        const message = this.buildPowerActionErrorMessage(action, data, response.statusText);
        throw new Error(message);
      }

      // If the API uses an envelope, ensure success status; otherwise treat 2xx as success
      if (data && typeof data === 'object' && 'status' in data) {
        return data.status === 'success';
      }

      return true;
    } catch (error) {
      // Re-throw so the caller can handle user-facing notifications.
      throw error;
    }
  }

  private showNotification(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') {
    // Dispatch event for notification
    this.dispatchEvent(new CustomEvent('show-notification', {
      detail: { message, type },
      bubbles: true,
      composed: true
    }));
  }

  private handleConsoleConnect() {
    // Check if VM is running
    const currentState = this.vm?.state || this.vmDetails?.state;
    if (currentState !== 'running') {
      this.showNotification('Console is only available when VM is running', 'warning');
      return;
    }

    // Open console component
    this.showConsole = true;
  }

  private handleConsoleClose = () => {
    this.showConsole = false;
  }

  public openCloneModal() {
    this.handleCloneVM();
  }

  private handleCloneVM() {
    if (!this.vm) return;

    // Open clone modal
    this.cloneName = `${this.vm.name}-clone`;
    this.cloneStoragePool = '';
    this.showCloneModal = true;

    // Load storage pools for the dropdown (best-effort)
    void this.loadClonePools();
  }

  private async loadClonePools() {
    this.isLoadingClonePools = true;
    this.clonePoolsError = null;
    this.clonePools = [];

    try {
      const token = auth.getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const url = getApiUrl('/virtualization/storages/pools?state=all&page_size=100');
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      const isErrorEnvelope =
        data && typeof data === 'object' && 'status' in data && data.status !== 'success';

      if (!response.ok || isErrorEnvelope) {
        const msg =
          data?.error?.details ||
          data?.error?.message ||
          response.statusText ||
          'Failed to load storage pools';
        throw new Error(msg);
      }

      const pools = data?.data?.pools ?? data?.pools;
      if (!Array.isArray(pools)) {
        throw new Error('Invalid storage pools response');
      }

      const normalized = pools
        .map((p: any) => ({
          name: typeof p?.name === 'string' ? p.name : '',
          state: typeof p?.state === 'string' ? p.state : undefined,
          type: typeof p?.type === 'string' ? p.type : undefined,
        }))
        .filter((p: any) => p.name);

      normalized.sort((a: any, b: any) => a.name.localeCompare(b.name));
      this.clonePools = normalized;
    } catch (error: any) {
      console.error('Failed to load storage pools:', error);
      this.clonePoolsError = error?.message || 'Failed to load storage pools';
    } finally {
      this.isLoadingClonePools = false;
    }
  }

  private async confirmCloneVM() {
    if (!this.vm || this.isCloning) return;

    const name = this.cloneName.trim();
    if (!name) {
      this.showNotification('Clone name is required', 'error');
      return;
    }

    this.isCloning = true;

    try {
      const url = getApiUrl(`/virtualization/computes/${encodeURIComponent(this.vm.id)}/clone`);
      const token = auth.getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const payload: any = {
        name,
        full_clone: true,
        snapshots: false,
      };
      const pool = this.cloneStoragePool.trim();
      if (pool) payload.storage_pool = pool;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      const isErrorEnvelope =
        data && typeof data === 'object' && 'status' in data && data.status !== 'success';

      if (!response.ok || isErrorEnvelope) {
        const msg =
          data?.error?.details ||
          data?.error?.message ||
          (typeof data?.message === 'string' ? data.message : null) ||
          response.statusText ||
          'Clone failed';
        throw new Error(msg);
      }

      this.showNotification(`VM cloned as "${name}"`, 'success');
      this.showCloneModal = false;

      this.dispatchEvent(
        new CustomEvent('vm-cloned', {
          detail: { source: this.vm, cloned: data?.data ?? null },
          bubbles: true,
          composed: true,
        }),
      );
    } catch (error: any) {
      console.error('Failed to clone VM:', error);
      this.showNotification(error?.message || 'Failed to clone VM', 'error');
    } finally {
      this.isCloning = false;
    }
  }

  private renderCloneModal() {
    if (!this.showCloneModal) return html``;

    return html`
      <modal-dialog
        .open=${this.showCloneModal}
        .title=${'Clone Virtual Machine'}
        size="medium"
        @modal-close=${() => {
        if (!this.isCloning) this.showCloneModal = false;
      }}
      >
        <div class="form-group">
          <label for="clone-name">New VM Name <span class="required">*</span></label>
          <input
            id="clone-name"
            type="text"
            .value=${this.cloneName}
            @input=${(e: Event) => (this.cloneName = (e.target as HTMLInputElement).value)}
            placeholder="e.g. my-vm-clone"
            ?disabled=${this.isCloning}
          />
          <div class="form-hint">A full clone will be created (linked clone is not supported yet).</div>
        </div>

        <div class="form-group">
          <label for="clone-pool">Target Storage Pool (optional)</label>
          <select
            id="clone-pool"
            .value=${this.cloneStoragePool}
            @change=${(e: Event) => (this.cloneStoragePool = (e.target as HTMLSelectElement).value)}
            ?disabled=${this.isCloning || this.isLoadingClonePools}
          >
            <option value="">Keep source disk pools</option>
            ${this.clonePools.map(
        (p) =>
          html`<option value=${p.name}>${p.name}${p.state ? ' (' + p.state + ')' : ''}</option>`,
      )}
          </select>
          ${this.isLoadingClonePools
        ? html`<div class="form-hint">Loading storage pools…</div>`
        : this.clonePoolsError
          ? html`<div class="form-error">${this.clonePoolsError}</div>`
          : html`<div class="form-hint">If empty, Vapor will try to clone each disk into its original pool.</div>`}
        </div>

        <div slot="footer" style="display:flex; justify-content:flex-end; gap:8px;">
          <button
            class="btn btn-secondary"
            @click=${() => (this.showCloneModal = false)}
            ?disabled=${this.isCloning}
          >
            Cancel
          </button>
          <button
            class="btn btn-primary"
            @click=${this.confirmCloneVM}
            ?disabled=${this.isCloning || !this.cloneName.trim()}
          >
            ${this.isCloning ? 'Cloning…' : 'Clone VM'}
          </button>
        </div>
      </modal-dialog>
    `;
  }

  private handleSnapshot() {
    // Jump to the Snapshots tab and open the create modal
    this.activeTab = 'snapshots';
    this.ensureSnapshotsLoaded();
    this.openSnapshotModal();
  }

  private openSnapshotModal() {
    // Check if VM is running
    const currentState = this.vm?.state || this.vmDetails?.state;
    const isRunning = currentState?.toLowerCase() === 'running';

    // Check snapshot capabilities
    const supportsSnapshots = this.snapshotCapabilities?.supports_snapshots ?? false;
    const supportsMemory = this.snapshotCapabilities?.supports_memory ?? false;
    const supportsInternal = this.snapshotCapabilities?.supports_internal ?? false;

    // Auto-check "Include memory" if:
    // - VM is running
    // - Supports snapshots
    // - Supports memory
    // - Supports internal snapshots
    const shouldIncludeMemory = isRunning && supportsSnapshots && supportsMemory && supportsInternal;

    this.createIncludeMemory = shouldIncludeMemory;
    this.showCreateSnapshotModal = true;
  }


  private handleDeleteVM() {
    // Check if VM is running
    const currentState = this.vm?.state || this.vmDetails?.state;
    if (currentState === 'running') {
      this.showNotification('Cannot delete a running VM. Please stop it first.', 'error');
      return;
    }

    // Show confirmation modal
    this.showDeleteModal = true;
  }

  private cancelDelete() {
    this.showDeleteModal = false;
    this.isDeleting = false;
  }

  private async confirmDelete() {
    if (!this.vm || this.isDeleting) return;

    this.isDeleting = true;

    try {
      // Execute the delete operation
      const success = await this.executeDeleteVM(this.vm.id);

      if (success) {
        this.showNotification(`VM "${this.vm.name}" has been deleted successfully`, 'success');

        // Close modal and drawer
        this.showDeleteModal = false;

        // Dispatch event for parent component to handle
        this.dispatchEvent(new CustomEvent('vm-deleted', {
          detail: { vm: this.vm },
          bubbles: true,
          composed: true
        }));

        // Close the drawer after a short delay
        setTimeout(() => {
          this.handleClose();
        }, 1000);
      }
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

  private async executeDeleteVM(vmId: string): Promise<boolean> {
    try {
      // Get authentication headers
      const authHeaders = auth.getAuthHeaders();
      if (!authHeaders.Authorization) {
        throw new Error('No authentication token found');
      }

      const apiUrl = getApiUrl(`/virtualization/computes/${vmId}`);
      const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.message ||
          errorData?.error ||
          `Failed to delete VM: ${response.statusText}`
        );
      }

      const data = await response.json().catch(() => ({ status: 'success' }));
      return data.status === 'success' || response.ok;
    } catch (error) {
      console.error('Error deleting VM:', error);
      throw error;
    }
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

  // Unused function - commented out for now
  // private formatUptime(seconds: number): string {
  //   const days = Math.floor(seconds / 86400);
  //   const hours = Math.floor((seconds % 86400) / 3600);
  //   const minutes = Math.floor((seconds % 3600) / 60);
  //   
  //   if (days > 0) {
  //     return `${days}d ${hours}h ${minutes}m`;
  //   } else if (hours > 0) {
  //     return `${hours}h ${minutes}m`;
  //   } else {
  //     return `${minutes}m`;
  //   }
  // }

  private getProgressClass(value: number): string {
    if (value > 80) return 'high';
    if (value > 50) return 'medium';
    return 'low';
  }

  private renderOverviewTab() {
    if (!this.vm) return html``;

    // Use enhanced details if available, fallback to basic VM data
    const details = this.vmDetails || this.vm;
    const osInfo = this.vmDetails?.os || {
      type: undefined,
      architecture: undefined,
      machine: undefined
    };

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
            <span class="info-value">${this.vm.state || this.vmDetails?.state}</span>
          </div>
          <div class="info-item">
            <span class="info-label">OS Type</span>
            <span class="info-value">${osInfo.type || this.vm.os_type || 'hvm'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">OS Variant</span>
            <span class="info-value">${this.vm.os_variant || this.vmDetails?.metadata?.os_variant || '-'}</span>
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

      ${this.vm.graphics && Array.isArray(this.vm.graphics) ? html`
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
    const currentState = this.vmDetails?.state || this.vm?.state;
    const displayState = currentState ? currentState.charAt(0).toUpperCase() + currentState.slice(1) : 'Unknown';

    // Check if VM is not running
    if (currentState !== 'running') {
      return html`
        <div class="empty-state">
          <div class="empty-state-icon">📊</div>
          <div class="empty-state-message">
            Metrics are only available when the VM is running.
            <br>
            Current state: ${displayState}
          </div>
        </div>
      `;
    }

    // Check if metrics are still loading (initial load)
    if (!this.metrics && this.isLoadingMetrics) {
      return html`
        <div class="loading">
          <div class="spinner"></div>
          Loading metrics...
        </div>
      `;
    }

    // Check if we have no metrics and not loading
    if (!this.metrics) {
      return html`
        <div class="empty-state">
          <div class="empty-state-icon">⚠️</div>
          <div class="empty-state-message">
            Unable to load metrics. Please ensure the VM is running and try refreshing.
          </div>
        </div>
      `;
    }

    // Calculate memory usage percentage based on actual memory allocation
    // IMPORTANT: memory_used from API is in bytes, VM memory allocation is in MB!
    const vmMemoryMB = this.vmDetails?.memory || this.vm?.memory || 0;
    const vmMemoryBytes = vmMemoryMB * 1024 * 1024; // Convert MB to bytes
    const memoryUsagePercent = vmMemoryBytes > 0
      ? (this.metrics.memory_used / vmMemoryBytes) * 100
      : 0;

    // Log for debugging
    console.log('Memory calculation:', {
      memory_used_bytes: this.metrics.memory_used,
      memory_used_formatted: this.formatBytes(this.metrics.memory_used),
      vm_memory_mb: vmMemoryMB,
      vm_memory_bytes: vmMemoryBytes,
      vm_memory_formatted: this.formatMemory(vmMemoryMB * 1024), // formatMemory expects KB
      usage_percent: memoryUsagePercent,
      api_memory_usage_field: this.metrics.memory_usage
    });

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
                 style="width: ${Math.min(this.metrics.cpu_usage, 100)}%"></div>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-title">Memory Usage</span>
            <span class="metric-icon">🧠</span>
          </div>
          <div>
            <span class="metric-value">${memoryUsagePercent.toFixed(1)}</span>
            <span class="metric-unit">%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill ${this.getProgressClass(memoryUsagePercent)}" 
                 style="width: ${Math.min(memoryUsagePercent, 100)}%"></div>
          </div>
          <div style="font-size: 11px; color: var(--vscode-descriptionForeground, #8b8b8b); margin-top: 4px;">
            ${this.formatBytes(this.metrics.memory_used)} of ${this.formatMemory(vmMemoryMB * 1024)} used
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-title">Disk Read</span>
            <span class="metric-icon">📖</span>
          </div>
          <div>
            <span class="metric-value">${this.formatBytes(this.metrics.disk_read)}</span>
          </div>
          <div style="font-size: 11px; color: var(--vscode-descriptionForeground, #8b8b8b); margin-top: 4px;">
            Total bytes read
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-title">Disk Write</span>
            <span class="metric-icon">✍️</span>
          </div>
          <div>
            <span class="metric-value">${this.formatBytes(this.metrics.disk_write)}</span>
          </div>
          <div style="font-size: 11px; color: var(--vscode-descriptionForeground, #8b8b8b); margin-top: 4px;">
            Total bytes written
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-title">Network RX</span>
            <span class="metric-icon">📥</span>
          </div>
          <div>
            <span class="metric-value">${this.formatBytes(this.metrics.network_rx)}</span>
          </div>
          <div style="font-size: 11px; color: var(--vscode-descriptionForeground, #8b8b8b); margin-top: 4px;">
            Total received
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-title">Network TX</span>
            <span class="metric-icon">📤</span>
          </div>
          <div>
            <span class="metric-value">${this.formatBytes(this.metrics.network_tx)}</span>
          </div>
          <div style="font-size: 11px; color: var(--vscode-descriptionForeground, #8b8b8b); margin-top: 4px;">
            Total transmitted
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-title">CPU Time</span>
            <span class="metric-icon">⏱️</span>
          </div>
          <div>
            <span class="metric-value">${(this.metrics.cpu_time / 1000000000).toFixed(1)}</span>
            <span class="metric-unit">s</span>
          </div>
          <div style="font-size: 11px; color: var(--vscode-descriptionForeground, #8b8b8b); margin-top: 4px;">
            Total CPU time used
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
    const hasDisks = this.disks && this.disks.length > 0;

    return html`
      <div class="section">
        <h3 class="section-title">Storage Devices</h3>
        ${hasDisks ? html`
          <table class="data-table">
            <thead>
              <tr>
                <th>Target</th>
                <th>Type</th>
                <th>Path</th>
                <th>Format</th>
                <th>Bus</th>
                <th>Size</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${this.disks.map(disk => html`
                <tr>
                  <td><span class="monospace">${disk.name}</span></td>
                  <td>
                    <span class="badge ${disk.device === 'cdrom' ? 'warning' : ''}">
                      ${disk.device?.toUpperCase() || 'DISK'}
                    </span>
                  </td>
                  <td>
                    <span class="monospace" style="font-size: 11px; word-break: break-all;">
                      ${disk.path}
                    </span>
                  </td>
                  <td>${disk.format.toUpperCase()}</td>
                  <td>${disk.bus.toUpperCase()}</td>
                  <td>${disk.size > 0 ? this.formatBytes(disk.size) : 'N/A'}</td>
                  <td>
                    <span class="badge ${disk.readonly ? 'warning' : 'success'}">
                      ${disk.readonly ? 'Read-Only' : 'Read/Write'}
                    </span>
                  </td>
                </tr>
              `)}
            </tbody>
          </table>
        ` : html`
          <div class="empty-state">
            <div class="empty-state-icon">💾</div>
            <div class="empty-state-message">No storage devices attached</div>
          </div>
        `}
      </div>
      
      ${this.vmDetails?.storage ? html`
        <div class="section">
          <h3 class="section-title">Storage Configuration</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Default Pool</span>
              <span class="info-value">${this.vmDetails.storage.default_pool}</span>
            </div>
            ${this.vmDetails.storage.boot_iso ? html`
              <div class="info-item">
                <span class="info-label">Boot ISO</span>
                <span class="info-value monospace">${this.vmDetails.storage.boot_iso}</span>
              </div>
            ` : ''}
          </div>
        </div>
      ` : ''}

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

  private ensureSnapshotsLoaded() {
    if (!this.vm) return;
    if (this.isLoadingSnapshots) return;
    if (this.snapshotsLoadedForVmId === this.vm.id) return;
    this.loadSnapshots();
  }

  private async loadSnapshots() {
    if (!this.vm) return;
    this.isLoadingSnapshots = true;
    try {
      const [snapshots, capabilities] = await Promise.all([
        snapshotActions.list(this.vm.id),
        snapshotActions.getCapabilities(this.vm.id),
      ]);
      this.snapshots = snapshots;
      this.snapshotCapabilities = capabilities;
      this.snapshotsLoadedForVmId = this.vm.id;
    } catch (error: any) {
      console.error('Failed to load snapshots:', error);
      this.snapshots = [];
      this.snapshotCapabilities = null;
      this.showNotification(error?.message || 'Failed to load snapshots', 'error');
    } finally {
      this.isLoadingSnapshots = false;
    }
  }

  private getSnapshotNameError(name: string): string | null {
    const trimmed = name.trim();
    if (!trimmed) return 'Snapshot name is required.';
    if (trimmed.length > 64) return 'Snapshot name must be 64 characters or less.';
    if (!/^[A-Za-z0-9._-]+$/.test(trimmed)) {
      return 'Use only letters, numbers, dot (.), underscore (_), or hyphen (-).';
    }
    return null;
  }

  private async handleCreateSnapshot() {
    if (!this.vm) return;

    const nameError = this.getSnapshotNameError(this.snapshotName);
    if (nameError) {
      this.showNotification(nameError, 'error');
      return;
    }

    const supportsSnapshots = this.snapshotCapabilities?.supports_snapshots;
    if (supportsSnapshots === false) {
      this.showNotification('Snapshots are not supported for this VM/host.', 'warning');
      return;
    }

    // Ensure we don't send unsupported options
    const includeMemory = this.snapshotCapabilities?.supports_memory
      ? this.createIncludeMemory
      : false;

    this.isCreatingSnapshot = true;
    try {
      const result = await snapshotActions.create(this.vm.id, {
        name: this.snapshotName.trim(),
        description: this.snapshotDescription.trim() || undefined,
        include_memory: includeMemory,
        quiesce: this.createQuiesce,
      });

      this.showCreateSnapshotModal = false;
      this.snapshotName = '';
      this.snapshotDescription = '';
      this.createIncludeMemory = false;
      this.createQuiesce = false;

      // Reload snapshots/capabilities
      this.snapshotsLoadedForVmId = null;
      await this.loadSnapshots();

      const warnings = (result as any)?.warnings as string[] | undefined;
      if (warnings?.length) {
        this.showNotification(
          `Snapshot created with warnings: ${warnings[0]}${warnings.length > 1 ? ` (+${warnings.length - 1} more)` : ''}`,
          'warning',
        );
      } else {
        this.showNotification('Snapshot created successfully', 'success');
      }
    } catch (error: any) {
      this.showNotification(error?.message || 'Failed to create snapshot', 'error');
    } finally {
      this.isCreatingSnapshot = false;
    }
  }

  private openSnapshotDetail(snapshot: VMSnapshot) {
    this.selectedSnapshot = snapshot;
    this.snapshotDetail = null;
    this.showSnapshotDetailModal = true;
    this.loadSnapshotDetail(snapshot.name);
  }

  private closeSnapshotDetailModal() {
    this.showSnapshotDetailModal = false;
    this.isLoadingSnapshotDetail = false;
    this.selectedSnapshot = null;
    this.snapshotDetail = null;
  }


  private requestSnapshotAction(mode: 'revert' | 'delete', snapshotName: string) {
    this.snapshotActionMode = mode;
    this.snapshotActionName = snapshotName;
    this.snapshotRevertFlags = 1; // Reset to default: keep running VMs running
    this.showSnapshotActionModal = true;
    this.isSnapshotActionLoading = false;
  }

  private cancelSnapshotAction() {
    this.showSnapshotActionModal = false;
    this.isSnapshotActionLoading = false;
    this.snapshotActionName = '';
  }

  private async confirmSnapshotAction() {
    if (!this.vm) return;
    if (!this.snapshotActionName) return;
    if (this.isSnapshotActionLoading) return;

    this.isSnapshotActionLoading = true;
    const snapshotName = this.snapshotActionName;
    const mode = this.snapshotActionMode;

    try {
      if (mode === 'revert') {
        await snapshotActions.revert(this.vm.id, snapshotName, this.snapshotRevertFlags);
        this.showNotification(`Reverted to snapshot "${snapshotName}"`, 'success');
        // Refresh VM details
        await this.loadVMDetails();

        // Notify parent component about state change
        // This ensures the VM list updates with the correct state
        if (this.vm) {
          this.dispatchEvent(new CustomEvent('power-action', {
            detail: {
              action: 'revert',
              vm: this.vm,
              success: true
            },
            bubbles: true,
            composed: true
          }));
        }
      } else {
        await snapshotActions.delete(this.vm.id, snapshotName);

        // Reload snapshots/capabilities
        this.snapshotsLoadedForVmId = null;
        await this.loadSnapshots();

        // Close detail modal if it was showing this snapshot
        if (this.selectedSnapshot?.name === snapshotName) {
          this.closeSnapshotDetailModal();
        }

        this.showNotification(`Snapshot "${snapshotName}" deleted`, 'success');
      }

      this.showSnapshotActionModal = false;
      this.snapshotActionName = '';
    } catch (error: any) {
      this.showNotification(error?.message || `Failed to ${mode} snapshot`, 'error');
    } finally {
      this.isSnapshotActionLoading = false;
    }
  }

  private renderSnapshotActionModal() {
    const open = this.showSnapshotActionModal;
    if (!open) return html``;

    const mode = this.snapshotActionMode;
    const snapshotName = this.snapshotActionName;
    const title = mode === 'delete' ? 'Delete Snapshot' : 'Revert to Snapshot';
    const icon = mode === 'delete' ? '🗑️' : '↩️';
    const confirmLabel = mode === 'delete' ? 'Delete' : 'Revert';

    return html`
      <div class="modal-overlay show">
        <div class="modal" @click=${(e: Event) => e.stopPropagation()}>
          <div class="modal-header">
            <span class="modal-icon">${icon}</span>
            <h3 class="modal-title">${title}</h3>
          </div>

          <div class="modal-body">
            <p class="modal-message">
              ${mode === 'delete'
        ? html`Are you sure you want to delete this snapshot? This action cannot be undone.`
        : html`Are you sure you want to revert to this snapshot? This will discard all changes since the snapshot was taken.`}
            </p>

            <div class="vm-info-box">
              <div class="vm-info-row">
                <span class="vm-info-label">VM:</span>
                <span class="vm-info-value">${this.vm?.name}</span>
              </div>
              <div class="vm-info-row">
                <span class="vm-info-label">Snapshot:</span>
                <span class="vm-info-value monospace">${snapshotName}</span>
              </div>
            </div>

            <div class="warning-box">
              <span class="warning-icon">⚠️</span>
              <div>
                <strong>Warning:</strong>
                ${mode === 'delete'
        ? html`Deleting a snapshot is permanent.`
        : html`Reverting will overwrite the current VM state.`}
              </div>
            </div>

            ${mode === 'revert'
        ? html`
                  <div class="form-group" style="margin-top: 16px;">
                    <label for="revert-behavior">Revert Behavior</label>
                    <select
                      id="revert-behavior"
                      .value=${String(this.snapshotRevertFlags)}
                      @change=${(e: Event) =>
          (this.snapshotRevertFlags = Number(
            (e.target as HTMLSelectElement).value
          ))}
                      ?disabled=${this.isSnapshotActionLoading}
                    >
                      <option value="1">Keep running (default) - Running VMs stay running</option>
                      <option value="0">Default libvirt behavior - May restart the VM</option>
                      <option value="2">Paused - VM paused after revert</option>
                    </select>
                    <div class="form-hint">
                      Choose how the VM should behave after reverting to the snapshot.
                    </div>
                  </div>
                `
        : ''}
          </div>

          <div class="modal-footer">
            <button
              class="modal-btn cancel"
              @click=${this.cancelSnapshotAction}
              ?disabled=${this.isSnapshotActionLoading}
            >
              Cancel
            </button>
            <button
              class="modal-btn ${mode === 'delete' ? 'delete' : 'primary'}"
              @click=${this.confirmSnapshotAction}
              ?disabled=${this.isSnapshotActionLoading}
            >
              ${this.isSnapshotActionLoading
        ? html`<span class="spinner-small"></span> ${mode === 'delete' ? 'Deleting…' : 'Reverting…'}`
        : html`${confirmLabel}`}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private async loadSnapshotDetail(snapshotName: string) {
    if (!this.vm) return;
    this.isLoadingSnapshotDetail = true;
    try {
      const detail = await snapshotActions.getDetail(this.vm.id, snapshotName);
      this.snapshotDetail = detail;
    } catch (error: any) {
      console.error('Failed to load snapshot detail:', error);
      this.showNotification(error?.message || 'Failed to load snapshot detail', 'error');
    } finally {
      this.isLoadingSnapshotDetail = false;
    }
  }
  private async handleRevertSnapshot(snapshotName: string) {
    this.requestSnapshotAction('revert', snapshotName);
  }

  private async handleDeleteSnapshot(snapshotName: string) {
    this.requestSnapshotAction('delete', snapshotName);
  }


  private formatSnapshotDate(dateStr: string): string {
    if (!dateStr) return 'Unknown';
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  }
  private renderCreateSnapshotModal() {
    // Keep returning a TemplateResult when open, otherwise empty
    if (!this.showCreateSnapshotModal) return html``;

    const nameError = this.getSnapshotNameError(this.snapshotName);
    const supportsSnapshots = this.snapshotCapabilities?.supports_snapshots;
    const supportsMemory = this.snapshotCapabilities?.supports_memory;

    return html`
      <modal-dialog
        .open=${this.showCreateSnapshotModal}
        .title=${'Create Snapshot'}
        size="medium"
        @modal-close=${() => (this.showCreateSnapshotModal = false)}
      >
        ${supportsSnapshots === false
        ? html`<div class="warning-box"><strong>Snapshots are not supported on this VM/host.</strong></div>`
        : ''}

        <div class="form-group">
          <label for="snapshot-name">Snapshot Name <span class="required">*</span></label>
          <input
            type="text"
            id="snapshot-name"
            .value=${this.snapshotName}
            @input=${(e: Event) => (this.snapshotName = (e.target as HTMLInputElement).value)}
            placeholder="e.g. before-upgrade"
            ?disabled=${this.isCreatingSnapshot}
          />
          ${nameError
        ? html`<div class="form-error">${nameError}</div>`
        : html`<div class="form-hint">Allowed: letters, numbers, . _ -</div>`}
        </div>

        <div class="form-group">
          <label for="snapshot-desc">Description (optional)</label>
          <textarea
            id="snapshot-desc"
            .value=${this.snapshotDescription}
            @input=${(e: Event) => (this.snapshotDescription = (e.target as HTMLTextAreaElement).value)}
            placeholder="What is this snapshot for?"
            rows="3"
            ?disabled=${this.isCreatingSnapshot}
          ></textarea>
        </div>

        <div class="checkbox-group">
          <input
            type="checkbox"
            .checked=${this.createIncludeMemory}
            @change=${(e: Event) =>
        (this.createIncludeMemory = (e.target as HTMLInputElement).checked)}
            ?disabled=${this.isCreatingSnapshot || supportsMemory === false}
          />
          <div>
            <div style="display:flex; gap:8px; align-items:center;">
              <span>Include memory</span>
              ${supportsMemory === false ? html`<span class="badge warning">Unsupported</span>` : ''}
            </div>
            <div class="form-hint">Includes the VM RAM state in the snapshot when supported.</div>
          </div>
        </div>

        <div class="checkbox-group">
          <input
            type="checkbox"
            .checked=${this.createQuiesce}
            @change=${(e: Event) =>
        (this.createQuiesce = (e.target as HTMLInputElement).checked)}
            ?disabled=${this.isCreatingSnapshot}
          />
          <div>
            <div>Quiesce filesystem</div>
            <div class="form-hint">May require the QEMU guest agent inside the VM.</div>
          </div>
        </div>

        ${this.snapshotCapabilities?.warnings?.length
        ? html`
              <div class="warning-box">
                <strong>Warnings</strong>
                <ul>
                  ${this.snapshotCapabilities.warnings.map((w: string) => html`<li>${w}</li>`)}
                </ul>
              </div>
            `
        : ''}

        ${this.snapshotCapabilities?.recommendations?.length
        ? html`
              <div class="info-box">
                <strong>Recommendations</strong>
                <ul>
                  ${this.snapshotCapabilities.recommendations.map((r: string) => html`<li>${r}</li>`)}
                </ul>
              </div>
            `
        : ''}

        <div slot="footer" style="display:flex; justify-content:flex-end; gap:8px;">
          <button
            class="btn btn-secondary"
            @click=${() => (this.showCreateSnapshotModal = false)}
            ?disabled=${this.isCreatingSnapshot}
          >
            Cancel
          </button>
          <button
            class="btn btn-primary"
            @click=${this.handleCreateSnapshot}
            ?disabled=${this.isCreatingSnapshot || !!nameError || supportsSnapshots === false}
          >
            ${this.isCreatingSnapshot ? 'Creating…' : 'Create Snapshot'}
          </button>
        </div>
      </modal-dialog>
    `;
  }
  private renderSnapshotDetailModal() {
    if (!this.showSnapshotDetailModal) return html``;

    const base = this.selectedSnapshot;
    const detail = this.snapshotDetail;
    const snapshot = detail && base ? ({ ...base, ...detail } as VMSnapshot) : detail || base;

    return html`
      <modal-dialog
        .open=${this.showSnapshotDetailModal}
        .title=${'Snapshot Details'}
        size="medium"
        @modal-close=${this.closeSnapshotDetailModal}
      >
        ${this.isLoadingSnapshotDetail
        ? html`
              <div class="loading-state">
                <span class="spinner"></span>
                <span>Loading snapshot details...</span>
              </div>
            `
        : ''}

        ${snapshot
        ? html`
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Name</span>
                  <span class="info-value monospace">${snapshot.name}</span>
                </div>

                <div class="info-item">
                  <span class="info-label">Created</span>
                  <span class="info-value">${this.formatSnapshotDate(
          snapshot.created_at || snapshot.creation_time || '',
        )}</span>
                </div>

                ${snapshot.type
            ? html`
                      <div class="info-item">
                        <span class="info-label">Type</span>
                        <span class="info-value">${snapshot.type}</span>
                      </div>
                    `
            : ''}

                ${typeof snapshot.memory === 'boolean'
            ? html`
                      <div class="info-item">
                        <span class="info-label">Memory</span>
                        <span class="info-value">${snapshot.memory ? 'Included' : 'Not included'}</span>
                      </div>
                    `
            : ''}

                ${snapshot.parent
            ? html`
                      <div class="info-item">
                        <span class="info-label">Parent</span>
                        <span class="info-value monospace">${snapshot.parent}</span>
                      </div>
                    `
            : ''}

                ${snapshot.disk_formats?.length
            ? html`
                      <div class="info-item">
                        <span class="info-label">Disk formats</span>
                        <span class="info-value">${snapshot.disk_formats.join(', ')}</span>
                      </div>
                    `
            : ''}

                ${snapshot.description
            ? html`
                      <div class="info-item" style="grid-column: 1 / -1;">
                        <span class="info-label">Description</span>
                        <span class="info-value">${snapshot.description}</span>
                      </div>
                    `
            : ''}
              </div>

              ${snapshot.warnings?.length
            ? html`
                    <div class="warning-box" style="margin-top: 12px;">
                      <strong>Warnings</strong>
                      <ul>
                        ${snapshot.warnings.map((w) => html`<li>${w}</li>`)}
                      </ul>
                    </div>
                  `
            : ''}
            `
        : html`<div class="empty-state-message">No snapshot selected</div>`}

        <div slot="footer" style="display:flex; justify-content:flex-end; gap:8px;">
          <button class="btn btn-secondary" @click=${this.closeSnapshotDetailModal}>Close</button>
          ${snapshot
        ? html`
                <button
                  class="btn btn-secondary"
                  @click=${() => this.handleRevertSnapshot(snapshot.name)}
                  ?disabled=${this.isLoadingSnapshotDetail}
                >
                  ↩️ Revert
                </button>
                <button
                  class="btn btn-danger"
                  @click=${() => this.handleDeleteSnapshot(snapshot.name)}
                  ?disabled=${this.isLoadingSnapshotDetail}
                >
                  🗑️ Delete
                </button>
              `
        : ''}
        </div>
      </modal-dialog>
    `;
  }

  private renderSnapshotsTab() {
    const supportsSnapshots = this.snapshotCapabilities?.supports_snapshots;

    return html`
      <div class="section">
        <div class="section-header">
          <h3 class="section-title">Snapshots</h3>
          <div class="section-actions">
            <button
              class="btn btn-secondary btn-sm"
              @click=${() => {
        this.snapshotsLoadedForVmId = null;
        this.loadSnapshots();
      }}
              ?disabled=${this.isLoadingSnapshots || !this.vm}
              title="Refresh"
            >
              ↻ Refresh
            </button>
            <button
              class="btn btn-primary btn-sm"
              @click=${this.openSnapshotModal}
              ?disabled=${this.isLoadingSnapshots || supportsSnapshots === false}
            >
              + Create Snapshot
            </button>
          </div>
        </div>

        ${this.isLoadingSnapshots
        ? html`
              <div class="loading-state">
                <span class="spinner"></span>
                <span>Loading snapshots...</span>
              </div>
            `
        : supportsSnapshots === false
          ? html`
                <div class="empty-state">
                  <div class="empty-state-icon">📸</div>
                  <div class="empty-state-message">Snapshots are not supported</div>
                  <div class="empty-state-hint">This host/VM does not support libvirt snapshots.</div>
                </div>
              `
          : this.snapshots.length === 0
            ? html`
                  <div class="empty-state">
                    <div class="empty-state-icon">📸</div>
                    <div class="empty-state-message">No snapshots available</div>
                    <div class="empty-state-hint">Create a snapshot to save the current state of this VM</div>
                  </div>
                `
            : html`
                  <div class="snapshot-list">
                    ${this.snapshots.map(
              (snapshot) => html`
                        <div class="snapshot-item" @click=${() => this.openSnapshotDetail(snapshot)}>
                          <div class="snapshot-info">
                            <div class="snapshot-name">
                              ${snapshot.name}
                              ${snapshot.warnings?.length
                  ? html`<span class="badge warning">Warnings</span>`
                  : ''}
                              ${snapshot.type ? html`<span class="badge">${snapshot.type}</span>` : ''}
                              ${snapshot.memory ? html`<span class="badge success">Memory</span>` : ''}
                            </div>
                            <div class="snapshot-meta">
                              ${snapshot.description
                  ? html`<span class="snapshot-desc">${snapshot.description}</span>`
                  : ''}
                              <span class="snapshot-date">Created: ${this.formatSnapshotDate(
                    snapshot.created_at || snapshot.creation_time || '',
                  )}</span>
                              ${snapshot.parent
                  ? html`<span class="snapshot-parent">Parent: ${snapshot.parent}</span>`
                  : ''}
                              ${snapshot.disk_formats?.length
                  ? html`<span class="snapshot-disks">Disks: ${snapshot.disk_formats.join(
                    ', ',
                  )}</span>`
                  : ''}
                            </div>
                          </div>
                          <div class="snapshot-actions">
                            <button
                              class="btn btn-sm btn-secondary"
                              @click=${(e: Event) => {
                  e.stopPropagation();
                  this.handleRevertSnapshot(snapshot.name);
                }}
                              title="Revert to this snapshot"
                            >
                              ↩️ Revert
                            </button>
                            <button
                              class="btn btn-sm btn-danger"
                              @click=${(e: Event) => {
                  e.stopPropagation();
                  this.handleDeleteSnapshot(snapshot.name);
                }}
                              title="Delete this snapshot"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </div>
                      `,
            )}
                  </div>
                `}
      </div>
    `;
  }

  override render() {
    if (!this.vm) return html``;

    // Prefer the primary VM object's state as the source of truth for power state,
    // and fall back to enhanced details only when necessary.
    const rawState = this.vm.state || this.vmDetails?.state || 'unknown';
    const normalizedState = rawState.toLowerCase().replace('shutoff', 'stopped');
    const powerStateClass = normalizedState;
    const powerStateText =
      normalizedState.charAt(0).toUpperCase() + normalizedState.slice(1);
    const isRunning = normalizedState === 'running';
    const isPaused = normalizedState === 'paused';

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
                <span>${this.vm.os_variant || this.vm.os_type || "-"}</span>
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
          ${isRunning ? html`
            ${this.renderStopButton()}
            <button 
              class="action-btn" 
              @click=${() => this.handlePowerAction('restart')}
              ?disabled=${this.isPowerActionLoading}
            >
              ${this.isPowerActionLoading ? html`<span class="spinner-small"></span>` : '🔄'} Restart
            </button>
            <button 
              class="action-btn" 
              @click=${() => this.handlePowerAction('pause')}
              ?disabled=${this.isPowerActionLoading}
            >
              ${this.isPowerActionLoading ? html`<span class="spinner-small"></span>` : '⏸️'} Pause
            </button>
          ` : isPaused ? html`
            <button 
              class="action-btn primary" 
              @click=${() => this.handlePowerAction('resume')}
              ?disabled=${this.isPowerActionLoading}
            >
              ${this.isPowerActionLoading ? html`<span class="spinner-small"></span>` : '▶️'} Resume
            </button>
            <button 
              class="action-btn" 
              @click=${() => this.handlePowerAction('stop')}
              ?disabled=${this.isPowerActionLoading}
            >
              ${this.isPowerActionLoading ? html`<span class="spinner-small"></span>` : '⏹️'} Stop
            </button>
          ` : html`
            <button 
              class="action-btn primary" 
              @click=${() => this.handlePowerAction('start')}
              ?disabled=${this.isPowerActionLoading}
            >
              ${this.isPowerActionLoading ? html`<span class="spinner-small"></span>` : '▶️'} Start
            </button>
          `}
          <button 
            class="action-btn" 
            @click=${this.handleConsoleConnect}
            ?disabled=${!isRunning}
          >
            💻 Console
          </button>
          <button 
            class="action-btn" 
            @click=${() => this.handleCloneVM()}
            ?disabled=${this.isPowerActionLoading}
          >
            📋 Clone
          </button>
          <button 
            class="action-btn" 
            @click=${() => this.handleSnapshot()}
            ?disabled=${this.isPowerActionLoading}
          >
            📸 Snapshot
          </button>
          <button 
            class="action-btn danger" 
            @click=${() => this.handleDeleteVM()}
            ?disabled=${this.isPowerActionLoading}
          >
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
          <button class="tab ${this.activeTab === 'snapshots' ? 'active' : ''}" 
                  @click=${() => this.activeTab = 'snapshots'}>
            Snapshots
          </button>
          <button class="tab ${this.activeTab === 'backups' ? 'active' : ''}" 
                  @click=${() => this.activeTab = 'backups'}>
            Backups
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
                this.activeTab === 'snapshots' ? this.renderSnapshotsTab() :
                  this.activeTab === 'backups' ? html`<vm-backups-tab .vm=${this.vm}></vm-backups-tab>` :
                    html``}
          `}
        </div>
      </div>
      
      ${this.renderCreateSnapshotModal()}
      ${this.renderSnapshotDetailModal()}
      ${this.renderSnapshotActionModal()}
      ${this.renderCloneModal()}

      <!-- Delete Confirmation Modal -->
      <div class="modal-overlay ${this.showDeleteModal ? 'show' : ''}">
        <div class="modal">
          <div class="modal-header">
            <span class="modal-icon">⚠️</span>
            <h3 class="modal-title">Delete Virtual Machine</h3>
          </div>
          
          <div class="modal-body">
            <p class="modal-message">
              Are you sure you want to permanently delete this virtual machine?
            </p>
            
            <div class="vm-info-box">
              <div class="vm-info-row">
                <span class="vm-info-label">Name:</span>
                <span class="vm-info-value">${this.vm.name}</span>
              </div>
              <div class="vm-info-row">
                <span class="vm-info-label">UUID:</span>
                <span class="vm-info-value" style="font-family: monospace; font-size: 12px;">
                  ${this.vmDetails?.uuid || this.vm.id}
                </span>
              </div>
              <div class="vm-info-row">
                <span class="vm-info-label">State:</span>
                <span class="vm-info-value">${powerStateText}</span>
              </div>
              <div class="vm-info-row">
                <span class="vm-info-label">Resources:</span>
                <span class="vm-info-value">
                  ${this.formatMemory(this.vmDetails?.memory || this.vm.memory)} RAM, 
                  ${this.vmDetails?.vcpus || this.vm.vcpus} vCPUs
                </span>
              </div>
            </div>
            
            <div class="warning-box">
              <span class="warning-icon">⚠️</span>
              <div>
                <strong>Warning:</strong> This action cannot be undone. All data associated with this VM, 
                including disks and snapshots, will be permanently deleted.
              </div>
            </div>
          </div>
          
          <div class="modal-footer">
            <button 
              class="modal-btn cancel" 
              @click=${this.cancelDelete}
              ?disabled=${this.isDeleting}
            >
              Cancel
            </button>
            <button 
              class="modal-btn delete" 
              @click=${this.confirmDelete}
              ?disabled=${this.isDeleting}
            >
              ${this.isDeleting ? html`
                <span class="spinner-small"></span>
                Deleting...
              ` : html`
                🗑️ Delete VM
              `}
            </button>
          </div>
        </div>
      </div>
      
      <!-- VM Console -->
      ${this.showConsole && this.vm ? html`
        <vm-console
          .vmId=${this.vm.id}
          .vmName=${this.vm.name}
          .show=${this.showConsole}
          @close=${this.handleConsoleClose}
        ></vm-console>
      ` : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'vm-detail-drawer': VMDetailDrawer;
  }
}
