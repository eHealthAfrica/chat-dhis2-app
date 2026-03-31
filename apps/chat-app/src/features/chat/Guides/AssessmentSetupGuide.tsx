import i18n from '@dhis2/d2-i18n';
import styles from './Guides.module.css';

import as1OpenSettings from '../../../assets/guide-screenshots/as-1-open-settings.png';
import as2LoadJson from '../../../assets/guide-screenshots/as-2-load-json.png';
import as3ReviewProgram from '../../../assets/guide-screenshots/as-3-review-program.png';
import as4AssignOrgUnits from '../../../assets/guide-screenshots/as-4-assign-org-units.png';
import as5ImportAssessment from '../../../assets/guide-screenshots/as-5-import-assessment.png';
import as6ConfirmAvailable from '../../../assets/guide-screenshots/as-6-confirm-available.png';

const steps = [
    {
        id: 'open-settings',
        number: '1',
        title: i18n.t('Open assessment settings'),
        body: i18n.t('Start from Settings if you need to create or import a new assessment. This area is intended for users who have the required chat settings authority.'),
        bullets: [
            i18n.t('Use the New assessment action to open the import flow.'),
            i18n.t('Existing assessments stay visible in the settings list for review or cleanup.'),
        ],
        image: as1OpenSettings,
    },
    {
        id: 'load-json',
        number: '2',
        title: i18n.t('Load the metadata JSON'),
        body: i18n.t('Upload the DHIS2 metadata JSON file for the assessment tool. The import flow checks the file before it lets you continue.'),
        bullets: [
            i18n.t('Only `.json` files are accepted in the import step.'),
            i18n.t('Parsing warnings are shown before you import the assessment.'),
        ],
        image: as2LoadJson,
    },
    {
        id: 'review-preview',
        number: '3',
        title: i18n.t('Review the detected program'),
        body: i18n.t('Use the review step to inspect the program, program stage, sections, data elements, option sets, and indicators that were found in the JSON.'),
        bullets: [
            i18n.t('Use the Next button after you finish reviewing the metadata preview.'),
            i18n.t('The preview step helps you catch missing or unexpected metadata before import.'),
        ],
        image: as3ReviewProgram,
    },
    {
        id: 'assign-org-units',
        number: '4',
        title: i18n.t('Assign organisation units'),
        body: i18n.t('The next step asks you to select organisation units before the final import action becomes available.'),
        bullets: [
            i18n.t('You must select at least one organisation unit before importing.'),
            i18n.t('This selection is part of the guided import flow and is confirmed before the final import action.'),
        ],
        image: as4AssignOrgUnits,
    },
    {
        id: 'import-assessment',
        number: '5',
        title: i18n.t('Import the assessment'),
        body: i18n.t('Use Import assessment to save the program to DHIS2 and then register the local assessment record so it appears in the chat app.'),
        bullets: [
            i18n.t('If the DHIS2 save succeeds but the local save fails, the screen shows a retry option for the local record.'),
            i18n.t('After a successful import, the app returns you to the settings list.'),
        ],
        image: as5ImportAssessment,
    },
    {
        id: 'confirm-availability',
        number: '6',
        title: i18n.t('Confirm the assessment is available'),
        body: i18n.t('After import, check the settings list and then open Data Capture to confirm the new active assessment is available for users.'),
        bullets: [
            i18n.t('Active assessments appear in the data capture home screen.'),
            i18n.t('Use the assessment details view in settings if you need to inspect the imported program metadata.'),
        ],
        image: as6ConfirmAvailable,
    },
];

const scrollToStep = (stepId: string) => {
    document.getElementById(stepId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

export const AssessmentSetupGuide = () => {
    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div className={styles.headerMain}>
                    <p className={styles.eyebrow}>{i18n.t('Guide')}</p>
                    <h2 className={styles.title}>{i18n.t('Assessment setup guide')}</h2>
                    <p className={styles.lead}>
                        {i18n.t('Use this page to walk through the assessment import flow, from loading the JSON file to selecting organisation units and confirming the assessment is ready for capture.')}
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
                            {i18n.t('You need access to Chat settings before you can import or manage assessment tools in this app.')}
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
                            {step.image && (
                                <img
                                    src={step.image}
                                    alt={step.title}
                                    className={styles.stepImage}
                                />
                            )}
                        </section>
                    ))}
                </div>
            </div>
        </div>
    );
};
