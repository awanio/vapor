/**
 * WebSocket types for hybrid connection management
 */

/**
 * Connection status states
 */
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting';

/**
 * WebSocket message types
 */
export interface WebSocketMessage<T = any> {
  type: string;
  payload: T;
  timestamp?: number;
  id?: string;
}

/**
 * Connection state tracking
 */
export interface ConnectionState {
  endpoint: string;
  status: ConnectionStatus;
  reconnectAttempts: number;
  lastError?: Error;
  lastConnected?: number;
  lastDisconnected?: number;
  lastActivityAt?: number;
  messageCount?: number;
}

/**
 * Reconnection strategy configuration
 */
export interface ReconnectStrategy {
  /**
   * Maximum number of reconnection attempts
   */
  maxAttempts: number;
  
  /**
   * Initial delay in milliseconds
   */
  initialDelay: number;
  
  /**
   * Maximum delay in milliseconds
   */
  maxDelay: number;
  
  /**
   * Backoff multiplier for exponential backoff
   */
  backoffMultiplier: number;
  
  /**
   * Whether to use jitter in delay calculation
   */
  jitter: boolean;
  
  /**
   * Connection timeout in milliseconds
   */
  timeout: number;
}

/**
 * Message router configuration
 */
export interface MessageRouter<T = any> {
  /**
   * Route identifier
   */
  routeId: string;
  
  /**
   * Message type filter
   */
  messageType?: string | string[];
  
  /**
   * Custom filter function
   */
  filter?: (message: WebSocketMessage) => boolean;
  
  /**
   * Message handler
   */
  handler: (message: WebSocketMessage<T>) => void;
  
  /**
   * Error handler
   */
  onError?: (error: Error) => void;
}

/**
 * Queued message for buffering during disconnection
 */
export interface QueuedMessage {
  message: any;
  timestamp: number;
  attempts: number;
  priority?: number;
}

/**
 * WebSocket endpoint configuration
 */
export interface WebSocketEndpoint {
  /**
   * Endpoint URL path
   */
  path: string;
  
  /**
   * Connection type (shared or isolated)
   */
  type: 'shared' | 'isolated';
  
  /**
   * Reconnection strategy
   */
  reconnectStrategy: ReconnectStrategy;
  
  /**
   * Maximum message queue size
   */
  maxQueueSize?: number;
  
  /**
   * Authentication required
   */
  requiresAuth?: boolean;
  
  /**
   * Custom headers
   */
  headers?: Record<string, string>;
  
  /**
   * Query parameters
   */
  params?: Record<string, string>;
  
  /**
   * Protocol subprotocols
   */
  protocols?: string[];
}

/**
 * Terminal session state
 */
export interface TerminalSession {
  id: string;
  connection: WebSocket | null;
  status: ConnectionStatus;
  buffer: string[];
  maxBufferSize: number;
  createdAt: number;
  lastActivity: number;
}

/**
 * Container log stream state
 */
export interface LogStream {
  containerId: string;
  connection: WebSocket | null;
  status: ConnectionStatus;
  logs: string[];
  maxLogs: number;
  follow: boolean;
  timestamps: boolean;
  tail?: number;
}

/**
 * Metric data from WebSocket
 */
export interface MetricData {
  cpu?: {
    usage: number;
    cores: Array<{ core: number; usage: number }>;
  };
  memory?: {
    total: number;
    used: number;
    free: number;
    percent: number;
  };
  disk?: {
    devices: Array<{
      device: string;
      total: number;
      used: number;
      free: number;
      percent: number;
    }>;
  };
  network?: {
    interfaces: Array<{
      name: string;
      rxBytes: number;
      txBytes: number;
      rxPackets: number;
      txPackets: number;
    }>;
  };
  timestamp: number;
}

/**
 * WebSocket manager interface
 */
export interface IWebSocketManager {
  /**
   * Shared connections for broadcast/read-only data
   */
  sharedConnections: {
    metrics: WebSocket | null;
    events: WebSocket | null;
    notifications: WebSocket | null;
  };
  
  /**
   * Isolated connections for stateful/interactive features
   */
  isolatedConnections: {
    terminals: Map<string, WebSocket>;
    fileTransfers: Map<string, WebSocket>;
    executions: Map<string, WebSocket>;
    containerLogs: Map<string, WebSocket>;
  };
  
  /**
   * Connection state tracking
   */
  connectionStatus: Map<string, ConnectionState>;
  
  /**
   * Reconnection strategies per endpoint
   */
  reconnectStrategies: Map<string, ReconnectStrategy>;
  
  /**
   * Message routers per connection
   */
  messageRouters: Map<string, Set<MessageRouter>>;
  
  /**
   * Message queues per connection
   */
  messageQueues: Map<string, QueuedMessage[]>;
  
  /**
   * Subscribe to shared connection
   */
  subscribeToShared(
    type: keyof IWebSocketManager['sharedConnections'],
    router: MessageRouter
  ): () => void;
  
  /**
   * Create isolated connection
   */
  createIsolated(
    type: keyof IWebSocketManager['isolatedConnections'],
    id: string,
    config?: Partial<WebSocketEndpoint>
  ): WebSocket;
  
  /**
   * Close isolated connection
   */
  closeIsolated(
    type: keyof IWebSocketManager['isolatedConnections'],
    id: string
  ): void;
  
  /**
   * Get connection status
   */
  getConnectionStatus(connectionId: string): ConnectionState | undefined;
  
  /**
   * Send message through connection
   */
  send(connectionId: string, message: any): void;
  
  /**
   * Reconnect a specific connection
   */
  reconnect(connectionId: string): Promise<void>;
  
  /**
   * Close all connections
   */
  closeAll(): void;
}

/**
 * WebSocket event types
 */
export enum WebSocketEventType {
  CONNECTED = 'ws:connected',
  DISCONNECTED = 'ws:disconnected',
  MESSAGE = 'ws:message',
  ERROR = 'ws:error',
  RECONNECTING = 'ws:reconnecting',
  RECONNECTED = 'ws:reconnected',
  QUEUE_FULL = 'ws:queue_full',
}

/**
 * WebSocket event
 */
export interface WebSocketEvent {
  type: WebSocketEventType;
  connectionId: string;
  data?: any;
  error?: Error;
  timestamp: number;
}

/**
 * Connection health metrics
 */
export interface ConnectionHealth {
  connectionId: string;
  status: ConnectionStatus;
  latency?: number;
  messageRate?: number;
  errorRate?: number;
  uptime?: number;
  reconnectCount: number;
  lastError?: string;
}

/**
 * Default reconnection strategies
 */
export const DEFAULT_RECONNECT_STRATEGIES: Record<string, ReconnectStrategy> = {
  metrics: {
    maxAttempts: Infinity,
    initialDelay: 3000,
    maxDelay: 30000,
    backoffMultiplier: 1.5,
    jitter: true,
    timeout: 10000,
  },
  terminal: {
    maxAttempts: 5,
    initialDelay: 1000,
    maxDelay: 5000,
    backoffMultiplier: 1.2,
    jitter: false,
    timeout: 5000,
  },
  default: {
    maxAttempts: 10,
    initialDelay: 2000,
    maxDelay: 20000,
    backoffMultiplier: 1.5,
    jitter: true,
    timeout: 10000,
  },
};
