export interface GeoJsonFeature {
    type: 'Feature';
    id: string;
    geometry: {
        type: string;
        coordinates: unknown;
    };
    properties: {
        type: string;
        id: string;
        name: string;
        hasCoordinatesDown: unknown;
        hasCoordinatesUp: unknown;
        level: number;
        grandParentParentGraph: string;
        grandParentId: string;
        parentGraph: string;
        parentId: string;
        parentName: string;
        dimensions: unknown;
    };
}

interface OrgUnit {
    id: string;
    co: string;
    ty: number;
    na: string;
    le: number;
    hcd: unknown;
    hcu: unknown;
    pg: string;
    pi: string;
    pn: string;
    dimensions: unknown;
}

export const toGeoJson = (organisationUnits: OrgUnit[]): GeoJsonFeature[] =>
    [...organisationUnits]
        .sort((a, b) => a.le - b.le)
        .map((ou) => {
            const coord = JSON.parse(ou.co);
            let gpid = '';
            let gppg = '';
            let type = 'Point';

            if (ou.ty === 2) {
                type = 'Polygon';
                if (ou.co.substring(0, 4) === '[[[[') {
                    type = 'MultiPolygon';
                }
            }

            if (typeof ou.pg === 'string' && ou.pg.length) {
                const ids = ou.pg.split('/').filter(Boolean);

                if (ids.length >= 2) {
                    gpid = ids[ids.length - 2];
                }

                if (ids.length > 2) {
                    gppg = '/' + ids.slice(0, -2).join('/');
                }
            }

            return {
                type: 'Feature' as const,
                id: ou.id,
                geometry: {
                    type,
                    coordinates: coord,
                },
                properties: {
                    type,
                    id: ou.id,
                    name: ou.na,
                    hasCoordinatesDown: ou.hcd,
                    hasCoordinatesUp: ou.hcu,
                    level: ou.le,
                    grandParentParentGraph: gppg,
                    grandParentId: gpid,
                    parentGraph: ou.pg,
                    parentId: ou.pi,
                    parentName: ou.pn,
                    dimensions: ou.dimensions,
                },
            };
        })
        .filter(
            ({ geometry }) =>
                Array.isArray(geometry.coordinates) &&
                (geometry.coordinates as unknown[]).length > 0 &&
                (geometry.coordinates as unknown[]).flat().length > 0,
        );
