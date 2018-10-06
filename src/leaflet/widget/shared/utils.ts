import LeafletLib = require("./../../libs/leaflet-src");
import I = require("../interfaces/index");
import { leafletDraw } from "../leaflet/views/Leaflet.draw";
import { leafletDrawEvent } from "../leaflet/views/Leaflet.Draw.Event";
import { controlDraw } from "../leaflet/views/Control.Draw";
import { toolbar } from "../leaflet/views/Toolbar";
import { tooltip } from "../leaflet/views/Tooltip";
import { contextMenu } from "../leaflet/views/ContextMenu";
import ext = require("../leaflet/views/ext/index");
import drawHandle = require("../leaflet/views/draw/handler/index");
import { drawToolbar } from "../leaflet/views/draw/DrawToolbar";
import editHandle = require("../leaflet/views/edit/handler/index");
import { editToolbar } from "../leaflet/views/edit/EditToolbar";
import { controlMiniMap } from "../leaflet/views/Control.MiniMap";
import databaseService = require("../shared/databaseService/index");
import { easyPrint } from "../leaflet/views/EasyPrint";
import { legenda } from "../leaflet/views/Legenda";
import Offset = require("./../../libs/offset");
export function setOffSetMarker(icon, offset) {
    var iconMarginTop = parseInt(icon.style.marginTop, 10) - offset,
        iconMarginLeft = parseInt(icon.style.marginLeft, 10) - offset;

    icon.style.marginTop = iconMarginTop + 'px';
    icon.style.marginLeft = iconMarginLeft + 'px';
}
export function convertViewCoordinateToStore(markers: I.ILatLng[] | I.ILatLng): string {
    let coordinate: string = "";
    if (markers instanceof Array) {
        markers.forEach(marker => {
            coordinate += marker.lat + "," + marker.lng + " ";
        });
    } else {
        const marker = markers;
        coordinate += marker.lat + "," + marker.lng + " ";
    }
    return coordinate;
}
export function convertStoreCoordinateToView(coordinates: string): I.ILatLng[] {
    let markers: I.ILatLng[] = [];
    for (let i = 0; i < coordinates.length; ++i) {
        while (coordinates[i] === " ")++i;
        let tmpLat = "", tmpLng = "";
        while (coordinates[i] != "," && i < coordinates.length) {
            tmpLat += coordinates[i];
            ++i;
        }
        if (i < coordinates.length) i++;
        while (coordinates[i] != " " && i < coordinates.length) {
            tmpLng += coordinates[i];
            ++i;
        }
        const marker: I.ILatLng = {
            lat: Number.parseFloat(tmpLat),
            lng: Number.parseFloat(tmpLng)
        }
        markers.push(marker);
    } return markers;
}
export function convertListMarkerCategoriesFromWidget(categoriesS: string): string[] {
    let categories: string[] = [];
    for (let i = 0; i < categoriesS.length; ++i) {
        while (categoriesS[i] === " ")++i;
        let tmpCategory = "";
        while (categoriesS[i] != "," && i < categoriesS.length) {
            tmpCategory += categoriesS[i];
            ++i;
        }
        categories.push(tmpCategory);
    }
    return categories;
}
export function getKeyByValue(value: string, idViewToIdDB: Map<String, String>): string {
    var key = "";
    idViewToIdDB.forEach((v, k) => {
        if (v === value) key = k.toString();
    }, value)
    return key;
}
export function getTypeByValueEntityMapping(value: string, idViewToIdDB: Map<string, I.IEntity>): string {
    var key = "";
    idViewToIdDB.forEach((v, k) => {
        if (v.entityName === value) key = k.toString();
    }, value)
    return key;
}
export function importPlugins() {
    leafletDraw();
    leafletDrawEvent();
    toolbar();
    tooltip();
    ext.geometryUtil();
    ext.latLngUtil();
    ext.lineUtilIntersect();
    ext.polygonIntersect();
    ext.polylineIntersect();
    ext.touchEvents();
    drawToolbar();
    drawHandle.drawFeature();
    drawHandle.drawSimpleShape();
    drawHandle.drawPolyline();
    drawHandle.drawMarker();
    drawHandle.drawCircle();
    drawHandle.drawCircleMarker();
    drawHandle.drawPolygon();
    drawHandle.drawRectangle();
    drawHandle.drawStar();
    editToolbar();
    editHandle.editToolbarEdit();
    editHandle.editToolbarDelete();
    controlDraw();
    editHandle.editPoly();
    editHandle.editSimpleShape();
    editHandle.editRectangle();
    editHandle.editStar();
    editHandle.editMarker();
    editHandle.editCircleMarker();
    editHandle.editCircle();
    contextMenu();
    controlMiniMap();
    legenda();
    easyPrint();
}
export function convertTypeShpaeToDB(enumType: I.ShapeType): string | undefined {
    switch (enumType) {
        case I.ShapeType.Circle: return "circle";
        case I.ShapeType.Marker: return "marker";
        case I.ShapeType.Polygon: return "polygon";
        case I.ShapeType.Rectangle: return "rectangle";
        case I.ShapeType.CircleMarker: return "circleMarker";
        case I.ShapeType.Polyline: return "polyline";
        case I.ShapeType.Star: return "star";
    }
}

