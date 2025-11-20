import { getAuthHeaders, $token, $isAuthenticated } from './stores/auth';
import { getApiUrl, getWsUrl } from './config';
import type { APIResponse, WSMessage } from './types/api';

// HTTP Methods
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// API Request Options
interface RequestOptions {
  method?: HttpMethod;
  body?: any;
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
}

// API Error class
export class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: string,
    public status?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Main API class
export class Api {
  // Generic request method
  private static async request<T = any>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { method = 'GET', body, headers = {}, params } = options;

    // Build URL with query params
    let url = getApiUrl(endpoint);
    if (params) {
      const queryString = new URLSearchParams(
        Object.entries(params).map(([key, value]) => [key, String(value)])
      ).toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    // Build headers
    // Don't include auth headers for login endpoint
    const authHeaders = endpoint === '/auth/login' ? {} : getAuthHeaders();
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...headers,
    };

    // Debug log to verify headers
    console.log('[API Request]', method, url, {
      headers: requestHeaders,
      hasAuth: !!authHeaders.Authorization
    });

    // Make request
    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });

      // Handle non-JSON responses (be defensive in tests where headers may be missing)
      const headers: any = (response as any).headers || {};
      const contentType = typeof headers.get === 'function' ? headers.get('content-type') : undefined;

      // If we explicitly know the response is not JSON, treat it as plain text.
      // When content-type is missing (common in tests), fall through and try JSON.
      if (contentType && !contentType.includes('application/json')) {
        if (!response.ok) {
          throw new ApiError(`HTTP error! status: ${response.status}`, undefined, undefined, response.status);
        }
        return await response.text() as any;
      }

      // Parse JSON response (default path, including when content-type is missing)
      const data: APIResponse<T> = await response.json();

      // Handle API errors
      if (!response.ok || data.status === 'error') {
        throw new ApiError(
          data.error?.message || 'An error occurred',
          data.error?.code,
          data.error?.details,
          response.status
        );
      }

      // Return data
      return data.data as T;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'Network error',
        'NETWORK_ERROR'
      );
    }
  }

  // Convenience methods
  static get<T = any>(endpoint: string, params?: Record<string, any>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  static post<T = any>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body });
  }

  static put<T = any>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', body });
  }

  static delete<T = any>(endpoint: string, params?: Record<string, any>): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', params });
  }

  static patch<T = any>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, { method: 'PATCH', body });
  }

  // Special method for posting Kubernetes resources with custom content type
  static async postResource<T = any>(endpoint: string, content: string, contentType: 'application/json' | 'application/yaml'): Promise<T> {
    const authHeaders = getAuthHeaders();
    const url = getApiUrl(endpoint);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': contentType,
          ...authHeaders,
        },
        body: content,
      });

      // Handle non-JSON responses (defensive for tests without headers)
      const resHeaders: any = (response as any).headers || {};
      const responseContentType = typeof resHeaders.get === 'function' ? resHeaders.get('content-type') : undefined;

      // If we explicitly know the response is not JSON, treat it as plain text.
      // When content-type is missing (common in tests), fall through and try JSON.
      if (responseContentType && !responseContentType.includes('application/json')) {
        if (!response.ok) {
          throw new ApiError(`HTTP error! status: ${response.status}`, undefined, undefined, response.status);
        }
        return await response.text() as any;
      }

      // Parse JSON response (default path, including when content-type is missing)
      const data: APIResponse<T> = await response.json();

      // Handle API errors
      if (!response.ok || data.status === 'error') {
        throw new ApiError(
          data.error?.message || 'An error occurred',
          data.error?.code,
          data.error?.details,
          response.status
        );
      }

      // Return data
      return data.data as T;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'Network error',
        'NETWORK_ERROR'
      );
    }
  }

  // Special method for updating Kubernetes resources with custom content type
  static async putResource<T = any>(endpoint: string, content: string, contentType: 'application/json' | 'application/yaml'): Promise<T> {
    const authHeaders = getAuthHeaders();
    const url = getApiUrl(endpoint);

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
          ...authHeaders,
        },
        body: content,
      });

      // Handle non-JSON responses (defensive for tests without headers)
      const resHeaders: any = (response as any).headers || {};
      const responseContentType = typeof resHeaders.get === 'function' ? resHeaders.get('content-type') : undefined;

      // If we explicitly know the response is not JSON, treat it as plain text.
      // When content-type is missing (common in tests), fall through and try JSON.
      if (responseContentType && !responseContentType.includes('application/json')) {
        if (!response.ok) {
          throw new ApiError(`HTTP error! status: ${response.status}`, undefined, undefined, response.status);
        }
        return await response.text() as any;
      }

      // Parse JSON response (default path, including when content-type is missing)
      const data: APIResponse<T> = await response.json();

      // Handle API errors
      if (!response.ok || data.status === 'error') {
        throw new ApiError(
          data.error?.message || 'An error occurred',
          data.error?.code,
          data.error?.details,
          response.status
        );
      }

      // Return data
      return data.data as T;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'Network error',
        'NETWORK_ERROR'
      );
    }
  }
}

