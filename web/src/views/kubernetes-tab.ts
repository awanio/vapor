import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import './kubernetes/kubernetes-workloads';
import './kubernetes/kubernetes-networks';
import './kubernetes/kubernetes-storage';
import './kubernetes/kubernetes-configurations';
import './kubernetes/kubernetes-helm';
import './kubernetes/kubernetes-nodes';
import './kubernetes/kubernetes-crds';

/**
 * Kubernetes Tab component that routes to specific Kubernetes views
 */
@customElement('kubernetes-tab')
export class KubernetesTab extends LitElement {
  static override styles = css`
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

  @property({ type: String }) subRoute: string | null = null;
  @property({ type: String }) activeView = 'workloads';

  override connectedCallback() {
    super.connectedCallback();
    this.updateActiveView();
  }

  override updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);
    if (changedProperties.has('subRoute')) {
      this.updateActiveView();
    }
  }

  private updateActiveView() {
    if (this.subRoute) {
      const validViews = ['workloads', 'networks', 'storage', 'configurations', 'helm', 'nodes', 'crds'];
      if (validViews.includes(this.subRoute)) {
        this.activeView = this.subRoute;
      }
    } else {
      // Check URL path as fallback
      const path = window.location.pathname;
      if (path.includes('/kubernetes/')) {
        const view = path.split('/kubernetes/')[1]?.split('/')[0];
        if (view && ['workloads', 'networks', 'storage', 'configurations', 'helm', 'nodes', 'crds'].includes(view)) {
          this.activeView = view;
        }
      }
    }
  }

  override render() {
    return html`
      <div class="kubernetes-container">
        <div class="view-container">
          ${this.renderActiveView()}
        </div>
      </div>
    `;
  }

  private renderActiveView() {
    switch (this.activeView) {
      case 'workloads':
        return html`<kubernetes-workloads></kubernetes-workloads>`;
      case 'networks':
        return html`<kubernetes-networks></kubernetes-networks>`;
      case 'storage':
        return html`<kubernetes-storage></kubernetes-storage>`;
      case 'configurations':
        return html`<kubernetes-configurations></kubernetes-configurations>`;
      case 'helm':
        return html`<kubernetes-helm></kubernetes-helm>`;
      case 'nodes':
        return html`<kubernetes-nodes></kubernetes-nodes>`;
      case 'crds':
        return html`<kubernetes-crds></kubernetes-crds>`;
      default:
        return html`
          <div class="error-message">
            <h2>Invalid Kubernetes View</h2>
            <p>The requested view "${this.activeView}" is not available.</p>
          </div>
        `;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'kubernetes-tab': KubernetesTab;
  }
}
