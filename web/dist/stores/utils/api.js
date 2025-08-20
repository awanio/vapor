import { auth } from '../../auth';
import { getApiUrl } from '../../config';
export class ApiError extends Error {
    constructor(message, code = 'API_ERROR', status, details) {
        super(message);
        this.status = status;
        this.details = details;
        this.name = 'ApiError';
        this.code = code;
        this.timestamp = Date.now();
        this.context = { status, details };
    }
    toStoreError() {
        return {
            code: this.code,
            message: this.message,
            timestamp: this.timestamp,
            context: this.context,
            retry: this.retry,
        };
    }
}
export class StoreApiClient {
    constructor(config) {
        this.config = config;
        this.requestInterceptors = [];
        this.responseInterceptors = [];
        this.errorInterceptors = [];
        this.activeRequests = new Map();
    }
    addRequestInterceptor(interceptor) {
        this.requestInterceptors.push(interceptor);
    }
    addResponseInterceptor(interceptor) {
        this.responseInterceptors.push(interceptor);
    }
    addErrorInterceptor(interceptor) {
        this.errorInterceptors.push(interceptor);
    }
    async request(path, options = {}) {
        let finalOptions = options;
        for (const interceptor of this.requestInterceptors) {
            finalOptions = await interceptor(finalOptions);
        }
        const { method = 'GET', body, headers = {}, params, timeout = this.config.timeout || 30000, retries = this.config.retries || 0, retryDelay = this.config.retryDelay || 1000, signal, } = finalOptions;
        const endpoint = `${this.config.endpoint}${path}`;
        let url = getApiUrl(endpoint);
        const allParams = { ...this.config.defaultParams, ...params };
        if (Object.keys(allParams).length > 0) {
            const queryString = new URLSearchParams(Object.entries(allParams).map(([key, value]) => [key, String(value)])).toString();
            if (queryString) {
                url += `?${queryString}`;
            }
        }
        const authHeaders = endpoint.includes('/auth/login') ? {} : auth.getAuthHeaders();
        const requestHeaders = {
            'Content-Type': 'application/json',
            ...authHeaders,
            ...this.config.headers,
            ...headers,
        };
        const requestId = `${method}:${url}:${Date.now()}`;
        const abortController = new AbortController();
        this.activeRequests.set(requestId, abortController);
        const timeoutId = setTimeout(() => {
            abortController.abort();
        }, timeout);
        let lastError;
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const response = await fetch(url, {
                    method,
                    headers: requestHeaders,
                    body: body ? JSON.stringify(this.config.serialize ? this.config.serialize(body) : body) : undefined,
                    signal: signal || abortController.signal,
                });
                clearTimeout(timeoutId);
                const contentType = response.headers.get('content-type');
                if (!contentType?.includes('application/json')) {
                    if (!response.ok) {
                        throw new ApiError(`HTTP error! status: ${response.status}`, 'HTTP_ERROR', response.status);
                    }
                    const text = await response.text();
                    return text;
                }
                const data = await response.json();
                if (!response.ok || data.status === 'error') {
                    throw new ApiError(data.error?.message || 'An error occurred', data.error?.code || 'API_ERROR', response.status, data.error?.details);
                }
                let result = data.data;
                if (this.config.transform) {
                    result = this.config.transform(result);
                }
                for (const interceptor of this.responseInterceptors) {
                    result = await interceptor(result, finalOptions);
                }
                this.activeRequests.delete(requestId);
                return result;
            }
            catch (error) {
                clearTimeout(timeoutId);
                if (error instanceof Error && error.name === 'AbortError') {
                    lastError = new ApiError('Request timeout', 'TIMEOUT');
                }
                else if (error instanceof ApiError) {
                    lastError = error;
                }
                else {
                    lastError = new ApiError(error instanceof Error ? error.message : 'Network error', 'NETWORK_ERROR');
                }
                for (const interceptor of this.errorInterceptors) {
                    lastError = await interceptor(lastError, finalOptions);
                }
                if (attempt < retries) {
                    await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
                    continue;
                }
                lastError.retry = () => this.request(path, options);
                this.activeRequests.delete(requestId);
                throw lastError;
            }
        }
        throw lastError || new ApiError('Unknown error', 'UNKNOWN_ERROR');
    }
    cancelAll() {
        this.activeRequests.forEach(controller => controller.abort());
        this.activeRequests.clear();
    }
    async fetchCollection(params) {
        const apiParams = this.convertQueryParams(params);
        return this.request('', { method: 'GET', params: apiParams });
    }
    async fetchOne(id) {
        return this.request(`/${id}`, { method: 'GET' });
    }
    async create(data) {
        return this.request('', { method: 'POST', body: data });
    }
    async update(id, data) {
        return this.request(`/${id}`, { method: 'PUT', body: data });
    }
    async patch(id, data) {
        return this.request(`/${id}`, { method: 'PATCH', body: data });
    }
    async delete(id) {
        return this.request(`/${id}`, { method: 'DELETE' });
    }
    async batchCreate(items) {
        return this.request('/batch', { method: 'POST', body: { items } });
    }
    async batchUpdate(updates) {
        return this.request('/batch', { method: 'PUT', body: { updates } });
    }
    async batchDelete(ids) {
        return this.request('/batch', { method: 'DELETE', body: { ids } });
    }
    convertQueryParams(params) {
        if (!params)
            return {};
        const apiParams = {};
        if (params.filters && params.filters.length > 0) {
            apiParams.filters = JSON.stringify(params.filters);
        }
        if (params.sort) {
            apiParams.sort = `${params.sort.direction === 'desc' ? '-' : ''}${params.sort.field}`;
        }
        if (params.pagination) {
            apiParams.page = params.pagination.page;
            apiParams.pageSize = params.pagination.pageSize;
        }
        if (params.include && params.include.length > 0) {
            apiParams.include = params.include.join(',');
        }
        if (params.fields && params.fields.length > 0) {
            apiParams.fields = params.fields.join(',');
        }
        return apiParams;
    }
}
export function createApiClient(config) {
    const client = new StoreApiClient(config);
    client.addErrorInterceptor((error) => {
        console.error(`[StoreAPI] Error: ${error.message}`, error);
        return error;
    });
    return client;
}
export function createCrudApi(endpoint, config) {
    const api = createApiClient({
        endpoint,
        ...config,
    });
    return {
        api,
        fetch: async (params) => {
            try {
                return await api.fetchCollection(params);
            }
            catch (error) {
                console.error(`Failed to fetch ${endpoint}:`, error);
                return [];
            }
        },
        get: async (id) => {
            return api.fetchOne(id);
        },
        create: async (data) => {
            try {
                const result = await api.create(data);
                return { success: true, data: result };
            }
            catch (error) {
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
        update: async (id, data) => {
            try {
                const result = await api.update(id, data);
                return { success: true, data: result };
            }
            catch (error) {
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
        delete: async (id) => {
            try {
                await api.delete(id);
                return { success: true, data: true };
            }
            catch (error) {
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
        batchCreate: async (items) => {
            try {
                const results = await api.batchCreate(items);
                return { succeeded: results, failed: [] };
            }
            catch (error) {
                const storeError = error instanceof ApiError ? error.toStoreError() : {
                    code: 'BATCH_CREATE_ERROR',
                    message: 'Failed to create resources',
                    timestamp: Date.now(),
                };
                return {
                    succeeded: [],
                    failed: items.map(item => ({ item: item, error: storeError })),
                };
            }
        },
        batchUpdate: async (updates) => {
            try {
                const results = await api.batchUpdate(updates);
                return { succeeded: results, failed: [] };
            }
            catch (error) {
                const storeError = error instanceof ApiError ? error.toStoreError() : {
                    code: 'BATCH_UPDATE_ERROR',
                    message: 'Failed to update resources',
                    timestamp: Date.now(),
                };
                return {
                    succeeded: [],
                    failed: updates.map(({ data }) => ({ item: data, error: storeError })),
                };
            }
        },
        batchDelete: async (ids) => {
            try {
                await api.batchDelete(ids);
                return { succeeded: ids, failed: [] };
            }
            catch (error) {
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
export class PollingManager {
    constructor() {
        this.intervals = new Map();
    }
    start(key, callback, interval = 5000) {
        this.stop(key);
        const id = setInterval(async () => {
            try {
                await callback();
            }
            catch (error) {
                console.error(`[Polling] Error in ${key}:`, error);
            }
        }, interval);
        this.intervals.set(key, id);
        callback().catch(error => {
            console.error(`[Polling] Initial error in ${key}:`, error);
        });
    }
    stop(key) {
        const id = this.intervals.get(key);
        if (id) {
            clearInterval(id);
            this.intervals.delete(key);
        }
    }
    stopAll() {
        this.intervals.forEach(id => clearInterval(id));
        this.intervals.clear();
    }
}
export const pollingManager = new PollingManager();
//# sourceMappingURL=api.js.map