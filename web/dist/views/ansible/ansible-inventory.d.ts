import { LitElement } from 'lit';
import '../../components/ui/search-input';
import '../../components/ui/loading-state';
import '../../components/ui/empty-state';
import '../../components/tables/resource-table';
import '../../components/ui/action-dropdown';
export declare class AnsibleInventory extends LitElement {
    private loading;
    private searchQuery;
    private inventoryItems;
    private typeFilter;
    private selectedItems;
    static styles: import("lit").CSSResult;
    connectedCallback(): void;
    private loadInventory;
    private handleSearch;
    private handleTypeFilter;
    private get filteredItems();
    private getColumns;
    private handleAction;
    private handleAddHost;
    private handleAddGroup;
    private handleSync;
    render(): import("lit-html").TemplateResult<1>;
}
//# sourceMappingURL=ansible-inventory.d.ts.map