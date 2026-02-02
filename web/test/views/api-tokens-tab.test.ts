import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { html } from 'lit';
import { fixture, cleanup, shadowQuery, shadowQueryAll, elementUpdated, mockApi } from '../test-utils';

// Mock the API module
vi.mock('../../src/api', () => ({
    api: mockApi(),
}));

import '../../src/views/api-tokens-tab';
import type { ApiTokensTab } from '../../src/views/api-tokens-tab';
import { api } from '../../src/api';

describe('ApiTokensTab', () => {
    let element: ApiTokensTab;

    const mockTokens = [
        {
            id: 'token-1',
            name: 'CI Pipeline',
            username: 'awanio',
            // Unix timestamp numbers for testing formatDate if it handles numbers?
            // Wait, my interface said strings: 'created_at: string'. 
            // But formatters.ts formatDate accepts string | Date. 
            // Backend returns string (RFC3339) usually for JSON `time.Time` unless custom marshaler. 
            // The `tokens.go` has `json:"created_at"`. Go `time.Time` marshals to ISO8601 string.
            created_at: '2023-01-01T10:00:00Z',
            expires_at: '2023-02-01T10:00:00Z',
            last_used_at: '2023-01-02T10:00:00Z',
        },
        {
            id: 'token-2',
            name: 'Backup Script',
            username: 'awanio',
            created_at: '2023-01-05T10:00:00Z',
            expires_at: undefined,
            last_used_at: undefined,
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();

        api.get.mockImplementation((url: string) => {
            if (url === '/auth/tokens') {
                return Promise.resolve(mockTokens);
            }
            return Promise.resolve({});
        });

        api.delete.mockResolvedValue({});
    });

    afterEach(() => {
        cleanup();
    });

    it('should render the title', async () => {
        element = await fixture<ApiTokensTab>(html`<api-tokens-tab></api-tokens-tab>`);
        const title = shadowQuery<HTMLHeadingElement>(element, 'h1');
        expect(title).toBeTruthy();
        expect(title?.textContent).toContain('API Tokens');
    });

    it('should fetch and display tokens in the table', async () => {
        element = await fixture<ApiTokensTab>(html`<api-tokens-tab></api-tokens-tab>`);
        await elementUpdated(element);

        // Wait for data to load
        await vi.waitFor(() => {
            const rows = shadowQueryAll<HTMLTableRowElement>(element, 'tbody tr');
            // loading, empty state, or data rows.
            // We expect 2 rows of data.
            expect(rows.length).toBe(mockTokens.length);
        });

        const rows = shadowQueryAll<HTMLTableRowElement>(element, 'tbody tr');
        expect(rows[0].textContent).toContain('CI Pipeline');
        expect(rows[1].textContent).toContain('Backup Script');
    });

    it('should show empty state when no tokens', async () => {
        api.get.mockResolvedValue([]);
        element = await fixture<ApiTokensTab>(html`<api-tokens-tab></api-tokens-tab>`);
        await elementUpdated(element);

        await vi.waitFor(() => {
            const rows = shadowQueryAll<HTMLTableRowElement>(element, 'tbody tr');
            expect(rows.length).toBe(1);
            expect(rows[0].textContent).toContain('No API tokens found');
        });
    });

    it('should open create drawer on button click', async () => {
        element = await fixture<ApiTokensTab>(html`<api-tokens-tab></api-tokens-tab>`);
        await elementUpdated(element);

        const btn = shadowQuery<HTMLButtonElement>(element, '.btn-primary');
        expect(btn?.textContent).toContain('Generate New Token');
        btn?.click();
        await elementUpdated(element);

        const drawer = shadowQuery(element, 'api-token-drawer');
        expect(drawer).toBeTruthy();
        expect(drawer?.getAttribute('show')).not.toBeNull();
    });

    it('should open revoke modal on revoke button click', async () => {
        element = await fixture<ApiTokensTab>(html`<api-tokens-tab></api-tokens-tab>`);
        await elementUpdated(element);

        await vi.waitFor(() => {
            const rows = shadowQueryAll<HTMLTableRowElement>(element, 'tbody tr');
            expect(rows.length).toBe(2);
        });

        const rows = shadowQueryAll<HTMLTableRowElement>(element, 'tbody tr');
        const revokeBtn = rows[0].querySelector('.btn-danger-ghost') as HTMLButtonElement;
        revokeBtn.click();
        await elementUpdated(element);

        const modal = shadowQuery(element, '#revokeModal');
        expect(modal).toBeTruthy();
        // Modal implementation details might depend on 'open' property
        // LitElement properties are on the instance.
        expect((modal as any).open).toBe(true);
    });
});
