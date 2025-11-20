import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { html } from 'lit';
import { fixture, cleanup, shadowQuery, shadowQueryAll, elementUpdated, mockApi } from '../test-utils';
import '../../src/views/storage-tab';
import type { StorageTab } from '../../src/views/storage-tab';
import type { Disk } from '../../src/types/api';

vi.mock('../../src/api', () => ({
  api: mockApi(),
}));
import { api } from '../../src/api';

describe('StorageTab', () => {
  let element: StorageTab;

  const mockDisks: Disk[] = [
    {
      name: 'sda',
      path: '/dev/sda',
      size: 500 * 1024 * 1024 * 1024, // 500 GB
      model: 'Test Disk 1',
      serial: 'SERIAL1',
      type: 'ssd',
      removable: false,
      partitions: [
        {
          name: 'sda1',
          path: '/dev/sda1',
          size: 250 * 1024 * 1024 * 1024,
          type: 'part',
          filesystem: 'ext4',
          mount_point: '', // not mounted so Mount action would be valid
          used: 125 * 1024 * 1024 * 1024,
          available: 125 * 1024 * 1024 * 1024,
          use_percent: 50,
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    api.get.mockImplementation((url: string) => {
      if (url === '/storage/disks') {
        return Promise.resolve({ disks: mockDisks });
      }
      return Promise.resolve({});
    });

    api.post.mockResolvedValue({});
  });

  afterEach(() => {
    cleanup();
  });

  it('should render with title', async () => {
    element = await fixture<StorageTab>(html`<storage-tab></storage-tab>`);

    expect(element).toHaveShadowRoot();
    const title = shadowQuery<HTMLHeadingElement>(element, 'h1');
    expect(title).toBeTruthy();
    // i18n mock maps storage.disks.title -> "Storage"
    expect(title?.textContent).toContain('Storage');
  });

  it('should fetch and display disks in the flat table', async () => {
    element = await fixture<StorageTab>(html`<storage-tab></storage-tab>`);
    await elementUpdated(element);

    await vi.waitFor(() => {
      expect(element.disks.length).toBe(mockDisks.length);
    });

    const diskRows = shadowQueryAll<HTMLTableRowElement>(element, 'tbody tr.disk-row-flat');
    expect(diskRows).toHaveLength(mockDisks.length);

    const firstRowText = diskRows[0].textContent || '';
    expect(firstRowText).toContain('sda');
    expect(firstRowText).toContain('Test Disk 1');
  });

  it('should correctly display partition usage with human-readable size and percentage', async () => {
    element = await fixture<StorageTab>(html`<storage-tab></storage-tab>`);
    await elementUpdated(element);

    await vi.waitFor(() => {
      expect(element.disks.length).toBe(mockDisks.length);
    });

    const partitionRows = shadowQueryAll<HTMLTableRowElement>(element, 'tr.partition-row-flat');
    expect(partitionRows.length).toBeGreaterThan(0);

    const firstPartitionText = partitionRows[0].textContent || '';
    const expectedPercent = mockDisks[0].partitions[0].use_percent?.toFixed(1);
    if (expectedPercent) {
      expect(firstPartitionText).toContain(`${expectedPercent}%`);
    }
    expect(firstPartitionText).toMatch(/\d+(\.\d+)?\s+(Bytes|KB|MB|GB|TB)/);
  });

  it('should handle API errors gracefully', async () => {
    api.get.mockRejectedValue(new Error('Storage not available'));

    element = await fixture<StorageTab>(html`<storage-tab></storage-tab>`);
    await elementUpdated(element);

    await vi.waitFor(() => {
      const errorMessage = shadowQuery<HTMLElement>(element, '.error');
      expect(errorMessage).toBeTruthy();
      expect(errorMessage?.textContent).toContain('Storage not available');
    });
  });

  it('should show loading state while data is being fetched', async () => {
    api.get.mockImplementation(
      () =>
        new Promise(resolve =>
          setTimeout(() => resolve({ disks: [] }), 100),
        ),
    );

    element = await fixture<StorageTab>(html`<storage-tab></storage-tab>`);

    const loading = shadowQuery<HTMLElement>(element, '.loading');
    expect(loading).toBeTruthy();
  });

  it('should call mount API when mountPartition is invoked', async () => {
    element = await fixture<StorageTab>(html`<storage-tab></storage-tab>`);
    await elementUpdated(element);

    await vi.waitFor(() => {
      expect(element.disks.length).toBe(mockDisks.length);
    });

    await element.mountPartition('/dev/sda1', '/mnt/sda1');

    await vi.waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/storage/mount',
        expect.objectContaining({ device: '/dev/sda1', mount_point: '/mnt/sda1' }),
      );
    });
  });
});
