/**
 * Deterministic DHIS2 seed/teardown for the E2E suite.
 *
 * Provisions:
 *  - A tracker program (WITHOUT_REGISTRATION) with one stage + one section
 *    covering compulsory TEXT, INTEGER, PERCENTAGE, COORDINATE, and BOOLEAN
 *    (option-set-free) fields — enough to exercise the P0 validation matrix.
 *  - The assessment registration in dataStore `chat/chatAssessments`
 *    (upsert by programId, idempotent).
 *
 * All object UIDs are fixed (valid 11-char DHIS2 UIDs) so re-runs are
 * idempotent via metadata CREATE_AND_UPDATE. Teardown removes the created
 * metadata and the dataStore registration.
 */
import { Dhis2Client } from './dhis2-client';

// Fixed UIDs — stable across runs (idempotent seed).
export const IDS = {
    program: 'chatE2EPrg1',
    stage: 'chatE2EStg1',
    section: 'chatE2ESec1',
    deText: 'chatE2EDeTx',
    deInteger: 'chatE2EDeIn',
    dePercent: 'chatE2EDePc',
    deCoord: 'chatE2EDeCo',
    deBool: 'chatE2EDeBo',
} as const;

export const ASSESSMENT_CODE = 'CHAT_E2E_ASSESSMENT';

export interface SeedResult {
    programId: string;
    orgUnitId: string;
}

const buildMetadata = (orgUnitId: string) => ({
    dataElements: [
        {
            id: IDS.deText, name: 'E2E Facility name', shortName: 'E2E Fac name',
            code: 'E2E_DE_TEXT', valueType: 'TEXT', aggregationType: 'NONE', domainType: 'TRACKER',
        },
        {
            id: IDS.deInteger, name: 'E2E Case count', shortName: 'E2E Cases',
            code: 'E2E_DE_INT', valueType: 'INTEGER', aggregationType: 'SUM', domainType: 'TRACKER',
        },
        {
            id: IDS.dePercent, name: 'E2E Coverage percent', shortName: 'E2E Coverage',
            code: 'E2E_DE_PCT', valueType: 'PERCENTAGE', aggregationType: 'AVERAGE', domainType: 'TRACKER',
        },
        {
            id: IDS.deCoord, name: 'E2E Location', shortName: 'E2E Location',
            code: 'E2E_DE_COORD', valueType: 'COORDINATE', aggregationType: 'NONE', domainType: 'TRACKER',
        },
        {
            id: IDS.deBool, name: 'E2E Outbreak reported', shortName: 'E2E Outbreak',
            code: 'E2E_DE_BOOL', valueType: 'BOOLEAN', aggregationType: 'NONE', domainType: 'TRACKER',
        },
    ],
    programStageSections: [
        {
            id: IDS.section, name: 'E2E Section', sortOrder: 1,
            dataElements: [
                { id: IDS.deText }, { id: IDS.deInteger }, { id: IDS.dePercent },
                { id: IDS.deCoord }, { id: IDS.deBool },
            ],
        },
    ],
    programStages: [
        {
            id: IDS.stage, name: 'E2E Stage',
            // Set the owning program on the stage too. Without it the import leaves the
            // program's programStages empty, and the capture form has no section to render.
            program: { id: IDS.program },
            programStageSections: [{ id: IDS.section }],
            programStageDataElements: [
                { dataElement: { id: IDS.deText }, compulsory: true },
                { dataElement: { id: IDS.deInteger }, compulsory: false },
                { dataElement: { id: IDS.dePercent }, compulsory: false },
                { dataElement: { id: IDS.deCoord }, compulsory: false },
                { dataElement: { id: IDS.deBool }, compulsory: false },
            ],
        },
    ],
    programs: [
        {
            id: IDS.program, name: 'CHAT E2E Assessment', shortName: 'CHAT E2E',
            code: ASSESSMENT_CODE, programType: 'WITHOUT_REGISTRATION',
            programStages: [{ id: IDS.stage }],
            organisationUnits: [{ id: orgUnitId }],
        },
    ],
});

