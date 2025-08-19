/**
 * API integration helpers for stores
 * Provides seamless integration between Nanostores and the REST API
 */

import { auth } from '../../auth';
import { getApiUrl } from '../../config';
import type { APIResponse } from '../../types/api';
import type {
  StoreError,
  QueryParams,
  // FilterConfig,  // TODO: Implement filtering support in future
  // SortConfig,    // TODO: Implement sorting support in future  
  // PaginationConfig,  // TODO: Implement pagination support in future
  CrudResult,
  BatchResult,
  BaseEntity,
} from '../types';

/**
 * HTTP Methods
 */
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/**
 * API Request Options
 */
export interface ApiRequestOptions {
  method?: HttpMethod;
  body?: any;
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  signal?: AbortSignal;
}

/**
 * API Configuration for stores
 */
export interface ApiConfig {
  /**
   * Base endpoint for the resource
   */
  endpoint: string;
  
  /**
   * Transform API response to store entity
   */
  transform?: <T>(data: any) => T;
  
  /**
   * Transform store entity to API request format
   */
  serialize?: <T>(entity: T) => any;
  
  /**
   * Default query parameters
   */
  defaultParams?: Record<string, any>;
  
  /**
   * Custom headers for all requests
   */
  headers?: Record<string, string>;
  
  /**
   * Request timeout in milliseconds
   */
  timeout?: number;
  
  /**
   * Number of retries for failed requests
   */
  retries?: number;
  
  /**
   * Delay between retries in milliseconds
   */
  retryDelay?: number;
}

/**
 * API Error class
 */
export class ApiError extends Error implements StoreError {
  code: string;
  timestamp: number;
  context?: Record<string, unknown>;
  retry?: () => Promise<void>;
  
  constructor(
    message: string,
    code: string = 'API_ERROR',
    public status?: number,
    public details?: string
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.timestamp = Date.now();
    this.context = { status, details };
  }
  
  toStoreError(): StoreError {
    return {
      code: this.code,
      message: this.message,
      timestamp: this.timestamp,
      context: this.context,
      retry: this.retry,
    };
  }
}

/**
 * Request interceptor type
 */
type RequestInterceptor = (options: ApiRequestOptions) => ApiRequestOptions | Promise<ApiRequestOptions>;

/**
 * Response interceptor type
 */
type ResponseInterceptor = <T>(response: T, options: ApiRequestOptions) => T | Promise<T>;

/**
 * Error interceptor type
 */
type ErrorInterceptor = (error: ApiError, options: ApiRequestOptions) => ApiError | Promise<ApiError>;

/**
 * API Client for stores
 */
