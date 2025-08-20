/**
 * Storage Pool Actions Component
 * Provides actions for managing storage pools
 */

import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { StoragePool } from '../../types/virtualization';
import { virtualizationAPI } from '../../services/virtualization-api';
import { notificationActions } from '../../stores/notifications';

@customElement('storage-pool-actions')
export class StoragePoolActions extends LitElement {
  @property({ type: Object }) pool!: StoragePool;

  static override styles = css`
    :host {
      display: block;
    }

    .actions-container {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 8px;
      padding: 12px 0;
    }

    .action-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 12px 8px;
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: 1px solid var(--vscode-button-border);
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s;
      text-align: center;
    }

    .action-btn:hover:not(:disabled) {
      background: var(--vscode-button-secondaryHoverBackground);
      transform: translateY(-1px);
    }

    .action-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .action-btn.danger {
      color: var(--vscode-inputValidation-errorForeground);
    }

    .action-btn.danger:hover:not(:disabled) {
      background: var(--vscode-inputValidation-errorBackground);
    }

    .action-icon {
      font-size: 20px;
    }

    .action-label {
      font-weight: 500;
    }

    .pool-info {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      padding: 16px;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-editorWidget-border);
      border-radius: 4px;
      margin-bottom: 16px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .info-label {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      text-transform: uppercase;
      font-weight: 600;
    }

    .info-value {
      font-size: 14px;
      color: var(--vscode-foreground);
      font-weight: 500;
    }

    .info-value.monospace {
      font-family: var(--vscode-editor-font-family);
      font-size: 13px;
    }

    .status-indicator {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-indicator.active {
      background: var(--vscode-testing-runAction);
      color: white;
    }

    .status-indicator.inactive {
      background: var(--vscode-inputValidation-errorBackground);
      color: var(--vscode-inputValidation-errorForeground);
    }

    .status-indicator.building {
      background: var(--vscode-inputValidation-warningBackground);
      color: var(--vscode-inputValidation-warningForeground);
    }
  `;

  private formatSize(bytes: number): string {
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1024) {
      return `${(gb / 1024).toFixed(2)} TB`;
    }
    return `${gb.toFixed(2)} GB`;
  }

  private async handleStart() {
    try {
      await virtualizationAPI.startStoragePool(this.pool.name);
      this.dispatchEvent(new CustomEvent('refresh', { bubbles: true, composed: true }));
      
      notificationActions.addNotification({
        type: 'success',
        title: 'Pool started',
        message: `Storage pool ${this.pool.name} started successfully`
      });
    } catch (error) {
      notificationActions.addNotification({
        type: 'error',
        title: 'Failed to start pool',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async handleStop() {
    if (!confirm(`Are you sure you want to stop storage pool "${this.pool.name}"?`)) {
      return;
    }

    try {
      await virtualizationAPI.stopStoragePool(this.pool.name);
      this.dispatchEvent(new CustomEvent('refresh', { bubbles: true, composed: true }));
      
      notificationActions.addNotification({
        type: 'success',
        title: 'Pool stopped',
        message: `Storage pool ${this.pool.name} stopped successfully`
      });
    } catch (error) {
      notificationActions.addNotification({
        type: 'error',
        title: 'Failed to stop pool',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async handleAutostart() {
    const newAutostart = !this.pool.autostart;
    
    try {
      await virtualizationAPI.setStoragePoolAutostart(this.pool.name, newAutostart);
      this.dispatchEvent(new CustomEvent('refresh', { bubbles: true, composed: true }));
      
      notificationActions.addNotification({
        type: 'success',
        title: 'Autostart updated',
        message: `Storage pool ${this.pool.name} autostart ${newAutostart ? 'enabled' : 'disabled'}`
      });
    } catch (error) {
      notificationActions.addNotification({
        type: 'error',
        title: 'Failed to update autostart',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async handleRefresh() {
    try {
      await virtualizationAPI.refreshStoragePool(this.pool.name);
      this.dispatchEvent(new CustomEvent('refresh', { bubbles: true, composed: true }));
      
      notificationActions.addNotification({
        type: 'success',
        title: 'Pool refreshed',
        message: `Storage pool ${this.pool.name} refreshed successfully`
      });
    } catch (error) {
      notificationActions.addNotification({
        type: 'error',
        title: 'Failed to refresh pool',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async handleDelete() {
    if (!confirm(`Are you sure you want to delete storage pool "${this.pool.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await virtualizationAPI.deleteStoragePool(this.pool.name);
      this.dispatchEvent(new CustomEvent('deleted', { bubbles: true, composed: true }));
      
      notificationActions.addNotification({
        type: 'success',
        title: 'Pool deleted',
        message: `Storage pool ${this.pool.name} deleted successfully`
      });
    } catch (error) {
      notificationActions.addNotification({
        type: 'error',
        title: 'Failed to delete pool',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private handleCreateVolume() {
    this.dispatchEvent(new CustomEvent('create-volume', {
      detail: { pool: this.pool },
      bubbles: true,
      composed: true
    }));
  }

  override render() {
    if (!this.pool) return html``;

    const isActive = this.pool.state === 'active';
    const canStart = !isActive && this.pool.state !== ('building' as any);
    const canStop = isActive;

    return html`
      <div class="pool-info">
        <div class="info-item">
          <div class="info-label">Status</div>
          <div class="info-value">
            <span class="status-indicator ${this.pool.state}">${this.pool.state}</span>
          </div>
        </div>
        <div class="info-item">
          <div class="info-label">Type</div>
          <div class="info-value">${this.pool.type}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Capacity</div>
          <div class="info-value">${this.formatSize(this.pool.capacity)}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Available</div>
          <div class="info-value">${this.formatSize(this.pool.available)}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Allocated</div>
          <div class="info-value">${this.formatSize(this.pool.allocation)}</div>
        </div>
        ${this.pool.path ? html`
          <div class="info-item">
            <div class="info-label">Path</div>
            <div class="info-value monospace">${this.pool.path}</div>
          </div>
        ` : ''}
      </div>

      <div class="actions-container">
        ${canStart ? html`
          <button class="action-btn" @click=${this.handleStart}>
            <span class="action-icon">▶️</span>
            <span class="action-label">Start</span>
          </button>
        ` : ''}
        
        ${canStop ? html`
          <button class="action-btn" @click=${this.handleStop}>
            <span class="action-icon">⏹️</span>
            <span class="action-label">Stop</span>
          </button>
        ` : ''}

        <button 
          class="action-btn" 
          @click=${this.handleAutostart}
          title="${this.pool.autostart ? 'Disable autostart' : 'Enable autostart'}"
        >
          <span class="action-icon">${this.pool.autostart ? '🔴' : '🟢'}</span>
          <span class="action-label">
            ${this.pool.autostart ? 'Disable Auto' : 'Enable Auto'}
          </span>
        </button>

        <button class="action-btn" @click=${this.handleRefresh}>
          <span class="action-icon">🔄</span>
          <span class="action-label">Refresh</span>
        </button>

        <button 
          class="action-btn"
          @click=${this.handleCreateVolume}
          ?disabled=${!isActive}
        >
          <span class="action-icon">➕</span>
          <span class="action-label">Add Volume</span>
        </button>

        <button class="action-btn danger" @click=${this.handleDelete}>
          <span class="action-icon">🗑️</span>
          <span class="action-label">Delete</span>
        </button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'storage-pool-actions': StoragePoolActions;
  }
}
