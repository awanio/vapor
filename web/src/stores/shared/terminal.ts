/**
 * Terminal Store
 * Manages persistent terminal sessions with WebSocket connections
 */

import { atom, computed } from 'nanostores';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { SearchAddon } from 'xterm-addon-search';
import { WebSocketManager } from '../../api';
import type { WSTerminalInputMessage, WSMessage } from '../../types/api';

// Terminal session state interface
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
  // Runtime instances (not serializable)
  terminal?: Terminal;
  fitAddon?: FitAddon;
  searchAddon?: SearchAddon;
  webLinksAddon?: WebLinksAddon;
  wsManager?: WebSocketManager;
  element?: HTMLElement;
}

// Terminal store state interface
export interface TerminalStoreState {
  sessions: Map<string, TerminalSessionState>;
  activeSessionId: string | null;
  sessionCounter: number;
}

// Configuration for terminal
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

// Main store atoms
export const terminalSessions = atom<Map<string, TerminalSessionState>>(new Map());
export const activeSessionId = atom<string | null>(null);
export const sessionCounter = atom<number>(0);

// Computed values
export const activeSession = computed(
  [terminalSessions, activeSessionId],
  (sessions, activeId) => {
    if (!activeId) return null;
    return sessions.get(activeId) || null;
  }
);

export const sessionList = computed(
  terminalSessions,
  (sessions) => Array.from(sessions.values()).sort((a, b) => a.createdAt - b.createdAt)
);

export const connectedSessionsCount = computed(
  terminalSessions,
  (sessions) => Array.from(sessions.values()).filter(s => s.connectionStatus === 'connected').length
);

// Terminal store class for managing operations
class TerminalStore {
  private resizeObservers = new Map<string, ResizeObserver>();
  private scrollbackBufferLimit = 1000; // Store last 1000 lines for each session

