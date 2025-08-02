import { LitElement } from 'lit';
export declare class SidebarTree extends LitElement {
    collapsed: boolean;
    activeItemId: string;
    expandedItems: Set<string>;
    static styles: import("lit").CSSResult;
    private navigationItems;
    private handleItemClick;
    private handleKeyDown;
    private renderNavItem;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private handlePopState;
    render(): import("lit-html").TemplateResult<1>;
}
//# sourceMappingURL=sidebar-tree.d.ts.map