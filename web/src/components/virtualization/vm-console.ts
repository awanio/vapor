/**
 * VM Console Component
 * Provides terminal interface to virtual machines via WebSocket connection
 */

import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
// @ts-ignore - xterm types
import { Terminal } from 'xterm';
// @ts-ignore - xterm addon types
import { FitAddon } from 'xterm-addon-fit';
// @ts-ignore - xterm addon types
import { WebLinksAddon } from 'xterm-addon-web-links';
// @ts-ignore - xterm addon types
import { AttachAddon } from 'xterm-addon-attach';
import 'xterm/css/xterm.css';
import { auth } from '../../auth';
import { getApiUrl } from '../../config';

// Console configuration interface (kept for potential future use)
// interface ConsoleConfig {
//   vmId: string;
//   vmName: string;
//   onClose?: () => void;
//   onError?: (error: string) => void;
// }

interface ConsoleTokenResponse {
  type: string;
  host: string;
  port: number;
  token: string;
  ws_path?: string;
}

@customElement('vm-console')
export class VMConsole extends LitElement {
  @property({ type: String }) vmId = '';
  @property({ type: String }) vmName = '';
  @property({ type: Boolean, reflect: true }) show = false;
  
  @state() private isConnecting = true;
  @state() private isWSConnected = false;  // Renamed to avoid conflict with LitElement's isConnected
  @state() private error: string | null = null;
  @state() private connectionStatus = 'Connecting...';
  
  private terminal: Terminal | null = null;
  private fitAddon: FitAddon | null = null;
  private webLinksAddon: WebLinksAddon | null = null;
  private attachAddon: AttachAddon | null = null;
  private ws: WebSocket | null = null;
  private terminalContainer: HTMLElement | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  static override styles = css`
    :host {
      display: block;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 2000;
      pointer-events: none;
    }

    :host([show]) {
      pointer-events: auto;
    }

    .console-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: none;
      align-items: center;
      justify-content: center;
    }

    :host([show]) .console-overlay {
      display: flex;
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    .console-window {
      width: 90%;
      height: 90%;
      max-width: 1200px;
      max-height: 800px;
      background: var(--vscode-editor-background, #1e1e1e);
      border: 1px solid var(--vscode-widget-border, #454545);
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      animation: slideUp 0.3s ease-out;
    }

    @keyframes slideUp {
      from {
        transform: translateY(20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .console-header {
      padding: 12px 16px;
      background: var(--vscode-editor-inactiveSelectionBackground, #252526);
      border-bottom: 1px solid var(--vscode-widget-border, #454545);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }

    .console-title {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 14px;
      font-weight: 500;
      color: var(--vscode-foreground, #cccccc);
    }

    .console-icon {
      font-size: 18px;
    }

    .vm-name {
      color: var(--vscode-textLink-foreground, #3794ff);
    }

    .connection-status {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: var(--vscode-descriptionForeground, #8b8b8b);
    }

    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--vscode-charts-yellow, #cca700);
    }

    .status-indicator.connected {
      background: var(--vscode-charts-green, #89d185);
      animation: pulse 2s infinite;
    }

    .status-indicator.error {
      background: var(--vscode-charts-red, #f48771);
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.6;
      }
    }

    .console-actions {
      display: flex;
      gap: 8px;
    }

    .action-btn {
      padding: 4px 8px;
      background: var(--vscode-button-secondaryBackground, #3c3c3c);
      color: var(--vscode-button-secondaryForeground, #cccccc);
      border: 1px solid var(--vscode-button-border, #5a5a5a);
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .action-btn:hover {
      background: var(--vscode-button-secondaryHoverBackground, #45494e);
    }

    .action-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .close-btn {
      padding: 4px;
      background: transparent;
      border: none;
      color: var(--vscode-foreground, #cccccc);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: all 0.2s;
    }

    .close-btn:hover {
      background: var(--vscode-toolbar-hoverBackground, rgba(90, 93, 94, 0.31));
    }

    .console-body {
      flex: 1;
      background: #000;
      position: relative;
      overflow: hidden;
    }

    .terminal-container {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      padding: 8px;
    }

    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 16px;
      z-index: 10;
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--vscode-widget-border, #454545);
      border-top-color: var(--vscode-focusBorder, #007acc);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .loading-text {
      color: var(--vscode-foreground, #cccccc);
      font-size: 14px;
    }

    .error-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 16px;
      z-index: 10;
      padding: 20px;
    }

    .error-icon {
      font-size: 48px;
      opacity: 0.8;
    }

    .error-message {
      color: var(--vscode-errorForeground, #f48771);
      font-size: 14px;
      text-align: center;
      max-width: 400px;
    }

    .retry-btn {
      padding: 8px 16px;
      background: var(--vscode-button-background, #0e639c);
      color: var(--vscode-button-foreground, #ffffff);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.2s;
    }

    .retry-btn:hover {
      background: var(--vscode-button-hoverBackground, #1177bb);
    }

    .console-footer {
      padding: 8px 16px;
      background: var(--vscode-editor-inactiveSelectionBackground, #252526);
      border-top: 1px solid var(--vscode-widget-border, #454545);
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12px;
      color: var(--vscode-descriptionForeground, #8b8b8b);
      flex-shrink: 0;
    }

    .keyboard-shortcuts {
      display: flex;
      gap: 16px;
    }

    .shortcut {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .key {
      padding: 2px 6px;
      background: var(--vscode-button-secondaryBackground, #3c3c3c);
      border: 1px solid var(--vscode-button-border, #5a5a5a);
      border-radius: 3px;
      font-family: monospace;
      font-size: 11px;
    }

    /* Override xterm styles for better integration */
    :host ::part(xterm) {
      height: 100%;
    }
  `;

