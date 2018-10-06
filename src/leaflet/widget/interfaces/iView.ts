export interface ILatLng {
    lat: number,
    lng: number,
    _graham_angle?: number
}
export interface IEntity {
    entityName: string,
    projectAssociation: string,
    editFormName: string
}
export interface IDropdownData {
    name: string,
    id: string
}
export interface IListDrawToolbar {
    marker: boolean,
    nameMarker: string
    polygon: boolean,
    namePolygon: string
}
export interface ILeganda { }
export interface ICLickOnCategoryEvent {
    markerName: string
}
export interface ICLickOnScreenShotEvent {
    blob: Blob
}
export interface IShape {
    type: ShapeType,
    coordinates: ILatLng[],
    iD: string,
    popUps: string,
    radius?: number,
    imageUrl?: string,
    options?: IOptions
}
export enum ShapeType {
    Circle,
    Polygon,
    Rectangle,
    Marker,
    CircleMarker,
    Polyline,
    Star
}
export interface IContextMenu {
    text: string,
    callback: (e: any) => void,
    icon?: string
}
export interface IDrawRectangle {
    enable: () => void
}
export interface ILayer {
    toGeoJSON(): any,
    getBounds(),
    _icon: string,
    getCenter: () => ILatLng,
    options: IOptions,
    _leaflet_id: number,
    _radius: number,
    _latlngs?: ILatLng[],
    _setLatLngs: (coordinates: ILatLng[]) => void,
    _latlng?: ILatLng,
    setLatLng: (coordinate: ILatLng) => void,
    _popup: IPopUp,
    setPopupContent: (popUpContent: string) => void,
    setRadius: (radius: number) => void,
    setIcon: (icon: any) => void,
    fire: (event: string, { }) => void,
    bindPopup: (content: string) => void,
    getLatLngs: () => Array<any>,
    getLatLng: () => ILatLng,
    getRadius: () => number,
    setStyle: (options: IOptions) => void,
    on(type: string, { })
}
export interface IPopUp {
    _contentNode: HTMLTextAreaElement
}
export interface IDrawItem {
    _layers: ILayer[],
    addLayer: (layer: ILayer) => void,
    removeLayer: (layer: ILayer) => void,
    clearLayers: () => void,
    remove: () => void
}
export interface ILatLngBounds { }
export interface ICircle extends ILayer {
    _radius: number,
    setRadius: (radius: number) => void,
    getRadius: () => number
}
export interface IPolyline extends ILayer {
    getLatLngs: () => Array<any>,
    setLatLngs: (latLng: ILatLng[]) => void;
}
export interface IMap {
    getZoom: () => number,
    options: any,
    contextmenu: any,
    on: (event: string, action: () => void) => void,
    zoomIn: () => void,
    zoomOut: () => void,
    panTo: (latLng: ILatLng) => void,
    addControl: (any: any) => void,
    setView: (latlng: ILatLng, zoomLevel?: number) => void,
    setMaxBounds: (any: any) => void,
    fire: (event: string, argument?: {}) => void,
    unproject: (any, num: number) => void,
    eachLayer: (layer: any) => {},
    hasLayer: () => void,
    removeLayer: (layer: ILayer) => void,
    off: () => void,
    remove: () => void,
    clearAllEventListeners: () => void,
    removeEventListener: () => void

}
export interface IMarkerOption {
    icon?: string,
    contextmenu: boolean,
    contextmenuInheritItems: boolean,
    contextmenuItems: IContextMenu[]
}
export interface IOptions {
    icon?: string,
    color?: string,
    contextmenu?: boolean,
    contextmenuInheritItems?: boolean,
    contextmenuItems?: IContextMenu[]
}
export interface IDataSlimSelect {
    placeholder?: boolean,
    innerHTML?: string,
    text?: string,
    value?: string
}