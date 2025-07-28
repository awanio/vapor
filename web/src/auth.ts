import type { LoginRequest, LoginResponse, APIResponse } from './types/api';

export class AuthManager {
  private static instance: AuthManager;
  private token: string | null = null;
  private expiresAt: number | null = null;

  private constructor() {
    console.log('[AuthManager] Constructor called');
    this.loadToken();
  }

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  private loadToken(): void {
    console.log('[AuthManager] loadToken called');
    const storedToken = localStorage.getItem('jwt_token');
    const storedExpiry = localStorage.getItem('jwt_expires_at');
    
    console.log('[AuthManager] localStorage values:', {
      storedToken: storedToken ? `${storedToken.substring(0, 20)}...` : 'null',
      storedExpiry,
      currentTime: Date.now(),
      localStorage: {
        jwt_token: localStorage.getItem('jwt_token') ? 'exists' : 'null',
        jwt_expires_at: localStorage.getItem('jwt_expires_at')
      }
    });
    
    if (storedToken && storedExpiry) {
      const expiry = parseInt(storedExpiry, 10);
      console.log('[AuthManager] Token found, checking expiry:', {
        expiry,
        currentTime: Date.now(),
        isExpired: expiry <= Date.now(),
        timeUntilExpiry: expiry - Date.now()
      });
      
      if (expiry > Date.now()) {
        this.token = storedToken;
        this.expiresAt = expiry;
        console.log('[AuthManager] Token loaded successfully');
      } else {
        console.log('[AuthManager] Token expired, clearing');
        this.clearToken();
      }
    } else {
      console.log('[AuthManager] No valid token in localStorage');
    }
  }

  private saveToken(token: string, expiresAt: number): void {
    // Convert seconds to milliseconds if the timestamp appears to be in seconds
    // Unix timestamps in seconds are typically 10 digits, in milliseconds 13 digits
    const expiresAtMs = expiresAt < 10000000000 ? expiresAt * 1000 : expiresAt;
    
    console.log('[AuthManager] saveToken called:', {
      token: token ? `${token.substring(0, 20)}...` : 'null',
      expiresAtOriginal: expiresAt,
      expiresAtMs,
      expiresAtDate: new Date(expiresAtMs).toISOString()
    });
    
    this.token = token;
    this.expiresAt = expiresAtMs;
    localStorage.setItem('jwt_token', token);
    localStorage.setItem('jwt_expires_at', expiresAtMs.toString());
    
    // Verify save
    const savedToken = localStorage.getItem('jwt_token');
    const savedExpiry = localStorage.getItem('jwt_expires_at');
    console.log('[AuthManager] Token saved to localStorage:', {
      savedSuccessfully: savedToken === token && savedExpiry === expiresAtMs.toString(),
      savedToken: savedToken ? 'exists' : 'null',
      savedExpiry
    });
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
        console.log('[AuthManager] Login successful, response data:', {
          hasToken: !!data.data.token,
          expiresAt: data.data.expires_at,
          expiresAtDate: new Date(data.data.expires_at).toISOString()
        });
        this.saveToken(data.data.token, data.data.expires_at);
        window.dispatchEvent(new CustomEvent('auth:login'));
        return true;
      } else {
        console.log('[AuthManager] Login failed:', {
          responseOk: response.ok,
          status: data.status,
          hasData: !!data.data,
          error: data.error
        });
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
    console.log('[AuthManager] getAuthHeaders called, token:', token ? 'present' : 'null');
    if (token) {
      const headers = {
        'Authorization': `Bearer ${token}`,
      };
      console.log('[AuthManager] Returning auth headers:', headers);
      return headers;
    }
    console.log('[AuthManager] No token, returning empty headers');
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
