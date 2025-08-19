/**
 * Metrics Status Bar Component
 * Demonstrates how any component can access metrics data from the store
 */

import { html, css, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { StoreMixin } from '../stores/utils/lit-mixin';
import {
  $cpuUsage,
  $memoryUsage,
  $metricsConnected,
  $metricsAlerts,
  formatBytes,
  $availableMemory,
  $loadAverage,
} from '../stores/shared/metrics';

/**
 * A simple status bar that shows current metrics
 * This can be placed anywhere in the app and will always show current data
 */
@customElement('metrics-status-bar')
export class MetricsStatusBar extends StoreMixin(LitElement) {
  static override styles = css`
    :host {
      display: block;
      background: var(--vscode-bg-light);
      border-top: 1px solid var(--vscode-border);
      padding: 8px 16px;
      font-size: 12px;
      color: var(--vscode-text-dim);
    }

    .status-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .metrics-items {
      display: flex;
      align-items: center;
      gap: 24px;
    }

    .connection-status {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 12px;
      border-radius: 12px;
      background: var(--vscode-bg);
      border: 1px solid var(--vscode-border);
    }

    .connection-status.connected {
      border-color: rgba(76, 175, 80, 0.3);
    }

    .status-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .status-label {
      color: var(--vscode-text-dim);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-size: 11px;
    }

    .status-value {
      color: var(--vscode-text);
      font-family: var(--vscode-font-family-mono);
      font-weight: 500;
    }

    .status-value.high {
      color: #ffc107;
    }

    .status-value.critical {
      color: #f44336;
    }

    .status-value.good {
      color: #4caf50;
    }

    .connection-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--vscode-text-dim);
    }

    .connection-indicator.connected {
      background: #4caf50;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }

    .divider {
      width: 1px;
      height: 16px;
      background: var(--vscode-border);
    }

    .alert-indicator {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 12px;
      background: rgba(255, 193, 7, 0.1);
      color: #ffc107;
    }

    .alert-indicator.critical {
      background: rgba(244, 67, 54, 0.1);
      color: #f44336;
    }
  `;

  // Store subscriptions
  private cpuUsage = this.subscribeToStore($cpuUsage);
  private memoryUsage = this.subscribeToStore($memoryUsage);
  private availableMemory = this.subscribeToStore($availableMemory);
  private loadAverage = this.subscribeToStore($loadAverage);
  private metricsConnected = this.subscribeToStore($metricsConnected);
  private metricsAlerts = this.subscribeToStore($metricsAlerts);

  private getValueClass(value: number, _type: 'cpu' | 'memory'): string {
    if (value > 90) return 'critical';
    if (value > 75) return 'high';
    return 'good';
  }

  override render() {
    const hasAlerts = this.metricsAlerts.value && this.metricsAlerts.value.length > 0;
    const hasCriticalAlerts = this.metricsAlerts.value?.some((a: any) => a.type === 'error');

    return html`
      <div class="status-bar">
        <!-- Left side - Metrics Items -->
        <div class="metrics-items">
          <!-- CPU Usage -->
          <div class="status-item">
            <span class="status-label">CPU</span>
            <span class="status-value ${this.getValueClass(this.cpuUsage.value, 'cpu')}">
              ${this.cpuUsage.value.toFixed(1)}%
            </span>
          </div>

          <div class="divider"></div>

          <!-- Memory Usage -->
          <div class="status-item">
            <span class="status-label">Memory</span>
            <span class="status-value ${this.getValueClass(this.memoryUsage.value, 'memory')}">
              ${this.memoryUsage.value.toFixed(1)}%
            </span>
          </div>

          <div class="divider"></div>

          <!-- Available Memory -->
          <div class="status-item">
            <span class="status-label">Available</span>
            <span class="status-value">
              ${formatBytes(this.availableMemory.value)}
            </span>
          </div>

          <div class="divider"></div>

          <!-- Load Average -->
          <div class="status-item">
            <span class="status-label">Load</span>
            <span class="status-value">
              ${this.loadAverage.value.load1.toFixed(2)}
            </span>
          </div>

          <!-- Alerts Indicator -->
          ${hasAlerts ? html`
            <div class="divider"></div>
            <div class="alert-indicator ${hasCriticalAlerts ? 'critical' : ''}">
              ⚠️ ${this.metricsAlerts.value!.length} ${this.metricsAlerts.value!.length === 1 ? 'Alert' : 'Alerts'}
            </div>
          ` : ''}
        </div>

        <!-- Right side - Connection Status -->
        <div class="connection-status ${this.metricsConnected.value ? 'connected' : ''}">
          <span class="connection-indicator ${this.metricsConnected.value ? 'connected' : ''}"></span>
          <span class="status-label">Metrics ${this.metricsConnected.value ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>
    `;
  }
}

// Export for use in other components
export default MetricsStatusBar;
