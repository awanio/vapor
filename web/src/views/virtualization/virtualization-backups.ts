import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import * as tus from 'tus-js-client';
import type { VMBackup, BackupCreateRequest, BackupType, StoragePool } from '../../types/virtualization';
import virtualizationAPI from '../../services/virtualization-api';
import { $backups, backupActions, $backupUploadState } from '../../stores/virtualization/backups';
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
    th, td { padding: 12px 10px; border-bottom: 1px solid var(--vscode-border); text-align: left; font-size: 13px; }
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
    .drop-zone {
      border: 2px dashed var(--vscode-input-border, #5a5a5a);
      border-radius: 8px;
      padding: 40px;
      text-align: center;
      transition: all 0.3s;
      cursor: pointer;
      margin-bottom: 16px;
      background: var(--vscode-editor-inactiveSelectionBackground, rgba(37, 37, 38, 0.5));
    }
    .drop-zone:hover {
      border-color: var(--vscode-focusBorder, #007acc);
      background: var(--vscode-list-hoverBackground, rgba(90, 93, 94, 0.1));
    }
    .drop-zone.drag-over {
      border-color: var(--vscode-focusBorder, #007acc);
      background: var(--vscode-editor-selectionBackground, rgba(51, 153, 255, 0.2));
      border-style: solid;
    }
    .drop-zone-icon { font-size: 48px; margin-bottom: 16px; opacity: 0.8; }
    .drop-zone-text { font-size: 16px; color: var(--vscode-foreground, #cccccc); margin-bottom: 8px; font-weight: 500; }
    .drop-zone-hint { font-size: 13px; color: var(--vscode-descriptionForeground, #8b8b8b); }
    .file-info {
      padding: 16px;
      background: var(--vscode-editor-inactiveSelectionBackground);
      border: 1px solid var(--vscode-editorWidget-border, #464647);
      border-radius: 4px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .file-details { display: flex; flex-direction: column; gap: 4px; }
    .file-name { font-weight: 500; color: var(--vscode-foreground); }
    .file-size { font-size: 12px; color: var(--vscode-descriptionForeground); }
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
  @state() private showUploadDrawer = false;
  @state() private selectedFile: File | null = null;
  @state() private dragOver = false;
  @state() private uploadUrl: string | null = null;
  @state() private storagePools: StoragePool[] = [];
  @state() private uploadId: string | null = null;
  @state() private isPaused = false;
  private currentUpload: tus.Upload | null = null;

  private uploadMetadata = {
    vm_name: '',
    vm_uuid: '',
    backup_type: 'full' as 'full' | 'incremental' | 'differential',
    compression: 'none',
    encryption: 'none',
    description: '',
    retention_days: 7,
  };

  private backupsUnsub?: () => void;
  private vmsUnsub?: () => void;
  private uploadStateUnsub?: () => void;

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
    this.backupsUnsub = $backups.subscribe(() => this.sync());
    this.vmsUnsub = vmStore.$items.subscribe(() => this.requestUpdate());
    this.uploadStateUnsub = $backupUploadState.subscribe(() => this.requestUpdate());
    this.loadVMs();
    this.loadBackups();
    this.loadStoragePools();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.backupsUnsub?.();
    this.vmsUnsub?.();
    this.uploadStateUnsub?.();
  }

  private async loadVMs() {
    try {
      await vmStore.fetch();
    } catch (err) {
      console.warn('VM fetch failed', err);
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
    this.loadStoragePools();
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
    this.loadStoragePools();
    } catch (err: any) {
      this.setToast(err?.message || 'Import failed', 'error');
    }
  }


  private openUploadDrawer() {
    this.showUploadDrawer = true;
    this.selectedFile = null;
    this.uploadUrl = null;
    this.uploadId = null;
    this.isPaused = false;
    this.uploadMetadata = {
      vm_name: '',
      vm_uuid: '',
      backup_type: 'full',
      compression: 'none',
      encryption: 'none',
      description: '',
      retention_days: 7,
    };
    backupActions.resetUploadState();
  }

  private closeUploadDrawer() {
    if (this.currentUpload) {
      this.currentUpload.abort();
      this.currentUpload = null;
    }
    this.showUploadDrawer = false;
    this.selectedFile = null;
    this.uploadUrl = null;
    this.uploadId = null;
    backupActions.resetUploadState();
  }


  private handleDragOver(e: DragEvent) {
    e.preventDefault();
    this.dragOver = true;
  }

  private handleDragLeave(e: DragEvent) {
    e.preventDefault();
    this.dragOver = false;
  }

  private handleDrop(e: DragEvent) {
    e.preventDefault();
    this.dragOver = false;
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file && this.validateBackupFile(file)) {
        this.selectedFile = file;
      }
    }
  }

  private validateBackupFile(file: File): boolean {
    const lowerName = file.name.toLowerCase();
    const validExtensions = ['.qcow2', '.qcow2.gz', '.qcow2.zst', '.qcow2.xz', '.qcow2.bz2'];
    const isValid = validExtensions.some(ext => lowerName.endsWith(ext));
    if (!isValid) {
      this.setToast('Please select a .qcow2 backup file (optionally compressed: .gz, .zst, .xz, .bz2)', 'error');
      return false;
    }
    const maxSize = 500 * 1024 * 1024 * 1024;
    if (file.size > maxSize) {
      this.setToast('File size exceeds 500GB limit', 'error');
      return false;
    }
    return true;
  }
  private handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (this.validateBackupFile(file)) {
        this.selectedFile = file;
      }
    }
  }


  private removeSelectedFile() {
    this.selectedFile = null;
    this.uploadUrl = null;
    this.uploadId = null;
  }

  private async handleUpload() {
    if (!this.selectedFile) {
      this.setToast('Please select a file to upload', 'error');
      return;
    }
    if (!this.uploadMetadata.vm_name.trim()) {
      this.setToast('VM name is required', 'error');
      return;
    }

    try {
      // Only initiate new upload session if we don't have one
      if (!this.uploadUrl || !this.uploadId) {
        const { uploadUrl, uploadId } = await virtualizationAPI.initiateBackupUpload({
          filename: this.selectedFile.name,
          size: this.selectedFile.size,
          vm_name: this.uploadMetadata.vm_name,
          vm_uuid: this.uploadMetadata.vm_uuid || undefined,
          backup_type: this.uploadMetadata.backup_type,
          compression: this.uploadMetadata.compression,
          encryption: this.uploadMetadata.encryption,
          description: this.uploadMetadata.description || undefined,
          retention_days: this.uploadMetadata.retention_days,
        });
        this.uploadUrl = uploadUrl;
        this.uploadId = uploadId;
      }

      // Set upload state
      backupActions.setUploadState({
        isUploading: true,
        uploadProgress: this.isPaused ? $backupUploadState.get().uploadProgress : 0,
        uploadId: this.uploadId,
        error: null,
      });

      this.isPaused = false;

      // Create TUS upload client
      this.currentUpload = new tus.Upload(this.selectedFile, {
        uploadUrl: this.uploadUrl!,
        chunkSize: 10 * 1024 * 1024, // 10MB chunks
        metadata: {
          filename: this.selectedFile.name,
          filetype: this.selectedFile.type || 'application/octet-stream',
          vm_name: this.uploadMetadata.vm_name,
        },
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt_token') || localStorage.getItem('auth_token')}`,
          'Tus-Resumable': '1.0.0',
        },
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        retryDelays: [0, 1000, 3000, 5000],
        onError: (error) => {
          console.error('Backup upload failed:', error);
          this.setToast(`Upload failed: ${error.message}`, 'error');
          this.currentUpload = null;
          backupActions.setUploadState({
            isUploading: false,
            uploadProgress: 0,
            uploadId: null,
            error: error.message,
          });
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          const percentage = Math.round((bytesUploaded / bytesTotal) * 100);
          backupActions.setUploadState({
            ...($backupUploadState.get()),
            uploadProgress: percentage,
          });
        },
        onSuccess: async () => {
          try {
            await virtualizationAPI.completeBackupUpload(this.uploadId!);
            backupActions.resetUploadState();
            await this.loadBackups();
    this.loadStoragePools();
            this.setToast('Backup uploaded successfully', 'success');
            this.closeUploadDrawer();
          } catch (error) {
            console.error('Failed to complete backup upload:', error);
            this.setToast('Failed to complete upload', 'error');
            backupActions.setUploadState({
              isUploading: false,
              uploadProgress: 0,
              uploadId: null,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        },
      });

      // Start upload
      this.currentUpload.start();

    } catch (error) {
      console.error('Failed to initiate backup upload:', error);
      this.setToast(
        `Failed to initiate upload: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      );
    }
  }

  private pauseUpload() {
    if (this.currentUpload) {
      this.currentUpload.abort();
      this.isPaused = true;
      backupActions.setUploadState({
        ...($backupUploadState.get()),
        isUploading: false,
      });
    }
  }

  private resumeUpload() {
    if (this.currentUpload && this.isPaused) {
      this.isPaused = false;
      backupActions.setUploadState({
        ...($backupUploadState.get()),
        isUploading: true,
      });
      this.currentUpload.start();
    }
  }

  private cancelUpload() {
    if (this.currentUpload) {
      this.currentUpload.abort();
      this.currentUpload = null;
    }
    this.uploadUrl = null;
    this.uploadId = null;
    this.isPaused = false;
    backupActions.resetUploadState();
    this.setToast('Upload cancelled', 'info');
  }

  private async handleCreate() {
    if (!this.createForm.vm_id) {
      this.setToast('Select a VM', 'error');
      return;
    }
    try {
      const payload: BackupCreateRequest = { ...this.createForm } as BackupCreateRequest;
      delete (payload as any).vm_id;
      if (!payload.parent_backup_id) delete (payload as any).parent_backup_id; // Let backend auto-find
      if (!payload.storage_pool) delete (payload as any).storage_pool;
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
            <button class="btn" @click=${() => this.openUploadDrawer()}>Upload from local</button>
            <button class="btn" @click=${() => (this.showImportDrawer = true)}>Register from server</button>
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
            <button class="btn" @click=${() => this.openUploadDrawer()}>Upload from local</button>
            <button class="btn" @click=${() => (this.showImportDrawer = true)}>Register from server</button>
            <button class="btn btn-primary" @click=${() => (this.showCreateDrawer = true)}>Create backup</button>
          </div>
        </div>

        <div class="controls">
          <div class="filters">
            <select .value=${this.status} @change=${(e: Event) => { this.status = (e.target as HTMLSelectElement).value; this.loadBackups();
    this.loadStoragePools(); }}>
              <option value="all">All status</option>
              <option value="pending">Pending</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
            <select .value=${this.type} @change=${(e: Event) => { this.type = (e.target as HTMLSelectElement).value as BackupType | 'all'; this.loadBackups();
    this.loadStoragePools(); }}>
              <option value="all">All types</option>
              <option value="full">Full</option>
              <option value="incremental">Incremental</option>
              <option value="differential">Differential</option>
            </select>
          </div>
          <search-input
            .placeholder=${'Search VM name/UUID'}
            .value=${this.search}
            @search-change=${(e: CustomEvent) => { this.search = e.detail.value; this.loadBackups();
    this.loadStoragePools(); }}
          ></search-input>
        </div>

        ${this.toast ? html`<div class="toast ${this.toast.type}">${this.toast.text}</div>` : ''}
        ${this.error ? html`<div class="toast error">${this.error}</div>` : ''}

        ${this.renderTable()}
      </div>

      ${this.renderImportDrawer()}
      ${this.renderCreateDrawer()}
      ${this.renderUploadDrawer()}
      ${this.renderRestoreModal()}
      ${this.renderDeleteModal()}
    `;
  }

  private renderImportDrawer() {
    return html`
      <detail-drawer
        .title=${'Register existing backup'}
        .show=${this.showImportDrawer}
        @close=${() => (this.showImportDrawer = false)}
      >
        <div class="drawer-content">
          <div class="field">
            <label>Server file path</label>
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
          <div class="field" style="color: var(--vscode-descriptionForeground, #9ca3af); font-size: 12px;">This registers an existing backup file that is already on the server. The file will not be moved or copied.</div>
        </div>
        <div class="drawer-footer">
          <button class="btn" @click=${() => (this.showImportDrawer = false)}>Cancel</button>
          <button class="btn btn-primary" @click=${() => this.handleImport()}>Register</button>
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
            <select .value=${this.createForm.backup_type} @change=${(e: Event) => {
              this.createForm.backup_type = (e.target as HTMLSelectElement).value as BackupType;
              this.createForm.parent_backup_id = ''; // Reset parent when type changes
              this.requestUpdate();
            }}>
              <option value="full">Full</option>
              <option value="incremental">Incremental</option>
              <option value="differential">Differential</option>
            </select>
            ${this.createForm.backup_type === 'incremental' ? html`
              <div class="form-hint" style="margin-top: 4px; font-size: 12px; color: var(--vscode-descriptionForeground);">Backs up only changes since the selected parent backup.</div>
            ` : ''}
            ${this.createForm.backup_type === 'differential' ? html`
              <div class="form-hint" style="margin-top: 4px; font-size: 12px; color: var(--vscode-descriptionForeground);">Backs up only changes since the last full backup (auto-selected).</div>
            ` : ''}
          </div>
          ${this.createForm.backup_type === 'incremental' ? html`
            <div class="field">
              <label>Parent backup</label>
              <select
                .value=${this.createForm.parent_backup_id || ''}
                @change=${(e: Event) => (this.createForm.parent_backup_id = (e.target as HTMLSelectElement).value)}
              >
                <option value="">Auto-select latest backup</option>
                ${this.backups
                  .filter(b => b.status === 'completed' && b.vm_id === this.createForm.vm_id)
                  .map(b => html`<option value=${b.backup_id}>${b.type} - ${this.formatDate(b.started_at || b.created_at)} ${b.backup_id?.substring(0, 8)}...</option>`)}
              </select>
              <div class="form-hint" style="margin-top: 4px; font-size: 12px; color: var(--vscode-descriptionForeground);">Leave empty to use the most recent backup.</div>
            </div>
          ` : ''}
          <div class="field">
            <label>Storage pool</label>
            <select .value=${this.createForm.storage_pool || ''} @change=${(e: Event) => (this.createForm.storage_pool = (e.target as HTMLSelectElement).value)}>
              <option value="">Use default location</option>
              ${(this.storagePools || [])
                .filter(p => p.path)
                .map(p => html`<option value=${p.name}>${p.name} (${this.formatSize(p.available)} free)</option>`)}
            </select>
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


  private renderUploadDrawer() {
    const uploadState = $backupUploadState.get();

    return html`
      <detail-drawer
        .title=${'Upload backup from local'}
        .show=${this.showUploadDrawer}
        @close=${() => this.closeUploadDrawer()}
      >
        <div class="drawer-content">
          ${!this.selectedFile ? html`
            <div 
              class="drop-zone ${this.dragOver ? 'drag-over' : ''}"
              @dragover=${(e: DragEvent) => this.handleDragOver(e)}
              @dragleave=${(e: DragEvent) => this.handleDragLeave(e)}
              @drop=${(e: DragEvent) => this.handleDrop(e)}
              @click=${() => this.shadowRoot?.getElementById('backup-file-input')?.click()}
            >
              <div class="drop-zone-icon">💾</div>
              <div class="drop-zone-text">Drag and drop a backup file here</div>
              <div class="drop-zone-hint">or click to browse (.qcow2, .qcow2.gz, .qcow2.zst, .qcow2.xz, .qcow2.bz2)</div>
            </div>
            <input
              type="file"
              id="backup-file-input"
              accept=".qcow2,.qcow2.gz,.qcow2.zst,.qcow2.xz,.qcow2.bz2"
              style="display: none"
              @change=${(e: Event) => this.handleFileSelect(e)}
            />
          ` : html`
            <div class="file-info">
              <div class="file-details">
                <div class="file-name">${this.selectedFile.name}</div>
                <div class="file-size">${this.formatSize(this.selectedFile.size)}</div>
              </div>
              ${!uploadState.isUploading ? html`
                <button class="btn" @click=${() => this.removeSelectedFile()}>Remove</button>
              ` : ''}
            </div>
          `}
          <div class="field">
            <label>VM name *</label>
            <input
              type="text"
              .value=${this.uploadMetadata.vm_name}
              @input=${(e: Event) => (this.uploadMetadata.vm_name = (e.target as HTMLInputElement).value)}
              ?disabled=${uploadState.isUploading}
              placeholder="Name of the VM this backup belongs to"
            />
          </div>
          <div class="field">
            <label>VM UUID (optional)</label>
            <input
              type="text"
              .value=${this.uploadMetadata.vm_uuid}
              @input=${(e: Event) => (this.uploadMetadata.vm_uuid = (e.target as HTMLInputElement).value)}
              ?disabled=${uploadState.isUploading}
              placeholder="UUID of the VM (if known)"
            />
          </div>
          <div class="field">
            <label>Type</label>
            <select
              .value=${this.uploadMetadata.backup_type}
              @change=${(e: Event) => (this.uploadMetadata.backup_type = (e.target as HTMLSelectElement).value as any)}
              ?disabled=${uploadState.isUploading}
            >
              <option value="full">Full</option>
              <option value="incremental">Incremental</option>
              <option value="differential">Differential</option>
            </select>
          </div>
          <div class="field">
            <label>Compression</label>
            <select
              .value=${this.uploadMetadata.compression}
              @change=${(e: Event) => (this.uploadMetadata.compression = (e.target as HTMLSelectElement).value)}
              ?disabled=${uploadState.isUploading}
            >
              <option value="none">None</option>
              <option value="gzip">gzip</option>
              <option value="bzip2">bzip2</option>
              <option value="zstd">zstd</option>
              <option value="xz">xz</option>
            </select>
          </div>
          <div class="field">
            <label>Encryption</label>
            <select
              .value=${this.uploadMetadata.encryption}
              @change=${(e: Event) => (this.uploadMetadata.encryption = (e.target as HTMLSelectElement).value)}
              ?disabled=${uploadState.isUploading}
            >
              <option value="none">None</option>
              <option value="aes-256">AES-256</option>
              <option value="aes-128">AES-128</option>
            </select>
          </div>
          <div class="field">
            <label>Retention days</label>
            <input
              type="number"
              min="1"
              .value=${String(this.uploadMetadata.retention_days)}
              @input=${(e: Event) => (this.uploadMetadata.retention_days = Number((e.target as HTMLInputElement).value))}
              ?disabled=${uploadState.isUploading}
            />
          </div>
          <div class="field">
            <label>Description</label>
            <textarea
              .value=${this.uploadMetadata.description}
              @input=${(e: Event) => (this.uploadMetadata.description = (e.target as HTMLTextAreaElement).value)}
              ?disabled=${uploadState.isUploading}
            ></textarea>
          </div>
          ${uploadState.isUploading || this.isPaused ? html`
            <div style="margin-top: 16px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span>Upload progress</span>
                <span>${uploadState.uploadProgress}%</span>
              </div>
              <div style="height: 8px; background: var(--vscode-input-background); border-radius: 4px; overflow: hidden;">
                <div style="height: 100%; width: ${uploadState.uploadProgress}%; background: var(--vscode-accent, #007acc); transition: width 0.3s;"></div>
              </div>
              <div style="display: flex; gap: 8px; margin-top: 12px;">
                ${uploadState.isUploading ? html`
                  <button class="btn" @click=${() => this.pauseUpload()}>Pause</button>
                ` : html`
                  <button class="btn btn-primary" @click=${() => this.resumeUpload()}>Resume</button>
                `}
                <button class="btn btn-danger" @click=${() => this.cancelUpload()}>Cancel</button>
              </div>
            </div>
          ` : ''}
        </div>
        <div class="drawer-footer">
          <button class="btn" @click=${() => this.closeUploadDrawer()} ?disabled=${uploadState.isUploading}>Cancel</button>
          <button
            class="btn btn-primary"
            @click=${() => this.handleUpload()}
            ?disabled=${uploadState.isUploading || !this.selectedFile || !this.uploadMetadata.vm_name.trim()}
          >
            ${uploadState.isUploading ? 'Uploading...' : 'Upload'}
          </button>
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
        : html`<div class="field checkbox">
              <input
                type="checkbox"
                .checked=${this.restoreOverwrite}
                @change=${(e: Event) => (this.restoreOverwrite = (e.target as HTMLInputElement).checked)}
              />
              <label>Overwrite existing VM</label>
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