export class StoreApiClient {
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];
  private activeRequests = new Map<string, AbortController>();
  
  constructor(private config: ApiConfig) {}
  
  /**
   * Add request interceptor
   */
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }
  
  /**
   * Add response interceptor
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }
  
  /**
   * Add error interceptor
   */
  addErrorInterceptor(interceptor: ErrorInterceptor): void {
    this.errorInterceptors.push(interceptor);
  }
  
  /**
   * Make API request
   */
  private async request<T = any>(
    path: string,
    options: ApiRequestOptions = {}
  ): Promise<T> {
    // Apply request interceptors
    let finalOptions = options;
    for (const interceptor of this.requestInterceptors) {
      finalOptions = await interceptor(finalOptions);
    }
    
    const {
      method = 'GET',
      body,
      headers = {},
      params,
      timeout = this.config.timeout || 30000,
      retries = this.config.retries || 0,
      retryDelay = this.config.retryDelay || 1000,
      signal,
    } = finalOptions;
    
    // Build URL
    const endpoint = `${this.config.endpoint}${path}`;
    let url = getApiUrl(endpoint);
    
    // Add query parameters
    const allParams = { ...this.config.defaultParams, ...params };
    if (Object.keys(allParams).length > 0) {
      const queryString = new URLSearchParams(
        Object.entries(allParams).map(([key, value]) => [key, String(value)])
      ).toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    
    // Build headers
    const authHeaders = endpoint.includes('/auth/login') ? {} : auth.getAuthHeaders();
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...this.config.headers,
      ...headers,
    };
    
    // Create abort controller for timeout
    const requestId = `${method}:${url}:${Date.now()}`;
    const abortController = new AbortController();
    this.activeRequests.set(requestId, abortController);
    
    // Setup timeout
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, timeout);
    
    // Attempt request with retries
    let lastError: ApiError | undefined;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          method,
          headers: requestHeaders,
          body: body ? JSON.stringify(this.config.serialize ? this.config.serialize(body) : body) : undefined,
          signal: signal || abortController.signal,
        });
        
        clearTimeout(timeoutId);
        
        // Handle non-JSON responses
        const contentType = response.headers.get('content-type');
        if (!contentType?.includes('application/json')) {
          if (!response.ok) {
            throw new ApiError(
              `HTTP error! status: ${response.status}`,
              'HTTP_ERROR',
              response.status
            );
          }
          const text = await response.text();
          return text as any;
        }
        
        // Parse JSON response
        const data: APIResponse<T> = await response.json();
        
        // Handle API errors
        if (!response.ok || data.status === 'error') {
          throw new ApiError(
            data.error?.message || 'An error occurred',
            data.error?.code || 'API_ERROR',
            response.status,
            data.error?.details
          );
        }
        
        // Transform response if needed
        let result = data.data as T;
        if (this.config.transform) {
          result = this.config.transform(result);
        }
        
        // Apply response interceptors
        for (const interceptor of this.responseInterceptors) {
          result = await interceptor(result, finalOptions);
        }
        
        // Cleanup
        this.activeRequests.delete(requestId);
        
        return result;
      } catch (error) {
        clearTimeout(timeoutId);
        
        // Handle abort
        if (error instanceof Error && error.name === 'AbortError') {
          lastError = new ApiError('Request timeout', 'TIMEOUT');
        } else if (error instanceof ApiError) {
          lastError = error;
        } else {
          lastError = new ApiError(
            error instanceof Error ? error.message : 'Network error',
            'NETWORK_ERROR'
          );
        }
        
        // Apply error interceptors
        for (const interceptor of this.errorInterceptors) {
          lastError = await interceptor(lastError, finalOptions);
        }
        
        // Retry if not last attempt
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
          continue;
        }
        
        // Set retry function
        lastError.retry = () => this.request<T>(path, options) as Promise<void>;
        
        // Cleanup
        this.activeRequests.delete(requestId);
        
        throw lastError;
      }
    }
    
    throw lastError || new ApiError('Unknown error', 'UNKNOWN_ERROR');
  }
  
  /**
   * Cancel all active requests
   */
  cancelAll(): void {
    this.activeRequests.forEach(controller => controller.abort());
    this.activeRequests.clear();
  }
  
  /**
   * CRUD Operations
   */
  
  /**
   * Fetch collection
   */
  async fetchCollection<T extends BaseEntity>(params?: QueryParams): Promise<T[]> {
    const apiParams = this.convertQueryParams(params);
    return this.request<T[]>('', { method: 'GET', params: apiParams });
  }
  
  /**
   * Fetch single resource
   */
  async fetchOne<T extends BaseEntity>(id: string): Promise<T> {
    return this.request<T>(`/${id}`, { method: 'GET' });
  }
  
  /**
   * Create resource
   */
  async create<T extends BaseEntity>(data: Partial<T>): Promise<T> {
    return this.request<T>('', { method: 'POST', body: data });
  }
  
  /**
   * Update resource
   */
  async update<T extends BaseEntity>(id: string, data: Partial<T>): Promise<T> {
    return this.request<T>(`/${id}`, { method: 'PUT', body: data });
  }
  
  /**
   * Patch resource
   */
  async patch<T extends BaseEntity>(id: string, data: Partial<T>): Promise<T> {
    return this.request<T>(`/${id}`, { method: 'PATCH', body: data });
  }
  
  /**
   * Delete resource
   */
  async delete(id: string): Promise<void> {
    return this.request<void>(`/${id}`, { method: 'DELETE' });
  }
  
  /**
   * Batch create
   */
  async batchCreate<T extends BaseEntity>(items: Partial<T>[]): Promise<T[]> {
    return this.request<T[]>('/batch', { method: 'POST', body: { items } });
  }
  
  /**
   * Batch update
   */
  async batchUpdate<T extends BaseEntity>(
    updates: Array<{ id: string; data: Partial<T> }>
  ): Promise<T[]> {
    return this.request<T[]>('/batch', { method: 'PUT', body: { updates } });
  }
  
  /**
   * Batch delete
   */
  async batchDelete(ids: string[]): Promise<void> {
    return this.request<void>('/batch', { method: 'DELETE', body: { ids } });
  }
  
  /**
   * Convert QueryParams to API params
   */
  private convertQueryParams(params?: QueryParams): Record<string, any> {
    if (!params) return {};
    
    const apiParams: Record<string, any> = {};
    
    // Convert filters
    if (params.filters && params.filters.length > 0) {
      apiParams.filters = JSON.stringify(params.filters);
    }
    
    // Convert sort
    if (params.sort) {
      apiParams.sort = `${params.sort.direction === 'desc' ? '-' : ''}${params.sort.field}`;
    }
    
    // Convert pagination
    if (params.pagination) {
      apiParams.page = params.pagination.page;
      apiParams.pageSize = params.pagination.pageSize;
    }
    
    // Add include fields
    if (params.include && params.include.length > 0) {
      apiParams.include = params.include.join(',');
    }
    
    // Add field selection
    if (params.fields && params.fields.length > 0) {
      apiParams.fields = params.fields.join(',');
    }
    
    return apiParams;
  }
}

/**
 * Create API client for a store
 */
export function createApiClient(config: ApiConfig): StoreApiClient {
  const client = new StoreApiClient(config);
  
  // Add default error handling
  client.addErrorInterceptor((error) => {
    console.error(`[StoreAPI] Error: ${error.message}`, error);
    return error;
  });
  
  return client;
}

