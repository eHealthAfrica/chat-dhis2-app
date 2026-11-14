import { test, expect, type Page } from '@playwright/test';
import { gotoHash, stubChapRoute, acceptNextConfirm, seedData } from '../support/helpers';
import { IDS } from '../support/seed';
import { selectFirstOrgUnit, waitForFormSections } from '../support/dhis2-ui';

/**
 * Data Capture — Draft save & continue (P0).
 *
 * Verifies the dual-store draft path: Save writes the localStorage mirror and
 * the dataStore, the draft appears in the list, Continue restores it, and
 * Delete (native confirm) removes it. dataStore contents are encrypted, so we
 * assert via the UI + the localStorage key presence per the test plan.
 */

let programId: string;
let LOCAL_KEY_RE: RegExp;

test.beforeAll(() => {
    ({ programId } = seedData());
    LOCAL_KEY_RE = new RegExp(`^capture_drafts:.*_${programId}_drafts$`);
});

async function openNewFormAtReportDate(page: Page): Promise<void> {
    await gotoHash(page, `#/chat/data-capture/${programId}`);
    await selectFirstOrgUnit(page);
    await page.locator('[data-test="new-assessment-button"]').click();
    await selectFirstOrgUnit(page);
    await page.locator('[data-test="proceed-to-form-button"]').click();
    await waitForFormSections(page);
}

test.describe('Data Capture — Draft Save & Continue (P0)', { tag: ['@integration', '@group7', '@ui', '@P0'] }, () => {
    test.beforeEach(async ({ page }) => {
        await stubChapRoute(page);
    });

    test('Save progress writes to localStorage and shows a saved timestamp', async ({ page }) => {
        await openNewFormAtReportDate(page);
        await page.locator('[data-test="report-date-input"] input').fill('2026-02-01');
        await page.locator('[data-test="next-button"]').click();
        await page.locator(`[data-test="de-field-${IDS.deText}"] input`).fill('Draft clinic');

        await page.locator('[data-test="save-progress-button"]').click();

        await expect(page.getByText(/Saved at/)).toBeVisible();

        // localStorage mirror written under the program's grouped key.
        const hasLocalKey = await page.evaluate((re) => {
            const pattern = new RegExp(re);
            return Object.keys(localStorage).some(k => pattern.test(k));
        }, LOCAL_KEY_RE.source);
        expect(hasLocalKey).toBe(true);
    });

    test('Save progress is disabled before org unit and report date are set', async ({ page }) => {
        await gotoHash(page, `#/chat/data-capture/${programId}`);
        await selectFirstOrgUnit(page);
        await page.locator('[data-test="new-assessment-button"]').click();
        await selectFirstOrgUnit(page);
        await page.locator('[data-test="proceed-to-form-button"]').click();
        await waitForFormSections(page);

        // On the report-date step with no date yet, Save is disabled.
        await expect(page.locator('[data-test="save-progress-button"]')).toBeDisabled();
    });

    test('a saved draft appears in the list and Continue restores it', async ({ page }) => {
        await openNewFormAtReportDate(page);
        await page.locator('[data-test="report-date-input"] input').fill('2026-03-03');
        await page.locator('[data-test="next-button"]').click();
        await page.locator(`[data-test="de-field-${IDS.deText}"] input`).fill('Restore me');
        await page.locator('[data-test="save-progress-button"]').click();
        await expect(page.getByText(/Saved at/)).toBeVisible();

        // Back to the list; the draft row should be present.
        await gotoHash(page, `#/chat/data-capture/${programId}`);
        await selectFirstOrgUnit(page);
        const draftRow = page.locator('[data-test="capture-draft-row"]').first();
        await expect(draftRow).toBeVisible();

        await draftRow.locator('[data-test="draft-continue-button"]').click();
        await expect(page.getByText(/Draft restored at/)).toBeVisible();
        await expect(page.locator(`[data-test="de-field-${IDS.deText}"] input`)).toHaveValue('Restore me');
    });

    test('deleting a draft via native confirm removes it from the list', async ({ page }) => {
        // Ensure a draft exists.
        await openNewFormAtReportDate(page);
        await page.locator('[data-test="report-date-input"] input').fill('2026-04-04');
        await page.locator('[data-test="next-button"]').click();
        await page.locator(`[data-test="de-field-${IDS.deText}"] input`).fill('Delete me');
        await page.locator('[data-test="save-progress-button"]').click();
        await expect(page.getByText(/Saved at/)).toBeVisible();

        await gotoHash(page, `#/chat/data-capture/${programId}`);
        await selectFirstOrgUnit(page);
        const draftRow = page.locator('[data-test="capture-draft-row"]').first();
        await expect(draftRow).toBeVisible();

        // The row shows the report date (not the entered text). Other drafts may exist, so assert
        // on the count going down by one and on this draft's report date leaving the list.
        const drafts = page.locator('[data-test="capture-draft-row"]');
        const before = await drafts.count();
        const target = draftRow.filter({ hasText: '4/4/2026' });
        expect(await target.count()).toBeGreaterThan(0);

        acceptNextConfirm(page);
        await target.locator('[data-test="draft-delete-button"]').first().click();

        await expect(drafts).toHaveCount(before - 1);
        await expect(page.locator('[data-test="capture-draft-row"]').filter({ hasText: '4/4/2026' })).toHaveCount(0);
    });
});
