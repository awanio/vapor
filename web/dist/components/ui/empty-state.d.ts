import { LitElement } from 'lit';
export declare class EmptyState extends LitElement {
    message: string;
    icon: string;
    actionLabel: string;
    static styles: import("lit").CSSResult;
    private handleAction;
    render(): import("lit-html").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        'empty-state': EmptyState;
    }
}
//# sourceMappingURL=empty-state.d.ts.map