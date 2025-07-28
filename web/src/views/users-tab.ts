import { LitElement, html, css, property } from 'lit';
import { t } from '../i18n';
import { api } from '../api';

export class UsersTab extends LitElement {
  @property({ type: Array }) users = [];
  @property({ type: Boolean }) showCreateForm = false;
  @property({ type: Object }) newUser = { username: '', password: '', groups: '' };

  static styles = css`
    :host {
      display: block;
      padding: 16px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    h1 {
      margin: 0;
    }

    .users-grid {
      display: grid;
      gap: 12px;
    }

    .user-card {
      background: var(--vscode-bg-light);
      padding: 16px;
      border-radius: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .user-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .user-name {
      font-weight: bold;
      font-size: 16px;
    }

    .user-details {
      font-size: 13px;
      color: var(--vscode-text-dim);
    }

    .user-actions {
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

    .btn-secondary {
      background: var(--vscode-bg-lighter);
      color: var(--vscode-text);
      border: 1px solid var(--vscode-border);
    }

    .btn-secondary:hover {
      background: var(--vscode-border);
    }

    .create-form {
      background: var(--vscode-bg-light);
      padding: 20px;
      border-radius: 6px;
      margin-bottom: 20px;
    }

    .form-group {
      margin-bottom: 16px;
    }

    label {
      display: block;
      margin-bottom: 4px;
      font-weight: 500;
      font-size: 13px;
    }

    input {
      width: 100%;
      padding: 8px;
      border: 1px solid var(--vscode-border);
      background: var(--vscode-bg);
      color: var(--vscode-text);
      border-radius: 4px;
      font-size: 14px;
    }

    input:focus {
      outline: none;
      border-color: var(--vscode-accent);
    }

    .form-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      margin-top: 20px;
    }

    .icon {
      width: 16px;
      height: 16px;
      display: inline-block;
      margin-right: 4px;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.fetchUsers();
  }

  async fetchUsers() {
    try {
      const data = await api.get('/users');
      this.users = data.users;
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }

  async createUser() {
    try {
      await api.post('/users', this.newUser);
      this.showCreateForm = false;
      this.newUser = { username: '', password: '', groups: '' };
      this.fetchUsers();
    } catch (error) {
      console.error('Error creating user:', error);
    }
  }

  async deleteUser(username) {
    if (confirm(t('users.deleteConfirm', { username }))) {
      try {
        await api.delete(`/users/${username}`);
        this.fetchUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  }

  updateNewUser(field, value) {
    this.newUser = { ...this.newUser, [field]: value };
  }

  renderCreateForm() {
    if (!this.showCreateForm) return '';

    return html`
      <div class="create-form">
        <h3>${t('users.createUser')}</h3>
        <div class="form-group">
          <label for="username">${t('users.username')}</label>
          <input
            id="username"
            type="text"
            .value=${this.newUser.username}
            @input=${(e) => this.updateNewUser('username', e.target.value)}
            placeholder="${t('users.username')}"
          />
        </div>
        <div class="form-group">
          <label for="password">${t('users.password')}</label>
          <input
            id="password"
            type="password"
            .value=${this.newUser.password}
            @input=${(e) => this.updateNewUser('password', e.target.value)}
            placeholder="${t('users.password')}"
          />
        </div>
        <div class="form-group">
          <label for="groups">${t('users.groups')}</label>
          <input
            id="groups"
            type="text"
            .value=${this.newUser.groups}
            @input=${(e) => this.updateNewUser('groups', e.target.value)}
            placeholder="wheel,users"
          />
        </div>
        <div class="form-actions">
          <button class="btn-secondary" @click=${() => this.showCreateForm = false}>
            ${t('common.cancel')}
          </button>
          <button class="btn-primary" @click=${this.createUser}>
            ${t('common.create')}
          </button>
        </div>
      </div>
    `;
  }

  renderUser(user) {
    return html`
      <div class="user-card">
        <div class="user-info">
          <div class="user-name">
            <span class="icon">👤</span>
            ${user.username}
          </div>
          <div class="user-details">
            ${t('users.uid')}: ${user.uid} | ${t('users.gid')}: ${user.gid}
          </div>
          <div class="user-details">
            ${t('users.home')}: ${user.home}
          </div>
          <div class="user-details">
            ${t('users.shell')}: ${user.shell}
          </div>
        </div>
        <div class="user-actions">
          <button class="btn-secondary" title="${t('users.resetPassword')}">
            ${t('users.resetPassword')}
          </button>
          <button class="btn-danger" @click=${() => this.deleteUser(user.username)}>
            ${t('common.delete')}
          </button>
        </div>
      </div>
    `;
  }

  render() {
    return html`
      <div class="header">
        <h1>${t('users.title')}</h1>
        <button class="btn-primary" @click=${() => this.showCreateForm = true}>
          ${t('users.createUser')}
        </button>
      </div>
      
      ${this.renderCreateForm()}
      
      <div class="users-grid">
        ${this.users.map(user => this.renderUser(user))}
      </div>
    `;
  }
}

customElements.define('users-tab', UsersTab);
