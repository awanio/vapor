import { describe, it, expect } from 'vitest';
import { isVirtualizationDisabled, VirtualizationDisabledError } from '../../src/utils/api-errors';

describe('api-errors virtualization helpers', () => {
  it('detects VIRTUALIZATION_DISABLED responses', () => {
    const body = {
      status: 'error',
      error: {
        code: 'VIRTUALIZATION_DISABLED',
        message: 'Virtualization disabled',
        details: 'Libvirt is not installed or not running on this host.',
      },
    };
    expect(isVirtualizationDisabled(503, body)).toBe(true);
  });

  it('returns false for non-503 status', () => {
    const body = { status: 'error', error: { code: 'VIRTUALIZATION_DISABLED' } };
    expect(isVirtualizationDisabled(500, body)).toBe(false);
  });

  it('returns false for different error code', () => {
    const body = { status: 'error', error: { code: 'SOME_OTHER_ERROR' } };
    expect(isVirtualizationDisabled(503, body)).toBe(false);
  });

  it('exposes VirtualizationDisabledError with message and details', () => {
    const err = new VirtualizationDisabledError('Virtualization is disabled', 'Libvirt not running', 503);
    expect(err.name).toBe('VirtualizationDisabledError');
    expect(err.message).toBe('Virtualization is disabled');
    expect(err.details).toBe('Libvirt not running');
    expect(err.status).toBe(503);
  });
});
