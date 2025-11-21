/**
 * ISO Management View
 * Handles ISO image uploads and management with TUS protocol support
 */

import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { StoreController } from '@nanostores/lit';
import * as tus from 'tus-js-client';

// Import UI components
import '../../components/ui/search-input.js';
import '../../components/ui/empty-state.js';
import '../../components/ui/loading-state.js';
import '../../components/tables/resource-table.js';
import '../../components/modals/delete-modal.js';
import '../../components/ui/notification-container.js';

// Import store and types
import {
  isoStore,
  storagePoolStore,
  $availableISOs,
  $isoUploadState,
  storageActions,
  $virtualizationEnabled,
  $virtualizationDisabledMessage,
} from '../../stores/virtualization';
import type { ISOImage } from '../../types/virtualization';
import { virtualizationAPI } from '../../services/virtualization-api';
import { VirtualizationDisabledError } from '../../utils/api-errors';

// Import types
import type { Column } from '../../components/tables/resource-table.js';
import type { ActionItem } from '../../components/ui/action-dropdown.js';


@customElement('iso-management')
export class ISOManagement extends LitElement {
  // Store controllers
  private isoStoreController = new StoreController(this, isoStore.$state);
  private availableISOsController = new StoreController(this, $availableISOs);
  private _uploadStateController = new StoreController(this, $isoUploadState);
  private virtualizationEnabledController = new StoreController(this, $virtualizationEnabled);
  private virtualizationDisabledMessageController = new StoreController(this, $virtualizationDisabledMessage);

  // Component state
  @state() private searchQuery = '';
  @state() private showUploadDrawer = false;
  @state() private showDeleteModal = false;
  @state() private showDetailDrawer = false;
  @state() private isoToDelete: ISOImage | null = null;
  @state() private selectedISO: ISOImage | null = null;
  @state() private isLoadingDetail = false;
  @state() private isDeleting = false;
  @state() private selectedFile: File | null = null;
  @state() private uploadMetadata = {
    os_type: 'linux',
    os_variant: '',
    description: '',
  };
  @state() private currentUpload: tus.Upload | null = null;
  @state() private dragOver = false;
  @state() private isPaused = false;
  @state() private uploadUrl: string | null = null;
  @state() private uploadId: string | null = null;

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

    /* Button styles are defined below in the general button section */

