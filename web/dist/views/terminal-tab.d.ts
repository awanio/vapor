import { LitElement } from 'lit';
export declare class TerminalTab extends LitElement {
    static styles: import("lit").CSSResult[];
    private terminal;
    private fitAddon;
    private searchAddon;
    private webLinksAddon;
    private wsManager;
    private terminalConnected;
    private connectionStatus;
    private resizeObserver;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private initializeTerminal;
    private handleWindowResize;
    private handleFullscreenChange;
    private setupResizeObserver;
    private setupScrollingShortcuts;
    private hideCharMeasureElement;
    private connect;
    private disconnect;
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