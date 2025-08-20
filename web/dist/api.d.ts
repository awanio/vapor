import type { WSMessage } from './types/api';
export declare class ApiError extends Error {
    code?: string | undefined;
    details?: string | undefined;
    status?: number | undefined;
    constructor(message: string, code?: string | undefined, details?: string | undefined, status?: number | undefined);
}
export declare class Api {
    private static request;
    static get<T = any>(endpoint: string, params?: Record<string, any>): Promise<T>;
    static post<T = any>(endpoint: string, body?: any): Promise<T>;
    static put<T = any>(endpoint: string, body?: any): Promise<T>;
    static delete<T = any>(endpoint: string, params?: Record<string, any>): Promise<T>;
    static patch<T = any>(endpoint: string, body?: any): Promise<T>;
    static postResource<T = any>(endpoint: string, content: string, contentType: 'application/json' | 'application/yaml'): Promise<T>;
}
export declare class WebSocketManager {
    private path;
    private ws;
    private url;
    private reconnectInterval;
    private maxReconnectAttempts;
    private reconnectAttempts;
    private messageHandlers;
    private reconnectTimer;
    private authenticated;
    private intentionalDisconnect;
    constructor(path: string);
    connect(): Promise<void>;
    private authenticate;
    private scheduleReconnect;
    private handleMessage;
    send(message: WSMessage): void;
    on(type: string, handler: (message: WSMessage) => void): void;
    off(type: string, handler: (message: WSMessage) => void): void;
    disconnect(): void;
    isConnected(): boolean;
}
export declare const api: typeof Api;
//# sourceMappingURL=api.d.ts.map