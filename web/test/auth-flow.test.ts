import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../src/app-root';
import '../src/components/login-page';
import { auth } from '../src/auth';
import { login } from '../src/stores/auth';
import type { AppRoot } from '../src/app-root';
import type { LoginPage } from '../src/components/login-page';

// Mock the auth module
vi.mock('../src/auth', () => ({
  auth: {
    isAuthenticated: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    getToken: vi.fn(),
    getAuthHeaders: vi.fn(),
    getWebSocketUrl: vi.fn(),
  }
}));
// Mock the auth store login function used by login-page
vi.mock('../src/stores/auth', () => ({
  login: vi.fn(async () => false),
}));

// Mock metrics store to avoid WebSocket/API usage during auth-flow tests
vi.mock('../src/stores/shared/metrics', () => ({
  initializeMetrics: vi.fn(async () => {}),
  reinitializeMetricsAfterLogin: vi.fn(async () => {}),
}));

// Mock dashboard view to avoid metrics initialization side effects in auth-flow tests
vi.mock('../src/views/dashboard-tab-v2', () => {
  class DummyDashboard extends HTMLElement {}
  if (!customElements.get('dashboard-tab-v2')) {
    customElements.define('dashboard-tab-v2', DummyDashboard);
  }
  return {
    DashboardTabV2: DummyDashboard,
    default: DummyDashboard,
  };
});





