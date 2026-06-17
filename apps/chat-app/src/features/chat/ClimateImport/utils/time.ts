import i18n from '@dhis2/d2-i18n';
import {
    convertFromIso8601,
    convertToIso8601,
    generateFixedPeriods,
    getNowInCalendar,
} from '@dhis2/multi-calendar-dates';

type SupportedCalendar = Parameters<typeof generateFixedPeriods>[0]['calendar'];
type SupportedPeriodType = Parameters<typeof generateFixedPeriods>[0]['periodType'];
const asCalendar = (c: string): SupportedCalendar => c as SupportedCalendar;
const asPeriodType = (p: string): SupportedPeriodType => p as SupportedPeriodType;

export const HOURLY = 'HOURLY';
export const DAILY = 'DAILY';
export const WEEKLY = 'WEEKLY';
export const MONTHLY = 'MONTHLY';
export const SIXTEEN_DAYS = 'SIXTEEN_DAYS';
export const YEARLY = 'YEARLY';

export type PeriodType = typeof HOURLY | typeof DAILY | typeof WEEKLY | typeof MONTHLY | typeof SIXTEEN_DAYS | typeof YEARLY;

export const UTC_TIME_ZONE = 'Etc/UTC';

export const oneDayInMs = 1000 * 60 * 60 * 24;

export interface PeriodTypeOption {
    id: PeriodType;
    name: string;
    noun: string;
}

export const getPeriodTypes = (): PeriodTypeOption[] => [
    { id: DAILY, name: i18n.t('Daily'), noun: i18n.t('day') },
    { id: WEEKLY, name: i18n.t('Weekly'), noun: i18n.t('week') },
    { id: MONTHLY, name: i18n.t('Monthly'), noun: i18n.t('month') },
    { id: YEARLY, name: i18n.t('Yearly'), noun: i18n.t('year') },
];

export interface Period {
    startDate: string;
    endDate: string;
    id?: string;
    displayName?: string;
    startTime?: number;
    endTime?: number;
    middleTime?: number;
}

export interface ImportPeriod {
    periodType: PeriodType;
    startTime: string;
    endTime: string;
    calendar: string;
    timeZone?: string;
}

export const addPeriodTimestamp = (period: Period): Period & { startTime: number; endTime: number; middleTime: number } => {
    const startTime = new Date(period.startDate).getTime();
    const endTime = new Date(period.endDate).getTime() + oneDayInMs;
    const middleTime = startTime + (endTime - startTime) / 2;
    return { ...period, startTime, endTime, middleTime };
};

export const getMiddleTime = (period: { startTime: number; endTime: number }): number =>
    period.startTime + (period.endTime - period.startTime) / 2;

export const padWithZeroes = (number: number, count = 2): string =>
    String(number).padStart(count, '0');

export const formatStandardDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = padWithZeroes(date.getMonth() + 1);
    const day = padWithZeroes(date.getDate());
    return `${year}-${month}-${day}`;
};

export const formatCalendarDate = (date: { eraYear?: number; year?: number; month: number; day: number }): string => {
    const year = date.eraYear ?? date.year;
    const month = padWithZeroes(date.month);
    const day = padWithZeroes(date.day);
    return `${year}-${month}-${day}`;
};

export const getCalendarDate = (calendar: string, period: Record<string, number> = { days: 0 }): string => {
    const now = getNowInCalendar(calendar).add(period);
    return formatCalendarDate(now);
};

export const getCurrentYear = (): number => new Date().getFullYear();

export const getCurrentMonth = (): number => new Date().getMonth() + 1;

export const getLastMonth = (date = new Date(), lagDays = 10): [number, number] => {
    const newDate = new Date(date.getTime());
    const month = newDate.getMonth();
    const monthsBack = newDate.getDate() > lagDays ? 1 : 2;

    newDate.setMonth(month - monthsBack);

    while (newDate.getMonth() === month) {
        newDate.setDate(newDate.getDate() - 1);
    }

    return [newDate.getFullYear(), newDate.getMonth() + 1];
};

export const getDefaultMonthlyPeriod = (lagDays?: number): { startTime: string; endTime: string } => {
    const [endYear, endMonth] = getLastMonth(new Date(), lagDays);
    const endTime = new Date(endYear, endMonth, 0);
    const startTime = new Date(endYear, endTime.getMonth() - 11, 1);
    const startYear = startTime.getFullYear();
    const startMonth = startTime.getMonth() + 1;

    return {
        startTime: `${startYear}-${padWithZeroes(startMonth)}`,
        endTime: `${endYear}-${padWithZeroes(endMonth)}`,
    };
};

