import { useDataMutation } from '@dhis2/app-runtime';
import i18n from '@dhis2/d2-i18n';
import { NoticeBox } from '@dhis2/ui';
import { useState, useEffect, useMemo, useRef } from 'react';
import type { GeoJsonFeature } from '../utils/toGeoJson';

interface DataElement {
    id: string;
    displayName: string;
    code?: string;
}

interface DataValue {
    ou?: string;
    period?: string;
    value?: unknown;
}

interface ImportResult {
    importCount?: {
        imported?: number;
        updated?: number;
        ignored?: number;
        deleted?: number;
        missing?: number;
    };
    conflicts?: Array<{ value: string; object?: string }>;
}

interface ImportDataProps {
    data: Array<Record<string, unknown>>;
    dataElement: DataElement;
    features: GeoJsonFeature[];
    onError?: (err: unknown) => void;
    onSuccess?: (importCount: ImportResult['importCount'], noDataMessage: string | null) => void;
}

const dataImportMutation = {
    resource: 'dataValueSets',
    type: 'create' as const,
    data: (dataValues: unknown) => dataValues,
};

const countMissing = (data: DataValue[]): number =>
    data.filter(obj => Number.isNaN(Number(obj.value))).length;

const ImportData = ({ data, dataElement, features, onError, onSuccess }: ImportDataProps) => {
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [mutate, { error }] = useDataMutation(dataImportMutation);
    const hasMutated = useRef(false);
    const onErrorRef = useRef(onError);
    onErrorRef.current = onError;

    const sentDataValues = useMemo(
        () =>
            data
                .filter(d => !Number.isNaN(Number(d.value)))
                .map(obj => ({
                    value: obj.value,
                    orgUnit: obj.ou,
                    dataElement: dataElement.id,
                    period: obj.period,
                })),
        [data, dataElement],
    );

    const noDataOrgUnits = useMemo(
        () =>
            features
                .filter(f =>
                    data
                        .filter(d => d.ou === f.id)
                        .every(d => Number.isNaN(Number(d.value))),
                )
                .map(f => f.properties.name),
        [data, features],
    );

    useEffect(() => {
        if (error) {
            onErrorRef.current?.(error);
            const errorResponse = (error as { details?: { response?: { importCount?: ImportResult['importCount']; conflicts?: ImportResult['conflicts'] } } })?.details?.response;
            if (errorResponse) {
                const missing = countMissing(data as DataValue[]);
                const { importCount, conflicts } = errorResponse;
                setImportResult({ importCount: { ...importCount, missing }, conflicts });
            }
        }
    }, [error, data]);

    useEffect(() => {
        if (hasMutated.current) return;
        hasMutated.current = true;

        mutate({ dataValues: sentDataValues }).then((response) => {
            const res = response as { httpStatus?: string; status?: string; response?: { importCount?: ImportResult['importCount'] }; importCount?: ImportResult['importCount'] };
            const missing = countMissing(data as DataValue[]);
            let importCount: ImportResult['importCount'];

            if (res.httpStatus === 'OK') {
                importCount = { ...res.response?.importCount, missing };
                setImportResult({ importCount });
            } else if (res.status === 'SUCCESS') {
                importCount = { ...res.importCount, missing };
                setImportResult({ importCount });
            }

            if (onSuccess && importCount) {
                const noDataMessage =
                    noDataOrgUnits.length > 0
                        ? i18n.t('No data for the following org units: {{orgUnits}}', {
                                orgUnits: noDataOrgUnits.join(', '),
                                nsSeparator: ';',
                            })
                        : null;
                onSuccess(importCount, noDataMessage);
            }
        });
    }, [mutate, sentDataValues, data, onSuccess, noDataOrgUnits]);

    if (!importResult) {
        return <p>{i18n.t('Importing data to DHIS2...')}</p>;
    }

    const { importCount, conflicts } = importResult;

    return (
        <div>
            {importCount && (
                <NoticeBox valid title={i18n.t('Import complete')}>
                    <p>
                        {i18n.t('Imported: {{imported}}, Updated: {{updated}}, Ignored: {{ignored}}', {
                            imported: importCount.imported ?? 0,
                            updated: importCount.updated ?? 0,
                            ignored: importCount.ignored ?? 0,
                            nsSeparator: ';',
                        })}
                    </p>
                    {(importCount.missing ?? 0) > 0 && (
                        <p>
                            {i18n.t('{{count}} values could not be imported (no data available)', {
                                count: importCount.missing,
                                nsSeparator: ';',
                            })}
                        </p>
                    )}
                </NoticeBox>
            )}
            {conflicts && conflicts.length > 0 && (
                <NoticeBox warning title={i18n.t('Import conflicts')}>
                    <ul style={{ paddingLeft: '16px' }}>
                        {conflicts.slice(0, 5).map((c, i) => (
                            <li key={i}>{c.value}</li>
                        ))}
                        {conflicts.length > 5 && <li>{i18n.t('... and {{count}} more', { count: conflicts.length - 5 })}</li>}
                    </ul>
                </NoticeBox>
            )}
        </div>
    );
};

export default ImportData;