export async function seed(client: Dhis2Client, orgUnitIdOverride?: string): Promise<SeedResult> {
    const orgUnitId = orgUnitIdOverride ?? (await client.getFirstOrgUnitId());
    if (!orgUnitId) {
        throw new Error('[seed] No accessible organisation unit found to seed the program with.');
    }

    const metaRes = await client.post(
        '/metadata?importStrategy=CREATE_AND_UPDATE&atomicMode=NONE',
        buildMetadata(orgUnitId),
    );
    if (metaRes.status >= 400) {
        throw new Error(`[seed] metadata import failed (${metaRes.status}): ${JSON.stringify(metaRes.data)}`);
    }
    // DHIS2 answers 200 with status WARNING/ERROR when individual objects are rejected.
    // Treat anything but OK as a failure, and show the object-level errors.
    const report = (metaRes.data ?? {}) as {
        status?: string;
        response?: { status?: string; typeReports?: Array<{ klass: string; objectReports?: Array<{ uid: string; errorReports?: Array<{ message: string }> }> }> };
    };
    const importStatus = report.response?.status ?? report.status;
    if (importStatus !== 'OK') {
        const details = (report.response?.typeReports ?? []).flatMap(t =>
            (t.objectReports ?? []).map(o => `${t.klass.split('.').pop()} ${o.uid}: ${(o.errorReports ?? []).map(e => e.message).join('; ')}`),
        );
        throw new Error(`[seed] metadata import status ${importStatus}:\n  ${details.join('\n  ')}`);
    }

    await upsertAssessment(client);
    await grantCaptureDataAccess(client);

    return { programId: IDS.program, orgUnitId };
}

/**
 * Give the capture user read access to the seeded program's data.
 *
 * The program is WITHOUT_REGISTRATION with public rw------ sharing, but DHIS2 derives
 * the data-read right per user from sharing. Without a user-level grant, tracker
 * event reads return 403 (E1006 "User has no access to program") and the capture form
 * cannot advance. The grant is read-only (r-r-----), so the capture user records events
 * without changing the program. Skipped when the capture user is not configured.
 */
async function grantCaptureDataAccess(client: Dhis2Client): Promise<void> {
    const captureUsername = process.env.DHIS2_CAPTURE_USERNAME;
    if (!captureUsername) return;
    const lookup = await client.get<{ users?: Array<{ id: string }> }>(
        `/users?filter=username:eq:${encodeURIComponent(captureUsername)}&fields=id`,
    );
    const captureUid = lookup.data?.users?.[0]?.id;
    if (!captureUid) {
        throw new Error(`[seed] capture user "${captureUsername}" not found; cannot grant program data access`);
    }
    const share = await client.post(`/sharing?type=program&id=${IDS.program}`, {
        sharing: { public: 'rw------', users: { [captureUid]: { id: captureUid, access: 'r-r-----' } } },
    });
    if (share.status >= 400) {
        throw new Error(`[seed] sharing grant for ${IDS.program} failed (${share.status}): ${JSON.stringify(share.data)}`);
    }
}

async function upsertAssessment(client: Dhis2Client): Promise<void> {
    // Storage shape matches apps/chat-app/src/features/chat/ChatSettings/hooks/useAssessments.ts:
    // the value is an object `{ assessments: [...] }`, read and written with ?encrypt=true.
    const record = {
        id: IDS.program,
        name: 'CHAT E2E Assessment',
        shortName: 'CHAT E2E',
        code: ASSESSMENT_CODE,
        programId: IDS.program,
        status: 'active',
        createdAt: new Date().toISOString(),
    };

    const existing = await client.get<{ assessments?: Array<Record<string, unknown>> }>(
        '/dataStore/chat/chatAssessments?encrypt=true',
    );
    const list = Array.isArray(existing.data?.assessments) ? existing.data.assessments : [];
    const filtered = list.filter(a => a.programId !== IDS.program);
    const value = { assessments: [...filtered, record] };

    const put = await client.put('/dataStore/chat/chatAssessments?encrypt=true', value);
    if (put.status === 404) {
        await client.post('/dataStore/chat/chatAssessments?encrypt=true', value);
    }
}

export async function teardown(client: Dhis2Client): Promise<void> {
    // Remove the assessment registration entry (keep the namespace).
    const existing = await client.get<Array<Record<string, unknown>>>('/dataStore/chat/chatAssessments');
    if (Array.isArray(existing.data)) {
        const remaining = existing.data.filter(
            a => (a as { programId?: string }).programId !== IDS.program,
        );
        await client.put('/dataStore/chat/chatAssessments?encrypt=true', remaining);
    }

    // Delete created metadata (order: dependents first).
    await client.delete(`/programs/${IDS.program}`);
    await client.delete(`/programStages/${IDS.stage}`);
    await client.delete(`/programStageSections/${IDS.section}`);
    for (const de of [IDS.deText, IDS.deInteger, IDS.dePercent, IDS.deCoord, IDS.deBool]) {
        await client.delete(`/dataElements/${de}`);
    }
}
