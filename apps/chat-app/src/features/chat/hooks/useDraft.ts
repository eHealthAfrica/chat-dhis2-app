import { useCallback } from 'react';
import { useDataEngine } from '@dhis2/app-runtime';

/* ─────────────────────────────────────────────────────────────
   Draft shape
───────────────────────────────────────────────────────────── */
export interface EventDraft {
    draftId:           string;           // "{programId}:{userUid}"
    programId:         string;
    eventId?:          string;           // present when editing an existing event
    orgUnit:           string;           // DHIS2 org unit id
    orgUnitName:       string;           // display label
    currentSection:    number;           // 0 = org unit gate, 1+ = sections
    values:            Record<string, string>; // dataElementId → value
    completedSections: number[];
    savedAt:           string;           // ISO
    userUid:           string;
}

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */
const lsKey = (programId: string, userUid: string) =>
    `capture_draft:${programId}:${userUid}`;

const dsKey = (userUid: string, programId: string) =>
    `draft_${userUid}_${programId}`;

/* ─────────────────────────────────────────────────────────────
   Hook
───────────────────────────────────────────────────────────── */
export const useDraft = (programId: string, userUid: string) => {
    const engine = useDataEngine();

    const readDraft = useCallback(async (): Promise<EventDraft | null> => {
        try {
            const raw = localStorage.getItem(lsKey(programId, userUid));
            if (raw) return JSON.parse(raw) as EventDraft;
        } catch { /* ignore */ }

        try {
            const result = await engine.query({
                draft: { resource: `dataStore/chat/${dsKey(userUid, programId)}` },
            }) as { draft: EventDraft };
            const draft = result.draft;
            localStorage.setItem(lsKey(programId, userUid), JSON.stringify(draft));
            return draft;
        } catch {
            return null;
        }
    }, [programId, userUid, engine]);

    const saveDraft = useCallback(async (draft: EventDraft): Promise<void> => {
        const updated = { ...draft, savedAt: new Date().toISOString() };

        try {
            localStorage.setItem(lsKey(programId, userUid), JSON.stringify(updated));
        } catch { /* ignore quota errors */ }

        const key = dsKey(userUid, programId);
        engine.mutate({
            resource: `dataStore/chat/${key}`,
            type: 'update',
            data: updated,
        }).catch(() =>
            engine.mutate({
                resource: `dataStore/chat/${key}`,
                type: 'create',
                data: updated,
            }).catch(err => console.warn('Draft datastore sync failed:', err))
        );
    }, [programId, userUid, engine]);

    const deleteDraft = useCallback(async (): Promise<void> => {
        localStorage.removeItem(lsKey(programId, userUid));
        try {
            await engine.mutate({
                resource: `dataStore/chat/${dsKey(userUid, programId)}`,
                type: 'delete',
            } as any);
        } catch { /* already gone */ }
    }, [programId, userUid, engine]);

    return { readDraft, saveDraft, deleteDraft };
};
