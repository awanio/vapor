export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting';
export interface WebSocketMessage<T = any> {
    type: string;
    payload: T;
    timestamp?: number;
    id?: string;
}
export interface ConnectionState {
    endpoint: string;
    status: ConnectionStatus;
    reconnectAttempts: number;
    lastError?: Error;
    lastConnected?: number;
    lastDisconnected?: number;
    messageCount?: number;
}
export interface ReconnectStrategy {
    maxAttempts: number;
    initialDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
    jitter: boolean;
    timeout: number;
}
export interface MessageRouter<T = any> {
    routeId: string;
    messageType?: string | string[];
    filter?: (message: WebSocketMessage) => boolean;
    handler: (message: WebSocketMessage<T>) => void;
    onError?: (error: Error) => void;
}
export interface QueuedMessage {
    message: any;
    timestamp: number;
    attempts: number;
    priority?: number;
}
export interface WebSocketEndpoint {
    path: string;
    type: 'shared' | 'isolated';
    reconnectStrategy: ReconnectStrategy;
    maxQueueSize?: number;
    requiresAuth?: boolean;
    headers?: Record<string, string>;
    params?: Record<string, string>;
    protocols?: string[];
}
export interface TerminalSession {
    id: string;
    connection: WebSocket | null;
    status: ConnectionStatus;
    buffer: string[];
    maxBufferSize: number;
    createdAt: number;
    lastActivity: number;
}
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
export interface MetricData {
    cpu?: {
        usage: number;
        cores: Array<{
            core: number;
            usage: number;
        }>;
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
export interface IWebSocketManager {
    sharedConnections: {
        metrics: WebSocket | null;
        events: WebSocket | null;
        notifications: WebSocket | null;
    };
    isolatedConnections: {
        terminals: Map<string, WebSocket>;
        fileTransfers: Map<string, WebSocket>;
        executions: Map<string, WebSocket>;
        containerLogs: Map<string, WebSocket>;
    };
    connectionStatus: Map<string, ConnectionState>;
    reconnectStrategies: Map<string, ReconnectStrategy>;
    messageRouters: Map<string, Set<MessageRouter>>;
    messageQueues: Map<string, QueuedMessage[]>;
    subscribeToShared(type: keyof IWebSocketManager['sharedConnections'], router: MessageRouter): () => void;
    createIsolated(type: keyof IWebSocketManager['isolatedConnections'], id: string, config?: Partial<WebSocketEndpoint>): WebSocket;
    closeIsolated(type: keyof IWebSocketManager['isolatedConnections'], id: string): void;
    getConnectionStatus(connectionId: string): ConnectionState | undefined;
    send(connectionId: string, message: any): void;
    reconnect(connectionId: string): Promise<void>;
    closeAll(): void;
}
export declare enum WebSocketEventType {
    CONNECTED = "ws:connected",
    DISCONNECTED = "ws:disconnected",
    MESSAGE = "ws:message",
    ERROR = "ws:error",
    RECONNECTING = "ws:reconnecting",
    RECONNECTED = "ws:reconnected",
    QUEUE_FULL = "ws:queue_full"
}
export interface WebSocketEvent {
    type: WebSocketEventType;
    connectionId: string;
    data?: any;
    error?: Error;
    timestamp: number;
}
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
export declare const DEFAULT_RECONNECT_STRATEGIES: Record<string, ReconnectStrategy>;
//# sourceMappingURL=websocket.d.ts.map