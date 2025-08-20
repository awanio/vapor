var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
let NotificationContainer = class NotificationContainer extends LitElement {
    constructor() {
        super(...arguments);
        this.notifications = [];
        this.defaultDuration = 5000;
        this.maxNotifications = 5;
        this.closingIds = new Set();
        this.timers = new Map();
    }
    render() {
        const visibleNotifications = this.notifications.slice(-this.maxNotifications);
        return html `
      <div class="container" part="container">
        ${visibleNotifications.map(notification => this.renderNotification(notification))}
      </div>
    `;
    }
    renderNotification(notification) {
        const isClosing = this.closingIds.has(notification.id);
        const icon = this.getIcon(notification.type);
        return html `
      <div
        class="notification ${notification.type} ${isClosing ? 'closing' : ''}"
        part="notification notification-${notification.type}"
        @animationend=${(e) => this.handleAnimationEnd(e, notification.id)}
      >
        <svg class="notification-icon" viewBox="0 0 20 20" fill="currentColor">
          ${icon}
        </svg>
        
        <div class="notification-content">
          <div class="notification-message">${notification.message}</div>
          
          ${notification.actions && notification.actions.length > 0 ? html `
            <div class="notification-actions">
              ${notification.actions.map(action => html `
                <button
                  class="notification-action"
                  @click=${() => {
            action.handler();
            this.closeNotification(notification.id);
        }}
                >
                  ${action.label}
                </button>
              `)}
            </div>
          ` : ''}
        </div>
        
        <button
          class="close-button"
          @click=${() => this.closeNotification(notification.id)}
          aria-label="Close notification"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M9 3L3 9M3 3l6 6" stroke="currentColor" stroke-width="2"/>
          </svg>
        </button>
        
        ${notification.duration ? html `
          <div
            class="progress-bar"
            style="width: 100%; transition-duration: ${notification.duration}ms;"
          ></div>
        ` : ''}
      </div>
    `;
    }
    getIcon(type) {
        switch (type) {
            case 'info':
                return html `<path d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 7h2v7H9zm0-2h2v1.5H9z"/>`;
            case 'success':
                return html `<path d="M10 2a8 8 0 100 16 8 8 0 000-16zm4 6l-5 5-3-3 1-1 2 2 4-4 1 1z"/>`;
            case 'warning':
                return html `<path d="M10 2l8 14H2L10 2zm0 4l-4 7h8l-4-7zm-1 3h2v3H9zm0 4h2v1H9z"/>`;
            case 'error':
                return html `<path d="M10 2a8 8 0 100 16 8 8 0 000-16zm3 4L10 9l-3-3-1 1 3 3-3 3 1 1 3-3 3 3 1-1-3-3 3-3-1-1z"/>`;
        }
    }
    closeNotification(id) {
        this.closingIds.add(id);
        this.requestUpdate();
        const timer = this.timers.get(id);
        if (timer) {
            clearTimeout(timer);
            this.timers.delete(id);
        }
    }
    handleAnimationEnd(e, id) {
        if (e.animationName === 'slideOut') {
            this.removeNotification(id);
        }
    }
    removeNotification(id) {
        this.notifications = this.notifications.filter(n => n.id !== id);
        this.closingIds.delete(id);
        this.timers.delete(id);
        this.dispatchEvent(new CustomEvent('notification-closed', {
            detail: { id },
            bubbles: true,
            composed: true
        }));
    }
    addNotification(notification) {
        const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newNotification = {
            ...notification,
            id,
            duration: notification.duration ?? (notification.type === 'error' ? 0 : this.defaultDuration)
        };
        this.notifications = [...this.notifications, newNotification];
        if (newNotification.duration && newNotification.duration > 0) {
            const timer = setTimeout(() => {
                this.closeNotification(id);
            }, newNotification.duration);
            this.timers.set(id, timer);
        }
        return id;
    }
    removeAllNotifications() {
        this.timers.forEach(timer => clearTimeout(timer));
        this.timers.clear();
        this.notifications.forEach(n => this.closingIds.add(n.id));
        this.requestUpdate();
        setTimeout(() => {
            this.notifications = [];
            this.closingIds.clear();
        }, 300);
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        this.timers.forEach(timer => clearTimeout(timer));
        this.timers.clear();
    }
};
NotificationContainer.styles = css `
    :host {
      display: block;
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      pointer-events: none;
    }

    .container {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-width: 400px;
    }

    .notification {
      background: var(--notification-bg, #2c2f3a);
      border: 1px solid var(--notification-border, #3a3d4a);
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: flex-start;
      gap: 12px;
      pointer-events: auto;
      animation: slideIn 0.3s ease-out;
      position: relative;
    }

    .notification.closing {
      animation: slideOut 0.3s ease-out forwards;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }

    .notification-icon {
      flex-shrink: 0;
      width: 20px;
      height: 20px;
    }

    .notification.info {
      border-color: var(--info-border, #2196f3);
    }

    .notification.info .notification-icon {
      color: var(--info-color, #2196f3);
    }

    .notification.success {
      border-color: var(--success-border, #4caf50);
    }

    .notification.success .notification-icon {
      color: var(--success-color, #4caf50);
    }

    .notification.warning {
      border-color: var(--warning-border, #ff9800);
    }

    .notification.warning .notification-icon {
      color: var(--warning-color, #ff9800);
    }

    .notification.error {
      border-color: var(--error-border, #f44336);
    }

    .notification.error .notification-icon {
      color: var(--error-color, #f44336);
    }

    .notification-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .notification-message {
      color: var(--message-color, #e0e0e0);
      font-size: 14px;
      line-height: 1.5;
      word-break: break-word;
    }

    .notification-actions {
      display: flex;
      gap: 8px;
      margin-top: 4px;
    }

    .notification-action {
      background: none;
      border: 1px solid var(--action-border, #4a4d5a);
      color: var(--action-color, #e0e0e0);
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .notification-action:hover {
      background: var(--action-hover-bg, rgba(255, 255, 255, 0.1));
      border-color: var(--action-hover-border, #5a5d6a);
    }

    .close-button {
      position: absolute;
      top: 8px;
      right: 8px;
      background: none;
      border: none;
      color: var(--close-color, #999);
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: all 0.2s;
      opacity: 0.7;
    }

    .close-button:hover {
      background: var(--close-hover-bg, rgba(255, 255, 255, 0.1));
      opacity: 1;
    }

    .progress-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 3px;
      background: var(--progress-color, currentColor);
      border-radius: 0 0 8px 8px;
      transition: width linear;
      opacity: 0.3;
    }
  `;
__decorate([
    property({ type: Array })
], NotificationContainer.prototype, "notifications", void 0);
__decorate([
    property({ type: Number })
], NotificationContainer.prototype, "defaultDuration", void 0);
__decorate([
    property({ type: Number })
], NotificationContainer.prototype, "maxNotifications", void 0);
__decorate([
    state()
], NotificationContainer.prototype, "closingIds", void 0);
NotificationContainer = __decorate([
    customElement('notification-container')
], NotificationContainer);
export { NotificationContainer };
//# sourceMappingURL=notification-container.js.map