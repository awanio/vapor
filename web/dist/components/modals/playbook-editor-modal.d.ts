import { LitElement } from 'lit';
export declare class PlaybookEditorModal extends LitElement {
    open: boolean;
    playbookName?: string;
    mode: 'create' | 'edit';
    private name;
    private content;
    private loading;
    private validating;
    private saving;
    private validationResult?;
    private error?;
    static styles: import("lit").CSSResult;
    willUpdate(changedProperties: Map<string, any>): void;
    private loadPlaybook;
    private reset;
    private validatePlaybook;
    private save;
    private close;
    private handleKeyDown;
    render(): import("lit-html").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        'playbook-editor-modal': PlaybookEditorModal;
    }
}
//# sourceMappingURL=playbook-editor-modal.d.ts.map