var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import './virtualization/virtualization-vms-enhanced';
import './virtualization/virtualization-storage-pools';
import './virtualization/virtualization-networks';
import './virtualization/iso-management';
let VirtualizationTab = class VirtualizationTab extends LitElement {
    constructor() {
        super(...arguments);
        this.subRoute = null;
        this.activeView = 'vms';
    }
    connectedCallback() {
        super.connectedCallback();
        this.updateActiveView();
    }
    updated(changedProperties) {
        super.updated(changedProperties);
        if (changedProperties.has('subRoute')) {
            this.updateActiveView();
        }
    }
    updateActiveView() {
        if (this.subRoute) {
            const validViews = ['vms', 'storage-pools', 'networks', 'iso-images'];
            if (validViews.includes(this.subRoute)) {
                this.activeView = this.subRoute;
            }
        }
        else {
            const path = window.location.pathname;
            if (path.includes('/virtualization/')) {
                const view = path.split('/virtualization/')[1]?.split('/')[0];
                if (view && ['vms', 'storage-pools', 'networks', 'iso-images'].includes(view)) {
                    this.activeView = view;
                }
            }
        }
    }
    render() {
        return html `
      <div class="virtualization-container">
        <div class="view-container">
          ${this.renderActiveView()}
        </div>
      </div>
    `;
    }
    renderActiveView() {
        switch (this.activeView) {
            case 'vms':
                return html `<virtualization-vms-enhanced></virtualization-vms-enhanced>`;
            case 'storage-pools':
                return html `<virtualization-storage-pools></virtualization-storage-pools>`;
            case 'networks':
                return html `<virtualization-networks></virtualization-networks>`;
            case 'iso-images':
                return html `<iso-management></iso-management>`;
            default:
                return html `
          <div class="error-message">
            <h2>Invalid Virtualization View</h2>
            <p>The requested view "${this.activeView}" is not available.</p>
          </div>
        `;
        }
    }
};
VirtualizationTab.styles = css `
    :host {
      display: block;
      height: 100%;
      width: 100%;
    }

    .virtualization-container {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .view-container {
      flex: 1;
      overflow: hidden;
    }

    .error-message {
      text-align: center;
      padding: 40px;
      color: var(--text-secondary);
    }
  `;
__decorate([
    property({ type: String })
], VirtualizationTab.prototype, "subRoute", void 0);
__decorate([
    property({ type: String })
], VirtualizationTab.prototype, "activeView", void 0);
VirtualizationTab = __decorate([
    customElement('virtualization-tab')
], VirtualizationTab);
export { VirtualizationTab };
//# sourceMappingURL=virtualization-tab.js.map