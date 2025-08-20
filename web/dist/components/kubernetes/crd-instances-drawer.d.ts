import { LitElement } from 'lit';
import '../ui/search-input.js';
import '../ui/namespace-dropdown.js';
import '../ui/empty-state.js';
import '../ui/loading-state.js';
import '../tables/resource-table.js';
import '../drawers/detail-drawer.js';
import '../kubernetes/resource-detail-view.js';
export interface CRDInstance {
    name: string;
    namespace?: string;
    apiVersion: string;
    kind: string;
    status?: string;
    age: string;
    labels?: {
        [key: string]: string;
    };
    annotations?: {
        [key: string]: string;
    };
}
export declare class CRDInstancesDrawer extends LitElement {
    show: boolean;
    crdName: string;
    crdKind: string;
    crdGroup: string;
    crdVersion: string;
    crdScope: string;
    loading: boolean;
    private searchQuery;
    private selectedNamespace;
    private instances;
    private showInstanceDetails;
    private selectedInstance;
    private instanceDetailsData;
    private loadingDetails;
    private error;
    static styles: import("lit").CSSResult;
    private fetchInstances;
    private fetchInstanceDetails;
    private calculateAge;
    private getColumns;
    private getActions;
    private getFilteredInstances;
    private handleSearchChange;
    private handleNamespaceChange;
    private handleCellClick;
    private handleAction;
    private deleteInstance;
    private viewInstanceDetails;
    private handleInstanceDetailsClose;
    private handleClose;
    connectedCallback(): void;
    updated(changedProperties: Map<string, any>): void;
    render(): import("lit-html").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        'crd-instances-drawer': CRDInstancesDrawer;
    }
}
//# sourceMappingURL=crd-instances-drawer.d.ts.map