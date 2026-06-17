import i18n from '@dhis2/d2-i18n';
import type { ClimateDataset } from '../data/climateDatasets';
import type { ImportPeriod } from '../utils/time';
import DateRangePicker from './DateRangePicker';

interface PeriodSectionProps {
    period: ImportPeriod;
    dataset?: ClimateDataset;
    onChange: (period: ImportPeriod) => void;
}

const PeriodSection = ({ period, dataset, onChange }: PeriodSectionProps) => {
    const title = i18n.t('4. Import date range');

    if (dataset?.period) {
        return (
            <>
                <h2>{title}</h2>
                <p>
                    {i18n.t(
                        'The data will be assigned a yearly period type matching the year it was collected: {{datasetPeriod}}',
                        { datasetPeriod: dataset.period, nsSeparator: ';' },
                    )}
                </p>
            </>
        );
    }

    return (
        <>
            <h2>{title}</h2>
            <DateRangePicker
                key={dataset?.id ?? 'default'}
                period={period}
                dataset={dataset}
                onChange={onChange}
            />
        </>
    );
};

export default PeriodSection;
