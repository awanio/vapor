import { persistentMap, persistentAtom } from '@nanostores/persistent';
export const $expandedItems = persistentMap('sidebar:expanded', {}, {
    encode: JSON.stringify,
    decode: JSON.parse
});
export const $activeItem = persistentAtom('sidebar:active', 'dashboard', {
    encode: JSON.stringify,
    decode: JSON.parse
});
export const $sidebarCollapsed = persistentAtom('sidebar:collapsed', false, {
    encode: JSON.stringify,
    decode: JSON.parse
});
export function toggleExpanded(itemId) {
    const current = $expandedItems.get();
    $expandedItems.setKey(itemId, !current[itemId]);
}
export function expandItem(itemId) {
    $expandedItems.setKey(itemId, true);
}
export function collapseItem(itemId) {
    $expandedItems.setKey(itemId, false);
}
export function isExpanded(itemId) {
    return $expandedItems.get()[itemId] || false;
}
export function setExpandedItems(items, expanded = true) {
    const updates = {};
    items.forEach(item => {
        updates[item] = expanded;
    });
    const current = $expandedItems.get();
    $expandedItems.set({ ...current, ...updates });
}
export function collapseAll() {
    $expandedItems.set({});
}
export function setActiveItem(itemId) {
    $activeItem.set(itemId);
}
export function toggleSidebarCollapsed() {
    $sidebarCollapsed.set(!$sidebarCollapsed.get());
}
export function setSidebarCollapsed(collapsed) {
    $sidebarCollapsed.set(collapsed);
}
export function getExpandedItemsArray() {
    const expanded = $expandedItems.get();
    return Object.keys(expanded).filter(key => expanded[key]);
}
export function setExpandedItemsFromArray(items) {
    const expanded = {};
    items.forEach(item => {
        expanded[item] = true;
    });
    $expandedItems.set(expanded);
}
//# sourceMappingURL=sidebar.js.map