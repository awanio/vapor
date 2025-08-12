import { LitElement } from 'lit';
import '../../components/ui/search-input';
import '../../components/ui/loading-state';
import '../../components/ui/empty-state';
import '../../components/tabs/tab-group';
import '../../components/tables/resource-table';
import '../../components/ui/action-dropdown';
export declare class AnsiblePlaybooks extends LitElement {
    initialTab: string;
    private loading;
    private activeTab;
    private searchQuery;
    private playbooks;
    private templates;
    private showCreateDropdown;
    static styles: import("lit").CSSResult;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private handleOutsideClick;
    private handleLocationChange;
    private loadData;
    private handleTabClick;
    private handleSearch;
    private get filteredPlaybooks();
    private get filteredTemplates();
    private formatDate;
    private getPlaybooksColumns;
    private getTemplatesColumns;
    private getPlaybookActions;
    private getTemplateActions;
    private renderPlaybooks;
    private renderTemplates;
    private handlePlaybookAction;
    private handleTemplateAction;
    private toggleCreateDropdown;
    private handleCreateAction;
    render(): import("lit-html").TemplateResult<1>;
}
//# sourceMappingURL=ansible-playbooks.d.ts.map