/**
 * Authentication store types
 */

/**
 * User information from the authentication system
 */
export interface User {
  username: string;
  uid: string;
  groups: string[];
}

/**
 * Authentication token response from the API
 */
export interface AuthTokenResponse {
  token: string;
  expires_at: number;
  refresh_token: string;
  token_type: string;
  user: User;
}

/**
 * Decoded JWT token payload
 */
export interface JWTPayload {
  exp: number;
  iat: number;
  sub: string;
  username?: string;
  groups?: string[];
  permissions?: string[];
}

/**
 * Authentication state
 */
export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  permissions: Set<string>;
  isRefreshing: boolean;
  lastActivity: number;
}

/**
 * Login credentials
 */
export interface LoginCredentials {
  username: string;
  password: string;
  auth_type?: string;
}

/**
 * Session configuration
 */
export interface SessionConfig {
  /**
   * Session timeout in milliseconds (default: 30 minutes)
   */
  sessionTimeout: number;
  
  /**
   * Time before token expiry to trigger refresh in milliseconds (default: 5 minutes)
   */
  refreshThreshold: number;
  
  /**
   * Enable auto token refresh (default: true)
   */
  autoRefresh: boolean;
  
  /**
   * Enable session timeout (default: true)
   */
  enableSessionTimeout: boolean;
}

/**
 * Authentication error types
 */
export enum AuthErrorType {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  REFRESH_FAILED = 'REFRESH_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  SESSION_TIMEOUT = 'SESSION_TIMEOUT',
  UNAUTHORIZED = 'UNAUTHORIZED',
}

/**
 * Authentication error
 */
export interface AuthError {
  type: AuthErrorType;
  message: string;
  timestamp: number;
  details?: any;
}
