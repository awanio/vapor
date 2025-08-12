var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import './kubernetes/kubernetes-workloads';
import './kubernetes/kubernetes-networks';
import './kubernetes/kubernetes-storage';
import './kubernetes/kubernetes-configurations';
import './kubernetes/kubernetes-helm';
import './kubernetes/kubernetes-nodes';
import './kubernetes/kubernetes-crds';
let KubernetesTab = class KubernetesTab extends LitElement {
    constructor() {
        super(...arguments);
        this.subRoute = null;
        this.activeView = 'workloads';
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
            const validViews = ['workloads', 'networks', 'storage', 'configurations', 'helm', 'nodes', 'crds'];
            if (validViews.includes(this.subRoute)) {
                this.activeView = this.subRoute;
            }
        }
        else {
            const path = window.location.pathname;
            if (path.includes('/kubernetes/')) {
                const view = path.split('/kubernetes/')[1]?.split('/')[0];
                if (view && ['workloads', 'networks', 'storage', 'configurations', 'helm', 'nodes', 'crds'].includes(view)) {
                    this.activeView = view;
                }
            }
        }
    }
    render() {
        return html `
      <div class="kubernetes-container">
        <div class="view-container">
          ${this.renderActiveView()}
        </div>
      </div>
    `;
    }
    renderActiveView() {
        switch (this.activeView) {
            case 'workloads':
                return html `<kubernetes-workloads></kubernetes-workloads>`;
            case 'networks':
                return html `<kubernetes-networks></kubernetes-networks>`;
            case 'storage':
                return html `<kubernetes-storage></kubernetes-storage>`;
            case 'configurations':
                return html `<kubernetes-configurations></kubernetes-configurations>`;
            case 'helm':
                return html `<kubernetes-helm></kubernetes-helm>`;
            case 'nodes':
                return html `<kubernetes-nodes></kubernetes-nodes>`;
            case 'crds':
                return html `<kubernetes-crds></kubernetes-crds>`;
            default:
                return html `
          <div class="error-message">
            <h2>Invalid Kubernetes View</h2>
            <p>The requested view "${this.activeView}" is not available.</p>
          </div>
        `;
        }
    }
};
KubernetesTab.styles = css `
    :host {
      display: block;
      height: 100%;
      width: 100%;
    }

    .kubernetes-container {
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
], KubernetesTab.prototype, "subRoute", void 0);
__decorate([
    property({ type: String })
], KubernetesTab.prototype, "activeView", void 0);
KubernetesTab = __decorate([
    customElement('kubernetes-tab')
], KubernetesTab);
export { KubernetesTab };
//# sourceMappingURL=kubernetes-tab.js.map