import { useDataEngine } from '@dhis2/app-runtime';
import { useAlert }      from '@dhis2/app-service-alerts';
import { useMutation }   from '@tanstack/react-query';
import i18n              from '@dhis2/d2-i18n';
import { AssessmentPreview } from '../NewAssessment/parseAssessmentJson';

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────── */
export interface SaveProgramPayload {
    preview: AssessmentPreview;
    selectedOrgUnits: Array<{ id: string }>;
}

export interface SaveProgramResult {
    status: string;
    stats: {
        created: number;
        updated: number;
        ignored: number;
        deleted: number;
        total:   number;
    };
    typeReports?: unknown[];
}

type UseSaveProgramToDhis2Options = {
    onSuccess?: (result: SaveProgramResult) => void;
    onError?:   (error: unknown) => void;
};

/* ─────────────────────────────────────────────────────────────
   Build DHIS2 metadata payload in required import order:
     1. optionSets  2. options  3. dataElements
     4. programStageSections  5. programStages
     6. programs  7. programIndicators
───────────────────────────────────────────────────────────── */
const generateCode = (name: string): string =>
    name
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/, '')
        .slice(0, 50);

export const buildMetadataPayload = (preview: AssessmentPreview, selectedOrgUnits: Array<{ id: string }>) => {
    const optionSets = preview.optionSets.map(os => ({
        id:        os.id,
        name:      os.name,
        valueType: os.valueType,
    }));

    const options = preview.optionSets.reduce<Array<{
        id: string; code: string; name: string; sortOrder: number; optionSet: { id: string };
    }>>((acc, os) => {
        os.options.forEach((o, index) => {
            acc.push({
                id:        o.id,
                code:      o.code,
                name:      o.name,
                sortOrder: index + 1,
                optionSet: { id: os.id },
            });
        });
        return acc;
    }, []);

    const dataElements = preview.dataElements.map(de => ({
        id:              de.id,
        name:            de.name,
        shortName:       de.shortName,
        code:            de.code,
        valueType:       de.valueType,
        aggregationType: de.aggregationType ?? 'NONE',
        domainType:      'TRACKER',
        ...(de.description  ? { description: de.description }       : {}),
        ...(de.optionSetId  ? { optionSet: { id: de.optionSetId } } : {}),
    }));

    const programStageSections = preview.sections.map(s => ({
        id:           s.id,
        name:         s.name,
        sortOrder:    s.sortOrder,
        dataElements: preview.dataElements
            .filter(de => de.sectionName === s.name)
            .map(de => ({ id: de.id })),
    }));

    const programStages = preview.programStage
        ? [{
            id:   preview.programStage.id,
            name: preview.programStage.name,
            ...(preview.programStage.description
                ? { description: preview.programStage.description }
                : {}),
            programStageSections:    programStageSections.map(s => ({ id: s.id })),
            programStageDataElements: preview.dataElements.map(de => ({
                dataElement: { id: de.id },
                compulsory:  false,
            })),
        }]
        : [];

    const programs = preview.program
        ? [{
            id:          preview.program.id,
            name:        preview.program.name,
            shortName:   preview.program.shortName,
            programType: preview.program.programType,
            code:              preview.program.code?.trim() || generateCode(preview.program.name),
            programStages:     programStages.map(ps => ({ id: ps.id })),
            organisationUnits: selectedOrgUnits,
        }]
        : [];

    const programIndicators = preview.programIndicators.map(pi => ({
        id:              pi.id,
        name:            pi.name,
        shortName:       pi.shortName ?? pi.name.slice(0, 50),
        analyticsType:   pi.analyticsType,
        aggregationType: pi.aggregationType,
        ...(pi.expression      ? { expression: pi.expression }              : {}),
        ...(pi.filter          ? { filter:  pi.filter }                     : {}),
        ...(pi.analyticsPeriodBoundaries.length > 0
            ? { analyticsPeriodBoundaries: pi.analyticsPeriodBoundaries }   : {}),
        ...(preview.program?.id ? { program: { id: preview.program!.id } }  : {}),
    }));

    return {
        ...(optionSets.length         > 0 ? { optionSets }         : {}),
        ...(options.length            > 0 ? { options }            : {}),
        ...(dataElements.length       > 0 ? { dataElements }       : {}),
        ...(programStageSections.length > 0 ? { programStageSections } : {}),
        ...(programStages.length      > 0 ? { programStages }      : {}),
        ...(programs.length           > 0 ? { programs }           : {}),
        ...(programIndicators.length  > 0 ? { programIndicators }  : {}),
    };
};

/* ─────────────────────────────────────────────────────────────
   Hook
───────────────────────────────────────────────────────────── */
export const useSaveProgramToDhis2 = ({
    onSuccess,
    onError,
}: UseSaveProgramToDhis2Options = {}) => {
    const engine = useDataEngine();

    const { show: showSuccessAlert } = useAlert(
        i18n.t('Program saved to DHIS2 successfully'),
        { success: true },
    );
    const { show: showErrorAlert } = useAlert(
        i18n.t('Failed to save program to DHIS2'),
        { critical: true },
    );

    const mutation = useMutation<SaveProgramResult, Error, SaveProgramPayload>({
        mutationFn: async ({ preview, selectedOrgUnits }) => {
            const result = await engine.mutate({
                resource: 'metadata',
                type:     'create' as const,
                data:     buildMetadataPayload(preview, selectedOrgUnits),
                params: {
                    importStrategy: 'CREATE_AND_UPDATE',
                    atomicMode:     'NONE',
                },
            });
            return result as unknown as SaveProgramResult;
        },
        onSuccess: (result) => {
            showSuccessAlert();
            onSuccess?.(result);
        },
        onError: (error) => {
            showErrorAlert();
            console.error('Failed to save program to DHIS2:', error);
            onError?.(error);
        },
    });

    return {
        saveProgramToDhis2: mutation.mutateAsync,
        isSaving:           mutation.isPending,
        error:              mutation.error,
        reset:              mutation.reset,
    };
};
