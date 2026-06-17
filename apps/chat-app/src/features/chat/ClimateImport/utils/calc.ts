import { getMiddleTime } from './time';

// https://bmcnoldy.earth.miami.edu/Humidity.html
export const getRelativeHumidity = (temperature: number, dewpoint: number): number =>
    (100 * Math.exp((17.625 * dewpoint) / (243.04 + dewpoint)))
    / Math.exp((17.625 * temperature) / (243.04 + temperature));

export const roundOneDecimal = (v: number): number => Math.round(v * 10) / 10;

export const roundTwoDecimals = (v: number): number => Math.round(v * 100) / 100;

export const kelvinToCelsius = (k: number): number => k - 273.15;

export const toCelcius = (k: number): number => roundOneDecimal(kelvinToCelsius(k));

export const getTimeFromId = (id: string): number => new Date(id).getTime();

export const metersToMillimeters = (m: number): number => roundOneDecimal(m * 1000);

interface PeriodWithDates {
    startDate?: string;
    endDate?: string;
    startTime?: number;
    endTime?: number;
    middleTime?: number;
    [key: string]: unknown;
}

// periods must be sorted by time
export const interpolate = (periods: PeriodWithDates[], targetTime: number, band = 'value'): number | null => {
    let lower: PeriodWithDates | null = null;
    let upper: PeriodWithDates | null = null;

    for (let i = 0; i < periods.length; i++) {
        const period = periods[i];
        const middleTime = period.middleTime ?? getMiddleTime(period as { startTime: number; endTime: number });

        if (middleTime <= targetTime) {
            lower = period;
        }
        if (middleTime >= targetTime && !upper) {
            upper = period;
            break;
        }
    }

    if (!lower || !upper) {
        return null;
    }

    const t1 = lower.middleTime ?? getMiddleTime(lower as { startTime: number; endTime: number });
    const t2 = upper.middleTime ?? getMiddleTime(upper as { startTime: number; endTime: number });
    const y1 = lower[band] as number;
    const y2 = upper[band] as number;

    return y1 + ((targetTime - t1) / (t2 - t1)) * (y2 - y1);
};
