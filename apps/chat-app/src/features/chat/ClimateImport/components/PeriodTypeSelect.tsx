import i18n from '@dhis2/d2-i18n';
import { Field, Radio } from '@dhis2/ui';
import { useEffect } from 'react';
import { getPeriodTypes, DAILY, WEEKLY, MONTHLY, type PeriodType } from '../utils/time';

interface PeriodTypeSelectProps {
    periodType: PeriodType;
    supportedPeriodTypes?: PeriodType[];
    onChange: (value: PeriodType) => void;
}

const defaultPeriodTypes = new Set<PeriodType>([DAILY, WEEKLY, MONTHLY]);

const PeriodTypeSelect = ({ periodType, supportedPeriodTypes, onChange }: PeriodTypeSelectProps) => {
    const supportedObjects = supportedPeriodTypes
        ? getPeriodTypes().filter(type => supportedPeriodTypes.includes(type.id))
        : getPeriodTypes().filter(type => defaultPeriodTypes.has(type.id));

    const isCurrentSupported = supportedObjects.some(t => t.id === periodType);
    const selectedPeriodType = isCurrentSupported ? periodType : supportedObjects[0]?.id;

    useEffect(() => {
        if (!isCurrentSupported && supportedObjects.length > 0) {
            onChange(supportedObjects[0].id);
        }
    }, [isCurrentSupported, supportedObjects, onChange]);

    if (supportedObjects.length === 1) {
        return (
            <p style={{ marginTop: '8px', color: 'var(--colors-grey700)', fontSize: '14px' }}>
                {i18n.t('Period type: {{periodType}}', {
                    periodType: supportedObjects[0].name,
                    nsSeparator: ';',
                })}
            </p>
        );
    }

    return (
        <Field label={i18n.t('Period type')} dataTest="period-type-selector">
            <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                {supportedObjects.map(type => (
                    <Radio
                        key={type.id}
                        name="periodType"
                        value={type.id}
                        label={type.name}
                        checked={selectedPeriodType === type.id}
                        onChange={({ value }: { value?: string }) => { if (value) onChange(value as PeriodType); }}
                    />
                ))}
            </div>
        </Field>
    );
};

export default PeriodTypeSelect;
