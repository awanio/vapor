import { html, css } from 'lit';
import { property } from 'lit/decorators.js';
import { I18nLitElement } from '../i18n-mixin';

interface Tab {
  id: string;
  label: string;
  icon?: string;
  closable?: boolean;
}

export class TabBar extends I18nLitElement {
  @property({ type: Array }) tabs: Tab[] = [];
  @property({ type: String }) activeTab = '';

  static override styles = css`
    :host {
      display: block;
      background-color: transparent;
      border-bottom: 1px solid var(--cds-border-subtle);
      overflow-x: auto;
      scrollbar-width: none;
    }

    .tab-bar {
      display: flex;
      height: 48px;
      align-items: stretch;
    }

    .tab-container {
      display: flex;
      align-items: stretch;
      flex: 1;
    }

    .tab {
      display: flex;
      align-items: center;
      padding: 0 16px;
      background-color: transparent;
      color: var(--cds-text-secondary);
      border-right: none;
      border-bottom: 2px solid transparent;
      cursor: pointer;
      user-select: none;
      position: relative;
      min-width: 120px;
      max-width: 200px;
      font-size: 14px;
      letter-spacing: 0.16px;
      font-family: var(--cds-font-sans);
      transition: all 0.15s;
    }

    .tab:hover {
      color: var(--cds-text-primary);
      background-color: var(--vscode-sidebar-hover);
    }

    .tab.active {
      background-color: transparent;
      color: var(--cds-text-primary);
      font-weight: 600;
    }

    .tab.active::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 2px;
      background-color: var(--cds-interactive);
    }

    .tab-icon {
      margin-right: 8px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
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
      border-radius: 0;
      opacity: 0;
      transition: opacity 0.15s;
    }

    .tab:hover .tab-close,
    .tab.active .tab-close {
      opacity: 0.7;
    }

    .tab-close:hover {
      opacity: 1;
      background-color: var(--cds-layer-02);
    }

    .tab-close svg {
      width: 14px;
      height: 14px;
    }

    .tab-add {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      cursor: pointer;
      color: var(--cds-text-secondary);
      transition: background-color 0.15s;
    }

    .tab-add:hover {
      background-color: var(--vscode-sidebar-hover);
      color: var(--cds-text-primary);
    }

    /* Scrollbar styling */
    :host::-webkit-scrollbar {
      height: 0;
    }
  `;

  private handleTabClick(tab: Tab) {
    if (this.activeTab !== tab.id) {
      this.activeTab = tab.id;
      this.dispatchEvent(new CustomEvent('tab-change', {
        detail: { tabId: tab.id },
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

  private handleKeyDown(event: KeyboardEvent) {
    if (event.key !== 'ArrowRight') {
      return;
    }

    if (!this.tabs || this.tabs.length === 0) {
      return;
    }

    const currentIndex = this.tabs.findIndex(tab => tab.id === this.activeTab);
    const nextIndex = currentIndex >= 0 && currentIndex < this.tabs.length - 1
      ? currentIndex + 1
      : 0;

    const nextTab = this.tabs[nextIndex];
    if (!nextTab || nextTab.id === this.activeTab) {
      return;
    }

    this.activeTab = nextTab.id;
    this.dispatchEvent(new CustomEvent('tab-change', {
      detail: { tabId: nextTab.id },
      bubbles: true,
      composed: true
    }));
  }

  override render() {
    return html`
      <div class="tab-bar" @keydown=${this.handleKeyDown} tabindex="0">
        <div class="tab-container">
          ${this.tabs.map(tab => html`
            <div
              class="tab ${this.activeTab === tab.id ? 'active' : ''}"
              @click=${() => this.handleTabClick(tab)}
              title=${tab.label}
            >
              ${tab.icon ? html`<span class="tab-icon">${tab.icon}</span>` : ''}
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
      </div>
    `;
  }
}

customElements.define('tab-bar', TabBar);
