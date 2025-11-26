import { useDataEngine } from '@dhis2/app-runtime'
import { useState, useCallback } from 'react'

const APP_NAMESPACE = 'ccv-dhis2-app'

const useDataStore = (key) => {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const engine = useDataEngine()
    const resource = `dataStore/${APP_NAMESPACE}/${key}`

    const getData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await engine.query({ result: { resource } })
            setData(res.result)
        } catch (err) {
            if (err?.details?.httpStatusCode === 404) {
                // Key not found – optional: initialize
                setData({})
            } else {
                setError(err)
            }
        } finally {
            setLoading(false)
        }
    }, [engine, resource])

    const setDataStore = useCallback(
        async (value) => {
            setLoading(true)
            try {
                await engine.mutate({
                    resource,
                    type: 'create',
                    data: value,
                })
                setData(value)
            } catch (err) {
                setError(err)
            } finally {
                setLoading(false)
            }
        },
        [engine, resource]
    )

    const updateDataStore = useCallback(
        async (updates) => {
            setLoading(true)
            try {
                const updatedData = { ...data, ...updates }
                await engine.mutate({
                    resource,
                    type: 'update',
                    data: updatedData,
                })
                setData(updatedData)
            } catch (err) {
                setError(err)
            } finally {
                setLoading(false)
            }
        },
        [engine, data, resource]
    )

    return {
        data,
        loading,
        error,
        getData,
        setDataStore,
        updateDataStore,
    }
}

export default useDataStore
