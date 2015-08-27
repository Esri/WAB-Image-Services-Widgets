///////////////////////////////////////////////////////////////////////////
// Copyright (c) 2015 Esri. All Rights Reserved.
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
    'esri/dijit/Legend',
    "esri/arcgis/utils",
    "dojo/on",
    "dijit/registry",
    "dojo/_base/lang",
    "dojo/dom",
    "dojo/dom-construct",
    "dojo/dom-style",
    "esri/request",
    "esri/tasks/ImageServiceIdentifyTask",
    "esri/tasks/ImageServiceIdentifyParameters",
    "esri/geometry/Point",
    "dojox/charting/Chart",
    "dojox/charting/action2d/Tooltip",
    "dojox/charting/themes/Chris",
    "dojox/charting/widget/SelectableLegend",
    "dojox/charting/action2d/Magnify",
    "dojo/date/locale",
    "esri/SpatialReference",
    "dojo/_base/connect",
    "esri/symbols/SimpleMarkerSymbol",
    "esri/symbols/SimpleLineSymbol",
    "esri/Color",
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
    "dijit/layout/BorderContainer"

],
        function (
                declare,
                _WidgetsInTemplateMixin,
                template,
                BaseWidget,
                Legend,
                arcgisUtils,
                on,
                registry,
                lang,
                dom,
                domConstruct,
                domStyle, esriRequest, ImageServiceIdentifyTask, ImageServiceIdentifyParameters, Point, Chart, Tooltip, theme, SelectableLegend, Magnify, locale, SpatialReference, connect, SimpleMarkerSymbol, SimpleLineSymbol, Color) {
            var clazz = declare([BaseWidget, _WidgetsInTemplateMixin], {
                templateString: template,
                name: 'ISSpectralProfile',
                baseClass: 'jimu-widget-ISSpectralProfile',
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
                    domConstruct.place('<img id="loadingsp" style="position: absolute;top:0;bottom: 0;left: 0;right: 0;margin:auto;z-index:100;" src="' + require.toUrl('jimu') + '/images/loading.gif">', this.domNode);
                    this.hideLoading();
                },
                onOpen: function () {
                    this.refreshData();
                    this.clickhandle = this.map.on("click", lang.hitch(this, this.spectralprofile));
                    this.clickhandle45 = this.map.on("click", lang.hitch(this, this.addgraphics));
                },
                addgraphics: function (evt)
                {
                    this.map.graphics.add(new esri.Graphic(
                            evt.mapPoint,
                            new esri.symbol.SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 20,
                                    new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                                            new Color([255, 0, 0]), 1),
                                    new Color([255, 0, 0]))
                            ));
                },
                refreshData: function () {
                    if (this.map.layerIds) {
                        if (this.map.getLayer("resultLayer")) {
                            this.primaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 2]);
                        } else {
                            this.primaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 1]);
                        }

                        this.minValue = this.primaryLayer.minValues[0];
                        this.maxValue = this.primaryLayer.maxValues[0];
                         if(this.minValue === undefined || this.maxValue === undefined)
                    {
                        this.pixeltype = this.primaryLayer.pixelType;
                        switch(this.pixeltype)
                        {
                            case 'U8' :
                            {
                                this.minValue = 0;
                            this.maxValue = 255;
                            break;
                            }
                            case 'U16' :
                            {
                                this.minValue = 0;
                            this.maxValue = 65535;
                            break;
                            }
                            case 'S8' :
                            {
                            this.minValue = -128;
                            this.maxValue = 127;
                            
                            break;    
                            }
                            case 'S16':
                            {
                                this.minValue = -32768;
                            this.maxValue = 32767;
                            
                            break;
                            }
                            case 'U4':
                            {
                              this.minValue = 0;
                            this.maxValue = 16;
                            
                            break;
                            }
                            case 'U2':
                            {
                               this.minValue = 0;
                            this.maxValue = 4;
                            
                            break;
                            }
                            case 'U1':
                            {
                               this.minValue = 0;
                            this.maxValue = 1;
                            
                            break;
                            }
                            case 'U32':
                            {
                                this.minValue = 0;
                            this.maxValue = 4294967295;
                            
                            break;
                            }
                            case 'S32' :
                            {
                                this.minValue = -2147483648;
                            this.maxValue = 2147483647;
                            
                            break;
                            }
                            case 'F32':
                                {
                                this.minValue = -3.402823466e+38;
                                this.maxValue = 3.402823466e+38;
                                
                                break;
                               }
                                
                        }
                    
                    }
                        if (this.primaryLayer !== this.prevprimaryLayer) {
                            var layersRequest = esriRequest({
                                url: this.primaryLayer.url + "/1/info/keyProperties",
                                content: {f: "json"},
                                handleAs: "json",
                                callbackParamName: "callback"
                            });
                            var bandMean = [];
                            layersRequest.then(lang.hitch(this, function (response) {
                                var bandProp = [];
                                var bandProp = response.BandProperties;
                                this.bandNames = [];
                                if (bandProp) {
                                    for (var i = 0; i < bandProp.length; i++) {
                                        if (bandProp[i].WavelengthMax && bandProp[i].WavelengthMin) {
                                            bandMean[i] = parseInt((parseFloat(bandProp[i].WavelengthMax) + parseFloat(bandProp[i].WavelengthMin)) / 2);
                                            if (bandProp[i].BandName) {
                                                this.bandNames[i] = bandProp[i].BandName;
                                            }
                                        }
                                    }
                                }
                                this.sensorName = response.SensorName;
                                if (response.SensorName == "Landsat 8") {
                                    this.bandNames = ["Coastal", "Blue", "Green", "Red", "NIR", "SWIR 1", "SWIR 2", "Cirrus"];
                                }

                                for (i in this.bandNames) {
                                    if (this.bandNames[i] == "NearInfrared" || this.bandNames[i] == "NearInfrared_1" || this.bandNames[i] == "NIR" || this.bandNames[i] == "NIR_1") {
                                        this.nirIndex = i;
                                    }
                                    if (this.bandNames[i] == "Red") {
                                        this.redIndex = i;
                                    }
                                    if (this.bandNames[i] == "Green") {
                                        this.greenIndex = i;

                                    }
                                    if (this.bandNames[i] == "SWIR 1") {
                                        this.swir1Index = i;

                                    }
                                    if (this.bandNames[i] == "SWIR 2") {
                                        this.swir2Index = i;

                                    }
                                }


                                this.bandPropMean = [];
                                this.bandPropMean = bandMean;
                            }), function (error) {
                                console.log("Error: ", error.message);
                            });
                            this.prevprimaryLayer = this.primaryLayer;
                        }
                    }
                }, onClose: function ()
                {
                    this.clear();
                    this.clickhandle.remove();
                    this.clickhandle = null;
                    this.clickhandle45.remove();
                    this.clickhandle45 = null;
                },
                postCreate: function () {
                    this.inherited(arguments);
                    registry.byId("type").on("change", lang.hitch(this, this.clear));
                    if (this.map) {

                        this.map.on("update-end", lang.hitch(this, this.refreshData));
                        this.map.on("update-start", lang.hitch(this, this.showLoading));
                        this.map.on("update-end", lang.hitch(this, this.hideLoading));
                    }
                },
                clear: function () {

                    registry.byId("chartDialog").hide();
                    if (this.chart) {

                        for (var i = this.map.graphics.graphics.length - 1; i >= 1; i--)
                        {

                            this.map.graphics.remove(this.map.graphics.graphics[i]);

                        }
                        ;


                        var series = this.chart.getSeriesOrder("default");
                        for (var a in series) {
                            this.chart.removeSeries(series[a]);
                        }
                        this.chart.removeAxis("x");
                        this.count = 1;
                        this.legend.refresh();
                    }
                },
                iconSelected: function () {
                    if (registry.byId("type").get("value") == "temporal" || registry.byId("type").get("value") == "NDVI") {
                        this.clear();
                    }
                },
                spectralprofile: function (evt2) {

                    domStyle.set("loadingsp", "display", "block");

                    if (registry.byId("type").get("value") == "temporal" || registry.byId("type").get("value") == "NDVI")
                    {

                        if (this.map.graphics.graphics[1])
                        {
                            this.map.graphics.remove(this.map.graphics.graphics[1]);
                        }
                    }
                    registry.byId("chartDialog").hide();

                    //registry.byId("chartDialog").hide();
                    var point = new Point(evt2.mapPoint.x, evt2.mapPoint.y, new SpatialReference({wkid: evt2.mapPoint.spatialReference.wkid}));
                    var normPoint = point.normalize();
                    var imageTask = new ImageServiceIdentifyTask(this.primaryLayer.url);
                    var imageParams = new ImageServiceIdentifyParameters();
                    imageParams.geometry = point;
                    imageParams.pixelSizeX = this.primaryLayer.pixelSizeX;
                    imageParams.pixelSizeY = this.primaryLayer.pixelSizeY;
                    imageTask.execute(imageParams, lang.hitch(this, function (data) {
                        if (registry.byId("type").get("value") == "nonTemporal") {
                            var values = data.properties.Values[0].split(' ');
                            for (var a in values) {
                                if (values[a]) {
                                    values[a] = parseInt(values[a], 10);
                                } else {
                                    values[a] = 0;
                                }
                            }
                            var normalizedValues = [];
                            for (a in values) {
                                normalizedValues[a] = (values[a] - this.minValue) / (this.maxValue - this.minValue);
                            }
                            this.chartData = [];
                            for (a in normalizedValues) {
                                this.chartData.push(
                                        {tooltip: normalizedValues[a].toFixed(4),
                                            y: normalizedValues[a]});
                            }
                        } else if (registry.byId("type").get("value") == "temporal") {
                            var items = data.catalogItems.features;
                            var props = data.properties.Values;
                            var itemInfo = [];

                            for (var a in items) {
                                if (items[a].attributes.Category == 1) {
                                    var plot = props[a].split(' ');
                                    for (var k in plot) {
                                        if (plot[k]) {
                                            plot[k] = parseInt(plot[k], 10);
                                        } else {
                                            plot[k] = 0;
                                        }
                                    }
                                    var normalizedValues = [];
                                    for (var j in plot) {
                                        var calc = (plot[j] - this.minValue) / (this.maxValue - this.minValue);
                                        normalizedValues.push(
                                                {y: calc,
                                                    tooltip: calc.toFixed(4) + ", " + (locale.format(new Date(items[a].attributes.AcquisitionDate), {selector: "date", datePattern: "dd/MM/yy"}))});
                                    }

                                    itemInfo.push({
                                        acqDate: items[a].attributes.AcquisitionDate,
                                        values: normalizedValues
                                    });
                                }
                            }

                            var byDate = itemInfo.slice(0);
                            byDate.sort(function (a, b) {
                                return a.acqDate - b.acqDate;
                            });

                            this.temporalData = byDate;
                        } else if (registry.byId("type").get("value") == "NDVI") {
                            var items = data.catalogItems.features;
                            var props = data.properties.Values;
                            var itemInfo = [];
                            var itemInfo1 = [];
                            var itemInfo2 = [];
                            for (var a in items) {
                                if (items[a].attributes.Category == 1) {
                                    var plot = props[a].split(' ');
                                    for (var k in plot) {
                                        if (plot[k]) {
                                            plot[k] = parseInt(plot[k], 10);
                                        } else {
                                            plot[k] = 0;
                                        }
                                    }
                                    var normalizedValues = [];
                                    var normalizedValues1 = [];
                                    var normalizedValues2 = [];
//                                      if (this.sensorName == "Landsat 8") {
//                                        var nir = plot[4];
//                                        var red = plot[3];
//                                    } else if (this.sensorName == "Landsat-7-ETM+") {
//                                        var nir = plot[3];
//                                        var red = plot[2];
//                                    }
                                    var nir = plot[this.nirIndex];
                                    var red = plot[this.redIndex];
                                    var green = plot[this.greenIndex];
                                    var swir1 = plot[this.swir1Index];
                                    var swir2 = plot[this.swir2Index];
                                    var calc = (nir - red) / (nir + red);
                                    var ndmi = ((nir - swir1) / (nir + swir1));
                                    var urban = (((swir1 - nir) / (swir1 + nir)) - ((nir - red) / (red + nir))) / 2;
                                    normalizedValues.push(
                                            {y: calc,
                                                tooltip: calc.toFixed(4) + ", " + (locale.format(new Date(items[a].attributes.AcquisitionDate), {selector: "date", datePattern: "dd/MM/yy"}))});
                                    normalizedValues1.push(
                                            {y: ndmi,
                                                tooltip: ndmi.toFixed(4) + ", " + locale.format(new Date(items[a].attributes.AcquisitionDate), {selector: "date", datePattern: "dd/MM/yy"})});

                                    normalizedValues2.push(
                                            {y: urban,
                                                tooltip: urban.toFixed(4) + ", " + locale.format(new Date(items[a].attributes.AcquisitionDate), {selector: "date", datePattern: "dd/MM/yy"})});
                                    itemInfo.push({
                                        acqDate: items[a].attributes.AcquisitionDate,
                                        values: normalizedValues
                                    });
                                    itemInfo1.push({
                                        acqDate: items[a].attributes.AcquisitionDate,
                                        values: normalizedValues1
                                    });

                                    itemInfo2.push({
                                        acqDate: items[a].attributes.AcquisitionDate,
                                        values: normalizedValues2
                                    });
                                }
                            }

                            var byDate = itemInfo.slice(0);
                            var byDate1 = itemInfo1.slice(0);

                            var byDate2 = itemInfo2.slice(0);
                            byDate.sort(function (a, b) {
                                return a.acqDate - b.acqDate;
                            });
                            byDate1.sort(function (a, b) {
                                return a.acqDate - b.acqDate;
                            });

                            byDate2.sort(function (a, b) {
                                return a.acqDate - b.acqDate;
                            });
                            this.NDVIData = byDate;
                            this.NDVIData1 = byDate1;
                            this.NDVIData2 = byDate2;
                            this.NDVIValues = [];
                            this.NDVIValues1 = [];
                            this.NDVIValues2 = [];
                            this.NDVIDates = [];

                            for (a in this.NDVIData) {
                                this.NDVIDates.push({
                                    text: locale.format(new Date(this.NDVIData[a].acqDate), {selector: "date", datePattern: "dd/MM/yy"}),
                                    value: parseInt(a) + 1
                                });
                                this.NDVIValues.push({
                                    y: this.NDVIData[a].values[0].y,
                                    tooltip: this.NDVIData[a].values[0].tooltip
                                });
                            }
                            for (a in this.NDVIData1) {

                                this.NDVIValues1.push({
                                    y: this.NDVIData1[a].values[0].y,
                                    tooltip: this.NDVIData1[a].values[0].tooltip
                                });
                            }

                            for (a in this.NDVIData2) {

                                this.NDVIValues2.push({
                                    y: this.NDVIData2[a].values[0].y,
                                    tooltip: this.NDVIData2[a].values[0].tooltip
                                });
                            }
                        }

                        this.axesParams = [];
                        for (a in this.bandPropMean) {
                            this.axesParams[a] = {
                                value: parseInt(a) + 1,
                                text: this.bandNames[a]
                            };
                        }

                        if (!this.chart) {
                            registry.byId("chartDialog").show();
                            this.chart = new Chart("chartNode");
                            this.chart.addPlot("default", {
                                type: "Lines",
                                markers: true,
                                shadows: {dx: 4, dy: 4}
                            });
                            this.chart.setTheme(theme);
                            this.chart.setWindow(1, 1, -1, 0)

                            this.count = 1;

                            this.chart.addAxis("y", {vertical: true, fixLower: "major", fixUpper: "major", title: "Data Values", titleOrientation: "axis"});

                            if (registry.byId("type").get("value") == "nonTemporal") {
                                this.chart.addAxis("x", {labels: this.axesParams, labelSizeChange: true, title: "Spectral Bands", titleOrientation: "away", minorTicks: false, majorTickStep: 1});
//                                this.chart.addSeries(this.degToDMS(normPoint.getLatitude(), 'LAT') + " " + this.degToDMS(normPoint.getLongitude(), 'LON') + " ", chartData);
                                this.chart.addSeries("Point " + this.count, this.chartData);
                                this.count++;
                            } else if (registry.byId("type").get("value") == "temporal") {

                                this.chart.addAxis("x", {labels: this.axesParams, labelSizeChange: true, title: "Spectral Bands", titleOrientation: "away", minorTicks: false, majorTickStep: 1});
                                for (var x in this.temporalData) {
                                    this.chart.addSeries(locale.format(new Date(this.temporalData[x].acqDate), {selector: "date", formatLength: "long"}), this.temporalData[x].values);
                                }
                            } else if (registry.byId("type").get("value") == "NDVI") {

                                this.chart.addAxis("x", {labels: this.NDVIDates, labelSizeChange: true, title: "Acquisition Date", titleOrientation: "away", majorTickStep: 1, minorTicks: false});

                                this.chart.addSeries("NDMI Moisture", this.NDVIValues1, {hidden: true});
                                this.chart.addSeries("Urban", this.NDVIValues2, {hidden: true});
                                this.chart.addSeries("NDVI", this.NDVIValues);
                            }
                            registry.byId("chartDialog").show();
                            this.magnify = new Magnify(this.chart, "default");
                            this.toolTip = new Tooltip(this.chart, "default");
                            this.chart.render();
                            this.legend = new SelectableLegend({chart: this.chart, horizontal: false, outline: false}, "legend");
                            domConstruct.destroy("chartDialog_underlay");
                        } else {
                            registry.byId("chartDialog").show();
                            if (registry.byId("type").get("value") == "nonTemporal") {
                                if (!this.chart.getAxis("x")) {
                                    this.chart.addAxis("x", {labels: this.axesParams, labelSizeChange: true, title: "Spectral Bands", titleOrientation: "away", minorTicks: false, majorTickStep: 1});
                                }
//                                this.chart.addSeries(this.degToDMS(normPoint.getLatitude(), 'LAT') + " " + this.degToDMS(normPoint.getLongitude(), 'LON') + " ", chartData);
                                this.chart.addSeries("Point " + this.count, this.chartData);
                                this.count++;
                            } else if (registry.byId("type").get("value") == "temporal") {

                                if (!this.chart.getAxis("x")) {
                                    this.chart.addAxis("x", {labels: this.axesParams, labelSizeChange: true, title: "Spectral Bands", titleOrientation: "away", minorTicks: false, majorTickStep: 1});
                                }
                                for (var x in this.temporalData) {
                                    this.chart.addSeries(locale.format(new Date(this.temporalData[x].acqDate), {selector: "date", formatLength: "long"}), this.temporalData[x].values);
                                }
                            } else if (registry.byId("type").get("value") == "NDVI") {

                                if (!this.chart.getAxis("x")) {
                                    this.chart.addAxis("x", {labels: this.NDVIDates, labelSizeChange: true, title: "Acquisition Date", titleOrientation: "away", minorTicks: false, majorTickStep: 1});
                                }

                                this.chart.addSeries("NDMI Moisture", this.NDVIValues1, {hidden: true});
                                this.chart.addSeries("Urban", this.NDVIValues2, {hidden: true});
                                this.chart.addSeries("NDVI", this.NDVIValues);
                            }
                            this.chart.render();
                            this.legend.refresh();
                        }
                    }));
                    domStyle.set("loadingsp", "display", "none");
                },
                showLoading: function () {
                    esri.show(dom.byId("loadingsp"));
                },
                hideLoading: function () {
                    esri.hide(dom.byId("loadingsp"));
                }
            });
            clazz.hasLocale = false;
            clazz.hasSettingPage = false;
            clazz.hasSettingUIFile = false;
            clazz.hasSettingLocale = false;
            clazz.hasSettingStyle = false;
            return clazz;
        });