import i18n from '@dhis2/d2-i18n';
import {
    Button,
    FlyoutMenu,
    IconDelete16,
    IconEdit16,
    IconMore16,
    Layer,
    MenuItem,
    Popover,
} from '@dhis2/ui';
import { useEffect, useRef, useState } from 'react';
import type { ClimateDataset } from '../data/climateDatasets';
import type { ImportConfig } from '../hooks/useImportConfigs';
import { formatBookmarkDate, getPeriodTypes } from '../utils/time';
import { computeFillGapRange, formatRelativeTime } from '../utils/recurringImports';
import styles from '../ClimateImport.module.css';

interface ResolvedConfig extends ImportConfig {
    dataset?: ClimateDataset | null;
}

interface SavedImportCardProps {
    config: ResolvedConfig;
    onRun: (config: ResolvedConfig) => void;
    onRename: (id: string, name: string) => void;
    onDelete: (config: ResolvedConfig) => void;
}

const periodTypeLabel = (id: string): string =>
    getPeriodTypes().find(t => t.id === id)?.name ?? id;

const SavedImportCard = ({ config, onRun, onRename, onDelete }: SavedImportCardProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(config.name);
    const [menuOpen, setMenuOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const menuButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (isEditing) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [isEditing]);

    const commitEdit = () => {
        const trimmed = editValue.trim();
        if (trimmed && trimmed !== config.name) onRename(config.id, trimmed);
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            commitEdit();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setIsEditing(false);
        }
    };

    const range = computeFillGapRange(config);

    let runStatusLabel: string;
    if (config.lastRunAt) {
        if (config.dataUpdatedThrough) {
            runStatusLabel = i18n.t('Data imported through {{date}} · Last run {{relative}}', {
                date: formatBookmarkDate(config.dataUpdatedThrough),
                relative: formatRelativeTime(config.lastRunAt),
                nsSeparator: ';',
            });
        } else {
            runStatusLabel = i18n.t('Last run {{relative}}', { relative: formatRelativeTime(config.lastRunAt), nsSeparator: ';' });
        }
    } else {
        runStatusLabel = i18n.t('Never imported');
    }

    const runStatusTooltip = config.lastRunAt && config.lastRunByName
        ? i18n.t('{{date}} by {{user}}', {
                date: new Date(config.lastRunAt).toLocaleString(),
                user: config.lastRunByName,
                nsSeparator: ';',
            })
        : undefined;

    return (
        <article className={styles.savedImportCard}>
            <header className={styles.savedImportCardHeader}>
                <div className={styles.savedImportCardName}>
                    {isEditing ? (
                        <input
                            ref={inputRef}
                            type="text"
                            value={editValue}
                            className={styles.savedImportNameInput}
                            onChange={e => setEditValue(e.target.value)}
                            onBlur={() => setIsEditing(false)}
                            onKeyDown={handleKeyDown}
                        />
                    ) : (
                        <>
                            <h3 className={styles.savedImportTitle}>{config.name}</h3>
                            <button
                                type="button"
                                aria-label={i18n.t('Rename')}
                                className={styles.savedImportIconButton}
                                onClick={() => {
                                    setEditValue(config.name);
                                    setIsEditing(true);
                                }}
                            >
                                <IconEdit16 />
                            </button>
                        </>
                    )}
                </div>
                <div className={styles.savedImportCardActions}>
                    <Button
                        small
                        disabled={!config.dataset || (!range && !!config.dataUpdatedThrough)}
                        title={config.dataset ? undefined : i18n.t('Data source is not available')}
                        onClick={() => onRun(config)}
                    >
                        {i18n.t('Import…')}
                    </Button>
                    <button
                        ref={menuButtonRef}
                        type="button"
                        aria-label={i18n.t('More actions')}
                        className={styles.savedImportIconButton}
                        onClick={() => setMenuOpen(o => !o)}
                    >
                        <IconMore16 />
                    </button>
                    {menuOpen && (
                        <Layer onBackdropClick={() => setMenuOpen(false)}>
                            <Popover reference={menuButtonRef.current ?? undefined} placement="bottom-end" onClickOutside={() => setMenuOpen(false)}>
                                <FlyoutMenu>
                                    <MenuItem
                                        icon={<IconEdit16 />}
                                        label={i18n.t('Rename')}
                                        onClick={() => {
                                            setEditValue(config.name);
                                            setIsEditing(true);
                                            setMenuOpen(false);
                                        }}
                                    />
                                    <MenuItem
                                        destructive
                                        icon={<IconDelete16 />}
                                        label={i18n.t('Delete')}
                                        onClick={() => {
                                            setMenuOpen(false);
                                            onDelete(config);
                                        }}
                                    />
                                </FlyoutMenu>
                            </Popover>
                        </Layer>
                    )}
                </div>
            </header>
            <p className={styles.savedImportRunStatus} title={runStatusTooltip}>{runStatusLabel}</p>
            {config.lastRunError && <p className={styles.savedImportRunError}>{config.lastRunError}</p>}
            <p className={styles.savedImportMeta}>
                {[periodTypeLabel(config.periodType), i18n.t('{{count}} org units', { count: config.featureCount, defaultValue: '{{count}} org unit', defaultValue_plural: '{{count}} org units' })].join(' · ')}
            </p>
        </article>
    );
};

interface SavedImportsListProps {
    configs: ResolvedConfig[];
    onRun: (config: ResolvedConfig) => void;
    onRename: (id: string, name: string) => void;
    onDelete: (config: ResolvedConfig) => void;
}

const SavedImportsList = ({ configs, onRun, onRename, onDelete }: SavedImportsListProps) => (
    <div className={styles.savedImportsList}>
        {configs.map(config => (
            <SavedImportCard
                key={config.id}
                config={config}
                onRun={onRun}
                onRename={onRename}
                onDelete={onDelete}
            />
        ))}
    </div>
);

export default SavedImportsList;
