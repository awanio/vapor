import { LitElement } from 'lit';
import '../ui/loading-state.js';
import '../ui/empty-state.js';
export declare class CreateVMWizard extends LitElement {
    private wizardController;
    private storagePoolsController;
    private isosController;
    private isCreating;
    private validationErrors;
    private showAdvancedOptions;
    static styles: import("lit").CSSResult;
    connectedCallback(): void;
    private loadData;
    private handleClose;
    private handleOverlayClick;
    private handlePrevious;
    private handleNext;
    private validateStep;
    private handleCreate;
    private validateAllSteps;
    private updateFormData;
    private addDisk;
    private removeDisk;
    private updateDisk;
    private showNotification;
    private renderBasicConfig;
    private renderStorageConfig;
    private renderNetworkConfig;
    private renderReview;
    private formatMemory;
    private formatBytes;
    render(): import("lit-html").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        'create-vm-wizard': CreateVMWizard;
    }
}
//# sourceMappingURL=create-vm-wizard.d.ts.map