///////////////////////////////////////////////////////////////////////////
// Copyright 2018 Esri. All Rights Reserved.
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
    "dojo/dom-construct", "dojo/dom-style", "dojo/html", "dijit/registry", "dojo/_base/lang", "esri/toolbars/draw", "esri/graphic",
    "esri/symbols/SimpleLineSymbol",
    "esri/layers/RasterFunction",
    "esri/request", "esri/layers/RasterLayer", "dojo/Deferred",
    "esri/layers/ImageServiceParameters", "esri/Color", "dijit/popup",
    "dojox/charting/Chart",
    "dojox/charting/themes/Electric", "dojox/charting/plot2d/Areas",
    "dojox/charting/action2d/Magnify", "dijit/form/HorizontalSlider", "dijit/form/HorizontalRule", "dijit/form/HorizontalRuleLabels",
    "dijit/form/DropDownButton", "dijit/ColorPalette", "dijit/TooltipDialog",
    "dojox/charting/axis2d/Default", "dijit/form/CheckBox"
],
        function (
                declare,
                _WidgetsInTemplateMixin,
                template,
                BaseWidget,
                domConstruct, domStyle, html, registry, lang, Draw, Graphic, SimpleLineSymbol, RasterFunction,
                esriRequest, RasterLayer, Deferred,
                ImageServiceParameters, Color, popup, Chart, theme, Areas, Magnify, HorizontalSlider, HorizontalRule, HorizontalRuleLabels
                ) {
            var clazz = declare([BaseWidget, _WidgetsInTemplateMixin], {
                templateString: template,
                name: 'ISMask',
                baseClass: 'jimu-widget-ISMask',
                extentChangeHandler: null,
                startup: function () {
                    this.inherited(arguments);
                    this.loadingNode = domConstruct.toDom('<img style="position: absolute;top:0;bottom: 0;left: 0;right: 0;margin:auto;z-index:100;display:none;" src="' + require.toUrl('jimu') + '/images/loading.gif">');
                    domConstruct.place(this.loadingNode, this.domNode);
                },
                onOpen: function () {
                    this.refreshData();
                    if (!this.extentChangeHandler)
                        this.extentChangeHandler = this.map.on("extent-change", lang.hitch(this, this.extentChange));
                },
                refreshData: function () {
                    if (this.map.layerIds) {
                        if (this.map.primaryLayer) {
                            this.primaryLayer = this.map.getLayer(this.map.primaryLayer);
                        } else {
                            this.layersOnMap = [];
                            for (var a = 0; a < this.map.layerIds.length; a++) {
                                var layerObject = this.map.getLayer(this.map.layerIds[a]);
                                var title = layerObject.arcgisProps && layerObject.arcgisProps.title ? layerObject.arcgisProps.title : layerObject.title;
                                if (layerObject && layerObject.visible && layerObject.serviceDataType && layerObject.serviceDataType.indexOf("esriImageService") !== -1 && layerObject.id !== "resultLayer" && layerObject.id !== "scatterResultLayer" && layerObject.id !== this.map.resultLayer && (!title || ((title).charAt(title.length - 1)) !== "_")) {

                                    this.layersOnMap.push({
                                        layer: layerObject,
                                        id: layerObject.id,
                                        position: a
                                    });
                                }
                            }

                            this.primaryLayer = this.layersOnMap.length > 0 ? this.layersOnMap[this.layersOnMap.length - 1].layer : null;

                        }

                        if (this.primaryLayer) {
                            domStyle.set(this.maskContainer, "display", "block");
                            html.set(this.errorNotification, "");
                            if (this.primaryLayer.id !== this.prevPrimaryLayer) {
                                if (this.config[this.primaryLayer.id])
                                    html.set(this.layerTitle, "<b>Layer:</b> " + this.config[this.primaryLayer.id].title);
                                else
                                    html.set(this.layerTitle, "<b>Layer:</b> " + (this.primaryLayer.title || this.primaryLayer.name || this.primaryLayer.id));
                                dojo.empty(this.maskHistogram);
                                domStyle.set(this.maskHistogram, "display", "none");
                                if (this.slider) {

                                    this.slider.destroy();
                                    this.sliderRules.destroy();
                                    this.sliderLabels.destroy();
                                    this.slider = null;
                                }
                                this.populateMaskModes();
                                this.populateBands();
                                html.set(this.areaValue, "");
                            }
                            this.prevPrimaryLayer = this.primaryLayer.id;
                        } else {
                            domStyle.set(this.maskContainer, "display", "none");
                            html.set(this.errorNotification, "No visible imagery layer available on the map.");
                        }

                    }
                },
                populateMaskModes: function () {
                    this.method.removeOption(this.method.getOptions());
                    for (var a in this.config) {
                        if (a === this.primaryLayer.id) {

                            if (this.config[a].veg) {
                                this.method.addOption({label: "Vegetation Index", value: "ndvi"});

                            }
                            if (this.config[a].savi) {
                                this.method.addOption({label: "Soil Adjusted Veg. Index", value: "savi"});
                            }
                            if (this.config[a].water) {
                                this.method.addOption({label: "Water Index", value: "water"});
                            }
                            if (this.config[a].burn) {
                                this.method.addOption({label: "Burn Index", value: "burn"});
                            }
                            break;
                        }
                    }
                    this.method.addOption({label: "Custom Index", value: "custom"});
                    this.method.addOption({label: "Less than value", value: "less"});
                    this.method.addOption({label: "Greater than value", value: "more"});
                },
                populateBands: function () {
                    this.bandNames = [];
                    this.band1.removeOption(this.band1.getOptions());
                    this.band2.removeOption(this.band2.getOptions());
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
                        this.band1.addOption({label: this.bandNames[a], value: (parseInt(a) + 1)});
                        this.band2.addOption({label: this.bandNames[a], value: (parseInt(a) + 1)});
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
                    this.setProperties(this.method.get("value"));
                },
                setBands: function (value) {
                    if ((value === "ndvi" || value === "savi") && this.initialVal_red && this.initialVal_nir)
                    {
                        this.band1.set("value", this.initialVal_nir);
                        this.band2.set("value", this.initialVal_red);
                    } else if (value === "water" && this.initialVal_green && this.initialVal_swir) {
                        this.band1.set("value", this.initialVal_green);
                        this.band2.set("value", this.initialVal_swir);
                    } else if (value === "burn" && this.initialVal_nir && this.initialVal_swir) {
                        this.band1.set("value", this.initialVal_nir);
                        this.band2.set("value", this.initialVal_swir);
                    } else {
                        this.band1.set("value", "1");
                        this.band2.set("value", "2");
                    }
                },
                postCreate: function () {
                    this.method.on("change", lang.hitch(this, this.setProperties));

                    this.colorPalette.on("change", lang.hitch(this, function (value) {

                        this.color = (new Color(value)).toRgb();
                        if (this.chart)
                        {
                            this.chart.series[0].fill = this.color;
                            this.chart.series[0].stroke.color = this.color;
                            this.chart.updateSeries("Mask", this.dataIncrease);
                            this.chart.render();
                        }

                        var layer = this.map.getLayer("resultLayer");
                        if (layer && layer.maskMethod) {
                            layer.maskMethod.color = this.color;
                            layer.redraw();
                        }
                        popup.close(this.colorDialog);
                    }));
                    this.maskApply.on("click", lang.hitch(this, this.getMinMaxCheck));
                    this.aoiExtent.on("change", lang.hitch(this, function (value) {
                        this.polygons = null;
                        if (value) {
                            this.toolbar.activate(Draw.POLYGON);
                        } else {
                            this.removeGraphic();
                            this.toolbar.deactivate();
                        }
                    }));
                    this.toolbar = new Draw(this.map);
                    this.toolbar.on("draw-complete", lang.hitch(this, this.addGraphic));

                    if (this.map) {
                        this.map.on("update-end", lang.hitch(this, this.refreshData));
                        this.map.on("update-start", lang.hitch(this, this.showLoading));
                        this.map.on("update-end", lang.hitch(this, this.hideLoading));
                    }
                },
                setProperties: function (value) {
                    domStyle.set(this.band2.domNode, "display", "inline-table");
                    if (value === "ndvi" || value === "savi") {
                        html.set(this.bandName1, "Infrared Band");
                        html.set(this.bandName2, "Red Band");
                    } else if (value === "water") {
                        html.set(this.bandName1, "Green Band");
                        html.set(this.bandName2, "Short-wave Infrared Band");
                    } else if (value === "burn") {
                        html.set(this.bandName1, "Infrared Band");
                        html.set(this.bandName2, "Short-wave Infrared Band");
                    } else if (value === "custom") {
                        html.set(this.bandName1, "Band A");
                        html.set(this.bandName2, "Band B");
                    } else {
                        html.set(this.bandName1, "Band");
                        html.set(this.bandName2, "");
                        domStyle.set(this.band2.domNode, "display", "none");
                    }
                    this.setBands(value);
                },
                extentChange: function (zoom) {
                    if (this.map.getLayer("resultLayer") && this.map.getLayer("resultLayer").maskMethod) {
                        this.map.getLayer("resultLayer").suspend();

                        var latitude = ((this.map.extent.getCenter()).getLatitude() * Math.PI) / 180;
                        this.scale = Math.pow((1 / Math.cos(latitude)), 2);

                        if (zoom.levelChange) {
                            var xdistance = this.map.extent.xmax - this.map.extent.xmin;
                            var ydistance = this.map.extent.ymax - this.map.extent.ymin;
                            this.pixelSizeX = xdistance / this.map.width;
                            this.pixelSizeY = ydistance / this.map.height;
                        }
                        if (this.primaryLayer) {
                            this.createHistogram(this.map.getLayer("resultLayer").renderingRule, true).then(lang.hitch(this, function () {
                                var layer = this.map.getLayer("resultLayer");
                                if (layer && layer.maskMethod) {
                                    layer.maskMethod.range = [this.min, this.max];
                                    layer.maskMethod.value = this.slider.get("value");
                                    layer.resume();
                                }
                            }));
                        } else
                            this.map.getLayer("resultLayer").resume();
                    }
                },
                createHistogram: function (raster, preserveSliderValue) {
                    var dfd = new Deferred();
                    if (this.chart) {
                        dojo.empty(this.maskHistogram);
                        this.chart = null;
                    }

                    if (raster.functionName === "Clip") {
                        var geometry = raster.functionArguments.ClippingGeometry;
                        var type = "esriGeometryPolygon";
                    } else {
                        var geometry = this.map.extent;
                        var type = "esriGeometryEnvelope";
                    }

                    var request = new esriRequest({
                        url: this.primaryLayer.url + "/computehistograms",
                        content: {
                            f: "json",
                            geometry: JSON.stringify(geometry.toJson()),
                            geometryType: type,
                            renderingRule: JSON.stringify(raster.toJson()),
                            pixelSize: '{"x":' + this.pixelSizeX + ', "y":' + this.pixelSizeY + '}'
                        },
                        handleAs: "json",
                        callbackParamName: "callback"
                    });
                    request.then(lang.hitch(this, function (result) {
                        domStyle.set(this.maskHistogram, "display", "block");
                        if (result && result.histograms[0]) {
                            this.min = result.histograms[0].min;
                            this.max = result.histograms[0].max;
                            this.size = result.histograms[0].size;
                            this.createSlider(preserveSliderValue);
                            var chartData = result.histograms[0].counts;
                            this.value = [];
                            for (var a = 0; a < this.size; a++) {
                                this.value.push({
                                    x: a,
                                    y: chartData[a] ? chartData[a] : 0
                                });


                            }
                            var threshold = this.slider.get("value");
                            var increaseLimit = parseInt(((threshold - this.min) / (this.max - this.min)) * (this.size - 1));
                            this.dataIncrease = this.value.slice(increaseLimit);
                            if (!this.chart) {
                                this.chart = new Chart(this.maskHistogram);
                                this.chart.addPlot("default", {
                                    type: Areas,
                                    markers: false,
                                    areas: true,
                                    tension: "S",
                                    color: "black",
                                    shadows: {dx: 4, dy: 4}
                                });

                                this.chart.setTheme(theme);

                                this.chart.addAxis("y", {vertical: true, fixLower: "none", fixUpper: "none", titleOrientation: "axis", minorLabels: false, microTicks: false, majorLabels: false, minorTicks: false, majorTicks: false, stroke: "white", majorTick: {color: [37, 37, 37]}});
                                this.chart.addAxis("x", {titleOrientation: "away", fixLower: "none", fixUpper: "none", minorLabels: false, microTicks: false, majorLabels: false, minorTicks: false, majorTicks: false, majorTick: {color: [37, 37, 37]}, stroke: "white"});
                                this.chart.addSeries("Mask", this.dataIncrease, {stroke: {color: this.color, width: 0.5}, fill: this.color});

                                this.magnify = new Magnify(this.chart, "default");
                                this.chart.render();

                            }
                            dfd.resolve(true);
                        }
                    }), lang.hitch(this, function () {
                        domStyle.set(this.maskHistogram, "display", "none");
                        dfd.resolve(false);
                    }));
                    return dfd.promise;
                },
                onClose: function () {
                    this.aoiExtent.set("checked", false);
                    if (this.extentChangeHandler) {
                        this.extentChangeHandler.remove();
                        this.extentChangeHandler = null;
                    }
                },
                createSlider: function (preserveSliderValue) {
                    if (preserveSliderValue && this.slider) {
                        var value = this.slider.get("value");
                        if (value < this.min)
                            value = this.min;
                        else if (value > this.max)
                            value = this.max;
                    } else
                        value = (this.min + this.max) / 2;
                    if (this.slider) {
                        this.slider.destroy();
                        this.sliderRules.destroy();
                        this.sliderLabels.destroy();
                        this.slider = null;
                    }
                    var sliderNode = domConstruct.create("div", {}, this.maskSlider, "first");

                    var rulesNode = domConstruct.create("div", {}, sliderNode, "first");
                    this.sliderRules = new HorizontalRule({
                        container: "bottomDecoration",
                        count: 11,
                        style: "height:5px;"
                    }, rulesNode);
                    var labels = [];
                    if (this.min.toString().indexOf(".") !== -1)
                        labels[0] = this.min.toFixed(2);
                    else
                        labels[0] = this.min;
                    if (this.max.toString().indexOf(".") !== -1)
                        labels[1] = this.max.toFixed(2);
                    else
                        labels[1] = this.max;
                    var labelsNode = domConstruct.create("div", {}, sliderNode, "second");
                    this.sliderLabels = new HorizontalRuleLabels({
                        container: "bottomDecoration",
                        labelStyle: "height:1em;font-size:75%;color:gray;",
                        labels: labels
                    }, labelsNode);

                    this.slider = new HorizontalSlider({
                        name: "slider",
                        class: this.method.get("value") === "less" ? "mask-slider-left mask-align" : "mask-slider mask-align",
                        value: value,
                        minimum: this.min,
                        maximum: this.max,
                        intermediateChanges: true,
                        onChange: lang.hitch(this, this.redrawFunction)
                    }, sliderNode);

                    this.slider.startup();
                    this.sliderRules.startup();
                    this.sliderLabels.startup();
                },
                redrawFunction: function (value) {

                    if (this.chart) {
                        var threshold = this.slider.get("value");
                        var increaseLimit = parseInt(((threshold - this.min) / (this.max - this.min)) * (this.size - 1));
                        if (increaseLimit < 0)
                            this.dataIncrease = this.value;
                        else
                            this.dataIncrease = this.value.slice(increaseLimit, this.value.length);
                        this.chart.updateSeries("Mask", this.dataIncrease);
                        this.chart.render();
                    }
                    var layer = this.map.getLayer("resultLayer");
                    if (layer && layer.maskMethod) {
                        layer.maskMethod.value = value;
                        layer.redraw();
                    }

                },
                getMinMaxCheck: function () {
                    var method = this.method.get("value");
                    if (this.band1.get("value") !== this.band2.get("value") && method !== "less" && method !== "more") {
                        var request = new esriRequest({
                            url: this.primaryLayer.url,
                            content: {
                                f: "json"
                            },
                            handleAs: "json",
                            callbackParamName: "callback"
                        });
                        request.then(lang.hitch(this, function (prop) {
                            var band1Index = Math.abs(parseInt(this.band1.get("value")));
                            var band2Index = Math.abs(parseInt(this.band2.get("value")));

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
                            this.maskFunction(true);
                        }), lang.hitch(this, function () {
                            this.min1 = 0;
                            this.max1 = 1;
                            this.min2 = 0;
                            this.max2 = 1;
                            this.maskFunction(true);
                        }));
                    } else
                        this.maskFunction(false);
                },
                maskFunction: function (flag) {
                    if (this.map.getLayer("resultLayer")) {
                        this.map.getLayer("resultLayer").suspend();
                        this.map.removeLayer(this.map.getLayer("resultLayer"));
                    }
                    var method = this.method.get("value");
                     if (method === "ndvi") {
                        this.color = [124, 252, 0];
                    } else if (method === "savi") {
                        this.color = [218, 165, 32];
                    } else if (method === "water") {
                        this.color = [64, 164, 223];
                    } else if (method === "burn") {
                        this.color = [255, 109, 49];
                    }else
                        this.color = [255, 102, 102];

                    
                    if (flag) {
                        var band1 = "B" + this.band1.get("value");
                        var band2 = "B" + this.band2.get("value");
                        var value1 = this.max1 - this.min1;
                        var value2 = this.max2 - this.min2;
                        if (method !== "savi") {
                            var indexFormula = "((" + value2 + "*(" + band1 + "-" + this.min1 + "))+(" + value1 + "*(" + this.min2 + "-" + band2 + ")))/((" + value2 + "*(" + band1 + "-" + this.min1 + "))+(" + value1 + "*(" + band2 + "-" + this.min2 + ")))";
                        } else {
                            var indexFormula = "1.5 * ((" + value2 + "*(" + band1 + "-" + this.min1 + "))+(" + value1 + "*(" + this.min2 + "-" + band2 + ")))/((" + value2 + "*(" + band1 + "-" + this.min1 + "))+(" + value1 + "*(" + band2 + "-" + this.min2 + "))+(0.5*" + value1 + "*" + value2 + "))";
                        }
                        var raster = new RasterFunction();
                        raster.functionName = "BandArithmetic";
                        raster.outputPixelType = "F32";
                        var args = {};
                        args.Method = 0;
                        args.BandIndexes = indexFormula;
                        raster.functionArguments = args;
                    } else {
                        var raster = new RasterFunction();
                        raster.functionName = "ExtractBand";
                        var args = {};
                        args.BandIDs = [this.band1.get("value") - 1];
                        raster.functionArguments = args;
                    }
                    if (this.polygons) {
                        var rasterClip = new RasterFunction();
                        rasterClip.functionName = "Clip";
                        var clipArguments = {};
                        clipArguments.ClippingGeometry = this.polygons;
                        clipArguments.ClippingType = 1;
                        clipArguments.Raster = raster;
                        rasterClip.functionArguments = clipArguments;
                        raster = rasterClip;
                    }
                    var xdistance = this.map.extent.xmax - this.map.extent.xmin;
                    var ydistance = this.map.extent.ymax - this.map.extent.ymin;
                    this.pixelSizeX = xdistance / this.map.width;
                    this.pixelSizeY = ydistance / this.map.height;
                    var latitude = ((this.map.extent.getCenter()).getLatitude() * Math.PI) / 180;
                    this.scale = Math.pow((1 / Math.cos(latitude)), 2);

                    var params = new ImageServiceParameters();
                    params.renderingRule = raster;
                    this.createHistogram(params.renderingRule, false).then(lang.hitch(this, function (value) {

                        if (value) {

                            var layer = this.map.getLayer("primaryLayer");
                            if (layer && layer.mosaicRule) {
                                params.mosaicRule = layer.mosaicRule;
                            }
                            params.format = "lerc";

                            var maskLayer = new RasterLayer(this.primaryLayer.url, {
                                imageServiceParameters: params,
                                visible: true,
                                id: "resultLayer",
                                pixelFilter: lang.hitch(this, this.maskPixels)
                            });

                            maskLayer.on("load", lang.hitch(this, function () {
                                if (flag)
                                    maskLayer.pixelType = "F32";
                            }));

                            maskLayer.title = "Result__Mask";
                            maskLayer.maskMethod = {method: method, color: this.color, range: [this.min, this.max], value: this.slider.get("value")};


                            for (var a = this.map.layerIds.length - 1; a >= 0; a--) {
                                if (this.primaryLayer.id === this.map.layerIds[a]) {
                                    var index = a + 1;
                                    break;
                                }
                            }

                            this.map.addLayer(maskLayer, index);
                        }
                    }));
                },
                maskPixels: function (pixelData) {
                    if (pixelData === null || pixelData.pixelBlock === null) {
                        return;
                    }
                    if (pixelData && pixelData.pixelBlock && pixelData.pixelBlock.pixels === null)
                        return;
                    var p1 = pixelData.pixelBlock.pixels[0];
                    var pr = new Uint8Array(p1.length);
                    var pg = new Uint8Array(p1.length);
                    var pb = new Uint8Array(p1.length);

                    var area = 0;
                    var numPixels = pixelData.pixelBlock.width * pixelData.pixelBlock.height;
                    var method = this.method.get("value");
                    var maskRangeValue = parseFloat(this.slider.get("value"));
                    if (this.slider) {
                        if (!pixelData.pixelBlock.mask) {
                            pixelData.pixelBlock.mask = new Uint8Array(p1.length);
                            var noDataValue = pixelData.pixelBlock.statistics[0].noDataValue;
                            if (method !== "less") {
                                for (var i = 0; i < numPixels; i++) {
                                    if (p1[i] >= maskRangeValue && p1[i] !== noDataValue)
                                    {
                                        pixelData.pixelBlock.mask[i] = 1;
                                        pr[i] = this.color[0];
                                        pg[i] = this.color[1];
                                        pb[i] = this.color[2];
                                        area++;
                                    } else
                                        pixelData.pixelBlock.mask[i] = 0;
                                }
                            } else {
                                for (var i = 0; i < numPixels; i++) {
                                    if (p1[i] <= parseFloat(maskRangeValue) && p1[i] !== noDataValue)
                                    {
                                        pixelData.pixelBlock.mask[i] = 1;
                                        pr[i] = this.color[0];
                                        pg[i] = this.color[1];
                                        pb[i] = this.color[2];
                                        area++;
                                    } else
                                        pixelData.pixelBlock.mask[i] = 0;
                                }
                            }
                        } else {
                            var mask = pixelData.pixelBlock.mask;
                            if (method !== "less") {
                                for (var i = 0; i < numPixels; i++) {
                                    if (mask[i] === 1 && p1[i] >= maskRangeValue) {
                                        pr[i] = this.color[0];
                                        pg[i] = this.color[1];
                                        pb[i] = this.color[2];
                                        area++;
                                    } else
                                        pixelData.pixelBlock.mask[i] = 0;
                                }
                            } else {
                                for (var i = 0; i < numPixels; i++) {
                                    if (mask[i] === 1 && p1[i] <= maskRangeValue)
                                    {
                                        pr[i] = this.color[0];
                                        pg[i] = this.color[1];
                                        pb[i] = this.color[2];
                                        area++;
                                    } else
                                        pixelData.pixelBlock.mask[i] = 0;
                                }
                            }
                        }
                        pixelData.pixelBlock.pixels = [pr, pg, pb];

                        pixelData.pixelBlock.pixelType = "U8";
                        html.set(this.areaValue, "&nbsp;&nbsp;" + ((area * this.pixelSizeX * this.pixelSizeY) / (1000000 * this.scale)).toFixed(3) + " km<sup>2</sup>");
                    }
                },
                addGraphic: function (object) {
                    var symbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([200, 0, 0]), 2);
                    var graphic = new Graphic(object.geometry, symbol, {maskWidget: true});
                    this.map.graphics.add(graphic);
                    if (this.polygons)
                        this.polygons.addRing(object.geometry.rings[0]);
                    else
                        this.polygons = object.geometry;
                },
                removeGraphic: function () {
                    var temp;
                    for (var k = this.map.graphics.graphics.length - 1; k >= 0; k--) {
                        temp = this.map.graphics.graphics[k];
                        if (temp.geometry && temp.geometry.type === "polygon" && temp.attributes && temp.attributes.maskWidget) {
                            this.map.graphics.remove(this.map.graphics.graphics[k]);
                        }
                    }
                },
                showLoading: function () {
                    domStyle.set(this.loadingNode, "display", "block");
                },
                hideLoading: function () {
                    domStyle.set(this.loadingNode, "display", "none");
                }
            });
            clazz.hasLocale = false;
            return clazz;
        });