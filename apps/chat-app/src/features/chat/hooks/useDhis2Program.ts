import { useDataEngine } from '@dhis2/app-runtime';
import { useQuery } from '@tanstack/react-query';

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────── */
export interface Dhis2OptionSetOption {
    code: string;
    name: string;
}

export interface Dhis2OptionSet {
    options: Dhis2OptionSetOption[];
}

export interface Dhis2DataElement {
    id: string;
    name: string;
    shortName: string;
    code: string;
    valueType: string;
    description: string;
    optionSet?: Dhis2OptionSet;
}

export interface Dhis2ProgramStageDataElement {
    dataElement: Dhis2DataElement;
    compulsory: boolean;
}

export interface Dhis2Section {
    id: string;
    name: string;
    sortOrder: number;
    dataElements: { id: string }[];
}

export interface Dhis2ProgramStage {
    id: string;
    name: string;
    description: string;
    programStageSections: Dhis2Section[];
    programStageDataElements: Dhis2ProgramStageDataElement[];
}

export interface Dhis2ProgramIndicator {
    id: string;
    name: string;
    shortName: string;
    analyticsType: string;
    aggregationType: string;
    filter: string;
}

export interface Dhis2Program {
    id: string;
    name: string;
    shortName: string;
    code: string;
    programType: string;
    programStages: Dhis2ProgramStage[];
    programIndicators: Dhis2ProgramIndicator[];
}

/* ─────────────────────────────────────────────────────────────
   Hook
───────────────────────────────────────────────────────────── */
export const useDhis2Program = (programId: string | null) => {
    const engine = useDataEngine();

    const query = useQuery<Dhis2Program>({
        queryKey: ['dhis2-program', programId],
        enabled: !!programId,
        staleTime: 1000 * 60 * 5,
        queryFn: async () => {
            const fields =
                'id,name,shortName,code,programType,'
                + 'programStages[id,name,description,'
                + 'programStageSections[id,name,sortOrder,dataElements[id]],'
                + 'programStageDataElements[dataElement[id,name,shortName,code,valueType,description,optionSet[options[code,name]]],compulsory]],'
                + 'programIndicators[id,name,shortName,analyticsType,aggregationType,filter]';

            const result = await engine.query({
                program: {
                    resource: `programs/${programId}`,
                    params: { fields },
                },
            }) as { program: Dhis2Program };

            return result.program;
        },
    });

    return {
        program: query.data ?? null,
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        refetch: query.refetch,
    };
};
