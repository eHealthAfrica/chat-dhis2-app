import i18n from '@dhis2/d2-i18n';
import { CalendarInput } from '@dhis2/ui';
import { useState } from 'react';
import type { ClimateDataset } from '../data/climateDatasets';
import type { ImportPeriod } from '../utils/time';
import { YEARLY, getDateStringFromIsoDate } from '../utils/time';
import useUserLocale from '../hooks/useUserLocale';

interface DateRangePickerProps {
    period: ImportPeriod;
    dataset?: Partial<ClimateDataset>;
    onChange: (period: ImportPeriod) => void;
}

const DateRangePicker = ({ period, dataset, onChange }: DateRangePickerProps) => {
    const { locale: userLocale } = useUserLocale();
    const locale = (period as ImportPeriod & { locale?: string }).locale ?? userLocale ?? 'en';

    const [startDateError, setStartDateError] = useState<string | null>(null);
    const [endDateError, setEndDateError] = useState<string | null>(null);

    const { startTime, endTime, periodType, calendar } = period;

    const periodRange = dataset?.periodRange;

    const isYearly = periodType === YEARLY;

    let errorMessage: string | null = null;
    if (startDateError && endDateError) {
        errorMessage = i18n.t('Start and end date are not within the valid range.');
    } else if (startDateError) {
        errorMessage = i18n.t('Start date is not within the valid range.');
    } else if (endDateError) {
        errorMessage = i18n.t('End date is not within the valid range.');
    } else if (!startDateError && !endDateError && startTime && endTime && new Date(startTime) > new Date(endTime)) {
        errorMessage = i18n.t('Start date must be on or before the end date.');
    }

    if (isYearly) {
        const startYear = Number.parseInt(startTime, 10) || new Date().getFullYear() - 2;
        const endYear = Number.parseInt(endTime, 10) || new Date().getFullYear() - 1;
        const minYear = Number.parseInt(periodRange?.start ?? '1980', 10);
        const maxYear = Number.parseInt(periodRange?.end ?? String(new Date().getFullYear()), 10);

        return (
            <div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <label style={{ fontSize: '14px' }}>
                        {i18n.t('Start year')}
                        <input
                            type="number"
                            min={minYear}
                            max={maxYear}
                            value={startYear}
                            onChange={e => onChange({ ...period, startTime: e.target.value })}
                            style={{ display: 'block', marginTop: '4px', padding: '6px', border: '1px solid var(--colors-grey400)', borderRadius: '3px', width: '100px' }}
                        />
                    </label>
                    <span style={{ marginTop: '22px' }}>–</span>
                    <label style={{ fontSize: '14px' }}>
                        {i18n.t('End year')}
                        <input
                            type="number"
                            min={minYear}
                            max={maxYear}
                            value={endYear}
                            onChange={e => onChange({ ...period, endTime: e.target.value })}
                            style={{ display: 'block', marginTop: '4px', padding: '6px', border: '1px solid var(--colors-grey400)', borderRadius: '3px', width: '100px' }}
                        />
                    </label>
                </div>
                {periodRange && (
                    <p style={{ fontSize: '13px', color: 'var(--colors-grey700)', marginTop: '4px' }}>
                        {i18n.t('Valid range: {{startDate}} – {{endDate}}', {
                            startDate: getDateStringFromIsoDate({ date: periodRange.start, calendar, locale }),
                            endDate: getDateStringFromIsoDate({ date: periodRange.end, calendar, locale }),
                            nsSeparator: ';',
                        })}
                    </p>
                )}
                {errorMessage && <p style={{ color: 'var(--colors-red500)', fontSize: '13px' }}>{errorMessage}</p>}
            </div>
        );
    }

    return (
        <>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <CalendarInput
                    label={i18n.t('Start date')}
                    date={startTime}

                    calendar={calendar as any}
                    locale={locale}
                    onDateSelect={(payload) => {
                        if (!payload) return;
                        const { calendarDateString, validation } = payload as { calendarDateString: string; validation: { valid: boolean; validationText?: string } };
                        setStartDateError(validation.valid ? null : (validation.validationText ?? 'Invalid'));
                        onChange({ ...period, startTime: calendarDateString });
                    }}
                    dataTest="start-date-input"
                />
                <span style={{ marginTop: '28px' }}>–</span>
                <CalendarInput
                    label={i18n.t('End date')}
                    date={endTime}

                    calendar={calendar as any}
                    locale={locale}
                    onDateSelect={(payload) => {
                        if (!payload) return;
                        const { calendarDateString, validation } = payload as { calendarDateString: string; validation: { valid: boolean; validationText?: string } };
                        setEndDateError(validation.valid ? null : (validation.validationText ?? 'Invalid'));
                        onChange({ ...period, endTime: calendarDateString });
                    }}
                    dataTest="end-date-input"
                />
            </div>
            {periodRange && (
                <p style={{ fontSize: '13px', color: 'var(--colors-grey700)', marginTop: '4px' }}>
                    {i18n.t('Valid range: {{startDate}} – {{endDate}}', {
                        startDate: getDateStringFromIsoDate({ date: periodRange.start, calendar, locale }),
                        endDate: getDateStringFromIsoDate({ date: periodRange.end, calendar, locale }),
                        nsSeparator: ';',
                    })}
                </p>
            )}
            {errorMessage && <p style={{ color: 'var(--colors-red500)', fontSize: '13px' }}>{errorMessage}</p>}
        </>
    );
};

export default DateRangePicker;
