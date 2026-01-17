/**
 * VM Console Component
 * Provides graphical console to virtual machines via VNC (noVNC in iframe)
 */

import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { auth } from '../../auth';
import { getApiUrl } from '../../config';
import { consoleActions } from '../../stores/virtualization';

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
  @state() private scaleViewport = true;
  @state() private showVirtualKeyboard = false;
  @state() private availableConsoles: ("vnc" | "spice")[] = [];
  @state() private selectedConsoleType: "vnc" | "spice" = "vnc";

  private vncIframe: HTMLIFrameElement | null = null;
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
      border: 1px solid var(--vscode-border, #454545);
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
      background: var(--vscode-titlebar, #252526);
      border-bottom: 1px solid var(--vscode-border, #454545);
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
      color: var(--vscode-info, #3794ff);
    }

    .connection-status {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: var(--vscode-text-dim, #8b8b8b);
    }

    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--vscode-warning, #cca700);
    }

    .status-indicator.connected {
      background: var(--vscode-success, #89d185);
      animation: pulse 2s infinite;
    }

    .status-indicator.error {
      background: var(--vscode-error, #f48771);
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
      background: var(--vscode-list-hoverBackground, rgba(90, 93, 94, 0.31));
    }

    .console-body {
      flex: 1;
      background: #000;
      position: relative;
      overflow: hidden;
    }

    .vnc-iframe {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      width: 100%;
      height: 100%;
      border: none;
      background: #000;
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
      border: 3px solid var(--vscode-border, #454545);
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
      color: var(--vscode-error, #f48771);
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
      background: var(--vscode-titlebar, #252526);
      border-top: 1px solid var(--vscode-border, #454545);
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

    /* noVNC canvas will be injected into .vnc-canvas-wrapper */
    .vnc-canvas-wrapper canvas {
      width: 100% !important;
      height: 100% !important;
      image-rendering: pixelated;
      outline: none;
      display: block;
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

  private async fetchAvailableConsoles(): Promise<void> {
    try {
      const info = await consoleActions.getAvailable(this.vmId);
      // Console info stored for future use
      this.availableConsoles = info.available || ['vnc'];
      if (info.preferred && this.availableConsoles.includes(info.preferred)) {
        this.selectedConsoleType = info.preferred;
      } else if (this.availableConsoles.length > 0) {
        this.selectedConsoleType = this.availableConsoles[0] || "vnc";
      }
    } catch (error) {
      console.warn('Could not fetch available consoles, defaulting to VNC:', error);
      this.availableConsoles = ['vnc'];
      this.selectedConsoleType = 'vnc';
    }
  }


  private async initConsole() {
    if (this.vncIframe) return; // Already initialized

    // Fetch available console types first
    await this.fetchAvailableConsoles();
    try {
      // Connect to VNC via iframe
      await this.connectVNC();
    } catch (error) {
      console.error('Failed to initialize console:', error);
      this.error = error instanceof Error ? error.message : 'Failed to initialize console';
      this.isConnecting = false;
    }
  }

  private async connectVNC() {
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

      this.connectionStatus = 'Loading VNC console...';

      // Build WebSocket URL with the console token as query parameter
      const baseUrl = getApiUrl('').replace(/^http/, 'ws'); // Convert http to ws/wss
      const wsUrl = `${baseUrl}virtualization/computes/${this.vmId}/console/vnc/ws?token=${encodeURIComponent(consoleToken.token)}`;

      console.log('Connecting to VM VNC via iframe:', wsUrl.replace(consoleToken.token, '[REDACTED]'));

      // Create iframe with VNC console
      this.vncIframe = document.createElement('iframe');
      this.vncIframe.className = 'vnc-iframe';
      this.vncIframe.src = `/vnc-console.html?url=${encodeURIComponent(wsUrl)}`;

      // Listen for messages from iframe
      const messageHandler = (event: MessageEvent) => {
        if (event.data.type === 'vnc-ready') {
          console.log('VNC iframe ready');
          this.isConnecting = false;
          this.isWSConnected = true;
          this.connectionStatus = 'Connected';
          this.reconnectAttempts = 0;
        }
      };

      window.addEventListener('message', messageHandler);

      // Inject iframe into shadow DOM
      const container = this.shadowRoot?.querySelector('.vnc-container');
      if (container) {
        container.appendChild(this.vncIframe);
      }

      // Set a timeout in case the iframe doesn't load
      setTimeout(() => {
        if (this.isConnecting) {
          this.error = 'Failed to load VNC console';
          this.isConnecting = false;
        }
      }, 10000);

    } catch (error) {
      console.error('Failed to connect to VNC:', error);
      this.error = error instanceof Error ? error.message : 'Failed to connect to VNC';
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

      const apiUrl = getApiUrl(`/virtualization/computes/${this.vmId}/console/vnc`);
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


  private handleResize = () => {
    // Iframe handles resize automatically
  };

  private handleSendCAD = () => {
    // Send message to iframe to trigger Ctrl+Alt+Del
    if (this.vncIframe?.contentWindow) {
      this.vncIframe.contentWindow.postMessage({ type: 'sendCAD' }, '*');
    }
  };

  private handleToggleScale = () => {
    // Toggle scale in iframe
    this.scaleViewport = !this.scaleViewport;
    if (this.vncIframe?.contentWindow) {
      this.vncIframe.contentWindow.postMessage({ type: 'toggleScale' }, '*');
    }
  };

  private handleFullscreen = async () => {
    // Open console in new tab/window in fullscreen mode
    try {
      const consoleToken = await this.fetchConsoleToken();
      if (!consoleToken) {
        throw new Error('Failed to obtain console access token');
      }

      // Build WebSocket URL
      const baseUrl = getApiUrl('').replace(/^http/, 'ws');
      const wsUrl = `${baseUrl}virtualization/computes/${this.vmId}/console/vnc/ws?token=${encodeURIComponent(consoleToken.token)}`;

      // Open in new tab with fullscreen parameter
      const vncUrl = `/vnc-console.html?url=${encodeURIComponent(wsUrl)}&fullscreen=true&vmName=${encodeURIComponent(this.vmName || this.vmId)}`;
      window.open(vncUrl, '_blank');
    } catch (error) {
      console.error('Failed to open fullscreen console:', error);
      this.error = error instanceof Error ? error.message : 'Failed to open fullscreen console';
    }
  };

  private handleToggleKeyboard = () => {
    // Toggle virtual keyboard in iframe
    this.showVirtualKeyboard = !this.showVirtualKeyboard;
    if (this.vncIframe?.contentWindow) {
      this.vncIframe.contentWindow.postMessage({ type: 'toggleKeyboard', show: this.showVirtualKeyboard }, '*');
    }
  };

  private handleReconnect = () => {
    this.reconnectAttempts = 0;
    this.error = null;
    this.connectVNC();
  };

  private handleClose = () => {
    this.cleanup();
    this.show = false;
    this.dispatchEvent(new CustomEvent('close'));
  };

  private cleanup() {
    // Send disconnect message to iframe
    if (this.vncIframe?.contentWindow) {
      this.vncIframe.contentWindow.postMessage({ type: 'disconnect' }, '*');
    }

    // Remove iframe
    if (this.vncIframe) {
      this.vncIframe.remove();
      this.vncIframe = null;
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

  override render() {
    return html`
      <div class="console-overlay">
        <div class="console-window">
          <div class="console-header">
            <div class="console-title">
              <span class="console-icon">💻</span>
              <span>Console (${this.selectedConsoleType.toUpperCase()}) - <span class="vm-name">${this.vmName || this.vmId}</span></span>
            </div>
            
            <div class="connection-status">
              <span class="status-indicator ${this.isWSConnected ? 'connected' : this.error ? 'error' : ''}"></span>
              <span>${this.connectionStatus}</span>
            </div>

            <div class="console-actions">
              <button 
                class="action-btn" 
                @click=${this.handleSendCAD}
                ?disabled=${!this.isWSConnected}
                title="Send Ctrl+Alt+Del"
              >
                ⌨️ Ctrl+Alt+Del
              </button>
              <button 
                class="action-btn" 
                @click=${this.handleToggleKeyboard}
                title="${this.showVirtualKeyboard ? 'Hide Virtual Keyboard' : 'Show Virtual Keyboard'}"
              >
                ${this.showVirtualKeyboard ? '⌨️ Hide Keyboard' : '⌨️ Show Keyboard'}
              </button>
              <button 
                class="action-btn" 
                @click=${this.handleToggleScale}
                title="${this.scaleViewport ? 'Disable Fit' : 'Fit to Window'}"
              >
                ${this.scaleViewport ? '🧩 Unfit' : '🧩 Fit'}
              </button>
              <button 
                class="action-btn" 
                @click=${this.handleFullscreen}
                title="Open in New Tab (Fullscreen)"
              >
                🖥️ Fullscreen
              </button>
              <button class="close-btn" @click=${this.handleClose} title="Close">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" stroke-width="2"/>
                </svg>
              </button>
            </div>
          </div>

          <div class="console-body">
            <div class="vnc-container">
              <!-- iframe will be injected here -->
            </div>
            
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
                <span class="key">Click</span>
                <span>Focus console for keyboard input</span>
              </div>
              <div class="shortcut">
                <span class="key">⌘</span> / <span class="key">Ctrl</span>
                <span>may be captured by guest</span>
              </div>
            </div>
            <div>
              noVNC client ready
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
