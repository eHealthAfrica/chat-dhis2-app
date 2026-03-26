import { useDataEngine } from '@dhis2/app-runtime';
import { useQuery } from '@tanstack/react-query';

export interface EventDataValue {
    dataElement: string;
    value: string;
}

export interface EventUserInfo {
    displayName?: string;
    username?: string;
}

export interface Dhis2Event {
    event: string;
    program: string;
    programStage: string;
    orgUnit: string;
    orgUnitName?: string;
    status: 'ACTIVE' | 'COMPLETED' | 'VISITED' | 'SCHEDULE' | 'OVERDUE' | 'SKIPPED';
    occurredAt?: string;
    createdAt?: string;
    updatedAt?: string;
    createdBy?: EventUserInfo;
    updatedBy?: EventUserInfo;
    dataValues: EventDataValue[];
}

interface EventsResponse {
    events: Dhis2Event[];
}

interface OrgUnitDetails {
    id: string;
    name: string;
    displayName?: string;
}

const EVENT_FIELDS = [
    'event',
    'program',
    'programStage',
    'orgUnit',
    'status',
    'occurredAt',
    'createdAt',
    'updatedAt',
    'createdBy[displayName,username]',
    'updatedBy[displayName,username]',
    'dataValues',
].join(',');

const getEventOrgUnitId = (event: Dhis2Event) => {
    const orgUnit = event.orgUnit as string | { id?: string; orgUnit?: string; uid?: string } | undefined;

    if (typeof orgUnit === 'string') return orgUnit;
    return orgUnit?.id || orgUnit?.orgUnit || orgUnit?.uid || '';
};

const enrichEventsWithOrgUnitNames = async (
    engine: ReturnType<typeof useDataEngine>,
    events: Dhis2Event[],
) => {
    const orgUnitIds = [...new Set(events.map(getEventOrgUnitId).filter(Boolean))];

    if (!orgUnitIds.length) {
        return events;
    }

    const orgUnitEntries = await Promise.all(
        orgUnitIds.map(async orgUnitId => {
            try {
                const result = await engine.query({
                    ou: {
                        resource: `organisationUnits/${orgUnitId}`,
                        params: { fields: 'id,name,displayName' },
                    },
                }) as { ou: OrgUnitDetails };

                return [orgUnitId, result.ou] as const;
            } catch {
                return [orgUnitId, null] as const;
            }
        }),
    );

    const orgUnitsById = Object.fromEntries(orgUnitEntries);

    return events.map(event => {
        const orgUnitId = getEventOrgUnitId(event);
        const orgUnitDetails = orgUnitsById[orgUnitId];

        return {
            ...event,
            orgUnit: orgUnitId || event.orgUnit,
            orgUnitName: orgUnitDetails?.displayName || orgUnitDetails?.name || event.orgUnitName,
        };
    });
};

export const useEvents = (programId: string | null, orgUnitId: string | null) => {
    const engine = useDataEngine();

    const query = useQuery<Dhis2Event[]>({
        queryKey: ['events', programId, orgUnitId],
        enabled: !!programId && !!orgUnitId,
        queryFn: async () => {
            const result = await engine.query({
                events: {
                    resource: 'tracker/events',
                    params: {
                        program: programId!,
                        orgUnit: orgUnitId!,
                        orgUnitMode: 'DESCENDANTS',
                        fields: EVENT_FIELDS,
                        paging: false,
                        order: 'createdAt:desc',
                    },
                },
            }) as { events: EventsResponse };
            return enrichEventsWithOrgUnitNames(engine, result.events.events ?? []);
        },
    });

    return {
        events: query.data ?? [],
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        refetch: query.refetch,
    };
};

export const useEvent = (eventId: string | null) => {
    const engine = useDataEngine();

    const query = useQuery<Dhis2Event>({
        queryKey: ['event', eventId],
        enabled: !!eventId,
        queryFn: async () => {
            const result = await engine.query({
                event: {
                    resource: `tracker/events/${eventId}`,
                    params: {
                        fields: EVENT_FIELDS,
                    },
                },
            }) as { event: Dhis2Event };
            const [event] = await enrichEventsWithOrgUnitNames(engine, [result.event]);
            return event;
        },
    });

    return {
        event: query.data ?? null,
        isLoading: !!eventId && query.isLoading,
        isError: query.isError,
        error: query.error,
    };
};
