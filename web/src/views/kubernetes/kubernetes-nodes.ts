import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { KubernetesApi } from '../../services/kubernetes-api.js';
import type { KubernetesNode, KubernetesResourceDetails } from '../../services/kubernetes-api.js';
import '../../components/ui/search-input.js';
import '../../components/ui/empty-state.js';
import '../../components/ui/loading-state.js';
import '../../components/tables/resource-table.js';
import '../../components/drawers/detail-drawer.js';
import '../../components/modals/delete-modal.js';
import '../../components/ui/notification-container.js';
import type { Column } from '../../components/tables/resource-table.js';
import type { ActionItem } from '../../components/ui/action-dropdown.js';

@customElement('kubernetes-nodes')
export class KubernetesNodes extends LitElement {
  @property({ type: Array }) nodes: KubernetesNode[] = [];
  @property({ type: String }) searchQuery = '';
  @property({ type: Boolean }) loading = false;
  @property({ type: String }) error: string | null = null;
  
  @state() private showDetails = false;
  @state() private selectedNode: KubernetesNode | null = null;
  @state() private loadingDetails = false;
  @state() private nodeDetails: KubernetesResourceDetails | null = null;

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
      justify-content: space-between;
      gap: 1rem;
    }

    .content {
      flex: 1;
      overflow-y: auto;
    }

    .filters {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .resource-count {
      font-size: 13px;
      color: var(--vscode-descriptionForeground, #cccccc80);
      margin-left: auto;
    }

    /* Detail styles */
    .detail-content {
      padding: 1rem;
    }

    .detail-section {
      margin-bottom: 1.5rem;
    }

    .detail-section h3 {
      margin: 0 0 0.5rem 0;
      font-size: 14px;
      font-weight: 600;
      color: var(--vscode-foreground, #cccccc);
    }

    .detail-item {
      margin-bottom: 0.5rem;
      font-size: 13px;
    }

    .detail-key {
      font-weight: 500;
      color: var(--vscode-textLink-foreground, #3794ff);
    }

    .detail-value {
      color: var(--vscode-foreground, #cccccc);
      font-family: var(--vscode-editor-font-family, monospace);
      white-space: pre-wrap;
      word-break: break-all;
    }

    .condition-item {
      background: var(--vscode-editor-background, #1e1e1e);
      border: 1px solid var(--vscode-widget-border, #303031);
      border-radius: 4px;
      padding: 0.75rem;
      margin-bottom: 0.5rem;
    }

    .condition-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .condition-type {
      font-weight: 500;
      color: var(--vscode-foreground, #cccccc);
    }

    .condition-status {
      font-size: 12px;
      color: var(--vscode-descriptionForeground, #cccccc80);
    }

    .taint-item {
      display: inline-block;
      background: var(--vscode-textBlockQuote-background, #7f7f7f1a);
      border-radius: 4px;
      padding: 4px 8px;
      margin: 2px;
      font-size: 11px;
    }

    .role-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      background: var(--vscode-badge-background, #007acc);
      color: var(--vscode-badge-foreground, white);
      margin-right: 4px;
    }

    .addresses-grid {
      display: grid;
      gap: 0.5rem;
    }

    .address-item {
      padding: 0.5rem;
      background: var(--vscode-editor-background, #1e1e1e);
      border: 1px solid var(--vscode-widget-border, #303031);
      border-radius: 4px;
    }

  `;

  override connectedCallback() {
    super.connectedCallback();
    this.fetchNodes();
  }

  override render() {
    return html`
      <div class="container">
        <div class="header">
          <h1 class="title">Nodes</h1>
        </div>

        <div class="content">
          <div class="filters">
            <search-input
              .value=${this.searchQuery}
              placeholder="Search nodes..."
              @search-change=${this.handleSearchChange}
            ></search-input>

            <span class="resource-count">
              ${this.getFilteredNodes().length} nodes
            </span>
          </div>

          ${this.loading ? html`
            <loading-state message="Loading nodes..."></loading-state>
          ` : this.error ? html`
            <empty-state
              message="Error: ${this.error}"
              icon="error"
            ></empty-state>
          ` : this.renderContent()}
        </div>

        <detail-drawer
          .show=${this.showDetails}
          .title=${this.selectedNode?.name || 'Node Details'}
          .width="800px"
          @close=${() => this.showDetails = false}
        >
          ${this.renderNodeDetail()}
        </detail-drawer>

        <notification-container></notification-container>
      </div>
    `;
  }

  private renderContent() {
    const nodes = this.getFilteredNodes();

    if (nodes.length === 0) {
      return html`
        <empty-state
          message="No nodes found"
          icon="servers"
        ></empty-state>
      `;
    }

    return html`
      <resource-table
        .columns=${this.getColumns()}
        .data=${nodes}
        .getActions=${(item: KubernetesNode) => this.getNodeActions(item)}
        @cell-click=${this.handleCellClick}
        @action=${this.handleAction}
      ></resource-table>
    `;
  }

  private getColumns(): Column[] {
    return [
      { key: 'name', label: 'Name', type: 'link' },
      { key: 'status', label: 'Status', type: 'status' },
      { key: 'roles', label: 'Roles' },
      { key: 'age', label: 'Age' },
      { key: 'version', label: 'Version' },
      { key: 'os', label: 'OS' },
      { key: 'containerRuntime', label: 'Container Runtime' }
    ];
  }

  private getFilteredNodes(): KubernetesNode[] {
    if (!this.searchQuery) {
      return this.nodes;
    }

    const query = this.searchQuery.toLowerCase();
    return this.nodes.filter(node => 
      node.name.toLowerCase().includes(query) ||
      node.status.toLowerCase().includes(query) ||
      node.roles.toLowerCase().includes(query) ||
      node.version.toLowerCase().includes(query) ||
      node.os.toLowerCase().includes(query)
    );
  }

  private getNodeActions(_node: KubernetesNode): ActionItem[] {
    const actions: ActionItem[] = [
      { label: 'View Details', action: 'view' }
    ];

    // Check if node is already cordoned (unschedulable)
    const isUnschedulable = this.nodeDetails?.spec?.unschedulable;
    
    if (isUnschedulable) {
      actions.push({ label: 'Uncordon', action: 'uncordon' });
    } else {
      actions.push({ label: 'Cordon', action: 'cordon' });
    }

    actions.push({ label: 'Drain', action: 'drain', danger: true });

    return actions;
  }

  private async fetchNodes() {
    this.loading = true;
    this.error = null;
    
    try {
      this.nodes = await KubernetesApi.getNodes();
    } catch (error) {
      console.error('Failed to fetch nodes:', error);
      this.error = error instanceof Error ? error.message : 'Failed to load nodes';
      this.showNotification('Failed to load nodes', 'error');
    } finally {
      this.loading = false;
    }
  }

  private async fetchNodeDetails(nodeName: string) {
    this.loadingDetails = true;
    
    try {
      // Use the specific node details endpoint
      const response = await KubernetesApi.getNodeDetails(nodeName);
      // The response contains the node data directly
      this.nodeDetails = response.node || response;
    } catch (error) {
      console.error('Failed to fetch node details:', error);
      this.showNotification('Failed to load node details', 'error');
    } finally {
      this.loadingDetails = false;
    }
  }

  private handleSearchChange(event: CustomEvent) {
    this.searchQuery = event.detail.value;
  }

  private async handleCellClick(event: CustomEvent) {
    const { column, item } = event.detail;
    if (column.key === 'name') {
      await this.viewNodeDetails(item);
    }
  }

  private async handleAction(event: CustomEvent) {
    const { action, item } = event.detail;
    
    switch (action) {
      case 'view':
        await this.viewNodeDetails(item);
        break;
      case 'cordon':
        await this.cordonNode(item);
        break;
      case 'uncordon':
        await this.uncordonNode(item);
        break;
      case 'drain':
        await this.drainNode(item);
        break;
    }
  }

  private async viewNodeDetails(node: KubernetesNode) {
    this.selectedNode = node;
    this.showDetails = true;
    await this.fetchNodeDetails(node.name);
  }

  private async cordonNode(node: KubernetesNode) {
    try {
      await KubernetesApi.updateResource(
        'Node',
        node.name,
        undefined,
        JSON.stringify({
          spec: {
            unschedulable: true
          }
        }),
        'json'
      );
      
      this.showNotification(`Node ${node.name} cordoned successfully`, 'success');
      await this.fetchNodes();
    } catch (error) {
      console.error('Failed to cordon node:', error);
      this.showNotification(`Failed to cordon node ${node.name}`, 'error');
    }
  }

  private async uncordonNode(node: KubernetesNode) {
    try {
      await KubernetesApi.updateResource(
        'Node',
        node.name,
        undefined,
        JSON.stringify({
          spec: {
            unschedulable: false
          }
        }),
        'json'
      );
      
      this.showNotification(`Node ${node.name} uncordoned successfully`, 'success');
      await this.fetchNodes();
    } catch (error) {
      console.error('Failed to uncordon node:', error);
      this.showNotification(`Failed to uncordon node ${node.name}`, 'error');
    }
  }

  private async drainNode(_node: KubernetesNode) {
    // TODO: Implement node draining functionality
    // This requires evicting all pods from the node
    this.showNotification('Node draining is not yet implemented', 'warning');
  }

  private renderNodeDetail() {
    if (!this.selectedNode) return html``;

    if (this.loadingDetails) {
      return html`
        <div class="detail-content">
          <loading-state message="Loading node details..."></loading-state>
        </div>
      `;
    }

    return html`
      <div class="detail-content">
        ${this.renderNodeInfo()}
        ${this.renderSystemInfo()}
        ${this.renderResourceMetrics()}
        ${this.renderConditions()}
        ${this.renderTaints()}
        ${this.renderActionButtons()}
      </div>
    `;
  }

  private renderNodeInfo() {
    if (!this.selectedNode || !this.nodeDetails) return html``;

    const metadata = this.nodeDetails.metadata || {};

    return html`
      <h3>Node Information</h3>
      <div class="detail-item">
        <span class="label">Name</span>
        <span class="value">${this.selectedNode.name}</span>
      </div>
      <div class="detail-item">
        <span class="label">Status</span>
        <span class="value">${this.selectedNode.status}</span>
      </div>
      <div class="detail-item">
        <span class="label">Roles</span>
        <span class="value">${this.selectedNode.roles}</span>
      </div>
      <div class="detail-item">
        <span class="label">Created</span>
        <span class="value">${new Date(metadata.creationTimestamp).toLocaleString()}</span>
      </div>
      <div class="detail-item">
        <span class="label">UID</span>
        <span class="value">${metadata.uid}</span>
      </div>
      <div class="detail-item">
        <span class="label">Pod CIDR</span>
        <span class="value">${this.nodeDetails.spec?.podCIDR || 'N/A'}</span>
      </div>
      <div class="detail-item">
        <span class="label">Provider ID</span>
        <span class="value">${this.nodeDetails.spec?.providerID || 'N/A'}</span>
      </div>
    `;
  }

  private renderSystemInfo() {
    if (!this.selectedNode || !this.nodeDetails) return html``;

    const nodeInfo = this.nodeDetails.status?.nodeInfo || {};

    return html`
      <h3>System Information</h3>
      <div class="detail-item">
        <span class="label">Kubernetes Version</span>
        <span class="value">${nodeInfo.kubeletVersion || 'N/A'}</span>
      </div>
      <div class="detail-item">
        <span class="label">OS</span>
        <span class="value">${nodeInfo.operatingSystem} (${nodeInfo.osImage})</span>
      </div>
      <div class="detail-item">
        <span class="label">Architecture</span>
        <span class="value">${nodeInfo.architecture}</span>
      </div>
      <div class="detail-item">
        <span class="label">Kernel Version</span>
        <span class="value">${nodeInfo.kernelVersion}</span>
      </div>
      <div class="detail-item">
        <span class="label">Container Runtime</span>
        <span class="value">${nodeInfo.containerRuntimeVersion}</span>
      </div>
      <div class="detail-item">
        <span class="label">Boot ID</span>
        <span class="value">${nodeInfo.bootID}</span>
      </div>
    `;
  }

  private renderResourceMetrics() {
    if (!this.nodeDetails) return html``;

    const capacity = this.nodeDetails.status?.capacity || {};
    const allocatable = this.nodeDetails.status?.allocatable || {};

    return html`
      <h3>Resources</h3>
      <div class="resource-metrics">
        <div class="metric-item">
          <div class="metric-label">CPU</div>
          <div class="metric-value">${capacity.cpu || 'N/A'}</div>
          <div class="metric-usage">Allocatable: ${allocatable.cpu || 'N/A'}</div>
        </div>
        <div class="metric-item">
          <div class="metric-label">Memory</div>
          <div class="metric-value">${this.formatMemory(capacity.memory)}</div>
          <div class="metric-usage">Allocatable: ${this.formatMemory(allocatable.memory)}</div>
        </div>
        <div class="metric-item">
          <div class="metric-label">Pods</div>
          <div class="metric-value">${capacity.pods || 'N/A'}</div>
          <div class="metric-usage">Allocatable: ${allocatable.pods || 'N/A'}</div>
        </div>
        <div class="metric-item">
          <div class="metric-label">Ephemeral Storage</div>
          <div class="metric-value">${this.formatMemory(capacity['ephemeral-storage'])}</div>
          <div class="metric-usage">Allocatable: ${this.formatMemory(allocatable['ephemeral-storage'])}</div>
        </div>
      </div>
    `;
  }

  private renderConditions() {
    if (!this.nodeDetails) return html``;

    const conditions = this.nodeDetails.status?.conditions || [];

    return html`
      <h3>Conditions</h3>
      <div class="conditions-grid">
        ${conditions.map((condition: any) => html`
          <div class="condition-item">
            <div class="condition-status ${condition.status.toLowerCase()}"></div>
            <div class="condition-info">
              <div class="condition-type">${condition.type}</div>
              <div class="condition-message">${condition.message || condition.reason || 'No message'}</div>
            </div>
          </div>
        `)}
      </div>
    `;
  }

  private renderTaints() {
    if (!this.nodeDetails) return html``;

    const taints = this.nodeDetails.spec?.taints || [];

    if (taints.length === 0) {
      return html``;
    }

    return html`
      <h3>Taints</h3>
      <div class="taints-list">
        ${taints.map((taint: any) => html`
          <div class="taint-item">
            <span>${taint.key}${taint.value ? `=${taint.value}` : ''}</span>
            <span class="taint-effect">${taint.effect}</span>
          </div>
        `)}
      </div>
    `;
  }

  private renderActionButtons() {
    if (!this.selectedNode || !this.nodeDetails) return html``;

    const isUnschedulable = this.nodeDetails.spec?.unschedulable;

    return html`
      <div class="action-buttons">
        ${isUnschedulable ? html`
          <button class="action-button primary" @click=${() => this.uncordonNode(this.selectedNode!)}>
            Uncordon Node
          </button>
        ` : html`
          <button class="action-button primary" @click=${() => this.cordonNode(this.selectedNode!)}>
            Cordon Node
          </button>
        `}
        <button class="action-button danger" @click=${() => this.drainNode(this.selectedNode!)}>
          Drain Node
        </button>
      </div>
    `;
  }

  private formatMemory(memory?: string): string {
    if (!memory) return 'N/A';
    
    // Convert Ki to GB
    const match = memory.match(/(\d+)Ki/);
    if (match && match[1]) {
      const kb = parseInt(match[1]);
      const gb = kb / 1024 / 1024;
      return `${gb.toFixed(2)} GB`;
    }
    
    return memory;
  }

  private showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') {
    const event = new CustomEvent('show-notification', {
      detail: { message, type },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }
}
