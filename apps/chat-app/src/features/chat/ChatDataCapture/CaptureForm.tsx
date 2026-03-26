import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
    Button,
    ButtonStrip,
    CircularLoader,
    IconArrowLeft16,
    IconArrowRight16,
    IconSave16,
    InputField,
    NoticeBox,
} from '@dhis2/ui';
import { Card } from '@dhis2-chat/ui';
import i18n from '@dhis2/d2-i18n';
import { useDhis2Program } from '../hooks/useDhis2Program';
import { EventDraft, useDraft } from '../hooks/useDraft';
import { useEvent } from '../hooks/useEvents';
import { useOrgUnitDetails } from '../hooks/useOrgUnitDetails';
import { useSubmitEvent } from '../hooks/useSubmitEvent';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { SectionStep, isSectionValid } from '../components/SectionStep';
import { useAssessments } from '../ChatSettings/hooks/useAssessments';
import { OrgUnitGate, SelectedOrgUnit } from '../components/OrgUnitGate';
import { OrgUnitCard } from '../components/OrgUnitGate/OrgUnitGate';
import styles from './CaptureForm.module.css';

const normalizeDateInputValue = (value?: string | null) => {
    if (!value) return '';

    const trimmed = value.trim();
    if (!trimmed) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return '';

    return parsed.toISOString().split('T')[0];
};

interface SectionNavProps {
    labels: string[];
    current: number;
    completed: number[];
    valid: boolean[];
    reportDateValid: boolean;
    onSelect: (idx: number) => void;
    orgUnitSet: boolean;
    hideOrgUnitStep: boolean;
}

const SectionNav = ({
    labels,
    current,
    completed,
    valid,
    reportDateValid,
    onSelect,
    orgUnitSet,
    hideOrgUnitStep,
}: SectionNavProps) => {
    const highestDone = completed.length > 0 ? Math.max(...completed) : -1;
    const firstVisibleStep = hideOrgUnitStep ? 1 : 0;

    const canClick = (stepIdx: number, isDone: boolean) =>
        stepIdx === firstVisibleStep || (orgUnitSet && (isDone || stepIdx === highestDone + 1));

    return (
        <nav className={styles.sectionNav}>
            {!hideOrgUnitStep && (
                <button
                    className={[
                        styles.navItem,
                        current === 0 ? styles.navActive : '',
                        orgUnitSet ? styles.navDone : '',
                    ].join(' ')}
                    onClick={() => onSelect(0)}
                >
                    <span className={styles.navBubble}>
                        {orgUnitSet ? '\u2713' : '1'}
                    </span>
                    <span className={styles.navLabel}>{i18n.t('Organisation unit')}</span>
                </button>
            )}

            {(() => {
                const stepIdx = 1;
                const isDone = completed.includes(stepIdx);
                const isActive = current === stepIdx;
                const isClickable = canClick(stepIdx, isDone);

                return (
                    <button
                        className={[
                            styles.navItem,
                            isActive ? styles.navActive : '',
                            isDone ? styles.navDone : '',
                            !isClickable ? styles.navDisabled : '',
                        ].join(' ')}
                        disabled={!isClickable}
                        onClick={() => isClickable && onSelect(stepIdx)}
                    >
                        <span className={styles.navBubble}>
                            {isDone ? '\u2713' : hideOrgUnitStep ? '1' : '2'}
                        </span>
                        <span className={styles.navLabel}>{i18n.t('Report date')}</span>
                        {isDone && !reportDateValid && (
                            <span
                                className={styles.navWarn}
                                title={i18n.t('Has incomplete required fields')}
                            >
                                !
                            </span>
                        )}
                    </button>
                );
            })()}

            {labels.map((label, idx) => {
                const stepIdx = idx + 2;
                const isDone = completed.includes(stepIdx);
                const isActive = current === stepIdx;
                const isClickable = canClick(stepIdx, isDone);

                return (
                    <button
                        key={stepIdx}
                        className={[
                            styles.navItem,
                            isActive ? styles.navActive : '',
                            isDone ? styles.navDone : '',
                            !isClickable ? styles.navDisabled : '',
                        ].join(' ')}
                        disabled={!isClickable}
                        onClick={() => isClickable && onSelect(stepIdx)}
                    >
                        <span className={styles.navBubble}>
                            {isDone ? '\u2713' : hideOrgUnitStep ? stepIdx : stepIdx + 1}
                        </span>
                        <span className={styles.navLabel}>{label}</span>
                        {isDone && !valid[idx] && (
                            <span
                                className={styles.navWarn}
                                title={i18n.t('Has incomplete required fields')}
                            >
                                !
                            </span>
                        )}
                    </button>
                );
            })}
        </nav>
    );
};

