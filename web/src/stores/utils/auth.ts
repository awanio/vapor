/**
 * Authentication utility functions
 */

import type { JWTPayload } from '../types/auth';

/**
 * Decode a JWT token without verifying the signature
 * Note: This is for client-side use only, actual verification happens on the server
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('[Auth] Invalid JWT format');
      return null;
    }
    
    const payload = parts[1];
    if (!payload) {
      console.error('[Auth] Missing JWT payload');
      return null;
    }
    
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch (error) {
    console.error('[Auth] Failed to decode JWT:', error);
    return null;
  }
}

/**
 * Calculate the time until token expiry in milliseconds
 */
export function getTimeUntilExpiry(expiresAt: number): number {
  // Convert to milliseconds if it appears to be in seconds
  const expiresAtMs = expiresAt < 10000000000 ? expiresAt * 1000 : expiresAt;
  return Math.max(0, expiresAtMs - Date.now());
}

/**
 * Check if a token is expired or will expire soon
 */
export function isTokenExpiringSoon(expiresAt: number, thresholdMs: number = 5 * 60 * 1000): boolean {
  const timeUntilExpiry = getTimeUntilExpiry(expiresAt);
  return timeUntilExpiry <= thresholdMs;
}

/**
 * Extract permissions from JWT token
 */
export function extractPermissions(token: string): Set<string> {
  const payload = decodeJWT(token);
  if (!payload) {
    return new Set();
  }
  
  const permissions = new Set<string>();
  
  // Add permissions from token
  if (payload.permissions) {
    payload.permissions.forEach(p => permissions.add(p));
  }
  
  // Add group-based permissions
  if (payload.groups) {
    payload.groups.forEach(group => {
      // Map groups to permissions based on your authorization model
      permissions.add(`group:${group}`);
      
      // Add specific permissions for known groups
      if (group === 'sudo' || group === 'wheel' || group === 'admin') {
        permissions.add('admin');
        permissions.add('system:manage');
      }
      
      if (group === 'docker') {
        permissions.add('containers:manage');
      }
    });
  }
  
  return permissions;
}

/**
 * Storage abstraction for auth tokens
 * Uses localStorage but could be replaced with more secure alternatives
 */
export class AuthStorage {
  private static readonly TOKEN_KEY = 'jwt_token';
  private static readonly REFRESH_TOKEN_KEY = 'jwt_refresh_token';
  private static readonly EXPIRES_KEY = 'jwt_expires_at';
  private static readonly USER_KEY = 'jwt_user';
  
  /**
   * Save authentication data
   */
  static save(token: string, refreshToken: string, expiresAt: number, user: any): void {
    try {
      // Convert to milliseconds if needed
      const expiresAtMs = expiresAt < 10000000000 ? expiresAt * 1000 : expiresAt;
      
      localStorage.setItem(this.TOKEN_KEY, token);
      localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
      localStorage.setItem(this.EXPIRES_KEY, expiresAtMs.toString());
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      
      console.log('[AuthStorage] Saved auth data', {
        hasToken: !!token,
        hasRefreshToken: !!refreshToken,
        expiresAt: new Date(expiresAtMs).toISOString()
      });
    } catch (error) {
      console.error('[AuthStorage] Failed to save auth data:', error);
    }
  }
  
  /**
   * Load authentication data
   */
  static load(): {
    token: string | null;
    refreshToken: string | null;
    expiresAt: number | null;
    user: any | null;
  } {
    try {
      const token = localStorage.getItem(this.TOKEN_KEY);
      const refreshToken = localStorage.getItem(this.REFRESH_TOKEN_KEY);
      const expiresStr = localStorage.getItem(this.EXPIRES_KEY);
      const userStr = localStorage.getItem(this.USER_KEY);
      
      return {
        token,
        refreshToken,
        expiresAt: expiresStr ? parseInt(expiresStr, 10) : null,
        user: userStr ? JSON.parse(userStr) : null
      };
    } catch (error) {
      console.error('[AuthStorage] Failed to load auth data:', error);
      return {
        token: null,
        refreshToken: null,
        expiresAt: null,
        user: null
      };
    }
  }
  
  /**
   * Clear all authentication data
   */
  static clear(): void {
    try {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
      localStorage.removeItem(this.EXPIRES_KEY);
      localStorage.removeItem(this.USER_KEY);
      console.log('[AuthStorage] Cleared auth data');
    } catch (error) {
      console.error('[AuthStorage] Failed to clear auth data:', error);
    }
  }
  
  /**
   * Check if authentication data exists
   */
  static exists(): boolean {
    return !!localStorage.getItem(this.TOKEN_KEY);
  }
}

/**
 * Session activity tracker
 */
export class SessionTracker {
  private static lastActivity: number = Date.now();
  private static activityListeners: Set<() => void> = new Set();
  private static initialized = false;
  
  /**
   * Initialize activity tracking
   */
  static init(): void {
    if (this.initialized) return;
    
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    const updateActivity = () => {
      this.lastActivity = Date.now();
      this.activityListeners.forEach(listener => listener());
    };
    
    events.forEach(event => {
      window.addEventListener(event, updateActivity, { passive: true });
    });
    
    this.initialized = true;
    console.log('[SessionTracker] Initialized');
  }
  
  /**
   * Get last activity timestamp
   */
  static getLastActivity(): number {
    return this.lastActivity;
  }
  
  /**
   * Check if session is inactive
   */
  static isInactive(timeoutMs: number): boolean {
    return Date.now() - this.lastActivity > timeoutMs;
  }
  
  /**
   * Add activity listener
   */
  static addListener(listener: () => void): () => void {
    this.activityListeners.add(listener);
    return () => this.activityListeners.delete(listener);
  }
  
  /**
   * Reset activity timestamp
   */
  static reset(): void {
    this.lastActivity = Date.now();
  }
}

/**
 * Format time duration for display
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}
