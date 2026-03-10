import { useDataEngine } from '@dhis2/app-runtime';
import { useQuery } from '@tanstack/react-query';

interface MeAuthorities {
    authorities: string[];
}

export const useHasAuthority = (authority: string) => {
    const engine = useDataEngine();

    const { data, isLoading } = useQuery<MeAuthorities>({
        queryKey: ['currentUser', 'authorities'],
        staleTime: Infinity,
        queryFn: async () => {
            const result = await engine.query({
                me: {
                    resource: 'me',
                    params: { fields: 'authorities' },
                },
            }) as { me: MeAuthorities };
            return result.me;
        },
    });

    return {
        hasAuthority: data?.authorities?.includes(authority) ?? false,
        isLoading,
    };
};