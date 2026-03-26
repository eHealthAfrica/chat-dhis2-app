import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Button,
    ButtonStrip,
    CircularLoader,
    NoticeBox,
    IconAdd16,
    IconArrowLeft16,
    IconDelete16,
    IconEdit16,
    IconView16,
    DataTable,
    DataTableHead,
    DataTableRow,
    DataTableBody,
    DataTableCell,
    DataTableColumnHeader,
    Tag,
} from '@dhis2/ui';
import { Card } from '@dhis2-chat/ui';
import i18n from '@dhis2/d2-i18n';
import { Dhis2Event, useEvents } from '../hooks/useEvents';
import { useDhis2Program } from '../hooks/useDhis2Program';
import { useAssessments } from '../ChatSettings/hooks/useAssessments';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { EventDraft, useDraft } from '../hooks/useDraft';
import { useOrgUnitRoots } from '../../../hooks/useOrgUnitRoots';
import {
    OrganisationUnitSelector,
    OrganisationUnit,
    SelectionChangeEvent,
} from '../../../components/OrganisationUnitSelector';
import styles from './CaptureList.module.css';

type StatusFilter = 'ALL' | 'COMPLETED' | 'DRAFT';

const EMPTY_VALUE = '—';

const formatDate = (value?: string | null) =>
    value ? new Date(value).toLocaleDateString() : EMPTY_VALUE;

const formatDateTime = (value?: string | null) =>
    value ? new Date(value).toLocaleString() : EMPTY_VALUE;

const formatUser = (
    userInfo?: { displayName?: string; username?: string } | null,
) => userInfo?.displayName || userInfo?.username || EMPTY_VALUE;

