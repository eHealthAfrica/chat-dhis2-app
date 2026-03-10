import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
    Button, ButtonStrip, CircularLoader, NoticeBox,
    IconArrowLeft16, IconArrowRight16, IconSave16,
} from '@dhis2/ui';
import { Card } from '@dhis2-chat/ui';
import i18n from '@dhis2/d2-i18n';
import { useDhis2Program } from '../hooks/useDhis2Program';
import { useDraft, EventDraft } from '../hooks/useDraft';
import { useEvent } from '../hooks/useEvents';
import { useSubmitEvent } from '../hooks/useSubmitEvent';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { SectionStep, isSectionValid } from '../components/SectionStep';
import { useAssessments } from '../ChatSettings/hooks/useAssessments';
import { OrgUnitGate, SelectedOrgUnit } from '../components/OrgUnitGate';
import styles from './CaptureForm.module.css';
import { OrgUnitCard } from '@/features/chat/components/OrgUnitGate/OrgUnitGate';

/* ─────────────────────────────────────────────────────────────
   Vertical section nav
───────────────────────────────────────────────────────────── */
interface SectionNavProps {
    labels: string[];
    current: number; // 0 = org unit gate
    completed: number[];
    valid: boolean[]; // per-section validity
    onSelect: (idx: number) => void;
    orgUnitSet: boolean;
}

const SectionNav = ({ labels, current, completed, valid, onSelect, orgUnitSet }: SectionNavProps) => (
    <nav className={styles.sectionNav}>
        {/* Org unit step — always index 0 */}
        <button
            className={[
                styles.navItem,
                current === 0 ? styles.navActive : '',
                orgUnitSet ? styles.navDone : '',
            ].join(' ')}
            onClick={() => onSelect(0)}
        >
            <span className={styles.navBubble}>
                {orgUnitSet ? '✓' : '1'}
            </span>
            <span className={styles.navLabel}>{i18n.t('Organisation unit')}</span>
        </button>

        {/* Section steps — index 1..n */}
        {labels.map((label, idx) => {
            const stepIdx = idx + 1;
            const isDone = completed.includes(stepIdx);
            const isActive = current === stepIdx;
            // a section is reachable only if it has been completed already,
            // or it is the immediate next step after the highest completed one
            const highestDone = completed.length > 0 ? Math.max(...completed) : 0;
            const canClick = orgUnitSet && (isDone || stepIdx === highestDone + 1);

            return (
                <button
                    key={stepIdx}
                    className={[
                        styles.navItem,
                        isActive ? styles.navActive : '',
                        isDone ? styles.navDone : '',
                        !canClick ? styles.navDisabled : '',
                    ].join(' ')}
                    disabled={!canClick}
                    onClick={() => canClick && onSelect(stepIdx)}
                >
                    <span className={styles.navBubble}>
                        {isDone ? '\u2713' : stepIdx + 1}
                    </span>
                    <span className={styles.navLabel}>{label}</span>
                    {isDone && !valid[idx] && (
                        <span className={styles.navWarn} title={i18n.t('Has incomplete required fields')}>!</span>
                    )}
                </button>
            );
        })}
    </nav>
);

