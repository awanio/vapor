import { I18nLitElement } from '../i18n-mixin';
export declare class StatusBar extends I18nLitElement {
    currentUser: string;
    hostname: string;
    connected: boolean;
    systemInfo: any;
    static styles: import("lit").CSSResult;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private handleAuthChange;
    private handleThemeToggle;
    private handleLanguageChange;
    private handleLogout;
    render(): import("lit-html").TemplateResult<1>;
}
//# sourceMappingURL=status-bar.d.ts.map