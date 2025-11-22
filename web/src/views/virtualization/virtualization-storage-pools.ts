import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { StoreController } from '@nanostores/lit';

// Import UI components
import '../../components/ui/search-input.js';
import '../../components/ui/empty-state.js';
import '../../components/ui/loading-state.js';
import '../../components/tabs/tab-group.js';
import '../../components/tables/resource-table.js';
import '../../components/drawers/detail-drawer.js';
import '../../components/modals/delete-modal.js';
import '../../components/drawers/create-resource-drawer';
import '../../components/virtualization/storage-pool-form-drawer';

// Import types
import type { Tab } from '../../components/tabs/tab-group.js';
import type { Column } from '../../components/tables/resource-table.js';
import type { ActionItem } from '../../components/ui/action-dropdown.js';
import type { DeleteItem } from '../../components/modals/delete-modal.js';
import type { StoragePool } from '../../types/virtualization';

// Import virtualization store and actions
import {
  storagePoolStore,
  $filteredStoragePools,
  // $storagePoolStats, // Reserved for future stats display
  $activeStoragePoolTab,
  $storagePoolSearchQuery,
  $selectedStoragePool,
  storagePoolActions,
  $virtualizationEnabled,
  $virtualizationDisabledMessage,
} from '../../stores/virtualization';
import { virtualizationAPI } from '../../services/virtualization-api';
import type { StoragePoolFormData } from '../../components/virtualization/storage-pool-form-drawer';

// Internal interface with computed fields for display
interface StoragePoolDisplay extends StoragePool {
  id: string; // Generated from name
  capacityFormatted: string;
  allocatedFormatted: string;
  availableFormatted: string;
  usage: number; // percentage
}

// Reserved for future use when volume management is implemented
// interface StorageVolume {
//   name: string;
//   type: string;
//   capacity: number;
//   allocation: number;
//   path: string;
//   format: string;
//   created_at: string;
// }

@customElement('virtualization-storage-pools')
export class VirtualizationStoragePools extends LitElement {
  // Store controllers for reactive updates
  private storeController = new StoreController(this, storagePoolStore.$state);
  private filteredPoolsController = new StoreController(this, $filteredStoragePools);
  private virtualizationEnabledController = new StoreController(this, $virtualizationEnabled);
  private virtualizationDisabledMessageController = new StoreController(this, $virtualizationDisabledMessage);
  // private statsController = new StoreController(this, $storagePoolStats); // Reserved for future stats display
  private selectedPoolController = new StoreController(this, $selectedStoragePool);
  private activeTabController = new StoreController(this, $activeStoragePoolTab);
  private searchQueryController = new StoreController(this, $storagePoolSearchQuery);

  // Local UI state
  @state() private showDetails = false;
  @state() private showDeleteModal = false;
  @state() private itemToDelete: DeleteItem | null = null;
  @state() private isDeleting = false;
  @state() private showFormDrawer = false;
  @state() private showEditDrawer = false;
  @state() private editingPool: StoragePoolDisplay | null = null;
  @state() private isCreating = false;
  @state() private isUpdating = false;
  @state() private hasVolumes = false;
  @state() private volumeCount = 0;

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


    .controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      gap: 1rem;
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


    .usage-bar {
      width: 100%;
      height: 6px;
      background: var(--vscode-progressBar-background);
      border-radius: 3px;
      overflow: hidden;
      margin-top: 4px;
    }

    .usage-fill {
      height: 100%;
      background: var(--vscode-progressBar-foreground);
      transition: width 0.3s ease;
    }

    .usage-warning {
      background: var(--vscode-testing-iconQueued);
    }

