// Setup file for vitest tests
import { vi } from 'vitest';
import { i18n } from '../src/i18n';

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

// Mock matchMedia for components using window.matchMedia (e.g., theme)
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as any;
}


// Stub i18n to avoid real network requests and ensure onChange exists
(i18n as any).init = vi.fn().mockResolvedValue(undefined);
(i18n as any).loadTranslations = vi.fn().mockResolvedValue(undefined);
const __testTranslations: Record<string, string> = {
  'app.logout': 'Logout',
  'app.language': 'Language',
  'app.theme': 'Theme',
  'network.interfaces': 'Network Interfaces',
  'network.bridges': 'Network Bridges',
  'network.bonds': 'Network Bonds',
  'network.vlans': 'Network VLANs',
  'network.searchInterfaces': 'Search interfaces',
  'network.rxBytes': 'RX bytes',
  'network.txBytes': 'TX bytes',
  'network.bringDown': 'Bring down',
  'network.bringUp': 'Bring up',
  'network.configure': 'Configure',
  'network.title': 'Network',
  'storage.disks.title': 'Storage',
};

(i18n as any).t = vi.fn((key: string) => __testTranslations[key] ?? key);
(i18n as any).onChange = (listener: () => void) => {
  return () => {};}
;

// Mock canvas getContext for Chart.js and other canvas-using components
if (window.HTMLCanvasElement) {
  // Always override to avoid jsdom's not-implemented error and provide minimal 2D context
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    createLinearGradient: vi.fn(() => ({} as any)),
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    save: vi.fn(),
    restore: vi.fn(),
  } as any));
}


// Mock Chart.js auto bundle to avoid real canvas/chart behavior in tests
vi.mock('chart.js/auto', () => {
  class FakeChart {
    data = { labels: [], datasets: [{ data: [] }] };
    destroy = vi.fn();
    update = vi.fn();
  }
  return {
    __esModule: true,
    default: FakeChart,
  };
});
