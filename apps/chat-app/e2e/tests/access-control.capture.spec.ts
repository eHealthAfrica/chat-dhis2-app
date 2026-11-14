import { test, expect } from '@playwright/test';
import { gotoHash, currentHash, stubChapRoute, waitPastChapGate } from '../support/helpers';

/**
 * Access control (P0) — data-capture user.
 *
 * F_CHAT_ADD_SETTINGS gates all Settings routes and two setup guides. A user
 * without the authority must be redirected to /chat/data-capture and must not
 * see admin links in the sidebar.
 */

const GUARDED_ROUTES = [
    '/chat/settings',
    '/chat/settings/new',
    '/chat/settings/existing',
    '/chat/settings/climate-setup',
    '/chat/guides/assessment-setup',
    '/chat/guides/admin-setup',
];

const OPEN_ROUTES = [
    '/chat/data-capture',
    '/chat/climate-import',
    '/chat/guides/data-capture',
];

test.describe('Access Control — Data Capture User (P0)', { tag: ['@integration', '@group4', '@ui', '@auth', '@P0'] }, () => {
    test.beforeEach(async ({ page }) => {
        await stubChapRoute(page);
    });

    test('redirects a capture user from /chat/settings to /chat/data-capture', async ({ page }) => {
        await gotoHash(page, '#/chat/settings');
        await expect
            .poll(() => currentHash(page), { timeout: 15_000 })
            .toContain('/chat/data-capture');
    });

    for (const route of GUARDED_ROUTES) {
        test(`redirects a capture user away from guarded route ${route}`, async ({ page }) => {
            await gotoHash(page, `#${route}`);
            await expect
                .poll(() => currentHash(page), { timeout: 15_000 })
                .toContain('/chat/data-capture');
        });
    }

    for (const route of OPEN_ROUTES) {
        test(`allows a capture user to reach open route ${route}`, async ({ page }) => {
            await gotoHash(page, `#${route}`);
            await expect.poll(() => currentHash(page)).toContain(route);
        });
    }

    test('does not render admin links in the sidebar for a capture user', async ({ page }) => {
        await gotoHash(page, '#/chat/data-capture');
        const sidenav = page.locator('[data-test="sidenav"]');
        await expect(sidenav).toBeVisible();

        await expect(sidenav.getByRole('link', { name: 'Data Capture' })).toBeVisible();
        // Admin-only entries must be absent.
        await expect(sidenav.getByRole('link', { name: 'Assessment setup guide' })).toHaveCount(0);
        await expect(sidenav.getByRole('link', { name: 'Admin setup guide' })).toHaveCount(0);
        await expect(sidenav.getByText('Settings', { exact: true })).toHaveCount(0);
    });

    test('root and /chat index redirect to data capture', async ({ page }) => {
        await page.goto('#/');
        await waitPastChapGate(page);
        await expect.poll(() => currentHash(page)).toContain('/chat/data-capture');
    });
});
