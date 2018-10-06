/// <reference path="../../../../../typings/index.d.ts" />
import I = require("./../../interfaces/index");
import databaseService = require("../../shared/databaseService/index");

export class MarkerDatabaseService {
    private guidToMarker;
    public async addMarkerToCoordinate(listCoordinate: I.ILatLng[], shapeID: string): Promise<String> {
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
}