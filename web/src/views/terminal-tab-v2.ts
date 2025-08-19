/**
 * Terminal Tab V2 Component
 * Enhanced terminal component using centralized state management
 * Maintains terminal sessions across navigation
 */

import { LitElement, html, css, unsafeCSS, PropertyValues } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { classMap } from 'lit/directives/class-map.js';
import xtermStyles from 'xterm/css/xterm.css?inline';
import { t } from '../i18n';
import { 
  terminalStore, 
  // terminalSessions,  // Available for direct access if needed
  activeSessionId, 
  sessionList,
  activeSession,
  connectedSessionsCount,
  type TerminalSessionState 
} from '../stores/shared/terminal';
import { StoreController } from '../stores/utils/lit-mixin';

@customElement('terminal-tab-v2')
export class TerminalTabV2 extends LitElement {
  // Store subscriptions
  // private sessionsController = new StoreController(this, terminalSessions);  // Available for future use
  private activeSessionController = new StoreController(this, activeSessionId);
  private sessionListController = new StoreController(this, sessionList);
  private activeSessionStateController = new StoreController(this, activeSession);
  private connectedCountController = new StoreController(this, connectedSessionsCount);

  @state()
  private isFullscreen = false;

  @state()
  private localSessions: TerminalSessionState[] = [];

  @state()
  private localActiveSessionId: string | null = null;

  @state()
  private localActiveSession: TerminalSessionState | null = null;

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

    .terminal-tab-status {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-right: 6px;
      flex-shrink: 0;
    }

    .terminal-tab-status.connected {
      background-color: var(--vscode-success);
    }

    .terminal-tab-status.connecting {
      background-color: var(--vscode-warning);
      animation: pulse 1.5s infinite;
    }