  override connectedCallback() {
    super.connectedCallback();
    if (this.show && this.vmId) {
      // Delay to ensure DOM is ready
      setTimeout(() => this.initConsole(), 100);
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.cleanup();
  }

  override updated(changedProperties: Map<string, any>) {
    if (changedProperties.has('show')) {
      if (this.show && this.vmId) {
        setTimeout(() => this.initConsole(), 100);
      } else if (!this.show) {
        this.cleanup();
      }
    }
  }

  private async initConsole() {
    if (this.terminal) return; // Already initialized

    this.terminalContainer = this.shadowRoot?.querySelector('.terminal-container') as HTMLElement;
    if (!this.terminalContainer) {
      console.error('Terminal container not found');
      return;
    }

    try {
      // Create terminal instance
      this.terminal = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Monaco, Menlo, Consolas, "Courier New", monospace',
        theme: {
          foreground: '#ffffff',
          background: '#000000',
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
          brightWhite: '#ffffff'
        }
      });

      // Add addons
      this.fitAddon = new FitAddon();
      this.terminal.loadAddon(this.fitAddon);

      this.webLinksAddon = new WebLinksAddon();
      this.terminal.loadAddon(this.webLinksAddon);

      // Open terminal in container
      this.terminal.open(this.terminalContainer);
      this.fitAddon.fit();

      // Handle window resize
      window.addEventListener('resize', this.handleResize);

      // Connect to WebSocket
      await this.connectWebSocket();
    } catch (error) {
      console.error('Failed to initialize console:', error);
      this.error = error instanceof Error ? error.message : 'Failed to initialize console';
      this.isConnecting = false;
    }
  }

  private async connectWebSocket() {
    if (!this.vmId) {
      this.error = 'No VM ID provided';
      this.isConnecting = false;
      return;
    }

    try {
      this.connectionStatus = 'Requesting console access...';
      this.isConnecting = true;
      this.error = null;

      // First, fetch the console token from the HTTP endpoint
      const consoleToken = await this.fetchConsoleToken();
      
      if (!consoleToken) {
        throw new Error('Failed to obtain console access token');
      }

      this.connectionStatus = 'Connecting to console...';

      // Build WebSocket URL with the console token as query parameter
      const baseUrl = getApiUrl('').replace(/^http/, 'ws'); // Convert http to ws
      const wsUrl = `${baseUrl}/virtualization/computes/${this.vmId}/console/ws?token=${encodeURIComponent(consoleToken.token)}`;
      
      console.log('Connecting to VM console WebSocket:', wsUrl.replace(consoleToken.token, '[REDACTED]'));
      console.log('Console type:', consoleToken.type, 'Host:', consoleToken.host, 'Port:', consoleToken.port);

      // Create WebSocket connection
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('WebSocket connection established');
        this.isConnecting = false;
        this.isWSConnected = true;
        this.connectionStatus = 'Connected';
        this.reconnectAttempts = 0;

        // Attach WebSocket to terminal
        if (this.terminal && this.ws) {
          this.attachAddon = new AttachAddon(this.ws);
          this.terminal.loadAddon(this.attachAddon);
          
          // Focus terminal
          this.terminal.focus();
          
          // Send initial size to server
          this.sendTerminalSize();
        }
      };

      this.ws.onmessage = (event) => {
        // AttachAddon handles the data, but we can log for debugging
        if (event.data instanceof Blob) {
          event.data.text().then(text => {
            console.debug('Received console data:', text.length, 'bytes');
          });
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.error = 'Connection error occurred';
        this.isConnecting = false;
        this.isWSConnected = false;
        this.connectionStatus = 'Connection error';
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        this.isWSConnected = false;
        this.connectionStatus = 'Disconnected';
        
        // Clean up attach addon
        if (this.attachAddon) {
          this.attachAddon.dispose();
          this.attachAddon = null;
        }

        // Attempt reconnection if not manually closed
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.attemptReconnect();
        } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          this.error = 'Failed to establish connection after multiple attempts';
        }
      };
    } catch (error) {
      console.error('Failed to connect to console:', error);
      this.error = error instanceof Error ? error.message : 'Failed to connect to console';
      this.isConnecting = false;
      this.isWSConnected = false;
      this.connectionStatus = 'Failed to connect';
    }
  }

  private async fetchConsoleToken(): Promise<ConsoleTokenResponse | null> {
    try {
      const authHeaders = auth.getAuthHeaders();
      if (!authHeaders.Authorization) {
        throw new Error('No authentication token available');
      }

      const apiUrl = getApiUrl(`/virtualization/computes/${this.vmId}/console`);
      console.log('Fetching console token from:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch console token:', response.status, errorText);
        throw new Error(`Failed to get console access: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Console token response:', { ...data, data: { ...data.data, token: '[REDACTED]' } });
      
      if (data.status === 'success' && data.data) {
        return data.data as ConsoleTokenResponse;
      }
      
      throw new Error('Invalid console token response');
    } catch (error) {
      console.error('Error fetching console token:', error);
      throw error;
    }
  }

  private attemptReconnect() {
    this.reconnectAttempts++;
    this.connectionStatus = `Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = setTimeout(() => {
      console.log(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      this.connectWebSocket();
    }, 2000 * this.reconnectAttempts); // Exponential backoff
  }

  private sendTerminalSize() {
    if (!this.terminal || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const cols = this.terminal.cols;
    const rows = this.terminal.rows;
    
    // Send resize command to server
    const resizeCommand = JSON.stringify({
      type: 'resize',
      cols: cols,
      rows: rows
    });
    
    this.ws.send(resizeCommand);
    console.log(`Sent terminal resize: ${cols}x${rows}`);
  }

  private handleResize = () => {
    if (this.fitAddon && this.terminal) {
      this.fitAddon.fit();
      this.sendTerminalSize();
    }
  };

  private handleCopy = () => {
    if (this.terminal) {
      const selection = this.terminal.getSelection();
      if (selection) {
        navigator.clipboard.writeText(selection);
        // Show brief notification
        this.showNotification('Copied to clipboard');
      }
    }
  };

  private handlePaste = async () => {
    if (this.terminal && this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          this.ws.send(text);
        }
      } catch (error) {
        console.error('Failed to paste:', error);
      }
    }
  };

  private handleClear = () => {
    if (this.terminal) {
      this.terminal.clear();
    }
  };

  private handleReconnect = () => {
    this.reconnectAttempts = 0;
    this.error = null;
    this.connectWebSocket();
  };

  private handleClose = () => {
    this.cleanup();
    this.show = false;
    this.dispatchEvent(new CustomEvent('close'));
  };

  private cleanup() {
    // Close WebSocket
    if (this.ws) {
      this.ws.close(1000, 'User closed console');
      this.ws = null;
    }

    // Dispose addons
    if (this.attachAddon) {
      this.attachAddon.dispose();
      this.attachAddon = null;
    }

    if (this.fitAddon) {
      this.fitAddon.dispose();
      this.fitAddon = null;
    }

    if (this.webLinksAddon) {
      this.webLinksAddon.dispose();
      this.webLinksAddon = null;
    }

    // Dispose terminal
    if (this.terminal) {
      this.terminal.dispose();
      this.terminal = null;
    }

    // Remove event listeners
    window.removeEventListener('resize', this.handleResize);

    // Clear reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Reset state
    this.isConnecting = false;
    this.isWSConnected = false;
    this.error = null;
    this.connectionStatus = 'Disconnected';
    this.reconnectAttempts = 0;
  }

  private showNotification(message: string) {
    // Simple notification - could be enhanced
    const event = new CustomEvent('show-notification', {
      detail: { message, type: 'info' },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }

  override render() {
    return html`
      <div class="console-overlay">
        <div class="console-window">
          <div class="console-header">
            <div class="console-title">
              <span class="console-icon">💻</span>
              <span>Console - <span class="vm-name">${this.vmName || this.vmId}</span></span>
            </div>
            
            <div class="connection-status">
              <span class="status-indicator ${this.isWSConnected ? 'connected' : this.error ? 'error' : ''}"></span>
              <span>${this.connectionStatus}</span>
            </div>

            <div class="console-actions">
              <button 
                class="action-btn" 
                @click=${this.handleCopy}
                ?disabled=${!this.isWSConnected}
                title="Copy (Ctrl+Shift+C)"
              >
                📋 Copy
              </button>
              <button 
                class="action-btn" 
                @click=${this.handlePaste}
                ?disabled=${!this.isWSConnected}
                title="Paste (Ctrl+Shift+V)"
              >
                📝 Paste
              </button>
              <button 
                class="action-btn" 
                @click=${this.handleClear}
                ?disabled=${!this.isWSConnected}
                title="Clear Terminal"
              >
                🗑️ Clear
              </button>
              <button class="close-btn" @click=${this.handleClose} title="Close">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" stroke-width="2"/>
                </svg>
              </button>
            </div>
          </div>

          <div class="console-body">
            <div class="terminal-container"></div>
            
            ${this.isConnecting ? html`
              <div class="loading-overlay">
                <div class="spinner"></div>
                <div class="loading-text">${this.connectionStatus}</div>
              </div>
            ` : ''}

            ${this.error ? html`
              <div class="error-overlay">
                <div class="error-icon">⚠️</div>
                <div class="error-message">${this.error}</div>
                ${this.reconnectAttempts < this.maxReconnectAttempts ? html`
                  <button class="retry-btn" @click=${this.handleReconnect}>
                    🔄 Retry Connection
                  </button>
                ` : ''}
              </div>
            ` : ''}
          </div>

          <div class="console-footer">
            <div class="keyboard-shortcuts">
              <div class="shortcut">
                <span class="key">Ctrl</span>+<span class="key">Shift</span>+<span class="key">C</span>
                <span>Copy</span>
              </div>
              <div class="shortcut">
                <span class="key">Ctrl</span>+<span class="key">Shift</span>+<span class="key">V</span>
                <span>Paste</span>
              </div>
              <div class="shortcut">
                <span class="key">Esc</span>
                <span>Close</span>
              </div>
            </div>
            <div>
              Terminal: ${this.terminal ? `${this.terminal.cols}×${this.terminal.rows}` : 'Not initialized'}
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'vm-console': VMConsole;
  }
}
