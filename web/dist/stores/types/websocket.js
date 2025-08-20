export var WebSocketEventType;
(function (WebSocketEventType) {
    WebSocketEventType["CONNECTED"] = "ws:connected";
    WebSocketEventType["DISCONNECTED"] = "ws:disconnected";
    WebSocketEventType["MESSAGE"] = "ws:message";
    WebSocketEventType["ERROR"] = "ws:error";
    WebSocketEventType["RECONNECTING"] = "ws:reconnecting";
    WebSocketEventType["RECONNECTED"] = "ws:reconnected";
    WebSocketEventType["QUEUE_FULL"] = "ws:queue_full";
})(WebSocketEventType || (WebSocketEventType = {}));
export const DEFAULT_RECONNECT_STRATEGIES = {
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
//# sourceMappingURL=websocket.js.map