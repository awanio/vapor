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
    }

    .drawer {
      width: 100%;
      height: 100%;
      background: var(--drawer-bg, #1a1d23);
      box-shadow: -2px 0 8px rgba(0, 0, 0, 0.3);
      display: flex;
      flex-direction: column;
      transform: translateX(100%);
      transition: transform 0.3s ease;
    }

    :host([show]) .drawer {
      transform: translateX(0);
    }

    .drawer-header {
      padding: 20px;
      background: var(--header-bg, #2c2f3a);
      border-bottom: 1px solid var(--header-border, #3a3d4a);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }

    .header-title {
      font-size: 18px;
      font-weight: 500;
      color: var(--title-color, #e0e0e0);
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .header-subtitle {
      font-size: 14px;
      color: var(--subtitle-color, #999);
      margin-top: 4px;
    }

    .close-button {
      background: none;
      border: none;
      color: var(--close-color, #999);
      cursor: pointer;
      padding: 8px;
      border-radius: 4px;
      transition: all 0.2s;
    }

    .close-button:hover {
      background: var(--close-hover-bg, rgba(255, 255, 255, 0.1));
      color: var(--close-hover-color, #e0e0e0);
    }

    .controls {
      padding: 16px 20px;
      background: var(--controls-bg, #2c2f3a);
      border-bottom: 1px solid var(--controls-border, #3a3d4a);
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
      background: var(--input-bg, #1a1d23);
      color: var(--input-color, #e0e0e0);
      border: 1px solid var(--input-border, #3a3d4a);
      border-radius: 4px;
      font-size: 14px;
      outline: none;
    }

    .search-input:focus {
      border-color: var(--input-focus-border, #4a7c59);
    }

    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      width: 16px;
      height: 16px;
      color: var(--search-icon-color, #999);
    }

    .control-button {
      background: var(--button-bg, #3a3d4a);
      color: var(--button-color, #e0e0e0);
      border: 1px solid var(--button-border, #4a4d5a);
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .control-button:hover {
      background: var(--button-hover-bg, #4a4d5a);
      border-color: var(--button-hover-border, #5a5d6a);
    }

    .control-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .control-button.active {
      background: var(--button-active-bg, #4a7c59);
      border-color: var(--button-active-border, #5a8c69);
    }

    .content {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 13px;
      line-height: 1.6;
      color: var(--log-color, #e0e0e0);
      background: var(--log-bg, #0d0f12);
    }

    .log-line {
      white-space: pre-wrap;
      word-break: break-all;
      margin: 0;
      padding: 4px 0;
    }

    .log-line:hover {
      background: var(--log-hover-bg, rgba(255, 255, 255, 0.05));
    }

    .log-line.highlighted {
      background: var(--log-highlight-bg, rgba(74, 124, 89, 0.3));
      border-left: 3px solid var(--log-highlight-border, #4a7c59);
      padding-left: 8px;
    }

    .log-timestamp {
      color: var(--timestamp-color, #666);
      margin-right: 8px;
    }

    .log-level {
      font-weight: bold;
      margin-right: 8px;
    }

    .log-level.error {
      color: var(--level-error, #f44336);
    }

    .log-level.warn {
      color: var(--level-warn, #ff9800);
    }

    .log-level.info {
      color: var(--level-info, #2196f3);
    }

    .log-level.debug {
      color: var(--level-debug, #9e9e9e);
    }

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 200px;
      color: var(--loading-color, #999);
    }

    .error {
      padding: 40px;
      text-align: center;
      color: var(--error-color, #f44336);
    }

    .no-logs {
      padding: 40px;
      text-align: center;
      color: var(--no-logs-color, #999);
    }

    /* Scrollbar styling */
    .content::-webkit-scrollbar {
      width: 8px;
    }

    .content::-webkit-scrollbar-track {
      background: var(--scrollbar-track, #1a1d23);
    }

    .content::-webkit-scrollbar-thumb {
      background: var(--scrollbar-thumb, #4a4d5a);
      border-radius: 4px;
    }

    .content::-webkit-scrollbar-thumb:hover {
      background: var(--scrollbar-thumb-hover, #5a5d6a);
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
