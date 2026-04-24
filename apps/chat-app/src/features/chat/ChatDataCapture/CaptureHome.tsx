import { KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { CircularLoader } from '@dhis2/ui';
import i18n from '@dhis2/d2-i18n';
import { useAssessments, Assessment } from '../ChatSettings/hooks/useAssessments';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useCaptureStats } from '../hooks/useCaptureStats';
import styles from './CaptureHome.module.css';

const getAssessmentMark = (assessment: Assessment) =>
    assessment.code?.trim()?.charAt(0)?.toUpperCase()
    || assessment.name?.trim()?.charAt(0)?.toUpperCase()
    || 'A';

const ProgramCard = ({ assessment, userUid }: { assessment: Assessment; userUid: string }) => {
    const navigate = useNavigate();
    const { stats, isLoading } = useCaptureStats(assessment, userUid);

    const openAssessment = () => {
        navigate(`/chat/data-capture/${assessment.programId}`);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openAssessment();
        }
    };

    const showShortName = Boolean(
        assessment.shortName && assessment.shortName !== assessment.name,
    );

    return (
        <div
            className={styles.card}
            onClick={openAssessment}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0}
        >
            <div className={styles.cardHeader}>
                <div className={styles.cardIcon}>{getAssessmentMark(assessment)}</div>

                <div className={styles.cardMeta}>
                    <div className={styles.cardNameRow}>
                        <h3 className={styles.cardName}>{assessment.name}</h3>
                        <span
                            className={[
                                styles.statusBadge,
                                assessment.status === 'active' ? styles.active : styles.inactive,
                            ].join(' ')}
                        >
                            {assessment.status}
                        </span>
                    </div>

                    {showShortName && (
                        <p className={styles.cardShortName}>{assessment.shortName}</p>
                    )}
                </div>
            </div>

            <div className={styles.cardBody}>
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

                            <div className={styles.statItem}>
                                <span className={[styles.statNum, styles.inProgress].join(' ')}>
                                    {stats.inProgress}
                                </span>
                                <span className={styles.statLabel}>{i18n.t('In progress')}</span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className={styles.cardFooter}>
                <span className={styles.cardHint}>
                    {i18n.t('Select a program to view and capture assessment events.')}
                </span>
                <span className={styles.cardArrow}>{i18n.t('Open')}</span>
            </div>
        </div>
    );
};

const CaptureHome = () => {
    const navigate = useNavigate();
    const { assessments, isLoading } = useAssessments();
    const { user } = useCurrentUser();

    const active = assessments.filter(a => a.status === 'active');

    return (
        <div className={styles.page}>
            <div className={styles.pageHeader}>
                <div className={styles.pageHeaderMain}>
                    <h2 className={styles.pageTitle}>{i18n.t('Data Capture')}</h2>
                    <p className={styles.pageDesc}>
                        {i18n.t('Select a program to view and capture assessment events.')}
                    </p>
                </div>

                <div className={styles.pageStat}>
                    <span className={styles.pageStatValue}>{active.length}</span>
                    <span className={styles.pageStatLabel}>{i18n.t('Active programs')}</span>
                </div>
            </div>

            {isLoading ? (
                <div className={styles.centered}>
                    <CircularLoader small />
                    <span>{i18n.t('Loading programs...')}</span>
                </div>
            ) : active.length === 0 ? (
                <div className={styles.empty}>
                    <div className={styles.emptyIcon}>A</div>
                    <p className={styles.emptyTitle}>{i18n.t('No assessments available')}</p>
                    <p className={styles.emptyBody}>
                        {i18n.t('There are no active assessment programs set up yet. An administrator needs to import or link a program before data capture can begin.')}
                    </p>
                    <div className={styles.emptyHint}>
                        <div className={styles.emptyHintContent}>
                            <ul className={styles.emptyHintList}>
                                <li>
                                    {i18n.t('Your user role may not include the required access — reach out to your DHIS2 administrator to request it.')}
                                </li>
                                <li>
                                    {i18n.t('Administrators can follow the')}{' '}
                                    <a href="#/chat/guides/admin-setup" className={styles.emptyHintLink}>
                                        {i18n.t('admin setup guide')}
                                    </a>
                                    {' '}{i18n.t('to assign authorities and configure the app.')}
                                </li>
                                <li>
                                    {i18n.t('To import or link an assessment program, refer to the')}{' '}
                                    <a href="#/chat/guides/assessment-setup" className={styles.emptyHintLink}>
                                        {i18n.t('assessment setup guide')}
                                    </a>
                                    {'.'}
                                </li>
                            </ul>
                        </div>
                    </div>
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
