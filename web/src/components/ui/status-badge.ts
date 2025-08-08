import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export type StatusType = 'running' | 'active' | 'deployed' | 'bound' | 'available' | 'ready' | 
                        'pending' | 'failed' | 'error' | 'enforced' | 'suspended' | 'unknown';

@customElement('status-badge')
export class StatusBadge extends LitElement {
  @property({ type: String }) status: StatusType = 'unknown';
  @property({ type: String }) text?: string;

  static override styles = css`
    .status {
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
      text-transform: uppercase;
      display: inline-block;
    }

    .status.running,
    .status.active,
    .status.deployed,
    .status.bound,
    .status.available,
    .status.ready {
      background-color: rgba(34, 197, 94, 0.1);
      color: rgb(34, 197, 94);
    }

    .status.pending {
      background-color: rgba(251, 191, 36, 0.1);
      color: rgb(251, 191, 36);
    }

    .status.failed,
    .status.error {
      background-color: rgba(239, 68, 68, 0.1);
      color: rgb(239, 68, 68);
    }

    .status.enforced {
      background-color: rgba(59, 130, 246, 0.1);
      color: rgb(59, 130, 246);
    }

    .status.suspended {
      background-color: rgba(156, 163, 175, 0.1);
      color: rgb(156, 163, 175);
    }

    .status.unknown {
      background-color: rgba(107, 114, 128, 0.1);
      color: rgb(107, 114, 128);
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
