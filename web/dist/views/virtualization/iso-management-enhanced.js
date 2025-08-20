var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { StoreController } from '@nanostores/lit';
import * as tus from 'tus-js-client';
import '../../components/ui/search-input.js';
import '../../components/ui/empty-state.js';
import '../../components/ui/loading-state.js';
import '../../components/tables/resource-table.js';
import '../../components/modals/delete-modal.js';
import '../../components/ui/notification-container.js';
import { isoStore, $availableISOs, $isoUploadState, storageActions, } from '../../stores/virtualization';
import { virtualizationAPI } from '../../services/virtualization-api';
let ISOManagementEnhanced = class ISOManagementEnhanced extends LitElement {
    constructor() {
        super(...arguments);
        this.isoStoreController = new StoreController(this, isoStore.$state);
        this.availableISOsController = new StoreController(this, $availableISOs);
        this._uploadStateController = new StoreController(this, $isoUploadState);
        this.searchQuery = '';
        this.showUploadModal = false;
        this.showDeleteModal = false;
        this.isoToDelete = null;
        this.isDeleting = false;
        this.selectedFile = null;
        this.uploadMetadata = {
            os_type: 'linux',
            os_variant: '',
            description: '',
        };
        this.currentUpload = null;
        this.dragOver = false;
        this.uploadProgress = 0;
        this.uploadedBytes = 0;
        this.totalBytes = 0;
        this.uploadSpeed = 0;
        this.uploadStartTime = 0;
        this.isUploading = false;
    }
    async connectedCallback() {
        super.connectedCallback();
        await this.loadData();
    }
    async loadData() {
        try {
            await isoStore.fetch();
        }
        catch (error) {
            console.error('Failed to load ISOs:', error);
            this.showNotification('Failed to load ISO images', 'error');
        }
    }
    getColumns() {
        return [
            { key: 'name', label: 'Name', type: 'link' },
            { key: 'size_formatted', label: 'Size' },
            { key: 'os_type', label: 'OS Type' },
            { key: 'os_variant', label: 'OS Variant' },
            { key: 'uploaded_at_formatted', label: 'Uploaded' },
            { key: 'storage_pool', label: 'Storage Pool' },
        ];
    }
    getActions(_iso) {
        return [
            { label: 'Download', action: 'download', icon: 'download' },
            { label: 'Copy Path', action: 'copy-path', icon: 'copy' },
            { label: 'Delete', action: 'delete', icon: 'trash', danger: true },
        ];
    }
    formatFileSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let size = bytes;
        let unitIndex = 0;
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }
    formatSpeed(bytesPerSecond) {
        if (bytesPerSecond === 0)
            return '0 B/s';
        const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
        let speed = bytesPerSecond;
        let unitIndex = 0;
        while (speed >= 1024 && unitIndex < units.length - 1) {
            speed /= 1024;
            unitIndex++;
        }
        return `${speed.toFixed(1)} ${units[unitIndex]}`;
    }
    calculateTimeRemaining() {
        if (this.uploadSpeed === 0 || this.uploadedBytes === 0) {
            return 'Calculating...';
        }
        const remainingBytes = this.totalBytes - this.uploadedBytes;
        const remainingSeconds = remainingBytes / this.uploadSpeed;
        if (remainingSeconds < 60) {
            return `${Math.round(remainingSeconds)}s`;
        }
        else if (remainingSeconds < 3600) {
            const minutes = Math.floor(remainingSeconds / 60);
            const seconds = Math.round(remainingSeconds % 60);
            return `${minutes}m ${seconds}s`;
        }
        else {
            const hours = Math.floor(remainingSeconds / 3600);
            const minutes = Math.floor((remainingSeconds % 3600) / 60);
            return `${hours}h ${minutes}m`;
        }
    }
    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString();
    }
    getFilteredISOs() {
        const isos = this.availableISOsController.value;
        if (!this.searchQuery) {
            return isos;
        }
        const query = this.searchQuery.toLowerCase();
        return isos.filter(iso => iso.name.toLowerCase().includes(query) ||
            iso.os_type?.toLowerCase().includes(query) ||
            iso.os_variant?.toLowerCase().includes(query));
    }
    handleSearchChange(event) {
        this.searchQuery = event.detail.value;
    }
    handleAction(event) {
        const { action, item } = event.detail;
        const iso = item;
        switch (action) {
            case 'download':
                this.downloadISO(iso);
                break;
            case 'copy-path':
                this.copyISOPath(iso);
                break;
            case 'delete':
                this.confirmDeleteISO(iso);
                break;
        }
    }
    downloadISO(iso) {
        const link = document.createElement('a');
        link.href = `/api/v1/virtualization/storages/isos/${iso.id}/download`;
        link.download = iso.name;
        link.click();
    }
    async copyISOPath(iso) {
        try {
            await navigator.clipboard.writeText(iso.path);
            this.showNotification('Path copied to clipboard', 'success');
        }
        catch (error) {
            this.showNotification('Failed to copy path', 'error');
        }
    }
    confirmDeleteISO(iso) {
        this.isoToDelete = iso;
        this.showDeleteModal = true;
    }
    async handleDelete() {
        if (!this.isoToDelete)
            return;
        this.isDeleting = true;
        try {
            await storageActions.deleteISO(this.isoToDelete.id);
            this.showNotification(`ISO "${this.isoToDelete.name}" deleted successfully`, 'success');
            this.showDeleteModal = false;
            this.isoToDelete = null;
        }
        catch (error) {
            console.error('Failed to delete ISO:', error);
            this.showNotification(`Failed to delete ISO: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
        finally {
            this.isDeleting = false;
        }
    }
    openUploadModal() {
        this.showUploadModal = true;
        this.selectedFile = null;
        this.uploadMetadata = {
            os_type: 'linux',
            os_variant: '',
            description: '',
        };
        this.resetUploadProgress();
    }
    closeUploadModal() {
        if (this.currentUpload) {
            this.currentUpload.abort();
            this.currentUpload = null;
        }
        this.showUploadModal = false;
        this.selectedFile = null;
        this.resetUploadProgress();
    }
    resetUploadProgress() {
        this.uploadProgress = 0;
        this.uploadedBytes = 0;
        this.totalBytes = 0;
        this.uploadSpeed = 0;
        this.uploadStartTime = 0;
        this.isUploading = false;
    }
    handleDragOver(event) {
        event.preventDefault();
        this.dragOver = true;
    }
    handleDragLeave(event) {
        event.preventDefault();
        this.dragOver = false;
    }
    handleDrop(event) {
        event.preventDefault();
        this.dragOver = false;
        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
            const file = files[0];
            if (file && this.validateFile(file)) {
                this.selectedFile = file;
            }
        }
    }
    handleFileSelect(event) {
        const input = event.target;
        const files = input.files;
        if (files && files.length > 0) {
            const file = files[0];
            if (file && this.validateFile(file)) {
                this.selectedFile = file;
            }
        }
    }
    validateFile(file) {
        if (!file.name.toLowerCase().endsWith('.iso')) {
            this.showNotification('Please select an ISO file', 'error');
            return false;
        }
        const maxSize = 10 * 1024 * 1024 * 1024;
        if (file.size > maxSize) {
            this.showNotification('File size exceeds 10GB limit', 'error');
            return false;
        }
        return true;
    }
    removeSelectedFile() {
        this.selectedFile = null;
    }
    async handleUpload() {
        if (!this.selectedFile) {
            this.showNotification('Please select a file to upload', 'error');
            return;
        }
        try {
            const { uploadUrl, uploadId } = await virtualizationAPI.initiateISOUpload({
                filename: this.selectedFile.name,
                size: this.selectedFile.size,
                os_type: this.uploadMetadata.os_type,
                os_variant: this.uploadMetadata.os_variant,
                description: this.uploadMetadata.description,
            });
            this.uploadStartTime = Date.now();
            this.totalBytes = this.selectedFile.size;
            this.isUploading = true;
            this.currentUpload = new tus.Upload(this.selectedFile, {
                uploadUrl: uploadUrl,
                chunkSize: 10 * 1024 * 1024,
                metadata: {
                    filename: this.selectedFile.name,
                    filetype: this.selectedFile.type || 'application/octet-stream',
                    os_type: this.uploadMetadata.os_type || '',
                    os_variant: this.uploadMetadata.os_variant || '',
                    description: this.uploadMetadata.description || '',
                },
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token') || localStorage.getItem('auth_token')}`,
                    'Tus-Resumable': '1.0.0',
                },
                retryDelays: [0, 1000, 3000, 5000],
                onError: (error) => {
                    console.error('Upload failed:', error);
                    this.showNotification(`Upload failed: ${error.message}`, 'error');
                    this.currentUpload = null;
                    this.isUploading = false;
                },
                onProgress: (bytesUploaded, bytesTotal) => {
                    this.uploadProgress = Math.round((bytesUploaded / bytesTotal) * 100);
                    this.uploadedBytes = bytesUploaded;
                    this.totalBytes = bytesTotal;
                    const elapsedSeconds = (Date.now() - this.uploadStartTime) / 1000;
                    if (elapsedSeconds > 0) {
                        this.uploadSpeed = bytesUploaded / elapsedSeconds;
                    }
                    $isoUploadState.set({
                        isUploading: true,
                        uploadProgress: this.uploadProgress,
                        uploadId: uploadId,
                        error: null,
                    });
                },
                onSuccess: async () => {
                    try {
                        await virtualizationAPI.completeISOUpload(uploadId);
                        await isoStore.fetch();
                        this.showNotification('ISO uploaded successfully! 🎉', 'success');
                        this.closeUploadModal();
                    }
                    catch (error) {
                        console.error('Failed to complete upload:', error);
                        this.showNotification('Failed to complete upload', 'error');
                    }
                    finally {
                        this.isUploading = false;
                    }
                },
            });
            this.currentUpload.start();
        }
        catch (error) {
            console.error('Failed to initiate upload:', error);
            this.showNotification(`Failed to initiate upload: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
            this.isUploading = false;
        }
    }
    pauseUpload() {
        if (this.currentUpload) {
            this.currentUpload.abort();
            this.showNotification('Upload paused', 'info');
        }
    }
    cancelUpload() {
        if (this.currentUpload) {
            this.currentUpload.abort();
            this.currentUpload = null;
        }
        this.isUploading = false;
        this.closeUploadModal();
    }
    showNotification(message, type = 'info') {
        this.dispatchEvent(new CustomEvent('show-notification', {
            detail: { message, type },
            bubbles: true,
            composed: true,
        }));
    }
    renderUploadModal() {
        return html `
      <div class="modal-overlay">
        <div class="modal-container">
          <div class="modal-header">
            <div class="modal-title">Upload ISO Image</div>
            <button class="close-button" @click=${this.closeUploadModal}>✕</button>
          </div>
          
          <div class="modal-body">
            ${!this.selectedFile ? html `
              <div 
                class="drop-zone ${this.dragOver ? 'drag-over' : ''}"
                @dragover=${this.handleDragOver}
                @dragleave=${this.handleDragLeave}
                @drop=${this.handleDrop}
                @click=${() => this.shadowRoot?.getElementById('file-input')?.click()}
              >
                <div class="drop-zone-icon">📀</div>
                <div class="drop-zone-text">
                  Drag and drop an ISO file here
                </div>
                <div class="drop-zone-hint">
                  or click to browse
                </div>
              </div>
              
              <input
                type="file"
                id="file-input"
                accept=".iso"
                style="display: none"
                @change=${this.handleFileSelect}
              />
            ` : html `
              <div class="file-info">
                <div class="file-details">
                  <div class="file-name">${this.selectedFile.name}</div>
                  <div class="file-size">${this.formatFileSize(this.selectedFile.size)}</div>
                </div>
                ${!this.isUploading ? html `
                  <button class="btn-secondary" @click=${this.removeSelectedFile}>
                    Remove
                  </button>
                ` : ''}
              </div>
            `}
            
            <div class="form-group">
              <label>OS Type</label>
              <select
                .value=${this.uploadMetadata.os_type}
                @change=${(e) => this.uploadMetadata.os_type = e.target.value}
                ?disabled=${this.isUploading}
              >
                <option value="linux">Linux</option>
                <option value="windows">Windows</option>
                <option value="freebsd">FreeBSD</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div class="form-group">
              <label>OS Variant (Optional)</label>
              <input
                type="text"
                placeholder="e.g., ubuntu-22.04, windows-11, etc."
                .value=${this.uploadMetadata.os_variant}
                @input=${(e) => this.uploadMetadata.os_variant = e.target.value}
                ?disabled=${this.isUploading}
              />
            </div>
            
            <div class="form-group">
              <label>Description (Optional)</label>
              <textarea
                rows="3"
                placeholder="Additional notes about this ISO"
                .value=${this.uploadMetadata.description}
                @input=${(e) => this.uploadMetadata.description = e.target.value}
                ?disabled=${this.isUploading}
              ></textarea>
            </div>
            
            ${this.isUploading ? html `
              <div class="upload-progress">
                <div class="progress-header">
                  <h4>Uploading ISO Image</h4>
                  <span class="progress-percentage">${this.uploadProgress}%</span>
                </div>
                
                <div class="progress-bar-container">
                  <div 
                    class="progress-bar" 
                    style="width: ${this.uploadProgress}%"
                  ></div>
                </div>
                
                <div class="progress-details">
                  <div class="progress-stat">
                    <span class="stat-label">Uploaded</span>
                    <span class="stat-value">
                      ${this.formatFileSize(this.uploadedBytes)} / ${this.formatFileSize(this.totalBytes)}
                    </span>
                  </div>
                  <div class="progress-stat">
                    <span class="stat-label">Speed</span>
                    <span class="stat-value">${this.formatSpeed(this.uploadSpeed)}</span>
                  </div>
                  <div class="progress-stat">
                    <span class="stat-label">Time Remaining</span>
                    <span class="stat-value">${this.calculateTimeRemaining()}</span>
                  </div>
                </div>
                
                <div class="upload-actions">
                  <button class="btn-secondary" @click=${this.pauseUpload}>
                    ⏸️ Pause
                  </button>
                  <button class="btn-danger" @click=${this.cancelUpload}>
                    ❌ Cancel
                  </button>
                </div>
              </div>
            ` : ''}
          </div>
          
          <div class="modal-footer">
            <button class="btn-secondary" @click=${this.closeUploadModal} ?disabled=${this.isUploading}>
              Cancel
            </button>
            ${!this.isUploading ? html `
              <button 
                class="btn-primary" 
                @click=${this.handleUpload}
                ?disabled=${!this.selectedFile}
              >
                Start Upload
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
    }
    render() {
        const state = this.isoStoreController.value;
        const filteredISOs = this.getFilteredISOs();
        const totalSize = filteredISOs.reduce((sum, iso) => sum + iso.size, 0);
        const tableData = filteredISOs.map(iso => ({
            ...iso,
            size_formatted: this.formatFileSize(iso.size),
            uploaded_at_formatted: this.formatDate(iso.uploaded_at),
        }));
        return html `
      <div class="container">
        <div class="header">
          <h1>ISO Images</h1>
        </div>
        
        <div class="stats-bar">
          <div class="stat-item">
            <span class="stat-label">Total ISOs:</span>
            <span class="stat-value">${filteredISOs.length}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Total Size:</span>
            <span class="stat-value">${this.formatFileSize(totalSize)}</span>
          </div>
        </div>
        
        <div class="controls">
          <div class="filters-section">
            <search-input
              .placeholder=${'Search ISO images...'}
              .value=${this.searchQuery}
              @search-change=${this.handleSearchChange}
            ></search-input>
          </div>
          <button class="btn-upload" @click=${this.openUploadModal}>
            <span>📤 Upload ISO</span>
          </button>
        </div>
        
        <div class="content">
          ${state.loading ? html `
            <loading-state message="Loading ISO images..."></loading-state>
          ` : state.error ? html `
            <empty-state
              icon="❌"
              title="Error loading ISO images"
              description=${state.error.message}
            ></empty-state>
          ` : filteredISOs.length === 0 ? html `
            <empty-state
              icon="📀"
              title="No ISO images found"
              description=${this.searchQuery
            ? "No ISOs match your search criteria"
            : "Upload your first ISO image to get started"}
            ></empty-state>
          ` : html `
            <resource-table
              .columns=${this.getColumns()}
              .data=${tableData}
              .actions=${(item) => this.getActions(item)}
              @action=${this.handleAction}
            ></resource-table>
          `}
        </div>
        
        ${this.showUploadModal ? this.renderUploadModal() : ''}
        
        ${this.showDeleteModal && this.isoToDelete ? html `
          <delete-modal
            .open=${this.showDeleteModal}
            .item=${{
            name: this.isoToDelete.name,
            type: 'ISO Image'
        }}
            .loading=${this.isDeleting}
            @delete=${this.handleDelete}
            @close=${() => {
            this.showDeleteModal = false;
            this.isoToDelete = null;
        }}
          ></delete-modal>
        ` : ''}
        
        <notification-container></notification-container>
      </div>
    `;
    }
};
ISOManagementEnhanced.styles = css `
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

    .header h1 {
      margin: 0 0 16px 0;
      font-size: 24px;
      font-weight: 300;
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

    search-input {
      flex: 1;
      max-width: 400px;
    }

    .content {
      flex: 1;
      overflow-y: auto;
    }

    .btn-upload {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s;
    }

    .btn-upload:hover {
      background: var(--vscode-button-hoverBackground);
    }

    /* Upload Modal Styles */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(2px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-container {
      background: var(--vscode-editor-background, #1e1e1e);
      border: 1px solid var(--vscode-editorWidget-border, #464647);
      border-radius: 8px;
      width: 90%;
      max-width: 600px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    }

    .modal-header {
      padding: 20px 24px;
      border-bottom: 1px solid var(--vscode-editorWidget-border, #464647);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--vscode-editor-inactiveSelectionBackground, #252526);
    }

    .modal-title {
      font-size: 18px;
      font-weight: 500;
      color: var(--vscode-foreground, #cccccc);
    }

    .modal-body {
      padding: 24px;
      overflow-y: auto;
      flex: 1;
      background: var(--vscode-editor-background, #1e1e1e);
    }

    .modal-footer {
      padding: 16px 24px;
      border-top: 1px solid var(--vscode-editorWidget-border, #464647);
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      background: var(--vscode-editor-inactiveSelectionBackground, #252526);
    }

    .close-button {
      background: transparent;
      border: none;
      color: var(--vscode-foreground, #cccccc);
      cursor: pointer;
      padding: 4px 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      font-size: 20px;
      line-height: 1;
      transition: all 0.2s;
    }

    .close-button:hover {
      background: var(--vscode-toolbar-hoverBackground, rgba(90, 93, 94, 0.31));
      color: var(--vscode-icon-foreground, #c5c5c5);
    }

    /* Drag and Drop Area */
    .drop-zone {
      border: 2px dashed var(--vscode-input-border, #5a5a5a);
      border-radius: 8px;
      padding: 40px;
      text-align: center;
      transition: all 0.3s;
      cursor: pointer;
      margin-bottom: 20px;
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

    .drop-zone-icon {
      font-size: 48px;
      margin-bottom: 16px;
      opacity: 0.8;
    }

    .drop-zone-text {
      font-size: 16px;
      color: var(--vscode-foreground, #cccccc);
      margin-bottom: 8px;
      font-weight: 500;
    }

    .drop-zone-hint {
      font-size: 13px;
      color: var(--vscode-descriptionForeground, #8b8b8b);
    }

    /* File Info */
    .file-info {
      padding: 16px;
      background: var(--vscode-editor-inactiveSelectionBackground);
      border: 1px solid var(--vscode-editorWidget-border);
      border-radius: 4px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .file-details {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .file-name {
      font-weight: 500;
      color: var(--vscode-foreground);
    }

    .file-size {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
    }

    /* Form Styles */
    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-size: 13px;
      font-weight: 500;
      color: var(--vscode-foreground, #cccccc);
    }

    .form-group input,
    .form-group select,
    .form-group textarea {
      width: 100%;
      padding: 8px 12px;
      background: var(--vscode-input-background, #3c3c3c);
      color: var(--vscode-input-foreground, #cccccc);
      border: 1px solid var(--vscode-input-border, #5a5a5a);
      border-radius: 4px;
      font-size: 13px;
      font-family: inherit;
      transition: all 0.2s;
    }

    .form-group input:focus,
    .form-group select:focus,
    .form-group textarea:focus {
      outline: none;
      border-color: var(--vscode-focusBorder, #007acc);
      box-shadow: 0 0 0 1px var(--vscode-focusBorder, #007acc);
    }

    /* Enhanced Upload Progress Styles */
    .upload-progress {
      margin-top: 20px;
      padding: 20px;
      background: var(--vscode-editor-inactiveSelectionBackground);
      border: 1px solid var(--vscode-editorWidget-border);
      border-radius: 8px;
    }

    .progress-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .progress-header h4 {
      margin: 0;
      font-size: 14px;
      font-weight: 500;
      color: var(--vscode-foreground);
    }

    .progress-percentage {
      font-size: 24px;
      font-weight: bold;
      color: var(--vscode-textLink-activeForeground, #3794ff);
    }

    .progress-bar-container {
      width: 100%;
      height: 24px;
      background: var(--vscode-progressBar-background, #1e1e1e);
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 16px;
      position: relative;
    }

    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, 
        var(--vscode-progressBar-foreground, #007acc) 0%, 
        var(--vscode-textLink-activeForeground, #3794ff) 100%);
      transition: width 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .progress-bar::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      right: 0;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.2),
        transparent
      );
      animation: shimmer 2s infinite;
    }

    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }

    .progress-details {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 16px;
    }

    .progress-stat {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .stat-label {
      font-size: 11px;
      text-transform: uppercase;
      color: var(--vscode-descriptionForeground);
      letter-spacing: 0.5px;
    }

    .stat-value {
      font-size: 14px;
      font-weight: 500;
      color: var(--vscode-foreground);
    }

    .upload-actions {
      display: flex;
      gap: 8px;
      margin-top: 12px;
    }

    /* Buttons */
    button {
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border: 1px solid transparent;
      font-family: inherit;
    }

    .btn-primary {
      background: var(--vscode-button-background, #0e639c);
      color: var(--vscode-button-foreground, #ffffff);
      border: 1px solid var(--vscode-button-background, #0e639c);
    }

    .btn-primary:hover:not(:disabled) {
      background: var(--vscode-button-hoverBackground, #1177bb);
      border-color: var(--vscode-button-hoverBackground, #1177bb);
    }

    .btn-secondary {
      background: var(--vscode-button-secondaryBackground, #3c3c3c);
      color: var(--vscode-button-secondaryForeground, #cccccc);
      border: 1px solid var(--vscode-button-border, #5a5a5a);
    }

    .btn-secondary:hover:not(:disabled) {
      background: var(--vscode-button-secondaryHoverBackground, #45494e);
    }

    .btn-danger {
      background: var(--vscode-inputValidation-errorBackground, #5a1d1d);
      color: var(--vscode-inputValidation-errorForeground, #f48771);
      border: 1px solid var(--vscode-inputValidation-errorBorder, #be1100);
    }

    .btn-danger:hover:not(:disabled) {
      background: var(--vscode-inputValidation-errorBackground);
      opacity: 0.9;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Stats Bar */
    .stats-bar {
      display: flex;
      gap: 2rem;
      padding: 12px 16px;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-editorWidget-border);
      border-radius: 4px;
      font-size: 13px;
      margin-bottom: 1rem;
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  `;
__decorate([
    state()
], ISOManagementEnhanced.prototype, "searchQuery", void 0);
__decorate([
    state()
], ISOManagementEnhanced.prototype, "showUploadModal", void 0);
__decorate([
    state()
], ISOManagementEnhanced.prototype, "showDeleteModal", void 0);
__decorate([
    state()
], ISOManagementEnhanced.prototype, "isoToDelete", void 0);
__decorate([
    state()
], ISOManagementEnhanced.prototype, "isDeleting", void 0);
__decorate([
    state()
], ISOManagementEnhanced.prototype, "selectedFile", void 0);
__decorate([
    state()
], ISOManagementEnhanced.prototype, "uploadMetadata", void 0);
__decorate([
    state()
], ISOManagementEnhanced.prototype, "currentUpload", void 0);
__decorate([
    state()
], ISOManagementEnhanced.prototype, "dragOver", void 0);
__decorate([
    state()
], ISOManagementEnhanced.prototype, "uploadProgress", void 0);
__decorate([
    state()
], ISOManagementEnhanced.prototype, "uploadedBytes", void 0);
__decorate([
    state()
], ISOManagementEnhanced.prototype, "totalBytes", void 0);
__decorate([
    state()
], ISOManagementEnhanced.prototype, "uploadSpeed", void 0);
__decorate([
    state()
], ISOManagementEnhanced.prototype, "uploadStartTime", void 0);
__decorate([
    state()
], ISOManagementEnhanced.prototype, "isUploading", void 0);
ISOManagementEnhanced = __decorate([
    customElement('iso-management-enhanced')
], ISOManagementEnhanced);
export { ISOManagementEnhanced };
//# sourceMappingURL=iso-management-enhanced.js.map