/**
 * Authentication Store
 * Manages authentication state, token refresh, and session management
 */

import { atom, computed, map } from 'nanostores';
import type { 
  AuthState, 
  AuthTokenResponse, 
  LoginCredentials, 
  AuthError,
  AuthErrorType,
  SessionConfig 
} from './types/auth';
import { 
  AuthStorage, 
  SessionTracker, 
  extractPermissions, 
  getTimeUntilExpiry
} from './utils/auth';
import { getApiUrl } from '../config';

// Default session configuration
const DEFAULT_SESSION_CONFIG: SessionConfig = {
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  refreshThreshold: 5 * 60 * 1000, // 5 minutes before expiry
  autoRefresh: true,
  enableSessionTimeout: true
};

// Auth state store
const $authState = map<AuthState>({
  user: null,
  token: null,
  refreshToken: null,
  expiresAt: null,
  permissions: new Set(),
  isRefreshing: false,
  lastActivity: Date.now()
});

// Session configuration store
const $sessionConfig = map<SessionConfig>(DEFAULT_SESSION_CONFIG);

// Auth error store
const $authError = atom<AuthError | null>(null);

// Computed stores
export const $isAuthenticated = computed($authState, (state) => {
  return !!state.token && !!state.expiresAt && state.expiresAt > Date.now();
});

export const $user = computed($authState, (state) => state.user);
export const $token = computed($authState, (state) => state.token);
export const $permissions = computed($authState, (state) => state.permissions);
export const $isRefreshing = computed($authState, (state) => state.isRefreshing);

// Token refresh timer
let refreshTimer: NodeJS.Timeout | null = null;
let sessionTimer: NodeJS.Timeout | null = null;

/**
 * Initialize the auth store
 */
export function initAuthStore(): void {
  console.log('[AuthStore] Initializing');
  
  // Load stored auth data
  const stored = AuthStorage.load();
  if (stored.token && stored.expiresAt && stored.user) {
    // Check if token is still valid
    if (stored.expiresAt > Date.now()) {
      $authState.setKey('token', stored.token);
      $authState.setKey('refreshToken', stored.refreshToken);
      $authState.setKey('expiresAt', stored.expiresAt);
      $authState.setKey('user', stored.user);
      $authState.setKey('permissions', extractPermissions(stored.token));
      
      console.log('[AuthStore] Restored auth from storage');
      
      // Setup auto-refresh
      setupTokenRefresh();
    } else {
      console.log('[AuthStore] Stored token expired, clearing');
      AuthStorage.clear();
    }
  }
  
  // Initialize session tracking
  SessionTracker.init();
  setupSessionTimeout();
  
  // Listen for activity
  SessionTracker.addListener(() => {
    $authState.setKey('lastActivity', Date.now());
  });
  
  console.log('[AuthStore] Initialized');
}

/**
 * Login with credentials
 */
export async function login(credentials: LoginCredentials): Promise<boolean> {
  try {
    console.log('[AuthStore] Attempting login');
    
    const response = await fetch(getApiUrl('/auth/login'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...credentials,
        auth_type: credentials.auth_type || 'password'
      }),
    });
    
    const data = await response.json();
    
    if (response.ok && data.status === 'success' && data.data) {
      const authData = data.data as AuthTokenResponse;
      
      // Update store
      $authState.set({
        user: authData.user,
        token: authData.token,
        refreshToken: authData.refresh_token,
        expiresAt: authData.expires_at < 10000000000 ? authData.expires_at * 1000 : authData.expires_at,
        permissions: extractPermissions(authData.token),
        isRefreshing: false,
        lastActivity: Date.now()
      });
      
      // Save to storage
      AuthStorage.save(
        authData.token,
        authData.refresh_token,
        authData.expires_at,
        authData.user
      );
      
      // Setup auto-refresh
      setupTokenRefresh();
      
      // Reset session timer
      SessionTracker.reset();
      setupSessionTimeout();
      
      // Dispatch login event
      window.dispatchEvent(new CustomEvent('auth:login', { 
        detail: { user: authData.user } 
      }));
      
      console.log('[AuthStore] Login successful');
      return true;
    } else {
      const error: AuthError = {
        type: 'INVALID_CREDENTIALS' as AuthErrorType,
        message: data.error?.message || 'Invalid credentials',
        timestamp: Date.now(),
        details: data.error
      };
      $authError.set(error);
      console.error('[AuthStore] Login failed:', error);
      return false;
    }
  } catch (error) {
    const authError: AuthError = {
      type: 'NETWORK_ERROR' as AuthErrorType,
      message: error instanceof Error ? error.message : 'Network error',
      timestamp: Date.now(),
      details: error
    };
    $authError.set(authError);
    console.error('[AuthStore] Login error:', error);
    return false;
  }
}

/**
 * Refresh the authentication token
 */
