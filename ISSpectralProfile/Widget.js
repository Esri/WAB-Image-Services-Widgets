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
        function(
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
                domStyle, esriRequest, ImageServiceIdentifyTask, ImageServiceIdentifyParameters, Point, Chart, Tooltip, theme, SelectableLegend, Magnify, locale) {
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
                startup: function() {
                    this.inherited(arguments);
                    domConstruct.place('<img id="loadingsp" style="position: absolute;top:0;bottom: 0;left: 0;right: 0;margin:auto;z-index:100;" src="' + require.toUrl('jimu') + '/images/loading.gif">', this.domNode);
                    this.hideLoading();
                },
                onOpen: function() {
                    this.refreshData();
                },
                refreshData: function() {
                    if (this.map.layerIds) {
                        if (this.map.getLayer("resultLayer")) {
                            this.primaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 2]);
                        } else {
                            this.primaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 1]);
                        }
                        this.minValue = this.primaryLayer.minValues[0];
                        this.maxValue = this.primaryLayer.maxValues[0];
                        var layersRequest = esriRequest({
                            url: this.primaryLayer.url + "/1/info/keyProperties",
                            content: {f: "json"},
                            handleAs: "json",
                            callbackParamName: "callback"
                        });
                        var bandMean = [];
                        layersRequest.then(lang.hitch(this, function(response) {
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
                            }

                            this.bandPropMean = [];
                            this.bandPropMean = bandMean;
                        }), function(error) {
                            console.log("Error: ", error.message);
                        });
                    }
                },
                postCreate: function() {
                    this.inherited(arguments);
                    registry.byId("type").on("change", lang.hitch(this, this.clear));
                    if (this.map) {
                        this.drawBox.setMap(this.map);
                        this.drawBox.on("clear", lang.hitch(this, this.clear));
                        this.drawBox.on("IconSelected", lang.hitch(this, this.iconSelected));
                        this.own(on(this.drawBox, 'DrawEnd', lang.hitch(this, this.DrawEnd)));
                        this.map.on("update-end", lang.hitch(this, this.refreshData));
                        this.map.on("update-start", lang.hitch(this, this.showLoading));
                        this.map.on("update-end", lang.hitch(this, this.hideLoading));
                    }
                },
                clear: function() {
                    this.drawBox.drawLayer.clear();
                    registry.byId("chartDialog").hide();
                    if (this.chart) {
                        var series = this.chart.getSeriesOrder("default");
                        for (var a in series) {
                            this.chart.removeSeries(series[a]);
                        }
                        this.chart.removeAxis("x");
                        this.count = 1;
                        this.legend.refresh();
                    }
                },
                iconSelected: function() {
                    if (registry.byId("type").get("value") == "temporal" || registry.byId("type").get("value") == "NDVI") {
                        this.clear();
                    }
                },
                DrawEnd: function(graphic, geotype, commontype) {
                    var point = new Point(graphic.geometry);
                    var normPoint = point.normalize();
                    var imageTask = new ImageServiceIdentifyTask(this.primaryLayer.url);
                    var imageParams = new ImageServiceIdentifyParameters();
                    imageParams.geometry = point;
                    imageParams.pixelSizeX = this.primaryLayer.pixelSizeX;
                    imageParams.pixelSizeY = this.primaryLayer.pixelSizeY;
                    imageTask.execute(imageParams, lang.hitch(this, function(data) {
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
                                        {tooltip: normalizedValues[a],
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
                                                    tooltip: calc});
                                    }

                                    itemInfo.push({
                                        acqDate: items[a].attributes.AcquisitionDate,
                                        values: normalizedValues
                                    });
                                }
                            }

                            var byDate = itemInfo.slice(0);
                            byDate.sort(function(a, b) {
                                return a.acqDate - b.acqDate;
                            });

                            this.temporalData = byDate;
                        } else if (registry.byId("type").get("value") == "NDVI") {
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
//                                    if (this.sensorName == "Landsat 8") {
//                                        var nir = plot[4];
//                                        var red = plot[3];
//                                    } else if (this.sensorName == "Landsat-7-ETM+") {
//                                        var nir = plot[3];
//                                        var red = plot[2];
//                                    }
                                    var nir = plot[this.nirIndex];
                                    var red = plot[this.redIndex];

                                    var calc = (nir - red) / (nir + red);
                                    normalizedValues.push(
                                            {y: calc,
                                                tooltip: calc});

                                    itemInfo.push({
                                        acqDate: items[a].attributes.AcquisitionDate,
                                        values: normalizedValues
                                    });
                                }
                            }

                            var byDate = itemInfo.slice(0);
                            byDate.sort(function(a, b) {
                                return a.acqDate - b.acqDate;
                            });

                            this.NDVIData = byDate;
                            this.NDVIValues = [];
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
                                this.chart.addSeries("NDVI", this.NDVIValues);
                            }
                            this.chart.render();
                            this.legend.refresh();
                        }
                    }));
                },
                degToDMS: function(decDeg, decDir) {
                    /** @type {number} */
                    var d = Math.abs(decDeg);
                    /** @type {number} */
                    var deg = Math.floor(d);
                    d = d - deg;
                    /** @type {number} */
                    var min = Math.floor(d * 60);
                    /** @type {number} */
                    var sec = Math.floor((d - min / 60) * 60 * 60);
                    if (sec === 60) { // can happen due to rounding above
                        min++;
                        sec = 0;
                    }
                    if (min === 60) { // can happen due to rounding above
                        deg++;
                        min = 0;
                    }
                    /** @type {string} */
                    var min_string = min < 10 ? "0" + min : min;
                    /** @type {string} */
                    var sec_string = sec < 10 ? "0" + sec : sec;
                    /** @type {string} */
                    var dir = (decDir === 'LAT') ? (decDeg < 0 ? "S" : "N") : (decDeg < 0 ? "W" : "E");
                    return (decDir === 'LAT') ?
                            deg + "&deg;&nbsp;" + min_string + "&prime;&nbsp;" + sec_string + "&Prime;&nbsp;" + dir :
                            deg + "&deg;&nbsp;" + min_string + "&prime;&nbsp;" + sec_string + "&Prime;&nbsp;" + dir;
                },
                showLoading: function() {
                    esri.show(dom.byId("loadingsp"));
                },
                hideLoading: function() {
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