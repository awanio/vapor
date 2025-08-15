import { LitElement } from 'lit';
export declare class FilterDropdown extends LitElement {
    static styles: import("lit").CSSResult;
    options: Array<{
        value: string;
        label: string;
        icon?: string;
        count?: number;
    }>;
    selectedValue: string;
    label: string;
    showIcon: boolean;
    showCounts: boolean;
    showStatusIndicators: boolean;
    private isOpen;
    render(): import("lit-html").TemplateResult<1>;
    private toggleDropdown;
    private handleClickOutside;
    private closeDropdown;
    private selectOption;
    disconnectedCallback(): void;
}
declare global {
    interface HTMLElementTagNameMap {
        'filter-dropdown': FilterDropdown;
    }
}
//# sourceMappingURL=filter-dropdown.d.ts.map