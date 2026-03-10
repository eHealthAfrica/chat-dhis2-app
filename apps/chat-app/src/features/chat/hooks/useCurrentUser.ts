import { useDataEngine } from '@dhis2/app-runtime';
import { useQuery }      from '@tanstack/react-query';

export interface CurrentUser {
    id:          string;
    username:    string;
    displayName: string;
}

export const useCurrentUser = () => {
    const engine = useDataEngine();

    const query = useQuery<CurrentUser>({
        queryKey: ['currentUser'],
        staleTime: Infinity,
        queryFn: async () => {
            const result = await engine.query({
                me: {
                    resource: 'me',
                    params: { fields: 'id,username,displayName' },
                },
            }) as { me: CurrentUser };
            return result.me;
        },
    });

    return {
        user:      query.data ?? null,
        isLoading: query.isLoading,
        error:     query.error,
    };
};
