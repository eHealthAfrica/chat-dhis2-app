/**
 * Playwright global setup.
 *
 * 1. Validate required env vars (fail fast).
 * 2. Log in both roles and persist storageState.
 * 3. Verify authorities (Admin has F_CHAT_ADD_SETTINGS, capture does not).
 * 4. Seed a tracker program + assessment registration (idempotent) unless
 *    E2E_SKIP_SEED=1, and write resolved IDs to e2e/.seed.json for specs.
 */
import { config as loadEnv } from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { ADMIN_STATE, CAPTURE_STATE } from './../playwright.config';
import { loginAndSaveState } from './support/auth';
import { Dhis2Client } from './support/dhis2-client';
import { seed, IDS, ASSESSMENT_CODE } from './support/seed';

const REQUIRED = [
    'DHIS2_BASE_URL',
    'DHIS2_ADMIN_USERNAME',
    'DHIS2_ADMIN_PASSWORD',
    'DHIS2_CAPTURE_USERNAME',
    'DHIS2_CAPTURE_PASSWORD',
] as const;

const AUTHORITY = 'F_CHAT_ADD_SETTINGS';
export const SEED_FILE = path.resolve(__dirname, '.seed.json');

export interface SeedFile {
    programId: string;
    orgUnitId: string;
    assessmentCode: string;
}

async function globalSetup(): Promise<void> {
    loadEnv({ path: path.resolve(__dirname, '.env') });

    const missing = REQUIRED.filter(key => !process.env[key]);
    if (missing.length > 0) {
        throw new Error(
            `[global-setup] Missing required env vars: ${missing.join(', ')}.\n`
            + 'Copy apps/chat-app/e2e/.env.example to apps/chat-app/e2e/.env and fill it in.',
        );
    }

    const baseUrl = process.env.DHIS2_BASE_URL!;
    const adminUser = process.env.DHIS2_ADMIN_USERNAME!;
    const adminPass = process.env.DHIS2_ADMIN_PASSWORD!;
    const captureUser = process.env.DHIS2_CAPTURE_USERNAME!;
    const capturePass = process.env.DHIS2_CAPTURE_PASSWORD!;

    // 1 + 2 — log in both roles.
    await loginAndSaveState({ baseUrl, username: adminUser, password: adminPass, storagePath: ADMIN_STATE });
    await loginAndSaveState({ baseUrl, username: captureUser, password: capturePass, storagePath: CAPTURE_STATE });

    // 3 — verify authorities.
    const adminClient = new Dhis2Client({ baseUrl, username: adminUser, password: adminPass });
    const captureClient = new Dhis2Client({ baseUrl, username: captureUser, password: capturePass });

    const adminAuthorities = await adminClient.getAuthorities();
    const captureAuthorities = await captureClient.getAuthorities();

    const adminHas = adminAuthorities.includes(AUTHORITY) || adminAuthorities.includes('ALL');
    if (!adminHas) {
        throw new Error(`[global-setup] Admin user "${adminUser}" is missing ${AUTHORITY} (or ALL).`);
    }
    if (captureAuthorities.includes(AUTHORITY) || captureAuthorities.includes('ALL')) {
        throw new Error(
            `[global-setup] Capture user "${captureUser}" must NOT have ${AUTHORITY}/ALL — `
            + 'access-control tests depend on it lacking the authority.',
        );
    }

    // 4 — seed.
    let seedResult: SeedFile;
    if (process.env.E2E_SKIP_SEED === '1') {
        const programId = process.env.E2E_PROGRAM_ID || IDS.program;
        const orgUnitId = process.env.E2E_ORG_UNIT_ID || (await adminClient.getFirstOrgUnitId()) || '';
        seedResult = { programId, orgUnitId, assessmentCode: ASSESSMENT_CODE };
    } else {
        const { programId, orgUnitId } = await seed(adminClient, process.env.E2E_ORG_UNIT_ID || undefined);
        seedResult = { programId, orgUnitId, assessmentCode: ASSESSMENT_CODE };
    }

    fs.writeFileSync(SEED_FILE, JSON.stringify(seedResult, null, 2));

    console.log(`[global-setup] Ready. program=${seedResult.programId} orgUnit=${seedResult.orgUnitId}`);
}

export default globalSetup;
