import { useDataEngine } from '@dhis2/app-runtime';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAlert } from '@dhis2/app-service-alerts';
import i18n from '@dhis2/d2-i18n';
import { EventDraft } from './useDraft';

const buildEventPayload = (draft: EventDraft, programStageId: string) => ({
    program: draft.programId,
    programStage: programStageId,
    orgUnit: draft.orgUnit,
    status: 'COMPLETED',
    occurredAt: draft.reportDate || draft.eventDate || new Date().toISOString().split('T')[0],
    dataValues: Object.entries(draft.values).map(([dataElement, value]) => ({
        dataElement,
        value,
    })),
});

interface SubmitPayload {
    draft: EventDraft;
    programStageId: string;
    onDraftDeleted: () => Promise<void>;
}

export const useSubmitEvent = () => {
    const engine = useDataEngine();
    const queryClient = useQueryClient();

    const { show: showSuccess } = useAlert(
        i18n.t('Assessment submitted successfully'),
        { success: true },
    );
    const { show: showError } = useAlert(
        i18n.t('Failed to submit assessment'),
        { critical: true },
    );

    return useMutation<string, Error, SubmitPayload>({
        mutationFn: async ({ draft, programStageId, onDraftDeleted }) => {
            const payload = buildEventPayload(draft, programStageId);
            let eventId: string;
            if (draft.eventId) {
                await engine.mutate({
                    resource: 'tracker?async=false',
                    id: draft.eventId,
                    type: 'update',
                    data: { ...payload, event: draft.eventId },
                });
                eventId = draft.eventId;
            } else {
                const result = await engine.mutate({
                    resource: 'tracker?async=false',
                    type: 'create',
                    data: {"events": [ payload ]},
                }) as { bundleReport: any };
                //eventId = result.response.importSummaries[0]?.reference ?? '';
                eventId = result.bundleReport.typeReportMap.EVENT.objectReports[0]?.uid ?? '';
            }

            await onDraftDeleted();
            return eventId;
        },
        onSuccess: (_eventId, { draft }) => {
            showSuccess();
            queryClient.invalidateQueries({ queryKey: ['events', draft.programId] });
        },
        onError: (err) => {
            showError();
            console.error('Submit event failed:', err);
        },
    });
};
