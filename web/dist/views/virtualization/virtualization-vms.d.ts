import { LitElement } from 'lit';
import '../../components/ui/search-input.js';
import '../../components/ui/empty-state.js';
import '../../components/ui/loading-state.js';
import '../../components/tabs/tab-group.js';
import '../../components/tables/resource-table.js';
import '../../components/drawers/detail-drawer.js';
import '../../components/modals/delete-modal.js';
import '../../components/drawers/create-resource-drawer';
import '../../components/ui/notification-container';
interface VirtualMachine {
    id: string;
    name: string;
    state: 'running' | 'stopped' | 'paused' | 'suspended';
    cpu: number;
    memory: string;
    storage: string;
    os: string;
    ipAddress: string;
    created: string;
}
export declare class VirtualizationVMs extends LitElement {
    vms: VirtualMachine[];
    searchQuery: string;
    loading: boolean;
    error: string | null;
    private activeTab;
    private showDetails;
    private selectedVM;
    private showDeleteModal;
    private itemToDelete;
    private isDeleting;
    private showCreateDrawer;
    private createResourceValue;
    private isCreating;
    static styles: import("lit").CSSResult;
    private tabs;
    private dummyVMs;
    connectedCallback(): void;
    private loadData;
    private getColumns;
    private getActions;
    private getFilteredData;
    private handleTabChange;
    private handleCellClick;
    private handleAction;
    private viewDetails;
    private openConsole;
    private changeVMState;
    private cloneVM;
    private editVM;
    private createSnapshot;
    private deleteVM;
    private handleDelete;
    private handleCreateNew;
    private handleSearchChange;
    private handleCreateResource;
    render(): import("lit-html").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        'virtualization-vms': VirtualizationVMs;
    }
}
export {};
//# sourceMappingURL=virtualization-vms.d.ts.map