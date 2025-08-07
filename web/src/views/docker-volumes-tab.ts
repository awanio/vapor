import { LitElement, html, css } from 'lit';
import { state } from 'lit/decorators.js';
import { api, ApiError } from '../api';
import type { DockerVolume, DockerVolumesResponse } from '../types/api';

export class DockerVolumesTab extends LitElement {
  @state() private volumes: DockerVolume[] = [];
  @state() private filteredVolumes: DockerVolume[] = [];
  @state() private error: string | null = null;
  @state() private loading = false;
  @state() private searchTerm = '';

  static override styles = css`
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

    .btn {
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      margin-right: 4px;
      transition: all 0.2s;
    }

    .btn-danger {
      background: var(--vscode-error, #f44336);
      color: white;
    }

    .btn-danger:hover {
      opacity: 0.9;
    }

    .truncate {
      max-width: 300px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: inline-block;
    }

    .size-info {
      font-size: 0.8rem;
      color: var(--text-secondary);
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
  `;

  override connectedCallback() {
    super.connectedCallback();
    this.fetchVolumes();
    document.addEventListener('click', this.handleDocumentClick);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this.handleDocumentClick);
  }

  private handleDocumentClick = () => {
    this.closeAllMenus();
  };

  private toggleActionMenu(event: Event, menuId: string) {
    event.stopPropagation();
    const menu = this.shadowRoot?.getElementById(menuId);
    if (menu) {
      const isOpen = menu.classList.contains('show');
      this.closeAllMenus();
      if (!isOpen) {
        menu.classList.add('show');
        const firstButton = menu.querySelector('button') as HTMLButtonElement;
        if (firstButton) {
          setTimeout(() => firstButton.focus(), 10);
        }
      }
    }
  }

  private closeAllMenus() {
    const menus = this.shadowRoot?.querySelectorAll('.action-dropdown');
    menus?.forEach(menu => menu.classList.remove('show'));
  }

  async fetchVolumes() {
    try {
      this.loading = true;
      this.error = null;
      const data = await api.get<DockerVolumesResponse>('/docker/volumes');
      this.volumes = data.volumes || [];
      this.filterVolumes();
    } catch (error) {
      console.error('Error fetching Docker volumes:', error);
      this.error = error instanceof ApiError ? error.message : 'Failed to fetch Docker volumes';
      this.volumes = [];
      this.filteredVolumes = [];
    } finally {
      this.loading = false;
    }
  }

  private handleSearchInput(e: Event) {
    const target = e.target as HTMLInputElement;
    this.searchTerm = target.value;
    this.filterVolumes();
  }

  private filterVolumes() {
    if (!this.searchTerm.trim()) {
      this.filteredVolumes = [...this.volumes];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredVolumes = this.volumes.filter(volume => {
        const name = volume.name.toLowerCase();
        const driver = volume.driver.toLowerCase();
        const mountpoint = volume.mountpoint.toLowerCase();
        
        return name.includes(term) || 
               driver.includes(term) || 
               mountpoint.includes(term);
      });
    }
  }

  formatSize(bytes: number): string {
    if (!bytes) return 'Unknown';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }

  override render() {
    return html`
      ${!this.error && this.volumes.length > 0 ? html`
        <div class="search-box">
          <input 
            type="text" 
            placeholder="Search volumes by name, driver, or mount point..."
            .value=${this.searchTerm}
            @input=${this.handleSearchInput}
          />
          <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
        </div>
      ` : ''}
      
      ${this.error ? html`
        <div class="error-state">
          <h3>Error</h3>
          <p>${this.error}</p>
        </div>
      ` : ''}

      ${!this.error && this.volumes.length === 0 && !this.loading ? html`
        <div class="empty-state">
          <p>No Docker volumes found.</p>
        </div>
      ` : ''}

      ${!this.error && this.searchTerm && this.filteredVolumes.length === 0 && this.volumes.length > 0 ? html`
        <div class="empty-state">
          <p>No volumes match your search criteria.</p>
        </div>
      ` : ''}

      ${!this.error && this.filteredVolumes.length > 0 ? html`
        <table class="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Driver</th>
              <th>Mount Point</th>
              <th>Size</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${this.filteredVolumes.map(volume => html`
              <tr>
                <td>
                  <span class="truncate" title="${volume.name}">
                    ${volume.name}
                  </span>
                </td>
                <td>${volume.driver}</td>
                <td>
                  <span class="truncate" title="${volume.mountpoint}">
                    ${volume.mountpoint}
                  </span>
                </td>
                <td>
                  ${volume.usageData ? html`
                    <div class="size-info">
                      ${this.formatSize(volume.usageData.size)}
                      <br>
                      <small>Refs: ${volume.usageData.refCount}</small>
                    </div>
                  ` : 'Unknown'}
                </td>
                <td>${new Date(volume.createdAt).toLocaleString()}</td>
                <td>
                  <div class="action-menu">
                    <button class="action-dots" @click="${(e: Event) => this.toggleActionMenu(e, `volume-${volume.name}`)}">⋮</button>
                    <div class="action-dropdown" id="volume-${volume.name}">
                      <button @click="${() => { this.closeAllMenus(); this.inspectVolume(volume.name); }}">Inspect</button>
                      <button class="danger" @click="${() => { this.closeAllMenus(); this.deleteVolume(volume.name); }}">Delete</button>
                    </div>
                  </div>
                </td>
              </tr>
            `)}
          </tbody>
        </table>
      ` : ''}
    `;
  }

  async inspectVolume(name: string) {
    try {
      console.log('Inspecting volume:', name);
      // await api.get(`/docker/volumes/${name}`);
    } catch (error) {
      console.error('Error inspecting volume:', error);
    }
  }

  async deleteVolume(name: string) {
    try {
      console.log('Deleting volume:', name);
      // await api.delete(`/docker/volumes/${name}`);
      // this.fetchVolumes();
    } catch (error) {
      console.error('Error deleting volume:', error);
    }
  }
}

customElements.define('docker-volumes-tab', DockerVolumesTab);

