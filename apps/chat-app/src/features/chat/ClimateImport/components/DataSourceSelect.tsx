import i18n from '@dhis2/d2-i18n';
import { SingleSelectField, SingleSelectOption } from '@dhis2/ui';
import { useMemo } from 'react';
import type { DatasetMapping } from '../hooks/useClimateDatasetMappings';
import getEEDatasets, { type ClimateDataset } from '../data/climateDatasets';

interface DataSourceSelectProps {
    selected: ClimateDataset | undefined;
    onChange: (dataset: ClimateDataset) => void;
    mappings?: DatasetMapping[];
}

const DataSourceSelect = ({ selected, onChange, mappings }: DataSourceSelectProps) => {
    const allDatasets = useMemo(() => getEEDatasets(), []);
    const datasets = useMemo(
        () =>
            mappings && mappings.length > 0
                ? allDatasets.filter(ds => mappings.some(m => m.datasetId === ds.id))
                : allDatasets,
        [allDatasets, mappings],
    );

    const selectedId = selected && datasets.some(ds => ds.id === selected.id) ? selected.id : undefined;

    return (
        <>
            <h2>{i18n.t('1. Select data source')}</h2>
            <SingleSelectField
                label={i18n.t('Climate data source')}
                selected={selectedId}
                onChange={({ selected: id }) => {
                    const ds = datasets.find(d => d.id === id);
                    if (ds) onChange(ds);
                }}
                filterable
                noMatchText={i18n.t('No match found')}
                dataTest="data-source-select"
            >
                {datasets.map(ds => (
                    <SingleSelectOption
                        key={ds.id}
                        value={ds.id}
                        label={ds.name}
                    />
                ))}
            </SingleSelectField>
            {selectedId && selected?.description && (
                <p style={{ color: 'var(--colors-grey700)', fontSize: '14px', marginTop: '4px' }}>
                    {selected.description}
                </p>
            )}
        </>
    );
};

export default DataSourceSelect;
