/* ─────────────────────────────────────────────────────────────
   parseAssessmentJson.ts
   Converts the DHIS2 metadata JSON (programs / programStages /
   programStageSections / dataElements / optionSets / options /
   programIndicators) into typed preview structures ready for the
   validation UI.
───────────────────────────────────────────────────────────── */

/* ── Raw JSON shapes (as they appear in the file) ─────────── */
interface RawOption {
    id: string;
    code: string;
    name: string;
    optionSet: { id: string };
}

interface RawOptionSet {
    id: string;
    name: string;
    valueType: string;
    options: { id: string }[];
}

interface RawDataElement {
    id: string;
    code: string;
    name: string;
    shortName: string;
    description?: string;
    valueType: string;
    domainType?: string;
    aggregationType?: string;
    optionSet?: { id: string };
}

interface RawSection {
    id: string;
    name: string;
    sortOrder: number;
    dataElements: { id: string }[];
}

interface RawProgramStage {
    id: string;
    name: string;
    description?: string;
    programStageSections?: { id: string }[];
    programStageDataElements?: unknown[];
}

interface RawProgram {
    id: string;
    name: string;
    code?: string;
    shortName?: string;
    programType?: string;
    programStages?: { id: string }[];
}

interface RawProgramIndicator {
    id: string;
    name: string;
    shortName?: string;
    aggregationType?: string;
    program?: { id: string };
    expression?: string;
    filter?: string;
    analyticsType?: string;
}

export interface RawMetadataJson {
    programs?: RawProgram[];
    programStages?: RawProgramStage[];
    programStageSections?: RawSection[];
    dataElements?: RawDataElement[];
    optionSets?: RawOptionSet[];
    options?: RawOption[];
    programIndicators?: RawProgramIndicator[];
}

/* ── Parsed / enriched types exposed to the UI ────────────── */
export interface ParsedProgram {
    id: string;
    name: string;
    code?: string;
    shortName: string;
    programType: string;
}

export interface ParsedProgramStage {
    id: string;
    name: string;
    description: string;
}

export interface ParsedSection {
    id: string;
    name: string;
    sortOrder: number;
    dataElementCount: number;
    dataElementIds: string[];
}

export interface ParsedOption {
    id: string;
    code: string;
    name: string;
}

export interface ParsedOptionSet {
    id: string;
    name: string;
    valueType: string;
    options: ParsedOption[];
}

export interface ParsedDataElement {
    id: string;
    code: string;
    name: string;
    shortName: string;
    description: string;
    valueType: string;
    domainType: string;
    aggregationType: string;
    optionSetId?: string;
    optionSetName?: string;
    optionCount?: number;
    /** Which section this element belongs to */
    sectionName?: string;
}

export interface ParsedProgramIndicator {
    id: string;
    name: string;
    shortName: string;
    aggregationType: string;
    expression: string;
    filter: string;
    analyticsType: string;
}

export interface AssessmentPreview {
    program: ParsedProgram | null;
    programStage: ParsedProgramStage | null;
    sections: ParsedSection[];
    dataElements: ParsedDataElement[];
    optionSets: ParsedOptionSet[];
    programIndicators: ParsedProgramIndicator[];
    parseErrors: string[];
}

/* ── Main parser ──────────────────────────────────────────── */
export function parseAssessmentJson(raw: RawMetadataJson): AssessmentPreview {
    const errors: string[] = [];

    /* programs */
    const program: ParsedProgram | null = raw.programs?.[0]
        ? {
              id: raw.programs[0].id,
              name: raw.programs[0].name,
              code: raw.programs[0].code,
              shortName: raw.programs[0].shortName ?? raw.programs[0].name,
              programType: raw.programs[0].programType ?? '—',
          }
        : null;

    if (!program) errors.push('No program found in JSON.');

    /* program stage */
    const programStage: ParsedProgramStage | null = raw.programStages?.[0]
        ? {
              id: raw.programStages[0].id,
              name: raw.programStages[0].name,
              description: raw.programStages[0].description ?? '',
          }
        : null;

    /* option lookup maps */
    const optionsBySetId = new Map<string, ParsedOption[]>();
    (raw.options ?? []).forEach((o) => {
        const setId = o.optionSet?.id;
        if (!setId) return;
        if (!optionsBySetId.has(setId)) optionsBySetId.set(setId, []);
        optionsBySetId.get(setId)!.push({ id: o.id, code: o.code, name: o.name });
    });

    const optionSets: ParsedOptionSet[] = (raw.optionSets ?? []).map((os) => ({
        id: os.id,
        name: os.name,
        valueType: os.valueType,
        options: optionsBySetId.get(os.id) ?? [],
    }));

    const optionSetMap = new Map<string, ParsedOptionSet>(optionSets.map((os) => [os.id, os]));

    /* sections */
    const sections: ParsedSection[] = (raw.programStageSections ?? [])
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((s) => ({
            id: s.id,
            name: s.name,
            sortOrder: s.sortOrder,
            dataElementCount: s.dataElements.length,
            dataElementIds: s.dataElements.map((d) => d.id),
        }));

    /* section name lookup by DE id */
    const sectionByDeId = new Map<string, string>();
    sections.forEach((s) => {
        s.dataElementIds.forEach((deId) => sectionByDeId.set(deId, s.name));
    });

    /* data elements */
    const dataElements: ParsedDataElement[] = (raw.dataElements ?? []).map((de) => {
        const os = de.optionSet ? optionSetMap.get(de.optionSet.id) : undefined;
        return {
            id: de.id,
            code: de.code,
            name: de.name,
            shortName: de.shortName,
            description: de.description ?? '',
            valueType: de.valueType,
            domainType: de.domainType ?? '—',
            aggregationType: de.aggregationType ?? '—',
            optionSetId: de.optionSet?.id,
            optionSetName: os?.name,
            optionCount: os?.options.length,
            sectionName: sectionByDeId.get(de.id),
        };
    });

    /* program indicators */
    const programIndicators: ParsedProgramIndicator[] = (raw.programIndicators ?? []).map(
        (pi) => ({
            id: pi.id,
            name: pi.name,
            shortName: pi.shortName ?? pi.name,
            aggregationType: pi.aggregationType ?? '—',
            expression: pi.expression ?? '',
            filter: pi.filter ?? '',
            analyticsType: pi.analyticsType ?? '—',
        })
    );

    return {
        program,
        programStage,
        sections,
        dataElements,
        optionSets,
        programIndicators,
        parseErrors: errors,
    };
}
