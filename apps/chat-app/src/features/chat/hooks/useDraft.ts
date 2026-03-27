import { useCallback } from 'react';
import { useDataEngine } from '@dhis2/app-runtime';

export interface EventDraft {
    draftId: string;
    programId: string;
    eventId?: string;
    orgUnit: string;
    orgUnitName: string;
    orgUnitPath?: string;
    currentSection: number;
    reportDate?: string;
    eventDate?: string;
    incidentDate?: string;
    values: Record<string, string>;
    completedSections: number[];
    savedAt: string;
    userUid: string;
}

interface DraftReadOptions {
    draftId?: string;
    orgUnit?: string;
    reportDate?: string;
}

const normalizeIdentityPart = (value: string) =>
    value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '_');

const programDraftStoreKey = (userUid: string, programId: string) =>
    `${userUid}_${programId}_drafts`;

const programDraftsLocalKey = (userUid: string, programId: string) =>
    `capture_drafts:${programDraftStoreKey(userUid, programId)}`;

const legacyLocalProgramKey = (programId: string, userUid: string) =>
    `capture_draft:${programId}:${userUid}`;

const legacyRemoteProgramKey = (userUid: string, programId: string) =>
    `draft_${userUid}_${programId}`;

const legacyPerDraftPrefix = (userUid: string, programId: string) =>
    `draft_${normalizeIdentityPart(userUid)}_${normalizeIdentityPart(programId)}_`;

const buildDraftId = (orgUnit: string, reportDate: string) =>
    `${orgUnit}_${reportDate}`;

const resolveReportDate = (draft: EventDraft) => draft.reportDate ?? draft.eventDate ?? '';

const matchesIdentity = (
    draft: EventDraft,
    options: DraftReadOptions,
) => (
    (options.draftId && draft.draftId === options.draftId)
    || (
        !options.draftId
        && !!options.orgUnit
        && !!options.reportDate
        && draft.orgUnit === options.orgUnit
        && resolveReportDate(draft) === options.reportDate
    )
);

const upsertDraft = (drafts: EventDraft[], nextDraft: EventDraft) => {
    const matchIndex = drafts.findIndex(draft =>
        draft.orgUnit === nextDraft.orgUnit
        && resolveReportDate(draft) === resolveReportDate(nextDraft),
    );

    if (matchIndex === -1) return [...drafts, nextDraft];

    return drafts.map((draft, index) => (
        index === matchIndex ? nextDraft : draft
    ));
};

const sortDrafts = (drafts: EventDraft[]) =>
    [...drafts].sort((left, right) => right.savedAt.localeCompare(left.savedAt));

const safeParseDraftArray = (raw: string | null): EventDraft[] => {
    if (!raw) return [];

    try {
        const parsed = JSON.parse(raw) as EventDraft[] | EventDraft | null;
        if (Array.isArray(parsed)) return parsed;
        return parsed ? [parsed] : [];
    } catch {
        return [];
    }
};

const dedupeDrafts = (drafts: EventDraft[]) => {
    const merged = new Map<string, EventDraft>();

    drafts.forEach((draft) => {
        const reportDate = resolveReportDate(draft);
        if (!draft.orgUnit || !reportDate) return;

        const key = `${draft.orgUnit}::${reportDate}`;
        const existing = merged.get(key);

        if (!existing || existing.savedAt.localeCompare(draft.savedAt) < 0) {
            merged.set(key, {
                ...draft,
                reportDate,
                draftId: draft.draftId || buildDraftId(draft.orgUnit, reportDate),
            });
        }
    });

    return sortDrafts(Array.from(merged.values()));
};

