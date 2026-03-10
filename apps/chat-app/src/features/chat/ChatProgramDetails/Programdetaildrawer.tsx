import { useEffect, useState } from 'react';
import { Button, CircularLoader, NoticeBox, IconCross16 } from '@dhis2/ui';
import i18n from '@dhis2/d2-i18n';
import { Assessment } from '../ChatSettings/hooks/useAssessments';
import { useDhis2Program, Dhis2Program, Dhis2ProgramStage } from '../hooks/useDhis2Program';
import styles from './ProgramDetailDrawer.module.css';

/* ─────────────────────────────────────────────────────────────
   Tabs
───────────────────────────────────────────────────────────── */
type Tab = 'overview' | 'dataElements' | 'sections' | 'indicators';

/* ─────────────────────────────────────────────────────────────
   Small helpers
───────────────────────────────────────────────────────────── */
const InfoRow = ({
    label,
    value,
    mono = false,
}: {
    label: string;
    value: string;
    mono?: boolean;
}) => (
    <div className={styles.infoRow}>
        <span className={styles.infoLabel}>{label}</span>
        <span className={mono ? styles.infoMono : styles.infoValue}>{value || '—'}</span>
    </div>
);

/* ─────────────────────────────────────────────────────────────
   Overview tab
───────────────────────────────────────────────────────────── */
const OverviewTab = ({
    assessment,
    program,
}: {
    assessment: Assessment;
    program:    Dhis2Program;
}) => {
    const stage = program.programStages?.[0];
    return (
        <div>
            <div className={styles.section}>
                <h4 className={styles.sectionTitle}>{i18n.t('Program')}</h4>
                <div className={styles.infoGrid}>
                    <InfoRow label={i18n.t('Name')}         value={program.name} />
                    <InfoRow label={i18n.t('Short name')}   value={program.shortName} />
                    <InfoRow label={i18n.t('Code')}         value={program.code} mono />
                    <InfoRow label={i18n.t('Program ID')}   value={program.id} mono />
                    <InfoRow label={i18n.t('Program type')} value={program.programType} />
                    <InfoRow label={i18n.t('Status')}       value={assessment.status} />
                    <InfoRow
                        label={i18n.t('Saved')}
                        value={new Date(assessment.createdAt).toLocaleString()}
                    />
                </div>
            </div>

            {stage && (
                <div className={styles.section}>
                    <h4 className={styles.sectionTitle}>{i18n.t('Program Stage')}</h4>
                    <div className={styles.infoGrid}>
                        <InfoRow label={i18n.t('Stage name')} value={stage.name} />
                        <InfoRow label={i18n.t('Stage ID')}   value={stage.id} mono />
                        {stage.description && (
                            <InfoRow label={i18n.t('Description')} value={stage.description} />
                        )}
                        <InfoRow
                            label={i18n.t('Sections')}
                            value={String(stage.programStageSections?.length ?? 0)}
                        />
                        <InfoRow
                            label={i18n.t('Data elements')}
                            value={String(stage.programStageDataElements?.length ?? 0)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

/* ─────────────────────────────────────────────────────────────
   Data Elements tab
───────────────────────────────────────────────────────────── */
const DataElementsTab = ({ stage }: { stage: Dhis2ProgramStage | undefined }) => {
    const [query, setQuery] = useState('');

    const items = stage?.programStageDataElements ?? [];
    const q     = query.trim().toLowerCase();
    const rows  = !q
        ? items
        : items.filter(({ dataElement: de }) =>
                [de.code, de.name, de.shortName, de.valueType]
                    .join(' ')
                    .toLowerCase()
                    .includes(q),
            );

    if (items.length === 0) {
        return <p className={styles.emptyTable}>{i18n.t('No data elements found.')}</p>;
    }

    return (
        <div>
            <input
                className={styles.search}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={i18n.t('Search data elements…')}
            />
            <div className={styles.tScroll}>
                <table className={styles.t}>
                    <thead>
                        <tr>
                            <th style={{ width: 32 }}>#</th>
                            <th style={{ minWidth: 110 }}>{i18n.t('Code')}</th>
                            <th style={{ minWidth: 180 }}>{i18n.t('Name')}</th>
                            <th style={{ minWidth: 150 }}>{i18n.t('Short name')}</th>
                            <th style={{ width: 110 }}>{i18n.t('Value type')}</th>
                            <th style={{ width: 90 }}>{i18n.t('Compulsory')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(({ dataElement: de, compulsory }, idx) => (
                            <tr key={de.id}>
                                <td className={styles.tNum}>{idx + 1}</td>
                                <td className={styles.tMono}>{de.code || '—'}</td>
                                <td>
                                    <span className={styles.tName} title={de.name} style={{ maxWidth: 200 }}>
                                        {de.name}
                                    </span>
                                </td>
                                <td>
                                    <span className={styles.tSub} title={de.shortName} style={{ maxWidth: 170 }}>
                                        {de.shortName}
                                    </span>
                                </td>
                                <td>
                                    <span className={styles.vTag}>{de.valueType}</span>
                                </td>
                                <td>
                                    {compulsory
                                        ? <span className={styles.compulsoryTag}>{i18n.t('Yes')}</span>
                                        : <span className={styles.dash}>—</span>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────────────────────
   Sections tab
───────────────────────────────────────────────────────────── */
const SectionsTab = ({ stage }: { stage: Dhis2ProgramStage | undefined }) => {
    const sections = stage?.programStageSections ?? [];

    if (sections.length === 0) {
        return <p className={styles.emptyTable}>{i18n.t('No sections found.')}</p>;
    }

    const deMap = Object.fromEntries(
        (stage?.programStageDataElements ?? []).map(({ dataElement: de }) => [de.id, de.name]),
    );

    return (
        <div className={styles.tScroll}>
            <table className={styles.t}>
                <thead>
                    <tr>
                        <th style={{ width: 56, textAlign: 'center' }}>{i18n.t('Order')}</th>
                        <th>{i18n.t('Section name')}</th>
                        <th style={{ width: 90, textAlign: 'center' }}>{i18n.t('Elements')}</th>
                        <th>{i18n.t('Section ID')}</th>
                    </tr>
                </thead>
                <tbody>
                    {[...sections]
                        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                        .map(section => (
                            <tr key={section.id}>
                                <td style={{ textAlign: 'center' }}>
                                    <span className={styles.countBubble}>{section.sortOrder}</span>
                                </td>
                                <td>
                                    <span className={styles.tName} title={section.name} style={{ maxWidth: 240 }}>
                                        {section.name}
                                    </span>
                                    {section.dataElements?.length > 0 && (
                                        <span className={styles.tSub}>
                                            {section.dataElements
                                                .map(ref => deMap[ref.id] ?? ref.id)
                                                .slice(0, 3)
                                                .join(', ')}
                                            {section.dataElements.length > 3
                                                ? ` +${section.dataElements.length - 3}`
                                                : ''}
                                        </span>
                                    )}
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                    <span className={styles.countBubble}>
                                        {section.dataElements?.length ?? 0}
                                    </span>
                                </td>
                                <td className={styles.tMono}>{section.id}</td>
                            </tr>
                        ))}
                </tbody>
            </table>
        </div>
    );
};

/* ─────────────────────────────────────────────────────────────
   Indicators tab
───────────────────────────────────────────────────────────── */
const IndicatorsTab = ({ program }: { program: Dhis2Program }) => {
    const [query, setQuery] = useState('');

    const items = program.programIndicators ?? [];
    const q     = query.trim().toLowerCase();
    const rows  = !q
        ? items
        : items.filter(pi =>
                [pi.name, pi.analyticsType, pi.aggregationType, pi.filter ?? '']
                    .join(' ')
                    .toLowerCase()
                    .includes(q),
            );

    if (items.length === 0) {
        return <p className={styles.emptyTable}>{i18n.t('No program indicators found.')}</p>;
    }

    return (
        <div>
            <input
                className={styles.search}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={i18n.t('Search indicators…')}
            />
            <div className={styles.tScroll}>
                <table className={styles.t}>
                    <thead>
                        <tr>
                            <th style={{ width: 32 }}>#</th>
                            <th style={{ minWidth: 200 }}>{i18n.t('Name')}</th>
                            <th style={{ width: 140 }}>{i18n.t('Analytics type')}</th>
                            <th style={{ width: 130 }}>{i18n.t('Aggregation')}</th>
                            <th>{i18n.t('Filter')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((pi, idx) => (
                            <tr key={pi.id}>
                                <td className={styles.tNum}>{idx + 1}</td>
                                <td>
                                    <span className={styles.tName} title={pi.name} style={{ maxWidth: 240 }}>
                                        {pi.name}
                                    </span>
                                </td>
                                <td>
                                    <span className={styles.analyticsTag}>{pi.analyticsType}</span>
                                </td>
                                <td className={styles.tMono}>{pi.aggregationType}</td>
                                <td>
                                    {pi.filter
                                        ? <span className={styles.filterExpr} title={pi.filter}>{pi.filter}</span>
                                        : <span className={styles.dash}>—</span>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────────────────────
   Main drawer
───────────────────────────────────────────────────────────── */
interface ProgramDetailDrawerProps {
    assessment: Assessment | null;
    onClose:    () => void;
}

export const ProgramDetailDrawer = ({ assessment, onClose }: ProgramDetailDrawerProps) => {
    const [activeTab, setActiveTab] = useState<Tab>('overview');

    const { program, isLoading, isError, error, refetch } = useDhis2Program(
        assessment?.programId ?? null,
    );

    useEffect(() => {
        setActiveTab('overview');
    }, [assessment?.programId]);

    useEffect(() => {
        if (!assessment) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [assessment, onClose]);

    if (!assessment) return null;

    const stage = program?.programStages?.[0];

    const tabs: Array<{ key: Tab; label: string; count?: number }> = [
        { key: 'overview',     label: i18n.t('Overview') },
        { key: 'dataElements', label: i18n.t('Data Elements'), count: stage?.programStageDataElements?.length },
        { key: 'sections',     label: i18n.t('Sections'),      count: stage?.programStageSections?.length },
        { key: 'indicators',   label: i18n.t('Indicators'),    count: program?.programIndicators?.length },
    ];

    return (
        <>
            <div className={styles.overlay} onClick={onClose} aria-hidden />

            <div className={styles.drawer} role="dialog" aria-label={i18n.t('Program details')}>

                <div className={styles.header}>
                    <div className={styles.headerText}>
                        <h3 className={styles.headerName}>{assessment.name}</h3>
                        <div className={styles.headerMeta}>
                            <span className={styles.headerCode}>{assessment.code}</span>
                            <span
                                className={[
                                    styles.statusBadge,
                                    assessment.status === 'active'
                                        ? styles.statusActive
                                        : styles.statusInactive,
                                ].join(' ')}
                            >
                                {assessment.status}
                            </span>
                        </div>
                    </div>
                    <Button small secondary icon={<IconCross16 />} onClick={onClose}>
                        {i18n.t('Close')}
                    </Button>
                </div>

                <div className={styles.tabs}>
                    {tabs.map(({ key, label, count }) => (
                        <button
                            key={key}
                            className={[styles.tab, activeTab === key ? styles.tabActive : ''].join(' ')}
                            onClick={() => setActiveTab(key)}
                        >
                            {label}
                            {count !== undefined && (
                                <span className={styles.tabBadge}>{count}</span>
                            )}
                        </button>
                    ))}
                </div>

                <div className={styles.body}>
                    {isLoading && (
                        <div className={styles.centered}>
                            <CircularLoader small />
                            <span>{i18n.t('Loading program…')}</span>
                        </div>
                    )}

                    {isError && !isLoading && (
                        <div style={{ padding: '16px 0' }}>
                            <NoticeBox error title={i18n.t('Failed to load program')}>
                                {error instanceof Error ? error.message : i18n.t('Unknown error')}
                            </NoticeBox>
                            <div style={{ marginTop: 12 }}>
                                <Button small onClick={() => refetch()}>
                                    {i18n.t('Retry')}
                                </Button>
                            </div>
                        </div>
                    )}

                    {program && !isLoading && (
                        <>
                            {activeTab === 'overview'     && <OverviewTab assessment={assessment} program={program} />}
                            {activeTab === 'dataElements' && <DataElementsTab stage={stage} />}
                            {activeTab === 'sections'     && <SectionsTab stage={stage} />}
                            {activeTab === 'indicators'   && <IndicatorsTab program={program} />}
                        </>
                    )}
                </div>
            </div>
        </>
    );
};
