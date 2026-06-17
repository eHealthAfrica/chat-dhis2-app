import { useConfig } from '@dhis2/app-runtime';
import i18n from '@dhis2/d2-i18n';
import { Button, Checkbox, InputField } from '@dhis2/ui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { OrganisationUnit } from '../../../components/OrganisationUnitSelector/OrganisationUnitSelector';
import type { ClimateDataset } from './data/climateDatasets';
import useClimateDatasetMappings from './hooks/useClimateDatasetMappings';
import useImportConfigs from './hooks/useImportConfigs';
import useOrgUnitGeometries from './hooks/useOrgUnitGeometries';
import {
    getDefaultImportPeriod,
    getPeriods,
    getStandardPeriod,
    isValidPeriod,
    type ImportPeriod,
    type PeriodType,
} from './utils/time';
import { autoConfigName } from './utils/recurringImports';
import DataElementSelect from './components/DataElementSelect';
import DataSourceSelect from './components/DataSourceSelect';
import ImportModal from './components/ImportModal';
import ImportPreview from './components/ImportPreview';
import OrgUnitSelect from './components/OrgUnitSelect';
import PeriodSection from './components/PeriodSection';
import PeriodTypeSelect from './components/PeriodTypeSelect';
import styles from './ClimateImport.module.css';

const MAX_VALUES = 50000;

interface DataElement {
    id: string;
    displayName: string;
    code?: string;
}

