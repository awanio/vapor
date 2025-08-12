import { LitElement } from 'lit';
export declare class DetailDrawer extends LitElement {
    title: string;
    show: boolean;
    loading: boolean;
    width: number;
    static styles: import("lit").CSSResult;
    private handleClose;
    render(): import("lit-html").TemplateResult<1> | null;
}
declare global {
    interface HTMLElementTagNameMap {
        'detail-drawer': DetailDrawer;
    }
}
//# sourceMappingURL=detail-drawer.d.ts.map