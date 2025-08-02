import { LitElement } from 'lit';
import '../components/modal-dialog';
export declare class ContainersTab extends LitElement {
    private activeTab;
    private containers;
    private images;
    private searchTerm;
    private error;
    private runtime;
    private showConfirmModal;
    private confirmAction;
    private selectedContainer;
    private selectedImage;
    private showDrawer;
    private confirmTitle;
    private confirmMessage;
    static styles: import("lit").CSSResult;
    connectedCallback(): void;
    disconnectedCallback(): void;
    handleOutsideClick(event: Event): void;
    fetchData(): Promise<void>;
    fetchContainerDetails(id: string): Promise<void>;
    fetchImageDetails(id: string): Promise<void>;
}
//# sourceMappingURL=containers-tab.d.ts.map