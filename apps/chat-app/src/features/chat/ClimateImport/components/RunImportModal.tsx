import i18n from '@dhis2/d2-i18n';
import {
    Button,
    ButtonStrip,
    CircularLoader,
    Modal,
    ModalActions,
    ModalContent,
    ModalTitle,
    NoticeBox,
} from '@dhis2/ui';
import { useCallback, useMemo, useState } from 'react';
import type { ClimateDataset } from '../data/climateDatasets';
import type { ImportConfig } from '../hooks/useImportConfigs';
import useOrgUnitGeometries from '../hooks/useOrgUnitGeometries';
import {
    DAILY,
    MONTHLY,
    WEEKLY,
    YEARLY,
    formatBookmarkDate,
    formatStandardDate,
    getPeriodTypes,
    oneDayInMs,
    type ImportPeriod,
} from '../utils/time';
import { computeFillGapRange, valueCountForRange } from '../utils/recurringImports';
import DateRangePicker from './DateRangePicker';
import ImportModal from './ImportModal';

const MAX_VALUES = 50000;

interface RunImportConfig extends ImportConfig {
    dataset?: ClimateDataset | null;
}

interface RunImportModalProps {
    config: RunImportConfig;
    onClose: () => void;
    onRunComplete: (id: string, result: { dataUpdatedThrough?: string; lastRunError?: string | null }) => void;
}

const getDefaultRange = (periodType: string): { startTime: string; endTime: string; periodType: string } => {
    const now = new Date();
    if (periodType === YEARLY) {
        const y = now.getFullYear();
        return { startTime: String(y - 2), endTime: String(y - 1), periodType };
    }
    let end: Date;
    if (periodType === DAILY) end = new Date(now.getTime() - oneDayInMs);
    else if (periodType === MONTHLY) end = new Date(now.getFullYear(), now.getMonth(), 0);
    else if (periodType === WEEKLY) {
        const dow = now.getDay();
        end = new Date(now.getTime() - (dow || 7) * oneDayInMs);
    } else {
        end = new Date(now.getTime() - oneDayInMs);
    }
    const monthsBack = periodType === MONTHLY ? 12 : 6;
    const start = new Date(end);
    start.setMonth(start.getMonth() - monthsBack);
    return { startTime: formatStandardDate(start), endTime: formatStandardDate(end), periodType };
};

const formatRangeDisplay = (range: { startTime: string; endTime: string; periodType: string }): string => {
    if (range.periodType === YEARLY) return `${range.startTime} → ${range.endTime}`;
    return `${formatBookmarkDate(range.startTime)} → ${formatBookmarkDate(range.endTime)}`;
};

