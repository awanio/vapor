import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import '../../components/ui/search-input';
import '../../components/ui/loading-state';
import '../../components/ui/empty-state';
import '../../components/ui/filter-dropdown';
import '../../components/tables/resource-table';
import '../../components/ui/action-dropdown';
import type { Column } from '../../components/tables/resource-table';
import type { ActionItem } from '../../components/ui/action-dropdown';

interface Execution {
  id: string;
  jobId: string;
  name: string;
  type: 'playbook' | 'template';
  playbook: string;
  status: 'running' | 'successful' | 'failed' | 'canceled' | 'pending';
  startTime: string;
  endTime?: string;
  duration?: number;
  executedBy: string;
  hosts: string[];
  hostsSucceeded: number;
  hostsFailed: number;
  hostsUnreachable: number;
  hostsSkipped: number;
  message?: string;
}

@customElement('ansible-executions')
export class AnsibleExecutions extends LitElement {
  @state()
  private loading = false;

  @state()
  private searchQuery = '';

  @state()
  private executions: Execution[] = [];

  @state()
  private statusFilter = 'all';

  // These will be used for future features
  // @state()
  // private showLogsDrawer = false;

  // @state()
  // private selectedExecution: Execution | null = null;

  static override styles = css`
    :host {
      display: block;
      height: 100%;
    }

    .container {
      display: flex;
      flex-direction: column;
      height: 100%;
      gap: 1rem;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--vscode-panel-border);
    }

    h1 {
      margin: 0 0 24px 0;
      font-size: 24px;
      font-weight: 300;
      flex-shrink: 0;
    }

    .controls {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-top: 1rem;
    }

    .controls-left {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex: 1;
    }

    .controls-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-run {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      background: var(--vscode-button-background, #007acc);
      color: var(--vscode-button-foreground, white);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s;
    }

    .btn-run:hover {
      background: var(--vscode-button-hoverBackground, #005a9e);
    }

    search-input {
      flex: 1;
      max-width: 400px;
    }

    filter-dropdown {
      min-width: 140px;
    }

    .content {
      flex: 1;
      overflow-y: auto;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }

    .status-badge.running {
      background: rgba(30, 136, 229, 0.2);
      color: #1e88e5;
    }

    .status-badge.successful {
      background: rgba(67, 160, 71, 0.2);
      color: #43a047;
    }

    .status-badge.failed {
      background: rgba(229, 57, 53, 0.2);
      color: #e53935;
    }

    .status-badge.canceled {
      background: rgba(117, 117, 117, 0.2);
      color: #757575;
    }

    .status-badge.pending {
      background: rgba(255, 167, 38, 0.2);
      color: #ffa726;
    }

    .host-stats {
      display: flex;
      gap: 12px;
      font-size: 12px;
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .stat-icon {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }

    .stat-icon.success {
      background: #43a047;
    }

    .stat-icon.failed {
      background: #e53935;
    }

    .stat-icon.unreachable {
      background: #ff9800;
    }

    .stat-icon.skipped {
      background: #9e9e9e;
    }

    .refresh-btn {
      padding: 6px 12px;
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }

    .refresh-btn:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }

  `;

  override connectedCallback() {
    super.connectedCallback();
    this.loadData();
  }

