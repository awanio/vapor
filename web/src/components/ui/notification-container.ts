import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

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

/**
 * Notification container component for displaying various notifications
 * @element notification-container
 * 
 * @fires notification-closed - Fired when a notification is closed
 * 
 * @csspart container - The notifications container
 * @csspart notification - Individual notification element
 * @csspart notification-info - Info type notification
 * @csspart notification-success - Success type notification
 * @csspart notification-warning - Warning type notification
 * @csspart notification-error - Error type notification
 */
@customElement('notification-container')
export class NotificationContainer extends LitElement {
  static override styles = css`
    :host {
      display: block;
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 9999;
      pointer-events: none;
    }

    .container {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: 400px;
    }

    .notification {
      background: var(--cds-layer-01, #262626);
      color: var(--cds-text-primary, #f4f4f4);
      border: 1px solid var(--cds-border-subtle, #393939);
      border-radius: 0;
      padding: 16px;
      box-shadow: var(--cds-shadow-raised, 0 2px 6px rgba(0, 0, 0, 0.3));
      display: flex;
      align-items: flex-start;
      gap: 12px;
      pointer-events: auto;
      animation: slideIn 0.15s ease-out;
      position: relative;
    }

    .notification.light {
      background: #ffffff;
      color: #161616;
      border-color: #e0e0e0;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
    }

    .notification.closing {
      animation: slideOut 0.15s ease-out forwards;
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
      border-left: 3px solid var(--cds-support-info, #78a9ff);
    }

    .notification.info .notification-icon {
      color: var(--cds-support-info, #78a9ff);
    }

    .notification.success {
      border-left: 3px solid var(--cds-support-success, #42be65);
    }

    .notification.success .notification-icon {
      color: var(--cds-support-success, #42be65);
    }

    .notification.warning {
      border-left: 3px solid var(--cds-support-warning, #f1c21b);
    }

    .notification.warning .notification-icon {
      color: var(--cds-support-warning, #f1c21b);
    }

    .notification.error {
      border-left: 3px solid var(--cds-support-error, #ff8389);
    }

    .notification.error .notification-icon {
      color: var(--cds-support-error, #ff8389);
    }

    .notification-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .notification-message {
      color: inherit;
      font-size: 14px;
      line-height: 1.43;
      letter-spacing: 0.16px;
      word-break: break-word;
    }

    .notification-actions {
      display: flex;
      gap: 8px;
      margin-top: 4px;
    }

    .notification-action {
      background: transparent;
      border: 1px solid var(--cds-border-strong, #525252);
      color: var(--cds-text-primary, #f4f4f4);
      padding: 4px 16px;
      border-radius: 0;
      font-size: 12px;
      letter-spacing: 0.32px;
      cursor: pointer;
      transition: background-color 0.15s;
      font-family: var(--cds-font-sans);
    }

    .notification-action:hover {
      background: var(--cds-layer-02, #393939);
    }

    .close-button {
      position: absolute;
      top: 8px;
      right: 8px;
      background: none;
      border: none;
      color: var(--cds-text-secondary, #c6c6c6);
      cursor: pointer;
      padding: 4px;
      border-radius: 0;
      transition: all 0.15s;
      opacity: 0.7;
    }

    .close-button:hover {
      background: var(--cds-layer-02, #393939);
      opacity: 1;
      color: var(--cds-text-primary, #f4f4f4);
    }

    .progress-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 2px;
      background: currentColor;
      border-radius: 0;
      transition: width linear;
      opacity: 0.3;
    }
  `;

  @property({ type: Array }) notifications: Notification[] = [];
  @property({ type: Number }) defaultDuration = 5000;
  @property({ type: Number }) maxNotifications = 5;

  @state() private closingIds = new Set<string>();
  private timers = new Map<string, number>();
  @state() private _theme: 'dark' | 'light' = 'dark';

