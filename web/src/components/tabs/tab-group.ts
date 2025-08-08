import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export interface Tab {
  id: string;
  label: string;
  icon?: string;
}

@customElement('tab-group')
export class TabGroup extends LitElement {
  @property({ type: Array }) tabs: Tab[] = [];
  @property({ type: String }) activeTab = '';

  static override styles = css`
    .tab-header {
      display: flex;
      border-bottom: 2px solid var(--border-color);
      margin-bottom: 1rem;
    }

    .tab-button {
      padding: 0.75rem 1.5rem;
      background: none;
      border: none;
      cursor: pointer;
      font-size: 0.875rem;
      color: var(--text-secondary);
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .tab-button:hover {
      color: var(--text-primary);
    }

    .tab-button.active {
      color: var(--primary);
      border-bottom-color: var(--primary);
    }

    .tab-icon {
      font-size: 1rem;
    }
  `;

  private handleTabClick(tab: Tab) {
    this.activeTab = tab.id;
    this.dispatchEvent(new CustomEvent('tab-change', {
      detail: { tabId: tab.id },
      bubbles: true,
      composed: true
    }));
  }

  override render() {
    return html`
      <div class="tab-header">
        ${this.tabs.map(tab => html`
          <button 
            class="tab-button ${this.activeTab === tab.id ? 'active' : ''}"
            @click=${() => this.handleTabClick(tab)}
          >
            ${tab.icon ? html`<span class="tab-icon">${tab.icon}</span>` : ''}
            ${tab.label}
          </button>
        `)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tab-group': TabGroup;
  }
}
