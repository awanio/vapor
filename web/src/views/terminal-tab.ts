import { LitElement, html, css } from 'lit';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { SearchAddon } from 'xterm-addon-search';
import { WebSocketManager } from '../api';
import { t } from '../i18n';
import type { WSTerminalStartMessage, WSTerminalInputMessage, WSTerminalResizeMessage, WSTerminalOutputMessage } from '../types/api';

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
  `;

  private terminal: Terminal | null = null;
  private fitAddon: FitAddon | null = null;
  private searchAddon: SearchAddon | null = null;
  private webLinksAddon: WebLinksAddon | null = null;
  private wsManager: WebSocketManager | null = null;
  private isConnected = false;
  private connectionStatus: 'connecting' | 'connected' | 'disconnected' = 'disconnected';

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
    const container = this.shadowRoot?.querySelector('.terminal-container') as HTMLElement;
    if (!container) return;

    // Create terminal instance
    this.terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Consolas, "Courier New", monospace',
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
    this.fitAddon.fit();

    // Handle terminal input
    this.terminal.onData((data) => {
      if (this.wsManager && this.isConnected) {
        const message: WSTerminalInputMessage = {
          type: 'input',
          data: data
        };
        this.wsManager.send(message);
      }
    });

    // Handle resize
    this.terminal.onResize((size) => {
      if (this.wsManager && this.isConnected) {
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

  private async connect() {
    if (this.wsManager) {
      this.wsManager.disconnect();
    }

    this.connectionStatus = 'connecting';
    this.requestUpdate();

    try {
      this.wsManager = new WebSocketManager('/api/v1/ws/terminal');
      
      // Handle output messages
      this.wsManager.on('output', (message: WSTerminalOutputMessage) => {
        if (this.terminal) {
          this.terminal.write(message.data);
        }
      });

      // Handle error messages
      this.wsManager.on('error', (message) => {
        console.error('Terminal error:', message.error);
        this.isConnected = false;
        this.connectionStatus = 'disconnected';
        this.requestUpdate();
      });

      await this.wsManager.connect();

      // Start terminal session
      const startMessage: WSTerminalStartMessage = {
        type: 'start',
        cols: this.terminal?.cols || 80,
        rows: this.terminal?.rows || 24,
        shell: '/bin/bash'
      };
      this.wsManager.send(startMessage);

      this.isConnected = true;
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
    this.isConnected = false;
    this.connectionStatus = 'disconnected';
    this.requestUpdate();
  }

  private clearTerminal() {
    if (this.terminal) {
      this.terminal.clear();
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
      if (text && this.wsManager && this.isConnected) {
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
          ${this.connectionStatus === 'disconnected' 
            ? html`<button class="terminal-action" @click=${this.connect}>Connect</button>`
            : this.connectionStatus === 'connected'
            ? html`<button class="terminal-action" @click=${this.disconnect}>Disconnect</button>`
            : ''}
        </div>
      </div>
      <div class="terminal-container"></div>
      <div class="${statusClass}">${statusText}</div>
    `;
  }
}

customElements.define('terminal-tab', TerminalTab);
