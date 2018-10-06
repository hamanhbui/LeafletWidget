/// <reference path="../../../../../typings/index.d.ts" />
import LeafletLib = require("./../../../libs/leaflet-src");
import { WidgetConnect } from "../../shared/connect/widgetConnect";
import { EVENT } from "../../shared/events/index";
import I = require("./../../interfaces/index");
import { View } from "../views/view";
import { getKeyByValue, importPlugins, setOffSetMarker, findListMarkerNested, convertToAreaByDefault } from "../../shared/utils";
export class Controller {
    private connect: WidgetConnect;
    private idViewToIdDB: Map<String, String>
    private widgetConfig: I.IWidgetConfig;
    private readOnly: boolean;
    private ableEditPolygon: boolean;
    private markerIDSelecteds: Map<String, I.ILayer>;
    private rectangleSelection: I.IDrawRectangle;
    private view: View
    constructor(widgetConfig: I.IWidgetConfig, connect: WidgetConnect, view: View) {
        this.widgetConfig = widgetConfig;
        this.idViewToIdDB = new Map();
        this.connect = connect;
        this.setupEvents();
        this.view = view;
        importPlugins();
    }

    private setupEvents() {
        this.connect.subscribeEvents([
            { topic: EVENT.STORE_UPDATE_DATA, context: this, method: this.loadDataToView },
            { topic: EVENT.SERVER_CREATE_OBJECT, context: this, method: this.updateShapeAfterDrawn },
            { topic: EVENT.SERVER_UPDATE_OBJECT, context: this, method: this.updateObjectToView },
            { topic: EVENT.SERVER_CREATE_FAILED, context: this, method: this.deleteViewObject },
            { topic: EVENT.SERVER_DELETE_FAILED, context: this, method: this.addLayerAndSetPairIds },
            { topic: EVENT.FOCUS_OBJECT, context: this, method: this.focusToObjectByID },
            { topic: EVENT.STORE_SEND_LIST_MARKER_SELECTED, context: this, method: this.noteMarkerSelectedByCategory },
            { topic: EVENT.DESTROY, context: this, method: this.destroy }
        ]);
    }

    private setupDrawEvent() {
        this.view.getMap().on(LeafletLib.Draw.Event.CREATED, this.userDrawShape.bind(this));
        this.view.getMap().on(LeafletLib.Draw.Event.EDITED, this.userEditShape.bind(this));
        this.view.getMap().on(LeafletLib.Draw.Event.DELETED, this.userDeleteShape.bind(this));
        this.view.getMap().on("userEditPopup", this.userEditPopUp.bind(this));
        this.view.getMap().on("click", this.onClickBackGround.bind(this));
        this.view.getMap().on("contextmenu", this.onClickBackGround.bind(this));
        this.view.getMap().on("clickOnEditButton", this.removeAllMarkerSelected.bind(this));
        this.view.getMap().on("dragToSelect", this.callRectEnable.bind(this));
        this.view.getMap().on("clickOnCategory", this.cickOnCategoryHandle.bind(this));
        this.view.getMap().on("clickOnScreenShot", this.clickOnScreenShotHandle.bind(this));
    }

    private clickOnScreenShotHandle(event: I.ICLickOnScreenShotEvent) {
        this.connect.publish(EVENT.USER_CLICK_ON_SCREENSHOT, [event.blob]);
    }

    private noteMarkerSelectedByCategory(listCategoryIDDB: string[]) {
        this.removeAllMarkerSelected();
        if (listCategoryIDDB.length === 0) return;
        listCategoryIDDB.forEach(idDB => {
            const layerID = getKeyByValue(idDB, this.idViewToIdDB);
            const layer = this.view.getDrawnItems()._layers[layerID];
            if (layer) {
                LeafletLib.DomUtil.addClass(layer._icon, 'leaflet-marker-selected');
                setOffSetMarker(layer._icon, 4);
                this.markerIDSelecteds.set(layerID, layer);
            }
        })
        this.setMarkerSelectedContextMenu();
    }

