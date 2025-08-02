import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';
import { t } from '../i18n';
import { api } from '../api';
import '../components/modal-dialog';

interface User {
  username: string;
  uid: number;
  gid: number;
  groups: string[];
  home: string;
  shell: string;
}

interface NewUser {
  username: string;
  password: string;
  groups: string;
}

export class UsersTab extends LitElement {
  @property({ type: Array }) users: User[] = [];
  @property({ type: Boolean }) showCreateForm = false;
  @property({ type: Boolean }) showEditForm = false;
  @property({ type: Boolean }) showResetPasswordForm = false;
  @property({ type: Object }) newUser: NewUser = { username: '', password: '', groups: '' };
  @property({ type: Object }) editingUser: User | null = null;
  @property({ type: String }) userToDelete: string | null = null;
  @property({ type: String }) resetPasswordUsername: string | null = null;
  @property({ type: String }) newPassword: string = '';
  @property({ type: String }) confirmPassword: string = '';
  @property({ type: String }) searchQuery: string = '';

  static override styles = css`
    :host {
      display: block;
      padding: 16px;
    }

    .header {
      margin-bottom: 20px;
    }

    .actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .search-box {
      position: relative;
      flex: 1;
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

    .clear-search {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: var(--vscode-text-dim);
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 3px;
      transition: background-color 0.2s;
    }

    .clear-search:hover {
      background-color: var(--vscode-toolbar-hoverBackground, rgba(90, 93, 94, 0.1));
    }

    h1 {
      margin: 0 0 24px 0;
      font-size: 24px;
      font-weight: 300;
    }

    .users-table {
      width: 100%;
      border-collapse: collapse;
      background: var(--vscode-bg-light);
      border-radius: 1px;
      border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border, #454545));
    }

    .users-table thead {
      background: var(--vscode-bg-lighter);
    }

    .users-table th {
      padding: 12px;
      text-align: left;
      font-weight: 500;
      font-size: 13px;
      border-bottom: 1px solid var(--vscode-border);
    }

    .users-table td {
      padding: 12px;
      font-size: 14px;
      border-bottom: 1px solid var(--vscode-border);
    }

    .users-table tbody tr:last-child td {
      border-bottom: none;
    }

    .users-table tbody tr:hover {
      background: var(--vscode-bg-lighter);
    }

    .users-table td:last-child {
      text-align: right;
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

    .drawer {
      position: fixed;
      top: 0;
      right: 0;
      width: 400px;
      height: 100%;
      background: var(--vscode-bg-light);
      border-left: 1px solid var(--vscode-border);
      box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
      z-index: 1001;
      overflow-y: auto;
      padding: 24px;
      animation: slideIn 0.3s ease-out;
    }

    @media (max-width: 768px) {
      .drawer {
        width: 100%;
      }
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
      }
      to {
        transform: translateX(0);
      }
    }

    .drawer h2 {
      margin-top: 0;
      margin-bottom: 24px;
      font-size: 20px;
      font-weight: 500;
    }

    .drawer .close-btn {
      position: absolute;
      top: 16px;
      right: 16px;
      padding: 8px;
      background: none;
      border: none;
      cursor: pointer;
      font-size: 20px;
      color: var(--vscode-text-dim);
      transition: color 0.2s;
    }

    .drawer .close-btn:hover {
      color: var(--vscode-text);
    }

    .drawer-form {
      margin-top: 40px;
    }
  `;

