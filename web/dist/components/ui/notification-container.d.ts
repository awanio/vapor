import { LitElement } from 'lit';
export interface Notification {
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
    duration?: number;
    actions?: Array<{
        label: string;
        handler: () => void;
    }>;
}
export declare class NotificationContainer extends LitElement {
    static styles: import("lit").CSSResult;
    notifications: Notification[];
    defaultDuration: number;
    maxNotifications: number;
    private closingIds;
    private timers;
    render(): import("lit-html").TemplateResult<1>;
    private renderNotification;
    private getIcon;
    private closeNotification;
    private handleAnimationEnd;
    private removeNotification;
    addNotification(notification: Omit<Notification, 'id'>): string;
    removeAllNotifications(): void;
    disconnectedCallback(): void;
}
declare global {
    interface HTMLElementTagNameMap {
        'notification-container': NotificationContainer;
    }
}
//# sourceMappingURL=notification-container.d.ts.map