import { auth } from './auth';
import { getApiUrl } from './config';
export class ApiError extends Error {
    constructor(message, code, details, status) {
        super(message);
        this.code = code;
        this.details = details;
        this.status = status;
        this.name = 'ApiError';
    }
}
export class Api {
    static async request(endpoint, options = {}) {
        const { method = 'GET', body, headers = {}, params } = options;
        let url = getApiUrl(endpoint);
        if (params) {
            const queryString = new URLSearchParams(Object.entries(params).map(([key, value]) => [key, String(value)])).toString();
            if (queryString) {
                url += `?${queryString}`;
            }
        }
        const authHeaders = endpoint === '/auth/login' ? {} : auth.getAuthHeaders();
        const requestHeaders = {
            'Content-Type': 'application/json',
            ...authHeaders,
            ...headers,
        };
        console.log('[API Request]', method, url, {
            headers: requestHeaders,
            hasAuth: !!authHeaders.Authorization
        });
        try {
            const response = await fetch(url, {
                method,
                headers: requestHeaders,
                body: body ? JSON.stringify(body) : undefined,
            });
            const contentType = response.headers.get('content-type');
            if (!contentType?.includes('application/json')) {
                if (!response.ok) {
                    throw new ApiError(`HTTP error! status: ${response.status}`, undefined, undefined, response.status);
                }
                return response.text();
            }
            const data = await response.json();
            if (!response.ok || data.status === 'error') {
                throw new ApiError(data.error?.message || 'An error occurred', data.error?.code, data.error?.details, response.status);
            }
            return data.data;
        }
        catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            throw new ApiError(error instanceof Error ? error.message : 'Network error', 'NETWORK_ERROR');
        }
    }
    static get(endpoint, params) {
        return this.request(endpoint, { method: 'GET', params });
    }
    static post(endpoint, body) {
        return this.request(endpoint, { method: 'POST', body });
    }
    static put(endpoint, body) {
        return this.request(endpoint, { method: 'PUT', body });
    }
    static delete(endpoint, params) {
        return this.request(endpoint, { method: 'DELETE', params });
    }
    static patch(endpoint, body) {
        return this.request(endpoint, { method: 'PATCH', body });
    }
    static async postResource(endpoint, content, contentType) {
        const authHeaders = auth.getAuthHeaders();
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
            const responseContentType = response.headers.get('content-type');
            if (!responseContentType?.includes('application/json')) {
                if (!response.ok) {
                    throw new ApiError(`HTTP error! status: ${response.status}`, undefined, undefined, response.status);
                }
                return response.text();
            }
            const data = await response.json();
            if (!response.ok || data.status === 'error') {
                throw new ApiError(data.error?.message || 'An error occurred', data.error?.code, data.error?.details, response.status);
            }
            return data.data;
        }
        catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            throw new ApiError(error instanceof Error ? error.message : 'Network error', 'NETWORK_ERROR');
        }
    }
}
export class WebSocketManager {
    constructor(path) {
        this.path = path;
        this.ws = null;
        this.reconnectInterval = 5000;
        this.maxReconnectAttempts = 5;
        this.reconnectAttempts = 0;
        this.messageHandlers = new Map();
        this.reconnectTimer = null;
        this.authenticated = false;
        this.url = '';
    }
    connect() {
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
                        const message = JSON.parse(event.data);
                        this.handleMessage(message);
                    }
                    catch (error) {
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
            }
            catch (error) {
                reject(error);
            }
        });
    }
    async authenticate() {
        const token = auth.getToken();
        if (!token) {
            throw new Error('No authentication token available');
        }
        return new Promise((resolve, reject) => {
            const authTimeout = setTimeout(() => {
                reject(new Error('Authentication timeout'));
            }, 5000);
            const authHandler = (message) => {
                if (message.type === 'auth' && message.payload?.authenticated === true) {
                    clearTimeout(authTimeout);
                    this.authenticated = true;
                    this.off('auth', authHandler);
                    this.off('error', errorHandler);
                    console.log(`WebSocket authenticated as ${message.payload.username}`);
                    resolve();
                }
            };
            const errorHandler = (message) => {
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
    scheduleReconnect() {
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
    handleMessage(message) {
        const handlers = this.messageHandlers.get(message.type);
        if (handlers) {
            handlers.forEach(handler => handler(message));
        }
        if (message.type === 'error') {
            console.error('WebSocket error:', message.error);
        }
    }
    send(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
        else {
            console.error('WebSocket is not connected');
        }
    }
    on(type, handler) {
        if (!this.messageHandlers.has(type)) {
            this.messageHandlers.set(type, new Set());
        }
        this.messageHandlers.get(type).add(handler);
    }
    off(type, handler) {
        const handlers = this.messageHandlers.get(type);
        if (handlers) {
            handlers.delete(handler);
        }
    }
    disconnect() {
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
    isConnected() {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN && this.authenticated;
    }
}
export const api = Api;
//# sourceMappingURL=api.js.map