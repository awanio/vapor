import { LitElement, PropertyValues } from 'lit';
export declare class TerminalTab extends LitElement {
    private sessions;
    private activeSessionId;
    private sessionCounter;
    private resizeObserver;
    static styles: import("lit").CSSResult[];
    connectedCallback(): void;
    disconnectedCallback(): void;
    firstUpdated(): void;
    updated(changedProperties: PropertyValues): void;
    private createNewSession;
    private closeSession;
    private switchToSession;
    private handleWindowResize;
    private handleFullscreenChange;
    private setupResizeObserver;
    private setupScrollingShortcuts;
    private hideCharMeasureElement;
    private clearTerminal;
    private scrollToTop;
    private scrollToBottom;
    private copySelection;
    private pasteFromClipboard;
    private toggleFullscreen;
    private cleanup;
    render(): import("lit-html").TemplateResult<1>;
}
//# sourceMappingURL=terminal-tab.d.ts.map