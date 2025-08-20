import { LitElement } from 'lit';
export declare class SearchInput extends LitElement {
    value: string;
    placeholder: string;
    width: number;
    disabled: boolean;
    static styles: import("lit").CSSResult;
    private handleInput;
    render(): import("lit-html").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        'search-input': SearchInput;
    }
}
//# sourceMappingURL=search-input.d.ts.map