import { test, expect, type Page } from '@playwright/test';
import { gotoHash, stubChapRoute, seedData } from '../support/helpers';
import { IDS } from '../support/seed';
import { apiRoute, isApiCall, selectFirstOrgUnit, waitForFormSections } from '../support/dhis2-ui';

/**
 * Data Capture — Submit assessment (P0).
 *
 * Drives the flow: program card → org unit → report date → section fields →
 * Submit, asserting the tracker create payload and validation gating. The
 * seeded program (see support/seed.ts) has one compulsory TEXT field plus
 * INTEGER / PERCENTAGE / COORDINATE / BOOLEAN fields.
 */

let programId: string;

test.beforeAll(() => {
    ({ programId } = seedData());
});

/** Walk from the capture home to a fresh form at the first section. */
async function openNewForm(page: Page): Promise<void> {
    await gotoHash(page, `#/chat/data-capture/${programId}`);
    await selectFirstOrgUnit(page);
    await page.locator('[data-test="new-assessment-button"]').click();

    // OrgUnitGate: the form has its own picker, which must also be set.
    await selectFirstOrgUnit(page);
    await page.locator('[data-test="proceed-to-form-button"]').click();
    await waitForFormSections(page);

    // Report date step.
    await page.locator('[data-test="report-date-input"] input').fill('2026-01-15');
    await page.locator('[data-test="next-button"]').click();
}

test.describe('Data Capture — Form Submission (P0)', { tag: ['@integration', '@group7', '@ui', '@P0'] }, () => {
    test.beforeEach(async ({ page }) => {
        await stubChapRoute(page);
    });

    test('submits a COMPLETED event with the captured values', async ({ page }) => {
        await openNewForm(page);

        // Compulsory TEXT field.
        await page.locator(`[data-test="de-field-${IDS.deText}"] input`).fill('Central Clinic');

        // Wait for the tracker create request triggered by Submit.
        const [request] = await Promise.all([
            page.waitForRequest(
                req => isApiCall(req.url(), 'tracker') && req.method() === 'POST',
            ),
            page.locator('[data-test="submit-button"]').click(),
        ]);

        const payload = request.postDataJSON() as { events: Array<Record<string, unknown>> };
        expect(payload.events?.[0]).toMatchObject({
            program: programId,
            status: 'COMPLETED',
        });

        // Navigation returns to the program event list.
        await expect.poll(async () => page.evaluate(() => window.location.hash))
            .toContain(`/chat/data-capture/${programId}`);
    });

    test('keeps Submit disabled until the compulsory field is valid', async ({ page }) => {
        await openNewForm(page);

        const submit = page.locator('[data-test="submit-button"]');
        await expect(submit).toBeDisabled();

        await page.locator(`[data-test="de-field-${IDS.deText}"] input`).fill('Filled');
        await expect(submit).toBeEnabled();
    });

    test('blocks advancing off the report-date step when empty', async ({ page }) => {
        await gotoHash(page, `#/chat/data-capture/${programId}`);
        await selectFirstOrgUnit(page);
        await page.locator('[data-test="new-assessment-button"]').click();

        await selectFirstOrgUnit(page);
        await page.locator('[data-test="proceed-to-form-button"]').click();
        await waitForFormSections(page);

        // With no report date, Next is disabled and the step asks for one.
        await expect(page.locator('[data-test="next-button"]')).toBeDisabled();
        await expect(page.getByText(/Capture the report date/)).toBeVisible();
    });

    test('rejects a PERCENTAGE value above 100', async ({ page }) => {
        await openNewForm(page);
        await page.locator(`[data-test="de-field-${IDS.deText}"] input`).fill('Clinic');
        const pct = page.locator(`[data-test="de-field-${IDS.dePercent}"] input`);
        await pct.fill('150');
        await pct.blur();

        // The field is rejected with a range message.
        await expect(page.getByText('Must be between 0 and 100')).toBeVisible();
    });

    test('(gap) a PERCENTAGE value above 100 disables Submit', async ({ page }) => {
        test.fail(true, 'Known gap: the range message shows but Submit stays enabled (see TC-INT-023)');
        await openNewForm(page);
        await page.locator(`[data-test="de-field-${IDS.deText}"] input`).fill('Clinic');
        const pct = page.locator(`[data-test="de-field-${IDS.dePercent}"] input`);
        await pct.fill('150');
        await pct.blur();
        await expect(page.locator('[data-test="submit-button"]')).toBeDisabled();
    });

    test('surfaces a NoticeBox when the tracker submit fails', async ({ page }) => {
    // Force the tracker create to fail.
        await page.route(apiRoute('tracker'), (route) => {
            if (route.request().method() === 'POST') {
                return route.fulfill({
                    status: 409,
                    contentType: 'application/json',
                    body: JSON.stringify({ status: 'ERROR', message: 'Import conflict' }),
                });
            }
            return route.fallback();
        });

        await openNewForm(page);
        await page.locator(`[data-test="de-field-${IDS.deText}"] input`).fill('Clinic');
        await page.locator('[data-test="submit-button"]').click();

        // The notice title is "Submission failed" and the message carries the API reason.
        await expect(page.locator('[data-test="dhis2-uicore-noticebox-content-title"]')).toHaveText('Submission failed');
        await expect(page.locator('[data-test="dhis2-uicore-noticebox-content-message"]')).toHaveText('Import conflict');
        // Still on the form (no navigation away).
        await expect(page.locator('[data-test="submit-button"]')).toBeVisible();
    });
});
