import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '../ui/action-dropdown.js';
import '../ui/status-badge.js';
import '../ui/empty-state.js';
import type { ActionItem } from '../ui/action-dropdown.js';
export type { ActionItem } from '../ui/action-dropdown.js';

export interface Column {
  key: string;
  label: string;
  type?: 'text' | 'status' | 'link' | 'custom';
  width?: string;
}

export interface ResourceData {
  [key: string]: any;
}

@customElement('resource-table')
export class ResourceTable extends LitElement {
  @property({ type: Array }) columns: Column[] = [];
  @property({ type: Array }) data: ResourceData[] = [];
  @property({ type: String }) emptyMessage = 'No resources found';
  @property({ type: Boolean }) showActions = true;
  @property({ type: Function }) getActions: ((item: ResourceData) => ActionItem[]) | null = null;
  @property({ type: Object }) customRenderers: { [key: string]: (value: any) => any } = {};

  static override styles = css`
    .table {
      width: 100%;
      border-collapse: collapse;
      background: var(--vscode-bg-light);
      border-radius: 1px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border, #454545));
    }

    .table thead {
      background: var(--vscode-bg-lighter);
    }

    .table th {
      background: var(--vscode-bg-dark);
      color: var(--vscode-text);
      font-weight: 600;
      text-align: left;
      padding: 12px 16px;
      font-size: 0.875rem;
      border-bottom: 1px solid var(--vscode-widget-border, var(--vscode-panel-border, #454545));
    }

    .table td {
      padding: 12px 16px;
      color: var(--vscode-text);
      font-size: 0.875rem;
      border-bottom: 1px solid var(--vscode-widget-border, var(--vscode-panel-border, #454545));
      position: relative;
    }

    .table tr:hover td {
      background: rgba(255, 255, 255, 0.02);
    }

    .table tr:last-child td {
      border-bottom: none;
    }

    .table td:last-child {
      text-align: right;
    }

    .link {
      color: var(--vscode-link-foreground, #0096ff);
      cursor: pointer;
      text-decoration: none;
      border-bottom: 1px solid transparent;
      transition: all 0.2s ease;
    }

    .link:hover {
      color: var(--vscode-link-activeForeground, #0096ff);
      text-decoration: none;
      border-bottom-color: var(--vscode-link-foreground, #0096ff);
    }

    .actions-cell {
      width: 50px;
      text-align: center;
    }
  `;

  private handleCellClick(_event: Event, item: ResourceData, column: Column) {
    if (column.type === 'link') {
      this.dispatchEvent(new CustomEvent('cell-click', {
        detail: { item, column },
        bubbles: true,
        composed: true
      }));
    }
  }

  private handleActionClick(event: CustomEvent, item: ResourceData) {
    this.dispatchEvent(new CustomEvent('action', {
      detail: { action: event.detail.action, item },
      bubbles: true,
      composed: true
    }));
  }

  private renderCell(item: ResourceData, column: Column) {
    const value = item[column.key];
    
    // Check for custom renderer first
    const customRenderer = this.customRenderers?.[column.key];
    if (customRenderer) {
      return customRenderer(value);
    }

    switch (column.type) {
      case 'status':
        return html`<status-badge status="${value?.toLowerCase() || 'unknown'}"></status-badge>`;
      
      case 'link':
        return html`
          <span class="link" @click="${(e: Event) => this.handleCellClick(e, item, column)}">
            ${value || '-'}
          </span>
        `;
      
      case 'custom':
        return html`<slot name="cell-${column.key}" .data="${item}"></slot>`;
      
      default:
        return html`${value || '-'}`;
    }
  }

  override render() {
    if (this.data.length === 0) {
      return html`<empty-state message="${this.emptyMessage}"></empty-state>`;
    }

    const defaultActions: ActionItem[] = [
      { label: 'View Details', action: 'view' },
      { label: 'Edit', action: 'edit' },
      { label: 'Delete', action: 'delete', danger: true }
    ];

    return html`
      <table class="table">
        <thead>
          <tr>
            ${this.columns.map(column => html`
              <th style="${column.width ? `width: ${column.width}` : ''}">${column.label}</th>
            `)}
            ${this.showActions ? html`<th class="actions-cell">Actions</th>` : ''}
          </tr>
        </thead>
        <tbody>
          ${this.data.map((item, index) => html`
            <tr>
              ${this.columns.map(column => html`
                <td>${this.renderCell(item, column)}</td>
              `)}
              ${this.showActions ? html`
                <td class="actions-cell">
                  <action-dropdown
                    .actions=${this.getActions ? this.getActions(item) : defaultActions}
                    .menuId=${`menu-${index}`}
                    @action-click=${(e: CustomEvent) => this.handleActionClick(e, item)}
                  ></action-dropdown>
                </td>
              ` : ''}
            </tr>
          `)}
        </tbody>
      </table>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'resource-table': ResourceTable;
  }
}
