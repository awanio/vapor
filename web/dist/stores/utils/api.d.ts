import type { StoreError, QueryParams, CrudResult, BatchResult, BaseEntity } from '../types';
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
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
export interface ApiConfig {
    endpoint: string;
    transform?: <T>(data: any) => T;
    serialize?: <T>(entity: T) => any;
    defaultParams?: Record<string, any>;
    headers?: Record<string, string>;
    timeout?: number;
    retries?: number;
    retryDelay?: number;
}
export declare class ApiError extends Error implements StoreError {
    status?: number | undefined;
    details?: string | undefined;
    code: string;
    timestamp: number;
    context?: Record<string, unknown>;
    retry?: () => Promise<void>;
    constructor(message: string, code?: string, status?: number | undefined, details?: string | undefined);
    toStoreError(): StoreError;
}
type RequestInterceptor = (options: ApiRequestOptions) => ApiRequestOptions | Promise<ApiRequestOptions>;
type ResponseInterceptor = <T>(response: T, options: ApiRequestOptions) => T | Promise<T>;
type ErrorInterceptor = (error: ApiError, options: ApiRequestOptions) => ApiError | Promise<ApiError>;
export declare class StoreApiClient {
    private config;
    private requestInterceptors;
    private responseInterceptors;
    private errorInterceptors;
    private activeRequests;
    constructor(config: ApiConfig);
    addRequestInterceptor(interceptor: RequestInterceptor): void;
    addResponseInterceptor(interceptor: ResponseInterceptor): void;
    addErrorInterceptor(interceptor: ErrorInterceptor): void;
    private request;
    cancelAll(): void;
    fetchCollection<T extends BaseEntity>(params?: QueryParams): Promise<T[]>;
    fetchOne<T extends BaseEntity>(id: string): Promise<T>;
    create<T extends BaseEntity>(data: Partial<T>): Promise<T>;
    update<T extends BaseEntity>(id: string, data: Partial<T>): Promise<T>;
    patch<T extends BaseEntity>(id: string, data: Partial<T>): Promise<T>;
    delete(id: string): Promise<void>;
    batchCreate<T extends BaseEntity>(items: Partial<T>[]): Promise<T[]>;
    batchUpdate<T extends BaseEntity>(updates: Array<{
        id: string;
        data: Partial<T>;
    }>): Promise<T[]>;
    batchDelete(ids: string[]): Promise<void>;
    private convertQueryParams;
}
export declare function createApiClient(config: ApiConfig): StoreApiClient;
export declare function createCrudApi<T extends BaseEntity>(endpoint: string, config?: Partial<ApiConfig>): {
    api: StoreApiClient;
    fetch: (params?: QueryParams) => Promise<T[]>;
    get: (id: string) => Promise<T>;
    create: (data: Partial<T>) => Promise<CrudResult<T>>;
    update: (id: string, data: Partial<T>) => Promise<CrudResult<T>>;
    delete: (id: string) => Promise<CrudResult<boolean>>;
    batchCreate: (items: Partial<T>[]) => Promise<BatchResult<T>>;
    batchUpdate: (updates: Array<{
        id: string;
        data: Partial<T>;
    }>) => Promise<BatchResult<T>>;
    batchDelete: (ids: string[]) => Promise<BatchResult<string>>;
};
export declare class PollingManager {
    private intervals;
    start(key: string, callback: () => Promise<void>, interval?: number): void;
    stop(key: string): void;
    stopAll(): void;
}
export declare const pollingManager: PollingManager;
export {};
//# sourceMappingURL=api.d.ts.map