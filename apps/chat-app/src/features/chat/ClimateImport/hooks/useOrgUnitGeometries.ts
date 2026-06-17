import { useDataQuery } from '@dhis2/app-runtime';
import { useState, useEffect, useMemo, useRef } from 'react';
import { toGeoJson, type GeoJsonFeature } from '../utils/toGeoJson';
import useSystemInfo from './useSystemInfo';

const GEOFEATURES_QUERY: any = {
    geoFeatures: {
        resource: 'geoFeatures',
        params: ({ orgUnitIds, keyAnalysisDisplayProperty, userId }: {
            orgUnitIds: string[];
            keyAnalysisDisplayProperty: string;
            userId: string;
        }) => ({
            ou: `ou:${orgUnitIds.join(';')}`,
            displayProperty: keyAnalysisDisplayProperty,
            _: userId,
        }),
    },
};

const DEFAULT_ORG_UNITS: Array<{ id: string }> = [];
const EMPTY_FEATURES: GeoJsonFeature[] = [];

const useOrgUnitGeometries = ({
    orgUnits = DEFAULT_ORG_UNITS,
    debounceDelay = 250,
}: {
    orgUnits?: Array<{ id: string }>;
    debounceDelay?: number;
} = {}) => {
    const [features, setFeatures] = useState<GeoJsonFeature[]>(EMPTY_FEATURES);
    const [featuresLoading, setFeaturesLoading] = useState(false);
    const { system } = useSystemInfo();

    const userId = system?.currentUser?.id;
    const keyAnalysisDisplayProperty = system?.currentUser?.settings?.keyAnalysisDisplayProperty;

    const orgUnitIds = useMemo(() => orgUnits.map(item => item.id), [orgUnits]);

    const { error, loading, refetch } = useDataQuery(GEOFEATURES_QUERY, { lazy: true });
    const requestIdRef = useRef(0);
    const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        const performRefetch = () => {
            if (userId && keyAnalysisDisplayProperty && orgUnitIds.length > 0) {
                const requestId = requestIdRef.current + 1;
                requestIdRef.current = requestId;
                refetch({ orgUnitIds, keyAnalysisDisplayProperty, userId })
                    .then((data) => {
                        if (!data || requestId !== requestIdRef.current) return;

                        setFeatures(toGeoJson((data as any).geoFeatures));
                        setFeaturesLoading(false);
                    })
                    .catch(() => {
                        setFeaturesLoading(false);
                    });
            } else {
                requestIdRef.current += 1;
                setFeatures(EMPTY_FEATURES);
                setFeaturesLoading(false);
            }
        };

        if (userId && keyAnalysisDisplayProperty && orgUnitIds.length > 0) {
            setFeaturesLoading(true);
        } else {
            setFeaturesLoading(false);
        }

        debounceTimeoutRef.current = setTimeout(performRefetch, debounceDelay);

        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        };
    }, [userId, keyAnalysisDisplayProperty, orgUnitIds, refetch, debounceDelay]);

    return { features, featuresLoading, error, loading };
};

export default useOrgUnitGeometries;
