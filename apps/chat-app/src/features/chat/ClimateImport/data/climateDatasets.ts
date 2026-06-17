import i18n from '@dhis2/d2-i18n';
import {
    kelvinToCelsius,
    getRelativeHumidity,
    roundOneDecimal,
    roundTwoDecimals,
} from '../utils/calc';
import {
    HOURLY,
    DAILY,
    WEEKLY,
    MONTHLY,
    SIXTEEN_DAYS,
    YEARLY,
    type PeriodType,
} from '../utils/time';
import {
    climateDataSet,
    climateGroup,
    environmentDataSet,
    environmentGroup,
    landDataSet,
    landGroup,
} from './groupings';

export interface DataGroup {
    name: string;
    shortName: string;
}

export interface DataSet {
    name: string;
    shortName: string;
    dhis2Code: string;
}

export interface ClimateDataset {
    id: string;
    datasetId: string;
    name: string;
    shortName: string;
    description: string;
    source: string;
    resolution: string;
    periodType: PeriodType;
    supportedPeriodTypes: PeriodType[];
    band: string | string[];
    reducer?: string | string[];
    periodReducer?: string;
    valueParser?: (v: number) => number | string;
    bandsParser?: (data: Array<Array<Record<string, unknown>>>) => Array<Record<string, unknown>>;
    bands?: Array<Partial<ClimateDataset> & { band: string; reducer?: string; timeZone?: Partial<ClimateDataset> }>;
    timeZone?: Partial<ClimateDataset>;
    aggregationType: string;
    dataElementCode: string;
    dataElementGroup: DataGroup;
    dataSet: DataSet;
    period?: string;
    periodRange?: { start: string; end: string };
    histogramKey?: string | number;
    sharedInputs?: boolean;
    [key: string]: unknown;
}

export const ERA5_RESOLUTION = '31 km (0.25°)';
export const ERA5_LAND_RESOLUTION = '9 km (0.1°)';
export const CHIRPS_RESOLUTION = '5 km (0.05°)';
export const MODIS_RESOLUTION = '250 m';
export const LANDCOVER_RESOLUTION = '500 m';
export const DEM_RESOLUTION = '30 m';

const era5Source = 'ERA5-Land / Copernicus Climate Change Service';
const era5HeatSource = 'ERA5-Heat / Copernicus Climate Change Service';
const chirpsSource = 'Climate Hazards Center / UCSB';
const modisSource = 'NASA LP DAAC at the USGS EROS Center';
const demSource = 'NASA / USGS / JPL-Caltech';

const temperatureParser = (v: number): string => roundOneDecimal(kelvinToCelsius(v)).toString();

const relativeHumidityParser = (
    [dewData, tempData]: [Array<Record<string, unknown>>, Array<Record<string, unknown>>],
): Array<Record<string, unknown>> =>
    tempData.map((temp, i) => ({
        ...temp,
        value: roundOneDecimal(
            getRelativeHumidity(
                kelvinToCelsius(dewData[i].value as number),
                kelvinToCelsius(temp.value as number),
            ),
        ).toString(),
    }));

// meter to mm without scientific notation
const precipitationParser = (v: number): string =>
    (v * 1000).toLocaleString('fullwide', { useGrouping: false });

const vegetationIndexParser = (v: number): string => roundTwoDecimals(v * 0.0001).toString();

const twoDecimals = (v: number): string => roundTwoDecimals(v).toString();

// Landcover type codes matching MODIS MCD12Q1 LC_Type1 classification
const landcoverTypes = [
    { name: 'Evergreen Needleleaf Forests', value: 1 },
    { name: 'Evergreen Broadleaf Forests', value: 2 },
    { name: 'Deciduous Needleleaf Forests', value: 3 },
    { name: 'Deciduous Broadleaf Forests', value: 4 },
    { name: 'Mixed Forests', value: 5 },
    { name: 'Closed Shrublands', value: 6 },
    { name: 'Open Shrublands', value: 7 },
    { name: 'Woody Savannas', value: 8 },
    { name: 'Savannas', value: 9 },
    { name: 'Grasslands', value: 10 },
    { name: 'Permanent Wetlands', value: 11 },
    { name: 'Croplands', value: 12 },
    { name: 'Urban and Built-up Lands', value: 13 },
    { name: 'Cropland/Natural Vegetation Mosaics', value: 14 },
    { name: 'Permanent Snow and Ice', value: 15 },
    { name: 'Barren', value: 16 },
    { name: 'Water Bodies', value: 17 },
];

