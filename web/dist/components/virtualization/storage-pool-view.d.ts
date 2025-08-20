import { LitElement } from 'lit';
import '../ui/loading-state.js';
import '../ui/empty-state.js';
import '../ui/status-badge.js';
import './storage-pool-actions.js';
import './volume-dialog.js';
export declare class StoragePoolView extends LitElement {
    private storagePoolsController;
    private selectedPoolController;
    private isLoading;
    private volumes;
    private expandedPools;
    private viewMode;
    private showVolumeDialog;
    private selectedPoolForVolume;
    private searchQuery;
    static styles: import("lit").CSSResult;
    connectedCallback(): void;
    private loadStoragePools;
    private loadVolumes;
    private togglePoolExpansion;
    private selectPool;
    private formatSize;
    private calculateUsagePercentage;
    private getUsageClass;
    private getPoolIcon;
    private handleCreatePool;
    private handleCreateVolume;
    private handleVolumeCreated;
    private handleDeleteVolume;
    private handleRefreshPool;
    private filterPools;
    private renderPoolCard;
    private renderPoolListItem;
    render(): import("lit-html").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        'storage-pool-view': StoragePoolView;
    }
}
//# sourceMappingURL=storage-pool-view.d.ts.map