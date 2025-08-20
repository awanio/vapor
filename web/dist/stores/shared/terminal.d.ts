import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { SearchAddon } from 'xterm-addon-search';
import { WebSocketManager } from '../../api';
export interface TerminalSessionState {
    id: string;
    name: string;
    connectionStatus: 'connecting' | 'connected' | 'disconnected';
    scrollbackBuffer?: string[];
    currentDirectory?: string;
    createdAt: number;
    lastActiveAt: number;
    cols: number;
    rows: number;
    terminal?: Terminal;
    fitAddon?: FitAddon;
    searchAddon?: SearchAddon;
    webLinksAddon?: WebLinksAddon;
    wsManager?: WebSocketManager;
    element?: HTMLElement;
}
export interface TerminalStoreState {
    sessions: Map<string, TerminalSessionState>;
    activeSessionId: string | null;
    sessionCounter: number;
}
export declare const terminalSessions: import("nanostores").PreinitializedWritableAtom<Map<string, TerminalSessionState>> & object;
export declare const activeSessionId: import("nanostores").PreinitializedWritableAtom<string | null> & object;
export declare const sessionCounter: import("nanostores").PreinitializedWritableAtom<number> & object;
export declare const activeSession: import("nanostores").ReadableAtom<TerminalSessionState | null>;
export declare const sessionList: import("nanostores").ReadableAtom<TerminalSessionState[]>;
export declare const connectedSessionsCount: import("nanostores").ReadableAtom<number>;
declare class TerminalStore {
    private resizeObservers;
    private scrollbackBufferLimit;
    createSession(name?: string): Promise<string>;
    initializeTerminal(sessionId: string, container: HTMLElement): Promise<void>;
    connectSession(sessionId: string): Promise<void>;
    disconnectSession(sessionId: string): void;
    closeSession(sessionId: string): void;
    detachTerminal(sessionId: string): void;
    clearTerminal(sessionId: string): void;
    fitTerminal(sessionId: string): void;
    focusTerminal(sessionId: string): void;
    sendInput(sessionId: string, data: string): void;
    getSelection(sessionId: string): string | null;
    scrollToTop(sessionId: string): void;
    scrollToBottom(sessionId: string): void;
    renameSession(sessionId: string, newName: string): void;
    private setupResizeObserver;
    private disposeTerminalInstance;
    dispose(): void;
}
export declare const terminalStore: TerminalStore;
export type { TerminalStore };
//# sourceMappingURL=terminal.d.ts.map