export function convertTypeShapeFromDB(stringType: string): I.ShapeType {
    switch (stringType) {
        case "circle": return I.ShapeType.Circle;
        case "marker": return I.ShapeType.Marker;
        case "rectangle": return I.ShapeType.Rectangle;
        case "circleMarker": return I.ShapeType.CircleMarker;
        case "polygon": return I.ShapeType.Polygon;
        case "polyline": return I.ShapeType.Polyline;
        case "star": return I.ShapeType.Star;
    }return -1;
}

export async function convertListShape(editPolygon: boolean, listShapeDB: mendix.lib.MxObject[], widgetConfig: I.IWidgetConfig, typeOfShape: string, guidToCoordinateIDS: Map<string, string[]>, guidToCoordinateObject: Map<string, mendix.lib.MxObject>,
    guidToMarkerCoordinateObject: Map<string, mendix.lib.MxObject>): Promise<I.IShape[]> {
    let listShape: I.IShape[] = [];
    await Promise.all(listShapeDB.map(async object => {
        const guid = object.getGuid();
        // const popupContent = object.get(widgetConfig.plantPopUpContent);
        // const radius = parseFloat(object.get(widgetConfig.shapeRadius) as string);
        const coordinate = await getCoordinageByShape(editPolygon, object, widgetConfig, guidToCoordinateIDS, guidToCoordinateObject, typeOfShape);
        const shape: I.IShape = {
            type: convertTypeShapeFromDB(typeOfShape),
            coordinates: coordinate,
            popUps: "",
            // radius: radius as number,
            iD: guid as string
        }
        if (shape.type === I.ShapeType.Marker) {
            const idImage = object.get(widgetConfig.plantImageAssociation) as string;
            if (idImage) {
                const objectImage = await databaseService.getDataByGuid(idImage);
                const imageUrl = await databaseService.getImageByUrl(mx.data.getDocumentUrl(idImage, objectImage.get("changedDate") as number));
                const size = objectImage.get("Size");
                if (objectImage && size > 0) {
                    shape.imageUrl = imageUrl;
                }
            } else {
                try {
                    const markerTypeID = object.get(widgetConfig.plantCropSubTypeAssociation) as string;
                    if (markerTypeID === "") throw new Error();
                    const markerTypeObject = guidToMarkerCoordinateObject.get(markerTypeID);
                    if (!markerTypeObject) throw new Error();
                    const size = markerTypeObject.get("Size");
                    if (markerTypeObject && size > 0) {
                        const imageUrl = await databaseService.getImageByUrl(mx.data.getDocumentUrl(markerTypeID, markerTypeObject.get("changedDate") as number));
                        shape.imageUrl = imageUrl;
                    }
                } catch{ }
            }
        }
        listShape.push(shape);
    }));

    return listShape;
}
export async function getCoordinageByShape(editPolygon: boolean, shapeObject: mendix.lib.MxObject, widgetConfig: I.IWidgetConfig, guidToCoordinateIDS: Map<string, string[]>, guidToCoordinateObject: Map<string, mendix.lib.MxObject>, typeOfShape: string): Promise<I.ILatLng[]> {
    const { locationEntity, locationZoneAssociation, latitudeAttribute, longitudeAttribute, order } = widgetConfig;
    const shapeID = shapeObject.getGuid();
    let coordinates: I.ILatLng[] = [];
    let coordinatesIDs: string[] = [];
    if (typeOfShape === "marker") {
        const objectCoordinate = await databaseService.getDataByGuid(shapeObject.get(widgetConfig.plantCoordinateAssociation) as string);
        const coordinate: I.ILatLng = {
            lat: objectCoordinate.get(latitudeAttribute) as number,
            lng: objectCoordinate.get(longitudeAttribute) as number
        }
        guidToCoordinateObject.set(objectCoordinate.getGuid(), objectCoordinate);
        coordinatesIDs.push(objectCoordinate.getGuid());
        coordinates.push(coordinate);
        guidToCoordinateIDS.set(shapeID, coordinatesIDs);
        return coordinates;
    }
    const listCoordinateObject = await databaseService.getDataByAssociations(locationEntity, locationZoneAssociation, shapeID);
    let listOrderCoordinates: number[] = [];
    listCoordinateObject.forEach(objectCoordinate => {
        guidToCoordinateObject.set(objectCoordinate.getGuid(), objectCoordinate);
        const coordinate: I.ILatLng = {
            lat: objectCoordinate.get(latitudeAttribute) as number,
            lng: objectCoordinate.get(longitudeAttribute) as number
        }
        coordinatesIDs.push(objectCoordinate.getGuid());
        coordinates.push(coordinate);
        listOrderCoordinates.push(objectCoordinate.get(order) as number);
    })
    guidToCoordinateIDS.set(shapeID, coordinatesIDs);
    if (editPolygon) {
        sortConvertNameByLength(0, listOrderCoordinates.length - 1, coordinates, listOrderCoordinates);
        return coordinates;
    }
    return convexHull(coordinates);
}

