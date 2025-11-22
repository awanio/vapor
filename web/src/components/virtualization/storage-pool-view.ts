/**
 * Enhanced Storage Pool View Component
 * Displays and manages storage pools with detailed information
 */

import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { StoreController } from '@nanostores/lit';
import '../ui/loading-state.js';
import '../ui/empty-state.js';
import '../ui/status-badge.js';
import './storage-pool-actions.js';
import './volume-dialog.js';

import { 
  storagePoolStore,
  storageActions 
} from '../../stores/virtualization';
import type { 
  StoragePool, 
  Volume,
  StoragePoolType 
} from '../../types/virtualization';
import { virtualizationAPI } from '../../services/virtualization-api';
import { notificationActions } from '../../stores/notifications';

@customElement('storage-pool-view')
export class StoragePoolView extends LitElement {
  private storagePoolsController = new StoreController(this, storagePoolStore.$items);
  private selectedPoolController: StoragePool | null = null;
  
  @state() private isLoading = false;
  @state() private volumes: Map<string, Volume[]> = new Map();
  @state() private expandedPools: Set<string> = new Set();
  @state() private viewMode: 'grid' | 'list' = 'grid';
  @state() private showVolumeDialog = false;
  @state() private selectedPoolForVolume: StoragePool | null = null;
  // @state() private _isCreatingPool = false; // Reserved for future use
  @state() private searchQuery = '';

  static override styles = css`
    :host {
      display: block;
      height: 100%;
    }

    .container {
      display: flex;
      flex-direction: column;
      height: 100%;
      padding: 20px;
      gap: 20px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--vscode-editorWidget-border);
    }

    .title {
      font-size: 18px;
      font-weight: 600;
      color: var(--vscode-foreground);
    }

    .header-actions {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .search-box {
      position: relative;
      width: 250px;
    }

    .search-input {
      width: 100%;
      padding: 6px 12px 6px 32px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      font-size: 13px;
    }

    .search-icon {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--vscode-descriptionForeground);
      font-size: 14px;
    }

    .view-toggle {
      display: flex;
      gap: 4px;
      background: var(--vscode-dropdown-background);
      border: 1px solid var(--vscode-dropdown-border);
      border-radius: 4px;
      padding: 2px;
    }

    .toggle-btn {
      padding: 4px 8px;
      background: transparent;
      color: var(--vscode-foreground);
      border: none;
      border-radius: 2px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s;
    }

    .toggle-btn.active {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }

    .btn-primary {
      padding: 6px 12px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .btn-primary:hover {
      background: var(--vscode-button-hoverBackground);
    }

    .content {
      flex: 1;
      overflow-y: auto;
    }

    /* Grid View Styles */
    .pools-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 16px;
    }

    .pool-card {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-editorWidget-border);
      border-radius: 8px;
      padding: 16px;
      transition: all 0.2s;
      cursor: pointer;
    }

    .pool-card:hover {
      border-color: var(--vscode-focusBorder);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .pool-card.selected {
      border-color: var(--vscode-textLink-foreground);
      background: var(--vscode-list-activeSelectionBackground);
    }

    .pool-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 12px;
    }

    .pool-info {
      flex: 1;
    }

    .pool-name {
      font-size: 15px;
      font-weight: 600;
      color: var(--vscode-foreground);
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .pool-type {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .pool-type-icon {
      width: 14px;
      height: 14px;
    }

    .pool-state {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .pool-state.active {
      background: var(--vscode-testing-runAction);
      color: white;
    }

    .pool-state.inactive {
      background: var(--vscode-inputValidation-errorBackground);
      color: var(--vscode-inputValidation-errorForeground);
    }

    .pool-state.building {
      background: var(--vscode-inputValidation-warningBackground);
      color: var(--vscode-inputValidation-warningForeground);
    }

    .pool-stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin: 16px 0;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .stat-label {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      text-transform: uppercase;
    }

    .stat-value {
      font-size: 14px;
      font-weight: 600;
      color: var(--vscode-foreground);
    }

    .usage-bar {
      width: 100%;
      height: 8px;
      background: var(--vscode-progressBar-background);
      border-radius: 4px;
      overflow: hidden;
      margin: 12px 0;
    }

    .usage-fill {
      height: 100%;
      background: var(--vscode-progressBar-foreground);
      transition: width 0.3s;
    }

    .usage-fill.warning {
      background: var(--vscode-inputValidation-warningBackground);
    }

    .usage-fill.danger {
      background: var(--vscode-inputValidation-errorBackground);
    }

    .usage-text {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      text-align: center;
      margin-top: 4px;
    }

    .pool-actions {
      display: flex;
      gap: 8px;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--vscode-editorWidget-border);
    }

    .btn-secondary {
      flex: 1;
      padding: 6px 12px;
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: 1px solid var(--vscode-button-border);
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s;
      text-align: center;
    }

    .btn-secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }

    /* List View Styles */
    .pools-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .pool-list-item {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-editorWidget-border);
      border-radius: 4px;
      transition: all 0.2s;
    }

    .pool-list-item:hover {
      border-color: var(--vscode-focusBorder);
    }

    .pool-list-header {
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 16px;
      cursor: pointer;
    }

    .expand-icon {
      color: var(--vscode-descriptionForeground);
      transition: transform 0.2s;
    }

    .expand-icon.expanded {
      transform: rotate(90deg);
    }

    .pool-list-info {
      flex: 1;
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr 1fr 100px;
      gap: 16px;
      align-items: center;
    }

    .pool-list-details {
      padding: 0 16px 16px 48px;
      border-top: 1px solid var(--vscode-editorWidget-border);
      margin-top: 12px;
    }

    .volumes-section {
      margin-top: 16px;
    }

    .volumes-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .volumes-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--vscode-foreground);
    }

    .volumes-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .volume-item {
      padding: 8px 12px;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-editorWidget-border);
      border-radius: 4px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
    }

    .volume-info {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .volume-name {
      font-weight: 500;
      color: var(--vscode-foreground);
    }

    .volume-size {
      color: var(--vscode-descriptionForeground);
    }

    .volume-actions {
      display: flex;
      gap: 8px;
    }

    .btn-icon {
      padding: 4px;
      background: transparent;
      border: none;
      color: var(--vscode-foreground);
      cursor: pointer;
      border-radius: 2px;
      transition: all 0.2s;
    }

    .btn-icon:hover {
      background: var(--vscode-toolbar-hoverBackground);
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      text-align: center;
    }

    .empty-icon {
      font-size: 48px;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 16px;
    }

    .empty-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--vscode-foreground);
      margin-bottom: 8px;
    }

    .empty-description {
      font-size: 13px;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 24px;
      max-width: 400px;
    }

    .path-info {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      margin-top: 4px;
      font-family: var(--vscode-editor-font-family);
    }

    .tag {
      display: inline-block;
      padding: 2px 6px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      border-radius: 2px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
    }
  `;

