// Setup file for vitest tests
import { vi } from 'vitest';

// Mock window.customElements if not available
if (!window.customElements) {
  window.customElements = {
    define: vi.fn(),
    get: vi.fn(),
    whenDefined: vi.fn(),
    upgrade: vi.fn(),
  } as any;
}

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock fetch
global.fetch = vi.fn();

// Mock WebSocket
global.WebSocket = vi.fn().mockImplementation(() => ({
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  close: vi.fn(),
  send: vi.fn(),
  readyState: 1,
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
}));

// Add custom matchers
expect.extend({
  toHaveShadowRoot(received: Element) {
    const pass = received.shadowRoot !== null;
    return {
      pass,
      message: () => pass
        ? `expected element not to have shadow root`
        : `expected element to have shadow root`,
    };
  },
});

// Declare custom matchers
declare global {
  namespace Vi {
    interface Assertion {
      toHaveShadowRoot(): void;
    }
  }
}
