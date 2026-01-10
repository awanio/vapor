import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '../kubernetes/pod-terminal.js';

@customElement('terminal-modal')
export class TerminalModal extends LitElement {
  @property({ type: Boolean }) show = false;
  @property({ type: String }) pod = '';
  @property({ type: String }) namespace = '';
  @property({ type: String }) container = '';

  static styles = css`
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
    const url = `/kubernetes/terminal?pod=${this.pod}&namespace=${this.namespace}&container=${this.container}`;
    window.open(url, '_blank');
    this.handleClose();
  }

  render() {
    if (!this.show) return null;

    return html`
      <div class="modal-overlay" @click="${(e: Event) => e.target === this.shadowRoot?.querySelector('.modal-overlay') && this.handleClose()}">
        <div class="modal-content">
          <div class="modal-header">
            <span>Terminal: ${this.pod}</span>
            <div class="btn-group">
                <button class="btn" @click="${this.handleNewTab}">Open in New Tab</button>
                <button class="btn btn-close" @click="${this.handleClose}">Close</button>
            </div>
          </div>
          <div class="modal-body">
            <pod-terminal .pod="${this.pod}" .namespace="${this.namespace}" .container="${this.container}"></pod-terminal>
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
