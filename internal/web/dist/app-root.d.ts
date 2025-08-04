import { LitElement } from 'lit';
import './components/login-page';
import './views/dashboard-tab';
import './views/network-tab';
import './views/storage-tab';
import './views/containers-tab';
import './views/logs-tab';
import './views/terminal-tab';
import './views/users-tab';
import './components/sidebar-tree';
export declare class AppRoot extends LitElement {
    sidebarCollapsed: boolean;
    private isAuthenticated;
    private activeView;
    private currentTheme;
    private currentLocale;
    private languageMenuOpen;
    static styles: import("lit").CSSResult;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private handleAuthLogin;
    private handleAuthLogout;
    private handleLoginSuccess;
    private handleLogout;
    private handleThemeChange;
    private toggleTheme;
    private toggleLanguageMenu;
    private selectLanguage;
    private handleDocumentClick;
    render(): import("lit-html").TemplateResult<1>;
    toggleSidebar(): void;
    private handleNavigation;
    private isValidRoute;
}
//# sourceMappingURL=app-root.d.ts.map