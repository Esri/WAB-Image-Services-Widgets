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

//TODO: this can be cleaned up a lot by using common methods that retrieve data over all report modes

define([
    "dojo/_base/declare",
    "esri/map",
    "dojo/dom-construct",
    "dojo/_base/lang",
    "dojo/dom",
    "esri/layers/ArcGISTiledMapServiceLayer",
    "esri/layers/MosaicRule",
    "esri/layers/ArcGISImageServiceLayer",
    "esri/layers/RasterFunction",
    "esri/geometry/Extent"
],
    function (declare,  Map, domConstruct, lang, dom, ArcGISTiledMapServiceLayer, MosaicRule, ArcGISImageServiceLayer, RasterFunction, Extent) {
        return declare(
            [],
            {

                ignoreFields: ["Shape_Area", "Shape_Length"],
                constructor: function (params) {
                    lang.mixin(this, params || {});
                    if (this.mapParameters != null) {
                        this.createMap();
                    }
                    if (this.tableParameters != null && this.tableParameters.displayFields != null) {
                        this.createTable();

                    }
                },
                createTable: function () {
                    var i;
                    var displayFieldLabels = [];
                    var currentLabel;
                    var tableBody = dom.byId(this.tableBodyId);
                    var tableHdRow;
                    var th;
                    if (this.tableParameters.hasSourceField) {
                        tableHdRow = dom.byId(this.tableHeaderRowId);
                        th = domConstruct.create("th", {innerHTML: "Source"});
                        domConstruct.place(th, tableHdRow);
                    }
                    for (i = 0; i < this.tableParameters.displayFields.length; i++) {
                        currentLabel = this.tableParameters.displayFields[i].label;
                        displayFieldLabels.push(currentLabel);
                        tableHdRow = dom.byId(this.tableHeaderRowId);
                        th = domConstruct.create("th", {innerHTML: currentLabel});
                        domConstruct.place(th, tableHdRow);
                    }
                    if (this.tableParameters.tableDataArray.length > 0) {
                        var currentTableData;
                        var currentFeatureSet;
                        var currentFeatures;
                        var currentAttributes;
                        var fieldValue;
                        for (i = 0; i < this.tableParameters.tableDataArray.length; i++) {
                            currentTableData = this.tableParameters.tableDataArray[i];
                            currentFeatureSet = currentTableData.featureSet;
                            currentFeatures = currentFeatureSet.features;
                            for (var j = 0; j < currentFeatures.length; j++) {
                                currentAttributes = currentFeatures[j].attributes;
                                var tr = domConstruct.create("tr");
                                domConstruct.place(tr, tableBody);
                                var td;
                                if (this.tableParameters.hasSourceField) {
                                    td = domConstruct.create("td", {innerHTML: currentTableData.source});
                                    domConstruct.place(td, tr);
                                }
                                for (var k = 0; k < displayFieldLabels.length; k++) {
                                    fieldValue = this._getFieldValue(displayFieldLabels[k], currentAttributes);
                                    td = domConstruct.create("td", {innerHTML: fieldValue});
                                    domConstruct.place(td, tr);
                                }
                            }

                        }
                    }
                },
                _getFieldValue: function (label, attributes) {
                    return attributes[label] != null ? attributes[label].toString() : "";
                },
                createMap: function () {
                    var passedExtent = this.mapParameters.extent;
                    var mapParams = {
                        slider: false,
                        showEsriLogo: false

                    };
                    mapParams.extent = new Extent({
                        xmin: passedExtent.xmin,
                        ymin: passedExtent.ymin,
                        xmax: passedExtent.xmax,
                        ymax: passedExtent.ymax,
                        spatialReference: passedExtent.spatialReference
                    });

                    var map = new Map(this.mapDivId, mapParams);
                    //Add the imagery layer to the map. View the ArcGIS Online site for services http://arcgisonline/home/search.html?t=content&f=typekeywords:service
                    var basemap = new ArcGISTiledMapServiceLayer(this.mapParameters.basemap);
                    map.addLayer(basemap);

                    //Add the image service Layers
                    var currentDisplayData;
                    for (var i = 0; i < this.mapParameters.displayData.length; i++) {
                        currentDisplayData = this.mapParameters.displayData[i];
                        var catalogLayer = new ArcGISImageServiceLayer(currentDisplayData.layerUrl);
                        var mr = new MosaicRule();
                        mr.method = MosaicRule.METHOD_LOCKRASTER;
                        mr.ascending = true;
                        mr.operation = "MT_FIRST";
                        mr.lockRasterIds = currentDisplayData.objectIds.split(",");
                        catalogLayer.setMosaicRule(mr);
                        if (this.mapParameters.rasterFunctionName) {
                            var rasterFunction = new RasterFunction();
                            rasterFunction.functionName = this.mapParameters.rasterFunctionName;
                            catalogLayer.setRenderingRule(rasterFunction);
                        }
                        map.addLayer(catalogLayer);
                        if (i == 0) {
                            //3.6
                            /*
                             con.connect(map, "onLoad", function (map) {
                             //disable everything on the map
                             map.disableMapNavigation();
                             map.disablePan();
                             });
                             */
                            map.on("load", function (evt) {
                                if (evt == null || evt.map == null) {
                                    return;
                                }
                                var map = evt.map;
                                //disable everything on the map
                                map.disableMapNavigation();
                                map.disablePan();
                            });
                        }
                    }
                }
            });
    });