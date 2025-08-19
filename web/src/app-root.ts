import { LitElement, html, css } from 'lit';
import { state } from 'lit/decorators.js';
import { auth } from './auth';
import { theme } from './theme';
import { i18n, t, Locale } from './i18n';
import './components/login-page';
import './views/dashboard-tab-v2';
import './views/network-tab';
import './views/storage-tab';
import './views/containers-tab';
import './views/logs-tab';
import './views/terminal-tab-v2';
import './views/users-tab';
import './views/docker-tab';
import './views/kubernetes-tab';
import './views/virtualization-tab';
import './views/ansible-tab';
import './components/sidebar-tree';

export class AppRoot extends LitElement {
  @state()
  private isAuthenticated = false;
  
  @state()
  private activeView = 'dashboard';
  
  @state()
  private currentTheme = theme.getTheme();
  
  @state()
  private currentLocale = i18n.getLocale();
  
  @state()
  private languageMenuOpen = false;
  
  @state()
  private sidebarCollapsed = false;
  
  
  @state()
  private subRoute: string | null = null;

  static override styles = css`
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

  override connectedCallback() {
    super.connectedCallback();
    
    // Check initial authentication state
    this.isAuthenticated = auth.isAuthenticated();
    
    // Subscribe to locale changes
    const unsubscribe = i18n.onChange(() => {
      this.currentLocale = i18n.getLocale();
      this.requestUpdate();
    });
    
    // Store unsubscribe function for cleanup
    (this as any)._unsubscribeI18n = unsubscribe;

    // Set active view from URL
    const path = window.location.pathname.slice(1);
    if (!path || path === '') {
      // Default to dashboard on root URL
      this.activeView = 'dashboard';
      window.history.replaceState({ route: 'dashboard' }, '', '/');
    } else {
      // Parse main route and sub-route
      const [mainRoute, ...subParts] = path.split('/');
      this.subRoute = subParts.length > 0 ? subParts.join('/') : null;
      
      if (mainRoute && this.isValidRoute(mainRoute)) {
        this.activeView = mainRoute;
      } else if (mainRoute) {
        // Invalid route - show 404
        this.activeView = path;
      }
    }

    // Listen for popstate events to handle navigation
    window.addEventListener('popstate', (event) => {
      if (event.state && event.state.route) {
        const [mainRoute, ...subParts] = event.state.route.split('/');
        this.activeView = mainRoute;
        this.subRoute = subParts.length > 0 ? subParts.join('/') : null;
      } else {
        // Handle direct URL navigation
        const path = window.location.pathname.slice(1);
        if (!path || path === '') {
          this.activeView = 'dashboard';
          this.subRoute = null;
        } else {
          // Parse main route and sub-route
          const [mainRoute, ...subParts] = path.split('/');
          this.subRoute = subParts.length > 0 ? subParts.join('/') : null;
          this.activeView = mainRoute && this.isValidRoute(mainRoute) ? mainRoute : path;
        }
      }
    });
    
    // Listen for auth events
    window.addEventListener('auth:login', this.handleAuthLogin);
    window.addEventListener('auth:logout', this.handleAuthLogout);
    this.addEventListener('login-success', this.handleLoginSuccess);
    
    // Listen for theme changes
    window.addEventListener('theme-changed', this.handleThemeChange as EventListener);
    
    // Handle clicks outside language dropdown
    document.addEventListener('click', this.handleDocumentClick);
  }
  
  override disconnectedCallback() {
    super.disconnectedCallback();
    
    // Cleanup i18n subscription
    if ((this as any)._unsubscribeI18n) {
      (this as any)._unsubscribeI18n();
    }
    
    // Remove event listeners
    document.removeEventListener('click', this.handleDocumentClick);
    window.removeEventListener('theme-changed', this.handleThemeChange as EventListener);
    window.removeEventListener('auth:login', this.handleAuthLogin);
    window.removeEventListener('auth:logout', this.handleAuthLogout);
  }
  
  private handleAuthLogin = () => {
    this.isAuthenticated = true;
  };
  
  private handleAuthLogout = () => {
    this.isAuthenticated = false;
  };
  
  private handleLoginSuccess = () => {
    this.isAuthenticated = true;
  };
  
  private handleLogout() {
    auth.logout();
  }
  
  
  private handleThemeChange = (e: CustomEvent) => {
    this.currentTheme = e.detail.theme;
  };
  
  private toggleTheme() {
    theme.toggleTheme();
  }
  
  private toggleLanguageMenu(e: Event) {
    e.stopPropagation();
    this.languageMenuOpen = !this.languageMenuOpen;
  }
  
  private async selectLanguage(locale: Locale) {
    await i18n.setLocale(locale);
    this.languageMenuOpen = false;
  }
  
  private handleDocumentClick = (e: Event) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.language-selector')) {
      this.languageMenuOpen = false;
    }
  };

  override render() {
    // Show login page if not authenticated
    if (!this.isAuthenticated) {
      return html`<login-page></login-page>`;
    }
    
    // Show main app if authenticated
    return html`
      <!-- App Header -->
      <header class="app-header">
        <div class="header-title">Vapor</div>
        <div class="header-actions">
          <button class="theme-toggle" @click="${this.toggleTheme}" title="${t('app.theme')}">
            ${this.currentTheme === 'dark' ? html`
              <svg class="theme-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ` : html`
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
            
            ${this.languageMenuOpen ? html`
              <div class="language-dropdown">
                <div class="language-option ${this.currentLocale === 'en' ? 'active' : ''}" @click="${() => this.selectLanguage('en')}">
                  English
                  ${this.currentLocale === 'en' ? html`
                    <svg class="check-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                  ` : ''}
                </div>
                <div class="language-option ${this.currentLocale === 'id' ? 'active' : ''}" @click="${() => this.selectLanguage('id')}">
                  Bahasa Indonesia
                  ${this.currentLocale === 'id' ? html`
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
            ${this.activeView === 'dashboard' ? html`<dashboard-tab-v2></dashboard-tab-v2>` : ''}
            ${this.activeView === 'network' ? html`<network-tab .subRoute=${this.subRoute}></network-tab>` : ''}
            ${this.activeView === 'storage' ? html`<storage-tab .subRoute=${this.subRoute}></storage-tab>` : ''}
            ${this.activeView === 'containers' ? html`<containers-tab></containers-tab>` : ''}
            ${this.activeView === 'docker' ? html`<docker-tab .subRoute=${this.subRoute}></docker-tab>` : ''}
            ${this.activeView === 'logs' ? html`<logs-tab></logs-tab>` : ''}
            ${this.activeView === 'terminal' ? html`<terminal-tab-v2></terminal-tab-v2>` : ''}
            ${this.activeView === 'users' ? html`<users-tab></users-tab>` : ''}
            ${this.activeView === 'kubernetes' ? html`<kubernetes-tab .subRoute=${this.subRoute}></kubernetes-tab>` : ''}
            ${this.activeView === 'virtualization' ? html`<virtualization-tab .subRoute=${this.subRoute}></virtualization-tab>` : ''}
            ${this.activeView === 'ansible' ? html`<ansible-tab .subRoute=${this.subRoute}></ansible-tab>` : ''}
            ${!this.isValidRoute(this.activeView) ? html`<div>404 - Page Not Found</div>` : ''}
          </div>
        </main>
      </div>
      </div>
    `;
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  private handleNavigation(e: CustomEvent) {
    const route = e.detail.route;
    
    // Parse main route and sub-route
    const [mainRoute, ...subParts] = route.split('/');
    this.activeView = mainRoute;
    this.subRoute = subParts.length > 0 ? subParts.join('/') : null;
    // this.queryParams = e.detail.queryParams;
  }
  
  private isValidRoute(route: string): boolean {
    const validRoutes = ['dashboard', 'network', 'storage', 'containers', 'logs', 'terminal', 'users', 'docker', 'kubernetes', 'virtualization', 'ansible'];
    return validRoutes.includes(route);
  }
}

customElements.define('app-root', AppRoot);
