var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { auth } from '../auth';
import { I18nLitElement } from '../i18n-mixin';
let LoginPage = class LoginPage extends I18nLitElement {
    constructor() {
        super(...arguments);
        this.username = '';
        this.password = '';
        this.loading = false;
        this.error = '';
    }
    render() {
        return html `
      <div class="login-container">
        <div class="logo">
          <svg viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </div>
        
        <h1>Vapor</h1>
        
        <form @submit=${this.handleSubmit}>
          <div class="form-group">
            <label for="username">Username</label>
            <input
              id="username"
              type="text"
              .value=${this.username}
              @input=${this.handleUsernameInput}
              ?disabled=${this.loading}
              required
              autocomplete="username"
            />
          </div>
          
          <div class="form-group">
            <label for="password">Password</label>
            <input
              id="password"
              type="password"
              .value=${this.password}
              @input=${this.handlePasswordInput}
              ?disabled=${this.loading}
              required
              autocomplete="current-password"
            />
          </div>
          
          <button type="submit" ?disabled=${this.loading}>
            ${this.loading ? 'Logging in...' : 'Login'}
          </button>
          
          ${this.error ? html `
            <div class="error-message">${this.error}</div>
          ` : ''}
        </form>
      </div>
    `;
    }
    handleUsernameInput(e) {
        this.username = e.target.value;
        this.error = '';
    }
    handlePasswordInput(e) {
        this.password = e.target.value;
        this.error = '';
    }
    async handleSubmit(e) {
        e.preventDefault();
        if (!this.username || !this.password) {
            this.error = 'Please enter both username and password';
            return;
        }
        this.loading = true;
        this.error = '';
        try {
            const success = await auth.login(this.username, this.password);
            if (success) {
                this.dispatchEvent(new CustomEvent('login-success', {
                    bubbles: true,
                    composed: true
                }));
            }
            else {
                this.error = 'Invalid username or password';
            }
        }
        catch (error) {
            this.error = 'An error occurred. Please try again.';
            console.error('Login error:', error);
        }
        finally {
            this.loading = false;
        }
    }
};
LoginPage.styles = css `
    :host {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: var(--surface-0);
    }

    .login-container {
      background: var(--surface-1);
      border-radius: 8px;
      padding: 2rem;
      width: 100%;
      max-width: 400px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    h1 {
      text-align: center;
      color: var(--text-primary);
      margin-bottom: 2rem;
      font-size: 1.5rem;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    label {
      display: block;
      margin-bottom: 0.5rem;
      color: var(--text-secondary);
      font-size: 0.875rem;
    }

    input {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid var(--border-color);
      border-radius: 4px;
      background: var(--surface-0);
      color: var(--text-primary);
      font-size: 1rem;
      transition: border-color 0.2s;
      box-sizing: border-box;
    }

    input:focus {
      outline: none;
      border-color: var(--primary);
    }

    button {
      width: 100%;
      padding: 0.75rem;
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 1rem;
      cursor: pointer;
      transition: background 0.2s;
    }

    button:hover:not(:disabled) {
      background: var(--primary-hover);
    }

    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .error-message {
      color: var(--error);
      text-align: center;
      margin-top: 1rem;
      font-size: 0.875rem;
    }

    .logo {
      text-align: center;
      margin-bottom: 2rem;
    }

    .logo svg {
      width: 64px;
      height: 64px;
      fill: var(--primary);
    }
  `;
__decorate([
    state()
], LoginPage.prototype, "username", void 0);
__decorate([
    state()
], LoginPage.prototype, "password", void 0);
__decorate([
    state()
], LoginPage.prototype, "loading", void 0);
__decorate([
    state()
], LoginPage.prototype, "error", void 0);
LoginPage = __decorate([
    customElement('login-page')
], LoginPage);
export { LoginPage };
//# sourceMappingURL=login-page.js.map