import { useDataEngine } from '@dhis2/app-runtime';

export interface EarthEngineToken {
    access_token: string;
    client_id: string;
    expires_in: number;
    token_type: string;
}

const tokenQuery = {
    token: {
        resource: 'tokens/google',
    },
};

const useEarthEngineToken = (): Promise<EarthEngineToken> => {
    const engine = useDataEngine();

    return engine
        .query(tokenQuery)

        .then((data: any) => ({
            ...(data.token as Omit<EarthEngineToken, 'token_type'>),
            token_type: 'Bearer',
        }));
};

export default useEarthEngineToken;
