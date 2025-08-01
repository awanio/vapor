import { LitElement, html, css } from 'lit';
import { property, state } from 'lit/decorators.js';
import { auth } from './auth';
import { theme } from './theme';
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
  @property({ type: Boolean }) sidebarCollapsed = false;
  
  @state()
  private isAuthenticated = false;
  
  @state()
  private activeView = 'dashboard';
  
  @state()
  private currentTheme = theme.getTheme();

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
    }
    
    .tab-content {
      margin-top: 1rem;
    }
  `;

  override connectedCallback() {
    super.connectedCallback();
    
    // Check initial authentication state
    this.isAuthenticated = auth.isAuthenticated();

    // Set active view from URL
    const path = window.location.pathname.slice(1);
    if (!path || path === '') {
      // Default to dashboard on root URL
      this.activeView = 'dashboard';
      window.history.replaceState({ route: 'dashboard' }, '', '/');
    } else if (this.isValidRoute(path)) {
      this.activeView = path;
    } else {
      // Invalid route - show 404
      this.activeView = path;
    }

    // Listen for popstate events to handle navigation
    window.addEventListener('popstate', (event) => {
      if (event.state && event.state.route) {
        this.activeView = event.state.route;
      } else {
        // Handle direct URL navigation
        const path = window.location.pathname.slice(1);
        if (!path || path === '') {
          this.activeView = 'dashboard';
        } else {
          // Set activeView to the path regardless of validity
          // The render method will handle showing 404 for invalid routes
          this.activeView = path;
        }
      }
    });
    
    // Listen for auth events
    window.addEventListener('auth:login', this.handleAuthLogin);
    window.addEventListener('auth:logout', this.handleAuthLogout);
    this.addEventListener('login-success', this.handleLoginSuccess);
    
    // Listen for theme changes
    window.addEventListener('theme-changed', this.handleThemeChange as EventListener);
  }
  
  override disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('auth:login', this.handleAuthLogin);
    window.removeEventListener('auth:logout', this.handleAuthLogout);
    window.removeEventListener('theme-changed', this.handleThemeChange as EventListener);
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
          <button class="theme-toggle" @click="${this.toggleTheme}" title="Toggle theme">
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
          <span class="user-info">Logged in</span>
          <button class="logout-button" @click="${this.handleLogout}">Logout</button>
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
            ${this.activeView === 'dashboard' ? html`<dashboard-tab></dashboard-tab>` : ''}
            ${this.activeView === 'network' ? html`<network-tab></network-tab>` : ''}
            ${this.activeView === 'storage' ? html`<storage-tab></storage-tab>` : ''}
            ${this.activeView === 'containers' ? html`<containers-tab></containers-tab>` : ''}
            ${this.activeView === 'logs' ? html`<logs-tab></logs-tab>` : ''}
            ${this.activeView === 'terminal' ? html`<terminal-tab></terminal-tab>` : ''}
            ${this.activeView === 'users' ? html`<users-tab></users-tab>` : ''}
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
    this.activeView = e.detail.route;
  }
  
  private isValidRoute(route: string): boolean {
    const validRoutes = ['dashboard', 'network', 'storage', 'containers', 'logs', 'terminal', 'users'];
    return validRoutes.includes(route);
  }
}

customElements.define('app-root', AppRoot);
