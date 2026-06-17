import { useDataEngine } from '@dhis2/app-runtime';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClimateDataset } from '../data/climateDatasets';
import useSystemInfo from './useSystemInfo';

const APP_NAMESPACE = 'chat';
const CONFIGS_KEY = 'climateImportConfigs';
const resource = `dataStore/${APP_NAMESPACE}/${CONFIGS_KEY}`;

const generateId = () =>
    Math.random().toString(36).substring(2) + Date.now().toString(36);

export interface ImportConfig {
    id: string;
    name: string;
    datasetId: string | null;
    datasetName: string | null;
    dataElement: { id: string; displayName: string; code?: string } | null;
    orgUnits: Array<{ id: string; displayName?: string }>;
    featureCount: number;
    periodType: string;
    timeZone: string | null;
    dataUpdatedThrough: string | null;
    createdAt: string;
    createdBy: string | null;
    createdByName: string | null;
    lastRunAt: string | null;
    lastRunBy: string | null;
    lastRunByName: string | null;
    lastRunError: string | null;
}

const useImportConfigs = () => {
    const [loading, setLoading] = useState(true);
    const [configs, setConfigs] = useState<ImportConfig[]>([]);
    const [error, setError] = useState<unknown>();
    const engine = useDataEngine();
    const { system } = useSystemInfo();
    const keyExists = useRef(false);

    const currentUser = system?.currentUser;

    const loadConfigs = useCallback(() => {
        setLoading(true);
        engine
            .query({ data: { resource } })

            .then((result: any) => {
                keyExists.current = true;
                setConfigs((result?.data as { configs?: ImportConfig[] })?.configs ?? []);
                setLoading(false);
            })
            .catch((err: { details?: { httpStatusCode?: number } }) => {
                if (err?.details?.httpStatusCode === 404) {
                    keyExists.current = false;
                    setConfigs([]);
                    setLoading(false);
                } else {
                    setError(err);
                    setLoading(false);
                }
            });
    }, [engine]);

    const persistConfigs = useCallback(
        (newConfigs: ImportConfig[]) => {
            const type = keyExists.current ? 'update' : 'create';
            return engine

                .mutate({ resource, type, data: { configs: newConfigs } } as any)
                .then(() => {
                    keyExists.current = true;
                })
                .catch(setError);
        },
        [engine],
    );

    const createConfig = useCallback(
        ({
            name,
            dataset,
            dataElement,
            orgUnits,
            featureCount,
            periodType,
            timeZone,
        }: {
            name: string;
            dataset?: ClimateDataset;
            dataElement: ImportConfig['dataElement'];
            orgUnits: ImportConfig['orgUnits'];
            featureCount: number;
            periodType: string;
            timeZone?: string;
        }) => {
            const newConfig: ImportConfig = {
                id: generateId(),
                name,
                datasetId: dataset?.id ?? null,
                datasetName: dataset?.name ?? null,
                dataElement,
                orgUnits,
                featureCount,
                periodType,
                timeZone: timeZone ?? null,
                dataUpdatedThrough: null,
                createdAt: new Date().toISOString(),
                createdBy: currentUser?.id ?? null,
                createdByName: currentUser?.name ?? null,
                lastRunAt: null,
                lastRunBy: null,
                lastRunByName: null,
                lastRunError: null,
            };
            const newConfigs = [...configs, newConfig];
            setConfigs(newConfigs);
            return persistConfigs(newConfigs).then(() => newConfig);
        },
        [configs, persistConfigs, currentUser],
    );

    const updateConfig = useCallback(
        (id: string, patch: Partial<ImportConfig>) => {
            const newConfigs = configs.map(c =>
                c.id === id ? { ...c, ...patch } : c,
            );
            setConfigs(newConfigs);
            return persistConfigs(newConfigs);
        },
        [configs, persistConfigs],
    );

    const recordRun = useCallback(
        (id: string, { dataUpdatedThrough, lastRunError = null }: { dataUpdatedThrough?: string; lastRunError?: string | null }) => {
            const patch: Partial<ImportConfig> = {
                lastRunAt: new Date().toISOString(),
                lastRunBy: currentUser?.id ?? null,
                lastRunByName: currentUser?.name ?? null,
                lastRunError,
            };
            if (dataUpdatedThrough !== undefined) {
                patch.dataUpdatedThrough = dataUpdatedThrough;
            }
            return updateConfig(id, patch);
        },
        [updateConfig, currentUser],
    );

    const renameConfig = useCallback(
        (id: string, name: string) => updateConfig(id, { name }),
        [updateConfig],
    );

    const deleteConfig = useCallback(
        (id: string) => {
            const newConfigs = configs.filter(c => c.id !== id);
            setConfigs(newConfigs);
            return persistConfigs(newConfigs);
        },
        [configs, persistConfigs],
    );

    useEffect(() => {
        loadConfigs();
    }, [loadConfigs]);

    return {
        configs,
        loading,
        error,
        currentUser,
        createConfig,
        recordRun,
        renameConfig,
        deleteConfig,
    };
};

export default useImportConfigs;
