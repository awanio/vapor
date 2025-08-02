import { LitElement } from 'lit';
export declare class StatusBar extends LitElement {
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