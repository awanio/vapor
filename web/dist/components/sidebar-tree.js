var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { html, css } from 'lit';
import { property, state } from 'lit/decorators.js';
import { i18n, t } from '../i18n';
import { I18nLitElement } from '../i18n-mixin';
import { $expandedItems, $activeItem, toggleExpanded, setActiveItem, isExpanded as isItemExpanded, getExpandedItemsArray } from '../stores/shared/sidebar';
export class SidebarTree extends I18nLitElement {
    constructor() {
        super(...arguments);
        this.collapsed = false;
        this.activeItemId = 'dashboard';
        this.expandedItemsArray = [];
        this.translationsLoaded = false;
        this.storeUnsubscribers = [];
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
                route: 'network',
                children: [
                    {
                        id: 'network-interfaces',
                        label: 'network.interfaces',
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
                        route: 'docker'
                    }
                ]
            },
            {
                id: 'kubernetes',
                label: 'nav.kubernetes',
                icon: 'kubernetes',
                route: 'kubernetes',
                children: [
                    {
                        id: 'kubernetes-workloads',
                        label: 'kubernetes.workloads',
                        icon: 'workload',
                        route: 'kubernetes/workloads'
                    },
                    {
                        id: 'kubernetes-networks',
                        label: 'kubernetes.networks',
                        icon: 'k8s-networks',
                        route: 'kubernetes/networks'
                    },
                    {
                        id: 'kubernetes-storage',
                        label: 'kubernetes.storages',
                        icon: 'k8s-storage',
                        route: 'kubernetes/storage'
                    },
                    {
                        id: 'kubernetes-configurations',
                        label: 'kubernetes.configurations',
                        icon: 'configurations',
                        route: 'kubernetes/configurations'
                    },
                    {
                        id: 'kubernetes-nodes',
                        label: 'kubernetes.nodes',
                        icon: 'nodes',
                        route: 'kubernetes/nodes'
                    },
                    {
                        id: 'kubernetes-crds',
                        label: 'kubernetes.crds',
                        icon: 'crds',
                        route: 'kubernetes/crds'
                    },
                    {
                        id: 'kubernetes-helm',
                        label: 'kubernetes.helms',
                        icon: 'helm',
                        route: 'kubernetes/helm'
                    }
                ]
            },
            {
                id: 'virtualization',
                label: 'nav.virtualization',
                icon: 'virtualization',
                route: 'virtualization',
                children: [
                    {
                        id: 'virtualization-vms',
                        label: 'virtualization.vms',
                        icon: 'vms',
                        route: 'virtualization/vms'
                    },
                    {
                        id: 'virtualization-storage-pools',
                        label: 'virtualization.storage-pools',
                        icon: 'storage-pools',
                        route: 'virtualization/storage-pools'
                    },
                    {
                        id: 'virtualization-iso-images',
                        label: 'virtualization.iso-images',
                        icon: 'images',
                        route: 'virtualization/iso-images'
                    },
                    {
                        id: 'virtualization-networks',
                        label: 'virtualization.networks',
                        icon: 'virt-networks',
                        route: 'virtualization/networks'
                    }
                ]
            },
            {
                id: 'ansible',
                label: 'nav.ansible',
                icon: 'ansible',
                route: 'ansible',
                children: [
                    {
                        id: 'ansible-playbooks',
                        label: 'ansible.playbooks',
                        icon: 'playbooks',
                        route: 'ansible/playbooks'
                    },
                    {
                        id: 'ansible-inventory',
                        label: 'ansible.inventory',
                        icon: 'inventory',
                        route: 'ansible/inventory'
                    },
                    {
                        id: 'ansible-executions',
                        label: 'ansible.executions',
                        icon: 'executions',
                        route: 'ansible/executions'
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
        this.handlePopState = () => {
            const path = window.location.pathname.slice(1);
            if (path) {
                const item = this.findNavItemByRoute(path);
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
            toggleExpanded(item.id);
        }
        else if (item.route) {
            setActiveItem(item.id);
            const [path, queryString] = item.route.split('?');
            const queryParams = queryString ? new URLSearchParams(queryString) : null;
            const url = path === 'dashboard' ? '/' : `/${item.route}`;
            window.history.pushState({ route: path, queryParams }, '', url);
            this.dispatchEvent(new CustomEvent('navigate', {
                detail: { route: path, item, queryParams },
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
            if (!this.expandedItemsArray.includes(item.id)) {
                this.expandedItemsArray = [...this.expandedItemsArray, item.id];
            }
        }
        else if (event.key === 'ArrowLeft' && item.children) {
            event.preventDefault();
            if (this.expandedItemsArray.includes(item.id)) {
                this.expandedItemsArray = this.expandedItemsArray.filter(id => id !== item.id);
            }
        }
    }
    getTranslation(key) {
        if (!i18n.isInitialized()) {
            const parts = key.split('.');
            return parts[parts.length - 1] || key;
        }
        return t(key) || key;
    }
    renderNavItem(item) {
        const hasChildren = item.children && item.children.length > 0;
        const isExpanded = isItemExpanded(item.id);
        const isActive = this.isItemActive(item);
        const renderIcon = () => {
            if (item.icon === 'kubernetes') {
                return html `
          <span class="tree-item-icon">
            <img src="/icons/tech/kubernetes.svg" alt="Kubernetes" width="16" height="16" />
          </span>
        `;
            }
            else if (item.icon === 'ansible') {
                return html `
          <span class="tree-item-icon">
            <img src="/icons/tech/ansible.svg" alt="Ansible" width="16" height="16" />
          </span>
        `;
            }
            else if (item.icon === 'docker') {
                return html `
          <span class="tree-item-icon">
            <img src="/icons/tech/docker.svg" alt="Docker" width="16" height="16" />
          </span>
        `;
            }
            else if (item.icon === 'dashboard') {
                return html `
          <span class="tree-item-icon">
            <img src="/icons/tech/dashboard.svg" alt="Dashboard" width="16" height="16" />
          </span>
        `;
            }
            else if (item.icon === 'helm') {
                return html `
          <span class="tree-item-icon">
            <img src="/icons/tech/helm.svg" alt="Helm" width="16" height="16" />
          </span>
        `;
            }
            else {
                return html `<span class="tree-item-icon icon-${item.icon}"></span>`;
            }
        };
        return html `
      <li>
        <div
          class="tree-item ${isActive ? 'active' : ''}"
          @click=${(e) => this.handleItemClick(item, e)}
          @keydown=${(e) => this.handleKeyDown(item, e)}
          title=${this.collapsed ? this.getTranslation(item.label) : ''}
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
          ${renderIcon()}
          <span class="tree-item-label">${this.getTranslation(item.label)}</span>
        </div>
        ${hasChildren && isExpanded && !this.collapsed ? html `
          <ul class="tree-children">
            ${item.children.map(child => this.renderNavItem(child))}
          </ul>
        ` : ''}
      </li>
    `;
    }
    async connectedCallback() {
        super.connectedCallback();
        await i18n.init();
        this.translationsLoaded = true;
        const unsubscribeExpanded = $expandedItems.subscribe(() => {
            this.expandedItemsArray = getExpandedItemsArray();
            this.requestUpdate();
        });
        const unsubscribeActive = $activeItem.subscribe((activeId) => {
            this.activeItemId = activeId;
            this.requestUpdate();
        });
        this.storeUnsubscribers.push(unsubscribeExpanded, unsubscribeActive);
        this.expandedItemsArray = getExpandedItemsArray();
        this.activeItemId = $activeItem.get();
        const path = window.location.pathname.slice(1);
        if (!path || path === '') {
            setActiveItem('dashboard');
        }
        else {
            const item = this.findNavItemByRoute(path);
            if (item) {
                setActiveItem(item.id);
            }
            else {
                setActiveItem('dashboard');
            }
        }
        window.addEventListener('popstate', this.handlePopState);
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        window.removeEventListener('popstate', this.handlePopState);
        this.storeUnsubscribers.forEach(unsubscribe => unsubscribe());
        this.storeUnsubscribers = [];
    }
    findNavItemByRoute(route) {
        const findInItems = (items) => {
            for (const item of items) {
                if (item.route === route) {
                    return item;
                }
                if (item.route && route.startsWith(item.route + '/')) {
                    return item;
                }
                if (item.children) {
                    const found = findInItems(item.children);
                    if (found)
                        return found;
                }
            }
            return null;
        };
        return findInItems(this.navigationItems);
    }
    isItemActive(item) {
        if (item.children && item.children.length > 0) {
            return false;
        }
        return this.activeItemId === item.id;
    }
    render() {
        if (!this.translationsLoaded) {
            return html ``;
        }
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

    .tree-item-icon img {
      width: 16px;
      height: 16px;
      filter: brightness(0.9);
    }

    .tree-item:hover .tree-item-icon img {
      filter: brightness(1.1);
    }

    .tree-item.active .tree-item-icon img {
      filter: brightness(1.2) saturate(1.5);
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
    .icon-kubernetes::before { content: '☸️'; }
    .icon-workload::before { content: '⚙️'; }
    .icon-k8s-networks::before { content: '🔗'; }
    .icon-k8s-storage::before { content: '💾'; }
    .icon-configurations::before { content: '⚙️'; }
    .icon-nodes::before { content: '🖥️'; }
    .icon-crds::before { content: '📋'; }
    .icon-helm::before { content: '⛵'; }
    .icon-users::before { content: '👥'; }
    .icon-ansible::before { content: '🔧'; }
    .icon-playbooks::before { content: '📄'; }
    .icon-inventory::before { content: '📋'; }
    .icon-executions::before { content: '▶️'; }
    .icon-virtualization::before { content: '🖥️'; }
    .icon-vms::before { content: '💻'; }
    .icon-storage-pools::before { content: '🗄️'; }
    .icon-virt-networks::before { content: '🔗'; }

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
    state()
], SidebarTree.prototype, "activeItemId", void 0);
__decorate([
    state()
], SidebarTree.prototype, "expandedItemsArray", void 0);
__decorate([
    state()
], SidebarTree.prototype, "translationsLoaded", void 0);
customElements.define('sidebar-tree', SidebarTree);
//# sourceMappingURL=sidebar-tree.js.map