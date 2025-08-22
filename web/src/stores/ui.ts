/**
 * UI/Preference Store
 * Manages UI state, preferences, notifications, and loading states
 */

import { computed, map } from 'nanostores';
import { persistentAtom } from '@nanostores/persistent';
import type {
  UIState,
  UIPreferences,
  Theme,
  Language,
  Notification,
  DrawerState,
  ModalState,
  ToastOptions
} from './types/ui';

// Helper for boolean persistent atoms
const booleanPersistentAtom = (key: string, defaultValue: boolean) => 
  persistentAtom<string>(key, defaultValue ? 'true' : 'false', {
    encode: (value) => value,
    decode: (value) => value
  });

// Persistent preferences using individual atoms
const $themeAtom = persistentAtom<Theme>('vapor:ui:theme', 'dark');
const $languageAtom = persistentAtom<Language>('vapor:ui:language', 'en');
const $sidebarCollapsedAtom = booleanPersistentAtom('vapor:ui:sidebarCollapsed', false);
const $notificationSoundAtom = booleanPersistentAtom('vapor:ui:notificationSound', true);
const $compactModeAtom = booleanPersistentAtom('vapor:ui:compactMode', false);
const $showLineNumbersAtom = booleanPersistentAtom('vapor:ui:showLineNumbers', true);
const $fontSizeAtom = persistentAtom<'small' | 'medium' | 'large'>('vapor:ui:fontSize', 'medium');

// Combined preferences store for convenience
export const $preferences = computed(
  [$themeAtom, $languageAtom, $sidebarCollapsedAtom, $notificationSoundAtom, $compactModeAtom, $showLineNumbersAtom, $fontSizeAtom],
  (theme, language, sidebarCollapsed, notificationSound, compactMode, showLineNumbers, fontSize): UIPreferences => ({
    theme,
    language,
    sidebarCollapsed: sidebarCollapsed === 'true',
    notificationSound: notificationSound === 'true',
    compactMode: compactMode === 'true',
    showLineNumbers: showLineNumbers === 'true',
    fontSize
  })
);

// Non-persistent UI state
const $uiState = map<Omit<UIState, keyof UIPreferences>>({
  activeDrawer: null,
  activeModal: null,
  notifications: [],
  globalLoading: new Map(),
  breadcrumbs: [],
  contextMenu: null
});

// Combined UI store (preferences + state)
export const $ui = computed([$preferences, $uiState], (prefs, state) => ({
  ...prefs,
  ...state
}));

// Individual computed stores for convenience
export const $theme = computed($preferences, (prefs) => prefs.theme);
export const $language = computed($preferences, (prefs) => prefs.language);
export const $sidebarCollapsed = computed($preferences, (prefs) => prefs.sidebarCollapsed);
export const $activeDrawer = computed($uiState, (state) => state.activeDrawer);
export const $activeModal = computed($uiState, (state) => state.activeModal);
export const $notifications = computed($uiState, (state) => state.notifications);
export const $isLoading = computed($uiState, (state) => state.globalLoading.size > 0);
export const $loadingCount = computed($uiState, (state) => state.globalLoading.size);

// Notification auto-dismiss timers
const notificationTimers = new Map<string, NodeJS.Timeout>();

/**
 * Initialize UI store
 */
export function initUIStore(): void {
  // Apply theme on initialization and changes
  const applyTheme = (theme: Theme) => {
    const root = document.documentElement;
    
    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', theme);
    }
  };
  
  // Initial theme application
  applyTheme($theme.get());
  
  // Watch for theme changes
  $theme.subscribe(applyTheme);
  
  // Watch for system theme changes when in auto mode
  if ($theme.get() === 'auto') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if ($theme.get() === 'auto') {
        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      }
    });
  }
  
  // Apply font size
  const applyFontSize = (size: string) => {
    const root = document.documentElement;
    const sizes = {
      small: '14px',
      medium: '16px',
      large: '18px'
    };
    root.style.fontSize = sizes[size as keyof typeof sizes] || sizes.medium;
  };
  
  applyFontSize($preferences.get().fontSize);
  $preferences.subscribe((prefs) => applyFontSize(prefs.fontSize));
  
  console.log('[UIStore] Initialized');
}

