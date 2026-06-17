import { useDataEngine } from '@dhis2/app-runtime';
import { useCallback, useEffect, useRef, useState } from 'react';

const APP_NAMESPACE = 'chat';
const MAPPINGS_KEY = 'climateDatasetMappings';
const resource = `dataStore/${APP_NAMESPACE}/${MAPPINGS_KEY}`;

export interface DatasetMapping {
    datasetId: string;
    dataElement: { id: string; displayName: string; code?: string };
}

const useClimateDatasetMappings = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<unknown>();
    const [mappings, setMappings] = useState<DatasetMapping[]>([]);
    const engine = useDataEngine();
    const keyExists = useRef(false);

    const loadMappings = useCallback(() => {
        setLoading(true);
        engine
            .query({ data: { resource } })
            .then((result: any) => {
                keyExists.current = true;
                setMappings((result?.data as { mappings?: DatasetMapping[] })?.mappings ?? []);
                setLoading(false);
            })
            .catch((err: { details?: { httpStatusCode?: number } }) => {
                if (err?.details?.httpStatusCode === 404) {
                    keyExists.current = false;
                    setMappings([]);
                    setLoading(false);
                } else {
                    setError(err);
                    setLoading(false);
                }
            });
    }, [engine]);

    const persistMappings = useCallback(
        (newMappings: DatasetMapping[]) => {
            const type = keyExists.current ? 'update' : 'create';
            setSaving(true);
            return engine
                .mutate({ resource, type, data: { mappings: newMappings } } as any)
                .then(() => {
                    keyExists.current = true;
                    setSaving(false);
                })
                .catch((err: unknown) => {
                    setError(err);
                    setSaving(false);
                });
        },
        [engine],
    );

    const setMapping = useCallback(
        (datasetId: string, dataElement: DatasetMapping['dataElement']) => {
            const newMappings = [
                ...mappings.filter(m => m.datasetId !== datasetId),
                { datasetId, dataElement },
            ];
            setMappings(newMappings);
            return persistMappings(newMappings);
        },
        [mappings, persistMappings],
    );

    const removeMapping = useCallback(
        (datasetId: string) => {
            const newMappings = mappings.filter(m => m.datasetId !== datasetId);
            setMappings(newMappings);
            return persistMappings(newMappings);
        },
        [mappings, persistMappings],
    );

    const getMappingForDataset = useCallback(
        (datasetId: string) => mappings.find(m => m.datasetId === datasetId)?.dataElement,
        [mappings],
    );

    useEffect(() => {
        loadMappings();
    }, [loadMappings]);

    return { mappings, loading, saving, error, setMapping, removeMapping, getMappingForDataset };
};

export default useClimateDatasetMappings;
