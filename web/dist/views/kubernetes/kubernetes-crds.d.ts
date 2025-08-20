import { LitElement } from 'lit';
import type { KubernetesCRD } from '../../services/kubernetes-api.js';
import '../../components/ui/search-input.js';
import '../../components/ui/empty-state.js';
import '../../components/ui/loading-state.js';
import '../../components/tables/resource-table.js';
import '../../components/drawers/detail-drawer.js';
import '../../components/modals/delete-modal.js';
import '../../components/kubernetes/resource-detail-view.js';
import '../../components/kubernetes/crd-instances-drawer.js';
import '../../components/drawers/create-resource-drawer';
import '../../components/ui/notification-container';
export declare class KubernetesCRDs extends LitElement {
    resources: KubernetesCRD[];
    searchQuery: string;
    loading: boolean;
    error: string | null;
    private showDetails;
    private selectedItem;
    private loadingDetails;
    private detailsData;
    private showDeleteModal;
    private itemToDelete;
    private isDeleting;
    private showCreateDrawer;
    private createResourceValue;
    private isCreating;
    private showInstancesDrawer;
    private selectedCRDForInstances;
    static styles: import("lit").CSSResult;
    private getColumns;
    private getActions;
    private getFilteredData;
    private handleSearchChange;
    private handleCellClick;
    private handleAction;
    private viewDetails;
    private viewInstances;
    private deleteItem;
    private handleConfirmDelete;
    private handleCancelDelete;
    private handleCreate;
    private handleCreateResource;
    private handleDetailsClose;
    private handleInstancesDrawerClose;
    fetchData(): Promise<void>;
    connectedCallback(): void;
    render(): import("lit-html").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        'kubernetes-crds': KubernetesCRDs;
    }
}
//# sourceMappingURL=kubernetes-crds.d.ts.map