import { create } from 'zustand'
import { defaultReferencePeriod } from '../components/explore/ReferencePeriodSelect.jsx'
import { NDVI } from '../components/explore/vegetation/VegetationIndexSelect.jsx'
import {
    getDefaultMonthlyPeriod,
    getDefaultExplorePeriod,
    getLastMonth,
    MONTHLY,
} from '../utils/time.js'

const exploreStore = create((set) => {
    const setIfChanged = (key) => (value) =>
        set((state) => (state[key] !== value ? { [key]: value } : state))

    const setIfPeriodChanged = (key) => (period) =>
        set((state) =>
            state[key].startTime !== period.startTime ||
            state[key].endTime !== period.endTime
                ? { [key]: period }
                : state
        )



    return {
        orgUnit: null,
        eventOrgUnit: null,
        tab: null,
        periodType: MONTHLY,
        dailyPeriod: getDefaultExplorePeriod(),
        monthlyPeriod: getDefaultMonthlyPeriod(),
        referencePeriod: defaultReferencePeriod,
        month: getLastMonth()[1],
        vegetationIndex: NDVI,
        setOrgUnit: setIfChanged('orgUnit'),
        setEventOrgUnit: setIfChanged('eventOrgUnit'), // Support if user has not selected orgunit in tree
        setTab: setIfChanged('tab'),
        setPeriodType: setIfChanged('periodType'),
        setDailyPeriod: setIfPeriodChanged('dailyPeriod'),
        setMonthlyPeriod: setIfPeriodChanged('monthlyPeriod'),
        setReferencePeriod: setIfChanged('referencePeriod'),
        setMonth: setIfChanged('month'),
        setVegetationIndex: setIfChanged('vegetationIndex'),
        programsList: [],
        setProgramsList: (newEntry) =>
            set((state) => {
                const newPrograms = Array.isArray(newEntry) ? newEntry : [newEntry]
                const existingMap = new Map(
                    state.programsList.map((p) => [p.programId, p])
                )

                newPrograms.forEach(({ programId, program }) => {
                    existingMap.set(programId, { programId, program })
                })

                return { programsList: Array.from(existingMap.values()) }
            }),
    }
})

export default exploreStore
