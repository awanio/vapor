import { wsManager } from './websocket';
import { WebSocketEventType } from '../types/websocket';
import type { MessageRouter, WebSocketEvent, WebSocketMessage } from '../types/websocket';

export type EventsChannel = string;

export interface SubscribeToEventsChannelOptions<TPayload = any> {
  channel: EventsChannel;
  /** Unique identifier for routing/unsubscribing. */
  routeId: string;
  /** Called for each server message with type: "event". */
  onEvent: (payload: TPayload, message: WebSocketMessage<TPayload>) => void;
  /** Called when the underlying /ws/events connection changes state. */
  onConnectionChange?: (connected: boolean) => void;
  /** Extra fields to include in the subscribe payload (e.g. filters). */
  subscribePayload?: Record<string, any>;
  /** Override which WS message type(s) to route; defaults to 'event'. */
  messageType?: string | string[];
}

const EVENTS_CONNECTION_ID = 'shared:events';

export function subscribeToEventsChannel<TPayload = any>(
  options: SubscribeToEventsChannelOptions<TPayload>,
): () => void {
  const sendSubscribe = () => {
    wsManager.send(EVENTS_CONNECTION_ID, {
      type: 'subscribe',
      payload: { channel: options.channel, ...(options.subscribePayload || {}) },
    });
  };

  const router: MessageRouter<TPayload> = {
    routeId: options.routeId,
    messageType: options.messageType ?? 'event',
    handler: (message: WebSocketMessage<TPayload>) => {
      options.onEvent(message.payload, message);
    },
  };

  const unsubscribeFromWs = wsManager.subscribeToShared('events', router);

  // Subscribe immediately (queued if not yet connected). The shared WS manager sends auth
  // first on open, then flushes the message queue.
  sendSubscribe();

  // Emit initial connection state (best-effort)
  const initial = wsManager.getConnectionStatus(EVENTS_CONNECTION_ID);
  options.onConnectionChange?.(initial?.status === 'connected');

  const handleWsEvent = (evt: Event) => {
    const detail = (evt as CustomEvent<WebSocketEvent>).detail;
    if (!detail || detail.connectionId !== EVENTS_CONNECTION_ID) return;

    if (detail.type === WebSocketEventType.CONNECTED) {
      options.onConnectionChange?.(true);
      // Re-subscribe on every (re)connect.
      sendSubscribe();
    } else if (
      detail.type === WebSocketEventType.DISCONNECTED ||
      detail.type === WebSocketEventType.ERROR ||
      detail.type === WebSocketEventType.RECONNECTING
    ) {
      options.onConnectionChange?.(false);
    }
  };

  window.addEventListener('websocket:event', handleWsEvent as EventListener);

  return () => {
    // Send unsubscribe message to server to stop receiving events for this channel
    try {
      wsManager.send(EVENTS_CONNECTION_ID, {
        type: 'unsubscribe',
        payload: { channel: options.channel }
      });
    } catch (e) {
      // Ignore errors if connection is closed or manager is not available
      console.warn('Failed to send unsubscribe:', e);
    }

    window.removeEventListener('websocket:event', handleWsEvent as EventListener);
    unsubscribeFromWs();
  };
}
