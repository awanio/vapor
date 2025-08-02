var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, css } from 'lit';
import { state } from 'lit/decorators.js';
import { api, ApiError } from '../api';
import '../components/modal-dialog';
export class ContainersTab extends LitElement {
    constructor() {
        super(...arguments);
        this.activeTab = 'containers';
        this.containers = [];
        this.images = [];
        this.searchTerm = '';
        this.error = null;
        this.runtime = null;
        this.showConfirmModal = false;
        this.confirmAction = null;
        this.selectedContainer = null;
        this.selectedImage = null;
        this.showDrawer = false;
        this.confirmTitle = '';
        this.confirmMessage = '';
    }
    connectedCallback() {
        super.connectedCallback();
        this.fetchData();
        this.addEventListener('click', this.handleOutsideClick.bind(this));
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        this.removeEventListener('click', this.handleOutsideClick.bind(this));
    }
    handleOutsideClick(event) {
        const target = event.target;
        if (!target.closest('.action-menu')) {
            this.closeAllMenus();
        }
    }
    async fetchData() {
        if (this.activeTab === 'containers') {
            await this.fetchContainers();
        }
        else if (this.activeTab === 'images') {
            await this.fetchImages();
        }
    }
    async fetchContainerDetails(id) {
        try {
            const response = await api.get(`/api/v1/containers/${id}`);
            this.selectedContainer = response.data?.container || null;
            this.showDrawer = true;
        }
        catch (error) {
            console.error('Error fetching container details:', error);
        }
    }
    async fetchImageDetails(id) {
        try {
            const response = await api.get(`/api/v1/images/${id}`);
            this.selectedImage = response.data?.image || null;
            this.showDrawer = true;
        }
        catch (error) {
            console.error('Error fetching image details:', error);
        }
    }
}
ContainersTab.styles = css `
    :host {
      display: block;
      padding: 16px;
    }

    .tab-container {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .tab-header {
      display: flex;
      border-bottom: 2px solid var(--border-color);
      margin-bottom: 1rem;
    }

    .tab-button {
      padding: 0.75rem 1.5rem;
      background: none;
      border: none;
      cursor: pointer;
      font-size: 0.875rem;
      color: var(--text-secondary);
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      transition: all 0.2s;
    }

    .tab-button:hover {
      color: var(--text-primary);
    }

    .tab-button.active {
      color: var(--primary);
      border-bottom-color: var(--primary);
    }

    .tab-content {
      flex: 1;
      overflow-y: auto;
    }

    .container {
      background: var(--vscode-bg-light);
      color: var(--vscode-text);
      padding: 16px;
      border-radius: 6px;
      margin-bottom: 16px;
    }

    .container-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: bold;
      margin-bottom: 8px;
    }

    .container-info {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-bottom: 16px;
      font-size: 13px;
    }

    .container-actions {
      display: flex;
      gap: 8px;
    }

    button {
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s;
    }

    .btn-primary {
      background: var(--vscode-accent);
      color: white;
    }

    .btn-primary:hover {
      background: var(--vscode-accent-hover);
    }

    .btn-danger {
      background: var(--vscode-error);
      color: white;
    }

    .btn-danger:hover {
      opacity: 0.9;
    }

    .size-info {
      font-size: 12px;
      color: var(--vscode-text-dim);
    }

    h1 {
      margin: 0 0 24px 0;
      font-size: 24px;
      font-weight: 300;
    }

    h2 {
      font-size: 1.5rem;
      margin-bottom: 1rem;
      color: var(--text-primary);
    }

    .image {
      background: var(--vscode-bg-light);
      color: var(--vscode-text);
      padding: 16px;
      border-radius: 6px;
      margin-bottom: 16px;
    }

    .image-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: bold;
      margin-bottom: 8px;
    }

    .image-info {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-bottom: 16px;
      font-size: 13px;
    }

    .image-actions {
      display: flex;
      gap: 8px;
    }

    .search-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      gap: 1rem;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .section-header h2 {
      margin: 0;
    }

    .search-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-icon {
      position: absolute;
      left: 12px;
      color: var(--vscode-input-placeholderForeground, #999);
      pointer-events: none;
      font-size: 16px;
    }

    .search-input {
      padding: 6px 12px 6px 32px;
      border: 1px solid var(--vscode-widget-border, var(--vscode-input-border, var(--vscode-panel-border, #454545)));
      border-radius: 4px;
      background-color: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      font-size: 0.875rem;
      width: 250px;
      transition: all 0.2s;
      outline: none;
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.08);
    }

    .search-input:hover {
      border-color: var(--vscode-inputOption-hoverBorder, var(--vscode-widget-border, #858585));
    }

    .search-input:focus {
      border-color: var(--vscode-focusBorder, #007acc);
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1), 0 0 0 1px var(--vscode-focusBorder, #007acc);
    }

    .search-input::placeholder {
      color: var(--vscode-input-placeholderForeground, #999);
      opacity: 0.7;
    }

    .empty-state {
      text-align: center;
      padding: 3rem;
      color: var(--text-secondary);
    }

    .error-state {
      text-align: center;
      padding: 3rem;
      color: var(--vscode-error);
      background: var(--vscode-bg-light);
      border-radius: 6px;
      margin: 2rem 0;
    }

    .runtime-info {
      font-size: 0.875rem;
      color: var(--text-secondary);
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      background: var(--vscode-bg-light);
      border-radius: 6px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border, #454545));
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

    .table td button {
      margin-right: 8px;
    }

    .table td button:last-child {
      margin-right: 0;
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
      position: relative;
    }

    .status-icon.running {
      background-color: #4caf50;
      box-shadow: 0 0 4px #4caf50;
    }

    .status-icon.stopped {
      background-color: #9e9e9e;
    }

    .status-icon.paused {
      background-color: #ff9800;
    }

    .status-icon.exited {
      background-color: #f44336;
    }

    .status-icon[data-tooltip]:hover::after {
      content: attr(data-tooltip);
      position: absolute;
      left: 15px;
      top: 50%;
      transform: translateY(-50%);
      padding: 6px 12px;
      background-color: var(--vscode-editorWidget-background, var(--vscode-dropdown-background, #252526));
      color: var(--vscode-editorWidget-foreground, var(--vscode-foreground, #cccccc));
      border: 1px solid var(--vscode-editorWidget-border, var(--vscode-widget-border, #454545));
      border-radius: 4px;
      font-size: 14px;
      white-space: nowrap;
      z-index: 1000;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }

    .truncate {
      max-width: 200px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: inline-block;
      position: relative;
    }

    .truncate[title]:hover::after {
      content: attr(title);
      position: absolute;
      left: 0;
      top: 100%;
      margin-top: 4px;
      padding: 6px 12px;
      background-color: var(--vscode-editorWidget-background, var(--vscode-dropdown-background, #252526));
      color: var(--vscode-editorWidget-foreground, var(--vscode-foreground, #cccccc));
      border: 1px solid var(--vscode-editorWidget-border, var(--vscode-widget-border, #454545));
      border-radius: 4px;
      font-size: 14px;
      white-space: nowrap;
      z-index: 1000;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      pointer-events: none;
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
      color: var(--text-secondary);
      font-size: 18px;
      line-height: 1;
      transition: background-color 0.2s;
      border-radius: 4px;
    }

    .action-dots:hover {
      background-color: var(--vscode-toolbar-hoverBackground, var(--vscode-list-hoverBackground, rgba(90, 93, 94, 0.1)));
    }

    .action-dropdown {
      position: absolute;
      right: 0;
      top: 100%;
      margin-top: 4px;
      background: var(--vscode-dropdown-background, var(--vscode-menu-background, var(--vscode-bg-light, #252526)));
      border: 1px solid var(--vscode-dropdown-border, var(--vscode-menu-border, var(--border-color, #454545)));
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
      color: var(--vscode-menu-foreground, var(--vscode-foreground, var(--vscode-text, #cccccc)));
      cursor: pointer;
      font-size: 13px;
      transition: background-color 0.2s;
    }

    .action-dropdown button:hover {
      background-color: var(--vscode-list-hoverBackground, var(--vscode-toolbar-hoverBackground, rgba(255, 255, 255, 0.08)));
      color: var(--vscode-list-hoverForeground, var(--vscode-foreground));
    }

    .action-dropdown button.danger {
      color: var(--vscode-error);
    }

    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s;
    }

    .btn-primary {
      background: var(--vscode-accent, #007acc);
      color: white;
    }

    .btn-primary:hover {
      background: var(--vscode-accent-hover, #005a9e);
    }

    .btn-secondary {
      background: var(--vscode-button-secondary-bg, #3c3c3c);
      color: var(--vscode-button-secondary-foreground, #cccccc);
      border: 1px solid var(--vscode-button-secondary-border, #5a5a5a);
    }

    .btn-secondary:hover {
      background: var(--vscode-button-secondary-hover-bg, #484848);
    }
  `;
