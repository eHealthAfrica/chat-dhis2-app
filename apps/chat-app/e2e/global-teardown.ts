/**
 * Playwright global teardown — removes suite-created seed data unless
 * E2E_SKIP_TEARDOWN=1 or seeding was skipped.
 */
import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import { Dhis2Client } from './support/dhis2-client';
import { teardown } from './support/seed';

async function globalTeardown(): Promise<void> {
    loadEnv({ path: path.resolve(__dirname, '.env') });

    if (process.env.E2E_SKIP_TEARDOWN === '1' || process.env.E2E_SKIP_SEED === '1') {
        console.log('[global-teardown] Skipped (E2E_SKIP_TEARDOWN/E2E_SKIP_SEED set).');
        return;
    }

    const baseUrl = process.env.DHIS2_BASE_URL;
    const username = process.env.DHIS2_ADMIN_USERNAME;
    const password = process.env.DHIS2_ADMIN_PASSWORD;
    if (!baseUrl || !username || !password) return;

    try {
        await teardown(new Dhis2Client({ baseUrl, username, password }));

        console.log('[global-teardown] Removed suite-created seed data.');
    } catch (error) {
        console.warn('[global-teardown] Cleanup encountered an error:', error);
    }
}

export default globalTeardown;
