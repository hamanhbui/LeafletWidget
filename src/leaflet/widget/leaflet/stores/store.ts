/// <reference path="../../../../../typings/index.d.ts" />
import I = require("./../../interfaces/index");
import databaseService = require("../../shared/databaseService/index");
import { WidgetConnect } from "../../shared/connect/widgetConnect";
import { EVENT } from "../../shared/events/index";
import { SubscriptionHandler } from "../../shared/connect/subscriptionHandler";
import { convertTypeShapeFromDB, convertListShape, convertTypeShpaeToDB, getTypeByValueEntityMapping, getCoordinageByShape, convexHull } from "../../shared/utils";
import { FormHelper } from "../views/formHelper";

export class Store {
    private ableToEditPolygon: boolean;
    private context: mendix.lib.MxObject;
    private widgetConfig: I.IWidgetConfig;
    private connect: WidgetConnect;
    private subscriptions: SubscriptionHandler;
    //GuidToObject is used to mapping between guid and object to easy using object and save time instead of reireive again from database.
    private guidToObject: Map<string, mendix.lib.MxObject>;
    private guidToCoordinateObject: Map<string, mendix.lib.MxObject>;
    //typeToEntitry is used to mapping between shapes on the toolbar and entity from domain model.
    private typeToEntity: Map<string, I.IEntity>;
    //formHelper is class which used to manage dom form rendering.
    private formHelper: FormHelper;
    private guidToCoordinateID: Map<string, string[]>;
    private guidToMarkerCategoryObject: Map<string, mendix.lib.MxObject>;
    constructor(widgetConfig: I.IWidgetConfig, connect: WidgetConnect) {
        this.widgetConfig = widgetConfig;
        this.connect = connect;
        this.guidToCoordinateObject = new Map();
        this.guidToObject = new Map();
        this.typeToEntity = new Map();
        this.guidToCoordinateID = new Map();
        this.guidToMarkerCategoryObject = new Map();
        this.subscriptions = new SubscriptionHandler();
        this.formHelper = new FormHelper();
        this.setupEvents();
    }

    private setupEvents() {
        this.connect.subscribeEvents([
            { topic: EVENT.SERVER_UPDATE_CONTEXT_OBJECT, context: this, method: this.retrieveDataByContext },
            { topic: EVENT.USER_DRAW_SHAPE, context: this, method: this.addShape },
            { topic: EVENT.USER_EDIT_SHAPE, context: this, method: this.editGeometryShape },
            { topic: EVENT.USER_DELETE_SHAPE, context: this, method: this.deleteShape },
            { topic: EVENT.USER_EDIT_POPUP, context: this, method: this.editPopUpContent },
            { topic: EVENT.USER_CALL_MICROFLOW, context: this, method: this.onCallMicroflow },
            { topic: EVENT.USER_OPEN_FORM, context: this, method: this.onCallFormEdit },
            { topic: EVENT.USER_REMOVE_FORM, context: this, method: this.deleteForm },
            { topic: EVENT.DESTROY, context: this, method: this.destroy },
            { topic: EVENT.USER_CLICK_ON_CATEGORY, context: this, method: this.getListMarkerIDByType },
            { topic: EVENT.USER_CLICK_ON_SCREENSHOT, context: this, method: this.addScreenShotImage }
        ]);
    }

    private async getListCropTypeByFarmID(contextID: string): Promise<I.ICropType[]> {
        const { cropSubTypeEntity, farmCropSubTypeAssociation, nameCropSubType } = this.widgetConfig;
        let listCropType: I.ICropType[] = [];
        const listTypeMarkerObject = await databaseService.getDataByAssociations(cropSubTypeEntity, farmCropSubTypeAssociation, contextID);
        var that = this;
        await listTypeMarkerObject.forEach(async objectType => {
            const cropType: I.ICropType = { name: "" };
            cropType.name = objectType.get(nameCropSubType) as string;
            that.guidToMarkerCategoryObject.set(objectType.getGuid(), objectType);
            const imageUrl = await databaseService.getImageByUrl(mx.data.getDocumentUrl(objectType.getGuid(), objectType.get("changedDate") as number));
            const size = objectType.get("Size");
            if (size > 0) {
                cropType.imageUrl = imageUrl;
            }
            listCropType.push(cropType);
        })
        return listCropType;
    }