  override connectedCallback() {
    super.connectedCallback();
    this.fetchUsers();
    
    // Add click outside listener to close dropdown menus
    this.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.action-menu')) {
        this.closeAllMenus();
      }
    });
    
    // Add document click listener for clicks outside the component
    document.addEventListener('click', this.handleDocumentClick);
    
    // Add keyboard event listener for escape key
    document.addEventListener('keydown', this.handleKeyDown);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this.handleDocumentClick);
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  private handleDocumentClick = (e: MouseEvent) => {
    if (!this.shadowRoot?.contains(e.target as Node)) {
      this.closeAllMenus();
    }
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      // Close action dropdowns first
      this.closeAllMenus();
      
      // Then close drawers if they're open
      if (this.showCreateForm) {
        this.closeCreateDrawer();
      }
      if (this.showEditForm) {
        this.closeEditDrawer();
      }
      if (this.showResetPasswordForm) {
        this.closeResetPasswordDrawer();
      }
    }
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

  async deleteUser() {
    if (this.userToDelete) {
      try {
        await api.delete(`/users/${this.userToDelete}`);
        this.userToDelete = null;
        this.fetchUsers();
        this.closeDeleteModal();
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  }

  openDeleteModal(username: string) {
    this.userToDelete = username;
    const modal = this.shadowRoot?.querySelector('#deleteModal') as any;
    if (modal) {
      modal.open = true;
    }
  }

  closeDeleteModal() {
    this.userToDelete = null;
    const modal = this.shadowRoot?.querySelector('#deleteModal') as any;
    if (modal) {
      modal.open = false;
    }
  }

  openResetPasswordDrawer(username: string) {
    this.resetPasswordUsername = username;
    this.newPassword = '';
    this.confirmPassword = '';
    this.showResetPasswordForm = true;
  }

  closeResetPasswordDrawer() {
    this.showResetPasswordForm = false;
    this.resetPasswordUsername = null;
    this.newPassword = '';
    this.confirmPassword = '';
  }

  async resetPassword() {
    if (!this.resetPasswordUsername) return;
    
    if (this.newPassword !== this.confirmPassword) {
      alert(t('users.passwordMismatch'));
      return;
    }
    
    if (!this.newPassword) {
      alert(t('users.passwordRequired', { default: 'Password is required' }));
      return;
    }
    
    try {
      await api.put(`/users/${this.resetPasswordUsername}/password`, {
        password: this.newPassword
      });
      this.closeResetPasswordDrawer();
      alert(t('users.resetPasswordSuccess', { username: this.resetPasswordUsername }));
    } catch (error) {
      console.error('Error resetting password:', error);
      alert(t('users.resetPasswordError', { default: 'Failed to reset password' }));
    }
  }

  openEditDrawer(username: string) {
    const user = this.users.find(u => u.username === username);
    if (user) {
      this.editingUser = { ...user };
      this.showEditForm = true;
    }
  }

  closeEditDrawer() {
    this.showEditForm = false;
    this.editingUser = null;
  }

  async updateUser() {
    if (!this.editingUser) return;
    
    try {
      await api.put(`/users/${this.editingUser.username}`, {
        groups: this.editingUser.groups.join(',')
      });
      this.showEditForm = false;
      this.editingUser = null;
      this.fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
    }
  }

  updateEditingUser(field: keyof User, value: any) {
    if (!this.editingUser) return;
    
    if (field === 'groups') {
      this.editingUser = { 
        ...this.editingUser, 
        groups: value.split(',').map((g: string) => g.trim()).filter(Boolean)
      };
    } else {
      this.editingUser = { ...this.editingUser, [field]: value };
    }
  }

  toggleActionMenu(event: Event, menuId: string) {
    event.stopPropagation();
    const menu = this.shadowRoot?.getElementById(menuId);
    if (menu) {
      const isOpen = menu.classList.contains('show');
      this.closeAllMenus();
      if (!isOpen) {
        menu.classList.add('show');
        // Focus on the first button in the dropdown for keyboard navigation
        const firstButton = menu.querySelector('button') as HTMLButtonElement;
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

  updateNewUser(field: keyof NewUser, value: string) {
    this.newUser = { ...this.newUser, [field]: value };
  }

  closeCreateDrawer() {
    this.showCreateForm = false;
    this.newUser = { username: '', password: '', groups: '' };
  }

  handleSearch(event: Event) {
    this.searchQuery = (event.target as HTMLInputElement).value;
  }

  clearSearch() {
    this.searchQuery = '';
  }

  get filteredUsers() {
    if (!this.searchQuery.trim()) {
      return this.users;
    }
    
    const query = this.searchQuery.toLowerCase();
    return this.users.filter(user => 
      user.username.toLowerCase().includes(query) ||
      user.uid.toString().includes(query) ||
      user.gid.toString().includes(query) ||
      user.home.toLowerCase().includes(query) ||
      user.shell.toLowerCase().includes(query) ||
      (user.groups && Array.isArray(user.groups) && user.groups.some(group => group.toLowerCase().includes(query)))
    );
  }


  override render() {
    const filteredUsers = this.filteredUsers;
    
    return html`
      <div class="header">
        <h1>${t('users.title')}</h1>
        <div class="actions">
          <div class="search-box">
            <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input 
              type="text" 
              placeholder="${t('common.search', { default: 'Search users...' })}"
              .value=${this.searchQuery}
              @input=${this.handleSearch}
            />
            ${this.searchQuery ? html`
              <button class="clear-search" @click=${this.clearSearch}>
                ✕
              </button>
            ` : ''}
          </div>
          <button class="btn-primary" @click=${() => this.showCreateForm = true}>
            ${t('users.createUser')}
          </button>
        </div>
      </div>
      
      <table class="users-table">
          <thead>
            <tr>
              <th>${t('users.username')}</th>
              <th>${t('users.uid')}</th>
              <th>${t('users.gid')}</th>
              <th>${t('users.home')}</th>
              <th>${t('users.shell')}</th>
              <th>${t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            ${filteredUsers.map((user, index) => html`
              <tr>
                <td>${user.username}</td>
                <td>${user.uid}</td>
                <td>${user.gid}</td>
                <td>${user.home}</td>
                <td>${user.shell}</td>
                <td>
                  <div class="action-menu">
                    <button class="action-dots" @click=${(e: Event) => this.toggleActionMenu(e, `user-${index}`)}>⋮</button>
                    <div class="action-dropdown" id="user-${index}">
                      <button @click=${() => { this.closeAllMenus(); this.openResetPasswordDrawer(user.username); }}>
                        ${t('users.resetPassword')}
                      </button>
                      <button @click=${() => { this.closeAllMenus(); this.openEditDrawer(user.username); }}>
                        ${t('common.edit')}
                      </button>
                      <button class="danger" @click=${() => { this.closeAllMenus(); this.openDeleteModal(user.username); }}>
                        ${t('common.delete')}
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            `)}
          </tbody>
        </table>

      <modal-dialog 
        id="deleteModal" 
        title="${t('users.confirmDelete', { default: 'Delete User' })}" 
        size="small"
        @modal-close=${this.closeDeleteModal}
      >
        <p>
          ${this.userToDelete 
            ? t('users.confirmDeleteMessage', { 
                username: this.userToDelete, 
                default: `Are you sure you want to delete user "${this.userToDelete}"? This action cannot be undone.`
              }) 
            : ''}
        </p>
        <div slot="footer">
          <button class="btn-secondary" @click=${this.closeDeleteModal}>
            ${t('common.cancel')}
          </button>
          <button class="btn-danger" @click=${this.deleteUser}>
            ${t('common.delete')}
          </button>
        </div>
      </modal-dialog>

      ${this.showCreateForm ? html`
        <div class="drawer">
          <button class="close-btn" @click=${this.closeCreateDrawer}>✕</button>
          <h2>${t('users.createUser')}</h2>
          <div class="drawer-form">
            <div class="form-group">
              <label for="username">${t('users.username')}</label>
              <input
                id="username"
                type="text"
                .value=${this.newUser.username}
                @input=${(e: Event) => this.updateNewUser('username', (e.target as HTMLInputElement).value)}
                placeholder="${t('users.username')}"
              />
            </div>
            <div class="form-group">
              <label for="password">${t('users.password')}</label>
              <input
                id="password"
                type="password"
                .value=${this.newUser.password}
                @input=${(e: Event) => this.updateNewUser('password', (e.target as HTMLInputElement).value)}
                placeholder="${t('users.password')}"
              />
            </div>
            <div class="form-group">
              <label for="groups">${t('users.groups')}</label>
              <input
                id="groups"
                type="text"
                .value=${this.newUser.groups}
                @input=${(e: Event) => this.updateNewUser('groups', (e.target as HTMLInputElement).value)}
                placeholder="wheel,users"
              />
            </div>
            <div class="form-actions">
              <button class="btn-secondary" @click=${this.closeCreateDrawer}>
                ${t('common.cancel')}
              </button>
              <button class="btn-primary" @click=${this.createUser}>
                ${t('common.create')}
              </button>
            </div>
          </div>
        </div>
      ` : ''}

      ${this.showEditForm ? html`
        <div class="drawer">
          <button class="close-btn" @click=${this.closeEditDrawer}>✕</button>
          <h2>${t('users.editUser')}</h2>
          <div class="drawer-form">
            <div class="form-group">
              <label for="username">${t('users.username')}</label>
              <input
                id="username"
                type="text"
                .value=${this.editingUser?.username}
                @input=${(e: Event) => this.updateEditingUser('username', (e.target as HTMLInputElement).value)}
                placeholder="${t('users.username')}"
                disabled
              />
            </div>
            <div class="form-group">
              <label for="groups">${t('users.groups')}</label>
              <input
                id="groups"
                type="text"
                .value=${this.editingUser?.groups?.join(',') || ''}
                @input=${(e: Event) => this.updateEditingUser('groups', (e.target as HTMLInputElement).value)}
                placeholder="wheel,users"
              />
            </div>
            <div class="form-actions">
              <button class="btn-secondary" @click=${this.closeEditDrawer}>
                ${t('common.cancel')}
              </button>
              <button class="btn-primary" @click=${this.updateUser}>
                ${t('common.save')}
              </button>
            </div>
          </div>
        </div>
      ` : ''}

      ${this.showResetPasswordForm ? html`
        <div class="drawer">
          <button class="close-btn" @click=${this.closeResetPasswordDrawer}>✕</button>
          <h2>${t('users.resetPassword')} - ${this.resetPasswordUsername}</h2>
          <div class="drawer-form">
            <div class="form-group">
              <label for="new-password">${t('users.newPassword', { default: 'New Password' })}</label>
              <input
                id="new-password"
                type="password"
                .value=${this.newPassword}
                @input=${(e: Event) => this.newPassword = (e.target as HTMLInputElement).value}
                placeholder="${t('users.newPassword', { default: 'New Password' })}"
              />
            </div>
            <div class="form-group">
              <label for="confirm-password">${t('users.confirmPassword')}</label>
              <input
                id="confirm-password"
                type="password"
                .value=${this.confirmPassword}
                @input=${(e: Event) => this.confirmPassword = (e.target as HTMLInputElement).value}
                placeholder="${t('users.confirmPassword')}"
              />
            </div>
            <div class="form-actions">
              <button class="btn-secondary" @click=${this.closeResetPasswordDrawer}>
                ${t('common.cancel')}
              </button>
              <button class="btn-primary" @click=${this.resetPassword}>
                ${t('users.resetPassword')}
              </button>
            </div>
          </div>
        </div>
      ` : ''}
    `;
  }
}

customElements.define('users-tab', UsersTab);
