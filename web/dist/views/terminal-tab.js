var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html, css, unsafeCSS } from 'lit';
import { state } from 'lit/decorators.js';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { SearchAddon } from 'xterm-addon-search';
import xtermStyles from 'xterm/css/xterm.css?inline';
import { WebSocketManager } from '../api';
import { t } from '../i18n';
class TerminalSession {
    constructor(id, name) {
        this.terminal = null;
        this.fitAddon = null;
        this.searchAddon = null;
        this.webLinksAddon = null;
        this.wsManager = null;
        this.connectionStatus = 'disconnected';
        this.element = null;
        this.id = id;
        this.name = name;
    }
    async initialize(container, onDataCallback) {
        this.element = container;
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
        this.fitAddon = new FitAddon();
        this.searchAddon = new SearchAddon();
        this.webLinksAddon = new WebLinksAddon();
        this.terminal.loadAddon(this.fitAddon);
        this.terminal.loadAddon(this.searchAddon);
        this.terminal.loadAddon(this.webLinksAddon);
        this.terminal.open(container);
        setTimeout(() => {
            this.fitAddon?.fit();
        }, 100);
        this.terminal.onData((data) => {
            if (this.wsManager && this.connectionStatus === 'connected') {
                const message = {
                    type: 'input',
                    data: data
                };
                this.wsManager.send(message);
            }
            onDataCallback(data);
        });
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
            this.wsManager.on('output', (message) => {
                if (this.terminal && message.payload?.data) {
                    this.terminal.write(message.payload.data);
                }
            });
            this.wsManager.on('error', (message) => {
                console.error('Terminal error:', message.error);
                this.connectionStatus = 'disconnected';
            });
            await this.wsManager.connect();
            const subscribeMessage = {
                type: 'subscribe',
                payload: {
                    cols: this.terminal?.cols || 80,
                    rows: this.terminal?.rows || 24,
                    shell: '/bin/bash'
                }
            };
            this.wsManager.send(subscribeMessage);
            this.connectionStatus = 'connected';
        }
        catch (error) {
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
    constructor() {
        super(...arguments);
        this.sessions = [];
        this.activeSessionId = '';
        this.sessionCounter = 0;
        this.resizeObserver = null;
        this.handleWindowResize = () => {
            const activeSession = this.sessions.find(s => s.id === this.activeSessionId);
            if (activeSession) {
                activeSession.fit();
            }
        };
        this.handleFullscreenChange = () => {
            const isFullscreen = !!(document.fullscreenElement ||
                document.webkitFullscreenElement ||
                document.mozFullScreenElement ||
                document.msFullscreenElement);
            console.log('Fullscreen change detected:', isFullscreen);
            this.requestUpdate();
            this.updateComplete.then(() => {
                setTimeout(() => {
                    const activeSession = this.sessions.find(s => s.id === this.activeSessionId);
                    if (!activeSession || !activeSession.terminal)
                        return;
                    const wrapper = this.shadowRoot?.querySelector(`#${this.activeSessionId} .terminal-wrapper`);
                    if (!wrapper)
                        return;
                    if (isFullscreen) {
                        wrapper.style.width = '100%';
                        wrapper.style.height = '100%';
                        wrapper.style.display = 'block';
                        wrapper.style.backgroundColor = '#1e1e1e';
                    }
                    activeSession.fit();
                    activeSession.focus();
                    if (activeSession.terminal) {
                        activeSession.terminal.refresh(0, activeSession.terminal.rows - 1);
                    }
                }, 500);
            });
        };
    }
    connectedCallback() {
        super.connectedCallback();
        this.updateComplete.then(() => {
            this.createNewSession();
        });
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        this.cleanup();
    }
    firstUpdated() {
        window.addEventListener('resize', this.handleWindowResize);
        document.addEventListener('fullscreenchange', this.handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', this.handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', this.handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', this.handleFullscreenChange);
    }
    updated(changedProperties) {
        super.updated(changedProperties);
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
    async createNewSession() {
        this.sessionCounter++;
        const sessionId = `session-${this.sessionCounter}`;
        const sessionName = `Terminal ${this.sessionCounter}`;
        const session = new TerminalSession(sessionId, sessionName);
        this.sessions = [...this.sessions, session];
        this.activeSessionId = sessionId;
        await this.updateComplete;
        const wrapper = this.shadowRoot?.querySelector(`#${sessionId} .terminal-wrapper`);
        if (wrapper) {
            await session.initialize(wrapper, () => {
            });
            this.setupResizeObserver(wrapper, session);
            await session.connect();
            this.hideCharMeasureElement(wrapper);
            this.setupScrollingShortcuts(wrapper, session);
        }
        this.requestUpdate();
    }
    closeSession(sessionId) {
        if (this.sessions.length <= 1)
            return;
        const sessionIndex = this.sessions.findIndex(s => s.id === sessionId);
        if (sessionIndex === -1)
            return;
        const session = this.sessions[sessionIndex];
        session.dispose();
        this.sessions = this.sessions.filter(s => s.id !== sessionId);
        if (this.activeSessionId === sessionId) {
            const newIndex = sessionIndex > 0 ? sessionIndex - 1 : 0;
            this.activeSessionId = this.sessions[newIndex].id;
        }
        this.requestUpdate();
    }
    switchToSession(sessionId) {
        this.activeSessionId = sessionId;
        this.requestUpdate();
    }
    setupResizeObserver(element, session) {
        const observer = new ResizeObserver(() => {
            if (session.fitAddon && session.terminal) {
                requestAnimationFrame(() => {
                    session.fit();
                });
            }
        });
        observer.observe(element);
    }
    setupScrollingShortcuts(element, session) {
        if (!session.terminal)
            return;
        element.addEventListener('keydown', (event) => {
            if (!session.terminal)
                return;
            const keyboardEvent = event;
            if (keyboardEvent.key === 'PageUp') {
                keyboardEvent.preventDefault();
                session.terminal.scrollPages(-1);
            }
            else if (keyboardEvent.key === 'PageDown') {
                keyboardEvent.preventDefault();
                session.terminal.scrollPages(1);
            }
            else if (keyboardEvent.ctrlKey && keyboardEvent.key === 'Home') {
                keyboardEvent.preventDefault();
                session.terminal.scrollToTop();
            }
            else if (keyboardEvent.ctrlKey && keyboardEvent.key === 'End') {
                keyboardEvent.preventDefault();
                session.terminal.scrollToBottom();
            }
            else if (keyboardEvent.shiftKey && keyboardEvent.key === 'PageUp') {
                keyboardEvent.preventDefault();
                const pageSize = session.terminal.rows;
                session.terminal.scrollLines(-Math.floor(pageSize / 2));
            }
            else if (keyboardEvent.shiftKey && keyboardEvent.key === 'PageDown') {
                keyboardEvent.preventDefault();
                const pageSize = session.terminal.rows;
                session.terminal.scrollLines(Math.floor(pageSize / 2));
            }
        });
        session.terminal.onScroll((_position) => {
        });
    }
    hideCharMeasureElement(wrapper) {
        if (wrapper) {
            setTimeout(() => {
                const charMeasureElement = wrapper.querySelector('.xterm-char-measure-element');
                if (charMeasureElement) {
                    charMeasureElement.style.position = 'absolute';
                    charMeasureElement.style.top = '0';
                    charMeasureElement.style.left = '0';
                    charMeasureElement.style.visibility = 'hidden';
                }
                const helperTextarea = wrapper.querySelector('.xterm-helper-textarea');
                if (helperTextarea) {
                    helperTextarea.style.position = 'absolute';
                    helperTextarea.style.left = '-9999px';
                    helperTextarea.style.top = '0';
                    helperTextarea.style.width = '0';
                    helperTextarea.style.height = '0';
                    helperTextarea.style.opacity = '0';
                }
            }, 100);
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
    clearTerminal() {
        const activeSession = this.sessions.find(s => s.id === this.activeSessionId);
        if (activeSession) {
            activeSession.clear();
        }
    }
    scrollToTop() {
        const activeSession = this.sessions.find(s => s.id === this.activeSessionId);
        if (activeSession && activeSession.terminal) {
            activeSession.terminal.scrollToTop();
        }
    }
    scrollToBottom() {
        const activeSession = this.sessions.find(s => s.id === this.activeSessionId);
        if (activeSession && activeSession.terminal) {
            activeSession.terminal.scrollToBottom();
        }
    }
    async copySelection() {
        const activeSession = this.sessions.find(s => s.id === this.activeSessionId);
        if (activeSession && activeSession.terminal && activeSession.terminal.hasSelection()) {
            const selection = activeSession.terminal.getSelection();
            try {
                await navigator.clipboard.writeText(selection);
            }
            catch (error) {
                console.error('Failed to copy to clipboard:', error);
            }
        }
    }
    async pasteFromClipboard() {
        const activeSession = this.sessions.find(s => s.id === this.activeSessionId);
        if (!activeSession || !activeSession.wsManager || activeSession.connectionStatus !== 'connected')
            return;
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                const message = {
                    type: 'input',
                    data: text
                };
                activeSession.wsManager.send(message);
            }
        }
        catch (error) {
            console.error('Failed to paste from clipboard:', error);
        }
    }
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            const hostElement = this;
            const requestFullscreen = hostElement.requestFullscreen ||
                hostElement.webkitRequestFullscreen ||
                hostElement.mozRequestFullScreen ||
                hostElement.msRequestFullscreen;
            if (requestFullscreen) {
                requestFullscreen.call(hostElement).then(() => {
                    this.requestUpdate();
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
        }
        else {
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
    cleanup() {
        window.removeEventListener('resize', this.handleWindowResize);
        document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
        document.removeEventListener('webkitfullscreenchange', this.handleFullscreenChange);
        document.removeEventListener('mozfullscreenchange', this.handleFullscreenChange);
        document.removeEventListener('MSFullscreenChange', this.handleFullscreenChange);
        for (const session of this.sessions) {
            session.dispose();
        }
        this.sessions = [];
    }
    render() {
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
        return html `
      <div class="terminal-header">
        <div class="terminal-tabs">
          ${this.sessions.map(session => html `
            <button 
              class="terminal-tab ${session.id === this.activeSessionId ? 'active' : ''}"
              @click=${() => this.switchToSession(session.id)}
            >
              <span class="terminal-tab-name">${session.name}</span>
              ${this.sessions.length > 1 ? html `
                <button 
                  class="terminal-tab-close" 
                  @click=${(e) => {
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
        ${this.sessions.map(session => html `
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
TerminalTab.styles = [
    unsafeCSS(xtermStyles),
    css `
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
__decorate([
    state()
], TerminalTab.prototype, "sessions", void 0);
__decorate([
    state()
], TerminalTab.prototype, "activeSessionId", void 0);
customElements.define('terminal-tab', TerminalTab);
//# sourceMappingURL=terminal-tab.js.map