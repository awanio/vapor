import { LitElement } from 'lit';
export declare class PlaybookRunModal extends LitElement {
    open: boolean;
    playbookName: string;
    private inventory;
    private limit;
    private tags;
    private skipTags;
    private extraVars;
    private check;
    private diff;
    private verbose;
    private become;
    private becomeUser;
    private privateKey;
    private timeout;
    private forks;
    private running;
    private error?;
    static styles: import("lit").CSSResult;
    private showAdvanced;
    updated(changedProperties: Map<string, any>): void;
    private reset;
    private run;
    private close;
    render(): import("lit-html").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        'playbook-run-modal': PlaybookRunModal;
    }
}
//# sourceMappingURL=playbook-run-modal.d.ts.map