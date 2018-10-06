import I = require("./../../interfaces/index");
import LeafletLib = require("./../../../libs/leaflet-src");
import SlimSelect = require("./../../../libs/slimselect");
export class View {
    private map: I.IMap;
    private drawnItems: I.IDrawItem;
    private bounds: I.ILatLng;
    private leganda: I.ILeganda;
    private widgetConfig: I.IWidgetConfig;
    private widgetID: string;
    private drawControl;
    private slimSelect;
    constructor(widgetConfig: I.IWidgetConfig, widgetID) {
        this.widgetConfig = widgetConfig;
        this.widgetID = widgetID;
    };

    private setFormType() {
        const formDiv = document.getElementById("formId");
        if (!formDiv) return;
        if (this.widgetConfig.formType === "formTop") {
            formDiv.className = 'formTop animated infinite slideInDown';
        }
        if (this.widgetConfig.formType === "formBottom") {
            formDiv.className = 'formBottom animated infinite slideInUp';
        }
        if (this.widgetConfig.formType === "formLeft") {
            formDiv.className = 'formLeft animated infinite slideInLeft';
        }
        if (this.widgetConfig.formType === "formRight") {
            formDiv.className = 'formRight animated infinite slideInRight';
        }
        formDiv.style.animationDuration = (this.widgetConfig.animationDuration.toString()) + "ms";
    }

    public getMap(): I.IMap {
        return this.map;
    }
    public getDrawnItems(): I.IDrawItem {
        return this.drawnItems;
    }
    public getDrawControl() {
        return this.drawControl;
    }

    public initializeMap(mapId: string, maxZoom: number, minZoom: number) {
        this.map = LeafletLib.map(mapId, {
            minZoom: minZoom,
            maxZoom: maxZoom,
            center: [0, 0],
            zoom: 0,
            crs: LeafletLib.CRS.Simple,
            contextmenu: true,
            contextmenuWidth: 140,
            contextmenuItems: []
        });
        this.setFormType();
    }

    public setViewWhenStarting(latitude: number, longitude: number, zoomLevel: number) {
        this.map.setView({ lat: latitude, lng: longitude }, zoomLevel);
    }

    public focusViewByID(id: string) {
        let layer: I.ILayer = this.drawnItems._layers[id];
        if (layer.getCenter) {
            this.map.setView(layer.getCenter());
        } else this.map.setView(layer.getLatLng());
    }

    public loadBackGroundByImageURL(imageUrl: string, width: number, height: number) {
        const { latOrigin, lngOrigin } = this.widgetConfig;
        let southWest = this.map.unproject([-latOrigin, -(height - lngOrigin)], 0);
        let northEast = this.map.unproject([width - latOrigin, lngOrigin], 0);
        this.bounds = new LeafletLib.LatLngBounds(southWest, northEast);
        this.map.setMaxBounds(this.bounds);
        this.drawnItems = LeafletLib.featureGroup().addTo(this.map);
        if (!LeafletLib.Browser.mobile) {
            var printer = LeafletLib.easyPrint({
                sizeModes: ['A4Landscape'],
                filename: 'myMap',
                exportOnly: true,
                hideControlContainer: true,
                download: this.widgetConfig.screenShotImage === "" ? true : false
            }).addTo(this.map);
        }
        LeafletLib.imageOverlay(imageUrl, this.bounds).addTo(this.map);
        const osmUrl = LeafletLib.imageOverlay(imageUrl, this.bounds);
        new LeafletLib.Control.MiniMap(osmUrl, { autoToggleDisplay: true }).addTo(this.map);
    }

    public loadLeganda(listCategories: I.ICropType[]) {
        this.leganda = new LeafletLib.Legenda({}, listCategories, this.widgetID);
        this.map.addControl(this.leganda);
        if (LeafletLib.Browser.mobile) {
            var legend = LeafletLib.control({ position: 'bottomleft' });
            var that = this;
            legend.onAdd = function (map) {
                var div = LeafletLib.DomUtil.create('div', 'info legend');
                div.innerHTML = '<label class="switch"><input id="switchTouch" type="checkbox"><span class="slider round"></span></label>';
                div.addEventListener('click', (ev) => {
                    LeafletLib.DomEvent.stopPropagation(ev);
                    const switchTouchDOM = document.getElementById("switchTouch");
                    if (switchTouchDOM.checked) that.map.fire('turnOffTouchSelection', { ev });
                })
                return div;
            };
            legend.addTo(this.map);
        }
        this.setCategorySelect(listCategories);
    }
    private setCategorySelect(listCategories: I.ICropType[]) {
        let listDataSlimSelect: I.IDataSlimSelect[] = [{
            placeholder: true,
            text: 'Please select'
        }];
        const thatLeafletLib = LeafletLib, thatMap = this.map;
        listCategories.forEach(category => {
            const imageUrl = category.imageUrl ? category.imageUrl : thatLeafletLib.Icon.Default.prototype.getDefaultIconUrl2();
            const dataSlimSelect: I.IDataSlimSelect = {
                innerHTML: '<img height="20" width="20" src="' + imageUrl + '" />    ' + category.name,
                text: category.name,
                value: category.name
            }
            listDataSlimSelect.push(dataSlimSelect);
        })
        this.slimSelect = new SlimSelect({
            select: '#select-innerHTML',
            placeholder: 'Please select',
            valuesUseText: false, // Use text instead of innerHTML for selected values - default false
            data: listDataSlimSelect,
            onChange: (ev) => {
                thatMap.fire("clickOnCategory", { markerName: ev.value });
            }
        })
    }

    public loadTollBar(listDrawToolbar: I.IListDrawToolbar) {
        if (listDrawToolbar.polygon) {
            LeafletLib.drawLocal.draw.toolbar.buttons.polygon = "Draw a " + listDrawToolbar.namePolygon;
        }
        if (listDrawToolbar.marker) {
            LeafletLib.drawLocal.draw.toolbar.buttons.marker = "Draw a " + listDrawToolbar.nameMarker;
            LeafletLib.drawLocal.draw.handlers.marker.tooltip.start = "Click map to place " + listDrawToolbar.nameMarker + ".";
            LeafletLib.drawLocal.edit.handlers.edit.tooltip.text = "Drag handles or " + listDrawToolbar.nameMarker + "s to edit features.";

        }
        if (listDrawToolbar)
            this.drawControl = new LeafletLib.Control.Draw({
                edit: {
                    featureGroup: this.drawnItems
                },
                draw: {
                    listDrawToolbar
                }
            })
        this.map.addControl(this.drawControl);
    }

    public destroy() {
        if (this.map) {
            this.map.off();
            this.map.clearAllEventListeners();
            this.map.removeEventListener();
            this.map.remove();
        }
        if (this.drawnItems) {
            this.drawnItems.clearLayers();
            this.drawnItems.remove();
        }
        delete this.map;
        delete this.drawnItems;
        delete this.bounds;
    }
    public resetSlimSelect() {
        this.slimSelect.set('Please select');
    }
}