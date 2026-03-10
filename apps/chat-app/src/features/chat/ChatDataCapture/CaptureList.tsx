import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Button, ButtonStrip, CircularLoader, NoticeBox,
    IconAdd16, IconArrowLeft16, IconDelete16, IconEdit16, IconView16,
    DataTable, DataTableHead, DataTableRow, DataTableBody,
    DataTableCell, DataTableColumnHeader, Tag,
} from '@dhis2/ui';
import { Card } from '@dhis2-chat/ui';
import i18n from '@dhis2/d2-i18n';
import { useEvents, Dhis2Event } from '../hooks/useEvents';
import { useDhis2Program } from '../hooks/useDhis2Program';
import { useAssessments } from '../ChatSettings/hooks/useAssessments';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { EventDraft, useDraft } from '../hooks/useDraft';
import { useOrgUnitRoots } from '../../../hooks/useOrgUnitRoots';
import { OrganisationUnitSelector, OrganisationUnit, SelectionChangeEvent } from '../../../components/OrganisationUnitSelector';
import styles from './CaptureList.module.css';

/* ─────────────────────────────────────────────────────────────
   Main
───────────────────────────────────────────────────────────── */
type StatusFilter = 'ALL' | 'COMPLETED' | 'ACTIVE' | 'DRAFT';

