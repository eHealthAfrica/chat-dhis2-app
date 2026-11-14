/**
 * Shared spec helpers for hash routing, the CHAP mount gate, native confirms,
 * and reading seeded IDs.
 */
import type { Page } from '@playwright/test';
import fs from 'node:fs';
import { SEED_FILE, type SeedFile } from '../global-setup';

/** Read the IDs resolved/seeded by global setup. */
export function seedData(): SeedFile {
    if (!fs.existsSync(SEED_FILE)) {
        throw new Error('[helpers] .seed.json not found — did global setup run?');
    }
    return JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8')) as SeedFile;
}

/**
 * Intercept the CHAP route so the SetChapUrl mount gate always resolves fast,
 * regardless of whether the instance has the `chat` route configured.
 * Call before the first navigation.
 */
export async function stubChapRoute(page: Page): Promise<void> {
    await page.route('**/api/routes/chat/run/**', route =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ status: 'OK' }),
        }),
    );
}

/**
 * Navigate to a hash route within the app and wait for the app shell to be
 * past the CHAP mount gate (the full-viewport loader cleared).
 */
export async function gotoHash(page: Page, hash: string): Promise<void> {
    const normalized = hash.startsWith('#') ? hash : `#${hash}`;
    // baseURL points at the app index; append the hash fragment.
    await page.goto(normalized);
    await waitPastChapGate(page);
}

/**
 * Wait until the SetChapUrl loader clears and the app content is mounted.
 * Uses the app's main layout container (`#main-layout`) or the sidenav as the
 * "app is up" signal, whichever appears first.
 */
export async function waitPastChapGate(page: Page): Promise<void> {
    await page
        .locator('#main-layout, [data-test="sidenav"], #error-page')
        .first()
        .waitFor({ state: 'visible', timeout: 30_000 });
}

/** Return the current hash fragment (without the leading '#'). */
export async function currentHash(page: Page): Promise<string> {
    return page.evaluate(() => window.location.hash.replace(/^#/, ''));
}

/** Auto-accept the next native window.confirm dialog. */
export function acceptNextConfirm(page: Page): void {
    page.once('dialog', dialog => dialog.accept());
}

/** Auto-dismiss the next native window.confirm dialog. */
export function dismissNextConfirm(page: Page): void {
    page.once('dialog', dialog => dialog.dismiss());
}