    private cickOnCategoryHandle(event: I.ICLickOnCategoryEvent) {
        this.removeAllMarkerSelected();
        this.connect.publish(EVENT.USER_CLICK_ON_CATEGORY, [event.markerName]);
    }

    private focusToObjectByID(idDB: string) {
        const idView = getKeyByValue(idDB, this.idViewToIdDB);
        this.view.focusViewByID(idView);
    }

    private loadDataToView(ableEditPolygon: boolean, readOnly: boolean, imageUrl: string, listData: I.IShape[], listDrawToolbar: any, listCategories: I.ICropType[], width: number, height: number) {
        this.ableEditPolygon = ableEditPolygon;
        if (!this.ableEditPolygon) LeafletLib.EditToolbar.Edit.ableToEditPolygon = false;
        this.readOnly = readOnly;
        this.view.loadBackGroundByImageURL(imageUrl, width, height);
        this.view.loadLeganda(listCategories);
        listData.forEach(shapeData => {
            if (shapeData.coordinates.length === 0) return;
            if (shapeData.type === I.ShapeType.Polygon) {
                let polygon;
                if (shapeData.coordinates.length === 1) {
                    polygon = new LeafletLib.Circle(shapeData.coordinates[0], 0.2, { color: shapeData.options ? shapeData.options.color : '#3388ff', contextmenu: true });
                    this.atachNewShapeToViewByDB(shapeData, polygon);
                }
                else if (ableEditPolygon) {
                    polygon = new LeafletLib.Polygon(shapeData.coordinates, { color: shapeData.options ? shapeData.options.color : '#3388ff', contextmenu: true });
                    this.atachNewShapeToViewByDB(shapeData, polygon);
                }
                else {
                    try {
                        polygon = convertToAreaByDefault(new LeafletLib.Polygon(shapeData.coordinates, { color: shapeData.options ? shapeData.options.color : '#3388ff', contextmenu: true }), this.view.getMap());
                        this.atachNewShapeToViewByDB(shapeData, polygon);
                    } catch (e) { }
                }
            } else if (shapeData.type === I.ShapeType.Rectangle) {
                let rectangle = new LeafletLib.Rectangle(shapeData.coordinates, { color: shapeData.options ? shapeData.options.color : '#3388ff', contextmenu: true });
                this.atachNewShapeToViewByDB(shapeData, rectangle);
            } else if (shapeData.type === I.ShapeType.Circle) {
                let circle = new LeafletLib.Circle(shapeData.coordinates[0], shapeData.radius, { color: shapeData.options ? shapeData.options.color : '#3388ff', contextmenu: true });
                this.atachNewShapeToViewByDB(shapeData, circle);
            } else if (shapeData.type === I.ShapeType.Marker) {
                let marker = new LeafletLib.Marker(shapeData.coordinates[0], { contextmenu: true });
                if (shapeData.imageUrl) LeafletLib.setOptions(marker, { icon: LeafletLib.icon({ iconUrl: shapeData.imageUrl, iconSize: [25, 41] }) });
                this.atachNewShapeToViewByDB(shapeData, marker);
            } else if (shapeData.type === I.ShapeType.Polyline) {
                let polyline = new LeafletLib.Polyline(shapeData.coordinates, { color: shapeData.options ? shapeData.options.color : '#3388ff', contextmenu: true });
                this.atachNewShapeToViewByDB(shapeData, polyline);
            } else if (shapeData.type === I.ShapeType.CircleMarker) {
                let circleMarker = new LeafletLib.CircleMarker(shapeData.coordinates[0], { color: shapeData.options ? shapeData.options.color : '#3388ff', contextmenu: true, });
                this.atachNewShapeToViewByDB(shapeData, circleMarker);
            } else if (shapeData.type === I.ShapeType.Star) {
                let star = new LeafletLib.Star(shapeData.coordinates, { color: shapeData.options ? shapeData.options.color : '#3388ff', contextmenu: true });
                this.atachNewShapeToViewByDB(shapeData, star);
            }
        })
        // listArea.forEach(areaData => {
        //     const polygon = new LeafletLib.Polygon(areaData.coordinates, { color: areaData.options ? areaData.options.color : '#3388ff', contextmenu: true });
        //     this.atachNewShapeToViewByDB(areaData, polygon);
        // })
        if (!this.readOnly) {
            this.view.loadTollBar(listDrawToolbar);
            this.setupDrawEvent();
        }
        this.createRectangleSelection();
    }

