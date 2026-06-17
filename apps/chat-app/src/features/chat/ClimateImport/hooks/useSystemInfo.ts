import { useDataQuery } from '@dhis2/app-runtime';

const SYSTEM_QUERY = {
    currentUser: {
        resource: 'me',
        params: {
            fields: 'id,username,displayName~rename(name),authorities,settings[keyAnalysisDisplayProperty]',
        },
    },
    systemInfo: {
        resource: 'system/info',
        params: {
            fields: 'serverTimeZoneId',
        },
    },
};

export interface SystemInfo {
    currentUser?: {
        id: string;
        username: string;
        name: string;
        authorities: string[];
        settings?: {
            keyAnalysisDisplayProperty?: string;
        };
    };
    systemInfo?: {
        serverTimeZoneId?: string;
    };
}

const useSystemInfo = () => {
    const { loading, error, data: system } = useDataQuery(SYSTEM_QUERY);

    return {
        system: system as SystemInfo | undefined,
        error,
        loading,
    };
};

export default useSystemInfo;
