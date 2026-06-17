import { useDataQuery } from '@dhis2/app-runtime';
import i18n from '@dhis2/d2-i18n';
import {
    Button,
    CircularLoader,
    NoticeBox,
    SingleSelectField,
    SingleSelectOption,
} from '@dhis2/ui';
import { useCallback, useMemo, useState } from 'react';
import type { ClimateDataset } from './data/climateDatasets';
import getEEDatasets from './data/climateDatasets';
import useClimateDatasetMappings from './hooks/useClimateDatasetMappings';
import styles from './ClimateImport.module.css';

const DATA_ELEMENTS_QUERY = {
    dataElements: {
        resource: 'dataElements',
        params: {
            paging: false,
            fields: 'id,displayName,code',
            filter: 'domainType:eq:AGGREGATE',
        },
    },
};

interface RawDataElement {
    id: string;
    displayName: string;
    code?: string;
}

const PERIOD_TYPE_LABELS: Record<string, string> = {
    DAILY: i18n.t('Daily'),
    WEEKLY: i18n.t('Weekly'),
    MONTHLY: i18n.t('Monthly'),
    YEARLY: i18n.t('Yearly'),
    SIXTEEN_DAYS: i18n.t('16-day'),
};

// ── CSV metadata export ───────────────────────────────────────────────────────

const DHIS2_AGG_TYPE: Record<string, string> = {
    'Average': 'AVERAGE',
    'Max': 'MAX',
    'Min': 'MIN',
    'Sum': 'SUM',
    'First value': 'AVERAGE',
};

const PRECIPITATION_CODES = new Set(['ERA5_LAND_PRECIPITATION', 'CHIRPS_PRECIPITATION']);

/** Wrap a CSV cell in quotes if it contains commas, quotes, or newlines. */
const csvCell = (v: string): string => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
};

const CSV_HEADERS = [
    'name', 'uid', 'code', 'shortName', 'description', 'formName',
    'domainType', 'type', 'aggregationType', 'categoryComboUid',
    'url', 'zeroIsSignificant', 'optionSet',
];

const DEFAULT_CATEGORY_COMBO_UID = 'bjDvmb4bfuf';

const generateMetadataCsv = (datasets: ClimateDataset[]): string => {
    const rows = datasets.map((ds) => {
        const aggType = DHIS2_AGG_TYPE[ds.aggregationType as string] ?? 'AVERAGE';
        const zeroSig = PRECIPITATION_CODES.has(ds.dataElementCode) ? 'TRUE' : 'FALSE';
        return [
            ds.name as string,
            '', // uid — let DHIS2 auto-generate
            ds.dataElementCode,
            ds.shortName as string,
            ds.description as string,
            ds.name as string, // formName
            'AGGREGATE',
            'NUMBER',
            aggType,
            DEFAULT_CATEGORY_COMBO_UID,
            '', // url
            zeroSig,
            '', // optionSet
        ].map(csvCell).join(',');
    });
    return [CSV_HEADERS.join(','), ...rows].join('\n');
};

