import { LitElement } from 'lit';
import '../../components/ui/search-input';
import '../../components/ui/loading-state';
import '../../components/ui/empty-state';
import '../../components/tables/resource-table';
import '../../components/ui/action-dropdown';
export declare class AnsibleExecutions extends LitElement {
    private loading;
    private searchQuery;
    private executions;
    private statusFilter;
    private showLogsDrawer;
    private selectedExecution;
    static styles: import("lit").CSSResult;
    connectedCallback(): void;
    private loadData;
    private handleSearch;
    private handleStatusFilter;
    private get filteredExecutions();
    private formatDuration;
    private formatDate;
    private getExecutionColumns;
    private getExecutionActions;
    private renderStatusBadge;
    private renderHostStats;
    private handleExecutionAction;
    private handleRefresh;
    private handleRunClick;
    private renderStatsSummary;
    render(): import("lit-html").TemplateResult<1>;
}
//# sourceMappingURL=ansible-executions.d.ts.map