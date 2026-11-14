/**
 * Selectors and request matchers for the CHAT app's DHIS2 UI.
 *
 * The app talks to the DHIS2 Web API through app-runtime, which adds a version
 * segment (`/api/41/programs/...`). Matchers must accept that segment or they miss
 * the calls the app actually makes.
 *
 * The org-unit tree renders one DHIS2 UI checkbox per node (`dhis2-uicore-checkbox`
 * inside `org-unit-tree-node`). There is no `dhis2-uicore-node` element.
 */
import { expect, type APIRequestContext, type Page } from '@playwright/test';

/** Every selectable node in the capture/admin org-unit tree. */
export const ORG_UNIT_NODE = '[data-test="org-unit-tree"] [data-test="dhis2-uicore-checkbox"]';

/**
 * True when `url` is a Web API call to `resource`, with or without a version
 * segment: `/api/programs`, `/api/41/programs/chatE2EPrg1`.
 */
export function isApiCall(url: string, resource: string): boolean {
    return new RegExp(`/api/(\\d+/)?${resource}(?=[/?#]|$)`).test(url);
}

/**
 * Select the first organisation unit in the org-unit tree, on whichever step is showing.
 *
 * The visible picker reads "Nothing selected" until a unit is chosen and "Selected: N org
 * unit" after. A selection persists across page loads, and the form has its own picker,
 * so the decision is made from the visible picker's text, not from the checkbox: clicking
 * an already-selected node would deselect it. The result is confirmed by the same text.
 */
export async function selectFirstOrgUnit(page: Page): Promise<void> {
    // The URL changes before React has rendered the new screen. For a moment the outgoing
    // screen, with its own org-unit tree and "Selected" text, is still on display. Reading the
    // picker then answers for the wrong screen: the helper can take the outgoing "Selected" as
    // the state of the form, skip the click, and wait forever. So wait for the screen the URL
    // names, and for exactly one tree, before reading the picker.
    const hash = new URL(page.url()).hash;
    const captureForm = /\/chat\/data-capture\/[^/]+\/new$/.test(hash);
    const captureList = /\/chat\/data-capture\/[^/]+$/.test(hash);
    if (captureForm) {
        await expect(page.locator('[data-test="proceed-to-form-button"]'), 'new-assessment form did not render')
            .toHaveCount(1, { timeout: 15_000 });
    } else if (captureList) {
        await expect(page.locator('[data-test="new-assessment-button"]'), 'capture list did not render')
            .toHaveCount(1, { timeout: 15_000 });
    }
    await expect(page.locator('[data-test="org-unit-tree"]'), 'expected exactly one org-unit tree')
        .toHaveCount(1, { timeout: 15_000 });

    const tree = page.locator('[data-test="org-unit-tree"]');
    const nothing = page.getByText('Nothing selected', { exact: true });
    const selected = page.getByText(/^Selected: \d+ org unit$/);
    await expect(nothing.or(selected).first()).toBeVisible({ timeout: 10_000 });
    if (await nothing.count()) {
        await tree.locator('[data-test="dhis2-uicore-checkbox"]').first().click();
    }
    await expect(selected.first(), 'org unit selection did not take effect').toBeVisible({ timeout: 10_000 });
}

/**
 * After "Proceed to form", wait until the form's section navigation has loaded.
 * Until it has, the app treats the report-date step as the last step and shows
 * "Submit" in place of "Next", so the next click would never find its button.
 */
export async function waitForFormSections(page: Page): Promise<void> {
    await expect(page.locator('[data-test="section-nav-step-0"]'), 'form sections did not load').toBeVisible({
        timeout: 15_000,
    });
    await expect(page.locator('[data-test="next-button"]'), 'Next button did not appear').toBeVisible({
        timeout: 15_000,
    });
}

/**
 * Remove the capture user's saved drafts for a program, so a test starts from a clean
 * form. A leftover draft for the same org unit and report date reopens on the
 * draft-restore path, which changes the steps a later test expects.
 *
 * Uses the DHIS2 Web API as the capture user (the draft store is per user).
 */
export async function clearCaptureDrafts(request: APIRequestContext, programId: string): Promise<void> {
    // The chosen org unit is remembered per program in localStorage (captureOrgUnit:<program>),
    // so a reload restores it. Callers reset that key in the page; see resetCaptureState.

    const base = process.env.DHIS2_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:8080';
    const user = process.env.DHIS2_CAPTURE_USERNAME ?? '';
    const pass = process.env.DHIS2_CAPTURE_PASSWORD ?? '';
    const me = await request.get(`${base}/api/me?fields=id`, {
        headers: { Authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}` },
    });
    if (!me.ok()) throw new Error(`cannot read capture user for draft cleanup (HTTP ${me.status()})`);
    const { id: userUid } = (await me.json()) as { id: string };
    const key = `${userUid}_${programId}_drafts`;
    await request.delete(`${base}/api/dataStore/chat/${key}`, {
        headers: { Authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}` },
    });
}

/**
 * Forget the org unit the capture screen remembers for a program (localStorage
 * `captureOrgUnit:<program>`), so the next visit starts with nothing selected. Call on a
 * page of the app's origin, before the screen is opened.
 */
export async function resetCaptureState(page: Page, programId: string): Promise<void> {
    await page.evaluate((pid) => {
        window.localStorage.removeItem(`captureOrgUnit:${pid}`);
    }, programId);
}

/**
 * A Playwright route glob for a Web API resource, with or without the version segment the
 * app inserts (`/api/metadata` and `/api/41/metadata`). A route written against the
 * unversioned path never matches the app's calls, so the mock silently does not apply.
 *
 * `resource` may end with a glob, e.g. 'dataStore/chat/**'.
 */
export function apiRoute(resource: string): string {
    const base = resource.replace(/\/\*\*$/, '');
    return resource.endsWith('/**') ? `**/api/**/${base}/**` : `**/api/**/${base}**`;
}
