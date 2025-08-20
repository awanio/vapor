import { LitElement } from 'lit';
import '../dialogs/modal-dialog.js';
import '../ui/loading-state.js';
import type { StoragePool, Volume } from '../../types/virtualization';
export declare class VolumeDialog extends LitElement {
    pool: StoragePool;
    volume?: Volume;
    private formData;
    private isCreating;
    private errors;
    static styles: import("lit").CSSResult;
    connectedCallback(): void;
    private convertBytesToUnit;
    private convertToBytes;
    private formatSize;
    private validateForm;
    private handleCreate;
    private handleClose;
    private handleInputChange;
    private renderFormatOptions;
    render(): import("lit-html").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        'volume-dialog': VolumeDialog;
    }
}
//# sourceMappingURL=volume-dialog.d.ts.map