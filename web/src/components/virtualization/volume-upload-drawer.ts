import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import * as tus from 'tus-js-client';
import '../../components/drawers/detail-drawer';
import virtualizationAPI from '../../services/virtualization-api';
import { formatBytes } from '../../utils/formatters';

@customElement('volume-upload-drawer')
export class VolumeUploadDrawer extends LitElement {
  static override styles = css`
    :host { display: block; }
    .drawer-content { padding: 16px; }
    .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
    .field label { color: var(--vscode-foreground, #cccccc); font-size: 13px; font-weight: 500; }
    .field input, .field select { width: 100%; padding: 8px 12px; border-radius: 4px; border: 1px solid var(--vscode-input-border, #3c3c3c); background: var(--vscode-input-background, #3c3c3c); color: var(--vscode-input-foreground, #cccccc); font-size: 13px; box-sizing: border-box; }
    .field input:focus, .field select:focus { outline: none; border-color: var(--vscode-focusBorder, #007acc); box-shadow: 0 0 0 1px var(--vscode-focusBorder, #007acc); }
    
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
    .file-details { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }
    .file-name { font-weight: 500; color: var(--vscode-foreground); }
    .file-size { font-size: 12px; color: var(--vscode-descriptionForeground); }
    
    .remove-btn {
      background: none; border: none; color: var(--vscode-descriptionForeground); cursor: pointer; font-size: 18px; padding: 4px;
    }
    .remove-btn:hover { color: #f87171; }

    .progress-bar {
      height: 6px;
      background: var(--vscode-widget-border, #2d2d2d);
      border-radius: 3px;
      overflow: hidden;
      margin-top: 12px;
      position: relative;
    }
    .progress-fill {
      height: 100%;
      background-color: var(--vscode-progressBar-background, #0e70c0);
      background-image: linear-gradient(
        45deg,
        rgba(255, 255, 255, 0.15) 25%,
        transparent 25%,
        transparent 50%,
        rgba(255, 255, 255, 0.15) 50%,
        rgba(255, 255, 255, 0.15) 75%,
        transparent 75%,
        transparent
      );
      background-size: 1rem 1rem;
      animation: progress-stripes 1s linear infinite;
      transition: width 0.2s ease-out;
    }

    @keyframes progress-stripes {
      0% { background-position: 1rem 0; }
      100% { background-position: 0 0; }
    }
    
    .drawer-footer { display: contents; }
    .btn { height: 32px; padding: 0 16px; border-radius: 4px; border: 1px solid var(--vscode-border, #464647); background: var(--vscode-bg-lighter, #2d2d30); color: var(--vscode-text, #cccccc); cursor: pointer; font-size: 13px; font-weight: 500; }
    .btn:hover { background: var(--surface-3, #3e3e42); }
    .btn-primary { background: var(--vscode-accent, #007acc); color: #ffffff; border-color: var(--vscode-accent, #007acc); }
    .btn-primary:hover { background: var(--vscode-accent-hover, #1a86d9); }
    
    .toast { margin-bottom: 10px; padding: 10px; border-radius: 8px; background: #1f0f0f; color: #fecdd3; border: 1px solid #7f1d1d; }
  `;

  @property({ type: Boolean }) open = false;
  @property({ type: Array }) storagePools: string[] = [];

  @state() private selectedFile: File | null = null;
  @state() private dragOver = false;
  @state() private uploadProgress = 0;
  @state() private isUploading = false;
  @state() private error: string | null = null;

  @state() private form = {
    name: '',
    pool: 'default',
  };

  private currentUpload: tus.Upload | null = null;

  override updated(changedProperties: Map<string, any>) {
    if (changedProperties.has('open') && this.open) {
      if (!this.form.pool && this.storagePools.length > 0 && this.storagePools[0]) {
        this.form.pool = this.storagePools[0];
      }
    }
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
    if (files && files.length > 0 && files[0]) {
      this.handleFileSelect(files[0]);
    }
  }

