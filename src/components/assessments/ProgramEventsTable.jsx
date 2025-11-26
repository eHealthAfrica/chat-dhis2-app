import {useDataEngine, useDataQuery} from '@dhis2/app-runtime'
import {
    Table,
    TableHead,
    TableRowHead,
    TableCellHead,
    TableBody,
    TableRow,
    TableCell,
    CircularLoader,
    NoticeBox,
    Pagination,
    Button,
} from '@dhis2/ui'
import React, { useState, useEffect } from 'react'
import {useNavigate, useParams} from "react-router-dom";
import exploreStore from "../../store/exploreStore";


const query = {
    events: {
        resource: 'events',
        params: ({ page, pageSize, orgUnitId, programId }) => ({
            program: programId,
            paging: true,
            page,
            pageSize,
            ...(orgUnitId && { orgUnit: orgUnitId }),
            fields: ['program','event', 'eventDate', 'status', 'orgUnit','orgUnitName','lastUpdatedByUserInfo','lastUpdated'],
        }),
    },
}

const ProgramEventsTable = () => {
    const { programId } = useParams()
    const { orgUnit,setOrgUnit,setEventOrgUnit,programsList,setProgramsList } = exploreStore()
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const navigate = useNavigate()
    const engine = useDataEngine()

    const existingProgram = programsList.find((p) => p.programId === programId)?.program

    const { loading, error, data, refetch } = useDataQuery(query, {
        variables: {
            page,
            pageSize,
            orgUnitId: orgUnit?.id ?? null,
            programId,
        },
    })

    useEffect(() => {
        if (!programId && orgUnit != null) {
            setOrgUnit(null);
        }

        refetch({
            page,
            pageSize,
            orgUnitId: orgUnit?.id ?? null,
            programId,
        });
    }, [page, pageSize, orgUnit?.id, programId, refetch]);


    useEffect(() => {
        const fetchProgramIfMissing = async () => {
            if (!existingProgram && programId) {
                const result = await engine.query({
                    program: {
                        resource: `programs`,
                        id: programId,
                        params: {
                            fields: ['programStages[id,name,programStageDataElements[dataElement[id,name,description,formName,optionSetValue,optionSet[id,name,options[id,name,code]]]],programStageSections[id,name,displayName,sortOrder,dataElements[id]]],organisationUnits[id]']
                        },
                    },
                })
                setProgramsList({
                    programId,
                    program: result.program,
                })
            }
        }

        fetchProgramIfMissing()
    }, [programId, existingProgram, engine, setProgramsList])


    if (loading) {return <CircularLoader />}
    if (error) {return <NoticeBox title="Error fetching events">{error.message}</NoticeBox>}

    const events = data?.events?.events ?? []
    const pager = data?.events?.pager

    const viewEventAction = (eventId,orgUnitId,orgUnitName) => {
        setEventOrgUnit({"displayName":orgUnitName,"id":orgUnitId})
        navigate(`/assessments/${programId}/${eventId}`)
    }

    const formatDateString = (dateString) => {
        if (!dateString) {return null;}
        try {
            const date = new Date(dateString);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch (error) {
            console.error("Error formatting date:", error);
            return null;
        }
    };

    const PROGRAM_LIST = {
        'A294977888e':'Flood Assessment',
        'pFSueR4Uwyy':'Heatwave Assessment',
        'VQye4gFGUpM':'Drought Assessment'
    }


    return (
        <>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1.5rem',
                    marginTop: '1.5rem',
                    padding: '0 0.5rem',
                }}
            >
                <div>
                    <h2 style={{ margin: 0 }}>{existingProgram?.programStages[0]?.name ?? "CHAT Assessments"}</h2>
                    <p style={{ margin: 0, color: '#555', marginTop:'0.5rem' }}>
                        {existingProgram?.[0]?.programStages[0]?.name ? `View, manage, and create assessments for ${existingProgram?.[0]?.programStages[0]?.name}.`:"View and manage assessments for all CHAT programs."}
                    </p>
                </div>
                {existingProgram?.organisationUnits.length > 1 && existingProgram?.organisationUnits?.some((ou) => ou.id === orgUnit?.id) && programId && orgUnit &&(
                    <Button
                        primary
                        onClick={() => navigate(`/assessments/${programId}/create`)}
                    >
                        + Create New Event
                    </Button>
                )}
            </div>
            <Table>
                <TableHead>
                    <TableRowHead>
                        <TableCellHead>ID</TableCellHead>
                        <TableCellHead>Program</TableCellHead>
                        <TableCellHead>Assessment Date</TableCellHead>
                        <TableCellHead>Org Unit</TableCellHead>
                        <TableCellHead>Last Updated By</TableCellHead>
                        <TableCellHead>Date Updated</TableCellHead>
                        <TableCellHead>Actions</TableCellHead>
                    </TableRowHead>
                </TableHead>
                <TableBody>
                    {events.map((event) => (
                        <TableRow key={event.event}>

                            <TableCell>{event.event}</TableCell>
                            <TableCell>{PROGRAM_LIST[event.program]}</TableCell>
                            <TableCell>{formatDateString(event.eventDate)}</TableCell>
                            <TableCell>{event.orgUnitName}</TableCell>
                            <TableCell>{event.lastUpdatedByUserInfo.username}</TableCell>
                            <TableCell>{formatDateString(event.lastUpdated)}</TableCell>
                            <TableCell>
                                <Button small onClick={() => viewEventAction(event.event, event.orgUnit,event.orgUnitName)}>View</Button>{' '}
                                {/*<Button small destructive onClick={() => alert(`Delete ${event.event}`)}>Delete</Button>*/}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            {pager && (
                <div style={{ marginTop: '16px' }}>
                    <Pagination
                        onPageSizeChange={(e) => setPageSize(e)}
                        onPageChange={(e) => setPage(e)}
                        page={pager.page}
                        pageSize={pager.pageSize}
                        total={pager.total}
                        isLastPage={pager.isLastPage}
                    />
                </div>
            )}
        </>
    )
}


export default ProgramEventsTable
