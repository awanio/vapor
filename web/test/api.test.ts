import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api, WebSocketManager } from '../src/api';

// Mock global fetch
global.fetch = vi.fn();

describe('API Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset fetch mock
    (global.fetch as any).mockReset();
  });

  describe('api.get()', () => {
    it('should make GET request with correct headers', async () => {
      const payload = { data: 'test' };
      const apiResponse = { status: 'success', data: payload };
      (global.fetch as any).mockResolvedValue({
        ok: true,
        headers: {
          get: () => 'application/json',
        },
        json: async () => apiResponse,
      });

      const result = await api.get('/test');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/test'),
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );
      expect(result).toEqual(payload);
    });

    it('should handle API errors', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 404,
        headers: {
          get: () => 'application/json',
        },
        json: async () => ({
          status: 'error',
          error: { message: 'Not Found' },
        }),
      });

      await expect(api.get('/test')).rejects.toThrow('Not Found');
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      await expect(api.get('/test')).rejects.toThrow('Network error');
    });
  });

  describe('api.post()', () => {
    it('should make POST request with body', async () => {
      const payload = { id: 1, name: 'test' };
      const requestBody = { name: 'test' };
      const apiResponse = { status: 'success', data: payload };
      
      (global.fetch as any).mockResolvedValue({
        ok: true,
        headers: {
          get: () => 'application/json',
        },
        json: async () => apiResponse,
      });

      const result = await api.post('/test', requestBody);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/test'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }),
      );
      expect(result).toEqual(payload);
    });
  });

  describe('api.put()', () => {
    it('should make PUT request with body', async () => {
      const payload = { id: 1, name: 'updated' };
      const requestBody = { name: 'updated' };
      const apiResponse = { status: 'success', data: payload };
      
      (global.fetch as any).mockResolvedValue({
        ok: true,
        headers: {
          get: () => 'application/json',
        },
        json: async () => apiResponse,
      });

      const result = await api.put('/test/1', requestBody);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/test/1'),
        expect.objectContaining({
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }),
      );
      expect(result).toEqual(payload);
    });
  });

  describe('api.delete()', () => {
    it('should make DELETE request', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        headers: {
          get: () => 'application/json',
        },
        json: async () => ({ status: 'success', data: {} }),
      });

      await api.delete('/test/1');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/test/1'),
        expect.objectContaining({
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );
    });
  });

  describe('api.patch()', () => {
    it('should make PATCH request with body', async () => {
      const payload = { id: 1, name: 'patched' };
      const requestBody = { name: 'patched' };
      const apiResponse = { status: 'success', data: payload };
      
      (global.fetch as any).mockResolvedValue({
        ok: true,
        headers: {
          get: () => 'application/json',
        },
        json: async () => apiResponse,
      });

      const result = await api.patch('/test/1', requestBody);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/test/1'),
        expect.objectContaining({
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }),
      );
      expect(result).toEqual(payload);
    });
  });
});

describe('WebSocketManager', () => {
  let wsManager: WebSocketManager;
  let mockWebSocket: any;

  beforeEach(() => {
    // Use a mocked WebSocket instance without actually connecting to a server
    mockWebSocket = {
      send: vi.fn(),
      close: vi.fn(),
      readyState: WebSocket.OPEN,
    } as any;

    wsManager = new WebSocketManager('/ws');
    // Inject the mock socket directly so we don't depend on real WebSocket behaviour here
    (wsManager as any).ws = mockWebSocket;
  });

  afterEach(() => {
    wsManager.disconnect();
  });

  it('should send messages when connected', () => {
    const message = { type: 'subscribe', channel: 'cpu' } as any;
    wsManager.send(message);

    expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify(message));
  });

  it('should not send messages when disconnected', () => {
    const closedSocket = { send: vi.fn(), close: vi.fn(), readyState: 0 } as any;
    (wsManager as any).ws = closedSocket;

    const message = { type: 'subscribe', channel: 'cpu' } as any;
    wsManager.send(message);

    expect(closedSocket.send).not.toHaveBeenCalled();
  });

  it('should dispatch messages to subscribers', () => {
    const subscriber = vi.fn();
    wsManager.on('cpu', (message: any) => {
      subscriber(message.payload || message.data);
    });

    (wsManager as any).handleMessage({
      type: 'cpu',
      payload: { usage: 50 },
    });

    expect(subscriber).toHaveBeenCalledWith({ usage: 50 });
  });

  it('should support multiple subscribers', () => {
    const subscriber1 = vi.fn();
    const subscriber2 = vi.fn();

    wsManager.on('memory', (message: any) => {
      subscriber1(message.payload || message.data);
    });
    wsManager.on('memory', (message: any) => {
      subscriber2(message.payload || message.data);
    });

    (wsManager as any).handleMessage({
      type: 'memory',
      payload: { used: 8192 },
    });

    expect(subscriber1).toHaveBeenCalledWith({ used: 8192 });
    expect(subscriber2).toHaveBeenCalledWith({ used: 8192 });
  });

  it('should unsubscribe correctly', () => {
    const subscriber = vi.fn();
    const handler = (message: any) => {
      subscriber(message.payload || message.data);
    };

    wsManager.on('disk', handler);
    wsManager.off('disk', handler);

    (wsManager as any).handleMessage({
      type: 'disk',
      payload: { free: 1000 },
    });

    expect(subscriber).not.toHaveBeenCalled();
  });

  it('should clean up on disconnect', () => {
    wsManager.disconnect();

    expect(mockWebSocket.close).toHaveBeenCalledWith(1000, 'Normal closure');
  });

  it('should report connection status based on readyState', () => {
    expect(wsManager.isConnected()).toBe(true);

    const closedSocket = { send: vi.fn(), close: vi.fn(), readyState: 0 } as any;
    (wsManager as any).ws = closedSocket;
    expect(wsManager.isConnected()).toBe(false);
  });
});