const ClimateSetupPage = () => {
    const datasets = useMemo(() => getEEDatasets(), []);

    const { loading: deLoading, error: deError, data: deData } = useDataQuery(DATA_ELEMENTS_QUERY);
    const { mappings, loading: mappingsLoading, saving, error: mappingsError, setMapping, removeMapping } =
        useClimateDatasetMappings();

    const allDataElements = useMemo<RawDataElement[]>(() => {
        const raw = (deData as any)?.dataElements?.dataElements ?? [];
        return [...raw].sort((a: RawDataElement, b: RawDataElement) =>
            a.displayName.localeCompare(b.displayName),
        );
    }, [deData]);

    const getMapped = (datasetId: string) =>
        mappings.find(m => m.datasetId === datasetId)?.dataElement;

    const isLoading = deLoading || mappingsLoading;

    const [showMetaTable, setShowMetaTable] = useState(false);

    const handleDownloadCsv = useCallback(() => {
        const csv = generateMetadataCsv(datasets);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'climate-data-elements.csv';
        a.click();
        URL.revokeObjectURL(url);
    }, [datasets]);

    return (
        <div className={styles.setupPage}>
            <h1>{i18n.t('Climate data setup')}</h1>

            <h2>{i18n.t('Data element mappings')}</h2>
            <p>
                {i18n.t(
                    'Map each climate dataset to an existing DHIS2 data element. The mapped element will be pre-selected when you start a new import.',
                ) as string}
            </p>

            {!!mappingsError && (
                <NoticeBox error title={i18n.t('Could not load saved mappings')}>
                    {(mappingsError as { message?: string }).message}
                </NoticeBox>
            )}

            {isLoading ? (
                <div className={styles.mappingLoading}>
                    <CircularLoader small />
                    <span>{i18n.t('Loading...')}</span>
                </div>
            ) : deError ? (
                <NoticeBox error title={i18n.t('Could not load data elements')}>
                    {(deError as { message?: string }).message}
                </NoticeBox>
            ) : (
                <>
                    <div className={styles.mappingTableWrapper}>
                        <table className={styles.mappingTable}>
                            <thead>
                                <tr>
                                    <th className={styles.colDataset}>{i18n.t('Climate dataset')}</th>
                                    <th className={styles.colPeriod}>{i18n.t('Period')}</th>
                                    <th className={styles.colElement}>{i18n.t('DHIS2 data element')}</th>
                                    <th className={styles.colAction} />
                                </tr>
                            </thead>
                            <tbody>
                                {datasets.map((dataset) => {
                                    const mapped = getMapped(dataset.id);
                                    const periodLabel =
                                        PERIOD_TYPE_LABELS[dataset.periodType] ?? dataset.periodType;

                                    return (
                                        <tr key={dataset.id}>
                                            <td className={styles.colDataset}>
                                                <span className={styles.mappingDatasetName}>
                                                    {dataset.name}
                                                </span>
                                                {dataset.dataElementCode && (
                                                    <code className={styles.mappingCode}>
                                                        {dataset.dataElementCode}
                                                    </code>
                                                )}
                                            </td>
                                            <td className={styles.colPeriod}>{periodLabel}</td>
                                            <td className={styles.colElement}>
                                                <SingleSelectField
                                                    filterable
                                                    noMatchText={i18n.t('No match')}
                                                    placeholder={i18n.t('Select data element')}
                                                    selected={mapped?.id ?? undefined}
                                                    onChange={({ selected: id }: { selected: string }) => {
                                                        const de = allDataElements.find(d => d.id === id);
                                                        if (de) {
                                                            setMapping(dataset.id, de);
                                                        }
                                                    }}
                                                    dense
                                                    dataTest={`mapping-select-${dataset.id}`}
                                                >
                                                    {allDataElements.map(de => (
                                                        <SingleSelectOption
                                                            key={de.id}
                                                            value={de.id}
                                                            label={de.displayName}
                                                        />
                                                    ))}
                                                </SingleSelectField>
                                            </td>
                                            <td className={styles.colAction}>
                                                {mapped && (
                                                    <Button
                                                        small
                                                        secondary
                                                        destructive
                                                        onClick={() => removeMapping(dataset.id)}
                                                        dataTest={`mapping-clear-${dataset.id}`}
                                                    >
                                                        {i18n.t('Clear')}
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {saving && (
                        <div className={styles.mappingSaving}>
                            <CircularLoader small />
                            <span>{i18n.t('Saving...')}</span>
                        </div>
                    )}
                </>
            )}

            <h2 style={{ marginTop: '32px' }}>{i18n.t('Data elements for metadata import')}</h2>
            <p>
                {i18n.t(
                    'Use these values to create data elements in the Maintenance app, or download as CSV for bulk metadata import.',
                ) as string}
            </p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <Button small secondary onClick={() => setShowMetaTable(v => !v)}>
                    {showMetaTable ? i18n.t('Hide table') : i18n.t('Show table')}
                </Button>
                {showMetaTable && (
                    <Button small secondary onClick={handleDownloadCsv}>
                        {i18n.t('Download CSV')}
                    </Button>
                )}
            </div>
            {showMetaTable && (
                <div className={styles.metaTableWrapper}>
                    <table className={styles.metaTable}>
                        <thead>
                            <tr>
                                {CSV_HEADERS.map(h => <th key={h}>{h}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {datasets.map((ds) => {
                                const aggType = DHIS2_AGG_TYPE[ds.aggregationType as string] ?? 'AVERAGE';
                                const zeroSig = PRECIPITATION_CODES.has(ds.dataElementCode) ? 'TRUE' : 'FALSE';
                                return (
                                    <tr key={ds.id}>
                                        <td>{ds.name as string}</td>
                                        <td className={styles.metaEmptyCell}>—</td>
                                        <td><code>{ds.dataElementCode}</code></td>
                                        <td>{ds.shortName as string}</td>
                                        <td className={styles.metaDescCell}>{ds.description as string}</td>
                                        <td>{ds.name as string}</td>
                                        <td>AGGREGATE</td>
                                        <td>NUMBER</td>
                                        <td>{aggType}</td>
                                        <td><code>{DEFAULT_CATEGORY_COMBO_UID}</code></td>
                                        <td className={styles.metaEmptyCell}>—</td>
                                        <td>{zeroSig}</td>
                                        <td className={styles.metaEmptyCell}>—</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ClimateSetupPage;
