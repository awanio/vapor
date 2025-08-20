import { LitElement } from 'lit';
import type { VirtualMachine } from '../../types/virtualization';
export declare class VMActions extends LitElement {
    vm: VirtualMachine;
    compact: boolean;
    showLabels: boolean;
    private isPerformingAction;
    private currentAction;
    static styles: import("lit").CSSResult;
    private getActionIcon;
    private canPerformAction;
    private performAction;
    private openConsole;
    private buildConsoleUrl;
    private confirmAction;
    private showNotification;
    private renderActionButton;
    private renderStatusIndicator;
    render(): import("lit-html").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        'vm-actions': VMActions;
    }
}
//# sourceMappingURL=vm-actions.d.ts.map