import { useCallback, useMemo, useState } from 'react';
import { useDataEngine } from '@dhis2/app-runtime';
import { useNavigate } from 'react-router-dom';
import { Button, IconArrowLeft16, NoticeBox } from '@dhis2/ui';
import i18n from '@dhis2/d2-i18n';
import { useSaveProgramToDhis2 } from '../hooks/useSaveProgramToDhis2';
import { useSaveAssessment } from '../ChatSettings/hooks/useAssessments';
import { parseAssessmentJson, RawMetadataJson, AssessmentPreview } from './parseAssessmentJson';
import { Steps } from './Steps';
import { DropZone } from './DropZone';
import { FileBanner } from './FileBanner';
import { ProgramCard } from './ProgramCard';
import { SectionsCard } from './SectionsCard';
import { DataElementsCard } from './DataElementsCard';
import { OptionSetsCard } from './OptionSetsCard';
import { ProgramIndicatorsCard } from './ProgramIndicatorsCard';
import styles from './NewAssessment.module.css';

const safe = (v?: string | null) => (v ?? '').toString();

interface FormErrors {
    name?: string;
    shortName?: string;
    code?: string;
}

type Dhis2Program = { id: string; name: string; shortName: string; code: string };

export const NewAssessment = () => {
    const navigate = useNavigate();
    const engine = useDataEngine();

    const { saveProgramToDhis2, isSaving: isSavingDhis2 } = useSaveProgramToDhis2();
    const saveAssessment = useSaveAssessment();

    const isSaving = isSavingDhis2 || saveAssessment.isPending;

    /* ── File / parse state ─────────────────────────────────── */
    const [fileName, setFileName] = useState<string | null>(null);
    const [parseError, setParseError] = useState<string | null>(null);
    const [preview, setPreview] = useState<AssessmentPreview | null>(null);
    const [warnings, setWarnings] = useState<string[]>([]);

    /* ── Form state ─────────────────────────────────────────── */
    const [name, setName] = useState('');
    const [shortName, setShortName] = useState('');
    const [code, setCode] = useState('');
    const [description, setDescription] = useState('');
    const [errors, setErrors] = useState<FormErrors>({});

    /* ── Import error state ─────────────────────────────────── */
    const [localStoreError, setLocalStoreError] = useState<string | null>(null);
    const [globalError, setGlobalError] = useState<string | null>(null);
    const [resolvedProgram, setResolvedProgram] = useState<Dhis2Program | null>(null);
    const [dhis2Saved, setDhis2Saved] = useState(false);

    /* ── Search state ───────────────────────────────────────── */
    const [deQ, setDeQ] = useState('');
    const [osQ, setOsQ] = useState('');
    const [piQ, setPiQ] = useState('');

    const clearImportErrors = () => {
        setLocalStoreError(null);
        setGlobalError(null);
    };

    const reset = () => {
        setFileName(null); setPreview(null); setWarnings([]);
        setParseError(null); clearImportErrors(); setErrors({});
        setName(''); setShortName(''); setCode(''); setDescription('');
        setDeQ(''); setOsQ(''); setPiQ('');
        setResolvedProgram(null); setDhis2Saved(false);
    };

    /* ── File loading ───────────────────────────────────────── */
    const loadFile = useCallback((file: File) => {
        setParseError(null); clearImportErrors(); setErrors({});

        if (!file.name.toLowerCase().endsWith('.json')) {
            setParseError(i18n.t('Only .json files are supported.'));
            return;
        }

        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const raw = JSON.parse(String(ev.target?.result ?? '')) as RawMetadataJson;
                const parsed = parseAssessmentJson(raw);
                setPreview(parsed);
                setWarnings(parsed.parseErrors ?? []);

                const p = parsed.program;
                const ps = parsed.programStage;
                if (p) {
                    setName(p.name);
                    setShortName(safe(p.shortName).slice(0, 50));
                    setCode(
                        safe(p.name)
                            .toUpperCase()
                            .replace(/[^A-Z0-9]+/g, '_')
                            .replace(/^_+|_+$/g, '')
                            .slice(0, 64),
                    );
                    setDescription(safe(ps?.description));
                }
            } catch (e) {
                setPreview(null); setWarnings([]);
                setParseError(
                    e instanceof Error
                        ? `${i18n.t('Failed to parse JSON:')} ${e.message}`
                        : i18n.t('Failed to parse JSON.'),
                );
            }
        };
        reader.readAsText(file);
    }, []);

    /* ── Filtered preview ───────────────────────────────────── */
    const filtered = useMemo(() => {
        if (!preview) return null;
        const q = (s: string) => s.toLowerCase();
        const de = q(deQ.trim());
        const os = q(osQ.trim());
        const pi = q(piQ.trim());

        return {
            ...preview,
            dataElements: !de
                ? preview.dataElements
                : preview.dataElements.filter(d =>
                    [d.code, d.name, d.shortName, d.sectionName ?? '', d.optionSetName ?? '']
                        .join(' ').toLowerCase().includes(de),
                ),
            optionSets: !os
                ? preview.optionSets
                : preview.optionSets.filter(o =>
                    [o.name, o.valueType, o.id].join(' ').toLowerCase().includes(os),
                ),
            programIndicators: !pi
                ? preview.programIndicators
                : preview.programIndicators.filter(p =>
                    [p.name, p.analyticsType, p.aggregationType, p.filter ?? '']
                        .join(' ').toLowerCase().includes(pi),
                ),
        };
    }, [preview, deQ, osQ, piQ]);

    /* ── Validation ─────────────────────────────────────────── */
    const validate = (): FormErrors => {
        const e: FormErrors = {};
        if (!name.trim()) e.name = i18n.t('Name is required');
        if (!shortName.trim()) e.shortName = i18n.t('Short name is required');
        if (!code.trim()) e.code = i18n.t('Code is required');
        else if (!/^[A-Z0-9_-]+$/i.test(code.trim()))
            e.code = i18n.t('Use letters, digits, underscores, and hyphens only');
        return e;
    };

    /* ── Save to local dataStore ───────────────────────────── */
    const saveToLocalStore = async (program: Dhis2Program): Promise<boolean> => {
        setLocalStoreError(null);
        try {
            await saveAssessment.mutateAsync({
                name: program.name,
                shortName: program.shortName,
                code: program.code,
                programId: program.id,
                status: 'active',
            });
            return true;
        } catch (e) {
            const msg = e instanceof Error ? e.message : i18n.t('Unknown error');
            setLocalStoreError(i18n.t('Failed to save to local store: {{msg}}', { msg }));
            return false;
        }
    };

    /* ── Full import ────────────────────────────────────────── */
    const onImport = async () => {
        clearImportErrors();
        const v = validate();
        setErrors(v);
        if (Object.keys(v).length || !preview) return;

        try {
            await saveProgramToDhis2({ preview });

            const searchCode = code.trim();
            const dhis2Result = await engine.query({
                program: {
                    resource: 'programs',
                    params: {
                        filter: `code:eq:${searchCode}`,
                        fields: 'id,name,shortName,code',
                        paging: false,
                    },
                },
            }) as { program: { programs: Dhis2Program[] } };

            const programs = dhis2Result.program.programs;
            if (!programs || programs.length === 0) {
                throw new Error(
                    i18n.t('Could not find the imported program in DHIS2 (code: {{code}}). Please check the import and try again.', { code: searchCode }),
                );
            }

            const dhis2Program = programs[0];
            setResolvedProgram(dhis2Program);
            setDhis2Saved(true);

            const ok = await saveToLocalStore(dhis2Program);
            if (ok) navigate('/chat/settings');
        } catch (e) {
            setGlobalError(e instanceof Error ? e.message : i18n.t('Failed to import assessment.'));
        }
    };

    /* ── Retry handler ──────────────────────────────────────── */
    const retryLocalStore = async () => {
        if (!resolvedProgram) return;
        const ok = await saveToLocalStore(resolvedProgram);
        if (ok) navigate('/chat/settings');
    };

    const hasErrors = localStoreError !== null;

    /* ── Render ─────────────────────────────────────────────── */
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
                    <span className={styles.crumbHere}>{i18n.t('Import assessment')}</span>
                </div>
            </div>

            <div className={styles.header}>
                <div className={styles.headerInner}>
                    <div>
                        <h2 className={styles.title}>{i18n.t('Import assessment')}</h2>
                        <p className={styles.desc}>
                            {i18n.t(
                                'Upload a DHIS2 metadata JSON export, review the detected program, sections, data elements and option sets, then confirm details and import.',
                            )}
                        </p>
                    </div>
                    <Steps current={preview ? 2 : 1} />
                </div>
            </div>

            {(parseError || warnings.length > 0) && (
                <div className={styles.errStack}>
                    {parseError && <NoticeBox error title={i18n.t('File error')}>{parseError}</NoticeBox>}
                    {warnings.map((w, idx) => (
                        <NoticeBox key={idx} warning title={i18n.t('Parse warning')}>{w}</NoticeBox>
                    ))}
                </div>
            )}

            {globalError && (
                <div className={styles.errStack}>
                    <NoticeBox error title={i18n.t('Import failed')}>
                        {globalError}
                    </NoticeBox>
                </div>
            )}

            {hasErrors && (
                <div className={styles.errStack}>
                    <NoticeBox warning title={i18n.t('Local store save failed')}>
                        <p>{localStoreError}</p>
                        <p style={{ marginTop: 6, fontSize: 12, color: '#64748b' }}>
                            {i18n.t('The program was saved to DHIS2 successfully. Only the local record failed.')}
                        </p>
                        <Button small onClick={retryLocalStore} loading={saveAssessment.isPending}>
                            {i18n.t('Retry')}
                        </Button>
                    </NoticeBox>
                </div>
            )}

            {!preview ? (
                <DropZone onFile={loadFile} />
            ) : (
                <>
                    <FileBanner fileName={fileName!} preview={preview} onRemove={reset} />

                    <div className={styles.cards}>
                        {filtered && (
                            <>
                                <ProgramCard preview={filtered} />
                                <SectionsCard sections={filtered.sections} />
                                <DataElementsCard dataElements={filtered.dataElements} query={deQ} setQuery={setDeQ} />
                                <OptionSetsCard optionSets={filtered.optionSets} query={osQ} setQuery={setOsQ} />
                                <ProgramIndicatorsCard indicators={filtered.programIndicators} query={piQ} setQuery={setPiQ} />
                            </>
                        )}
                    </div>

                    <div className={styles.footer}>
                        <Button
                            primary
                            onClick={onImport}
                            loading={isSaving}
                            disabled={isSaving || hasErrors}
                        >
                            {isSaving ? i18n.t('Importing…') : i18n.t('Import assessment')}
                        </Button>
                        <Button secondary onClick={() => navigate('/chat/settings')} disabled={isSaving}>
                            {dhis2Saved ? i18n.t('Close') : i18n.t('Cancel')}
                        </Button>
                        <div className={styles.footerSummary}>
                            <span>{i18n.t('Ready to import')}</span>
                            <span className={styles.footerBadge}>
                                ✓
                                {i18n.t('Preview loaded')}
                            </span>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};