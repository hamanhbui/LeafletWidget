import L = require("./../../../libs/leaflet-src");
import "dojo/domReady!";
export function legenda() {
    /**
 * @class L.Control.Draw
 * @aka L.Draw
 */
    L.Legenda = L.Control.extend({
        // Options
        options: {
            position: 'topright',
            draw: {},
            edit: false,
        },

        initialize: function (options, widgetID) {
            if (L.version < '0.7') {
                throw new Error('Leaflet.draw 0.2.3+ requires Leaflet 0.7.0+. Download latest from https://github.com/Leaflet/Leaflet/');
            }

            L.Control.prototype.initialize.call(this, options);
            this._toolbars = {};
            this.widgetID = widgetID;
            L.toolbar = this; //set global var for editing the toolbar
        },
        // @method onAdd(): container
        // Adds the toolbar container to the map
        onAdd: function () {
            var container = L.DomUtil.create('div', 'leaflet-draw');
            var section = L.DomUtil.create('div', 'leaflet-draw-section', container);
            var toolbar = L.DomUtil.create('div', 'leaflet-draw-toolbar leaflet-bar leaflet-draw-toolbar-top', section);
            var myLegend: HTMLDivElement = L.DomUtil.create('div', 'leaflet-legend', toolbar);
            myLegend.style.height = "60px";
            myLegend.style.background = "white";
            myLegend.style.width = "150px";
            var legendTitle = L.DomUtil.create('div', 'legend-title', myLegend);
            legendTitle.innerHTML = "Marker category";
            var legendScale = L.DomUtil.create('div', 'legend-scale', myLegend);
            var legendLabels = L.DomUtil.create('div', 'legend-labels', legendScale);
            var selectMarker = L.DomUtil.create('select', '', legendLabels);
            selectMarker.id = "select-innerHTML";
            container.addEventListener('click', (ev) => {
                L.DomEvent.stopPropagation(ev);
            })
            // var legadaInner = "";
            // legadaInner += "<option selected disabled hidden>Please select</option>";
            // this.listMarker.forEach(marker => {
            //     legadaInner += "<option>" + marker + "</option>";
            // })
            // selectMarker.innerHTML = legadaInner;
            // legendLabels.firstChild.onmousedown = legendLabels.firstChild.ondblclick = L.DomEvent.stopPropagation;
            // selectMarker.addEventListener('change', (ev) => {
            //     L.DomEvent.stopPropagation(ev);
            //     const valueSelected = document.getElementById("markerCategorySelected")!.value;
            //     this._map.fire("clickOnCategory", { markerName: valueSelected });
            // })
            return container;
        }
    });
}