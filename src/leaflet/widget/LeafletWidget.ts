/// <reference path="../../../typings/index.d.ts" />
import { Store } from "./leaflet/stores/store";
import { Controller } from "./leaflet/controlls/controller";
import { View } from "./leaflet/views/view";
import { WidgetConnect } from "./shared/connect/widgetConnect";
import { EVENT } from "./shared/events/index";
import LeafletWidgetInput from "./LeafletWidgetInput";

export class LeafletWidget extends LeafletWidgetInput {
    private store: Store;
    private controller: Controller;
    private widgetId: string;
    private connect: WidgetConnect;
    private view: View;
    constructor() {
        super();
    }
    postCreate() {
        this.setUpMetaData();
        this.widgetId = "mapId";
        this.connect = new WidgetConnect(this.widgetId);
        this.store = new Store(this.widgetConfig, this.connect);
        this.view = new View(this.widgetConfig, this.widgetId);
        this.controller = new Controller(this.widgetConfig, this.connect, this.view);
    };
    update(context?: mendix.lib.MxObject, callback?: () => void) {
        if (context) {
            //Destroy previous objects and DOM elements before update.
            this.uninitialize();
            //Create new objects and DOM to render.
            this.widgetId = Date.now().toString();
            this.connect = new WidgetConnect(this.widgetId);
            this.store = new Store(this.widgetConfig, this.connect);
            this.view = new View(this.widgetConfig, this.widgetId);
            this.controller = new Controller(this.widgetConfig, this.connect, this.view);

            const mapDiv = document.createElement('div'); mapDiv.id = this.widgetId;
            this.mapContainer.appendChild(mapDiv);

            //Set style for new DOM.
            const widgetDiv = this.domNode;
            const body = document.body, html = document.documentElement;
            const height = Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.offsetHeight);
            // if (widgetDiv.getBoundingClientRect().top != 0 && widgetDiv.getBoundingClientRect().left != 0) {
            let top = 0;
            if (widgetDiv.getBoundingClientRect().top > 0) top = widgetDiv.getBoundingClientRect().top;
            var ua = navigator.userAgent.toLowerCase();
            if (typeof orientation !== 'undefined' || ua.indexOf('mobile') !== -1) {
                mapDiv.style.height = (height - top - 50 + "px");
            } else {
                mapDiv.style.height = (height - top - 5 + "px");
            }
            this.view.initializeMap(this.widgetId, this.maxZoom, this.minZoom);
            this.view.setViewWhenStarting(this.latStarting, this.lngStarting, this.zoomLevel);

            //After set style successfully, retrieve data from DB by using new context.
            this.connect.publish(EVENT.SERVER_UPDATE_CONTEXT_OBJECT, [context]);
            // }
        }
        callback && callback();
    }
    uninitialize() {
        this.connect.publish(EVENT.DESTROY, []);
        document.getElementById(this.widgetId)!.remove();
        delete this.connect;
        delete this.store;
        delete this.controller;
    }
    public resize() {

    }
}