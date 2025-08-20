import { LitElement } from 'lit';
import './virtualization/virtualization-vms-enhanced';
import './virtualization/virtualization-storage-pools';
import './virtualization/virtualization-networks';
import './virtualization/iso-management';
export declare class VirtualizationTab extends LitElement {
    static styles: import("lit").CSSResult;
    subRoute: string | null;
    activeView: string;
    connectedCallback(): void;
    updated(changedProperties: Map<string, any>): void;
    private updateActiveView;
    render(): import("lit-html").TemplateResult<1>;
    private renderActiveView;
}
declare global {
    interface HTMLElementTagNameMap {
        'virtualization-tab': VirtualizationTab;
    }
}
//# sourceMappingURL=virtualization-tab.d.ts.map