import i18n from '@dhis2/d2-i18n';
import area from '@turf/area';
import { interpolate, roundOneDecimal } from './calc';
import {
    HOURLY,
    DAILY,
    SIXTEEN_DAYS,
    getMappedPeriods,
    getPeriods,
    getMiddleTime,
    addPeriodTimestamp,
    type ImportPeriod,
    type Period,
} from './time';
import type { GeoJsonFeature } from './toGeoJson';

const VALUE_LIMIT = 5000;
const DEFAULT_SCALE = 1000;
const FEATURE_PAYLOAD_MB_LIMIT = 2;

type EE = any;

export interface ClimateDataset {
    id: string;
    datasetId: string;
    band: string | string[];
    reducer?: string | string[];
    sharedInputs?: boolean;
    periodReducer?: string;
    periodType?: string;
    histogramKey?: string | number;
    valueParser?: (v: number) => number | string;
    bandsParser?: (data: Array<Array<Record<string, unknown>>>) => Array<Record<string, unknown>>;
    bands?: Array<Partial<ClimateDataset>>;
    timeZone?: Record<string, unknown>;
    dataElementCode?: string;
    supportedPeriodTypes?: string[];
    [key: string]: unknown;
}

export const chunkFeaturesBySize = (
    features: GeoJsonFeature[],
    limitMb = FEATURE_PAYLOAD_MB_LIMIT,
): GeoJsonFeature[][] => {
    const limitBytes = limitMb * 1024 * 1024;
    const chunks: GeoJsonFeature[][] = [];
    let currentChunk: GeoJsonFeature[] = [];
    let currentSize = 0;

    for (const feature of features) {
        const featureSize = JSON.stringify(feature).length;
        if (currentChunk.length > 0 && currentSize + featureSize > limitBytes) {
            chunks.push(currentChunk);
            currentChunk = [feature];
            currentSize = featureSize;
        } else {
            currentChunk.push(feature);
            currentSize += featureSize;
        }
    }

    if (currentChunk.length > 0) {
        chunks.push(currentChunk);
    }

    return chunks;
};

export const getScale = (image: EE) =>
    image.select(0).projection().nominalScale().min(DEFAULT_SCALE);

export const getInfo = <T>(instance: EE): Promise<T> =>
    new Promise((resolve, reject) =>
        instance.evaluate((data: T, error: unknown) => {
            if (error) {
                reject(error);
            } else {
                resolve(data);
            }
        }),
    );

const getFeatureProperties = (feature: { id: string; properties: Record<string, unknown> }) => ({
    id: feature.id,
    ...feature.properties,
});

export const getFeatureCollectionPropertiesArray = (data: { features: Array<{ id: string; properties: Record<string, unknown> }> }) =>
    data.features.map(getFeatureProperties);

export const cleanData = (data: Array<{ id: string; properties: { value: unknown } }>) =>
    data.map(f => ({
        id: f.id.substring(9),
        date: f.id.slice(0, 8),
        value: f.properties.value,
    }));

export const getMonthlyNormals = (bands: string[]) => (data: { features: Array<{ properties: Record<string, unknown> }> }) => {
    const normals = [];

    for (let month = 1; month <= 12; month++) {
        const monthData = data.features.filter(
            f => Number(f.properties.month) === month,
        );

        const monthNormals: Record<string, unknown> = { id: month };

        bands.forEach((band) => {
            monthNormals[band] =
                monthData.reduce((v, f) => v + (f.properties[band] as number), 0)
                / monthData.length;
        });

        normals.push(monthNormals);
    }

    return normals;
};

const getReducedCollection = ({
    ee,
    collection,
    startDate,
    endDate,
    reducer,
}: {
    ee: EE;
    collection: EE;
    startDate: EE;
    endDate: EE;
    reducer: string;
}) =>
    collection
        .filter(ee.Filter.date(startDate, endDate))[reducer]()
        .set('system:index', startDate.format('YYYYMMdd'))
        .set('system:time_start', startDate.millis())
        .set('system:time_end', endDate.millis());

