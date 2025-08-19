import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import '../../components/ui/search-input';
import '../../components/ui/loading-state';
import '../../components/ui/empty-state';
import '../../components/ui/filter-dropdown';
import '../../components/tables/resource-table';
import '../../components/ui/action-dropdown';
import '../../components/drawers/ansible-execution-drawer';
import { AnsibleService } from '../../services/ansible';
import type { Column } from '../../components/tables/resource-table';
import type { ActionItem } from '../../components/ui/action-dropdown';
import type { ExecutionSummary } from '../../types/ansible';


@customElement('ansible-executions')
export class AnsibleExecutions extends LitElement {
  @state()
  private loading = false;

  @state()
  private searchQuery = '';

  @state()
  private executions: ExecutionSummary[] = [];

  @state()
  private statusFilter: 'all' | 'running' | 'success' | 'failed' = 'all';

  @state()
  private typeFilter: 'all' | 'playbook' | 'adhoc' = 'all';

  @state()
  private showExecutionDrawer = false;

  @state()
  private selectedExecutionId?: string;

  // @state()
  // private error?: string;  // TODO: Implement error handling UI

  @state()
  private refreshInterval?: number;

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
    // Set up auto-refresh for running executions
    this.startAutoRefresh();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.stopAutoRefresh();
  }

  private startAutoRefresh() {
    // Refresh every 5 seconds if there are running executions
    this.refreshInterval = window.setInterval(() => {
      if (this.executions.some(e => e.status === 'running')) {
        this.loadData();
      }
    }, 5000);
  }

  private stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = undefined;
    }
  }

  private async loadData() {
    this.loading = true;
    // this.error = undefined;
    
    try {
      // Apply filters to API call
      const statusFilter = this.statusFilter === 'all' ? undefined : this.statusFilter;
      const typeFilter = this.typeFilter === 'all' ? undefined : this.typeFilter;
      
      const response = await AnsibleService.listExecutions(statusFilter, typeFilter, 100);
      this.executions = response.executions || [];
    } catch (error) {
      console.error('Failed to load executions:', error);
      // this.error = error instanceof Error ? error.message : 'Failed to load executions';
      this.executions = [
        {
          id: 'exec-001',
          type: 'playbook',
          playbook: 'deploy-keepalived.yml',
          status: 'success',
          started_at: '2024-01-15T14:30:00Z',
          finished_at: '2024-01-15T14:35:42Z',
          duration: 342,
          hosts_summary: {
            ok: 3,
            changed: 2,
            unreachable: 0,
            failed: 0,
            skipped: 0,
            rescued: 0,
            ignored: 0
          }
        }
      ];
    } finally {
      this.loading = false;
    }
  }

  private handleSearch(e: CustomEvent) {
    this.searchQuery = e.detail.value;
  }

  private handleFilterChange(e: CustomEvent) {
    this.statusFilter = e.detail.value;
    this.loadData(); // Reload with new filter
  }

  // TODO: Implement type filter change handler
  // private handleTypeFilterChange(e: CustomEvent) {
  //   this.typeFilter = e.detail.value;
  //   this.loadData(); // Reload with new filter
  // }

  private get filteredExecutions() {
    let filtered = this.executions;

    // Apply status filter
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(e => e.status === this.statusFilter);
    }

    // Apply search filter
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(e => {
        const nameMatch = e.playbook?.toLowerCase().includes(query) || false;
        const moduleMatch = e.module?.toLowerCase().includes(query) || false;
        const statusMatch = e.status.toLowerCase().includes(query);
        const idMatch = e.id.toLowerCase().includes(query);
        return nameMatch || moduleMatch || statusMatch || idMatch;
      });
    }

    return filtered;
  }

  private formatDuration(seconds?: number): string {
    return AnsibleService.formatDuration(seconds);
  }

  private formatDate(dateStr?: string): string {
    if (!dateStr) return '-';
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
      { key: 'id', label: 'ID' },
      { key: 'type', label: 'Type' },
      { key: 'playbook', label: 'Playbook/Module' },
      { key: 'hosts', label: 'Hosts' },
      { key: 'started_at', label: 'Started' },
      { key: 'duration', label: 'Duration' }
    ];
  }

  private getExecutionActions(item: ExecutionSummary): ActionItem[] {
    const actions: ActionItem[] = [
      { label: 'View Output', action: 'view' },
      { label: 'Download Log', action: 'download' }
    ];

    if (item.status === 'running') {
      actions.push({ label: 'Cancel', action: 'cancel', danger: true });
    } else if (item.status === 'failed' || item.status === 'cancelled') {
      actions.push({ label: 'Re-run', action: 'rerun' });
    }

    return actions;
  }

  private renderStatusBadge(status: string) {
    let icon = '';
    let displayStatus = status;
    
    switch (status) {
      case 'running':
        icon = '⏳';
        break;
      case 'success':
        icon = '✅';
        displayStatus = 'successful';
        break;
      case 'failed':
        icon = '❌';
        break;
      case 'cancelled':
        icon = '⏹️';
        displayStatus = 'canceled';
        break;
      default:
        icon = '⏸️';
        break;
    }

    return html`
      <span class="status-badge ${displayStatus}">
        ${icon} ${displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
      </span>
    `;
  }

  private renderHostStats(execution: ExecutionSummary) {
    if (!execution.hosts_summary) return html`<span>-</span>`;
    
    const summary = execution.hosts_summary;
    return html`
      <div class="host-stats">
        ${summary.ok > 0 ? html`
          <span class="stat-item">
            <span class="stat-icon success"></span>
            ${summary.ok}
          </span>
        ` : ''}
        ${summary.failed > 0 ? html`
          <span class="stat-item">
            <span class="stat-icon failed"></span>
            ${summary.failed}
          </span>
        ` : ''}
        ${summary.unreachable > 0 ? html`
          <span class="stat-item">
            <span class="stat-icon unreachable"></span>
            ${summary.unreachable}
          </span>
        ` : ''}
        ${summary.skipped > 0 ? html`
          <span class="stat-item">
            <span class="stat-icon skipped"></span>
            ${summary.skipped}
          </span>
        ` : ''}
      </div>
    `;
  }

  private async handleExecutionAction(e: CustomEvent) {
    const { action, item } = e.detail;
    
    switch (action) {
      case 'view':
        this.selectedExecutionId = item.id;
        this.showExecutionDrawer = true;
        break;
      case 'download':
        await this.downloadExecutionLog(item.id);
        break;
      case 'cancel':
        if (confirm('Are you sure you want to cancel this execution?')) {
          await this.cancelExecution(item.id);
        }
        break;
      case 'rerun':
        // TODO: Re-run execution with same parameters
        console.log('Re-run execution:', item);
        break;
    }
  }

  private async downloadExecutionLog(id: string) {
    try {
      const response = await AnsibleService.getExecution(id);
      const content = response.execution.output || 'No output available';
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `execution-${id}.log`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download log:', error);
      alert(`Failed to download log: ${error}`);
    }
  }

  private async cancelExecution(id: string) {
    try {
      await AnsibleService.cancelExecution(id);
      await this.loadData();
    } catch (error) {
      console.error('Failed to cancel execution:', error);
      alert(`Failed to cancel execution: ${error}`);
    }
  }

  private handleRefresh() {
    this.loadData();
  }

  private handleRunClick() {
    // Navigate to playbooks tab to run a playbook
    window.location.href = '/ansible/playbooks';
  }

  private handleDrawerClose() {
    this.showExecutionDrawer = false;
    this.selectedExecutionId = undefined;
  }


  override render() {
    if (this.loading) {
      return html`<loading-state></loading-state>`;
    }

    const columns = this.getExecutionColumns();
    const data = this.filteredExecutions.map(execution => ({
      ...execution,
      status: this.renderStatusBadge(execution.status),
      playbook: execution.playbook || execution.module || '-',
      hosts: this.renderHostStats(execution),
      started_at: this.formatDate(execution.started_at),
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

      ${this.showExecutionDrawer ? html`
        <ansible-execution-drawer
          .executionId=${this.selectedExecutionId}
          .open=${this.showExecutionDrawer}
          @close=${this.handleDrawerClose}
        ></ansible-execution-drawer>
      ` : ''}
    `;
  }
}

