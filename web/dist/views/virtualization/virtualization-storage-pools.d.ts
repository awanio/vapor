import { LitElement } from 'lit';
import '../../components/ui/search-input.js';
import '../../components/ui/empty-state.js';
import '../../components/ui/loading-state.js';
import '../../components/tabs/tab-group.js';
import '../../components/tables/resource-table.js';
import '../../components/drawers/detail-drawer.js';
import '../../components/modals/delete-modal.js';
import '../../components/drawers/create-resource-drawer';
interface StoragePool {
    id: string;
    name: string;
    type: 'dir' | 'fs' | 'logical' | 'disk' | 'iscsi' | 'nfs' | 'gluster' | 'ceph';
    state: 'active' | 'inactive' | 'building';
    capacity: string;
    allocated: string;
    available: string;
    usage: number;
    path: string;
    autostart: boolean;
    created: string;
}
export declare class VirtualizationStoragePools extends LitElement {
    pools: StoragePool[];
    searchQuery: string;
    loading: boolean;
    error: string | null;
    private activeTab;
    private showDetails;
    private selectedPool;
    private showDeleteModal;
    private itemToDelete;
    private isDeleting;
    private showCreateDrawer;
    private createResourceValue;
    private isCreating;
    static styles: import("lit").CSSResult;
    private tabs;
    private dummyPools;
    connectedCallback(): void;
    private loadData;
    private getColumns;
    private getActions;
    private getFilteredData;
    private handleTabChange;
    private handleCellClick;
    private handleAction;
    private viewDetails;
    private browsePool;
    private refreshPool;
    private changePoolState;
    private editPool;
    private deletePool;
    private handleDelete;
    private handleCreateNew;
    private handleSearchChange;
    private handleCreateResource;
    private getUsageClass;
    render(): import("lit-html").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        'virtualization-storage-pools': VirtualizationStoragePools;
    }
}
export {};
//# sourceMappingURL=virtualization-storage-pools.d.ts.map