export const getEarthEngineImageValues = ({
    ee,
    dataset,
    features,
}: {
    ee: EE;
    dataset: ClimateDataset & { period?: string };
    features: GeoJsonFeature[];
}) => {
    const { datasetId, band, reducer = 'mean', period, valueParser } = dataset as ClimateDataset & { period?: string };

    const eeImage = ee.Image(datasetId).select(band);
    const eeReducer = ee.Reducer[reducer as string]();
    const featureCollection = ee.FeatureCollection(features);
    const eeScale = getScale(eeImage);

    const data = eeImage
        .reduceRegions({
            collection: featureCollection,
            reducer: eeReducer,
            scale: eeScale,
        })
        .map((feature: EE) =>
            ee.Feature(null, {
                ou: feature.get('id'),
                period,
                value: feature.get(reducer),
            }),
        );

    return getInfo<{ features: Array<{ id: string; properties: Record<string, unknown> }> }>(data).then(({ features }) =>
        features.map((feature) => {
            const props = getFeatureProperties(feature) as Record<string, unknown>;

            if (valueParser) {
                props.value = valueParser(props.value as number);
            }

            return props;
        }),
    );
};

const getHistogramPercentage = (histogram: Record<string, number>, key: string): number => {
    const total = Object.values(histogram).reduce((acc, cur) => acc + cur, 0);
    const value = histogram[key] || 0;
    return roundOneDecimal((value / total) * 100);
};