// WebSocket Manager
export class WebSocketManager {
  private ws: WebSocket | null = null;
  // private url: string;
  private reconnectInterval: number = 5000;
  private maxReconnectAttempts: number = 5;
  private reconnectAttempts: number = 0;
  private messageHandlers: Map<string, Set<(message: WSMessage) => void>> = new Map();
  private reconnectTimer: number | null = null;
  private authenticated: boolean = false;
  private intentionalDisconnect: boolean = false;

  constructor(private path: string = '/ws') {

  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Reset intentional disconnect flag when connecting
        this.intentionalDisconnect = false;
        // WebSocket URL doesn't need auth in query string anymore
        this.ws = new WebSocket(getWsUrl(this.path));

        this.ws.onopen = () => {
          console.log(`WebSocket connected to ${this.path}`);
          this.reconnectAttempts = 0;
          this.authenticate().then(() => {
            resolve();
          }).catch(reject);
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WSMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket closed', { code: event.code, reason: event.reason });
          this.authenticated = false;

          // Only reconnect if not intentionally disconnected and not a normal closure
          if (!this.intentionalDisconnect && event.code !== 1000) {
            this.scheduleReconnect();
          } else {
            console.log('WebSocket closed intentionally or normally, not reconnecting');
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private async authenticate(): Promise<void> {
    const token = $token.get();
    if (!token) {
      throw new Error('No authentication token available');
    }

    return new Promise((resolve, reject) => {
      const authTimeout = setTimeout(() => {
        reject(new Error('Authentication timeout'));
      }, 5000);

      const authHandler = (message: WSMessage) => {
        if (message.type === 'auth' && message.payload?.authenticated === true) {
          clearTimeout(authTimeout);
          this.authenticated = true;
          this.off('auth', authHandler);
          this.off('error', errorHandler);
          console.log(`WebSocket authenticated as ${message.payload.username}`);
          resolve();
        }
      };

      const errorHandler = (message: WSMessage) => {
        if (message.type === 'error' && message.code === 'AUTH_FAILED') {
          clearTimeout(authTimeout);
          this.off('auth_success', authHandler);
          this.off('error', errorHandler);
          reject(new Error(message.error || 'Authentication failed'));
        }
      };

      this.on('auth', authHandler);
      this.on('error', errorHandler);

      this.send({
        type: 'auth',
        payload: {
          token,
        },
      });
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Scheduling reconnect attempt ${this.reconnectAttempts}...`);

      this.reconnectTimer = window.setTimeout(() => {
        if ($isAuthenticated.get()) {
          this.connect().catch(console.error);
        }
      }, this.reconnectInterval);
    }
  }

  private handleMessage(message: WSMessage): void {
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach(handler => handler(message));
    }

    // Handle global message types
    if (message.type === 'error') {
      console.error('WebSocket error:', message.error);
    }
  }

  send(message: WSMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  }

  on(type: string, handler: (message: WSMessage) => void): void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type)!.add(handler);
  }

  off(type: string, handler: (message: WSMessage) => void): void {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  disconnect(): void {
    // Mark as intentional disconnect to prevent reconnection
    this.intentionalDisconnect = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      // Close with normal closure code to indicate intentional disconnect
      this.ws.close(1000, 'Normal closure');
      this.ws = null;
    }

    this.messageHandlers.clear();
    this.authenticated = false;
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Export default instance
export const api = Api;