    private createRectangleSelection() {
        this.markerIDSelecteds = new Map();
        this.rectangleSelection = new LeafletLib.Draw.Rectangle(this.view.getMap(), {
            selectionAreaEnabled: true
        })
    }

    private callRectEnable() {
        this.rectangleSelection.enable();
    }

    private updateObjectToView(idDb: string, coordinates?: I.ILatLng[], popUpContent?: string, radius?: number, imageUrl?: string) {
        //After each change of the object from store, get info and rerender again.
        let layer: I.ILayer = this.view.getDrawnItems()._layers[getKeyByValue(idDb, this.idViewToIdDB)];
        if (popUpContent) {
            layer.setPopupContent(popUpContent);
            if (layer._popup && layer._popup._contentNode) layer._popup._contentNode.value = popUpContent;
        }
        if (layer instanceof LeafletLib.Circle && radius) {
            const circle = layer as I.ICircle;
            circle.setRadius(radius);
        }
        if (coordinates) {
            if (layer._latlngs) layer._setLatLngs(coordinates);
            else layer.setLatLng(coordinates[0]);
        }
        if (imageUrl) {
            layer.setIcon(LeafletLib.icon({ iconUrl: imageUrl, iconSize: [25, 41] }));
        }
        layer.fire('revert-edited', { layer: layer });
        this.view.getMap().fire('viewreset');
    }

    private userDeleteShape(e) {
        var layers = e.layers;
        layers.eachLayer(function (layer) {
            const idView = layer._leaflet_id.toString();
            this.connect.publish(EVENT.USER_DELETE_SHAPE, [this.idViewToIdDB.get(idView), layer]);
            this.idViewToIdDB.delete(idView);
        }, this);
    }

    private userEditPopUp(e) {
        const layer = e.layer;
        const popupContent = layer.getPopup()._content;
        this.connect.publish(EVENT.USER_EDIT_POPUP, [this.idViewToIdDB.get(layer._leaflet_id.toString()), popupContent])
    }

    private userEditShape(e) {
        var layers = e.layers;
        layers.eachLayer(function (layer) {
            if (layer._latlngs && layer._latlngs[0] instanceof Array) {
                this.connect.publish(EVENT.USER_EDIT_SHAPE, [this.idViewToIdDB.get(layer._leaflet_id.toString()), layer.getLatLngs()[0], false]);
            }
            else if (layer instanceof LeafletLib.Polyline) {
                this.connect.publish(EVENT.USER_EDIT_SHAPE, [this.idViewToIdDB.get(layer._leaflet_id.toString()), layer.getLatLngs(), false]);
            }
            else if (layer instanceof LeafletLib.Circle) {
                const radius = layer.getRadius();
                this.connect.publish(EVENT.USER_EDIT_SHAPE, [this.idViewToIdDB.get(layer._leaflet_id.toString()), [layer.getLatLng()], false, Number.parseFloat(Number(radius).toFixed(8))]);
            } else if (layer instanceof LeafletLib.CircleMarker) {
                this.connect.publish(EVENT.USER_EDIT_SHAPE, [this.idViewToIdDB.get(layer._leaflet_id.toString()), [layer.getLatLng()], false]);
            }
            else if (layer instanceof LeafletLib.Marker) {
                this.connect.publish(EVENT.USER_EDIT_SHAPE, [this.idViewToIdDB.get(layer._leaflet_id.toString()), [layer.getLatLng()], true]);
            }
        }, this);
    }

    private addClassAndIDForSelectedMarker(layer: I.ILayer, layerID: String) {
        if (this.markerIDSelecteds.has(layerID)) {
            this.removeMarkerSelected(layer);
            return;
        }
        LeafletLib.DomUtil.addClass(layer._icon, 'leaflet-marker-selected');
        setOffSetMarker(layer._icon, 4);
        this.markerIDSelecteds.set(layerID, layer);
    }

