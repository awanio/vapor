/**
 * WebSocket Manager with hybrid connection strategy
 * Manages both shared connections (for broadcast data) and isolated connections (for interactive features)
 */

import { atom, computed } from 'nanostores';
import { auth } from '../../auth';
import { getWsUrl } from '../../config';
import type {
  IWebSocketManager,
  ConnectionState,
  ConnectionStatus,
  ReconnectStrategy,
  MessageRouter,
  QueuedMessage,
  WebSocketEndpoint,
  WebSocketMessage,
  WebSocketEvent,
  ConnectionHealth,
} from '../types/websocket';
import { 
  WebSocketEventType,
  DEFAULT_RECONNECT_STRATEGIES 
} from '../types/websocket';

/**
 * WebSocket Manager Implementation
 */
class WebSocketManager implements IWebSocketManager {
  private static instance: WebSocketManager;
  
  // Shared connections for broadcast/read-only data
  public sharedConnections = {
    metrics: null as WebSocket | null,
    events: null as WebSocket | null,
    notifications: null as WebSocket | null,
  };
  
  // Isolated connections for stateful/interactive features
  public isolatedConnections = {
    terminals: new Map<string, WebSocket>(),
    fileTransfers: new Map<string, WebSocket>(),
    executions: new Map<string, WebSocket>(),
    containerLogs: new Map<string, WebSocket>(),
  };
  
  // Connection state tracking
  public connectionStatus = new Map<string, ConnectionState>();
  
  // Reconnection strategies per endpoint
  public reconnectStrategies = new Map<string, ReconnectStrategy>();
  
  // Message routers per connection
  public messageRouters = new Map<string, Set<MessageRouter>>();
  
  // Message queues per connection
  public messageQueues = new Map<string, QueuedMessage[]>();
  
  // Reconnection timers
  private reconnectTimers = new Map<string, NodeJS.Timeout>();
  
  // Connection health monitoring
  private healthCheckIntervals = new Map<string, NodeJS.Timeout>();
  
  // Debug mode
  private debug = false;
  
  private constructor() {
    // Set default reconnection strategies
    this.reconnectStrategies.set('metrics', DEFAULT_RECONNECT_STRATEGIES.metrics);
    this.reconnectStrategies.set('terminal', DEFAULT_RECONNECT_STRATEGIES.terminal);
    this.reconnectStrategies.set('default', DEFAULT_RECONNECT_STRATEGIES.default);
    
    // Listen for auth events
    window.addEventListener('auth:logout', () => this.closeAll());
    
    if (this.debug) {
      console.log('[WebSocketManager] Initialized');
    }
  }
  
