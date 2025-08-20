import { I18nLitElement } from '../i18n-mixin';
export declare class SidebarTree extends I18nLitElement {
    collapsed: boolean;
    private activeItemId;
    private expandedItemsArray;
    private translationsLoaded;
    private storeUnsubscribers;
    static styles: import("lit").CSSResult;
    private navigationItems;
    private handleItemClick;
    private handleKeyDown;
    private getTranslation;
    private renderNavItem;
    connectedCallback(): Promise<void>;
    disconnectedCallback(): void;
    private findNavItemByRoute;
    private isItemActive;
    private handlePopState;
    render(): import("lit-html").TemplateResult<1>;
}
//# sourceMappingURL=sidebar-tree.d.ts.map