import { html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { login } from '../stores/auth';
import { I18nLitElement } from '../i18n-mixin';

@customElement('login-page')
export class LoginPage extends I18nLitElement {
  static override styles = css`
    :host {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: var(--cds-background);
      font-family: var(--cds-font-sans);
    }

    .login-container {
      background: var(--cds-layer-01);
      border-radius: 0;
      padding: 48px 32px 32px;
      width: 100%;
      max-width: 400px;
    }

    h1 {
      text-align: center;
      color: var(--cds-text-primary);
      margin-bottom: 32px;
      font-size: 32px;
      font-weight: 400;
      line-height: 1.25;
    }

    div#copy {
      text-align: center;
      font-size: 12px;
      letter-spacing: 0.32px;
      width: 100%;
      justify-content: center;
      margin-top: 32px;
      padding-top: 16px;
      color: var(--cds-text-secondary);
      border-top: 1px solid var(--cds-border-subtle);
    }

    .form-group {
      margin-bottom: 24px;
    }

    label {
      display: block;
      margin-bottom: 8px;
      color: var(--cds-text-secondary);
      font-size: 12px;
      font-weight: 400;
      letter-spacing: 0.32px;
    }

    input {
      width: 100%;
      padding: 0 16px;
      height: 40px;
      border: none;
      border-bottom: 2px solid var(--cds-border-subtle);
      border-radius: 0;
      background: var(--cds-field);
      color: var(--cds-text-primary);
      font-size: 14px;
      font-family: var(--cds-font-sans);
      letter-spacing: 0.16px;
      transition: border-color 0.15s;
      box-sizing: border-box;
    }

    input:focus {
      outline: none;
      border-bottom-color: var(--cds-focus);
    }

    input::placeholder {
      color: var(--cds-text-placeholder);
    }

    .password-input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .password-input-wrapper input {
      padding-right: 48px;
    }

    .password-toggle {
      position: absolute;
      right: 0;
      background: none;
      border: none;
      color: var(--cds-text-secondary);
      cursor: pointer;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.15s;
      width: 48px;
      height: 40px;
    }

    .password-toggle:hover {
      color: var(--cds-text-primary);
    }

    .password-toggle:focus {
      outline: none;
      color: var(--cds-interactive);
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

    button[type="submit"] {
      width: 100%;
      padding: 14px 16px;
      min-height: 48px;
      background: var(--cds-button-primary);
      color: #ffffff;
      border: none;
      border-radius: 0;
      font-size: 14px;
      font-weight: 400;
      letter-spacing: 0.16px;
      cursor: pointer;
      transition: background-color 0.15s;
      font-family: var(--cds-font-sans);
    }

    button[type="submit"]:hover:not(:disabled) {
      background: var(--cds-button-primary-hover);
    }

    button[type="submit"]:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .error-message {
      color: var(--cds-support-error);
      text-align: center;
      margin-top: 16px;
      font-size: 14px;
      letter-spacing: 0.16px;
    }

    .logo {
      text-align: center;
      margin-bottom: 24px;
    }

    .logo svg {
      width: 48px;
      height: 48px;
      fill: var(--cds-button-primary);
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
        
        <h1>Vapor by Awanio</h1>
        
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
        <div id="copy">
        <span>&copy; ${new Date().getFullYear()} Awanio. All rights reserved.</span>
        </div>
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
      const success = await login({
        username: this.username,
        password: this.password
      });

      if (success) {
        // The auth store will dispatch an event and app-root will handle the redirect
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
