import { LitElement } from 'lit';
import '../drawers/detail-drawer.js';
import './vm-actions.js';
import '../ui/status-badge.js';
import '../ui/loading-state.js';
import type { VirtualMachine } from '../../types/virtualization';
export declare class VMDetailsDrawer extends LitElement {
    open: boolean;
    vm: VirtualMachine | null;
    private selectedVMController;
    private activeTab;
    private snapshots;
    private backups;
    private metrics;
    private isLoadingSnapshots;
    private isLoadingBackups;
    private isLoadingMetrics;
    static styles: import("lit").CSSResult;
    connectedCallback(): void;
    updated(changedProperties: Map<string, any>): void;
    private loadAdditionalData;
    private loadSnapshots;
    private loadBackups;
    private loadMetrics;
    private handleTabChange;
    private handleClose;
    private formatMemory;
    private formatDiskSize;
    private formatDate;
    private renderOverview;
    private renderStorage;
    private renderNetwork;
    private renderSnapshots;
    private renderBackups;
    private renderMetrics;
    private createSnapshot;
    private revertSnapshot;
    private deleteSnapshot;
    private createBackup;
    private restoreBackup;
    private deleteBackup;
    render(): import("lit-html").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        'vm-details-drawer': VMDetailsDrawer;
    }
}
//# sourceMappingURL=vm-details-drawer.d.ts.map