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
      border-spacing: 0;
      background: transparent;
      border-radius: 0;
      overflow: visible;
      border: 1px solid var(--cds-border-subtle);
      font-family: var(--cds-font-sans);
    }

    .table thead {
      background: var(--cds-layer-01);
    }

    .table th {
      background: var(--cds-layer-01);
      color: var(--cds-text-primary);
      font-weight: 600;
      text-align: left;
      padding: 0 16px;
      height: 48px;
      font-size: 14px;
      letter-spacing: 0.16px;
      border-bottom: 1px solid var(--cds-border-strong);
    }

    .table td {
      padding: 0 16px;
      height: 48px;
      color: var(--cds-text-primary);
      font-size: 14px;
      letter-spacing: 0.16px;
      border-bottom: 1px solid var(--cds-border-subtle);
      position: relative;
      vertical-align: middle;
    }

    .table tr:hover td {
      background: var(--vscode-sidebar-hover);
    }

    .table tr:last-child td {
      border-bottom: none;
    }

    .table td:last-child {
      text-align: right;
    }

    .link {
      color: var(--cds-link-primary);
      cursor: pointer;
      text-decoration: none;
      border-bottom: 1px solid transparent;
      transition: all 0.15s;
    }

    .link:hover {
      color: var(--cds-link-primary-hover);
      text-decoration: none;
      border-bottom-color: var(--cds-link-primary-hover);
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
