import React from 'react'
import { Card } from '@dhis2/ui'

const HomePage = () => {
    const styles = {
        container: {
            marginRight: '24px',
            marginBottom: '100px',
            maxWidth: '80vw',
            height: 'auto',
            margin: '0.5rem auto',
            padding: '0 0.5rem',
            overflow: 'hidden' ,
         },
        cardContent: {
            padding: '0.5rem',
            fontFamily: 'Roboto, sans-serif',
            color: '#333',
        },
        banner: {
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#ffffff',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '2rem',
        },
        bannerImage: {
            width: '400px',
            height: '160px',
            marginRight: '1.5rem',
            borderRadius: '4px',
        },
        bannerText: {
            display: 'flex',
            flexDirection: 'column',
        },
        subtitle: {
            margin: '0.25rem 0 0',
            fontSize: '1rem',
            color: '#555',
        },
        section: {
            marginBottom: '2rem',
        },
        sectionTitle: {
            marginBottom: '0.5rem',
            color: '#0075c9',
        },
        footer: {
            textAlign: 'center',
            color: '#777',
            fontSize: '0.9rem',
            marginTop: '2rem',
        },
    }

    return (
        <div style={styles.container}>

                <div style={styles.cardContent}>
                    {/* Banner Section */}
                    <div style={styles.banner}>
                        <img
                            src='images/banner-image.png'
                            alt="CCV-HFAT Banner"
                            style={styles.bannerImage}
                        />
                    
                    </div>

                    {/* Intro Section */}
                    <div style={styles.section}>
                        <h2 style={styles.sectionTitle}>Overview</h2>
                        <p>
                            <strong>About the Climate Health Vulnerability Assessment Tool (CHAT)</strong>
                        </p>
                        <p>
                        The Climate Health Vulnerability Assessment Tool (CHAT) is a digital tool developed by eHealth Africa,
                         based on the World Health Organization’s Checklists to Assess Vulnerabilities in Health Care Facilities in the Context of Climate Change,
                        to assess and strengthen the climate resilience of healthcare facilities using valid, actionable data.
                        </p>
                        <p>Designed for easy deployment, 
                        it eliminates paper use and supports environmental sustainability. The CHAT enhances preparedness against climate-related disruptions, 
                        helping facilities maintain uninterrupted service delivery. It was initially piloted to assess vulnerability to flood-related events in primary health care facilities across Borno State, 
                        Kano State, and the FCT.
                        </p>
                           
                        <p>The CHAT is currently being scaled to broaden its scope and strengthen its capabilities.</p>

                    </div>

                    {/* Supported Assessments */}
                    <div style={styles.section}>
                        <h2 style={styles.sectionTitle}>Assessments Supported</h2>
                        <ul>
                            <li>🌊 Flood Vulnerability Health Facility Assessment</li>
                            <li>🔥 Adaptation Heatwaves Health Facility Assessment</li>
                            <li>🌵 Drought Resilience Health Facility Assessment</li>
                        </ul>
                    </div>

                    {/* Features */}
                    <div style={styles.section}>
                        <h2 style={styles.sectionTitle}>Key Features</h2>
                        <ul>
                            <li>📍 Facility-level event-based assessments</li>
                            <li>📝 Dynamic checklists and scoring logic</li>
                            <li>📊 Built-in visual dashboards</li>
                            <li>🔁 Seamless integration with DHIS2 Tracker and Analytics APIs</li>
                        </ul>
                    </div>

                    {/* Technology */}
                    <div style={styles.section}>
                        <h2 style={styles.sectionTitle}>Technology Stack</h2>
                        <ul>
                            <li>DHIS2 Web App Runtime + App Platform</li>
                            <li>React, Zustand, and TypeScript</li>
                            <li>Integrated with DHIS2 Tracker & Event APIs</li>
                            <li>Optional Power BI & Superset dashboard integrations</li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div style={styles.section}>
                        <h2 style={styles.sectionTitle}>Contact & Support</h2>
                        <p>
                            For training, implementation support, or customization requests,
                            contact the technical team at:
                        </p>
                        <p>
                            📧 <a href="mailto:support@ehealthnigeria.org">support@ehealthnigeria.org</a>
                        </p>
                    </div>

                    {/* Footer */}
                    <div style={styles.footer}>
                        <p><em>Version 1.0.0 &nbsp;|&nbsp; Last updated: May 2025</em></p>
                    </div>
                </div>

        </div>
    )
}

export default HomePage
