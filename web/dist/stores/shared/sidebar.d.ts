export declare const $expandedItems: import("nanostores").MapStore<Record<string, boolean>>;
export declare const $activeItem: import("nanostores").WritableAtom<string>;
export declare const $sidebarCollapsed: import("nanostores").WritableAtom<boolean>;
export declare function toggleExpanded(itemId: string): void;
export declare function expandItem(itemId: string): void;
export declare function collapseItem(itemId: string): void;
export declare function isExpanded(itemId: string): boolean;
export declare function setExpandedItems(items: string[], expanded?: boolean): void;
export declare function collapseAll(): void;
export declare function setActiveItem(itemId: string): void;
export declare function toggleSidebarCollapsed(): void;
export declare function setSidebarCollapsed(collapsed: boolean): void;
export declare function getExpandedItemsArray(): string[];
export declare function setExpandedItemsFromArray(items: string[]): void;
//# sourceMappingURL=sidebar.d.ts.map