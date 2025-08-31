import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

/**
 * Logs drawer component for viewing pod/container logs
 * @element logs-drawer
 * 
 * @fires close - Fired when the drawer is closed
 * @fires refresh - Fired when refresh button is clicked
 * 
 * @csspart drawer - The drawer container
 * @csspart header - The drawer header
 * @csspart content - The logs content area
 * @csspart search - The search container
 * @csspart controls - The control buttons container
 */
@customElement('logs-drawer')
export class LogsDrawer extends LitElement {
  static override styles = css`
    :host {
      display: block;
      position: fixed;
      top: 0;
      right: 0;
      width: 600px;
      height: 100vh;
      z-index: 1000;
      pointer-events: none;
    }

    :host([show]) {
      pointer-events: auto;
    }

    .drawer {
      width: 100%;
      height: 100%;
      background: var(--vscode-editor-background, var(--vscode-bg-light, #252526));
      box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;
      transform: translateX(100%);
      transition: transform 0.3s ease;
      border-left: 1px solid var(--vscode-widget-border, var(--vscode-panel-border, #454545));
    }

    :host([show]) .drawer {
      transform: translateX(0);
    }

    .drawer-header {
      padding: 20px;
      background: var(--vscode-sideBar-background, var(--vscode-bg-light, #252526));
      border-bottom: 1px solid var(--vscode-widget-border, var(--vscode-panel-border, #454545));
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }

    .header-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--vscode-foreground, var(--vscode-text, #cccccc));
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .header-subtitle {
      font-size: 13px;
      color: var(--vscode-descriptionForeground, var(--vscode-text-dim, #9d9d9d));
      margin-top: 4px;
    }

    .close-button {
      background: none;
      border: none;
      color: var(--vscode-icon-foreground, var(--vscode-text-dim, #9d9d9d));
      cursor: pointer;
      padding: 8px;
      border-radius: 4px;
      transition: all 0.2s;
    }

    .close-button:hover {
      background: var(--vscode-toolbar-hoverBackground, rgba(90, 93, 94, 0.31));
      color: var(--vscode-foreground, var(--vscode-text, #cccccc));
    }

    .controls {
      padding: 16px 20px;
      background: var(--vscode-editor-background, var(--vscode-bg-light, #252526));
      border-bottom: 1px solid var(--vscode-widget-border, var(--vscode-panel-border, #454545));
      display: flex;
      gap: 12px;
      align-items: center;
      flex-shrink: 0;
    }

    .search-container {
      flex: 1;
      position: relative;
    }

    .search-input {
      width: 100%;
      padding: 8px 12px 8px 36px;
      background: var(--vscode-input-background, #3c3c3c);
      color: var(--vscode-input-foreground, var(--vscode-text, #cccccc));
      border: 1px solid var(--vscode-input-border, transparent);
      border-radius: 4px;
      font-size: 13px;
      outline: none;
    }

    .search-input:focus {
      border-color: var(--vscode-focusBorder, #007acc);
    }

    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      width: 16px;
      height: 16px;
      color: var(--vscode-icon-foreground, var(--vscode-text-dim, #9d9d9d));
    }

    .control-button {
      background: var(--vscode-button-secondaryBackground, transparent);
      color: var(--vscode-button-secondaryForeground, var(--vscode-text, #cccccc));
      border: 1px solid var(--vscode-button-border, var(--vscode-panel-border, #454545));
      padding: 6px 14px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .control-button:hover {
      background: var(--vscode-button-secondaryHoverBackground, rgba(90, 93, 94, 0.31));
      border-color: var(--vscode-button-border, var(--vscode-panel-border, #454545));
    }

    .control-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .control-button.active {
      background: var(--vscode-button-background, #007acc);
      color: var(--vscode-button-foreground, white);
      border-color: var(--vscode-button-background, #007acc);
    }

    .content {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      font-family: var(--vscode-editor-font-family, 'Consolas', 'Monaco', 'Courier New', monospace);
      font-size: 13px;
      line-height: 1.6;
      color: var(--vscode-foreground, var(--vscode-text, #cccccc));
      background: var(--vscode-editor-background, #1e1e1e);
    }

    .log-line {
      word-break: break-all;
      margin: 0;
    }

    .log-line:hover {
      background: var(--vscode-list-hoverBackground, rgba(90, 93, 94, 0.31));
    }

    .log-line.highlighted {
      background: var(--vscode-editor-findMatchHighlightBackground, rgba(234, 92, 0, 0.33));
      border-left: 3px solid var(--vscode-editorWarning-foreground, #cca700);
      padding-left: 8px;
    }

    .log-timestamp {
      color: var(--vscode-descriptionForeground, var(--vscode-text-dim, #9d9d9d));
      margin-right: 8px;
    }

    .log-level {
      font-weight: bold;
      margin-right: 8px;
    }

    .log-level.error {
      color: var(--vscode-errorForeground, #f14c4c);
    }

    .log-level.warn {
      color: var(--vscode-editorWarning-foreground, #cca700);
    }

    .log-level.info {
      color: var(--vscode-editorInfo-foreground, #3794ff);
    }

    .log-level.debug {
      color: var(--vscode-descriptionForeground, var(--vscode-text-dim, #9d9d9d));
    }

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 200px;
      color: var(--vscode-descriptionForeground, var(--vscode-text-dim, #9d9d9d));
    }

    .error {
      padding: 40px;
      text-align: center;
      color: var(--vscode-errorForeground, #f14c4c);
    }

    .no-logs {
      padding: 40px;
      text-align: center;
      color: var(--vscode-descriptionForeground, var(--vscode-text-dim, #9d9d9d));
    }

    /* Scrollbar styling */
    .content::-webkit-scrollbar {
      width: 10px;
    }

    .content::-webkit-scrollbar-track {
      background: var(--vscode-scrollbarSlider-background, transparent);
    }

    .content::-webkit-scrollbar-thumb {
      background: var(--vscode-scrollbarSlider-background, rgba(121, 121, 121, 0.4));
      border-radius: 4px;
    }

    .content::-webkit-scrollbar-thumb:hover {
      background: var(--vscode-scrollbarSlider-hoverBackground, rgba(100, 100, 100, 0.7));
    }
  `;

