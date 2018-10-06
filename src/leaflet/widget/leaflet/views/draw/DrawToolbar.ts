import L = require("../../../../libs/leaflet-src");
export function drawToolbar() {
	/**
	 * @class L.DrawToolbar
	 * @aka Toolbar
	 */
	L.DrawToolbar = L.Toolbar.extend({

		statics: {
			TYPE: 'draw'
		},

		options: {
			polyline: {},
			polygon: {},
			rectangle: {},
			circle: {},
			marker: {},
			circlemarker: {},
			star: {}
		},

		// @method initialize(): void
		initialize: function (options) {
			// Ensure that the options are merged correctly since L.extend is only shallow
			for (var type in this.options) {
				if (this.options.hasOwnProperty(type)) {
					if (options[type]) {
						options[type] = L.extend({}, this.options[type], options[type]);
					}
				}
			}

			this._toolbarClass = 'leaflet-draw-draw';
			L.Toolbar.prototype.initialize.call(this, options);
		},

		// @method getModeHandlers(): object
		// Get mode handlers information
		getModeHandlers: function (map) {
			return [
				this.options.listDrawToolbar.polyline ? {
					enabled: this.options.polyline,
					handler: new L.Draw.Polyline(map, this.options.polyline),
					title: L.drawLocal.draw.toolbar.buttons.polyline
				} : {},
				this.options.listDrawToolbar.polygon ? {
					enabled: this.options.polygon,
					handler: new L.Draw.Polygon(map, this.options.polygon),
					title: L.drawLocal.draw.toolbar.buttons.polygon
				} : {},
				this.options.listDrawToolbar.rectangle ? {
					enabled: this.options.rectangle,
					handler: new L.Draw.Rectangle(map, this.options.rectangle),
					title: L.drawLocal.draw.toolbar.buttons.rectangle
				} : {},
				this.options.listDrawToolbar.circle ? {
					enabled: this.options.circle,
					handler: new L.Draw.Circle(map, this.options.circle),
					title: L.drawLocal.draw.toolbar.buttons.circle
				} : {},
				this.options.listDrawToolbar.marker ? {
					enabled: this.options.marker,
					handler: new L.Draw.Marker(map, this.options.marker),
					title: L.drawLocal.draw.toolbar.buttons.marker
				} : {},
				this.options.listDrawToolbar.circleMarker ? {
					enabled: this.options.circlemarker,
					handler: new L.Draw.CircleMarker(map, this.options.circlemarker),
					title: L.drawLocal.draw.toolbar.buttons.circlemarker
				} : {},
				this.options.listDrawToolbar.star ? {
					enabled: this.options.star,
					handler: new L.Draw.Star(map, this.options.star),
					title: L.drawLocal.draw.toolbar.buttons.star
				} : {}
			];
		},

		// @method getActions(): object
		// Get action information
		getActions: function (handler) {
			return [
				{
					enabled: handler.completeShape,
					title: L.drawLocal.draw.toolbar.finish.title,
					text: L.drawLocal.draw.toolbar.finish.text,
					callback: handler.completeShape,
					context: handler
				},
				{
					enabled: handler.deleteLastVertex,
					title: L.drawLocal.draw.toolbar.undo.title,
					text: L.drawLocal.draw.toolbar.undo.text,
					callback: handler.deleteLastVertex,
					context: handler
				},
				{
					title: L.drawLocal.draw.toolbar.actions.title,
					text: L.drawLocal.draw.toolbar.actions.text,
					callback: this.disable,
					context: this
				}
			];
		},

		// @method setOptions(): void
		// Sets the options to the toolbar
		setOptions: function (options) {
			L.setOptions(this, options);

			for (var type in this._modes) {
				if (this._modes.hasOwnProperty(type) && options.hasOwnProperty(type)) {
					this._modes[type].handler.setOptions(options[type]);
				}
			}
		}
	});
}