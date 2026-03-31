import i18n from '@dhis2/d2-i18n';
import styles from './Guides.module.css';

import dc1ChooseAssessment from '../../../assets/guide-screenshots/dc-1-choose-assessment.png';
import dc2SelectOrgUnit from '../../../assets/guide-screenshots/dc-2-select-org-unit.png';
import dc3ReportDate from '../../../assets/guide-screenshots/dc-3-report-date.png';
import dc4CompleteSections from '../../../assets/guide-screenshots/dc-4-complete-sections.png';
import dc5Coordinates from '../../../assets/guide-screenshots/dc-5-coordinates.png';
import dc6SaveDrafts from '../../../assets/guide-screenshots/dc-6-save-drafts.png';
import dc7ReviewEvents from '../../../assets/guide-screenshots/dc-7-review-events.png';

const steps = [
    {
        id: 'choose-program',
        number: '1',
        title: i18n.t('Choose an assessment'),
        body: i18n.t('Open Data Capture and select the assessment card you want to work with. The list only shows active assessment tools that are already available in the app.'),
        bullets: [
            i18n.t('Select the program card to open its event list.'),
            i18n.t('Use the event list to review both submitted events and saved drafts.'),
        ],
        image: dc1ChooseAssessment,
    },
    {
        id: 'select-org-unit',
        number: '2',
        title: i18n.t('Select the organisation unit'),
        body: i18n.t('Choose the organisation unit before you start a new record. For new records, this selection controls where the event is captured.'),
        bullets: [
            i18n.t('Pick the correct facility, district, or branch before continuing.'),
            i18n.t('Completed events keep their original organisation unit and do not allow changes.'),
        ],
        image: dc2SelectOrgUnit,
    },
    {
        id: 'report-date',
        number: '3',
        title: i18n.t('Enter the report date'),
        body: i18n.t('Use the Report date step to enter the date for the assessment. You must complete this step before moving into the form sections.'),
        bullets: [
            i18n.t('The report date is stored as `occurredAt` in the event payload.'),
            i18n.t('If the date field is blank or invalid, the form will not let you continue.'),
        ],
        image: dc3ReportDate,
    },
    {
        id: 'complete-sections',
        number: '4',
        title: i18n.t('Complete the form sections'),
        body: i18n.t('Move through the section list on the left and fill the required fields in each section. The navigation highlights incomplete required fields.'),
        bullets: [
            i18n.t('Required fields must be completed before you can submit the assessment.'),
            i18n.t('Long section names wrap in the side navigation so you can still read them.'),
        ],
        image: dc4CompleteSections,
    },
    {
        id: 'coordinates',
        number: '5',
        title: i18n.t('Capture coordinates when needed'),
        body: i18n.t('Coordinate fields let you enter latitude and longitude directly, or use the current location button to fill both values automatically.'),
        bullets: [
            i18n.t('You can edit the coordinates after using current location.'),
            i18n.t('Both latitude and longitude must be valid before the field passes validation.'),
        ],
        image: dc5Coordinates,
    },
    {
        id: 'drafts',
        number: '6',
        title: i18n.t('Save and resume drafts'),
        body: i18n.t('Use Save progress to keep an unfinished record. Drafts are grouped by user and program, and each saved draft stays unique by organisation unit and report date.'),
        bullets: [
            i18n.t('Open the Drafts tab to continue saved work.'),
            i18n.t('Parent organisation units can show drafts from all descendants in the event list.'),
        ],
        image: dc6SaveDrafts,
    },
    {
        id: 'review-events',
        number: '7',
        title: i18n.t('Review submitted events'),
        body: i18n.t('Use the All view in the event list to review tracker events from the selected organisation unit and all descendants, together with any matching drafts.'),
        bullets: [
            i18n.t('Completed events read directly from the DHIS2 tracker events endpoint.'),
            i18n.t('The list shows report date, organisation unit name, creator, and updater details when available.'),
        ],
        image: dc7ReviewEvents,
    },
];

const scrollToStep = (stepId: string) => {
    document.getElementById(stepId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

export const DataCaptureGuide = () => {
    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div className={styles.headerMain}>
                    <p className={styles.eyebrow}>{i18n.t('Guide')}</p>
                    <h2 className={styles.title}>{i18n.t('Data capture guide')}</h2>
                    <p className={styles.lead}>
                        {i18n.t('Use this page as an in-app checklist for selecting an assessment, entering report dates, completing sections, saving drafts, and reviewing submitted events.')}
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
                            {i18n.t('You need at least one active assessment in the app and access to the relevant organisation units before you can capture new data.')}
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
