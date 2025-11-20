import { describe, it, expect, beforeEach, vi } from 'vitest';
import virtualizationAPI from '../src/services/virtualization-api';
import { VirtualizationDisabledError } from '../src/utils/api-errors';
import { $virtualizationEnabled, $virtualizationDisabledMessage } from '../src/stores/virtualization';

// global.fetch is mocked in test/setup.ts, but we override per-test

describe('virtualizationAPI error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockReset();
    localStorage.clear();
    localStorage.setItem('jwt_token', 'test-token');
    $virtualizationEnabled.set(null);
    $virtualizationDisabledMessage.set(null);
  });

  it('throws VirtualizationDisabledError when backend returns VIRTUALIZATION_DISABLED', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({
        status: 'error',
        error: {
          code: 'VIRTUALIZATION_DISABLED',
          message: 'Virtualization disabled',
          details: 'Libvirt is not installed or not running on this host.',
        },
      }),
    });

    await expect(virtualizationAPI.listVMs()).rejects.toBeInstanceOf(VirtualizationDisabledError);
    expect($virtualizationEnabled.get()).toBe(false);
    expect($virtualizationDisabledMessage.get()).toContain('Libvirt is not installed or not running');
  });
});
