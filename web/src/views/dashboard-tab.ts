import { LitElement, html, css } from 'lit';
import { t } from '../i18n';
import { api } from '../api';
import Chart from 'chart.js/auto';

class DashboardTab extends LitElement {
  static styles = css`
    .dashboard {
      padding: 16px;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }
    .metric-card {
      background: var(--vscode-bg-light);
      color: var(--vscode-text);
      padding: 16px;
      border-radius: 8px;
      text-align: center;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    canvas {
      max-width: 100%;
    }
  `;

  private cpuChart: Chart | null = null;
  private memoryChart: Chart | null = null;

  firstUpdated() {
    this.fetchSystemMetrics();
    this.initCharts();
  }

  async fetchSystemMetrics() {
    try {
      const summary = await api.get('/system/summary');
      // Do something with summary if needed
    } catch (error) {
      console.error('Failed to fetch system metrics:', error);
    }
  }

  initCharts() {
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
        <div class="metrics-grid">
          <div class="metric-card">
            <h2>${t('dashboard.cpu')}</h2>
            <canvas id="cpuChart"></canvas>
          </div>
          <div class="metric-card">
            <h2>${t('dashboard.memory')}</h2>
            <canvas id="memoryChart"></canvas>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('dashboard-tab', DashboardTab);
