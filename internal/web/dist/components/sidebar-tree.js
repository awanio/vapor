var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { html, css } from 'lit';
import { property } from 'lit/decorators.js';
import { t } from '../i18n';
import { I18nLitElement } from '../i18n-mixin';
export class SidebarTree extends I18nLitElement {
    constructor() {
        super(...arguments);
        this.collapsed = false;
        this.activeItemId = 'dashboard';
        this.expandedItems = new Set(['network']);
        this.navigationItems = [
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
        this.handlePopState = () => {
            const path = window.location.pathname.slice(1);
            if (path) {
                const item = this.navigationItems.find(navItem => navItem.route === path);
                if (item) {
                    this.activeItemId = item.id;
                    this.requestUpdate();
                }
            }
        };
    }
    handleItemClick(item, event) {
        event.stopPropagation();
        if (item.children) {
            if (this.expandedItems.has(item.id)) {
                this.expandedItems.delete(item.id);
            }
            else {
                this.expandedItems.add(item.id);
            }
            this.requestUpdate();
        }
        else if (item.route) {
            this.activeItemId = item.id;
            const url = item.route === 'dashboard' ? '/' : `/${item.route}`;
            window.history.pushState({ route: item.route }, '', url);
            this.dispatchEvent(new CustomEvent('navigate', {
                detail: { route: item.route, item },
                bubbles: true,
                composed: true
            }));
        }
    }
    handleKeyDown(item, event) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            this.handleItemClick(item, event);
        }
        else if (event.key === 'ArrowRight' && item.children) {
            event.preventDefault();
            if (!this.expandedItems.has(item.id)) {
                this.expandedItems.add(item.id);
                this.requestUpdate();
            }
        }
        else if (event.key === 'ArrowLeft' && item.children) {
            event.preventDefault();
            if (this.expandedItems.has(item.id)) {
                this.expandedItems.delete(item.id);
                this.requestUpdate();
            }
        }
    }
    renderNavItem(item) {
        const hasChildren = item.children && item.children.length > 0;
        const isExpanded = this.expandedItems.has(item.id);
        const isActive = this.activeItemId === item.id;
        return html `
      <li>
        <div
          class="tree-item ${isActive ? 'active' : ''}"
          @click=${(e) => this.handleItemClick(item, e)}
          @keydown=${(e) => this.handleKeyDown(item, e)}
          title=${this.collapsed ? t(item.label) : ''}
          tabindex="0"
          role="treeitem"
          aria-expanded=${hasChildren ? isExpanded : undefined}
          aria-selected=${isActive}
        >
          ${hasChildren ? html `
            <span class="tree-item-arrow ${isExpanded ? 'expanded' : ''}">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M6 4l4 4-4 4z"/>
              </svg>
            </span>
          ` : html `<span class="tree-item-arrow"></span>`}
          <span class="tree-item-icon icon-${item.icon}"></span>
          <span class="tree-item-label">${t(item.label)}</span>
        </div>
        ${hasChildren && isExpanded && !this.collapsed ? html `
          <ul class="tree-children">
            ${item.children.map(child => this.renderNavItem(child))}
          </ul>
        ` : ''}
      </li>
    `;
    }
    connectedCallback() {
        super.connectedCallback();
        const path = window.location.pathname.slice(1);
        if (!path || path === '') {
            this.activeItemId = 'dashboard';
        }
        else {
            const item = this.navigationItems.find(navItem => navItem.route === path);
            if (item) {
                this.activeItemId = item.id;
            }
            else {
                this.activeItemId = '';
            }
        }
        window.addEventListener('popstate', this.handlePopState);
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        window.removeEventListener('popstate', this.handlePopState);
    }
    render() {
        return html `
      <ul class="tree" role="tree">
        ${this.navigationItems.map(item => this.renderNavItem(item))}
      </ul>
    `;
    }
}
SidebarTree.styles = css `
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
__decorate([
    property({ type: Boolean })
], SidebarTree.prototype, "collapsed", void 0);
__decorate([
    property({ type: String })
], SidebarTree.prototype, "activeItemId", void 0);
__decorate([
    property({ type: Object })
], SidebarTree.prototype, "expandedItems", void 0);
customElements.define('sidebar-tree', SidebarTree);
//# sourceMappingURL=sidebar-tree.js.map