export const getDefaultImportPeriod = ({
    calendar,
    periodType = DAILY,
    period,
}: {
    calendar: string;
    periodType?: PeriodType;
    period?: string;
}): ImportPeriod => {
    if (periodType === YEARLY) {
        const startTime = period ?? extractYear(getCalendarDate(calendar, { years: -2 })).toString();
        const endTime = period ?? extractYear(getCalendarDate(calendar, { years: -1 })).toString();
        return { periodType, startTime, endTime, calendar };
    }

    const startMonthsBack = periodType === MONTHLY ? 12 : 6;

    return {
        periodType,
        startTime: getCalendarDate(calendar, { months: -startMonthsBack }),
        endTime: getCalendarDate(calendar, { months: -1 }),
        calendar,
    };
};

export const getDefaultExplorePeriod = (lagDays = 10): { startTime: string; endTime: string } => {
    const endTime = new Date();
    endTime.setDate(endTime.getDate() - lagDays);
    endTime.setDate(0);

    const startTime = new Date(endTime.getFullYear(), endTime.getMonth() - 11, 1);

    return {
        startTime: formatStandardDate(startTime),
        endTime: formatStandardDate(endTime),
    };
};

export const getNumberOfMonths = (startTime: string, endTime: string): number => {
    const startYear = Number.parseInt(startTime.substring(0, 4));
    const start = Number.parseInt(startTime.substring(5, 7));
    const endYear = Number.parseInt(endTime.substring(0, 4));
    const end = Number.parseInt(endTime.substring(5, 7));
    return (endYear - startYear) * 12 + (end - start) + 1;
};

export const getNumberOfDays = (startTime: string, endTime: string): number => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    return (end.getTime() - start.getTime()) / oneDayInMs + 1;
};

export const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
};

