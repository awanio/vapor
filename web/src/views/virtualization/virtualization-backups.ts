import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import type { VMBackup, BackupCreateRequest, BackupType } from '../../types/virtualization';
import virtualizationAPI from '../../services/virtualization-api';
import { $backups, backupActions } from '../../stores/virtualization/backups';
import { vmStore } from '../../stores/virtualization';
import '../../components/tables/resource-table';
import type { Column, ActionItem } from '../../components/tables/resource-table';
import '../../components/ui/empty-state';
import '../../components/ui/loading-state';
import '../../components/ui/search-input';
import '../../components/drawers/detail-drawer';
import '../../components/modal-dialog';

@customElement('virtualization-backups')
export class VirtualizationBackupsView extends LitElement {
  static override styles = css`
    :host { display: block; height: 100%; }
    .page { padding: 16px; color: var(--vscode-foreground, #e5e7eb); }
    .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .title { font-size: 20px; margin: 0; }
    .controls { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
    .filters { display: flex; gap: 8px; align-items: center; }
    .filters select { 
      height: 36px; 
      padding: 8px 32px 8px 12px; 
      border-radius: 4px; 
      border: 1px solid var(--vscode-input-border, #3c3c3c); 
      background: var(--vscode-input-background, #3c3c3c); 
      color: var(--vscode-input-foreground, #cccccc); 
      font-size: 13px;
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23cccccc' d='M2 4l4 4 4-4z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 10px center;
    }
    .filters select:focus { outline: none; border-color: var(--vscode-focusBorder, #007acc); box-shadow: 0 0 0 1px var(--vscode-focusBorder, #007acc); }
    .actions { display: flex; gap: 8px; align-items: center; }
    .btn { height: 36px; padding: 0 16px; border-radius: 4px; border: 1px solid var(--vscode-border, #464647); background: var(--vscode-bg-lighter, #2d2d30); color: var(--vscode-text, #cccccc); cursor: pointer; font-size: 13px; font-weight: 500; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s; }
    .btn:hover:not([disabled]) { background: var(--surface-3, #3e3e42); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-primary { background: var(--vscode-accent, #007acc); color: #ffffff; border-color: var(--vscode-accent, #007acc); }
    .btn-primary:hover:not([disabled]) { background: var(--vscode-accent-hover, #1a86d9); border-color: var(--vscode-accent-hover, #1a86d9); }
    .btn-danger { background: #a4262c; border-color: #a4262c; color: #ffffff; }
    .btn-danger:hover:not([disabled]) { background: #c42b32; border-color: #c42b32; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px 10px; border-bottom: 1px solid var(--vscode-widget-border, #2a2f3a); text-align: left; font-size: 13px; }
    th { color: var(--vscode-descriptionForeground, #9ca3af); font-weight: 600; }
    tr:hover td { background: rgba(255,255,255,0.02); }
    .chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 999px; background: #1f2937; color: #e5e7eb; font-size: 12px; }
    .chip.warn { background: #92400e; }
    .chip.missing { background: #78350f; }
    .empty { text-align: center; padding: 48px 0; color: var(--vscode-descriptionForeground, #9ca3af); }
    dialog, detail-drawer { color: var(--vscode-foreground, #e5e7eb); }
    .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
    .field.checkbox { flex-direction: row; align-items: center; gap: 12px; }
    .field.checkbox input[type="checkbox"] { width: auto; margin: 0; }
    .field label { color: var(--vscode-foreground, #cccccc); font-size: 13px; font-weight: 500; }
    .field input, .field select, .field textarea { width: 100%; padding: 8px 12px; border-radius: 4px; border: 1px solid var(--vscode-input-border, #3c3c3c); background: var(--vscode-input-background, #3c3c3c); color: var(--vscode-input-foreground, #cccccc); font-size: 13px; font-family: inherit; box-sizing: border-box; transition: all 0.2s; }
    .field input:focus, .field select:focus, .field textarea:focus { outline: none; border-color: var(--vscode-focusBorder, #007acc); box-shadow: 0 0 0 1px var(--vscode-focusBorder, #007acc); }
    .field select { cursor: pointer; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23cccccc' d='M2 4l4 4 4-4z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 36px; }
    .field textarea { resize: vertical; min-height: 60px; }
    .drawer-content { padding: 16px; }
    .drawer-footer { display: flex; gap: 8px; justify-content: flex-end; padding: 12px 16px; border-top: 1px solid var(--vscode-border, #464647); }
    .toast { margin-bottom: 10px; padding: 10px; border-radius: 8px; }
    .toast.success { background: #0f172a; color: #bbf7d0; border: 1px solid #14532d; }
    .toast.error { background: #1f0f0f; color: #fecdd3; border: 1px solid #7f1d1d; }
  `;

