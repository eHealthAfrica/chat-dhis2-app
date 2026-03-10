import { useNavigate } from 'react-router-dom';
import { CircularLoader } from '@dhis2/ui';
import i18n from '@dhis2/d2-i18n';
import { useAssessments, Assessment } from '../ChatSettings/hooks/useAssessments';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useCaptureStats } from '../hooks/useCaptureStats';
import styles from './CaptureHome.module.css';

/* ─────────────────────────────────────────────────────────────
   Program card
───────────────────────────────────────────────────────────── */
const ProgramCard = ({ assessment, userUid }: { assessment: Assessment; userUid: string }) => {
    const navigate = useNavigate();
    const { stats, isLoading } = useCaptureStats(assessment, userUid);

    return (
        <div
            className={styles.card}
            onClick={() => navigate(`/chat/data-capture/${assessment.programId}`)}
            role="button"
            tabIndex={0}
        >
            <div className={styles.cardHeader}>
                <div className={styles.cardIcon}>📋</div>
                <div className={styles.cardMeta}>
                    <h3 className={styles.cardName}>{assessment.name}</h3>
                    <span className={styles.cardCode}>{assessment.code}</span>
                </div>
                <span
                    className={[
                        styles.statusBadge,
                        assessment.status === 'active' ? styles.active : styles.inactive,
                    ].join(' ')}
                >
                    {assessment.status}
                </span>
            </div>

            <div className={styles.cardId} style={{ height: '10vh' }}>
                <span className={styles.idLabel}>{i18n.t('Program ID')}</span>
                <span className={styles.idValue}>{assessment.programId}</span>
            </div>

            <div className={styles.statsRow}>
                {isLoading ? (
                    <div className={styles.statsLoading}>
                        <CircularLoader extrasmall />
                    </div>
                ) : (
                    <>
                        <div className={styles.statItem}>
                            <span className={[styles.statNum, styles.completed].join(' ')}>
                                {stats.completed}
                            </span>
                            <span className={styles.statLabel}>{i18n.t('Completed')}</span>
                        </div>
                        <div className={styles.statDivider} />
                        <div className={styles.statItem}>
                            <span className={[styles.statNum, styles.inProgress].join(' ')}>
                                {stats.inProgress}
                            </span>
                            <span className={styles.statLabel}>{i18n.t('In progress')}</span>
                        </div>
                    </>
                )}
            </div>

            <div className={styles.cardArrow}>→</div>
        </div>
    );
};

/* ─────────────────────────────────────────────────────────────
   Home
───────────────────────────────────────────────────────────── */
const CaptureHome = () => {
    const { assessments, isLoading } = useAssessments();
    const { user } = useCurrentUser();

    const active = assessments.filter(a => a.status === 'active');

    return (
        <div className={styles.page}>
            <div className={styles.pageHeader}>
                <h2 className={styles.pageTitle}>{i18n.t('Data Capture')}</h2>
                <p className={styles.pageDesc}>
                    {i18n.t('Select a program to view and capture assessment events.')}
                </p>
            </div>

            {isLoading ? (
                <div className={styles.centered}>
                    <CircularLoader small />
                    <span>{i18n.t('Loading programs…')}</span>
                </div>
            ) : active.length === 0 ? (
                <div className={styles.empty}>
                    <div className={styles.emptyIcon}>📋</div>
                    <p className={styles.emptyTitle}>{i18n.t('No active programs')}</p>
                    <p className={styles.emptyBody}>
                        {i18n.t('Import an assessment program in Settings to get started.')}
                    </p>
                </div>
            ) : (
                <div className={styles.grid}>
                    {active.map(a => (
                        <ProgramCard
                            key={a.id}
                            assessment={a}
                            userUid={user?.id ?? ''}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default CaptureHome;
