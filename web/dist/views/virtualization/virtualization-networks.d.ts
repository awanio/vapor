import { LitElement } from 'lit';
import '../../components/ui/search-input.js';
import '../../components/ui/empty-state.js';
import '../../components/ui/loading-state.js';
import '../../components/tabs/tab-group.js';
import '../../components/tables/resource-table.js';
import '../../components/drawers/detail-drawer.js';
import '../../components/modals/delete-modal.js';
import '../../components/drawers/create-resource-drawer';
interface VirtualNetwork {
    id: string;
    name: string;
    type: 'bridge' | 'nat' | 'isolated' | 'open' | 'macvtap' | 'host';
    state: 'active' | 'inactive';
    bridge: string;
    ipRange: string;
    dhcp: boolean;
    autostart: boolean;
    persistent: boolean;
    devices: number;
    created: string;
}
export declare class VirtualizationNetworks extends LitElement {
    networks: VirtualNetwork[];
    searchQuery: string;
    loading: boolean;
    error: string | null;
    private activeTab;
    private showDetails;
    private selectedNetwork;
    private showDeleteModal;
    private itemToDelete;
    private isDeleting;
    private showCreateDrawer;
    private createResourceValue;
    private isCreating;
    static styles: import("lit").CSSResult;
    private tabs;
    private dummyNetworks;
    connectedCallback(): void;
    private loadData;
    private getColumns;
    private getActions;
    private getFilteredData;
    private handleTabChange;
    private handleCellClick;
    private handleAction;
    private viewDetails;
    private viewDHCPLeases;
    private changeNetworkState;
    private cloneNetwork;
    private editNetwork;
    private deleteNetwork;
    private handleDelete;
    private handleCreateNew;
    private handleSearchChange;
    private handleCreateResource;
    private renderNetworkType;
    render(): import("lit-html").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        'virtualization-networks': VirtualizationNetworks;
    }
}
export {};
//# sourceMappingURL=virtualization-networks.d.ts.map