  @state() private backups: VMBackup[] = [];
  @state() private loading = false;
  @state() private error: string | null = null;
  @state() private search = '';
  @state() private status = 'all';
  @state() private type: BackupType | 'all' = 'all';
  @state() private toast: { text: string; type: 'success' | 'error' | 'info' } | null = null;
  @state() private showImportDrawer = false;
  @state() private showCreateDrawer = false;
  @state() private showRestore = false;
  @state() private restoreTarget: VMBackup | null = null;
  @state() private restoreNewName = '';
  @state() private restoreOverwrite = false;
  @state() private restoreKey = '';
  @state() private deletingId: string | null = null;
  @state() private downloadingId: string | null = null;
  @state() private missingFiles = new Set<string>();
  @state() private showDeleteModal = false;
  @state() private deleteTarget: VMBackup | null = null;

  private backupsUnsub?: () => void;
  private vmsUnsub?: () => void;

  private importForm = {
    path: '',
    vm_name: '',
    vm_uuid: '',
    backup_id: '',
    type: 'full' as BackupType,
    compression: 'none',
    encryption: 'none',
    retention_days: 7,
    description: '',
  };

  private createForm: BackupCreateRequest & { vm_id?: string } = {
    vm_id: '',
    backup_type: 'full',
    destination_path: '',
    compression: 'none',
    encryption: 'none',
    include_memory: false,
    retention_days: 7,
    description: '',
  };

  override connectedCallback(): void {
    super.connectedCallback();
    this.backupsUnsub = $backups.subscribe(() => this.sync());
    this.vmsUnsub = vmStore.$items.subscribe(() => this.requestUpdate());
    this.loadVMs();
    this.loadBackups();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.backupsUnsub?.();
    this.vmsUnsub?.();
  }

  private async loadVMs() {
    try {
      await vmStore.fetch();
    } catch (err) {
      console.warn('VM fetch failed', err);
    }
  }

  private vmMap() {
    const items = vmStore.$items.get();
    if (items instanceof Map) return items;
    if (items && typeof items === 'object') return new Map(Object.entries(items as any));
    return new Map();
  }

  private vmExists(backup: VMBackup) {
    const map = this.vmMap();
    const key = backup.vm_uuid || backup.vm_id;
    return key ? map.has(key) : false;
  }

  private async loadBackups() {
    this.loading = true;
    this.error = null;
    try {
      await backupActions.fetchGlobal({
        search: this.search.trim() || undefined,
        status: this.status !== 'all' ? this.status : undefined,
        type: this.type !== 'all' ? this.type : undefined,
      });
      this.sync();
    } catch (err: any) {
      this.error = err?.message || 'Failed to load backups';
    } finally {
      this.loading = false;
    }
  }

  private sync() {
    const list = $backups.get();
    this.backups = [...list].sort((a, b) => (b.started_at || b.created_at || '').localeCompare(a.started_at || a.created_at || ''));
  }

