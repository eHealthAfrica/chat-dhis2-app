import { defineConfig, devices } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
import path from 'node:path';

/**
 * Playwright E2E configuration for the CHAT DHIS2 app.
 *
 * Requires a live DHIS2 2.41+ instance. All configuration comes from env vars
 * (see e2e/.env.example). Auth is DHIS2 session cookies persisted as Playwright
 * `storageState` by the global setup, one file per role. Each role runs as its
 * own project so the `useHasAuthority` cache (staleTime: Infinity) never leaks
 * across roles.
 */
loadEnv({ path: path.resolve(__dirname, 'e2e/.env') });

const BASE_URL = process.env.DHIS2_BASE_URL ?? 'http://localhost:8080';

// The app is served from a DHIS2 app path; tests navigate to the app root and
// then use hash routes (#/chat/...). Override with APP_PATH if the app is
// installed under a non-default path.
const APP_PATH = process.env.APP_PATH ?? '/api/apps/chat/index.html';

export const AUTH_DIR = path.resolve(__dirname, 'e2e/.auth');
export const ADMIN_STATE = path.join(AUTH_DIR, 'admin.json');
export const CAPTURE_STATE = path.join(AUTH_DIR, 'capture.json');
export const APP_URL = `${BASE_URL}${APP_PATH}`;

export default defineConfig({
    testDir: './e2e/tests',
    outputDir: './e2e/.results',
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: 1,
    reporter: process.env.CI
        ? [['github'], ['html', { outputFolder: 'e2e/.report', open: 'never' }]]
        : [['list'], ['html', { outputFolder: 'e2e/.report', open: 'never' }]],
    timeout: 60_000,
    expect: { timeout: 15_000 },

    globalSetup: require.resolve('./e2e/global-setup.ts'),
    globalTeardown: require.resolve('./e2e/global-teardown.ts'),

    use: {
        baseURL: APP_URL,
        actionTimeout: 15_000,
        navigationTimeout: 30_000,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        ignoreHTTPSErrors: true,
    },

    projects: [
        {
            name: 'admin',
            use: { ...devices['Desktop Chrome'], storageState: ADMIN_STATE },
            testMatch: /.*\.(admin|shared)\.spec\.ts/,
        },
        {
            name: 'capture',
            use: { ...devices['Desktop Chrome'], storageState: CAPTURE_STATE },
            testMatch: /.*\.(capture|shared)\.spec\.ts/,
        },
        {
            // Request-only API specs with no browser role (e.g. the Group 10 security spec).
            // No storageState: a DHIS2 session cookie would authenticate the calls under test.
            name: 'api',
            use: {},
            testMatch: /.*dhis2-integration-group10-security\.spec\.ts/,
        },
    ],
});
