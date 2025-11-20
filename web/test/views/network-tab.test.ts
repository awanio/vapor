import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { html } from 'lit';
import { fixture, cleanup, shadowQuery, shadowQueryAll, elementUpdated, mockApi, dispatchEvent } from '../test-utils';

vi.mock('../../src/api', () => ({
  api: mockApi(),
}));

import '../../src/views/network-tab';
import type { NetworkTab } from '../../src/views/network-tab';
import type { NetworkInterface } from '../../src/types/api';
import { cleanupNetworkStore } from '../../src/stores/network';
import { api } from '../../src/api';

describe('NetworkTab', () => {
  let element: NetworkTab;

  const mockInterfaces: NetworkInterface[] = [
    {
      name: 'eth0',
      mac: '00:11:22:33:44:55',
      mtu: 1500,
      state: 'up',
      type: 'ethernet',
      addresses: ['192.168.1.10/24'],
      statistics: {
        rx_bytes: 1048576,
        tx_bytes: 524288,
        rx_packets: 1000,
        tx_packets: 2000,
        rx_errors: 0,
        tx_errors: 0,
      },
    },
    {
      name: 'eth1',
      mac: '00:11:22:33:44:66',
      mtu: 1500,
      state: 'down',
      type: 'ethernet',
      addresses: ['10.0.0.5/24'],
      statistics: {
        rx_bytes: 2048,
        tx_bytes: 4096,
        rx_packets: 10,
        tx_packets: 20,
        rx_errors: 0,
        tx_errors: 1,
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    api.get.mockImplementation((url: string) => {
      if (url === '/network/interfaces' || url.startsWith('/network/interfaces?type=')) {
        return Promise.resolve({ interfaces: mockInterfaces });
      }

      if (url === '/network/bridges') {
        return Promise.resolve({ bridges: [] });
      }

      if (url === '/network/bonds') {
        return Promise.resolve({ bonds: [] });
      }

      if (url === '/network/vlans') {
        return Promise.resolve({ vlans: [] });
      }

      if (url === '/network/interface-types') {
        return Promise.resolve({ types: ['ethernet'] });
      }

      return Promise.resolve({});
    });

    api.put.mockResolvedValue({});
    api.post.mockResolvedValue({});
    api.delete.mockResolvedValue({});
  });

  afterEach(() => {
    cleanup();
    cleanupNetworkStore();
  });

  it('should render the interfaces tab with a title', async () => {
    element = await fixture<NetworkTab>(html`<network-tab></network-tab>`);

    expect(element).toHaveShadowRoot();
    const title = shadowQuery<HTMLHeadingElement>(element, 'h1');
    expect(title).toBeTruthy();
    // i18n mock returns 'Network Interfaces' for this key
    expect(title?.textContent).toContain('Network Interfaces');
  });

  it('should fetch and display network interfaces in the table', async () => {
    element = await fixture<NetworkTab>(html`<network-tab></network-tab>`);
    await elementUpdated(element);

    await vi.waitFor(() => {
      const rows = shadowQueryAll<HTMLTableRowElement>(element, '.network-table tbody tr');
      expect(rows.length).toBe(mockInterfaces.length);
    });

    const rows = shadowQueryAll<HTMLTableRowElement>(element, '.network-table tbody tr');
    const firstRow = rows[0];
    const text = firstRow.textContent || '';
    expect(text).toContain('eth0');
    expect(text).toContain('192.168.1.10');
  });

  it('should filter interfaces by search query', async () => {
    element = await fixture<NetworkTab>(html`<network-tab></network-tab>`);
    await elementUpdated(element);

    await vi.waitFor(() => {
      const rows = shadowQueryAll<HTMLTableRowElement>(element, '.network-table tbody tr');
      expect(rows.length).toBe(mockInterfaces.length);
    });

    const searchInput = shadowQuery<HTMLInputElement>(element, '.search-input');
    expect(searchInput).toBeTruthy();

    if (searchInput) {
      searchInput.value = 'eth0';
      dispatchEvent(searchInput, 'input');
      await elementUpdated(element);

      const rows = shadowQueryAll<HTMLTableRowElement>(element, '.network-table tbody tr');
      expect(rows).toHaveLength(1);
      expect(rows[0].textContent).toContain('eth0');
    }
  });

  it('should show status indicators with correct state classes', async () => {
    element = await fixture<NetworkTab>(html`<network-tab></network-tab>`);
    await elementUpdated(element);

    await vi.waitFor(() => {
      const rows = shadowQueryAll<HTMLTableRowElement>(element, '.network-table tbody tr');
      expect(rows.length).toBe(mockInterfaces.length);
    });

    const statusIcons = shadowQueryAll<HTMLElement>(element, '.status-icon');
    expect(statusIcons.length).toBeGreaterThanOrEqual(2);

    const [first, second] = statusIcons;
    expect(first.classList.contains('up')).toBe(true);
    expect(second.classList.contains('down')).toBe(true);
  });
});
