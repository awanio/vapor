import { LitElement } from 'lit';
export declare class DockerImagesTab extends LitElement {
    private images;
    private filteredImages;
    private error;
    private loading;
    private searchTerm;
    private confirmationModal;
    static styles: import("lit").CSSResult;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private handleDocumentClick;
    private handleKeyDown;
    fetchImages(): Promise<void>;
    private handleSearchInput;
    private filterImages;
    formatSize(bytes: number): string;
    private toggleActionMenu;
    private closeAllMenus;
    private showConfirmationModal;
    private closeConfirmationModal;
    private confirmAction;
    private showDeleteConfirmation;
    deleteImage(id: string): Promise<void>;
    render(): import("lit-html").TemplateResult<1>;
}
//# sourceMappingURL=docker-images-tab.d.ts.map