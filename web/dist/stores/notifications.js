import { map } from 'nanostores';
export const $notifications = map({});
export const notificationActions = {
    addNotification(notification) {
        const id = crypto.randomUUID();
        const newNotification = {
            ...notification,
            id,
            timestamp: Date.now(),
            duration: notification.duration ?? 5000,
        };
        $notifications.setKey(id, newNotification);
        if (newNotification.duration && newNotification.duration > 0) {
            setTimeout(() => {
                this.removeNotification(id);
            }, newNotification.duration);
        }
        return id;
    },
    removeNotification(id) {
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
//# sourceMappingURL=notifications.js.map