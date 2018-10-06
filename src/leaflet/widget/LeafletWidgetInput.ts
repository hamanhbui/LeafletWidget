
import I = require("./interfaces/index");
import widgetTemplate = require("dojo/text!leaflet/widget/template/Leaflet.html");
export default class LeafletWidgetInput implements I.IWidgetConfig {
    constructor() { };
    public domNode: HTMLDivElement;
    public mapContainer: HTMLDivElement;
    public templateString: string = widgetTemplate;
    public farmEntity: string;
    public projectReadOnly: string;
    public plantPopUpContent: string;
    public plantImageAssociation: string;
    public shapeRadius: string;
    public entityShapeEnumMapping: I.IEntityShapeEnumMapping[];
    public widgetConfig: I.IWidgetConfig;
    public zoomLevel: number;
    public minZoom: number;
    public maxZoom: number;
    public customPlantContextMenu: I.IMenuItem[];
    public onLeftClickEditForm: boolean;
    public plantImage: string;
    public onLeftClickShowPopup: boolean;
    public onRightClickEditForm: string;
    public latStarting: number;
    public lngStarting: number;
    public plantActive: string;
    public plantEntity: string;
    public customListOfPlantContextMenu: I.IMenuItem[];
    public markerCategories: string;
    public screenShotImage: string;
    public screenShotImageFarmAssociation: string;
    public cropSubTypeEntity: string;
    public farmCropSubTypeAssociation: string;
    public nameCropSubType: string;
    public locationEntity: string;
    public locationZoneAssociation: string;
    public latitudeAttribute: string;
    public longitudeAttribute: string;
    public screenShotImageMicroflow: string;
    public zoneFarmAssociation: string;
    public zoneEntity: string;
    public plantCropSubTypeAssociation: string;
    public plantCoordinateAssociation: string;
    public plantFarmAssociation: string;
    public editFormPlant: string;
    public editFormZone: string;
    public zoneID: string;
    public latOrigin: number;
    public lngOrigin: number;
    public order: string;
    public projectEditPolygon: boolean;
    public formType: string;
    public animationDuration: number;
    public editContextMenu: boolean;
    public removeContextMenu: boolean;
    setUpMetaData() {
        this.widgetConfig = {
            plantActive: this.plantActive,
            plantPopUpContent: "",
            shapeRadius: this.shapeRadius,
            zoomLevel: this.zoomLevel,
            minZoom: this.minZoom,
            maxZoom: this.maxZoom,
            customPlantContextMenu: this.customPlantContextMenu,
            onLeftClickEditForm: true,
            projectReadOnly: this.projectReadOnly,
            onLeftClickShowPopup: false,
            latStarting: this.latStarting,
            lngStarting: this.lngStarting,
            farmEntity: this.farmEntity,
            plantImageAssociation: "",
            plantEntity: this.plantEntity,
            customListOfPlantContextMenu: this.customListOfPlantContextMenu,
            screenShotImage: this.screenShotImage,
            screenShotImageFarmAssociation: this.screenShotImageFarmAssociation,
            cropSubTypeEntity: this.cropSubTypeEntity,
            farmCropSubTypeAssociation: this.farmCropSubTypeAssociation.split("/")[0],
            nameCropSubType: this.nameCropSubType,
            locationEntity: this.locationEntity,
            locationZoneAssociation: this.locationZoneAssociation.split("/")[0],
            latitudeAttribute: this.latitudeAttribute,
            longitudeAttribute: this.longitudeAttribute,
            screenShotImageMicroflow: this.screenShotImageMicroflow,
            zoneEntity: this.zoneEntity,
            zoneFarmAssociation: this.zoneFarmAssociation.split("/")[0],
            plantCropSubTypeAssociation: this.plantCropSubTypeAssociation.split("/")[0],
            plantCoordinateAssociation: this.plantCoordinateAssociation.split("/")[0],
            plantFarmAssociation: this.plantFarmAssociation.split("/")[0],
            editFormPlant: this.editFormPlant,
            editFormZone: this.editFormZone,
            zoneID: this.zoneID,
            latOrigin: this.latOrigin,
            lngOrigin: this.lngOrigin,
            order: this.order,
            projectEditPolygon: this.projectEditPolygon,
            formType: this.formType,
            animationDuration: this.animationDuration,
            editContextMenu: this.editContextMenu,
            removeContextMenu: this.removeContextMenu
        }
    }
}