const RunImportModal = ({ config, onClose, onRunComplete }: RunImportModalProps) => {
    const { features, featuresLoading, error: featuresError } = useOrgUnitGeometries({
        orgUnits: config.orgUnits,
        debounceDelay: 0,
    });

    const [editing, setEditing] = useState(false);
    const [overrideRange, setOverrideRange] = useState<{ startTime: string; endTime: string } | null>(null);
    const [confirmed, setConfirmed] = useState(false);

    const defaultRange = useMemo(() => {
        const computed = computeFillGapRange(config);
        return computed ?? getDefaultRange(config.periodType);
    }, [config]);

    const range = useMemo(
        () => overrideRange ? { ...overrideRange, periodType: config.periodType } : defaultRange,
        [overrideRange, defaultRange, config.periodType],
    );

    const isYearly = config.periodType === YEARLY;
    const rangeInvalid = isYearly
        ? Number.parseInt(range.startTime, 10) > Number.parseInt(range.endTime, 10)
        : new Date(range.startTime) > new Date(range.endTime);

    const rangeDisplayText =
        overrideRange || !config.dataUpdatedThrough
            ? formatRangeDisplay(range)
            : i18n.t('Since last import ({{range}})', { range: formatRangeDisplay(range), nsSeparator: ';' });

    const valueCount = useMemo(
        () => valueCountForRange({ featureCount: config.featureCount, periodType: config.periodType, range }),
        [config, range],
    );
    const exceedsLimit = valueCount > MAX_VALUES;

    const periodForExtract: ImportPeriod = useMemo(
        () => ({
            startTime: range.startTime,
            endTime: range.endTime,
            periodType: range.periodType as ImportPeriod['periodType'],
            calendar: 'gregory',
            timeZone: config.timeZone ?? undefined,
        }),
        [range, config.timeZone],
    );

    const handleRangeChange = useCallback((updatedPeriod: ImportPeriod) => {
        setOverrideRange({ startTime: updatedPeriod.startTime, endTime: updatedPeriod.endTime });
    }, []);

    const handleImportDone = useCallback(
        (importCount: unknown, lastRunError: string | null) => {
            onRunComplete(config.id, {
                dataUpdatedThrough: importCount ? range.endTime : undefined,
                lastRunError,
            });
        },
        [onRunComplete, config.id, range.endTime],
    );

    if (confirmed && config.dataset && config.dataElement) {
        return (
            <ImportModal
                dataset={config.dataset}
                period={config.dataset.period ? null : periodForExtract}
                features={features}
                dataElement={config.dataElement as { id: string; displayName: string }}
                onClose={onClose}
                onImportDone={handleImportDone}
            />
        );
    }

    const periodTypeName = getPeriodTypes().find(pt => pt.id === config.periodType)?.name?.toLowerCase() ?? config.periodType;

    return (
        <Modal onClose={onClose} position="middle">
            <ModalTitle>
                {i18n.t('Import "{{name}}"', { name: config.name, nsSeparator: ';' })}
            </ModalTitle>
            <ModalContent>
                <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 16px', marginBottom: '16px' }}>
                    <dt style={{ fontWeight: 500 }}>{i18n.t('Data source')}</dt>
                    <dd>{config.dataset?.name ?? config.datasetName}</dd>
                    <dt style={{ fontWeight: 500 }}>{i18n.t('DHIS2 data element')}</dt>
                    <dd>{config.dataElement?.displayName}</dd>
                    <dt style={{ fontWeight: 500 }}>{i18n.t('Organisation units')}</dt>
                    <dd>
                        {config.featureCount}
                        {' '}
                        {i18n.t('with geometry')}
                    </dd>
                    {config.timeZone && (
                        <>
                            <dt style={{ fontWeight: 500 }}>{i18n.t('Time zone')}</dt>
                            <dd>{config.timeZone}</dd>
                        </>
                    )}
                    <dt style={{ fontWeight: 500 }}>
                        {i18n.t('{{periodType}} date range', { periodType: periodTypeName })}
                    </dt>
                    <dd>
                        {editing ? (
                            <div>
                                <DateRangePicker
                                    period={{ startTime: range.startTime, endTime: range.endTime, periodType: config.periodType as ImportPeriod['periodType'], calendar: 'gregory' }}
                                    onChange={handleRangeChange}
                                />
                                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                    <Button small secondary onClick={() => setEditing(false)} disabled={rangeInvalid}>{i18n.t('Done')}</Button>
                                    <Button
                                        small
                                        onClick={() => {
                                            setOverrideRange(null);
                                            setEditing(false);
                                        }}
                                    >
                                        {i18n.t('Use default range')}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>{rangeDisplayText}</span>
                                <Button
                                    small
                                    secondary
                                    onClick={() => {
                                        if (!overrideRange) setOverrideRange({ startTime: range.startTime, endTime: range.endTime });
                                        setEditing(true);
                                    }}
                                >
                                    {i18n.t('Change')}
                                </Button>
                            </div>
                        )}
                    </dd>
                </dl>
                {featuresError && (
                    <NoticeBox error title={i18n.t('Failed to load org unit geometries')}>
                        {(featuresError as { message?: string }).message}
                    </NoticeBox>
                )}
                {featuresLoading && (
                    <p>
                        {i18n.t('Loading org unit geometries...')}
                        {' '}
                        <CircularLoader small />
                    </p>
                )}
                {!featuresLoading && !featuresError && features.length === 0 && (
                    <NoticeBox warning title={i18n.t('No org unit geometries found')}>
                        {i18n.t('None of the selected organisation units have boundaries stored in DHIS2.')}
                    </NoticeBox>
                )}
                {exceedsLimit && (
                    <NoticeBox warning>
                        {i18n.t('Range exceeds the {{max}}-value limit. Reduce the date range.', {
                            max: MAX_VALUES.toLocaleString(),
                            nsSeparator: ';',
                        })}
                    </NoticeBox>
                )}
            </ModalContent>
            <ModalActions>
                <ButtonStrip end>
                    <Button onClick={onClose}>{i18n.t('Cancel')}</Button>
                    <Button
                        primary
                        disabled={exceedsLimit || rangeInvalid || featuresLoading || !!featuresError || features.length === 0}
                        onClick={() => setConfirmed(true)}
                    >
                        {i18n.t('Start import')}
                    </Button>
                </ButtonStrip>
            </ModalActions>
        </Modal>
    );
};

export default RunImportModal;
