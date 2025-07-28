import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { html } from 'lit';
import { fixture, cleanup, shadowQuery, shadowQueryAll, elementUpdated, mockApi, dispatchEvent } from '../test-utils';
import '../../src/views/network-tab';
import type { NetworkTab } from '../../src/views/network-tab';

// Mock the api module
vi.mock('../../src/api', () => {
  const { mockApi } = require('../test-utils');
  return {
    api: mockApi(),
  };
});

describe('NetworkTab', () => {
  let element: NetworkTab;
  
  const mockNetworkInterfaces = [
    {
      name: 'eth0',
      ip: '192.168.1.100',
      mac: '00:11:22:33:44:55',
      status: 'up',
      speed: 1000,
      rx_bytes: 1048576,
      tx_bytes: 524288,
    },
    {
      name: 'lo',
      ip: '127.0.0.1',
      mac: '00:00:00:00:00:00',
      status: 'up',
      speed: 0,
      rx_bytes: 1024,
      tx_bytes: 1024,
    },
  ];

  const mockConnections = [
    {
      protocol: 'tcp',
      local_address: '192.168.1.100:22',
      remote_address: '192.168.1.50:52341',
      state: 'ESTABLISHED',
      pid: 1234,
      program: 'sshd',
    },
    {
      protocol: 'tcp',
      local_address: '0.0.0.0:80',
      remote_address: '0.0.0.0:0',
      state: 'LISTEN',
      pid: 5678,
      program: 'nginx',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    const { api } = vi.mocked(require('../../src/api'));
    api.get.mockImplementation((url: string) => {
      switch (url) {
        case '/network/interfaces':
          return Promise.resolve(mockNetworkInterfaces);
        case '/network/connections':
          return Promise.resolve(mockConnections);
        default:
          return Promise.reject(new Error('Not found'));
      }
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('should render with title', async () => {
    element = await fixture<NetworkTab>(html`<network-tab></network-tab>`);
    
    expect(element).toHaveShadowRoot();
    const title = shadowQuery<HTMLHeadingElement>(element, 'h1');
    expect(title).toBeTruthy();
    expect(title?.textContent).toContain('Network');
  });

  it('should fetch and display network interfaces', async () => {
    element = await fixture<NetworkTab>(html`<network-tab></network-tab>`);
    await elementUpdated(element);

    // Wait for data to load
    await vi.waitFor(() => (element as any).interfaces?.length > 0);
    await elementUpdated(element);

    // Check if interfaces are displayed
    const interfaceCards = shadowQueryAll(element, '.interface-card');
    expect(interfaceCards).toHaveLength(mockNetworkInterfaces.length);
    
    // Check first interface details
    const firstCard = interfaceCards[0];
    expect(firstCard?.textContent).toContain('eth0');
    expect(firstCard?.textContent).toContain('192.168.1.100');
  });

  it('should display network connections', async () => {
    element = await fixture<NetworkTab>(html`<network-tab></network-tab>`);
    await elementUpdated(element);

    // Wait for data to load
    await vi.waitFor(() => (element as any).connections?.length > 0);
    await elementUpdated(element);

    // Check if connections table is displayed
    const connectionRows = shadowQueryAll(element, 'tbody tr');
    expect(connectionRows.length).toBeGreaterThan(0);
    
    // Check connection details
    const firstRow = connectionRows[0];
    expect(firstRow?.textContent).toContain('tcp');
    expect(firstRow?.textContent).toContain('ESTABLISHED');
  });

  it('should handle refresh button click', async () => {
    const { api } = vi.mocked(require('../../src/api'));
    
    element = await fixture<NetworkTab>(html`<network-tab></network-tab>`);
    await elementUpdated(element);

    // Clear previous calls
    api.get.mockClear();

    // Click refresh button
    const refreshButton = shadowQuery<HTMLButtonElement>(element, 'button[title*="Refresh"]');
    expect(refreshButton).toBeTruthy();
    refreshButton?.click();

    // Check if API was called again
    expect(api.get).toHaveBeenCalledWith('/network/interfaces');
    expect(api.get).toHaveBeenCalledWith('/network/connections');
  });

  it('should filter connections by state', async () => {
    element = await fixture<NetworkTab>(html`<network-tab></network-tab>`);
    await elementUpdated(element);

    // Wait for data to load
    await vi.waitFor(() => (element as any).connections?.length > 0);
    await elementUpdated(element);

    // Find filter select
    const filterSelect = shadowQuery<HTMLSelectElement>(element, 'select');
    if (filterSelect) {
      // Change filter to show only ESTABLISHED connections
      filterSelect.value = 'ESTABLISHED';
      dispatchEvent(filterSelect, 'change');
      await elementUpdated(element);

      // Check filtered results
      const rows = shadowQueryAll(element, 'tbody tr');
      rows.forEach(row => {
        expect(row.textContent).toContain('ESTABLISHED');
      });
    }
  });

  it('should display interface status indicators', async () => {
    element = await fixture<NetworkTab>(html`<network-tab></network-tab>`);
    await elementUpdated(element);

    // Wait for data to load
    await vi.waitFor(() => (element as any).interfaces?.length > 0);
    await elementUpdated(element);

    // Check status indicators
    const statusIndicators = shadowQueryAll(element, '.status-indicator');
    expect(statusIndicators.length).toBeGreaterThan(0);
    
    // All test interfaces are 'up'
    statusIndicators.forEach(indicator => {
      expect(indicator.classList.contains('up')).toBe(true);
    });
  });

  it('should format data sizes correctly', async () => {
    element = await fixture<NetworkTab>(html`<network-tab></network-tab>`);
    await elementUpdated(element);

    // Wait for data to load
    await vi.waitFor(() => (element as any).interfaces?.length > 0);
    await elementUpdated(element);

    // Check if bytes are formatted
    const content = element.shadowRoot?.textContent || '';
    expect(content).toMatch(/\d+(\.\d+)?\s*(B|KB|MB|GB)/);
  });

  it('should handle API errors gracefully', async () => {
    const { api } = vi.mocked(require('../../src/api'));
    api.get.mockRejectedValue(new Error('Network error'));

    element = await fixture<NetworkTab>(html`<network-tab></network-tab>`);
    await elementUpdated(element);

    // Should show error message
    const errorMessage = shadowQuery(element, '.error');
    expect(errorMessage).toBeTruthy();
    expect(errorMessage?.textContent).toContain('Failed to load');
  });

  it('should show loading state', async () => {
    // Delay API response
    const { api } = vi.mocked(require('../../src/api'));
    api.get.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve([]), 100)));

    element = await fixture<NetworkTab>(html`<network-tab></network-tab>`);
    
    // Should show loading initially
    const loading = shadowQuery(element, '.loading');
    expect(loading).toBeTruthy();
  });

  it('should support interface actions', async () => {
    const { api } = vi.mocked(require('../../src/api'));
    
    element = await fixture<NetworkTab>(html`<network-tab></network-tab>`);
    await elementUpdated(element);

    // Wait for data to load
    await vi.waitFor(() => (element as any).interfaces?.length > 0);
    await elementUpdated(element);

    // Find action button (e.g., restart interface)
    const actionButton = shadowQuery<HTMLButtonElement>(element, '.interface-card button[title*="Restart"]');
    if (actionButton) {
      actionButton.click();

      // Check if API was called
      expect(api.post).toHaveBeenCalled();
    }
  });
});