export async function refreshToken(): Promise<boolean> {
  const state = $authState.get();
  
  if (!state.refreshToken || state.isRefreshing) {
    console.log('[AuthStore] Cannot refresh token', {
      hasRefreshToken: !!state.refreshToken,
      isRefreshing: state.isRefreshing
    });
    return false;
  }
  
  console.log('[AuthStore] Refreshing token');
  $authState.setKey('isRefreshing', true);
  
  try {
    const response = await fetch(getApiUrl('/auth/refresh'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify({
        refresh_token: state.refreshToken
      }),
    });
    
    const data = await response.json();
    
    if (response.ok && data.status === 'success' && data.data) {
      const authData = data.data as AuthTokenResponse;
      
      // Update store
      $authState.set({
        user: authData.user,
        token: authData.token,
        refreshToken: authData.refresh_token,
        expiresAt: authData.expires_at < 10000000000 ? authData.expires_at * 1000 : authData.expires_at,
        permissions: extractPermissions(authData.token),
        isRefreshing: false,
        lastActivity: Date.now()
      });
      
      // Save to storage
      AuthStorage.save(
        authData.token,
        authData.refresh_token,
        authData.expires_at,
        authData.user
      );
      
      // Setup next refresh
      setupTokenRefresh();
      
      console.log('[AuthStore] Token refreshed successfully');
      return true;
    } else {
      const error: AuthError = {
        type: 'REFRESH_FAILED' as AuthErrorType,
        message: data.error?.message || 'Failed to refresh token',
        timestamp: Date.now(),
        details: data.error
      };
      $authError.set(error);
      console.error('[AuthStore] Token refresh failed:', error);
      
      // Logout on refresh failure
      logout();
      return false;
    }
  } catch (error) {
    const authError: AuthError = {
      type: 'NETWORK_ERROR' as AuthErrorType,
      message: error instanceof Error ? error.message : 'Network error',
      timestamp: Date.now(),
      details: error
    };
    $authError.set(authError);
    console.error('[AuthStore] Token refresh error:', error);
    return false;
  } finally {
    $authState.setKey('isRefreshing', false);
  }
}

/**
 * Setup automatic token refresh
 */
function setupTokenRefresh(): void {
  // Clear existing timer
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
  
  const config = $sessionConfig.get();
  if (!config.autoRefresh) {
    console.log('[AuthStore] Auto-refresh disabled');
    return;
  }
  
  const state = $authState.get();
  if (!state.expiresAt) {
    console.log('[AuthStore] No expiry time, skipping refresh setup');
    return;
  }
  
  // Calculate when to refresh (5 minutes before expiry by default)
  const timeUntilExpiry = getTimeUntilExpiry(state.expiresAt);
  const refreshIn = Math.max(0, timeUntilExpiry - config.refreshThreshold);
  
  console.log('[AuthStore] Setting up token refresh', {
    expiresAt: new Date(state.expiresAt).toISOString(),
    refreshIn: `${Math.floor(refreshIn / 1000)}s`,
    refreshAt: new Date(Date.now() + refreshIn).toISOString()
  });
  
  refreshTimer = setTimeout(async () => {
    console.log('[AuthStore] Auto-refresh triggered');
    const success = await refreshToken();
    if (!success) {
      console.error('[AuthStore] Auto-refresh failed');
    }
  }, refreshIn);
}

/**
 * Setup session timeout monitoring
 */
function setupSessionTimeout(): void {
  // Clear existing timer
  if (sessionTimer) {
    clearInterval(sessionTimer);
    sessionTimer = null;
  }
  
  const config = $sessionConfig.get();
  if (!config.enableSessionTimeout) {
    console.log('[AuthStore] Session timeout disabled');
    return;
  }
  
  // Check for inactivity every minute
  sessionTimer = setInterval(() => {
    if (SessionTracker.isInactive(config.sessionTimeout)) {
      console.log('[AuthStore] Session timeout detected');
      
      const error: AuthError = {
        type: 'SESSION_TIMEOUT' as AuthErrorType,
        message: 'Your session has expired due to inactivity',
        timestamp: Date.now()
      };
      $authError.set(error);
      
      logout();
    }
  }, 60 * 1000); // Check every minute
}

/**
 * Logout and clear authentication
 */
export function logout(): void {
  console.log('[AuthStore] Logging out');
  
  // Clear timers
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
  
  if (sessionTimer) {
    clearInterval(sessionTimer);
    sessionTimer = null;
  }
  
  // Clear store
  $authState.set({
    user: null,
    token: null,
    refreshToken: null,
    expiresAt: null,
    permissions: new Set(),
    isRefreshing: false,
    lastActivity: Date.now()
  });
  
  // Clear storage
  AuthStorage.clear();
  
  // Dispatch logout event
  window.dispatchEvent(new CustomEvent('auth:logout'));
  
  // Redirect to login
  window.location.href = '/';
}

/**
 * Get authorization headers for API requests
 */
export function getAuthHeaders(): Record<string, string> {
  const token = $token.get();
  if (token) {
    return {
      'Authorization': `Bearer ${token}`
    };
  }
  return {};
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(permission: string): boolean {
  const permissions = $permissions.get();
  return permissions.has(permission) || permissions.has('admin');
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(...permissions: string[]): boolean {
  return permissions.some(p => hasPermission(p));
}

/**
 * Check if user has all of the specified permissions
 */
export function hasAllPermissions(...permissions: string[]): boolean {
  return permissions.every(p => hasPermission(p));
}

/**
 * Update session configuration
 */
export function updateSessionConfig(config: Partial<SessionConfig>): void {
  $sessionConfig.set({
    ...$sessionConfig.get(),
    ...config
  });
  
  // Restart timers with new config
  setupTokenRefresh();
  setupSessionTimeout();
}

/**
 * Clear auth error
 */
export function clearAuthError(): void {
  $authError.set(null);
}

// Export stores
export { $authState, $authError, $sessionConfig };

// Initialize on import
initAuthStore();
