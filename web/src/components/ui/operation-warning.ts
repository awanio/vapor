import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { NetworkOperationFailure } from '../../types/api.d';

/**
 * Operation warning component for displaying partial success and persistence warnings
 * @element operation-warning
 * 
 * @fires close - Fired when the warning is dismissed
 */
@customElement('operation-warning')
export class OperationWarning extends LitElement {
  @property({ type: String }) type: 'warning' | 'partial-success' | 'persistence' = 'warning';
  @property({ type: String }) message = '';
  @property({ type: Array }) failures: NetworkOperationFailure[] = [];
  @property({ type: Array }) successfulItems: string[] = [];
  @property({ type: Boolean }) dismissible = true;

  static override styles = css`
    :host {
      display: block;
      margin: 12px 0;
    }

    .warning-container {
      background: var(--warning-bg, rgba(255, 152, 0, 0.1));
      border: 1px solid var(--warning-border, rgba(255, 152, 0, 0.3));
      border-left: 4px solid var(--warning-color, #ff9800);
      border-radius: 4px;
      padding: 12px 16px;
      display: flex;
      gap: 12px;
      align-items: flex-start;
      animation: slideIn 0.3s ease-out;
    }

    .warning-container.partial-success {
      background: var(--info-bg, rgba(33, 150, 243, 0.1));
      border-color: var(--info-border, rgba(33, 150, 243, 0.3));
      border-left-color: var(--info-color, #2196f3);
    }

    .warning-container.persistence {
      background: var(--caution-bg, rgba(255, 193, 7, 0.1));
      border-color: var(--caution-border, rgba(255, 193, 7, 0.3));
      border-left-color: var(--caution-color, #ffc107);
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .warning-icon {
      flex-shrink: 0;
      width: 20px;
      height: 20px;
      margin-top: 2px;
    }

    .warning-icon svg {
      width: 100%;
      height: 100%;
    }

    .warning-content {
      flex: 1;
      color: var(--text-primary, var(--vscode-foreground, #cccccc));
      font-size: 0.875rem;
      line-height: 1.5;
    }

    .warning-title {
      font-weight: 600;
      margin-bottom: 6px;
      color: var(--text-primary, var(--vscode-foreground, #cccccc));
    }

    .warning-message {
      margin-bottom: 8px;
    }

    .failures-list {
      margin-top: 8px;
      padding-left: 16px;
    }

    .failure-item {
      margin: 4px 0;
      display: flex;
      gap: 8px;
    }

    .failure-interface {
      font-weight: 500;
      color: var(--text-primary, var(--vscode-foreground, #cccccc));
    }

    .failure-reason {
      color: var(--text-secondary, var(--vscode-descriptionForeground, #999999));
    }

    .success-list {
      margin-top: 8px;
      color: var(--text-secondary, var(--vscode-descriptionForeground, #999999));
    }

    .close-button {
      flex-shrink: 0;
      background: none;
      border: none;
      cursor: pointer;
      color: var(--text-secondary, var(--vscode-descriptionForeground, #999999));
      font-size: 18px;
      padding: 0;
      width: 20px;
      height: 20px;
      border-radius: 4px;
      transition: all 0.2s;
      line-height: 1;
    }

    .close-button:hover {
      background-color: rgba(255, 255, 255, 0.1);
      color: var(--text-primary, var(--vscode-foreground, #cccccc));
    }
  `;

  private handleClose() {
    this.dispatchEvent(new CustomEvent('close', {
      bubbles: true,
      composed: true
    }));
  }

  private renderIcon() {
    if (this.type === 'partial-success') {
      return html`
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      `;
    }
    
    return html`
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
    `;
  }

  override render() {
    return html`
      <div class="warning-container ${this.type}">
        <div class="warning-icon" style="color: ${
          this.type === 'partial-success' ? 'var(--info-color, #2196f3)' :
          this.type === 'persistence' ? 'var(--caution-color, #ffc107)' :
          'var(--warning-color, #ff9800)'
        }">
          ${this.renderIcon()}
        </div>
        <div class="warning-content">
          ${this.message ? html`
            <div class="warning-message">${this.message}</div>
          ` : ''}
          
          ${this.successfulItems.length > 0 ? html`
            <div class="success-list">
              Successfully processed: ${this.successfulItems.join(', ')}
            </div>
          ` : ''}
          
          ${this.failures.length > 0 ? html`
            <div class="failures-list">
              ${this.failures.map(failure => html`
                <div class="failure-item">
                  <span class="failure-interface">${failure.interface}:</span>
                  <span class="failure-reason">${failure.reason}</span>
                </div>
              `)}
            </div>
          ` : ''}
        </div>
        ${this.dismissible ? html`
          <button class="close-button" @click=${this.handleClose} title="Dismiss">×</button>
        ` : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'operation-warning': OperationWarning;
  }
}