    private getDataDrawToolbar(): I.IListDrawToolbar {
        const { zoneEntity, plantEntity } = this.widgetConfig;
        const listDrawToolbar: I.IListDrawToolbar = { marker: false, nameMarker: "", namePolygon: "", polygon: false };
        listDrawToolbar.polygon = true;
        listDrawToolbar.namePolygon = zoneEntity.substr(zoneEntity.indexOf('.') + 1).toLowerCase();
        listDrawToolbar.marker = true;
        listDrawToolbar.nameMarker = plantEntity.substr(plantEntity.indexOf('.') + 1).toLowerCase();
        return listDrawToolbar;
    }

    private async retrieveDataByContext(context: mendix.lib.MxObject) {
        this.context = context;
        const { zoneEntity, zoneFarmAssociation } = this.widgetConfig;
        //This variable is used to select which shapes will apears on the toolbar from list entities.
        try {
            //Get Project's readonly mode.
            const readOnly = this.widgetConfig.projectReadOnly;
            const ableToEditPolygon = this.widgetConfig.projectEditPolygon;
            this.ableToEditPolygon = ableToEditPolygon;
            //Retrieve map image by using association between image and project.
            const imageUrl = await databaseService.getImageByUrl(mx.data.getDocumentUrl(context.getGuid(), context.get("changedDate") as number));
            const listCropTypes = await this.getListCropTypeByFarmID(context.getGuid());
            //Retrive list shapes entity by using parallel loading.
            let listShapeView: I.IShape[] = [];
            const listObjectDB = await databaseService.getDataByAssociations(zoneEntity, zoneFarmAssociation, context.getGuid());
            const listObjectView = await convertListShape(this.ableToEditPolygon, listObjectDB, this.widgetConfig, "polygon", this.guidToCoordinateID, this.guidToCoordinateObject, this.guidToCoordinateObject);
            this.typeToEntity.set("polygon", { entityName: zoneEntity, projectAssociation: zoneFarmAssociation, editFormName: this.widgetConfig.editFormZone });
            this.setPairIdObjectAndSubscribeObject(listObjectDB);
            listShapeView = listShapeView.concat(listObjectView);
            const listObjectDB2 = await databaseService.getDataByAssociations(this.widgetConfig.plantEntity, this.widgetConfig.plantFarmAssociation, context.getGuid());
            const listObjectView2 = await convertListShape(this.ableToEditPolygon, listObjectDB2, this.widgetConfig, "marker", this.guidToCoordinateID, this.guidToCoordinateObject, this.guidToMarkerCategoryObject);
            this.typeToEntity.set("marker", { entityName: this.widgetConfig.plantEntity, projectAssociation: this.widgetConfig.plantFarmAssociation, editFormName: this.widgetConfig.editFormPlant });
            this.setPairIdObjectAndSubscribeObject(listObjectDB2);
            listShapeView = listShapeView.concat(listObjectView2);

            const listDrawToolbar = this.getDataDrawToolbar();
            //Send data which are retrieved from DB to send to the controller.
            var image = new Image();
            var that = this;
            image.src = imageUrl;
            const size = context.get("Size");
            if (size > 0) {
                image.onload = function () {
                    const width = this.width;
                    const height = this.height;
                    that.connect.publish(EVENT.STORE_UPDATE_DATA, [ableToEditPolygon, readOnly, imageUrl, listShapeView, listDrawToolbar, listCropTypes, width, height]);
                }
                image.onerror = function () {
                    that.connect.publish(EVENT.STORE_UPDATE_DATA, [ableToEditPolygon, readOnly, imageUrl, listShapeView, listDrawToolbar, listCropTypes, 800, 800]);
                }
            } else this.connect.publish(EVENT.STORE_UPDATE_DATA, [ableToEditPolygon, readOnly, imageUrl, listShapeView, listDrawToolbar, listCropTypes, 800, 800]);
        } catch (e) {
            console.log(e);
        }
    }

    private setPairIdObjectAndSubscribeObject(listShapeDB: mendix.lib.MxObject[]) {
        //From list of the shape database, subcribes all of them & set pairs of guid and objects to mapping.
        listShapeDB.forEach(shape => {
            const guid = shape.getGuid();
            this.subscriptions.subscribe(guid, this.onChangeObject.bind(this));
            this.guidToObject.set(guid, shape);
        })
    }

