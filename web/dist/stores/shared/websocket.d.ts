import type { IWebSocketManager, ConnectionState, ReconnectStrategy, MessageRouter, QueuedMessage, WebSocketEndpoint, ConnectionHealth } from '../types/websocket';
declare class WebSocketManager implements IWebSocketManager {
    private static instance;
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
    messageRouters: Map<string, Set<MessageRouter<any>>>;
    messageQueues: Map<string, QueuedMessage[]>;
    private reconnectTimers;
    private healthCheckIntervals;
    private debug;
    private constructor();
    static getInstance(): WebSocketManager;
    subscribeToShared(type: keyof typeof this.sharedConnections, router: MessageRouter): () => void;
    private createSharedConnection;
    private closeSharedConnection;
    createIsolated(type: keyof typeof this.isolatedConnections, id: string, config?: Partial<WebSocketEndpoint>): WebSocket;
    closeIsolated(type: keyof typeof this.isolatedConnections, id: string): void;
    private setupWebSocketHandlers;
    private scheduleReconnection;
    private cancelReconnection;
    private routeMessage;
    getConnectionStatus(connectionId: string): ConnectionState | undefined;
    private updateConnectionStatus;
    send(connectionId: string, message: any): void;
    private queueMessage;
    private processQueuedMessages;
    reconnect(connectionId: string): Promise<void>;
    closeAll(): void;
    private getWebSocket;
    private getEndpointPath;
    private getReconnectStrategy;
    private startHealthMonitoring;
    private stopHealthMonitoring;
    private emitEvent;
    private updateConnectionHealth;
}
export declare const wsManager: WebSocketManager;
export declare const $connectionHealth: import("nanostores").PreinitializedWritableAtom<ConnectionHealth[]> & object;
export declare const $activeConnections: import("nanostores").ReadableAtom<number>;
export declare const $totalConnections: import("nanostores").ReadableAtom<number>;
export {};
//# sourceMappingURL=websocket.d.ts.map