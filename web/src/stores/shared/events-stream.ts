import { wsManager } from './websocket';
import { WebSocketEventType } from '../types/websocket';
import type { MessageRouter, WebSocketEvent, WebSocketMessage } from '../types/websocket';

export type EventsChannel = 'vm-events' | 'container-events' | 'k8s-events';

export interface SubscribeToEventsChannelOptions<TPayload = any> {
  channel: EventsChannel;
  /** Unique identifier for routing/unsubscribing. */
  routeId: string;
  /** Called for each server message with type: "event". */
  onEvent: (payload: TPayload, message: WebSocketMessage<TPayload>) => void;
  /** Called when the underlying /ws/events connection changes state. */
  onConnectionChange?: (connected: boolean) => void;
}

const EVENTS_CONNECTION_ID = 'shared:events';

export function subscribeToEventsChannel<TPayload = any>(
  options: SubscribeToEventsChannelOptions<TPayload>,
): () => void {
  const sendSubscribe = () => {
    wsManager.send(EVENTS_CONNECTION_ID, {
      type: 'subscribe',
      payload: { channel: options.channel },
    });
  };

  const router: MessageRouter<TPayload> = {
    routeId: options.routeId,
    messageType: 'event',
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
    window.removeEventListener('websocket:event', handleWsEvent as EventListener);
    unsubscribeFromWs();
  };
}