    /* Drawer Styles */
    .drawer {
      position: fixed;
      top: 0;
      right: 0;
      width: 50%;
      height: 100%;
      background: var(--vscode-editor-background, #1e1e1e);
      border-left: 1px solid var(--vscode-widget-border, #454545);
      box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
      z-index: 1001;
      overflow-y: auto;
      animation: slideIn 0.3s ease-out;
    }

    @media (max-width: 1024px) {
      .drawer {
        width: 80%;
      }
    }

    @media (max-width: 768px) {
      .drawer {
        width: 100%;
      }
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
      }
      to {
        transform: translateX(0);
      }
    }

    .drawer-header {
      padding: 20px 24px;
      border-bottom: 1px solid var(--vscode-editorWidget-border, #464647);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--vscode-editor-inactiveSelectionBackground, #252526);
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .drawer-title {
      font-size: 18px;
      font-weight: 500;
      color: var(--vscode-foreground, #cccccc);
      margin: 0;
    }

    .drawer-content {
      padding: 24px;
      overflow-y: auto;
    }

    .drawer-footer {
      padding: 16px 24px;
      border-top: 1px solid var(--vscode-editorWidget-border, #464647);
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      background: var(--vscode-editor-inactiveSelectionBackground, #252526);
      position: sticky;
      bottom: 0;
      z-index: 10;
    }

    .close-btn {
      background: transparent;
      border: none;
      color: var(--vscode-foreground, #cccccc);
      cursor: pointer;
      padding: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      font-size: 20px;
      line-height: 1;
      transition: all 0.2s;
    }

    .close-btn:hover {
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

    .btn-remove-file {
      padding: 4px 8px;
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: 1px solid var(--vscode-button-border);
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
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

    .form-group textarea {
      resize: vertical;
      min-height: 60px;
    }

    .help-text {
      display: block;
      margin-top: 4px;
      font-size: 12px;
      color: var(--vscode-descriptionForeground, #8b8b8b);
    }

    /* Upload Progress */
    .upload-progress {
      margin-top: 20px;
    }

    .progress-bar-container {
      width: 100%;
      height: 8px;
      background: var(--vscode-progressBar-background, #1e1e1e);
      border-radius: 4px;
      overflow: hidden;
      margin: 12px 0;
      border: 1px solid var(--vscode-input-border, #5a5a5a);
    }

    .progress-bar {
      height: 100%;
      background: var(--vscode-progressBar-foreground, #0e639c);
      background: linear-gradient(90deg, 
        var(--vscode-progressBar-foreground, #0e639c) 0%, 
        var(--vscode-button-hoverBackground, #1177bb) 100%);
      transition: width 0.3s ease;
      box-shadow: 0 0 10px rgba(14, 99, 156, 0.5);
    }

    .progress-info {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
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

    .btn {
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

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: var(--vscode-button-secondaryBackground, #3c3c3c);
      color: var(--vscode-button-secondaryForeground, #cccccc);
      border: 1px solid var(--vscode-button-border, #5a5a5a);
    }

    .btn-secondary:hover:not(:disabled) {
      background: var(--vscode-button-secondaryHoverBackground, #45494e);
      border-color: var(--vscode-button-border, #5a5a5a);
    }

    .btn-secondary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-danger {
      background: var(--vscode-inputValidation-errorBackground, #5a1d1d);
      color: var(--vscode-inputValidation-errorForeground, #f48771);
      border: 1px solid var(--vscode-inputValidation-errorBorder, #be1100);
    }

    .btn-danger:hover:not(:disabled) {
      background: var(--vscode-inputValidation-errorBackground, #5a1d1d);
      opacity: 0.9;
    }

    .btn-danger:disabled {
      opacity: 0.5;
      cursor: not-allowed;
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

    .stat-label {
      color: var(--vscode-descriptionForeground);
    }

    .stat-value {
      font-weight: 600;
      color: var(--vscode-foreground);
    }

    /* Detail Drawer Styles */
    .detail-section {
      margin-bottom: 24px;
    }

    .detail-section h3 {
      font-size: 14px;
      font-weight: 600;
      color: var(--vscode-foreground);
      margin: 0 0 12px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 12px;
    }

    .detail-label {
      font-size: 13px;
      color: var(--vscode-descriptionForeground);
      font-weight: 500;
    }

    .detail-value {
      font-size: 13px;
      color: var(--vscode-foreground);
      word-break: break-word;
    }

    .detail-value.monospace {
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 12px;
    }
  `;

  override async connectedCallback() {
    super.connectedCallback();
    await this.loadData();
  }

  private async loadData() {
    try {
      // Ensure we have a fresh fetch from the API
      await isoStore.fetch();

      // Also refresh storage pools if needed
      await storagePoolStore.fetch();
    } catch (error) {
      console.error('Failed to load ISOs:', error);
      if (!(error instanceof VirtualizationDisabledError)) {
        this.showNotification('Failed to load ISO images', 'error');
      }
    }
  }

  private getColumns(): Column[] {
    return [
      { key: 'name', label: 'Name', type: 'link' },
      { key: 'size_formatted', label: 'Size' },
      { key: 'os_type', label: 'OS Type' },
      { key: 'os_variant', label: 'OS Variant' },
      { key: 'uploaded_at_formatted', label: 'Uploaded' },
      { key: 'storage_pool', label: 'Storage Pool' },
    ];
  }

  private getActions(_iso: ISOImage): ActionItem[] {
    return [
      { label: 'View Detail', action: 'view-detail' },
      { label: 'Download', action: 'download' },
      { label: 'Delete', action: 'delete', danger: true },
    ];
  }

  private formatFileSize(bytes: number | undefined | null): string {
    // Handle undefined, null, or invalid values
    if (bytes === undefined || bytes === null || isNaN(bytes)) {
      return 'Unknown';
    }

    // Handle zero or negative values
    if (bytes <= 0) {
      return '0 B';
    }

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  private formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  private getFilteredISOs(): ISOImage[] {
    const isos = this.availableISOsController.value;

    if (!this.searchQuery) {
      return isos;
    }

    const query = this.searchQuery.toLowerCase();
    return isos.filter(iso =>
      iso.name.toLowerCase().includes(query) ||
      iso.os_type?.toLowerCase().includes(query) ||
      iso.os_variant?.toLowerCase().includes(query)
    );
  }

  private handleSearchChange(event: CustomEvent) {
    this.searchQuery = event.detail.value;
  }

  private handleAction(event: CustomEvent) {
    const { action, item } = event.detail;
    const iso = item as ISOImage;

    switch (action) {
      case 'view-detail':
        this.viewISODetail(iso);
        break;
      case 'download':
        this.downloadISO(iso);
        break;
      case 'delete':
        this.confirmDeleteISO(iso);
        break;
    }
  }

  private handleCellClick(event: CustomEvent) {
    const { item, column } = event.detail;

    // If the name column is clicked, open the detail drawer
    if (column.key === 'name') {
      this.viewISODetail(item as ISOImage);
    }
  }

  private async downloadISO(iso: ISOImage) {
    try {
      // Get auth token
      const token = localStorage.getItem('jwt_token') || localStorage.getItem('auth_token');
      if (!token) {
        this.showNotification('Authentication required', 'error');
        return;
      }

      // Make the download request
      const response = await fetch(`/api/v1/virtualization/isos/${iso.id}/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      // Get the blob from response
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = iso.name;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      this.showNotification(`Downloading ${iso.name}...`, 'success');
    } catch (error) {
      console.error('Failed to download ISO:', error);
      this.showNotification(
        `Failed to download ISO: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      );
    }
  }

  private async viewISODetail(iso: ISOImage) {
    this.showDetailDrawer = true;
    this.isLoadingDetail = true;
    this.selectedISO = iso;

    try {
      // Fetch detailed information from API
      const detailedISO = await virtualizationAPI.getISO(iso.id);
      this.selectedISO = {
        ...iso,
        ...detailedISO,
      };
    } catch (error) {
      console.error('Failed to fetch ISO details:', error);
      this.showNotification(
        `Failed to load ISO details: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      );
    } finally {
      this.isLoadingDetail = false;
    }
  }

  private closeDetailDrawer() {
    this.showDetailDrawer = false;
    this.selectedISO = null;
    this.isLoadingDetail = false;
  }

  private confirmDeleteISO(iso: ISOImage) {
    this.isoToDelete = iso;
    this.showDeleteModal = true;
    // Force update to ensure modal renders
    this.requestUpdate();
  }

  private async handleDelete() {
    if (!this.isoToDelete) return;

    this.isDeleting = true;

    try {
      await storageActions.deleteISO(this.isoToDelete.id);
      this.showNotification(`ISO "${this.isoToDelete.name}" deleted successfully`, 'success');
      this.showDeleteModal = false;
      this.isoToDelete = null;
    } catch (error) {
      console.error('Failed to delete ISO:', error);
      this.showNotification(
        `Failed to delete ISO: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      );
    } finally {
      this.isDeleting = false;
    }
  }

  private openUploadDrawer() {
    this.showUploadDrawer = true;
    this.selectedFile = null;
    this.uploadMetadata = {
      os_type: 'linux',
      os_variant: '',
      description: '',
    };
  }

  private closeUploadDrawer() {
    if (this.currentUpload) {
      this.currentUpload.abort();
      this.currentUpload = null;

      // Reset upload state when closing drawer with active upload
      $isoUploadState.set({
        isUploading: false,
        uploadProgress: 0,
        uploadId: null,
        error: null,
      });
    }
    this.showUploadDrawer = false;
    this.selectedFile = null;

    // Reset metadata to defaults
    this.uploadMetadata = {
      os_type: 'linux',
      os_variant: '',
      description: '',
    };
  }

  private handleDragOver(event: DragEvent) {
    event.preventDefault();
    this.dragOver = true;
  }

  private handleDragLeave(event: DragEvent) {
    event.preventDefault();
    this.dragOver = false;
  }

  private handleDrop(event: DragEvent) {
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

  private handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;

    if (files && files.length > 0) {
      const file = files[0];
      if (file && this.validateFile(file)) {
        this.selectedFile = file;
      }
    }
  }

  private validateFile(file: File): boolean {
    // Check if it's an ISO file
    if (!file.name.toLowerCase().endsWith('.iso')) {
      this.showNotification('Please select an ISO file', 'error');
      return false;
    }

    // Check file size (max 10GB)
    const maxSize = 10 * 1024 * 1024 * 1024; // 10GB
    if (file.size > maxSize) {
      this.showNotification('File size exceeds 10GB limit', 'error');
      return false;
    }

    return true;
  }

  private removeSelectedFile() {
    this.selectedFile = null;
  }

  private async handleUpload() {
    if (!this.selectedFile) {
      this.showNotification('Please select a file to upload', 'error');
      return;
    }

    try {
      // Only initiate new upload session if we don't have one already (for resume)
      if (!this.uploadUrl || !this.uploadId) {
        // Initiate TUS upload session with the API
        const { uploadUrl, uploadId } = await virtualizationAPI.initiateISOUpload({
          filename: this.selectedFile.name,
          size: this.selectedFile.size,
          os_type: this.uploadMetadata.os_type,
          os_variant: this.uploadMetadata.os_variant,
          description: this.uploadMetadata.description,
        });
        this.uploadUrl = uploadUrl;
        this.uploadId = uploadId;
      }

      // Set upload state
      $isoUploadState.set({
        isUploading: true,
        uploadProgress: this.isPaused ? $isoUploadState.get().uploadProgress : 0,
        uploadId: this.uploadId,
        error: null,
      });

      this.isPaused = false;

      // Create TUS upload client
      this.currentUpload = new tus.Upload(this.selectedFile, {
        uploadUrl: this.uploadUrl!,
        // Use 10MB chunks as recommended in the OpenAPI spec
        chunkSize: 10 * 1024 * 1024, // 10MB chunks
        // TUS metadata is already sent during session creation,
        // but we can include it here for the client's reference
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
        // Disable automatic upload offset detection to avoid CORS issues
        // The server needs to expose Upload-Offset header in Access-Control-Expose-Headers
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        // Enable retries on failure
        retryDelays: [0, 1000, 3000, 5000],
        onError: (error) => {
          console.error('Upload failed:', error);
          this.showNotification(`Upload failed: ${error.message}`, 'error');
          this.currentUpload = null;

          // Reset upload state on error
          $isoUploadState.set({
            isUploading: false,
            uploadProgress: 0,
            uploadId: null,
            error: error.message,
          });
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          // Calculate progress based on total file size, not chunk size
          const percentage = Math.round((bytesUploaded / bytesTotal) * 100);

          // Update the upload progress state
          $isoUploadState.set({
            ...$isoUploadState.get(),
            uploadProgress: percentage,
          });
        },
        onSuccess: async () => {
          try {
            // Complete the upload
            await virtualizationAPI.completeISOUpload(this.uploadId!);

            // Reset upload state
            $isoUploadState.set({
              isUploading: false,
              uploadProgress: 0,
              uploadId: null,
              error: null,
            });

            // Refresh ISO list to show the newly uploaded ISO
            await isoStore.fetch();

            this.showNotification('ISO uploaded successfully', 'success');
            this.closeUploadDrawer();
          } catch (error) {
            console.error('Failed to complete upload:', error);
            this.showNotification('Failed to complete upload', 'error');

            // Reset upload state on error
            $isoUploadState.set({
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
      console.error('Failed to initiate upload:', error);
      this.showNotification(
        `Failed to initiate upload: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      );
    }
  }

  private pauseUpload() {
    if (this.currentUpload) {
      this.currentUpload.abort();
      this.isPaused = true;

      // Update store to reflect paused state
      $isoUploadState.set({
        ...$isoUploadState.get(),
        isUploading: false,
      });

      this.showNotification('Upload paused - click Resume to continue', 'info');
    }
  }

  private resumeUpload() {
    if (this.isPaused && this.selectedFile && this.uploadUrl) {
      this.isPaused = false;
      // Re-initiate the upload from where it left off
      this.handleUpload();
      this.showNotification('Upload resumed', 'info');
    }
  }

  private cancelUpload() {
    if (this.currentUpload) {
      this.currentUpload.abort();
      this.currentUpload = null;
    }

    // Reset upload state completely
    $isoUploadState.set({
      isUploading: false,
      uploadProgress: 0,
      uploadId: null,
      error: null,
    });

    // Reset component state
    this.selectedFile = null;
    this.isPaused = false;
    this.uploadUrl = null;
    this.uploadId = null;

    // Close the drawer
    this.closeUploadDrawer();
  }

  private showNotification(message: string, type: 'success' | 'error' | 'info' = 'info') {
    this.dispatchEvent(new CustomEvent('show-notification', {
      detail: { message, type },
      bubbles: true,
      composed: true,
    }));
  }

  private renderDetailDrawer() {
    if (!this.selectedISO) return '';

    return html`
      <div class="drawer">
        <div class="drawer-header">
          <h2 class="drawer-title">ISO Image Details</h2>
          <button class="close-btn" @click=${this.closeDetailDrawer}>✕</button>
        </div>
        
        <div class="drawer-content">
          ${this.isLoadingDetail ? html`
            <loading-state message="Loading ISO details..."></loading-state>
          ` : html`
            <div class="detail-section">
              <h3>General Information</h3>
              <div class="detail-grid">
                <div class="detail-label">Name:</div>
                <div class="detail-value">${this.selectedISO.name}</div>
                
                <div class="detail-label">Size:</div>
                <div class="detail-value">${this.formatFileSize(this.selectedISO.size)}</div>
                
                <div class="detail-label">OS Type:</div>
                <div class="detail-value">${this.selectedISO.os_type || 'Unknown'}</div>
                
                <div class="detail-label">OS Variant:</div>
                <div class="detail-value">${this.selectedISO.os_variant || 'Not specified'}</div>
                
                <div class="detail-label">Architecture:</div>
                <div class="detail-value">${this.selectedISO.architecture || 'Not specified'}</div>
                
                <div class="detail-label">Storage Pool:</div>
                <div class="detail-value">${this.selectedISO.storage_pool || 'default'}</div>
                
                <div class="detail-label">Uploaded:</div>
                <div class="detail-value">${this.formatDate(this.selectedISO.uploaded_at)}</div>
              </div>
            </div>
            
            <div class="detail-section">
              <h3>File Information</h3>
              <div class="detail-grid">
                <div class="detail-label">File Path:</div>
                <div class="detail-value monospace">${this.selectedISO.path}</div>
                
                ${this.selectedISO.checksum ? html`
                  <div class="detail-label">Checksum:</div>
                  <div class="detail-value monospace">${this.selectedISO.checksum}</div>
                ` : ''}
                
                <div class="detail-label">ID:</div>
                <div class="detail-value monospace">${this.selectedISO.id}</div>
              </div>
            </div>
            
            ${this.selectedISO.description ? html`
              <div class="detail-section">
                <h3>Description</h3>
                <div class="detail-value">${this.selectedISO.description}</div>
              </div>
            ` : ''}
          `}
        </div>
        
        <div class="drawer-footer">
          <button 
            class="btn btn-secondary" 
            @click=${() => this.downloadISO(this.selectedISO!)}
            ?disabled=${this.isLoadingDetail}
          >
            Download ISO
          </button>
          <button class="btn btn-primary" @click=${this.closeDetailDrawer}>
            Close
          </button>
        </div>
      </div>
    `;
  }

  private renderUploadDrawer() {
    const uploadState = this._uploadStateController.value;
    const isUploading = uploadState.isUploading || this.isPaused;

    return html`
      <div class="drawer">
        <div class="drawer-header">
          <h2 class="drawer-title">Upload ISO Image</h2>
          <button class="close-btn" @click=${this.closeUploadDrawer}>✕</button>
        </div>
        
        <div class="drawer-content">
            ${!this.selectedFile ? html`
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
            ` : html`
              <div class="file-info">
                <div class="file-details">
                  <div class="file-name">${this.selectedFile.name}</div>
                  <div class="file-size">${this.formatFileSize(this.selectedFile.size)}</div>
                </div>
                ${!isUploading ? html`
                  <button class="btn-remove-file" @click=${this.removeSelectedFile}>
                    Remove
                  </button>
                ` : ''}
              </div>
            `}
            
            <div class="form-group">
              <label>OS Type</label>
              <select
                .value=${this.uploadMetadata.os_type}
                @change=${(e: Event) =>
        this.uploadMetadata.os_type = (e.target as HTMLSelectElement).value
      }
                ?disabled=${isUploading}
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
                @input=${(e: InputEvent) =>
        this.uploadMetadata.os_variant = (e.target as HTMLInputElement).value
      }
                ?disabled=${isUploading}
              />
              <div class="help-text">
                Specify the exact OS version or distribution
              </div>
            </div>
            
            <div class="form-group">
              <label>Description (Optional)</label>
              <textarea
                rows="3"
                placeholder="Additional notes about this ISO"
                .value=${this.uploadMetadata.description}
                @input=${(e: InputEvent) =>
        this.uploadMetadata.description = (e.target as HTMLTextAreaElement).value
      }
                ?disabled=${isUploading}
              ></textarea>
            </div>
            
            ${(uploadState.isUploading || this.isPaused) ? html`
              <div class="upload-progress">
                <div class="progress-info">
                  <span>${this.isPaused ? 'Upload Paused' : 'Uploading...'}</span>
                  <span>${uploadState.uploadProgress}%</span>
                </div>
                <div class="progress-bar-container">
                  <div 
                    class="progress-bar" 
                    style="width: ${uploadState.uploadProgress}%"
                  ></div>
                </div>
                <div class="upload-actions">
                  ${this.isPaused ? html`
                    <button class="btn-primary" @click=${this.resumeUpload}>
                      Resume
                    </button>
                  ` : html`
                    <button class="btn-secondary" @click=${this.pauseUpload}>
                      Pause
                    </button>
                  `}
                  <button class="btn-danger" @click=${this.cancelUpload}>
                    Cancel
                  </button>
                </div>
              </div>
            ` : ''}
        </div>
        
        <div class="drawer-footer">
          <button class="btn btn-secondary" @click=${this.closeUploadDrawer}>
            Cancel
          </button>
          ${!isUploading ? html`
            <button 
              class="btn btn-primary" 
              @click=${this.handleUpload}
              ?disabled=${!this.selectedFile}
            >
              Start Upload
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  private renderVirtualizationDisabledBanner(details?: string | null) {
    return html`
      <div class="virtualization-disabled-banner">
        <h2>Virtualization is disabled on this host</h2>
        <p>Virtualization features are currently unavailable because libvirt is not installed or not running.\
 ISO image management is disabled until virtualization support is available on this host.</p>
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

    const state = this.isoStoreController.value;
    const filteredISOs = this.getFilteredISOs();
    // const uploadState = this.uploadStateController.value;

    // Calculate total size (handle undefined/null size values)
    const totalSize = filteredISOs.reduce((sum, iso) => {
      const size = iso.size || 0;
      return sum + (isNaN(size) ? 0 : size);
    }, 0);

    // Transform data for table
    const tableData = filteredISOs.map(iso => ({
      ...iso,
      size_formatted: this.formatFileSize(iso.size),
      uploaded_at_formatted: this.formatDate(iso.uploaded_at),
    }));

    return html`
      <div class="container">
        
        <!-- Stats Bar -->
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
        
        <!-- Controls -->
        <div class="controls">
          <div class="filters-section">
            <search-input
              .placeholder=${'Search ISO images...'}
              .value=${this.searchQuery}
              @search-change=${this.handleSearchChange}
            ></search-input>
          </div>
          <button class="btn btn-primary" @click=${this.openUploadDrawer}>
            Upload ISO
          </button>
        </div>
        
        <!-- Content -->
        <div class="content">
          ${state.loading ? html`
            <loading-state message="Loading ISO images..."></loading-state>
          ` : state.error ? html`
            <empty-state
              icon="❌"
              title="Error loading ISO images"
              description=${state.error.message}
            ></empty-state>
          ` : filteredISOs.length === 0 ? html`
            <empty-state
              icon="📀"
              title="No ISO images found"
              description=${this.searchQuery
          ? "No ISOs match your search criteria"
          : "Upload your first ISO image to get started"}
            ></empty-state>
          ` : html`
            <resource-table
              .columns=${this.getColumns()}
              .data=${tableData}
              .getActions=${(item: ISOImage) => this.getActions(item)}
              @action=${this.handleAction}
              @cell-click=${this.handleCellClick}
            ></resource-table>
          `}
        </div>
        
        <!-- Upload Drawer -->
        ${this.showUploadDrawer ? this.renderUploadDrawer() : ''}
        
        <!-- Detail Drawer -->
        ${this.showDetailDrawer ? this.renderDetailDrawer() : ''}
        
        <!-- Delete Confirmation Modal -->
        ${this.showDeleteModal && this.isoToDelete ? html`
          <delete-modal
            .show=${true}
            .item=${{ name: this.isoToDelete.name, type: 'ISO Image' }}
            .loading=${this.isDeleting}
            @confirm-delete=${this.handleDelete}
            @cancel-delete=${() => {
          this.showDeleteModal = false;
          this.isoToDelete = null;
          this.requestUpdate();
        }}
          ></delete-modal>
        ` : ''}
        
        <!-- Notification Container -->
        <notification-container></notification-container>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'iso-management': ISOManagement;
  }
}