const CaptureList = () => {
    const { programId } = useParams<{ programId: string }>();
    const navigate = useNavigate();
    const { user } = useCurrentUser();
    const { roots, isLoading: rootsLoading } = useOrgUnitRoots();
    const { assessments } = useAssessments();
    const assessment = assessments.find(a => a.programId === programId) ?? null;
    const { program } = useDhis2Program(programId ?? null);
    const description = program?.programStages?.[0]?.description ?? null;

    const LS_OU_KEY = `captureOrgUnit:${programId}`;
    const [selectedOu, setSelectedOu] = useState<{ id: string; name: string; path: string } | null>(() => {
        try { return JSON.parse(localStorage.getItem(LS_OU_KEY) ?? 'null'); } catch { return null; }
    });

    const handleOuChange = (e: SelectionChangeEvent) => {
        const plain = e.items.filter(ou => ou.path);
        if (!plain.length) {
            setSelectedOu(null);
            localStorage.removeItem(LS_OU_KEY);
            return;
        }
        const ou = plain[plain.length - 1];
        const next = { id: ou.id, name: ou.name ?? ou.displayName ?? ou.id, path: ou.path ?? '' };
        setSelectedOu(next);
        localStorage.setItem(LS_OU_KEY, JSON.stringify(next));
    };

    const selected: OrganisationUnit[] = selectedOu
        ? [{ id: selectedOu.id, name: selectedOu.name, path: selectedOu.path }]
        : [];

    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
    const [draft, setDraft] = useState<EventDraft | null>(null);

    useEffect(() => {
        if (!user || !programId) return;
        try {
            const raw = localStorage.getItem(`capture_draft:${programId}:${user.id}`);
            if (raw) setDraft(JSON.parse(raw));
        } catch { /* ignore */ }
    }, [user, programId]);

    const { deleteDraft } = useDraft(programId ?? '', user?.id ?? '');

    const handleDeleteDraft = async () => {
        if (!window.confirm(i18n.t('Delete this draft? This cannot be undone.'))) return;
        await deleteDraft();
        setDraft(null);
    };

    const { events, isLoading, isError, error, refetch } = useEvents(
        programId ?? null,
        selectedOu?.id ?? null,
    );

    const showDraft =
        draft && selectedOu && draft.orgUnit === selectedOu.id &&
        (statusFilter === 'ALL' || statusFilter === 'DRAFT');

    const filteredEvents = events.filter(e =>
        statusFilter === 'ALL' || statusFilter === 'DRAFT' || e.status === statusFilter,
    );

    const completedCount = events.filter(e => e.status === 'COMPLETED').length;
    const inProgressCount = draft ? 1 : 0;

    const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
        { key: 'ALL', label: i18n.t('All') },
        { key: 'COMPLETED', label: i18n.t('Completed') },
        { key: 'ACTIVE', label: i18n.t('Active') },
        { key: 'DRAFT', label: i18n.t('Drafts') },
    ];

    return (
        <div className={styles.page}>
            <Button
                secondary
                small
                icon={<IconArrowLeft16 />}
                onClick={() => navigate('/chat/data-capture')}
                className={styles.backBtn}
            >
                {i18n.t('Back')}
            </Button>

            <div className={styles.programHeader}>
                <div className={styles.programHeaderMain}>
                    <h2 className={styles.programName}>
                        {assessment?.name ?? i18n.t('Assessments')}
                    </h2>
                    {assessment && (
                        <div className={styles.programMeta}>
                            <span className={styles.programCode}>{assessment.code}</span>
                            {assessment.shortName && assessment.shortName !== assessment.name && (
                                <span className={styles.programShortName}>{assessment.shortName}</span>
                            )}
                        </div>
                    )}
                    {description && (
                        <p className={styles.programDesc}>{description}</p>
                    )}
                </div>
            </div>

            {isError && (
                <NoticeBox error title={i18n.t('Failed to load events')} className={styles.notice}>
                    {error instanceof Error ? error.message : i18n.t('Unknown error')}
                    <Button small onClick={() => refetch()} style={{ marginInlineStart: 8 }}>
                        {i18n.t('Retry')}
                    </Button>
                </NoticeBox>
            )}

            <div className={styles.layout}>
                {/* ── Left: org unit tree ── */}
                <div className={styles.ouPanel}>
                    <p className={styles.ouPanelLabel}>{i18n.t('Organisation unit')}</p>
                    {rootsLoading ? (
                        <div className={styles.ouLoading}><CircularLoader small /></div>
                    ) : (
                        <div className={styles.ouTree}>
                            <OrganisationUnitSelector
                                roots={roots.map(r => r.id)}
                                selected={selected}
                                onSelect={handleOuChange}
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
                        </div>
                    )}
                </div>

                {/* ── Right: stats + table ── */}
                <div className={styles.contentCol}>
                    {/* Stats */}
                    <div className={styles.statsRow}>
                        <div className={styles.stat}>
                            <span className={styles.statNum}>{completedCount}</span>
                            <span className={styles.statLabel}>{i18n.t('Completed')}</span>
                        </div>
                        <div className={styles.stat}>
                            <span className={styles.statNum}>{inProgressCount}</span>
                            <span className={styles.statLabel}>{i18n.t('In progress')}</span>
                        </div>
                    </div>

                    <Card>
                        {/* Toolbar */}
                        <div className={styles.toolbar}>
                            <div className={styles.filterPills}>
                                {STATUS_FILTERS.map(({ key, label }) => (
                                    <button
                                        key={key}
                                        className={[styles.pill, statusFilter === key ? styles.pillActive : ''].join(' ')}
                                        onClick={() => setStatusFilter(key)}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                            <Button
                                primary
                                small
                                icon={<IconAdd16 />}
                                disabled={!selectedOu}
                                onClick={() => navigate(`/chat/data-capture/${programId}/new`)}
                            >
                                {i18n.t('New assessment')}
                            </Button>
                        </div>

                        {!selectedOu ? (
                            <div className={styles.emptyState}>
                                <p>{i18n.t('Select an organisation unit on the left to view its assessments.')}</p>
                            </div>
                        ) : isLoading ? (
                            <div className={styles.loading}><CircularLoader small /></div>
                        ) : (
                            <DataTable>
                                <DataTableHead>
                                    <DataTableRow>
                                        <DataTableColumnHeader>{i18n.t('Status')}</DataTableColumnHeader>
                                        <DataTableColumnHeader>{i18n.t('Event date')}</DataTableColumnHeader>
                                        <DataTableColumnHeader>{i18n.t('Organisation unit')}</DataTableColumnHeader>
                                        <DataTableColumnHeader>{i18n.t('Last updated')}</DataTableColumnHeader>
                                        <DataTableColumnHeader>{i18n.t('Actions')}</DataTableColumnHeader>
                                    </DataTableRow>
                                </DataTableHead>
                                <DataTableBody>
                                    {showDraft && (
                                        <DataTableRow>
                                            <DataTableCell><Tag neutral>{i18n.t('Draft')}</Tag></DataTableCell>
                                            <DataTableCell>{new Date(draft!.savedAt).toLocaleDateString()}</DataTableCell>
                                            <DataTableCell>{draft!.orgUnitName}</DataTableCell>
                                            <DataTableCell>{new Date(draft!.savedAt).toLocaleTimeString()}</DataTableCell>
                                            <DataTableCell>
                                                <ButtonStrip>
                                                    <Button
                                                        small
                                                        primary
                                                        icon={<IconEdit16 />}
                                                        onClick={() =>
                                                            navigate(`/chat/data-capture/${programId}/new`, {
                                                                state: {
                                                                    orgUnit: { id: draft!.orgUnit, name: draft!.orgUnitName, path: '' },
                                                                    continueDraft: true,
                                                                },
                                                            })}
                                                    >
                                                        {i18n.t('Continue')}
                                                    </Button>
                                                    <Button
                                                        small
                                                        destructive
                                                        icon={<IconDelete16 />}
                                                        onClick={handleDeleteDraft}
                                                    >
                                                        {i18n.t('Delete')}
                                                    </Button>
                                                </ButtonStrip>
                                            </DataTableCell>
                                        </DataTableRow>
                                    )}

                                    {filteredEvents.length === 0 && !showDraft ? (
                                        <DataTableRow>
                                            <DataTableCell colSpan="5" align="center">
                                                {i18n.t('No assessments found.')}
                                            </DataTableCell>
                                        </DataTableRow>
                                    ) : filteredEvents.map((ev: Dhis2Event) => (
                                        <DataTableRow key={ev.event}>
                                            <DataTableCell>
                                                {ev.status === 'COMPLETED'
                                                    ? <Tag positive>{i18n.t('Completed')}</Tag>
                                                    : <Tag neutral>{i18n.t('Active')}</Tag>}
                                            </DataTableCell>
                                            <DataTableCell>
                                                {ev.eventDate ? new Date(ev.eventDate).toLocaleDateString() : '—'}
                                            </DataTableCell>
                                            <DataTableCell>{ev.orgUnitName}</DataTableCell>
                                            <DataTableCell>{new Date(ev.lastUpdated).toLocaleString()}</DataTableCell>
                                            <DataTableCell>
                                                <Button
                                                    small
                                                    secondary
                                                    icon={ev.status === 'COMPLETED' ? <IconView16 /> : <IconEdit16 />}
                                                    onClick={() => navigate(`/chat/data-capture/${programId}/${ev.event}`)}
                                                >
                                                    {ev.status === 'COMPLETED' ? i18n.t('View') : i18n.t('Edit')}
                                                </Button>
                                            </DataTableCell>
                                        </DataTableRow>
                                    ))}
                                </DataTableBody>
                            </DataTable>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default CaptureList;
