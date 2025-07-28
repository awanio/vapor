import { LitElement, html, css, property } from 'lit';
import type { Tab } from '../types/system';

export class TabBar extends LitElement {
  @property({ type: Array }) tabs: Tab[] = [];
  @property({ type: String }) activeTabId = '';

  static styles = css`
    :host {
      display: block;
      background-color: var(--vscode-bg-lighter);
      border-bottom: 1px solid var(--vscode-border);
      overflow-x: auto;
      scrollbar-width: thin;
    }

    .tab-container {
      display: flex;
      height: 35px;
      align-items: stretch;
    }

    .tab {
      display: flex;
      align-items: center;
      padding: 0 12px;
      background-color: var(--vscode-tab);
      color: var(--vscode-text-dim);
      border-right: 1px solid var(--vscode-border);
      cursor: pointer;
      user-select: none;
      position: relative;
      min-width: 120px;
      max-width: 200px;
      font-size: 13px;
    }

    .tab:hover {
      color: var(--vscode-text);
    }

    .tab.active {
      background-color: var(--vscode-tab-active);
      color: var(--vscode-text);
    }

    .tab.active::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 2px;
      background-color: var(--vscode-accent);
    }

    .tab-label {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin-right: 8px;
    }

    .tab-close {
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 3px;
      opacity: 0;
      transition: opacity 0.2s;
    }

    .tab:hover .tab-close,
    .tab.active .tab-close {
      opacity: 0.7;
    }

    .tab-close:hover {
      opacity: 1;
      background-color: var(--vscode-bg-light);
    }

    .tab-close svg {
      width: 14px;
      height: 14px;
    }

    .tab-add {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      cursor: pointer;
      color: var(--vscode-text-dim);
    }

    .tab-add:hover {
      background-color: var(--vscode-bg-light);
      color: var(--vscode-text);
    }

    /* Scrollbar styling */
    :host::-webkit-scrollbar {
      height: 3px;
    }

    :host::-webkit-scrollbar-track {
      background: transparent;
    }

    :host::-webkit-scrollbar-thumb {
      background: var(--vscode-border);
      border-radius: 3px;
    }

    :host::-webkit-scrollbar-thumb:hover {
      background: var(--vscode-text-dim);
    }
  `;

  private handleTabClick(tab: Tab) {
    if (this.activeTabId !== tab.id) {
      this.activeTabId = tab.id;
      this.dispatchEvent(new CustomEvent('tab-change', {
        detail: { tab },
        bubbles: true,
        composed: true
      }));
    }
  }

  private handleTabClose(tab: Tab, event: Event) {
    event.stopPropagation();
    
    if (tab.closable !== false) {
      this.dispatchEvent(new CustomEvent('tab-close', {
        detail: { tab },
        bubbles: true,
        composed: true
      }));
    }
  }

  private handleAddTab() {
    this.dispatchEvent(new CustomEvent('tab-add', {
      bubbles: true,
      composed: true
    }));
  }

  render() {
    return html`
      <div class="tab-container">
        ${this.tabs.map(tab => html`
          <div
            class="tab ${this.activeTabId === tab.id ? 'active' : ''}"
            @click=${() => this.handleTabClick(tab)}
            title=${tab.label}
          >
            <span class="tab-label">${tab.label}</span>
            ${tab.closable !== false ? html`
              <span class="tab-close" @click=${(e: Event) => this.handleTabClose(tab, e)}>
                <svg viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.707.708L7.293 8l-3.647 3.646.708.708L8 8.707z"/>
                </svg>
              </span>
            ` : ''}
          </div>
        `)}
        <div class="tab-add" @click=${this.handleAddTab} title="New Tab">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5"/>
          </svg>
        </div>
      </div>
    `;
  }
}

customElements.define('tab-bar', TabBar);