    private noteMakerSelected(rectangleSelection) {
        const drawnItems = this.view.getDrawnItems();
        for (const layerID in drawnItems._layers) {
            const layer = drawnItems._layers[layerID];
            if (layer instanceof LeafletLib.Marker && rectangleSelection.getBounds().contains(layer.getLatLng()) && !this.markerIDSelecteds.has(layerID)) {
                this.addClassAndIDForSelectedMarker(layer, layerID);
            }
        }
    }

    private userDrawShape(e) {
        const drawnItems = this.view.getDrawnItems();
        var type: string = e.layerType,
            layer: I.ILayer = e.layer;
        drawnItems.addLayer(layer);
        drawnItems.removeLayer(layer);
        if (type === "selectionArea") {
            this.noteMakerSelected(layer);
            this.setMarkerSelectedContextMenu();
        }
        else if (type === 'polygon') {
            const polygon: I.ILayer = new LeafletLib.Polygon(layer.getLatLngs()[0], { contextmenu: true });
            this.atachNewShapeToView(polygon);
            this.connect.publish(EVENT.USER_DRAW_SHAPE, [I.ShapeType.Polygon, polygon._leaflet_id.toString(), polygon.getLatLngs()[0]]);
        }
        else if (type === 'rectangle') {
            const rectangle: I.ILayer = new LeafletLib.Rectangle(layer.getLatLngs()[0], { contextmenu: true });
            this.atachNewShapeToView(rectangle);
            this.connect.publish(EVENT.USER_DRAW_SHAPE, [I.ShapeType.Rectangle, rectangle._leaflet_id.toString(), rectangle.getLatLngs()[0]]);
        }
        // else if (type === 'circle') {
        //     const circle: I.ILayer = new LeafletLib.Circle(layer.getLatLng(), layer.getRadius(), { contextmenu: true });
        //     this.atachNewShapeToView(circle);
        //     this.connect.publish(EVENT.USER_DRAW_SHAPE, [I.ShapeType.Circle, circle._leaflet_id.toString(), convertViewCoordinateToStore(circle.getLatLng()), Number.parseFloat(Number(circle.getRadius()).toFixed(8))]);
        // }
        else if (type === 'marker') {
            const marker: I.ILayer = new LeafletLib.Marker(layer.getLatLng(), { contextmenu: true });
            this.atachNewShapeToView(marker);
            this.connect.publish(EVENT.USER_DRAW_SHAPE, [I.ShapeType.Marker, marker._leaflet_id.toString(), [marker.getLatLng()]]);
        }
        // else if (type === 'polyline') {
        //     const polyline: I.ILayer = new LeafletLib.Polyline(layer.getLatLngs(), { contextmenu: true });
        //     this.atachNewShapeToView(polyline);
        //     this.connect.publish(EVENT.USER_DRAW_SHAPE, [I.ShapeType.Polyline, polyline._leaflet_id.toString(), convertViewCoordinateToStore(polyline.getLatLngs())]);
        // }
        // else if (type === 'circlemarker') {
        //     const circleMarker: I.ILayer = new LeafletLib.CircleMarker(layer.getLatLng(), { contextmenu: true });
        //     this.atachNewShapeToView(circleMarker);
        //     this.connect.publish(EVENT.USER_DRAW_SHAPE, [I.ShapeType.CircleMarker, circleMarker._leaflet_id.toString(), convertViewCoordinateToStore(circleMarker.getLatLng())]);
        // }
        // else if (type === 'star') {
        //     const star: I.ILayer = new LeafletLib.Star(layer.getLatLngs()[0], { contextmenu: true });
        //     this.atachNewShapeToView(star);
        //     this.connect.publish(EVENT.USER_DRAW_SHAPE, [I.ShapeType.Star, star._leaflet_id.toString(), convertViewCoordinateToStore(star.getLatLngs()[0])]);
        // }
    }

