// @ts-expect-error - GEE JS bundle has no type definitions
import ee from '../../../../lib/earthengine.js';
import useEarthEngineToken, { type EarthEngineToken } from './useEarthEngineToken';

type EE = any;

const eePromise = (tokenPromise: Promise<EarthEngineToken>): Promise<EE> =>
    new Promise((resolve, reject) => {
        if (ee.data.getAuthToken()) {
            ee.initialize(null, null, () => resolve(ee), reject);
        } else {
            tokenPromise
                .then((token) => {
                    const { token_type, access_token, client_id, expires_in } = token;
                    const extraScopes = null;
                    const updateAuthLibrary = false;

                    ee.data.setAuthToken(
                        client_id,
                        token_type,
                        access_token,
                        expires_in,
                        extraScopes,
                        () => ee.initialize(null, null, () => resolve(ee), reject),
                        updateAuthLibrary,
                    );

                    ee.data.setAuthTokenRefresher(async (authArgs: { scope: string }, callback: (token: EarthEngineToken & { state: string }) => void) =>
                        callback({
                            ...(await tokenPromise),
                            state: authArgs.scope,
                        }),
                    );
                })
                .catch(reject);
        }
    });

let eeInstance: Promise<EE> | null = null;

const useEarthEngine = (): Promise<EE> => {
    const tokenPromise = useEarthEngineToken();

    if (!eeInstance) {
        eeInstance = eePromise(tokenPromise);
    }

    return eeInstance;
};

export default useEarthEngine;
