import i18n from '@dhis2/d2-i18n';
import type { OrganisationUnit } from '../../../../components/OrganisationUnitSelector/OrganisationUnitSelector';
import { DAILY, WEEKLY, MONTHLY, YEARLY, getPeriodTypes, getPeriods, type PeriodType } from '../utils/time';

interface ImportPreviewProps {
    dataset: string;
    periodType: PeriodType;
    startDate: string;
    endDate: string;
    featureCount: number;
    dataElement: string;
    totalValues: number;
    orgUnits: OrganisationUnit[];
}

const getOuText = (orgUnits: OrganisationUnit[]): string =>
    orgUnits
        .map(ou => ou.name ?? ou.displayName ?? '')
        .filter(Boolean)
        .slice(0, 3)
        .join(', ') + (orgUnits.length > 3 ? ` +${orgUnits.length - 3}` : '');

const ImportPreview = ({
    dataset,
    periodType,
    startDate,
    endDate,
    featureCount,
    dataElement,
    totalValues,
    orgUnits,
}: ImportPreviewProps) => {
    const periodTypeObj = getPeriodTypes().find(t => t.id === periodType);
    const periodTypeName = periodTypeObj?.name ?? periodType;
    const periodTypeNoun = periodTypeObj?.noun ?? periodType.toLowerCase();

    let periodInfo: string;
    if (periodType === WEEKLY || periodType === MONTHLY) {
        const periods = getPeriods({ periodType, startTime: startDate, endTime: endDate });
        if (periods.length === 0) {
            periodInfo = i18n.t('{{periodTypeName}} values from {{startDate}} to {{endDate}}', { periodTypeName, startDate, endDate });
        } else if (periods.length === 1) {
            periodInfo = i18n.t('For {{periodId}} ({{start}} to {{end}})', {
                periodId: periods[0].id,
                start: periods[0].startDate,
                end: periods[0].endDate,
            });
        } else {
            periodInfo = i18n.t('{{periodTypeName}} values from {{start}} to {{end}}', {
                periodTypeName,
                start: periods[0].id,
                end: periods[periods.length - 1]?.id,
            });
        }
    } else if ((periodType === DAILY || periodType === YEARLY) && endDate === startDate) {
        periodInfo = i18n.t('For the {{periodTypeNoun}} {{date}}', { periodTypeNoun, date: startDate });
    } else {
        periodInfo = i18n.t('{{periodTypeName}} values between {{startDate}} and {{endDate}}', {
            periodTypeName,
            startDate,
            endDate,
        });
    }

    const orgUnitInfo = i18n.t(
        'Selected org units: {{ouText}} ({{count}} organisation units have geometry and will be imported)',
        {
            ouText: getOuText(orgUnits),
            count: featureCount,
            defaultValue: 'Selected org units: {{ouText}} ({{count}} organisation unit has geometry and will be imported)',
            defaultValue_plural: 'Selected org units: {{ouText}} ({{count}} organisation units have geometry and will be imported)',
            interpolation: { escapeValue: false },
            nsSeparator: '<<',
        },
    );

    return (
        <div data-test="import-preview" style={{ padding: '12px 0' }}>
            <p style={{ fontWeight: 500, marginBottom: '8px' }}>
                {i18n.t('"{{dataset}}" source data will be imported:', {
                    dataset,
                    interpolation: { escapeValue: false },
                })}
            </p>
            <ul style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
                <li>{periodInfo}</li>
                <li>{orgUnitInfo}</li>
                <li>
                    {i18n.t('To data element "{{dataElement}}"', {
                        dataElement,
                        interpolation: { escapeValue: false },
                    })}
                </li>
                <li>
                    {i18n.t('{{count}} data values will be imported', {
                        count: totalValues,
                        defaultValue: '{{count}} data value will be imported',
                        defaultValue_plural: '{{count}} data values will be imported',
                    })}
                </li>
            </ul>
        </div>
    );
};

export default ImportPreview;
