import { LitElement, html, css } from 'lit';
import { state } from 'lit/decorators.js';
import { api, ApiError } from '../api';
import type { DockerImage, DockerImagesResponse } from '../types/api';

export class DockerImagesTab extends LitElement {
  @state() private images: DockerImage[] = [];
  @state() private filteredImages: DockerImage[] = [];
  @state() private error: string | null = null;
  @state() private loading = false;
  @state() private searchTerm = '';
  @state() private confirmationModal: {
    isOpen: boolean;
    title: string;
    message: string;
    action: () => void;
    actionText: string;
    isDangerous: boolean;
  } = {
    isOpen: false,
    title: '',
    message: '',
    action: () => {},
    actionText: '',
    isDangerous: false
  };

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
      color: var(--cds-support-error);
      background: var(--cds-layer-01);
      border-radius: 0;
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
      background: var(--cds-layer-01);
      border-radius: 1px;
      overflow: hidden;
      /* box-shadow: none (Carbon flat) */
      border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border, #454545));
    }

    .table thead {
      background: var(--cds-layer-02);
    }

    .table th {
      background: var(--cds-background);
      color: var(--cds-text-primary);
      font-weight: 600;
      text-align: left;
      padding: 12px 16px;
      font-size: 14px;
      border-bottom: 1px solid var(--vscode-widget-border, var(--vscode-panel-border, #454545));
    }

    .table td {
      padding: 12px 16px;
      color: var(--cds-text-primary);
      font-size: 14px;
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

    .search-box {
      position: relative;
      margin-bottom: 1rem;
      max-width: 250px;
    }

    .search-box input {
      width: 100%;
      padding: 8px 36px 8px 36px;
      border: 1px solid var(--cds-border-subtle);
      border-radius: 0;
      background: var(--cds-layer-01);
      color: var(--cds-text-primary);
      font-size: 14px;
      transition: border-color 0.2s;
    }

    .search-box input:focus {
      outline: none;
      border-color: var(--cds-button-primary);
    }

    .search-box input::placeholder {
      color: var(--cds-text-secondary);
    }

    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--cds-text-secondary);
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
      color: var(--cds-text-secondary);
      font-size: 18px;
      line-height: 1;
      transition: background-color 0.15s;
      border-radius: 0;
    }

    .action-dots:hover {
      background-color: var(--cds-layer-02);
    }

    .action-dropdown {
      position: absolute;
      right: 0;
      top: 100%;
      margin-top: 4px;
      background: var(--vscode-dropdown-background, var(--vscode-bg-light));
      border: 1px solid var(--vscode-dropdown-border, var(--cds-border-subtle));
      border-radius: 0;
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
      color: var(--cds-text-primary);
      cursor: pointer;
      font-size: 14px;
      transition: background-color 0.15s;
    }

    .action-dropdown button:hover {
      background-color: var(--vscode-list-hoverBackground, rgba(255, 255, 255, 0.08));
    }

    .action-dropdown button.danger {
      color: var(--cds-support-error);
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
      background: var(--cds-layer-01);
      color: var(--cds-text-primary);
      margin: 40px auto;
      border: 1px solid var(--cds-border-subtle);
      border-radius: 0;
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
      border-bottom: 1px solid var(--cds-border-subtle);
    }

    .modal-title {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: var(--cds-text-primary);
    }

    .modal-body {
      padding: 20px 24px;
    }

    .modal-message {
      margin: 0;
      color: var(--cds-text-primary);
      line-height: 1.5;
    }

    .modal-footer {
      padding: 16px 24px 20px;
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      border-top: 1px solid var(--cds-border-subtle);
    }

    .modal-button {
      padding: 8px 16px;
      border: none;
      border-radius: 0;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.15s;
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
      background: var(--cds-button-primary);
      color: white;
    }

    .modal-button-confirm:hover {
      background: var(--vscode-accent-hover, var(--cds-button-primary-hover, #0353e9));
    }

    .modal-button-confirm.danger {
      background: var(--vscode-error, #f44336);
    }

    .modal-button-confirm.danger:hover {
      opacity: 0.9;
    }
  `;

  override connectedCallback() {
    super.connectedCallback();
    this.fetchImages();
    document.addEventListener('click', this.handleDocumentClick);
    document.addEventListener('keydown', this.handleKeyDown);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this.handleDocumentClick);
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  private handleDocumentClick = () => {
    this.closeAllMenus();
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.confirmationModal.isOpen) {
      this.closeConfirmationModal();
    }
  };

  async fetchImages() {
    try {
      this.loading = true;
      this.error = null;
      const data = await api.get<DockerImagesResponse>('/docker/images');
      this.images = data.images || [];
      this.filterImages();
    } catch (error) {
      console.error('Error fetching Docker images:', error);
      this.error = error instanceof ApiError ? error.message : 'Failed to fetch Docker images';
      this.images = [];
      this.filteredImages = [];
    } finally {
      this.loading = false;
    }
  }

  private handleSearchInput(e: Event) {
    const target = e.target as HTMLInputElement;
    this.searchTerm = target.value;
    this.filterImages();
  }

  private filterImages() {
    if (!this.searchTerm.trim()) {
      this.filteredImages = [...this.images];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredImages = this.images.filter(image => {
        const tags = image.repoTags.join(' ').toLowerCase();
        const digests = image.repoDigests.join(' ').toLowerCase();
        return tags.includes(term) || digests.includes(term);
      });
    }
  }

  formatSize(bytes: number): string {
    if (!bytes) return 'Unknown';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }

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

  private showConfirmationModal(title: string, message: string, action: () => void, actionText: string, isDangerous: boolean = false) {
    this.confirmationModal = {
      isOpen: true,
      title,
      message,
      action,
      actionText,
      isDangerous
    };
  }

  private closeConfirmationModal() {
    this.confirmationModal = {
      ...this.confirmationModal,
      isOpen: false
    };
  }

  private confirmAction() {
    this.confirmationModal.action();
    this.closeConfirmationModal();
  }

  private showDeleteConfirmation(id: string, tags: string | undefined) {
    const displayName = tags || id;
    this.showConfirmationModal(
      'Delete Image',
      `Are you sure you want to delete the image "${displayName}"? This action cannot be undone.`,
      () => this.deleteImage(id),
      'Delete',
      true
    );
  }

  async deleteImage(id: string) {
    try {
      await api.delete(`/docker/images/${id}`);
      this.fetchImages();
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  }

override render() {
    return html`
      ${!this.error && this.images.length > 0 ? html`
        <div class="search-box">
          <input 
            type="text" 
            placeholder="Search images by tag or digest..."
            .value=${this.searchTerm}
            @input=${this.handleSearchInput}
          />
          <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
        </div>
      ` : ''}
      
      ${this.confirmationModal.isOpen ? html`
        <div class="modal-overlay ${this.confirmationModal.isOpen ? 'show' : ''}" @click="${(e: Event) => {
          if (e.target === e.currentTarget) this.closeConfirmationModal();
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
      
      ${this.error ? html`
        <div class="error-state">
          <h3>Error</h3>
          <p>${this.error}</p>
        </div>
      ` : ''}

      ${!this.error && this.images.length === 0 && !this.loading ? html`
        <div class="empty-state">
          <p>No Docker images found.</p>
        </div>
      ` : ''}

      ${!this.error && this.searchTerm && this.filteredImages.length === 0 && this.images.length > 0 ? html`
        <div class="empty-state">
          <p>No images match your search criteria.</p>
        </div>
      ` : ''}

${!this.error && this.filteredImages.length > 0 ? html`
        <table class="table">
          <thead>
            <tr>
              <th>Tags</th>
              <th>Digests</th>
              <th>Size</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${this.filteredImages.map((image, index) => html`
              <tr>
                <td>${image.repoTags.join(', ')}</td>
                <td>${image.repoDigests.join(', ')}</td>
                <td>${this.formatSize(image.size)}</td>
                <td>${new Date(image.created).toLocaleString()}</td>
                <td>
                  <div class="action-menu">
                    <button class="action-dots" @click=${(e: Event) => this.toggleActionMenu(e, `image-${index}`)}>⋮</button>
                    <div class="action-dropdown" id="image-${index}">
                      <button class="danger" @click=${() => { this.closeAllMenus(); this.showDeleteConfirmation(image.id, image.repoTags?.join(', ')); }}>Delete</button>
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
}

customElements.define('docker-images-tab', DockerImagesTab);

