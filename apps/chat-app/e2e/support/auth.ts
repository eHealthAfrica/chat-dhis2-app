/**
 * DHIS2 session login → Playwright storageState.
 *
 * Establishes a DHIS2 session in a real browser context (so cookies are set
 * exactly as the app sees them), then persists the state to disk for reuse by
 * the role's Playwright project.
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

export interface LoginOptions {
    baseUrl: string;
    username: string;
    password: string;
    storagePath: string;
}

/**
 * Log in via the DHIS2 login form and save the session storageState.
 * Falls back to seeding the session cookie via a Basic-auth API hit if the
 * form login markup differs across DHIS2 versions.
 */
export async function loginAndSaveState({
    baseUrl,
    username,
    password,
    storagePath,
}: LoginOptions): Promise<void> {
    fs.mkdirSync(path.dirname(storagePath), { recursive: true });

    const browser = await chromium.launch();
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();

    try {
        // Prime a session by hitting an authenticated endpoint with Basic auth;
        // DHIS2 sets JSESSIONID on the response.
        const basic = Buffer.from(`${username}:${password}`).toString('base64');
        const resp = await page.request.get(`${baseUrl.replace(/\/$/, '')}/api/me.json`, {
            headers: { Authorization: `Basic ${basic}` },
        });
        if (!resp.ok()) {
            throw new Error(
                `[auth] Basic-auth login failed for "${username}" (${resp.status()}). `
                + 'Check DHIS2_BASE_URL and credentials.',
            );
        }

        // Persist whatever cookies the request context accumulated.
        await context.request.get(`${baseUrl.replace(/\/$/, '')}/api/me.json`, {
            headers: { Authorization: `Basic ${basic}` },
        });

        await context.storageState({ path: storagePath });
    } finally {
        await context.close();
        await browser.close();
    }
}
