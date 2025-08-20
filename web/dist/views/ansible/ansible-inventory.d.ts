import { LitElement } from 'lit';
import '../../components/ui/search-input';
import '../../components/ui/loading-state';
import '../../components/ui/empty-state';
import '../../components/tables/resource-table';
import '../../components/ui/action-dropdown';
export declare class AnsibleInventoryView extends LitElement {
    private loading;
    private searchQuery;
    private inventoryItems;
    private typeFilter;
    static styles: import("lit").CSSResult;
    connectedCallback(): void;
    private loadInventory;
    private convertInventoryToItems;
    private getHostGroups;
    private handleSearch;
    private handleTypeFilter;
    private get filteredItems();
    private getColumns;
    private getInventoryActions;
    private prepareTableData;
    private handleCellClick;
    private handleAction;
    private handleAddHost;
    private handleAddGroup;
    private handleSync;
    private saveInventory;
    private convertItemsToInventory;
    render(): import("lit-html").TemplateResult<1>;
}
//# sourceMappingURL=ansible-inventory.d.ts.map