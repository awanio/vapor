import { atom, computed } from 'nanostores';
import { auth } from '../../auth';
import { getWsUrl } from '../../config';
import { WebSocketEventType, DEFAULT_RECONNECT_STRATEGIES } from '../types/websocket';
class WebSocketManager {
    constructor() {
        this.sharedConnections = {
            metrics: null,
            events: null,
            notifications: null,
        };
        this.isolatedConnections = {
            terminals: new Map(),
            fileTransfers: new Map(),
            executions: new Map(),
            containerLogs: new Map(),
        };
        this.connectionStatus = new Map();
        this.reconnectStrategies = new Map();
        this.messageRouters = new Map();
        this.messageQueues = new Map();
        this.reconnectTimers = new Map();
        this.healthCheckIntervals = new Map();
        this.debug = false;
        if (DEFAULT_RECONNECT_STRATEGIES.metrics) {
            this.reconnectStrategies.set('metrics', DEFAULT_RECONNECT_STRATEGIES.metrics);
        }
        if (DEFAULT_RECONNECT_STRATEGIES.terminal) {
            this.reconnectStrategies.set('terminal', DEFAULT_RECONNECT_STRATEGIES.terminal);
        }
        if (DEFAULT_RECONNECT_STRATEGIES.default) {
            this.reconnectStrategies.set('default', DEFAULT_RECONNECT_STRATEGIES.default);
        }
        window.addEventListener('auth:logout', () => this.closeAll());
        if (this.debug) {
            console.log('[WebSocketManager] Initialized');
        }
    }
    static getInstance() {
        if (!WebSocketManager.instance) {
            WebSocketManager.instance = new WebSocketManager();
        }
        return WebSocketManager.instance;
    }
    subscribeToShared(type, router) {
        const connectionId = `shared:${type}`;
        if (!this.messageRouters.has(connectionId)) {
            this.messageRouters.set(connectionId, new Set());
        }
        this.messageRouters.get(connectionId).add(router);
        if (!this.sharedConnections[type]) {
            this.createSharedConnection(type);
        }
        return () => {
            const routers = this.messageRouters.get(connectionId);
            if (routers) {
                routers.delete(router);
                if (routers.size === 0) {
                    this.closeSharedConnection(type);
                }
            }
        };
    }
    createSharedConnection(type) {
        const connectionId = `shared:${type}`;
        const endpoint = this.getEndpointPath(type);
        if (this.debug) {
            console.log(`[WebSocketManager] Creating shared connection: ${connectionId}`);
        }
        const ws = new WebSocket(getWsUrl(endpoint));
        this.updateConnectionStatus(connectionId, {
            endpoint,
            status: 'connecting',
            reconnectAttempts: 0,
        });
        this.setupWebSocketHandlers(ws, connectionId, type);
        this.sharedConnections[type] = ws;
        this.startHealthMonitoring(connectionId);
    }
    closeSharedConnection(type) {
        const connectionId = `shared:${type}`;
        const ws = this.sharedConnections[type];
        if (ws) {
            if (this.debug) {
                console.log(`[WebSocketManager] Closing shared connection: ${connectionId}`);
            }
            this.stopHealthMonitoring(connectionId);
            this.cancelReconnection(connectionId);
            ws.close(1000, 'Normal closure');
            this.sharedConnections[type] = null;
            this.updateConnectionStatus(connectionId, {
                ...this.getConnectionStatus(connectionId),
                status: 'disconnected',
            });
            this.messageQueues.delete(connectionId);
        }
    }
    createIsolated(type, id, config) {
        const connectionId = `isolated:${type}:${id}`;
        const endpoint = this.getEndpointPath(type, id);
        if (this.debug) {
            console.log(`[WebSocketManager] Creating isolated connection: ${connectionId}`);
        }
        const existing = this.isolatedConnections[type].get(id);
        if (existing && existing.readyState === WebSocket.OPEN) {
            return existing;
        }
        let url = getWsUrl(endpoint);
        if (config?.params) {
            const params = new URLSearchParams(config.params);
            url += `?${params.toString()}`;
        }
        const ws = new WebSocket(url, config?.protocols);
        this.updateConnectionStatus(connectionId, {
            endpoint,
            status: 'connecting',
            reconnectAttempts: 0,
        });
        this.setupWebSocketHandlers(ws, connectionId, type, id);
        this.isolatedConnections[type].set(id, ws);
        if (type === 'terminals' || type === 'executions') {
            this.startHealthMonitoring(connectionId);
        }
        return ws;
    }
    closeIsolated(type, id) {
        const connectionId = `isolated:${type}:${id}`;
        const ws = this.isolatedConnections[type].get(id);
        if (ws) {
            if (this.debug) {
                console.log(`[WebSocketManager] Closing isolated connection: ${connectionId}`);
            }
            this.stopHealthMonitoring(connectionId);
            this.cancelReconnection(connectionId);
            ws.close(1000, 'Normal closure');
            this.isolatedConnections[type].delete(id);
            this.connectionStatus.delete(connectionId);
            this.messageQueues.delete(connectionId);
        }
    }
    setupWebSocketHandlers(ws, connectionId, type, isolatedId) {
        ws.addEventListener('open', () => {
            if (this.debug) {
                console.log(`[WebSocketManager] Connection opened: ${connectionId}`);
            }
            this.updateConnectionStatus(connectionId, {
                ...this.getConnectionStatus(connectionId),
                status: 'connected',
                lastConnected: Date.now(),
                reconnectAttempts: 0,
            });
            if (auth.isAuthenticated()) {
                const token = auth.getToken();
                if (token) {
                    ws.send(JSON.stringify({
                        type: 'auth',
                        payload: {
                            token,
                        },
                    }));
                }
            }
            this.processQueuedMessages(connectionId);
            this.emitEvent({
                type: WebSocketEventType.CONNECTED,
                connectionId,
                timestamp: Date.now(),
            });
        });
        ws.addEventListener('message', (event) => {
            try {
                const message = typeof event.data === 'string'
                    ? JSON.parse(event.data)
                    : event.data;
                const status = this.getConnectionStatus(connectionId);
                if (status) {
                    status.messageCount = (status.messageCount || 0) + 1;
                }
                this.routeMessage(connectionId, message);
                this.emitEvent({
                    type: WebSocketEventType.MESSAGE,
                    connectionId,
                    data: message,
                    timestamp: Date.now(),
                });
            }
            catch (error) {
                console.error(`[WebSocketManager] Failed to parse message: ${connectionId}`, error);
            }
        });
        ws.addEventListener('error', (error) => {
            console.error(`[WebSocketManager] Connection error: ${connectionId}`, error);
            this.updateConnectionStatus(connectionId, {
                ...this.getConnectionStatus(connectionId),
                status: 'error',
                lastError: new Error('WebSocket error'),
            });
            this.emitEvent({
                type: WebSocketEventType.ERROR,
                connectionId,
                error: new Error('WebSocket error'),
                timestamp: Date.now(),
            });
        });
        ws.addEventListener('close', (event) => {
            if (this.debug) {
                console.log(`[WebSocketManager] Connection closed: ${connectionId}`, {
                    code: event.code,
                    reason: event.reason,
                });
            }
            this.updateConnectionStatus(connectionId, {
                ...this.getConnectionStatus(connectionId),
                status: 'disconnected',
                lastDisconnected: Date.now(),
            });
            this.emitEvent({
                type: WebSocketEventType.DISCONNECTED,
                connectionId,
                timestamp: Date.now(),
            });
            if (event.code !== 1000) {
                this.scheduleReconnection(connectionId, type, isolatedId);
            }
        });
    }
    scheduleReconnection(connectionId, type, isolatedId) {
        const status = this.getConnectionStatus(connectionId);
        if (!status)
            return;
        const strategy = this.getReconnectStrategy(type);
        if (status.reconnectAttempts >= strategy.maxAttempts) {
            console.error(`[WebSocketManager] Max reconnection attempts reached: ${connectionId}`);
            return;
        }
        let delay = Math.min(strategy.initialDelay * Math.pow(strategy.backoffMultiplier, status.reconnectAttempts), strategy.maxDelay);
        if (strategy.jitter) {
            delay *= (0.5 + Math.random() * 0.5);
        }
        if (this.debug) {
            console.log(`[WebSocketManager] Scheduling reconnection: ${connectionId} in ${delay}ms`);
        }
        this.updateConnectionStatus(connectionId, {
            ...status,
            status: 'reconnecting',
            reconnectAttempts: status.reconnectAttempts + 1,
        });
        this.emitEvent({
            type: WebSocketEventType.RECONNECTING,
            connectionId,
            data: { attempt: status.reconnectAttempts + 1, delay },
            timestamp: Date.now(),
        });
        const timer = setTimeout(() => {
            this.reconnectTimers.delete(connectionId);
            if (connectionId.startsWith('shared:')) {
                const sharedType = type;
                this.createSharedConnection(sharedType);
            }
            else if (isolatedId) {
                const isolatedType = type;
                this.createIsolated(isolatedType, isolatedId);
            }
        }, delay);
        this.reconnectTimers.set(connectionId, timer);
    }
    cancelReconnection(connectionId) {
        const timer = this.reconnectTimers.get(connectionId);
        if (timer) {
            clearTimeout(timer);
            this.reconnectTimers.delete(connectionId);
        }
    }
    routeMessage(connectionId, message) {
        const routers = this.messageRouters.get(connectionId);
        if (!routers)
            return;
        routers.forEach(router => {
            try {
                if (router.messageType) {
                    const types = Array.isArray(router.messageType)
                        ? router.messageType
                        : [router.messageType];
                    if (!types.includes(message.type)) {
                        return;
                    }
                }
                if (router.filter && !router.filter(message)) {
                    return;
                }
                router.handler(message);
            }
            catch (error) {
                console.error(`[WebSocketManager] Router error: ${router.routeId}`, error);
                if (router.onError) {
                    router.onError(error);
                }
            }
        });
    }
    getConnectionStatus(connectionId) {
        return this.connectionStatus.get(connectionId);
    }
    updateConnectionStatus(connectionId, status) {
        this.connectionStatus.set(connectionId, status);
        this.updateConnectionHealth();
    }
    send(connectionId, message) {
        const ws = this.getWebSocket(connectionId);
        if (ws && ws.readyState === WebSocket.OPEN) {
            const data = typeof message === 'string' ? message : JSON.stringify(message);
            ws.send(data);
        }
        else {
            this.queueMessage(connectionId, message);
        }
    }
    queueMessage(connectionId, message) {
        if (!this.messageQueues.has(connectionId)) {
            this.messageQueues.set(connectionId, []);
        }
        const queue = this.messageQueues.get(connectionId);
        const maxQueueSize = 100;
        if (queue.length >= maxQueueSize) {
            console.warn(`[WebSocketManager] Message queue full: ${connectionId}`);
            this.emitEvent({
                type: WebSocketEventType.QUEUE_FULL,
                connectionId,
                timestamp: Date.now(),
            });
            queue.shift();
        }
        queue.push({
            message,
            timestamp: Date.now(),
            attempts: 0,
        });
    }
    processQueuedMessages(connectionId) {
        const queue = this.messageQueues.get(connectionId);
        if (!queue || queue.length === 0)
            return;
        const ws = this.getWebSocket(connectionId);
        if (!ws || ws.readyState !== WebSocket.OPEN)
            return;
        if (this.debug) {
            console.log(`[WebSocketManager] Processing ${queue.length} queued messages: ${connectionId}`);
        }
        while (queue.length > 0) {
            const item = queue.shift();
            const data = typeof item.message === 'string'
                ? item.message
                : JSON.stringify(item.message);
            ws.send(data);
        }
    }
    async reconnect(connectionId) {
        const ws = this.getWebSocket(connectionId);
        if (ws) {
            ws.close(1000, 'Manual reconnection');
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        if (connectionId.startsWith('shared:')) {
            const type = connectionId.split(':')[1];
            this.createSharedConnection(type);
        }
        else if (connectionId.startsWith('isolated:')) {
            const [, type, id] = connectionId.split(':');
            if (type && id) {
                this.createIsolated(type, id);
            }
        }
    }
    closeAll() {
        if (this.debug) {
            console.log('[WebSocketManager] Closing all connections');
        }
        Object.keys(this.sharedConnections).forEach(type => {
            this.closeSharedConnection(type);
        });
        Object.entries(this.isolatedConnections).forEach(([type, connections]) => {
            connections.forEach((_, id) => {
                this.closeIsolated(type, id);
            });
        });
        this.connectionStatus.clear();
        this.messageRouters.clear();
        this.messageQueues.clear();
        this.reconnectTimers.forEach(timer => clearTimeout(timer));
        this.reconnectTimers.clear();
        this.healthCheckIntervals.forEach(interval => clearInterval(interval));
        this.healthCheckIntervals.clear();
    }
    getWebSocket(connectionId) {
        if (connectionId.startsWith('shared:')) {
            const type = connectionId.split(':')[1];
            return this.sharedConnections[type];
        }
        else if (connectionId.startsWith('isolated:')) {
            const [, type, id] = connectionId.split(':');
            if (type && id) {
                return this.isolatedConnections[type]?.get(id) || null;
            }
            return null;
        }
        return null;
    }
    getEndpointPath(type, id) {
        const endpoints = {
            metrics: '/ws/metrics',
            events: '/ws/events',
            notifications: '/ws/notifications',
            terminals: `/ws/terminal${id ? `?id=${id}` : ''}`,
            fileTransfers: `/ws/upload${id ? `?id=${id}` : ''}`,
            executions: `/ws/ansible-exec${id ? `?id=${id}` : ''}`,
            containerLogs: `/ws/container/logs${id ? `?id=${id}` : ''}`,
        };
        return endpoints[type] || '/ws/default';
    }
    getReconnectStrategy(type) {
        const strategy = this.reconnectStrategies.get(type) ||
            this.reconnectStrategies.get('default') ||
            DEFAULT_RECONNECT_STRATEGIES.default;
        return strategy || DEFAULT_RECONNECT_STRATEGIES.default;
    }
    startHealthMonitoring(connectionId) {
        const interval = setInterval(() => {
            const ws = this.getWebSocket(connectionId);
            const status = this.getConnectionStatus(connectionId);
            if (ws && status) {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'ping' }));
                }
                const lastActivity = Math.max(status.lastConnected || 0, status.messageCount || 0);
                if (Date.now() - lastActivity > 60000) {
                    console.warn(`[WebSocketManager] Stale connection detected: ${connectionId}`);
                    this.reconnect(connectionId);
                }
            }
        }, 30000);
        this.healthCheckIntervals.set(connectionId, interval);
    }
    stopHealthMonitoring(connectionId) {
        const interval = this.healthCheckIntervals.get(connectionId);
        if (interval) {
            clearInterval(interval);
            this.healthCheckIntervals.delete(connectionId);
        }
    }
    emitEvent(event) {
        window.dispatchEvent(new CustomEvent('websocket:event', { detail: event }));
    }
    updateConnectionHealth() {
        const health = [];
        this.connectionStatus.forEach((status, connectionId) => {
            health.push({
                connectionId,
                status: status.status,
                reconnectCount: status.reconnectAttempts,
                lastError: status.lastError?.message,
            });
        });
        $connectionHealth.set(health);
    }
}
export const wsManager = WebSocketManager.getInstance();
export const $connectionHealth = atom([]);
export const $activeConnections = computed($connectionHealth, health => health.filter(h => h.status === 'connected').length);
export const $totalConnections = computed($connectionHealth, health => health.length);
//# sourceMappingURL=websocket.js.map