import { LitElement } from 'lit';
export declare class AnsibleExecutionDrawer extends LitElement {
    executionId?: string;
    open: boolean;
    private execution?;
    private loading;
    private streaming;
    private output;
    private error?;
    private wsManager?;
    private outputContainer?;
    static styles: import("lit").CSSResult;
    updated(changedProperties: Map<string, any>): void;
    private loadExecution;
    private startStreaming;
    private scrollToBottom;
    private cleanup;
    private close;
    private rerun;
    private downloadLog;
    private getOutputLineClass;
    render(): import("lit-html").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        'ansible-execution-drawer': AnsibleExecutionDrawer;
    }
}
//# sourceMappingURL=ansible-execution-drawer.d.ts.map