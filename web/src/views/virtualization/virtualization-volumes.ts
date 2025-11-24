import { LitElement, html, css } from "lit";
import { customElement, state } from "lit/decorators.js";
import { StoreController } from '@nanostores/lit';

// Import UI components
import '../../components/ui/search-input.js';
import '../../components/ui/empty-state.js';
import '../../components/ui/loading-state.js';
import '../../components/ui/filter-dropdown.js';
import '../../components/tabs/tab-group.js';
import '../../components/tables/resource-table.js';
import '../../components/ui/notification-container.js';
import '../../components/drawers/detail-drawer.js';
import '../../components/modals/delete-modal.js';
import '../../components/virtualization/volume-dialog.js';
import '../../components/virtualization/volume-clone-dialog.js';

// Import types
import type { Tab } from '../../components/tabs/tab-group.js';
import type { DeleteItem } from '../../components/modals/delete-modal.js';

// Import utilities
import { formatBytes, formatDate } from "../../utils/formatters";

// Import store and types
import {
  volumeStore,
  $filteredVolumes,
  $volumeStats,
  $volumeSearchQuery,
  $activeVolumeTab,
  volumeActions,
  $virtualizationEnabled,
  $virtualizationDisabledMessage,
  storagePoolStore,
} from "../../stores/virtualization";
import type { StoragePool, StorageVolume } from "../../types/virtualization";
import { VirtualizationDisabledError } from "../../utils/api-errors";
import { virtualizationAPI, VirtualizationAPIError } from "../../services/virtualization-api";

@customElement('virtualization-volumes')
export class VirtualizationVolumes extends LitElement {
  // Local UI state
  @state() private poolFilter: string = 'all';
  @state() private showDetails = false;
  @state() private selectedVolume: StorageVolume | null = null;
  @state() private detailsLoading = false;
  @state() private showVolumeDialog = false;
  @state() private volumeDialogMode: 'create' | 'resize' = 'create';
  @state() private dialogPool: StoragePool | null = null;
  @state() private dialogVolume: StorageVolume | null = null;
  @state() private showCloneDialog = false;
  @state() private clonePool: StoragePool | null = null;
  @state() private cloneVolume: StorageVolume | null = null;
  @state() private showDeleteModal = false;
  @state() private deleteItem: DeleteItem | null = null;
  @state() private deletingVolume: StorageVolume | null = null;
  @state() private isDeleting = false;
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



