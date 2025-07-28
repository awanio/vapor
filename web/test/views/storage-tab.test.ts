import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { html } from 'lit';
import { fixture, cleanup, shadowQuery, shadowQueryAll, elementUpdated, mockApi } from '../test-utils';
import '../../src/views/storage-tab';
import type { StorageTab } from '../../src/views/storage-tab';

// Mock the api module
vi.mock('../../src/api', () => {
  const { mockApi } = require('../test-utils');
  return {
    api: mockApi(),
  };
});

describe('StorageTab', () => {
  let element: StorageTab;

  const mockStorageDevices = [
    {
      name: 'sda1',
      mountpoint: '/',
      fstype: 'ext4',
      size: 50000000000,
      used: 25000000000,
    },
    {
      name: 'sdb1',
      mountpoint: '/home',
      fstype: 'ext4',
      size: 100000000000,
      used: 70000000000,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    const { api } = vi.mocked(require('../../src/api'));
    api.get.mockImplementation((url: string) => {
      switch (url) {
        case '/storage/devices':
          return Promise.resolve(mockStorageDevices);
        default:
          return Promise.reject(new Error('Not found'));
      }
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('should render with title', async () => {
    element = await fixture<StorageTab>(html`<storage-tab></storage-tab>`);
    
    expect(element).toHaveShadowRoot();
    const title = shadowQuery<HTMLHeadingElement>(element, 'h1');
    expect(title).toBeTruthy();
    expect(title?.textContent).toContain('Storage');
  });

  it('should fetch and display storage devices', async () => {
    element = await fixture<StorageTab>(html`<storage-tab></storage-tab>`);
    await elementUpdated(element);

    // Wait for data to load
    await vi.waitFor(() => (element as any).devices?.length > 0);
    await elementUpdated(element);

    // Check if devices are displayed
    const deviceCards = shadowQueryAll(element, '.device-card');
    expect(deviceCards).toHaveLength(mockStorageDevices.length);
    
    // Check first device details
    const firstCard = deviceCards[0];
    expect(firstCard?.textContent).toContain('sda1');
    expect(firstCard?.textContent).toContain('/');
  });

  it('should correctly calculate and display usage percentages', async () => {
    element = await fixture<StorageTab>(html`<storage-tab></storage-tab>`);
    await elementUpdated(element);

    // Wait for data to load
    await vi.waitFor(() => (element as any).devices?.length > 0);
    await elementUpdated(element);

    // Check usage percentage
    const firstDevice = shadowQuery(element, '.device-card');
    expect(firstDevice).toBeTruthy();
    const usagePercentage = (mockStorageDevices[0].used / mockStorageDevices[0].size) * 100;
    expect(firstDevice?.textContent).toContain(`${Math.round(usagePercentage)}%`);
  });

  it('should handle refresh button click', async () => {
    const { api } = vi.mocked(require('../../src/api'));
    
    element = await fixture<StorageTab>(html`<storage-tab></storage-tab>`);
    await elementUpdated(element);

    // Clear previous calls
    api.get.mockClear();

    // Click refresh button
    const refreshButton = shadowQuery<HTMLButtonElement>(element, 'button[title*="Refresh"]');
    expect(refreshButton).toBeTruthy();
    refreshButton?.click();

    // Check if API was called again
    expect(api.get).toHaveBeenCalledWith('/storage/devices');
  });

  it('should handle API errors gracefully', async () => {
    const { api } = vi.mocked(require('../../src/api'));
    api.get.mockRejectedValue(new Error('Storage not available'));

    element = await fixture<StorageTab>(html`<storage-tab></storage-tab>`);
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

    element = await fixture<StorageTab>(html`<storage-tab></storage-tab>`);
    
    // Should show loading initially
    const loading = shadowQuery(element, '.loading');
    expect(loading).toBeTruthy();
  });
});
