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
    "dojo/dom",
    "dojo/dom-construct",
    "dojo/dom-style",
    "esri/request",
    "esri/tasks/ImageServiceIdentifyTask",
    "esri/tasks/ImageServiceIdentifyParameters",
    "esri/geometry/Point",
    "dojox/charting/Chart",
    "dojox/charting/action2d/Tooltip",
    "dojox/charting/themes/PrimaryColors",
    "dojox/charting/widget/SelectableLegend",
    "dojox/charting/action2d/Magnify",
    "dojo/date/locale",
     "esri/symbols/SimpleMarkerSymbol",
     "esri/symbols/SimpleLineSymbol",
     "esri/Color", "esri/toolbars/draw",
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
                registry,
                lang,
                dom,
                domConstruct,
                domStyle, esriRequest, ImageServiceIdentifyTask, ImageServiceIdentifyParameters, Point, Chart, Tooltip, theme, SelectableLegend, Magnify, locale,SimpleMarkerSymbol,SimpleLineSymbol,Color, Draw) {
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
                prevprimaryLayer : null,
                startup: function() {
                    this.inherited(arguments);
                    domConstruct.place('<img id="loadingSpectralProfile" style="position: absolute;top:0;bottom: 0;left: 0;right: 0;margin:auto;z-index:100;" src="' + require.toUrl('jimu') + '/images/loading.gif">', this.domNode);
                    this.hideLoading();
                },
                onOpen: function() {
                   if (this.map) {
                       this.refreshHandler = this.map.on("update-end", lang.hitch(this, this.refreshData));
                   } 
                    this.toolbarSpectralProfile = new Draw(this.map);
                    dojo.connect(this.toolbarSpectralProfile,"onDrawEnd",lang.hitch(this,this.addGraphic));
                    this.toolbarSpectralProfile.activate(Draw.POINT);
                    this.refreshData();
          
                },
                addGraphic: function(geometry){
                     domStyle.set("loadingSpectralProfile","display","block");
                    this.clear();
                    for(var a in this.map.graphics.graphics){
                        if(this.map.graphics.graphics[a].geometry && this.map.graphics.graphics[a].geometry.type==="point" && this.map.graphics.graphics[a].symbol && this.map.graphics.graphics[a].symbol.color.r===255){
                            this.map.graphics.remove(this.map.graphics.graphics[a]);
                            break;
                        }
                    }
                    var symbol = new esri.symbol.SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 20,
                                    new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                                            new Color([255, 0, 0]), 1),
                                    new Color([255, 0, 0, 0.35]));
                    var graphic = new esri.Graphic(geometry, symbol);
                    this.map.graphics.add(graphic);
                    this.spectralprofile(geometry);
                   
                },
                refreshData: function() {
                    if (this.map.layerIds) {
                        if (this.map.getLayer("resultLayer")) {
                            this.primaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 2]);
                        } else {
                            this.primaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 1]);
                        }
                      if(this.primaryLayer && this.primaryLayer.minValues && this.primaryLayer.maxValues) {
                        this.minValue = this.primaryLayer.minValues[0];
                        this.maxValue = this.primaryLayer.maxValues[0];
                    }
                        if(this.primaryLayer !== this.prevprimaryLayer){
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
                        }), function(error) {
                            console.log("Error: ", error.message);
                        });
                         this.prevprimaryLayer = this.primaryLayer;
                        } }
                },onClose : function()
                {
                    this.clear();
                     for(var a in this.map.graphics.graphics){
                        if(this.map.graphics.graphics[a].geometry && this.map.graphics.graphics[a].geometry.type==="point" && this.map.graphics.graphics[a].symbol && this.map.graphics.graphics[a].symbol.color.r===255){
                            this.map.graphics.remove(this.map.graphics.graphics[a]);
                            break;
                        }
                    }
                    if(this.refreshHandler) {
                  this.refreshHandler.remove();
                  this.refreshHandler = null;
              }
                   this.toolbarSpectralProfile.deactivate();
                },
                postCreate: function() {
                    this.inherited(arguments);
                    registry.byId("type").on("change", lang.hitch(this, this.clear));
                   
                },
                clear: function() {
                    registry.byId("chartDialog").hide();
                    if (this.chart) {
                       dojo.empty("chartNode");
                   }
                },
                iconSelected: function() {
                    if (registry.byId("type").get("value") == "temporal" || registry.byId("type").get("value") == "NDVI") {
                        this.clear();
                    }
                },
                spectralprofile : function(point){
                       registry.byId("chartDialog").hide();
                  if(this.primaryLayer.renderingRule) 
                      var renderer = this.primaryLayer.renderingRule;
                  else
                      var renderer = "";
                  if(this.primaryLayer.mosaicRule) 
                      var mosaic = this.primaryLayer.mosaicRule;
                  else
                      var mosaic = "";                   
                  
                    var imageTask = new ImageServiceIdentifyTask(this.primaryLayer.url);
                    var imageParams = new ImageServiceIdentifyParameters();
                   
                    imageParams.geometry = point;
                    imageParams.pixelSizeX = this.primaryLayer.pixelSizeX;
                    imageParams.pixelSizeY = this.primaryLayer.pixelSizeY;
                    imageParams.renderingRule = renderer;
                    imageParams.mosaicRule = mosaic;
                    imageTask.execute(imageParams, lang.hitch(this, function(data) {
                        if (registry.byId("type").get("value") === "nonTemporal") {
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
                                if(this.maxValue && this.minValue)
                                normalizedValues[a] = (values[a] - this.minValue) / (this.maxValue - this.minValue);
                            else
                                normalizedValues[a] = values[a];
                            }
                            this.chartData = [];
                            for (a in normalizedValues) {
                                this.chartData.push(
                                        {tooltip: normalizedValues[a].toFixed(4),
                                            y: normalizedValues[a]});
                            }
                        } else if (registry.byId("type").get("value") === "temporal") {
                            var items = data.catalogItems.features;
                            var props = data.properties.Values;
                            var itemInfo = [];

                            for (var a in items) {
                                if (items[a].attributes.Category === 1) {
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
                                        if(this.minValue && this.maxValue)
                                        var calc = (plot[j] - this.minValue) / (this.maxValue - this.minValue);
                                        else
                                            var calc = plot[j];
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
                            byDate.sort(function(a, b) {
                                return a.acqDate - b.acqDate;
                            });

                            this.temporalData = byDate;
                        } else if (registry.byId("type").get("value") === "NDVI") {
                            var items = data.catalogItems.features;
                            var props = data.properties.Values;
                            var itemInfo = [];
                            var itemInfo1 = [];
                            var itemInfo2 = [];
                            for (var a in items) {
                                if (items[a].attributes.Category === 1) {
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
                                 if(this.nirIndex && this.redIndex){
                                    var nir = plot[this.nirIndex];
                                    var red = plot[this.redIndex];
                                     var calc = (nir - red) / (nir + red);
                                      normalizedValues.push(
                                            {y: calc,
                                                tooltip: calc.toFixed(4) + ", " + (locale.format(new Date(items[a].attributes.AcquisitionDate), {selector: "date", datePattern: "dd/MM/yy"}))});
                                     itemInfo.push({
                                        acqDate: items[a].attributes.AcquisitionDate,
                                        values: normalizedValues
                                    });
                                 }
                                 if(this.swir1Index){
                                    var swir1 = plot[this.swir1Index];
                                    var ndmi = ((nir - swir1) / (nir + swir1));
                                    var urban = (((swir1 - nir) / (swir1 + nir)) - ((nir - red) / (red + nir))) / 2;
                                
                                    normalizedValues1.push(
                                        {y: ndmi,
                                            tooltip: ndmi.toFixed(4) + ", " + locale.format(new Date(items[a].attributes.AcquisitionDate), {selector: "date", datePattern: "dd/MM/yy"})});

                                    normalizedValues2.push(
                                        {y: urban,
                                            tooltip: urban.toFixed(4) + ", " + locale.format(new Date(items[a].attributes.AcquisitionDate), {selector: "date", datePattern: "dd/MM/yy"})});
                                   
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
                        }
                        if(itemInfo[0]) {
                            var byDate = itemInfo.slice(0);
                         byDate.sort(function(a, b) {
                                return a.acqDate - b.acqDate;
                            });
                            this.NDVIData = byDate;
                        }
                          if(itemInfo1[0] && itemInfo2[0]){
                            var byDate1 = itemInfo1.slice(0);

                        var byDate2 = itemInfo2.slice(0);
                              byDate1.sort(function (a, b) {
                            return a.acqDate - b.acqDate;
                        });

                        byDate2.sort(function (a, b) {
                            return a.acqDate - b.acqDate;
                        });
                            this.NDVIData1 = byDate1;
                        this.NDVIData2 = byDate2;
                        
                            }
                            this.NDVIValues = [];
                            this.NDVIValues1 = [];
                        this.NDVIValues2 = [];
                            this.NDVIDates = [];
                            if(this.NDVIData){
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
                            if(this.NDVIData1 && this.NDVIData2){ 
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
                    }

                        this.axesParams = [];
                        for (a in this.bandPropMean) {
                            this.axesParams[a] = {
                                value: parseInt(a) + 1,
                                text: this.bandNames[a]
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
                            this.chart.setWindow(1, 1, -1, 0)

                            this.count = 1;

                            this.chart.addAxis("y", {vertical: true, fixLower: "major", fixUpper: "major", title: "Data Values", titleOrientation: "axis"});

                            if (registry.byId("type").get("value") === "nonTemporal") {
                                this.chart.addAxis("x", {labels: this.axesParams, labelSizeChange: true, title: "Spectral Bands", titleOrientation: "away", minorTicks: false, majorTickStep: 1});
                                   this.chart.addSeries("Selected Point", this.chartData);
                                this.count++;
                            } else if (registry.byId("type").get("value") === "temporal") {
                                this.chart.addAxis("x", {labels: this.axesParams, labelSizeChange: true, title: "Spectral Bands", titleOrientation: "away", minorTicks: false, majorTickStep: 1});
                                for (var x in this.temporalData) {
                                    this.chart.addSeries(locale.format(new Date(this.temporalData[x].acqDate), {selector: "date", formatLength: "long"}), this.temporalData[x].values);
                                }
                            } else if (registry.byId("type").get("value") === "NDVI") {
                                this.chart.addAxis("x", {labels: this.NDVIDates, labelSizeChange: true, title: "Acquisition Date", titleOrientation: "away", majorTickStep: 1, minorTicks: false});
                               if(this.NDVIValues1)
                                this.chart.addSeries("NDMI Moisture", this.NDVIValues1, {hidden: true});
                            if(this.NDVIValues2)   
                            this.chart.addSeries("Urban", this.NDVIValues2, {hidden: true});
                            if(this.NDVIValues)    
                            this.chart.addSeries("NDVI", this.NDVIValues);
                            }
                           
                            this.magnify = new Magnify(this.chart, "default");
                            this.toolTip = new Tooltip(this.chart, "default");
                            this.chart.render();
                       if(!this.legend)
                        this.legend = new SelectableLegend({chart: this.chart, horizontal: false, outline: false}, "legend");
                            else{
                                     this.legend.set("params", {chart: this.chart, horizontal: true, outline: false});
                                        this.legend.set("chart", this.chart);
                                        this.legend.refresh();
                                    }
                            domConstruct.destroy("chartDialog_underlay");
                   domStyle.set("loadingSpectralProfile","display","none");
                    }),lang.hitch(this, function(error){
                         domStyle.set("loadingSpectralProfile","display","none");
                    }));
                },
                
                showLoading: function() {
                    domStyle.set("loadingSpectralProfile","display","block");
                },
                hideLoading: function() {
                    domStyle.set("loadingSpectralProfile","display","none");
                }
            });
            clazz.hasLocale = false;
            clazz.hasSettingPage = false;
            clazz.hasSettingUIFile = false;
            clazz.hasSettingLocale = false;
            clazz.hasSettingStyle = false;
            return clazz;
        });