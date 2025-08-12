var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html, css } from 'lit';
import { state } from 'lit/decorators.js';
import { api, ApiError } from '../api';
export class DockerProcessesTab extends LitElement {
    constructor() {
        super(...arguments);
        this.containers = [];
        this.filteredContainers = [];
        this.error = null;
        this.loading = false;
        this.searchTerm = '';
        this.confirmationModal = {
            isOpen: false,
            title: '',
            message: '',
            action: () => { },
            actionText: '',
            isDangerous: false
        };
        this.handleDocumentClick = () => {
            this.closeAllMenus();
        };
        this.handleKeyDown = (e) => {
            if (e.key === 'Escape' && this.confirmationModal.isOpen) {
                this.closeConfirmationModal();
            }
        };
    }
    connectedCallback() {
        super.connectedCallback();
        this.fetchContainers();
        document.addEventListener('click', this.handleDocumentClick);
        document.addEventListener('keydown', this.handleKeyDown);
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        document.removeEventListener('click', this.handleDocumentClick);
        document.removeEventListener('keydown', this.handleKeyDown);
    }
    toggleActionMenu(event, menuId) {
        event.stopPropagation();
        const menu = this.shadowRoot?.getElementById(menuId);
        if (menu) {
            const isOpen = menu.classList.contains('show');
            this.closeAllMenus();
            if (!isOpen) {
                menu.classList.add('show');
                const firstButton = menu.querySelector('button');
                if (firstButton) {
                    setTimeout(() => firstButton.focus(), 10);
                }
            }
        }
    }
    closeAllMenus() {
        const menus = this.shadowRoot?.querySelectorAll('.action-dropdown');
        menus?.forEach(menu => menu.classList.remove('show'));
    }
    showConfirmationModal(title, message, action, actionText, isDangerous = false) {
        this.confirmationModal = {
            isOpen: true,
            title,
            message,
            action,
            actionText,
            isDangerous
        };
    }
    closeConfirmationModal() {
        this.confirmationModal = {
            ...this.confirmationModal,
            isOpen: false
        };
    }
    confirmAction() {
        this.confirmationModal.action();
        this.closeConfirmationModal();
    }
    async fetchContainers() {
        try {
            this.loading = true;
            this.error = null;
            const data = await api.get('/docker/ps');
            this.containers = data.containers || [];
            this.filterContainers();
        }
        catch (error) {
            console.error('Error fetching Docker containers:', error);
            this.error = error instanceof ApiError ? error.message : 'Failed to fetch Docker containers';
            this.containers = [];
            this.filteredContainers = [];
        }
        finally {
            this.loading = false;
        }
    }
    handleSearchInput(e) {
        const target = e.target;
        this.searchTerm = target.value;
        this.filterContainers();
    }
    filterContainers() {
        if (!this.searchTerm.trim()) {
            this.filteredContainers = [...this.containers];
        }
        else {
            const term = this.searchTerm.toLowerCase();
            this.filteredContainers = this.containers.filter(container => {
                const name = this.formatContainerName(container.names).toLowerCase();
                const image = container.image.toLowerCase();
                const state = container.state.toLowerCase();
                const id = container.id.toLowerCase();
                return name.includes(term) ||
                    image.includes(term) ||
                    state.includes(term) ||
                    id.includes(term);
            });
        }
    }
    getStatusClass(state) {
        switch (state.toLowerCase()) {
            case 'running':
                return 'running';
            case 'exited':
                return 'exited';
            case 'paused':
                return 'paused';
            case 'created':
                return 'created';
            default:
                return 'exited';
        }
    }
    formatContainerName(names) {
        return names && names.length > 0 && names[0] ? names[0].replace(/^\//, '') : 'Unnamed';
    }
    render() {
        return html `
      ${!this.error && this.containers.length > 0 ? html `
        <div class="search-box">
          <input 
            type="text" 
            placeholder="Search containers by name, image, status, or ID..."
            .value=${this.searchTerm}
            @input=${this.handleSearchInput}
          />
          <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
        </div>
      ` : ''}
      
      ${this.error ? html `
        <div class="error-state">
          <h3>Error</h3>
          <p>${this.error}</p>
        </div>
      ` : ''}

      ${!this.error && this.containers.length === 0 && !this.loading ? html `
        <div class="empty-state">
          <p>No Docker containers found.</p>
        </div>
      ` : ''}

      ${!this.error && this.searchTerm && this.filteredContainers.length === 0 && this.containers.length > 0 ? html `
        <div class="empty-state">
          <p>No containers match your search criteria.</p>
        </div>
      ` : ''}

      ${!this.error && this.filteredContainers.length > 0 ? html `
        <table class="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Image</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${this.filteredContainers.map(container => html `
              <tr>
                <td>
                  <span class="truncate" title="${this.formatContainerName(container.names)}">
                    ${this.formatContainerName(container.names)}
                  </span>
                </td>
                <td>
                  <span class="truncate" title="${container.image}">
                    ${container.image}
                  </span>
                </td>
                <td>
                  <div class="status-indicator">
                    <span class="status-icon ${this.getStatusClass(container.state)}"></span>
                    ${container.state}
                  </div>
                </td>
                <td>${new Date(container.created).toLocaleString()}</td>
                <td>
                  <div class="action-menu">
                    <button class="action-dots" @click="${(e) => this.toggleActionMenu(e, `container-${container.id}`)}">⋮</button>
                    <div class="action-dropdown" id="container-${container.id}">
                      ${container.state.toLowerCase() === 'running' ? html `
                        <button @click="${() => { this.closeAllMenus(); this.showStopConfirmation(container.id, this.formatContainerName(container.names)); }}">Stop</button>
                      ` : html `
                        <button @click="${() => { this.closeAllMenus(); this.showStartConfirmation(container.id, this.formatContainerName(container.names)); }}">Start</button>
                      `}
                      <button @click="${() => { this.closeAllMenus(); this.showRestartConfirmation(container.id, this.formatContainerName(container.names)); }}">Restart</button>
                      <button class="danger" @click="${() => { this.closeAllMenus(); this.showDeleteConfirmation(container.id, this.formatContainerName(container.names)); }}">Delete</button>
                    </div>
                  </div>
                </td>
              </tr>
            `)}
          </tbody>
        </table>
      ` : ''}

      ${this.confirmationModal.isOpen ? html `
        <div class="modal-overlay ${this.confirmationModal.isOpen ? 'show' : ''}" @click="${(e) => {
            if (e.target === e.currentTarget)
                this.closeConfirmationModal();
        }}">
          <div class="modal">
            <div class="modal-header">
              <h3 class="modal-title">${this.confirmationModal.title}</h3>
            </div>
            <div class="modal-body">
              <p class="modal-message">${this.confirmationModal.message}</p>
            </div>
            <div class="modal-footer">
              <button class="modal-button modal-button-cancel" @click="${this.closeConfirmationModal}">Cancel</button>
              <button class="modal-button modal-button-confirm ${this.confirmationModal.isDangerous ? 'danger' : ''}" @click="${this.confirmAction}">
                ${this.confirmationModal.actionText}
              </button>
            </div>
          </div>
        </div>
      ` : ''}
    `;
    }
    showStartConfirmation(id, name) {
        this.showConfirmationModal('Start Container', `Are you sure you want to start the container "${name}"?`, () => this.startContainer(id), 'Start', false);
    }
    showStopConfirmation(id, name) {
        this.showConfirmationModal('Stop Container', `Are you sure you want to stop the container "${name}"?`, () => this.stopContainer(id), 'Stop', false);
    }
    showRestartConfirmation(id, name) {
        this.showConfirmationModal('Restart Container', `Are you sure you want to restart the container "${name}"?`, () => this.restartContainer(id), 'Restart', false);
    }
    showDeleteConfirmation(id, name) {
        this.showConfirmationModal('Delete Container', `Are you sure you want to delete the container "${name}"? This action cannot be undone.`, () => this.deleteContainer(id), 'Delete', true);
    }
    async startContainer(id) {
        try {
            console.log('Starting container:', id);
        }
        catch (error) {
            console.error('Error starting container:', error);
        }
    }
    async stopContainer(id) {
        try {
            console.log('Stopping container:', id);
        }
        catch (error) {
            console.error('Error stopping container:', error);
        }
    }
    async restartContainer(id) {
        try {
            console.log('Restarting container:', id);
        }
        catch (error) {
            console.error('Error restarting container:', error);
        }
    }
    async deleteContainer(id) {
        try {
            console.log('Deleting container:', id);
        }
        catch (error) {
            console.error('Error deleting container:', error);
        }
    }
}
DockerProcessesTab.styles = css `
    :host {
      display: block;
      padding: 16px;
    }

    h1 {
      margin: 0 0 24px 0;
      font-size: 24px;
      font-weight: 300;
      color: var(--text-primary);
    }

    .error-state {
      text-align: center;
      padding: 3rem;
      color: var(--vscode-error);
      background: var(--vscode-bg-light);
      border-radius: 6px;
      margin: 2rem 0;
    }

    .empty-state {
      text-align: center;
      padding: 3rem;
      color: var(--text-secondary);
    }

    .table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
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

    .table tr:last-child td {
      border-bottom: none;
    }

    .table tr:hover td {
      background: rgba(255, 255, 255, 0.02);
    }

    .table td:last-child {
      text-align: right;
    }

    .status-indicator {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .status-icon {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      display: inline-block;
    }

    .status-icon.running {
      background-color: #4caf50;
      box-shadow: 0 0 4px #4caf50;
    }

    .status-icon.exited {
      background-color: #9e9e9e;
    }

    .status-icon.paused {
      background-color: #ff9800;
    }

    .status-icon.created {
      background-color: #2196f3;
    }

    .btn {
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      margin-right: 4px;
      transition: all 0.2s;
    }

    .btn-primary {
      background: var(--vscode-accent, #007acc);
      color: white;
    }

    .btn-primary:hover {
      background: var(--vscode-accent-hover, #005a9e);
    }

    .btn-danger {
      background: var(--vscode-error, #f44336);
      color: white;
    }

    .btn-danger:hover {
      opacity: 0.9;
    }

    .btn-secondary {
      background: var(--vscode-button-secondary-bg, #3c3c3c);
      color: var(--vscode-button-secondary-foreground, #cccccc);
      border: 1px solid var(--vscode-button-secondary-border, #5a5a5a);
    }

    .btn-secondary:hover {
      background: var(--vscode-button-secondary-hover-bg, #484848);
    }

    .truncate {
      max-width: 200px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: inline-block;
    }

    .search-box {
      position: relative;
      margin-bottom: 1rem;
      max-width: 250px;
    }

    .search-box input {
      width: 100%;
      padding: 8px 36px 8px 36px;
      border: 1px solid var(--vscode-border);
      border-radius: 4px;
      background: var(--vscode-bg-light);
      color: var(--vscode-text);
      font-size: 14px;
      transition: border-color 0.2s;
    }

    .search-box input:focus {
      outline: none;
      border-color: var(--vscode-accent);
    }

    .search-box input::placeholder {
      color: var(--vscode-text-dim);
    }

    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--vscode-text-dim);
      pointer-events: none;
      width: 16px;
      height: 16px;
    }

    .action-menu {
      position: relative;
      display: inline-block;
    }

    .action-dots {
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px 8px;
      color: var(--vscode-text-dim);
      font-size: 18px;
      line-height: 1;
      transition: background-color 0.2s;
      border-radius: 4px;
    }

    .action-dots:hover {
      background-color: var(--vscode-toolbar-hoverBackground, rgba(90, 93, 94, 0.1));
    }

    .action-dropdown {
      position: absolute;
      right: 0;
      top: 100%;
      margin-top: 4px;
      background: var(--vscode-dropdown-background, var(--vscode-bg-light));
      border: 1px solid var(--vscode-dropdown-border, var(--vscode-border));
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      min-width: 160px;
      z-index: 1000;
      display: none;
    }

    .action-dropdown.show {
      display: block;
    }

    .action-dropdown button {
      display: block;
      width: 100%;
      text-align: left;
      padding: 8px 16px;
      border: none;
      background: none;
      color: var(--vscode-text);
      cursor: pointer;
      font-size: 13px;
      transition: background-color 0.2s;
    }

    .action-dropdown button:hover {
      background-color: var(--vscode-list-hoverBackground, rgba(255, 255, 255, 0.08));
    }

    .action-dropdown button.danger {
      color: var(--vscode-error);
    }

    .action-dropdown button.danger:hover {
      background-color: rgba(244, 67, 54, 0.1);
    }

    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1000;
      overflow: auto;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.2s, visibility 0.2s;
    }

    .modal-overlay.show {
      opacity: 1;
      visibility: visible;
    }

    .modal {
      position: relative;
      background: var(--vscode-bg-light);
      color: var(--vscode-text);
      margin: 40px auto;
      border: 1px solid var(--vscode-border);
      border-radius: 6px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
      width: 90%;
      max-width: 500px;
      max-height: calc(100vh - 80px);
      display: flex;
      flex-direction: column;
      transform: translateY(-20px);
      opacity: 0;
      transition: transform 0.2s, opacity 0.2s;
    }

    .modal-overlay.show .modal {
      transform: translateY(0);
      opacity: 1;
    }

    .modal-header {
      padding: 20px 24px 16px;
      border-bottom: 1px solid var(--vscode-border);
    }

    .modal-title {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: var(--vscode-text);
    }

    .modal-body {
      padding: 20px 24px;
    }

    .modal-message {
      margin: 0;
      color: var(--vscode-text);
      line-height: 1.5;
    }

    .modal-footer {
      padding: 16px 24px 20px;
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      border-top: 1px solid var(--vscode-border);
    }

    .modal-button {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s;
      min-width: 80px;
    }

    .modal-button-cancel {
      background: var(--vscode-button-secondary-bg, #3c3c3c);
      color: var(--vscode-button-secondary-foreground, #cccccc);
      border: 1px solid var(--vscode-button-secondary-border, #5a5a5a);
    }

    .modal-button-cancel:hover {
      background: var(--vscode-button-secondary-hover-bg, #484848);
    }

    .modal-button-confirm {
      background: var(--vscode-accent, #007acc);
      color: white;
    }

    .modal-button-confirm:hover {
      background: var(--vscode-accent-hover, #005a9e);
    }

    .modal-button-confirm.danger {
      background: var(--vscode-error, #f44336);
    }

    .modal-button-confirm.danger:hover {
      opacity: 0.9;
    }
  `;
__decorate([
    state()
], DockerProcessesTab.prototype, "containers", void 0);
__decorate([
    state()
], DockerProcessesTab.prototype, "filteredContainers", void 0);
__decorate([
    state()
], DockerProcessesTab.prototype, "error", void 0);
__decorate([
    state()
], DockerProcessesTab.prototype, "loading", void 0);
__decorate([
    state()
], DockerProcessesTab.prototype, "searchTerm", void 0);
__decorate([
    state()
], DockerProcessesTab.prototype, "confirmationModal", void 0);
customElements.define('docker-processes-tab', DockerProcessesTab);
//# sourceMappingURL=docker-processes-tab.js.map