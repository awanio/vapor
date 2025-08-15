import { LitElement } from 'lit';
export interface DeleteItem {
    type: string;
    name: string;
    namespace?: string;
}
export declare class DeleteModal extends LitElement {
    item: DeleteItem | null;
    show: boolean;
    loading: boolean;
    static styles: import("lit").CSSResult;
    private handleOverlayClick;
    private handleConfirm;
    private handleCancel;
    render(): "" | import("lit-html").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        'delete-modal': DeleteModal;
    }
}
//# sourceMappingURL=delete-modal.d.ts.map