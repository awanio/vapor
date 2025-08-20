/**
 * Sidebar Tree State Management
 * Manages the expanded/collapsed state of sidebar items
 */

import { persistentMap, persistentAtom } from '@nanostores/persistent';

/**
 * Store for expanded items in the sidebar tree
 * Persists to localStorage
 */
export const $expandedItems = persistentMap<Record<string, boolean>>(
  'sidebar:expanded',
  {},
  {
    encode: JSON.stringify,
    decode: JSON.parse
  }
);

/**
 * Store for the currently active sidebar item
 * Persists to localStorage
 */
export const $activeItem = persistentAtom<string>(
  'sidebar:active',
  'dashboard',
  {
    encode: JSON.stringify,
    decode: JSON.parse
  }
);

/**
 * Store for sidebar collapsed state
 * Persists to localStorage
 */
export const $sidebarCollapsed = persistentAtom<boolean>(
  'sidebar:collapsed',
  false,
  {
    encode: JSON.stringify,
    decode: JSON.parse
  }
);

/**
 * Helper function to toggle an item's expanded state
 */
export function toggleExpanded(itemId: string): void {
  const current = $expandedItems.get();
  $expandedItems.setKey(itemId, !current[itemId]);
}

/**
 * Helper function to expand an item
 */
export function expandItem(itemId: string): void {
  $expandedItems.setKey(itemId, true);
}

/**
 * Helper function to collapse an item
 */
export function collapseItem(itemId: string): void {
  $expandedItems.setKey(itemId, false);
}

/**
 * Helper function to check if an item is expanded
 */
export function isExpanded(itemId: string): boolean {
  return $expandedItems.get()[itemId] || false;
}

/**
 * Helper function to set multiple items expanded state
 */
export function setExpandedItems(items: string[], expanded: boolean = true): void {
  const updates: Record<string, boolean> = {};
  items.forEach(item => {
    updates[item] = expanded;
  });
  
  // Merge with existing state
  const current = $expandedItems.get();
  $expandedItems.set({ ...current, ...updates });
}

/**
 * Helper function to collapse all items
 */
export function collapseAll(): void {
  $expandedItems.set({});
}

/**
 * Helper function to set the active item
 */
export function setActiveItem(itemId: string): void {
  $activeItem.set(itemId);
}

/**
 * Helper function to toggle sidebar collapsed state
 */
export function toggleSidebarCollapsed(): void {
  $sidebarCollapsed.set(!$sidebarCollapsed.get());
}

/**
 * Helper function to set sidebar collapsed state
 */
export function setSidebarCollapsed(collapsed: boolean): void {
  $sidebarCollapsed.set(collapsed);
}

/**
 * Helper function to get all expanded items as an array
 */
export function getExpandedItemsArray(): string[] {
  const expanded = $expandedItems.get();
  return Object.keys(expanded).filter(key => expanded[key]);
}

/**
 * Helper function to set expanded items from an array
 */
export function setExpandedItemsFromArray(items: string[]): void {
  const expanded: Record<string, boolean> = {};
  items.forEach(item => {
    expanded[item] = true;
  });
  $expandedItems.set(expanded);
}
