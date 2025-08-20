import { atom, computed } from 'nanostores';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { SearchAddon } from 'xterm-addon-search';
import { WebSocketManager } from '../../api';
const TERMINAL_CONFIG = {
    cursorBlink: true,
    fontSize: 14,
    fontFamily: 'Consolas, "Courier New", monospace',
    scrollback: 10000,
    convertEol: true,
    screenReaderMode: false,
    theme: {
        background: '#1e1e1e',
        foreground: '#cccccc',
        cursor: '#ffffff',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5'
    }
};
export const terminalSessions = atom(new Map());
export const activeSessionId = atom(null);
export const sessionCounter = atom(0);
export const activeSession = computed([terminalSessions, activeSessionId], (sessions, activeId) => {
    if (!activeId)
        return null;
    return sessions.get(activeId) || null;
});
export const sessionList = computed(terminalSessions, (sessions) => Array.from(sessions.values()).sort((a, b) => a.createdAt - b.createdAt));
export const connectedSessionsCount = computed(terminalSessions, (sessions) => Array.from(sessions.values()).filter(s => s.connectionStatus === 'connected').length);
class TerminalStore {
    constructor() {
        this.resizeObservers = new Map();
        this.scrollbackBufferLimit = 1000;
    }
    async createSession(name) {
        const counter = sessionCounter.get() + 1;
        sessionCounter.set(counter);
        const sessionId = `session-${counter}`;
        const sessionName = name || `Terminal ${counter}`;
        const session = {
            id: sessionId,
            name: sessionName,
            connectionStatus: 'disconnected',
            scrollbackBuffer: [],
            createdAt: Date.now(),
            lastActiveAt: Date.now(),
            cols: 80,
            rows: 24
        };
        const sessions = new Map(terminalSessions.get());
        sessions.set(sessionId, session);
        terminalSessions.set(sessions);
        activeSessionId.set(sessionId);
        return sessionId;
    }
    async initializeTerminal(sessionId, container) {
        const sessions = terminalSessions.get();
        const session = sessions.get(sessionId);
        if (!session)
            return;
        if (session.terminal && session.element !== container) {
            this.disposeTerminalInstance(session);
        }
        if (!session.terminal) {
            session.terminal = new Terminal(TERMINAL_CONFIG);
            session.fitAddon = new FitAddon();
            session.searchAddon = new SearchAddon();
            session.webLinksAddon = new WebLinksAddon();
            session.terminal.loadAddon(session.fitAddon);
            session.terminal.loadAddon(session.searchAddon);
            session.terminal.loadAddon(session.webLinksAddon);
            if (session.scrollbackBuffer && session.scrollbackBuffer.length > 0) {
                session.scrollbackBuffer.forEach(line => {
                    session.terminal.write(line);
                });
            }
            session.terminal.onData((data) => {
                if (session.wsManager && session.connectionStatus === 'connected') {
                    const message = {
                        type: 'input',
                        data: data
                    };
                    session.wsManager.send(message);
                }
            });
            session.terminal.onResize((size) => {
                session.cols = size.cols;
                session.rows = size.rows;
                if (session.wsManager && session.connectionStatus === 'connected') {
                    const message = {
                        type: 'resize',
                        payload: {
                            cols: size.cols,
                            rows: size.rows
                        }
                    };
                    session.wsManager.send(message);
                }
            });
        }
        session.terminal.open(container);
        session.element = container;
        this.setupResizeObserver(sessionId, container);
        setTimeout(() => {
            if (session.fitAddon) {
                session.fitAddon.fit();
            }
        }, 100);
        const updatedSessions = new Map(terminalSessions.get());
        updatedSessions.set(sessionId, session);
        terminalSessions.set(updatedSessions);
        if (session.connectionStatus === 'disconnected') {
            await this.connectSession(sessionId);
        }
    }
    async connectSession(sessionId) {
        const sessions = terminalSessions.get();
        const session = sessions.get(sessionId);
        if (!session)
            return;
        session.connectionStatus = 'connecting';
        const updatedSessions = new Map(sessions);
        updatedSessions.set(sessionId, session);
        terminalSessions.set(updatedSessions);
        try {
            session.wsManager = new WebSocketManager('/ws/terminal');
            session.wsManager.on('output', (message) => {
                if (session.terminal && message.payload?.data) {
                    const data = message.payload.data;
                    session.terminal.write(data);
                    if (!session.scrollbackBuffer) {
                        session.scrollbackBuffer = [];
                    }
                    session.scrollbackBuffer.push(data);
                    if (session.scrollbackBuffer.length > this.scrollbackBufferLimit) {
                        session.scrollbackBuffer = session.scrollbackBuffer.slice(-this.scrollbackBufferLimit);
                    }
                }
            });
            session.wsManager.on('error', (message) => {
                console.error('Terminal error:', message.error);
                session.connectionStatus = 'disconnected';
                const sessions = new Map(terminalSessions.get());
                sessions.set(sessionId, session);
                terminalSessions.set(sessions);
            });
            await session.wsManager.connect();
            const subscribeMessage = {
                type: 'subscribe',
                payload: {
                    cols: session.cols,
                    rows: session.rows,
                    shell: '/bin/bash'
                }
            };
            session.wsManager.send(subscribeMessage);
            session.connectionStatus = 'connected';
            session.lastActiveAt = Date.now();
            const finalSessions = new Map(terminalSessions.get());
            finalSessions.set(sessionId, session);
            terminalSessions.set(finalSessions);
        }
        catch (error) {
            console.error('Failed to connect terminal:', error);
            session.connectionStatus = 'disconnected';
            const errorSessions = new Map(terminalSessions.get());
            errorSessions.set(sessionId, session);
            terminalSessions.set(errorSessions);
        }
    }
    disconnectSession(sessionId) {
        const sessions = terminalSessions.get();
        const session = sessions.get(sessionId);
        if (!session)
            return;
        if (session.wsManager) {
            session.wsManager.disconnect();
            session.wsManager = undefined;
        }
        session.connectionStatus = 'disconnected';
        const updatedSessions = new Map(sessions);
        updatedSessions.set(sessionId, session);
        terminalSessions.set(updatedSessions);
    }
    closeSession(sessionId) {
        const sessions = new Map(terminalSessions.get());
        const session = sessions.get(sessionId);
        if (!session)
            return;
        this.disconnectSession(sessionId);
        this.disposeTerminalInstance(session);
        const observer = this.resizeObservers.get(sessionId);
        if (observer) {
            observer.disconnect();
            this.resizeObservers.delete(sessionId);
        }
        sessions.delete(sessionId);
        terminalSessions.set(sessions);
        if (activeSessionId.get() === sessionId) {
            const remainingSessions = Array.from(sessions.keys());
            const nextId = remainingSessions.length > 0 ? remainingSessions[0] : null;
            if (nextId !== undefined) {
                activeSessionId.set(nextId);
            }
        }
    }
    detachTerminal(sessionId) {
        const sessions = terminalSessions.get();
        const session = sessions.get(sessionId);
        if (!session)
            return;
        const observer = this.resizeObservers.get(sessionId);
        if (observer && session.element) {
            observer.unobserve(session.element);
        }
        session.element = undefined;
    }
    clearTerminal(sessionId) {
        const sessions = terminalSessions.get();
        const session = sessions.get(sessionId);
        if (session?.terminal) {
            session.terminal.clear();
            session.scrollbackBuffer = [];
            const updatedSessions = new Map(sessions);
            updatedSessions.set(sessionId, session);
            terminalSessions.set(updatedSessions);
        }
    }
    fitTerminal(sessionId) {
        const sessions = terminalSessions.get();
        const session = sessions.get(sessionId);
        if (session?.fitAddon) {
            session.fitAddon.fit();
        }
    }
    focusTerminal(sessionId) {
        const sessions = terminalSessions.get();
        const session = sessions.get(sessionId);
        if (session?.terminal) {
            session.terminal.focus();
            session.lastActiveAt = Date.now();
            const updatedSessions = new Map(sessions);
            updatedSessions.set(sessionId, session);
            terminalSessions.set(updatedSessions);
        }
    }
    sendInput(sessionId, data) {
        const sessions = terminalSessions.get();
        const session = sessions.get(sessionId);
        if (session?.wsManager && session.connectionStatus === 'connected') {
            const message = {
                type: 'input',
                data: data
            };
            session.wsManager.send(message);
        }
    }
    getSelection(sessionId) {
        const sessions = terminalSessions.get();
        const session = sessions.get(sessionId);
        if (session?.terminal && session.terminal.hasSelection()) {
            return session.terminal.getSelection();
        }
        return null;
    }
    scrollToTop(sessionId) {
        const sessions = terminalSessions.get();
        const session = sessions.get(sessionId);
        if (session?.terminal) {
            session.terminal.scrollToTop();
        }
    }
    scrollToBottom(sessionId) {
        const sessions = terminalSessions.get();
        const session = sessions.get(sessionId);
        if (session?.terminal) {
            session.terminal.scrollToBottom();
        }
    }
    renameSession(sessionId, newName) {
        const sessions = new Map(terminalSessions.get());
        const session = sessions.get(sessionId);
        if (session) {
            session.name = newName;
            sessions.set(sessionId, session);
            terminalSessions.set(sessions);
        }
    }
    setupResizeObserver(sessionId, element) {
        const existingObserver = this.resizeObservers.get(sessionId);
        if (existingObserver) {
            existingObserver.disconnect();
        }
        const observer = new ResizeObserver(() => {
            requestAnimationFrame(() => {
                this.fitTerminal(sessionId);
            });
        });
        observer.observe(element);
        this.resizeObservers.set(sessionId, observer);
    }
    disposeTerminalInstance(session) {
        if (session.terminal) {
            session.terminal.dispose();
            session.terminal = undefined;
        }
        session.fitAddon = undefined;
        session.searchAddon = undefined;
        session.webLinksAddon = undefined;
        session.element = undefined;
    }
    dispose() {
        const sessions = terminalSessions.get();
        sessions.forEach((_, sessionId) => {
            this.closeSession(sessionId);
        });
        terminalSessions.set(new Map());
        activeSessionId.set(null);
        sessionCounter.set(0);
    }
}
export const terminalStore = new TerminalStore();
//# sourceMappingURL=terminal.js.map