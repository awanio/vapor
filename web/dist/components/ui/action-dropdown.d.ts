import { LitElement } from 'lit';
export interface ActionItem {
    label: string;
    action: string;
    danger?: boolean;
    icon?: string;
    disabled?: boolean;
}
export declare class ActionDropdown extends LitElement {
    actions: ActionItem[];
    menuId: string;
    private isOpen;
    static styles: import("lit").CSSResult;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private handleOutsideClick;
    private toggleMenu;
    private handleAction;
    render(): import("lit-html").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        'action-dropdown': ActionDropdown;
    }
}
//# sourceMappingURL=action-dropdown.d.ts.map