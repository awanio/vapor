import { LitElement } from 'lit';
import '../../components/ui/search-input.js';
import '../../components/ui/empty-state.js';
import '../../components/ui/loading-state.js';
import '../../components/tables/resource-table.js';
import '../../components/modals/delete-modal.js';
import '../../components/ui/notification-container.js';
export declare class ISOManagementEnhanced extends LitElement {
    private isoStoreController;
    private availableISOsController;
    private _uploadStateController;
    private searchQuery;
    private showUploadModal;
    private showDeleteModal;
    private isoToDelete;
    private isDeleting;
    private selectedFile;
    private uploadMetadata;
    private currentUpload;
    private dragOver;
    private uploadProgress;
    private uploadedBytes;
    private totalBytes;
    private uploadSpeed;
    private uploadStartTime;
    private isUploading;
    static styles: import("lit").CSSResult;
    connectedCallback(): Promise<void>;
    private loadData;
    private getColumns;
    private getActions;
    private formatFileSize;
    private formatSpeed;
    private calculateTimeRemaining;
    private formatDate;
    private getFilteredISOs;
    private handleSearchChange;
    private handleAction;
    private downloadISO;
    private copyISOPath;
    private confirmDeleteISO;
    private handleDelete;
    private openUploadModal;
    private closeUploadModal;
    private resetUploadProgress;
    private handleDragOver;
    private handleDragLeave;
    private handleDrop;
    private handleFileSelect;
    private validateFile;
    private removeSelectedFile;
    private handleUpload;
    private pauseUpload;
    private cancelUpload;
    private showNotification;
    private renderUploadModal;
    render(): import("lit-html").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        'iso-management-enhanced': ISOManagementEnhanced;
    }
}
//# sourceMappingURL=iso-management-enhanced.d.ts.map