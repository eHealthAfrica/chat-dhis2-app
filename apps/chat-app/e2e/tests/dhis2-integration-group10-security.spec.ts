/**
 * DHIS2-374 — Group 10: DHIS2 API security negatives.
 *
 * Test cases covered:
 *   TC-INT-061  Expired Keycloak token rejected by DHIS2 API — Negative  @integration
 *
 * Reference: Confluence page 554074113 (Group 10, Automated=Yes).
 *
 * Runs under the 'api' Playwright project (request-only, no browser role).
 * Requires DHIS2_BASE_URL and DHIS2_ADMIN_USERNAME/PASSWORD (used only by the control),
 * provided by e2e/.env or e2e/.env.local.
 *
 * Scope and limits of TC-INT-061 (read before relying on it):
 *   - The local DHIS2 (2.41.11) has no Keycloak realm, so the "expired token" is built here:
 *     a JWT-shaped string whose payload exp is two years in the past, with a bogus signature.
 *     This exercises DHIS2's rejection of an expired or invalid bearer token. It is NOT a
 *     real Keycloak-issued token. Because the signature is bogus, this test cannot tell
 *     "expired" apart from "bad signature".
 *   - Not covered: the CHAT app's auto-refresh or redirect on 401 (the second half of the
 *     expected result). That needs the app running against Keycloak. Nothing here asserts it.
 *
 * Control (a 401 must not be a broken endpoint):
 *   The same three calls with the admin credentials from the harness env (Basic auth) must
 *   return 2xx before the expired-token calls run.
 *   - POST /api/tracker: empty payload ({}) with importMode=VALIDATE. This creates nothing.
 *     The expired-token call sends the same query and body; only the Authorization differs.
 *   - GET /api/dataStore/chat/chatAssessments: a read. The key must already exist on the
 *     instance; this test does not create it.
 *
 * Observed on DHIS2 2.41.11 when this was written: a bearer token DHIS2 rejects gets 401,
 * while the same request with no Authorization header gets a 302 to the login page. So the
 * 401 is caused by the bearer header.
 */

import { test, expect, type APIResponse } from '@playwright/test';

// No DHIS2 session cookie. A cookie would authenticate the "expired" calls and hide the result.
test.use({ storageState: { cookies: [], origins: [] } });

const DATASTORE_KEY = 'chatAssessments';
const TWO_YEARS_SECONDS = 2 * 365 * 24 * 60 * 60;

function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        // Fail rather than skip: the zero-skip policy applies to this test.
        throw new Error(`TC-INT-061: ${name} is not set. Run via apps/chat-app/e2e/infra/run-local-e2e.sh.`);
    }
    return value;
}

function base64UrlJson(value: Record<string, unknown>): string {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
}

/**
 * JWT-shaped bearer token with exp two years in the past and a bogus signature.
 * Not issued by Keycloak; see the scope note in the header.
 */
function buildExpiredToken(nowMs: number = Date.now()): string {
    const exp = Math.floor(nowMs / 1000) - TWO_YEARS_SECONDS;
    const header = base64UrlJson({ alg: 'RS256', typ: 'JWT', kid: 'tc-int-061' });
    const payload = base64UrlJson({
        sub: 'tc-int-061-expired-user',
        iss: 'https://keycloak.invalid/realms/tc-int-061',
        iat: exp - 300,
        exp,
    });
    return `${header}.${payload}.bogus-signature`;
}

test.describe('DHIS2-374 Group 10 — API security negatives', { tag: ['@integration', '@group10', '@security'] }, () => {
    test(
        'TC-INT-061: Expired Keycloak token rejected by DHIS2 API — Negative @integration',
        async ({ request }) => {
            const baseUrl = requireEnv('DHIS2_BASE_URL').replace(/\/$/, '');
            const api = `${baseUrl}/api`;
            const adminBasic = `Basic ${Buffer.from(
                `${requireEnv('DHIS2_ADMIN_USERNAME')}:${requireEnv('DHIS2_ADMIN_PASSWORD')}`,
            ).toString('base64')}`;
            const expiredBearer = `Bearer ${buildExpiredToken()}`;

            const headers = (authorization: string) => ({
                Authorization: authorization,
                Accept: 'application/json',
            });
            const trackerUrl = `${api}/tracker?importMode=VALIDATE`;
            const trackerBody = {};

            // Each call is identical except for the Authorization header.
            // maxRedirects: 0 keeps a fallback to the login page visible as 302, not a 200.
            const calls: Array<{ label: string; send: (authorization: string) => Promise<APIResponse> }> = [
                {
                    label: 'GET /api/me',
                    send: authorization => request.get(`${api}/me`, { headers: headers(authorization), maxRedirects: 0 }),
                },
                {
                    label: 'POST /api/tracker (empty payload, importMode=VALIDATE)',
                    send: authorization => request.post(trackerUrl, {
                        headers: headers(authorization),
                        data: trackerBody,
                        maxRedirects: 0,
                    }),
                },
                {
                    label: `GET /api/dataStore/chat/${DATASTORE_KEY}`,
                    send: authorization => request.get(`${api}/dataStore/chat/${DATASTORE_KEY}`, {
                        headers: headers(authorization),
                        maxRedirects: 0,
                    }),
                },
            ];

            // ── Control: valid DHIS2 credentials must get 2xx from every call ─────────────
            for (const call of calls) {
                const res = await call.send(adminBasic);
                expect(res.ok(), `control ${call.label} with valid credentials must return 2xx, got ${res.status()}`)
                    .toBe(true);
            }
            console.log('[TC-INT-061] Control: all three calls return 2xx with valid credentials.');

            // ── Steps: the same calls with the expired token must return 401 ──────────────
            for (const call of calls) {
                const res = await call.send(expiredBearer);
                expect.soft(res.status(), `TC-INT-061: ${call.label} with expired token must return 401`).toBe(401);
                console.log(`[TC-INT-061] ${call.label} with expired token: HTTP ${res.status()}`);
            }
        },
    );
});
