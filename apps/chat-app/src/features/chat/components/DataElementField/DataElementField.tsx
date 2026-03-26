import { useState } from 'react';
import {
    Button,
    InputField,
    SingleSelectField,
    SingleSelectOption,
    TextAreaField,
} from '@dhis2/ui';
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

export interface CoordinateParts {
    latitude: string;
    longitude: string;
}

const normalizeCoordinatePart = (value: string) => value.trim();

export const parseCoordinateValue = (value: string): CoordinateParts => {
    const raw = value.trim();

    if (!raw) {
        return { latitude: '', longitude: '' };
    }

    if (raw.startsWith('{')) {
        try {
            const parsed = JSON.parse(raw) as
                | { latitude?: string | number; longitude?: string | number }
                | { coordinates?: [number | string, number | string] };

            if ('coordinates' in parsed && Array.isArray(parsed.coordinates)) {
                return {
                    longitude: String(parsed.coordinates[0] ?? '').trim(),
                    latitude: String(parsed.coordinates[1] ?? '').trim(),
                };
            }

            if ('latitude' in parsed || 'longitude' in parsed) {
                return {
                    latitude: String(parsed.latitude ?? '').trim(),
                    longitude: String(parsed.longitude ?? '').trim(),
                };
            }

            return {
                latitude: '',
                longitude: '',
            };
        } catch {
            return { latitude: '', longitude: '' };
        }
    }

    const cleaned = raw.replace(/^\[/, '').replace(/\]$/, '');
    const [longitude = '', latitude = ''] = cleaned.split(',', 2);

    return {
        latitude: latitude.trim(),
        longitude: longitude.trim(),
    };
};

export const serializeCoordinateValue = (latitude: string, longitude: string) => {
    const normalizedLatitude = normalizeCoordinatePart(latitude);
    const normalizedLongitude = normalizeCoordinatePart(longitude);

    if (!normalizedLatitude && !normalizedLongitude) {
        return '';
    }

    return `[${normalizedLongitude},${normalizedLatitude}]`;
};

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

export const CoordinateField = ({
    dataElementId,
    label,
    value,
    required,
    error,
    onChange,
    onBlur,
    disabled,
}: FieldProps) => {
    const { latitude, longitude } = parseCoordinateValue(value);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [isLocating, setIsLocating] = useState(false);

    const updateCoordinate = (nextLatitude: string, nextLongitude: string) => {
        onChange(dataElementId, serializeCoordinateValue(nextLatitude, nextLongitude));
    };

    const handleUseCurrentLocation = () => {
        if (!navigator.geolocation) {
            setLocationError(i18n.t('Current location is not available in this browser'));
            return;
        }

        setIsLocating(true);
        setLocationError(null);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                updateCoordinate(
                    String(position.coords.latitude),
                    String(position.coords.longitude),
                );
                setIsLocating(false);
            },
            () => {
                setLocationError(i18n.t('Could not retrieve your current location'));
                setIsLocating(false);
            },
        );
    };

    return (
        <div>
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                }}
            >
                <div
                    style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#212934',
                    }}
                >
                    {label}
                    {required && ' *'}
                </div>

                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(180px, 220px) repeat(2, minmax(0, 1fr))',
                        gap: 12,
                        alignItems: 'end',
                    }}
                >
                    <Button
                        secondary
                        disabled={disabled || isLocating}
                        onClick={handleUseCurrentLocation}
                        style={{
                            minHeight: 40,
                            justifyContent: 'center',
                        }}
                    >
                        {isLocating
                            ? i18n.t('Detecting location...')
                            : i18n.t('Use current location')}
                    </Button>
                    <InputField
                        label={i18n.t('Latitude')}
                        value={latitude}
                        type="number"
                        step="any"
                        required={required}
                        error={!!error}
                        disabled={disabled}
                        onChange={({ value: nextLatitude }) =>
                            updateCoordinate(nextLatitude ?? '', longitude)}
                        onBlur={() => onBlur?.(dataElementId)}
                    />
                    <InputField
                        label={i18n.t('Longitude')}
                        value={longitude}
                        type="number"
                        step="any"
                        required={required}
                        error={!!error || !!locationError}
                        validationText={error || locationError || undefined}
                        disabled={disabled}
                        onChange={({ value: nextLongitude }) =>
                            updateCoordinate(latitude, nextLongitude ?? '')}
                        onBlur={() => onBlur?.(dataElementId)}
                    />
                </div>

                {(error || locationError) && (
                    <div
                        style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#d14343',
                        }}
                    >
                        {error || locationError}
                    </div>
                )}
            </div>
        </div>
    );
};

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

            case 'COORDINATE':
                field = <CoordinateField {...props} />;
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
