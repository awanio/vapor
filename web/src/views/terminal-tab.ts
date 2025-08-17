import { LitElement, html, css, unsafeCSS, PropertyValues } from 'lit';
import { state } from 'lit/decorators.js';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { SearchAddon } from 'xterm-addon-search';
import xtermStyles from 'xterm/css/xterm.css?inline';
import { WebSocketManager } from '../api';
import { t } from '../i18n';
import type { WSTerminalInputMessage, WSMessage } from '../types/api';

// Terminal Session class to encapsulate each terminal instance
class TerminalSession {
  id: string;
  name: string;
  terminal: Terminal | null = null;
  fitAddon: FitAddon | null = null;
  searchAddon: SearchAddon | null = null;
  webLinksAddon: WebLinksAddon | null = null;
  wsManager: WebSocketManager | null = null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' = 'disconnected';
  element: HTMLElement | null = null;

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }

  async initialize(container: HTMLElement, onDataCallback: (data: string) => void) {
    this.element = container;
    
    // Create terminal instance
    this.terminal = new Terminal({
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
    });

    // Initialize addons
    this.fitAddon = new FitAddon();
    this.searchAddon = new SearchAddon();
    this.webLinksAddon = new WebLinksAddon();

    this.terminal.loadAddon(this.fitAddon);
    this.terminal.loadAddon(this.searchAddon);
    this.terminal.loadAddon(this.webLinksAddon);

    // Open terminal in container
    this.terminal.open(container);
    
    // Initial fit
    setTimeout(() => {
      this.fitAddon?.fit();
    }, 100);

    // Handle terminal input
    this.terminal.onData((data) => {
      if (this.wsManager && this.connectionStatus === 'connected') {
        const message: WSTerminalInputMessage = {
          type: 'input',
          data: data
        };
        this.wsManager.send(message);
      }
      onDataCallback(data);
    });

    // Handle resize
    this.terminal.onResize((size) => {
      if (this.wsManager && this.connectionStatus === 'connected') {
        const message = {
          type: 'resize',
          payload: {
            cols: size.cols,
            rows: size.rows
          }
        };
        this.wsManager.send(message);
      }
    });
  }

  async connect() {
    if (this.wsManager) {
      this.wsManager.disconnect();
    }

    this.connectionStatus = 'connecting';

    try {
      this.wsManager = new WebSocketManager('/ws/terminal');
      
      // Handle output messages
      this.wsManager.on('output', (message: WSMessage) => {
        if (this.terminal && message.payload?.data) {
          this.terminal.write(message.payload.data);
        }
      });

      // Handle error messages
      this.wsManager.on('error', (message) => {
        console.error('Terminal error:', message.error);
        this.connectionStatus = 'disconnected';
      });

      await this.wsManager.connect();

      // Send terminal spec to subscribe
      const subscribeMessage: WSMessage = {
        type: 'subscribe',
        payload: {
          cols: this.terminal?.cols || 80,
          rows: this.terminal?.rows || 24,
          shell: '/bin/bash'
        }
      };
      this.wsManager.send(subscribeMessage);

      this.connectionStatus = 'connected';
    } catch (error) {
      console.error('Failed to connect to terminal:', error);
      this.connectionStatus = 'disconnected';
    }
  }

  disconnect() {
    if (this.wsManager) {
      this.wsManager.disconnect();
      this.wsManager = null;
    }
    this.connectionStatus = 'disconnected';
  }

  fit() {
    if (this.fitAddon) {
      this.fitAddon.fit();
    }
  }

  focus() {
    if (this.terminal) {
      this.terminal.focus();
    }
  }

  clear() {
    if (this.terminal) {
      this.terminal.clear();
    }
  }

  dispose() {
    this.disconnect();
    if (this.terminal) {
      this.terminal.dispose();
      this.terminal = null;
    }
    this.fitAddon = null;
    this.searchAddon = null;
    this.webLinksAddon = null;
  }
}

export class TerminalTab extends LitElement {
  @state()
  private sessions: TerminalSession[] = [];
  
  @state()
  private activeSessionId: string = '';
  
  private sessionCounter = 0;
  private resizeObserver: ResizeObserver | null = null;

  static override styles = [
    unsafeCSS(xtermStyles),
    css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      background-color: var(--vscode-bg);
      border: 1px solid var(--vscode-border);
      box-sizing: border-box;
    }

