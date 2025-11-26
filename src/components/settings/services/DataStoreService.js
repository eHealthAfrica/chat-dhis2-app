// src/services/dataStoreService.js
import { getInstance } from '@dhis2/app-runtime'

const namespace = 'ccv-dhis2-app'

const api = getInstance()

export const getDataStoreValue = async (key) => {
    try {
        const response = await api.get(`/dataStore/${namespace}/${key}`)
        return response
    } catch (error) {
        if (error.httpStatusCode === 404) return null
        throw error
    }
}

export const setDataStoreValue = async (key, value) => {
    try {
        const exists = await getDataStoreValue(key)
        if (exists === null) {
            await api.post(`/dataStore/${namespace}/${key}`, value)
        } else {
            await api.put(`/dataStore/${namespace}/${key}`, value)
        }
    } catch (error) {
        console.error('Failed to set value in dataStore:', error)
    }
}

export const deleteDataStoreValue = async (key) => {
    try {
        await api.delete(`/dataStore/${namespace}/${key}`)
    } catch (error) {
        console.error('Failed to delete value from dataStore:', error)
    }
}

export const getAllDataStoreKeys = async () => {
    try {
        return await api.get(`/dataStore/${namespace}`)
    } catch (error) {
        console.error('Failed to get keys from dataStore:', error)
        return []
    }
}