  override connectedCallback() {
    super.connectedCallback();
    this.loadStoragePools();
  }

  private async loadStoragePools() {
    this.isLoading = true;
    try {
      await storageActions.fetchPools();
      // Load volumes for each pool
      const poolsMap = this.storagePoolsController.value;
      if (poolsMap) {
        for (const pool of poolsMap.values()) {
          await this.loadVolumes(pool);
        }
      }
    } catch (error) {
      notificationActions.addNotification({
        type: 'error',
        title: 'Failed to load storage pools',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      this.isLoading = false;
    }
  }

  private async loadVolumes(pool: StoragePool) {
    try {
      const volumes = await virtualizationAPI.listVolumes(pool.name);
      this.volumes.set(pool.name, volumes);
      this.requestUpdate();
    } catch (error) {
      console.error(`Failed to load volumes for pool ${pool.name}:`, error);
    }
  }

  private togglePoolExpansion(poolName: string) {
    if (this.expandedPools.has(poolName)) {
      this.expandedPools.delete(poolName);
    } else {
      this.expandedPools.add(poolName);
    }
    this.requestUpdate();
  }

  private selectPool(pool: StoragePool) {
    this.selectedPoolController = pool;
    this.requestUpdate();
  }

  private formatSize(bytes: number): string {
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1024) {
      return `${(gb / 1024).toFixed(2)} TB`;
    }
    return `${gb.toFixed(2)} GB`;
  }

  private calculateUsagePercentage(pool: StoragePool): number {
    if (!pool.capacity) return 0;
    return Math.round((pool.allocation / pool.capacity) * 100);
  }

  private getUsageClass(percentage: number): string {
    if (percentage >= 90) return 'danger';
    if (percentage >= 75) return 'warning';
    return '';
  }

  private getPoolIcon(type: StoragePoolType): string {
    const icons: Record<string, string> = {
      dir: '📁',
      disk: '💾',
      fs: '🗜️',
      iscsi: '🌐',
      logical: '🔲',
      netfs: '🌐',
      rbd: '☁️',
      gluster: '🔷',
      // Additional types not in base type
      zfs: '💿',
      vstorage: '📦',
      mpath: '🔀',
      sheepdog: '🐑',
      scsi: '🔌'
    };
    return icons[type] || '📁';
  }

  private handleCreatePool() {
    // this.isCreatingPool = true;
    // Dispatch event for parent to handle
    this.dispatchEvent(new CustomEvent('create-pool', {
      bubbles: true,
      composed: true
    }));
  }

  private handleCreateVolume(pool: StoragePool) {
    this.selectedPoolForVolume = pool;
    this.showVolumeDialog = true;
  }

  private async handleVolumeCreated(event: CustomEvent) {
    const { pool, volume } = event.detail;
    await this.loadVolumes(pool);
    this.showVolumeDialog = false;
    this.selectedPoolForVolume = null;
    
    notificationActions.addNotification({
      type: 'success',
      title: 'Volume created',
      message: `Volume ${volume.name} created successfully`
    });
  }

  private async handleDeleteVolume(pool: StoragePool, volume: Volume) {
    if (!confirm(`Are you sure you want to delete volume "${volume.name}"?`)) {
      return;
    }

    try {
      await virtualizationAPI.deleteVolume(pool.name, volume.name);
      await this.loadVolumes(pool);
      
      notificationActions.addNotification({
        type: 'success',
        title: 'Volume deleted',
        message: `Volume ${volume.name} deleted successfully`
      });
    } catch (error) {
      notificationActions.addNotification({
        type: 'error',
        title: 'Failed to delete volume',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async handleRefreshPool(pool: StoragePool) {
    try {
      await virtualizationAPI.refreshStoragePool(pool.name);
      await this.loadStoragePools();
      
      notificationActions.addNotification({
        type: 'success',
        title: 'Pool refreshed',
        message: `Storage pool ${pool.name} refreshed successfully`
      });
    } catch (error) {
      notificationActions.addNotification({
        type: 'error',
        title: 'Failed to refresh pool',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private filterPools(pools: StoragePool[]): StoragePool[] {
    if (!this.searchQuery) return pools;
    
    const query = this.searchQuery.toLowerCase();
    return pools.filter(pool => 
      pool.name.toLowerCase().includes(query) ||
      pool.type.toLowerCase().includes(query) ||
      pool.path?.toLowerCase().includes(query)
    );
  }

  private renderPoolCard(pool: StoragePool) {
    const usagePercentage = this.calculateUsagePercentage(pool);
    const volumes = this.volumes.get(pool.name) || [];
    const isSelected = this.selectedPoolController?.name === pool.name;

    return html`
      <div 
        class="pool-card ${isSelected ? 'selected' : ''}"
        @click=${() => this.selectPool(pool)}
      >
        <div class="pool-header">
          <div class="pool-info">
            <div class="pool-name">
              ${pool.name}
              ${pool.autostart ? html`<span class="tag">AUTO</span>` : ''}
            </div>
            <div class="pool-type">
              <span class="pool-type-icon">${this.getPoolIcon(pool.type)}</span>
              ${pool.type}
            </div>
          </div>
          <div class="pool-state ${pool.state}">${pool.state}</div>
        </div>

        ${pool.path ? html`
          <div class="path-info">📍 ${pool.path}</div>
        ` : ''}

        <div class="pool-stats">
          <div class="stat-item">
            <div class="stat-label">Capacity</div>
            <div class="stat-value">${this.formatSize(pool.capacity)}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Allocated</div>
            <div class="stat-value">${this.formatSize(pool.allocation)}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Available</div>
            <div class="stat-value">${this.formatSize(pool.available)}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Volumes</div>
            <div class="stat-value">${volumes.length}</div>
          </div>
        </div>

        <div class="usage-bar">
          <div 
            class="usage-fill ${this.getUsageClass(usagePercentage)}"
            style="width: ${usagePercentage}%"
          ></div>
        </div>
        <div class="usage-text">${usagePercentage}% used</div>

        <div class="pool-actions">
          <button 
            class="btn-secondary"
            @click=${(e: Event) => {
              e.stopPropagation();
              this.handleCreateVolume(pool);
            }}
          >
            + Volume
          </button>
          <button 
            class="btn-secondary"
            @click=${(e: Event) => {
              e.stopPropagation();
              this.handleRefreshPool(pool);
            }}
          >
            Refresh
          </button>
          <button 
            class="btn-secondary"
            @click=${(e: Event) => {
              e.stopPropagation();
              this.togglePoolExpansion(pool.name);
            }}
          >
            Details
          </button>
        </div>
      </div>
    `;
  }

  private renderPoolListItem(pool: StoragePool) {
    // const usagePercentage = this.calculateUsagePercentage(pool);
    const volumes = this.volumes.get(pool.name) || [];
    const isExpanded = this.expandedPools.has(pool.name);

    return html`
      <div class="pool-list-item">
        <div 
          class="pool-list-header"
          @click=${() => this.togglePoolExpansion(pool.name)}
        >
          <span class="expand-icon ${isExpanded ? 'expanded' : ''}">▶</span>
          <div class="pool-list-info">
            <div class="pool-name">
              ${this.getPoolIcon(pool.type)} ${pool.name}
              ${pool.autostart ? html`<span class="tag">AUTO</span>` : ''}
            </div>
            <div>${pool.type}</div>
            <div>${this.formatSize(pool.capacity)}</div>
            <div>${this.formatSize(pool.available)}</div>
            <div>${volumes.length} volumes</div>
            <div class="pool-state ${pool.state}">${pool.state}</div>
          </div>
        </div>

        ${isExpanded ? html`
          <div class="pool-list-details">
            <storage-pool-actions
              .pool=${pool}
              @refresh=${() => this.handleRefreshPool(pool)}
              @create-volume=${() => this.handleCreateVolume(pool)}
            ></storage-pool-actions>

            <div class="volumes-section">
              <div class="volumes-header">
                <div class="volumes-title">Volumes</div>
                <button 
                  class="btn-secondary"
                  @click=${() => this.handleCreateVolume(pool)}
                >
                  + Create Volume
                </button>
              </div>
              
              ${volumes.length > 0 ? html`
                <div class="volumes-list">
                  ${volumes.map(volume => html`
                    <div class="volume-item">
                      <div class="volume-info">
                        <span class="volume-name">${volume.name}</span>
                        <span class="volume-size">${this.formatSize(volume.capacity)}</span>
                        <span class="tag">${volume.type}</span>
                      </div>
                      <div class="volume-actions">
                        <button 
                          class="btn-icon"
                          title="Delete volume"
                          @click=${() => this.handleDeleteVolume(pool, volume)}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  `)}
                </div>
              ` : html`
                <div class="empty-state">
                  <div class="empty-description">No volumes in this pool</div>
                </div>
              `}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  override render() {
    const poolsMap = this.storagePoolsController.value;
    const poolsArray = poolsMap ? Array.from(poolsMap.values()) : [];
    const pools = this.filterPools(poolsArray);

    if (this.isLoading) {
      return html`
        <div class="container">
          <loading-state message="Loading storage pools..."></loading-state>
        </div>
      `;
    }

    return html`
      <div class="container">
        <div class="header">
          <div class="title">Storage Pools</div>
          <div class="header-actions">
            <div class="search-box">
              <span class="search-icon">🔍</span>
              <input
                type="text"
                class="search-input"
                placeholder="Search pools..."
                .value=${this.searchQuery}
                @input=${(e: Event) => {
                  this.searchQuery = (e.target as HTMLInputElement).value;
                }}
              />
            </div>
            
            <div class="view-toggle">
              <button 
                class="toggle-btn ${this.viewMode === 'grid' ? 'active' : ''}"
                @click=${() => this.viewMode = 'grid'}
              >
                Grid
              </button>
              <button 
                class="toggle-btn ${this.viewMode === 'list' ? 'active' : ''}"
                @click=${() => this.viewMode = 'list'}
              >
                List
              </button>
            </div>

            <button class="btn-primary" @click=${this.handleCreatePool}>
              <span>+</span> Create Pool
            </button>
          </div>
        </div>

        <div class="content">
          ${pools.length === 0 ? html`
            <div class="empty-state">
              <div class="empty-icon">📦</div>
              <div class="empty-title">No Storage Pools</div>
              <div class="empty-description">
                Storage pools are used to organize and manage storage for virtual machines.
                Create your first storage pool to get started.
              </div>
              <button class="btn-primary" @click=${this.handleCreatePool}>
                Create Storage Pool
              </button>
            </div>
          ` : this.viewMode === 'grid' ? html`
            <div class="pools-grid">
              ${repeat(
                pools,
                pool => pool.name,
                pool => this.renderPoolCard(pool)
              )}
            </div>
          ` : html`
            <div class="pools-list">
              ${repeat(
                pools,
                pool => pool.name,
                pool => this.renderPoolListItem(pool)
              )}
            </div>
          `}
        </div>

        ${this.showVolumeDialog && this.selectedPoolForVolume ? html`
          <volume-dialog
            .show=${this.showVolumeDialog}
            .mode=${'create'}
            .pool=${this.selectedPoolForVolume}
            @close=${() => {
              this.showVolumeDialog = false;
              this.selectedPoolForVolume = null;
            }}
            @volume-created=${this.handleVolumeCreated}
          ></volume-dialog>
        ` : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'storage-pool-view': StoragePoolView;
  }
}
