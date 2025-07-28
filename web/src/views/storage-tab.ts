import { LitElement, html, css, property } from 'lit';
import { t } from '../i18n';
import { api } from '../api';

export class StorageTab extends LitElement {
  @property({ type: Array }) disks = [];

  static styles = css`
    :host {
      display: block;
      padding: 16px;
    }

    .disk {
      background: var(--vscode-bg-light);
      color: var(--vscode-text);
      padding: 16px;
      border-radius: 6px;
      margin-bottom: 16px;
    }

    .disk-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: bold;
      margin-bottom: 8px;
    }

    .disk-info {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-bottom: 16px;
      font-size: 13px;
    }

    .partitions {
      margin-top: 16px;
      border-top: 1px solid var(--vscode-border);
      padding-top: 16px;
    }

    .partition {
      background: var(--vscode-bg);
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .partition-info {
      flex: 1;
    }

    .partition-actions {
      display: flex;
      gap: 8px;
    }

    .progress-bar {
      width: 100%;
      height: 8px;
      background: var(--vscode-bg);
      border-radius: 4px;
      overflow: hidden;
      margin-top: 4px;
    }

    .progress-fill {
      height: 100%;
      background: var(--vscode-accent);
      transition: width 0.3s ease;
    }

    button {
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s;
    }

    .btn-primary {
      background: var(--vscode-accent);
      color: white;
    }

    .btn-primary:hover {
      background: var(--vscode-accent-hover);
    }

    .btn-danger {
      background: var(--vscode-error);
      color: white;
    }

    .btn-danger:hover {
      opacity: 0.9;
    }

    .size-info {
      font-size: 12px;
      color: var(--vscode-text-dim);
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.fetchDisks();
  }

  async fetchDisks() {
    try {
      const data = await api.get('/storage/disks');
      this.disks = data.disks;
    } catch (error) {
      console.error('Error fetching disks:', error);
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async mountPartition(device, mountPoint) {
    try {
      await api.post('/storage/mount', { device, mount_point: mountPoint });
      this.fetchDisks();
    } catch (error) {
      console.error('Error mounting partition:', error);
    }
  }

  async unmountPartition(mountPoint) {
    try {
      await api.post('/storage/unmount', { mount_point: mountPoint });
      this.fetchDisks();
    } catch (error) {
      console.error('Error unmounting partition:', error);
    }
  }

  renderPartition(partition) {
    const usagePercent = partition.use_percent || 0;
    
    return html`
      <div class="partition">
        <div class="partition-info">
          <div><strong>${partition.name}</strong> - ${partition.filesystem || 'Unknown'}</div>
          <div class="size-info">
            ${this.formatBytes(partition.used || 0)} / ${this.formatBytes(partition.size)} 
            (${usagePercent.toFixed(1)}% used)
          </div>
          ${partition.mount_point ? html`
            <div>Mounted at: ${partition.mount_point}</div>
          ` : ''}
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${usagePercent}%"></div>
          </div>
        </div>
        <div class="partition-actions">
          ${partition.mount_point ? html`
            <button class="btn-danger" @click=${() => this.unmountPartition(partition.mount_point)}>
              ${t('storage.disks.unmount')}
            </button>
          ` : html`
            <button class="btn-primary" @click=${() => this.mountPartition(partition.path, '/mnt/' + partition.name)}>
              ${t('storage.disks.mount')}
            </button>
          `}
        </div>
      </div>
    `;
  }

  renderDisk(disk) {
    return html`
      <div class="disk">
        <div class="disk-header">
          <div>${disk.name} - ${disk.model || 'Unknown Model'}</div>
          <div>${this.formatBytes(disk.size)}</div>
        </div>
        <div class="disk-info">
          <div>${t('storage.disks.type')}: ${disk.type}</div>
          <div>${t('storage.disks.removable')}: ${disk.removable ? t('common.yes') : t('common.no')}</div>
          ${disk.serial ? html`<div>${t('storage.disks.serial')}: ${disk.serial}</div>` : ''}
        </div>
        ${disk.partitions && disk.partitions.length > 0 ? html`
          <div class="partitions">
            <h4>${t('storage.disks.partitions')}</h4>
            ${disk.partitions.map(partition => this.renderPartition(partition))}
          </div>
        ` : ''}
      </div>
    `;
  }

  render() {
    return html`
      <h1>${t('storage.disks.title')}</h1>
      ${this.disks.map(disk => this.renderDisk(disk))}
    `;
  }
}

customElements.define('storage-tab', StorageTab);
