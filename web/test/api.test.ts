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
      const mockResponse = { data: 'test' };
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.get('/test');

      expect(global.fetch).toHaveBeenCalledWith('/api/test', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(api.get('/test')).rejects.toThrow('HTTP error! status: 404');
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      await expect(api.get('/test')).rejects.toThrow('Network error');
    });
  });

  describe('api.post()', () => {
    it('should make POST request with body', async () => {
      const mockResponse = { id: 1, name: 'test' };
      const requestBody = { name: 'test' };
      
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.post('/test', requestBody);

      expect(global.fetch).toHaveBeenCalledWith('/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('api.put()', () => {
    it('should make PUT request with body', async () => {
      const mockResponse = { id: 1, name: 'updated' };
      const requestBody = { name: 'updated' };
      
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.put('/test/1', requestBody);

      expect(global.fetch).toHaveBeenCalledWith('/api/test/1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('api.delete()', () => {
    it('should make DELETE request', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await api.delete('/test/1');

      expect(global.fetch).toHaveBeenCalledWith('/api/test/1', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });
  });

  describe('api.patch()', () => {
    it('should make PATCH request with body', async () => {
      const mockResponse = { id: 1, name: 'patched' };
      const requestBody = { name: 'patched' };
      
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.patch('/test/1', requestBody);

      expect(global.fetch).toHaveBeenCalledWith('/api/test/1', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      expect(result).toEqual(mockResponse);
    });
  });
});

describe('WebSocketManager', () => {
  let wsManager: WebSocketManager;
  let mockWebSocket: any;

  beforeEach(() => {
    // Create a mock WebSocket instance
    mockWebSocket = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      close: vi.fn(),
      send: vi.fn(),
      readyState: WebSocket.OPEN,
    };

    // Mock WebSocket constructor
    (global.WebSocket as any).mockImplementation(() => mockWebSocket);
    
    wsManager = new WebSocketManager();
  });

  afterEach(() => {
    wsManager.disconnect();
  });

  it('should create WebSocket connection', () => {
    wsManager.connect();
    
    expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:8080/ws');
    expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('open', expect.any(Function));
    expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('close', expect.any(Function));
    expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('should handle incoming messages', () => {
    wsManager.connect();
    
    const subscriber = vi.fn();
    wsManager.subscribe('cpu', subscriber);

    // Simulate incoming message
    const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
      call => call[0] === 'message'
    )?.[1];
    
    const mockData = { type: 'cpu', data: { usage: 50 } };
    messageHandler({ data: JSON.stringify(mockData) });

    expect(subscriber).toHaveBeenCalledWith(mockData.data);
  });

  it('should support multiple subscribers', () => {
    wsManager.connect();
    
    const subscriber1 = vi.fn();
    const subscriber2 = vi.fn();
    
    wsManager.subscribe('memory', subscriber1);
    wsManager.subscribe('memory', subscriber2);

    // Simulate incoming message
    const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
      call => call[0] === 'message'
    )?.[1];
    
    const mockData = { type: 'memory', data: { used: 8192 } };
    messageHandler({ data: JSON.stringify(mockData) });

    expect(subscriber1).toHaveBeenCalledWith(mockData.data);
    expect(subscriber2).toHaveBeenCalledWith(mockData.data);
  });

  it('should unsubscribe correctly', () => {
    wsManager.connect();
    
    const subscriber = vi.fn();
    const unsubscribe = wsManager.subscribe('disk', subscriber);
    
    unsubscribe();

    // Simulate incoming message
    const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
      call => call[0] === 'message'
    )?.[1];
    
    const mockData = { type: 'disk', data: { free: 1000 } };
    messageHandler({ data: JSON.stringify(mockData) });

    expect(subscriber).not.toHaveBeenCalled();
  });

  it('should send messages when connected', () => {
    wsManager.connect();
    mockWebSocket.readyState = WebSocket.OPEN;
    
    const message = { type: 'subscribe', channel: 'cpu' };
    wsManager.send(message);

    expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify(message));
  });

  it('should not send messages when disconnected', () => {
    wsManager.connect();
    mockWebSocket.readyState = WebSocket.CLOSED;
    
    const message = { type: 'subscribe', channel: 'cpu' };
    wsManager.send(message);

    expect(mockWebSocket.send).not.toHaveBeenCalled();
  });

  it('should clean up on disconnect', () => {
    wsManager.connect();
    wsManager.disconnect();

    expect(mockWebSocket.close).toHaveBeenCalled();
  });

  it('should handle reconnection', () => {
    wsManager.connect();
    
    // Simulate connection close
    const closeHandler = mockWebSocket.addEventListener.mock.calls.find(
      call => call[0] === 'close'
    )?.[1];
    
    closeHandler({ code: 1000 });

    // Should attempt to reconnect after delay
    vi.advanceTimersByTime(5000);
    
    // Note: In real implementation, you might want to test reconnection logic
  });

  it('should report connection status', () => {
    wsManager.connect();
    
    mockWebSocket.readyState = WebSocket.OPEN;
    expect(wsManager.isConnected()).toBe(true);
    
    mockWebSocket.readyState = WebSocket.CLOSED;
    expect(wsManager.isConnected()).toBe(false);
  });
});
