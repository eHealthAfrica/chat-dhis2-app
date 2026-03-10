import { useState } from 'react';
import { InputField, TextAreaField, SingleSelectField, SingleSelectOption } from '@dhis2/ui';
import i18n from '@dhis2/d2-i18n';

/* ─────────────────────────────────────────────────────────────
   Shared props
───────────────────────────────────────────────────────────── */
export interface FieldProps {
    dataElementId: string;
    label: string;
    value: string;
    required: boolean;
    error?: string;
    onChange: (dataElementId: string, value: string) => void;
    onBlur?: (dataElementId: string) => void;
    disabled?: boolean;
}

export interface Option {
    code: string;
    name: string;
}

/* ─────────────────────────────────────────────────────────────
   Field variants
───────────────────────────────────────────────────────────── */
export const TextField = ({ dataElementId, label, value, required, error, onChange, onBlur, disabled }: FieldProps) => (
    <InputField
        label={label}
        value={value}
        required={required}
        error={!!error}
        validationText={error}
        disabled={disabled}
        onChange={({ value: v }) => onChange(dataElementId, v ?? '')}
        onBlur={() => onBlur?.(dataElementId)}
    />
);

export const LongTextField = ({ dataElementId, label, value, required, error, onChange, onBlur, disabled }: FieldProps) => (
    <TextAreaField
        label={label}
        value={value}
        required={required}
        error={!!error}
        validationText={error}
        disabled={disabled}
        rows={3}
        onChange={({ value: v }) => onChange(dataElementId, v ?? '')}
        onBlur={() => onBlur?.(dataElementId)}
    />
);

interface NumberFieldProps extends FieldProps {
    min?: number;
    max?: number;
    step?: number;
}

export const NumberField = ({ dataElementId, label, value, required, error, onChange, onBlur, disabled, min, max, step }: NumberFieldProps) => (
    <InputField
        label={label}
        value={value}
        type="number"
        min={min !== undefined ? String(min) : undefined}
        max={max !== undefined ? String(max) : undefined}
        step={step !== undefined ? String(step) : undefined}
        required={required}
        error={!!error}
        validationText={error}
        disabled={disabled}
        onChange={({ value: v }) => onChange(dataElementId, v ?? '')}
        onBlur={() => onBlur?.(dataElementId)}
    />
);

export const DateField = ({ dataElementId, label, value, required, error, onChange, onBlur, disabled }: FieldProps) => (
    <InputField
        label={label}
        value={value}
        type="date"
        required={required}
        error={!!error}
        validationText={error}
        disabled={disabled}
        onChange={({ value: v }) => onChange(dataElementId, v ?? '')}
        onBlur={() => onBlur?.(dataElementId)}
    />
);

export const DateTimeField = ({ dataElementId, label, value, required, error, onChange, onBlur, disabled }: FieldProps) => (
    <InputField
        label={label}
        value={value}
        type="datetime-local"
        required={required}
        error={!!error}
        validationText={error}
        disabled={disabled}
        onChange={({ value: v }) => onChange(dataElementId, v ?? '')}
        onBlur={() => onBlur?.(dataElementId)}
    />
);

export const BooleanField = ({ dataElementId, label, value, required, error, onChange, disabled }: FieldProps) => (
    <SingleSelectField
        label={label}
        selected={value}
        required={required}
        error={!!error}
        validationText={error}
        disabled={disabled}
        onChange={({ selected }) => onChange(dataElementId, selected ?? '')}
    >
        <SingleSelectOption value="true" label={i18n.t('Yes')} />
        <SingleSelectOption value="false" label={i18n.t('No')} />
    </SingleSelectField>
);

// TRUE_ONLY — can only be confirmed, not negated
export const TrueOnlyField = ({ dataElementId, label, value, required, error, onChange, disabled }: FieldProps) => (
    <SingleSelectField
        label={label}
        selected={value}
        required={required}
        error={!!error}
        validationText={error}
        disabled={disabled}
        onChange={({ selected }) => onChange(dataElementId, selected ?? '')}
    >
        <SingleSelectOption value="true" label={i18n.t('Yes')} />
    </SingleSelectField>
);