const CaptureForm = () => {
    const { programId, eventId } = useParams<{ programId: string; eventId?: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    const prefilledOrgUnit = location.state?.orgUnit as SelectedOrgUnit | undefined;
    const continueDraft = location.state?.continueDraft === true;
    const requestedDraftId = location.state?.draftId as string | undefined;

    const { assessments } = useAssessments();
    const assessment = assessments.find(a => a.programId === programId) ?? null;
    const { user } = useCurrentUser();
    const { program, isLoading: progLoad } = useDhis2Program(programId ?? null);
    const { event, isLoading: evLoad } = useEvent(eventId ?? null);
    const { details: eventOrgUnitDetails, isLoading: eventOrgUnitLoad } = useOrgUnitDetails(
        event?.orgUnit ?? null,
    );
    const submitEvent = useSubmitEvent();

    const { readDraft, saveDraft, deleteDraft } = useDraft(
        programId ?? '',
        user?.id ?? '',
    );

    const [orgUnit, setOrgUnit] = useState<SelectedOrgUnit | null>(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [values, setValues] = useState<Record<string, string>>({});
    const [completedSteps, setCompletedSteps] = useState<number[]>([]);
    const [reportDate, setReportDate] = useState('');
    const [activeDraftId, setActiveDraftId] = useState<string | null>(requestedDraftId ?? null);
    const [reportDateTouched, setReportDateTouched] = useState(false);
    const [saveStatus, setSaveStatus] = useState('');
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [draftLoaded, setDraftLoaded] = useState(false);

    const isEditMode = !!eventId;
    const isCompletedEvent = isEditMode && event?.status === 'COMPLETED';

    const stage = program?.programStages?.[0];
    const sections = stage?.programStageSections ?? [];
    const reportDateRequired = true;

    useEffect(() => {
        if (!user || progLoad || draftLoaded) return;
        if (isEditMode && (evLoad || eventOrgUnitLoad)) return;

        const load = async () => {
            if (isEditMode && event) {
                const flat: Record<string, string> = {};
                event.dataValues.forEach(dataValue => {
                    flat[dataValue.dataElement] = dataValue.value;
                });

                const stageLen = program?.programStages?.[0]?.programStageSections?.length ?? 0;
                setValues(flat);
                setOrgUnit({
                    id: event.orgUnit,
                    name: eventOrgUnitDetails?.displayName
                        || eventOrgUnitDetails?.name
                        || event.orgUnitName
                        || event.orgUnit,
                    path: eventOrgUnitDetails?.path ?? '',
                });
                setReportDate(normalizeDateInputValue(event.occurredAt));
                setCurrentStep(stageLen > 0 ? 2 : 1);
                setCompletedSteps(Array.from({ length: stageLen + 2 }, (_, index) => index));
                setDraftLoaded(true);
                return;
            }

            if (continueDraft) {
                const draft = await readDraft(
                    requestedDraftId ? { draftId: requestedDraftId } : undefined,
                );

                if (draft) {
                    setValues(draft.values);
                    setOrgUnit(
                        draft.orgUnit
                            ? {
                                id: draft.orgUnit,
                                name: draft.orgUnitName,
                                path: draft.orgUnitPath ?? '',
                            }
                            : null,
                    );
                    setReportDate(normalizeDateInputValue(draft.reportDate ?? draft.eventDate ?? ''));
                    setCurrentStep(
                        draft.currentSection,
                    );
                    setCompletedSteps(draft.completedSections);
                    setActiveDraftId(draft.draftId);
                    setSaveStatus(i18n.t('Draft restored at {{time}}', {
                        time: new Date(draft.savedAt).toLocaleTimeString(),
                    }));
                    setDraftLoaded(true);
                    return;
                }
            }

            if (prefilledOrgUnit) {
                setOrgUnit(prefilledOrgUnit);
                setCurrentStep(1);
                setCompletedSteps([0]);
            }

            setDraftLoaded(true);
        };

        load();
    }, [
        continueDraft,
        draftLoaded,
        evLoad,
        event,
        eventOrgUnitDetails,
        eventOrgUnitLoad,
        isEditMode,
        prefilledOrgUnit,
        progLoad,
        program,
        readDraft,
        requestedDraftId,
        user,
    ]);

    const compulsoryMap = Object.fromEntries(
        (stage?.programStageDataElements ?? []).map(psde => [psde.dataElement.id, psde.compulsory]),
    );
    const deMap = Object.fromEntries(
        (stage?.programStageDataElements ?? []).map(psde => [psde.dataElement.id, psde.dataElement]),
    );

    const sectionMetas = sections.map(section => ({
        id: section.id,
        name: section.name,
        dataElements: section.dataElements
            .map((ref) => {
                const dataElement = deMap[ref.id];
                if (!dataElement) return null;

                return {
                    id: dataElement.id,
                    name: dataElement.name,
                    valueType: dataElement.valueType,
                    compulsory: compulsoryMap[dataElement.id] ?? false,
                    description: dataElement.description || undefined,
                    optionSet: dataElement.optionSet ?? undefined,
                };
            })
            .filter(Boolean) as Array<{
                id: string;
                name: string;
                valueType: string;
                compulsory: boolean;
                description?: string;
                optionSet?: { options: Array<{ code: string; name: string }> };
            }>,
    }));

    const sectionValidity = sectionMetas.map(section => isSectionValid(section.dataElements, values));
    const reportDateValid = !reportDateRequired || !!reportDate;
    const sectionIdx = currentStep - 2;
    const currentMeta = currentStep >= 2 ? sectionMetas[sectionIdx] : null;
    const isReportDateStep = currentStep === 1;
    const isLastSection = currentStep === sectionMetas.length + 1;
    const hasSections = sectionMetas.length > 0;
    const currentStepValid = currentStep === 0
        ? !!orgUnit
        : currentStep === 1
            ? reportDateValid
            : (sectionValidity[sectionIdx] ?? true);
    const allSectionsValid = sectionValidity.every(Boolean) && !!orgUnit && !!stage && reportDateValid;
    const showSubmit = hasSections ? isLastSection : isReportDateStep;
    const showNext = currentStep > 0 && !showSubmit;
    const canSaveProgress = Boolean(user && orgUnit && reportDate);

    const handleFieldChange = useCallback((id: string, value: string) => {
        setValues(prev => ({ ...prev, [id]: value }));
    }, []);

    const handleOrgUnitConfirm = (nextOrgUnit: SelectedOrgUnit) => {
        setOrgUnit(nextOrgUnit);
        setCompletedSteps(prev => (prev.includes(0) ? prev : [...prev, 0]));
        if (currentStep === 0) setCurrentStep(1);
    };

    const markCurrentStepComplete = () => {
        if (!currentStepValid || completedSteps.includes(currentStep)) return;
        setCompletedSteps(prev => [...prev, currentStep]);
    };

    const handleNext = () => {
        if (currentStep === 1 && !reportDateValid) {
            setReportDateTouched(true);
            return;
        }

        markCurrentStepComplete();
        setCurrentStep(prev => prev + 1);
    };

    const handleNavSelect = (idx: number) => {
        markCurrentStepComplete();
        setCurrentStep(idx);
    };

    const buildDraft = (overrides: Partial<EventDraft> = {}): EventDraft => ({
        draftId: activeDraftId ?? `${programId}:${user!.id}`,
        programId: programId!,
        eventId,
        orgUnit: orgUnit!.id,
        orgUnitName: orgUnit!.name,
        orgUnitPath: orgUnit!.path,
        currentSection: currentStep,
        reportDate,
        values,
        completedSections: completedSteps,
        savedAt: new Date().toISOString(),
        userUid: user!.id,
        ...overrides,
    });

    const handleSave = async () => {
        if (!canSaveProgress || !user || !orgUnit) return;

        const savedDraft = await saveDraft(buildDraft());
        setActiveDraftId(savedDraft.draftId);
        setSaveStatus(i18n.t('Saved at {{time}}', {
            time: new Date(savedDraft.savedAt).toLocaleTimeString(),
        }));
    };

    const handleSubmit = async () => {
        if (!user || !orgUnit || !stage || !reportDateValid) return;

        if (!reportDate) {
            setReportDateTouched(true);
        }

        setSubmitError(null);

        try {
            await submitEvent.mutateAsync({
                draft: buildDraft(),
                programStageId: stage.id,
                onDraftDeleted: () => (
                    activeDraftId
                        ? deleteDraft({ draftId: activeDraftId })
                        : deleteDraft({ orgUnit: orgUnit.id, reportDate })
                ),
            });
            navigate(`/chat/data-capture/${programId}`);
        } catch (error) {
            setSubmitError(
                error instanceof Error
                    ? error.message
                    : i18n.t('Submission failed.'),
            );
        }
    };

    const isStillLoading = progLoad || (isEditMode && (evLoad || eventOrgUnitLoad)) || !draftLoaded;
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
                <div className={styles.programHeaderMain}>
                    <h2 className={styles.programName}>
                        {assessment?.name ?? (
                            isEditMode ? i18n.t('Edit assessment') : i18n.t('New assessment')
                        )}
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
                {orgUnit && (
                    <div className={styles.ouHeaderRow}>
                        <OrgUnitCard id={orgUnit.id} name={orgUnit.name} />
                    </div>
                )}
            </div>

            {submitError && (
                <NoticeBox error title={i18n.t('Submission failed')} className={styles.notice}>
                    {submitError}
                </NoticeBox>
            )}

            <div className={styles.layout}>
                <SectionNav
                    labels={sectionMetas.map(section => section.name)}
                    current={currentStep}
                    completed={completedSteps}
                    valid={sectionValidity}
                    reportDateValid={reportDateValid}
                    onSelect={handleNavSelect}
                    orgUnitSet={!!orgUnit}
                    hideOrgUnitStep={isCompletedEvent}
                />

                <div className={styles.contentCol}>
                    <Card className={styles.formCard}>
                        <div className={styles.cardBody}>
                            {currentStep === 0 && !isCompletedEvent && (
                                <OrgUnitGate initial={orgUnit} onConfirm={handleOrgUnitConfirm} />
                            )}

                            {currentStep === 1 && (
                                <div className={styles.sectionStep}>
                                    <p className={styles.sectionTitle}>{i18n.t('Report date')}</p>
                                    <p className={styles.sectionProgress}>
                                        {i18n.t('Capture the report date for this assessment before continuing.')}
                                    </p>
                                    <div className={styles.fieldList}>
                                        <InputField
                                            label={i18n.t('Report date')}
                                            type="date"
                                            value={reportDate}
                                            required={reportDateRequired}
                                            error={reportDateTouched && reportDateRequired && !reportDate}
                                            validationText={
                                                reportDateTouched && reportDateRequired && !reportDate
                                                    ? i18n.t('This field is required')
                                                    : undefined
                                            }
                                            onChange={({ value }) => setReportDate(value ?? '')}
                                            onBlur={() => setReportDateTouched(true)}
                                        />
                                    </div>
                                </div>
                            )}

                            {currentStep > 1 && currentMeta && (
                                <SectionStep
                                    section={currentMeta}
                                    values={values}
                                    onChange={handleFieldChange}
                                    isValid={sectionValidity[sectionIdx]}
                                />
                            )}
                        </div>
                    </Card>

                    {orgUnit && currentStep > 0 && (
                        <div className={styles.footer}>
                            {saveStatus && <span className={styles.saveStatus}>{saveStatus}</span>}
                            <ButtonStrip end>
                                <Button
                                    secondary
                                    icon={<IconSave16 />}
                                    onClick={handleSave}
                                    disabled={!canSaveProgress}
                                >
                                    {i18n.t('Save progress')}
                                </Button>

                                {showNext && (
                                    <Button
                                        primary
                                        icon={<IconArrowRight16 />}
                                        disabled={!currentStepValid}
                                        onClick={handleNext}
                                    >
                                        {i18n.t('Next')}
                                    </Button>
                                )}

                                {showSubmit && (
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


