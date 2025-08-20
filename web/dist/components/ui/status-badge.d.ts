import { LitElement } from 'lit';
export type StatusType = 'running' | 'active' | 'deployed' | 'bound' | 'available' | 'ready' | 'pending' | 'failed' | 'error' | 'enforced' | 'suspended' | 'unknown';
export declare class StatusBadge extends LitElement {
    status: StatusType;
    text?: string;
    static styles: import("lit").CSSResult;
    render(): import("lit-html").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        'status-badge': StatusBadge;
    }
}
//# sourceMappingURL=status-badge.d.ts.map