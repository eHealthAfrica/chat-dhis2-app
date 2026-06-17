declare module '*.module.css'
declare module '@dhis2/app-adapter'
declare module '@dhis2/d2-i18n'
declare module '@turf/area' {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function area(geojson: any): number
    export = area
}
