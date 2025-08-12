import { LitElement } from 'lit';
export declare class DockerProcessesTab extends LitElement {
    private containers;
    private filteredContainers;
    private error;
    private loading;
    private searchTerm;
    private confirmationModal;
    static styles: import("lit").CSSResult;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private handleDocumentClick;
    private toggleActionMenu;
    private closeAllMenus;
    private showConfirmationModal;
    private closeConfirmationModal;
    private confirmAction;
    private handleKeyDown;
    fetchContainers(): Promise<void>;
    private handleSearchInput;
    private filterContainers;
    getStatusClass(state: string): string;
    formatContainerName(names: string[]): string;
    render(): import("lit-html").TemplateResult<1>;
    private showStartConfirmation;
    private showStopConfirmation;
    private showRestartConfirmation;
    private showDeleteConfirmation;
    startContainer(id: string): Promise<void>;
    stopContainer(id: string): Promise<void>;
    restartContainer(id: string): Promise<void>;
    deleteContainer(id: string): Promise<void>;
}
//# sourceMappingURL=docker-processes-tab.d.ts.map