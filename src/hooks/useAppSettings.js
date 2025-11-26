import { useDataEngine } from '@dhis2/app-runtime'
import { useState, useCallback, useEffect } from 'react'

const APP_NAMESPACE = 'ccv-dhis2-app'
const SETTINGS_KEY = 'ccv-dhis2-app'
const resource = `dataStore/${APP_NAMESPACE}/${SETTINGS_KEY}`

const useAppSettings = () => {
    const [loading, setLoading] = useState(true)
    const [settings, setSettings] = useState()
    const [error, setError] = useState()
    const engine = useDataEngine()

    const getSettings = useCallback(() => {
        setLoading(true)
        engine
            .query({ dataStore: { resource: 'dataStore' } })
            .then(({ dataStore }) => {
                if (dataStore.includes(APP_NAMESPACE)) {
                    engine
                        .query({ settings: { resource } })
                        .then(({ settings }) => {
                            setSettings(settings)
                            setLoading(false)
                        })
                        .catch(setError)
                } else {
                    engine
                        .mutate({
                            resource,
                            type: 'create',
                            data: {},
                        })
                        .then((response) => {
                            if (response.httpStatusCode === 201) {
                                setSettings({})
                                setLoading(false)
                            } else {
                                setError(response)
                            }
                        })
                        .catch(setError)
                }
            })
            .catch(setError)
    }, [engine])

    const changeSetting = useCallback(
        (key, value) => {
            const updatedSettings = { ...settings, [key]: value }
            engine
                .mutate({
                    resource,
                    type: 'update',
                    data: updatedSettings,
                })
                .then((response) => {
                    if (response.httpStatusCode === 200) {
                        setSettings(updatedSettings)
                    } else {
                        setError(response)
                    }
                })
                .catch(setError)
        },
        [engine, settings]
    )

    useEffect(() => {
        getSettings()
    }, [getSettings])

    return { settings, loading, error, changeSetting }
}

export default useAppSettings
