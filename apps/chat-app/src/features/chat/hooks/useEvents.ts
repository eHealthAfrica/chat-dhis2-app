import { useDataEngine } from '@dhis2/app-runtime';
import { useQuery }      from '@tanstack/react-query';

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────── */
export interface EventDataValue {
    dataElement: string;
    value:       string;
}

export interface Dhis2Event {
    event:        string;
    program:      string;
    programStage: string;
    orgUnit:      string;
    orgUnitName:  string;
    status:       'ACTIVE' | 'COMPLETED' | 'VISITED' | 'SCHEDULE' | 'OVERDUE' | 'SKIPPED';
    eventDate:    string;
    created:      string;
    lastUpdated:  string;
    dataValues:   EventDataValue[];
}

interface EventsResponse {
    events: Dhis2Event[];
}

/* ─────────────────────────────────────────────────────────────
   useEvents — list for a program + org unit
───────────────────────────────────────────────────────────── */
export const useEvents = (programId: string | null, orgUnitId: string | null) => {
    const engine = useDataEngine();

    const query = useQuery<Dhis2Event[]>({
        queryKey: ['events', programId, orgUnitId],
        enabled:  !!programId && !!orgUnitId,
        queryFn:  async () => {
            const result = await engine.query({
                events: {
                    resource: 'events',
                    params: {
                        program:  programId,
                        orgUnit:  orgUnitId,
                        fields:   'event,program,programStage,orgUnit,orgUnitName,status,eventDate,created,lastUpdated,dataValues',
                        paging:   false,
                        order:    'created:desc',
                    },
                },
            }) as { events: EventsResponse };
            return result.events.events ?? [];
        },
    });

    return {
        events:    query.data ?? [],
        isLoading: query.isLoading,
        isError:   query.isError,
        error:     query.error,
        refetch:   query.refetch,
    };
};

/* ─────────────────────────────────────────────────────────────
   useEvent — single event by id
───────────────────────────────────────────────────────────── */
export const useEvent = (eventId: string | null) => {
    const engine = useDataEngine();

    const query = useQuery<Dhis2Event>({
        queryKey: ['event', eventId],
        enabled:  !!eventId,
        queryFn:  async () => {
            const result = await engine.query({
                event: {
                    resource: `events/${eventId}`,
                    params: {
                        fields: 'event,program,programStage,orgUnit,orgUnitName,status,eventDate,dataValues',
                    },
                },
            }) as { event: Dhis2Event };
            return result.event;
        },
    });

    return {
        event:     query.data ?? null,
        isLoading: !!eventId && query.isLoading,
        isError:   query.isError,
        error:     query.error,
    };
};