function orientation(p: I.ILatLng, q: I.ILatLng, r: I.ILatLng) {
    let val = (q.lng - p.lng) * (r.lat - q.lat) -
        (q.lat - p.lat) * (r.lng - q.lng);

    if (val == 0) return 0;  // collinear
    return (val > 0) ? 1 : 2; // clock or counterclock wise
}

export function convexHull(coordinates: I.ILatLng[]): I.ILatLng[] {
    // The enveloppe is the points themselves
    if (coordinates.length < 3) return coordinates;
    let hull: I.ILatLng[] = [];
    // Find the leftmost poin
    let l = 0;
    for (let i = 0; i < coordinates.length; ++i) {
        if (coordinates[i].lat < coordinates[l].lat) l = i;
    }
    //Start from leftmost point, keep moving 
    // counterclockwise until reach the start point
    // again.
    let p = l, q;
    do {
        hull.push(coordinates[p]);
        q = (p + 1) % coordinates.length;
        //For every point to find the next leftmost point from vector directory
        for (let i = 0; i < coordinates.length; ++i) {
            if (orientation(coordinates[p], coordinates[i], coordinates[q]) === 2) q = i;
        }
        //Move to next point
        p = q;
    } while (p != l && hull.length < coordinates.length)
    return hull;
}

export function isMarkerInsidePolygon(marker, poly) {
    var inside = false;
    var x = marker.getLatLng().lat, y = marker.getLatLng().lng;
    for (var ii = 0; ii < poly.getLatLngs().length; ii++) {
        var polyPoints = poly.getLatLngs()[ii];
        for (var i = 0, j = polyPoints.length - 1; i < polyPoints.length; j = i++) {
            var xi = polyPoints[i].lat, yi = polyPoints[i].lng;
            var xj = polyPoints[j].lat, yj = polyPoints[j].lng;

            var intersect = ((yi > y) != (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
    }

    return inside;
};

export function sortConvertNameByLength(first: number, last: number, listCoordinate: I.ILatLng[], listOrder: number[]) {
    if (first < last) {
        const midValue = listOrder[Math.floor((first + last) / 2)];
        let i = first, j = last;
        while (i <= j) {
            while (listOrder[i] < midValue) i++;
            while (listOrder[j] > midValue) j--;
            if (i <= j) {
                const temp = listOrder[i]; listOrder[i] = listOrder[j]; listOrder[j] = temp;
                const temp2: I.ILatLng = {
                    lat: listCoordinate[i].lat,
                    lng: listCoordinate[i].lng
                }
                listCoordinate[i] = listCoordinate[j]; listCoordinate[j] = temp2;
                i++;
                j--;
            }
        }
        if (i < last) sortConvertNameByLength(i, last, listCoordinate, listOrder);
        if (j > first) sortConvertNameByLength(first, j, listCoordinate, listOrder);
    }
}

export function findListMarkerNested(drawnItems: I.IDrawItem, areaSelection: I.ILayer): Map<String, I.ILayer> {
    const listAnotherInside: Map<String, I.ILayer> = new Map();
    const listMarkerInside: Map<String, I.ILayer> = new Map();
    for (const layerID in drawnItems._layers) {
        if (layerID === areaSelection._leaflet_id.toString()) continue;
        const layer = drawnItems._layers[layerID];
        if (layer instanceof LeafletLib.Marker && areaSelection.getBounds().contains(layer.getLatLng()) && isMarkerInsidePolygon(layer, areaSelection)) {
            listMarkerInside.set(layer._leaflet_id.toString(), layer);
        } else if (layer instanceof LeafletLib.Polygon && areaSelection.getBounds && areaSelection.getBounds().contains(layer.getLatLngs())) {
            listAnotherInside.set(layer._leaflet_id.toString(), layer);
        }
    }
    listMarkerInside.forEach(marker => {
        listAnotherInside.forEach(shape => {
            if (shape.getBounds && shape.getBounds().contains(marker.getLatLng()) && isMarkerInsidePolygon(marker, shape)) {
                listMarkerInside.delete(marker._leaflet_id.toString());
            }
        })
    })
    return listMarkerInside;
}
function projectCoords(coords, levelsDeep, project, context) {
    var coord, i, len;
    var result = [];

    for (i = 0, len = coords.length; i < len; i++) {
        coord = levelsDeep ?
            projectCoords(coords[i], levelsDeep - 1, project, context) :
            project.call(context, coords[i]);

        result.push(coord);
    }

    return result;
}
function projectGeometry(geometry, project, context) {
    var coords = geometry.coordinates;
    switch (geometry.type) {
        case 'Point':
            geometry.coordinates = project.call(context, coords);
            break;

        case 'MultiPoint':
        case 'LineString':
            for (var i = 0, len = coords.length; i < len; i++) {
                coords[i] = project.call(context, coords[i]);
            }
            geometry.coordinates = coords;
            break;

        case 'Polygon':
            geometry.coordinates = projectCoords(coords, 1, project, context);
            break;

        case 'MultiLineString':
            geometry.coordinates = projectCoords(coords, 1, project, context);
            break;

        case 'MultiPolygon':
            geometry.coordinates = projectCoords(coords, 2, project, context);
            break;

        default:
            break;
    }
    return geometry;
}

function projectFeature(feature, project, context) {
    if (feature.geometry.type === 'GeometryCollection') {
        for (var i = 0, len = feature.geometry.geometries.length; i < len; i++) {
            feature.geometry.geometries[i] =
                projectGeometry(feature.geometry.geometries[i], project, context);
        }
    } else {
        feature.geometry = projectGeometry(feature.geometry, project, context);
    }
    return feature;
}
export function geojsonProject(data, project, context) {
    data = JSON.parse(JSON.stringify(data));
    if (data.type === 'FeatureCollection') {
        // That's a huge hack to get things working with both ArcGIS server
        // and GeoServer. Geoserver provides crs reference in GeoJSON, ArcGIS —
        // doesn't.
        //if (data.crs) delete data.crs;
        for (var i = data.features.length - 1; i >= 0; i--) {
            data.features[i] = projectFeature(data.features[i], project, context);
        }
    } else {
        data = projectFeature(data, project, context);
    }
    return data;
};
export function convertToAreaByDefault(layer: I.ILayer, map: I.IMap) {
    const margin = 10, gj = layer.toGeoJSON();
    var margined;
    var shape = geojsonProject(gj, function (coord) {
        var pt = map.options.crs.latLngToPoint(LeafletLib.latLng(coord.slice().reverse()), map.getZoom());
        return [pt.x, pt.y];
    }, undefined);
    var res = new Offset(shape.geometry.coordinates).offset(margin);
    margined = {
        type: 'Feature',
        geometry: {
            type: 'Polygon',
            coordinates: res
        }
    };
    const coord = geojsonProject(margined, function (pt) {
        var ll = map.options.crs.pointToLatLng(LeafletLib.point(pt.slice()), map.getZoom());
        return [ll.lng, ll.lat];
    }, undefined)
    return LeafletLib.GeoJSON.geometryToLayer(coord, { contextmenu: true });
}