import { LitElement } from 'lit';
export declare class LoginPage extends LitElement {
    static styles: import("lit").CSSResult;
    private username;
    private password;
    private loading;
    private error;
    render(): import("lit-html").TemplateResult<1>;
    private handleUsernameInput;
    private handlePasswordInput;
    private handleSubmit;
}
declare global {
    interface HTMLElementTagNameMap {
        'login-page': LoginPage;
    }
}
//# sourceMappingURL=login-page.d.ts.map