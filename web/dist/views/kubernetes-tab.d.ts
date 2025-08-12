import { LitElement } from 'lit';
import './kubernetes/kubernetes-workloads';
import './kubernetes/kubernetes-networks';
import './kubernetes/kubernetes-storage';
import './kubernetes/kubernetes-configurations';
import './kubernetes/kubernetes-helm';
import './kubernetes/kubernetes-nodes';
import './kubernetes/kubernetes-crds';
export declare class KubernetesTab extends LitElement {
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
        'kubernetes-tab': KubernetesTab;
    }
}
//# sourceMappingURL=kubernetes-tab.d.ts.map