const getEarthEngineValues = ({
    ee,
    dataset: datasetParams,
    period,
    features,
}: {
    ee: EE;
    dataset: ClimateDataset;
    period: ImportPeriod & { timeZone?: string };
    features: GeoJsonFeature[];
}) =>
    // eslint-disable-next-line no-async-promise-executor
    new Promise<Array<Record<string, unknown>>>(async (resolve, reject) => {
        try {
            const dataset = period.timeZone
                ? { ...datasetParams, ...(datasetParams.timeZone as object) }
                : datasetParams;

            const {
                band,
                reducer = 'mean',
                periodType: datasetPeriodType,
                periodReducer = reducer,
                histogramKey,
                valueParser,
            } = dataset as ClimateDataset & { datasetId: string };

            const { timeZone = 'UTC', periodType } = period;

            const periods = (getPeriods(period) as Period[]).map(addPeriodTimestamp);

            const startTime = periods[0]?.startDate;

            const endTimePlusOne = ee
                .Date(String(periods[periods.length - 1]?.endDate))
                .advance(1, 'day');

            const timeZoneStart = ee
                .Date(String(startTime))
                .advance(datasetPeriodType === SIXTEEN_DAYS ? -32 : 0, 'day')
                .format(null, timeZone);
            const timeZoneEnd = endTimePlusOne.format(null, timeZone);
            const mappedPeriods = getMappedPeriods(periods);

            const dataParser = (featureList: Array<{ id: string; properties: Record<string, unknown> }>) => {
                let data = featureList.map(getFeatureProperties) as Array<Record<string, unknown>>;

                if (datasetPeriodType === SIXTEEN_DAYS) {
                    const orgUnits = [...new Set(data.map(d => d.ou as string))];

                    data = orgUnits
                        .map((ou) => {
                            const ouData = data.filter(d => d.ou === ou);
                            return periods.map((p) => {
                                const value = interpolate(
                                    ouData as Parameters<typeof interpolate>[0],
                                    getMiddleTime(p as { startTime: number; endTime: number }),
                                );
                                const period = p.startDate;
                                return { ou, period, value };
                            });
                        })
                        .flat();
                }

                if (histogramKey !== undefined) {
                    return data.map(d => ({
                        ...d,
                        period: mappedPeriods.get(d.period as string),
                        value: getHistogramPercentage(d.histogram as Record<string, number>, String(histogramKey)),
                    }));
                }

                return data.map(d => ({
                    ...d,
                    period: mappedPeriods.get(d.period as string),
                    value: valueParser ? valueParser(d.value as number) : d.value,
                }));
            };

            let collection = ee
                .ImageCollection(dataset.datasetId)
                .select(band)
                .filter(ee.Filter.date(timeZoneStart, timeZoneEnd));

            const imageCount = await getInfo<number>(collection.size());

            if (imageCount === 0) {
                reject(new Error(i18n.t('No data found for the selected period')));
            }

            let eeScale = getScale(collection.first());

            if (reducer === 'min' || reducer === 'max') {
                const scale = await getInfo<number>(eeScale);
                const minArea = Math.min(
                    ...features
                        .filter(f => f.geometry.type.includes('Polygon'))
                        .map(f => area(f as Parameters<typeof area>[0])),
                );

                if (minArea < scale * scale) {
                    eeScale = Math.sqrt(minArea) / 2;
                }
            }

            const featureCollection = ee.FeatureCollection(features);
            const eeReducer = ee.Reducer[reducer as string]();

            if (periodType !== datasetPeriodType) {
                const imagesWithData = ee.Filter.listContains('system:band_names', band);

                if (datasetPeriodType === HOURLY) {
                    const days = ee
                        .Date(timeZoneEnd)
                        .difference(ee.Date(timeZoneStart), 'days');

                    const daysList = ee.List.sequence(0, days.subtract(1));

                    collection = ee.ImageCollection.fromImages(
                        daysList.map((day: EE) => {
                            const startUTC = ee.Date(startTime).advance(day, 'days');
                            const startDate = ee.Date(startUTC.format(null, timeZone));
                            const endDate = startDate.advance(1, 'days');

                            return getReducedCollection({
                                ee,
                                collection,
                                startDate,
                                endDate,
                                reducer: periodReducer as string,
                            });
                        }),
                    ).filter(imagesWithData);
                }

                if (datasetPeriodType === DAILY && periodType !== DAILY) {
                    const periodList = ee.List(periods);

                    collection = ee.ImageCollection.fromImages(
                        periodList.map((item: EE) => {
                            const p = ee.Dictionary(item);
                            const startDate = ee.Date(p.get('startDate'));
                            const endDate = ee.Date(p.get('endDate')).advance(1, 'day');

                            return getReducedCollection({
                                ee,
                                collection,
                                startDate,
                                endDate,
                                reducer: periodReducer as string,
                            });
                        }),
                    ).filter(imagesWithData);
                }
            }

            const reduced = collection
                .map((image: EE) =>
                    image
                        .reduceRegions({
                            collection: featureCollection,
                            reducer: eeReducer,
                            scale: eeScale,
                        })
                        .map((feature: EE) =>
                            ee.Feature(null, {
                                ou: feature.get('id'),
                                period: image.date().format('YYYY-MM-dd'),
                                startTime: image.get('system:time_start'),
                                endTime: image.get('system:time_end'),
                                value: feature.get(reducer),
                                histogram: feature.get('histogram'),
                            }),
                        ),
                )
                .flatten();

            const valueCollection = ee.FeatureCollection(reduced);
            const valueCount = await getInfo<number>(valueCollection.size());

            if (valueCount <= VALUE_LIMIT) {
                return getInfo<Array<{ id: string; properties: Record<string, unknown> }>>(valueCollection.toList(VALUE_LIMIT))
                    .then(dataParser)
                    .then(resolve);
            } else {
                const chunks = Math.ceil(valueCount / VALUE_LIMIT);

                return Promise.all(
                    Array.from({ length: chunks }, (_, chunk) =>
                        getInfo<Array<{ id: string; properties: Record<string, unknown> }>>(
                            valueCollection.toList(VALUE_LIMIT, chunk * VALUE_LIMIT),
                        ),
                    ),
                )
                    .then(data => ([] as Array<{ id: string; properties: Record<string, unknown> }>).concat(...data))
                    .then(dataParser)
                    .then(resolve);
            }
        } catch (error) {
            reject(error);
        }
    });

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