    private async addCordinateToShape(listCoordinate: I.ILatLng[], shapeID: string) {
        const { locationEntity, latitudeAttribute, longitudeAttribute, locationZoneAssociation, order } = this.widgetConfig;
        const listCoordinateID: string[] = [];
        for (let i = 0; i < listCoordinate.length; ++i) {
            const coordinate = listCoordinate[i];
            const newObject = await databaseService.create(locationEntity);
            newObject.set(latitudeAttribute, Math.round(coordinate.lat));
            newObject.set(longitudeAttribute, Math.round(coordinate.lng));
            newObject.set(locationZoneAssociation, shapeID);
            newObject.set(order, i);
            listCoordinateID.push(newObject.getGuid());
            await databaseService.commit(newObject);
            this.guidToCoordinateObject.set(newObject.getGuid(), newObject);
        }
        this.guidToCoordinateID.set(shapeID, listCoordinateID);
    }
    private async addMarkerToCoordinate(listCoordinate: I.ILatLng[], shapeID: string): Promise<String> {
        const { locationEntity, latitudeAttribute, longitudeAttribute, plantCoordinateAssociation } = this.widgetConfig;
        const listCoordinateID: string[] = [];
        const coordinate = listCoordinate[0];
        const newObject = await databaseService.create(locationEntity);
        newObject.set(latitudeAttribute, Math.round(coordinate.lat));
        newObject.set(longitudeAttribute, Math.round(coordinate.lng));
        newObject.set(plantCoordinateAssociation, shapeID);
        listCoordinateID.push(newObject.getGuid());
        await databaseService.commit(newObject);
        this.guidToCoordinateObject.set(newObject.getGuid(), newObject);
        this.guidToCoordinateID.set(shapeID, listCoordinateID);
        return newObject.getGuid();
    }

    private async addShape(type: I.ShapeType, idView: string, coordinate: I.ILatLng[], radius?: number) {
        let newObject;
        try {
            //Create new shape and set properties which users already draw on the view then commit to database.
            const entity = this.typeToEntity.get(convertTypeShpaeToDB(type)!);
            newObject = await databaseService.create(entity!.entityName);
            if (type === I.ShapeType.Circle) newObject.set(this.widgetConfig.shapeRadius, radius);
            if (this.widgetConfig.plantActive) newObject.set(this.widgetConfig.plantActive, false);
            if (coordinate.length === 1) {
                const coordinateID = await this.addMarkerToCoordinate(coordinate, newObject.getGuid());
                newObject.set(this.widgetConfig.plantCoordinateAssociation, coordinateID);
            }
            else {
                newObject.set(this.widgetConfig.zoneID, Date.now().toString());
                if (this.ableToEditPolygon) await this.addCordinateToShape(coordinate, newObject.getGuid());
                else await this.addCordinateToShape(convexHull(coordinate), newObject.getGuid());
            }
            newObject.set(entity!.projectAssociation, this.context.getGuid());
            if (this.widgetConfig.plantPopUpContent) newObject.set(this.widgetConfig.plantPopUpContent, "");
            await databaseService.commit(newObject);
            //After commit successfully, subcribe and set pairs of guid and objectes to mapping.
            this.subscriptions.subscribe(newObject.getGuid(), this.onChangeObject.bind(this));
            this.guidToObject.set(newObject.getGuid(), newObject);
            //Send pairs id of view and id database just created above to controller.
            this.connect.publish(EVENT.SERVER_CREATE_OBJECT, [idView, newObject.getGuid(), this.ableToEditPolygon ? coordinate : convexHull(coordinate)]);
        } catch{
            //If commit failed, remove object just created above in the database.
            if (newObject instanceof mendix.lib.MxObject) {
                newObject = newObject as mendix.lib.MxObject;
                databaseService.remove(newObject.getGuid());
            }
            //Then send notice that create failed to controller.
            this.connect.publish(EVENT.SERVER_CREATE_FAILED, [idView]);
        }
    }

    private async addScreenShotImage(blob: Blob) {
        const newObject = await databaseService.create(this.widgetConfig.screenShotImage);
        newObject.set(this.widgetConfig.screenShotImageFarmAssociation, this.context.getGuid());
        await databaseService.commit(newObject);
        var that = this;
        mx.data.saveDocument(newObject.getGuid(), "mapImageScreenShoot.jpg", { width: 180, height: 180 }, blob, function () {
            that.onCallMicroflow([newObject.getGuid()], that.widgetConfig.screenShotImageMicroflow);
            console.log("commit successfully");
        }, function (e) {
            console.error(e);
        });
    }

    private async editMarkerCoordinates(guidID: string, coordinate: I.ILatLng) {
        const markerObject = this.guidToObject.get(guidID);
        if (!markerObject) return;
        const objectCoordinate = this.guidToCoordinateObject.get((markerObject.get(this.widgetConfig.plantCoordinateAssociation) as string));
        if (objectCoordinate) {
            objectCoordinate.set(this.widgetConfig.latitudeAttribute, Math.round(coordinate.lat));
            objectCoordinate.set(this.widgetConfig.longitudeAttribute, Math.round(coordinate.lng));
            await databaseService.commit(objectCoordinate);
            this.guidToCoordinateObject.set(objectCoordinate.getGuid(), objectCoordinate);
        }
    }

