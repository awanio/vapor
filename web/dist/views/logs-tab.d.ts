import { LitElement } from 'lit';
export declare class LogsTab extends LitElement {
    private logs;
    private serviceFilter;
    private priorityFilter;
    private sinceFilter;
    private follow;
    private connected;
    private autoScroll;
    private wsManager;
    private logsContainer;
    private maxLogs;
    update(changedProperties: Map<string | number | symbol, unknown>): void;
    static styles: import("lit").CSSResult;
    connectedCallback(): void;
    disconnectedCallback(): void;
    firstUpdated(): void;
    private initWebSocket;
    private subscribeToLogs;
    private addLog;
    private handleServiceFilterChange;
    private handlePriorityChange;
    private handleSinceFilterChange;
    private handleFollowChange;
    private handleAutoScrollChange;
    private clearLogs;
    private cleanup;
    private formatTimestamp;
    private renderLog;
    render(): import("lit-html").TemplateResult<1>;
}
//# sourceMappingURL=logs-tab.d.ts.map