    .terminal-tab-status.disconnected {
      background-color: var(--vscode-error);
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
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

    .terminal-info {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .terminal-controls h3 {
      margin: 0;
      font-size: 14px;
      font-weight: normal;
      color: var(--vscode-text);
    }

    .terminal-stats {
      font-size: 12px;
      color: var(--vscode-text-dim);
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

    .terminal-action:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .terminal-container {
      flex: 1;
      overflow: hidden;
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

    .terminal-wrapper {
      flex: 1;
      position: relative;
      overflow: hidden;
      background-color: #1e1e1e;
    }

    /* Message overlays */
    .terminal-message {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      color: var(--vscode-text-dim);
      font-size: 14px;
    }

    .terminal-message h4 {
      margin: 0 0 8px 0;
      font-size: 16px;
      color: var(--vscode-text);
    }

    .terminal-message button {
      margin-top: 12px;
      padding: 6px 12px;
      background-color: var(--vscode-primary);
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
    }

    .terminal-message button:hover {
      background-color: var(--vscode-primary-hover);
    }

    .status-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 16px;
      background-color: var(--vscode-bg-lighter);
      border-top: 1px solid var(--vscode-border);
      font-size: 12px;
    }

    .status-left {
      display: flex;
      align-items: center;
      gap: 12px;
      color: var(--vscode-text);
    }

    .status-right {
      display: flex;
      align-items: center;
      gap: 12px;
      color: var(--vscode-text-dim);
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .status-dot.connected {
      background-color: var(--vscode-success);
    }

    .status-dot.connecting {
      background-color: var(--vscode-warning);
      animation: pulse 1.5s infinite;
    }

    .status-dot.disconnected {
      background-color: var(--vscode-error);
    }

    /* Ensure xterm terminal fills the container */
    .xterm {
      height: 100%;
      width: 100%;
    }

    /* Fullscreen styles */
    :host(.fullscreen) {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      z-index: 9999 !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
    }

    :host(.fullscreen) .terminal-header {
      background-color: rgba(37, 37, 38, 0.95);
    }

    :host(.fullscreen) .terminal-container {
      background-color: #1e1e1e;
    }

    /* Hide xterm helper elements */
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
    }
  `
  ];

  override connectedCallback() {
    super.connectedCallback();
    
    // Subscribe to store updates
    this.updateLocalState();
    
    // Initialize if no sessions exist
    this.initializeTerminals();
    
    // Set up event listeners
    window.addEventListener('resize', this.handleWindowResize);
    document.addEventListener('fullscreenchange', this.handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', this.handleFullscreenChange);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    
    // Detach all terminals but keep them in store
    this.localSessions.forEach(session => {
      terminalStore.detachTerminal(session.id);
    });
    
    // Remove event listeners
    window.removeEventListener('resize', this.handleWindowResize);
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', this.handleFullscreenChange);
  }

  override firstUpdated() {
    // Setup terminals after first render
    this.setupTerminals();
  }

  override updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
    
    // Update local state from store
    this.updateLocalState();
    
    // Setup terminals when sessions change
    if (changedProperties.has('localSessions') || changedProperties.has('localActiveSessionId')) {
      this.setupTerminals();
    }
  }

  private updateLocalState() {
    this.localSessions = this.sessionListController.value || [];
    this.localActiveSessionId = this.activeSessionController.value;
    this.localActiveSession = this.activeSessionStateController.value;
  }

  private async initializeTerminals() {
    // Create first session if none exist
    if (this.localSessions.length === 0) {
      await terminalStore.createSession();
    }
  }

  private async setupTerminals() {
    // Wait for DOM update
    await this.updateComplete;
    
    // Initialize terminals for all sessions
    for (const session of this.localSessions) {
      const wrapper = this.shadowRoot?.querySelector(`#${session.id} .terminal-wrapper`) as HTMLElement;
      if (wrapper && (!session.element || session.element !== wrapper)) {
        await terminalStore.initializeTerminal(session.id, wrapper);
        
        // Focus active terminal
        if (session.id === this.localActiveSessionId) {
          setTimeout(() => {
            terminalStore.focusTerminal(session.id);
            terminalStore.fitTerminal(session.id);
          }, 100);
        }
      }
    }
  }

  private async createNewSession() {
    const sessionId = await terminalStore.createSession();
    await this.updateComplete;
    
    // Setup the new terminal
    const wrapper = this.shadowRoot?.querySelector(`#${sessionId} .terminal-wrapper`) as HTMLElement;
    if (wrapper) {
      await terminalStore.initializeTerminal(sessionId, wrapper);
      terminalStore.focusTerminal(sessionId);
    }
  }

  private closeSession(sessionId: string, e: Event) {
    e.stopPropagation();
    
    // Don't allow closing the last session
    if (this.localSessions.length <= 1) {
      return;
    }
    
    terminalStore.closeSession(sessionId);
  }

  private switchToSession(sessionId: string) {
    activeSessionId.set(sessionId);
    
    // Focus the terminal
    setTimeout(() => {
      terminalStore.focusTerminal(sessionId);
      terminalStore.fitTerminal(sessionId);
    }, 50);
  }

  private async reconnectSession(sessionId: string) {
    await terminalStore.connectSession(sessionId);
  }

  private clearTerminal() {
    if (this.localActiveSessionId) {
      terminalStore.clearTerminal(this.localActiveSessionId);
    }
  }

  private async copySelection() {
    if (!this.localActiveSessionId) return;
    
    const selection = terminalStore.getSelection(this.localActiveSessionId);
    if (selection) {
      try {
        await navigator.clipboard.writeText(selection);
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
      }
    }
  }

  private async pasteFromClipboard() {
    if (!this.localActiveSessionId) return;
    
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        terminalStore.sendInput(this.localActiveSessionId, text);
      }
    } catch (error) {
      console.error('Failed to paste from clipboard:', error);
    }
  }

  private scrollToTop() {
    if (this.localActiveSessionId) {
      terminalStore.scrollToTop(this.localActiveSessionId);
    }
  }

  private scrollToBottom() {
    if (this.localActiveSessionId) {
      terminalStore.scrollToBottom(this.localActiveSessionId);
    }
  }

  private toggleFullscreen() {
    if (!document.fullscreenElement) {
      const hostElement = this as unknown as HTMLElement;
      const requestFullscreen = hostElement.requestFullscreen || 
                              (hostElement as any).webkitRequestFullscreen || 
                              (hostElement as any).mozRequestFullScreen || 
                              (hostElement as any).msRequestFullscreen;
      
      if (requestFullscreen) {
        requestFullscreen.call(hostElement).then(() => {
          this.isFullscreen = true;
          this.classList.add('fullscreen');
          setTimeout(() => {
            if (this.localActiveSessionId) {
              terminalStore.fitTerminal(this.localActiveSessionId);
              terminalStore.focusTerminal(this.localActiveSessionId);
            }
          }, 300);
        }).catch((err) => {
          console.error('Failed to enter fullscreen:', err);
        });
      }
    } else {
      document.exitFullscreen().then(() => {
        this.isFullscreen = false;
        this.classList.remove('fullscreen');
        setTimeout(() => {
          if (this.localActiveSessionId) {
            terminalStore.fitTerminal(this.localActiveSessionId);
            terminalStore.focusTerminal(this.localActiveSessionId);
          }
        }, 300);
      }).catch((err) => {
        console.error('Failed to exit fullscreen:', err);
      });
    }
  }

  private handleWindowResize = () => {
    // Resize the active terminal
    if (this.localActiveSessionId) {
      terminalStore.fitTerminal(this.localActiveSessionId);
    }
  };
  
  private handleFullscreenChange = () => {
    const isFullscreen = !!(document.fullscreenElement || 
                           (document as any).webkitFullscreenElement ||
                           (document as any).mozFullScreenElement ||
                           (document as any).msFullscreenElement);
    
    this.isFullscreen = isFullscreen;
    if (isFullscreen) {
      this.classList.add('fullscreen');
    } else {
      this.classList.remove('fullscreen');
    }
    
    // Refit terminal after fullscreen change
    setTimeout(() => {
      if (this.localActiveSessionId) {
        terminalStore.fitTerminal(this.localActiveSessionId);
        terminalStore.focusTerminal(this.localActiveSessionId);
      }
    }, 300);
  };

  override render() {
    const connectedCount = this.connectedCountController.value || 0;
    const hasActiveSessions = this.localSessions.length > 0;
    const canPaste = this.localActiveSession?.connectionStatus === 'connected';

    return html`
      <div class="terminal-header">
        <div class="terminal-tabs">
          ${repeat(
            this.localSessions,
            (session) => session.id,
            (session) => html`
              <button 
                class=${classMap({
                  'terminal-tab': true,
                  'active': session.id === this.localActiveSessionId
                })}
                @click=${() => this.switchToSession(session.id)}
              >
                <span class=${classMap({
                  'terminal-tab-status': true,
                  'connected': session.connectionStatus === 'connected',
                  'connecting': session.connectionStatus === 'connecting',
                  'disconnected': session.connectionStatus === 'disconnected'
                })}></span>
                <span class="terminal-tab-name">${session.name}</span>
                ${this.localSessions.length > 1 ? html`
                  <button 
                    class="terminal-tab-close" 
                    @click=${(e: Event) => this.closeSession(session.id, e)}
                    title="${t('terminal.closeTab')}"
                  >
                    ×
                  </button>
                ` : ''}
              </button>
            `
          )}
          <button 
            class="add-terminal-btn" 
            @click=${() => this.createNewSession()}
            title="${t('terminal.newTab')}"
          >
            +
          </button>
        </div>
        <div class="terminal-controls">
          <div class="terminal-info">
            <h3>${t('terminal.title')}</h3>
            <span class="terminal-stats">
              ${this.localSessions.length} ${t('terminal.sessions')} · 
              ${connectedCount} ${t('terminal.active')}
            </span>
          </div>
          <div class="terminal-actions">
            <button 
              class="terminal-action" 
              @click=${this.clearTerminal}
              ?disabled=${!hasActiveSessions}
              title="${t('terminal.clear')}"
            >
              ${t('terminal.clear')}
            </button>
            <button 
              class="terminal-action" 
              @click=${this.copySelection}
              ?disabled=${!hasActiveSessions}
              title="${t('terminal.copy')}"
            >
              ${t('terminal.copy')}
            </button>
            <button 
              class="terminal-action" 
              @click=${this.pasteFromClipboard}
              ?disabled=${!canPaste}
              title="${t('terminal.paste')}"
            >
              ${t('terminal.paste')}
            </button>
            <button 
              class="terminal-action" 
              @click=${this.toggleFullscreen}
              title="${t('terminal.fullscreen')}"
            >
              ${this.isFullscreen ? t('terminal.exitFullscreen') : t('terminal.fullscreen')}
            </button>
            <button 
              class="terminal-action" 
              @click=${this.scrollToTop}
              ?disabled=${!hasActiveSessions}
              title="Scroll to Top"
            >
              ↑ Top
            </button>
            <button 
              class="terminal-action" 
              @click=${this.scrollToBottom}
              ?disabled=${!hasActiveSessions}
              title="Scroll to Bottom"
            >
              ↓ Bottom
            </button>
          </div>
        </div>
      </div>
      <div class="terminal-container">
        ${this.localSessions.length === 0 ? html`
          <div class="terminal-message">
            <h4>${t('terminal.noSessions')}</h4>
            <p>${t('terminal.createFirst')}</p>
            <button @click=${() => this.createNewSession()}>
              ${t('terminal.createNew')}
            </button>
          </div>
        ` : repeat(
          this.localSessions,
          (session) => session.id,
          (session) => html`
            <div 
              id="${session.id}" 
              class=${classMap({
                'terminal-session': true,
                'active': session.id === this.localActiveSessionId
              })}
            >
              ${session.connectionStatus === 'disconnected' ? html`
                <div class="terminal-message">
                  <h4>${t('terminal.disconnected')}</h4>
                  <p>${t('terminal.sessionDisconnected')}</p>
                  <button @click=${() => this.reconnectSession(session.id)}>
                    ${t('terminal.reconnect')}
                  </button>
                </div>
              ` : html`
                <div class="terminal-wrapper"></div>
              `}
            </div>
          `
        )}
      </div>
      <div class="status-bar">
        <div class="status-left">
          ${this.localActiveSession ? html`
            <div class="status-indicator">
              <span class=${classMap({
                'status-dot': true,
                'connected': this.localActiveSession.connectionStatus === 'connected',
                'connecting': this.localActiveSession.connectionStatus === 'connecting',
                'disconnected': this.localActiveSession.connectionStatus === 'disconnected'
              })}></span>
              <span>
                ${this.localActiveSession.connectionStatus === 'connected' 
                  ? t('terminal.connected')
                  : this.localActiveSession.connectionStatus === 'connecting'
                  ? t('terminal.connecting')
                  : t('terminal.disconnected')}
              </span>
            </div>
            <span>${this.localActiveSession.name}</span>
          ` : html`
            <span>${t('terminal.noActiveSession')}</span>
          `}
        </div>
        <div class="status-right">
          ${this.localActiveSession ? html`
            <span>${this.localActiveSession.cols}×${this.localActiveSession.rows}</span>
          ` : ''}
        </div>
      </div>
    `;
  }
}