export const retryOn502 = async <T>(
    fn: () => Promise<T>,
    maxRetries = MAX_RETRIES,
    delayMs = RETRY_DELAY_MS,
): Promise<T> => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            if (attempt < maxRetries && /502|bad gateway/i.test(String(error))) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            } else {
                throw error;
            }
        }
    }
    throw new Error('Max retries exceeded');
};

export const getEarthEngineData = async ({
    ee,
    dataset,
    period,
    features,
    onProgress,
}: {
    ee: EE;
    dataset: ClimateDataset;
    period: ImportPeriod & { timeZone?: string };
    features: GeoJsonFeature[];
    onProgress?: (current: number, total: number) => void;
}): Promise<Array<Record<string, unknown>>> => {
    const chunks = chunkFeaturesBySize(features);

    const runForChunk = (chunkFeatures: GeoJsonFeature[]): Promise<Array<Record<string, unknown>>> => {
        if (!period) {
            return getEarthEngineImageValues({ ee, dataset, features: chunkFeatures }) as Promise<Array<Record<string, unknown>>>;
        } else if (dataset.bands) {
            const { bandsParser = (v: unknown) => v } = dataset;
            return Promise.all(
                dataset.bands.map(band =>
                    getEarthEngineValues({
                        ee,
                        dataset: { ...dataset, ...band } as ClimateDataset,
                        period,
                        features: chunkFeatures,
                    }),
                ),
            ).then(bandsParser as (data: Array<Array<Record<string, unknown>>>) => Array<Record<string, unknown>>);
        } else {
            return getEarthEngineValues({ ee, dataset, period, features: chunkFeatures });
        }
    };

    const runForChunkWithRetry = async (chunkFeatures: GeoJsonFeature[]): Promise<Array<Record<string, unknown>>> => {
        try {
            return await retryOn502(() => runForChunk(chunkFeatures));
        } catch (error) {
            if (chunkFeatures.length > 1 && /payload size exceeds the limit/i.test(String(error))) {
                const mid = Math.floor(chunkFeatures.length / 2);
                const [left, right] = await Promise.all([
                    runForChunkWithRetry(chunkFeatures.slice(0, mid)),
                    runForChunkWithRetry(chunkFeatures.slice(mid)),
                ]);
                return [...left, ...right];
            }
            throw error;
        }
    };

    const results: Array<Array<Record<string, unknown>>> = [];
    for (let i = 0; i < chunks.length; i++) {
        onProgress?.(i + 1, chunks.length);
        results.push(await runForChunkWithRetry(chunks[i]));
    }
    return results.flat();
};

export const getHistogramStatistics = (histogram: Record<string, number>, scale: number) => {
    const data: Record<string, { count: number; area: number }> = {};

    Object.keys(histogram).forEach((key) => {
        data[key] = {
            count: histogram[key],
            area: (histogram[key] * scale * scale) / 1e6,
        };
    });

    return data;
};

export const getCacheKey = ({
    dataset,
    period,
    feature,
    filter,
}: {
    dataset: ClimateDataset;
    period?: { startTime: string; endTime: string };
    feature: { id: string };
    filter?: Array<{ type: string; arguments: string[] }>;
}): string => {
    const { datasetId, band } = dataset;
    const { id } = feature;
    const bandkey = Array.isArray(band) ? band.join('-') : band;
    const periodKey = period ? `-${period.startTime}-${period.endTime}` : '';
    const filterKey = filter
        ? `-${filter.map(f => `${f.type}-${f.arguments.join('-')}`).join('-')}`
        : '';

    return `${id}-${datasetId}-${bandkey}${periodKey}${filterKey}`;
};