  private filteredBackups() {
    return this.backups.filter((b) => {
      if (this.status !== 'all' && (b.status || '').toLowerCase() !== this.status) return false;
      if (this.type !== 'all' && b.type !== this.type) return false;
      if (this.search) {
        const q = this.search.toLowerCase();
        const hay = `${b.vm_name || ''} ${b.vm_uuid || ''} ${b.backup_id || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  private columns(): Column[] {
    return [
      { key: 'vm_display', label: 'VM' },
      { key: 'status_display', label: 'Status', type: 'status' },
      { key: 'type', label: 'Type' },
      { key: 'created_display', label: 'Created' },
      { key: 'size_display', label: 'Size' },
      { key: 'destination_display', label: 'Destination' },
      { key: 'encryption_display', label: 'Encryption' },
    ];
  }

  private tableData() {
    return this.filteredBackups().map((b) => ({
      ...b,
      vm_display: html`${b.vm_name || b.vm_uuid || '—'}${!this.vmExists(b) ? html` <span class="chip warn">VM deleted</span>` : ''}`,
      status_display: b.status || 'unknown',
      created_display: this.formatDate(b.started_at || b.created_at),
      size_display: this.formatSize(b.size_bytes || b.size),
      destination_display: b.destination_path || '—',
      encryption_display: b.encryption && b.encryption !== 'none' ? b.encryption : 'None',
    }));
  }

  private getActions = (item: VMBackup): ActionItem[] => {
    const id = item.backup_id || item.id || null;
    const isDeleting = !!id && this.deletingId === id;
    const isDownloading = !!id && this.downloadingId === id;
    const busy = isDeleting || isDownloading;

    const missing = !!id && this.missingFiles.has(id);

    return [
      { label: 'Restore', action: 'restore', disabled: busy },
      {
        label: isDownloading ? 'Downloading…' : missing ? 'Download (missing)' : 'Download',
        action: 'download',
        disabled: busy || missing,
      },
      { label: isDeleting ? 'Deleting…' : 'Delete', action: 'delete', danger: true, disabled: busy },
    ];
  };


  private handleAction(event: CustomEvent) {
    const { action, item } = event.detail;
    const backup = item as VMBackup;
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

  private setToast(text: string, type: 'success' | 'error' | 'info' = 'info') {
    this.toast = { text, type };
    setTimeout(() => (this.toast = null), 3000);
  }

  private handleDelete(b: VMBackup) {
    if (!b.backup_id) return;
    this.deleteTarget = b;
    this.showDeleteModal = true;
  }

  private async confirmDelete() {
    if (!this.deleteTarget?.backup_id) return;
    const id = this.deleteTarget.backup_id;
    this.deletingId = id;
    try {
      await backupActions.delete(id);
      this.setToast('Backup deleted', 'success');
      this.showDeleteModal = false;
      await this.updateComplete;
      this.deleteTarget = null;
      this.loadBackups();
    } catch (err: any) {
      this.setToast(err?.message || 'Failed to delete', 'error');
    } finally {
      this.deletingId = null;
    }
  }

  private handleDownload(b: VMBackup) {
    if (!b.backup_id) return;

    try {
      const url = virtualizationAPI.getBackupDownloadUrl(b.backup_id);

      const a = document.createElement('a');
      a.href = url;
      a.download = `${b.vm_name || b.vm_uuid || 'vm'}-${b.backup_id}.qcow2`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      this.setToast('Download started', 'info');
    } catch (err: any) {
      this.setToast(err?.message || 'Failed to start download', 'error');
    }
    // No need to set downloading state as it's a direct link
    this.downloadingId = null;
  }

  private openRestore(b: VMBackup) {
    this.restoreTarget = b;
    this.restoreNewName = `${b.vm_name || b.vm_uuid || 'vm'}-restored`;
    this.restoreOverwrite = false;
    this.restoreKey = '';
    this.showRestore = true;
  }

  private async confirmRestore() {
    if (!this.restoreTarget) return;
    try {
      await backupActions.restore({
        backup_id: this.restoreTarget.backup_id,
        overwrite: this.restoreOverwrite,
        new_vm_name: this.restoreOverwrite ? undefined : this.restoreNewName || `${this.restoreTarget.vm_name || 'vm'}-restored`,
        decryption_key: this.restoreKey || undefined,
      });
      this.setToast('Restore started', 'success');
      this.showRestore = false;
    } catch (err: any) {
      this.setToast(err?.message || 'Restore failed', 'error');
    }
  }

  private async handleImport() {
    try {
      await backupActions.import({
        path: this.importForm.path,
        vm_name: this.importForm.vm_name,
        vm_uuid: this.importForm.vm_uuid || undefined,
        backup_id: this.importForm.backup_id || undefined,
        type: this.importForm.type,
        compression: this.importForm.compression,
        encryption: this.importForm.encryption,
        retention_days: this.importForm.retention_days,
        description: this.importForm.description,
      });
      this.setToast('Backup imported', 'success');
      this.showImportDrawer = false;
      this.loadBackups();
    } catch (err: any) {
      this.setToast(err?.message || 'Import failed', 'error');
    }
  }

  private async handleCreate() {
    if (!this.createForm.vm_id) {
      this.setToast('Select a VM', 'error');
      return;
    }
    try {
      const payload: BackupCreateRequest = { ...this.createForm } as BackupCreateRequest;
      delete (payload as any).vm_id;
      await backupActions.create(this.createForm.vm_id, payload);
      this.setToast('Backup started', 'success');
      this.showCreateDrawer = false;
      this.loadBackups();
    } catch (err: any) {
      this.setToast(err?.message || 'Create failed', 'error');
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

  private renderTable() {
    const data = this.tableData();
    if (this.loading) return html`<loading-state message="Loading backups..."></loading-state>`;
    if (data.length === 0) {
      return html`
        <empty-state
          icon="💾"
          title="No backups found."
          description="Import an existing backup or create a new one."
        >
          <div slot="actions" style="display:flex; gap:8px; justify-content:center;">
            <button class="btn" @click=${() => (this.showImportDrawer = true)}>Import backup</button>
            <button class="btn btn-primary" @click=${() => (this.showCreateDrawer = true)}>Create backup</button>
          </div>
        </empty-state>
      `;
    }

    const customRenderers = {
      vm_display: (v: any) => v,
      destination_display: (v: any) => v,
      encryption_display: (v: any) => v,
      size_display: (v: any) => v,
    } as Record<string, (v: any) => any>;

    return html`
      <resource-table
        .columns=${this.columns()}
        .data=${data}
        .getActions=${this.getActions}
        .customRenderers=${customRenderers}
        @action=${(e: CustomEvent) => this.handleAction(e)}
      ></resource-table>
    `;
  }

  override render() {
    return html`
      <div class="page">
        <div class="header">
          <h2 class="title">Backups</h2>
          <div class="actions">
            <button class="btn" @click=${() => this.loadBackups()} ?disabled=${this.loading}>Refresh</button>
            <button class="btn" @click=${() => (this.showImportDrawer = true)}>Import backup</button>
            <button class="btn btn-primary" @click=${() => (this.showCreateDrawer = true)}>Create backup</button>
          </div>
        </div>

        <div class="controls">
          <div class="filters">
            <select .value=${this.status} @change=${(e: Event) => { this.status = (e.target as HTMLSelectElement).value; this.loadBackups(); }}>
              <option value="all">All status</option>
              <option value="pending">Pending</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
            <select .value=${this.type} @change=${(e: Event) => { this.type = (e.target as HTMLSelectElement).value as BackupType | 'all'; this.loadBackups(); }}>
              <option value="all">All types</option>
              <option value="full">Full</option>
              <option value="incremental">Incremental</option>
              <option value="differential">Differential</option>
            </select>
          </div>
          <search-input
            .placeholder=${'Search VM name/UUID'}
            .value=${this.search}
            @search-change=${(e: CustomEvent) => { this.search = e.detail.value; this.loadBackups(); }}
          ></search-input>
        </div>

        ${this.toast ? html`<div class="toast ${this.toast.type}">${this.toast.text}</div>` : ''}
        ${this.error ? html`<div class="toast error">${this.error}</div>` : ''}

        ${this.renderTable()}
      </div>

      ${this.renderImportDrawer()}
      ${this.renderCreateDrawer()}
      ${this.renderRestoreModal()}
      ${this.renderDeleteModal()}
    `;
  }

  private renderImportDrawer() {
    return html`
      <detail-drawer
        .title=${'Import backup'}
        .show=${this.showImportDrawer}
        @close=${() => (this.showImportDrawer = false)}
      >
        <div class="drawer-content">
          <div class="field">
            <label>Path</label>
            <input type="text" .value=${this.importForm.path} @input=${(e: Event) => (this.importForm.path = (e.target as HTMLInputElement).value)} />
          </div>
          <div class="field">
            <label>VM name</label>
            <input type="text" .value=${this.importForm.vm_name} @input=${(e: Event) => (this.importForm.vm_name = (e.target as HTMLInputElement).value)} />
          </div>
          <div class="field">
            <label>VM UUID (optional)</label>
            <input type="text" .value=${this.importForm.vm_uuid} @input=${(e: Event) => (this.importForm.vm_uuid = (e.target as HTMLInputElement).value)} />
          </div>
          <div class="field">
            <label>Backup ID (optional)</label>
            <input type="text" .value=${this.importForm.backup_id} @input=${(e: Event) => (this.importForm.backup_id = (e.target as HTMLInputElement).value)} />
          </div>
          <div class="field">
            <label>Type</label>
            <select .value=${this.importForm.type} @change=${(e: Event) => (this.importForm.type = (e.target as HTMLSelectElement).value as BackupType)}>
              <option value="full">Full</option>
              <option value="incremental">Incremental</option>
              <option value="differential">Differential</option>
            </select>
          </div>
          <div class="field">
            <label>Compression</label>
            <select .value=${this.importForm.compression} @change=${(e: Event) => (this.importForm.compression = (e.target as HTMLSelectElement).value)}>
              <option value="none">None</option>
              <option value="gzip">gzip</option>
              <option value="bzip2">bzip2</option>
              <option value="zstd">zstd</option>
              <option value="xz">xz</option>
            </select>
          </div>
          <div class="field">
            <label>Encryption</label>
            <select .value=${this.importForm.encryption} @change=${(e: Event) => (this.importForm.encryption = (e.target as HTMLSelectElement).value)}>
              <option value="none">None</option>
              <option value="aes-256">AES-256</option>
              <option value="aes-128">AES-128</option>
            </select>
          </div>
          <div class="field">
            <label>Retention days</label>
            <input type="number" min="1" .value=${String(this.importForm.retention_days)} @input=${(e: Event) => (this.importForm.retention_days = Number((e.target as HTMLInputElement).value))} />
          </div>
          <div class="field">
            <label>Description</label>
            <textarea .value=${this.importForm.description} @input=${(e: Event) => (this.importForm.description = (e.target as HTMLTextAreaElement).value)}></textarea>
          </div>
          <div class="field" style="color: var(--vscode-descriptionForeground, #9ca3af); font-size: 12px;">Import does not move files; path must exist on host.</div>
        </div>
        <div class="drawer-footer">
          <button class="btn" @click=${() => (this.showImportDrawer = false)}>Cancel</button>
          <button class="btn btn-primary" @click=${() => this.handleImport()}>Import</button>
        </div>
      </detail-drawer>
    `;
  }

  private renderCreateDrawer() {
    const vmOptions = (() => {
      const items = vmStore.$items.get();
      if (items instanceof Map) return Array.from(items.values());
      if (items && typeof items === 'object') return Object.values(items as any);
      return [];
    })();

    return html`
      <detail-drawer
        .title=${'Create backup'}
        .show=${this.showCreateDrawer}
        @close=${() => (this.showCreateDrawer = false)}
      >
        <div class="drawer-content">
          <div class="field">
            <label>Virtual machine</label>
            <select .value=${this.createForm.vm_id || ''} @change=${(e: Event) => (this.createForm.vm_id = (e.target as HTMLSelectElement).value)}>
              <option value="">Select VM</option>
              ${vmOptions.map((vm: any) => html`<option value=${vm.id}>${vm.name || vm.id}</option>`)}
            </select>
          </div>
          <div class="field">
            <label>Type</label>
            <select .value=${this.createForm.backup_type} @change=${(e: Event) => (this.createForm.backup_type = (e.target as HTMLSelectElement).value as BackupType)}>
              <option value="full">Full</option>
              <option value="incremental">Incremental</option>
              <option value="differential">Differential</option>
            </select>
          </div>
          <div class="field">
            <label>Destination path</label>
            <input type="text" .value=${this.createForm.destination_path || ''} @input=${(e: Event) => (this.createForm.destination_path = (e.target as HTMLInputElement).value)} />
          </div>
          <div class="field">
            <label>Compression</label>
            <select .value=${this.createForm.compression as string} @change=${(e: Event) => (this.createForm.compression = (e.target as HTMLSelectElement).value)}>
              <option value="none">None</option>
              <option value="gzip">gzip</option>
              <option value="bzip2">bzip2</option>
              <option value="zstd">zstd</option>
              <option value="xz">xz</option>
            </select>
          </div>
          <div class="field">
            <label>Encryption</label>
            <select .value=${this.createForm.encryption as string} @change=${(e: Event) => (this.createForm.encryption = (e.target as HTMLSelectElement).value)}>
              <option value="none">None</option>
              <option value="aes-256">AES-256</option>
              <option value="aes-128">AES-128</option>
            </select>
          </div>
          <div class="field checkbox">
            <input type="checkbox" .checked=${this.createForm.include_memory || false} @change=${(e: Event) => (this.createForm.include_memory = (e.target as HTMLInputElement).checked)} />
            <label>Include memory</label>
          </div>
          <div class="field">
            <label>Retention days</label>
            <input type="number" min="1" .value=${String(this.createForm.retention_days ?? '')} @input=${(e: Event) => (this.createForm.retention_days = Number((e.target as HTMLInputElement).value))} />
          </div>
          <div class="field">
            <label>Description</label>
            <textarea .value=${this.createForm.description || ''} @input=${(e: Event) => (this.createForm.description = (e.target as HTMLTextAreaElement).value)}></textarea>
          </div>
        </div>
        <div class="drawer-footer">
          <button class="btn" @click=${() => (this.showCreateDrawer = false)}>Cancel</button>
          <button class="btn btn-primary" @click=${() => this.handleCreate()}>Create</button>
        </div>
      </detail-drawer>
    `;
  }

  private renderRestoreModal() {
    if (!this.restoreTarget) return html``;
    const missingVm = !this.vmExists(this.restoreTarget);
    return html`
      <modal-dialog
        .open=${this.showRestore}
        .title=${'Restore backup'}
        size="medium"
        @modal-close=${() => (this.showRestore = false)}
      >
        ${missingVm
        ? html`<div class="chip warn">Source VM not found; restore will create a new VM.</div>`
        : html`<div class="field">
              <label>Overwrite existing VM</label>
              <input
                type="checkbox"
                .checked=${this.restoreOverwrite}
                @change=${(e: Event) => (this.restoreOverwrite = (e.target as HTMLInputElement).checked)}
              />
            </div>`}
        <div class="field">
          <label>New VM name</label>
          <input
            type="text"
            .value=${this.restoreNewName}
            @input=${(e: Event) => (this.restoreNewName = (e.target as HTMLInputElement).value)}
            ?disabled=${!missingVm && this.restoreOverwrite}
          />
        </div>
        ${this.restoreTarget.encryption && this.restoreTarget.encryption !== 'none'
        ? html`<div class="field">
              <label>Decryption key</label>
              <input
                type="password"
                .value=${this.restoreKey}
                @input=${(e: Event) => (this.restoreKey = (e.target as HTMLInputElement).value)}
              />
            </div>`
        : ''}
        <div slot="footer" style="display:flex; gap:8px; justify-content:flex-end;">
          <button class="btn" @click=${() => (this.showRestore = false)}>Cancel</button>
          <button class="btn btn-primary" @click=${() => this.confirmRestore()}>Restore</button>
        </div>
      </modal-dialog>
    `;
  }

  private renderDeleteModal() {
    return html`
      <modal-dialog
        .open=${this.showDeleteModal}
        .title=${'Delete Backup'}
        size="small"
        @modal-close=${() => (this.showDeleteModal = false)}
      >
        <div style="padding: 8px 0;">
          <p style="margin-top: 0">Are you sure you want to delete this backup?</p>
          ${this.deleteTarget ? html`
            <div style="font-family: monospace; background: var(--vscode-textCodeBlock-background, rgba(255,255,255,0.05)); padding: 8px; border-radius: 4px; margin: 12px 0;">
              ${this.deleteTarget.backup_id} 
              ${this.deleteTarget.vm_name ? html`<br><span style="opacity:0.7">VM: ${this.deleteTarget.vm_name}</span>` : ''}
              ${this.deleteTarget.started_at ? html`<br><span style="opacity:0.7">Created: ${this.formatDate(this.deleteTarget.started_at)}</span>` : ''}
            </div>
          ` : ''}
          <p style="margin-bottom: 0; color: var(--vscode-errorForeground, #f48771);">This action cannot be undone.</p>
        </div>
        <div slot="footer" style="display: flex; gap: 8px; justify-content: flex-end;">
          <button class="btn" @click=${() => (this.showDeleteModal = false)} ?disabled=${!!this.deletingId}>Cancel</button>
          <button class="btn btn-danger" @click=${() => this.confirmDelete()} ?disabled=${!!this.deletingId}>
            ${this.deletingId ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </modal-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'virtualization-backups': VirtualizationBackupsView;
  }
}
