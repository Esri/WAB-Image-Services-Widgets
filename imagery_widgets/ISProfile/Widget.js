///////////////////////////////////////////////////////////////////////////
// Copyright (c) 2013 Esri. All Rights Reserved.
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
    "dojo/on",
    "dojo/dom", "dojo/html",
    "dojo/dom-construct",
    "dojo/dom-style",
    "esri/request",
    "esri/tasks/ImageServiceIdentifyTask",
    "esri/tasks/ImageServiceIdentifyParameters",
    "esri/geometry/Point",
    "dojo/i18n!esri/nls/jsapi",
    "dojox/charting/Chart",
    "dojox/charting/action2d/Tooltip",
    "dojox/charting/themes/PrimaryColors",
    "dojox/charting/widget/SelectableLegend",
    "dojox/charting/action2d/Magnify",
    "dojo/date/locale",
    "esri/graphic",
    "esri/symbols/SimpleMarkerSymbol",
    "esri/symbols/SimpleLineSymbol",
    "esri/Color", "esri/toolbars/draw",
    "esri/layers/RasterFunction",
    "dojox/layout/ResizeHandle",
    "dijit/Dialog",
    "dojox/charting/plot2d/Lines",
    "dojox/charting/plot2d/Markers",
    "dojox/charting/axis2d/Default",
    "esri/graphic",
    "dijit/form/Select",
    "dijit/form/Button",
    "dijit/form/NumberSpinner",
    "dijit/form/CheckBox",
    "dijit/form/TextBox",
    "dijit/form/DropDownButton",
    "dijit/TooltipDialog",
    'jimu/dijit/DrawBox',
    "esri/SpatialReference",
    "dijit/layout/BorderContainer",
],
        function (
                declare,
                _WidgetsInTemplateMixin,
                template,
                BaseWidget,
                registry,
                lang,
                on,
                dom, html,
                domConstruct,
                domStyle, esriRequest, ImageServiceIdentifyTask, ImageServiceIdentifyParameters, Point, bundle, Chart, Tooltip, theme, SelectableLegend, Magnify, locale, Graphic, SimpleMarkerSymbol, SimpleLineSymbol, Color, Draw, RasterFunction, ResizeHandle) {
            var clazz = declare([BaseWidget, _WidgetsInTemplateMixin], {
                templateString: template,
                name: 'ISProfile',
                baseClass: 'jimu-widget-ISProfile',
                layerInfos: [],
                primaryLayerIndex: null,
                secondaryLayerIndex: null,
                primaryLayer: null,
                secondaryLayer: null,
                layerSwipe: null,
                layerList: null,
                bandNames: [],
                clickhandle: null,
                prevprimaryLayer: null,
                startup: function () {
                    this.inherited(arguments);
                    domConstruct.place('<img id="loadingISProfile" style="position: absolute;top:0;bottom: 0;left: 0;right: 0;margin:auto;z-index:100;" src="' + require.toUrl('jimu') + '/images/loading.gif">', this.domNode);
                    this.hideLoading();
                    this.layerInfos = this.config;
                },
                onOpen: function () {
                    if (this.map) {
                        this.refreshHandler = this.map.on("update-end", lang.hitch(this, this.refreshData));
                    }


                    domStyle.set(dom.byId("error-message"), 'display', 'none');
                    domStyle.set(dom.byId("extent-error-message"), 'display', 'none');
                    domStyle.set(dom.byId("single-value"), 'display', 'none');
                    domStyle.set(dom.byId("identify-error"), 'display', 'none');
                    // this.chartWidth = 0.4 * this.map.width;
                    // this.chartHeight = 0.65 * this.map.width;
                    //domStyle.set(registry.byId("chartDialog"), 'height', this.chartHeight + 50);
                    //domStyle.set(dom.byId("chartNode"), 'height', this.chartHeight);
                    //domStyle.set(dom.byId("chartNode"), 'width', this.chartWidth);
                    this.refreshData();

                },
                addGraphic: function (geometry) {
                    this.showLoading();
                    domStyle.set(dom.byId("extent-error-message"), 'display', 'none');
                    domStyle.set(dom.byId("single-value"), 'display', 'none');
                    domStyle.set(dom.byId("identify-error"), 'display', 'none');
                    this.clear();
                    for (var a in this.map.graphics.graphics) {
                        if (this.map.graphics.graphics[a].geometry && this.map.graphics.graphics[a].geometry.type === "point" && this.map.graphics.graphics[a].symbol && this.map.graphics.graphics[a].symbol.color.r === 255) {
                            this.map.graphics.remove(this.map.graphics.graphics[a]);
                            break;
                        }
                    }
                    var symbol = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 20,
                            new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                                    new Color([255, 0, 0]), 1),
                            new Color([255, 0, 0, 0.35]));
                    var graphic = new Graphic(geometry, symbol);
                    this.map.graphics.add(graphic);
                    this.spectralprofile(geometry);

                },
                refreshData: function () {
                    if (this.map.layerIds) {
                        if (this.map.primaryLayer) {
                            this.primaryLayer = this.map.getLayer(this.map.primaryLayer);
                        } else {
                            for (var a = this.map.layerIds.length - 1; a >= 0; a--) {
                                var layerObject = this.map.getLayer(this.map.layerIds[a]);
                                var title = layerObject.arcgisProps && layerObject.arcgisProps.title ? layerObject.arcgisProps.title : layerObject.title;
                                if (layerObject && layerObject.visible && layerObject.serviceDataType && layerObject.serviceDataType.substr(0, 16) === "esriImageService" && layerObject.id !== "resultLayer" && layerObject.id !== "scatterResultLayer" && layerObject.id !== this.map.resultLayer && (!title || ((title).charAt(title.length - 1)) !== "_")) {
                                    this.primaryLayer = layerObject;
                                    break;
                                } else
                                    this.primaryLayer = null;
                            }
                        }
                        if (this.primaryLayer) {
                            domStyle.set(this.profileContainer, "display", "block");
                            html.set(this.profileErrorContainer, "");
                            this.label = this.primaryLayer.url.split('//')[1];
                            if (this.layerInfos[this.label]) {
                                this.toolbarSpectralProfile.activate(Draw.POINT);
                            }

                            if (this.primaryLayer !== this.prevprimaryLayer) {
                                if (this.layerInfos[this.label]) {
                                    dom.byId("profileLayerTitle").innerHTML = "Layer: <b>" + this.layerInfos[this.label].title + "</b>";
                                    domStyle.set(dom.byId("selectType"), 'display', 'block');
                                    domStyle.set(dom.byId("error-message"), 'display', 'none');
                                    for (var a in this.primaryLayer.fields) {
                                        if (this.layerInfos[this.label].field === this.primaryLayer.fields[a].name) {
                                            this.fieldType = this.primaryLayer.fields[a].type;
                                            break;
                                        }
                                    }
                                    registry.byId("type").removeOption(registry.byId("type").getOptions());
                                    if (this.layerInfos[this.label].bandCount === 1) {
                                        var options = [{"label": "Identify", "value": "nonTemporal"}];
                                        html.set(this.profileTypeInstruction, "Click on the map for Identify.");
                                    } else{
                                        var options = [{"label": "Spectral Profile", "value": "nonTemporal"}];
                                         html.set(this.profileTypeInstruction, "Click on the map for Spectral Profile.");
                                    }
                                    if (this.layerInfos[this.label].hasOverlap)
                                        options.push({"label": "Temporal Profile", "value": "temporal"});
                                    if (this.layerInfos[this.label].hasNDVI)
                                        options.push({"label": "Index Profile", "value": "NDVI"});
                                    registry.byId("type").addOption(options);
                                }
                                if (!this.layerInfos[this.label]) {
                                    dom.byId("profileLayerTitle").innerHTML = "Layer: <b>" + (this.primaryLayer.title || this.primaryLayer.arcgisProps.title || this.primaryLayer.name || this.primaryLayer.id) + "</b>";
                                    domStyle.set(dom.byId("selectType"), 'display', 'none');
                                    this.showLoading();
                                    this.layerObj = {
                                        hasNDVI: false,
                                        hasOverlap: false,
                                        ndvi: false,
                                        ndmi: false,
                                        urban: false,
                                        yAxisLabel: "Data Values",
                                        title: this.primaryLayer.name || this.primaryLayer.id
                                    };
                                    if (this.primaryLayer.type === "ArcGISImageServiceLayer" || (this.primaryLayer.serviceDataType && this.primaryLayer.serviceDataType.substr(0, 16) === "esriImageService")) {
                                        if (this.primaryLayer.bandCount) {
                                            this.layerObj.bandCount = this.primaryLayer.bandCount;
                                            this.layerObj.bandNames = [];
                                            for (var i = 0; i < this.layerObj.bandCount; i++) {
                                                var num = i + 1;
                                                this.layerObj.bandNames[i] = num.toString();
                                            }
                                        }
                                        for (var j in this.primaryLayer.fields) {
                                            if (this.primaryLayer.fields[j].name === "AcquisitionDate")
                                            {
                                                this.layerObj.field = this.primaryLayer.fields[j].name;
                                                this.fieldType = this.primaryLayer.fields[j].type;
                                            }
                                            if (this.primaryLayer.fields[j].name === "Category")
                                                this.layerObj.category = this.primaryLayer.fields[j].name;
                                        }
                                        if (this.layerObj.field && this.layerObj.category) {
                                            this.layerObj.hasOverlap = true;
                                            var layersRequest = esriRequest({
                                                url: this.primaryLayer.url + "/1/info/keyProperties",
                                                content: {f: "json"},
                                                handleAs: "json",
                                                callbackParamName: "callback"
                                            });
                                            layersRequest.then(lang.hitch(this, function (response) {
                                                var bandProp = response.BandProperties;
                                                if (bandProp) {
                                                    if (!this.layerObj.bandCount)
                                                        this.layerObj.bandCount = bandProp.length;
                                                    for (var i = 0; i < this.layerObj.bandCount; i++) {
                                                        if (bandProp[i] && bandProp[i].BandName) {
                                                            this.layerObj.bandNames[i] = bandProp[i].BandName;
                                                        } else {
                                                            var num = i + 1;
                                                            this.layerObj.bandNames[i] = "Band_" + num.toString();
                                                        }
                                                    }
                                                }
                                                for (i in this.layerObj.bandNames) {
                                                    if (this.layerObj.bandNames[i] === "NearInfrared" || this.layerObj.bandNames[i] === "NearInfrared_1" || this.layerObj.bandNames[i] === "NIR" || this.layerObj.bandNames[i] === "NIR_1") {
                                                        this.layerObj.nirIndex = i;
                                                    }
                                                    if (this.layerObj.bandNames[i] === "Red") {
                                                        this.layerObj.redIndex = i;
                                                    }
                                                    if (this.layerObj.bandNames[i] === "SWIR 1" || this.layerObj.bandNames[i] === "SWIR_1" || this.layerObj.bandNames[i] === "ShortWaveInfrared 1" || this.layerObj.bandNames[i] === "ShortWaveInfrared_1") {
                                                        this.layerObj.swirIndex = i;
                                                    }
                                                }
                                                if (this.layerObj.nirIndex) {
                                                    this.layerObj.hasNDVI = true;
                                                    var count = 0;
                                                    if (this.layerObj.redIndex) {
                                                        this.layerObj.ndvi = true;
                                                        count++;
                                                    }
                                                    if (this.layerObj.swirIndex) {
                                                        this.layerObj.ndmi = true;
                                                        count++;
                                                    }
                                                    if (count === 2) {
                                                        this.layerObj.urban = true;
                                                    }
                                                }
                                                this.displayOptions();
                                            }), lang.hitch(this, this.displayOptions));
                                        } else {
                                            this.displayOptions();
                                        }
                                    } else {
                                        this.hideLoading();
                                        domStyle.set(dom.byId("error-message"), 'display', 'block');
                                    }
                                }

                                this.prevprimaryLayer = this.primaryLayer;
                            }
                        } else {
                            domStyle.set(this.profileContainer, "display", "none");
                            html.set(this.profileErrorContainer, "No visible Imagery Layers in the map.");
                        }
                    }
                },
                displayOptions: function () {
                    if (this.layerObj.bandCount && this.layerObj.bandNames) {
                        if (this.layerObj.bandCount === 1) {
                            this.layerObj.hasNDVI = false;
                        }
                        this.layerInfos[this.label] = this.layerObj;
                        this.toolbarSpectralProfile.activate(Draw.POINT);
                    } else {
                        this.hideLoading();
                        domStyle.set(dom.byId("error-message"), 'display', 'block');
                        for (var a in this.map.graphics.graphics) {
                            if (this.map.graphics.graphics[a].geometry && this.map.graphics.graphics[a].geometry.type === "point" && this.map.graphics.graphics[a].symbol && this.map.graphics.graphics[a].symbol.color.r === 255) {
                                this.map.graphics.remove(this.map.graphics.graphics[a]);
                                break;
                            }
                        }
                        this.toolbarSpectralProfile.deactivate();
                    }
                    if (this.layerInfos[this.label]) {
                        this.hideLoading();
                        domStyle.set(dom.byId("selectType"), 'display', 'block');
                        domStyle.set(dom.byId("error-message"), 'display', 'none');
                        registry.byId("type").removeOption(registry.byId("type").getOptions());
                        if (this.layerInfos[this.label].bandCount === 1){
                             html.set(this.profileTypeInstruction, "Click on the map for Identify.");
                            var options = [{"label": "Identify", "value": "nonTemporal"}];
                        }else
                        { var options = [{"label": "Spectral Profile", "value": "nonTemporal"}];
                             html.set(this.profileTypeInstruction, "Click on the map for Spectral Profile.");
                        }
                        if (this.layerInfos[this.label].hasOverlap)
                            options.push({"label": "Temporal Profile", "value": "temporal"});
                        if (this.layerInfos[this.label].hasNDVI)
                            options.push({"label": "Index Profile", "value": "NDVI"});
                        registry.byId("type").addOption(options);
                    }
                },
                onClose: function () {
                    this.clear();
                    for (var a in this.map.graphics.graphics) {
                        if (this.map.graphics.graphics[a].geometry && this.map.graphics.graphics[a].geometry.type === "point" && this.map.graphics.graphics[a].symbol && this.map.graphics.graphics[a].symbol.color.r === 255) {
                            this.map.graphics.remove(this.map.graphics.graphics[a]);
                            break;
                        }
                    }
                    if (this.refreshHandler) {
                        this.refreshHandler.remove();
                        this.refreshHandler = null;
                    }
                    this.toolbarSpectralProfile.deactivate();
                },
                postCreate: function () {
                    this.toolbarSpectralProfile = new Draw(this.map);
                    dojo.connect(this.toolbarSpectralProfile, "onDrawEnd", lang.hitch(this, this.addGraphic));
                    this.toolbarSpectralProfile.activate(Draw.POINT);
                    this.toolbarSpectralProfile._tooltip.innerHTML = "Pick a point";
                    bundle.toolbars.draw.addPoint = "Pick a point";
                    registry.byId("type").on("change", lang.hitch(this, this.clear));
                    var node = document.createElement("div");
                    node.id = "chartResizeHandle";
                    document.getElementById("chartDialog").appendChild(node);
                    var handle = new ResizeHandle({
                        targetId: "chartDialog",
                        id: "chartDialogHandle",
                        style: "bottom:0px;right:0px;"
                    }).placeAt("chartResizeHandle");
                    domStyle.set(dom.byId("chartNode"), 'height', this.map.height * 0.4 + "px");
                    domStyle.set(dom.byId("chartNode"), 'width', this.map.width * 0.6 + "px");
                    domStyle.set(dom.byId("legendNodeContainer"), 'height', this.map.height * 0.4 + "px");
                    dojo.subscribe("/dojo/resize/stop", lang.hitch(this, function (resizeHandle) {
                        if (resizeHandle.id === "chartDialogHandle") {
                            var width = parseInt(document.getElementById("chartDialog").style.width.split("px")[0]);
                            var height = parseInt(document.getElementById("chartDialog").style.height.split("px")[0]);
                            domStyle.set("chartNode", 'width', (0.7 * width) + "px");
                            domStyle.set("chartNode", 'height', (0.8 * height) + "px");
                            domStyle.set("legendNodeContainer", 'width', (0.2 * width) + "px");
                            domStyle.set("legendNodeContainer", 'height', (0.75 * height) + "px");
                            if (this.chart)
                                this.chart.resize();

                        }
                    }));
                },
                clear: function () {
                    registry.byId("chartDialog").hide();
                    if (this.chart) {
                        domConstruct.empty("chartNode");
                    }
                    var type = registry.byId("type").get("value");
                    if (type === "nonTemporal") {
                        if (this.layerInfos[this.label].bandCount === 1)
                            html.set(this.profileTypeInstruction, "Click on the map for Identify.");
                        else
                            html.set(this.profileTypeInstruction, "Click on the map for Spectral Profile.");
                    } else if (type === "temporal")
                        html.set(this.profileTypeInstruction, "Click on the map for Temporal Profile.");
                    else
                        html.set(this.profileTypeInstruction, "Click on the map for Index Profile(s).");
                },
                iconSelected: function () {
                    if (registry.byId("type").get("value") === "temporal" || registry.byId("type").get("value") === "NDVI") {
                        this.clear();
                    }
                },
                spectralprofile: function (point) {
                    if (this.requestCheck && !this.requestCheck.isResolved())
                        this.requestCheck.cancel("Request Cancelled", false);
                    registry.byId("chartDialog").hide();
                    var request = esriRequest({
                        url: this.primaryLayer.url + "/getSamples",
                        content: {
                            geometry: JSON.stringify(point.toJson()),
                            geometryType: "esriGeometryPoint",
                            returnGeometry: false,
                            mosaicRule: this.primaryLayer.mosaicRule ? JSON.stringify(this.primaryLayer.mosaicRule.toJson()) : "",
                            returnFirstValueOnly: registry.byId("type").get("value") === "nonTemporal" ? true : false,
                            outFields: "Category," + this.layerInfos[this.label].field,
                            f: "json"
                        },
                        handleAs: "json",
                        callbackParamName: "callback"
                    });
                    this.requestCheck = request.then(lang.hitch(this, function (data) {
                        if (data.samples.length > 0) {
                            if (registry.byId("type").get("value") === "nonTemporal") {
                                var values = data.samples[0].value.split(" ");
                                for (var a in values) {
                                    if (values[a]) {
                                        values[a] = parseInt(values[a]);
                                    } else {
                                        values[a] = 0;
                                    }
                                }

                                this.spectralProfileContinue(values, null);
                            } else if (registry.byId("type").get("value") === "temporal") {
                                var items = data.samples;
                                this.spectralProfileContinue(items, null);
                            } else if (registry.byId("type").get("value") === "NDVI") {
                                var items = data.samples;
                                this.spectralProfileContinue(items, null);
                            }

                        } else {
                            domStyle.set(dom.byId("extent-error-message"), 'display', 'block');
                            this.hideLoading();
                        }
                    }), lang.hitch(this, function (error) {
                        if (error.message !== "Request canceled") {
                            var renderer = "";
                            if (this.primaryLayer.rasterFunctionInfos) {
                                for (var i in this.primaryLayer.rasterFunctionInfos) {
                                    if (this.primaryLayer.rasterFunctionInfos[i].name === "None")
                                        renderer = new RasterFunction();
                                    renderer.functionName = "None";
                                }
                            }
                            if (this.primaryLayer.mosaicRule)
                                var mosaic = this.primaryLayer.mosaicRule;
                            else
                                var mosaic = "";

                            var imageTask = new ImageServiceIdentifyTask(this.primaryLayer.url);
                            var imageParams = new ImageServiceIdentifyParameters();

                            imageParams.geometry = point;
                            if (this.primaryLayer.pixelSizeX)
                                imageParams.pixelSizeX = this.primaryLayer.pixelSizeX;
                            if (this.primaryLayer.pixelSizeY)
                                imageParams.pixelSizeY = this.primaryLayer.pixelSizeY;
                            imageParams.renderingRule = renderer;
                            imageParams.mosaicRule = mosaic;

                            this.requestCheck = imageTask.execute(imageParams, lang.hitch(this, function (data) {
                                if (data.properties.Values.length > 0) {
                                    if (registry.byId("type").get("value") === "nonTemporal") {
                                        var values = data.properties.Values[0].split(' ');
                                        if (values.length === 1) {
                                            var i = 0;
                                            while (data.properties.Values[i] === "NoData") {
                                                i++;
                                            }
                                            if (data.properties.Values[i])
                                                values = data.properties.Values[i].split(' ');
                                            else
                                                values = ["NoData"];
                                        }
                                        for (var a in values) {
                                            if (values[a]) {
                                                values[a] = parseInt(values[a]);
                                            } else {
                                                values[a] = 0;
                                            }
                                        }
                                        this.spectralProfileContinue(values, null);
                                    } else if (registry.byId("type").get("value") === "temporal") {
                                        var items = data.catalogItems.features;
                                        var props = data.properties.Values;
                                        this.spectralProfileContinue(items, props);
                                    } else if (registry.byId("type").get("value") === "NDVI") {
                                        var items = data.catalogItems.features;
                                        var props = data.properties.Values;
                                        this.spectralProfileContinue(items, props);
                                    }
                                } else {
                                    domStyle.set(dom.byId("extent-error-message"), 'display', 'block');
                                    this.hideLoading();
                                }

                            }), lang.hitch(this, function (error) {
                                this.hideLoading();
                                console.log(error);
                                if (error.message !== "Request canceled") {
                                    dom.byId("identify-error").innerHTML = "Error performing task. Try another point.<br><br>" + error;
                                    domStyle.set(dom.byId("identify-error"), 'display', 'block');
                                }
                            }));
                        }
                    }));
                },
                spectralProfileContinue: function (values, props) {
                    if (registry.byId("type").get("value") === "nonTemporal") {
                        var normalizedValues = values;
                        this.chartData = [];
                        for (a in normalizedValues) {
                            this.chartData.push({
                                tooltip: normalizedValues[a].toFixed(2),
                                y: normalizedValues[a]
                            });
                        }
                    } else if (registry.byId("type").get("value") === "temporal") {
                        var items = values;

                        var itemInfo = [];

                        for (var a in items) {
                            if (items[a].attributes[this.layerInfos[this.label].category] === 1) {
                                var plot = props ? props[a].split(' ') : items[a].value.split(" ");
                                for (var k in plot) {
                                    if (plot[k]) {
                                        plot[k] = parseInt(plot[k], 10);
                                    } else {
                                        plot[k] = 0;
                                    }
                                }
                                var normalizedValues = [];
                                if (this.fieldType === "esriFieldTypeDate") {
                                    for (var j in plot) {
                                        var calc = plot[j];
                                        normalizedValues.push({
                                            y: calc,
                                            tooltip: locale.format(new Date(items[a].attributes[this.layerInfos[this.label].field]), {selector: "date", formatLength: "long"}) + ", " + calc.toFixed(2)

                                        });
                                    }
                                } else {
                                    for (var j in plot) {
                                        var calc = plot[j];
                                        normalizedValues.push({
                                            y: calc,
                                            tooltip: items[a].attributes[this.layerInfos[this.label].field] + ", " + calc.toFixed(2)
                                        });
                                    }
                                }

                                itemInfo.push({
                                    acqDate: items[a].attributes[this.layerInfos[this.label].field],
                                    values: normalizedValues
                                });
                            }
                        }

                        var byDate = itemInfo.slice(0);
                        byDate.sort(function (a, b) {
                            return a.acqDate - b.acqDate;
                        });

                        this.temporalData = byDate;
                    } else if (registry.byId("type").get("value") === "NDVI") {
                        var items = values;
                        var itemInfo = [];
                        var itemInfo1 = [];
                        var itemInfo2 = [];
                        var nir, swir1, red;
                        for (var a in items) {
                            if (items[a].attributes[this.layerInfos[this.label].category] === 1) {
                                var plot = props ? props[a].split(' ') : items[a].value.split(" ");
                                for (var k in plot) {
                                    if (plot[k]) {
                                        plot[k] = parseInt(plot[k]);
                                    } else {
                                        plot[k] = 0;
                                    }
                                }
                                var normalizedValues = [];
                                var normalizedValues1 = [];
                                var normalizedValues2 = [];
                                nir = plot[this.layerInfos[this.label].nirIndex];
                                if (this.layerInfos[this.label].ndvi) {
                                    red = plot[this.layerInfos[this.label].redIndex];
                                    var calc = (nir - red) / (nir + red);
                                    if (this.fieldType === "esriFieldTypeDate") {
                                        normalizedValues.push({
                                            y: calc,
                                            tooltip: locale.format(new Date(items[a].attributes[this.layerInfos[this.label].field]), {selector: "date", formatLength: "long"}) + ", " + calc.toFixed(2)
                                        });
                                    } else {
                                        normalizedValues.push({
                                            y: calc,
                                            tooltip: items[a].attributes[this.layerInfos[this.label].field] + ", " + calc.toFixed(2)
                                        });
                                    }
                                    itemInfo.push({
                                        acqDate: items[a].attributes[this.layerInfos[this.label].field],
                                        values: normalizedValues
                                    });
                                }
                                if (this.layerInfos[this.label].ndmi) {
                                    swir1 = plot[this.layerInfos[this.label].swirIndex];
                                    var ndmi = ((nir - swir1) / (nir + swir1));
                                    if (this.fieldType === "esriFieldTypeDate") {
                                        normalizedValues1.push({
                                            y: ndmi,
                                            tooltip: locale.format(new Date(items[a].attributes[this.layerInfos[this.label].field]), {selector: "date", formatLength: "long"}) + ", " + ndmi.toFixed(2)
                                        });
                                    } else {
                                        normalizedValues1.push({
                                            y: ndmi,
                                            tooltip: items[a].attributes[this.layerInfos[this.label].field] + ", " + ndmi.toFixed(2)
                                        });
                                    }

                                    itemInfo1.push({
                                        acqDate: items[a].attributes[this.layerInfos[this.label].field],
                                        values: normalizedValues1
                                    });
                                }
                                if (this.layerInfos[this.label].urban) {
                                    swir1 = plot[this.layerInfos[this.label].swirIndex];
                                    var urban = (((swir1 - nir) / (swir1 + nir)) - ((nir - red) / (red + nir))) / 2;
                                    if (this.fieldType === "esriFieldTypeDate") {
                                        normalizedValues2.push({
                                            y: urban,
                                            tooltip: locale.format(new Date(items[a].attributes[this.layerInfos[this.label].field]), {selector: "date", formatLength: "long"}) + ", " + urban.toFixed(2)
                                        });
                                    } else {
                                        normalizedValues2.push({
                                            y: urban,
                                            tooltip: items[a].attributes[this.layerInfos[this.label].field] + ", " + urban.toFixed(2)
                                        });
                                    }

                                    itemInfo2.push({
                                        acqDate: items[a].attributes[this.layerInfos[this.label].field],
                                        values: normalizedValues2
                                    });
                                }
                            }
                        }
                        if (itemInfo[0]) {
                            var byDate = itemInfo.slice(0);
                            byDate.sort(function (a, b) {
                                return a.acqDate - b.acqDate;
                            });
                            this.NDVIData = byDate;
                        }
                        if (itemInfo1[0]) {
                            var byDate1 = itemInfo1.slice(0);
                            byDate1.sort(function (a, b) {
                                return a.acqDate - b.acqDate;
                            });
                            this.NDVIData1 = byDate1;
                        }
                        if (itemInfo2[0]) {
                            var byDate2 = itemInfo2.slice(0);
                            byDate2.sort(function (a, b) {
                                return a.acqDate - b.acqDate;
                            });
                            this.NDVIData2 = byDate2;
                        }
                        this.NDVIValues = [];
                        this.NDVIValues1 = [];
                        this.NDVIValues2 = [];
                        this.NDVIDates = [];
                        if (this.NDVIData) {
                            for (a in this.NDVIData) {
                                if (this.fieldType !== "esriFieldTypeDate") {
                                    this.NDVIDates.push({
                                        text: this.NDVIData[a].acqDate,
                                        value: parseInt(a) + 1
                                    });
                                } else {
                                    this.NDVIDates.push({
                                        text: locale.format(new Date(this.NDVIData[a].acqDate), {selector: "date", formatLength: "long"}),
                                        value: parseInt(a) + 1
                                    });
                                }
                                this.NDVIValues.push({
                                    y: this.NDVIData[a].values[0].y,
                                    tooltip: this.NDVIData[a].values[0].tooltip
                                });
                            }
                        }
                        if (this.NDVIData1) {
                            for (a in this.NDVIData1) {
                                this.NDVIValues1.push({
                                    y: this.NDVIData1[a].values[0].y,
                                    tooltip: this.NDVIData1[a].values[0].tooltip
                                });
                            }
                        }
                        if (this.NDVIData2) {
                            for (a in this.NDVIData2) {
                                this.NDVIValues2.push({
                                    y: this.NDVIData2[a].values[0].y,
                                    tooltip: this.NDVIData2[a].values[0].tooltip
                                });
                            }
                        }
                    }

                    this.axesParams = [];
                    this.axesLabels = [];
                    this.tempData = [];
                    for (var a = 0; a < this.layerInfos[this.label].bandCount; a++) {
                        this.axesParams[a] = {
                            value: a + 1,
                            text: (this.layerInfos[this.label].bandNames[a]) ? this.layerInfos[this.label].bandNames[a] : a + 1
                        };
                    }

                    registry.byId("chartDialog").show();
                    this.chart = new Chart("chartNode");
                    this.chart.addPlot("default", {
                        type: "Lines",
                        tension: "S",
                        markers: true,
                        shadows: {dx: 4, dy: 4}
                    });
                    this.chart.setTheme(theme);
                    this.chart.setWindow(1, 1, -1, 0);

                    this.count = 1;

                    this.chart.addAxis("y", {vertical: true, fixLower: "major", fixUpper: "major", title: this.layerInfos[this.label].yAxisLabel, titleOrientation: "axis"});

                    if (registry.byId("type").get("value") === "nonTemporal") {
                        if (this.chartData.length > 1) {
                            this.chart.addAxis("x", {labels: this.axesParams, labelSizeChange: true, title: "Spectral Bands", titleOrientation: "away", minorTicks: false, majorTickStep: 1});
                            this.chart.addSeries("Selected Point", this.chartData);
                            this.count++;
                        } else if (this.chartData.length === 1) {
                            registry.byId("chartDialog").hide();
                            dom.byId("single-value").innerHTML = "Data Value: <span style='font-weight:bolder;'>" + this.chartData[0].tooltip + "</span>";
                            domStyle.set(dom.byId("single-value"), 'display', 'block');
                        }
                    } else if (registry.byId("type").get("value") === "temporal") {
                        if (this.layerInfos[this.label].bandCount > 1) {
                            this.chart.addAxis("x", {labels: this.axesParams, labelSizeChange: true, title: "Spectral Bands", titleOrientation: "away", minorTicks: false, majorTickStep: 1});
                            for (var x in this.temporalData) {

                                this.chart.addSeries((this.fieldType === "esriFieldTypeDate" ? locale.format(new Date(this.temporalData[x].acqDate), {selector: "date", formatLength: "long"}) : this.temporalData[x].acqDate), this.temporalData[x].values);
                            }
                        } else if (this.temporalData.length > 1 && this.layerInfos[this.label].bandCount === 1) {
                            for (var x in this.temporalData) {
                                this.axesLabels[x] = {text: (this.fieldType === "esriFieldTypeDate" ? locale.format(new Date(this.temporalData[x].acqDate), {selector: "date", formatLength: "long"}) : this.temporalData[x].acqDate), value: parseInt(x) + 1};
                                this.tempData[x] = this.temporalData[x].values[0];
                            }
                            this.chart.addAxis("x", {labels: this.axesLabels, labelSizeChange: true, title: this.layerInfos[this.label].field, titleOrientation: "away", minorTicks: false, majorTickStep: 1});
                            this.chart.addSeries(this.axesParams[0].text, this.tempData);
                        } else if (this.layerInfos[this.label].bandCount === 1 && this.temporalData.length === 1) {
                            registry.byId("chartDialog").hide();
                            dom.byId("single-value").innerHTML = "No overlapping scenes at this point.<br>Data Value on " + this.temporalData[0].acqDate + ": <span style='font-weight:bolder;'>" + this.temporalData[0].values[0].y + "</span>";
                            domStyle.set(dom.byId("single-value"), 'display', 'block');
                        }
                    } else if (registry.byId("type").get("value") === "NDVI") {
                        if (this.NDVIDates.length > 1) {
                            this.chart.addAxis("x", {labels: this.NDVIDates, labelSizeChange: true, title: this.layerInfos[this.label].field, titleOrientation: "away", majorTickStep: 1, minorTicks: false});

                            if (this.layerInfos[this.label].ndmi)
                                this.chart.addSeries("NDMI Moisture", this.NDVIValues1, {stroke: {color: "#A5F2F3", width: 1.5}, fill: "#A5F2F3", hidden: (this.layerInfos[this.label].ndvi) ? true : false});
                            if (this.layerInfos[this.label].urban)
                                this.chart.addSeries("Urban", this.NDVIValues2, {stroke: {color: "teal", width: 1.5}, fill: "teal", hidden: true});
                            if (this.layerInfos[this.label].ndvi)
                                this.chart.addSeries("NDVI", this.NDVIValues, {stroke: {color: "forestgreen", width: 1.5}, fill: "forestgreen"});
                        } else if (this.NDVIDates.length === 1) {
                            registry.byId("chartDialog").hide();
                            domConstruct.empty(dom.byId("single-value"));
                            if (this.layerInfos[this.label].ndmi)
                                dom.byId("single-value").innerHTML = "NDMI Data Value on " + this.NDVIDates[0].text + ": <span style='font-weight:bolder;'>" + this.NDVIValues1[0].y.toFixed(2) + "</span>";
                            if (this.layerInfos[this.label].urban)
                                dom.byId("single-value").innerHTML = dom.byId("single-value").innerHTML + "<br>Urban Data Value on " + this.NDVIDates[0].text + ": <span style='font-weight:bolder;'>" + this.NDVIValues2[0].y.toFixed(2) + "</span>";
                            if (this.layerInfos[this.label].ndvi)
                                dom.byId("single-value").innerHTML = dom.byId("single-value").innerHTML + "<br>NDVI Data Value on " + this.NDVIDates[0].text + ": <span style='font-weight:bolder;'>" + this.NDVIValues[0].y.toFixed(2) + "</span>";
                            domStyle.set(dom.byId("single-value"), 'display', 'block');
                        }
                    }

                    this.magnify = new Magnify(this.chart, "default");
                    this.toolTip = new Tooltip(this.chart, "default");
                    this.chart.render();
                    if (!this.legend)
                        this.legend = new SelectableLegend({chart: this.chart, horizontal: false, outline: false}, "legend");
                    else {
                        this.legend.set("params", {chart: this.chart, horizontal: false, outline: false});
                        this.legend.set("chart", this.chart);
                        this.legend.refresh();
                    }
                    domConstruct.destroy("chartDialog_underlay");
                    this.hideLoading();

                },
                showLoading: function () {
                    domStyle.set("loadingISProfile", "display", "block");
                },
                hideLoading: function () {
                    domStyle.set("loadingISProfile", "display", "none");
                }
            });
            clazz.hasLocale = false;
            clazz.hasSettingPage = true;
            clazz.hasSettingUIFile = true;
            clazz.hasSettingLocale = false;
            clazz.hasSettingStyle = true;
            return clazz;
        });