const isWithinSelectedOrgUnit = (
    draft: EventDraft,
    selectedOu: { id: string; path: string } | null,
) => {
    if (!selectedOu) return false;
    if (draft.orgUnit === selectedOu.id) return true;
    if (!draft.orgUnitPath || !selectedOu.path) return false;

    return draft.orgUnitPath === selectedOu.path
        || draft.orgUnitPath.startsWith(`${selectedOu.path}/`);
};

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
    const [selectedOu, setSelectedOu] = useState<{ id: string; name: string; path: string } | null>(
        () => {
            try {
                return JSON.parse(localStorage.getItem(LS_OU_KEY) ?? 'null');
            } catch {
                return null;
            }
        },
    );

    const handleOuChange = (e: SelectionChangeEvent) => {
        const plain = e.items.filter(ou => ou.path);
        if (!plain.length) {
            setSelectedOu(null);
            localStorage.removeItem(LS_OU_KEY);
            return;
        }

        const ou = plain[plain.length - 1];
        const next = {
            id: ou.id,
            name: ou.name ?? ou.displayName ?? ou.id,
            path: ou.path ?? '',
        };

        setSelectedOu(next);
        localStorage.setItem(LS_OU_KEY, JSON.stringify(next));
    };

    const selected: OrganisationUnit[] = selectedOu
        ? [{ id: selectedOu.id, name: selectedOu.name, path: selectedOu.path }]
        : [];

    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
    const [drafts, setDrafts] = useState<EventDraft[]>([]);
    const [draftsLoading, setDraftsLoading] = useState(false);

    const { listDrafts, deleteDraft } = useDraft(programId ?? '', user?.id ?? '');

    useEffect(() => {
        if (!user || !programId) {
            setDrafts([]);
            return;
        }

        let active = true;

        const loadDrafts = async () => {
            setDraftsLoading(true);
            try {
                const nextDrafts = await listDrafts();
                if (active) setDrafts(nextDrafts);
            } finally {
                if (active) setDraftsLoading(false);
            }
        };

        loadDrafts();

        return () => {
            active = false;
        };
    }, [listDrafts, programId, user]);

    const handleDeleteDraft = async (draft: EventDraft) => {
        if (!window.confirm(i18n.t('Delete this draft? This cannot be undone.'))) return;

        await deleteDraft({ draftId: draft.draftId });
        setDrafts(prev => prev.filter(item => item.draftId !== draft.draftId));
    };

    const { events, isLoading, isError, error, refetch } = useEvents(
        programId ?? null,
        selectedOu?.id ?? null,
    );
    const branchDrafts = drafts.filter(draft => isWithinSelectedOrgUnit(draft, selectedOu));
    const visibleDrafts = statusFilter === 'ALL' || statusFilter === 'DRAFT'
        ? branchDrafts
        : [];

    const filteredEvents = events.filter(event =>
        statusFilter === 'ALL'
            ? true
            : event.status === statusFilter,
    );

    const completedCount = events.filter(event => event.status === 'COMPLETED').length;
    const inProgressCount = branchDrafts.length;

    const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
        { key: 'ALL', label: i18n.t('All') },
        { key: 'COMPLETED', label: i18n.t('Completed') },
        { key: 'DRAFT', label: i18n.t('Drafts') },
    ];

    const isTableLoading = isLoading || draftsLoading;

    const getEventOrgUnitName = (event: Dhis2Event) => event.orgUnitName || event.orgUnit || EMPTY_VALUE;

    const renderActions = (event: Dhis2Event) => (
        <Button
            small
            secondary
            icon={event.status === 'COMPLETED' ? <IconView16 /> : <IconEdit16 />}
            onClick={() => navigate(`/chat/data-capture/${programId}/${event.event}`)}
        >
            {event.status === 'COMPLETED' ? i18n.t('View') : i18n.t('Edit')}
        </Button>
    );

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
                <div className={styles.ouPanel}>
                    <p className={styles.ouPanelLabel}>{i18n.t('Organisation unit')}</p>
                    {rootsLoading ? (
                        <div className={styles.ouLoading}><CircularLoader small /></div>
                    ) : (
                        <div className={styles.ouTree}>
                            <OrganisationUnitSelector
                                roots={roots.map(root => root.id)}
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
                                        return str.replace(/\{\{(\w+)\}\}/g, (_, token) =>
                                            opts[token] !== undefined
                                                ? String(opts[token])
                                                : `{{${token}}}`,
                                        );
                                    },
                                }}
                            />
                        </div>
                    )}
                </div>

                <div className={styles.contentCol}>
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

                    <Card className={styles.listCard}>
                        <div className={styles.toolbar}>
                            <div className={styles.filterPills}>
                                {STATUS_FILTERS.map(({ key, label }) => (
                                    <button
                                        key={key}
                                        className={[
                                            styles.pill,
                                            statusFilter === key ? styles.pillActive : '',
                                        ].join(' ')}
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
                        {selectedOu && (
                            <p className={styles.scopeHint}>
                                {i18n.t('Showing assessments for the selected organisation unit and all descendants.')}
                            </p>
                        )}

                        {!selectedOu ? (
                            <div className={styles.emptyState}>
                                <p>{i18n.t('Select an organisation unit on the left to view its assessments.')}</p>
                            </div>
                        ) : isTableLoading ? (
                            <div className={styles.loading}><CircularLoader small /></div>
                        ) : (
                            <div className={styles.tableShell}>
                                <DataTable>
                                <DataTableHead>
                                    <DataTableRow>
                                        <DataTableColumnHeader>{i18n.t('Status')}</DataTableColumnHeader>
                                        <DataTableColumnHeader>{i18n.t('Report date')}</DataTableColumnHeader>
                                        <DataTableColumnHeader>{i18n.t('Organisation unit')}</DataTableColumnHeader>
                                        <DataTableColumnHeader>{i18n.t('Created by')}</DataTableColumnHeader>
                                        <DataTableColumnHeader>{i18n.t('Last updated by')}</DataTableColumnHeader>
                                        <DataTableColumnHeader>{i18n.t('Last updated')}</DataTableColumnHeader>
                                        <DataTableColumnHeader>{i18n.t('Actions')}</DataTableColumnHeader>
                                    </DataTableRow>
                                </DataTableHead>
                                <DataTableBody>
                                    {visibleDrafts.map(draft => (
                                        <DataTableRow key={draft.draftId}>
                                            <DataTableCell><Tag neutral>{i18n.t('Draft')}</Tag></DataTableCell>
                                            <DataTableCell>{formatDate(draft.reportDate || draft.savedAt)}</DataTableCell>
                                            <DataTableCell>{draft.orgUnitName}</DataTableCell>
                                            <DataTableCell>{user?.displayName ?? user?.username ?? EMPTY_VALUE}</DataTableCell>
                                            <DataTableCell>{user?.displayName ?? user?.username ?? EMPTY_VALUE}</DataTableCell>
                                            <DataTableCell>{formatDateTime(draft.savedAt)}</DataTableCell>
                                            <DataTableCell>
                                                <ButtonStrip>
                                                    <Button
                                                        small
                                                        primary
                                                        icon={<IconEdit16 />}
                                                        onClick={() =>
                                                            navigate(`/chat/data-capture/${programId}/new`, {
                                                                state: {
                                                                    draftId: draft.draftId,
                                                                    orgUnit: {
                                                                        id: draft.orgUnit,
                                                                        name: draft.orgUnitName,
                                                                        path: draft.orgUnitPath ?? '',
                                                                    },
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
                                                        onClick={() => handleDeleteDraft(draft)}
                                                    >
                                                        {i18n.t('Delete')}
                                                    </Button>
                                                </ButtonStrip>
                                            </DataTableCell>
                                        </DataTableRow>
                                    ))}

                                    {filteredEvents.length === 0 && visibleDrafts.length === 0 ? (
                                        <DataTableRow>
                                            <DataTableCell
                                                colSpan="7"
                                                align="center"
                                                className={styles.tableEmptyCell}
                                            >
                                                {i18n.t('No assessments found.')}
                                            </DataTableCell>
                                        </DataTableRow>
                                    ) : filteredEvents.map(event => (
                                        <DataTableRow key={event.event}>
                                            <DataTableCell>
                                                {event.status === 'COMPLETED'
                                                    ? <Tag positive>{i18n.t('Completed')}</Tag>
                                                    : <Tag neutral>{i18n.t('Active')}</Tag>}
                                            </DataTableCell>
                                            <DataTableCell>{formatDate(event.occurredAt)}</DataTableCell>
                                            <DataTableCell>{getEventOrgUnitName(event)}</DataTableCell>
                                            <DataTableCell>{formatUser(event.createdBy)}</DataTableCell>
                                            <DataTableCell>{formatUser(event.updatedBy)}</DataTableCell>
                                            <DataTableCell>{formatDateTime(event.updatedAt)}</DataTableCell>
                                            <DataTableCell>{renderActions(event)}</DataTableCell>
                                        </DataTableRow>
                                        ))}
                                </DataTableBody>
                                </DataTable>
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default CaptureList;
