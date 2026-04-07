import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataEngine } from '@dhis2/app-runtime';
import { Button, CircularLoader, IconArrowLeft16, IconAdd16, Input, NoticeBox } from '@dhis2/ui';
import i18n from '@dhis2/d2-i18n';
import { useAssessments, useSaveAssessment } from '../ChatSettings/hooks/useAssessments';
import styles from './AddExistingAssessment.module.css';

interface Dhis2Program {
    id: string;
    name: string;
    shortName?: string;
    code?: string;
}

export const AddExistingAssessment = () => {
    const navigate = useNavigate();
    const engine = useDataEngine();
    const { assessments } = useAssessments();
    const saveAssessment = useSaveAssessment();

    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [programs, setPrograms] = useState<Dhis2Program[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [addingId, setAddingId] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);

    const registeredIds = new Set(assessments.map(a => a.programId));

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const fetchPrograms = useCallback(async (query: string) => {
        setIsSearching(true);
        setSearchError(null);
        try {
            const params: Record<string, unknown> = {
                fields: 'id,name,shortName,code',
                paging: true,
                pageSize: 25,
            };
            if (query.trim()) {
                params.filter = `name:ilike:${query.trim()}`;
            }
            const result = await engine.query({
                programs: { resource: 'programs', params },
            }) as { programs: { programs: Dhis2Program[] } };
            setPrograms(result.programs.programs ?? []);
        } catch (e) {
            setSearchError(e instanceof Error ? e.message : i18n.t('Failed to load programs.'));
        } finally {
            setIsSearching(false);
        }
    }, [engine]);

    useEffect(() => {
        fetchPrograms(debouncedQuery);
    }, [debouncedQuery, fetchPrograms]);

    const handleAdd = async (program: Dhis2Program) => {
        setSaveError(null);
        setAddingId(program.id);
        try {
            await saveAssessment.mutateAsync({
                name: program.name,
                shortName: program.shortName ?? program.name.slice(0, 50),
                code: program.code ?? '',
                programId: program.id,
                status: 'active',
            });
            navigate('/chat/settings');
        } catch (e) {
            setSaveError(e instanceof Error ? e.message : i18n.t('Failed to save assessment.'));
        } finally {
            setAddingId(null);
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.topNav}>
                <Button small icon={<IconArrowLeft16 />} onClick={() => navigate('/chat/settings')}>
                    {i18n.t('Back')}
                </Button>
                <div className={styles.crumbs} aria-label={i18n.t('Breadcrumb')}>
                    <span>{i18n.t('CHAT')}</span>
                    <span className={styles.crumbSep}>/</span>
                    <span>{i18n.t('Settings')}</span>
                    <span className={styles.crumbSep}>/</span>
                    <span className={styles.crumbHere}>{i18n.t('Link existing program')}</span>
                </div>
            </div>

            <div className={styles.header}>
                <h2 className={styles.title}>{i18n.t('Link existing program')}</h2>
                <p className={styles.desc}>
                    {i18n.t(
                        'Search for a DHIS2 program already deployed in this instance and register it as a CHAT assessment.',
                    )}
                </p>
            </div>

            {saveError && (
                <div className={styles.noticeWrap}>
                    <NoticeBox error title={i18n.t('Failed to save')}>{saveError}</NoticeBox>
                </div>
            )}

            <div className={styles.searchBar}>
                <Input
                    placeholder={i18n.t('Search programs by name…')}
                    value={searchQuery}
                    onChange={({ value }: { value: string }) => setSearchQuery(value)}
                />
            </div>

            {searchError && (
                <div className={styles.noticeWrap}>
                    <NoticeBox error title={i18n.t('Search failed')}>{searchError}</NoticeBox>
                </div>
            )}

            <div className={styles.tableCard}>
                {isSearching ? (
                    <div className={styles.loadingWrap}>
                        <CircularLoader small />
                        <span>{i18n.t('Searching…')}</span>
                    </div>
                ) : programs.length === 0 ? (
                    <div className={styles.emptyState}>
                        {i18n.t('No programs found.')}
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
                                    <th>{i18n.t('Action')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {programs.map(program => {
                                    const alreadyAdded = registeredIds.has(program.id);
                                    const isAdding = addingId === program.id;
                                    return (
                                        <tr key={program.id} className={styles.tableRow}>
                                            <td>
                                                <div className={styles.nameCell}>{program.name}</div>
                                            </td>
                                            <td className={styles.metaCell}>
                                                {program.shortName ?? '—'}
                                            </td>
                                            <td className={styles.metaCell}>
                                                {program.code ?? '—'}
                                            </td>
                                            <td>
                                                <span className={styles.programId} title={program.id}>
                                                    {program.id}
                                                </span>
                                            </td>
                                            <td className={styles.actionCell}>
                                                {alreadyAdded ? (
                                                    <span className={styles.alreadyAdded}>
                                                        {i18n.t('Already added')}
                                                    </span>
                                                ) : (
                                                    <Button
                                                        small
                                                        primary
                                                        icon={<IconAdd16 />}
                                                        loading={isAdding}
                                                        disabled={isAdding || addingId !== null}
                                                        onClick={() => handleAdd(program)}
                                                    >
                                                        {i18n.t('Add')}
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
