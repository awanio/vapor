import { describe, it, expect, beforeEach } from 'vitest';
import { html } from 'lit';
import { fixture, cleanup, shadowQuery, waitFor } from '../test-utils';
import { $virtualizationEnabled, $virtualizationDisabledMessage } from '../../src/stores/virtualization';
import '../../src/views/virtualization/virtualization-vms-enhanced';

// global.fetch is mocked in setup; for this test ensure virtualization endpoints always return VIRTUALIZATION_DISABLED

describe('virtualization-vms-enhanced (virtualization disabled)', () => {
  beforeEach(() => {
    cleanup();
    $virtualizationEnabled.set(null);
    $virtualizationDisabledMessage.set(null);
    (global.fetch as any).mockReset();
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
  });

  it('renders virtualization disabled banner and hides VM actions', async () => {
    const el = await fixture<HTMLElement>(html`<virtualization-vms-enhanced></virtualization-vms-enhanced>`);

    await waitFor(() => !!shadowQuery<HTMLElement>(el, '.virtualization-disabled-banner'));
    const banner = shadowQuery<HTMLElement>(el, '.virtualization-disabled-banner');
    expect(banner).not.toBeNull();
    expect(banner!.textContent).toContain('Virtualization is disabled on this host');

    // Primary create button should not be present when virtualization is disabled
    const createButton = shadowQuery<HTMLButtonElement>(el, '.btn-create');
    expect(createButton).toBeNull();
  });
});
