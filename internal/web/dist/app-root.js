var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html, css } from 'lit';
import { property, state } from 'lit/decorators.js';
import { auth } from './auth';
import { theme } from './theme';
import { i18n, t } from './i18n';
import './components/login-page';
import './views/dashboard-tab';
import './views/network-tab';
import './views/storage-tab';
import './views/containers-tab';
import './views/logs-tab';
import './views/terminal-tab';
import './views/users-tab';
import './components/sidebar-tree';
export class AppRoot extends LitElement {
    constructor() {
        super(...arguments);
        this.sidebarCollapsed = false;
        this.isAuthenticated = false;
        this.activeView = 'dashboard';
        this.currentTheme = theme.getTheme();
        this.currentLocale = i18n.getLocale();
        this.languageMenuOpen = false;
        this.handleAuthLogin = () => {
            this.isAuthenticated = true;
        };
        this.handleAuthLogout = () => {
            this.isAuthenticated = false;
        };
        this.handleLoginSuccess = () => {
            this.isAuthenticated = true;
        };
        this.handleThemeChange = (e) => {
            this.currentTheme = e.detail.theme;
        };
        this.handleDocumentClick = (e) => {
            const target = e.target;
            if (!target.closest('.language-selector')) {
                this.languageMenuOpen = false;
            }
        };
    }
    connectedCallback() {
        super.connectedCallback();
        this.isAuthenticated = auth.isAuthenticated();
        const unsubscribe = i18n.onChange(() => {
            this.currentLocale = i18n.getLocale();
            this.requestUpdate();
        });
        this._unsubscribeI18n = unsubscribe;
        const path = window.location.pathname.slice(1);
        if (!path || path === '') {
            this.activeView = 'dashboard';
            window.history.replaceState({ route: 'dashboard' }, '', '/');
        }
        else if (this.isValidRoute(path)) {
            this.activeView = path;
        }
        else {
            this.activeView = path;
        }
        window.addEventListener('popstate', (event) => {
            if (event.state && event.state.route) {
                this.activeView = event.state.route;
            }
            else {
                const path = window.location.pathname.slice(1);
                if (!path || path === '') {
                    this.activeView = 'dashboard';
                }
                else {
                    this.activeView = path;
                }
            }
        });
        window.addEventListener('auth:login', this.handleAuthLogin);
        window.addEventListener('auth:logout', this.handleAuthLogout);
        this.addEventListener('login-success', this.handleLoginSuccess);
        window.addEventListener('theme-changed', this.handleThemeChange);
        document.addEventListener('click', this.handleDocumentClick);
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        if (this._unsubscribeI18n) {
            this._unsubscribeI18n();
        }
        document.removeEventListener('click', this.handleDocumentClick);
        window.removeEventListener('theme-changed', this.handleThemeChange);
        window.removeEventListener('auth:login', this.handleAuthLogin);
        window.removeEventListener('auth:logout', this.handleAuthLogout);
    }
    handleLogout() {
        auth.logout();
    }
    toggleTheme() {
        theme.toggleTheme();
    }
    toggleLanguageMenu(e) {
        e.stopPropagation();
        this.languageMenuOpen = !this.languageMenuOpen;
    }
    async selectLanguage(locale) {
        await i18n.setLocale(locale);
        this.languageMenuOpen = false;
    }
    render() {
        if (!this.isAuthenticated) {
            return html `<login-page></login-page>`;
        }
        return html `
      <!-- App Header -->
      <header class="app-header">
        <div class="header-title">Vapor</div>
        <div class="header-actions">
          <button class="theme-toggle" @click="${this.toggleTheme}" title="${t('app.theme')}">
            ${this.currentTheme === 'dark' ? html `
              <svg class="theme-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ` : html `
              <svg class="theme-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            `}
          </button>
          
          <div class="language-selector">
            <button class="language-button" @click="${this.toggleLanguageMenu}" title="${t('app.language')}">
              <svg class="language-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
              ${this.currentLocale.toUpperCase()}
            </button>
            
            ${this.languageMenuOpen ? html `
              <div class="language-dropdown">
                <div class="language-option ${this.currentLocale === 'en' ? 'active' : ''}" @click="${() => this.selectLanguage('en')}">
                  English
                  ${this.currentLocale === 'en' ? html `
                    <svg class="check-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                  ` : ''}
                </div>
                <div class="language-option ${this.currentLocale === 'id' ? 'active' : ''}" @click="${() => this.selectLanguage('id')}">
                  Bahasa Indonesia
                  ${this.currentLocale === 'id' ? html `
                    <svg class="check-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                  ` : ''}
                </div>
              </div>
            ` : ''}
          </div>
          
          <span class="user-info">Logged in</span>
          <button class="logout-button" @click="${this.handleLogout}">${t('app.logout')}</button>
        </div>
      </header>
      <!-- App Content -->
      <div class="app-content">
        <!-- Sidebar -->
        <sidebar-tree 
          ?collapsed="${this.sidebarCollapsed}"
          activeItemId="${this.activeView}"
          @navigate="${this.handleNavigation}"
        ></sidebar-tree>
        
        <button class="sidebar-toggle ${this.sidebarCollapsed ? 'collapsed' : ''}" @click="${this.toggleSidebar}">
          ${this.sidebarCollapsed ? '›' : '‹'}
        </button>

        <!-- Main Content -->
        <main class="main">
          <div class="tab-content">
            ${this.activeView === 'dashboard' ? html `<dashboard-tab></dashboard-tab>` : ''}
            ${this.activeView === 'network' ? html `<network-tab></network-tab>` : ''}
            ${this.activeView === 'storage' ? html `<storage-tab></storage-tab>` : ''}
            ${this.activeView === 'containers' ? html `<containers-tab></containers-tab>` : ''}
            ${this.activeView === 'logs' ? html `<logs-tab></logs-tab>` : ''}
            ${this.activeView === 'terminal' ? html `<terminal-tab></terminal-tab>` : ''}
            ${this.activeView === 'users' ? html `<users-tab></users-tab>` : ''}
            ${!this.isValidRoute(this.activeView) ? html `<div>404 - Page Not Found</div>` : ''}
          </div>
        </main>
      </div>
      </div>
    `;
    }
    toggleSidebar() {
        this.sidebarCollapsed = !this.sidebarCollapsed;
    }
    handleNavigation(e) {
        this.activeView = e.detail.route;
    }
    isValidRoute(route) {
        const validRoutes = ['dashboard', 'network', 'storage', 'containers', 'logs', 'terminal', 'users'];
        return validRoutes.includes(route);
    }
}
AppRoot.styles = css `
    :host {
      display: block;
      height: 100vh;
      background-color: var(--surface-0);
      color: var(--text-primary);
      font-family: var(--font-family);
    }
  
    .app-header {
      background-color: var(--surface-1);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      height: 56px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      border-bottom: 1px solid var(--border-color);
    }
    
    .header-title {
      font-size: 1.25rem;
      font-weight: 500;
    }
    
    .header-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    
    .user-info {
      color: var(--text-secondary);
      font-size: 0.875rem;
    }
    
    .logout-button {
      padding: 0.5rem 1rem;
      background: transparent;
      border: 1px solid var(--border-color);
      border-radius: 4px;
      color: var(--text-primary);
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .logout-button:hover {
      background: var(--surface-2);
      border-color: var(--primary);
    }

    .theme-toggle {
      padding: 0.5rem;
      background: transparent;
      border: 1px solid var(--border-color);
      border-radius: 4px;
      color: var(--text-primary);
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
    }

    .theme-toggle:hover {
      background: var(--surface-2);
      border-color: var(--primary);
    }

    .theme-icon {
      width: 20px;
      height: 20px;
    }

    .language-selector {
      position: relative;
    }

    .language-button {
      padding: 0.5rem 1rem;
      background: transparent;
      border: 1px solid var(--border-color);
      border-radius: 4px;
      color: var(--text-primary);
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
    }

    .language-button:hover {
      background: var(--surface-2);
      border-color: var(--primary);
    }

    .language-icon {
      width: 16px;
      height: 16px;
    }

    .language-dropdown {
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 0.25rem;
      background: var(--surface-1);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      min-width: 120px;
      z-index: 1000;
    }

    .language-option {
      padding: 0.5rem 1rem;
      cursor: pointer;
      transition: background 0.2s;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
    }

    .language-option:hover {
      background: var(--surface-2);
    }

    .language-option.active {
      background: var(--surface-3);
      color: var(--primary);
    }

    .check-icon {
      width: 14px;
      height: 14px;
      margin-left: auto;
    }

    .app-content {
      display: flex;
      height: calc(100vh - 56px);
    }

    sidebar-tree {
      width: 200px;
      background-color: var(--surface-1);
      transition: width 0.3s ease-in-out;
      border-right: 1px solid var(--border-color);
    }

    sidebar-tree[collapsed] {
      width: 60px;
    }
    
    .sidebar-toggle {
      position: absolute;
      top: 70px;
      left: 200px;
      transform: translateX(-50%);
      z-index: 10;
      padding: 0.25rem;
      background: var(--surface-1);
      border: 1px solid var(--border-color);
      border-radius: 50%;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .sidebar-toggle:hover {
      background: var(--surface-2);
      color: var(--text-primary);
    }
    
    .sidebar-toggle.collapsed {
      left: 60px;
    }
    
    .main {
      flex: 1;
      overflow: auto;
      background-color: var(--surface-0);
      color: var(--text-primary);
      padding: 2rem;
      display: flex;
      flex-direction: column;
    }
    
    .tab-content {
      margin-top: 1rem;
      flex: 1;
      overflow: auto;
    }
  `;
__decorate([
    property({ type: Boolean })
], AppRoot.prototype, "sidebarCollapsed", void 0);
__decorate([
    state()
], AppRoot.prototype, "isAuthenticated", void 0);
__decorate([
    state()
], AppRoot.prototype, "activeView", void 0);
__decorate([
    state()
], AppRoot.prototype, "currentTheme", void 0);
__decorate([
    state()
], AppRoot.prototype, "currentLocale", void 0);
__decorate([
    state()
], AppRoot.prototype, "languageMenuOpen", void 0);
customElements.define('app-root', AppRoot);
//# sourceMappingURL=app-root.js.map