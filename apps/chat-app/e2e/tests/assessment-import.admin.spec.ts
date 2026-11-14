import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
import { gotoHash, stubChapRoute, currentHash } from '../support/helpers';
import { apiRoute, isApiCall, selectFirstOrgUnit } from '../support/dhis2-ui';

/**
 * Assessment import wizard (P0) — admin.
 *
 * Upload JSON → review → assign org unit → import. External writes (metadata,
 * programs lookup, dataStore) are intercepted so the flow is deterministic and
 * does not pollute the instance.
 */

const FIXTURE = path.resolve(__dirname, '../fixtures/assessment-metadata.json');
const IMPORTED_CODE = 'E2E_IMPORTED_ASSESSMENT';
const IMPORTED_PROGRAM_ID = 'e2eImpPrg01';

/** Intercept the DHIS2 metadata write + programs lookup + dataStore write. */
async function stubImportApis(
    page: Page,
    opts: { metadataStatus?: number; programsEmpty?: boolean; dataStoreFail?: boolean } = {},
): Promise<void> {
    const { metadataStatus = 200, programsEmpty = false, dataStoreFail = false } = opts;

    await page.route(apiRoute('metadata'), route =>
        route.fulfill({
            status: metadataStatus,
            contentType: 'application/json',
            body: JSON.stringify(
                metadataStatus >= 400
                    ? { status: 'ERROR', message: 'Import failed' }
                    : { status: 'OK', stats: { created: 3, updated: 0, ignored: 0, deleted: 0, total: 3 } },
            ),
        }),
    );

    await page.route(apiRoute('programs'), route =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                programs: programsEmpty
                    ? []
                    : [{ id: IMPORTED_PROGRAM_ID, name: 'E2E Imported Assessment', code: IMPORTED_CODE }],
            }),
        }),
    );

    await page.route(apiRoute('dataStore/chat/**'), (route) => {
        if (['POST', 'PUT'].includes(route.request().method())) {
            return route.fulfill({
                status: dataStoreFail ? 500 : 201,
                contentType: 'application/json',
                body: JSON.stringify(dataStoreFail ? { status: 'ERROR' } : { httpStatusCode: 201 }),
            });
        }
        return route.fallback();
    });
}

async function uploadFixtureAndReview(page: Page): Promise<void> {
    await gotoHash(page, '#/chat/settings/new');
    await page.setInputFiles('input[type="file"][accept*="json"]', FIXTURE);
    // Step 2 review renders the program card.
    await expect(page.getByText('E2E Imported Assessment').first()).toBeVisible();
}

test.describe('Assessment Import — Admin (P0)', { tag: ['@integration', '@group2', '@ui', '@auth', '@P0'] }, () => {
    test.beforeEach(async ({ page }) => {
        await stubChapRoute(page);
    });

    test('happy path: upload → review → assign org unit → import → back to settings', async ({ page }) => {
        await stubImportApis(page);
        await uploadFixtureAndReview(page);

        // Step 2 → 3 (assign org units)
        await page.locator('[data-test="wizard-next-button"]').click();

        // Select the first org unit. The wizard does not advance without one.

        await selectFirstOrgUnit(page);

        // Step 3 → 4
        await page.locator('[data-test="wizard-next-button"]').click();

        const [metaReq] = await Promise.all([
            page.waitForRequest(r => isApiCall(r.url(), 'metadata') && r.method() === 'POST'),
            page.locator('[data-test="wizard-import-button"]').click(),
        ]);
        expect(metaReq.url()).toContain('importStrategy=CREATE_AND_UPDATE');

        await expect.poll(() => currentHash(page), { timeout: 20_000 }).toContain('/chat/settings');
    });

    test('rejects a non-JSON upload', async ({ page }) => {
        await gotoHash(page, '#/chat/settings/new');
        await page.setInputFiles('input[type="file"][accept*="json"]', {
            name: 'notes.txt',
            mimeType: 'text/plain',
            buffer: Buffer.from('not json'),
        });
        // The message appears in the notice box and again in the drop-zone hint, so assert the notice.
        await expect(page.locator('[data-test="dhis2-uicore-noticebox-content-message"]')).toHaveText(
            'Only .json files are supported.',
        );
    });

    test('shows a parse error for malformed JSON', async ({ page }) => {
        await gotoHash(page, '#/chat/settings/new');
        await page.setInputFiles('input[type="file"][accept*="json"]', {
            name: 'broken.json',
            mimeType: 'application/json',
            buffer: Buffer.from('{ this is not valid json '),
        });
        await expect(page.getByText(/Failed to parse JSON/)).toBeVisible();
    });

    test('blocks import when no org unit is assigned', async ({ page }) => {
        await stubImportApis(page);
        await uploadFixtureAndReview(page);
        await page.locator('[data-test="wizard-next-button"]').click(); // → step 3

        // Advance with zero org units selected.
        await page.locator('[data-test="wizard-next-button"]').click();
        await expect(
            page.getByText('Select at least one organisation unit before importing.'),
        ).toBeVisible();
    });

    test('surfaces "Import failed" when the metadata API errors', async ({ page }) => {
        await stubImportApis(page, { metadataStatus: 409 });
        await uploadFixtureAndReview(page);
        await page.locator('[data-test="wizard-next-button"]').click();
        await selectFirstOrgUnit(page);
        await page.locator('[data-test="wizard-next-button"]').click();
        await page.locator('[data-test="wizard-import-button"]').click();

        // The title and the message both read "Import failed"; assert the notice's title.
        await expect(page.locator('[data-test="dhis2-uicore-noticebox-content-title"]')).toHaveText('Import failed');
    });

    test('Cancel returns to settings without a metadata write', async ({ page }) => {
        let metadataCalled = false;
        await page.route(apiRoute('metadata'), (route) => {
            metadataCalled = true;
            return route.fulfill({ status: 200, contentType: 'application/json', body: '{"status":"OK"}' });
        });

        // Cancel is offered once a file is loaded (the upload step has no wizard buttons).
        await uploadFixtureAndReview(page);
        await page.locator('[data-test="wizard-cancel-button"]').click();

        await expect.poll(() => currentHash(page)).toContain('/chat/settings');
        expect(metadataCalled).toBe(false);
    });
});