  /**
   * Create a new terminal session
   */
  async createSession(name?: string): Promise<string> {
    const counter = sessionCounter.get() + 1;
    sessionCounter.set(counter);
    
    const sessionId = `session-${counter}`;
    const sessionName = name || `Terminal ${counter}`;
    
    const session: TerminalSessionState = {
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
    
    // Set as active session
    activeSessionId.set(sessionId);
    
    return sessionId;
  }

  /**
   * Initialize terminal for a session (when displaying in UI)
   */
  async initializeTerminal(sessionId: string, container: HTMLElement): Promise<void> {
    const sessions = terminalSessions.get();
    const session = sessions.get(sessionId);
    if (!session) return;

    // If terminal already exists and is attached to a different element, dispose it first
    if (session.terminal && session.element !== container) {
      this.disposeTerminalInstance(session);
    }

    // Create new terminal instance if needed
    if (!session.terminal) {
      session.terminal = new Terminal(TERMINAL_CONFIG);
      session.fitAddon = new FitAddon();
      session.searchAddon = new SearchAddon();
      session.webLinksAddon = new WebLinksAddon();

      session.terminal.loadAddon(session.fitAddon);
      session.terminal.loadAddon(session.searchAddon);
      session.terminal.loadAddon(session.webLinksAddon);

      // Restore scrollback buffer if available
      if (session.scrollbackBuffer && session.scrollbackBuffer.length > 0) {
        session.scrollbackBuffer.forEach(line => {
          session.terminal!.write(line);
        });
      }

      // Handle terminal input
      session.terminal.onData((data) => {
        if (session.wsManager && session.connectionStatus === 'connected') {
          const message: WSTerminalInputMessage = {
            type: 'input',
            data: data
          };
          session.wsManager.send(message);
        }
      });

      // Handle resize
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

    // Open terminal in container
    session.terminal.open(container);
    session.element = container;

    // Set up resize observer
    this.setupResizeObserver(sessionId, container);

    // Initial fit
    setTimeout(() => {
      if (session.fitAddon) {
        session.fitAddon.fit();
      }
    }, 100);

    // Update the session
    const updatedSessions = new Map(terminalSessions.get());
    updatedSessions.set(sessionId, session);
    terminalSessions.set(updatedSessions);

    // Connect if not connected
    if (session.connectionStatus === 'disconnected') {
      await this.connectSession(sessionId);
    }
  }

  /**
   * Connect a session to WebSocket
   */
  async connectSession(sessionId: string): Promise<void> {
    const sessions = terminalSessions.get();
    const session = sessions.get(sessionId);
    if (!session) return;

    // Update status
    session.connectionStatus = 'connecting';
    const updatedSessions = new Map(sessions);
    updatedSessions.set(sessionId, session);
    terminalSessions.set(updatedSessions);

    try {
      // Create new WebSocket connection
      session.wsManager = new WebSocketManager('/ws/terminal');

      // Handle output messages
      session.wsManager.on('output', (message: WSMessage) => {
        if (session.terminal && message.payload?.data) {
          const data = message.payload.data;
          session.terminal.write(data);
          
          // Store in scrollback buffer
          if (!session.scrollbackBuffer) {
            session.scrollbackBuffer = [];
          }
          session.scrollbackBuffer.push(data);
          
          // Limit scrollback buffer size
          if (session.scrollbackBuffer.length > this.scrollbackBufferLimit) {
            session.scrollbackBuffer = session.scrollbackBuffer.slice(-this.scrollbackBufferLimit);
          }
        }
      });

      // Handle error messages
      session.wsManager.on('error', (message) => {
        console.error('Terminal error:', message.error);
        session.connectionStatus = 'disconnected';
        const sessions = new Map(terminalSessions.get());
        sessions.set(sessionId, session);
        terminalSessions.set(sessions);
      });

      await session.wsManager.connect();

      // Send terminal spec to subscribe
      const subscribeMessage: WSMessage = {
        type: 'subscribe',
        payload: {
          cols: session.cols,
          rows: session.rows,
          shell: '/bin/bash'
        }
      };
      session.wsManager.send(subscribeMessage);

      // Update status
      session.connectionStatus = 'connected';
      session.lastActiveAt = Date.now();
      const finalSessions = new Map(terminalSessions.get());
      finalSessions.set(sessionId, session);
      terminalSessions.set(finalSessions);

    } catch (error) {
      console.error('Failed to connect terminal:', error);
      session.connectionStatus = 'disconnected';
      const errorSessions = new Map(terminalSessions.get());
      errorSessions.set(sessionId, session);
      terminalSessions.set(errorSessions);
    }
  }

  /**
   * Disconnect a session
   */
  disconnectSession(sessionId: string): void {
    const sessions = terminalSessions.get();
    const session = sessions.get(sessionId);
    if (!session) return;

    if (session.wsManager) {
      session.wsManager.disconnect();
      session.wsManager = undefined;
    }
    
    session.connectionStatus = 'disconnected';
    const updatedSessions = new Map(sessions);
    updatedSessions.set(sessionId, session);
    terminalSessions.set(updatedSessions);
  }

  /**
   * Close/remove a session completely
   */
  closeSession(sessionId: string): void {
    const sessions = new Map(terminalSessions.get());
    const session = sessions.get(sessionId);
    if (!session) return;

    // Clean up resources
    this.disconnectSession(sessionId);
    this.disposeTerminalInstance(session);
    
    // Remove resize observer
    const observer = this.resizeObservers.get(sessionId);
    if (observer) {
      observer.disconnect();
      this.resizeObservers.delete(sessionId);
    }

    // Remove session
    sessions.delete(sessionId);
    terminalSessions.set(sessions);

    // If this was the active session, switch to another
    if (activeSessionId.get() === sessionId) {
      const remainingSessions = Array.from(sessions.keys());
      const nextId = remainingSessions.length > 0 ? remainingSessions[0] : null;
      if (nextId !== undefined) {
        activeSessionId.set(nextId);
      }
    }
  }

  /**
   * Detach terminal from DOM (when navigating away)
   */
  detachTerminal(sessionId: string): void {
    const sessions = terminalSessions.get();
    const session = sessions.get(sessionId);
    if (!session) return;

    // Remove resize observer
    const observer = this.resizeObservers.get(sessionId);
    if (observer && session.element) {
      observer.unobserve(session.element);
    }

    // Don't dispose the terminal, just detach it
    session.element = undefined;
  }

  /**
   * Clear terminal output
   */
  clearTerminal(sessionId: string): void {
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

  /**
   * Fit terminal to container
   */
  fitTerminal(sessionId: string): void {
    const sessions = terminalSessions.get();
    const session = sessions.get(sessionId);
    if (session?.fitAddon) {
      session.fitAddon.fit();
    }
  }

  /**
   * Focus terminal
   */
  focusTerminal(sessionId: string): void {
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

  /**
   * Send input to terminal
   */
  sendInput(sessionId: string, data: string): void {
    const sessions = terminalSessions.get();
    const session = sessions.get(sessionId);
    if (session?.wsManager && session.connectionStatus === 'connected') {
      const message: WSTerminalInputMessage = {
        type: 'input',
        data: data
      };
      session.wsManager.send(message);
    }
  }

  /**
   * Get terminal selection
   */
  getSelection(sessionId: string): string | null {
    const sessions = terminalSessions.get();
    const session = sessions.get(sessionId);
    if (session?.terminal && session.terminal.hasSelection()) {
      return session.terminal.getSelection();
    }
    return null;
  }

  /**
   * Scroll terminal
   */
  scrollToTop(sessionId: string): void {
    const sessions = terminalSessions.get();
    const session = sessions.get(sessionId);
    if (session?.terminal) {
      session.terminal.scrollToTop();
    }
  }

  scrollToBottom(sessionId: string): void {
    const sessions = terminalSessions.get();
    const session = sessions.get(sessionId);
    if (session?.terminal) {
      session.terminal.scrollToBottom();
    }
  }

  /**
   * Rename session
   */
  renameSession(sessionId: string, newName: string): void {
    const sessions = new Map(terminalSessions.get());
    const session = sessions.get(sessionId);
    if (session) {
      session.name = newName;
      sessions.set(sessionId, session);
      terminalSessions.set(sessions);
    }
  }

  /**
   * Private helper methods
   */
  private setupResizeObserver(sessionId: string, element: HTMLElement): void {
    // Remove existing observer if any
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

  private disposeTerminalInstance(session: TerminalSessionState): void {
    if (session.terminal) {
      session.terminal.dispose();
      session.terminal = undefined;
    }
    session.fitAddon = undefined;
    session.searchAddon = undefined;
    session.webLinksAddon = undefined;
    session.element = undefined;
  }

  /**
   * Clean up all resources
   */
  dispose(): void {
    // Disconnect all sessions
    const sessions = terminalSessions.get();
    sessions.forEach((_, sessionId) => {
      this.closeSession(sessionId);
    });

    // Clear all stores
    terminalSessions.set(new Map());
    activeSessionId.set(null);
    sessionCounter.set(0);
  }
}

// Export singleton instance
export const terminalStore = new TerminalStore();

// Export store type for TypeScript
export type { TerminalStore };
