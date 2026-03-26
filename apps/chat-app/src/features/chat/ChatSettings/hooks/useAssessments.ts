import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDataEngine } from '@dhis2/app-runtime';

export interface Assessment {
    id: string;
    name: string;
    shortName: string;
    code: string;
    programId: string;
    status: 'active' | 'inactive';
    createdAt: string;
}

const STORE_KEY = 'chatAssessments';
const QUERY_KEY = ['chat', 'assessments'];

const normalizeAssessment = (
    assessment: Assessment & { dateConfig?: unknown },
): Assessment => ({
    id: assessment.id,
    name: assessment.name,
    shortName: assessment.shortName,
    code: assessment.code,
    programId: assessment.programId,
    status: assessment.status,
    createdAt: assessment.createdAt,
});

const readStore = async (dataEngine: ReturnType<typeof useDataEngine>): Promise<Assessment[]> => {
    try {
        const resp = await dataEngine.query({
            store: { resource: `dataStore/chat/${STORE_KEY}` },
        });
        const d = resp.store as {
            assessments?: Array<Assessment & { dateConfig?: unknown }>;
        };
        return (d?.assessments ?? []).map(normalizeAssessment);
    } catch {
        return [];
    }
};

const writeStore = async (
    dataEngine: ReturnType<typeof useDataEngine>,
    assessments: Assessment[],
) => {
    try {
        // @ts-ignore
        await dataEngine.mutate({
            resource: `dataStore/chat/${STORE_KEY}`,
            type: 'update',
            data: { assessments },
        });
    } catch {
        await dataEngine.mutate({
            resource: `dataStore/chat/${STORE_KEY}`,
            type: 'create',
            data: { assessments },
        });
    }
};

export const useAssessments = () => {
    const dataEngine = useDataEngine();

    const query = useQuery<Assessment[]>({
        queryKey: QUERY_KEY,
        queryFn: () => readStore(dataEngine),
    });

    return {
        assessments: query.data ?? [],
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        refetch: query.refetch,
    };
};

export const useSaveAssessment = () => {
    const dataEngine = useDataEngine();
    const queryClient = useQueryClient();

    return useMutation<Assessment, Error, Omit<Assessment, 'id' | 'createdAt'>>({
        mutationFn: async (payload) => {
            const existing = await readStore(dataEngine);
            const existingIdx = existing.findIndex(a => a.programId === payload.programId);

            let updated: Assessment[];
            let result: Assessment;

            if (existingIdx !== -1) {
                result = normalizeAssessment({ ...existing[existingIdx], ...payload });
                updated = existing.map((a, i) => i === existingIdx ? result : a);
            } else {
                result = normalizeAssessment({
                    ...payload,
                    id: `assessment-${Date.now()}`,
                    createdAt: new Date().toISOString(),
                });
                updated = [...existing, result];
            }

            await writeStore(dataEngine, updated);
            return result;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
    });
};

export const useDeleteAssessment = () => {
    const dataEngine = useDataEngine();
    const queryClient = useQueryClient();

    return useMutation<void, Error, string>({
        mutationFn: async (id) => {
            const existing = await readStore(dataEngine);
            await writeStore(dataEngine, existing.filter(a => a.id !== id));
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
    });
};
