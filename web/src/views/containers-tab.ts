import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';
import { t } from '../i18n';
import { api } from '../api';

export class ContainersTab extends LitElement {
  @property({ type: Array }) containers = [];

  static styles = css`
    :host {
      display: block;
      padding: 16px;
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
  `;

  connectedCallback() {
    super.connectedCallback();
    this.fetchContainers();
  }

  async fetchContainers() {
    try {
      const data = await api.get('/containers');
      this.containers = data.containers;
    } catch (error) {
      console.error('Error fetching containers:', error);
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

  render() {
    return html`
      <h1>${t('containers.title')}</h1>
      ${this.containers.map(container => this.renderContainer(container))}
    `;
  }
}

customElements.define('containers-tab', ContainersTab);
