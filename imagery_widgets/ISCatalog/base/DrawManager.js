//////////////////////////////////////////////////////////////////////////////
// Copyright 2013 Esri
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//////////////////////////////////////////////////////////////////////////////

define([
        "dojo/_base/declare",
        "dojo/_base/lang",
        "esri/toolbars/draw",
        "esri/layers/GraphicsLayer",
        "dojo/on" ,
        "esri/graphic",
        "esri/symbols/jsonUtils",
        "./BaseDiscoveryMixin",
        "dojo/Evented",
        "dojo/topic",
        "esri/geometry/Point",
        "esri/geometry/Polygon",
        "esri/geometry/Extent" ,
        "esri/geometry/Circle"
    ],
    function (declare, lang, Draw, GraphicsLayer, on, Graphic, jsonUtils, BaseDiscoveryMixin, Evented, topic, Point, Polygon, Extent, Circle) {
        return declare([ Evented, BaseDiscoveryMixin], {
            drawConstraints: null,
            DRAW_END: "drawEnd",
            isPointToRectangleActive: false,
            constructor: function (params) {
                lang.mixin(this, params || {});
                this.drawToolBar = new Draw(this.map);
                on(this.drawToolBar, 'draw-end', lang.hitch(this, this._onDrawEnd));
                this._initDefaultSymbols();
                this._createGraphicsLayer();
                this.initListeners();
            },

            initListeners: function () {
                topic.subscribe(this.CURRENT_SEARCH_GEOMETRY_TOPIC, lang.hitch(this, this._handleGetCurrentSearchGeometry));
            },
            _handleGetCurrentSearchGeometry: function (callback) {
                if (callback && lang.isFunction(callback)) {
                    callback(this.getSearchGraphic());
                }
            },
            /**
             * initializes the draw symbology for tasking widget
             * @private
             */
            _initDefaultSymbols: function () {
                var pointSys, polygonSys;
                pointSys = {"style": "esriSMSCircle", "color": [0, 0, 128, 128], "name": "Circle", "outline": {"color": [0, 0, 128, 255], "width": 1}, "type": "esriSMS", "size": 3};
                polygonSys = {"style": "esriSFSSolid", "color": [79, 129, 189, 1], "type": "esriSFS", "outline": {"style": "esriSLSSolid", "color": [0, 0, 255, 255], "width": 1.5, "type": "esriSLS"}};
                if (!this.pointSymbol) {
                    this.pointSymbol = jsonUtils.fromJson(pointSys);
                }
                if (!this.polygonSymbol) {
                    this.polygonSymbol = jsonUtils.fromJson(polygonSys);
                }
            },
            /**
             * creates graphics layer for tasking widget
             * @private
             */
            _createGraphicsLayer: function () {
                this.graphicsLayer = new GraphicsLayer();
                this.map.addLayer(this.graphicsLayer);
            },
            activatePointToRectangleDraw: function () {
                this.isPointToRectangleActive = true;
                this.drawToolBar.activate(Draw.POINT);
                this.deactivateNavigation();
            },
            /**
             * activates the point draw for the tasking widget
             */
            activateTaskingDraw: function (mode) {
                this.clear();
                this.drawToolBar.activate(mode);
                this.deactivateNavigation();
            },
            /**
             * deactivates the point draw for the tasking widget
             */
            deactivateTaskingDraw: function () {
                this.activateNavigation();
                if (this.drawToolBar) {
                    this.drawToolBar.deactivate();
                }
            },
            /**
             * sets map navigation enabled
             */
            activateNavigation: function () {
                this.map.enableMapNavigation();
                this.map.enableKeyboardNavigation();
            },
            /**
             * sets map navigation disabled
             */
            deactivateNavigation: function () {
                this.map.disableMapNavigation();
                this.map.disableKeyboardNavigation();
            },
            /**
             * destroys the tasking widget and children
             */
            destroy: function () {
                this.clear();
                this.inherited(arguments);
            },
            /**
             * handler for user point draw end
             * @param evt
             * @private
             */
            _onDrawEnd: function (evt) {
                if (!evt) {
                    return;
                }
                var geometry = evt.geometry;
                if (!geometry) {
                    return;
                }
                if (this.isPointToRectangleActive) {
                    geometry = this.pointToRectangleBuffer(geometry);
                }

                var graphic = this.getGeometryGraphic(geometry);

                this.deactivateTaskingDraw();
                this.emit(this.DRAW_END, graphic);
                this.isPointToRectangleActive = false;
            },
            pointToRectangleBuffer: function (geometry) {
                //create the envelope and hide the point
                var bufferVal =  this.drawConstraints && this.drawConstraints.pointToRectangle &&  this.drawConstraints.pointToRectangle.bufferValue ? this.drawConstraints.pointToRectangle.bufferValue : 5000.005;
                var extent, geodesicCircle = new Circle(geometry, {geodesic: true, radius: bufferVal});
                extent = geodesicCircle.getExtent();
                return extent;
            },
            getGeometryGraphic: function (geometry) {
                var graphic;
                if (geometry instanceof Polygon || geometry instanceof Extent) {
                    graphic = new Graphic(geometry, this.polygonSymbol, null, null);
                }
                else if (geometry instanceof  Point) {
                    graphic = new Graphic(geometry, this.pointSymbol, null, null);
                }
                return graphic;
            },
            setMapGraphic: function (graphic) {
                if (this.currentSearchGraphic) {
                    this.map.graphics.remove(this.currentSearchGraphic);
                }
                this.currentSearchGraphic = graphic;
                this.map.graphics.add(this.currentSearchGraphic);
            },
            getSearchGraphic: function () {
                return this.currentSearchGraphic;
            },

            hideExtentGraphic: function () {
                if (this.currentSearchGraphic) {
                    this.currentSearchGraphic.hide();
                }
            },
            showExtentGraphic: function () {
                if (this.currentSearchGraphic) {
                    this.currentSearchGraphic.show();
                }
            },
            clear: function () {
                this.isPointToRectangleActive = false;
                if (this.currentSearchGraphic) {
                    this.map.graphics.remove(this.currentSearchGraphic);
                    this.currentSearchGraphic = null;
                }
            }
        });
    });