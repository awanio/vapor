import { html, css } from 'lit';
import { property } from 'lit/decorators.js';
import { t } from '../i18n';
import { I18nLitElement } from '../i18n-mixin';
import type { NavItem } from '../types/system';

export class SidebarTree extends I18nLitElement {
  @property({ type: Boolean }) collapsed = false;
  @property({ type: String }) activeItemId = 'dashboard';
  @property({ type: Object }) expandedItems: Set<string> = new Set(['network', 'storage']);

  static override styles = css`
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
      transition: all 0.15s ease;
      border-left: 3px solid transparent;
    }

    .tree-item:hover {
      background-color: var(--vscode-sidebar-hover);
      border-left-color: var(--vscode-text-dim);
    }

    .tree-item.active {
      background-color: var(--vscode-sidebar-active);
      border-left-color: var(--vscode-sidebar-active-border);
      color: var(--vscode-accent);
    }

    .tree-item.active .tree-item-icon {
      color: var(--vscode-accent);
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
    .icon-docker::before { content: '🐳'; }
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

    /* Focus styles for keyboard navigation */
    .tree-item:focus-visible {
      outline: 2px solid var(--vscode-accent);
      outline-offset: -2px;
    }

    /* Subtle animation on icon when hovering */
    .tree-item:hover .tree-item-icon {
      transform: translateX(2px);
      transition: transform 0.15s ease;
    }

    /* Child items styling */
    .tree-children .tree-item {
      font-size: 12px;
      opacity: 0.9;
    }

    .tree-children .tree-item.active {
      opacity: 1;
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
      route: 'network',
      children: [
        {
          id: 'network-interfaces',
          label: 'network.interface',
          icon: 'interfaces',
          route: 'network/interfaces'
        },
        {
          id: 'network-bridges',
          label: 'network.bridges',
          icon: 'bonding',
          route: 'network/bridges'
        },
        {
          id: 'network-bonds',
          label: 'network.bonds',
          icon: 'bonding',
          route: 'network/bonds'
        },
        {
          id: 'network-vlans',
          label: 'network.vlans',
          icon: 'vlans',
          route: 'network/vlans'
        }
      ]
    },
    {
      id: 'storage',
      label: 'nav.storage',
      icon: 'storage',
      route: 'storage',
      children: [
        {
          id: 'storage-disks',
          label: 'storage.disks.title',
          icon: 'disks',
          route: 'storage/disks'
        },
        {
          id: 'storage-lvm',
          label: 'storage.lvm.title',
          icon: 'lvm',
          route: 'storage/lvm'
        },
        {
          id: 'storage-raid',
          label: 'storage.raid.title',
          icon: 'raid',
          route: 'storage/raid'
        },
        {
          id: 'storage-iscsi',
          label: 'storage.iscsi.title',
          icon: 'storage',
          route: 'storage/iscsi'
        },
        {
          id: 'storage-multipath',
          label: 'storage.multipath.title',
          icon: 'storage',
          route: 'storage/multipath'
        },
        {
          id: 'storage-btrfs',
          label: 'storage.btrfs.title',
          icon: 'storage',
          route: 'storage/btrfs'
        }
      ]
    },
    {
      id: 'containers',
      label: 'nav.containers.title',
      icon: 'containers',
      route: 'containers',
      children: [
        {
          id: 'containers-cri',
          label: 'nav.containers.cri',
          icon: 'containers',
          route: 'containers/cri'
        },
        {
          id: 'containers-docker',
          label: 'nav.containers.docker',
          icon: 'docker',
          route: 'containers/docker'
        }
      ]
    },
    {
      id: 'logs',
      label: 'nav.logs',
      icon: 'logs',
      route: 'logs'
    },
    {
      id: 'users',
      label: 'nav.users',
      icon: 'users',
      route: 'users'
    },
    {
      id: 'terminal',
      label: 'nav.terminal',
      icon: 'terminal',
      route: 'terminal'
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

      // Parse route and query params
      const [path, queryString] = item.route.split('?');
      const queryParams = queryString ? new URLSearchParams(queryString) : null;
      
      // Update the URL without reloading the page
      const url = path === 'dashboard' ? '/' : `/${item.route}`;
      window.history.pushState({ route: path, queryParams }, '', url);

      // Dispatch a navigation event
      this.dispatchEvent(new CustomEvent('navigate', {
        detail: { route: path, item, queryParams },
        bubbles: true,
        composed: true
      }));
    }
  }

  private handleKeyDown(item: NavItem, event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.handleItemClick(item, event);
    } else if (event.key === 'ArrowRight' && item.children) {
      event.preventDefault();
      if (!this.expandedItems.has(item.id)) {
        this.expandedItems.add(item.id);
        this.requestUpdate();
      }
    } else if (event.key === 'ArrowLeft' && item.children) {
      event.preventDefault();
      if (this.expandedItems.has(item.id)) {
        this.expandedItems.delete(item.id);
        this.requestUpdate();
      }
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
          @keydown=${(e: KeyboardEvent) => this.handleKeyDown(item, e)}
          title=${this.collapsed ? t(item.label) : ''}
          tabindex="0"
          role="treeitem"
          aria-expanded=${hasChildren ? isExpanded : undefined}
          aria-selected=${isActive}
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

  override connectedCallback() {
    super.connectedCallback();
    this.expandedItems.add('containers');
    
    // Set activeItemId from URL on component mount
    const path = window.location.pathname.slice(1);
    if (!path || path === '') {
      this.activeItemId = 'dashboard';
    } else {
      const item = this.navigationItems.find(navItem => navItem.route === path);
      if (item) {
        this.activeItemId = item.id;
      } else {
        // Invalid route - no active item in sidebar
        this.activeItemId = '';
      }
    }
    
    // Listen for popstate to update active item
    window.addEventListener('popstate', this.handlePopState);
  }
  
  override disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('popstate', this.handlePopState);
  }
  
  private handlePopState = () => {
    const path = window.location.pathname.slice(1);
    if (path) {
      const item = this.navigationItems.find(navItem => navItem.route === path);
      if (item) {
        this.activeItemId = item.id;
        this.requestUpdate();
      }
    }
  };

  override render() {
    return html`
      <ul class="tree" role="tree">
        ${this.navigationItems.map(item => this.renderNavItem(item))}
      </ul>
    `;
  }
}

customElements.define('sidebar-tree', SidebarTree);
