import { LitElement } from 'lit';
import type { KubernetesNamespace, KubernetesService, KubernetesIngress, KubernetesIngressClass, KubernetesNetworkPolicy } from '../../services/kubernetes-api.js';
import '../../components/ui/search-input.js';
import '../../components/ui/empty-state.js';
import '../../components/ui/loading-state.js';
import '../../components/ui/namespace-dropdown.js';
import '../../components/tabs/tab-group.js';
import '../../components/tables/resource-table.js';
import '../../components/drawers/detail-drawer.js';
import '../../components/modals/delete-modal.js';
import '../../components/kubernetes/resource-detail-view.js';
import '../../components/drawers/create-resource-drawer';
import '../../components/ui/notification-container';
type NetworkResource = KubernetesService | KubernetesIngress | KubernetesIngressClass | KubernetesNetworkPolicy;
export declare class KubernetesNetworks extends LitElement {
    resources: NetworkResource[];
    namespaces: KubernetesNamespace[];
    selectedNamespace: string;
    searchQuery: string;
    loading: boolean;
    error: string | null;
    private activeTab;
    private showDetails;
    private selectedItem;
    private loadingDetails;
    private detailsData;
    private showDeleteModal;
    private itemToDelete;
    private isDeleting;
    private showCreateDrawer;
    private createResourceValue;
    private createDrawerTitle;
    private isCreating;
    static styles: import("lit").CSSResult;
    private tabs;
    private getColumns;
    private getActions;
    private getFilteredData;
    private getResourceType;
    private handleTabChange;
    private handleSearchChange;
    private handleNamespaceChange;
    private handleCellClick;
    private handleAction;
    private viewDetails;
    private editItem;
    private deleteItem;
    private handleConfirmDelete;
    private handleCancelDelete;
    private handleCreate;
    private handleCreateResource;
    private handleDetailsClose;
    fetchData(): Promise<void>;
    connectedCallback(): void;
    render(): import("lit-html").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        'kubernetes-networks': KubernetesNetworks;
    }
}
export {};
//# sourceMappingURL=kubernetes-networks.d.ts.map