import { LitElement, PropertyValues } from 'lit';
export declare class TerminalTabV2 extends LitElement {
    private activeSessionController;
    private sessionListController;
    private activeSessionStateController;
    private connectedCountController;
    private isFullscreen;
    private localSessions;
    private localActiveSessionId;
    private localActiveSession;
    static styles: import("lit").CSSResult[];
    connectedCallback(): void;
    disconnectedCallback(): void;
    firstUpdated(): void;
    updated(changedProperties: PropertyValues): void;
    private updateLocalState;
    private initializeTerminals;
    private setupTerminals;
    private createNewSession;
    private closeSession;
    private switchToSession;
    private reconnectSession;
    private clearTerminal;
    private copySelection;
    private pasteFromClipboard;
    private scrollToTop;
    private scrollToBottom;
    private toggleFullscreen;
    private handleWindowResize;
    private handleFullscreenChange;
    render(): import("lit-html").TemplateResult<1>;
}
//# sourceMappingURL=terminal-tab-v2.d.ts.map