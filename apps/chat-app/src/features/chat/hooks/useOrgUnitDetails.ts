import { useDataEngine } from '@dhis2/app-runtime';
import { useQuery } from '@tanstack/react-query';

export interface OrgUnitDetails {
    id: string;
    name: string;
    displayName: string;
    code?: string;
    path: string;
    level: number;
}

export const useOrgUnitDetails = (orgUnitId: string | null) => {
    const engine = useDataEngine();

    const query = useQuery<OrgUnitDetails>({
        queryKey: ['orgUnit', orgUnitId],
        enabled: !!orgUnitId,
        staleTime: 1000 * 60 * 10,
        queryFn: async () => {
            const result = await engine.query({
                ou: {
                    resource: `organisationUnits/${orgUnitId}`,
                    params: { fields: 'id,name,displayName,code,path,level' },
                },
            }) as { ou: OrgUnitDetails };
            return result.ou;
        },
    });

    return {
        details: query.data ?? null,
        isLoading: query.isLoading,
    };
};
