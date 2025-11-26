import { Card} from '@dhis2/ui'
import styles from './styles/AboutPage.module.css'

// TODO: How to combine links and i18n.t?
const AboutPage = () => (
    <div className={styles.container}>
        <Card>
            <div className={styles.cardContent}>
                {/* Banner Section */}
                <div className={styles.banner}>
                    <img
                        src='images/banner-image.png'
                        alt="CCV-HFAT Banner"
                        className={styles.bannerImage}
                    />
                    <div className={styles.bannerText}>
                        <h1>CCV-HFAT</h1>
                        <p className={styles.subtitle}>
                            Climate Change Vulnerabilities in Health Facility Assessment Tool
                        </p>
                    </div>
                </div>

                {/* Intro Section */}
                <div className={styles.section}>
                    <h2>Overview</h2>
                    <p>
                        <strong>CCV-HFAT</strong> is a digital tool built to assess the readiness and
                        vulnerability of health facilities in the face of climate change–induced risks such as
                        floods, heatwaves, and droughts.
                    </p>
                    <p>
                        The platform provides rapid and standardized data collection, enabling timely planning,
                        mitigation, and response strategies at local, regional, and national levels.
                    </p>
                </div>

                {/* Supported Assessments */}
                <div className={styles.section}>
                    <h2>Assessments Supported</h2>
                    <ul>
                        <li>🌊 Flood Vulnerability Health Facility Assessment</li>
                        <li>🔥 Adaptation Heatwaves Health Facility Assessment</li>
                        <li>🌵 Drought Resilience Health Facility Assessment</li>
                    </ul>
                </div>

                {/* Features */}
                <div className={styles.section}>
                    <h2>Key Features</h2>
                    <ul>
                        <li>📍 Facility-level event-based assessments</li>
                        <li>📝 Dynamic checklists and scoring logic</li>
                        <li>📊 Built-in visual dashboards</li>
                        <li>🔁 Seamless integration with DHIS2 Tracker and Analytics APIs</li>
                    </ul>
                </div>

                {/* Technology */}
                <div className={styles.section}>
                    <h2>Technology Stack</h2>
                    <ul>
                        <li>DHIS2 Web App Runtime + App Platform</li>
                        <li>React, Zustand, and TypeScript</li>
                        <li>Integrated with DHIS2 Tracker & Event APIs</li>
                        <li>Optional Power BI & Superset dashboard integrations</li>
                    </ul>
                </div>

                {/* Contact */}
                <div className={styles.section}>
                    <h2>Contact & Support</h2>
                    <p>
                        For training, implementation support, or customization requests,
                        contact the technical team at:
                    </p>
                    <p>
                        📧 <a href="mailto:support@ehealthnigeria.org">support@ehealthnigeria.org</a>
                    </p>
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    <p><em>Version 1.0.0 &nbsp;|&nbsp; Last updated: April 2025</em></p>
                </div>
            </div>
        </Card>
    </div>
)

export default AboutPage