    /* Stats Bar */
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
      background: var(--vscode-charts-purple);
    }

    .stat-widget:nth-child(3)::before {
      background: var(--vscode-charts-green);
    }

    .stat-widget:nth-child(4)::before {
      background: var(--vscode-charts-orange);
    }

    .stat-widget:nth-child(5)::before {
      background: var(--vscode-charts-yellow);
    }

    .stat-widget:nth-child(6)::before {
      background: var(--vscode-charts-red);
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

    .stat-icon.capacity {
      color: var(--vscode-charts-purple);
    }

    .stat-icon.allocated {
      color: var(--vscode-charts-green);
    }

    .stat-icon.disk {
      color: var(--vscode-charts-orange);
    }

    .stat-icon.iso {
      color: var(--vscode-charts-yellow);
    }

    .stat-icon.dir {
      color: var(--vscode-charts-red);
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

    /* Buttons (aligned with ISO and Pool drawers) */
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

    search-input {
      flex: 1;
      max-width: 400px;
    }

    .content {
      flex: 1;
      overflow-y: auto;
    }

    /* Tab styles */
    .tabs {
      display: flex;
      gap: 0;
      border-bottom: 1px solid var(--vscode-panel-border);
      margin-bottom: 1rem;
    }

    .tab {
      padding: 8px 16px;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: var(--vscode-foreground);
      cursor: pointer;
      font-size: 13px;
      opacity: 0.7;
      transition: all 0.2s;
    }

    .tab:hover {
      opacity: 1;
    }

    .tab.active {
      opacity: 1;
      border-bottom-color: var(--vscode-focusBorder);
      color: var(--vscode-focusBorder);
    }

    /* Table Styles */
    .volumes-table {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-editorWidget-border);
      border-radius: 4px;
      overflow: hidden;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th {
      text-align: left;
      padding: 8px 12px;
      background: var(--vscode-editor-background);
      border-bottom: 1px solid var(--vscode-editorWidget-border);
      font-size: 12px;
      font-weight: 600;
      color: var(--vscode-foreground);
      text-transform: uppercase;
      opacity: 0.7;
    }

    td {
      padding: 10px 12px;
      border-bottom: 1px solid var(--vscode-editorWidget-border);
      font-size: 13px;
      color: var(--vscode-foreground);
    }

    tr:last-child td {
      border-bottom: none;
    }

    tr:hover td {
      background: var(--vscode-list-hoverBackground);
    }

    /* Volume Info */
    .volume-name {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .volume-icon {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      font-size: 14px;
    }

    .volume-icon.disk {
      background: rgba(59, 130, 246, 0.2);
      color: rgb(59, 130, 246);
    }

    .volume-icon.iso {
      background: rgba(168, 85, 247, 0.2);
      color: rgb(168, 85, 247);
    }

    .volume-icon.dir {
      background: rgba(251, 146, 60, 0.2);
      color: rgb(251, 146, 60);
    }

    .volume-details {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .volume-title {
      font-weight: 500;
      color: var(--vscode-foreground);
    }

    .volume-path {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      font-family: monospace;
      opacity: 0.8;
    }

    /* Format Badge */
    .format-badge {
      display: inline-flex;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .format-badge.qcow2 {
      background: rgba(59, 130, 246, 0.2);
      color: rgb(59, 130, 246);
    }

    .format-badge.raw {
      background: rgba(34, 197, 94, 0.2);
      color: rgb(34, 197, 94);
    }

    .format-badge.iso {
      background: rgba(168, 85, 247, 0.2);
      color: rgb(168, 85, 247);
    }

    .format-badge.vmdk {
      background: rgba(251, 146, 60, 0.2);
      color: rgb(251, 146, 60);
    }

    .format-badge.dir {
      background: rgba(107, 114, 128, 0.2);
      color: rgb(107, 114, 128);
    }

    /* Size Info */
    .size-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .size-value {
      font-weight: 500;
    }

    .size-usage {
      font-size: 12px;
      color: var(--text-tertiary);
    }

    /* Usage Bar */
    .usage-bar {
      width: 80px;
      height: 4px;
      background: var(--vscode-progressBar-background);
      border-radius: 2px;
      overflow: hidden;
      margin-top: 2px;
    }

    .usage-fill {
      height: 100%;
      background: var(--vscode-progressBar-foreground);
      transition: width 0.3s ease;
    }

    .usage-fill.high {
      background: var(--vscode-inputValidation-errorBackground);
    }

    .usage-fill.medium {
      background: var(--vscode-inputValidation-warningBackground);
    }

    .usage-fill.low {
      background: var(--vscode-progressBar-foreground);
    }

    .usage-percent {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      margin-top: 2px;
    }

    /* Pool Badge */
    .pool-badge {
      display: inline-flex;
      padding: 2px 6px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      border-radius: 3px;
      font-size: 11px;
    }

    /* Actions */
    .actions {
      display: flex;
      gap: 4px;
    }

    .action-btn {
      padding: 4px 8px;
      background: transparent;
      border: none;
      border-radius: 3px;
      color: var(--vscode-foreground);
      cursor: pointer;
      font-size: 16px;
      opacity: 0.6;
      transition: all 0.2s;
    }

    .action-btn:hover {
      background: var(--vscode-toolbar-hoverBackground);
      opacity: 1;
    }

    .action-btn.danger:hover {
      color: var(--vscode-inputValidation-errorForeground);
      background: var(--vscode-inputValidation-errorBackground);
    }

    /* Loading */
    .loading-container {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 400px;
    }

    /* Empty State */
    .empty-container {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 400px;
    }

    .empty-state {
      text-align: center;
      color: var(--text-secondary);
    }

    .empty-state h3 {
      margin: 16px 0 8px;
      font-size: 18px;
      font-weight: 500;
    }

    .empty-state p {
      margin: 0;
      font-size: 14px;
      color: var(--text-tertiary);
    }

    .spinner {
      font-size: 14px;
      color: var(--text-secondary);
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
  `;

  // Store controllers for reactive updates
  private storeController = new StoreController(this, volumeStore.$state);
  private filteredVolumesController = new StoreController(this, $filteredVolumes);
  private volumeStatsController = new StoreController(this, $volumeStats);
  private searchQueryController = new StoreController(this, $volumeSearchQuery);
  private activeTabController = new StoreController(this, $activeVolumeTab);
  private virtualizationEnabledController = new StoreController(this, $virtualizationEnabled);
  private virtualizationDisabledMessageController = new StoreController(this, $virtualizationDisabledMessage);

  // Component tabs
  private tabs: Tab[] = [
    { id: 'all', label: 'All Volumes' },
    { id: 'disk-images', label: 'Disk Images' },
    { id: 'iso-files', label: 'ISO Files' },
    { id: 'directories', label: 'Directories' }
  ];

  // Table columns configuration
  private getColumns() {
    return [
      {
        key: 'nameCell',
        label: 'Name',
        type: 'custom' as const,
      },
      {
        key: 'formatCell',
        label: 'Format',
        type: 'custom' as const,
      },
      {
        key: 'capacityCell',
        label: 'Capacity',
        type: 'custom' as const,
      },
      {
        key: 'usageCell',
        label: 'Usage',
        type: 'custom' as const,
      },
      {
        key: 'poolCell',
        label: 'Pool',
        type: 'custom' as const,
      },
      {
        key: 'createdAtCell',
        label: 'Created',
        type: 'custom' as const,
      },
    ];
  }

  // Transform volumes data for table display
  private transformVolumeData(volumes: StorageVolume[]) {
    return volumes.map(volume => ({
      ...volume,
      nameCell: volume,
      formatCell: volume,
      capacityCell: volume,
      usageCell: volume,
      poolCell: volume,
      createdAtCell: volume,
    }));
  }

  private getCustomRenderers() {
    return {
      nameCell: (volume: StorageVolume) => {
        const iconClass = volume.type === 'dir' ? 'dir'
          : volume.format === 'iso' ? 'iso'
          : 'disk';
        const icon = volume.type === 'dir' ? '📁'
          : volume.format === 'iso' ? '💿'
          : '💾';

        return html`
          <div class="volume-name">
            <span class="volume-icon ${iconClass}">${icon}</span>
            <div class="volume-details">
              <div class="volume-title">${volume.name}</div>
              <div class="volume-path">${volume.path}</div>
            </div>
          </div>
        `;
      },
      formatCell: (volume: StorageVolume) => html`
        <span class="format-badge ${volume.format}">
          ${volume.format}
        </span>
      `,
      capacityCell: (volume: StorageVolume) => html`
        <div class="size-info">
          <div class="size-value">${formatBytes(volume.capacity)}</div>
          <div class="size-usage">${formatBytes(volume.allocation)} used</div>
        </div>
      `,
      usageCell: (volume: StorageVolume) => html`
        <div>
          <div class="usage-bar">
            <div 
              class="usage-fill ${this.getUsageClass(volume.used_percent || 0)}"
              style="width: ${volume.used_percent || 0}%"
            ></div>
          </div>
          <div class="usage-percent">${volume.used_percent || 0}%</div>
        </div>
      `,
      poolCell: (volume: StorageVolume) => html`
        <span class="pool-badge">${volume.pool_name}</span>
      `,
      createdAtCell: (volume: StorageVolume) => volume.created_at
        ? formatDate(volume.created_at)
        : '-',
    };
  }

  // Table actions configuration
  private getActions(_volume: any) {
    return [
      {
        action: 'view',
        label: 'View Details',
        icon: '👁️',
      },
      {
        action: 'resize',
        label: 'Resize',
        icon: '📏',
      },
      {
        action: 'clone',
        label: 'Clone',
        icon: '🧬',
      },
      {
        action: 'delete',
        label: 'Delete',
        icon: '🗑️',
        danger: true,
      },
    ];
  }

  override async connectedCallback() {
    super.connectedCallback();
    // Initialize data
    await this.loadData();
  }

  private async loadData() {
    try {
      await Promise.all([
        volumeActions.fetchAll(),
        // Load storage pools so create/resize/clone flows have pool metadata
        storagePoolStore.fetch().catch((err: unknown) => {
          console.error('Failed to load storage pools for volumes view:', err);
        }),
      ]);
    } catch (error) {
      console.error('Failed to fetch volumes:', error);
      this.showNotification(
        `Failed to load volumes: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      );
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

  private handleSearchChange(e: CustomEvent) {
    $volumeSearchQuery.set(e.detail.value);
  }

  private handleTabChange(e: CustomEvent) {
    const tabId = e.detail.tabId;
    volumeActions.setActiveTab(tabId);
  }

  private handlePoolFilterChange(e: CustomEvent) {
    this.poolFilter = e.detail.value;
  }

  private handleAction(e: CustomEvent) {
    const { action, item } = e.detail;
    const volume = item as StorageVolume;

    switch (action) {
      case 'view':
        this.openDetails(volume);
        break;
      case 'resize':
        this.openResizeDialog(volume);
        break;
      case 'clone':
        this.openCloneDialog(volume);
        break;
      case 'delete':
        this.openDeleteModal(volume);
        break;
    }
  }

  private async handleRefresh() {
    try {
      await this.loadData();
    } catch (error) {
      if (!(error instanceof VirtualizationDisabledError)) {
        this.showNotification('Failed to refresh volumes', 'error');
      }
    }
  }

  private async openDetails(volume: StorageVolume) {
    this.detailsLoading = true;
    try {
      const full = await virtualizationAPI.getVolume(volume.pool_name, volume.name);
      this.selectedVolume = full as unknown as StorageVolume;
      this.showDetails = true;
    } catch (error) {
      if (error instanceof VirtualizationDisabledError) {
        this.showNotification('Virtualization is disabled on this host', 'error');
      } else if (error instanceof VirtualizationAPIError) {
        this.showNotification(`Failed to load volume details: ${error.message}`, 'error');
      } else if (error instanceof Error) {
        this.showNotification(`Failed to load volume details: ${error.message}`, 'error');
      }
    } finally {
      this.detailsLoading = false;
    }
  }

  private getPoolByName(name: string): StoragePool | null {
    const poolsMap = storagePoolStore.$items.get();
    if (!poolsMap) return null;

    if (poolsMap instanceof Map) {
      return (poolsMap.get(name) as StoragePool & { id: string }) || null;
    }
    if (typeof poolsMap === 'object') {
      return (poolsMap as any)[name] || null;
    }
    return null;
  }

  private openResizeDialog(volume: StorageVolume) {
    const pool = this.getPoolByName(volume.pool_name);
    if (!pool) {
      this.showNotification(`Storage pool "${volume.pool_name}" not found for this volume`, 'error');
      return;
    }
    this.dialogPool = pool;
    this.dialogVolume = volume;
    this.volumeDialogMode = 'resize';
    this.showVolumeDialog = true;
  }

  private openCloneDialog(volume: StorageVolume) {
    const pool = this.getPoolByName(volume.pool_name);
    if (!pool) {
      this.showNotification(`Storage pool "${volume.pool_name}" not found for this volume`, 'error');
      return;
    }
    this.clonePool = pool;
    this.cloneVolume = volume;
    this.showCloneDialog = true;
  }

  private openDeleteModal(volume: StorageVolume) {
    this.deletingVolume = volume;
    this.deleteItem = {
      type: 'Volume',
      name: volume.name,
    };
    this.showDeleteModal = true;
  }

  private async handleConfirmDelete(_e: CustomEvent) {
    if (!this.deletingVolume) return;

    this.isDeleting = true;
    const volume = this.deletingVolume;
    try {
      await virtualizationAPI.deleteVolume(volume.pool_name, volume.name, false);
      await volumeActions.fetchAll();
      this.showNotification(`Volume "${volume.name}" deleted successfully`, 'success');
      this.showDeleteModal = false;
      this.deleteItem = null;
      this.deletingVolume = null;
    } catch (error) {
      let message = 'Unknown error';
      if (error instanceof VirtualizationAPIError) {
        switch (error.code) {
          case 'VOLUME_NOT_FOUND':
            message = 'Volume not found. It may have already been deleted.';
            break;
          case 'VOLUME_IN_USE':
            message = 'This volume is currently attached to one or more virtual machines.';
            break;
          default:
            message = error.message;
        }
      } else if (error instanceof Error) {
        message = error.message;
      }
      this.showNotification(`Failed to delete volume: ${message}`, 'error');
    } finally {
      this.isDeleting = false;
    }
  }

  private handleCancelDelete() {
    this.showDeleteModal = false;
    this.deleteItem = null;
    this.deletingVolume = null;
  }

  private handleCreateVolume() {
    let pool: StoragePool | null = null;
    if (this.poolFilter === 'all') {
      // Prefer a pool named "default" if it exists
      pool = this.getPoolByName('default');
      if (!pool) {
        // Fall back to the first available pool from the store
        const poolsMap = storagePoolStore.$items.get();
        if (poolsMap instanceof Map) {
          const first = poolsMap.values().next().value as StoragePool | undefined;
          pool = first || null;
        } else if (poolsMap && typeof poolsMap === 'object') {
          const keys = Object.keys(poolsMap as any);
          const firstKey = keys.length ? keys[0] : undefined;
          pool = firstKey ? (poolsMap as any)[firstKey] as StoragePool : null;
        }
      }
      if (!pool) {
        this.showNotification('No storage pools available to create a volume.', 'error');
        return;
      }
    } else {
      pool = this.getPoolByName(this.poolFilter);
      if (!pool) {
        this.showNotification(`Storage pool "${this.poolFilter}" not found.`, 'error');
        return;
      }
    }
    this.dialogPool = pool;
    this.dialogVolume = null;
    this.volumeDialogMode = 'create';
    this.showVolumeDialog = true;
  }

  private closeVolumeDialog() {
    // Trigger slide-out animation by keeping the dialog mounted while hiding it,
    // then clear pool/volume after the CSS transition completes.
    this.showVolumeDialog = false;
    const poolRef = this.dialogPool;
    const volumeRef = this.dialogVolume;
    setTimeout(() => {
      // Only clear if the dialog is still closed and references haven't changed
      if (!this.showVolumeDialog && this.dialogPool === poolRef && this.dialogVolume === volumeRef) {
        this.dialogPool = null;
        this.dialogVolume = null;
      }
    }, 300);
  }

  private handleVolumeDialogClose() {
    this.closeVolumeDialog();
  }

  private async handleVolumeCreated(_e: CustomEvent) {
    this.closeVolumeDialog();
    try {
      await volumeActions.fetchAll();
      this.showNotification('Volume created successfully', 'success');
    } catch (error) {
      if (!(error instanceof VirtualizationDisabledError)) {
        this.showNotification('Volume was created but failed to refresh list', 'error');
      }
    }
  }

  private async handleVolumeResized(_e: CustomEvent) {
    this.closeVolumeDialog();
    try {
      await volumeActions.fetchAll();
      this.showNotification('Volume resized successfully', 'success');
    } catch (error) {
      if (!(error instanceof VirtualizationDisabledError)) {
        this.showNotification('Volume was resized but failed to refresh list', 'error');
      }
    }
  }

  private closeCloneDialog() {
    this.showCloneDialog = false;
    const poolRef = this.clonePool;
    const volumeRef = this.cloneVolume;
    setTimeout(() => {
      if (!this.showCloneDialog && this.clonePool === poolRef && this.cloneVolume === volumeRef) {
        this.clonePool = null;
        this.cloneVolume = null;
      }
    }, 300);
  }

  private handleCloneDialogClose() {
    this.closeCloneDialog();
  }

  private async handleVolumeCloned(_e: CustomEvent) {
    this.closeCloneDialog();
    try {
      await volumeActions.fetchAll();
      this.showNotification('Volume cloned successfully', 'success');
    } catch (error) {
      if (!(error instanceof VirtualizationDisabledError)) {
        this.showNotification('Volume was cloned but failed to refresh list', 'error');
      }
    }
  }

  private getUsageClass(percent: number) {
    if (percent >= 90) return 'high';
    if (percent >= 70) return 'medium';
    return 'low';
  }

  private renderVirtualizationDisabledBanner(details?: string | null) {
    return html`
      <div class="virtualization-disabled-banner">
        <h2>Virtualization is disabled on this host</h2>
        <p>Virtualization features are currently unavailable because libvirt is not installed or not running.\
 To manage storage volumes, install and start libvirt on this machine, then reload this page.</p>
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

    const state = this.storeController.value;
    const volumes = this.filteredVolumesController.value || [];
    const stats = this.volumeStatsController.value || {
      totalVolumes: 0,
      totalCapacity: 0,
      totalAllocation: 0,
      diskImages: 0,
      isoFiles: 0,
      directories: 0,
      pools: []
    };
    const activeTab = this.activeTabController.value || 'all';
    const searchQuery = this.searchQueryController.value || '';

    // Get unique pools for filter dropdown
    const poolOptions = [
      { value: 'all', label: 'All Pools' },
      ...stats.pools.map(pool => ({ value: pool, label: pool }))
    ];

    // Filter volumes by pool if needed
    let displayVolumes = volumes;
    if (this.poolFilter !== 'all') {
      displayVolumes = volumes.filter(v => v.pool_name === this.poolFilter);
    }

    return html`
      <div class="container">

        <!-- Stats Bar -->
        <div class="stats-bar">
          <div class="stat-widget">
            <div class="stat-widget-header">
              <span class="stat-icon total">📊</span>
              <span class="stat-label">Total Volumes</span>
            </div>
            <div class="stat-value">${stats.totalVolumes}</div>
            <div class="stat-subtitle">active volumes</div>
          </div>
          
          <div class="stat-widget">
            <div class="stat-widget-header">
              <span class="stat-icon capacity">💾</span>
              <span class="stat-label">Capacity</span>
            </div>
            <div class="stat-value">${formatBytes(stats.totalCapacity)}</div>
            <div class="stat-subtitle">total space</div>
          </div>
          
          <div class="stat-widget">
            <div class="stat-widget-header">
              <span class="stat-icon allocated">✅</span>
              <span class="stat-label">Allocated</span>
            </div>
            <div class="stat-value">${formatBytes(stats.totalAllocation)}</div>
            <div class="stat-subtitle">${Math.round((stats.totalAllocation / stats.totalCapacity) * 100) || 0}% used</div>
          </div>
          
          <div class="stat-widget">
            <div class="stat-widget-header">
              <span class="stat-icon disk">💿</span>
              <span class="stat-label">Disk Images</span>
            </div>
            <div class="stat-value">${stats.diskImages}</div>
            <div class="stat-subtitle">qcow2, raw, vmdk</div>
          </div>
          
          <div class="stat-widget">
            <div class="stat-widget-header">
              <span class="stat-icon iso">📀</span>
              <span class="stat-label">ISO Files</span>
            </div>
            <div class="stat-value">${stats.isoFiles}</div>
            <div class="stat-subtitle">installation media</div>
          </div>
          
          <div class="stat-widget">
            <div class="stat-widget-header">
              <span class="stat-icon dir">📁</span>
              <span class="stat-label">Directories</span>
            </div>
            <div class="stat-value">${stats.directories}</div>
            <div class="stat-subtitle">folder volumes</div>
          </div>
        </div>

        <!-- Tabs -->
        <tab-group
          .tabs=${this.tabs}
          .activeTab=${activeTab}
          @tab-change=${this.handleTabChange}
        ></tab-group>

        <!-- Controls -->
        <div class="controls">
          <div class="filters-section">
            <filter-dropdown
              .options=${poolOptions}
              .selectedValue=${this.poolFilter}
              .label=${'Filter by Pool'}
              @filter-change=${this.handlePoolFilterChange}
            ></filter-dropdown>
            <search-input
              .placeholder=${'Search volumes...'}
              .value=${searchQuery}
              @search-change=${this.handleSearchChange}
            ></search-input>
          </div>
          <div class="actions-section">
            <button class="btn btn-secondary" @click=${this.handleRefresh} title="Refresh">
              🔄
            </button>
            <button
              class="btn btn-primary"
              @click=${this.handleCreateVolume}
              title="Create Volume"
            >
              + Volume
            </button>
          </div>
        </div>

        <!-- Content -->
        <div class="content">
          ${state.loading ? html`
            <loading-state message="Loading storage volumes..."></loading-state>
          ` : state.error ? html`
            <empty-state
              icon="❌"
              title="Error loading volumes"
              description=${state.error.message}
            ></empty-state>
          ` : displayVolumes.length === 0 ? html`
            <empty-state
              icon="📂"
              title="No volumes found"
              description=${searchQuery
          ? "No volumes match your search criteria"
          : "No storage volumes available"}
            ></empty-state>
          ` : html`
            <resource-table
              .columns=${this.getColumns()}
              .data=${this.transformVolumeData(displayVolumes)}
              .getActions=${(item: any) => this.getActions(item)}
              .customRenderers=${this.getCustomRenderers()}
              @action=${this.handleAction}
            ></resource-table>
          `}
        </div>

        <!-- Notification Container -->
        <notification-container></notification-container>

        ${this.showDetails && this.selectedVolume ? html`
          <detail-drawer
            .title=${`Volume: ${this.selectedVolume.name}`}
            .show=${this.showDetails}
            .loading=${this.detailsLoading}
            @close=${() => {
              this.showDetails = false;
              this.selectedVolume = null;
            }}
          >
            <div style="padding: 20px;">
              <h3>Volume Information</h3>
              <div style="display: grid; grid-template-columns: 150px 1fr; gap: 12px; margin-bottom: 20px;">
                <strong>Name:</strong> <span>${this.selectedVolume.name}</span>
                <strong>Pool:</strong> <span>${this.selectedVolume.pool_name}</span>
                <strong>Type:</strong> <span>${this.selectedVolume.type}</span>
                <strong>Format:</strong> <span>${this.selectedVolume.format}</span>
                <strong>Capacity:</strong> <span>${formatBytes(this.selectedVolume.capacity)}</span>
                <strong>Allocation:</strong> <span>${formatBytes(this.selectedVolume.allocation || 0)}</span>
                <strong>Usage:</strong> <span>${this.selectedVolume.used_percent || 0}%</span>
                <strong>Path:</strong> <span>${this.selectedVolume.path}</span>
                <strong>Created:</strong> <span>${formatDate(this.selectedVolume.created_at)}</span>
              </div>
            </div>
          </detail-drawer>
        ` : ''}

        ${this.showDeleteModal && this.deleteItem ? html`
          <delete-modal
            .show=${this.showDeleteModal}
            .item=${this.deleteItem}
            .loading=${this.isDeleting}
            @confirm-delete=${this.handleConfirmDelete}
            @cancel-delete=${this.handleCancelDelete}
          ></delete-modal>
        ` : ''}

        <volume-dialog
          .show=${this.showVolumeDialog}
          .mode=${this.volumeDialogMode}
          .pool=${this.dialogPool}
          .volume=${this.dialogVolume}
          @close=${this.handleVolumeDialogClose}
          @volume-created=${this.handleVolumeCreated}
          @volume-resized=${this.handleVolumeResized}
        ></volume-dialog>

        <volume-clone-dialog
          .show=${this.showCloneDialog}
          .pool=${this.clonePool}
          .volume=${this.cloneVolume}
          .poolNames=${stats.pools}
          @close=${this.handleCloneDialogClose}
          @volume-cloned=${this.handleVolumeCloned}
        ></volume-clone-dialog>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'virtualization-volumes': VirtualizationVolumes;
  }
}