var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '../ui/action-dropdown.js';
import '../ui/status-badge.js';
import '../ui/empty-state.js';
let ResourceTable = class ResourceTable extends LitElement {
    constructor() {
        super(...arguments);
        this.columns = [];
        this.data = [];
        this.emptyMessage = 'No resources found';
        this.showActions = true;
        this.getActions = null;
    }
    handleCellClick(_event, item, column) {
        if (column.type === 'link') {
            this.dispatchEvent(new CustomEvent('cell-click', {
                detail: { item, column },
                bubbles: true,
                composed: true
            }));
        }
    }
    handleActionClick(event, item) {
        this.dispatchEvent(new CustomEvent('action', {
            detail: { action: event.detail.action, item },
            bubbles: true,
            composed: true
        }));
    }
    renderCell(item, column) {
        const value = item[column.key];
        switch (column.type) {
            case 'status':
                return html `<status-badge status="${value?.toLowerCase() || 'unknown'}"></status-badge>`;
            case 'link':
                return html `
          <span class="link" @click="${(e) => this.handleCellClick(e, item, column)}">
            ${value || '-'}
          </span>
        `;
            case 'custom':
                return html `<slot name="cell-${column.key}" .data="${item}"></slot>`;
            default:
                return html `${value || '-'}`;
        }
    }
    render() {
        if (this.data.length === 0) {
            return html `<empty-state message="${this.emptyMessage}"></empty-state>`;
        }
        const defaultActions = [
            { label: 'View Details', action: 'view' },
            { label: 'Edit', action: 'edit' },
            { label: 'Delete', action: 'delete', danger: true }
        ];
        return html `
      <table class="table">
        <thead>
          <tr>
            ${this.columns.map(column => html `
              <th style="${column.width ? `width: ${column.width}` : ''}">${column.label}</th>
            `)}
            ${this.showActions ? html `<th class="actions-cell">Actions</th>` : ''}
          </tr>
        </thead>
        <tbody>
          ${this.data.map((item, index) => html `
            <tr>
              ${this.columns.map(column => html `
                <td>${this.renderCell(item, column)}</td>
              `)}
              ${this.showActions ? html `
                <td class="actions-cell">
                  <action-dropdown
                    .actions="${this.getActions ? this.getActions(item) : defaultActions}"
                    menuId="menu-${index}"
                    @action-click="${(e) => this.handleActionClick(e, item)}"
                  ></action-dropdown>
                </td>
              ` : ''}
            </tr>
          `)}
        </tbody>
      </table>
    `;
    }
};
ResourceTable.styles = css `
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
__decorate([
    property({ type: Array })
], ResourceTable.prototype, "columns", void 0);
__decorate([
    property({ type: Array })
], ResourceTable.prototype, "data", void 0);
__decorate([
    property({ type: String })
], ResourceTable.prototype, "emptyMessage", void 0);
__decorate([
    property({ type: Boolean })
], ResourceTable.prototype, "showActions", void 0);
__decorate([
    property({ type: Function })
], ResourceTable.prototype, "getActions", void 0);
ResourceTable = __decorate([
    customElement('resource-table')
], ResourceTable);
export { ResourceTable };
//# sourceMappingURL=resource-table.js.map