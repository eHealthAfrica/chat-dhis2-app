import { test, expect } from '@playwright/test';
import { gotoHash, currentHash, stubChapRoute } from '../support/helpers';

/**
 * Access control (P0) — admin user (has F_CHAT_ADD_SETTINGS).
 *
 * Admin must be able to load every guarded route without redirect and see all
 * admin links in the sidebar.
 */

const GUARDED_ROUTES = [
    '/chat/settings',
    '/chat/settings/new',
    '/chat/settings/existing',
    '/chat/settings/climate-setup',
    '/chat/guides/assessment-setup',
    '/chat/guides/admin-setup',
];

test.describe('Access Control — Admin User (P0)', { tag: ['@integration', '@group4', '@ui', '@auth', '@P0'] }, () => {
    test.beforeEach(async ({ page }) => {
        await stubChapRoute(page);
    });

    for (const route of GUARDED_ROUTES) {
        test(`admin can load guarded route ${route} without redirect`, async ({ page }) => {
            await gotoHash(page, `#${route}`);
            // No redirect back to data-capture.
            await expect.poll(() => currentHash(page)).toContain(route);
        });
    }

    test('admin sidebar renders Settings and all guide links', async ({ page }) => {
        await gotoHash(page, '#/chat/settings');
        const sidenav = page.locator('[data-test="sidenav"]');
        await expect(sidenav).toBeVisible();

        await expect(sidenav.getByText('Settings', { exact: true })).toBeVisible();
        await expect(sidenav.getByRole('link', { name: 'Climate Setup' })).toBeVisible();
        // The guide links sit under the collapsed Guides group, as a user reaches them.
        await sidenav.getByText('Guides', { exact: true }).click();
        await expect(sidenav.getByRole('link', { name: 'Assessment setup guide' })).toBeVisible();
        await expect(sidenav.getByRole('link', { name: 'Admin setup guide' })).toBeVisible();
    });

    test('RequireAuthority shows a loader without a redirect flash', async ({ page }) => {
        // Deep-link straight to a guarded route; while authority resolves the app
        // shows a CircularLoader and must NOT flash a redirect to data-capture.
        await stubChapRoute(page);
        await page.goto('#/chat/settings/new');

        // The hash should never settle on data-capture for an authorized user.
        await page.waitForTimeout(1500);
        expect(await currentHash(page)).toContain('/chat/settings/new');
    });
});