/* ─────────────────────────────────────────────────────────────
   Main
───────────────────────────────────────────────────────────── */
const CaptureForm = () => {
    const { programId, eventId } = useParams<{ programId: string; eventId?: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    const prefilledOrgUnit = location.state?.orgUnit as SelectedOrgUnit | undefined;
    // Only restore a draft when the user explicitly clicked "Continue" in CaptureList
    const continueDraft = location.state?.continueDraft === true;

    const { assessments } = useAssessments();
    const assessment = assessments.find(a => a.programId === programId) ?? null;
    const { user } = useCurrentUser();
    const { program, isLoading: progLoad } = useDhis2Program(programId ?? null);
    const { event, isLoading: evLoad } = useEvent(eventId ?? null);
    const submitEvent = useSubmitEvent();

    const { readDraft, saveDraft, deleteDraft } = useDraft(
        programId ?? '',
        user?.id ?? '',
    );

    const [orgUnit, setOrgUnit] = useState<SelectedOrgUnit | null>(null);
    const [currentSection, setCurrentSection] = useState<number>(0);
    const [values, setValues] = useState<Record<string, string>>({});
    const [completedSections, setCompletedSections] = useState<number[]>([]);
    const [saveStatus, setSaveStatus] = useState<string>('');
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [draftLoaded, setDraftLoaded] = useState(false);

    const isEditMode = !!eventId;

    useEffect(() => {
        if (!user || progLoad || draftLoaded) return;
        if (isEditMode && evLoad) return;

        const load = async () => {
            // Edit mode: load the existing DHIS2 event
            if (isEditMode) {
                if (event) {
                    const flat: Record<string, string> = {};
                    event.dataValues.forEach((dv) => {
                        flat[dv.dataElement] = dv.value;
                    });
                    setValues(flat);
                    setOrgUnit({ id: event.orgUnit, name: event.orgUnitName, path: '' });
                    setCurrentSection(1);
                    const stageLen = program?.programStages?.[0]?.programStageSections?.length ?? 0;
                    setCompletedSections(Array.from({ length: stageLen }, (_, i) => i + 1));
                    setDraftLoaded(true);
                    return;
                }
            }

            // New assessment: only restore draft if user explicitly chose "Continue"
            if (continueDraft) {
                const draft = await readDraft();
                if (draft) {
                    setValues(draft.values);
                    setOrgUnit(draft.orgUnit ? { id: draft.orgUnit, name: draft.orgUnitName, path: '' } : null);
                    setCurrentSection(draft.currentSection);
                    setCompletedSections(draft.completedSections);
                    setSaveStatus(i18n.t('Draft restored — {{time}}', { time: new Date(draft.savedAt).toLocaleTimeString() }));
                    setDraftLoaded(true);
                    return;
                }
            }

            // Fresh start: pre-fill org unit if provided (from "New assessment" button)
            if (prefilledOrgUnit) {
                setOrgUnit(prefilledOrgUnit);
                setCurrentSection(1);
                setCompletedSections([0]);
            }
            setDraftLoaded(true);
        };

        load();
    }, [user, progLoad, evLoad, draftLoaded, isEditMode, event]);

    /* ── Derived ── */
    const stage = program?.programStages?.[0];
    const sections = stage?.programStageSections ?? [];

    const compulsoryMap = Object.fromEntries(
        (stage?.programStageDataElements ?? []).map(psde => [psde.dataElement.id, psde.compulsory]),
    );
    const deMap = Object.fromEntries(
        (stage?.programStageDataElements ?? []).map(psde => [psde.dataElement.id, psde.dataElement]),
    );

    const sectionMetas = sections.map(sec => ({
        id: sec.id,
        name: sec.name,
        dataElements: sec.dataElements
            .map((ref) => {
                const de = deMap[ref.id];
                if (!de) return null;
                return { id: de.id, name: de.name, valueType: de.valueType, compulsory: compulsoryMap[de.id] ?? false, description: de.description || undefined, optionSet: de.optionSet ?? undefined };
            })
            .filter(Boolean) as any[],
    }));

    // Per-section validity (used by nav to flag incomplete sections)
    const sectionValidity = sectionMetas.map(s => isSectionValid(s.dataElements, values));

    const sectionIdx = currentSection - 1;
    const currentMeta = sectionMetas[sectionIdx];
    const isLastSection = currentSection === sectionMetas.length;
    const currentSectionValid = sectionIdx >= 0 ? sectionValidity[sectionIdx] : true;
    const allSectionsValid = sectionValidity.every(Boolean) && !!orgUnit;

    /* ── Handlers ── */
    const handleFieldChange = useCallback((id: string, value: string) => {
        setValues(prev => ({ ...prev, [id]: value }));
    }, []);

    const handleOrgUnitConfirm = (ou: SelectedOrgUnit) => {
        setOrgUnit(ou);
        const newCompleted = completedSections.includes(0) ? completedSections : [...completedSections, 0];
        setCompletedSections(newCompleted);
        // jump to first section if not already in one
        if (currentSection === 0) setCurrentSection(1);
    };

    const handleNext = () => {
        const newCompleted = completedSections.includes(currentSection)
            ? completedSections
            : [...completedSections, currentSection];
        setCompletedSections(newCompleted);
        setCurrentSection(prev => prev + 1);
    };

    const handleNavSelect = (idx: number) => {
        // mark current section completed when navigating away,
        // but only if it is valid — keeps the unlock chain honest
        if (currentSectionValid && !completedSections.includes(currentSection)) {
            setCompletedSections(prev => [...prev, currentSection]);
        }
        setCurrentSection(idx);
    };

    const buildDraft = (overrides: Partial<EventDraft> = {}): EventDraft => ({
        draftId: `${programId}:${user!.id}`,
        programId: programId!,
        eventId,
        orgUnit: orgUnit!.id,
        orgUnitName: orgUnit!.name,
        currentSection,
        values,
        completedSections,
        savedAt: new Date().toISOString(),
        userUid: user!.id,
        ...overrides,
    });

    const handleSave = async () => {
        if (!user || !orgUnit) return;
        await saveDraft(buildDraft());
        setSaveStatus(i18n.t('Saved at {{time}}', { time: new Date().toLocaleTimeString() }));
    };

    const handleSubmit = async () => {
        if (!user || !orgUnit || !stage) return;
        setSubmitError(null);
        try {
            await submitEvent.mutateAsync({
                draft: buildDraft(),
                programStageId: stage.id,
                onDraftDeleted: deleteDraft,
            });
            navigate(`/chat/data-capture/${programId}`);
        } catch (e) {
            setSubmitError(e instanceof Error ? e.message : i18n.t('Submission failed.'));
        }
    };

    /* ── Loading ── */
    const isStillLoading = progLoad || (isEditMode && evLoad) || !draftLoaded;
    if (isStillLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                <CircularLoader />
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <Button
                secondary
                small
                icon={<IconArrowLeft16 />}
                onClick={() => navigate(`/chat/data-capture/${programId}`)}
                className={styles.backBtn}
            >
                {i18n.t('Back')}
            </Button>

            <div className={styles.programHeader}>
                {/* Programme name, code, description */}
                <div className={styles.programHeaderMain}>
                    <h2 className={styles.programName}>
                        {assessment?.name ?? (isEditMode ? i18n.t('Edit assessment') : i18n.t('New assessment'))}
                    </h2>
                    {assessment && (
                        <div className={styles.programMeta}>
                            <span className={styles.programCode}>{assessment.code}</span>
                            {assessment.shortName && assessment.shortName !== assessment.name && (
                                <span className={styles.programShortName}>{assessment.shortName}</span>
                            )}
                        </div>
                    )}
                    {program?.programStages?.[0]?.description && (
                        <p className={styles.programDesc}>{program.programStages[0].description}</p>
                    )}
                </div>
                {/* Selected org unit — only shown once confirmed */}
                {orgUnit && (
                    <div className={styles.ouHeaderRow}>
                        {/* <div className={styles.ouHeaderField}> */}
                        {/*    <span className={styles.ouFieldLabel}>{i18n.t('Organisation unit')}</span> */}
                        {/*    <span className={styles.ouFieldValue}>{ouDetails?.displayName ?? orgUnit.name}</span> */}

                        {/* </div> */}
                        {/* {(ouDetails?.level) && ( */}
                        {/*    <div className={styles.ouHeaderField}> */}
                        {/*        <span className={styles.ouFieldLabel}>{i18n.t('Level')}</span> */}
                        {/*        <span className={styles.ouFieldCode}>{ouDetails.level}</span> */}
                        {/*    </div> */}
                        {/* )} */}
                        <OrgUnitCard id={orgUnit.id} name={orgUnit.name} />
                    </div>
                )}
            </div>

            {submitError && (
                <NoticeBox error title={i18n.t('Submission failed')}>
                    {submitError}
                </NoticeBox>
            )}

            <div className={styles.layout}>
                {/* ── Left: vertical section nav ── */}
                <SectionNav
                    labels={sectionMetas.map(s => s.name)}
                    current={currentSection}
                    completed={completedSections}
                    valid={sectionValidity}
                    onSelect={handleNavSelect}
                    orgUnitSet={!!orgUnit}
                />

                {/* ── Right: content + footer ── */}
                <div className={styles.contentCol}>
                    <Card>
                        <div className={styles.cardBody}>
                            {currentSection === 0 && (
                                <OrgUnitGate initial={orgUnit} onConfirm={handleOrgUnitConfirm} />
                            )}

                            {currentSection > 0 && currentMeta && (
                                <SectionStep
                                    section={currentMeta}
                                    values={values}
                                    onChange={handleFieldChange}
                                    isValid={sectionValidity[sectionIdx]}
                                />
                            )}
                        </div>
                    </Card>

                    {/* Footer — visible once org unit is set */}
                    {orgUnit && currentSection > 0 && (
                        <div className={styles.footer}>
                            {saveStatus && <span className={styles.saveStatus}>{saveStatus}</span>}
                            <ButtonStrip end>
                                <Button
                                    secondary
                                    icon={<IconSave16 />}
                                    onClick={handleSave}
                                >
                                    {i18n.t('Save progress')}
                                </Button>

                                {/* Next — shown on every section except the last */}
                                {!isLastSection && (
                                    <Button
                                        primary
                                        icon={<IconArrowRight16 />}
                                        disabled={!currentSectionValid}
                                        onClick={handleNext}
                                    >
                                        {i18n.t('Next')}
                                    </Button>
                                )}

                                {/* Submit — shown only on the last section */}
                                {isLastSection && (
                                    <Button
                                        primary
                                        onClick={handleSubmit}
                                        loading={submitEvent.isPending}
                                        disabled={!allSectionsValid || submitEvent.isPending}
                                    >
                                        {i18n.t('Submit')}
                                    </Button>
                                )}
                            </ButtonStrip>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CaptureForm;
