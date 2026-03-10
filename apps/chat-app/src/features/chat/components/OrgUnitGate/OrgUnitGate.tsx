import { useState } from 'react';
import { Button, CircularLoader } from '@dhis2/ui';
import i18n from '@dhis2/d2-i18n';
import { useOrgUnitRoots } from '../../../../hooks/useOrgUnitRoots';
import { useOrgUnitDetails } from '../../hooks/useOrgUnitDetails';
import { OrganisationUnitSelector, OrganisationUnit, SelectionChangeEvent } from '../../../../components/OrganisationUnitSelector';
import styles from '../../ChatDataCapture/CaptureForm.module.css';

export interface SelectedOrgUnit {
    id: string;
    name: string;
    path: string;
    code?: string;
}

interface OrgUnitGateProps {
    initial?: SelectedOrgUnit | null;
    onConfirm: (orgUnit: SelectedOrgUnit) => void;
}

/* ── Selected org unit card ── */
export const OrgUnitCard = ({ id, name }: { id: string; name: string }) => {
    const { details, isLoading } = useOrgUnitDetails(id);

    return (
        <div className={styles.ouCard}>
            <div className={styles.ouCardIcon}>🏥</div>
            <div className={styles.ouCardBody}>
                <span className={styles.ouCardName}>{details?.displayName ?? name}</span>
                {isLoading && <CircularLoader extrasmall />}
                {details?.code && (
                    <span className={styles.ouCardCode}>{details.code}</span>
                )}
                {details?.level && (
                    <span className={styles.ouCardLevel}>
                        {i18n.t('Level {{level}}', { level: details.level })}
                    </span>
                )}
            </div>
            <div className={styles.ouCardCheck}>✓</div>
        </div>
    );
};

const OrgUnitGate = ({ initial, onConfirm }: OrgUnitGateProps) => {
    const { roots, isLoading } = useOrgUnitRoots();

    const [selected, setSelected] = useState<OrganisationUnit[]>(
        initial ? [{ id: initial.id, name: initial.name, path: initial.path }] : [],
    );

    const handleSelect = (e: SelectionChangeEvent) => {
        const plain = e.items.filter(ou => ou.path);
        setSelected(plain.length > 1 ? [plain[plain.length - 1]] : plain);
    };

    const selectedOu = selected[0] ?? null;

    return (
        <div className={styles.orgUnitGate}>
            <p className={styles.gateLabel}>{i18n.t('Organisation unit')}</p>
            <p className={styles.gateHint}>
                {i18n.t('Select the facility or area for this assessment. This cannot be changed once you proceed.')}
            </p>

            <div className={styles.orgUnitSelectorWrap}>
                {!isLoading && roots.length > 0 && (
                    <OrganisationUnitSelector
                        roots={roots.map(r => r.id)}
                        selected={selected}
                        onSelect={handleSelect}
                        hideGroupSelect
                        hideLevelSelect
                        hideUserOrgUnits
                        i18n={{
                            t: (key: string, opts?: Record<string, any>) => {
                                if (!opts) return key;
                                let str = key;
                                if (opts.count !== undefined) {
                                    const plural = opts.count !== 1
                                        ? (opts.defaultValue_plural ?? opts.defaultValue ?? key)
                                        : (opts.defaultValue ?? key);
                                    str = String(plural);
                                }
                                return str.replace(/\{\{(\w+)\}\}/g, (_, k) =>
                                    opts[k] !== undefined ? String(opts[k]) : `{{${k}}}`,
                                );
                            },
                        }}
                    />
                )}
            </div>

            {selectedOu && (
                <OrgUnitCard id={selectedOu.id} name={selectedOu.name ?? selectedOu.displayName ?? ''} />
            )}

            <Button
                primary
                disabled={!selectedOu}
                onClick={() =>
                    selectedOu && onConfirm({
                        id: selectedOu.id,
                        name: selectedOu.name ?? selectedOu.displayName ?? selectedOu.id,
                        path: selectedOu.path ?? '',
                    })}
            >
                {i18n.t('Proceed to form')}
            </Button>
        </div>
    );
};

export default OrgUnitGate;