export const useDraft = (programId: string, userUid: string) => {
    const engine = useDataEngine();

    const readLocalProgramDrafts = useCallback((): EventDraft[] => (
        safeParseDraftArray(localStorage.getItem(programDraftsLocalKey(userUid, programId)))
    ), [programId, userUid]);

    const writeLocalProgramDrafts = useCallback((drafts: EventDraft[]) => {
        try {
            localStorage.setItem(
                programDraftsLocalKey(userUid, programId),
                JSON.stringify(drafts),
            );
        } catch {
            // Ignore quota errors for local persistence.
        }
    }, [programId, userUid]);

    const removeLocalProgramDrafts = useCallback(() => {
        localStorage.removeItem(programDraftsLocalKey(userUid, programId));
    }, [programId, userUid]);

    const readRemoteProgramDrafts = useCallback(async (): Promise<EventDraft[]> => {
        try {
            const result = await engine.query({
                drafts: {
                    resource: `dataStore/chat/${programDraftStoreKey(userUid, programId)}?encrypt=true`,
                },
            }) as { drafts: EventDraft[] | { drafts?: EventDraft[] } };

            if (Array.isArray(result.drafts)) return result.drafts;
            return result.drafts?.drafts ?? [];
        } catch {
            return [];
        }
    }, [engine, programId, userUid]);

    const writeRemoteProgramDrafts = useCallback(async (drafts: EventDraft[]) => {
        const key = programDraftStoreKey(userUid, programId);
        alert()

        try {
            await engine.mutate({
                resource: 'dataStore/chat',
                id: key+'',
                type: 'update',
                data: drafts,
            });
        } catch {
            await engine.mutate({
                resource: 'dataStore/chat',
                id: key+'',
                type: 'create',
                data: drafts,
            });
        }
    }, [engine, programId, userUid]);

    const deleteRemoteProgramDrafts = useCallback(async () => {
        try {
            await engine.mutate({
                resource: `dataStore/chat/${programDraftStoreKey(userUid, programId)}`,
                type: 'delete',
            } as never);
        } catch {
            // Ignore missing remote grouped drafts.
        }
    }, [engine, programId, userUid]);

    const migrateLegacyDrafts = useCallback(async (): Promise<EventDraft[]> => {
        const migratedDrafts: EventDraft[] = [];
        const remoteKeysToDelete: string[] = [];

        const localLegacyKeys = [
            legacyLocalProgramKey(programId, userUid),
            ...Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
                .filter((key): key is string => Boolean(key))
                .filter(key => key.startsWith(`capture_draft:${legacyPerDraftPrefix(userUid, programId)}`)),
        ];

        localLegacyKeys.forEach((key) => {
            migratedDrafts.push(...safeParseDraftArray(localStorage.getItem(key)));
            localStorage.removeItem(key);
        });

        try {
            const remoteKeyResult = await engine.query({
                draftKeys: { resource: 'dataStore/chat' },
            }) as { draftKeys: string[] };

            const legacyKeys = (remoteKeyResult.draftKeys ?? []).filter(key =>
                key === legacyRemoteProgramKey(userUid, programId)
                || key.startsWith(legacyPerDraftPrefix(userUid, programId)),
            );

            const remoteDrafts = await Promise.all(
                legacyKeys.map(async (key) => {
                    try {
                        const result = await engine.query({
                            draft: { resource: `dataStore/chat/${key}` },
                        }) as { draft: EventDraft | EventDraft[] };

                        remoteKeysToDelete.push(key);

                        return Array.isArray(result.draft)
                            ? result.draft
                            : [result.draft];
                    } catch {
                        return [];
                    }
                }),
            );

            remoteDrafts.flat().forEach((draft) => migratedDrafts.push(draft));
        } catch {
            // Ignore remote legacy migration failures.
        }

        const deduped = dedupeDrafts(migratedDrafts)
            .filter(draft => draft.programId === programId && draft.userUid === userUid);

        if (deduped.length > 0) {
            writeLocalProgramDrafts(deduped);
            await writeRemoteProgramDrafts(deduped);
        }

        await Promise.all(
            remoteKeysToDelete.map(async (key) => {
                try {
                    await engine.mutate({
                        resource: `dataStore/chat/${key}`,
                        type: 'delete',
                    } as never);
                } catch {
                    // Ignore legacy cleanup failures.
                }
            }),
        );

        return deduped;
    }, [engine, programId, userUid, writeLocalProgramDrafts, writeRemoteProgramDrafts]);

    const readProgramDrafts = useCallback(async (): Promise<EventDraft[]> => {
        const localDrafts = dedupeDrafts(readLocalProgramDrafts());
        if (localDrafts.length > 0) return localDrafts;

        const remoteDrafts = dedupeDrafts(await readRemoteProgramDrafts());
        if (remoteDrafts.length > 0) {
            writeLocalProgramDrafts(remoteDrafts);
            return remoteDrafts;
        }

        return migrateLegacyDrafts();
    }, [migrateLegacyDrafts, readLocalProgramDrafts, readRemoteProgramDrafts, writeLocalProgramDrafts]);

    const readDraft = useCallback(async (options?: DraftReadOptions): Promise<EventDraft | null> => {
        const drafts = await readProgramDrafts();
        if (drafts.length === 0) return null;
        if (!options) return drafts[0] ?? null;

        return drafts.find(draft => matchesIdentity(draft, options)) ?? null;
    }, [readProgramDrafts]);

    const listDrafts = useCallback(async (): Promise<EventDraft[]> => (
        readProgramDrafts()
    ), [readProgramDrafts]);

    const saveDraft = useCallback(async (draft: EventDraft): Promise<EventDraft> => {
        const reportDate = resolveReportDate(draft);

        if (!draft.orgUnit || !reportDate) {
            throw new Error('Draft identity is incomplete');
        }

        const nextDraft: EventDraft = {
            ...draft,
            reportDate,
            draftId: buildDraftId(draft.orgUnit, reportDate),
            programId,
            userUid,
            savedAt: new Date().toISOString(),
        };

        const drafts = await readProgramDrafts();
        const updatedDrafts = dedupeDrafts(upsertDraft(drafts, nextDraft));

        writeLocalProgramDrafts(updatedDrafts);
        await writeRemoteProgramDrafts(updatedDrafts);

        return nextDraft;
    }, [programId, readProgramDrafts, userUid, writeLocalProgramDrafts, writeRemoteProgramDrafts]);

    const deleteDraft = useCallback(async (options?: DraftReadOptions): Promise<void> => {
        if (!options) {
            removeLocalProgramDrafts();
            await deleteRemoteProgramDrafts();
            return;
        }

        const drafts = await readProgramDrafts();
        const remainingDrafts = drafts.filter(draft => !matchesIdentity(draft, options));

        if (remainingDrafts.length === 0) {
            removeLocalProgramDrafts();
            await deleteRemoteProgramDrafts();
            return;
        }

        writeLocalProgramDrafts(remainingDrafts);
        await writeRemoteProgramDrafts(remainingDrafts);
    }, [deleteRemoteProgramDrafts, readProgramDrafts, removeLocalProgramDrafts, writeLocalProgramDrafts, writeRemoteProgramDrafts]);

    return { readDraft, listDrafts, saveDraft, deleteDraft };
};
