import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import './ansible/ansible-playbooks';
import './ansible/ansible-inventory';
import './ansible/ansible-executions';

@customElement('ansible-tab')
export class AnsibleTab extends LitElement {
  @property({ type: String })
  subRoute: string | null = null;

  @state()
  private activeTab = 'playbooks';

  static override styles = css`
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

  override connectedCallback() {
    super.connectedCallback();
    this.updateActiveTab();
    window.addEventListener('popstate', this.handleLocationChange);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('popstate', this.handleLocationChange);
  }

  override updated(changedProperties: Map<string, any>) {
    if (changedProperties.has('subRoute')) {
      this.updateActiveTab();
    }
  }

  private updateActiveTab() {
    // First check the subRoute property
    if (this.subRoute) {
      if (this.subRoute === 'inventory') {
        this.activeTab = 'inventory';
      } else if (this.subRoute === 'executions') {
        this.activeTab = 'executions';
      } else if (this.subRoute === 'playbooks') {
        this.activeTab = 'playbooks';
      } else if (this.subRoute === 'templates') {
        this.activeTab = 'templates';
      }
    } else {
      // Fallback to checking the URL path
      const path = window.location.pathname;
      if (path.includes('/ansible/templates')) {
        this.activeTab = 'templates';
      } else if (path.includes('/ansible/inventory')) {
        this.activeTab = 'inventory';
      } else if (path.includes('/ansible/executions')) {
        this.activeTab = 'executions';
      } else {
        this.activeTab = 'playbooks';
      }
    }
  }

  private handleLocationChange = () => {
    this.updateActiveTab();
  };

  override render() {
    // Use activeTab state instead of subRoute
    return html`
      <div class="ansible-content">
        <div class="tab-content">
          ${this.activeTab === 'playbooks' || this.activeTab === 'templates' ? html`
            <ansible-playbooks .initialTab=${this.activeTab}></ansible-playbooks>
          ` : ''}
          ${this.activeTab === 'inventory' ? html`
            <ansible-inventory></ansible-inventory>
          ` : ''}
          ${this.activeTab === 'executions' ? html`
            <ansible-executions></ansible-executions>
          ` : ''}
        </div>
      </div>
    `;
  }
}
