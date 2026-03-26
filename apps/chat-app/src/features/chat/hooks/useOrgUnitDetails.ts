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

interface OrgUnitsResponse {
    organisationUnits: OrgUnitDetails[];
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

export const useOrgUnitDetailsMap = (orgUnitIds: string[]) => {
    const engine = useDataEngine();

    const uniqueOrgUnitIds = [...new Set(orgUnitIds.filter(Boolean))];

    const query = useQuery<Record<string, OrgUnitDetails | null>>({
        queryKey: ['orgUnits', uniqueOrgUnitIds],
        enabled: uniqueOrgUnitIds.length > 0,
        staleTime: 1000 * 60 * 10,
        queryFn: async () => {
            const results = await Promise.all(
                uniqueOrgUnitIds.map(async orgUnitId => {
                    try {
                        const result = await engine.query({
                            ou: {
                                resource: `organisationUnits/${orgUnitId}`,
                                params: { fields: 'id,name,displayName,code,path,level' },
                            },
                        }) as { ou: OrgUnitDetails };

                        return [orgUnitId, result.ou ?? null] as const;
                    } catch {
                        return [orgUnitId, null] as const;
                    }
                }),
            );

            const byId = Object.fromEntries(results);

            return Object.fromEntries(
                uniqueOrgUnitIds.map(orgUnitId => [orgUnitId, byId[orgUnitId] ?? null]),
            );
        },
        initialData: {},
    });

    return {
        detailsById: query.data ?? {},
        isLoading: query.isLoading,
    };
};
