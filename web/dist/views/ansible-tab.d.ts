import { LitElement } from 'lit';
import './ansible/ansible-playbooks';
import './ansible/ansible-inventory';
import './ansible/ansible-executions';
export declare class AnsibleTab extends LitElement {
    subRoute: string | null;
    private activeTab;
    static styles: import("lit").CSSResult;
    connectedCallback(): void;
    disconnectedCallback(): void;
    updated(changedProperties: Map<string, any>): void;
    private updateActiveTab;
    private handleLocationChange;
    render(): import("lit-html").TemplateResult<1>;
}
//# sourceMappingURL=ansible-tab.d.ts.map