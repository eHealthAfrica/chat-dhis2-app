import { useDataEngine } from '@dhis2/app-runtime';
import { useQuery }      from '@tanstack/react-query';
import { Assessment }    from '../ChatSettings/hooks/useAssessments';

const groupedDraftsLocalKey = (userUid: string, programId: string) =>
    `capture_drafts:${userUid}_${programId}_drafts`;

interface StatsResult {
    completed:  number;
    inProgress: number;
}

export const useCaptureStats = (assessment: Assessment | null, userUid: string | null) => {
    const engine = useDataEngine();

    const query = useQuery<StatsResult>({
        queryKey: ['capture-stats', assessment?.programId, userUid],
        enabled:  !!assessment && !!userUid,
        queryFn:  async () => {
            const result = await engine.query({
                events: {
                    resource: 'events',
                    params: {
                        program:    assessment!.programId,
                        status:     'COMPLETED',
                        fields:     'event',
                        totalPages: true,
                        pageSize:   1,
                    },
                },
            }) as { events: { pager: { total: number } } };

            const completed = result.events.pager?.total ?? 0;
            const rawDrafts = localStorage.getItem(
                groupedDraftsLocalKey(userUid!, assessment!.programId),
            );
            const inProgress = rawDrafts
                ? (JSON.parse(rawDrafts) as unknown[]).length
                : 0;

            return { completed, inProgress };
        },
    });

    return {
        stats:     query.data ?? { completed: 0, inProgress: 0 },
        isLoading: query.isLoading,
    };
};