  private handleFileInput(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.handleFileSelect(input.files[0]);
    }
  }

  private handleFileSelect(file: File) {
    const validExtensions = ['qcow2', 'raw', 'vmdk', 'img', 'vdi', 'qed'];
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (!extension || !validExtensions.includes(extension)) {
      this.error = `Invalid file type. Allowed: ${validExtensions.join(', ')}`;
      return;
    }

    this.selectedFile = file;
    // Auto-populate name if empty
    if (!this.form.name) {
      this.form.name = file.name;
    }
    this.error = null;
  }

  private removeFile() {
    this.selectedFile = null;
    this.uploadProgress = 0;
    this.isUploading = false;
    this.error = null;
    if (this.currentUpload) {
      this.currentUpload.abort();
      this.currentUpload = null;
    }
  }

  private async startUpload() {
    if (!this.selectedFile) return;

    this.isUploading = true;
    this.error = null;
    this.uploadProgress = 0;

    try {
      // 1. Initiate upload
      const { uploadUrl, uploadId } = await virtualizationAPI.initiateVolumeUpload({
        filename: this.selectedFile.name,
        size: this.selectedFile.size,
        pool_name: this.form.pool,
      });

      // 2. Start TUS upload
      this.currentUpload = new tus.Upload(this.selectedFile, {
        uploadUrl,
        chunkSize: 4 * 1024 * 1024, // 4MB
        retryDelays: [0, 1000, 3000, 5000],
        metadata: {
          filename: this.selectedFile.name,
          pool_name: this.form.pool,
        },
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt_token') || localStorage.getItem('auth_token')}`,
        },
        onError: (error) => {
          this.error = error.message;
          this.isUploading = false;
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          this.uploadProgress = (bytesUploaded / bytesTotal) * 100;
        },
        onSuccess: async () => {
          try {
            await virtualizationAPI.completeVolumeUpload(uploadId);
            this.dispatchEvent(new CustomEvent('success'));
            this.close();
          } catch (err: any) {
            this.error = err.message || 'Failed to complete upload';
            this.isUploading = false;
          }
        },
      });

      this.currentUpload.start();
    } catch (err: any) {
      this.error = err.message || 'Failed to start upload';
      this.isUploading = false;
    }
  }

  private close() {
    if (this.currentUpload) {
      this.currentUpload.abort();
      this.currentUpload = null;
    }
    this.selectedFile = null;
    this.isUploading = false;
    this.uploadProgress = 0;
    this.error = null;
    this.form = { name: '', pool: this.storagePools[0] || 'default' };
    this.dispatchEvent(new CustomEvent('close'));
  }

  override render() {
    return html`
      <detail-drawer
        title="Upload Volume"
        .show=${this.open}
        .hasFooter=${true}
        @close=${() => this.close()}
      >
        <div class="drawer-content">
          ${this.error ? html`<div class="toast">${this.error}</div>` : ''}

          ${!this.selectedFile ? html`
            <div 
              class="drop-zone ${this.dragOver ? 'drag-over' : ''}"
              @dragover=${this.handleDragOver}
              @dragleave=${this.handleDragLeave}
              @drop=${this.handleDrop}
              @click=${() => this.shadowRoot?.querySelector('input')?.click()}
            >
              <div class="drop-zone-icon">☁️</div>
              <div class="drop-zone-text">Click or drag file to upload</div>
              <div class="drop-zone-hint">Supports QCOW2, RAW, VMDK, IMG, VDI, QED</div>
              <input type="file" style="display: none" accept=".qcow2,.raw,.vmdk,.img,.vdi,.qed" @change=${this.handleFileInput} />
            </div>
          ` : html`
            <div class="file-info">
              <div class="file-details">
                <span class="file-name">${this.selectedFile.name}</span>
                <span class="file-size">${formatBytes(this.selectedFile.size)}</span>
                ${this.isUploading ? html`
                  <div class="progress-bar">
                    <div class="progress-fill" style="width: ${this.uploadProgress}%"></div>
                  </div>
                  <div style="font-size: 11px; margin-top: 4px;">${Math.round(this.uploadProgress)}% uploaded</div>
                ` : ''}
              </div>
              ${!this.isUploading ? html`
                <button class="remove-btn" @click=${this.removeFile}>×</button>
              ` : ''}
            </div>
          `}

          <div class="field">
            <label>Volume Name</label>
            <input 
              type="text" 
              .value=${this.form.name} 
              @input=${(e: Event) => this.form.name = (e.target as HTMLInputElement).value}
              ?disabled=${this.isUploading}
            />
          </div>

          <div class="field">
            <label>Storage Pool</label>
            <select 
              .value=${this.form.pool}
              @change=${(e: Event) => this.form.pool = (e.target as HTMLSelectElement).value}
              ?disabled=${this.isUploading || this.storagePools.length === 0}
            >
              ${this.storagePools.map(pool => html`<option value=${pool}>${pool}</option>`)}
            </select>
          </div>


        </div>

        <div slot="footer" class="drawer-footer">
          <button class="btn" @click=${() => this.close()} ?disabled=${this.isUploading}>Cancel</button>
          <button class="btn btn-primary" @click=${this.startUpload} ?disabled=${!this.selectedFile || this.isUploading}>
            ${this.isUploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </detail-drawer>
    `;
  }
}
