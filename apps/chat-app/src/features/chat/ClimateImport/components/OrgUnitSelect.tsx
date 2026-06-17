import i18n from '@dhis2/d2-i18n';
import { CircularLoader, Help } from '@dhis2/ui';
import OrganisationUnitSelector, { type OrganisationUnit } from '../../../../components/OrganisationUnitSelector/OrganisationUnitSelector';
import { useOrgUnitRoots } from '../../../../hooks/useOrgUnitRoots';

interface OrgUnitSelectProps {
    selected: OrganisationUnit[];
    onChange: (items: OrganisationUnit[]) => void;
    featureCount: number;
    featuresLoading: boolean;
    featuresError?: unknown;
}

const OrgUnitSelect = ({
    selected,
    onChange,
    featureCount,
    featuresLoading,
    featuresError,
}: OrgUnitSelectProps) => {
    const { roots, isLoading, error } = useOrgUnitRoots();

    if (error) {
        return <Help error>{(error as { message?: string }).message ?? i18n.t('Failed to load organisation units')}</Help>;
    }

    if (isLoading) {
        return <CircularLoader />;
    }

    const rootIds = roots.map(r => r.id);

    let warning: string | undefined;
    if (!featuresLoading) {
        if (featuresError) {
            warning = (featuresError as { message?: string }).message ?? i18n.t('Failed to load org unit geometries');
        } else if (selected.length > 0 && featureCount === 0) {
            warning = i18n.t('No org unit geometries found for the selected units');
        }
    }

    return (
        <>
            <h2>{i18n.t('3. Select organisation units')}</h2>
            <div data-test="org-units-selector">
                <OrganisationUnitSelector
                    roots={rootIds}
                    selected={selected}
                    onSelect={({ items }) => onChange(items)}
                    hideUserOrgUnits
                    warning={warning}
                />
            </div>
            {featuresLoading && (
                <p style={{ fontSize: '13px', color: 'var(--colors-grey600)' }}>
                    {i18n.t('Loading org unit geometries...')}
                </p>
            )}
            {!featuresLoading && !featuresError && featureCount > 0 && (
                <p style={{ fontSize: '13px', color: 'var(--colors-grey700)' }}>
                    {i18n.t('{{count}} organisation unit{{plural}} with geometry found', {
                        count: featureCount,
                        plural: featureCount === 1 ? '' : 's',
                        nsSeparator: ';',
                    })}
                </p>
            )}
        </>
    );
};

export default OrgUnitSelect;