/**
 * Update preferences
 */
export function updatePreferences(preferences: Partial<UIPreferences>): void {
  if (preferences.theme !== undefined) $themeAtom.set(preferences.theme);
  if (preferences.language !== undefined) $languageAtom.set(preferences.language);
  if (preferences.sidebarCollapsed !== undefined) $sidebarCollapsedAtom.set(preferences.sidebarCollapsed ? 'true' : 'false');
  if (preferences.notificationSound !== undefined) $notificationSoundAtom.set(preferences.notificationSound ? 'true' : 'false');
  if (preferences.compactMode !== undefined) $compactModeAtom.set(preferences.compactMode ? 'true' : 'false');
  if (preferences.showLineNumbers !== undefined) $showLineNumbersAtom.set(preferences.showLineNumbers ? 'true' : 'false');
  if (preferences.fontSize !== undefined) $fontSizeAtom.set(preferences.fontSize);
}

/**
 * Toggle theme between dark and light
 */
export function toggleTheme(): void {
  const current = $themeAtom.get();
  const next = current === 'dark' ? 'light' : 'dark';
  $themeAtom.set(next);
}

/**
 * Toggle sidebar collapse state
 */
export function toggleSidebar(): void {
  const current = $sidebarCollapsedAtom.get() === 'true';
  $sidebarCollapsedAtom.set(!current ? 'true' : 'false');
}

/**
 * Set language
 */
export function setLanguage(language: Language): void {
  $languageAtom.set(language);
  // Dispatch event for i18n system
  window.dispatchEvent(new CustomEvent('language:change', { detail: { language } }));
}

/**
 * Show a notification
 */
export function showNotification(options: ToastOptions): string {
  const id = `notification-${Date.now()}-${Math.random()}`;
  
  const notification: Notification = {
    id,
    title: options.title,
    message: options.message,
    severity: options.severity || 'info',
    timestamp: Date.now(),
    duration: options.duration !== undefined ? options.duration : 5000,
    dismissible: options.dismissible !== undefined ? options.dismissible : true,
    action: options.action
  };
  
  // Add to notifications list
  const current = $uiState.get();
  $uiState.setKey('notifications', [...current.notifications, notification]);
  
  // Play sound if enabled
  if ($preferences.get().notificationSound && notification.severity === 'error') {
    // You can add actual sound playing logic here
    console.log('[UIStore] Notification sound would play for error');
  }
  
  // Setup auto-dismiss
  if (notification.duration && notification.duration > 0) {
    const timer = setTimeout(() => {
      dismissNotification(id);
    }, notification.duration);
    notificationTimers.set(id, timer);
  }
  
  return id;
}

/**
 * Dismiss a notification
 */
export function dismissNotification(id: string): void {
  // Clear timer if exists
  const timer = notificationTimers.get(id);
  if (timer) {
    clearTimeout(timer);
    notificationTimers.delete(id);
  }
  
  // Remove from list
  const current = $uiState.get();
  $uiState.setKey(
    'notifications',
    current.notifications.filter((n) => n.id !== id)
  );
}

/**
 * Clear all notifications
 */
export function clearNotifications(): void {
  // Clear all timers
  notificationTimers.forEach((timer) => clearTimeout(timer));
  notificationTimers.clear();
  
  // Clear notifications
  $uiState.setKey('notifications', []);
}

/**
 * Show success notification
 */
export function showSuccess(title: string, message?: string): string {
  return showNotification({ title, message, severity: 'success' });
}

/**
 * Show error notification
 */
export function showError(title: string, message?: string): string {
  return showNotification({ title, message, severity: 'error', duration: 0 });
}

/**
 * Show warning notification
 */
export function showWarning(title: string, message?: string): string {
  return showNotification({ title, message, severity: 'warning' });
}

/**
 * Show info notification
 */
export function showInfo(title: string, message?: string): string {
  return showNotification({ title, message, severity: 'info' });
}

/**
 * Open a drawer
 */