/**
 * Helper to create CRUD API functions for a store
 */
export function createCrudApi<T extends BaseEntity>(
  endpoint: string,
  config?: Partial<ApiConfig>
): {
  api: StoreApiClient;
  fetch: (params?: QueryParams) => Promise<T[]>;
  get: (id: string) => Promise<T>;
  create: (data: Partial<T>) => Promise<CrudResult<T>>;
  update: (id: string, data: Partial<T>) => Promise<CrudResult<T>>;
  delete: (id: string) => Promise<CrudResult<boolean>>;
  batchCreate: (items: Partial<T>[]) => Promise<BatchResult<T>>;
  batchUpdate: (updates: Array<{ id: string; data: Partial<T> }>) => Promise<BatchResult<T>>;
  batchDelete: (ids: string[]) => Promise<BatchResult<string>>;
} {
  const api = createApiClient({
    endpoint,
    ...config,
  });
  
  return {
    api,
    
    fetch: async (params?: QueryParams) => {
      try {
        return await api.fetchCollection<T>(params);
      } catch (error) {
        console.error(`Failed to fetch ${endpoint}:`, error);
        return [];
      }
    },
    
    get: async (id: string) => {
      return api.fetchOne<T>(id);
    },
    
    create: async (data: Partial<T>) => {
      try {
        const result = await api.create<T>(data);
        return { success: true, data: result };
      } catch (error) {
        return {
          success: false,
          error: error instanceof ApiError ? error.toStoreError() : {
            code: 'CREATE_ERROR',
            message: 'Failed to create resource',
            timestamp: Date.now(),
          },
        };
      }
    },
    
    update: async (id: string, data: Partial<T>) => {
      try {
        const result = await api.update<T>(id, data);
        return { success: true, data: result };
      } catch (error) {
        return {
          success: false,
          error: error instanceof ApiError ? error.toStoreError() : {
            code: 'UPDATE_ERROR',
            message: 'Failed to update resource',
            timestamp: Date.now(),
          },
        };
      }
    },
    
    delete: async (id: string) => {
      try {
        await api.delete(id);
        return { success: true, data: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof ApiError ? error.toStoreError() : {
            code: 'DELETE_ERROR',
            message: 'Failed to delete resource',
            timestamp: Date.now(),
          },
        };
      }
    },
    
    batchCreate: async (items: Partial<T>[]) => {
      try {
        const results = await api.batchCreate<T>(items);
        return { succeeded: results, failed: [] };
      } catch (error) {
        const storeError = error instanceof ApiError ? error.toStoreError() : {
          code: 'BATCH_CREATE_ERROR',
          message: 'Failed to create resources',
          timestamp: Date.now(),
        };
        return {
          succeeded: [],
          failed: items.map(item => ({ item: item as T, error: storeError })),
        };
      }
    },
    
    batchUpdate: async (updates: Array<{ id: string; data: Partial<T> }>) => {
      try {
        const results = await api.batchUpdate<T>(updates);
        return { succeeded: results, failed: [] };
      } catch (error) {
        const storeError = error instanceof ApiError ? error.toStoreError() : {
          code: 'BATCH_UPDATE_ERROR',
          message: 'Failed to update resources',
          timestamp: Date.now(),
        };
        return {
          succeeded: [],
          failed: updates.map(({ data }) => ({ item: data as T, error: storeError })),
        };
      }
    },
    
    batchDelete: async (ids: string[]) => {
      try {
        await api.batchDelete(ids);
        return { succeeded: ids, failed: [] };
      } catch (error) {
        const storeError = error instanceof ApiError ? error.toStoreError() : {
          code: 'BATCH_DELETE_ERROR',
          message: 'Failed to delete resources',
          timestamp: Date.now(),
        };
        return {
          succeeded: [],
          failed: ids.map(id => ({ item: id, error: storeError })),
        };
      }
    },
  };
}

/**
 * Polling helper for real-time updates
 */
export class PollingManager {
  private intervals = new Map<string, NodeJS.Timeout>();
  
  /**
   * Start polling
   */
  start(
    key: string,
    callback: () => Promise<void>,
    interval: number = 5000
  ): void {
    // Clear existing interval if any
    this.stop(key);
    
    // Start new interval
    const id = setInterval(async () => {
      try {
        await callback();
      } catch (error) {
        console.error(`[Polling] Error in ${key}:`, error);
      }
    }, interval);
    
    this.intervals.set(key, id);
    
    // Run immediately
    callback().catch(error => {
      console.error(`[Polling] Initial error in ${key}:`, error);
    });
  }
  
  /**
   * Stop polling
   */
  stop(key: string): void {
    const id = this.intervals.get(key);
    if (id) {
      clearInterval(id);
      this.intervals.delete(key);
    }
  }
  
  /**
   * Stop all polling
   */
  stopAll(): void {
    this.intervals.forEach(id => clearInterval(id));
    this.intervals.clear();
  }
}

// Export singleton polling manager
export const pollingManager = new PollingManager();
