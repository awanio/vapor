import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { AnsibleService } from '../../services/ansible';
import type { ExecutionDetail, ExecutionStreamMessage } from '../../types/ansible';
import type { WebSocketManager } from '../../api';

@customElement('ansible-execution-drawer')
export class AnsibleExecutionDrawer extends LitElement {
  @property({ type: String })
  executionId?: string;

  @property({ type: Boolean })
  open = false;

  @state()
  private execution?: ExecutionDetail;

  @state()
  private loading = false;

  @state()
  private streaming = false;

  @state()
  private output: string[] = [];

  @state()
  private error?: string;

  private wsManager?: WebSocketManager;
  // private outputContainer?: HTMLElement;

  static override styles = css`
    :host {
      display: block;
      position: fixed;
      top: 0;
      right: -600px;
      width: 600px;
      height: 100vh;
      background: var(--vscode-editor-background, #1e1e1e);
      border-left: 1px solid var(--vscode-panel-border, #2d2d30);
      box-shadow: -2px 0 8px rgba(0, 0, 0, 0.2);
      transition: right 0.3s ease-in-out;
      z-index: 1000;
      display: flex;
      flex-direction: column;
    }

    :host([open]) {
      right: 0;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      border-bottom: 1px solid var(--vscode-panel-border, #2d2d30);
      background: var(--vscode-titleBar-activeBackground, #3c3c3c);
      flex-shrink: 0;
    }

    .title {
      font-size: 14px;
      font-weight: 500;
      color: var(--vscode-titleBar-activeForeground, #cccccc);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .close-button {
      background: none;
      border: none;
      color: var(--vscode-icon-foreground, #c5c5c5);
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: background-color 0.2s;
    }

    .close-button:hover {
      background: var(--vscode-toolbar-hoverBackground, rgba(90, 93, 94, 0.31));
    }

    .metadata {
      padding: 16px;
      border-bottom: 1px solid var(--vscode-panel-border, #2d2d30);
      flex-shrink: 0;
    }

    .metadata-item {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      font-size: 13px;
    }

    .metadata-label {
      color: var(--vscode-descriptionForeground, #8b8b8b);
      min-width: 100px;
    }

    .metadata-value {
      color: var(--vscode-foreground, #cccccc);
      font-family: var(--vscode-editor-font-family, 'Courier New', monospace);
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }

    .status-badge.running {
      background: rgba(30, 136, 229, 0.2);
      color: #1e88e5;
    }

    .status-badge.success {
      background: rgba(67, 160, 71, 0.2);
      color: #43a047;
    }

    .status-badge.failed {
      background: rgba(229, 57, 53, 0.2);
      color: #e53935;
    }

    .status-badge.cancelled {
      background: rgba(117, 117, 117, 0.2);
      color: #757575;
    }

    .output-container {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      background: var(--vscode-terminal-background, #1e1e1e);
      font-family: var(--vscode-editor-font-family, 'Courier New', monospace);
      font-size: 13px;
      line-height: 1.6;
      color: var(--vscode-terminal-foreground, #cccccc);
    }

    .output-line {
      white-space: pre-wrap;
      word-break: break-all;
      margin: 0;
      padding: 2px 0;
    }

    .output-line.task {
      color: var(--vscode-terminal-ansiBrightCyan, #3dd8ff);
      font-weight: bold;
      margin-top: 8px;
    }

    .output-line.play {
      color: var(--vscode-terminal-ansiBrightMagenta, #ff6eff);
      font-weight: bold;
      margin-top: 12px;
      border-top: 1px solid var(--vscode-panel-border, #2d2d30);
      padding-top: 8px;
    }

    .output-line.ok {
      color: var(--vscode-terminal-ansiGreen, #00ff00);
    }

    .output-line.changed {
      color: var(--vscode-terminal-ansiYellow, #ffff00);
    }

    .output-line.failed,
    .output-line.fatal {
      color: var(--vscode-terminal-ansiRed, #ff0000);
    }

    .output-line.skipped {
      color: var(--vscode-terminal-ansiCyan, #00ffff);
    }

    .output-line.unreachable {
      color: var(--vscode-terminal-ansiBrightRed, #ff6b6b);
    }

    .streaming-indicator {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      background: rgba(30, 136, 229, 0.2);
      color: #1e88e5;
      border-radius: 4px;
      font-size: 12px;
    }

    .streaming-dot {
      width: 6px;
      height: 6px;
      background: currentColor;
      border-radius: 50%;
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.3;
      }
    }

    .actions {
      padding: 16px;
      border-top: 1px solid var(--vscode-panel-border, #2d2d30);
      display: flex;
      gap: 8px;
      flex-shrink: 0;
    }

    .action-button {
      padding: 8px 16px;
      background: var(--vscode-button-background, #007acc);
      color: var(--vscode-button-foreground, white);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      transition: background-color 0.2s;
    }

    .action-button:hover {
      background: var(--vscode-button-hoverBackground, #005a9e);
    }

    .action-button.secondary {
      background: var(--vscode-button-secondaryBackground, #3a3d41);
      color: var(--vscode-button-secondaryForeground, #cccccc);
    }

    .action-button.secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground, #45494e);
    }

    .action-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .loading-state {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--vscode-descriptionForeground, #8b8b8b);
    }

    .error-state {
      padding: 16px;
      color: var(--vscode-errorForeground, #f48771);
      background: var(--vscode-inputValidation-errorBackground, rgba(244, 135, 113, 0.1));
      border: 1px solid var(--vscode-inputValidation-errorBorder, #f48771);
      border-radius: 4px;
      margin: 16px;
    }

    .host-summary {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-top: 8px;
    }

    .host-stat {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
    }

    .host-stat-icon {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .host-stat.ok .host-stat-icon {
      background: #43a047;
    }

    .host-stat.changed .host-stat-icon {
      background: #ffa726;
    }

    .host-stat.failed .host-stat-icon {
      background: #e53935;
    }

    .host-stat.unreachable .host-stat-icon {
      background: #ff9800;
    }

    .host-stat.skipped .host-stat-icon {
      background: #9e9e9e;
    }
  `;