const getEEDatasets = (): ClimateDataset[] => [
    {
        id: 'ECMWF/ERA5_LAND/DAILY_AGGR/temperature_2m',
        datasetId: 'ECMWF/ERA5_LAND/DAILY_AGGR',
        name: i18n.t('Air temperature (ERA5-Land)'),
        shortName: i18n.t('Air temperature'),
        description: i18n.t('Average air temperature in °C at 2 m above the surface.'),
        source: era5Source,
        resolution: ERA5_LAND_RESOLUTION,
        periodType: DAILY,
        supportedPeriodTypes: [DAILY, WEEKLY, MONTHLY],
        band: 'temperature_2m',
        reducer: 'mean',
        timeZone: {
            datasetId: 'ECMWF/ERA5_LAND/HOURLY',
            band: 'temperature_2m',
            periodType: HOURLY,
            periodReducer: 'mean',
        },
        valueParser: temperatureParser,
        aggregationType: i18n.t('Average'),
        dataElementCode: 'ERA5_LAND_TEMPERATURE',
        dataElementGroup: climateGroup,
        dataSet: climateDataSet,
    },
    {
        id: 'ECMWF/ERA5_LAND/DAILY_AGGR/temperature_2m_max',
        datasetId: 'ECMWF/ERA5_LAND/DAILY_AGGR',
        name: i18n.t('Max air temperature (ERA5-Land)'),
        shortName: i18n.t('Max air temperature'),
        description: i18n.t('Maximum air temperature in °C at 2 m above the surface.'),
        source: era5Source,
        resolution: ERA5_LAND_RESOLUTION,
        periodType: DAILY,
        supportedPeriodTypes: [DAILY, WEEKLY, MONTHLY],
        band: 'temperature_2m_max',
        reducer: 'max',
        timeZone: {
            datasetId: 'ECMWF/ERA5_LAND/HOURLY',
            band: 'temperature_2m',
            periodType: HOURLY,
            periodReducer: 'max',
        },
        valueParser: temperatureParser,
        aggregationType: i18n.t('Max'),
        dataElementCode: 'ERA5_LAND_TEMPERATURE_MAX',
        dataElementGroup: climateGroup,
        dataSet: climateDataSet,
    },
    {
        id: 'ECMWF/ERA5_LAND/DAILY_AGGR/temperature_2m_min',
        datasetId: 'ECMWF/ERA5_LAND/DAILY_AGGR',
        name: i18n.t('Min temperature (ERA5-Land)'),
        shortName: i18n.t('Min air temperature'),
        description: i18n.t('Minimum air temperature in °C at 2 m above the surface.'),
        source: era5Source,
        resolution: ERA5_LAND_RESOLUTION,
        periodType: DAILY,
        supportedPeriodTypes: [DAILY, WEEKLY, MONTHLY],
        band: 'temperature_2m_min',
        reducer: 'min',
        timeZone: {
            datasetId: 'ECMWF/ERA5_LAND/HOURLY',
            band: 'temperature_2m',
            periodType: HOURLY,
            periodReducer: 'min',
        },
        valueParser: temperatureParser,
        aggregationType: i18n.t('Min'),
        dataElementCode: 'ERA5_LAND_TEMPERATURE_MIN',
        dataElementGroup: climateGroup,
        dataSet: climateDataSet,
    },
    {
        id: 'ECMWF/ERA5_LAND/DAILY_AGGR/total_precipitation_sum',
        datasetId: 'ECMWF/ERA5_LAND/DAILY_AGGR',
        name: i18n.t('Precipitation (ERA5-Land)'),
        shortName: i18n.t('Precipitation (ERA5)'),
        description: i18n.t('Total precipitation in mm.'),
        source: era5Source,
        resolution: ERA5_LAND_RESOLUTION,
        periodType: DAILY,
        supportedPeriodTypes: [DAILY, WEEKLY, MONTHLY],
        band: 'total_precipitation_sum',
        reducer: 'mean',
        periodReducer: 'sum',
        timeZone: {
            datasetId: 'ECMWF/ERA5_LAND/HOURLY',
            band: 'total_precipitation',
            periodType: HOURLY,
            periodReducer: 'sum',
        },
        valueParser: precipitationParser,
        aggregationType: i18n.t('Sum'),
        dataElementCode: 'ERA5_LAND_PRECIPITATION',
        dataElementGroup: climateGroup,
        dataSet: climateDataSet,
    },
    {
        id: 'UCSB-CHG/CHIRPS/DAILY',
        datasetId: 'UCSB-CHG/CHIRPS/DAILY',
        name: i18n.t('Precipitation (CHIRPS)'),
        shortName: i18n.t('Precipitation (CHIRPS)'),
        description: i18n.t('Precipitation in mm.'),
        source: chirpsSource,
        resolution: CHIRPS_RESOLUTION,
        periodType: DAILY,
        supportedPeriodTypes: [DAILY, WEEKLY, MONTHLY],
        band: 'precipitation',
        reducer: 'mean',
        periodReducer: 'sum',
        valueParser: twoDecimals,
        aggregationType: i18n.t('Sum'),
        dataElementCode: 'CHIRPS_PRECIPITATION',
        dataElementGroup: climateGroup,
        dataSet: climateDataSet,
    },
    {
        id: 'ECMWF/ERA5_LAND/DAILY_AGGR/dewpoint_temperature_2m',
        datasetId: 'ECMWF/ERA5_LAND/DAILY_AGGR',
        name: i18n.t('Dewpoint temperature (ERA5-Land)'),
        shortName: i18n.t('Dewpoint temperature'),
        description: i18n.t(
            'Temperature in °C at 2 m above the surface to which the air would have to be cooled for saturation to occur.',
        ),
        source: era5Source,
        resolution: ERA5_LAND_RESOLUTION,
        periodType: DAILY,
        supportedPeriodTypes: [DAILY, WEEKLY, MONTHLY],
        band: 'dewpoint_temperature_2m',
        reducer: 'mean',
        timeZone: {
            datasetId: 'ECMWF/ERA5_LAND/HOURLY',
            band: 'dewpoint_temperature_2m',
            periodType: HOURLY,
            periodReducer: 'mean',
        },
        valueParser: temperatureParser,
        aggregationType: i18n.t('Average'),
        dataElementCode: 'ERA5_LAND_DEWPOINT_TEMPERATURE',
        dataElementGroup: climateGroup,
        dataSet: climateDataSet,
    },
    {
        id: 'ECMWF/ERA5_LAND/DAILY_AGGR/relative_humidity_2m',
        datasetId: 'ECMWF/ERA5_LAND/DAILY_AGGR',
        name: i18n.t('Relative humidity (ERA5-Land)'),
        shortName: i18n.t('Relative humidity'),
        description: i18n.t(
            'Percentage of water vapor in the air compared to the total amount of vapor that can exist in the air at its current temperature. Calculated using air temperature and dewpoint temperature at 2 m above surface.',
        ),
        source: era5Source,
        resolution: ERA5_LAND_RESOLUTION,
        periodType: DAILY,
        supportedPeriodTypes: [DAILY, WEEKLY, MONTHLY],
        band: 'temperature_2m',
        bands: [
            {
                band: 'dewpoint_temperature_2m',
                reducer: 'mean',
                timeZone: {
                    datasetId: 'ECMWF/ERA5_LAND/HOURLY',
                    band: 'dewpoint_temperature_2m',
                    periodType: HOURLY,
                    periodReducer: 'mean',
                },
            },
            {
                band: 'temperature_2m',
                reducer: 'mean',
                timeZone: {
                    datasetId: 'ECMWF/ERA5_LAND/HOURLY',
                    band: 'temperature_2m',
                    periodType: HOURLY,
                    periodReducer: 'mean',
                },
            },
        ],
        bandsParser: relativeHumidityParser as ClimateDataset['bandsParser'],
        aggregationType: i18n.t('Average'),
        dataElementCode: 'ERA5_LAND_RELATIVE_HUMIDITY',
        dataElementGroup: climateGroup,
        dataSet: climateDataSet,
    },
    {
        id: 'projects/climate-engine-pro/assets/ce-era5-heat/utci_mean',
        datasetId: 'projects/climate-engine-pro/assets/ce-era5-heat',
        name: i18n.t('Heat stress (ERA5-HEAT)'),
        shortName: i18n.t('Heat stress'),
        description: i18n.t('Average felt temperature in °C.'),
        source: era5HeatSource,
        resolution: ERA5_RESOLUTION,
        periodType: DAILY,
        supportedPeriodTypes: [DAILY, WEEKLY, MONTHLY],
        band: 'utci_mean',
        reducer: 'mean',
        valueParser: temperatureParser,
        aggregationType: i18n.t('Average'),
        dataElementCode: 'ERA5_HEAT_UTCI',
        dataElementGroup: climateGroup,
        dataSet: climateDataSet,
    },
    {
        id: 'projects/climate-engine-pro/assets/ce-era5-heat/utci_max',
        datasetId: 'projects/climate-engine-pro/assets/ce-era5-heat',
        name: i18n.t('Max heat stress (ERA5-HEAT)'),
        shortName: i18n.t('Max heat stress'),
        description: i18n.t('Maximum felt temperature in °C.'),
        source: era5HeatSource,
        resolution: ERA5_RESOLUTION,
        periodType: DAILY,
        supportedPeriodTypes: [DAILY, WEEKLY, MONTHLY],
        band: 'utci_max',
        reducer: 'max',
        valueParser: temperatureParser,
        aggregationType: i18n.t('Max'),
        dataElementCode: 'ERA5_HEAT_UTCI_MAX',
        dataElementGroup: climateGroup,
        dataSet: climateDataSet,
    },
    {
        id: 'projects/climate-engine-pro/assets/ce-era5-heat/utci_min',
        datasetId: 'projects/climate-engine-pro/assets/ce-era5-heat',
        name: i18n.t('Min heat stress (ERA5-HEAT)'),
        shortName: i18n.t('Min heat stress'),
        description: i18n.t('Minimum felt temperature in °C.'),
        source: era5HeatSource,
        resolution: ERA5_RESOLUTION,
        periodType: DAILY,
        supportedPeriodTypes: [DAILY, WEEKLY, MONTHLY],
        band: 'utci_min',
        reducer: 'min',
        valueParser: temperatureParser,
        aggregationType: i18n.t('Min'),
        dataElementCode: 'ERA5_HEAT_UTCI_MIN',
        dataElementGroup: climateGroup,
        dataSet: climateDataSet,
    },
    {
        id: 'MODIS/061/MOD13Q1/NDVI',
        datasetId: 'MODIS/061/MOD13Q1',
        name: i18n.t('NDVI - Normalized difference vegetation index (MODIS)'),
        shortName: i18n.t('NDVI'),
        description: i18n.t(
            'Landsat Normalized Difference Vegetation Index (NDVI) is used to quantify vegetation greenness and is useful in understanding vegetation density and assessing changes in plant health. NDVI values range from -1 to 1, with higher values indicating denser vegetation.',
        ),
        source: modisSource,
        resolution: MODIS_RESOLUTION,
        periodType: SIXTEEN_DAYS,
        supportedPeriodTypes: [WEEKLY, MONTHLY],
        band: 'NDVI',
        reducer: 'mean',
        valueParser: vegetationIndexParser,
        aggregationType: i18n.t('Average'),
        dataElementCode: 'MODIS_NDVI',
        dataElementGroup: environmentGroup,
        dataSet: environmentDataSet,
    },
    {
        id: 'MODIS/061/MOD13Q1/EVI',
        datasetId: 'MODIS/061/MOD13Q1',
        name: i18n.t('EVI - Enhanced vegetation index (MODIS)'),
        shortName: i18n.t('EVI'),
        description: i18n.t(
            'Enhanced vegetation index (EVI) differs from NDVI by reducing the influence of atmospheric conditions and canopy background noise. EVI values range from -1 to 1, with higher values indicating denser vegetation.',
        ),
        source: modisSource,
        resolution: MODIS_RESOLUTION,
        periodType: SIXTEEN_DAYS,
        supportedPeriodTypes: [WEEKLY, MONTHLY],
        band: 'EVI',
        reducer: 'mean',
        valueParser: vegetationIndexParser,
        aggregationType: i18n.t('Average'),
        dataElementCode: 'MODIS_EVI',
        dataElementGroup: environmentGroup,
        dataSet: environmentDataSet,
    },
    {
        id: 'USGS/SRTMGL1_003/mean',
        datasetId: 'USGS/SRTMGL1_003',
        name: i18n.t('Mean elevation (SRTM)'),
        shortName: i18n.t('Mean elevation'),
        description: i18n.t('Mean elevation in meters above sea level.'),
        source: demSource,
        resolution: DEM_RESOLUTION,
        periodType: YEARLY,
        supportedPeriodTypes: [YEARLY],
        period: '2000',
        band: 'elevation',
        reducer: 'mean',
        valueParser: Math.round,
        aggregationType: i18n.t('First value'),
        dataElementCode: 'SRTM_ELEVATION_MEAN',
        dataElementGroup: landGroup,
        dataSet: landDataSet,
    },
    {
        id: 'USGS/SRTMGL1_003/min',
        datasetId: 'USGS/SRTMGL1_003',
        name: i18n.t('Min elevation (SRTM)'),
        shortName: i18n.t('Min elevation'),
        description: i18n.t('Min elevation in meters above sea level.'),
        source: demSource,
        resolution: DEM_RESOLUTION,
        periodType: YEARLY,
        supportedPeriodTypes: [YEARLY],
        period: '2000',
        band: 'elevation',
        reducer: 'min',
        valueParser: Math.round,
        aggregationType: i18n.t('First value'),
        dataElementCode: 'SRTM_ELEVATION_MIN',
        dataElementGroup: landGroup,
        dataSet: landDataSet,
    },
    {
        id: 'USGS/SRTMGL1_003/max',
        datasetId: 'USGS/SRTMGL1_003',
        name: i18n.t('Max elevation (SRTM)'),
        shortName: i18n.t('Max elevation'),
        description: i18n.t('Max elevation in meters above sea level.'),
        source: demSource,
        resolution: DEM_RESOLUTION,
        periodType: YEARLY,
        supportedPeriodTypes: [YEARLY],
        period: '2000',
        band: 'elevation',
        reducer: 'max',
        valueParser: Math.round,
        aggregationType: i18n.t('First value'),
        dataElementCode: 'SRTM_ELEVATION_MAX',
        dataElementGroup: landGroup,
        dataSet: landDataSet,
    },
    {
        id: 'USGS/SRTMGL1_003/stddev',
        datasetId: 'USGS/SRTMGL1_003',
        name: i18n.t('Standard deviation of elevation (SRTM)'),
        shortName: i18n.t('Std dev elevation'),
        description: i18n.t('Standard deviation of elevation in meters above sea level.'),
        source: demSource,
        resolution: DEM_RESOLUTION,
        periodType: YEARLY,
        supportedPeriodTypes: [YEARLY],
        period: '2000',
        band: 'elevation',
        reducer: 'stdDev',
        valueParser: Math.round,
        aggregationType: i18n.t('First value'),
        dataElementCode: 'SRTM_ELEVATION_STDDEV',
        dataElementGroup: landGroup,
        dataSet: landDataSet,
    },
    ...landcoverTypes.map(({ name, value }) => ({
        id: `MODIS/061/MCD12Q1/LC_Type1/${value}`,
        datasetId: 'MODIS/061/MCD12Q1',
        name: `${name} (MODIS)`,
        shortName: name,
        description: i18n.t('Percentage of area with this land cover type.'),
        source: modisSource,
        resolution: LANDCOVER_RESOLUTION,
        periodType: YEARLY as PeriodType,
        supportedPeriodTypes: [YEARLY] as PeriodType[],
        periodRange: { start: '2002', end: '2023' },
        band: 'LC_Type1',
        reducer: 'frequencyHistogram',
        histogramKey: value,
        valueParser: twoDecimals,
        aggregationType: i18n.t('Average'),
        dataElementCode: `MODIS_LANDCOVER_${value}`,
        dataElementGroup: landGroup,
        dataSet: landDataSet,
    })),
];

export default getEEDatasets;