    private deleteViewObject(idView: string) {
        const drawnItems = this.view.getDrawnItems();
        const layer = drawnItems._layers[idView];
        drawnItems.removeLayer(layer);
    }

    private atachNewShapeToView(shape: I.ILayer) {
        this.setShapeContextMenu(shape);
        this.view.getDrawnItems().addLayer(shape);
        this.setActionsLeftClick("", shape);
    }

    private atachNewShapeToViewByDB(shapeDB: I.IShape, shape: I.ILayer) {
        this.setShapeContextMenu(shape);
        this.setActionsLeftClick(shapeDB.popUps, shape);
        this.addLayerAndSetPairIds(shapeDB.iD, shape);
    }

    private removeMarkerSelected(layer: I.ILayer) {
        if (!layer._icon) return;
        this.setShapeContextMenu(layer);
        LeafletLib.DomUtil.removeClass(layer._icon, 'leaflet-marker-selected');
        setOffSetMarker(layer._icon, -4);
        this.markerIDSelecteds.delete(layer._leaflet_id.toString());
        if (this.markerIDSelecteds.size === 1) {
            this.markerIDSelecteds.forEach(marker => {
                this.setShapeContextMenu(marker);
            })
        }
    }

    private removeAllMarkerSelected() {
        const that = this;
        this.markerIDSelecteds.forEach(layer => {
            that.removeMarkerSelected(layer);
        })
    }

    private onClickBackGround(e) {
        const switchTouchDOM = document.getElementById("switchTouch");
        if (switchTouchDOM) {
            if (!switchTouchDOM.checked) {
                this.removeAllMarkerSelected();
                this.view.resetSlimSelect();
            }
        } else {
            if (!e.originalEvent.ctrlKey) {
                this.removeAllMarkerSelected();
                this.view.resetSlimSelect();
            }
        }
        this.connect.publish(EVENT.USER_REMOVE_FORM, []);
    }

    private setActionsLeftClick(popUpContent: string, shape: I.ILayer) {
        if (!this.readOnly) {
            var that = this;
            const switchTouchDOM = document.getElementById("switchTouch");
            if (this.widgetConfig.onLeftClickEditForm) shape.on("click", (e) => {
                if (that.view.getDrawControl()._toolbars.edit._activeMode) return;
                if (that.view.getDrawControl()._toolbars.draw._activeMode) return;
                if (switchTouchDOM) {
                    if (switchTouchDOM.checked && !(shape instanceof LeafletLib.Rectangle) && shape instanceof LeafletLib.Polygon) {
                        LeafletLib.DomEvent.stopPropagation(e);
                        this.noteMakerSelectedNested(shape);
                        return;
                    }
                    if (switchTouchDOM.checked && shape instanceof LeafletLib.Marker) {
                        this.addClassAndIDForSelectedMarker(shape, shape._leaflet_id.toString());
                        this.setMarkerSelectedContextMenu();
                        return;
                    }
                } else {
                    if (!(shape instanceof LeafletLib.Rectangle) && shape instanceof LeafletLib.Polygon && e.originalEvent.ctrlKey) {
                        LeafletLib.DomEvent.stopPropagation(e);
                        this.noteMakerSelectedNested(shape);
                        return;
                    }
                    if (e.originalEvent.ctrlKey && shape instanceof LeafletLib.Marker) {
                        this.addClassAndIDForSelectedMarker(shape, shape._leaflet_id.toString());
                        this.setMarkerSelectedContextMenu();
                        return;
                    }
                }
                if (this.markerIDSelecteds.size > 0) return;
                this.connect.publish(EVENT.USER_OPEN_FORM, [this.idViewToIdDB.get(shape._leaflet_id.toString())])
            });
            if (this.widgetConfig.onLeftClickShowPopup) shape.bindPopup(popUpContent);
        }
    }

    private noteMakerSelectedNested(areaSelection: I.ILayer) {
        const drawnItems = this.view.getDrawnItems();
        const listMarkerInside = findListMarkerNested(drawnItems, areaSelection);
        listMarkerInside.forEach(marker => {
            if (!this.markerIDSelecteds.has(marker._leaflet_id.toString())) {
                this.addClassAndIDForSelectedMarker(marker, marker._leaflet_id.toString());
            }
        })
        this.setMarkerSelectedContextMenu();
    }