  override updated(changedProperties: Map<string, any>) {
    if (changedProperties.has('open')) {
      if (this.open && this.executionId) {
        this.loadExecution();
      } else if (!this.open) {
        this.cleanup();
      }
    }

    if (changedProperties.has('executionId') && this.executionId && this.open) {
      this.loadExecution();
    }
  }

  private async loadExecution() {
    if (!this.executionId) return;

    this.loading = true;
    this.error = undefined;
    this.output = [];

    try {
      const response = await AnsibleService.getExecution(this.executionId);
      this.execution = response.execution;

      // If execution is still running, start streaming
      if (this.execution.status === 'running') {
        this.startStreaming();
      } else if (this.execution.output) {
        // Display the static output
        this.output = this.execution.output.split('\n');
      }
    } catch (error) {
      console.error('Failed to load execution:', error);
      this.error = error instanceof Error ? error.message : 'Failed to load execution';
    } finally {
      this.loading = false;
    }
  }

  private startStreaming() {
    if (!this.executionId || this.wsManager) return;

    this.streaming = true;

    this.wsManager = AnsibleService.createExecutionStream(
      this.executionId,
      (message: ExecutionStreamMessage) => {
        if (message.type === 'output' && message.content) {
          this.output = [...this.output, ...message.content.split('\n')];
          this.requestUpdate();
          // Auto-scroll to bottom
          this.scrollToBottom();
        } else if (message.type === 'complete') {
          this.streaming = false;
          if (message.result) {
            // Update execution status
            if (this.execution) {
              this.execution.status = message.result.status as any;
              this.execution.exit_code = message.result.exit_code;
            }
          }
        } else if (message.type === 'error') {
          this.error = message.error || 'Stream error occurred';
          this.streaming = false;
        }
      },
      (error: Error) => {
        console.error('WebSocket error:', error);
        this.error = error.message;
        this.streaming = false;
      },
      () => {
        this.streaming = false;
      }
    );

    // Connect the WebSocket
    this.wsManager.connect().catch((error) => {
      console.error('Failed to connect WebSocket:', error);
      this.error = 'Failed to connect to output stream';
      this.streaming = false;
    });
  }

