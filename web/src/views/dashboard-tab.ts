import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';
import { t } from '../i18n';
import { api, WebSocketManager } from '../api';
import Chart from 'chart.js/auto';
import type { SystemSummary, CPUInfo, MemoryInfo, CPUMetricData, MemoryMetricData } from '../types/api';

export class DashboardTab extends LitElement {
  @property({ type: Object }) systemSummary: SystemSummary | null = null;
  @property({ type: Object }) cpuInfo: CPUInfo | null = null;
  @property({ type: Object }) memoryInfo: MemoryInfo | null = null;
  @property({ type: Object }) currentCpuData: CPUMetricData | null = null;
  @property({ type: Object }) currentMemoryData: MemoryMetricData | null = null;

  static styles = css`
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

    h1 {
      margin: 0 0 24px 0;
      font-size: 24px;
      font-weight: 300;
    }

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

    .status-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
      margin-top: 16px;
    }

    .status-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      background: var(--vscode-bg);
      border-radius: 4px;
      font-size: 13px;
    }

    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--vscode-success);
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

  private cpuChart: Chart | null = null;
  private memoryChart: Chart | null = null;
  private diskChart: Chart | null = null;
  private networkChart: Chart | null = null;
  private wsManager: WebSocketManager | null = null;

  connectedCallback() {
    super.connectedCallback();
    this.fetchInitialData();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.cleanup();
  }

  firstUpdated() {
    this.initCharts();
    this.initWebSocket();
  }

  private async fetchInitialData() {
    try {
      const [summary, cpu, memory] = await Promise.all([
        api.get<SystemSummary>('/system/summary'),
        api.get<CPUInfo>('/system/cpu'),
        api.get<MemoryInfo>('/system/memory')
      ]);
      
      this.systemSummary = summary;
      this.cpuInfo = cpu;
      this.memoryInfo = memory;
    } catch (error) {
      console.error('Failed to fetch system data:', error);
    }
  }

  private async initWebSocket() {
    try {
      this.wsManager = new WebSocketManager('/api/v1/ws/metrics');
      
      this.wsManager.on('metric', (message) => {
        switch (message.metric) {
          case 'cpu':
            this.currentCpuData = message.data;
            this.updateCpuChart(message.data);
            break;
          case 'memory':
            this.currentMemoryData = message.data;
            this.updateMemoryChart(message.data);
            break;
          case 'disk':
            this.updateDiskChart(message.data);
            break;
          case 'network':
            this.updateNetworkChart(message.data);
            break;
        }
        this.requestUpdate();
      });

      await this.wsManager.connect();
      
      // Subscribe to metrics
      this.wsManager.send({
        type: 'subscribe',
        metrics: ['cpu', 'memory', 'disk', 'network']
      });
    } catch (error) {
      console.error('Failed to connect to metrics WebSocket:', error);
    }
  }

  private cleanup() {
    if (this.wsManager) {
      this.wsManager.disconnect();
      this.wsManager = null;
    }
    
    if (this.cpuChart) {
      this.cpuChart.destroy();
      this.cpuChart = null;
    }
    
    if (this.memoryChart) {
      this.memoryChart.destroy();
      this.memoryChart = null;
    }
    
    if (this.diskChart) {
      this.diskChart.destroy();
      this.diskChart = null;
    }
    
    if (this.networkChart) {
      this.networkChart.destroy();
      this.networkChart = null;
    }
  }

  private updateCpuChart(data: CPUMetricData) {
    if (this.cpuChart) {
      const timestamp = new Date().toLocaleTimeString();
      this.cpuChart.data.labels?.push(timestamp);
      this.cpuChart.data.datasets[0].data.push(data.usage_percent);
      
      // Keep only last 30 data points
      if (this.cpuChart.data.labels!.length > 30) {
        this.cpuChart.data.labels?.shift();
        this.cpuChart.data.datasets[0].data.shift();
      }
      
      this.cpuChart.update('none');
    }
  }

  private updateMemoryChart(data: MemoryMetricData) {
    if (this.memoryChart) {
      const timestamp = new Date().toLocaleTimeString();
      this.memoryChart.data.labels?.push(timestamp);
      this.memoryChart.data.datasets[0].data.push(data.used_percent);
      
      // Keep only last 30 data points
      if (this.memoryChart.data.labels!.length > 30) {
        this.memoryChart.data.labels?.shift();
        this.memoryChart.data.datasets[0].data.shift();
      }
      
      this.memoryChart.update('none');
    }
  }

  private updateDiskChart(data: any) {
    // Implementation for disk chart updates
  }

  private updateNetworkChart(data: any) {
    // Implementation for network chart updates
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days} ${t('dashboard.days')}`);
    if (hours > 0) parts.push(`${hours} ${t('dashboard.hours')}`);
    if (minutes > 0) parts.push(`${minutes} ${t('dashboard.minutes')}`);
    
    return parts.join(', ') || '0 ' + t('dashboard.minutes');
  }

  private initCharts() {
    const cpuCtx = this.shadowRoot?.querySelector('#cpuChart') as HTMLCanvasElement;
    const memoryCtx = this.shadowRoot?.querySelector('#memoryChart') as HTMLCanvasElement;

    this.cpuChart = new Chart(cpuCtx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: t('dashboard.cpuUsage'),
          data: [],
          borderColor: 'rgba(75, 192, 192, 1)',
          tension: 0.1,
        }],
      },
      options: {
        scales: {
          x: { display: false },
          y: {
            beginAtZero: true,
            max: 100,
          },
        },
      },
    });

    this.memoryChart = new Chart(memoryCtx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: t('dashboard.memoryUsage'),
          data: [],
          borderColor: 'rgba(153, 102, 255, 1)',
          tension: 0.1,
        }],
      },
      options: {
        scales: {
          x: { display: false },
          y: {
            beginAtZero: true,
            max: 100,
          },
        },
      },
    });
  }

  render() {
    return html`
      <div class="dashboard">
        <h1>${t('dashboard.title')}</h1>
        
        ${this.systemSummary ? html`
          <div class="system-info">
            <div class="info-card">
              <h3>${t('dashboard.overview')}</h3>
              <div class="info-grid">
                <span class="info-label">${t('dashboard.hostname')}:</span>
                <span class="info-value">${this.systemSummary.hostname}</span>
                
                <span class="info-label">${t('dashboard.os')}:</span>
                <span class="info-value">${this.systemSummary.os}</span>
                
                <span class="info-label">${t('dashboard.kernel')}:</span>
                <span class="info-value">${this.systemSummary.kernel_version}</span>
                
                <span class="info-label">${t('dashboard.uptime')}:</span>
                <span class="info-value">${this.formatUptime(this.systemSummary.uptime)}</span>
                
                <span class="info-label">${t('dashboard.architecture')}:</span>
                <span class="info-value">${this.systemSummary.platform}</span>
              </div>
            </div>
            
            ${this.cpuInfo ? html`
              <div class="info-card">
                <h3>${t('dashboard.cpu')}</h3>
                <div class="info-grid">
                  <span class="info-label">Model:</span>
                  <span class="info-value">${this.cpuInfo.model_name}</span>
                  
                  <span class="info-label">Cores:</span>
                  <span class="info-value">${this.cpuInfo.cores}</span>
                  
                  <span class="info-label">${t('dashboard.loadAverage')}:</span>
                  <span class="info-value">
                    ${this.cpuInfo.load1.toFixed(2)}, 
                    ${this.cpuInfo.load5.toFixed(2)}, 
                    ${this.cpuInfo.load15.toFixed(2)}
                  </span>
                  
                  ${this.currentCpuData ? html`
                    <span class="info-label">Current Usage:</span>
                    <span class="info-value">${this.currentCpuData.usage_percent.toFixed(1)}%</span>
                  ` : ''}
                </div>
              </div>
            ` : ''}
            
            ${this.memoryInfo ? html`
              <div class="info-card">
                <h3>${t('dashboard.memory')}</h3>
                <div class="info-grid">
                  <span class="info-label">Total:</span>
                  <span class="info-value">${this.formatBytes(this.memoryInfo.total)}</span>
                  
                  <span class="info-label">Used:</span>
                  <span class="info-value">
                    ${this.formatBytes(this.memoryInfo.used)} 
                    (${this.memoryInfo.used_percent.toFixed(1)}%)
                  </span>
                  
                  <span class="info-label">Free:</span>
                  <span class="info-value">${this.formatBytes(this.memoryInfo.free)}</span>
                  
                  ${this.currentMemoryData ? html`
                    <span class="info-label">Available:</span>
                    <span class="info-value">${this.formatBytes(this.currentMemoryData.available)}</span>
                  ` : ''}
                </div>
              </div>
            ` : ''}
          </div>
        ` : html`
          <div class="loading">${t('common.loading')}</div>
        `}
        
        <div class="metrics-section">
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-header">
                <h3 class="metric-title">${t('dashboard.cpuUsage')}</h3>
                ${this.currentCpuData ? html`
                  <div>
                    <div class="metric-value">${this.currentCpuData.usage_percent.toFixed(1)}%</div>
                    <div class="metric-subtitle">
                      Load: ${this.currentCpuData.load1.toFixed(2)}
                    </div>
                  </div>
                ` : ''}
              </div>
              <div class="chart-container">
                <canvas id="cpuChart"></canvas>
              </div>
            </div>
            
            <div class="metric-card">
              <div class="metric-header">
                <h3 class="metric-title">${t('dashboard.memoryUsage')}</h3>
                ${this.currentMemoryData ? html`
                  <div>
                    <div class="metric-value">${this.currentMemoryData.used_percent.toFixed(1)}%</div>
                    <div class="metric-subtitle">
                      ${this.formatBytes(this.currentMemoryData.used)} / 
                      ${this.formatBytes(this.currentMemoryData.total)}
                    </div>
                  </div>
                ` : ''}
              </div>
              <div class="chart-container">
                <canvas id="memoryChart"></canvas>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('dashboard-tab', DashboardTab);
