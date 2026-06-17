import i18n from '@dhis2/d2-i18n';
import { Button, CircularLoader, NoticeBox } from '@dhis2/ui';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import getEEDatasets from './data/climateDatasets';
import useImportConfigs, { type ImportConfig } from './hooks/useImportConfigs';
import DeleteImportModal from './components/DeleteImportModal';
import RunImportModal from './components/RunImportModal';
import SavedImportsList from './components/SavedImportsList';
import styles from './ClimateImport.module.css';

type RunConfig = ImportConfig & { dataset?: ReturnType<typeof getEEDatasets>[number] | null };

const ClimateImportListPage = () => {
    const navigate = useNavigate();
    const { configs, loading, error, renameConfig, deleteConfig, recordRun } = useImportConfigs();
    const [runConfig, setRunConfig] = useState<RunConfig | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<ImportConfig | null>(null);

    const allDatasets = useMemo(() => getEEDatasets(), []);

    const resolvedConfigs = useMemo<RunConfig[]>(
        () =>
            configs.map(config => ({
                ...config,
                dataset: config.datasetId
                    ? (allDatasets.find(ds => ds.id === config.datasetId) ?? null)
                    : null,
            })),
        [configs, allDatasets],
    );

    const handleRunComplete = (
        id: string,
        result: { dataUpdatedThrough?: string; lastRunError?: string | null },
    ) => {
        recordRun(id, result);
        setRunConfig(null);
    };

    if (loading) {
        return (
            <div className={styles.listPage}>
                <CircularLoader />
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.listPage}>
                <NoticeBox error title={i18n.t('Failed to load saved imports')}>
                    {(error as { message?: string }).message}
                </NoticeBox>
            </div>
        );
    }

    return (
        <div className={styles.listPage}>
            <div className={styles.listPageHeader}>
                <h1 className={styles.listPageTitle}>{i18n.t('Climate imports')}</h1>
                <p className={styles.listPageSubtitle}>
                    {i18n.t(
                        'Import weather and climate data from Google Earth Engine into DHIS2 data elements.',
                    )}
                </p>
            </div>

            <div className={styles.newImportCard}>
                <div>
                    <h2>{i18n.t('New import')}</h2>
                    <p className={styles.newImportCardBody}>
                        {i18n.t(
                            'Select a climate dataset, target data element and organisation units to import data.',
                        )}
                    </p>
                </div>
                <Button primary onClick={() => navigate('/chat/climate-import/new')}>
                    {i18n.t('New import')}
                </Button>
            </div>

            {resolvedConfigs.length > 0 ? (
                <section>
                    <h2 className={styles.sectionTitle}>{i18n.t('Saved imports')}</h2>
                    <SavedImportsList
                        configs={resolvedConfigs}
                        onRun={config => setRunConfig(config as RunConfig)}
                        onRename={(id, name) => renameConfig(id, name)}
                        onDelete={config => setDeleteTarget(config)}
                    />
                </section>
            ) : (
                <div className={styles.emptyState}>
                    {i18n.t(
                        'No saved imports yet. Run a new import and check "Save this import for re-running later" to create one.',
                    )}
                </div>
            )}

            {runConfig && runConfig.dataset && (
                <RunImportModal
                    config={runConfig}
                    onClose={() => setRunConfig(null)}
                    onRunComplete={handleRunComplete}
                />
            )}

            {deleteTarget && (
                <DeleteImportModal
                    config={deleteTarget}
                    onCancel={() => setDeleteTarget(null)}
                    onConfirm={() => {
                        deleteConfig(deleteTarget.id);
                        setDeleteTarget(null);
                    }}
                />
            )}
        </div>
    );
};

export default ClimateImportListPage;