  private scrollToBottom() {
    requestAnimationFrame(() => {
      const container = this.shadowRoot?.querySelector('.output-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    });
  }

  private cleanup() {
    if (this.wsManager) {
      this.wsManager.disconnect();
      this.wsManager = undefined;
    }
    this.output = [];
    this.execution = undefined;
    this.streaming = false;
    this.error = undefined;
  }

  private close() {
    this.dispatchEvent(new CustomEvent('close'));
    this.open = false;
  }

  private async rerun() {
    if (!this.execution || !this.execution.parameters) return;

    // Dispatch event to parent component to handle rerun
    this.dispatchEvent(new CustomEvent('rerun', {
      detail: {
        type: this.execution.type,
        parameters: this.execution.parameters
      }
    }));
  }

  private downloadLog() {
    if (!this.execution) return;

    const content = this.output.join('\n') || this.execution.output || '';
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ansible-execution-${this.execution.id}.log`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private getOutputLineClass(line: string): string {
    const lowerLine = line.toLowerCase();
    
    if (line.startsWith('PLAY [') || line.startsWith('PLAY RECAP')) {
      return 'play';
    } else if (line.startsWith('TASK [') || line.startsWith('GATHERING FACTS')) {
      return 'task';
    } else if (lowerLine.includes('ok:')) {
      return 'ok';
    } else if (lowerLine.includes('changed:')) {
      return 'changed';
    } else if (lowerLine.includes('failed:') || lowerLine.includes('fatal:')) {
      return 'failed';
    } else if (lowerLine.includes('skipping:')) {
      return 'skipped';
    } else if (lowerLine.includes('unreachable:')) {
      return 'unreachable';
    }
    
    return '';
  }

  override render() {
    return html`
      <div class="header">
        <div class="title">
          <span>Execution Details</span>
          ${this.streaming ? html`
            <span class="streaming-indicator">
              <span class="streaming-dot"></span>
              Live
            </span>
          ` : ''}
        </div>
        <button class="close-button" @click=${this.close}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.707.708L7.293 8l-3.647 3.646.708.707L8 8.707z"/>
          </svg>
        </button>
      </div>

      ${this.loading ? html`
        <div class="loading-state">
          <loading-state message="Loading execution details..."></loading-state>
        </div>
      ` : this.error ? html`
        <div class="error-state">
          <strong>Error:</strong> ${this.error}
        </div>
      ` : this.execution ? html`
        <div class="metadata">
          <div class="metadata-item">
            <span class="metadata-label">ID:</span>
            <span class="metadata-value">${this.execution.id}</span>
          </div>
          <div class="metadata-item">
            <span class="metadata-label">Type:</span>
            <span class="metadata-value">${this.execution.type}</span>
          </div>
          ${this.execution.playbook ? html`
            <div class="metadata-item">
              <span class="metadata-label">Playbook:</span>
              <span class="metadata-value">${this.execution.playbook}</span>
            </div>
          ` : ''}
          ${this.execution.module ? html`
            <div class="metadata-item">
              <span class="metadata-label">Module:</span>
              <span class="metadata-value">${this.execution.module}</span>
            </div>
          ` : ''}
          <div class="metadata-item">
            <span class="metadata-label">Status:</span>
            <span class="status-badge ${this.execution.status}">
              ${this.execution.status}
            </span>
          </div>
          <div class="metadata-item">
            <span class="metadata-label">Started:</span>
            <span class="metadata-value">${new Date(this.execution.started_at).toLocaleString()}</span>
          </div>
          ${this.execution.finished_at ? html`
            <div class="metadata-item">
              <span class="metadata-label">Duration:</span>
              <span class="metadata-value">${AnsibleService.formatDuration(this.execution.duration)}</span>
            </div>
          ` : ''}
          ${this.execution.hosts_summary ? html`
            <div class="metadata-item">
              <span class="metadata-label">Hosts:</span>
              <div class="host-summary">
                ${this.execution.hosts_summary.ok > 0 ? html`
                  <span class="host-stat ok">
                    <span class="host-stat-icon"></span>
                    ${this.execution.hosts_summary.ok} ok
                  </span>
                ` : ''}
                ${this.execution.hosts_summary.changed > 0 ? html`
                  <span class="host-stat changed">
                    <span class="host-stat-icon"></span>
                    ${this.execution.hosts_summary.changed} changed
                  </span>
                ` : ''}
                ${this.execution.hosts_summary.failed > 0 ? html`
                  <span class="host-stat failed">
                    <span class="host-stat-icon"></span>
                    ${this.execution.hosts_summary.failed} failed
                  </span>
                ` : ''}
                ${this.execution.hosts_summary.unreachable > 0 ? html`
                  <span class="host-stat unreachable">
                    <span class="host-stat-icon"></span>
                    ${this.execution.hosts_summary.unreachable} unreachable
                  </span>
                ` : ''}
                ${this.execution.hosts_summary.skipped > 0 ? html`
                  <span class="host-stat skipped">
                    <span class="host-stat-icon"></span>
                    ${this.execution.hosts_summary.skipped} skipped
                  </span>
                ` : ''}
              </div>
            </div>
          ` : ''}
        </div>

        <div class="output-container">
          ${this.output.map(line => html`
            <pre class="output-line ${this.getOutputLineClass(line)}">${line}</pre>
          `)}
        </div>

        <div class="actions">
          <button class="action-button" @click=${this.downloadLog}>
            Download Log
          </button>
          <button 
            class="action-button secondary" 
            @click=${this.rerun}
            ?disabled=${this.execution.status === 'running'}
          >
            Re-run
          </button>
        </div>
      ` : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ansible-execution-drawer': AnsibleExecutionDrawer;
  }
}
