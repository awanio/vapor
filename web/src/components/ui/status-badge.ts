import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export type StatusType = 'running' | 'active' | 'deployed' | 'bound' | 'available' | 'ready' | 
                        'pending' | 'failed' | 'error' | 'enforced' | 'suspended' | 'unknown' |
                        'stopped' | 'shutoff' | 'paused' | 'crashed' | 'starting' | 'stopping';

@customElement('status-badge')
export class StatusBadge extends LitElement {
  @property({ type: String }) status: StatusType = 'unknown';
  @property({ type: String }) text?: string;

  static override styles = css`
    .status {
      padding: 4px 8px;
      border-radius: 0;
      font-size: 12px;
      font-weight: 400;
      letter-spacing: 0.32px;
      text-transform: uppercase;
      display: inline-block;
      font-family: var(--cds-font-sans);
    }

    /* Success states — Green */
    .status.running,
    .status.active,
    .status.deployed,
    .status.bound,
    .status.available,
    .status.ready {
      background-color: #defbe6;
      color: #198038;
    }

    :host-context(.dark) .status.running,
    :host-context(.dark) .status.active,
    :host-context(.dark) .status.deployed,
    :host-context(.dark) .status.bound,
    :host-context(.dark) .status.available,
    :host-context(.dark) .status.ready {
      background-color: rgba(36, 161, 72, 0.2);
      color: #42be65;
    }

    /* Pending / Warning states — Yellow */
    .status.pending,
    .status.paused {
      background-color: #fff8c5;
      color: #9a6700;
    }

    :host-context(.dark) .status.pending,
    :host-context(.dark) .status.paused {
      background-color: rgba(241, 194, 27, 0.2);
      color: #f1c21b;
    }

    /* Error states — Red */
    .status.failed,
    .status.error,
    .status.stopped,
    .status.shutoff,
    .status.crashed {
      background-color: #fff1f1;
      color: #da1e28;
    }

    :host-context(.dark) .status.failed,
    :host-context(.dark) .status.error,
    :host-context(.dark) .status.stopped,
    :host-context(.dark) .status.shutoff,
    :host-context(.dark) .status.crashed {
      background-color: rgba(218, 30, 40, 0.2);
      color: #ff8389;
    }

    /* Info / Blue states */
    .status.enforced,
    .status.starting,
    .status.stopping {
      background-color: #edf5ff;
      color: #0f62fe;
    }

    :host-context(.dark) .status.enforced,
    :host-context(.dark) .status.starting,
    :host-context(.dark) .status.stopping {
      background-color: rgba(15, 98, 254, 0.2);
      color: #78a9ff;
    }

    /* Neutral states */
    .status.suspended,
    .status.unknown {
      background-color: #f4f4f4;
      color: #525252;
    }

    :host-context(.dark) .status.suspended,
    :host-context(.dark) .status.unknown {
      background-color: rgba(141, 141, 141, 0.2);
      color: #c6c6c6;
    }
  `;

  override render() {
    const displayText = this.text || this.status;
    const statusClass = this.status.toLowerCase();
    
    return html`
      <span class="status ${statusClass}">${displayText}</span>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'status-badge': StatusBadge;
  }
}
