import { LitElement } from 'lit';
import type { KubernetesNamespace, KubernetesPod, KubernetesDeployment, KubernetesStatefulSet, KubernetesDaemonSet, KubernetesJob, KubernetesCronJob } from '../../services/kubernetes-api.js';
import '../../components/ui/search-input.js';
import '../../components/ui/empty-state.js';
import '../../components/ui/loading-state.js';
import '../../components/ui/namespace-dropdown.js';
import '../../components/tabs/tab-group.js';
import '../../components/tables/resource-table.js';
import '../../components/drawers/detail-drawer.js';
import '../../components/drawers/logs-drawer.js';
import '../../components/modals/delete-modal.js';
import '../../components/kubernetes/resource-detail-view.js';
import '../../components/drawers/create-resource-drawer';
import '../../components/ui/notification-container';
type WorkloadResource = KubernetesPod | KubernetesDeployment | KubernetesStatefulSet | KubernetesDaemonSet | KubernetesJob | KubernetesCronJob;
export declare class KubernetesWorkloads extends LitElement {
    workloads: WorkloadResource[];
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
    private showLogsDrawer;
    private logsData;
    private logsLoading;
    private logsError;
    private logsPodName;
    private logsNamespace;
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
    private viewLogs;
    private editItem;
    private deleteItem;
    private handleConfirmDelete;
    private handleCancelDelete;
    private handleCreate;
    private handleCreateResource;
    private handleDetailsClose;
    private handleLogsClose;
    private handleLogsRefresh;
    fetchData(): Promise<void>;
    connectedCallback(): void;
    render(): import("lit-html").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        'kubernetes-workloads': KubernetesWorkloads;
    }
}
export {};
//# sourceMappingURL=kubernetes-workloads.d.ts.map