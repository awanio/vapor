import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '../containers/container-terminal.js';

@customElement('container-terminal-modal')
export class ContainerTerminalModal extends LitElement {
  @property({ type: Boolean }) show = false;
  @property({ type: String }) containerId = '';
  @property({ type: String }) containerName = '';
  @property({ type: String }) runtime = 'docker';

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
  `;

  private handleClose() {
    this.dispatchEvent(new CustomEvent('close'));
  }

  private handleNewTab() {
    if (!this.containerId) return;
    const nameParam = this.containerName ? `&name=${encodeURIComponent(this.containerName)}` : '';
    const url = `/containers/terminal?container=${encodeURIComponent(this.containerId)}&runtime=${encodeURIComponent(this.runtime)}${nameParam}`;
    window.open(url, '_blank');
    this.handleClose();
  }

  override render() {
    if (!this.show) return null;

    const displayName = this.containerName || this.containerId || 'Container';

    return html`
      <div class="modal-overlay" @click="${(e: Event) => e.target === this.shadowRoot?.querySelector('.modal-overlay') && this.handleClose()}">
        <div class="modal-content">
          <div class="modal-header">
            <div class="header-left">
              <span>Terminal: ${displayName}</span>
            </div>
            <div class="btn-group">
              <button class="btn" @click="${this.handleNewTab}">Open in New Tab</button>
              <button class="btn btn-close" @click="${this.handleClose}">Close</button>
            </div>
          </div>
          <div class="modal-body">
            ${this.containerId ? html`
              <container-terminal
                .containerId="${this.containerId}"
                .containerName="${this.containerName}"
                .runtime="${this.runtime}"
              ></container-terminal>
            ` : html`<div style="padding: 20px; color: #ccc;">No container selected.</div>`}
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'container-terminal-modal': ContainerTerminalModal;
  }
}