__decorate([
    state()
], ContainersTab.prototype, "activeTab", void 0);
__decorate([
    state()
], ContainersTab.prototype, "containers", void 0);
__decorate([
    state()
], ContainersTab.prototype, "images", void 0);
__decorate([
    state()
], ContainersTab.prototype, "searchTerm", void 0);
__decorate([
    state()
], ContainersTab.prototype, "error", void 0);
__decorate([
    state()
], ContainersTab.prototype, "runtime", void 0);
__decorate([
    state()
], ContainersTab.prototype, "showConfirmModal", void 0);
__decorate([
    state()
], ContainersTab.prototype, "confirmAction", void 0);
__decorate([
    state()
], ContainersTab.prototype, "selectedContainer", void 0);
__decorate([
    state()
], ContainersTab.prototype, "selectedImage", void 0);
__decorate([
    state()
], ContainersTab.prototype, "showDrawer", void 0);
__decorate([
    state()
], ContainersTab.prototype, "confirmTitle", void 0);
__decorate([
    state()
], ContainersTab.prototype, "confirmMessage", void 0);
try {
    const data = await api.get('/containers');
    this.containers = data.containers || [];
    this.runtime = data.runtime || null;
    this.error = null;
}
catch (error) {
    console.error('Error fetching containers:', error);
    if (error instanceof ApiError && error.code === 'NO_RUNTIME_AVAILABLE') {
        this.error = error.message || 'No container runtime found';
        this.containers = [];
        this.runtime = null;
    }
    else if (error instanceof ApiError) {
        this.error = error.message || 'Failed to fetch containers';
    }
    else {
        this.error = 'Error connecting to server';
    }
}
async;
fetchImages();
{
    try {
        const data = await api.get('/images');
        this.images = data.images || [];
        this.runtime = data.runtime || null;
        this.error = null;
    }
    catch (error) {
        console.error('Error fetching images:', error);
        if (error instanceof ApiError && error.code === 'NO_RUNTIME_AVAILABLE') {
            this.error = error.message || 'No container runtime found';
            this.images = [];
            this.runtime = null;
        }
        else if (error instanceof ApiError) {
            this.error = error.message || 'Failed to fetch images';
        }
        else {
            this.error = 'Error connecting to server';
        }
    }
}
showConfirmDialog(title, string, message, string, action, () => void );
{
    this.confirmTitle = title;
    this.confirmMessage = message;
    this.confirmAction = action;
    this.showConfirmModal = true;
}
handleConfirm();
{
    if (this.confirmAction) {
        this.confirmAction();
    }
    this.showConfirmModal = false;
    this.confirmAction = null;
}
handleCancel();
{
    this.showConfirmModal = false;
    this.confirmAction = null;
}
async;
startContainer(id, string, name ?  : string);
{
    this.showConfirmDialog('Start Container', `Are you sure you want to start container "${name || id}"?`, async () => {
        try {
            await api.post(`/containers/${id}/start`);
            this.fetchContainers();
        }
        catch (error) {
            console.error('Error starting container:', error);
        }
    });
}
async;
stopContainer(id, string, name ?  : string);
{
    this.showConfirmDialog('Stop Container', `Are you sure you want to stop container "${name || id}"?`, async () => {
        try {
            await api.post(`/containers/${id}/stop`);
            this.fetchContainers();
        }
        catch (error) {
            console.error('Error stopping container:', error);
        }
    });
}
async;
removeContainer(id, string, name ?  : string);
{
    this.showConfirmDialog('Remove Container', `Are you sure you want to remove container "${name || id}"? This action cannot be undone.`, async () => {
        try {
            await api.delete(`/containers/${id}`);
            this.fetchContainers();
        }
        catch (error) {
            console.error('Error removing container:', error);
        }
    });
}
async;
removeImage(id, string, tag ?  : string);
{
    this.showConfirmDialog('Remove Image', `Are you sure you want to remove image "${tag || id}"? This action cannot be undone.`, async () => {
        try {
            await api.delete(`/images/${id}`);
            this.fetchImages();
        }
        catch (error) {
            console.error('Error removing image:', error);
        }
    });
}
renderContainersTable();
{
    const filteredContainers = this.containers.filter(container => container.name?.toLowerCase().includes(this.searchTerm.toLowerCase()));
    return html `
      <div class="search-container">
        <div class="section-header">
          <h2>Containers</h2>
        </div>
        <div class="search-wrapper">
          <span class="search-icon">🔍</span>
          <input 
            class="search-input"
            type="text" 
            placeholder="Search containers" 
            .value=${this.searchTerm}
            @input=${(e) => this.searchTerm = e.target.value}
          />
        </div>
      </div>
      <table class="table">
        <thead>
          <tr>
            <th>${t('common.name')}</th>
            <th>${t('common.state')}</th>
            <th>ID</th>
            <th>${t('common.image')}</th>
            <th>${t('common.created')}</th>
            <th>${t('common.actions')}</th>
          </tr>
        </thead>
        <tbody>
          ${filteredContainers.map((container, index) => {
        const shortId = container.id?.substring(0, 12) || 'Unknown';
        const createdDate = container.created_at ? new Date(container.created_at).toLocaleString() : 'Unknown';
        const imageName = container.image || 'Unknown';
        const truncatedImage = imageName.length > 20 ? imageName.substring(0, 20) + '...' : imageName;
        return html `
              <tr>
<td>
  <a @click=${() => this.fetchContainerDetails(container.id)} href="#">
    ${container.name || 'Unnamed'}
  </a>
</td>
                <td>
                  <div class="status-indicator">
                    <span class="status-icon ${this.getStatusClass(container.state)}" data-tooltip="${this.getStatusTooltip(container.state)}"></span>
                  </div>
                </td>
                <td>${shortId}</td>
                <td>
                  <span class="truncate" title="${imageName}">${truncatedImage}</span>
                </td>
                <td>${createdDate}</td>
                <td>
                  <div class="action-menu">
                    <button class="action-dots" @click=${(e) => this.toggleActionMenu(e, `container-${index}`)}>⋮</button>
                    <div class="action-dropdown" id="container-${index}">
                      ${container.state === 'CONTAINER_RUNNING'
            ? html `<button @click=${() => { this.closeAllMenus(); this.stopContainer(container.id, container.name); }}>${t('containers.stop')}</button>`
            : html `<button @click=${() => { this.closeAllMenus(); this.startContainer(container.id, container.name); }}>${t('containers.start')}</button>`}
                      <button class="danger" @click=${() => { this.closeAllMenus(); this.removeContainer(container.id, container.name); }}>${t('common.delete')}</button>
                    </div>
                  </div>
                </td>
              </tr>
            `;
    })}
        </tbody>
      </table>
    `;
}
renderImagesTable();
{
    const filteredImages = this.images.filter(image => image.repo_tags?.some(tag => tag.toLowerCase().includes(this.searchTerm.toLowerCase())));
    return html `
      <div class="search-container">
        <div class="section-header">
          <h2>Images</h2>
        </div>
        <div class="search-wrapper">
          <span class="search-icon">🔍</span>
          <input 
            class="search-input"
            type="text" 
            placeholder="Search images" 
            .value=${this.searchTerm}
            @input=${(e) => this.searchTerm = e.target.value}
          />
        </div>
      </div>
      <table class="table">
        <thead>
          <tr>
            <th>${t('common.tags')}</th>
            <th>ID</th>
            <th>${t('common.size')}</th>
            <th>${t('common.runtime')}</th>
            <th>${t('common.created')}</th>
            <th>${t('common.actions')}</th>
          </tr>
        </thead>
        <tbody>
          ${filteredImages.map((image, index) => {
        const shortId = image.id?.substring(0, 12) || 'Unknown';
        const tags = image.repo_tags && image.repo_tags.length > 0
            ? image.repo_tags.join(', ')
            : 'No tags';
        const createdDate = image.created_at ? new Date(image.created_at).toLocaleString() : 'Unknown';
        return html `
              <tr>
<td>
  <a @click=${() => this.fetchImageDetails(image.id)} href="#">
    ${tags}
  </a>
</td>
                <td>${shortId}</td>
                <td>${this.formatSize(image.size)}</td>
                <td>${image.runtime || 'Unknown'}</td>
                <td>${createdDate}</td>
                <td>
                  <div class="action-menu">
                    <button class="action-dots" @click=${(e) => this.toggleActionMenu(e, `image-${index}`)}>⋮</button>
                    <div class="action-dropdown" id="image-${index}">
                      <button class="danger" @click=${() => { this.closeAllMenus(); this.removeImage(image.id, image.repo_tags?.join(', ')); }}>${t('common.delete')}</button>
                    </div>
                  </div>
                </td>
              </tr>
            `;
    })}
        </tbody>
      </table>
    `;
}
formatSize(bytes, number);
{
    if (!bytes)
        return 'Unknown';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}
