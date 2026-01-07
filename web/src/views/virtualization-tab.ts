import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import './virtualization/virtualization-vms-enhanced';
import './virtualization/virtualization-storage-pools';
import './virtualization/virtualization-networks';
import './virtualization/iso-management';
import './virtualization/virtualization-volumes';
import './virtualization/virtualization-backups';

/**
 * Virtualization Tab component that routes to specific Virtualization views
 */
@customElement('virtualization-tab')
export class VirtualizationTab extends LitElement {
  static override styles = css`
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

  @property({ type: String }) subRoute: string | null = null;
  @property({ type: String }) activeView = 'vms';

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
      const validViews = ['vms', 'storage-pools', 'networks', 'iso-images', 'volumes', 'backups'];
      if (validViews.includes(this.subRoute)) {
        this.activeView = this.subRoute;
      }
    } else {
      // Check URL path as fallback
      const path = window.location.pathname;
      if (path.includes('/virtualization/')) {
        const view = path.split('/virtualization/')[1]?.split('/')[0];
        if (view && ['vms', 'storage-pools', 'networks', 'iso-images', 'volumes', 'backups'].includes(view)) {
          this.activeView = view;
        }
      }
    }
  }

  override render() {
    return html`
      <div class="virtualization-container">
        <div class="view-container">
          ${this.renderActiveView()}
        </div>
      </div>
    `;
  }

  private renderActiveView() {
    switch (this.activeView) {
      case 'vms':
        return html`<virtualization-vms-enhanced></virtualization-vms-enhanced>`;
      case 'storage-pools':
        return html`<virtualization-storage-pools></virtualization-storage-pools>`;
      case 'networks':
        return html`<virtualization-networks></virtualization-networks>`;
      case 'iso-images':
        return html`<iso-management></iso-management>`;
      case 'volumes':
        return html`<virtualization-volumes></virtualization-volumes>`;
      case 'backups':
        return html`<virtualization-backups></virtualization-backups>`;
      default:
        return html`
          <div class="error-message">
            <h2>Invalid Virtualization View</h2>
            <p>The requested view "${this.activeView}" is not available.</p>
          </div>
        `;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'virtualization-tab': VirtualizationTab;
  }
}
