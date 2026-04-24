import { useNavigate } from 'react-router-dom';
import { Button, Card, CircularLoader, IconAdd16, IconDelete16, IconView16, IconLink16, NoticeBox } from '@dhis2/ui';
import i18n from '@dhis2/d2-i18n';
import { useState } from 'react';
import styles from './ChatSettings.module.css';
import { Assessment, useAssessments, useDeleteAssessment } from './hooks/useAssessments';
import { ProgramDetailDrawer } from '../ChatProgramDetails/Programdetaildrawer';

export const ChatSettings = () => {
    const navigate = useNavigate();
    const { assessments, isLoading, isError, error } = useAssessments();
    const deleteAssessment = useDeleteAssessment();

    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [viewingAssessment, setViewingAssessment] = useState<Assessment | null>(null);

    const handleDelete = async (id: string) => {
        if (!window.confirm(i18n.t('Delete this assessment? This cannot be undone.'))) return;
        setDeletingId(id);
        try {
            await deleteAssessment.mutateAsync(id);
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.pageHeader}>
                <div>
                    <h2>{i18n.t('Assessments')}</h2>
                    <p className={styles.pageDescription}>
                        {i18n.t(
                            'Manage Chat assessments. Each assessment creates a DHIS2 dataset and is registered in the prediction backend.',
                        )}
                    </p>
                </div>
                <div className={styles.headerActions}>
                    <Button
                        secondary
                        icon={<IconLink16 />}
                        onClick={() => navigate('/chat/settings/existing')}
                    >
                        {i18n.t('Link existing program')}
                    </Button>
                    <Button
                        primary
                        icon={<IconAdd16 />}
                        onClick={() => navigate('/chat/settings/new')}
                    >
                        {i18n.t('New assessment')}
                    </Button>
                </div>
            </div>

            {isError && (
                <NoticeBox error title={i18n.t('Failed to load assessments')}>
                    {error instanceof Error ? error.message : i18n.t('Unknown error')}
                </NoticeBox>
            )}

            <Card>
                <div className={styles.cardInner}>
                    {isLoading ? (
                        <div className={styles.loadingWrapper}>
                            <CircularLoader />
                        </div>
                    ) : assessments.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>📋</div>
                            <p className={styles.emptyTitle}>{i18n.t('No assessments yet')}</p>
                            <p className={styles.emptyBody}>
                                {i18n.t(
                                    'Create your first assessment to start collecting chat data and provisioning DHIS2 datasets.',
                                )}
                            </p>
                            <div className={styles.emptyActions}>
                                <Button
                                    secondary
                                    icon={<IconLink16 />}
                                    onClick={() => navigate('/chat/settings/existing')}
                                >
                                    {i18n.t('Link existing program')}
                                </Button>
                                <Button
                                    primary
                                    icon={<IconAdd16 />}
                                    onClick={() => navigate('/chat/settings/new')}
                                >
                                    {i18n.t('Import assessment')}
                                </Button>
                            </div>

                            <div className={styles.emptyDivider} />
                        </div>
                    ) : (
                        <div className={styles.tableScrollWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>{i18n.t('Name')}</th>
                                        <th>{i18n.t('Short name')}</th>
                                        <th>{i18n.t('Code')}</th>
                                        <th>{i18n.t('Program ID')}</th>
                                        <th>{i18n.t('Status')}</th>
                                        <th>{i18n.t('Actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {assessments.map(a => (
                                        <tr
                                            key={a.id}
                                            className={styles.tableRow}
                                            onClick={() => setViewingAssessment(a)}
                                        >
                                            <td>
                                                <div className={styles.nameCell}>{a.name}</div>
                                            </td>
                                            <td className={styles.metaCell}>{a.shortName}</td>
                                            <td className={styles.metaCell}>{a.code}</td>
                                            <td>
                                                {a.programId ? (
                                                    <span className={styles.datasetId} title={a.programId}>
                                                        {a.programId}
                                                    </span>
                                                ) : (
                                                    <span className={styles.noDatasetId}>
                                                        {i18n.t('—')}
                                                    </span>
                                                )}
                                            </td>
                                            <td>
                                                <span
                                                    className={[
                                                        styles.statusBadge,
                                                        a.status === 'active'
                                                            ? styles.statusActive
                                                            : styles.statusInactive,
                                                    ].join(' ')}
                                                >
                                                    {a.status === 'active'
                                                        ? i18n.t('Active')
                                                        : i18n.t('Inactive')}
                                                </span>
                                            </td>
                                            <td
                                                className={styles.actionCell}
                                                onClick={e => e.stopPropagation()}
                                            >
                                                <Button
                                                    small
                                                    secondary
                                                    icon={<IconView16 />}
                                                    onClick={() => setViewingAssessment(a)}
                                                >
                                                    {i18n.t('View')}
                                                </Button>
                                                <Button
                                                    small
                                                    destructive
                                                    icon={<IconDelete16 />}
                                                    disabled={deletingId === a.id}
                                                    loading={deletingId === a.id}
                                                    onClick={() => handleDelete(a.id)}
                                                    style={{ marginLeft: '5px' }}
                                                >
                                                    {i18n.t('Delete')}
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </Card>

            <ProgramDetailDrawer
                assessment={viewingAssessment}
                onClose={() => setViewingAssessment(null)}
            />
        </div>
    );
};