    .usage-danger {
      background: var(--vscode-testing-iconFailed);
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

  private tabs: Tab[] = [
    { id: 'all', label: 'All Pools' },
    { id: 'active', label: 'Active' },
    { id: 'inactive', label: 'Inactive' },
    { id: 'local', label: 'Local Storage' },
    { id: 'network', label: 'Network Storage' }
  ];

  override async connectedCallback() {
    super.connectedCallback();
    // Initialize stores if not already initialized
    await this.loadData();
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private calculateUsagePercentage(allocated: number, capacity: number): number {
    if (capacity === 0) return 0;
    return Math.round((allocated / capacity) * 100);
  }

  private transformStoragePool(pool: StoragePool & { id: string }): StoragePoolDisplay {
    return {
      ...pool,
      id: pool.name, // Use name as ID
      capacityFormatted: this.formatBytes(pool.capacity),
      allocatedFormatted: this.formatBytes(pool.allocation),
      availableFormatted: this.formatBytes(pool.available),
      usage: this.calculateUsagePercentage(pool.allocation, pool.capacity)
    };
  }

  private async loadData() {
    try {
      await storagePoolActions.fetchAll();
    } catch (error) {
      console.error('Error loading storage pools:', error);
      this.showNotification(
        `Failed to load storage pools: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      );
    }
  }

  private getColumns(): Column[] {
    return [
      { key: 'name', label: 'Name', type: 'link' },
      { key: 'type', label: 'Type' },
      { key: 'state', label: 'State', type: 'status' },
      { key: 'capacityFormatted', label: 'Capacity' },
      { key: 'allocatedFormatted', label: 'Allocated' },
      { key: 'availableFormatted', label: 'Available' },
      { key: 'usage', label: 'Usage %' },
      { key: 'path', label: 'Path/Target' },
      { key: 'autostart', label: 'Autostart' }
    ];
  }

  private getActions(pool: StoragePoolDisplay): ActionItem[] {
    const actions: ActionItem[] = [
      { label: 'View Details', action: 'view' },
      { label: 'Browse', action: 'browse' }
    ];

    if (pool.state === 'active') {
      actions.push(
        { label: 'Refresh', action: 'refresh' },
        { label: 'Stop', action: 'stop' }
      );
    } else {
      actions.push(
        { label: 'Start', action: 'start' }
      );
    }

    actions.push(
      { label: 'Edit', action: 'edit' },
      { label: 'Delete', action: 'delete', danger: true }
    );

    return actions;
  }

  private getFilteredData(): StoragePoolDisplay[] {
    // Use the computed store value which already handles filtering
    const filteredPools = this.filteredPoolsController.value || [];

    // Transform to display format
    return filteredPools.map(pool => this.transformStoragePool(pool));
  }

  private async handleTabChange(event: CustomEvent) {
    storagePoolActions.setActiveTab(event.detail.tabId);
  }


  private handleCellClick(event: CustomEvent) {
    const pool = event.detail.item as StoragePoolDisplay;
    this.viewDetails(pool);
  }

  private handleAction(event: CustomEvent) {
    const { action, item } = event.detail;
    const pool = item as StoragePoolDisplay;

    switch (action) {
      case 'view':
        this.viewDetails(pool);
        break;
      case 'browse':
        this.browsePool(pool);
        break;
      case 'refresh':
        this.refreshPool(pool);
        break;
      case 'start':
      case 'stop':
        this.changePoolState(pool, action);
        break;
      case 'edit':
        this.editPool(pool);
        break;
      case 'delete':
        this.deletePool(pool);
        break;
    }
  }

  private viewDetails(pool: StoragePoolDisplay) {
    storagePoolActions.selectPool(pool.name);
    this.showDetails = true;
  }

  private browsePool(pool: StoragePoolDisplay) {
    console.log('Browsing pool:', pool.name);
    // Would open file browser for the pool
  }

  private async refreshPool(pool: StoragePoolDisplay) {
    try {
      await storagePoolActions.refresh(pool.name);
      this.showNotification(`Refreshed pool: ${pool.name}`, 'success');
    } catch (error) {
      this.showNotification(`Failed to refresh pool: ${pool.name}`, 'error');
    }
  }

  private async changePoolState(pool: StoragePoolDisplay, action: string) {
    try {
      if (action === 'start') {
        await storagePoolActions.start(pool.name);
        this.showNotification(`Starting pool: ${pool.name}`, 'success');
      } else if (action === 'stop') {
        await storagePoolActions.stop(pool.name);
        this.showNotification(`Stopping pool: ${pool.name}`, 'success');
      }
    } catch (error) {
      this.showNotification(
        `Failed to ${action} pool: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      );
    }
  }

  private editPool(pool: StoragePoolDisplay) {
    this.editingPool = pool;
    this.showEditDrawer = true;
  }

  private deletePool(pool: StoragePoolDisplay) {
    this.itemToDelete = {
      name: pool.name,
      type: 'Storage Pool'
    };
    // Check if pool has volumes
    this.hasVolumes = (pool.volumes && pool.volumes.length > 0) || false;
    this.volumeCount = pool.volumes?.length || 0;
    this.showDeleteModal = true;
  }

  private async handleDelete(event: CustomEvent) {
    if (!this.itemToDelete) return;

    const deleteVolumes = event.detail?.deleteVolumes || false;
    this.isDeleting = true;

    try {
      // Find the pool by name from the itemToDelete
      const poolToDelete = this.getFilteredData().find(pool => pool.name === this.itemToDelete?.name);
      if (poolToDelete) {
        // Call API directly with deleteVolumes parameter
        await virtualizationAPI.deleteStoragePool(poolToDelete.name, deleteVolumes);
        
        this.showNotification(`Storage pool "${poolToDelete.name}" deleted successfully`, 'success');
        
        // Refresh list with error handling to prevent race condition
        try {
          await storagePoolActions.fetchAll();
        } catch (fetchError) {
          console.warn('Failed to refresh pool list after delete:', fetchError);
          // Pool is still deleted on backend, just refresh failed
          // Don't show error to user since the delete operation succeeded
        }
      }

      this.showDeleteModal = false;
      this.itemToDelete = null;
      this.hasVolumes = false;
      this.volumeCount = 0;
    } catch (error: any) {
      console.error('Failed to delete storage pool:', error);
      
      // Handle specific error cases
      let errorMessage = 'Unknown error';
      if (error.message) {
        errorMessage = error.message;
        // Check for 409 Conflict (pool contains volumes)
        if (error.message.includes('volume') || error.code === 'POOL_NOT_EMPTY') {
          // Try to extract actual volume count from error message
          const match = error.message.match(/contains (\d+) volume/);
          const actualCount = match ? parseInt(match[1]) : this.volumeCount;
          errorMessage = `Cannot delete pool: contains ${actualCount} volume(s). Delete volumes first or check 'Delete all volumes' option.`;
        }
        // Check for 404 Not Found
        else if (error.code === 'NOT_FOUND' || error.message.includes('not found')) {
          errorMessage = 'Storage pool not found. It may have already been deleted.';
          // Close modal and refresh since pool no longer exists
          this.showDeleteModal = false;
          this.itemToDelete = null;
          this.hasVolumes = false;
          this.volumeCount = 0;
          try {
            await storagePoolActions.fetchAll();
          } catch (fetchError) {
            console.warn('Failed to refresh pool list:', fetchError);
          }
        }
      }
      
      this.showNotification(`Failed to delete storage pool: ${errorMessage}`, 'error');
    } finally {
      this.isDeleting = false;
    }
  }

  private handleCreateNew() {
    this.editingPool = null;
    this.showFormDrawer = true;
  }

  private handleSearchChange(e: CustomEvent) {
    storagePoolActions.setSearchQuery(e.detail.value);
  }

  private async handleFormSave(event: CustomEvent) {
    const { formData } = event.detail as { formData: StoragePoolFormData };
    this.isCreating = true;

    try {
      // Build the API payload
      const payload: any = {
        name: formData.name,
        type: formData.type,
        autostart: formData.autostart,
      };

      // Add type-specific fields
      if (formData.type === 'dir' && formData.path) {
        payload.path = formData.path;
      } else if (formData.type === 'netfs') {
        payload.source = formData.source;
        payload.target = formData.target;
      }

      await storagePoolActions.create(payload);
      this.showNotification(`Storage pool "${formData.name}" created successfully`, 'success');
      this.showFormDrawer = false;
    } catch (error: any) {
      console.error('Failed to create pool:', error);
      // Extract error message from API response
      let errorMessage = 'Unknown error';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.details) {
        errorMessage = error.details;
      }
      this.showNotification(`Failed to create storage pool: ${errorMessage}`, 'error');
    } finally {
      this.isCreating = false;
    }
  }

  private async handleEditSave(event: CustomEvent) {
    if (!this.editingPool) return;
    
    const { formData } = event.detail as { formData: StoragePoolFormData };
    this.isUpdating = true;

    try {
      // Only autostart can be updated
      await storagePoolActions.update(this.editingPool.name, {
        autostart: formData.autostart,
      });
      
      this.showNotification(`Storage pool "${this.editingPool.name}" updated successfully`, 'success');
      this.showEditDrawer = false;
      this.editingPool = null;
    } catch (error: any) {
      console.error('Failed to update pool:', error);
      let errorMessage = 'Unknown error';
      if (error.message) {
        errorMessage = error.message;
      }
      this.showNotification(`Failed to update storage pool: ${errorMessage}`, 'error');
    } finally {
      this.isUpdating = false;
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


  private getUsageClass(usage: number): string {
    if (usage >= 90) return 'usage-danger';
    if (usage >= 75) return 'usage-warning';
    return '';
  }

  private renderVirtualizationDisabledBanner(details?: string | null) {
    return html`
      <div class="virtualization-disabled-banner">
        <h2>Virtualization is disabled on this host</h2>
        <p>Virtualization features are currently unavailable because libvirt is not installed or not running.\
 To manage storage pools, install and start libvirt on this machine, then reload this page.</p>
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
    const filteredData = this.getFilteredData();
    // const stats = this.statsController.value || {
    //   totalPools: 0,
    //   activePools: 0,
    //   inactivePools: 0,
    //   totalCapacity: 0,
    //   totalAllocated: 0,
    //   totalAvailable: 0,
    //   localPools: 0,
    //   networkPools: 0,
    // }; // Reserved for future stats display
    const activeTab = this.activeTabController.value;
    const searchQuery = this.searchQueryController.value;
    const selectedPool = this.selectedPoolController.value;

    return html`
      <div class="container">

        <tab-group
          .tabs=${this.tabs}
          .activeTab=${activeTab}
          @tab-change=${this.handleTabChange}
        ></tab-group>

        <div class="controls">
          <search-input
            .placeholder=${'Search storage pools...'}
            .value=${searchQuery}
            @search-change=${this.handleSearchChange}
          ></search-input>
          <button class="btn-create" @click=${this.handleCreateNew}>
            <span>+ New Pool</span>
          </button>
        </div>

        <div class="content">
          ${state.loading ? html`
            <loading-state message="Loading storage pools..."></loading-state>
          ` : state.error ? html`
            <empty-state
              icon="❌"
              title="Error loading storage pools"
              description=${state.error.message}
            ></empty-state>
          ` : filteredData.length === 0 ? html`
            <empty-state
              icon="🗄️"
              title="No storage pools found"
              description=${searchQuery
          ? "No pools match your search criteria"
          : "Create your first storage pool to get started"}
            ></empty-state>
          ` : html`
            <resource-table
              .columns=${this.getColumns()}
              .data=${filteredData.map(pool => ({
            ...pool,
            autostart: pool.autostart ? 'Yes' : 'No',
            usage: html`
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span>${pool.usage}%</span>
                    <div class="usage-bar" style="width: 60px;">
                      <div class="usage-fill ${this.getUsageClass(pool.usage)}" 
                           style="width: ${pool.usage}%"></div>
                    </div>
                  </div>
                `
          }))}
              .getActions=${(item: StoragePoolDisplay) => this.getActions(item)}
              @cell-click=${this.handleCellClick}
              @action=${this.handleAction}
            ></resource-table>
          `}
        </div>

        ${this.showDetails && selectedPool ? html`
          <detail-drawer
            .title=${selectedPool.name || 'Pool Details'}
            .show=${this.showDetails}
            @close=${() => {
          this.showDetails = false;
          storagePoolActions.selectPool(null);
        }}
          >
            <div style="padding: 20px;">
              <h3>Storage Pool Information</h3>
              <div style="display: grid; grid-template-columns: 150px 1fr; gap: 12px; margin-bottom: 20px;">
                <strong>Name:</strong> <span>${selectedPool.name}</span>
                <strong>Type:</strong> <span>${selectedPool.type}</span>
                <strong>State:</strong> <span>${selectedPool.state}</span>
                <strong>Path:</strong> <span>${selectedPool.path}</span>
                <strong>Capacity:</strong> <span>${this.formatBytes(selectedPool.capacity)}</span>
                <strong>Allocated:</strong> <span>${this.formatBytes(selectedPool.allocation)}</span>
                <strong>Available:</strong> <span>${this.formatBytes(selectedPool.available)}</span>
                <strong>Usage:</strong> <span>${this.calculateUsagePercentage(selectedPool.allocation, selectedPool.capacity)}%</span>
                <strong>Autostart:</strong> <span>${selectedPool.autostart ? 'Yes' : 'No'}</span>
              </div>
              ${selectedPool.volumes && selectedPool.volumes.length > 0 ? html`
                <h4>Volumes (${selectedPool.volumes.length})</h4>
                <div style="max-height: 300px; overflow-y: auto;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                      <tr style="border-bottom: 1px solid var(--vscode-widget-border);">
                        <th style="text-align: left; padding: 8px;">Name</th>
                        <th style="text-align: left; padding: 8px;">Type</th>
                        <th style="text-align: left; padding: 8px;">Format</th>
                        <th style="text-align: right; padding: 8px;">Size</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${selectedPool.volumes.map(vol => html`
                        <tr style="border-bottom: 1px solid var(--vscode-widget-border);">
                          <td style="padding: 8px;">${vol.name}</td>
                          <td style="padding: 8px;">${vol.type}</td>
                          <td style="padding: 8px;">${vol.format}</td>
                          <td style="text-align: right; padding: 8px;">${this.formatBytes(vol.capacity)}</td>
                        </tr>
                      `)}
                    </tbody>
                  </table>
                </div>
              ` : ''}
            </div>
          </detail-drawer>
        ` : ''}

        
        
        
        ${this.showDeleteModal ? html`
          <delete-modal
            .show=${this.showDeleteModal}
            .item=${this.itemToDelete}
            .loading=${this.isDeleting}
            .hasVolumes=${this.hasVolumes}
            .volumeCount=${this.volumeCount}
            @confirm-delete=${this.handleDelete}
            @cancel-delete=${() => { 
              this.showDeleteModal = false; 
              this.itemToDelete = null; 
              this.hasVolumes = false;
              this.volumeCount = 0;
            }}
          ></delete-modal>
        ` : ''}

        <storage-pool-form-drawer
          .show=${this.showFormDrawer}
          .loading=${this.isCreating}
          .editMode=${false}
          .poolData=${null}
          @save=${this.handleFormSave}
          @close=${() => { this.showFormDrawer = false; }}
        ></storage-pool-form-drawer>

        <storage-pool-form-drawer
          .show=${this.showEditDrawer}
          .loading=${this.isUpdating}
          .editMode=${true}
          .poolData=${this.editingPool}
          @save=${this.handleEditSave}
          @close=${() => { this.showEditDrawer = false; this.editingPool = null; }}
        ></storage-pool-form-drawer>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'virtualization-storage-pools': VirtualizationStoragePools;
  }
}