    private async editCoordinates(guidID: string, coordinates: I.ILatLng[], isMarker: boolean) {
        const listCoordinateID = this.guidToCoordinateID.get(guidID);
        if (!listCoordinateID) return;
        if (coordinates.length === 1 && isMarker) {
            this.editMarkerCoordinates(guidID, coordinates[0]);
            return;
        }
        var index = -1;
        await Promise.all(listCoordinateID.map(async (coordinateID) => {
            index++;
            const coordinateObj = this.guidToCoordinateObject.get(coordinateID);
            if (!coordinateObj || !coordinates[index]) return;
            coordinateObj.set(this.widgetConfig.latitudeAttribute, Math.round(coordinates[index].lat));
            coordinateObj.set(this.widgetConfig.longitudeAttribute, Math.round(coordinates[index].lng));
            coordinateObj.set(this.widgetConfig.order, index);
            await databaseService.commit(coordinateObj);
            this.guidToCoordinateObject.set(coordinateID, coordinateObj);
        }))
        const coordinateIDs: string[] = this.guidToCoordinateID.get(guidID)!;
        index++;
        for (let i = index; i < coordinates.length; ++i) {
            const coordinate = coordinates[i];
            const newObject = await databaseService.create(this.widgetConfig.locationEntity);
            newObject.set(this.widgetConfig.latitudeAttribute, Math.round(coordinate.lat));
            newObject.set(this.widgetConfig.longitudeAttribute, Math.round(coordinate.lng));
            newObject.set(this.widgetConfig.order, i);
            newObject.set(this.widgetConfig.locationZoneAssociation, guidID);
            await databaseService.commit(newObject);
            coordinateIDs.push(newObject.getGuid());
            this.guidToCoordinateObject.set(newObject.getGuid(), newObject);
        }
        this.guidToCoordinateID.set(guidID, coordinateIDs);
    }

    private async getBackUpCoordinates(listCoordinateID: string[]): Promise<I.ILatLng[]> {
        const backUpCoordinate: I.ILatLng[] = [];
        listCoordinateID.forEach(id => {
            const coordinateObj = this.guidToCoordinateObject.get(id);
            if (!coordinateObj) return;
            backUpCoordinate.push({ lat: coordinateObj.get(this.widgetConfig.latitudeAttribute) as number, lng: coordinateObj.get(this.widgetConfig.longitudeAttribute) as number });
        })
        return backUpCoordinate;
    }

    private async editGeometryShape(guid: string, coordinates: I.ILatLng[], isMarker: boolean, radius?: number) {
        const object = this.guidToObject.get(guid);
        if (object) {
            //Back up previsous geometry before set and commit.            
            const listCoordinateID = this.guidToCoordinateID.get(guid);
            if (!listCoordinateID) return;
            const backUpCoordinate: I.ILatLng[] = await this.getBackUpCoordinates(listCoordinateID);
            try {
                await this.editCoordinates(guid, coordinates, isMarker);
                await databaseService.commit(object);
            } catch {
                //If commit failed, set previous geometry to object.
                while (true) {
                    try {
                        await this.editCoordinates(guid, backUpCoordinate, isMarker);
                        break;
                    } catch{
                        await this.editCoordinates(guid, backUpCoordinate, isMarker);
                    }
                }
                this.connect.publish(EVENT.SERVER_UPDATE_OBJECT, [guid, backUpCoordinate]);
            }
        }
    }

    private async editPopUpContent(guid: string, popupContent: string) {
        const object = this.guidToObject.get(guid);
        if (object && this.widgetConfig.plantPopUpContent) {
            //Back up previsous content before set and commit.           
            const backUpPopup = object.get(this.widgetConfig.plantPopUpContent);
            try {
                object.set(this.widgetConfig.plantPopUpContent, popupContent);
                await databaseService.commit(object);
            } catch{
                //If commit failed, set previous content to object, then send backup content to controller to rerender.
                object.set(this.widgetConfig.plantPopUpContent, backUpPopup);
                this.connect.publish(EVENT.SERVER_UPDATE_OBJECT, [guid, undefined, backUpPopup]);
            }
        }
    }

    private async deleteShape(guid: string, backUpLayer: I.ILayer) {
        try {
            await databaseService.remove(guid);
            this.guidToObject.delete(guid);
        } catch{
            //If cannot delete on database, send layer to contorller to render agagin.
            this.connect.publish(EVENT.SERVER_DELETE_FAILED, [guid, backUpLayer]);
        }
    }

