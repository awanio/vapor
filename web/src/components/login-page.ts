import { html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { auth } from '../auth';
import { I18nLitElement } from '../i18n-mixin';

@customElement('login-page')
export class LoginPage extends I18nLitElement {
  static override styles = css`
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

    .password-input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .password-input-wrapper input {
      padding-right: 2.5rem;
    }

    .password-toggle {
      position: absolute;
      right: 0.75rem;
      background: none;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      padding: 0.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.2s;
      width: 24px;
      height: 24px;
    }

    .password-toggle:hover {
      color: var(--text-primary);
    }

    .password-toggle:focus {
      outline: none;
      color: var(--primary);
    }

    .password-toggle svg {
      width: 20px;
      height: 20px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
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

  @state()
  private username = '';

  @state()
  private password = '';

  @state()
  private loading = false;

  @state()
  private error = '';

  @state()
  private showPassword = false;

  override render() {
    return html`
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
            <div class="password-input-wrapper">
              <input
                id="password"
                type=${this.showPassword ? 'text' : 'password'}
                .value=${this.password}
                @input=${this.handlePasswordInput}
                ?disabled=${this.loading}
                required
                autocomplete="current-password"
              />
              <button
                type="button"
                class="password-toggle"
                @click=${this.togglePasswordVisibility}
                ?disabled=${this.loading}
                title=${this.showPassword ? 'Hide password' : 'Show password'}
                aria-label=${this.showPassword ? 'Hide password' : 'Show password'}
              >
                ${this.showPassword ? html`
                  <!-- Eye Off Icon -->
                  <svg viewBox="0 0 24 24">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ` : html`
                  <!-- Eye Icon -->
                  <svg viewBox="0 0 24 24">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                `}
              </button>
            </div>
          </div>
          
          <button type="submit" ?disabled=${this.loading}>
            ${this.loading ? 'Logging in...' : 'Login'}
          </button>
          
          ${this.error ? html`
            <div class="error-message">${this.error}</div>
          ` : ''}
        </form>
      </div>
    `;
  }

  private handleUsernameInput(e: Event) {
    this.username = (e.target as HTMLInputElement).value;
    this.error = '';
  }

  private handlePasswordInput(e: Event) {
    this.password = (e.target as HTMLInputElement).value;
    this.error = '';
  }

  private togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  private async handleSubmit(e: Event) {
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
        // The auth manager will dispatch an event and app-root will handle the redirect
        this.dispatchEvent(new CustomEvent('login-success', {
          bubbles: true,
          composed: true
        }));
      } else {
        this.error = 'Invalid username or password';
      }
    } catch (error) {
      this.error = 'An error occurred. Please try again.';
      console.error('Login error:', error);
    } finally {
      this.loading = false;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'login-page': LoginPage;
  }
}
