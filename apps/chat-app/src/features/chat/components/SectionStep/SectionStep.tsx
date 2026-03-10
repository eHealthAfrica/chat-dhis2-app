import { useState } from 'react';
import i18n from '@dhis2/d2-i18n';
import { DataElementField, DataElementMeta } from '../DataElementField';
import styles from '../../ChatDataCapture/CaptureForm.module.css';

export const validateField = (meta: DataElementMeta, value: string): string | undefined => {
    if (meta.compulsory && !value?.trim()) return i18n.t('This field is required');
    if (!value?.trim()) return undefined; // optional field, no further checks needed

    const n = Number(value);

    switch (meta.valueType) {
        case 'INTEGER':
            if (!Number.isInteger(n)) return i18n.t('Must be a whole number');
            break;
        case 'INTEGER_POSITIVE':
            if (!Number.isInteger(n) || n <= 0) return i18n.t('Must be a positive whole number');
            break;
        case 'INTEGER_NEGATIVE':
            if (!Number.isInteger(n) || n >= 0) return i18n.t('Must be a negative whole number');
            break;
        case 'INTEGER_ZERO_OR_POSITIVE':
            if (!Number.isInteger(n) || n < 0) return i18n.t('Must be zero or a positive whole number');
            break;
        case 'PERCENTAGE':
            if (isNaN(n) || n < 0 || n > 100) return i18n.t('Must be between 0 and 100');
            break;
        case 'NUMBER':
        case 'UNIT_INTERVAL':
            if (isNaN(n)) return i18n.t('Must be a number');
            break;
    }

    return undefined;
};

export const isSectionValid = (
    dataElements: DataElementMeta[],
    values: Record<string, string>,
): boolean =>
    dataElements.filter(de => de.compulsory).every(de => !!values[de.id]?.trim());

interface SectionStepProps {
    section: { id: string; name: string; dataElements: DataElementMeta[] };
    values: Record<string, string>;
    onChange: (id: string, value: string) => void;
    isValid: boolean;
}

const SectionStep = ({ section, values, onChange }: SectionStepProps) => {
    const [touched, setTouched] = useState<Set<string>>(new Set());

    const required = section.dataElements.filter(de => de.compulsory);
    const filled = required.filter(de => !!values[de.id]?.trim()).length;

    return (
        <div className={styles.sectionStep}>
            <p className={styles.sectionTitle}>{section.name}</p>
            {required.length > 0 && (
                <p className={styles.sectionProgress}>
                    {i18n.t('{{filled}} of {{total}} required fields completed', {
                        filled,
                        total: required.length,
                    })}
                </p>
            )}
            <div className={styles.fieldList}>
                {section.dataElements.map(meta => (
                    <DataElementField
                        key={meta.id}
                        meta={meta}
                        value={values[meta.id] ?? ''}
                        error={touched.has(meta.id) ? validateField(meta, values[meta.id] ?? '') : undefined}
                        onChange={onChange}
                        onBlur={id => setTouched(prev => new Set(prev).add(id))}
                    />
                ))}
            </div>
        </div>
    );
};

export default SectionStep;
