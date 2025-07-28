import type { LoginRequest, LoginResponse, APIResponse } from './types/api';

export class AuthManager {
  private static instance: AuthManager;
  private token: string | null = null;
  private expiresAt: number | null = null;

  private constructor() {
    this.loadToken();
  }

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  private loadToken(): void {
    const storedToken = localStorage.getItem('jwt_token');
    const storedExpiry = localStorage.getItem('jwt_expires_at');
    
    if (storedToken && storedExpiry) {
      const expiry = parseInt(storedExpiry, 10);
      if (expiry > Date.now()) {
        this.token = storedToken;
        this.expiresAt = expiry;
      } else {
        this.clearToken();
      }
    }
  }

  private saveToken(token: string, expiresAt: number): void {
    this.token = token;
    this.expiresAt = expiresAt;
    localStorage.setItem('jwt_token', token);
    localStorage.setItem('jwt_expires_at', expiresAt.toString());
  }

  private clearToken(): void {
    this.token = null;
    this.expiresAt = null;
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('jwt_expires_at');
  }

  async login(username: string, password: string): Promise<boolean> {
    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password } as LoginRequest),
      });

      const data: APIResponse<LoginResponse> = await response.json();

      if (response.ok && data.status === 'success' && data.data) {
        this.saveToken(data.data.token, data.data.expires_at);
        window.dispatchEvent(new CustomEvent('auth:login'));
        return true;
      }

      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }

  logout(): void {
    this.clearToken();
    window.dispatchEvent(new CustomEvent('auth:logout'));
    window.location.href = '/';
  }

  isAuthenticated(): boolean {
    return !!this.token && !!this.expiresAt && this.expiresAt > Date.now();
  }

  getToken(): string | null {
    if (this.isAuthenticated()) {
      return this.token;
    }
    return null;
  }

  getAuthHeaders(): Record<string, string> {
    const token = this.getToken();
    if (token) {
      return {
        'Authorization': `Bearer ${token}`,
      };
    }
    return {};
  }

  // Check if token will expire soon (within 5 minutes)
  isTokenExpiringSoon(): boolean {
    if (!this.expiresAt) return true;
    const fiveMinutes = 5 * 60 * 1000;
    return this.expiresAt - Date.now() < fiveMinutes;
  }

  // For WebSocket authentication
  getWebSocketUrl(path: string): string {
    const token = this.getToken();
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    
    if (token) {
      return `${protocol}//${host}${path}?token=${encodeURIComponent(token)}`;
    }
    
    throw new Error('Not authenticated');
  }
}

// Export singleton instance
export const auth = AuthManager.getInstance();