    private setShapeContextMenu(shape: I.ILayer) {
        if (!this.readOnly) {
            const contextmenuItems: I.IContextMenu[] = [];
            if (this.widgetConfig.editContextMenu) {
                contextmenuItems.push({
                    text: "Edit", callback: () => {
                        this.removeAllMarkerSelected();
                        this.view.getMap().fire('editThisShape', { layer: shape })
                    }
                });
            }
            if (!this.ableEditPolygon && shape instanceof LeafletLib.Polygon) {
                contextmenuItems.pop();
            }
            this.widgetConfig.customPlantContextMenu.forEach(menuItem => {
                contextmenuItems.push({ text: menuItem.label, callback: () => this.connect.publish(EVENT.USER_CALL_MICROFLOW, [[this.idViewToIdDB.get(shape._leaflet_id.toString())], menuItem.microflow]) });
            })
            LeafletLib.Util.setOptions(shape, {
                contextmenuInheritItems: false,
                contextmenuItems: contextmenuItems
            });
        }
    }

    private setMarkerSelectedContextMenu() {
        if (this.markerIDSelecteds.size <= 1) return;
        const listIdDBMarkers: String[] = [];
        const listLayer: I.ILayer[] = [];
        this.markerIDSelecteds.forEach(layer => listLayer.push(layer));
        const contextmenuItems: I.IContextMenu[] = [];
        if (this.widgetConfig.removeContextMenu) {
            contextmenuItems.push({
                text: "Remove",
                callback: () => {
                    this.markerIDSelecteds.forEach(layer => {
                        const idView = layer._leaflet_id.toString();
                        this.deleteViewObject(idView);
                        this.connect.publish(EVENT.USER_DELETE_SHAPE, [this.idViewToIdDB.get(idView), layer]);
                        this.idViewToIdDB.delete(idView);
                        this.markerIDSelecteds.delete(idView);
                    })
                }
            });
        }
        if (this.widgetConfig.editContextMenu) {
            contextmenuItems.push({
                text: "Edit",
                callback: () => {
                    this.removeAllMarkerSelected();
                    this.view.getMap().fire('editListShape', { layers: listLayer })
                }
            })
        }
        this.widgetConfig.customListOfPlantContextMenu.forEach(menuItem => {
            contextmenuItems.push({
                text: menuItem.label, callback: () => {
                    this.removeAllMarkerSelected();
                    this.connect.publish(EVENT.USER_CALL_MICROFLOW, [listIdDBMarkers, menuItem.microflow])
                }
            })
        })
        this.markerIDSelecteds.forEach(layer => {
            listIdDBMarkers.push(this.idViewToIdDB.get(layer._leaflet_id.toString())!);
            LeafletLib.Util.setOptions(layer, {
                contextmenuInheritItems: false,
                contextmenuItems: contextmenuItems
            });
        });
    }

    private addLayerAndSetPairIds(idDB: string, layer: I.ILayer) {
        this.view.getDrawnItems().addLayer(layer);
        this.addPairIdsToMap(layer._leaflet_id.toString(), idDB);
    }

    private addPairIdsToMap(idView: string, idDB: string) {
        this.idViewToIdDB.set(idView, idDB);
    }

    private updateShapeAfterDrawn(idView: string, idDB: string, coordinates: I.ILatLng[]) {
        this.idViewToIdDB.set(idView, idDB);
        let layer: I.ILayer = this.view.getDrawnItems()._layers[idView];
        if (layer._latlngs) layer._setLatLngs(coordinates);
        else layer.setLatLng(coordinates[0]);
        layer.fire('revert-edited', { layer: layer });
        this.view.getMap().fire('viewreset');
    }

    public destroy() {
        this.view.destroy();
        delete this.connect;
        delete this.idViewToIdDB;
        delete this.widgetConfig;
        delete this.readOnly;
        delete this.view;
    }
}