    .terminal-header {
      display: flex;
      flex-direction: column;
      background-color: var(--vscode-bg-lighter);
      border-bottom: 1px solid var(--vscode-border);
    }

    .terminal-tabs {
      display: flex;
      align-items: center;
      background-color: var(--vscode-bg);
      border-bottom: 1px solid var(--vscode-border);
      min-height: 35px;
      overflow-x: auto;
      overflow-y: hidden;
    }

    .terminal-tab {
      display: flex;
      align-items: center;
      padding: 6px 12px;
      background-color: transparent;
      border: none;
      border-right: 1px solid var(--vscode-border);
      color: var(--vscode-text-dim);
      cursor: pointer;
      font-size: 13px;
      min-width: 100px;
      max-width: 200px;
      transition: all 0.2s;
      position: relative;
    }

    .terminal-tab:hover {
      background-color: var(--vscode-bg-light);
    }

    .terminal-tab.active {
      background-color: var(--vscode-bg-lighter);
      color: var(--vscode-text);
      border-bottom: 2px solid var(--vscode-primary);
    }

    .terminal-tab-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin-right: 8px;
    }

    .terminal-tab-close {
      display: none;
      width: 16px;
      height: 16px;
      border: none;
      background: transparent;
      color: var(--vscode-text-dim);
      cursor: pointer;
      padding: 0;
      margin: 0;
      line-height: 1;
      font-size: 16px;
      border-radius: 3px;
    }

    .terminal-tab:hover .terminal-tab-close {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .terminal-tab-close:hover {
      background-color: var(--vscode-bg-light);
      color: var(--vscode-text);
    }

    .add-terminal-btn {
      padding: 6px 12px;
      background: transparent;
      border: none;
      color: var(--vscode-text-dim);
      cursor: pointer;
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 35px;
      transition: all 0.2s;
    }

    .add-terminal-btn:hover {
      background-color: var(--vscode-bg-light);
      color: var(--vscode-text);
    }

    .terminal-controls {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px;
    }

    .terminal-controls h3 {
      margin: 0;
      font-size: 14px;
      font-weight: normal;
      color: var(--vscode-text);
    }

    .terminal-actions {
      display: flex;
      gap: 8px;
    }

    .terminal-action {
      padding: 4px 8px;
      border: none;
      background-color: transparent;
      color: var(--vscode-text-dim);
      cursor: pointer;
      font-size: 12px;
      border-radius: 4px;
      transition: all 0.2s;
    }

    .terminal-action:hover {
      background-color: var(--vscode-bg-light);
      color: var(--vscode-text);
    }

    .terminal-container {
      flex: 1;
      overflow: hidden;
      padding: 8px;
      display: flex;
      flex-direction: column;
      position: relative;
    }

    .terminal-session {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: none;
      padding: 8px;
    }

    .terminal-session.active {
      display: flex;
      flex-direction: column;
    }

    /* Ensure xterm terminal fills the container */
    .terminal-wrapper {
      flex: 1;
      position: relative;
      overflow: hidden;
    }

    .status-bar {
      display: flex;
      align-items: center;
      padding: 4px 16px;
      background-color: var(--vscode-bg-lighter);
      border-top: 1px solid var(--vscode-border);
      color: var(--vscode-text);
      font-size: 12px;
    }

    .status-connected {
      background-color: var(--vscode-success);
    }

    .status-disconnected {
      background-color: var(--vscode-error);
    }

    .status-connecting {
      background-color: var(--vscode-warning);
    }

    /* Terminal container should position elements correctly */
    .terminal-container {
      position: relative;
    }

    /* Fullscreen styles */
    :host(:fullscreen),
    :host(:-webkit-full-screen),
    :host(:-moz-full-screen),
    :host(:-ms-fullscreen) {
      width: 100vw !important;
      height: 100vh !important;
      background-color: var(--vscode-bg);
      display: flex !important;
      flex-direction: column !important;
      margin: 0 !important;
      padding: 0 !important;
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      z-index: 9999 !important;
    }

    :host(:fullscreen) .terminal-header,
    :host(:-webkit-full-screen) .terminal-header,
    :host(:-moz-full-screen) .terminal-header,
    :host(:-ms-fullscreen) .terminal-header {
      background-color: rgba(37, 37, 38, 0.95);
      z-index: 10000 !important;
    }

    :host(:fullscreen) .terminal-container,
    :host(:-webkit-full-screen) .terminal-container,
    :host(:-moz-full-screen) .terminal-container,
    :host(:-ms-fullscreen) .terminal-container {
      flex: 1 !important;
      height: auto !important;
      padding: 16px;
      background-color: #1e1e1e !important;
      display: flex !important;
      flex-direction: column !important;
      opacity: 1 !important;
      visibility: visible !important;
      z-index: 10001 !important;
    }

    :host(:fullscreen) .terminal-wrapper,
    :host(:-webkit-full-screen) .terminal-wrapper,
    :host(:-moz-full-screen) .terminal-wrapper,
    :host(:-ms-fullscreen) .terminal-wrapper {
      flex: 1 !important;
      background-color: #1e1e1e !important;
      opacity: 1 !important;
      visibility: visible !important;
      position: relative !important;
      overflow: hidden !important;
      z-index: 10002 !important;
    }

    /* Force xterm to be visible in fullscreen */
    :host(:fullscreen) .terminal-wrapper .xterm,
    :host(:-webkit-full-screen) .terminal-wrapper .xterm,
    :host(:-moz-full-screen) .terminal-wrapper .xterm,
    :host(:-ms-fullscreen) .terminal-wrapper .xterm {
      opacity: 1 !important;
      visibility: visible !important;
      display: block !important;
      width: 100% !important;
      height: 100% !important;
      z-index: 10003 !important;
    }

    :host(:fullscreen) .status-bar,
    :host(:-webkit-full-screen) .status-bar,
    :host(:-moz-full-screen) .status-bar,
    :host(:-ms-fullscreen) .status-bar {
      z-index: 10004 !important;
    }
  `
  ];

  override connectedCallback() {
    super.connectedCallback();
    // Initialize first terminal session after component is connected
    this.updateComplete.then(() => {
      this.createNewSession();
    });
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.cleanup();
  }

  override firstUpdated() {
    // Set up window resize listener
    window.addEventListener('resize', this.handleWindowResize);
    
    // Handle fullscreen changes
    document.addEventListener('fullscreenchange', this.handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', this.handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', this.handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', this.handleFullscreenChange);
  }

  override updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
    
    // When active session changes, focus the terminal
    if (changedProperties.has('activeSessionId')) {
      const activeSession = this.sessions.find(s => s.id === this.activeSessionId);
      if (activeSession) {
        setTimeout(() => {
          activeSession.focus();
          activeSession.fit();
        }, 50);
      }
    }
  }

  private async createNewSession() {
    this.sessionCounter++;
    const sessionId = `session-${this.sessionCounter}`;
    const sessionName = `Terminal ${this.sessionCounter}`;
    
    const session = new TerminalSession(sessionId, sessionName);
    this.sessions = [...this.sessions, session];
    this.activeSessionId = sessionId;
    
    // Wait for the DOM to update
    await this.updateComplete;
    
    // Initialize the terminal session
    const wrapper = this.shadowRoot?.querySelector(`#${sessionId} .terminal-wrapper`) as HTMLElement;
    if (wrapper) {
      await session.initialize(wrapper, () => {
        // Callback for terminal data (could be used for activity tracking)
      });
      
      // Set up resize observer for this session
      this.setupResizeObserver(wrapper, session);
      
      // Connect the session
      await session.connect();
      
      // Hide helper elements
      this.hideCharMeasureElement(wrapper);
      
      // Set up scrolling shortcuts for this session
      this.setupScrollingShortcuts(wrapper, session);
    }
    
    this.requestUpdate();
  }

  private closeSession(sessionId: string) {
    // Don't allow closing the first/only session
    if (this.sessions.length <= 1) return;
    
    const sessionIndex = this.sessions.findIndex(s => s.id === sessionId);
    if (sessionIndex === -1) return;
    
    const session = this.sessions[sessionIndex];
    session.dispose();
    
    // Remove from sessions array
    this.sessions = this.sessions.filter(s => s.id !== sessionId);
    
    // If this was the active session, switch to another
    if (this.activeSessionId === sessionId) {
      // Switch to the previous tab, or the next if this was the first
      const newIndex = sessionIndex > 0 ? sessionIndex - 1 : 0;
      this.activeSessionId = this.sessions[newIndex].id;
    }
    
    this.requestUpdate();
  }

  private switchToSession(sessionId: string) {
    this.activeSessionId = sessionId;
    this.requestUpdate();
  }

  private handleWindowResize = () => {
    // Resize the active session
    const activeSession = this.sessions.find(s => s.id === this.activeSessionId);
    if (activeSession) {
      activeSession.fit();
    }
  };
  
  private handleFullscreenChange = () => {
    const isFullscreen = !!(document.fullscreenElement || 
                           (document as any).webkitFullscreenElement ||
                           (document as any).mozFullScreenElement ||
                           (document as any).msFullscreenElement);
    
    console.log('Fullscreen change detected:', isFullscreen);
    
    // Force re-render when fullscreen changes
    this.requestUpdate();
    
    // Give the DOM time to update
    this.updateComplete.then(() => {
      // Wait for browser to complete fullscreen transition
      setTimeout(() => {
        const activeSession = this.sessions.find(s => s.id === this.activeSessionId);
        if (!activeSession || !activeSession.terminal) return;
        
        const wrapper = this.shadowRoot?.querySelector(`#${this.activeSessionId} .terminal-wrapper`) as HTMLElement;
        if (!wrapper) return;
        
        if (isFullscreen) {
          // Force wrapper styles
          wrapper.style.width = '100%';
          wrapper.style.height = '100%';
          wrapper.style.display = 'block';
          wrapper.style.backgroundColor = '#1e1e1e';
        }
        
        // Fit the terminal to the new size
        activeSession.fit();
        activeSession.focus();
        
        // Force refresh
        if (activeSession.terminal) {
          activeSession.terminal.refresh(0, activeSession.terminal.rows - 1);
        }
      }, 500);
    });
  };

  private setupResizeObserver(element: HTMLElement, session: TerminalSession) {
    const observer = new ResizeObserver(() => {
      if (session.fitAddon && session.terminal) {
        // Use requestAnimationFrame to debounce resize events
        requestAnimationFrame(() => {
          session.fit();
        });
      }
    });
    
    observer.observe(element);
  }

  private setupScrollingShortcuts(element: HTMLElement, session: TerminalSession) {
    if (!session.terminal) return;

    element.addEventListener('keydown', (event) => {
      if (!session.terminal) return;
      const keyboardEvent = event as KeyboardEvent;

      // Page Up - scroll up one page
      if (keyboardEvent.key === 'PageUp') {
        keyboardEvent.preventDefault();
        session.terminal.scrollPages(-1);
      }
      // Page Down - scroll down one page
      else if (keyboardEvent.key === 'PageDown') {
        keyboardEvent.preventDefault();
        session.terminal.scrollPages(1);
      }
      // Ctrl+Home - scroll to top
      else if (keyboardEvent.ctrlKey && keyboardEvent.key === 'Home') {
        keyboardEvent.preventDefault();
        session.terminal.scrollToTop();
      }
      // Ctrl+End - scroll to bottom
      else if (keyboardEvent.ctrlKey && keyboardEvent.key === 'End') {
        keyboardEvent.preventDefault();
        session.terminal.scrollToBottom();
      }
      // Shift+PageUp - scroll up half page
      else if (keyboardEvent.shiftKey && keyboardEvent.key === 'PageUp') {
        keyboardEvent.preventDefault();
        const pageSize = session.terminal.rows;
        session.terminal.scrollLines(-Math.floor(pageSize / 2));
      }
      // Shift+PageDown - scroll down half page
      else if (keyboardEvent.shiftKey && keyboardEvent.key === 'PageDown') {
        keyboardEvent.preventDefault();
        const pageSize = session.terminal.rows;
        session.terminal.scrollLines(Math.floor(pageSize / 2));
      }
    });

    // Also handle mouse wheel scrolling (xterm handles this by default, but we can customize)
    session.terminal.onScroll((_position) => {
      // You can add custom scroll handling here if needed
      // For example, showing a scroll indicator
    });
  }

  private hideCharMeasureElement(wrapper: HTMLElement) {
    // Add styles to hide xterm helper elements
    if (wrapper) {
      // Use setTimeout to ensure elements are created
      setTimeout(() => {
        // Find and hide the char measure element
        const charMeasureElement = wrapper.querySelector('.xterm-char-measure-element') as HTMLElement;
        if (charMeasureElement) {
          charMeasureElement.style.position = 'absolute';
          charMeasureElement.style.top = '0';
          charMeasureElement.style.left = '0';
          charMeasureElement.style.visibility = 'hidden';
        }
        
        // Find and hide the helper textarea
        const helperTextarea = wrapper.querySelector('.xterm-helper-textarea') as HTMLElement;
        if (helperTextarea) {
          helperTextarea.style.position = 'absolute';
          helperTextarea.style.left = '-9999px';
          helperTextarea.style.top = '0';
          helperTextarea.style.width = '0';
          helperTextarea.style.height = '0';
          helperTextarea.style.opacity = '0';
        }
      }, 100);
      
      // Inject a style tag to ensure both elements stay hidden and fix scroll area
      const styleElement = document.createElement('style');
      styleElement.textContent = `
        .xterm-char-measure-element {
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          visibility: hidden !important;
        }
        
        .xterm-helper-textarea {
          position: absolute !important;
          left: -9999px !important;
          top: 0 !important;
          width: 0 !important;
          height: 0 !important;
          z-index: -10 !important;
          opacity: 0 !important;
          overflow: hidden !important;
          resize: none !important;
          pointer-events: none !important;
        }
        
        /* Fix xterm terminal height and scrolling */
        .xterm {
          height: 100%;
          width: 100%;
        }
        
        .xterm-viewport {
          height: 100% !important;
          width: 100% !important;
          overflow-y: scroll !important;
        }
        
        .xterm-scroll-area {
          height: auto !important;
          min-height: 100% !important;
        }
        
        .xterm-screen {
          position: relative;
          height: 100%;
        }
        
        /* Ensure terminal is visible in fullscreen */
        :host(:fullscreen) .xterm,
        :host(:-webkit-full-screen) .xterm,
        :host(:-moz-full-screen) .xterm,
        :host(:-ms-fullscreen) .xterm {
          z-index: 1000;
          opacity: 1 !important;
          visibility: visible !important;
        }
        
        :host(:fullscreen) .terminal-wrapper,
        :host(:-webkit-full-screen) .terminal-wrapper,
        :host(:-moz-full-screen) .terminal-wrapper,
        :host(:-ms-fullscreen) .terminal-wrapper {
          z-index: 999;
          opacity: 1 !important;
          visibility: visible !important;
          background-color: #1e1e1e;
        }
      `;
      wrapper.appendChild(styleElement);
    }
  }

  private clearTerminal() {
    const activeSession = this.sessions.find(s => s.id === this.activeSessionId);
    if (activeSession) {
      activeSession.clear();
    }
  }

  private scrollToTop() {
    const activeSession = this.sessions.find(s => s.id === this.activeSessionId);
    if (activeSession && activeSession.terminal) {
      activeSession.terminal.scrollToTop();
    }
  }

  private scrollToBottom() {
    const activeSession = this.sessions.find(s => s.id === this.activeSessionId);
    if (activeSession && activeSession.terminal) {
      activeSession.terminal.scrollToBottom();
    }
  }

  private async copySelection() {
    const activeSession = this.sessions.find(s => s.id === this.activeSessionId);
    if (activeSession && activeSession.terminal && activeSession.terminal.hasSelection()) {
      const selection = activeSession.terminal.getSelection();
      try {
        await navigator.clipboard.writeText(selection);
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
      }
    }
  }

  private async pasteFromClipboard() {
    const activeSession = this.sessions.find(s => s.id === this.activeSessionId);
    if (!activeSession || !activeSession.wsManager || activeSession.connectionStatus !== 'connected') return;
    
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const message: WSTerminalInputMessage = {
          type: 'input',
          data: text
        };
        activeSession.wsManager.send(message);
      }
    } catch (error) {
      console.error('Failed to paste from clipboard:', error);
    }
  }

  private toggleFullscreen() {
    if (!document.fullscreenElement) {
      // Request fullscreen on the host element (the custom element itself)
      const hostElement = this as unknown as HTMLElement;
      
      // Try different fullscreen methods for cross-browser compatibility
      const requestFullscreen = hostElement.requestFullscreen || 
                              (hostElement as any).webkitRequestFullscreen || 
                              (hostElement as any).mozRequestFullScreen || 
                              (hostElement as any).msRequestFullscreen;
      
      if (requestFullscreen) {
        requestFullscreen.call(hostElement).then(() => {
          // Force update to ensure render
          this.requestUpdate();
          
          // Give the browser time to complete the fullscreen transition
          setTimeout(() => {
            const activeSession = this.sessions.find(s => s.id === this.activeSessionId);
            if (activeSession) {
              activeSession.fit();
              activeSession.focus();
            }
          }, 300);
        }).catch((err) => {
          console.error('Failed to enter fullscreen:', err);
        });
      }
    } else {
      document.exitFullscreen().then(() => {
        this.requestUpdate();
        setTimeout(() => {
          const activeSession = this.sessions.find(s => s.id === this.activeSessionId);
          if (activeSession) {
            activeSession.fit();
            activeSession.focus();
          }
        }, 300);
      }).catch((err) => {
        console.error('Failed to exit fullscreen:', err);
      });
    }
  }

  private cleanup() {
    window.removeEventListener('resize', this.handleWindowResize);
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', this.handleFullscreenChange);
    document.removeEventListener('mozfullscreenchange', this.handleFullscreenChange);
    document.removeEventListener('MSFullscreenChange', this.handleFullscreenChange);
    
    // Dispose all sessions
    for (const session of this.sessions) {
      session.dispose();
    }
    this.sessions = [];
  }

  override render() {
    const activeSession = this.sessions.find(s => s.id === this.activeSessionId);
    let statusClass = 'status-bar';
    let statusText = '';

    if (activeSession) {
      switch (activeSession.connectionStatus) {
        case 'connecting':
          statusClass += ' status-connecting';
          statusText = t('terminal.connecting');
          break;
        case 'connected':
          statusClass += ' status-connected';
          statusText = t('terminal.connected');
          break;
        case 'disconnected':
          statusClass += ' status-disconnected';
          statusText = t('terminal.disconnected');
          break;
      }
    }

    return html`
      <div class="terminal-header">
        <div class="terminal-tabs">
          ${this.sessions.map(session => html`
            <button 
              class="terminal-tab ${session.id === this.activeSessionId ? 'active' : ''}"
              @click=${() => this.switchToSession(session.id)}
            >
              <span class="terminal-tab-name">${session.name}</span>
              ${this.sessions.length > 1 ? html`
                <button 
                  class="terminal-tab-close" 
                  @click=${(e: Event) => {
                    e.stopPropagation();
                    this.closeSession(session.id);
                  }}
                  title="${t('terminal.closeTab')}"
                >
                  ×
                </button>
              ` : ''}
            </button>
          `)}
          <button 
            class="add-terminal-btn" 
            @click=${() => this.createNewSession()}
            title="${t('terminal.newTab')}"
          >
            +
          </button>
        </div>
        <div class="terminal-controls">
          <h3>${t('terminal.title')}</h3>
          <div class="terminal-actions">
            <button class="terminal-action" @click=${this.clearTerminal} title="${t('terminal.clear')}">
              ${t('terminal.clear')}
            </button>
            <button class="terminal-action" @click=${this.copySelection} title="${t('terminal.copy')}">
              ${t('terminal.copy')}
            </button>
            <button class="terminal-action" @click=${this.pasteFromClipboard} title="${t('terminal.paste')}">
              ${t('terminal.paste')}
            </button>
            <button class="terminal-action" @click=${this.toggleFullscreen} title="${t('terminal.fullscreen')}">
              ${t('terminal.fullscreen')}
            </button>
            <button class="terminal-action" @click=${this.scrollToTop} title="Scroll to Top">
              ↑ Top
            </button>
            <button class="terminal-action" @click=${this.scrollToBottom} title="Scroll to Bottom">
              ↓ Bottom
            </button>
          </div>
        </div>
      </div>
      <div class="terminal-container">
        ${this.sessions.map(session => html`
          <div 
            id="${session.id}" 
            class="terminal-session ${session.id === this.activeSessionId ? 'active' : ''}"
          >
            <div class="terminal-wrapper"></div>
          </div>
        `)}
      </div>
      <div class="${statusClass}">${statusText}</div>
    `;
  }
}

customElements.define('terminal-tab', TerminalTab);
