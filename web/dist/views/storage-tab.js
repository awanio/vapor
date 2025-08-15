var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { html, css } from 'lit';
import { property } from 'lit/decorators.js';
import { t } from '../i18n';
import { I18nLitElement } from '../i18n-mixin';
import { api } from '../api';
export class StorageTab extends I18nLitElement {
    constructor() {
        super(...arguments);
        this.disks = [];
        this.volumeGroups = [];
        this.logicalVolumes = [];
        this.physicalVolumes = [];
        this.raidDevices = [];
        this.availableRaidDisks = [];
        this.iscsiTargets = [];
        this.iscsiSessions = [];
        this.multipathDevices = [];
        this.btrfsSubvolumes = [];
        this.activeSection = 'disks';
        this.subRoute = null;
        this.loading = false;
        this.error = '';
    }
    static get properties() {
        return {
            subRoute: { type: String, attribute: 'sub-route' }
        };
    }
    connectedCallback() {
        super.connectedCallback();
        this.handlePopState = this.handlePopState.bind(this);
        window.addEventListener('popstate', this.handlePopState);
        this.updateActiveSection();
        this.loadData();
    }
    updated(changedProperties) {
        if (changedProperties.has('subRoute')) {
            this.updateActiveSection();
            this.loadData();
        }
    }
    updateActiveSection() {
        if (this.subRoute && ['disks', 'lvm', 'raid', 'iscsi', 'multipath', 'btrfs'].includes(this.subRoute)) {
            this.activeSection = this.subRoute;
            return;
        }
        const pathSegments = window.location.pathname.split('/');
        const section = pathSegments[pathSegments.length - 1];
        if (section && ['disks', 'lvm', 'raid', 'iscsi', 'multipath', 'btrfs'].includes(section)) {
            this.activeSection = section;
        }
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        window.removeEventListener('popstate', this.handlePopState);
    }
    handlePopState() {
        const pathSegments = window.location.pathname.split('/');
        const section = pathSegments[pathSegments.length - 1];
        if (section && ['disks', 'lvm', 'raid', 'iscsi', 'multipath', 'btrfs'].includes(section)) {
            this.activeSection = section;
            this.loadData();
        }
    }
    async loadData() {
        this.loading = true;
        this.error = '';
        try {
            switch (this.activeSection) {
                case 'disks':
                    await this.fetchDisks();
                    break;
                case 'lvm':
                    await this.fetchLVM();
                    break;
                case 'raid':
                    await this.fetchRAID();
                    break;
                case 'iscsi':
                    await this.fetchiSCSI();
                    break;
                case 'multipath':
                    await this.fetchMultipath();
                    break;
                case 'btrfs':
                    await this.fetchBTRFS();
                    break;
            }
        }
        catch (error) {
            const errorMessage = error?.message || 'Failed to load data';
            const errorDetails = error?.details || '';
            this.error = errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage;
            console.error('Storage tab error:', error);
        }
        finally {
            this.loading = false;
        }
    }
    async fetchDisks() {
        try {
            const response = await api.get('/storage/disks');
            this.disks = response?.disks || [];
        }
        catch (error) {
            console.error('Error fetching disks:', error);
            this.disks = [];
            throw error;
        }
    }
    async fetchLVM() {
        try {
            const [vgs, lvs, pvs] = await Promise.all([
                api.get('/storage/lvm/vgs'),
                api.get('/storage/lvm/lvs'),
                api.get('/storage/lvm/pvs')
            ]);
            this.volumeGroups = vgs?.volume_groups || [];
            this.logicalVolumes = lvs?.logical_volumes || [];
            this.physicalVolumes = pvs?.physical_volumes || [];
        }
        catch (error) {
            console.error('Error fetching LVM data:', error);
            this.volumeGroups = [];
            this.logicalVolumes = [];
            this.physicalVolumes = [];
            throw error;
        }
    }
    async fetchRAID() {
        try {
            const [devices, available] = await Promise.all([
                api.get('/storage/raid/devices'),
                api.get('/storage/raid/available-disks')
            ]);
            this.raidDevices = devices?.devices || [];
            this.availableRaidDisks = available?.disks || [];
        }
        catch (error) {
            console.error('Error fetching RAID data:', error);
            this.raidDevices = [];
            this.availableRaidDisks = [];
            throw error;
        }
    }
    async fetchiSCSI() {
        try {
            const sessions = await api.get('/storage/iscsi/sessions');
            this.iscsiSessions = sessions?.sessions || [];
        }
        catch (error) {
            console.error('Error fetching iSCSI data:', error);
            this.iscsiSessions = [];
            throw error;
        }
    }
    async fetchMultipath() {
        try {
            const devices = await api.get('/storage/multipath/devices');
            this.multipathDevices = devices?.devices || [];
        }
        catch (error) {
            console.error('Error fetching multipath data:', error);
            this.multipathDevices = [];
            throw error;
        }
    }
    async fetchBTRFS() {
        this.btrfsSubvolumes = [];
    }
    formatBytes(bytes) {
        if (bytes === 0)
            return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    renderDisksSection() {
        if (this.disks.length === 0) {
            return html `<div class="empty-state">${t('storage.disks.empty')}</div>`;
        }
        return html `
      ${this.disks.map(disk => html `
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">${disk.name} - ${disk.model || 'Unknown Model'}</h3>
            <span>${this.formatBytes(disk.size)}</span>
          </div>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">${t('storage.disks.type')}</span>
              <span class="info-value">${disk.type}</span>
            </div>
            <div class="info-item">
              <span class="info-label">${t('storage.disks.serial')}</span>
              <span class="info-value">${disk.serial || 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">${t('storage.disks.removable')}</span>
              <span class="info-value">${disk.removable ? t('common.yes') : t('common.no')}</span>
            </div>
          </div>
          
          ${disk.partitions && disk.partitions.length > 0 ? html `
            <h4>${t('storage.disks.partitions')}</h4>
            <table class="table">
              <thead>
                <tr>
                  <th>${t('storage.disks.partition')}</th>
                  <th>${t('storage.disks.filesystem')}</th>
                  <th>${t('storage.disks.size')}</th>
                  <th>${t('storage.disks.used')}</th>
                  <th>${t('storage.disks.mountpoint')}</th>
                  <th>${t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                ${disk.partitions.map(partition => html `
                  <tr>
                    <td>${partition.name}</td>
                    <td>${partition.filesystem || 'Unknown'}</td>
                    <td>${this.formatBytes(partition.size)}</td>
                    <td>
                      ${partition.used ? html `
                        <div>
                          ${this.formatBytes(partition.used)} (${partition.use_percent?.toFixed(1)}%)
                          <div class="progress-bar">
                            <div class="progress-fill" style="width: ${partition.use_percent}%"></div>
                          </div>
                        </div>
                      ` : 'N/A'}
                    </td>
                    <td>${partition.mount_point || 'Not mounted'}</td>
                    <td>
                      ${partition.mount_point ? html `
                        <button class="btn-danger" @click=${() => this.unmountPartition(partition.mount_point)}>
                          ${t('storage.disks.unmount')}
                        </button>
                      ` : html `
                        <button class="btn-primary" @click=${() => this.mountPartition(partition.path, `/mnt/${partition.name}`)}>
                          ${t('storage.disks.mount')}
                        </button>
                      `}
                    </td>
                  </tr>
                `)}
              </tbody>
            </table>
          ` : ''}
        </div>
      `)}
    `;
    }
    renderLVMSection() {
        return html `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">${t('storage.lvm.volumeGroups')}</h3>
          <button class="btn-primary" @click=${this.showCreateVGDialog}>
            ${t('storage.lvm.createVG')}
          </button>
        </div>
        
        ${this.volumeGroups.length === 0 ? html `
          <div class="empty-state">${t('storage.lvm.noVolumeGroups')}</div>
        ` : html `
          <table class="table">
            <thead>
              <tr>
                <th>${t('common.name')}</th>
                <th>${t('storage.lvm.size')}</th>
                <th>${t('storage.lvm.free')}</th>
                <th>${t('storage.lvm.pvCount')}</th>
                <th>${t('storage.lvm.lvCount')}</th>
              </tr>
            </thead>
            <tbody>
              ${this.volumeGroups.map(vg => html `
                <tr>
                  <td>${vg.name}</td>
                  <td>${this.formatBytes(vg.size)}</td>
                  <td>${this.formatBytes(vg.free)}</td>
                  <td>${vg.pv_count}</td>
                  <td>${vg.lv_count}</td>
                </tr>
              `)}
            </tbody>
          </table>
        `}
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">${t('storage.lvm.logicalVolumes')}</h3>
          <button class="btn-primary" @click=${this.showCreateLVDialog}>
            ${t('storage.lvm.createLV')}
          </button>
        </div>
        
        ${this.logicalVolumes.length === 0 ? html `
          <div class="empty-state">${t('storage.lvm.noLogicalVolumes')}</div>
        ` : html `
          <table class="table">
            <thead>
              <tr>
                <th>${t('common.name')}</th>
                <th>${t('storage.lvm.volumeGroup')}</th>
                <th>${t('storage.lvm.size')}</th>
                <th>${t('storage.lvm.path')}</th>
              </tr>
            </thead>
            <tbody>
              ${this.logicalVolumes.map(lv => html `
                <tr>
                  <td>${lv.name}</td>
                  <td>${lv.vg_name}</td>
                  <td>${this.formatBytes(lv.size)}</td>
                  <td>${lv.path}</td>
                </tr>
              `)}
            </tbody>
          </table>
        `}
      </div>

      <div class="card">
        <h3 class="card-title">${t('storage.lvm.physicalVolumes')}</h3>
        
        ${this.physicalVolumes.length === 0 ? html `
          <div class="empty-state">${t('storage.lvm.noPhysicalVolumes')}</div>
        ` : html `
          <table class="table">
            <thead>
              <tr>
                <th>${t('common.name')}</th>
                <th>${t('storage.lvm.volumeGroup')}</th>
                <th>${t('storage.lvm.size')}</th>
                <th>${t('storage.lvm.free')}</th>
              </tr>
            </thead>
            <tbody>
              ${this.physicalVolumes.map(pv => html `
                <tr>
                  <td>${pv.name}</td>
                  <td>${pv.vg_name || 'N/A'}</td>
                  <td>${this.formatBytes(pv.size)}</td>
                  <td>${this.formatBytes(pv.free)}</td>
                </tr>
              `)}
            </tbody>
          </table>
        `}
      </div>
    `;
    }
    renderRAIDSection() {
        return html `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">${t('storage.raid.devices')}</h3>
          <button class="btn-primary" @click=${this.showCreateRAIDDialog}>
            ${t('storage.raid.createRAID')}
          </button>
        </div>
        
        ${this.raidDevices.length === 0 ? html `
          <div class="empty-state">${t('storage.raid.noDevices')}</div>
        ` : html `
          <table class="table">
            <thead>
              <tr>
                <th>${t('common.name')}</th>
                <th>${t('storage.raid.level')}</th>
                <th>${t('storage.raid.state')}</th>
                <th>${t('storage.raid.size')}</th>
                <th>${t('storage.raid.devices')}</th>
                <th>${t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              ${this.raidDevices.map(raid => html `
                <tr>
                  <td>${raid.name}</td>
                  <td>RAID ${raid.level}</td>
                  <td>
                    <span class="status-badge ${raid.state === 'active' ? 'active' : 'error'}">
                      ${raid.state}
                    </span>
                  </td>
                  <td>${this.formatBytes(raid.size)}</td>
                  <td>${raid.active_disks}/${raid.total_disks}</td>
                  <td>
                    <button class="btn-danger" @click=${() => this.destroyRAID(raid.path)}>
                      ${t('storage.raid.destroy')}
                    </button>
                  </td>
                </tr>
              `)}
            </tbody>
          </table>
        `}
      </div>

      <div class="card">
        <h3 class="card-title">${t('storage.raid.availableDisks')}</h3>
        
        ${this.availableRaidDisks.length === 0 ? html `
          <div class="empty-state">${t('storage.raid.noAvailableDisks')}</div>
        ` : html `
          <table class="table">
            <thead>
              <tr>
                <th>${t('storage.raid.device')}</th>
                <th>${t('storage.raid.size')}</th>
                <th>${t('storage.raid.partition')}</th>
              </tr>
            </thead>
            <tbody>
              ${this.availableRaidDisks.map(disk => html `
                <tr>
                  <td>${disk.path}</td>
                  <td>${this.formatBytes(disk.size)}</td>
                  <td>${disk.partition ? t('common.yes') : t('common.no')}</td>
                </tr>
              `)}
            </tbody>
          </table>
        `}
      </div>
    `;
    }
    renderISCSISection() {
        return html `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">${t('storage.iscsi.sessions')}</h3>
          <button class="btn-primary" @click=${this.showDiscoverISCSIDialog}>
            ${t('storage.iscsi.discover')}
          </button>
        </div>
        
        ${this.iscsiSessions.length === 0 ? html `
          <div class="empty-state">${t('storage.iscsi.noSessions')}</div>
        ` : html `
          <table class="table">
            <thead>
              <tr>
                <th>${t('storage.iscsi.target')}</th>
                <th>${t('storage.iscsi.portal')}</th>
                <th>${t('storage.iscsi.sessionId')}</th>
                <th>${t('storage.iscsi.state')}</th>
                <th>${t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              ${this.iscsiSessions.map(session => html `
                <tr>
                  <td>${session.target}</td>
                  <td>${session.portal}</td>
                  <td>${session.session_id}</td>
                  <td>
                    <span class="status-badge ${session.state === 'logged_in' ? 'active' : 'inactive'}">
                      ${session.state}
                    </span>
                  </td>
                  <td>
                    <button class="btn-danger" @click=${() => this.logoutISCSI(session.target)}>
                      ${t('storage.iscsi.logout')}
                    </button>
                  </td>
                </tr>
              `)}
            </tbody>
          </table>
        `}
      </div>

      ${this.iscsiTargets.length > 0 ? html `
        <div class="card">
          <h3 class="card-title">${t('storage.iscsi.discoveredTargets')}</h3>
          <table class="table">
            <thead>
              <tr>
                <th>${t('storage.iscsi.iqn')}</th>
                <th>${t('storage.iscsi.portal')}</th>
                <th>${t('storage.iscsi.connected')}</th>
                <th>${t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              ${this.iscsiTargets.map(target => html `
                <tr>
                  <td>${target.iqn}</td>
                  <td>${target.portal}</td>
                  <td>${target.connected ? t('common.yes') : t('common.no')}</td>
                  <td>
                    ${!target.connected ? html `
                      <button class="btn-primary" @click=${() => this.loginISCSI(target)}>
                        ${t('storage.iscsi.login')}
                      </button>
                    ` : ''}
                  </td>
                </tr>
              `)}
            </tbody>
          </table>
        </div>
      ` : ''}
    `;
    }
    renderMultipathSection() {
        return html `
      <div class="card">
        <h3 class="card-title">${t('storage.multipath.devices')}</h3>
        
        ${this.multipathDevices.length === 0 ? html `
          <div class="empty-state">${t('storage.multipath.noDevices')}</div>
        ` : html `
          ${this.multipathDevices.map(device => html `
            <div class="card">
              <div class="card-header">
                <h4 class="card-title">${device.name} - ${device.product}</h4>
                <span class="status-badge ${device.state === 'active' ? 'active' : 'error'}">
                  ${device.state}
                </span>
              </div>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">${t('storage.multipath.wwid')}</span>
                  <span class="info-value">${device.wwid}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">${t('storage.multipath.vendor')}</span>
                  <span class="info-value">${device.vendor}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">${t('storage.multipath.size')}</span>
                  <span class="info-value">${device.size}</span>
                </div>
              </div>
              
              <h5>${t('storage.multipath.paths')}</h5>
              <table class="table">
                <thead>
                  <tr>
                    <th>${t('storage.multipath.device')}</th>
                    <th>${t('storage.multipath.host')}</th>
                    <th>${t('storage.multipath.state')}</th>
                    <th>${t('storage.multipath.priority')}</th>
                  </tr>
                </thead>
                <tbody>
                  ${device.paths.map(path => html `
                    <tr>
                      <td>${path.device}</td>
                      <td>${path.host}</td>
                      <td>
                        <span class="status-badge ${path.state === 'active' ? 'active' : 'inactive'}">
                          ${path.state}
                        </span>
                      </td>
                      <td>${path.priority}</td>
                    </tr>
                  `)}
                </tbody>
              </table>
            </div>
          `)}
        `}
      </div>
    `;
    }
    renderBTRFSSection() {
        return html `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">${t('storage.btrfs.subvolumes')}</h3>
          <button class="btn-primary" @click=${this.showCreateSubvolumeDialog}>
            ${t('storage.btrfs.createSubvolume')}
          </button>
        </div>
        
        ${this.btrfsSubvolumes.length === 0 ? html `
          <div class="empty-state">${t('storage.btrfs.noSubvolumes')}</div>
        ` : html `
          <ul>
            ${this.btrfsSubvolumes.map(subvolume => html `
              <li>${subvolume}</li>
            `)}
          </ul>
        `}
      </div>
    `;
    }
    renderContent() {
        if (this.loading) {
            return html `<div class="loading">${t('common.loading')}</div>`;
        }
        if (this.error) {
            return html `<div class="error">${this.error}</div>`;
        }
        switch (this.activeSection) {
            case 'disks':
                return this.renderDisksSection();
            case 'lvm':
                return this.renderLVMSection();
            case 'raid':
                return this.renderRAIDSection();
            case 'iscsi':
                return this.renderISCSISection();
            case 'multipath':
                return this.renderMultipathSection();
            case 'btrfs':
                return this.renderBTRFSSection();
            default:
                return html ``;
        }
    }
    render() {
        return html `
      <div class="storage-container">
        <h1>${t(`storage.${this.activeSection}.title`)}</h1>
        <div class="content">
          ${this.renderContent()}
        </div>
      </div>
    `;
    }
    async mountPartition(device, mountPoint) {
        try {
            await api.post('/storage/mount', { device, mount_point: mountPoint });
            await this.fetchDisks();
        }
        catch (error) {
            console.error('Error mounting partition:', error);
        }
    }
    async unmountPartition(mountPoint) {
        try {
            await api.post('/storage/unmount', { mount_point: mountPoint });
            await this.fetchDisks();
        }
        catch (error) {
            console.error('Error unmounting partition:', error);
        }
    }
    async destroyRAID(device) {
        if (!confirm(t('storage.raid.confirmDestroy')))
            return;
        try {
            await api.post('/storage/raid/destroy', { device });
            await this.fetchRAID();
        }
        catch (error) {
            console.error('Error destroying RAID:', error);
        }
    }
    async logoutISCSI(target) {
        try {
            await api.post('/storage/iscsi/logout', { target });
            await this.fetchiSCSI();
        }
        catch (error) {
            console.error('Error logging out from iSCSI:', error);
        }
    }
    async loginISCSI(target) {
        try {
            await api.post('/storage/iscsi/login', {
                target: target.iqn,
                portal: target.portal
            });
            await this.fetchiSCSI();
        }
        catch (error) {
            console.error('Error logging in to iSCSI:', error);
        }
    }
    showCreateVGDialog() {
        console.log('Show create VG dialog');
    }
    showCreateLVDialog() {
        console.log('Show create LV dialog');
    }
    showCreateRAIDDialog() {
        console.log('Show create RAID dialog');
    }
    showDiscoverISCSIDialog() {
        console.log('Show discover iSCSI dialog');
    }
    showCreateSubvolumeDialog() {
        console.log('Show create subvolume dialog');
    }
}
StorageTab.styles = css `
    :host {
      display: block;
      height: 100%;
      overflow-y: auto;
    }

    .storage-container {
      padding: 20px;
      max-width: 1400px;
      margin: 0 auto;
    }

    h1 {
      margin: 0 0 24px 0;
      font-size: 24px;
      font-weight: 300;
    }


    .card {
      background: var(--vscode-bg-light);
      border: 1px solid var(--vscode-border);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .card-title {
      font-size: 16px;
      font-weight: 500;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
      font-size: 13px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .info-label {
      color: var(--vscode-text-dim);
      font-size: 12px;
    }

    .info-value {
      color: var(--vscode-text);
      font-family: var(--vscode-font-family-mono);
    }

    .actions {
      display: flex;
      gap: 8px;
      margin-top: 16px;
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

    .table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    .table th,
    .table td {
      padding: 8px;
      text-align: left;
      border-bottom: 1px solid var(--vscode-border);
    }

    .table th {
      font-weight: 500;
      color: var(--vscode-text-dim);
    }

    .status-badge {
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
    }

    .status-badge.active {
      background: var(--vscode-success);
      color: white;
    }

    .status-badge.inactive {
      background: var(--vscode-text-dim);
      color: white;
    }

    .status-badge.error {
      background: var(--vscode-error);
      color: white;
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

    .btn-secondary {
      background: var(--vscode-bg);
      color: var(--vscode-text);
      border: 1px solid var(--vscode-border);
    }

    .btn-secondary:hover {
      background: var(--vscode-bg-light);
    }

    .btn-danger {
      background: var(--vscode-error);
      color: white;
    }

    .btn-danger:hover {
      opacity: 0.9;
    }

    .empty-state {
      text-align: center;
      padding: 40px;
      color: var(--vscode-text-dim);
    }

    .loading {
      text-align: center;
      padding: 40px;
      color: var(--vscode-text-dim);
    }

    .error {
      color: var(--vscode-error);
      padding: 16px;
      background: var(--vscode-bg-light);
      border-radius: 8px;
      margin-bottom: 16px;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-label {
      display: block;
      margin-bottom: 4px;
      font-size: 13px;
      color: var(--vscode-text-dim);
    }

    .form-input {
      width: 100%;
      padding: 6px 8px;
      border: 1px solid var(--vscode-border);
      border-radius: 4px;
      background: var(--vscode-bg);
      color: var(--vscode-text);
      font-size: 13px;
    }

    .form-input:focus {
      outline: none;
      border-color: var(--vscode-accent);
    }

    .modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-content {
      background: var(--vscode-bg-light);
      border-radius: 8px;
      padding: 24px;
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .modal-title {
      font-size: 18px;
      font-weight: 500;
    }

    .close-button {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: var(--vscode-text-dim);
    }
  `;
__decorate([
    property({ type: Array })
], StorageTab.prototype, "disks", void 0);
__decorate([
    property({ type: Array })
], StorageTab.prototype, "volumeGroups", void 0);
__decorate([
    property({ type: Array })
], StorageTab.prototype, "logicalVolumes", void 0);
__decorate([
    property({ type: Array })
], StorageTab.prototype, "physicalVolumes", void 0);
__decorate([
    property({ type: Array })
], StorageTab.prototype, "raidDevices", void 0);
__decorate([
    property({ type: Array })
], StorageTab.prototype, "availableRaidDisks", void 0);
__decorate([
    property({ type: Array })
], StorageTab.prototype, "iscsiTargets", void 0);
__decorate([
    property({ type: Array })
], StorageTab.prototype, "iscsiSessions", void 0);
__decorate([
    property({ type: Array })
], StorageTab.prototype, "multipathDevices", void 0);
__decorate([
    property({ type: Array })
], StorageTab.prototype, "btrfsSubvolumes", void 0);
__decorate([
    property({ type: String })
], StorageTab.prototype, "activeSection", void 0);
__decorate([
    property({ type: String })
], StorageTab.prototype, "subRoute", void 0);
__decorate([
    property({ type: Boolean })
], StorageTab.prototype, "loading", void 0);
__decorate([
    property({ type: String })
], StorageTab.prototype, "error", void 0);
customElements.define('storage-tab', StorageTab);
//# sourceMappingURL=storage-tab.js.map