getStatusClass(state, string | undefined);
string;
{
    switch (state) {
        case 'CONTAINER_RUNNING':
            return 'running';
        case 'CONTAINER_STOPPED':
            return 'stopped';
        case 'CONTAINER_PAUSED':
            return 'paused';
        case 'CONTAINER_EXITED':
            return 'exited';
        default:
            return 'stopped';
    }
}
getStatusTooltip(state, string | undefined);
string;
{
    switch (state) {
        case 'CONTAINER_RUNNING':
            return 'Running';
        case 'CONTAINER_STOPPED':
            return 'Stopped';
        case 'CONTAINER_PAUSED':
            return 'Paused';
        case 'CONTAINER_EXITED':
            return 'Exited';
        default:
            return state || 'Unknown';
    }
}
toggleActionMenu(event, Event, menuId, string);
{
    event.stopPropagation();
    const menu = this.shadowRoot?.getElementById(menuId);
    if (menu) {
        const isOpen = menu.classList.contains('show');
        this.closeAllMenus();
        if (!isOpen) {
            menu.classList.add('show');
        }
    }
}
closeAllMenus();
{
    const menus = this.shadowRoot?.querySelectorAll('.action-dropdown');
    menus?.forEach(menu => menu.classList.remove('show'));
}
renderTabs();
{
    return html `
      <div class="tab-header">
        <button 
          class="tab-button ${this.activeTab === 'containers' ? 'active' : ''}" 
          @click="${() => { this.activeTab = 'containers'; this.fetchData(); }}"
        >
          Containers
        </button>
        <button 
          class="tab-button ${this.activeTab === 'images' ? 'active' : ''}" 
          @click="${() => { this.activeTab = 'images'; this.fetchData(); }}"
        >
          Images
        </button>
      </div>
    `;
}
override;
render();
{
    return html `
      <div class="tab-container">
        <h1>${t('containers.title')}</h1>
        ${this.renderTabs()}
        <div class="tab-content">
          ${this.error ? html `
            <div class="error-state">
              <h3>${this.error.includes('No container runtime found') ? 'Container Runtime Not Available' : 'Error'}</h3>
              <p>${this.error.includes('No container runtime found')
        ? 'Container management features are not available. Please install Docker or a CRI-compatible container runtime (containerd, CRI-O) to use this feature.'
        : this.error}</p>
            </div>
          ` : ''}

          ${!this.error && this.runtime ? html `
            <div class="runtime-info">
              Runtime: ${this.runtime}
            </div>
          ` : ''}

          ${this.activeTab === 'containers' && !this.error ? html `
            ${this.containers.length > 0
        ? this.renderContainersTable()
        : html `
                <h2>Containers</h2>
                <div class="empty-state">No containers found.</div>
              `}
          ` : ''}

          ${this.activeTab === 'images' && !this.error ? html `
            ${this.images.length > 0
        ? this.renderImagesTable()
        : html `
                <h2>Images</h2>
                <div class="empty-state">No images found.</div>
              `}
          ` : ''}
        </div>
      </div>

      <modal-dialog
        ?open=${this.showConfirmModal}
        .title=${this.confirmTitle}
        size="small"
        @modal-close=${this.handleCancel}
      >
        <p>${this.confirmMessage}</p>
        <div slot="footer" style="display: flex; gap: 8px; justify-content: flex-end;">
          <button class="btn btn-secondary" @click=${this.handleCancel}>
            ${t('common.cancel')}
          </button>
          <button class="btn btn-primary" @click=${this.handleConfirm}>
            ${t('common.confirm')}
          </button>
        </div>
      </modal-dialog>

      ${this.showDrawer ? html `
        <div class="drawer">
          ${this.selectedContainer ? html `
            <h2>Container Details</h2>
            <pre>${JSON.stringify(this.selectedContainer, null, 2)}</pre>
          ` : ''}
          ${this.selectedImage ? html `
            <h2>Image Details</h2>
            <pre>${JSON.stringify(this.selectedImage, null, 2)}</pre>
          ` : ''}
          <button @click=${() => this.showDrawer = false}>Close</button>
        </div>
      ` : ''}
    `;
}
customElements.define('containers-tab', ContainersTab);
//# sourceMappingURL=containers-tab.js.map