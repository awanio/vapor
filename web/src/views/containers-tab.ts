import { LitElement, html, css } from 'lit';
import { property, state } from 'lit/decorators.js';
import { t } from '../i18n';
import { api } from '../api';

export class ContainersTab extends LitElement {
  @state()
  private activeTab = 'containers';

  @state()
  private containers: any[] = [];

  @state()
  private images: any[] = [];

  static styles = css`
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

    .empty-state {
      text-align: center;
      padding: 3rem;
      color: var(--text-secondary);
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.fetchData();
  }

  async fetchData() {
    if (this.activeTab === 'containers') {
      await this.fetchContainers();
    } else if (this.activeTab === 'images') {
      await this.fetchImages();
    }
  }

  async fetchContainers() {
    try {
      const data = await api.get('/containers');
      this.containers = data.containers || [];
    } catch (error) {
      console.error('Error fetching containers:', error);
    }
  }

  async fetchImages() {
    try {
      const data = await api.get('/images');
      this.images = data.images || [];
    } catch (error) {
      console.error('Error fetching images:', error);
    }
  }

  async startContainer(id) {
    try {
      await api.post(`/containers/${id}/start`);
      this.fetchContainers();
    } catch (error) {
      console.error('Error starting container:', error);
    }
  }

  async stopContainer(id) {
    try {
      await api.post(`/containers/${id}/stop`);
      this.fetchContainers();
    } catch (error) {
      console.error('Error stopping container:', error);
    }
  }

  async removeContainer(id) {
    if (confirm(t('containers.removeConfirm'))) {
      try {
        await api.delete(`/containers/${id}`);
        this.fetchContainers();
      } catch (error) {
        console.error('Error removing container:', error);
      }
    }
  }

  async removeImage(id) {
    if (confirm(t('containers.removeImageConfirm'))) {
      try {
        await api.delete(`/images/${id}`);
        this.fetchImages();
      } catch (error) {
        console.error('Error removing image:', error);
      }
    }
  }

  renderContainer(container) {
    return html`
      <div class="container">
        <div class="container-header">
          <div>${container.name} - ${container.image}</div>
          <div>${container.state}</div>
        </div>
        <div class="container-info">
          <div>ID: ${container.id}</div>
          <div>Status: ${container.status}</div>
        </div>
        <div class="container-actions">
          ${container.state === 'running'
            ? html`<button class="btn-danger" @click=${() => this.stopContainer(container.id)}>${t('containers.stop')}</button>`
            : html`<button class="btn-primary" @click=${() => this.startContainer(container.id)}>${t('containers.start')}</button>`}
          <button class="btn-danger" @click=${() => this.removeContainer(container.id)}>${t('common.delete')}</button>
        </div>
      </div>
    `;
  }

  renderImage(image) {
    return html`
      <div class="image">
        <div class="image-header">
          <div>${image.repository}:${image.tag || 'latest'}</div>
          <div class="size-info">${this.formatSize(image.size)}</div>
        </div>
        <div class="image-info">
          <div>ID: ${image.id}</div>
          <div>Created: ${new Date(image.created).toLocaleDateString()}</div>
        </div>
        <div class="image-actions">
          <button class="btn-danger" @click=${() => this.removeImage(image.id)}>${t('common.delete')}</button>
        </div>
      </div>
    `;
  }

  formatSize(bytes) {
    if (!bytes) return 'Unknown';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }

  renderTabs() {
    return html`
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

  render() {
    return html`
      <div class="tab-container">
        <h1>${t('containers.title')}</h1>
        ${this.renderTabs()}
        <div class="tab-content">
          ${this.activeTab === 'containers' ? html`
            <h2>Containers</h2>
            ${this.containers.length > 0 
              ? this.containers.map(container => this.renderContainer(container))
              : html`<div class="empty-state">No containers found.</div>`
            }
          ` : ''}

          ${this.activeTab === 'images' ? html`
            <h2>Images</h2>
            ${this.images.length > 0 
              ? this.images.map(image => this.renderImage(image))
              : html`<div class="empty-state">No images found.</div>`
            }
          ` : ''}
        </div>
      </div>
    `;
  }
}

customElements.define('containers-tab', ContainersTab);
