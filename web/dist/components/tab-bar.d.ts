import { LitElement } from 'lit';
import type { Tab } from '../types/system';
export declare class TabBar extends LitElement {
    tabs: Tab[];
    activeTabId: string;
    static styles: import("lit").CSSResult;
    private handleTabClick;
    private handleTabClose;
    private handleAddTab;
    render(): import("lit-html").TemplateResult<1>;
}
//# sourceMappingURL=tab-bar.d.ts.map