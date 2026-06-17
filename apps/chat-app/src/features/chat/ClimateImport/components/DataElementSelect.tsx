import { useDataQuery } from '@dhis2/app-runtime';
import i18n from '@dhis2/d2-i18n';
import { SingleSelectField, SingleSelectOption } from '@dhis2/ui';
import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';

interface DataElement {
    id: string;
    code?: string;
    displayName: string;
}

interface DataSet {
    id: string;
    code?: string;
    displayName: string;
    periodType: string;
    dataSetElements: Array<{ dataElement: DataElement }>;
}

interface DataElementSelectProps {
    selected: DataElement | undefined;
    onChange: (de: DataElement | undefined) => void;
    datasetCode?: string;
    periodType: string;
}

const QUERY = {
    dataSets: {
        resource: 'dataSets',
        params: {
            paging: false,
            fields: 'id,code,displayName,dataSetElements[dataElement[id,code,displayName]],periodType',
        },
    },
};

const DEFAULT_DATASETS: DataSet[] = [];

const DataElementSelect = ({ selected, onChange, datasetCode, periodType }: DataElementSelectProps) => {
    const { loading, error, data } = useDataQuery(QUERY);

    const uniqueDataElements = useMemo(() => {
        const dataSets: DataSet[] = (data as { dataSets?: { dataSets?: DataSet[] } } | undefined)?.dataSets?.dataSets ?? DEFAULT_DATASETS;
        const filtered = periodType
            ? dataSets.filter(ds => ds.periodType?.toLowerCase() === periodType.toLowerCase())
            : dataSets;

        const all = filtered.flatMap(ds => ds.dataSetElements);

        return Array.from(
            all.reduce((map, d) => map.set(d.dataElement.id, d.dataElement), new Map<string, DataElement>()).values(),
        ).sort((a, b) => a.displayName.localeCompare(b.displayName));
    }, [data, periodType]);

    const displayElements = useMemo(() => {
        if (!selected || uniqueDataElements.some(de => de.id === selected.id)) {
            return uniqueDataElements;
        }
        return [selected, ...uniqueDataElements];
    }, [uniqueDataElements, selected]);

    useEffect(() => {
        if (uniqueDataElements.length && datasetCode && !selected) {
            const matches = uniqueDataElements.filter(de => de.code?.startsWith(datasetCode));
            if (matches.length === 1) {
                onChange(matches[0]);
            }
        }
    }, [uniqueDataElements, onChange, datasetCode, selected]);

    if (loading) {
        return <p>{i18n.t('Loading data elements...')}</p>;
    }

    if (error) {
        return <p>{i18n.t('Error loading data elements: {{error}}', { error: (error as { message?: string }).message, nsSeparator: ';' })}</p>;
    }

    const periodTypeSuffix = periodType ? ` (${periodType.toLowerCase()})` : '';

    const emptyMessage = !datasetCode
        ? i18n.t('No data elements found. Select a dataset first.')
        : i18n.t('No data elements found for the selected period type.');

    return (
        <div>
            <SingleSelectField
                label={i18n.t('Showing data elements from {{periodType}} data sets', {
                    periodType: periodType.toLowerCase(),
                })}
                filterable
                noMatchText={i18n.t('No match found')}
                selected={selected?.id}
                onChange={({ selected: id }: { selected: string }) =>
                    onChange(displayElements.find(d => d.id === id))}
                empty={emptyMessage}
                dataTest="data-element-select"
            >
                {displayElements.map(d => (
                    <SingleSelectOption
                        key={d.id}
                        value={d.id}
                        label={`${d.displayName}${periodTypeSuffix}`}
                    />
                ))}
            </SingleSelectField>
            <p style={{ fontSize: '13px', color: 'var(--colors-grey700)', marginTop: '4px' }}>
                {i18n.t('Need help setting up data elements? Check the ')}
                {' '}
                <Link to="/chat/settings/climate-setup">{i18n.t('setup guide')}</Link>
            </p>
        </div>
    );
};

export default DataElementSelect;