export function openDrawer(drawer: Omit<DrawerState, 'id'>): string {
  const id = `drawer-${Date.now()}`;
  const drawerState: DrawerState = {
    id,
    ...drawer
  };
  
  $uiState.setKey('activeDrawer', drawerState);
  
  // Dispatch event
  window.dispatchEvent(new CustomEvent('drawer:open', { detail: drawerState }));
  
  return id;
}

/**
 * Close the active drawer
 */
export function closeDrawer(): void {
  const current = $activeDrawer.get();
  if (current) {
    $uiState.setKey('activeDrawer', null);
    
    // Dispatch event
    window.dispatchEvent(new CustomEvent('drawer:close', { detail: { id: current.id } }));
  }
}

/**
 * Update drawer data
 */
export function updateDrawer(data: any): void {
  const current = $activeDrawer.get();
  if (current) {
    $uiState.setKey('activeDrawer', {
      ...current,
      data
    });
  }
}

/**
 * Open a modal
 */
export function openModal(modal: Omit<ModalState, 'id'>): string {
  const id = `modal-${Date.now()}`;
  const modalState: ModalState = {
    id,
    ...modal
  };
  
  $uiState.setKey('activeModal', modalState);
  
  // Dispatch event
  window.dispatchEvent(new CustomEvent('modal:open', { detail: modalState }));
  
  return id;
}

/**
 * Close the active modal
 */
export function closeModal(): void {
  const current = $activeModal.get();
  if (current) {
    $uiState.setKey('activeModal', null);
    
    // Dispatch event
    window.dispatchEvent(new CustomEvent('modal:close', { detail: { id: current.id } }));
  }
}

/**
 * Start a loading operation
 */
export function startLoading(key: string, message?: string): void {
  const current = $uiState.get();
  const loading = new Map(current.globalLoading);
  
  loading.set(key, {
    key,
    message,
    progress: undefined
  });
  
  $uiState.setKey('globalLoading', loading);
}

/**
 * Update loading progress
 */
export function updateLoadingProgress(key: string, progress: number, message?: string): void {
  const current = $uiState.get();
  const loading = new Map(current.globalLoading);
  
  const entry = loading.get(key);
  if (entry) {
    loading.set(key, {
      ...entry,
      progress,
      message: message !== undefined ? message : entry.message
    });
    
    $uiState.setKey('globalLoading', loading);
  }
}

/**
 * Stop a loading operation
 */
export function stopLoading(key: string): void {
  const current = $uiState.get();
  const loading = new Map(current.globalLoading);
  
  loading.delete(key);
  
  $uiState.setKey('globalLoading', loading);
}

/**
 * Stop all loading operations
 */
export function stopAllLoading(): void {
  $uiState.setKey('globalLoading', new Map());
}

/**
 * Set breadcrumbs
 */
export function setBreadcrumbs(breadcrumbs: Array<{ label: string; path?: string }>): void {
  $uiState.setKey('breadcrumbs', breadcrumbs);
}

/**
 * Show context menu
 */
export function showContextMenu(x: number, y: number, items: Array<{
  label: string;
  icon?: string;
  handler: () => void;
  disabled?: boolean;
}>): void {
  $uiState.setKey('contextMenu', { x, y, items });
  
  // Add click listener to close menu
  const closeHandler = () => {
    $uiState.setKey('contextMenu', null);
    document.removeEventListener('click', closeHandler);
  };
  
  // Delay to prevent immediate close
  setTimeout(() => {
    document.addEventListener('click', closeHandler);
  }, 100);
}

/**
 * Hide context menu
 */
export function hideContextMenu(): void {
  $uiState.setKey('contextMenu', null);
}

/**
 * Reset UI state (useful for logout)
 */
export function resetUIState(): void {
  // Clear non-persistent state
  clearNotifications();
  closeDrawer();
  closeModal();
  stopAllLoading();
  hideContextMenu();
  setBreadcrumbs([]);
  
  // Keep preferences intact
  console.log('[UIStore] State reset (preferences preserved)');
}

// Initialize on import
initUIStore();

// Listen for auth logout to reset UI state
window.addEventListener('auth:logout', () => {
  resetUIState();
});
