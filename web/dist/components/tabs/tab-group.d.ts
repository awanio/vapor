import { LitElement } from 'lit';
export interface Tab {
    id: string;
    label: string;
    icon?: string;
}
export declare class TabGroup extends LitElement {
    tabs: Tab[];
    activeTab: string;
    static styles: import("lit").CSSResult;
    private handleTabClick;
    render(): import("lit-html").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        'tab-group': TabGroup;
    }
}
//# sourceMappingURL=tab-group.d.ts.map