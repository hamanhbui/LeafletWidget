// import {WidgetConnect} from "../connect/widgetConnect"
import dataServices = require("../databaseService/index")

export class SubscriptionHandler {
    private _guidHandlerDict: { [key: string]: any } = {};

    constructor() {
        this._guidHandlerDict = new Map();
    }

    public subscribe(guid: string, callback) {
        if (!this._guidHandlerDict[guid]) {//if existed, skip
            this._guidHandlerDict[guid] = dataServices.subscribe(guid, callback);
        }

    }
    public unsubscribeAll() {
        this.unsubscribeGuidHandler();
    }
    public unsubscribeGuidHandler() {
        for (var guid in this._guidHandlerDict) {
            this.unsubscribe(guid);
        }
        this._guidHandlerDict = {};
    }
    public unsubscribe(guid) {
        //$log.debug("unSubscribe object: "+ guid);
        var handler = this._guidHandlerDict[guid];
        dataServices.unsubscribe(handler);
    }
} 