import { html, css } from 'lit';
import { property } from 'lit/decorators.js';
import { i18n, t } from '../i18n';
import { I18nLitElement } from '../i18n-mixin';
import { auth } from '../auth';

export class StatusBar extends I18nLitElement {
  @property({ type: String }) currentUser = '';
  @property({ type: String }) hostname = '';
  @property({ type: Boolean }) connected = true;
  @property({ type: Object }) systemInfo: any = {};

  static override styles = css`
    :host {
      display: block;
      background-color: var(--vscode-statusbar);
      color: white;
      font-size: 12px;
      user-select: none;
    }

    .status-bar-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 22px;
      padding: 0 10px;
    }

    .status-left,
    .status-right {
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .status-item {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 0 5px;
      height: 100%;
      cursor: default;
    }

    .status-item:hover {
      background-color: rgba(255, 255, 255, 0.1);
    }

    .status-item.clickable {
      cursor: pointer;
    }

    .status-icon {
      width: 14px;
      height: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      display: inline-block;
    }

    .status-indicator.connected {
      background-color: #4ec9b0;
    }

    .status-indicator.disconnected {
      background-color: #f48771;
    }

    .status-separator {
      width: 1px;
      height: 14px;
      background-color: rgba(255, 255, 255, 0.2);
    }

    select {
      background: transparent;
      border: none;
      color: white;
      font-size: 12px;
      cursor: pointer;
      outline: none;
    }

    select option {
      background-color: var(--vscode-bg-lighter);
      color: var(--vscode-text);
    }
  `;

  private _unsubscribeI18n?: () => void;

  override connectedCallback() {
    super.connectedCallback();
    this.currentUser = auth.isAuthenticated() ? localStorage.getItem('username') || 'user' : '';
    
    // Listen for auth events
    window.addEventListener('auth:login', this.handleAuthChange);
    window.addEventListener('auth:logout', this.handleAuthChange);
    
    // Listen for locale changes
    this._unsubscribeI18n = i18n.onChange(() => this.requestUpdate());
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('auth:login', this.handleAuthChange);
    window.removeEventListener('auth:logout', this.handleAuthChange);
    if (this._unsubscribeI18n) {
      this._unsubscribeI18n();
      this._unsubscribeI18n = undefined;
    }
  }

  private handleAuthChange = () => {
    this.currentUser = auth.isAuthenticated() ? localStorage.getItem('username') || 'user' : '';
    this.requestUpdate();
  };

  private handleThemeToggle() {
    const isDark = document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', !isDark);
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
    
    this.dispatchEvent(new CustomEvent('theme-change', {
      detail: { theme: isDark ? 'light' : 'dark' },
      bubbles: true,
      composed: true
    }));
  }

  private async handleLanguageChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const locale = select.value as 'en' | 'id';
    await i18n.setLocale(locale);
  }

  private handleLogout() {
    auth.logout();
  }

  override render() {
    const isDark = document.documentElement.classList.contains('dark');
    const currentLocale = i18n.getLocale();

    return html`
      <div class="status-bar-container">
        <div class="status-left">
          <div class="status-item">
            <span class="status-indicator ${this.connected ? 'connected' : 'disconnected'}"></span>
            <span>${this.connected ? 'Connected' : 'Disconnected'}</span>
          </div>
          ${this.hostname ? html`
            <div class="status-separator"></div>
            <div class="status-item">
              <span class="status-icon">🖥️</span>
              <span>${this.hostname}</span>
            </div>
          ` : ''}
          ${this.currentUser ? html`
            <div class="status-separator"></div>
            <div class="status-item">
              <span class="status-icon">👤</span>
              <span>${this.currentUser}</span>
            </div>
          ` : ''}
        </div>

        <div class="status-right">
          <div class="status-item clickable" @click=${this.handleThemeToggle} title="${t('app.theme')}">
            <span class="status-icon">${isDark ? '🌙' : '☀️'}</span>
            <span>${isDark ? t('app.dark') : t('app.light')}</span>
          </div>
          
          <div class="status-separator"></div>
          
          <div class="status-item" title="${t('app.language')}">
            <span class="status-icon">🌐</span>
            <select @change=${this.handleLanguageChange} .value=${currentLocale}>
              <option value="en">English</option>
              <option value="id">Indonesia</option>
            </select>
          </div>

          ${this.currentUser ? html`
            <div class="status-separator"></div>
            <div class="status-item clickable" @click=${this.handleLogout} title="${t('app.logout')}">
              <span class="status-icon">🚪</span>
              <span>${t('app.logout')}</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
}

customElements.define('status-bar', StatusBar);
