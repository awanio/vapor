import { LitElement, html, css, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { KubernetesApi } from '../../services/kubernetes-api.js';
import '../kubernetes/pod-terminal.js';

@customElement('terminal-modal')
export class TerminalModal extends LitElement {
  @property({ type: Boolean }) show = false;
  @property({ type: String }) pod = '';
  @property({ type: String }) namespace = '';
  @property({ type: String }) container = '';

  @state() private containers: string[] = [];
  @state() private selectedContainer = '';
  @state() private loading = false;

  static override styles = css`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1000;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .modal-content {
      background: #1e1e1e;
      width: 90%;
      height: 90%;
      display: flex;
      flex-direction: column;
      border-radius: 4px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
      border: 1px solid #333;
    }
    .modal-header {
      padding: 10px 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #252526;
      border-bottom: 1px solid #333;
      color: #cccccc;
      font-size: 14px;
      font-weight: 500;
    }
    .header-left {
        display: flex;
        align-items: center;
        gap: 12px;
    }
    .modal-body {
      flex: 1;
      overflow: hidden;
      position: relative;
      background: #1e1e1e;
    }
    .btn-group {
      display: flex;
      gap: 8px;
    }
    .btn {
      background: #3c3c3c;
      border: 1px solid #3c3c3c;
      color: #cccccc;
      cursor: pointer;
      padding: 4px 12px;
      border-radius: 2px;
      font-size: 12px;
    }
    .btn:hover {
      background: #4b4b4b;
    }
    .btn-close {
        background: #cc3333;
    }
    .btn-close:hover {
        background: #e63333;
    }
    select {
        background: #3c3c3c;
        border: 1px solid #3c3c3c;
        color: #cccccc;
        padding: 4px;
        border-radius: 2px;
        outline: none;
    }
  `;

  override updated(changedProperties: PropertyValues) {
    if (changedProperties.has('show') && this.show) {
      this.fetchContainers();
    }
    if (changedProperties.has('pod') || changedProperties.has('namespace')) {
      if (this.show) {
         this.fetchContainers();
      }
    }
  }

  private async fetchContainers() {
    if (!this.pod || !this.namespace) return;
    
    this.loading = true;
    this.containers = [];
    this.selectedContainer = this.container; // Preserve prop if set

    try {
        const containers = await KubernetesApi.getPodContainers(this.namespace, this.pod);
        this.containers = containers.map(c => c.name);
        
        // If selectedContainer is empty or not in list, default to first
        if (!this.selectedContainer && this.containers.length > 0) {
            this.selectedContainer = this.containers[0] || "";
        } else if (this.selectedContainer && !this.containers.includes(this.selectedContainer)) {
             this.selectedContainer = this.containers[0] || '';
        }
    } catch (e) {
        console.error('Failed to fetch containers', e);
        // Fallback: assume the pod has at least one container and proceed
        if (!this.selectedContainer) {
             // We don't have a name, but backend might handle empty.
             // But for UI clarity let's leave it empty or user provided prop.
        }
    } finally {
        this.loading = false;
    }
  }

  private handleClose() {
    this.dispatchEvent(new CustomEvent('close'));
  }

  private handleNewTab() {
    const containerParam = this.selectedContainer ? `&container=${this.selectedContainer}` : '';
    const url = `/kubernetes/terminal?pod=${this.pod}&namespace=${this.namespace}${containerParam}`;
    window.open(url, '_blank');
    this.handleClose();
  }

  private handleContainerChange(e: Event) {
      const target = e.target as HTMLSelectElement;
      this.selectedContainer = target.value;
  }

  override render() {
    if (!this.show) return null;

    return html`
      <div class="modal-overlay" @click="${(e: Event) => e.target === this.shadowRoot?.querySelector('.modal-overlay') && this.handleClose()}">
        <div class="modal-content">
          <div class="modal-header">
            <div class="header-left">
                <span>Terminal: ${this.pod}</span>
                ${this.containers.length > 1 ? html`
                    <select @change="${this.handleContainerChange}" .value="${this.selectedContainer}">
                        ${this.containers.map(c => html`<option value="${c}">${c}</option>`)}
                    </select>
                ` : this.selectedContainer ? html`<span style="color: #888; font-size: 12px;">(${this.selectedContainer})</span>` : ''}
            </div>
            <div class="btn-group">
                <button class="btn" @click="${this.handleNewTab}">Open in New Tab</button>
                <button class="btn btn-close" @click="${this.handleClose}">Close</button>
            </div>
          </div>
          <div class="modal-body">
            ${!this.loading ? html`
                <pod-terminal 
                    .pod="${this.pod}" 
                    .namespace="${this.namespace}" 
                    .container="${this.selectedContainer}"
                ></pod-terminal>
            ` : html`<div style="padding: 20px; color: #ccc;">Loading container details...</div>`}
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'terminal-modal': TerminalModal;
  }
}
