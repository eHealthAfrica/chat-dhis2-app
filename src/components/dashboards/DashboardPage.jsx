import { Card } from '@dhis2/ui'
import { TableauViz } from '@tableau/embedding-api-react'
import React, { useEffect, useState } from 'react'
import useAppSettings from '../../hooks/useAppSettings'
import styles from '../styles/AboutPage.module.css'

const DashboardPage = () => {
    const { settings, loading, error } = useAppSettings()
    const [vizUrl, setVizUrl] = useState('')

    // On settings change, update vizUrl if the URL key exists
    useEffect(() => {
        if (settings && settings.ccvHFATDashboard) {
            setVizUrl(settings.ccvHFATDashboard)
        }
    }, [settings])

    if (loading) {return <div>Loading...</div>}
    if (error) {return <div>Error loading dashboard: {error.message}</div>}

    return (
        <div className={styles.container}>
            <Card>
                {vizUrl ? (
                    <div style={{ width: '100%', height: '100%' }}>
                        <TableauViz
                            src={vizUrl}
                            toolbar="hidden"
                            hide-tabs
                            width="100%"
                            height="90vh"
                            onFirstInteractive={() => {
                                console.log('Tableau viz loaded')
                            }}
                        />
                    </div>
                ) : (
                    <p>No Tableau dashboard URL configured.</p>
                )}
            </Card>
        </div>
    )
}

export default DashboardPage
