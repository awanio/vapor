import { LitElement } from 'lit';
import '../ui/action-dropdown.js';
import '../ui/status-badge.js';
import '../ui/empty-state.js';
import type { ActionItem } from '../ui/action-dropdown.js';
export interface Column {
    key: string;
    label: string;
    type?: 'text' | 'status' | 'link' | 'custom';
    width?: string;
}
export interface ResourceData {
    [key: string]: any;
}
export declare class ResourceTable extends LitElement {
    columns: Column[];
    data: ResourceData[];
    emptyMessage: string;
    showActions: boolean;
    getActions: ((item: ResourceData) => ActionItem[]) | null;
    static styles: import("lit").CSSResult;
    private handleCellClick;
    private handleActionClick;
    private renderCell;
    render(): import("lit-html").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        'resource-table': ResourceTable;
    }
}
//# sourceMappingURL=resource-table.d.ts.map