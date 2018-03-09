///////////////////////////////////////////////////////////////////////////
// Copyright (c) 2016 Esri. All Rights Reserved.
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
///////////////////////////////////////////////////////////////////////////
define([
    'dojo/_base/declare',
    'dijit/_WidgetsInTemplateMixin',
    'dojo/text!./Widget.html',
    'jimu/BaseWidget',
    "dijit/registry",
    "dojo/_base/lang",
    "dojo/dom",
    "esri/layers/RasterFunction",
    "dojo/html", "esri/request", "esri/tasks/query", "esri/geometry/geometryEngine",
    "esri/tasks/QueryTask",
    "esri/layers/ArcGISImageServiceLayer", "esri/layers/RasterLayer",
    "esri/layers/ImageServiceParameters",
    "dojo/dom-construct",
    "dojo/i18n!./nls/strings",
    "dojo/dom-style",
    "dijit/form/Select",
    "dijit/form/Button",
    "dijit/form/NumberSpinner",
    "dijit/form/CheckBox",
    "dijit/form/TextBox",
    "dijit/form/DropDownButton",
    "dijit/TooltipDialog",
    "dijit/form/NumberTextBox"

],
        function (
                declare,
                _WidgetsInTemplateMixin,
                template,
                BaseWidget,
                registry,
                lang,
                dom,
                RasterFunction,
                html, esriRequest, Query, geometryEngine, QueryTask,
                ArcGISImageServiceLayer, RasterLayer,
                ImageServiceParameters,
                domConstruct, strings, domStyle) {

            var clazz = declare([BaseWidget, _WidgetsInTemplateMixin], {
                templateString: template,
                name: 'ISChangeDetection',
                baseClass: 'jimu-widget-ISChangeDetection',
                primaryLayer: null,
                secondaryLayer: null,
                number: 0,
                conversionparameters: [0.299, 0.387, 0.314],
                startup: function () {
                    this.inherited(arguments);
                    domConstruct.place('<img id="loadingChangeDetection" style="position: absolute;top:0;bottom: 0;left: 0;right: 0;margin:auto;z-index:100;" src="' + require.toUrl('jimu') + '/images/loading.gif">', this.domNode);
                    this.hideLoading();
                },
                onOpen: function () {
                    this.refreshData();
                },
                refreshData: function () {
                    if (this.map.layerIds) {
                        if (this.map.primaryLayer) {
                            this.primaryLayer = this.map.getLayer(this.map.primaryLayer);
                            if (this.map.secondaryLayer)
                                this.secondaryLayer = this.map.getLayer(this.map.secondaryLayer);
                            else
                                this.secondaryLayer = null;
                        } else {
                            this.layersOnMap = [];
                            for (var a = 0; a < this.map.layerIds.length; a++) {
                                var layerObject = this.map.getLayer(this.map.layerIds[a]);
                                var title = layerObject.arcgisProps && layerObject.arcgisProps.title ? layerObject.arcgisProps.title : layerObject.title;
                                if (layerObject && layerObject.visible && layerObject.serviceDataType && layerObject.serviceDataType.substr(0, 16) === "esriImageService" && layerObject.id !== "resultLayer" && layerObject.id !== "scatterResultLayer" && layerObject.id !== this.map.resultLayer && (!title || ((title).charAt(title.length - 1)) !== "_")) {

                                    this.layersOnMap.push({
                                        layer: layerObject,
                                        id: layerObject.id,
                                        position: a
                                    });
                                }
                            }

                            this.primaryLayer = this.layersOnMap.length > 0 ? this.layersOnMap[this.layersOnMap.length - 1].layer : null;
                            this.secondaryLayer = this.layersOnMap.length > 1 ? this.layersOnMap[this.layersOnMap.length - 2].layer : null;
                        }
                        if (this.secondaryLayer && this.primaryLayer && this.secondaryLayer.url === this.primaryLayer.url) {
                            if ((this.primaryLayer.mosaicRule !== null) && (this.primaryLayer.mosaicRule.lockRasterIds !== null) && (this.secondaryLayer.mosaicRule !== null) && (this.secondaryLayer.mosaicRule.lockRasterIds !== null)) {
                                if (this.primaryLayer.url !== this.prevPrimaryLayer) {
                                    this.populateChangeModes();
                                    this.populateBands();
                                    html.set(this.areaValue,"");
                                }
                                domStyle.set("changeDetectionDisplay", "display", "block");
                                html.set(this.setPrimarySecondaryLayers, "");
                                this.prevPrimaryLayer = this.primaryLayer.url;
                            } else {
                                domStyle.set("changeDetectionDisplay", "display", "none");
                                html.set(this.setPrimarySecondaryLayers, strings.error);
                            }
                        } else {
                            domStyle.set("changeDetectionDisplay", "display", "none");
                            html.set(this.setPrimarySecondaryLayers, strings.error);
                        }
                    }
                },
                populateChangeModes: function () {
                    registry.byId("method").removeOption(registry.byId("method").getOptions());
                    registry.byId("method").addOption({label: "Difference", value: "difference"});

                    for (var a in this.config) {
                        if (a === this.primaryLayer.url.split('//')[1]) {
                            if (this.config[a].veg) {
                                registry.byId("method").addOption({label: "Vegetation Index", value: "ndvi"});

                            }
                            if (this.config[a].savi) {
                                registry.byId("method").addOption({label: "Soil Adjusted Veg. Index", value: "savi"});
                            }
                            if (this.config[a].water) {
                                registry.byId("method").addOption({label: "Water Index", value: "water"});
                            }
                            if (this.config[a].burn) {
                                registry.byId("method").addOption({label: "Burn Index", value: "burn"});
                            }
                            break;
                        }
                    }
                    domStyle.set("bandInputs", "display", "none");
                    domStyle.set(this.changeMode, "display", "none");
                    registry.byId("changeModeList").set("value", "image");
                },
                populateBands: function () {
                    this.bandNames = [];
                    registry.byId("band1").removeOption(registry.byId("band1").getOptions());
                    registry.byId("band2").removeOption(registry.byId("band2").getOptions());
                    var layersRequest = esriRequest({
                        url: this.primaryLayer.url + "/1/info/keyProperties",
                        content: {f: "json"},
                        handleAs: "json",
                        callbackParamName: "callback"
                    });

                    layersRequest.then(lang.hitch(this, function (response) {

                        var bandProp = response.BandProperties;
                        if (bandProp) {
                            for (var i = 0; i < this.primaryLayer.bandCount; i++) {
                                if (bandProp[i] && bandProp[i].BandName) {
                                    this.bandNames[i] = bandProp[i].BandName;
                                } else {
                                    var num = i + 1;
                                    this.bandNames[i] = "Band_" + num.toString();
                                }

                            }
                        } else {
                            for (var i = 0; i < this.primaryLayer.bandCount; i++) {
                                var num = i + 1;
                                this.bandNames[i] = "Band_" + num.toString();
                            }
                        }
                        this.populateBandsContinue();

                    }), lang.hitch(this, function () {
                        for (var i = 0; i < this.primaryLayer.bandCount; i++) {
                            var num = i + 1;
                            this.bandNames[i] = "Band_" + num.toString();
                        }
                        this.populateBandsContinue();
                    }));
                },
                populateBandsContinue: function () {
                    for (var a in this.bandNames) {
                        registry.byId("band1").addOption({label: this.bandNames[a], value: (parseInt(a) + 1)});
                        registry.byId("band2").addOption({label: this.bandNames[a], value: (parseInt(a) + 1)});
                    }
                    this.setBandValues();
                },
                setBandValues: function () {
                    this.initialVal_nir = "";
                    this.initialVal_red = "";
                    this.initialVal_swir = "";
                    this.initialVal_green = "";
                    var nirExp = new RegExp(/N[a-z]*I[a-z]*R[_]?[1]?/i);
                    var redExp = new RegExp(/red/i);
                    var swirExp = new RegExp(/S[a-z]*W[a-z]*I[a-z]*R[_]?[1]?/i);
                    var greenExp = new RegExp(/green/i);
                    for (var i in this.bandNames) {
                        if (this.initialVal_nir === "" && nirExp.test(this.bandNames[i]))
                        {
                            this.initialVal_nir = parseInt(i) + 1;
                        }
                        if (this.initialVal_red === "" && redExp.test(this.bandNames[i]))
                        {
                            this.initialVal_red = parseInt(i) + 1;
                        }
                        if (this.initialVal_swir === "" && swirExp.test(this.bandNames[i]))
                        {
                            this.initialVal_swir = parseInt(i) + 1;
                        }
                        if (this.initialVal_green === "" && greenExp.test(this.bandNames[i])) {
                            this.initialVal_green = parseInt(i) + 1;
                        }
                    }
                },
                postCreate: function () {
                    registry.byId("method").on("change", lang.hitch(this, function (value) {
                        if (value === "difference") {
                            domStyle.set("bandInputs", "display", "none");
                            domStyle.set(this.changeMode, "display", "none");
                            domStyle.set(this.maskRangeSpinners, "display", "none");
                            domStyle.set(this.thresholdRangeSpinners, "display", "none");
                            domStyle.set(this.areaValueContainer, "display", "none");
                        } else {
                            domStyle.set(this.areaValue, "color", "magenta");
                            html.set(this.areaValueLabel, "Area Decrease / Increase:");

                            if (value === "ndvi" || value === "savi") {
                                document.getElementById("bandName1").innerHTML = "Infrared Band";
                                document.getElementById("bandName2").innerHTML = "Red Band";
                            } else if (value === "water") {
                                document.getElementById("bandName1").innerHTML = "Green Band";
                                document.getElementById("bandName2").innerHTML = "Short-wave Infrared Band";
                            } else {
                                document.getElementById("bandName1").innerHTML = "Infrared Band";
                                document.getElementById("bandName2").innerHTML = "Short-wave Infrared Band";
                                html.set(this.areaValueLabel, "Burnt / Post Fire Regrowth Area:");
                                domStyle.set(this.areaValue, "color", "#fc6d31");
                            }

                            domStyle.set(this.changeMode, "display", "block");
                            domStyle.set("bandInputs", "display", "block");
                            if (registry.byId("changeModeList").get("value") === "mask")
                            {
                                domStyle.set(this.maskRangeSpinners, "display", "block");
                                domStyle.set(this.thresholdRangeSpinners, "display", "none");
                                domStyle.set(this.areaValueContainer, "display", "block");
                            } else if (registry.byId("changeModeList").get("value") === "threshold") {
                                domStyle.set(this.maskRangeSpinners, "display", "none");
                                domStyle.set(this.thresholdRangeSpinners, "display", "block");
                                domStyle.set(this.areaValueContainer, "display", "block")
                            } else {
                                domStyle.set(this.maskRangeSpinners, "display", "none");
                                domStyle.set(this.thresholdRangeSpinners, "display", "none");
                                domStyle.set(this.areaValueContainer, "display", "none")
                            }
                            this.setBands(value);
                        }
                    }));
                    registry.byId("positiveRange").on("change", lang.hitch(this, function () {
                        if (this.map.getLayer("resultLayer"))
                            this.map.getLayer("resultLayer").redraw();
                    }));
                    registry.byId("negativeRange").on("change", lang.hitch(this, function () {
                        if (this.map.getLayer("resultLayer"))
                            this.map.getLayer("resultLayer").redraw();
                    }));
                    registry.byId("thresholdValue").on("change", lang.hitch(this, function () {
                        if (this.map.getLayer("resultLayer"))
                            this.map.getLayer("resultLayer").redraw();
                    }));
                    registry.byId("differenceValue").on("change", lang.hitch(this, function () {
                        if (this.map.getLayer("resultLayer"))
                            this.map.getLayer("resultLayer").redraw();
                    }));
                    registry.byId("changeDetectionApply").on("click", lang.hitch(this, this.getMinMaxCheck));
                    if (this.map) {
                        this.map.on("update-end", lang.hitch(this, this.refreshData));
                        this.map.on("update-start", lang.hitch(this, this.showLoading));
                        this.map.on("update-end", lang.hitch(this, this.hideLoading));
                    }
                    registry.byId("band1").on("change", lang.hitch(this, function (value) {
                        if (value === registry.byId("band2").get("value"))
                            registry.byId("changeDetectionApply").set("disabled", true);
                        else
                            registry.byId("changeDetectionApply").set("disabled", false);
                    }));
                    registry.byId("band2").on("change", lang.hitch(this, function (value) {
                        if (value === registry.byId("band1").get("value"))
                            registry.byId("changeDetectionApply").set("disabled", true);
                        else
                            registry.byId("changeDetectionApply").set("disabled", false);
                    }));
                    registry.byId("changeModeList").on("change", lang.hitch(this, function (value) {
                        if (value === "mask") {
                            domStyle.set(this.maskRangeSpinners, "display", "block");
                            domStyle.set(this.thresholdRangeSpinners, "display", "none");
                            domStyle.set(this.areaValueContainer, "display", "block")
                        } else if (value === "threshold") {
                            domStyle.set(this.maskRangeSpinners, "display", "none");
                            domStyle.set(this.thresholdRangeSpinners, "display", "block");
                            domStyle.set(this.areaValueContainer, "display", "block")
                        } else {
                            domStyle.set(this.maskRangeSpinners, "display", "none");
                            domStyle.set(this.thresholdRangeSpinners, "display", "none");
                            domStyle.set(this.areaValueContainer, "display", "none")
                        }
                    }));
                },
                setBands: function (value) {
                    if ((value === "ndvi" || value === "savi") && this.initialVal_red && this.initialVal_nir)
                    {
                        registry.byId("band1").set("value", this.initialVal_nir);
                        registry.byId("band2").set("value", this.initialVal_red);
                    } else if (value === "water" && this.initialVal_green && this.initialVal_swir) {
                        registry.byId("band1").set("value", this.initialVal_green);
                        registry.byId("band2").set("value", this.initialVal_swir);
                    } else if (value === "burn" && this.initialVal_nir && this.initialVal_swir) {
                        registry.byId("band1").set("value", this.initialVal_nir);
                        registry.byId("band2").set("value", this.initialVal_swir);
                    } else {
                        registry.byId("band1").set("value", "1");
                        registry.byId("band2").set("value", "2");
                    }
                },
                getMinMaxCheck: function () {
                    var method = registry.byId("method").get("value");
                    if (method !== "difference") {
                        var request = new esriRequest({
                            url: this.primaryLayer.url,
                            content: {
                                f: "json"
                            },
                            handleAs: "json",
                            callbackParamName: "callback"
                        });
                        request.then(lang.hitch(this, function (prop) {
                            var band1Index = Math.abs(parseInt(registry.byId("band1").get("value")));
                            var band2Index = Math.abs(parseInt(registry.byId("band2").get("value")));

                            if (prop.minValues && prop.minValues.length > 0 && prop.minValues[0] && prop.minValues.length > band1Index) {
                                this.min1 = prop.minValues[band1Index];
                                this.min2 = prop.minValues[band2Index];
                            } else {
                                this.min1 = 0;
                                this.min2 = 0;
                            }
                            if (prop.maxValues && prop.maxValues.length > 0 && prop.maxValues[0] && prop.maxValues.length > band1Index) {
                                this.max1 = prop.maxValues[band1Index];
                                this.max2 = prop.maxValues[band2Index];
                            } else {
                                this.max1 = 1;
                                this.max2 = 1;
                            }
                            this.detectChange();
                        }), lang.hitch(this, function () {
                            this.min1 = 0;
                            this.max1 = 1;
                            this.min2 = 0;
                            this.max2 = 1;
                            this.detectChange();
                        }));
                    } else
                        this.detectChange();
                },
                detectChange: function () {

                    var raster1, raster2, raster2, raster3, args1 = {}, args2 = {}, args = {}, changeDetectionLayer, params;
                    var method = registry.byId("method").get("value");
                    if (this.map.getLayer("resultLayer")) {
                        this.map.getLayer("resultLayer").suspend();
                        this.map.removeLayer(this.map.getLayer('resultLayer'));
                        this.refreshData();
                    }
                    domStyle.set("changeDetectionDisplay", "display", "block");
                    html.set(this.setPrimarySecondaryLayers, "");

                    if (method === "difference") {
                        raster1 = new RasterFunction();
                        raster1.functionName = "Grayscale";
                        args1.Raster = "$" + this.primaryLayer.mosaicRule.lockRasterIds[0];
                        args1.ConversionParameters = this.conversionparameters;
                        raster1.functionArguments = args1;

                        raster2 = new RasterFunction();
                        raster2.functionName = "Grayscale";
                        args2.Raster = "$" + this.secondaryLayer.mosaicRule.lockRasterIds[0];
                        args2.ConversionParameters = this.conversionparameters;
                        raster2.functionArguments = args2;

                        raster3 = new RasterFunction();
                        raster3.functionName = "Arithmetic";
                        raster3.outputPixelType = "F32";
                        args.Raster = raster1;
                        args.Raster2 = raster2;
                        args.Operation = "2";
                        args.ExtentType = 0;
                        args.CellsizeType = 1;
                        raster3.functionArguments = args;

                        var raster4 = new RasterFunction();
                        raster4.functionName = "Stretch";
                        raster4.outputPixelType = "U8";
                        var args4 = {};
                        args4.StretchType = 6;
                        args4.MinPercent = 2.0;
                        args4.MaxPercent = 2.0;
                        args4.Gamma = [1.25, 1.25, 1.25];
                        args4.DRA = true;
                        args4.Min = 0;
                        args4.Max = 255;
                        args4.Raster = raster3;
                        raster4.functionArguments = args4;
                        raster3 = raster4;
                    } else {
                        var changeMode = registry.byId("changeModeList").get("value");
                        var band1 = "B" + (Math.abs(parseInt(registry.byId("band1").get("value"))));
                        var band2 = "B" + (Math.abs(parseInt(registry.byId("band2").get("value"))));
                        var value1 = this.max1 - this.min1;
                        var value2 = this.max2 - this.min2;


                        if (method !== "savi") {
                            var indexFormula = "((" + value2 + "*(" + band1 + "-" + this.min1 + "))+(" + value1 + "*(" + this.min2 + "-" + band2 + ")))/((" + value2 + "*(" + band1 + "-" + this.min1 + "))+(" + value1 + "*(" + band2 + "-" + this.min2 + ")))";
                        } else {
                            var indexFormula = "1.5 * ((" + value2 + "*(" + band1 + "-" + this.min1 + "))+(" + value1 + "*(" + this.min2 + "-" + band2 + ")))/((" + value2 + "*(" + band1 + "-" + this.min1 + "))+(" + value1 + "*(" + band2 + "-" + this.min2 + "))+(0.5*" + value1 + "*" + value2 + "))";
                        }

                        raster1 = new RasterFunction();
                        raster1.functionName = "BandArithmetic";
                        args1.Method = 0;
                        args1.Raster = "$" + this.primaryLayer.mosaicRule.lockRasterIds[0];
                        args1.BandIndexes = indexFormula;
                        raster1.functionArguments = args1;
                        raster1.outputPixelType = "F32";

                        raster2 = new RasterFunction();
                        raster2.functionName = "BandArithmetic";
                        args2.Method = 0;
                        args2.Raster = "$" + this.secondaryLayer.mosaicRule.lockRasterIds[0];
                        args2.BandIndexes = indexFormula;
                        raster2.functionArguments = args2;
                        raster2.outputPixelType = "F32";

                        if (changeMode === "image") {
                            raster3 = new RasterFunction();
                            raster3.functionName = "CompositeBand";
                            raster3.outputPixelType = "F32";
                            args.Rasters = [raster2, raster1, raster2];
                            raster3.functionArguments = args;

                            var stretch = new RasterFunction();
                            stretch.functionName = "Stretch";
                            stretch.outputPixelType = "U8";
                            var stretchArg = {};
                            stretchArg.StretchType = 3;
                            stretchArg.NumberOfStandardDeviations = 3;
                            stretchArg.DRA = true;
                            stretchArg.Min = 0;
                            stretchArg.Max = 255;
                            stretchArg.Raster = raster3;
                            stretch.functionArguments = stretchArg;
                            raster3 = stretch;
                        } else if (changeMode === "mask") {
                            var raster3 = new RasterFunction();
                            var arithmeticArg = {};
                            raster3.functionName = "Arithmetic";
                            arithmeticArg.Raster = raster1;
                            arithmeticArg.Raster2 = raster2;
                            arithmeticArg.Operation = 2;
                            arithmeticArg.ExtentType = 1;
                            arithmeticArg.CellsizeType = 0;
                            raster3.outputPixelType = "F32";
                            raster3.functionArguments = arithmeticArg;
                        } else {
                            var raster3 = new RasterFunction();
                            var compositeArg = {};
                            raster3.functionName = "CompositeBand";
                            compositeArg.Rasters = [raster1, raster2];
                            raster3.outputPixelType = "F32";
                            raster3.functionArguments = compositeArg;
                        }
                    }


                    var query = new Query();
                    query.where = "(OBJECTID = " + this.primaryLayer.mosaicRule.lockRasterIds[0] + ") OR (OBJECTID = " + this.secondaryLayer.mosaicRule.lockRasterIds[0] + ")";
                    query.returnGeometry = true;
                    var queryTask = new QueryTask(this.primaryLayer.url);
                    queryTask.execute(query, lang.hitch(this, function (result) {

                        var intersectGeometry = geometryEngine.intersect(result.features[0].geometry, result.features[1].geometry);
                        if (intersectGeometry) {
                            intersectGeometry.cache = undefined;
                            var rasterClip = new RasterFunction();
                            rasterClip.functionName = "Clip";
                            var clipArguments = {};
                            clipArguments.ClippingGeometry = intersectGeometry;
                            clipArguments.ClippingType = 1;
                            clipArguments.Raster = raster3;
                            rasterClip.functionArguments = clipArguments;
                            raster3 = rasterClip;
                        }
                        this.addChangeLayer(raster3, method, changeMode);
                    }), lang.hitch(this, function () {
                        this.addChangeLayer(raster3, method, changeMode);
                    }));
                },
                addChangeLayer: function (raster3, method, changeMode) {
                    var params = new ImageServiceParameters();
                    params.renderingRule = raster3;
                    console.log(raster3);
                    if (changeMode === "image" || method === "difference") {
                        changeDetectionLayer = new ArcGISImageServiceLayer(
                                this.primaryLayer.url,
                                {
                                    id: "resultLayer",
                                    imageServiceParameters: params
                                });
                    } else {
                        var xdistance = this.map.extent.xmax - this.map.extent.xmin;
                        var ydistance = this.map.extent.ymax - this.map.extent.ymin;
                        this.pixelSizeX = xdistance / this.map.width;
                        this.pixelSizeY = ydistance / this.map.height;
                        var latitude = ((this.map.extent.getCenter()).getLatitude() * Math.PI) / 180;
                        this.scale = Math.pow((1 / Math.cos(latitude)), 2);
                        params.format = "lerc";
                        var changeDetectionLayer = new RasterLayer(
                                this.primaryLayer.url,
                                {
                                    id: "resultLayer",
                                    imageServiceParameters: params,
                                    pixelFilter: lang.hitch(this, this.maskPixels)
                                });
                        changeDetectionLayer.on("load", lang.hitch(this, function () {
                            changeDetectionLayer.pixelType = "F32";
                        }));
                    }
                    changeDetectionLayer.title = "Result__Change_" + this.number;
                    changeDetectionLayer.changeMethod = method;
                    changeDetectionLayer.changeMode = changeMode;

                    for (var a = this.map.layerIds.length - 1; a >= 0; a--) {
                        if (this.primaryLayer.id === this.map.layerIds[a]) {
                            var index = a + 1;
                            break;
                        }
                    }
                    this.map.addLayer(changeDetectionLayer, index);
                },
                maskPixels: function (pixelData) {


                    if (pixelData === null || pixelData.pixelBlock === null)
                        return;
                    var numPixels = pixelData.pixelBlock.width * pixelData.pixelBlock.height;
                    if (!pixelData.pixelBlock.mask) {
                        pixelData.pixelBlock.mask = new Uint8Array(numPixels);
                    }

                    if (pixelData.pixelBlock.pixels === null)
                        return;
                    var pr = new Uint8Array(numPixels);
                    var pg = new Uint8Array(numPixels);
                    var pb = new Uint8Array(numPixels);
                    var areaLeft = 0, areaRight = 0;
                    var color = registry.byId("method").get("value") === "burn" ? [255, 69, 0] : [255, 0, 255];
                    if (registry.byId("changeModeList").get("value") === "mask") {
                        var pixelScene = pixelData.pixelBlock.pixels[0];
                        var nodata = (pixelData.pixelBlock.statistics[0] && pixelData.pixelBlock.statistics[0].noDataValue) ? pixelData.pixelBlock.statistics[0].noDataValue : 0;
                        var positiveDif = registry.byId("positiveRange").get("value");
                        var negativeDif = registry.byId("negativeRange").get("value");

                        for (var i = 0; i < numPixels; i++) {

                            if (pixelScene[i] === nodata) {
                                pixelData.pixelBlock.mask[i] = 0;
                            } else if (pixelScene[i] <= negativeDif) {

                                pr[i] = color[0];
                                pg[i] = color[1];
                                pb[i] = color[2];
                                pixelData.pixelBlock.mask[i] = 1;
                                areaLeft++;
                            } else if (pixelScene[i] >= positiveDif) {
                                pr[i] = 0;
                                pg[i] = 252;
                                pb[i] = 0;
                                pixelData.pixelBlock.mask[i] = 1;
                                areaRight++;
                            } else
                                pixelData.pixelBlock.mask[i] = 0;
                        }
                    } else {
                        var pixelScene1 = pixelData.pixelBlock.pixels[0];
                        var pixelScene2 = pixelData.pixelBlock.pixels[1];
                        var threshold = registry.byId("thresholdValue").get("value");
                        var differenceThreshold = registry.byId("differenceValue").get("value");
                        var noData1 = (pixelData.pixelBlock.statistics[0] && pixelData.pixelBlock.statistics[0].noDataValue) ? pixelData.pixelBlock.statistics[0].noDataValue : 0;
                        var noData2 = (pixelData.pixelBlock.statistics[1] && pixelData.pixelBlock.statistics[1].noDataValue) ? pixelData.pixelBlock.statistics[1].noDataValue : 0;


                        for (var i = 0; i < numPixels; i++) {
                            if (pixelScene1[i] === noData1 || pixelScene2[i] === noData2) {
                                pixelData.pixelBlock.mask[i] = 0;
                            } else {
                                if (pixelScene1[i] > 10)
                                    pixelScene1[i] = 0;
                                if (pixelScene2[i] > 10)
                                    pixelScene2[i] = 0;
                                if (pixelScene1[i] < threshold && pixelScene2[i] > threshold && (pixelScene2[i] - pixelScene1[i]) > differenceThreshold) {
                                    pixelData.pixelBlock.mask[i] = 1;
                                    pr[i] = color[0];
                                    pg[i] = color[1];
                                    pb[i] = color[2];
                                    areaLeft++;
                                } else if (pixelScene1[i] > threshold && pixelScene2[i] < threshold && (pixelScene1[i] - pixelScene2[i]) > differenceThreshold) {
                                    pixelData.pixelBlock.mask[i] = 1;

                                    pr[i] = 0;
                                    pg[i] = 252;
                                    pb[i] = 0;
                                    areaRight++;

                                } else
                                    pixelData.pixelBlock.mask[i] = 0;
                            }
                        }
                    }
                    html.set(this.areaValue, ((areaLeft * this.pixelSizeX * this.pixelSizeY) / (1000000 * this.scale)).toFixed(3) + " km<sup>2</sup> <span style='color:black;'>/</span> <span style='color:green;'>" + ((areaRight * this.pixelSizeX * this.pixelSizeY) / (1000000 * this.scale)).toFixed(3) + " km<sup>2</sup></span>");
                    pixelData.pixelBlock.pixels = [pr, pg, pb];
                    pixelData.pixelBlock.pixelType = "U8";

                },
                checkMinMax: function (min, max) {
                    var temp = min;
                    min = max;
                    max = temp;
                    return [min, max];
                },
                showLoading: function () {
                    domStyle.set("loadingChangeDetection", "display", "block");
                },
                hideLoading: function () {
                    domStyle.set("loadingChangeDetection", "display", "none");
                }
            });
            clazz.hasLocale = false;
            clazz.hasSettingPage = false;
            clazz.hasSettingUIFile = false;
            clazz.hasSettingLocale = false;
            clazz.hasSettingStyle = false;
            return clazz;
        });