  /**
   * Get singleton instance
   */
  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }
  
  /**
   * Subscribe to a shared connection
   */
  subscribeToShared(
    type: keyof typeof this.sharedConnections,
    router: MessageRouter
  ): () => void {
    const connectionId = `shared:${type}`;
    
    // Initialize router set if not exists
    if (!this.messageRouters.has(connectionId)) {
      this.messageRouters.set(connectionId, new Set());
    }
    
    // Add router
    this.messageRouters.get(connectionId)!.add(router);
    
    // Create or reuse shared connection
    if (!this.sharedConnections[type]) {
      this.createSharedConnection(type);
    }
    
    // Return unsubscribe function
    return () => {
      const routers = this.messageRouters.get(connectionId);
      if (routers) {
        routers.delete(router);
        
        // Close connection if no more subscribers
        if (routers.size === 0) {
          this.closeSharedConnection(type);
        }
      }
    };
  }
  
  /**
   * Create a shared connection
   */
  private createSharedConnection(type: keyof typeof this.sharedConnections): void {
    const connectionId = `shared:${type}`;
    const endpoint = this.getEndpointPath(type);
    
    if (this.debug) {
      console.log(`[WebSocketManager] Creating shared connection: ${connectionId}`);
    }
    
    // Create WebSocket connection
    const ws = new WebSocket(getWsUrl(endpoint));
    
    // Set connection status
    this.updateConnectionStatus(connectionId, {
      endpoint,
      status: 'connecting',
      reconnectAttempts: 0,
    });
    
    // Setup event handlers
    this.setupWebSocketHandlers(ws, connectionId, type);
    
    // Store connection
    this.sharedConnections[type] = ws;
    
    // Start health monitoring
    this.startHealthMonitoring(connectionId);
  }
  
  /**
   * Close a shared connection
   */
  private closeSharedConnection(type: keyof typeof this.sharedConnections): void {
    const connectionId = `shared:${type}`;
    const ws = this.sharedConnections[type];
    
    if (ws) {
      if (this.debug) {
        console.log(`[WebSocketManager] Closing shared connection: ${connectionId}`);
      }
      
      // Stop health monitoring
      this.stopHealthMonitoring(connectionId);
      
      // Cancel reconnection timer
      this.cancelReconnection(connectionId);
      
      // Close WebSocket
      ws.close(1000, 'Normal closure');
      
      // Clear connection
      this.sharedConnections[type] = null;
      
      // Update status
      this.updateConnectionStatus(connectionId, {
        ...this.getConnectionStatus(connectionId)!,
        status: 'disconnected',
      });
      
      // Clear message queue
      this.messageQueues.delete(connectionId);
    }
  }
  
  /**
   * Create an isolated connection
   */
  createIsolated(
    type: keyof typeof this.isolatedConnections,
    id: string,
    config?: Partial<WebSocketEndpoint>
  ): WebSocket {
    const connectionId = `isolated:${type}:${id}`;
    const endpoint = this.getEndpointPath(type, id);
    
    if (this.debug) {
      console.log(`[WebSocketManager] Creating isolated connection: ${connectionId}`);
    }
    
    // Check if connection already exists
    const existing = this.isolatedConnections[type].get(id);
    if (existing && existing.readyState === WebSocket.OPEN) {
      return existing;
    }
    
    // Create WebSocket connection with query params if needed
    let url = getWsUrl(endpoint);
    if (config?.params) {
      const params = new URLSearchParams(config.params);
      url += `?${params.toString()}`;
    }
    
    const ws = new WebSocket(url, config?.protocols);
    
    // Set connection status
    this.updateConnectionStatus(connectionId, {
      endpoint,
      status: 'connecting',
      reconnectAttempts: 0,
    });
    
    // Setup event handlers
    this.setupWebSocketHandlers(ws, connectionId, type, id);
    
    // Store connection
    this.isolatedConnections[type].set(id, ws);
    
    // Start health monitoring for long-lived connections
    if (type === 'terminals' || type === 'executions') {
      this.startHealthMonitoring(connectionId);
    }
    
    return ws;
  }
  
  /**
   * Close an isolated connection
   */
  closeIsolated(
    type: keyof typeof this.isolatedConnections,
    id: string
  ): void {
    const connectionId = `isolated:${type}:${id}`;
    const ws = this.isolatedConnections[type].get(id);
    
    if (ws) {
      if (this.debug) {
        console.log(`[WebSocketManager] Closing isolated connection: ${connectionId}`);
      }
      
      // Stop health monitoring
      this.stopHealthMonitoring(connectionId);
      
      // Cancel reconnection timer
      this.cancelReconnection(connectionId);
      
      // Close WebSocket
      ws.close(1000, 'Normal closure');
      
      // Remove connection
      this.isolatedConnections[type].delete(id);
      
      // Update status
      this.connectionStatus.delete(connectionId);
      
      // Clear message queue
      this.messageQueues.delete(connectionId);
    }
  }
  
  /**
   * Setup WebSocket event handlers
   */
  private setupWebSocketHandlers(
    ws: WebSocket,
    connectionId: string,
    type: string,
    isolatedId?: string
  ): void {
    // Connection opened
    ws.addEventListener('open', () => {
      if (this.debug) {
        console.log(`[WebSocketManager] Connection opened: ${connectionId}`);
      }
      
      // Update status
      this.updateConnectionStatus(connectionId, {
        ...this.getConnectionStatus(connectionId)!,
        status: 'connected',
        lastConnected: Date.now(),
        reconnectAttempts: 0,
      });
      
      // Send authentication if required
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
      
      // Process queued messages
      this.processQueuedMessages(connectionId);
      
      // Emit event
      this.emitEvent({
        type: WebSocketEventType.CONNECTED,
        connectionId,
        timestamp: Date.now(),
      });
    });
    
    // Message received
    ws.addEventListener('message', (event) => {
      try {
        const message: WebSocketMessage = 
          typeof event.data === 'string' 
            ? JSON.parse(event.data)
            : event.data;
        
        // Update message count
        const status = this.getConnectionStatus(connectionId);
        if (status) {
          status.messageCount = (status.messageCount || 0) + 1;
        }
        
        // Route message to subscribers
        this.routeMessage(connectionId, message);
        
        // Emit event
        this.emitEvent({
          type: WebSocketEventType.MESSAGE,
          connectionId,
          data: message,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error(`[WebSocketManager] Failed to parse message: ${connectionId}`, error);
      }
    });
    
    // Connection error
    ws.addEventListener('error', (error) => {
      console.error(`[WebSocketManager] Connection error: ${connectionId}`, error);
      
      // Update status
      this.updateConnectionStatus(connectionId, {
        ...this.getConnectionStatus(connectionId)!,
        status: 'error',
        lastError: new Error('WebSocket error'),
      });
      
      // Emit event
      this.emitEvent({
        type: WebSocketEventType.ERROR,
        connectionId,
        error: new Error('WebSocket error'),
        timestamp: Date.now(),
      });
    });
    
    // Connection closed
    ws.addEventListener('close', (event) => {
      if (this.debug) {
        console.log(`[WebSocketManager] Connection closed: ${connectionId}`, {
          code: event.code,
          reason: event.reason,
        });
      }
      
      // Update status
      this.updateConnectionStatus(connectionId, {
        ...this.getConnectionStatus(connectionId)!,
        status: 'disconnected',
        lastDisconnected: Date.now(),
      });
      
      // Emit event
      this.emitEvent({
        type: WebSocketEventType.DISCONNECTED,
        connectionId,
        timestamp: Date.now(),
      });
      
      // Attempt reconnection if not a normal closure
      if (event.code !== 1000) {
        this.scheduleReconnection(connectionId, type, isolatedId);
      }
    });
  }
  
  /**
   * Schedule reconnection with backoff
   */
  private scheduleReconnection(
    connectionId: string,
    type: string,
    isolatedId?: string
  ): void {
    const status = this.getConnectionStatus(connectionId);
    if (!status) return;
    
    const strategy = this.getReconnectStrategy(type);
    
    // Check max attempts
    if (status.reconnectAttempts >= strategy.maxAttempts) {
      console.error(`[WebSocketManager] Max reconnection attempts reached: ${connectionId}`);
      return;
    }
    
    // Calculate delay with exponential backoff
    let delay = Math.min(
      strategy.initialDelay * Math.pow(strategy.backoffMultiplier, status.reconnectAttempts),
      strategy.maxDelay
    );
    
    // Add jitter if enabled
    if (strategy.jitter) {
      delay *= (0.5 + Math.random() * 0.5);
    }
    
    if (this.debug) {
      console.log(`[WebSocketManager] Scheduling reconnection: ${connectionId} in ${delay}ms`);
    }
    
    // Update status
    this.updateConnectionStatus(connectionId, {
      ...status,
      status: 'reconnecting',
      reconnectAttempts: status.reconnectAttempts + 1,
    });
    
    // Emit event
    this.emitEvent({
      type: WebSocketEventType.RECONNECTING,
      connectionId,
      data: { attempt: status.reconnectAttempts + 1, delay },
      timestamp: Date.now(),
    });
    
    // Schedule reconnection
    const timer = setTimeout(() => {
      this.reconnectTimers.delete(connectionId);
      
      if (connectionId.startsWith('shared:')) {
        const sharedType = type as keyof typeof this.sharedConnections;
        this.createSharedConnection(sharedType);
      } else if (isolatedId) {
        const isolatedType = type as keyof typeof this.isolatedConnections;
        this.createIsolated(isolatedType, isolatedId);
      }
    }, delay);
    
    this.reconnectTimers.set(connectionId, timer);
  }
  
  /**
   * Cancel scheduled reconnection
   */
  private cancelReconnection(connectionId: string): void {
    const timer = this.reconnectTimers.get(connectionId);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(connectionId);
    }
  }
  
  /**
   * Route message to subscribers
   */
  private routeMessage(connectionId: string, message: WebSocketMessage): void {
    const routers = this.messageRouters.get(connectionId);
    if (!routers) return;
    
    routers.forEach(router => {
      try {
        // Check message type filter
        if (router.messageType) {
          const types = Array.isArray(router.messageType) 
            ? router.messageType 
            : [router.messageType];
          
          if (!types.includes(message.type)) {
            return;
          }
        }
        
        // Check custom filter
        if (router.filter && !router.filter(message)) {
          return;
        }
        
        // Handle message
        router.handler(message);
      } catch (error) {
        console.error(`[WebSocketManager] Router error: ${router.routeId}`, error);
        
        if (router.onError) {
          router.onError(error as Error);
        }
      }
    });
  }
  
  /**
   * Get connection status
   */
  getConnectionStatus(connectionId: string): ConnectionState | undefined {
    return this.connectionStatus.get(connectionId);
  }
  
  /**
   * Update connection status
   */
  private updateConnectionStatus(connectionId: string, status: ConnectionState): void {
    this.connectionStatus.set(connectionId, status);
    
    // Update connection health atom
    this.updateConnectionHealth();
  }
  
  /**
   * Send message through connection
   */
  send(connectionId: string, message: any): void {
    const ws = this.getWebSocket(connectionId);
    
    if (ws && ws.readyState === WebSocket.OPEN) {
      const data = typeof message === 'string' ? message : JSON.stringify(message);
      ws.send(data);
    } else {
      // Queue message if connection not ready
      this.queueMessage(connectionId, message);
    }
  }
  
  /**
   * Queue message for later delivery
   */
  private queueMessage(connectionId: string, message: any): void {
    if (!this.messageQueues.has(connectionId)) {
      this.messageQueues.set(connectionId, []);
    }
    
    const queue = this.messageQueues.get(connectionId)!;
    const maxQueueSize = 100; // Default max queue size
    
    if (queue.length >= maxQueueSize) {
      console.warn(`[WebSocketManager] Message queue full: ${connectionId}`);
      
      // Emit event
      this.emitEvent({
        type: WebSocketEventType.QUEUE_FULL,
        connectionId,
        timestamp: Date.now(),
      });
      
      // Remove oldest message
      queue.shift();
    }
    
    queue.push({
      message,
      timestamp: Date.now(),
      attempts: 0,
    });
  }
  
  /**
   * Process queued messages
   */
  private processQueuedMessages(connectionId: string): void {
    const queue = this.messageQueues.get(connectionId);
    if (!queue || queue.length === 0) return;
    
    const ws = this.getWebSocket(connectionId);
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    
    if (this.debug) {
      console.log(`[WebSocketManager] Processing ${queue.length} queued messages: ${connectionId}`);
    }
    
    // Process all queued messages
    while (queue.length > 0) {
      const item = queue.shift()!;
      const data = typeof item.message === 'string' 
        ? item.message 
        : JSON.stringify(item.message);
      ws.send(data);
    }
  }
  
  /**
   * Reconnect a specific connection
   */
  async reconnect(connectionId: string): Promise<void> {
    // Close existing connection
    const ws = this.getWebSocket(connectionId);
    if (ws) {
      ws.close(1000, 'Manual reconnection');
    }
    
    // Wait a bit for clean closure
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Recreate connection
    if (connectionId.startsWith('shared:')) {
      const type = connectionId.split(':')[1] as keyof typeof this.sharedConnections;
      this.createSharedConnection(type);
    } else if (connectionId.startsWith('isolated:')) {
      const [, type, id] = connectionId.split(':');
      this.createIsolated(type as keyof typeof this.isolatedConnections, id);
    }
  }
  
  /**
   * Close all connections
   */
  closeAll(): void {
    if (this.debug) {
      console.log('[WebSocketManager] Closing all connections');
    }
    
    // Close shared connections
    Object.keys(this.sharedConnections).forEach(type => {
      this.closeSharedConnection(type as keyof typeof this.sharedConnections);
    });
    
    // Close isolated connections
    Object.entries(this.isolatedConnections).forEach(([type, connections]) => {
      connections.forEach((_, id) => {
        this.closeIsolated(type as keyof typeof this.isolatedConnections, id);
      });
    });
    
    // Clear all state
    this.connectionStatus.clear();
    this.messageRouters.clear();
    this.messageQueues.clear();
    this.reconnectTimers.forEach(timer => clearTimeout(timer));
    this.reconnectTimers.clear();
    this.healthCheckIntervals.forEach(interval => clearInterval(interval));
    this.healthCheckIntervals.clear();
  }
  
  /**
   * Get WebSocket instance by connection ID
   */
  private getWebSocket(connectionId: string): WebSocket | null {
    if (connectionId.startsWith('shared:')) {
      const type = connectionId.split(':')[1] as keyof typeof this.sharedConnections;
      return this.sharedConnections[type];
    } else if (connectionId.startsWith('isolated:')) {
      const [, type, id] = connectionId.split(':');
      return this.isolatedConnections[type as keyof typeof this.isolatedConnections].get(id) || null;
    }
    return null;
  }
  
  /**
   * Get endpoint path for connection type
   */
  private getEndpointPath(type: string, id?: string): string {
    const endpoints: Record<string, string> = {
      metrics: '/ws/metrics',  // Fixed: using /ws/metrics with 's'
      events: '/ws/events',
      notifications: '/ws/notifications',
      terminals: `/ws/terminal${id ? `?id=${id}` : ''}`,
      fileTransfers: `/ws/upload${id ? `?id=${id}` : ''}`,
      executions: `/ws/ansible-exec${id ? `?id=${id}` : ''}`,
      containerLogs: `/ws/container/logs${id ? `?id=${id}` : ''}`,
    };
    
    return endpoints[type] || '/ws/default';
  }
  
  /**
   * Get reconnection strategy for connection type
   */
  private getReconnectStrategy(type: string): ReconnectStrategy {
    return (
      this.reconnectStrategies.get(type) ||
      this.reconnectStrategies.get('default') ||
      DEFAULT_RECONNECT_STRATEGIES.default
    );
  }
  
  /**
   * Start health monitoring for connection
   */
  private startHealthMonitoring(connectionId: string): void {
    // Check every 30 seconds
    const interval = setInterval(() => {
      const ws = this.getWebSocket(connectionId);
      const status = this.getConnectionStatus(connectionId);
      
      if (ws && status) {
        // Send ping if connection is open
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
        
        // Check for stale connection (no messages in 60 seconds)
        const lastActivity = Math.max(
          status.lastConnected || 0,
          status.messageCount || 0
        );
        
        if (Date.now() - lastActivity > 60000) {
          console.warn(`[WebSocketManager] Stale connection detected: ${connectionId}`);
          this.reconnect(connectionId);
        }
      }
    }, 30000);
    
    this.healthCheckIntervals.set(connectionId, interval);
  }
  
  /**
   * Stop health monitoring for connection
   */
  private stopHealthMonitoring(connectionId: string): void {
    const interval = this.healthCheckIntervals.get(connectionId);
    if (interval) {
      clearInterval(interval);
      this.healthCheckIntervals.delete(connectionId);
    }
  }
  
  /**
   * Emit WebSocket event
   */
  private emitEvent(event: WebSocketEvent): void {
    // Emit to global event system if needed
    window.dispatchEvent(new CustomEvent('websocket:event', { detail: event }));
  }
  
  /**
   * Update connection health atom
   */
  private updateConnectionHealth(): void {
    const health: ConnectionHealth[] = [];
    
    this.connectionStatus.forEach((status, connectionId) => {
      health.push({
        connectionId,
        status: status.status,
        reconnectCount: status.reconnectAttempts,
        lastError: status.lastError?.message,
      });
    });
    
    // Update health atom
    $connectionHealth.set(health);
  }
}

// Export singleton instance
export const wsManager = WebSocketManager.getInstance();

// Atoms for reactive state
export const $connectionHealth = atom<ConnectionHealth[]>([]);
export const $activeConnections = computed($connectionHealth, health => 
  health.filter(h => h.status === 'connected').length
);
export const $totalConnections = computed($connectionHealth, health => health.length);