export interface OptionSetFieldProps extends FieldProps {
    options: Option[];
}

export const OptionSetField = ({ dataElementId, label, value, required, error, onChange, disabled, options }: OptionSetFieldProps) => (
    <SingleSelectField
        label={label}
        selected={value}
        required={required}
        error={!!error}
        validationText={error}
        disabled={disabled}
        onChange={({ selected }) => onChange(dataElementId, selected ?? '')}
    >
        {options.map(opt => (
            <SingleSelectOption key={opt.code} value={opt.code} label={opt.name} />
        ))}
    </SingleSelectField>
);

/* ─────────────────────────────────────────────────────────────
   Field resolver
───────────────────────────────────────────────────────────── */
export interface DataElementMeta {
    id: string;
    name: string;
    valueType: string;
    compulsory: boolean;
    description?: string;
    optionSet?: { options: Option[] };
}

export const DataElementField = ({
    meta,
    value,
    error,
    onChange,
    onBlur,
    disabled,
}: {
    meta: DataElementMeta;
    value: string;
    error?: string;
    onChange: (id: string, value: string) => void;
    onBlur?: (id: string) => void;
    disabled?: boolean;
}) => {
    const props: FieldProps = {
        dataElementId: meta.id,
        label: meta.name,
        value,
        required: meta.compulsory,
        error,
        onChange,
        onBlur,
        disabled,
    };

    let field: React.ReactNode;

    // Option set always wins regardless of valueType
    if (meta.optionSet?.options?.length) {
        field = <OptionSetField {...props} options={meta.optionSet.options} />;
    } else {
        switch (meta.valueType) {
            case 'TEXT':
            case 'PHONE_NUMBER':
            case 'EMAIL':
            case 'URL':
            case 'USERNAME':
                field = <TextField {...props} />;
                break;

            case 'LONG_TEXT':
            case 'LETTER':
                field = <LongTextField {...props} />;
                break;

            case 'NUMBER':
            case 'UNIT_INTERVAL':
                field = <NumberField {...props} step={0.01} />;
                break;

            case 'INTEGER':
                field = <NumberField {...props} step={1} />;
                break;

            case 'INTEGER_POSITIVE':
                field = <NumberField {...props} min={1} step={1} />;
                break;

            case 'INTEGER_NEGATIVE':
                field = <NumberField {...props} max={-1} step={1} />;
                break;

            case 'INTEGER_ZERO_OR_POSITIVE':
                field = <NumberField {...props} min={0} step={1} />;
                break;

            case 'PERCENTAGE':
                field = <NumberField {...props} min={0} max={100} step={1} />;
                break;

            case 'DATE':
                field = <DateField {...props} />;
                break;

            case 'DATETIME':
                field = <DateTimeField {...props} />;
                break;

            case 'BOOLEAN':
                field = <BooleanField {...props} />;
                break;

            case 'TRUE_ONLY':
                field = <TrueOnlyField {...props} />;
                break;

            default:
                field = <TextField {...props} />;
        }
    }

    const [descOpen, setDescOpen] = useState(false);

    return (
        <div>
            {field}
            {meta.description && (
                <div style={{ marginTop: 2 }}>
                    <button
                        type="button"
                        onClick={() => setDescOpen(!descOpen)}
                        style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            fontSize: 12,
                            color: '#4a6a8a',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                        }}
                    >
                        <span style={{
                            display: 'inline-block',
                            transition: 'transform 0.2s',
                            transform: descOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                        }}
                        >
                            ▸
                        </span>
                        {descOpen ? i18n.t('Hide description') : i18n.t('Show description')}
                    </button>
                    {descOpen && (
                        <div
                            style={{
                                fontSize: 12,
                                color: '#6e7a8a',
                                marginTop: 4,
                                paddingLeft: 12,
                                borderLeft: '2px solid #e0e5ea',
                            }}
                            dangerouslySetInnerHTML={{ __html: meta.description }}
                        />
                    )}
                </div>
            )}
        </div>
    );
};
