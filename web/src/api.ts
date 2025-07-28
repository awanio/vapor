import { auth } from './auth';
import type { APIResponse, WSMessage } from './types/api';

// Base API URL
const API_BASE_URL = '/api/v1';

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
    let url = `${API_BASE_URL}${endpoint}`;
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
    const authHeaders = endpoint === '/auth/login' ? {} : auth.getAuthHeaders();
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

      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        if (!response.ok) {
          throw new ApiError(`HTTP error! status: ${response.status}`, undefined, undefined, response.status);
        }
        return response.text() as any;
      }

      // Parse JSON response
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

  static delete<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  static patch<T = any>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, { method: 'PATCH', body });
  }
}

// WebSocket Manager
export class WebSocketManager {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectInterval: number = 5000;
  private maxReconnectAttempts: number = 5;
  private reconnectAttempts: number = 0;
  private messageHandlers: Map<string, Set<(message: WSMessage) => void>> = new Map();
  private reconnectTimer: number | null = null;
  private authenticated: boolean = false;

  constructor(private path: string) {
    this.url = '';
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.url = auth.getWebSocketUrl(this.path);
        this.ws = new WebSocket(this.url);

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

        this.ws.onclose = () => {
          console.log('WebSocket closed');
          this.authenticated = false;
          this.scheduleReconnect();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private async authenticate(): Promise<void> {
    const token = auth.getToken();
    if (!token) {
      throw new Error('No authentication token available');
    }

    return new Promise((resolve, reject) => {
      const authTimeout = setTimeout(() => {
        reject(new Error('Authentication timeout'));
      }, 5000);

      const authHandler = (message: WSMessage) => {
        if (message.type === 'auth_success') {
          clearTimeout(authTimeout);
          this.authenticated = true;
          this.off('auth_success', authHandler);
          this.off('error', errorHandler);
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

      this.on('auth_success', authHandler);
      this.on('error', errorHandler);

      this.send({
        type: 'auth',
        token,
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
        if (auth.isAuthenticated()) {
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
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.messageHandlers.clear();
    this.authenticated = false;
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN && this.authenticated;
  }
}

// Export default instance
export const api = Api;
