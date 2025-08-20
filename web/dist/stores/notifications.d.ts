export interface Notification {
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    title: string;
    message?: string;
    timestamp: number;
    duration?: number;
}
export declare const $notifications: import("nanostores").PreinitializedMapStore<Record<string, Notification>> & object;
export declare const notificationActions: {
    addNotification(notification: Omit<Notification, "id" | "timestamp">): `${string}-${string}-${string}-${string}-${string}`;
    removeNotification(id: string): void;
    clearAll(): void;
};
//# sourceMappingURL=notifications.d.ts.map