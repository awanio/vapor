/**
 * UI/Preference store types
 */

/**
 * UI theme options
 */
export type Theme = 'dark' | 'light' | 'auto';

/**
 * Supported languages
 */
export type Language = 'en' | 'id';

/**
 * Notification severity levels
 */
export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error';

/**
 * Notification configuration
 */
export interface Notification {
  id: string;
  title: string;
  message?: string;
  severity: NotificationSeverity;
  timestamp: number;
  duration?: number; // Auto-dismiss duration in ms (0 = no auto-dismiss)
  dismissible?: boolean;
  action?: {
    label: string;
    handler: () => void;
  };
}

/**
 * Drawer state
 */
export interface DrawerState {
  id: string;
  type: 'create' | 'edit' | 'detail' | 'custom';
  title: string;
  data?: any;
  width?: 'small' | 'medium' | 'large' | 'full';
  persistent?: boolean; // Prevents closing on backdrop click
}

/**
 * Modal state
 */
export interface ModalState {
  id: string;
  type: string;
  title: string;
  data?: any;
  size?: 'small' | 'medium' | 'large';
}

/**
 * Loading state entry
 */
export interface LoadingEntry {
  key: string;
  message?: string;
  progress?: number;
}

/**
 * UI preferences that should be persisted
 */
export interface UIPreferences {
  theme: Theme;
  language: Language;
  sidebarCollapsed: boolean;
  notificationSound: boolean;
  compactMode: boolean;
  showLineNumbers: boolean; // For code editors
  fontSize: 'small' | 'medium' | 'large';
}

/**
 * UI state
 */
export interface UIState extends UIPreferences {
  activeDrawer: DrawerState | null;
  activeModal: ModalState | null;
  notifications: Notification[];
  globalLoading: Map<string, LoadingEntry>;
  breadcrumbs: Array<{ label: string; path?: string }>;
  contextMenu: {
    x: number;
    y: number;
    items: Array<{
      label: string;
      icon?: string;
      handler: () => void;
      disabled?: boolean;
    }>;
  } | null;
}

/**
 * Toast notification options
 */
export interface ToastOptions {
  title: string;
  message?: string;
  severity?: NotificationSeverity;
  duration?: number;
  dismissible?: boolean;
  action?: {
    label: string;
    handler: () => void;
  };
}
