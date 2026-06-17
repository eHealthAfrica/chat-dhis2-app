import i18n from '@dhis2/d2-i18n';
import { CircularLoader, NoticeBox } from '@dhis2/ui';
import { useEffect, useRef } from 'react';
import type { ClimateDataset } from '../data/climateDatasets';
import useEarthEngineData from '../hooks/useEarthEngineData';
import type { ImportPeriod } from '../utils/time';
import type { GeoJsonFeature } from '../utils/toGeoJson';
import ImportData from './ImportData';

interface DataElement {
    id: string;
    displayName: string;
    code?: string;
}

interface ExtractGeeDataProps {
    dataElement: DataElement;
    dataset: ClimateDataset;
    period: ImportPeriod | null;
    features: GeoJsonFeature[];
    onError?: (err?: unknown) => void;
    onSuccess?: (importCount: unknown, noDataMessage: string | null) => void;
}

const ExtractGeeData = ({ dataElement, dataset, period, features, onError, onSuccess }: ExtractGeeDataProps) => {
    const { data, error, progress } = useEarthEngineData({ dataset, period: period ?? undefined, features });

    const onErrorRef = useRef(onError);
    onErrorRef.current = onError;

    useEffect(() => {
        if (error) {
            onErrorRef.current?.();
        }
    }, [error]);

    if (error) {
        const displayError = /payload size exceeds the limit/i.test(String(error))
            ? i18n.t('An org unit in your selection has boundaries that are too detailed to process.')
            : String(error);
        return (
            <NoticeBox error title={i18n.t('Import failed')}>
                {displayError}
            </NoticeBox>
        );
    }

    if (!data) {
        const loadingLabel =
            progress.total > 1
                ? i18n.t(
                        'Extracting data from Google Earth Engine (batch {{current}} of {{total}})',
                        { current: progress.current, total: progress.total, nsSeparator: ';' },
                    )
                : i18n.t('Extracting data from Google Earth Engine');

        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 0' }}>
                <CircularLoader small />
                <span>{loadingLabel}</span>
            </div>
        );
    }

    return (
        <ImportData
            data={data}
            dataElement={dataElement}
            features={features}
            onError={onError}
            onSuccess={onSuccess}
        />
    );
};

export default ExtractGeeData;
