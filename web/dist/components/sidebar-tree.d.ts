import { I18nLitElement } from '../i18n-mixin';
export declare class SidebarTree extends I18nLitElement {
    collapsed: boolean;
    activeItemId: string;
    expandedItemsArray: string[];
    private get expandedItems();
    private set expandedItems(value);
    static styles: import("lit").CSSResult;
    private navigationItems;
    private handleItemClick;
    private handleKeyDown;
    private renderNavItem;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private findNavItemByRoute;
    private isItemActive;
    private handlePopState;
    render(): import("lit-html").TemplateResult<1>;
}
//# sourceMappingURL=sidebar-tree.d.ts.map