var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { html, css } from 'lit';
import { customElement } from 'lit/decorators.js';
import { t } from '../i18n';
import { I18nLitElement } from '../i18n-mixin';
import Chart from 'chart.js/auto';
import { StoreMixin } from '../stores/utils/lit-mixin';
import { $systemSummary, $cpuInfo, $memoryInfo, $currentCpu, $currentMemory, $cpuHistory, $memoryHistory, $metricsConnected, $metricsError, $cpuUsage, $memoryUsage, $cpuTrend, $memoryTrend, $metricsAlerts, connectMetrics, formatBytes, formatUptime, calculateAverage, } from '../stores/shared/metrics';
let DashboardTabV2 = class DashboardTabV2 extends StoreMixin(I18nLitElement) {
    constructor() {
        super(...arguments);
        this.cpuChart = null;
        this.memoryChart = null;
        this.systemSummary = this.subscribeToStore($systemSummary);
        this.cpuInfo = this.subscribeToStore($cpuInfo);
        this.memoryInfo = this.subscribeToStore($memoryInfo);
        this.currentCpu = this.subscribeToStore($currentCpu);
        this.currentMemory = this.subscribeToStore($currentMemory);
        this.cpuHistory = this.subscribeToStore($cpuHistory);
        this.memoryHistory = this.subscribeToStore($memoryHistory);
        this.metricsConnected = this.subscribeToStore($metricsConnected);
        this.metricsError = this.subscribeToStore($metricsError);
        this.cpuUsage = this.subscribeToStore($cpuUsage);
        this.memoryUsage = this.subscribeToStore($memoryUsage);
        this.cpuTrend = this.subscribeToStore($cpuTrend);
        this.memoryTrend = this.subscribeToStore($memoryTrend);
        this.metricsAlerts = this.subscribeToStore($metricsAlerts);
    }
    connectedCallback() {
        super.connectedCallback();
        connectMetrics();
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        this.cleanup();
    }
    firstUpdated() {
        this.initCharts();
        this.updateChartsFromHistory();
    }
    updated(changedProperties) {
        super.updated(changedProperties);
        if (this.cpuChart && this.memoryChart) {
            this.updateChartsFromHistory();
        }
    }
    cleanup() {
        if (this.cpuChart) {
            this.cpuChart.destroy();
            this.cpuChart = null;
        }
        if (this.memoryChart) {
            this.memoryChart.destroy();
            this.memoryChart = null;
        }
    }
    initCharts() {
        const cpuCtx = this.shadowRoot?.querySelector('#cpuChart');
        const memoryCtx = this.shadowRoot?.querySelector('#memoryChart');
        if (!cpuCtx || !memoryCtx)
            return;
        const cpuHistoryData = this.cpuHistory.value || [];
        this.cpuChart = new Chart(cpuCtx, {
            type: 'line',
            data: {
                labels: cpuHistoryData.map((p) => p.label || ''),
                datasets: [{
                        label: t('dashboard.cpuUsage'),
                        data: cpuHistoryData.map((p) => p.value),
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.1)',
                        tension: 0.1,
                        fill: true,
                    }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                },
                scales: {
                    x: {
                        display: true,
                        ticks: {
                            maxTicksLimit: 10,
                            autoSkip: true,
                        }
                    },
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: (value) => `${value}%`,
                        }
                    },
                },
            },
        });
        const memoryHistoryData = this.memoryHistory.value || [];
        this.memoryChart = new Chart(memoryCtx, {
            type: 'line',
            data: {
                labels: memoryHistoryData.map((p) => p.label || ''),
                datasets: [{
                        label: t('dashboard.memoryUsage'),
                        data: memoryHistoryData.map((p) => p.value),
                        borderColor: 'rgba(153, 102, 255, 1)',
                        backgroundColor: 'rgba(153, 102, 255, 0.1)',
                        tension: 0.1,
                        fill: true,
                    }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                },
                scales: {
                    x: {
                        display: true,
                        ticks: {
                            maxTicksLimit: 10,
                            autoSkip: true,
                        }
                    },
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: (value) => `${value}%`,
                        }
                    },
                },
            },
        });
    }
    updateChartsFromHistory() {
        if (this.cpuChart && this.cpuHistory.value) {
            const data = this.cpuHistory.value;
            this.cpuChart.data.labels = data.map((p) => p.label || '');
            if (this.cpuChart.data.datasets[0]) {
                this.cpuChart.data.datasets[0].data = data.map((p) => p.value);
            }
            this.cpuChart.update('none');
        }
        if (this.memoryChart && this.memoryHistory.value) {
            const data = this.memoryHistory.value;
            this.memoryChart.data.labels = data.map((p) => p.label || '');
            if (this.memoryChart.data.datasets[0]) {
                this.memoryChart.data.datasets[0].data = data.map((p) => p.value);
            }
            this.memoryChart.update('none');
        }
    }
    renderTrendIndicator(trend) {
        const icons = {
            increasing: '↑',
            decreasing: '↓',
            stable: '→',
        };
        const labels = {
            increasing: 'Increasing',
            decreasing: 'Decreasing',
            stable: 'Stable',
        };
        return html `
      <span class="trend-indicator ${trend}">
        <span class="trend-arrow">${icons[trend]}</span>
        ${labels[trend]}
      </span>
    `;
    }
    render() {
        return html `
      <div class="dashboard">
        <!-- Header with title and connection status -->
        <div class="dashboard-header">
          <h1>${t('dashboard.title')}</h1>
          <div class="connection-status ${this.metricsConnected.value ? 'connected' : 'disconnected'}">
            <span class="status-dot ${this.metricsConnected.value ? 'connected' : 'disconnected'}"></span>
            ${this.metricsConnected.value ? 'Connected' : 'Disconnected'}
          </div>
        </div>
        
        <!-- Alerts Section -->
        ${this.metricsAlerts.value && this.metricsAlerts.value.length > 0 ? html `
          <div class="alerts-section">
            ${this.metricsAlerts.value.map((alert) => html `
              <div class="alert ${alert.type}">
                <span class="alert-icon">⚠️</span>
                ${alert.message}
              </div>
            `)}
          </div>
        ` : ''}

        <!-- System Info Cards -->
        ${this.systemSummary.value ? html `
          <div class="system-info">
            <div class="info-card">
              <h3>${t('dashboard.overview')}</h3>
              <div class="info-grid">
                <span class="info-label">${t('dashboard.hostname')}:</span>
                <span class="info-value">${this.systemSummary.value.hostname}</span>
                
                <span class="info-label">${t('dashboard.os')}:</span>
                <span class="info-value">${this.systemSummary.value.os}</span>
                
                <span class="info-label">${t('dashboard.kernel')}:</span>
                <span class="info-value">${this.systemSummary.value.kernel_version}</span>
                
                <span class="info-label">${t('dashboard.uptime')}:</span>
                <span class="info-value">${formatUptime(this.systemSummary.value.uptime)}</span>
                
                <span class="info-label">${t('dashboard.architecture')}:</span>
                <span class="info-value">${this.systemSummary.value.platform}</span>
              </div>
            </div>
            
            ${this.cpuInfo.value ? html `
              <div class="info-card">
                <h3>${t('dashboard.cpu')}</h3>
                <div class="info-grid">
                  <span class="info-label">Model:</span>
                  <span class="info-value">${this.cpuInfo.value.model_name}</span>
                  
                  <span class="info-label">Cores:</span>
                  <span class="info-value">${this.cpuInfo.value.cores}</span>
                  
                  <span class="info-label">${t('dashboard.loadAverage')}:</span>
                  <span class="info-value">
                    ${this.cpuInfo.value.load1.toFixed(2)}, 
                    ${this.cpuInfo.value.load5.toFixed(2)}, 
                    ${this.cpuInfo.value.load15.toFixed(2)}
                  </span>
                  
                  ${this.currentCpu.value ? html `
                    <span class="info-label">Current Usage:</span>
                    <span class="info-value">${this.currentCpu.value.usage_percent.toFixed(1)}%</span>
                  ` : ''}
                </div>
              </div>
            ` : ''}
            
            ${this.memoryInfo.value ? html `
              <div class="info-card">
                <h3>${t('dashboard.memory')}</h3>
                <div class="info-grid">
                  <span class="info-label">Total:</span>
                  <span class="info-value">${formatBytes(this.memoryInfo.value.total)}</span>
                  
                  <span class="info-label">Used:</span>
                  <span class="info-value">
                    ${formatBytes(this.memoryInfo.value.used)} 
                    (${this.memoryInfo.value.used_percent.toFixed(1)}%)
                  </span>
                  
                  <span class="info-label">Free:</span>
                  <span class="info-value">${formatBytes(this.memoryInfo.value.free)}</span>
                  
                  ${this.currentMemory.value ? html `
                    <span class="info-label">Available:</span>
                    <span class="info-value">${formatBytes(this.currentMemory.value.available)}</span>
                  ` : ''}
                </div>
              </div>
            ` : ''}
          </div>
        ` : html `
          <div class="loading">${t('common.loading')}</div>
        `}
        
        <!-- Metrics Charts -->
        <div class="metrics-section">
          <div class="metrics-grid">
            <!-- CPU Chart -->
            <div class="metric-card">
              <div class="metric-header">
                <h3 class="metric-title">
                  ${t('dashboard.cpuUsage')}
                  ${this.renderTrendIndicator(this.cpuTrend.value)}
                </h3>
                ${this.currentCpu.value ? html `
                  <div>
                    <div class="metric-value">${this.cpuUsage.value.toFixed(1)}%</div>
                    <div class="metric-subtitle">
                      Load: ${this.currentCpu.value.load1.toFixed(2)}
                    </div>
                  </div>
                ` : ''}
              </div>
              <div class="chart-container">
                <canvas id="cpuChart"></canvas>
              </div>
              <div class="metric-stats">
                <div class="stat-item">
                  <span class="stat-label">1m Avg</span>
                  <span class="stat-value">${calculateAverage('cpu', 60000).toFixed(1)}%</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">5m Avg</span>
                  <span class="stat-value">${calculateAverage('cpu', 300000).toFixed(1)}%</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Data Points</span>
                  <span class="stat-value">${this.cpuHistory.value.length}/120</span>
                </div>
              </div>
            </div>
            
            <!-- Memory Chart -->
            <div class="metric-card">
              <div class="metric-header">
                <h3 class="metric-title">
                  ${t('dashboard.memoryUsage')}
                  ${this.renderTrendIndicator(this.memoryTrend.value)}
                </h3>
                ${this.currentMemory.value ? html `
                  <div>
                    <div class="metric-value">${this.memoryUsage.value.toFixed(1)}%</div>
                    <div class="metric-subtitle">
                      ${formatBytes(this.currentMemory.value.used)} / 
                      ${formatBytes(this.currentMemory.value.total)}
                    </div>
                  </div>
                ` : ''}
              </div>
              <div class="chart-container">
                <canvas id="memoryChart"></canvas>
              </div>
              <div class="metric-stats">
                <div class="stat-item">
                  <span class="stat-label">1m Avg</span>
                  <span class="stat-value">${calculateAverage('memory', 60000).toFixed(1)}%</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">5m Avg</span>
                  <span class="stat-value">${calculateAverage('memory', 300000).toFixed(1)}%</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Data Points</span>
                  <span class="stat-value">${this.memoryHistory.value.length}/120</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Error Display -->
        ${this.metricsError.value ? html `
          <div class="error">
            Error: ${this.metricsError.value}
          </div>
        ` : ''}
      </div>
    `;
    }
};
DashboardTabV2.styles = css `
    :host {
      display: block;
      height: 100%;
      overflow-y: auto;
    }

    .dashboard {
      padding: 20px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 300;
    }

    /* Alerts section */
    .alerts-section {
      margin-bottom: 20px;
    }

    .alert {
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 13px;
    }

    .alert.warning {
      background: rgba(255, 193, 7, 0.1);
      border: 1px solid rgba(255, 193, 7, 0.3);
      color: #ffc107;
    }

    .alert.error {
      background: rgba(244, 67, 54, 0.1);
      border: 1px solid rgba(244, 67, 54, 0.3);
      color: #f44336;
    }

    .alert-icon {
      font-size: 18px;
    }

    /* Connection status */
    .connection-status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      background: var(--vscode-bg-light);
      border: 1px solid var(--vscode-border);
    }

    .connection-status.connected {
      border-color: rgba(76, 175, 80, 0.5);
      background: rgba(76, 175, 80, 0.05);
    }

    .connection-status.disconnected {
      border-color: rgba(244, 67, 54, 0.5);
      background: rgba(244, 67, 54, 0.05);
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }

    .status-dot.connected {
      background: #4caf50;  /* Improved green color */
      box-shadow: 0 0 4px rgba(76, 175, 80, 0.4);
    }

    .status-dot.disconnected {
      background: #f44336;
      box-shadow: 0 0 4px rgba(244, 67, 54, 0.4);
    }

    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }

    /* Trend indicators */
    .trend-indicator {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      padding: 2px 8px;
      border-radius: 12px;
      background: var(--vscode-bg);
    }

    .trend-indicator.increasing {
      color: #f44336;
    }

    .trend-indicator.decreasing {
      color: #4caf50;
    }

    .trend-indicator.stable {
      color: var(--vscode-text-dim);
    }

    .trend-arrow {
      font-size: 10px;
    }

    /* Average display */
    .metric-stats {
      display: flex;
      gap: 16px;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--vscode-border);
      font-size: 12px;
      color: var(--vscode-text-dim);
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .stat-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .stat-value {
      color: var(--vscode-text);
      font-family: var(--vscode-font-family-mono);
      font-size: 13px;
    }

    /* Rest of the styles from original dashboard */
    .system-info {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .info-card {
      background: var(--vscode-bg-light);
      border: 1px solid var(--vscode-border);
      border-radius: 8px;
      padding: 16px;
    }

    .info-card h3 {
      margin: 0 0 12px 0;
      font-size: 14px;
      font-weight: 500;
      color: var(--vscode-text-dim);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: max-content 1fr;
      gap: 8px 16px;
      font-size: 13px;
    }

    .info-label {
      color: var(--vscode-text-dim);
    }

    .info-value {
      color: var(--vscode-text);
      font-family: var(--vscode-font-family-mono);
    }

    .metrics-section {
      margin-bottom: 24px;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 20px;
    }

    .metric-card {
      background: var(--vscode-bg-light);
      border: 1px solid var(--vscode-border);
      border-radius: 8px;
      padding: 20px;
    }

    .metric-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .metric-title {
      font-size: 16px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .metric-value {
      font-size: 24px;
      font-weight: 300;
      color: var(--vscode-accent);
      font-family: var(--vscode-font-family-mono);
    }

    .metric-subtitle {
      font-size: 12px;
      color: var(--vscode-text-dim);
      margin-top: 4px;
    }

    .chart-container {
      height: 200px;
      position: relative;
    }

    canvas {
      max-width: 100%;
      max-height: 100%;
    }

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 200px;
      color: var(--vscode-text-dim);
    }

    .error {
      color: var(--vscode-error);
      padding: 16px;
      background: var(--vscode-bg-light);
      border-radius: 8px;
      margin-bottom: 16px;
    }
  `;
DashboardTabV2 = __decorate([
    customElement('dashboard-tab-v2')
], DashboardTabV2);
export { DashboardTabV2 };
//# sourceMappingURL=dashboard-tab-v2.js.map