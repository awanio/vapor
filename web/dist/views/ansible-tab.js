var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import './ansible/ansible-playbooks';
import './ansible/ansible-inventory';
import './ansible/ansible-executions';
let AnsibleTab = class AnsibleTab extends LitElement {
    constructor() {
        super(...arguments);
        this.subRoute = null;
        this.activeTab = 'playbooks';
        this.handleLocationChange = () => {
            this.updateActiveTab();
        };
    }
    connectedCallback() {
        super.connectedCallback();
        this.updateActiveTab();
        window.addEventListener('popstate', this.handleLocationChange);
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        window.removeEventListener('popstate', this.handleLocationChange);
    }
    updated(changedProperties) {
        if (changedProperties.has('subRoute')) {
            this.updateActiveTab();
        }
    }
    updateActiveTab() {
        if (this.subRoute) {
            if (this.subRoute === 'inventory') {
                this.activeTab = 'inventory';
            }
            else if (this.subRoute === 'executions') {
                this.activeTab = 'executions';
            }
            else if (this.subRoute === 'playbooks') {
                this.activeTab = 'playbooks';
            }
            else if (this.subRoute === 'templates') {
                this.activeTab = 'templates';
            }
        }
        else {
            const path = window.location.pathname;
            if (path.includes('/ansible/templates')) {
                this.activeTab = 'templates';
            }
            else if (path.includes('/ansible/inventory')) {
                this.activeTab = 'inventory';
            }
            else if (path.includes('/ansible/executions')) {
                this.activeTab = 'executions';
            }
            else {
                this.activeTab = 'playbooks';
            }
        }
    }
    render() {
        return html `
      <div class="ansible-content">
        <div class="tab-content">
          ${this.activeTab === 'playbooks' || this.activeTab === 'templates' ? html `
            <ansible-playbooks .initialTab=${this.activeTab}></ansible-playbooks>
          ` : ''}
          ${this.activeTab === 'inventory' ? html `
            <ansible-inventory></ansible-inventory>
          ` : ''}
          ${this.activeTab === 'executions' ? html `
            <ansible-executions></ansible-executions>
          ` : ''}
        </div>
      </div>
    `;
    }
};
AnsibleTab.styles = css `
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    .ansible-content {
      flex: 1;
      overflow: auto;
      display: flex;
      flex-direction: column;
    }

    .tab-content {
      flex: 1;
      overflow: auto;
    }
  `;
__decorate([
    property({ type: String })
], AnsibleTab.prototype, "subRoute", void 0);
__decorate([
    state()
], AnsibleTab.prototype, "activeTab", void 0);
AnsibleTab = __decorate([
    customElement('ansible-tab')
], AnsibleTab);
export { AnsibleTab };
//# sourceMappingURL=ansible-tab.js.map