  private async loadData() {
    this.loading = true;
    
    // Simulate loading with dummy data
    await new Promise(resolve => setTimeout(resolve, 500));
    
    this.executions = [
      {
        id: 'exec-001',
        jobId: 'job-001',
        name: 'Deploy Keepalived',
        type: 'template',
        playbook: 'deploy-keepalived.yml',
        status: 'successful',
        startTime: '2024-01-15T14:30:00Z',
        endTime: '2024-01-15T14:35:42Z',
        duration: 342,
        executedBy: 'admin',
        hosts: ['web-server-01', 'web-server-02', 'web-server-03'],
        hostsSucceeded: 3,
        hostsFailed: 0,
        hostsUnreachable: 0,
        hostsSkipped: 0
      },
      {
        id: 'exec-002',
        jobId: 'job-002',
        name: 'Install KubeOVN',
        type: 'playbook',
        playbook: 'install-kubeovn.yml',
        status: 'running',
        startTime: '2024-01-15T15:00:00Z',
        executedBy: 'operator',
        hosts: ['app-server-01', 'app-server-02', 'db-server-01', 'db-server-02'],
        hostsSucceeded: 2,
        hostsFailed: 0,
        hostsUnreachable: 0,
        hostsSkipped: 0,
        message: 'Updating packages on db-server-01...'
      },
      {
        id: 'exec-003',
        jobId: 'job-003',
        name: 'Run apt-get update',
        type: 'template',
        playbook: 'backup-databases.yml',
        status: 'failed',
        startTime: '2024-01-15T03:00:00Z',
        endTime: '2024-01-15T03:15:23Z',
        duration: 923,
        executedBy: 'system',
        hosts: ['db-server-01', 'db-server-02'],
        hostsSucceeded: 1,
        hostsFailed: 1,
        hostsUnreachable: 0,
        hostsSkipped: 0,
        message: 'Failed to connect to db-server-02'
      },
      {
        id: 'exec-004',
        jobId: 'job-004',
        name: 'Install Containerd',
        type: 'playbook',
        playbook: 'containerd.yml',
        status: 'successful',
        startTime: '2024-01-14T22:00:00Z',
        endTime: '2024-01-14T22:45:30Z',
        duration: 2730,
        executedBy: 'security-team',
        hosts: ['web-server-01', 'web-server-02', 'app-server-01', 'app-server-02'],
        hostsSucceeded: 4,
        hostsFailed: 0,
        hostsUnreachable: 0,
        hostsSkipped: 0
      },
      {
        id: 'exec-005',
        jobId: 'job-005',
        name: 'Configuration Keepalived',
        type: 'template',
        playbook: 'check-keepalived.yml',
        status: 'canceled',
        startTime: '2024-01-14T18:30:00Z',
        endTime: '2024-01-14T18:31:15Z',
        duration: 75,
        executedBy: 'admin',
        hosts: ['web-server-01', 'web-server-02'],
        hostsSucceeded: 0,
        hostsFailed: 0,
        hostsUnreachable: 0,
        hostsSkipped: 2,
        message: 'Canceled by user'
      },
      {
        id: 'exec-006',
        jobId: 'job-006',
        name: 'Deploy RookCeph',
        type: 'playbook',
        playbook: 'deploy-rook-ceph.yml',
        status: 'pending',
        startTime: '2024-01-15T16:00:00Z',
        executedBy: 'monitoring-team',
        hosts: ['new-server-01', 'new-server-02'],
        hostsSucceeded: 0,
        hostsFailed: 0,
        hostsUnreachable: 0,
        hostsSkipped: 0,
        message: 'Waiting in queue...'
      }
    ];

    this.loading = false;
  }

  private handleSearch(e: CustomEvent) {
    this.searchQuery = e.detail.value;
  }

  private handleFilterChange(e: CustomEvent) {
    this.statusFilter = e.detail.value;
  }

  private get filteredExecutions() {
    let filtered = this.executions;

    // Apply status filter
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(e => e.status === this.statusFilter);
    }

