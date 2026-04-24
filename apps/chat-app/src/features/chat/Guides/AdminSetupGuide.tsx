import i18n from '@dhis2/d2-i18n';
import styles from './Guides.module.css';
import guideStyles from './AdminSetupGuide.module.css';

const steps = [
    {
        id: 'install-app',
        number: '1',
        title: i18n.t('Install the app'),
        body: i18n.t('Build and deploy the CHAT app to your DHIS2 instance, or install it directly from the DHIS2 App Hub if it is listed there.'),
        bullets: [
            i18n.t('The app requires DHIS2 version 2.41 or higher.'),
            i18n.t('After installation the app appears in the DHIS2 app menu under its registered display name.'),
        ],
        note: null,
    },
    {
        id: 'assign-authorities',
        number: '2',
        title: i18n.t('Assign user authorities'),
        body: i18n.t('CHAT uses a custom authority to control who can manage assessments. Assign it to the relevant user roles in DHIS2 → User Management → User Roles.'),
        bullets: [
            i18n.t('Open the target user role, go to the Authorities tab, search for the authority below, and save.'),
            i18n.t('Users without this authority can still access Data Capture and Guides, but cannot create or delete assessments.'),
        ],
        note: null,
        authority: {
            code: 'F_CHAT_ADD_SETTINGS',
            description: i18n.t('Create, import, link, and delete assessments in the Settings page'),
        },
    },
    {
        id: 'import-metadata',
        number: '3',
        title: i18n.t('Import a metadata package'),
        body: i18n.t('Assessment tools are distributed as DHIS2 metadata JSON packages. Download a package and use the import wizard to push it to your instance.'),
        bullets: [
            i18n.t('Navigate to Settings → New assessment and upload the metadata .json file.'),
            i18n.t('Review the detected program, sections, data elements, option sets, and indicators.'),
            i18n.t('Assign the relevant organisation units, then click Import assessment to push the metadata to DHIS2 and register the record.'),
        ],
        note: i18n.t('Pre-built metadata packages are available in the meta-data-packages folder of the repository.'),
        packageUrl: 'https://github.com/eHealthAfrica/chat-dhis2-app/tree/main/meta-data-packages',
    },
    {
        id: 'link-existing',
        number: '4',
        title: i18n.t('Link an existing program (optional)'),
        body: i18n.t('If the DHIS2 program is already deployed in your instance, you can register it without re-importing the metadata.'),
        bullets: [
            i18n.t('Navigate to Settings → Link existing program.'),
            i18n.t('Search for the program by name, then click Add to register it as a CHAT assessment.'),
            i18n.t('The program must already exist in DHIS2 — this step only adds the local assessment record.'),
        ],
        note: null,
    },
    {
        id: 'verify-setup',
        number: '5',
        title: i18n.t('Verify the setup'),
        body: i18n.t('After adding an assessment, confirm it is visible and working for both admin and data-capture users.'),
        bullets: [
            i18n.t('Open Settings and confirm the new assessment appears with status Active.'),
            i18n.t('Log in as a data-capture user (without F_CHAT_ADD_SETTINGS) and confirm the assessment card appears in Data Capture.'),
            i18n.t('Open an assessment record and check that all form sections and data elements load correctly.'),
        ],
        note: null,
    },
];

const scrollToStep = (stepId: string) => {
    document.getElementById(stepId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

export const AdminSetupGuide = () => {
    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div className={styles.headerMain}>
                    <p className={styles.eyebrow}>{i18n.t('Guide')}</p>
                    <h2 className={styles.title}>{i18n.t('Admin setup guide')}</h2>
                    <p className={styles.lead}>
                        {i18n.t(
                            'Use this page to walk through the one-time admin setup: installing the app, assigning user authorities, importing or linking assessment programs, and verifying the configuration.',
                        )}
                    </p>
                </div>
            </div>

            <div className={styles.layout}>
                <aside className={styles.sideNav}>
                    <p className={styles.sideLabel}>{i18n.t('Quick links')}</p>
                    {steps.map(step => (
                        <button
                            key={step.id}
                            type="button"
                            className={styles.sideButton}
                            onClick={() => scrollToStep(step.id)}
                        >
                            <span className={styles.sideStep}>{step.number}</span>
                            <span>{step.title}</span>
                        </button>
                    ))}
                </aside>

                <div className={styles.content}>
                    <div className={styles.callout}>
                        <p className={styles.calloutTitle}>{i18n.t('Before you start')}</p>
                        <p className={styles.calloutBody}>
                            {i18n.t(
                                'You need DHIS2 superuser or user-management access to assign authorities, and the F_CHAT_ADD_SETTINGS authority to manage assessments inside the app.',
                            )}
                        </p>
                    </div>

                    {steps.map(step => (
                        <section key={step.id} id={step.id} className={styles.stepCard}>
                            <div className={styles.stepHeader}>
                                <span className={styles.stepBadge}>{step.number}</span>
                                <div className={styles.stepTitleWrap}>
                                    <h3 className={styles.stepTitle}>{step.title}</h3>
                                    <p className={styles.stepBody}>{step.body}</p>
                                </div>
                            </div>

                            <ul className={styles.bulletList}>
                                {step.bullets.map(bullet => (
                                    <li key={bullet}>{bullet}</li>
                                ))}
                            </ul>

                            {'authority' in step && step.authority && (
                                <div className={guideStyles.authorityBlock}>
                                    <code className={guideStyles.authorityCode}>
                                        {step.authority.code}
                                    </code>
                                    <span className={guideStyles.authorityDesc}>
                                        {step.authority.description}
                                    </span>
                                </div>
                            )}

                            {'packageUrl' in step && step.packageUrl && step.note && (
                                <div className={guideStyles.noteBlock}>
                                    <span className={guideStyles.noteText}>{step.note}</span>
                                    <a
                                        href={step.packageUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={guideStyles.noteLink}
                                    >
                                        {i18n.t('Browse metadata packages →')}
                                    </a>
                                </div>
                            )}

                            {!('authority' in step) && !('packageUrl' in step) && step.note && (
                                <div className={guideStyles.noteBlock}>
                                    <span className={guideStyles.noteText}>{step.note}</span>
                                </div>
                            )}
                        </section>
                    ))}
                </div>
            </div>
        </div>
    );
};