export const formatBookmarkDate = (str: string | undefined | null): string => {
    if (!str) return '';
    if (/^\d{4}$/.test(str)) return str;
    const d = new Date(str);
    if (Number.isNaN(d.getTime())) return str;
    return d.toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const toDateObject = (dateString: string): { year: number; month: number; day: number } => {
    const [year, month, day] = dateString.split('-');
    return {
        year: Number.parseInt(year),
        month: month ? Number.parseInt(month) : 1,
        day: day ? Number.parseInt(day) : 1,
    };
};

export const extractYear = (dateString: string): number =>
    Number.parseInt(dateString.split('-')[0]);

export const toStandardDate = (dateString: string, calendar: string): string => {
    const date = convertToIso8601(toDateObject(dateString), asCalendar(calendar));
    const year = (date as { eraYear?: number; year?: number }).eraYear ?? (date as { year?: number }).year;
    const month = padWithZeroes((date as { month: number }).month);
    const day = padWithZeroes((date as { day: number }).day);
    return `${year}-${month}-${day}`;
};

export const fromStandardDate = (dateString: string, calendar: string): string => {
    const date = convertFromIso8601(toDateObject(dateString), asCalendar(calendar));
    const year = (date as { eraYear?: number; year?: number }).eraYear ?? (date as { year?: number }).year;
    const month = padWithZeroes((date as { month: number }).month);
    const day = padWithZeroes((date as { day: number }).day);
    return `${year}-${month}-${day}`;
};

export const getStandardPeriod = ({
    startTime,
    endTime,
    calendar,
    periodType,
}: ImportPeriod): ImportPeriod =>
    periodType === YEARLY
        ? { startTime, endTime, calendar, periodType }
        : {
                startTime: toStandardDate(startTime, calendar),
                endTime: toStandardDate(endTime, calendar),
                periodType,
                calendar,
            };

export const getPeriods = ({
    periodType,
    startTime,
    endTime,
    calendar = 'gregory',
    locale = 'en',
}: {
    periodType: PeriodType;
    startTime: string;
    endTime: string;
    calendar?: string;
    locale?: string;
}): Period[] => {
    if (periodType === YEARLY) {
        return generateFixedPeriods({
            year: Number(endTime),
            calendar: asCalendar(calendar),
            locale,
            periodType: YEARLY,
            yearsCount: Number(endTime) - Number(startTime) + 1,
        }) as Period[];
    }

    const startYear = extractYear(fromStandardDate(startTime, calendar));
    const endYear = extractYear(fromStandardDate(endTime, calendar));

    let items: Period[] = [];

    for (let year = startYear; year <= endYear; year++) {
        const yearPeriods = (generateFixedPeriods({ year, calendar: asCalendar(calendar), locale, periodType: asPeriodType(periodType) }) as Period[])
            .map(p =>
                calendar === 'iso8601'
                    ? p
                    : {
                            ...p,
                            startDate: toStandardDate(p.startDate, calendar),
                            endDate: toStandardDate(p.endDate, calendar),
                        },
            )
            .filter(p => p.startDate <= endTime && p.endDate >= startTime);

        items = items.concat(yearPeriods);
    }

    return items;
};

export const getMappedPeriods = (periods: Period[]): Map<string, string> => {
    const mappedPeriods = new Map<string, string>();
    periods.reduce((map, p) => map.set(p.startDate, p.id ?? p.startDate), mappedPeriods);
    return mappedPeriods;
};

export const isValidPeriod = (period: Partial<ImportPeriod> | null | undefined): boolean =>
    Boolean(
        period &&
        period.startTime &&
        period.endTime &&
        new Date(period.startTime) <= new Date(period.endTime),
    );

const DATE_FORMATS = {
    YEAR: 'year',
    YEAR_MONTH: 'year-month',
    FULL_DATE: 'full-date',
    UNKNOWN: 'unknown',
} as const;

const getDateFormat = (date: string): string => {
    if (/^\d{4}$/.test(date)) return DATE_FORMATS.YEAR;
    if (/^\d{4}-\d{2}$/.test(date)) return DATE_FORMATS.YEAR_MONTH;
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return DATE_FORMATS.FULL_DATE;
    return DATE_FORMATS.UNKNOWN;
};

const findPeriodDisplayName = ({
    calDate,
    periods,
    fallback,
    format,
}: {
    calDate: string;
    periods: Period[];
    fallback: string;
    format: string;
}): string => {
    let found: Period | undefined;

    if (format === DATE_FORMATS.FULL_DATE || format === DATE_FORMATS.YEAR_MONTH) {
        found = periods.find(p => p.startDate <= calDate && p.endDate >= calDate);
    } else {
        found = periods.find(p => p.startDate === calDate);
    }

    return found ? found.displayName ?? fallback : fallback;
};

const formatNonGregorianDate = (date: string, calendar: string, locale: string): string => {
    try {
        const format = getDateFormat(date);

        if (format === DATE_FORMATS.YEAR) {
            const calYearStr = fromStandardDate(`${date}-01-01`, calendar).split('-')[0];
            const items = generateFixedPeriods({
                year: Number.parseInt(calYearStr, 10),
                calendar: asCalendar(calendar),
                locale,
                periodType: YEARLY,
                yearsCount: 1,
            }) as Period[];
            return items?.length ? items[0].displayName ?? date : date;
        }

        if (format === DATE_FORMATS.YEAR_MONTH) {
            const [year, month] = date.split('-');
            const calDate = fromStandardDate(`${year}-${month}-01`, calendar);
            const months = generateFixedPeriods({
                year: Number.parseInt(calDate.split('-')[0], 10),
                calendar: asCalendar(calendar),
                locale,
                periodType: MONTHLY,
            }) as Period[];
            return findPeriodDisplayName({ calDate, periods: months, fallback: date, format });
        }

        if (format === DATE_FORMATS.FULL_DATE) {
            const calDate = fromStandardDate(date, calendar);
            const days = generateFixedPeriods({
                year: Number.parseInt(calDate.split('-')[0], 10),
                calendar: asCalendar(calendar),
                locale,
                periodType: DAILY,
            }) as Period[];
            return findPeriodDisplayName({ calDate, periods: days, fallback: date, format });
        }
    } catch (e) {
        console.error(`Error formatting date "${date}" for calendar "${calendar}":`, e);
    }

    return date;
};

const formatGregorianDate = (date: string, locale: string): string => {
    const format = getDateFormat(date);

    if (format === DATE_FORMATS.YEAR) {
        return new Intl.DateTimeFormat(locale, { year: 'numeric' }).format(new Date(Number(date), 0, 1));
    }

    if (format === DATE_FORMATS.YEAR_MONTH) {
        const [year, month] = date.split('-');
        return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' }).format(
            new Date(Number(year), Number(month) - 1, 1),
        );
    }

    if (format === DATE_FORMATS.FULL_DATE) {
        return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(date));
    }

    return date;
};

export const getDateStringFromIsoDate = ({
    date,
    calendar = 'gregory',
    locale = 'en',
}: {
    date: string;
    calendar?: string;
    locale?: string;
}): string => {
    if (calendar !== 'gregory') {
        return formatNonGregorianDate(date, calendar, locale);
    }
    return formatGregorianDate(date, locale);
};

export const normalizeIsoDate = (input: string | undefined | null): string | null => {
    if (!input || typeof input !== 'string') return null;

    if (/^\d{4}$/.test(input)) return `${input}-01-01`;

    if (/^\d{4}-\d{2}$/.test(input)) return `${input}-01`;

    const weekMatch = /^(\d{4})-W(\d{2})$/.exec(input);
    if (weekMatch) {
        const year = Number.parseInt(weekMatch[1], 10);
        const week = Number.parseInt(weekMatch[2], 10);
        const simple = new Date(Date.UTC(year, 0, 4));
        const dayOfWeek = simple.getUTCDay() || 7;
        const isoWeek1Start = new Date(simple);
        isoWeek1Start.setUTCDate(simple.getUTCDate() - dayOfWeek + 1);
        const date = new Date(isoWeek1Start);
        date.setUTCDate(date.getUTCDate() + (week - 1) * 7);
        return date.toISOString().slice(0, 10);
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;

    return null;
};
