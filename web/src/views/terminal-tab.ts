import { LitElement, html, css } from 'lit';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { SearchAddon } from 'xterm-addon-search';
import 'xterm/css/xterm.css';
import { WebSocketManager } from '../api';
import { t } from '../i18n';
import type { WSTerminalInputMessage, WSTerminalResizeMessage, WSTerminalOutputMessage, WSMessage } from '../types/api';

export class TerminalTab extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      background-color: var(--vscode-bg);
    }

    .terminal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px;
      background-color: var(--vscode-bg-lighter);
      border-bottom: 1px solid var(--vscode-border);
    }

    .terminal-header h3 {
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
      background-color: var(--vscode-statusbar);
      color: white;
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
  `;

  private terminal: Terminal | null = null;
  private fitAddon: FitAddon | null = null;
  private searchAddon: SearchAddon | null = null;
  private webLinksAddon: WebLinksAddon | null = null;
  private wsManager: WebSocketManager | null = null;
  private terminalConnected = false;
  private connectionStatus: 'connecting' | 'connected' | 'disconnected' = 'disconnected';
  private resizeObserver: ResizeObserver | null = null;

  connectedCallback() {
    super.connectedCallback();
    // Initialize terminal after component is connected
    this.updateComplete.then(() => {
      this.initializeTerminal();
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.cleanup();
  }

  private initializeTerminal() {
    const wrapper = this.shadowRoot?.querySelector('.terminal-wrapper') as HTMLElement;
    if (!wrapper) return;

    // Create terminal instance
    this.terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Consolas, "Courier New", monospace',
      scrollback: 10000,  // Allow 10000 lines of scrollback
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

    // Open terminal in wrapper
    this.terminal.open(wrapper);
    
    // Set up resize observer
    this.setupResizeObserver(wrapper);
    
    // Initial fit
    setTimeout(() => {
      this.fitAddon.fit();
    }, 100);

    // Hide the char measure element
    this.hideCharMeasureElement();

    // Handle terminal input
    this.terminal.onData((data) => {
      if (this.wsManager && this.terminalConnected) {
        const message: WSTerminalInputMessage = {
          type: 'input',
          data: data
        };
        this.wsManager.send(message);
      }
    });

    // Add keyboard shortcuts for scrolling
    this.setupScrollingShortcuts();

    // Handle resize
    this.terminal.onResize((size) => {
      if (this.wsManager && this.terminalConnected) {
        const message: WSTerminalResizeMessage = {
          type: 'resize',
          cols: size.cols,
          rows: size.rows
        };
        this.wsManager.send(message);
      }
    });

    // Handle window resize
    window.addEventListener('resize', this.handleWindowResize);

    // Connect to WebSocket
    this.connect();
  }

  private handleWindowResize = () => {
    if (this.fitAddon) {
      this.fitAddon.fit();
    }
  };

  private setupResizeObserver(element: HTMLElement) {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    
    this.resizeObserver = new ResizeObserver(() => {
      if (this.fitAddon && this.terminal) {
        // Use requestAnimationFrame to debounce resize events
        requestAnimationFrame(() => {
          this.fitAddon?.fit();
        });
      }
    });
    
    this.resizeObserver.observe(element);
  }

  private setupScrollingShortcuts() {
    if (!this.terminal) return;

    // Add keyboard event listener to the terminal element
    const terminalElement = this.shadowRoot?.querySelector('.terminal-wrapper');
    if (terminalElement) {
      terminalElement.addEventListener('keydown', (event: KeyboardEvent) => {
        if (!this.terminal) return;

        // Page Up - scroll up one page
        if (event.key === 'PageUp') {
          event.preventDefault();
          this.terminal.scrollPages(-1);
        }
        // Page Down - scroll down one page
        else if (event.key === 'PageDown') {
          event.preventDefault();
          this.terminal.scrollPages(1);
        }
        // Ctrl+Home - scroll to top
        else if (event.ctrlKey && event.key === 'Home') {
          event.preventDefault();
          this.terminal.scrollToTop();
        }
        // Ctrl+End - scroll to bottom
        else if (event.ctrlKey && event.key === 'End') {
          event.preventDefault();
          this.terminal.scrollToBottom();
        }
        // Shift+PageUp - scroll up half page
        else if (event.shiftKey && event.key === 'PageUp') {
          event.preventDefault();
          const pageSize = this.terminal.rows;
          this.terminal.scrollLines(-Math.floor(pageSize / 2));
        }
        // Shift+PageDown - scroll down half page
        else if (event.shiftKey && event.key === 'PageDown') {
          event.preventDefault();
          const pageSize = this.terminal.rows;
          this.terminal.scrollLines(Math.floor(pageSize / 2));
        }
      });
    }

    // Also handle mouse wheel scrolling (xterm handles this by default, but we can customize)
    this.terminal.onScroll((position) => {
      // You can add custom scroll handling here if needed
      // For example, showing a scroll indicator
    });
  }

  private hideCharMeasureElement() {
    // Add styles to hide xterm helper elements
    const container = this.shadowRoot?.querySelector('.terminal-container') as HTMLElement;
    if (container) {
      // Use setTimeout to ensure elements are created
      setTimeout(() => {
        // Find and hide the char measure element
        const charMeasureElement = container.querySelector('.xterm-char-measure-element') as HTMLElement;
        if (charMeasureElement) {
          charMeasureElement.style.position = 'absolute';
          charMeasureElement.style.top = '0';
          charMeasureElement.style.left = '0';
          charMeasureElement.style.visibility = 'hidden';
        }
        
        // Find and hide the helper textarea
        const helperTextarea = container.querySelector('.xterm-helper-textarea') as HTMLElement;
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
      `;
      container.appendChild(styleElement);
    }
  }

  private async connect() {
    if (this.wsManager) {
      this.wsManager.disconnect();
    }

    this.connectionStatus = 'connecting';
    this.requestUpdate();

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
        this.terminalConnected = false;
        this.connectionStatus = 'disconnected';
        this.requestUpdate();
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

      this.terminalConnected = true;
      this.connectionStatus = 'connected';
      this.requestUpdate();
    } catch (error) {
      console.error('Failed to connect to terminal:', error);
      this.connectionStatus = 'disconnected';
      this.requestUpdate();
    }
  }

  private disconnect() {
    if (this.wsManager) {
      this.wsManager.disconnect();
      this.wsManager = null;
    }
    this.terminalConnected = false;
    this.connectionStatus = 'disconnected';
    this.requestUpdate();
  }

  private clearTerminal() {
    if (this.terminal) {
      this.terminal.clear();
    }
  }

  private scrollToTop() {
    if (this.terminal) {
      this.terminal.scrollToTop();
    }
  }

  private scrollToBottom() {
    if (this.terminal) {
      this.terminal.scrollToBottom();
    }
  }

  private async copySelection() {
    if (this.terminal && this.terminal.hasSelection()) {
      const selection = this.terminal.getSelection();
      try {
        await navigator.clipboard.writeText(selection);
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
      }
    }
  }

  private async pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (text && this.wsManager && this.terminalConnected) {
        const message: WSTerminalInputMessage = {
          type: 'input',
          data: text
        };
        this.wsManager.send(message);
      }
    } catch (error) {
      console.error('Failed to paste from clipboard:', error);
    }
  }

  private toggleFullscreen() {
    if (!document.fullscreenElement) {
      this.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  private cleanup() {
    window.removeEventListener('resize', this.handleWindowResize);
    
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    
    if (this.wsManager) {
      this.wsManager.disconnect();
      this.wsManager = null;
    }

    if (this.terminal) {
      this.terminal.dispose();
      this.terminal = null;
    }

    this.fitAddon = null;
    this.searchAddon = null;
    this.webLinksAddon = null;
  }

  render() {
    let statusClass = 'status-bar';
    let statusText = '';

    switch (this.connectionStatus) {
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

    return html`
      <div class="terminal-header">
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
          ${this.connectionStatus === 'disconnected' 
            ? html`<button class="terminal-action" @click=${this.connect}>Connect</button>`
            : this.connectionStatus === 'connected'
            ? html`<button class="terminal-action" @click=${this.disconnect}>Disconnect</button>`
            : ''}
        </div>
      </div>
      <div class="terminal-container">
        <div class="terminal-wrapper"></div>
      </div>
      <div class="${statusClass}">${statusText}</div>
    `;
  }
}

customElements.define('terminal-tab', TerminalTab);