    private async onChangeObject(guid: string) {
        //Get all of the object info from database and send to the controller.
        try {
            const object = await databaseService.getDataByGuid(guid);
            if (!this.guidToObject) return;
            this.guidToObject.set(object.getGuid(), object);
            if (!object) return;
            //Check if user want to focus on the object or not.
            if (object!.get(this.widgetConfig.plantActive) === true) {
                //If true, remove form of previous object.
                this.deleteForm();
                this.connect.publish(EVENT.FOCUS_OBJECT, [object.getGuid()]);
            }
            const type = convertTypeShapeFromDB(getTypeByValueEntityMapping(object.getEntity(), this.typeToEntity));
            if (type === I.ShapeType.Marker) {
                const idImage = object.get(this.widgetConfig.plantImageAssociation) as string;
                let imageUrl;
                //Get image of marker from marker and image maker association.
                try {
                    if (idImage) {
                        const objectImage = await databaseService.getDataByGuid(idImage);
                        imageUrl = await databaseService.getImageByUrl(mx.data.getDocumentUrl(idImage, objectImage.get("changedDate") as number));
                    } else {
                        const markerTypeID = object.get(this.widgetConfig.plantCropSubTypeAssociation) as string;
                        if (markerTypeID === "") throw new Error();
                        const markerTypeObject = await databaseService.getDataByGuid(markerTypeID);
                        const size = markerTypeObject.get("Size");
                        if (markerTypeObject && size > 0) {
                            imageUrl = await databaseService.getImageByUrl(mx.data.getDocumentUrl(markerTypeID, markerTypeObject.get("changedDate") as number));
                        }
                    }
                } catch{ }
                const coordinates = await getCoordinageByShape(this.ableToEditPolygon, object, this.widgetConfig, this.guidToCoordinateID, this.guidToCoordinateObject, "marker");
                this.connect.publish(EVENT.SERVER_UPDATE_OBJECT, [object.getGuid(), coordinates,
                object.get(this.widgetConfig.plantPopUpContent), undefined, imageUrl]);
            } else {
                const coordinates = await getCoordinageByShape(this.ableToEditPolygon, object, this.widgetConfig, this.guidToCoordinateID, this.guidToCoordinateObject, "polygon");
                this.connect.publish(EVENT.SERVER_UPDATE_OBJECT, [object.getGuid(), coordinates,
                object.get(this.widgetConfig.plantPopUpContent)]);
            }
        } catch (e) {
            console.log(e);
        }
    }

    private async getListMarkerIDByType(typeName: string) {
        let listMarkerID: string[] = [];
        const { plantEntity, plantCropSubTypeAssociation } = this.widgetConfig;
        let typeMarkerObject;
        this.guidToMarkerCategoryObject.forEach(object => {
            const name = object.get(this.widgetConfig.nameCropSubType) as string
            if (name === typeName) {
                typeMarkerObject = this.guidToMarkerCategoryObject.get(object.getGuid());
            }
        })
        if (!typeMarkerObject) return;
        const listMarkerOjbect = await databaseService.getDataByAssociations(plantEntity, plantCropSubTypeAssociation, typeMarkerObject.getGuid());
        listMarkerOjbect.forEach(object => {
            listMarkerID.push(object.getGuid());
        })
        this.connect.publish(EVENT.STORE_SEND_LIST_MARKER_SELECTED, [listMarkerID]);
    }

    private onCallMicroflow(guid: string[], microflowName: string) {
        databaseService.callMicroflow(microflowName, guid);
    }

    private onCallFormEdit(guid: string) {
        const object = this.guidToObject.get(guid);
        if (!object) return;
        const type = convertTypeShapeFromDB(getTypeByValueEntityMapping(object.getEntity(), this.typeToEntity));
        const entity = this.typeToEntity.get(convertTypeShpaeToDB(type)!);
        if (!entity) return;
        this.formHelper.openForm(object, entity.editFormName);
    }

    private deleteForm() {
        this.formHelper.cleanForm();
    }

    private destroy() {
        delete this.guidToCoordinateObject;
        delete this.guidToCoordinateID;
        delete this.guidToObject;
        delete this.typeToEntity;
        delete this.context;
        delete this.widgetConfig;
        this.subscriptions.unsubscribeAll();
        delete this.subscriptions;
        this.connect.destroy();
        delete this.connect;
        this.formHelper.destroy();
        delete this.formHelper;
    }
}