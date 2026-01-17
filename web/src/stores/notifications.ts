/**
 * Notifications Store
 * Manages application-wide notifications
 */

import { map } from 'nanostores';
import { generateUUID } from '../utils/uuid';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  timestamp: number;
  duration?: number; // ms, 0 for persistent
}

// Notifications map
export const $notifications = map<Record<string, Notification>>({});

// Notification actions
export const notificationActions = {
  addNotification(notification: Omit<Notification, 'id' | 'timestamp'>) {
    const id = generateUUID();
    const newNotification: Notification = {
      ...notification,
      id,
      timestamp: Date.now(),
      duration: notification.duration ?? 5000,
    };
    
    $notifications.setKey(id, newNotification);
    
    // Auto-remove after duration if not persistent
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        this.removeNotification(id);
      }, newNotification.duration);
    }
    
    return id;
  },
  
  removeNotification(id: string) {
    const notifications = $notifications.get();
    if (notifications[id]) {
      const newNotifications = { ...notifications };
      delete newNotifications[id];
      $notifications.set(newNotifications);
    }
  },
  
  clearAll() {
    $notifications.set({});
  },
};