describe('Authentication Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear localStorage
    localStorage.clear();
  });

  describe('app-root', () => {
    it('should show login page when not authenticated', async () => {
      vi.mocked(auth.isAuthenticated).mockReturnValue(false);
      
      const el = document.createElement('app-root') as AppRoot;
      document.body.appendChild(el);
      await el.updateComplete;
      
      const loginPage = el.shadowRoot?.querySelector('login-page');
      expect(loginPage).toBeTruthy();
      
      const dashboard = el.shadowRoot?.querySelector('dashboard-tab');
      expect(dashboard).toBeFalsy();
      
      document.body.removeChild(el);
    });

    it('should show dashboard when authenticated', async () => {
      vi.mocked(auth.isAuthenticated).mockReturnValue(true);
      
      const el = document.createElement('app-root') as AppRoot;
      document.body.appendChild(el);
      await el.updateComplete;
      
      const loginPage = el.shadowRoot?.querySelector('login-page');
      expect(loginPage).toBeFalsy();
      
      const header = el.shadowRoot?.querySelector('.app-header');
      expect(header).toBeTruthy();
      
      const logoutButton = el.shadowRoot?.querySelector('.logout-button');
      expect(logoutButton).toBeTruthy();
      expect(logoutButton?.textContent).toBe('Logout');
      
      document.body.removeChild(el);
    });

    it('should handle logout', async () => {
      vi.mocked(auth.isAuthenticated).mockReturnValue(true);
      
      const el = document.createElement('app-root') as AppRoot;
      document.body.appendChild(el);
      await el.updateComplete;
      
      const logoutButton = el.shadowRoot?.querySelector('.logout-button') as HTMLButtonElement;
      logoutButton.click();
      
      expect(auth.logout).toHaveBeenCalled();
      
      document.body.removeChild(el);
    });

    it('should respond to auth events', async () => {
      vi.mocked(auth.isAuthenticated).mockReturnValue(false);
      
      const el = document.createElement('app-root') as AppRoot;
      document.body.appendChild(el);
      await el.updateComplete;
      
      // Should show login initially
      expect(el.shadowRoot?.querySelector('login-page')).toBeTruthy();
      
      // Simulate login event
      vi.mocked(auth.isAuthenticated).mockReturnValue(true);
      window.dispatchEvent(new CustomEvent('auth:login'));
      await el.updateComplete;
      
      // Should now show dashboard
      expect(el.shadowRoot?.querySelector('login-page')).toBeFalsy();
      expect(el.shadowRoot?.querySelector('.app-header')).toBeTruthy();
      
      document.body.removeChild(el);
    });
  });

  describe('login-page', () => {
    it('should render login form', async () => {
      const el = document.createElement('login-page') as LoginPage;
      document.body.appendChild(el);
      await el.updateComplete;
      
      const form = el.shadowRoot?.querySelector('form');
      expect(form).toBeTruthy();
      
      const usernameInput = el.shadowRoot?.querySelector('#username') as HTMLInputElement;
      const passwordInput = el.shadowRoot?.querySelector('#password') as HTMLInputElement;
      const submitButton = el.shadowRoot?.querySelector('button[type="submit"]');
      
      expect(usernameInput).toBeTruthy();
      expect(passwordInput).toBeTruthy();
      expect(submitButton).toBeTruthy();
      expect(submitButton?.textContent?.trim()).toBe('Login');
      
      document.body.removeChild(el);
    });

    it('should handle form submission with valid credentials', async () => {
      vi.mocked(login).mockResolvedValue(true);
      
      const el = document.createElement('login-page') as LoginPage;
      document.body.appendChild(el);
      await el.updateComplete;
      
      const usernameInput = el.shadowRoot?.querySelector('#username') as HTMLInputElement;
      const passwordInput = el.shadowRoot?.querySelector('#password') as HTMLInputElement;
      const form = el.shadowRoot?.querySelector('form') as HTMLFormElement;
      
      // Set input values
      usernameInput.value = 'testuser';
      usernameInput.dispatchEvent(new Event('input'));
      passwordInput.value = 'testpass';
      passwordInput.dispatchEvent(new Event('input'));
      
      await el.updateComplete;
      
      // Listen for login success event
      let loginSuccessEventFired = false;
      el.addEventListener('login-success', () => {
        loginSuccessEventFired = true;
      });
      
      // Submit form
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      
      // Wait for async operations
      await vi.waitFor(() => {
        expect(login).toHaveBeenCalledWith({ username: 'testuser', password: 'testpass' });
      });
      
      // Wait for event to fire
      await vi.waitFor(() => {
        expect(loginSuccessEventFired).toBe(true);
      });
      
      document.body.removeChild(el);
    });

    it('should show error on invalid credentials', async () => {
      vi.mocked(login).mockResolvedValue(false);
      
      const el = document.createElement('login-page') as LoginPage;
      document.body.appendChild(el);
      await el.updateComplete;
      
      const usernameInput = el.shadowRoot?.querySelector('#username') as HTMLInputElement;
      const passwordInput = el.shadowRoot?.querySelector('#password') as HTMLInputElement;
      const form = el.shadowRoot?.querySelector('form') as HTMLFormElement;
      
      // Set input values
      usernameInput.value = 'testuser';
      usernameInput.dispatchEvent(new Event('input'));
      passwordInput.value = 'wrongpass';
      passwordInput.dispatchEvent(new Event('input'));
      
      await el.updateComplete;
      
      // Submit form
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      
      // Wait for async operations
      await vi.waitFor(() => {
        expect(login).toHaveBeenCalledWith({ username: 'testuser', password: 'wrongpass' });
      });
      
      // Wait for error message to appear
      await vi.waitFor(() => {
        const errorMessage = el.shadowRoot?.querySelector('.error-message');
        expect(errorMessage).toBeTruthy();
        expect(errorMessage?.textContent).toBe('Invalid username or password');
      });
      
      document.body.removeChild(el);
    });

    it('should validate empty fields', async () => {
      const el = document.createElement('login-page') as LoginPage;
      document.body.appendChild(el);
      await el.updateComplete;
      
      const form = el.shadowRoot?.querySelector('form') as HTMLFormElement;
      
      // Submit form without filling fields
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      
      await el.updateComplete;
      
      const errorMessage = el.shadowRoot?.querySelector('.error-message');
      expect(errorMessage).toBeTruthy();
      expect(errorMessage?.textContent).toBe('Please enter both username and password');
      
      // Login should not be called
      expect(login).not.toHaveBeenCalled();
      
      document.body.removeChild(el);
    });

    it('should disable form during loading', async () => {
      // Make login take some time
      vi.mocked(login).mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(true), 100)));
      
      const el = document.createElement('login-page') as LoginPage;
      document.body.appendChild(el);
      await el.updateComplete;
      
      const usernameInput = el.shadowRoot?.querySelector('#username') as HTMLInputElement;
      const passwordInput = el.shadowRoot?.querySelector('#password') as HTMLInputElement;
      const submitButton = el.shadowRoot?.querySelector('button[type="submit"]') as HTMLButtonElement;
      const form = el.shadowRoot?.querySelector('form') as HTMLFormElement;
      
      // Set input values
      usernameInput.value = 'testuser';
      usernameInput.dispatchEvent(new Event('input'));
      passwordInput.value = 'testpass';
      passwordInput.dispatchEvent(new Event('input'));
      
      await el.updateComplete;
      
      // Submit form
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      
      await el.updateComplete;
      
      // Check loading state
      expect(usernameInput.disabled).toBe(true);
      expect(passwordInput.disabled).toBe(true);
      expect(submitButton.disabled).toBe(true);
      expect(submitButton.textContent?.trim()).toBe('Logging in...');
      
      // Wait for login to complete
      await vi.waitFor(() => {
        expect(submitButton.textContent?.trim()).toBe('Login');
      });
      
      document.body.removeChild(el);
    });
  });
});
