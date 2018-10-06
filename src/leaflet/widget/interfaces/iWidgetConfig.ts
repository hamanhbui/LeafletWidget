export interface IWidgetConfig {
    editContextMenu: boolean,
    removeContextMenu: boolean,
    projectEditPolygon: boolean,
    farmEntity: string,
    projectReadOnly: boolean,
    plantImageAssociation: string,
    plantPopUpContent: string,
    shapeRadius: string,
    zoomLevel: number,
    minZoom: number,
    maxZoom: number,
    customPlantContextMenu: IMenuItem[],
    onLeftClickEditForm: boolean,
    onLeftClickShowPopup: boolean,
    latStarting: number,
    lngStarting: number,
    animationDuration: number,
    plantActive: string,
    plantEntity: string,
    customListOfPlantContextMenu: IMenuItem[],
    screenShotImage: string,
    screenShotImageFarmAssociation: string,
    cropSubTypeEntity: string,
    nameCropSubType: string,
    farmCropSubTypeAssociation: string,
    locationEntity: string,
    locationZoneAssociation: string,
    latitudeAttribute: string,
    longitudeAttribute: string
    screenShotImageMicroflow: string,
    zoneEntity: string,
    zoneFarmAssociation: string,
    plantCropSubTypeAssociation: string,
    plantFarmAssociation: string,
    plantCoordinateAssociation: string,
    editFormPlant: string,
    editFormZone: string,
    zoneID: string,
    latOrigin: number,
    lngOrigin: number,
    order: string,
    formType: string
}
export interface IMenuItem {
    label: string;
    microflow: string;
}
export interface IEntityShapeEnumMapping {
    entityShape: string,
    entityShapeProjectAssociation: string,
    shapeEnumeration: string,
    editFormItem: string
}