/**
 * Minimal DHIS2 Web API client for E2E seed/teardown.
 *
 * Uses Basic auth (admin credentials) and JSON. Kept dependency-free (native
 * fetch, Node 20+) so it can run in Playwright's global setup without pulling
 * in the app runtime.
 */
export interface Dhis2ClientOptions {
    baseUrl: string;
    username: string;
    password: string;
}

export class Dhis2Client {
    private readonly api: string;
    private readonly authHeader: string;

    constructor({ baseUrl, username, password }: Dhis2ClientOptions) {
        this.api = `${baseUrl.replace(/\/$/, '')}/api`;
        this.authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
    }

    private async request<T = unknown>(
        method: string,
        path: string,
        body?: unknown,
    ): Promise<{ status: number; data: T }> {
        const res = await fetch(`${this.api}${path}`, {
            method,
            headers: {
                'Authorization': this.authHeader,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: body === undefined ? undefined : JSON.stringify(body),
        });

        const text = await res.text();
        let data: unknown = null;
        if (text) {
            try {
                data = JSON.parse(text);
            } catch {
                data = text;
            }
        }

        return { status: res.status, data: data as T };
    }

    get<T = unknown>(path: string) {
        return this.request<T>('GET', path);
    }

    post<T = unknown>(path: string, body: unknown) {
        return this.request<T>('POST', path, body);
    }

    put<T = unknown>(path: string, body: unknown) {
        return this.request<T>('PUT', path, body);
    }

    delete<T = unknown>(path: string) {
        return this.request<T>('DELETE', path);
    }

    /** Fetch the authorities of the currently authenticated user. */
    async getAuthorities(): Promise<string[]> {
        const { data } = await this.get<{ authorities?: string[] }>('/me?fields=authorities');
        return data.authorities ?? [];
    }

    /** Return the first accessible org unit id (level-agnostic), for seeding. */
    async getFirstOrgUnitId(): Promise<string | null> {
        const { data } = await this.get<{ organisationUnits?: Array<{ id: string }> }>(
            '/organisationUnits?fields=id&paging=true&pageSize=1&order=level:asc',
        );
        return data.organisationUnits?.[0]?.id ?? null;
    }
}
