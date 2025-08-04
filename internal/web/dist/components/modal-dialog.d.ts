import { I18nLitElement } from '../i18n-mixin';
export declare class ModalDialog extends I18nLitElement {
    open: boolean;
    title: string;
    size: 'small' | 'medium' | 'large';
    showFooter: boolean;
    static styles: import("lit").CSSResult;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private handleKeydown;
    private handleOverlayClick;
    close(): void;
    render(): import("lit-html").TemplateResult<1>;
}
//# sourceMappingURL=modal-dialog.d.ts.map