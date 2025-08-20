import { LitElement } from 'lit';
import type { StoragePool } from '../../types/virtualization';
export declare class StoragePoolActions extends LitElement {
    pool: StoragePool;
    static styles: import("lit").CSSResult;
    private formatSize;
    private handleStart;
    private handleStop;
    private handleAutostart;
    private handleRefresh;
    private handleDelete;
    private handleCreateVolume;
    render(): import("lit-html").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        'storage-pool-actions': StoragePoolActions;
    }
}
//# sourceMappingURL=storage-pool-actions.d.ts.map