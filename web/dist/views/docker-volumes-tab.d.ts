import { LitElement } from 'lit';
export declare class DockerVolumesTab extends LitElement {
    private volumes;
    private filteredVolumes;
    private error;
    private loading;
    private searchTerm;
    static styles: import("lit").CSSResult;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private handleDocumentClick;
    private toggleActionMenu;
    private closeAllMenus;
    fetchVolumes(): Promise<void>;
    private handleSearchInput;
    private filterVolumes;
    formatSize(bytes: number): string;
    render(): import("lit-html").TemplateResult<1>;
    inspectVolume(name: string): Promise<void>;
    deleteVolume(name: string): Promise<void>;
}
//# sourceMappingURL=docker-volumes-tab.d.ts.map