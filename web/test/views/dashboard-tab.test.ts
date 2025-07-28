import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { html } from 'lit';
import { fixture, cleanup, shadowQuery, elementUpdated, mockApi, mockWebSocketManager } from '../test-utils';
import '../../src/views/dashboard-tab';
import type { DashboardTab } from '../../src/views/dashboard-tab';
import type { SystemSummary, CPUInfo, MemoryInfo } from '../../src/types/api';

// Mock the api module
vi.mock('../../src/api', () => {
  const { mockApi, mockWebSocketManager } = require('../test-utils');
  return {
    api: mockApi(),
    WebSocketManager: vi.fn().mockImplementation(() => mockWebSocketManager()),
  };
});

// Mock Chart.js
vi.mock('chart.js/auto', () => ({
  default: vi.fn().mockImplementation(() => ({
    destroy: vi.fn(),
    update: vi.fn(),
    data: { labels: [], datasets: [] },
    options: {},
  })),
}));

describe('DashboardTab', () => {
  let element: DashboardTab;
  const mockSystemSummary: SystemSummary = {
    hostname: 'test-server',
    kernel: '5.15.0',
    os: 'Ubuntu 22.04',
    uptime: 86400,
    loadAverage: [0.5, 0.6, 0.7],
  };

  const mockCpuInfo: CPUInfo = {
    model: 'Intel Core i7',
    cores: 8,
    threads: 16,
    frequency: 3600,
    usage: 25.5,
  };

  const mockMemoryInfo: MemoryInfo = {
    total: 16384,
    used: 8192,
    free: 8192,
    available: 10240,
    cached: 2048,
    buffers: 1024,
  };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup API mocks
    const { api } = vi.mocked(require('../../src/api'));
    api.get.mockImplementation((url: string) => {
      switch (url) {
        case '/system/summary':
          return Promise.resolve(mockSystemSummary);
        case '/system/cpu':
          return Promise.resolve(mockCpuInfo);
        case '/system/memory':
          return Promise.resolve(mockMemoryInfo);
        default:
          return Promise.reject(new Error('Not found'));
      }
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('should render with title', async () => {
    element = await fixture<DashboardTab>(html`<dashboard-tab></dashboard-tab>`);
    
    expect(element).toHaveShadowRoot();
    const title = shadowQuery<HTMLHeadingElement>(element, 'h1');
    expect(title).toBeTruthy();
    expect(title?.textContent).toContain('Dashboard');
  });

  it('should fetch and display system summary', async () => {
    element = await fixture<DashboardTab>(html`<dashboard-tab></dashboard-tab>`);
    await elementUpdated(element);

    // Wait for API calls to complete
    await vi.waitFor(() => element.systemSummary !== null);
    await elementUpdated(element);

    // Check if system info is displayed
    const hostname = shadowQuery(element, '.info-value');
    expect(hostname?.textContent).toContain(mockSystemSummary.hostname);
  });

  it('should initialize charts on first update', async () => {
    const ChartMock = vi.mocked((await import('chart.js/auto')).default);
    
    element = await fixture<DashboardTab>(html`<dashboard-tab></dashboard-tab>`);
    await elementUpdated(element);

    // Check if charts were created
    expect(ChartMock).toHaveBeenCalled();
  });

  it('should handle API errors gracefully', async () => {
    // Mock API to return errors
    const { api } = vi.mocked(require('../../src/api'));
    api.get.mockRejectedValue(new Error('API Error'));

    element = await fixture<DashboardTab>(html`<dashboard-tab></dashboard-tab>`);
    await elementUpdated(element);

    // Component should still render without crashing
    expect(element).toHaveShadowRoot();
  });

  it('should setup WebSocket connection', async () => {
    const { WebSocketManager } = vi.mocked(require('../../src/api'));
    
    element = await fixture<DashboardTab>(html`<dashboard-tab></dashboard-tab>`);
    await elementUpdated(element);

    // Check if WebSocket manager was instantiated
    expect(WebSocketManager).toHaveBeenCalled();
  });

  it('should cleanup resources on disconnect', async () => {
    element = await fixture<DashboardTab>(html`<dashboard-tab></dashboard-tab>`);
    await elementUpdated(element);

    // Get mock instances
    const wsManager = (element as any).wsManager;
    const cpuChart = (element as any).cpuChart;

    // Disconnect the element
    element.disconnectedCallback();

    // Check if cleanup was called
    if (wsManager?.disconnect) {
      expect(wsManager.disconnect).toHaveBeenCalled();
    }
    if (cpuChart?.destroy) {
      expect(cpuChart.destroy).toHaveBeenCalled();
    }
  });

  it('should display CPU information', async () => {
    element = await fixture<DashboardTab>(html`<dashboard-tab></dashboard-tab>`);
    
    // Wait for data to load
    await vi.waitFor(() => element.cpuInfo !== null);
    await elementUpdated(element);

    // Check CPU info display
    const cpuCard = shadowQuery(element, '.info-card');
    expect(cpuCard).toBeTruthy();
    
    const cpuModel = shadowQuery(element, '.info-value');
    expect(cpuModel?.textContent).toContain(mockCpuInfo.model);
  });

  it('should display memory information', async () => {
    element = await fixture<DashboardTab>(html`<dashboard-tab></dashboard-tab>`);
    
    // Wait for data to load
    await vi.waitFor(() => element.memoryInfo !== null);
    await elementUpdated(element);

    // Memory info should be displayed
    const memoryValues = shadowQuery(element, '.metric-value');
    expect(memoryValues).toBeTruthy();
  });
});
