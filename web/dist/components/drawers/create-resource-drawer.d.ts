import { LitElement } from 'lit';
export declare class CreateResourceDrawer extends LitElement {
    static styles: import("lit").CSSResult;
    show: boolean;
    title: string;
    value: string;
    loading: boolean;
    error: string;
    format: 'yaml' | 'json';
    submitLabel: string;
    private validationMessage;
    private validationStatus;
    private templates;
    render(): import("lit-html").TemplateResult<1>;
    private getPlaceholder;
    private handleInput;
    private setFormat;
    private detectFormat;
    private convertFormat;
    private validateResource;
    private validateResourceStructure;
    private loadTemplate;
    private handleClose;
    private handleCreate;
}
declare global {
    interface HTMLElementTagNameMap {
        'create-resource-drawer': CreateResourceDrawer;
    }
}
//# sourceMappingURL=create-resource-drawer.d.ts.map