  @property({ type: Boolean, reflect: true }) show = false;
  @property({ type: String }) override title = 'Logs';
  @property({ type: String }) subtitle = '';
  @property({ type: String }) logs = '';
  @property({ type: Boolean }) loading = false;
  @property({ type: String }) error = '';
  @property({ type: Boolean }) autoScroll = true;
  @property({ type: Boolean }) showTimestamps = true;
  @property({ type: Boolean }) colorize = true;

  @state() private searchQuery = '';
  @state() private isFollowing = true;

  override render() {
    if (!this.show) {
      return null;
    }

    return html`
      <div class="drawer" part="drawer">
        <div class="drawer-header" part="header">
          <div>
            <div class="header-title">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M4 4h12v2H4zm0 3h12v2H4zm0 3h12v2H4zm0 3h8v2H4z"/>
              </svg>
              ${this.title}
            </div>
            ${this.subtitle ? html`
              <div class="header-subtitle">${this.subtitle}</div>
            ` : ''}
          </div>
          <button class="close-button" @click=${this.handleClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
        </div>

        <div class="controls" part="controls">
          <div class="search-container" part="search">
            <svg class="search-icon" viewBox="0 0 16 16" fill="currentColor">
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
            </svg>
            <input
              type="text"
              class="search-input"
              placeholder="Search logs..."
              .value=${this.searchQuery}
              @input=${this.handleSearch}
            />
          </div>

          <button
            class="control-button ${this.isFollowing ? 'active' : ''}"
            @click=${this.toggleFollow}
            ?disabled=${this.loading}
          >
            ${this.isFollowing ? html`
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 4v8m-4-4l4 4 4-4"/>
              </svg>
              Following
            ` : html`
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M6 6h4v4H6z"/>
              </svg>
              Paused
            `}
          </button>

          <button
            class="control-button"
            @click=${this.handleRefresh}
            ?disabled=${this.loading}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M13.65 2.35a8 8 0 1 0 0 11.3M13 2v4h-4"/>
            </svg>
            Refresh
          </button>

          <button
            class="control-button"
            @click=${this.clearLogs}
            ?disabled=${this.loading || !this.logs}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3 5h10M5 5V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5"/>
            </svg>
            Clear
          </button>
        </div>

        <div class="content" part="content" @scroll=${this.handleScroll}>
          ${this.loading ? html`
            <div class="loading">Loading logs...</div>
          ` : this.error ? html`
            <div class="error">
              <p>Error loading logs:</p>
              <p>${this.error}</p>
            </div>
          ` : !this.logs ? html`
            <div class="no-logs">No logs available</div>
          ` : this.renderLogs()}
        </div>
      </div>
    `;
  }

