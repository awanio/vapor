import { LitElement } from 'lit';
export declare class NamespaceDropdown extends LitElement {
    static styles: import("lit").CSSResult;
    namespaces: Array<{
        name: string;
        count?: number;
    }>;
    selectedNamespace: string;
    loading: boolean;
    placeholder: string;
    showCounts: boolean;
    includeAllOption: boolean;
    private isOpen;
    private searchQuery;
    render(): import("lit-html").TemplateResult<1>;
    private getFilteredNamespaces;
    private toggleDropdown;
    private handleClickOutside;
    private closeDropdown;
    private handleSearch;
    private handleKeydown;
    private selectNamespace;
    disconnectedCallback(): void;
}
declare global {
    interface HTMLElementTagNameMap {
        'namespace-dropdown': NamespaceDropdown;
    }
}
//# sourceMappingURL=namespace-dropdown.d.ts.map