    // Apply search filter
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(e => 
        e.name.toLowerCase().includes(query) ||
        e.playbook.toLowerCase().includes(query) ||
        e.executedBy.toLowerCase().includes(query) ||
        e.status.toLowerCase().includes(query)
      );
    }

    return filtered;
  }

  private formatDuration(seconds?: number): string {
    if (!seconds) return '-';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  }

  private formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours === 0) {
      const minutes = Math.floor(diff / (1000 * 60));
      if (minutes === 0) return 'Just now';
      return `${minutes} min ago`;
    }
    if (hours < 24) return `${hours} hours ago`;
    
    return date.toLocaleString();
  }

  private getExecutionColumns(): Column[] {
    return [
      { key: 'status', label: 'Status', width: '100px' },
      { key: 'name', label: 'Job Name', type: 'link' },
      { key: 'playbook', label: 'Playbook' },
      { key: 'hosts', label: 'Hosts' },
      { key: 'executedBy', label: 'Executed By' },
      { key: 'startTime', label: 'Started' },
      { key: 'duration', label: 'Duration' }
    ];
  }

  private getExecutionActions(item: Execution): ActionItem[] {
    const actions: ActionItem[] = [
      { label: 'View Output', action: 'logs' },
      { label: 'View Details', action: 'details' }
    ];

    if (item.status === 'running') {
      actions.push({ label: 'Cancel', action: 'cancel', danger: true });
    } else if (item.status === 'failed' || item.status === 'canceled') {
      actions.push({ label: 'Retry', action: 'retry' });
    }

    return actions;
  }

  private renderStatusBadge(status: string) {
    let icon = '';
    switch (status) {
      case 'running':
        icon = '⏳';
        break;
      case 'successful':
        icon = '✅';
        break;
      case 'failed':
        icon = '❌';
        break;
      case 'canceled':
        icon = '⏹️';
        break;
      case 'pending':
        icon = '⏸️';
        break;
    }

    return html`
      <span class="status-badge ${status}">
        ${icon} ${status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    `;
  }

  private renderHostStats(execution: Execution) {
    return html`
      <div class="host-stats">
        ${execution.hostsSucceeded > 0 ? html`
          <span class="stat-item">
            <span class="stat-icon success"></span>
            ${execution.hostsSucceeded}
          </span>
        ` : ''}
        ${execution.hostsFailed > 0 ? html`
          <span class="stat-item">
            <span class="stat-icon failed"></span>
            ${execution.hostsFailed}
          </span>
        ` : ''}
        ${execution.hostsUnreachable > 0 ? html`
          <span class="stat-item">
            <span class="stat-icon unreachable"></span>
            ${execution.hostsUnreachable}
          </span>
        ` : ''}
        ${execution.hostsSkipped > 0 ? html`
          <span class="stat-item">
            <span class="stat-icon skipped"></span>
            ${execution.hostsSkipped}
          </span>
        ` : ''}
      </div>
    `;
  }

  private handleExecutionAction(e: CustomEvent) {
    const { action, item } = e.detail;
    console.log('Execution action:', action, item);
    
    switch (action) {
      case 'logs':
        // TODO: Show logs drawer
        // this.selectedExecution = item;
        // this.showLogsDrawer = true;
        console.log('Show logs for:', item);
        break;
      case 'details':
        // TODO: Show details drawer
        break;
      case 'cancel':
        // TODO: Cancel execution
        break;
      case 'retry':
        // TODO: Retry execution
        break;
    }
  }

  private handleRefresh() {
    this.loadData();
  }

  private handleRunClick() {
    console.log('Run button clicked');
    // TODO: Open run dialog/drawer to select playbook/template and parameters
  }


  override render() {
    if (this.loading) {
      return html`<loading-state></loading-state>`;
    }

    const columns = this.getExecutionColumns();
    const data = this.filteredExecutions.map(execution => ({
      ...execution,
      status: this.renderStatusBadge(execution.status),
      hosts: this.renderHostStats(execution),
      startTime: this.formatDate(execution.startTime),
      duration: this.formatDuration(execution.duration)
    }));

    return html`
      <div class="container">
        <div class="header">
          <h1>Job Executions</h1>
        </div>

        <div class="controls">
          <div class="controls-left">
            <filter-dropdown
              .options=${[
                { value: 'all', label: 'All' },
                { value: 'running', label: 'Running' },
                { value: 'successful', label: 'Successful' },
                { value: 'failed', label: 'Failed' },
                { value: 'canceled', label: 'Canceled' },
                { value: 'pending', label: 'Pending' }
              ]}
              .selectedValue=${this.statusFilter}
              .showStatusIndicators=${true}
              @filter-change=${this.handleFilterChange}
            ></filter-dropdown>
            
            <search-input
              .placeholder=${'Search executions...'}
              @search-change=${this.handleSearch}
            ></search-input>
          </div>

          <div class="controls-right">
            <button class="refresh-btn" @click=${this.handleRefresh}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M13.65 2.35a8 8 0 10.7 11.3l-1.42-1.42a6 6 0 11-.53-8.46L11 5.17V2h3.17l-1.52 1.52a7.92 7.92 0 011 .83z"/>
              </svg>
              Refresh
            </button>
            
            <button class="btn-run" @click=${this.handleRunClick}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4 2a1 1 0 000 2v8a1 1 0 102 0V4a1 1 0 100-2zM12.441 7.059A1 1 0 0011 8v4a1 1 0 102 0V8a1 1 0 00-1.559-.941l-5.882-3.882A1 1 0 004 4v8a1 1 0 001.559.941l5.882-3.882z"/>
              </svg>
              Run
            </button>
          </div>
        </div>

        <div class="content">
          ${data.length === 0 ? html`
            <empty-state
              .message=${'No executions found'}
            ></empty-state>
          ` : html`
            <resource-table
              .columns=${columns}
              .data=${data}
              .actions=${this.getExecutionActions.bind(this)}
              @action=${this.handleExecutionAction}
            ></resource-table>
          `}
        </div>
      </div>
    `;
  }
}

