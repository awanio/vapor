import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';
import { t } from '../i18n';
import type { NavItem } from '../types/system';

export class SidebarTree extends LitElement {
  @property({ type: Boolean }) collapsed = false;
  @property({ type: String }) activeItemId = 'dashboard';
  @property({ type: Object }) expandedItems: Set<string> = new Set(['network']);

  static styles = css`
    :host {
      display: block;
      height: 100%;
      background-color: var(--vscode-sidebar);
      color: var(--vscode-text);
      border-right: 1px solid var(--vscode-border);
      overflow-y: auto;
      user-select: none;
    }

    .tree {
      padding: 20px 0 0 0;
      margin: 0;
      list-style: none;
    }

    .tree-item {
      display: flex;
      align-items: center;
      padding: 6px 12px;
      cursor: pointer;
      position: relative;
      font-size: 13px;
    }

    .tree-item:hover {
      background-color: var(--vscode-sidebar-hover);
    }

    .tree-item.active {
      background-color: var(--vscode-sidebar-active);
    }

    .tree-item-icon {
      width: 16px;
      height: 16px;
      margin-right: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .tree-item-label {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .tree-item-arrow {
      width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s;
    }

    .tree-item-arrow.expanded {
      transform: rotate(90deg);
    }

    .tree-children {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .tree-children .tree-item {
      padding-left: 28px;
    }

    .tree-children .tree-children .tree-item {
      padding-left: 44px;
    }

    /* Icons */
    .icon-system::before { content: '💻'; }
    .icon-dashboard::before { content: '📊'; }
    .icon-logs::before { content: '📜'; }
    .icon-terminal::before { content: '⌨️'; }
    .icon-network::before { content: '🌐'; }
    .icon-interfaces::before { content: '🔌'; }
    .icon-bonding::before { content: '🔗'; }
    .icon-vlans::before { content: '🏷️'; }
    .icon-storage::before { content: '💾'; }
    .icon-disks::before { content: '💿'; }
    .icon-lvm::before { content: '📦'; }
    .icon-raid::before { content: '🗄️'; }
    .icon-containers::before { content: '📦'; }
    .icon-images::before { content: '💿'; }
    .icon-users::before { content: '👥'; }

    :host([collapsed]) .tree-item-label,
    :host([collapsed]) .tree-item-arrow,
    :host([collapsed]) .tree-children {
      display: none;
    }

    :host([collapsed]) .tree-item {
      padding: 8px;
      justify-content: center;
    }

    :host([collapsed]) .tree-item-icon {
      margin-right: 0;
    }
  `;

  private navigationItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'nav.dashboard',
      icon: 'dashboard',
      route: 'dashboard'
    },
    {
      id: 'network',
      label: 'nav.network',
      icon: 'network',
      route: 'network'
    },
    {
      id: 'storage',
      label: 'nav.storage',
      icon: 'storage',
      route: 'storage'
    },
    {
      id: 'containers',
      label: 'nav.containers',
      icon: 'containers',
      route: 'containers'
    },
    {
      id: 'logs',
      label: 'nav.logs',
      icon: 'logs',
      route: 'logs'
    },
    {
      id: 'terminal',
      label: 'nav.terminal',
      icon: 'terminal',
      route: 'terminal'
    },
    {
      id: 'users',
      label: 'nav.users',
      icon: 'users',
      route: 'users'
    }
  ];

  private handleItemClick(item: NavItem, event: Event) {
    event.stopPropagation();

    if (item.children) {
      // Toggle expanded state
      if (this.expandedItems.has(item.id)) {
        this.expandedItems.delete(item.id);
      } else {
        this.expandedItems.add(item.id);
      }
      this.requestUpdate();
    } else if (item.route) {
      // Navigate to route
      this.activeItemId = item.id;
      this.dispatchEvent(new CustomEvent('navigate', {
        detail: { route: item.route, item },
        bubbles: true,
        composed: true
      }));
    }
  }

  private renderNavItem(item: NavItem): any {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = this.expandedItems.has(item.id);
    const isActive = this.activeItemId === item.id;

    return html`
      <li>
        <div
          class="tree-item ${isActive ? 'active' : ''}"
          @click=${(e: Event) => this.handleItemClick(item, e)}
          title=${this.collapsed ? t(item.label) : ''}
        >
          ${hasChildren ? html`
            <span class="tree-item-arrow ${isExpanded ? 'expanded' : ''}">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M6 4l4 4-4 4z"/>
              </svg>
            </span>
          ` : html`<span class="tree-item-arrow"></span>`}
          <span class="tree-item-icon icon-${item.icon}"></span>
          <span class="tree-item-label">${t(item.label)}</span>
        </div>
        ${hasChildren && isExpanded && !this.collapsed ? html`
          <ul class="tree-children">
            ${item.children!.map(child => this.renderNavItem(child))}
          </ul>
        ` : ''}
      </li>
    `;
  }

  render() {
    return html`
      <ul class="tree">
        ${this.navigationItems.map(item => this.renderNavItem(item))}
      </ul>
    `;
  }
}

customElements.define('sidebar-tree', SidebarTree);
