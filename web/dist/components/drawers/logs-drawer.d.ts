import { LitElement } from 'lit';
export declare class LogsDrawer extends LitElement {
    static styles: import("lit").CSSResult;
    show: boolean;
    title: string;
    subtitle: string;
    logs: string;
    loading: boolean;
    error: string;
    autoScroll: boolean;
    showTimestamps: boolean;
    colorize: boolean;
    private searchQuery;
    private isFollowing;
    render(): import("lit-html").TemplateResult<1> | null;
    private renderLogs;
    private renderLogLine;
    private handleClose;
    private handleRefresh;
    private handleSearch;
    private toggleFollow;
    private clearLogs;
    private handleScroll;
    private scrollToBottom;
    updated(changedProperties: Map<string, any>): void;
}
declare global {
    interface HTMLElementTagNameMap {
        'logs-drawer': LogsDrawer;
    }
}
//# sourceMappingURL=logs-drawer.d.ts.map