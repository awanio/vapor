import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { VirtualMachine, VMBackup, BackupCreateRequest, BackupType, StoragePool } from '../../types/virtualization';
import virtualizationAPI from '../../services/virtualization-api';
import {
  $backups,
  backupActions,
  makeVmBackupsStore,
} from '../../stores/virtualization/backups';
import '../modal-dialog';
import '../ui/action-dropdown';
import type { ActionItem } from '../ui/action-dropdown';

@customElement('vm-backups-tab')
export class VMBackupsTab extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }
    .section {
      border: 1px solid var(--vscode-border);
      border-radius: 12px;
      padding: 16px;
      background: var(--vscode-editor-background, #1e1e1e);
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .section-title { font-size: 16px; margin: 0; }
    .section-actions { display: flex; gap: 8px; }
    .btn {
      padding: 8px 12px;
      border-radius: 4px;
      border: 1px solid var(--vscode-button-border, #5a5a5a);
      background: var(--vscode-button-secondaryBackground, #3c3c3c);
      color: var(--vscode-button-secondaryForeground, #cccccc);
      cursor: pointer;
      font-size: 13px;
    }
    .btn:hover { filter: brightness(1.05); }
    .btn.primary {
      background: var(--vscode-button-background, #0e639c);
      border-color: var(--vscode-button-border, #5a5a5a);
      color: var(--vscode-button-foreground, #ffffff);
    }
    .btn.danger {
      background: #a4262c;
      border-color: #a4262c;
      color: #ffffff;
    }
    .btn[disabled] { opacity: 0.6; cursor: not-allowed; }
    .table { width: 100%; border-collapse: collapse; }
    .table th, .table td { padding: 10px; border-bottom: 1px solid var(--vscode-border); text-align: left; font-size: 13px; }
    .table th { color: var(--vscode-descriptionForeground, #9ca3af); font-weight: 600; }
    .badge { padding: 2px 8px; border-radius: 999px; font-size: 12px; background: #1f2937; color: #e5e7eb; }
    .badge.success { background: #14532d; }
    .badge.error { background: #7f1d1d; }
    .badge.warning { background: #92400e; }
    .status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 999px; margin-right: 6px; }
    .status-running { background: #22c55e; }
    .status-pending { background: #eab308; }
    .status-failed { background: #ef4444; }
    .status-completed { background: #10b981; }
    .empty-state { text-align: center; padding: 24px 0; color: var(--vscode-descriptionForeground, #9ca3af); }
    .error-box { border: 1px solid #7f1d1d; background: #1f0f0f; color: #fecdd3; padding: 12px; border-radius: 8px; margin-bottom: 12px; }
    .toast { margin-bottom: 10px; padding: 10px; border-radius: 8px; }
    .toast.success { background: #0f172a; color: #bbf7d0; border: 1px solid #14532d; }
    .toast.error { background: #1f0f0f; color: #fecdd3; border: 1px solid #7f1d1d; }

    /* Form controls aligned with snapshot modals */
    .form-group { margin-bottom: 14px; width: 100%; box-sizing: border-box; }
    .form-group.checkbox { display: flex; align-items: flex-start; gap: 12px; }
    .form-group.checkbox input[type="checkbox"] { width: auto; margin-top: 2px; }
    .form-group label { display: block; margin-bottom: 6px; font-size: 13px; font-weight: 500; color: var(--vscode-foreground, #cccccc); }
    .form-hint { margin-top: 6px; font-size: 12px; color: var(--vscode-descriptionForeground, #8b8b8b); }
    .form-error { margin-top: 6px; color: var(--vscode-errorForeground, #f48771); font-size: 12px; }
    input, select, textarea { width: 100%; padding: 8px 12px; background: var(--vscode-input-background, #3c3c3c); color: var(--vscode-input-foreground, #cccccc); border: 1px solid var(--vscode-input-border, #858585); border-radius: 4px; font-size: 13px; font-family: inherit; transition: all 0.2s; box-sizing: border-box; }
    input:focus, select:focus, textarea:focus { outline: none; border-color: var(--vscode-focusBorder, #007acc); box-shadow: 0 0 0 1px var(--vscode-focusBorder, #007acc); }
    .checkbox-group { display: flex; flex-direction: row; gap: 10px; align-items: center; margin-bottom: 10px; }
    .checkbox-group input[type="checkbox"] { width: auto; flex-shrink: 0; }
    .chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 999px; background: #1f2937; color: #e5e7eb; font-size: 12px; }
    .small { font-size: 12px; color: #9ca3af; }

    /* Modal overlay styles */
    .modal-overlay {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      z-index: 9999;
      align-items: center;
      justify-content: center;
    }
    .modal-overlay.show {
      display: flex;
      animation: fadeIn 0.2s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .modal {
      background: var(--vscode-editor-background, #1e1e1e);
      border: 1px solid var(--vscode-border);
      border-radius: 8px;
      min-width: 400px;
      max-width: 600px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    }
    .modal-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 20px;
      border-bottom: 1px solid var(--vscode-border);
    }
    .modal-icon { font-size: 24px; }
    .modal-title {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--vscode-foreground, #cccccc);
    }
    .modal-body { padding: 20px; }
    .modal-message {
      margin: 0 0 16px 0;
      color: var(--vscode-foreground, #cccccc);
      line-height: 1.5;
    }
    .vm-info-box {
      background: var(--vscode-input-background, #3c3c3c);
      border: 1px solid var(--vscode-border);
      border-radius: 6px;
      padding: 12px;
      margin: 16px 0;
    }
    .vm-info-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
    }
    .vm-info-label {
      color: var(--vscode-descriptionForeground, #9ca3af);
      font-size: 13px;
    }
    .vm-info-value {
      color: var(--vscode-foreground, #cccccc);
      font-size: 13px;
      font-weight: 500;
    }
    .vm-info-value.monospace {
      font-family: monospace;
      font-size: 12px;
    }
    .warning-box {
      display: flex;
      gap: 12px;
      background: rgba(234, 179, 8, 0.1);
      border: 1px solid rgba(234, 179, 8, 0.3);
      border-radius: 6px;
      padding: 12px;
      margin-top: 16px;
    }
    .warning-icon { font-size: 20px; flex-shrink: 0; }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding: 16px 20px;
      border-top: 1px solid var(--vscode-border);
    }
    .modal-btn {
      padding: 8px 16px;
      border-radius: 4px;
      border: 1px solid var(--vscode-button-border, #5a5a5a);
      font-size: 13px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .modal-btn.cancel {
      background: var(--vscode-button-secondaryBackground, #3c3c3c);
      color: var(--vscode-button-foreground, #ffffff);
    }
    .modal-btn.delete {
      background: #a4262c;
      border-color: #a4262c;
      color: #ffffff;
    }
    .modal-btn:hover:not(:disabled) { filter: brightness(1.1); }
    .modal-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .spinner-small {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }


  `;

  @property({ type: Object }) vm: VirtualMachine | null = null;

  @state() private backups: VMBackup[] = [];
  @state() private isLoading = false;
  @state() private error: string | null = null;
  @state() private toast: { text: string; type: 'success' | 'error' | 'info' | 'warning' } | null = null;
  @state() private showCreateModal = false;
  @state() private showRestoreModal = false;
  @state() private restoreTarget: VMBackup | null = null;
  @state() private restoreNewName = "";
  @state() private restoreOverwrite = false;
  @state() private restoreKey = "";
  @state() private isCreating = false;
  @state() private isRestoring = false;
  @state() private showDeleteModal = false;
  @state() private deleteTarget: VMBackup | null = null;
  @state() private isDeleting = false;
  @state() private missingFiles = new Set<string>();

  @state() private storagePools: StoragePool[] = [];

  private backupWatcher?: () => void;
  private pollingHandle: number | null = null;

  private createForm: BackupCreateRequest = {
    backup_type: 'full',
    parent_backup_id: '',
    storage_pool: '',
    compression: 'none',
    encryption: 'none',
    include_memory: false,
    retention_days: 7,
    description: '',
  };

  override connectedCallback(): void {
    super.connectedCallback();
    this.backupWatcher = $backups.subscribe(() => this.syncFromStore());
    this.loadStoragePools();
  }
  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.backupWatcher?.();
    this.clearPolling();
  }

  override updated(changed: Map<string, unknown>): void {
    if (changed.has('vm')) {
      this.loadBackups();
    }
  }

  private async loadStoragePools() {
    try {
      const response = await virtualizationAPI.listStoragePools() as any;
      const pools = response?.pools || response?.data?.pools || (Array.isArray(response) ? response : []);
      this.storagePools = Array.isArray(pools) ? pools : [];
      console.log("Loaded storage pools:", this.storagePools);
    } catch (err) {
      console.error('Failed to load storage pools:', err);
    }
  }

  private syncFromStore() {
    if (!this.vm) {
      this.backups = [];
      return;
    }
    const list = makeVmBackupsStore(this.vm.id).get();
    this.backups = [...list].sort((a, b) =>
      (b.started_at || b.created_at || '').localeCompare(a.started_at || a.created_at || ''),
    );
    this.configurePolling();
  }

  private async loadBackups() {
    if (!this.vm) return;
    this.isLoading = true;
    this.error = null;
    try {
      await backupActions.fetchForVm(this.vm.id);
      this.syncFromStore();
    } catch (err: any) {
      this.error = err?.code === 'BACKUPS_NOT_AVAILABLE'
        ? 'Backups are not available on this host.'
        : err?.message || 'Failed to load backups';
    } finally {
      this.isLoading = false;
    }
  }

  private configurePolling() {
    this.clearPolling();
    const hasRunning = this.backups.some((b) => ['running', 'pending'].includes((b.status || '').toLowerCase()));
    if (hasRunning) {
      this.pollingHandle = window.setInterval(() => this.loadBackups(), 5000);
    }
  }

  private clearPolling() {
    if (this.pollingHandle) {
      window.clearInterval(this.pollingHandle);
      this.pollingHandle = null;
    }
  }

  private async handleCreate() {
    if (!this.vm) return;
    this.isCreating = true;
    try {
      const payload: BackupCreateRequest = { ...this.createForm };
      if (!payload.storage_pool) delete (payload as any).storage_pool;
      if (payload.encryption === 'none') delete (payload as any).encryption_key;
      if (!payload.parent_backup_id) delete (payload as any).parent_backup_id; // Let backend auto-find
      await backupActions.create(this.vm.id, payload);
      this.toast = { text: 'Backup started', type: 'success' };
      this.showCreateModal = false;
      this.loadBackups();
    } catch (err: any) {
      this.toast = { text: err?.message || 'Failed to create backup', type: 'error' };
    } finally {
      this.isCreating = false;
    }
  }

  private getActions(backup: VMBackup): ActionItem[] {
    const id = backup.backup_id;
    const isBusy = this.isRestoring || this.isDeleting;
    const isMissing = !!id && this.missingFiles.has(id);

    return [
      {
        label: 'Restore',
        action: 'restore',
        icon: '🔄',
        disabled: this.isRestoring
      },
      {
        label: 'Download',
        action: 'download',
        icon: '⬇️',
        disabled: isMissing
      },
      {
        label: 'Delete',
        action: 'delete',
        icon: '🗑️',
        danger: true,
        disabled: isBusy
      }
    ];
  }

  private handleAction(e: CustomEvent, backup: VMBackup) {
    const action = e.detail.action;
    switch (action) {
      case 'restore':
        this.openRestore(backup);
        break;
      case 'download':
        this.handleDownload(backup);
        break;
      case 'delete':
        this.handleDelete(backup);
        break;
    }
  }

  private handleDelete(backup: VMBackup) {
    this.deleteTarget = backup;
    this.showDeleteModal = true;
  }

  private async cancelDelete() {
    this.showDeleteModal = false;
  }

  private async confirmDelete() {
    if (!this.deleteTarget?.backup_id) return;

    this.isDeleting = true;
    const backupId = this.deleteTarget.backup_id;

    try {
      await backupActions.delete(backupId);
      this.toast = { text: 'Backup deleted', type: 'success' };
      this.showDeleteModal = false;
      this.loadBackups();
    } catch (err: any) {
      this.toast = { text: err?.message || 'Failed to delete backup', type: 'error' };
    } finally {
      this.isDeleting = false;
    }
  }

  private openRestore(backup: VMBackup) {
    this.restoreTarget = backup;
    this.restoreNewName = `${backup.vm_name || backup.vm_uuid || 'vm'}-restored`;
    this.restoreOverwrite = false;
    this.restoreKey = '';
    this.showRestoreModal = true;
  }

  private async confirmRestore() {
    if (!this.restoreTarget) return;
    this.isRestoring = true;
    try {
      await backupActions.restore({
        backup_id: this.restoreTarget.backup_id,
        overwrite: this.restoreOverwrite,
        new_vm_name: this.restoreOverwrite ? undefined : this.restoreNewName || `${this.restoreTarget.vm_name || 'vm'}-restored`,
        decryption_key: this.restoreKey || undefined,
      });
      this.toast = { text: 'Restore started', type: 'success' };
      this.showRestoreModal = false;
    } catch (err: any) {
      this.toast = { text: err?.message || 'Failed to restore backup', type: 'error' };
    } finally {
      this.isRestoring = false;
    }
  }

  private handleDownload(backup: VMBackup) {
    if (!backup.backup_id) return;

    try {
      const url = virtualizationAPI.getBackupDownloadUrl(backup.backup_id);

      // Create hidden link and click it
      const a = document.createElement('a');
      a.href = url;
      // Note: 'download' attribute only works for same-origin URLs or blob: URLs
      // but the server sends Content-Disposition header which should force download
      a.download = `${backup.vm_name || backup.vm_uuid || 'vm'}-${backup.backup_id}.qcow2`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      this.toast = { text: 'Download started', type: 'info' };
    } catch (err: any) {
      console.error('[Download] Error generating link:', err);
      this.toast = { text: err?.message || 'Failed to start download', type: 'error' };
    }
  }

  private formatDate(val?: string | null) {
    if (!val) return '—';
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return val;
    return d.toLocaleString();
  }

  private formatSize(bytes?: number) {
    if (!bytes) return '—';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = bytes;
    let idx = 0;
    while (value >= 1024 && idx < units.length - 1) {
      value /= 1024;
      idx++;
    }
    return `${value.toFixed(1)} ${units[idx]}`;
  }

  private renderStatus(status?: string) {
    const lower = (status || 'unknown').toLowerCase();
    const cls =
      lower === 'running' || lower === 'pending'
        ? 'status-pending'
        : lower === 'completed'
          ? 'status-completed'
          : lower === 'failed'
            ? 'status-failed'
            : 'status-running';
    return html`<span class="chip"><span class="status-dot ${cls}"></span>${status || 'unknown'}</span>`;
  }

  private renderTable() {
    if (this.isLoading) {
      return html`<div class="empty-state">Loading backups...</div>`;
    }
    if (this.error) {
      return html`<div class="error-box">${this.error}</div>`;
    }
    if (!this.backups.length) {
      return html`<div class="empty-state">No backups yet. Create one to get started.</div>`;
    }

    return html`
      <table class="table">
        <thead>
          <tr>
            <th>Status</th>
            <th>Type</th>
            <th>Created</th>
            <th>Size</th>
            <th>Destination</th>
            <th>Retention</th>
            <th>Memory</th>
            <th>Encryption</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${this.backups.map(
      (b) => html`
              <tr>
                <td>${this.renderStatus(b.status)}</td>
                <td>${b.type}</td>
                <td>${this.formatDate(b.started_at || b.created_at)}</td>
                <td>${this.formatSize(b.size_bytes || b.size)}</td>
                <td class="small">${b.destination_path || '—'}</td>
                <td>${b.retention_days ?? '—'}</td>
                <td>${b.include_memory ? 'Yes' : 'No'}</td>
                <td>${b.encryption && b.encryption !== 'none' ? b.encryption : 'None'}</td>
                <td>
                  <div style="display:flex; justify-content:flex-end;">
                    <action-dropdown
                      .actions=${this.getActions(b)}
                      .menuId=${`menu-${b.backup_id}`}
                      @action-click=${(e: CustomEvent) => this.handleAction(e, b)}
                    ></action-dropdown>
                  </div>
                  ${this.missingFiles.has(b.backup_id || '')
          ? html`<div class="small" style="color:#fbbf24;">File missing on disk</div>`
          : ''}
                  ${b.error_message ? html`<div class="small" style="color:#fca5a5;">${b.error_message}</div>` : ''}
                </td>
              </tr>
            `,
    )}
        </tbody>
      </table>
    `;
  }

  override render() {
    return html`
      <div class="section">
        <div class="section-header">
          <h3 class="section-title">Backups</h3>
          <div class="section-actions">
            <button class="btn" @click=${() => this.loadBackups()} ?disabled=${this.isLoading}>Refresh</button>
            <button class="btn primary" @click=${() => (this.showCreateModal = true)} ?disabled=${this.isLoading}>Create backup</button>
          </div>
        </div>
        ${this.toast
        ? html`<div class="toast ${this.toast.type}">${this.toast.text}</div>`
        : ''}
        ${this.renderTable()}
      </div>

      ${this.renderCreateModal()}
      ${this.renderRestoreModal()}
      ${this.renderDeleteModal()}
    `;
  }

  private renderCreateModal() {
    return html`
      <modal-dialog
        .center=${true}
        .open=${this.showCreateModal}
        .title=${'Create backup'}
        size="medium"
        @modal-close=${() => (this.showCreateModal = false)}
      >
        <div class="form-group">
          <label>Type</label>
          <select
            .value=${this.createForm.backup_type}
            @change=${(e: Event) => {
              this.createForm.backup_type = (e.target as HTMLSelectElement).value as BackupType;
              this.createForm.parent_backup_id = ''; // Reset parent when type changes
              this.requestUpdate();
            }}
          >
            <option value="full">Full</option>
            <option value="incremental">Incremental</option>
            <option value="differential">Differential</option>
          </select>
          ${this.createForm.backup_type === 'incremental' ? html`
            <div class="form-hint">Backs up only changes since the selected parent backup.</div>
          ` : ''}
          ${this.createForm.backup_type === 'differential' ? html`
            <div class="form-hint">Backs up only changes since the last full backup (auto-selected).</div>
          ` : ''}
        </div>
        ${this.createForm.backup_type === 'incremental' ? html`
          <div class="form-group">
            <label>Parent backup</label>
            <select
              .value=${this.createForm.parent_backup_id || ''}
              @change=${(e: Event) => (this.createForm.parent_backup_id = (e.target as HTMLSelectElement).value)}
            >
              <option value="">Auto-select latest backup</option>
              ${this.backups
                .filter(b => b.status === 'completed')
                .map(b => html`<option value=${b.backup_id}>${b.type} - ${this.formatDate(b.started_at || b.created_at)} ${b.backup_id?.substring(0, 8)}...</option>`)}
            </select>
            <div class="form-hint">Leave empty to use the most recent backup.</div>
          </div>
        ` : ''}
        <div class="form-group">
          <label>Storage pool</label>
          <select
            .value=${this.createForm.storage_pool || ''}
            @change=${(e: Event) => (this.createForm.storage_pool = (e.target as HTMLSelectElement).value)}
          >
            <option value="">Use default location</option>
            ${(this.storagePools || [])
              .filter(p => p.path)
              .map(p => html`<option value=${p.name}>${p.name} (${this.formatSize(p.available)} free)</option>`)}
          </select>
          <div class="form-hint">Select a storage pool for the backup or use the default location.</div>
        </div>
        <div class="form-group">
          <label>Compression</label>
          <select
            .value=${this.createForm.compression as string}
            @change=${(e: Event) => (this.createForm.compression = (e.target as HTMLSelectElement).value)}
          >
            <option value="none">None</option>
            <option value="gzip">gzip</option>
            <option value="zstd">zstd</option>
            <option value="xz">xz</option>
          </select>
        </div>
        <div class="form-group">
          <label>Encryption</label>
          <select
            .value=${this.createForm.encryption as string}
            @change=${(e: Event) => (this.createForm.encryption = (e.target as HTMLSelectElement).value)}
          >
            <option value="none">None</option>
            <option value="aes-256">AES-256</option>
            <option value="aes-128">AES-128</option>
          </select>
        </div>
        ${this.createForm.encryption && this.createForm.encryption !== 'none'
        ? html`<div class="form-group">
              <label>Encryption key</label>
              <input
                type="password"
                .value=${(this.createForm as any).encryption_key || ''}
                @input=${(e: Event) => ((this.createForm as any).encryption_key = (e.target as HTMLInputElement).value)}
              />
            </div>`
        : ''}
        <div class="form-group checkbox">
          <input
            type="checkbox"
            .checked=${this.createForm.include_memory || false}
            @change=${(e: Event) => (this.createForm.include_memory = (e.target as HTMLInputElement).checked)}
          />
          <div>
            <label>Include memory</label>
            <div class="form-hint">Capture RAM state if supported.</div>
          </div>
        </div>
        <div class="form-group">
          <label>Retention days</label>
          <input
            type="number"
            min="1"
            .value=${String(this.createForm.retention_days ?? '')}
            @input=${(e: Event) => (this.createForm.retention_days = Number((e.target as HTMLInputElement).value))}
          />
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea
            rows="2"
            .value=${this.createForm.description || ''}
            @input=${(e: Event) => (this.createForm.description = (e.target as HTMLTextAreaElement).value)}
          ></textarea>
        </div>
        <div slot="footer" style="display:flex; justify-content:flex-end; gap:8px;">
          <button class="btn" @click=${() => (this.showCreateModal = false)} ?disabled=${this.isCreating}>Cancel</button>
          <button class="btn primary" @click=${() => this.handleCreate()} ?disabled=${this.isCreating}>
            ${this.isCreating ? 'Creating…' : 'Create backup'}
          </button>
        </div>
      </modal-dialog>
    `;
  }
  private renderDeleteModal() {
    if (!this.deleteTarget) return html``;

    return html`
      <modal-dialog
        .center=${true}
        .open=${this.showDeleteModal}
        .title=${'Delete Backup'}
        size="medium"
        @modal-close=${this.cancelDelete}
      >
        <p style="margin: 0 0 16px 0; line-height: 1.5;">
          Are you sure you want to delete this backup? This action cannot be undone.
        </p>

        <div style="background: var(--vscode-input-background, #3c3c3c); border: 1px solid var(--vscode-widget-border, #454545); border-radius: 6px; padding: 12px; margin: 16px 0;">
          <div style="display: flex; justify-content: space-between; padding: 6px 0;">
            <span style="color: var(--vscode-descriptionForeground, #9ca3af); font-size: 13px;">VM:</span>
            <span style="color: var(--vscode-foreground, #cccccc); font-size: 13px; font-weight: 500;">${this.deleteTarget.vm_name}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 6px 0;">
            <span style="color: var(--vscode-descriptionForeground, #9ca3af); font-size: 13px;">Backup ID:</span>
            <span style="color: var(--vscode-foreground, #cccccc); font-size: 13px; font-weight: 500; font-family: monospace;">${this.deleteTarget.backup_id}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 6px 0;">
            <span style="color: var(--vscode-descriptionForeground, #9ca3af); font-size: 13px;">Type:</span>
            <span style="color: var(--vscode-foreground, #cccccc); font-size: 13px; font-weight: 500;">${this.deleteTarget.type}</span>
          </div>
        </div>

        <div style="display: flex; gap: 12px; background: rgba(234, 179, 8, 0.1); border: 1px solid rgba(234, 179, 8, 0.3); border-radius: 6px; padding: 12px; margin-top: 16px;">
          <span style="font-size: 20px; flex-shrink: 0;">⚠️</span>
          <div>
            <strong>Warning:</strong> Deleting a backup is permanent and cannot be undone.
          </div>
        </div>

        <div slot="footer" style="display: flex; justify-content: flex-end; gap: 8px;">
          <button class="btn" @click=${() => this.cancelDelete()} ?disabled=${this.isDeleting}>
            Cancel
          </button>
          <button class="btn danger" @click=${() => this.confirmDelete()} ?disabled=${this.isDeleting}>
            ${this.isDeleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </modal-dialog>
    `;
  }

  private renderRestoreModal() {
    if (!this.restoreTarget) return html``;
    return html`
      <modal-dialog
        .center=${true}
        .open=${this.showRestoreModal}
        .title=${'Restore backup'}
        size="medium"
        @modal-close=${() => (this.showRestoreModal = false)}
      >
        <div class="form-group">
          <label>New VM name</label>
          <input
            type="text"
            .value=${this.restoreNewName}
            @input=${(e: Event) => (this.restoreNewName = (e.target as HTMLInputElement).value)}
            ?disabled=${this.restoreOverwrite}
          />
          <div class="form-hint">Leave blank and enable overwrite to restore into existing VM.</div>
        </div>
        <div class="checkbox-group">
          <input
            type="checkbox"
            .checked=${this.restoreOverwrite}
            @change=${(e: Event) => (this.restoreOverwrite = (e.target as HTMLInputElement).checked)}
          />
          <div>
            <div>Overwrite existing VM</div>
            <div class="form-hint">Unchecked creates a new VM named above.</div>
          </div>
        </div>
        ${this.restoreTarget.encryption && this.restoreTarget.encryption !== 'none'
        ? html`<div class="form-group">
              <label>Decryption key</label>
              <input
                type="password"
                .value=${this.restoreKey}
                @input=${(e: Event) => (this.restoreKey = (e.target as HTMLInputElement).value)}
              />
            </div>`
        : ''}
        <div slot="footer" style="display:flex; justify-content:flex-end; gap:8px;">
          <button class="btn" @click=${() => (this.showRestoreModal = false)} ?disabled=${this.isRestoring}>Cancel</button>
          <button class="btn primary" @click=${() => this.confirmRestore()} ?disabled=${this.isRestoring}>
            ${this.isRestoring ? 'Restoring…' : 'Restore'}
          </button>
        </div>
      </modal-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'vm-backups-tab': VMBackupsTab;
  }
}
