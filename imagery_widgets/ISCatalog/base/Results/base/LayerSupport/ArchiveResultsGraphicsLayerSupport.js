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
    "esri/layers/GraphicsLayer",
    "esri/symbols/SimpleFillSymbol",
    "esri/symbols/SimpleLineSymbol",
    "dojo/_base/Color",
    "esri/graphic",
    "dojo/_base/array",
    "esri/geometry/screenUtils",
    "dojo/Evented",
    "../../../BaseDiscoveryMixin",
    "esri/symbols/PictureMarkerSymbol",
    "./ThumbnailGraphicsLayer"
],
    function (declare, lang, GraphicsLayer, SimpleFillSymbol, SimpleLineSymbol, Color, Graphic, array, screenUtils, Evented, BaseDiscoveryMixin, PictureMarkerSymbol, ThumbnailGraphicsLayer) {
        return declare([Evented, BaseDiscoveryMixin], {
            ON_GRAPHIC_HIGHLIGHT: "onGraphicHighlight",
            constructor: function (params) {
                this.currentSearchGeometry = null;
                this.thumbnailsOnTheMapByThumbUrl = {};
                this.extentGeometriesOnTheMapByResultId = {};
                this.map = params.map;
                this._initSymbology();
                this._setupMapLayers();
            },
            _setupMapLayers: function () {
                //create graphics layer
                this.thumnailGraphicsLayer = new ThumbnailGraphicsLayer();
                this.map.addLayer(this.thumnailGraphicsLayer);
                this.footprintGraphicsLayer = new GraphicsLayer();
                this.map.addLayer(this.footprintGraphicsLayer);
                this.currentPageGeometriesLayer = new GraphicsLayer();
                this.map.addLayer(this.currentPageGeometriesLayer);
//                this.map.on("zoom-end", lang.hitch(this, this._reloadThumbnails));
                this.currentPageGeometriesLayer.on("click", lang.hitch(this, this._handleGraphicClick));
            },
            /**
             * clears all result graphics
             */
            clear: function () {
                if (this.currentPageGeometriesLayer) {
                    this.currentPageGeometriesLayer.clear();
                }
                if (this.footprintGraphicsLayer) {
                    this.footprintGraphicsLayer.clear();
                }
                if (this.thumnailGraphicsLayer) {
                    this.thumnailGraphicsLayer.clear();
                }
                this.currentGraphicHighlight = null;
                this.extentGeometriesOnTheMapByResultId = {};
            },
            /**
             * setup the symbology for the result graphics
             * @private
             */
            _initSymbology: function () {
                //setup custom symbol
                this.highlightSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
                    new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                        new Color([223, 0, 0]), 2), new Color([255, 0, 0, 0]));
                this.defaultSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
                    new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                        new Color([0, 0, 255]), 1), new Color([255, 0, 0, 0]));
                this.shadedSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
                    new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                        new Color([0, 0, 255]), 1), new Color([255, 255, 0, 0.4]));
            },
            /**
             * called when the result graphics layer is clicked
             * @param event
             * @private
             */
            _handleGraphicClick: function (event) {
                if (event && event.graphic && event.graphic.attributes) {
                    this.highlightGraphic(event.graphic);

                }
            },
            highlightGraphic: function (graphic) {
                if (this.currentGraphicHighlight) {
                    this.currentGraphicHighlight.setSymbol(this.defaultSymbol);
                    this.currentGraphicHighlight = null;

                }
                this.map.centerAt(graphic.geometry.getCentroid());
                graphic.setSymbol(this.highlightSymbol);
                this.currentGraphicHighlight = graphic;
            },
            showFootprints: function () {
                this.currentPageGeometriesLayer.show();
            },
            hideFootprints: function () {
                this.currentPageGeometriesLayer.hide();
            },
            /**
             * adds all of the item footprints to the map
             * @param features
             */
            addFeatures: function (features) {
                array.forEach(features, lang.hitch(this, function (feature) {
                    if (feature && feature.geometry) {
                        this.currentPageGeometriesLayer.add(new Graphic(feature.geometry, this.defaultSymbol, feature.attributes));
                    }
                }));
            },
            showThumbnail: function (feature) {
                var graphic, thumbnailUrl;
                if (feature) {
                    if (feature[this.COMMON_FIELDS.SHOW_THUMB_ON_HOVER]) {
                        var
                            centerPoint,
                            screenGeom,
                            screenWidth,
                            screenHeight,
                            symbol,
                            extent;
                        thumbnailUrl = feature[this.COMMON_FIELDS.THUMBNAIL_FIELD];
                        extent = feature.geometry.getExtent();
                        centerPoint = extent.getCenter();
                        screenGeom = screenUtils.toScreenGeometry(this.map.extent, this.map.width, this.map.height, extent);
                        screenWidth = Math.abs(screenGeom.xmax - screenGeom.xmin);
                        screenHeight = Math.abs(screenGeom.ymax - screenGeom.ymin);
                        symbol = new PictureMarkerSymbol(thumbnailUrl, screenWidth, screenHeight);
                        graphic = new Graphic(centerPoint, symbol, feature.attributes);
                        graphic._intersectExtent = extent;
                        this.thumbnailsOnTheMapByThumbUrl[thumbnailUrl] = {feature: feature, thumbnailUrl: thumbnailUrl, graphic: graphic};
                        this.thumnailGraphicsLayer.add(graphic);
                    }
                }
            },

            showExtentGeometry: function (feature) {
                this.clearExtentGeometries();
                var graphic;
                if (feature) {
                    graphic = new Graphic(feature.geometry, this.shadedSymbol, feature.attributes);
                    this.extentGeometriesOnTheMapByResultId[feature[this.COMMON_FIELDS.RESULT_ID_FIELD]] = graphic;
                    this.footprintGraphicsLayer.add(graphic);
                    //show the image on the map
                }
            },
            clearMapThumbnails: function () {
                if (this.thumnailGraphicsLayer) {
                    this.thumnailGraphicsLayer.clear();
                }
                this.thumbnailsOnTheMapByThumbUrl = {};
            },
            clearExtentGeometries: function () {
                if (this.footprintGraphicsLayer) {
                    this.footprintGraphicsLayer.clear();
                }
                this.extentGeometriesOnTheMapByResultId = {};
            },
            /**
             * removes the items thumbnail from the map
             * @param thumbnailUrl
             */
            removeThumbnail: function (thumbnailUrl) {
                var graphicItem;
                graphicItem = this.thumbnailsOnTheMapByThumbUrl[thumbnailUrl];
                if (graphicItem && graphicItem.graphic) {
                    this.thumnailGraphicsLayer.remove(graphicItem.graphic);
                    delete this.thumbnailsOnTheMapByThumbUrl[graphicItem.thumbnailUrl];
                }
            }

        });
    })
;