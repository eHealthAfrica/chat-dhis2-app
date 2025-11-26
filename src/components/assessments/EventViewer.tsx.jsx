import { useDataQuery, useDataEngine } from '@dhis2/app-runtime'
import { useAlert } from '@dhis2/app-runtime';
import {
    CircularLoader,
    NoticeBox,
    IconInfo16,
    IconChevronUp24,
    IconChevronDown24,
    Button,
} from '@dhis2/ui'
import { CalendarInput } from '@dhis2/ui';
import React, { useEffect, useState,useCallback } from 'react'
import {useNavigate, useParams} from "react-router-dom";
import exploreStore from "../../store/exploreStore";
import DatePicker from "../shared/DatePicker";

const query = {
    event: {
        resource: 'events',
        id: ({ eventId }) => eventId,
        params: {
            fields: ['event', 'dataValues[dataElement,value]', 'program', 'programStage', 'orgUnit', 'eventDate'],
        },
    }
}

const EventViewer = () => {
    const { orgUnit,programsList,eventOrgUnit } = exploreStore()
    const [values, setValues] = useState({})
    const [openSections, setOpenSections] = useState({})
    const [eventMeta, setEventMeta] = useState(null)
    const engine = useDataEngine()
    const navigate = useNavigate()
    const { programId, eventId:paramEventId } = useParams()
    const [ eventId, setEventId] = useState(paramEventId)
    const [currentOrgUnit, setCurrentOrgunit] = useState(orgUnit ?? eventOrgUnit )
    const [openGuideId, setOpenGuideId] = useState(null)
    const [assessmentDate, setAssessmentDate] = useState(null);
    const [userLocation, setUserLocation] = useState(null);

    const { show } = useAlert(
        ({message}) => message,
        ({options}) => (options)
    )
    const existingProgram = programsList.find((p) => p.programId === programId)?.program

    console.log("existingProgramexistingProgramexistingProgram",existingProgram)
    const { loading, error, data,refetch } = useDataQuery(query, {
        variables: { eventId },

    })


    useEffect(() => {
        if (!currentOrgUnit) {
            navigate(`/assessments/${programId}`);
            return;
        }
        const shouldNavigate = orgUnit && orgUnit?.id !== currentOrgUnit.id;
        if (shouldNavigate) {
            navigate(`/assessments/${programId}`);
        }
    }, [orgUnit, currentOrgUnit]);

    useEffect(() => {
        if (data?.event?.dataValues) {
            const mapped = data.event.dataValues.reduce(
                (acc, dv) => ({ ...acc, [dv.dataElement]: dv.value }),
                {}
            )

            setEventMeta({
                event: data.event.event,
                program: data.event.program,
                programStage: data.event.programStage,
                orgUnit: data.event.orgUnit,
                eventDate: data.event.eventDate,
            })
            setAssessmentDate(formatDateString(data.event.eventDate))
            updateValues(mapped,formatDateString(data.event.eventDate) );
        }else{
            updateValues([], assessmentDate)
        }
        if (data?.program?.programStages?.[0]?.programStageSections) {
            const sectionMap = Object.fromEntries(
                data.program.programStages[0].programStageSections.map((s) => [s.id, false])
            )
            setOpenSections(sectionMap)
        }
    }, [data])



    const updateValues = (mapped, currentAssessmentDate) => {
        const saveKey = `${(orgUnit ?? eventOrgUnit)?.id}-${programId}-${currentAssessmentDate}`;
        const draft = localStorage.getItem(saveKey);
        if (draft) {
            try {
                const parsedDraft = JSON.parse(draft);
                if (parsedDraft && typeof parsedDraft === 'object') {
                    console.log('Found draft, merging into event data');
                    mapped = { ...mapped, ...parsedDraft };
                }
            } catch (e) {
                console.error('Error parsing saved draft:', e);
            }
        }
        setValues(mapped)
    }

    const programStage = existingProgram?.programStages?.[0]
    const sections = programStage?.programStageSections ?? []
    const elementsMap = Object.fromEntries(
        programStage?.programStageDataElements.map((psde) => [
            psde.dataElement.id,
            psde.dataElement,
        ]) ?? []
    )

    const toggleSection = (id) => {
        setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }))
    }

    const handleOptionSelect = (dataElementId, value) => {
        setValues((prev) => ({ ...prev, [dataElementId]: value }))
    }

    const saveToLocalStorage = () => {
        const saveKey = `${currentOrgUnit.id}-${programId}-${assessmentDate}`;
        const payload = values
        localStorage.setItem(saveKey, JSON.stringify(payload));
        show({message: "Data saved locally successfully!", options:{ success: true, duration: 1500 }});
    };

    const handleSave = async () => {
        const allRequiredElementIds = sections.flatMap(section =>
            section.dataElements.map(de => de.id)
        )

        const missing = allRequiredElementIds.filter(id => !values[id])

        if (missing.length > 0) {
            show({ message: "Please answer all required questions before saving.", options: { warning: true, duration: 2000 } });
            return;
        }

        const payload = {
            program: eventMeta?.program ?? programId,
            programStage: eventMeta?.programStage,
            orgUnit: eventMeta?.orgUnit?.id ?? currentOrgUnit?.id,
            eventDate:  new Date(assessmentDate).toISOString().split('T')[0],
            dataValues: Object.entries(values).map(([dataElement, value]) => ({
                dataElement,
                value,
            })),
        }

        const isUpdate = !!eventMeta?.event

        try {
            if (isUpdate) {
                await engine.mutate({
                    resource: `events/${eventMeta.event}`,
                    type: 'update',
                    data: payload,
                })
                show({message: "Assessment updated successfully!", options:{ success: true, duration: 1500 }});
            } else {
                await engine.mutate({
                    resource: 'events',
                    type: 'create',
                    data: payload,
                })
                show({message: "New assessment created successfully!", options:{ success: true, duration: 1500 }});
            }
            navigate(`/assessments/${programId}`);
        } catch (err) {
            console.error(err)
            show({message: "Error occurred with saving to server.", options:{ warning: true, duration: 1500 }});
        }
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

    const today = new Date();
    const todayFormatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;


    const checkEventExistence =  async (selectedDate) => {
        try {
            const selected = new Date(selectedDate);
            selected.setDate(selected.getDate() + 1);
            const nextDay = selected.toISOString().split('T')[0]; // format to 'YYYY-MM-DD'

            const result =  await engine.query({
                events: {
                    resource: 'events',
                    params: {
                        orgUnit: currentOrgUnit?.id,
                        program: programId,
                        startDate: selectedDate,
                        endDate: formatDateString(nextDay),
                        paging: false,
                    },
                },
            });

            const foundEvents = await result?.events?.events ?? [];
            const ifFound = foundEvents.length > 0;
            if(ifFound){
                 await refetch({ eventId: foundEvents[0].event });
            }else {
                 await refetch();
            }
            return ifFound;
        } catch (error) {
            console.error('Error checking existing event:', error);
            return false;
        }
    };
    useEffect(() => {
        if (!eventId && assessmentDate != null) {
            checkEventExistence(assessmentDate).then(res => {
                if (res) {
                    show({ message: "An event already exists for this date. Please review before creating another.", options: { warning: true, duration: 2500 } });
                }
            })

        }},[assessmentDate])

    const handleDateChange = useCallback(async (date) => {
        const selectedDateObj = new Date(date.calendarDateString);
        const todayObj = new Date();
        if (selectedDateObj > todayObj) {
            show({message: "Future dates cannot be selected.", options:{  duration: 1500 }});
            return;
        }
        setAssessmentDate(date.calendarDateString);
    }, [show, today]);

    if (loading) {return <CircularLoader />}
    if (error) {return <NoticeBox title="Error fetching events">{error.message}</NoticeBox>}

    const getSectionCompletionStatus = (section) => {
        const total = section.dataElements.length
        const filled = section.dataElements.filter((de) => values[de.id]).length
        const pending = total - filled
        return { filled, pending }
    }

    const isFormComplete = () => {
        const allRequiredElementIds = sections.flatMap(section =>
            section.dataElements.map(de => de.id)
        );
        return allRequiredElementIds.every(id => values[id]);
    };

    const todayString = today.toISOString().split('T')[0]

    return (
        <div style={{ fontFamily: 'Roboto, sans-serif', color: '#333',padding: '1rem', }}>
            <div
                style={{
                    marginBottom: '1.5rem',
                    padding: '1rem',
                    border: '1px solid #e0e0e0',
                    borderRadius: 6,
                    backgroundColor: '#f9f9f9'
                }}

            >
                <h2 style={{ margin: '0 0 0.5rem', color: '#0075c9' }}>
                    {programStage?.name || 'CHAT Event Assessment'}
                </h2>
                <p style={{ margin: '0 0 0.25rem', color: '#444' }}>
                    Review and update checklist responses for <strong>Org Unit:</strong> {currentOrgUnit?.displayName ?? 'N/A'}
                </p>
                <div style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    marginBottom: '1rem',
                    color: '#555',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    marginTop: '1rem',
                }}>
                    <span>Assessment Date:</span>
                    <DatePicker label="" onChange={handleDateChange} maxDate={todayString} />
                </div>
            </div>

            {sections.map((section) => (
                <div key={section.id} style={{ marginBottom: '0.2rem', border: '1px solid #ddd', borderRadius: 6 }}>
                    <div
                        onClick={() => toggleSection(section.id)}
                        style={{
                            cursor: 'pointer',
                            padding: '1rem 0.75rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: '1px solid #e0e0e0',
                        }}
                    >
                        {(() => {
                            const { filled, pending } = getSectionCompletionStatus(section)
                            return (
                                <span style={{ color: '#0075c9', fontWeight: 600, textTransform: 'uppercase', fontSize: '14px' }}>
            {section.displayName ?? section.name} ({filled} filled, {pending} pending)
        </span>
                            )
                        })()}
                        {openSections[section.id] ? <IconChevronUp24 /> : <IconChevronDown24 />}
                    </div>

                    {openSections[section.id] && (
                        <div style={{ padding: '1rem' }}>
                            {section.dataElements.map((de, index) => {
                                const dataElement = elementsMap[de.id]
                                const selected = values[de.id]
                                const options = dataElement.optionSet?.options ?? []

                                return (
                                    <div
                                        key={de.id}
                                        style={{
                                            borderBottom: '1px solid #e0e0e0',
                                            paddingBottom: '1.5rem',
                                            marginBottom: '1.5rem',
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                marginBottom: '0.25rem',
                                                color: '#555',
                                            }}
                                        >
                                            CHECKLIST {index + 1}/{section.dataElements.length}
                                        </div>

                                        <div
                                            style={{
                                                fontSize: '16px',
                                                fontWeight: 600,
                                                marginBottom: '0.75rem',
                                                lineHeight: 1.5,
                                            }}
                                        >
                                            {dataElement.formName || dataElement.name}
                                        </div>

                                        <div style={{ width: '100%' }}>
                                            {dataElement.name?.toLowerCase().includes('collection-point-geo-codes') ? (
                                                <div style={{ display: 'flex', flexDirection: 'row', gap: '0.75rem', width: '100%' }}>

                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (navigator.geolocation) {
                                                                navigator.geolocation.getCurrentPosition(
                                                                    (position) => {
                                                                        const lat = position.coords.latitude.toFixed(6);
                                                                        const lng = position.coords.longitude.toFixed(6);
                                                                        const coords = `${lat},${lng}`;
                                                                        handleOptionSelect(de.id, coords);
                                                                        setUserLocation({ latitude: lat, longitude: lng });
                                                                    },
                                                                    (error) => {
                                                                        show({ message: `Unable to get location: ${error.message}`, options: { warning: true } });
                                                                    }
                                                                );
                                                            } else {
                                                                show({ message: "Geolocation not supported by this browser", options: { warning: true } });
                                                            }
                                                        }}
                                                        style={{
                                                            whiteSpace: 'nowrap',
                                                            padding: '1rem',
                                                            backgroundColor: '#0075c9',
                                                            color: '#fff',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            fontSize: '14px',
                                                            cursor: 'pointer',
                                                            height: '100%',
                                                        }}
                                                    >
                                                        Location
                                                    </button>
                                                    <input
                                                        disabled
                                                        type="text"
                                                        placeholder="Latitude,Longitude (e.g. -1.2921,36.8219)"
                                                        value={selected || ''}
                                                        onChange={(e) => handleOptionSelect(de.id, e.target.value)}
                                                        style={{
                                                            flex: 1,
                                                            padding: '0.75rem',
                                                            border: '1px solid #ccc',
                                                            borderRadius: '6px',
                                                            fontSize: '16px',
                                                        }}
                                                    />
                                                </div>

                                            ) : (
                                                <div style={{ width: '100%' }}>
                                                    <select
                                                        value={selected || ''}
                                                        onChange={(e) => handleOptionSelect(de.id, e.target.value)}
                                                        style={{
                                                            width: '100%',
                                                            padding: '0.75rem',
                                                            fontSize: '16px',
                                                            borderRadius: '6px',
                                                            border: '1px solid #ccc',
                                                        }}
                                                    >
                                                        <option value="" disabled>
                                                            -- Select a score --
                                                        </option>
                                                        {options.map((option) => (
                                                            <option key={option.id} value={option.code}>
                                                                {option.code}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ marginTop: '0.75rem', textAlign: 'right' }}>
                                            <Button
                                                small
                                                icon={<IconInfo16 />}
                                                onClick={() =>
                                                    setOpenGuideId((prev) => (prev === de.id ? null : de.id))
                                                }
                                            >
                                                Score Guide
                                            </Button>
                                            {openGuideId === de.id && dataElement.description && (                                            <div
                                                style={{
                                                    backgroundColor: '#fff',
                                                    padding: '1rem',
                                                    border: '1px solid #eee',
                                                    borderRadius: 6,
                                                    marginTop: '1rem',
                                                    fontSize: '14px',
                                                    color: '#333',
                                                    whiteSpace: 'pre-line',
                                                    textAlign: 'left',
                                                }}
                                            >
                                                <strong>Level of Preparedness Score:</strong>
                                                <div style={{ display: 'flex', alignItems: 'center', marginTop: '0.5rem', marginBottom: '1.5rem', color: '#B7B747' }}>
                                                    <span style={{ fontSize: '18px', marginRight: '10px', color:'#B7B747' }}>⚠️</span>
                                                    <span><strong>1</strong> is the lowest while <strong>5</strong> is the highest.</span>
                                                </div>
                                                <div style={{ marginTop: '-1rem', fontSize: '14px', color: '#333', lineHeight: '1.6' }}>
                                                    <ol style={{ paddingLeft: '1.5rem' }}>
                                                        {dataElement.description
                                                            .split(/(?=\d+: )/g) // Split on "1: ", "2: ", etc.
                                                            .filter(Boolean)
                                                            .map((item, index) => {
                                                                // Match: "1: No plan/regulation: Description..."
                                                                const match = item.match(/^(\d+:\s*)([^:]+:)([\s\S]*)/)
                                                                if (!match) {return null}

                                                                const [, numberPrefix, label, rest] = match

                                                                return (
                                                                    <li key={index} >
                                                                        <span style={{ fontWeight: 700 }}>{label}</span>{rest.trim()}
                                                                    </li>
                                                                )
                                                            })}
                                                    </ol>
                                                </div>

                                            </div>)}

                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            ))}

            {/* Save button */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexDirection: 'row',
                    width: '100%',
                    marginTop: '0.5rem',
                    marginBottom: '0.5rem',
                    paddingLeft: '1rem',
                    paddingRight: '1rem',
                }}
            >
                {/* Save and Continue - Blue filled */}
                <button
                    style={{
                        backgroundColor: '#0075c9',
                        color: '#fff',
                        padding: '1rem',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 600,
                        fontSize: '16px',
                        cursor: 'pointer',
                        width: '40%',
                    }}
                    onClick={saveToLocalStorage} // you can link this to navigation if needed
                >
                    Save
                </button>

                {/* Save and finish later - Outlined */}
                <button
                    style={{
                        backgroundColor: isFormComplete() ? '#0075c9' : '#cccccc',
                        color: '#fff',
                        padding: '1rem',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 600,
                        fontSize: '16px',
                        cursor: isFormComplete() ? 'pointer' : 'not-allowed',
                        width: '40%',
                    }}
                    onClick={handleSave}
                    disabled={!isFormComplete()} // Disable when incomplete
                >
                    Submit
                </button>
            </div>
        </div>
    )
}

export default EventViewer