const ClimateImportPage = () => {
    const { systemInfo = {} } = useConfig();
    const calendar = (systemInfo as { calendar?: string }).calendar ?? 'gregory';

    const [dataset, setDataset] = useState<ClimateDataset | undefined>();
    const [period, setPeriod] = useState<ImportPeriod>(() => getDefaultImportPeriod({ calendar }));
    const [orgUnits, setOrgUnits] = useState<OrganisationUnit[]>([]);
    const [dataElement, setDataElement] = useState<DataElement | undefined>();
    const [showImportModal, setShowImportModal] = useState(false);
    const [saveRecurring, setSaveRecurring] = useState(false);
    const [configName, setConfigName] = useState('');
    const [savedConfig, setSavedConfig] = useState<ReturnType<typeof useImportConfigs>['configs'][number] | null>(null);

    const { createConfig, recordRun } = useImportConfigs();
    const { mappings, getMappingForDataset } = useClimateDatasetMappings();

    const { features, featuresLoading, error: featuresError } = useOrgUnitGeometries({
        orgUnits,
        debounceDelay: 300,
    });

    const standardPeriod = useMemo(() => getStandardPeriod(period), [period]);

    const hasNoPeriod = dataset?.period !== undefined && dataset?.period !== null;

    const periodCount = useMemo(
        () =>
            hasNoPeriod
                ? 1
                : isValidPeriod(standardPeriod)
                    ? getPeriods(standardPeriod).length
                    : 0,
        [hasNoPeriod, standardPeriod],
    );
    const valueCount = features.length * periodCount;

    const isValidOrgUnits = orgUnits.length > 0 && features.length > 0;
    const isValid =
        !!dataset &&
        !!dataElement &&
        isValidOrgUnits &&
        (hasNoPeriod || isValidPeriod(standardPeriod)) &&
        valueCount <= MAX_VALUES;

    useEffect(() => {
        setShowImportModal(false);
        setSavedConfig(null);
    }, [dataset, period, orgUnits, dataElement]);

    useEffect(() => {
        if (dataset && mappings.length > 0 && !mappings.some(m => m.datasetId === dataset.id)) {
            setDataset(undefined);
            setDataElement(undefined);
        }
    }, [mappings, dataset]);

    const handleDatasetChange = useCallback(
        (newDataset: ClimateDataset) => {
            setDataset(newDataset);
            const mapped = getMappingForDataset(newDataset.id);
            setDataElement(mapped ?? undefined);
        },
        [getMappingForDataset],
    );

    const handlePeriodTypeChange = useCallback(
        (newType: PeriodType) => {
            setPeriod(getDefaultImportPeriod({ calendar, periodType: newType }));
        },
        [calendar],
    );

    const handleOrgUnitsChange = useCallback((items: OrganisationUnit[]) => {
        setOrgUnits(items);
    }, []);

    const defaultName = useMemo(
        () => autoConfigName(dataset, features.length),
        [dataset, features.length],
    );

    const handleStartImport = useCallback(async () => {
        let newConfig = null;
        if (saveRecurring && dataset && dataElement) {
            const name = configName.trim() || defaultName;
            newConfig = await createConfig({
                name,
                dataset,
                dataElement,
                orgUnits: orgUnits.map(ou => ({ id: ou.id, displayName: ou.displayName ?? ou.name })),
                featureCount: features.length,
                periodType: period.periodType,
                timeZone: period.timeZone,
            });
        }
        setSavedConfig(newConfig);
        setShowImportModal(true);
    }, [
        saveRecurring, dataset, dataElement, configName, defaultName,
        createConfig, orgUnits, features.length, period,
    ]);

    const handleImportDone = useCallback(
        (importCount: unknown, lastRunError: string | null) => {
            if (savedConfig) {
                recordRun(savedConfig.id, {
                    dataUpdatedThrough: importCount
                        ? (hasNoPeriod ? dataset?.period ?? undefined : standardPeriod.endTime)
                        : undefined,
                    lastRunError,
                });
            }
        },
        [savedConfig, recordRun, hasNoPeriod, dataset?.period, standardPeriod.endTime],
    );

    const supportedPeriodTypes = dataset?.supportedPeriodTypes as PeriodType[] | undefined;

    return (
        <div className={styles.page}>
            <h1>{i18n.t('Import weather and climate data')}</h1>

            {/* Section 1: Data source */}
            <div className={styles.formSection}>
                <DataSourceSelect
                    selected={dataset}
                    onChange={handleDatasetChange}
                    mappings={mappings}
                />
                <PeriodTypeSelect
                    periodType={period.periodType}
                    supportedPeriodTypes={supportedPeriodTypes}
                    onChange={handlePeriodTypeChange}
                />
            </div>

            {/* Section 2: Data element */}
            <div className={styles.formSection}>
                <h2>{i18n.t('2. Select data element')}</h2>
                <DataElementSelect
                    selected={dataElement}
                    onChange={setDataElement}
                    datasetCode={dataset?.dataElementCode}
                    periodType={period.periodType}
                />
            </div>

            {/* Section 3: Org units */}
            <div className={styles.formSection}>
                <OrgUnitSelect
                    selected={orgUnits}
                    onChange={handleOrgUnitsChange}
                    featureCount={features.length}
                    featuresLoading={featuresLoading}
                    featuresError={featuresError}
                />
            </div>

            {/* Section 4: Date range */}
            <div className={styles.formSection}>
                <PeriodSection
                    period={period}
                    dataset={dataset}
                    onChange={setPeriod}
                />
            </div>

            {/* Section 5: Preview and import */}
            <div className={styles.formSection}>
                <h2>{i18n.t('5. Review and import')}</h2>

                {valueCount > MAX_VALUES && (
                    <div className={styles.warning}>
                        {i18n.t(
                            'You can import at most {{max}} data values in a single import, but you are trying to import {{count}} values ({{orgUnits}} org units × {{periods}} periods). Please reduce the date range or select fewer organisation units.',
                            {
                                max: MAX_VALUES.toLocaleString(),
                                count: valueCount.toLocaleString(),
                                orgUnits: features.length,
                                periods: periodCount,
                                nsSeparator: ';',
                            },
                        )}
                    </div>
                )}

                {isValid && (
                    <ImportPreview
                        dataset={dataset!.name}
                        periodType={period.periodType}
                        startDate={standardPeriod.startTime}
                        endDate={standardPeriod.endTime}
                        featureCount={features.length}
                        dataElement={dataElement!.displayName}
                        totalValues={valueCount}
                        orgUnits={orgUnits}
                    />
                )}

                <div className={styles.saveRecurringBox}>
                    <Checkbox
                        label={i18n.t('Save this import for re-running later')}
                        checked={saveRecurring}
                        onChange={({ checked }) => setSaveRecurring(!!checked)}
                    />
                    {saveRecurring && (
                        <div style={{ marginTop: '8px' }}>
                            <InputField
                                label={i18n.t('Import name')}
                                value={configName}
                                placeholder={defaultName}
                                onChange={({ value }) => setConfigName(value ?? '')}
                                dataTest="config-name-input"
                            />
                        </div>
                    )}
                </div>

                <div className={styles.submitRow}>
                    <Button
                        primary
                        disabled={!isValid}
                        onClick={handleStartImport}
                        dataTest="start-import-button"
                    >
                        {i18n.t('Start import')}
                    </Button>
                    {!dataset && (
                        <span style={{ color: 'var(--colors-grey700)', fontSize: '14px' }}>
                            {i18n.t('Select a data source to begin.')}
                        </span>
                    )}
                </div>
            </div>

            {showImportModal && dataset && dataElement && (
                <ImportModal
                    dataset={dataset}
                    period={hasNoPeriod ? null : standardPeriod}
                    features={features}
                    dataElement={dataElement}
                    savedConfig={savedConfig}
                    onClose={() => setShowImportModal(false)}
                    onImportDone={handleImportDone}
                />
            )}
        </div>
    );
};

export default ClimateImportPage;
