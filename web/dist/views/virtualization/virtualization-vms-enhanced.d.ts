import { LitElement } from 'lit';
import '../../components/ui/search-input.js';
import '../../components/ui/empty-state.js';
import '../../components/ui/loading-state.js';
import '../../components/ui/status-badge.js';
import '../../components/ui/filter-dropdown.js';
import '../../components/tabs/tab-group.js';
import '../../components/tables/resource-table.js';
import '../../components/drawers/detail-drawer.js';
import '../../components/modals/delete-modal.js';
import '../../components/ui/notification-container.js';
import '../../components/virtualization/create-vm-wizard.js';
export declare class VirtualizationVMsEnhanced extends LitElement {
    private vmStoreController;
    private filteredVMsController;
    private resourceStatsController;
    private selectedVMController;
    private activeTabController;
    private searchQueryController;
    private showDeleteModal;
    private vmToDelete;
    private isDeleting;
    private showDetailsDrawer;
    static styles: import("lit").CSSResult;
    private tabs;
    connectedCallback(): Promise<void>;
    private initializeData;
    private getColumns;
    private formatMemory;
    private formatDiskSize;
    private renderStateCell;
    private getActions;
    private handleTabChange;
    private handleSearchChange;
    private handleCellClick;
    private handleAction;
    private viewVMDetails;
    private openConsole;
    private cloneVM;
    private createSnapshot;
    private confirmDeleteVM;
    private handleDelete;
    private handleCreateNew;
    private handleRefresh;
    private showNotification;
    render(): import("lit-html").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        'virtualization-vms-enhanced': VirtualizationVMsEnhanced;
    }
}
//# sourceMappingURL=virtualization-vms-enhanced.d.ts.map