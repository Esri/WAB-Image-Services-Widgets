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
    "esri/layers/ArcGISImageServiceLayer",
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
                ArcGISImageServiceLayer,
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
                    domStyle.set(this.maskRangeSpinners, "display", "none");
                    domStyle.set(this.thresholdRangeSpinners, "display", "none");
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
                        } else {
                            if (value === "ndvi" || value === "savi") {
                                document.getElementById("bandName1").innerHTML = "Infrared Band";
                                document.getElementById("bandName2").innerHTML = "Red Band";
                            } else if (value === "water") {
                                document.getElementById("bandName1").innerHTML = "Green Band";
                                document.getElementById("bandName2").innerHTML = "Short-wave Infrared Band";
                            } else {
                                document.getElementById("bandName1").innerHTML = "Infrared Band";
                                document.getElementById("bandName2").innerHTML = "Short-wave Infrared Band";
                            }
                            domStyle.set(this.changeMode, "display", "block");
                            domStyle.set("bandInputs", "display", "block");
                            if (registry.byId("changeModeList").get("value") === "mask")
                            {
                                domStyle.set(this.maskRangeSpinners, "display", "block");
                                domStyle.set(this.thresholdRangeSpinners, "display", "none");
                            } else if (registry.byId("changeModeList").get("value") === "threshold") {
                                domStyle.set(this.maskRangeSpinners, "display", "none");
                                domStyle.set(this.thresholdRangeSpinners, "display", "block");
                            } else {
                                domStyle.set(this.maskRangeSpinners, "display", "none");
                                domStyle.set(this.thresholdRangeSpinners, "display", "none");
                            }
                            this.setBands(value);
                        }
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
                        } else if (value === "threshold") {
                            domStyle.set(this.maskRangeSpinners, "display", "none");
                            domStyle.set(this.thresholdRangeSpinners, "display", "block");
                        } else {
                            domStyle.set(this.maskRangeSpinners, "display", "none");
                            domStyle.set(this.thresholdRangeSpinners, "display", "none");
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
                            var arithmetic = new RasterFunction();
                            arithmetic.functionName = "Arithmetic";
                            var arithmeticArg = {};
                            arithmeticArg.Operation = 2;
                            arithmeticArg.ExtentType = 1;
                            arithmeticArg.CellsizeType = 0;
                            arithmeticArg.Raster = raster1;
                            arithmeticArg.Raster2 = raster2;
                            arithmetic.functionArguments = arithmeticArg;
                            arithmetic.outputPixelType = "F32";

                            var positiveRange = [registry.byId("positiveRangeMin").get("value"), registry.byId("positiveRangeMax").get("value")];
                            var negativeRange = [registry.byId("negativeRangeMin").get("value"), registry.byId("negativeRangeMax").get("value")];
                            if (positiveRange[0] > positiveRange[1])
                                positiveRange = this.swapMinMax(positiveRange[0], positiveRange[1]);
                            if (negativeRange[0] > negativeRange[1])
                                negativeRange = this.swapMinMax(negativeRange[0], negativeRange[1]);

                            var remap = new RasterFunction();
                            remap.functionName = "Remap";
                            var remapArg = {};
                            remapArg.InputRanges = [negativeRange[0], negativeRange[1], positiveRange[0], positiveRange[1]];
                            remapArg.OutputValues = [0, 1];
                            remapArg.AllowUnmatched = false;
                            remapArg.Raster = arithmetic;
                            remap.outputPixelType = "U8";
                            remap.functionArguments = remapArg;
                            raster3 = remap;
                        } else {
                            var thresholdValue = registry.byId("thresholdValue").get("value");
                            var differenceValue = registry.byId("differenceValue").get("value");
                            var remapRaster1 = new RasterFunction();
                            remapRaster1.functionName = "Remap";
                            var remapRaster1Arg = {};
                            remapRaster1Arg.InputRanges = [-1, thresholdValue, thresholdValue, 1];
                            remapRaster1Arg.OutputValues = [0, 1];
                            remapRaster1Arg.AllowUnmatched = false;
                            remapRaster1Arg.Raster = raster1;
                            remapRaster1.functionArguments = remapRaster1Arg;
                            remapRaster1.outputPixelType = "U8";

                            var remapRaster2 = new RasterFunction();
                            remapRaster2.functionName = "Remap";
                            var remapRaster2Arg = {};
                            remapRaster2Arg.InputRanges = [-1, thresholdValue, thresholdValue, 1];
                            remapRaster2Arg.OutputValues = [0, 1];
                            remapRaster2Arg.AllowUnmatched = false;
                            remapRaster2Arg.Raster = raster2;
                            remapRaster2.functionArguments = remapRaster2Arg;
                            remapRaster2.outputPixelType = "U8";

                            var arithmetic = new RasterFunction();
                            arithmetic.functionName = "Arithmetic";
                            var arithmeticArg = {};
                            arithmeticArg.Operation = 2;
                            arithmeticArg.ExtentType = 1;
                            arithmeticArg.CellsizeType = 0;
                            arithmeticArg.Raster = remapRaster1;
                            arithmeticArg.Raster2 = remapRaster2;
                            arithmetic.functionArguments = arithmeticArg;
                            arithmetic.outputPixelType = "F32";

                            var remapArithmetic = new RasterFunction();
                            remapArithmetic.functionName = "Remap";
                            var remapArithmeticArg = {};
                            remapArithmeticArg.InputRanges = [-1.1, -0.01];
                            remapArithmeticArg.OutputValues = [1];
                            remapArithmeticArg.NoDataRanges = [0, 0];
                            remapArithmeticArg.AllowUnmatched = true;
                            remapArithmeticArg.Raster = arithmetic;
                            remapArithmetic.functionArguments = remapArithmeticArg;
                            remapArithmetic.outputPixelType = "F32";
                            var arithmetic2 = new RasterFunction();
                            arithmetic2.functionName = "Arithmetic";
                            arithmetic2.outputPixelType = "F32";
                            var arithmeticArg2 = {};
                            arithmeticArg2.Raster = raster1;
                            arithmeticArg2.Raster2 = raster2;
                            arithmeticArg2.Operation = 2;
                            arithmeticArg2.ExtentType = 1;
                            arithmeticArg2.CellsizeType = 0;
                            arithmetic2.functionArguments = arithmeticArg2;


                            var remapDifference = new RasterFunction();
                            remapDifference.functionName = "Remap";
                            remapDifference.outputPixelType = "F32";
                            var remapDifferenceArg = {};
                            remapDifferenceArg.NoDataRanges = [(-1 * differenceValue), differenceValue];
                            remapDifferenceArg.AllowUnmatched = true;
                            remapDifferenceArg.Raster = arithmetic2;
                            remapDifference.functionArguments = remapDifferenceArg;

                            var arithmetic3 = new RasterFunction();
                            arithmetic3.functionName = "Arithmetic";
                            arithmetic3.outputPixelType = "F32";
                            var arithmeticArg3 = {};
                            arithmeticArg3.Raster = remapArithmetic;
                            arithmeticArg3.Raster2 = remapDifference;
                            arithmeticArg3.Operation = 3;
                            arithmeticArg3.ExtentType = 1;
                            arithmeticArg3.CellsizeType = 0;
                            arithmetic3.functionArguments = arithmeticArg3;

                            var remapArithmetic3 = new RasterFunction();
                            remapArithmetic3.functionName = "Remap";
                            remapArithmetic3.outputPixelType = "U8";
                            var remapArithmeticArg3 = {};
                            remapArithmeticArg3.InputRanges = [-5, 0, 0, 5];
                            remapArithmeticArg3.OutputValues = [0, 1];
                            remapArithmeticArg3.AllowUnmatched = false;
                            remapArithmeticArg3.Raster = arithmetic3;
                            remapArithmetic3.functionArguments = remapArithmeticArg3;
                            
                            raster3 = remapArithmetic3;
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
                            // rasterClip.outputPixelType = "U8";
                            var clipArguments = {};
                            clipArguments.ClippingGeometry = intersectGeometry;
                            clipArguments.ClippingType = 1;
                            clipArguments.Raster = raster3;
                            rasterClip.functionArguments = clipArguments;
                            raster3 = rasterClip;
                        }
                        
                        if(changeMode !== "image" && method !== "difference"){
                            var colormap = new RasterFunction();
                            colormap.functionName = "Colormap";
                            var colormapArg = {};
                            colormapArg.Colormap = [[0, 255, 0, 255], [1, 0, 252, 0]];
                            colormapArg.Raster = raster3;
                            colormap.outputPixelType = "U8";
                            colormap.functionArguments = colormapArg;
                            raster3 = colormap;
                        }
                        params = new ImageServiceParameters();
                        params.renderingRule = raster3;
                        changeDetectionLayer = new ArcGISImageServiceLayer(
                                this.primaryLayer.url,
                                {
                                    id: "resultLayer",
                                    imageServiceParameters: params
                                });
                        this.number++;
                        changeDetectionLayer.title = "Result__Change_" + this.number;
                        for (var a = this.map.layerIds.length - 1; a >= 0; a--) {
                            if (this.primaryLayer.id === this.map.layerIds[a]) {
                                var index = a + 1;
                                break;
                            }
                        }
                        this.map.addLayer(changeDetectionLayer, index);
                    }), lang.hitch(this, function () {
                        params = new ImageServiceParameters();
                        params.renderingRule = raster3;
                        changeDetectionLayer = new ArcGISImageServiceLayer(
                                this.primaryLayer.url,
                                {
                                    id: "resultLayer",
                                    imageServiceParameters: params
                                });
                        this.number++;
                        changeDetectionLayer.title = "ChangeLayer_" + this.number;
                        for (var a = this.map.layerIds.length - 1; a >= 0; a--) {
                            if (this.primaryLayer.id === this.map.layerIds[a]) {
                                var index = a + 1;
                                break;
                            }
                        }
                        this.map.addLayer(changeDetectionLayer, index);
                    }));
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