  private renderLogs() {
    const lines = this.logs.split('\n').filter(line => line.trim());
    const filteredLines = this.searchQuery
      ? lines.filter(line => line.toLowerCase().includes(this.searchQuery.toLowerCase()))
      : lines;

    return html`
      ${filteredLines.map(line => this.renderLogLine(line))}
    `;
  }

  private renderLogLine(line: string) {
    const isHighlighted = this.searchQuery && 
      line.toLowerCase().includes(this.searchQuery.toLowerCase());

    if (!this.colorize) {
      return html`<div class="log-line ${isHighlighted ? 'highlighted' : ''}">${line}</div>`;
    }

    // Parse log line for common patterns
    const timestampMatch = line.match(/^(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)/);
    const levelMatch = line.match(/\b(ERROR|WARN|WARNING|INFO|DEBUG|TRACE)\b/i);

    let content = line;
    const parts = [];

    if (this.showTimestamps && timestampMatch) {
      parts.push(html`<span class="log-timestamp">${timestampMatch[1]}</span>`);
      content = content.substring(timestampMatch[0].length);
    }

    if (levelMatch && levelMatch[1]) {
      const level = levelMatch[1].toLowerCase();
      const levelClass = level.includes('error') ? 'error' :
                        level.includes('warn') ? 'warn' :
                        level.includes('info') ? 'info' : 'debug';
      
      const beforeLevel = content.substring(0, content.indexOf(levelMatch[0]));
      const afterLevel = content.substring(content.indexOf(levelMatch[0]) + levelMatch[0].length);
      
      return html`
        <div class="log-line ${isHighlighted ? 'highlighted' : ''}">
          ${parts}
          ${beforeLevel}
          <span class="log-level ${levelClass}">${levelMatch[0]}</span>
          ${afterLevel}
        </div>
      `;
    }

    return html`
      <div class="log-line ${isHighlighted ? 'highlighted' : ''}">
        ${parts}
        ${content}
      </div>
    `;
  }

  private handleClose() {
    this.show = false;
    this.dispatchEvent(new CustomEvent('close', {
      bubbles: true,
      composed: true
    }));
  }

  private handleRefresh() {
    this.dispatchEvent(new CustomEvent('refresh', {
      bubbles: true,
      composed: true
    }));
  }

  private handleSearch(e: Event) {
    const input = e.target as HTMLInputElement;
    this.searchQuery = input.value;
  }

  private toggleFollow() {
    this.isFollowing = !this.isFollowing;
    if (this.isFollowing && this.autoScroll) {
      this.scrollToBottom();
    }
  }

  private clearLogs() {
    this.logs = '';
    this.searchQuery = '';
  }

  private handleScroll(e: Event) {
    const container = e.target as HTMLElement;
    const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 10;
    
    if (!isAtBottom && this.isFollowing) {
      this.isFollowing = false;
    }
  }

  private scrollToBottom() {
    const content = this.shadowRoot?.querySelector('.content');
    if (content) {
      content.scrollTop = content.scrollHeight;
    }
  }

  override updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);
    
    if (changedProperties.has('logs') && this.isFollowing && this.autoScroll) {
      // Scroll to bottom when new logs are added
      setTimeout(() => this.scrollToBottom(), 0);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'logs-drawer': LogsDrawer;
  }
}