  override connectedCallback() {
    super.connectedCallback();
    this.updateTheme();
    window.addEventListener('theme-changed', this.handleThemeChange.bind(this) as EventListener);
    // Also check for class on <html> as fallback
    const observer = new MutationObserver(() => this.updateTheme());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  }

  private updateTheme() {
    const isLight = document.documentElement.classList.contains('light');
    this._theme = isLight ? 'light' : 'dark';
  }

  private handleThemeChange(e: CustomEvent) {
    this._theme = e.detail.theme;
  }

  override render() {
    const visibleNotifications = this.notifications.slice(-this.maxNotifications);

    return html`
      <div class="container ${this._theme}" part="container">
        ${visibleNotifications.map(notification => this.renderNotification(notification))}
      </div>
    `;
  }

  private renderNotification(notification: Notification) {
    const isClosing = this.closingIds.has(notification.id);
    const icon = this.getIcon(notification.type);

    return html`
      <div
        class="notification ${notification.type} ${isClosing ? 'closing' : ''} ${this._theme}"
        part="notification notification-${notification.type}"
        @animationend=${(e: AnimationEvent) => this.handleAnimationEnd(e, notification.id)}
      >
        <svg class="notification-icon" viewBox="0 0 20 20" fill="currentColor">
          ${icon}
        </svg>
        
        <div class="notification-content">
          <div class="notification-message">${notification.message}</div>
          
          ${notification.actions && notification.actions.length > 0 ? html`
            <div class="notification-actions">
              ${notification.actions.map(action => html`
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
        
        ${notification.duration ? html`
          <div
            class="progress-bar"
            style="width: 100%; transition-duration: ${notification.duration}ms;"
          ></div>
        ` : ''}
      </div>
    `;
  }

  private getIcon(type: Notification['type']) {
    switch (type) {
      case 'info':
        return html`<path d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 7h2v7H9zm0-2h2v1.5H9z"/>`;
      case 'success':
        return html`<path d="M10 2a8 8 0 100 16 8 8 0 000-16zm4 6l-5 5-3-3 1-1 2 2 4-4 1 1z"/>`;
      case 'warning':
        return html`<path d="M10 2l8 14H2L10 2zm0 4l-4 7h8l-4-7zm-1 3h2v3H9zm0 4h2v1H9z"/>`;
      case 'error':
        return html`<path d="M10 2a8 8 0 100 16 8 8 0 000-16zm3 4L10 9l-3-3-1 1 3 3-3 3 1 1 3-3 3 3 1-1-3-3 3-3-1-1z"/>`;
    }
  }

  private closeNotification(id: string) {
    this.closingIds.add(id);
    this.requestUpdate();

    // Clear any existing timer
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }

  private handleAnimationEnd(e: AnimationEvent, id: string) {
    if (e.animationName === 'slideOut') {
      this.removeNotification(id);
    }
  }

  private removeNotification(id: string) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.closingIds.delete(id);
    this.timers.delete(id);

    this.dispatchEvent(new CustomEvent('notification-closed', {
      detail: { id },
      bubbles: true,
      composed: true
    }));
  }

  public addNotification(notification: Omit<Notification, 'id'>) {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration ?? (notification.type === 'error' ? 0 : this.defaultDuration)
    };

    this.notifications = [...this.notifications, newNotification];

    // Set up auto-close timer if duration is specified
    if (newNotification.duration && newNotification.duration > 0) {
      const timer = setTimeout(() => {
        this.closeNotification(id);
      }, newNotification.duration) as unknown as number;

      this.timers.set(id, timer);
    }

    return id;
  }

  public removeAllNotifications() {
    // Clear all timers
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();

    // Mark all as closing
    this.notifications.forEach(n => this.closingIds.add(n.id));
    this.requestUpdate();

    // Remove after animation
    setTimeout(() => {
      this.notifications = [];
      this.closingIds.clear();
    }, 300);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    // Clear all timers when component is removed
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'notification-container': NotificationContainer;
  }
}
