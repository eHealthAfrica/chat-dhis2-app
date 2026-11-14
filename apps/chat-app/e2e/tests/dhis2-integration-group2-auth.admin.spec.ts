/**
 * DHIS2-374 — Group 2 authentication against Keycloak SSO.
 *
 * TC-INT-008: valid credentials return an access token and /api/me resolves.
 * TC-INT-009: wrong password, unknown user and empty credentials are rejected.
 *
 * Requires the Keycloak front door used by the DHIS2 deployment. Configure:
 *   KEYCLOAK_URL          e.g. https://keycloak.example.com
 *   KEYCLOAK_REALM        e.g. epims
 *   KEYCLOAK_CLIENT_ID    e.g. epims-client
 *   KEYCLOAK_ADMIN_USERNAME / KEYCLOAK_ADMIN_PASSWORD
 *
 * The DHIS2 harness authenticates directly against DHIS2, so these cases skip
 * unless the Keycloak variables are present.
 */

import { expect, test } from '@playwright/test';

const KC_URL = process.env.KEYCLOAK_URL;
const KC_REALM = process.env.KEYCLOAK_REALM;
const KC_CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID;
const DHIS2_BASE_URL = process.env.DHIS2_BASE_URL;
const USERNAME = process.env.KEYCLOAK_ADMIN_USERNAME;
const PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD;

const configured = Boolean(
    KC_URL && KC_REALM && KC_CLIENT_ID && DHIS2_BASE_URL && USERNAME && PASSWORD,
);

function tokenEndpoint(): string {
    return `${KC_URL}/realms/${KC_REALM}/protocol/openid-connect/token`;
}

test.describe('DHIS2 integration — Keycloak SSO', () => {
    test.skip(
        !configured,
        'zero-skip-exempt: DHIS2-374 — Keycloak env vars not configured for this harness',
    );

    test('TC-INT-008: valid credentials issue a token and /api/me resolves', async ({
        request,
    }) => {
        const tokenResponse = await request.post(tokenEndpoint(), {
            form: {
                grant_type: 'password',
                client_id: KC_CLIENT_ID!,
                username: USERNAME!,
                password: PASSWORD!,
            },
        });

        expect(tokenResponse.status()).toBe(200);
        const tokenBody = await tokenResponse.json();
        expect(tokenBody.access_token).toBeTruthy();
        expect(tokenBody.token_type).toBe('Bearer');

        const meResponse = await request.get(`${DHIS2_BASE_URL}/api/me`, {
            headers: { Authorization: `Bearer ${tokenBody.access_token}` },
        });
        expect(meResponse.status()).toBe(200);
        const me = await meResponse.json();
        expect(me.username || me.userCredentials?.username).toBeTruthy();
    });

    test('TC-INT-009: invalid credentials are rejected', async ({ request }) => {
        const cases = [
            {
                label: 'wrong password',
                form: { username: USERNAME!, password: 'definitely-not-the-password' },
                allowed: [400, 401],
            },
            {
                label: 'unknown user',
                form: { username: 'ghost-user-does-not-exist', password: 'irrelevant' },
                allowed: [400, 401],
            },
            {
                label: 'empty credentials',
                form: { username: '', password: '' },
                allowed: [400, 401],
            },
        ];

        for (const scenario of cases) {
            const response = await request.post(tokenEndpoint(), {
                form: {
                    grant_type: 'password',
                    client_id: KC_CLIENT_ID!,
                    ...scenario.form,
                },
            });
            expect(scenario.allowed, scenario.label).toContain(response.status());
            const body = await response.json().catch(() => ({}));
            expect(body.access_token, scenario.label).toBeFalsy();
            if (body.error) {
                expect(body.error, scenario.label).toMatch(/invalid_grant|invalid_request/);
            }
        }
    });
});
