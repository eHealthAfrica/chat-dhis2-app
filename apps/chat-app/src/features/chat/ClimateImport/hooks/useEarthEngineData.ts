import { useState, useEffect } from 'react';
import type { ClimateDataset } from '../data/climateDatasets';
import { getEarthEngineData } from '../utils/eeUtils';
import type { GeoJsonFeature } from '../utils/toGeoJson';
import type { ImportPeriod } from '../utils/time';
import useEarthEngine from './useEarthEngine';

interface EarthEngineProgress {
    current: number;
    total: number;
}

const useEarthEngineData = ({
    dataset,
    period,
    features,
}: {
    dataset: ClimateDataset | undefined;
    period: ImportPeriod | undefined;
    features: GeoJsonFeature[];
}) => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<Array<Record<string, unknown>> | undefined>();
    const [error, setError] = useState<unknown>();
    const [progress, setProgress] = useState<EarthEngineProgress>({ current: 0, total: 0 });
    const eePromise = useEarthEngine();

    useEffect(() => {
        if (dataset && features?.length) {
            setLoading(true);
            setData(undefined);
            eePromise.then(ee =>
                getEarthEngineData({
                    ee,
                    dataset,
                    period: period!,
                    features,
                    onProgress: (current, total) => setProgress({ current, total }),
                })
                    .then((result) => {
                        setData(result);
                        setLoading(false);
                    })
                    .catch((err) => {
                        setError(err);
                        setLoading(false);
                    }),
            );
        }
    }, [eePromise, dataset, period, features]);

    return { data, error, loading, progress };
};

export default useEarthEngineData;
