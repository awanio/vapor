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

// Import types
import type { Tab } from '../../components/tabs/tab-group.js';

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
} from "../../stores/virtualization";
import type { StorageVolume } from "../../types/virtualization";

@customElement('virtualization-volumes')
export class VirtualizationVolumes extends LitElement {
  // Local UI state
  @state() private poolFilter: string = 'all';
  static override styles = css`
    :host {
      display: block;
      height: 100%;
      padding: 24px;
      box-sizing: border-box;
    }

    .container {
      display: flex;
      flex-direction: column;
      height: 100%;
      gap: 1rem;
    }

    .header {
      margin-bottom: 1.5rem;
    }

    .header h1 {
      margin: 0 0 24px 0;
      font-size: 24px;
      font-weight: 300;
      flex-shrink: 0;
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
  `;

  // Store controllers for reactive updates
  private storeController = new StoreController(this, volumeStore.$state);
  private filteredVolumesController = new StoreController(this, $filteredVolumes);
  private volumeStatsController = new StoreController(this, $volumeStats);
  private searchQueryController = new StoreController(this, $volumeSearchQuery);
  private activeTabController = new StoreController(this, $activeVolumeTab);

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
        key: 'name',
        label: 'Name',
        type: 'custom' as const
      },
      {
        key: 'format',
        label: 'Format',
        type: 'custom' as const
      },
      {
        key: 'capacity',
        label: 'Capacity',
        type: 'custom' as const
      },
      {
        key: 'usage',
        label: 'Usage',
        type: 'custom' as const
      },
      {
        key: 'pool_name',
        label: 'Pool'
      },
      {
        key: 'created_at',
        label: 'Created'
      }
    ];
  }

  // Transform volumes data for table display
  private transformVolumeData(volumes: StorageVolume[]) {
    return volumes.map(volume => {
      const iconClass = volume.type === 'dir' ? 'dir' : 
                       volume.format === 'iso' ? 'iso' : 'disk';
      const icon = volume.type === 'dir' ? '📁' : 
                  volume.format === 'iso' ? '💿' : '💾';
      
      return {
        ...volume,
        name: html`
          <div class="volume-name">
            <span class="volume-icon ${iconClass}">${icon}</span>
            <div class="volume-details">
              <div class="volume-title">${volume.name}</div>
              <div class="volume-path">${volume.path}</div>
            </div>
          </div>
        `,
        format: html`
          <span class="format-badge ${volume.format}">
            ${volume.format}
          </span>
        `,
        capacity: html`
          <div class="size-info">
            <div class="size-value">${formatBytes(volume.capacity)}</div>
            <div class="size-usage">${formatBytes(volume.allocation)} used</div>
          </div>
        `,
        usage: html`
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
        pool_name: html`<span class="pool-badge">${volume.pool_name}</span>`,
        created_at: formatDate(volume.created_at)
      };
    });
  }

  // Table actions configuration
  private getActions(_volume: any) {
    return [
      {
        id: 'view',
        label: 'View Details',
        icon: '👁️'
      },
      {
        id: 'delete',
        label: 'Delete',
        icon: '🗑️',
        danger: true
      }
    ];
  }

  override async connectedCallback() {
    super.connectedCallback();
    // Initialize data
    await this.loadData();
  }

  private async loadData() {
    try {
      await volumeActions.fetchAll();
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
    if (action === 'delete') {
      this.handleDelete(item as StorageVolume);
    } else if (action === 'view') {
      // Handle view details
      console.log('View details for:', item);
    }
  }

  private async handleRefresh() {
    await this.loadData();
  }

  private async handleDelete(volume: StorageVolume) {
    if (confirm(`Are you sure you want to delete volume "${volume.name}"?`)) {
      try {
        // StorageVolume may have optional id, check first
        const volumeId = (volume as any).id || `${volume.pool_name}:${volume.name}`;
        await volumeStore.delete(volumeId);
      } catch (error) {
        console.error('Failed to delete volume:', error);
      }
    }
  }


  private getUsageClass(percent: number) {
    if (percent >= 90) return 'high';
    if (percent >= 70) return 'medium';
    return 'low';
  }

  override render() {
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
        <div class="header">
          <h1>Storage Volumes</h1>
        </div>

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
            <button class="btn-refresh" @click=${this.handleRefresh} title="Refresh">
              🔄
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
              .actions=${(item: any) => this.getActions(item)}
              @action=${this.handleAction}
            ></resource-table>
          `}
        </div>

        <!-- Notification Container -->
        <notification-container></notification-container>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'virtualization-volumes': VirtualizationVolumes;
  }
}
