import declare = require("dojo/_base/declare");
import _WidgetBase = require("mxui/widget/_WidgetBase");
import _TemplatedMixin = require("dijit/_TemplatedMixin");
import { LeafletWidget } from "./LeafletWidget";
let widgetInstance = new LeafletWidget();
export = declare("leaflet.widget.Leaflet", [_WidgetBase, _TemplatedMixin], widgetInstance);