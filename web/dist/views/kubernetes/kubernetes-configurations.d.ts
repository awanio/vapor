import { LitElement } from 'lit';
import type { KubernetesNamespace, KubernetesConfigMap, KubernetesSecret } from '../../services/kubernetes-api.js';
import '../../components/ui/search-input.js';
import '../../components/ui/empty-state.js';
import '../../components/ui/loading-state.js';
import '../../components/ui/namespace-dropdown.js';
import '../../components/tabs/tab-group.js';
import '../../components/tables/resource-table.js';
import '../../components/drawers/detail-drawer.js';
import '../../components/modals/delete-modal.js';
import '../../components/kubernetes/resource-detail-view.js';
type ConfigResource = KubernetesConfigMap | KubernetesSecret;
export declare class KubernetesConfigurations extends LitElement {
    resources: ConfigResource[];
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
    private getSecretTypeClass;
    private getSecretTypeLabel;
    private handleAction;
    private viewDetails;
    private editItem;
    private deleteItem;
    private handleConfirmDelete;
    private handleCancelDelete;
    private handleCreate;
    private handleDetailsClose;
    fetchData(): Promise<void>;
    connectedCallback(): void;
    render(): import("lit-html").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        'kubernetes-configurations': KubernetesConfigurations;
    }
}
export {};
//# sourceMappingURL=kubernetes-configurations.d.ts.map