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
    "dojo/on",
    "dijit/registry",
    "dojo/_base/lang",
    "dojo/html",
    "dojo/dom",
    "esri/layers/MosaicRule",
    "esri/tasks/query",
    "esri/tasks/QueryTask",
    "esri/geometry/Extent",
    "dojo/date/locale",
    "esri/geometry/Point",
    "dojox/charting/Chart",
    "dojox/charting/action2d/Tooltip",
    "dojox/charting/themes/Chris",
    "esri/SpatialReference",
    "dojox/charting/widget/SelectableLegend",
    "dojox/charting/action2d/Magnify",
    "dojo/html",
    "dojo/dom-construct",
    "dijit/form/HorizontalSlider",
    "dijit/form/HorizontalRule",
    "dijit/form/HorizontalRuleLabels",
    "dojo/_base/array",
    "esri/graphic",
    "esri/symbols/SimpleLineSymbol",
    "esri/symbols/SimpleFillSymbol",
    "esri/Color",
    "esri/InfoTemplate",
    "dojo/dom-style",
    "esri/tasks/ImageServiceIdentifyTask",
    "esri/tasks/ImageServiceIdentifyParameters",
    "esri/geometry/Polygon",
    "esri/geometry/Point",
    "esri/request",
    "dojo/_base/connect",
    "esri/symbols/SimpleMarkerSymbol",
    "esri/Color",
    "jimu/PanelManager",
    "dijit/form/Select",
    "dijit/form/Button",
    "dijit/form/NumberSpinner",
    "dijit/form/CheckBox",
    "dijit/form/TextBox",
    "dijit/form/DropDownButton",
    "dijit/TooltipDialog",
    "dijit/Tooltip",
    "dijit/Dialog",
    "dojox/charting/plot2d/Lines",
    "dojox/charting/plot2d/Markers",
    "dojox/charting/axis2d/Default",
    "esri/graphic"
],
        function (
                declare,
                _WidgetsInTemplateMixin,
                template,
                BaseWidget,
                on,
                registry,
                lang,
                html,
                dom,
                MosaicRule,
                Query, QueryTask, Extent, locale, Point, Chart, Tooltip, theme, SpatialReference, SelectableLegend, Magnify, html, domConstruct, HorizontalSlider, HorizontalRule, HorizontalRuleLabels, array, Graphic, SimpleLineSymbol, SimpleFillSymbol, Color, InfoTemplate, domStyle, ImageServiceIdentifyTask, ImageServiceIdentifyParameters, Polygon, Point, esriRequest, connect, SimpleMarkerSymbol, Color, PanelManager) {

            var pm = PanelManager.getInstance();
            var clazz = declare([BaseWidget, _WidgetsInTemplateMixin], {
                templateString: template,
                name: 'ISTimeFilterProfile',
                baseClass: 'jimu-widget-ISTimeFilterProfile',
                primaryLayer: null,
                secLayer: null,
                orderedDates: null,
                sliderRules: null,
                sliderLabels: null,
                slider: null,
                features: null,
                featureid: null,
                sliderValue: null,
                featureIds: [],
                bandNames: [],
                responseAlert: true,
                clickhandle: null,
                clickhandle2: null,
                w: null,
                h: null,
                datesclick: null,
                index2: true,
                item: false,
                graphid: [],
                flagvalue: true,
                handlerer: null,
                point1: null,
                point2: null,
                itt: null,
                itt1: null,
                secdlayer: null,
                ab: null,
                abb: null,
                i: null,
                xmin: null,
                xmax: null,
                ymin: null,
                ymax: null,
                ex: null,
                startup: function () {
                    this.inherited(arguments);
                    domConstruct.place('<img id="loadingts1" style="position: absolute;top:0;bottom: 0;left: 0;right: 0;margin:auto;z-index:100;" src="' + require.toUrl('jimu') + '/images/loading.gif">', this.domNode);

                    this.hideLoading();
                },
                postCreate: function () {


                    registry.byId("refreshTimesliderBtn1").on("click", lang.hitch(this, this.timeSliderRefresh));
                    registry.byId("timeFilter1").on("change", lang.hitch(this, this.setFilterDiv));

                    if (this.map) {
                        this.map.on("update-end", lang.hitch(this, this.refreshData));
                        this.map.on("update-start", lang.hitch(this, this.showLoading));
                        this.map.on("update-end", lang.hitch(this, this.hideLoading));


                    }
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
                onOpen: function () {
                    domStyle.set("loadingts1", "display", "block");

                    
                    this.refreshData();
                    this.ab = true;
                    this.clickhandle = this.map.on("click", lang.hitch(this, this.temporalprof));
                    this.abb = this.map.on("click", lang.hitch(this, this.addgraphics));
                    domStyle.set("loadingts1", "display", "none");
                },
                onClose: function ()
                {


                    html.set(this.pointgraph, "");
                    this.clear();

                    this.item = false;

                    domStyle.set("slider1", "display", "block");
                    domStyle.set("slider2", "display", "block");
                    domStyle.set("slider3", "display", "block");
                    if (this.clickhandle !== null)
                    {
                        this.clickhandle.remove();
                        this.clickhandle = null;
                    }
                    this.abb.remove();

                    this.abb = null;

                },
                clear: function () {

                    registry.byId("timeDialog").hide();

                    if (this.chart) {
                        if (this.map.graphics.graphics[1])
                        {
                            this.map.graphics.remove(this.map.graphics.graphics[1]);
                        }
                        var series = this.chart.getSeriesOrder("default");
                        for (var a in series) {
                            this.chart.removeSeries(series[a]);
                        }
                        this.chart.removeAxis("x");
                        this.count = 1;
                        this.legend.refresh();
                    }

                },
                checktime : function(currentVersion, timeInfo)
                {
                    if (currentVersion >= 10.21) {
                                if (timeInfo) {
                                    var field = timeInfo.startTimeField;
                                    if (field) {
                                        this.dateField = field;

                                        registry.byId("timeFilter1").set("disabled", false);
                                        if (this.item == true)
                                        {
                                               if(registry.byId("timeDialog").open)
                            {}
                            else{
                            registry.byId("timeDialog").show();
                        }
                        html.set(this.temporalpro1, "");
                                         }
                                         else
                                         {
                                         if(registry.byId("timeFilter1").checked === true)
                                         {html.set(this.temporalpro1, "Pick point on map to get temporal profile for that point")};}
                                        html.set(this.errorDiv1, "");
                                    }
                                    else {
                                        registry.byId("timeFilter1").set("checked", false);
                                        registry.byId("timeFilter1").set("disabled", true);
                                        html.set(this.errorDiv1, "TimeInfo is absent");
                                        html.set(this.temporalpro1, "");
                                        registry.byId("timeDialog").hide();
                                    }
                                } else {
                                    registry.byId("timeFilter1").set("checked", false);
                                    registry.byId("timeFilter1").set("disabled", true);
                                    registry.byId("timeDialog").hide();
                                    html.set(this.errorDiv1, "TimeInfo is absent");
                                    html.set(this.temporalpro1, "");
                                }
                            } else {
                                registry.byId("timeFilter1").set("checked", false);
                                registry.byId("timeFilter1").set("disabled", true);
                                registry.byId("timeDialog").hide();
                                html.set(this.errorDiv1, "Services pre 10.2.1 not supported");
                                html.set(this.temporalpro1, "");
                            }
                },
                refreshData: function () {



                    if (this.map.layerIds) {
                        this.prevPrimary = this.primaryLayer;
                        if (this.map.getLayer("resultLayer")) {
                            if (this.primaryLayer != this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 2]) && this.primaryLayer) {
                                this.primaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 2]);
                                // registry.byId("timeFilter1").set("checked", false);
//                                this.timeSliderRefresh();
                            } else {
                                this.primaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 2]);
                            }
                        } else {
                            if (this.primaryLayer != this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 1]) && this.primaryLayer) {
                                this.primaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 1]);
                                //  registry.byId("timeFilter1").set("checked", false);
//                                this.timeSliderRefresh();
                            } else {
                                this.primaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 1]);
                            }
                        }




                        this.minValue = this.primaryLayer.minValues[0];
                        this.maxValue = this.primaryLayer.maxValues[0];
                        if (this.minValue === undefined || this.maxValue === undefined)
                        {
                            this.pixeltype = this.primaryLayer.pixelType;
                            switch (this.pixeltype)
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
                        if(this.config.bandNames  === '')
                        {
                            
                        
                        if(this.primaryLayer !== this.secLayer)
                        {
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
                            if (this.sensorName == "Landsat 8") {
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

                        }), function (error) {
                            console.log("Error: ", error.message);
                        });
                    }
                }
                    else
                    {
                        this.bandNames = [];
                        this.bandNames = this.config.bandNames.split(",");
                        
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

                    
                    }

                        
                        if (!this.prevPrimary) {
                            this.mosaicBackup = this.primaryLayer.mosaicRule;
                            this.primaryLayer.on("visibility-change", lang.hitch(this, this.sliderChange));
                        } else if (this.prevPrimary.url != this.primaryLayer.url) {
                            this.mosaicBackup = this.primaryLayer.mosaicRule;
                            this.primaryLayer.on("visibility-change", lang.hitch(this, this.sliderChange));
                        } else if (this.prevPrimary.url == this.primaryLayer.url && this.primaryLayer.mosaicRule) {
                            if (this.primaryLayer.mosaicRule.method != "esriMosaicLockRaster") {
                                this.mosaicBackup = this.primaryLayer.mosaicRule;
                            }
                        }
                         var currentVersion = this.primaryLayer.currentVersion;
                            
                           if(this.primaryLayer.timeInfo && this.primaryLayer.currentVersion)
                           {
                               var timeInfo = this.primaryLayer.timeInfo;
                               var currentVersion = this.primaryLayer.currentVersion;
                               this.checktime(currentVersion, timeInfo);
                           }
                           else {
                               var layersRequest = esriRequest({
                            url: this.primaryLayer.url,
                            content: {f: "json"},
                            handleAs: "json",
                            callbackParamName: "callback"
                        });
                        layersRequest.then(lang.hitch(this, function(data) {
                            var timeInfo = data.timeInfo;
                            var currentVersion = data.currentVersion;
                            this.checktime(currentVersion, timeInfo);
                        }),lang.hitch(this, function (error) {
                            domStyle.set("loadingts1", "display", "none");
                        }));
                           }
                
                        if (!this.slider) {

                            this.timeSliderShow();
                        }
                    }
                    domStyle.set("loadingts1", "display", "none");
                    this.secLayer = this.primaryLayer;
                },
                limitvalue: function (num)
                {
                    if (num < (-1))
                    {
                        num = -1;
                    }
                    if (num > 1)
                    {
                        num = 1;
                    }
                    return num;
                },
                temporalprof: function (evt)
                {

                    registry.byId("timeDialog").hide();

                    this.item = true;

                    this.clear();


                    domStyle.set(dom.byId("loadingts1"), "display", "block");

                    var request1 = esriRequest({
                        url: this.primaryLayer.url + "/getSamples",
                        content: {
                            geometry: '{"x":' + evt.mapPoint.x + ',"y":' + evt.mapPoint.y + ',"spatialReference":{"wkid":' + evt.mapPoint.spatialReference.wkid + '}}',
                            geometryType: "esriGeometryPoint",
                            returnGeometry: false,
                            returnFirstValueOnly: false,
                            outFields: 'AcquisitionDate,OBJECTID,GroupName,Category',
                            pixelSize: [this.primaryLayer.pixelSizeX, this.primaryLayer.pixelSizeY],
                            f: "json"
                        },
                        handleAs: "json",
                        callbackParamName: "callback"
                    });
                    request1.then(lang.hitch(this, function (data) {
                       
                        var items = data.samples;

                        var itemInfo = [];

                        var itemInfo2 = [];

                        var itemInfo4 = [];



                        for (var a in items) {


                            if (items[a].attributes.Category == 1) {
                                var plot = items[a].value.split(' ');
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
                                var normalizedValues3 = [];
                                var normalizedValues4 = [];
                                //                                   
                                var nir = plot[this.nirIndex] - 5000;
                                var red = plot[this.redIndex] - 5000;
                                var calc = (nir - red) / (red + nir);
                                var green = plot[this.greenIndex] - 5000;
                                var swir1 = plot[this.swir1Index] - 5000;
                                var swir2 = plot[this.swir2Index] - 5000;
                                var cirrus = plot[this.cirrusIndex] - 5000;


                                var ndmi = ((nir - swir1) / (nir + swir1));

                                var urban = (((swir1 - nir) / (swir1 + nir)) - ((nir - red) / (red + nir))) / 2;

                                ndmi = this.limitvalue(ndmi);

                                calc = this.limitvalue(calc);
                                urban = this.limitvalue(urban);
                                normalizedValues.push(
                                        {y: calc,
                                            tooltip: calc.toFixed(3) + ", " + locale.format(new Date(items[a].attributes.AcquisitionDate), {selector: "date", datePattern: "dd/MM/yy"})});

                                normalizedValues2.push(
                                        {y: ndmi,
                                            tooltip: ndmi.toFixed(3) + ", " + locale.format(new Date(items[a].attributes.AcquisitionDate), {selector: "date", datePattern: "dd/MM/yy"})});

                                normalizedValues4.push(
                                        {y: urban,
                                            tooltip: urban.toFixed(3) + ", " + locale.format(new Date(items[a].attributes.AcquisitionDate), {selector: "date", datePattern: "dd/MM/yy"})});
                                itemInfo.push({
                                    acqDate: items[a].attributes.AcquisitionDate,
                                    objid: items[a].attributes.OBJECTID,
                                    values: normalizedValues,
                                    name: items[a].attributes.GroupName
                                });


                                itemInfo2.push({
                                    acqDate: items[a].attributes.AcquisitionDate,
                                    objid: items[a].attributes.OBJECTID,
                                    values: normalizedValues2,
                                    name: items[a].attributes.GroupName
                                });

                                itemInfo4.push({
                                    acqDate: items[a].attributes.AcquisitionDate,
                                    objid: items[a].attributes.OBJECTID,
                                    values: normalizedValues4
                                });
                            }
                        }


                        var byDate = itemInfo.slice(0);

                        var byDate2 = itemInfo2.slice(0);

                        var byDate4 = itemInfo4.slice(0);
                        byDate.sort(function (a, b) {
                            return a.acqDate - b.acqDate;
                        });

                        byDate2.sort(function (a, b) {
                            return a.acqDate - b.acqDate;
                        });

                        byDate4.sort(function (a, b) {
                            return a.acqDate - b.acqDate;
                        });

                      

                        this.NDVIData = byDate;
                        this.NDVIData2 = byDate2;
                        this.NDVIData4 = byDate4;
                        this.NDVIValues = [];
                        this.NDVIValues2 = [];
                        this.NDVIValues4 = [];
                        this.NDVIDates = [];

                        for (var a = 0; a < this.NDVIData.length; a++) {
                            this.NDVIDates.push({
                                text: locale.format(new Date(this.NDVIData[a].acqDate), {selector: "date", datePattern: "dd/MM/yy"}),
                                value: parseInt(a) + 1,
                            });

                            this.NDVIValues.push({
                                y: this.NDVIData[a].values[0].y,
                                tooltip: this.NDVIData[a].values[0].tooltip
                            });
                        }



                        for (a in this.NDVIData2) {

                            this.NDVIValues2.push({
                                y: this.NDVIData2[a].values[0].y,
                                tooltip: this.NDVIData2[a].values[0].tooltip
                            });
                        }

                        for (a in this.NDVIData4) {

                            this.NDVIValues4.push({
                                y: this.NDVIData4[a].values[0].y,
                                tooltip: this.NDVIData4[a].values[0].tooltip
                            });
                        }


                        this.axesParams = [];
                        for (a in this.bandPropMean) {
                            this.axesParams[a] = {
                                value: parseInt(a) + 1,
                                text: this.bandNames[a]
                            };
                        }
                        if (!this.chart) {
                            html.set(this.temporalpro1, "");
                           
                            html.set(this.pointgraph, "Pick point on map to reset location.Pick point on graph to set image date");
                               if(registry.byId("timeDialog").open)
                            {}
                            else{
                            registry.byId("timeDialog").show();
                        }
                            
                            this.chart = new Chart("chartNode3");
                            this.chart.addPlot("default", {
                                type: "Lines",
                                markers: true,
                                shadows: {dx: 4, dy: 4}
                            });
                            this.chart.setTheme(theme);


                            this.count = 1;

                            this.chart.addAxis("y", {vertical: true, fixLower: "major", fixUpper: "major", title: "Data Values", titleOrientation: "axis"});
                            this.chart.addAxis("x", {labels: this.NDVIDates, labelSizeChange: true, title: "Acquisition Date", titleOrientation: "away", majorTickStep: 1, minorTicks: false});

                            this.chart.addSeries("NDMI Moisture", this.NDVIValues2, {hidden: true});
                            this.chart.addSeries("Urban", this.NDVIValues4, {hidden: true});
                            this.chart.addSeries("NDVI Vegetation", this.NDVIValues);
                            if(registry.byId("timeDialog").open)
                            {}
                            else{
                            registry.byId("timeDialog").show();
                        }html.set(this.temporalpro1, "");
                           
                            html.set(this.pointgraph, "Pick point on map to reset location. Pick point on graph to set image date");


                            this.toolTip = new Tooltip(this.chart, "default");
                            this.magnify = new Magnify(this.chart, "default");
                            this.chart.render();
                            this.legend = new SelectableLegend({chart: this.chart, horizontal: true, outline: false}, "legend3");
                            domConstruct.destroy("timeDialog_underlay");
                        } else {
                              if(registry.byId("timeDialog").open)
                            {}
                            else{
                            registry.byId("timeDialog").show();
                        }
                            html.set(this.temporalpro1, "");
                            
                            html.set(this.pointgraph, "Pick point on map to reset location. Pick point on graph to set image date");
                            if (!this.chart.getAxis("x")) {
                                this.chart.addAxis("x", {labels: this.NDVIDates, labelSizeChange: true, title: "Acquisition Date", titleOrientation: "away", minorTicks: false, majorTickStep: 1});
                            }

                            this.chart.addSeries("NDMI Moisture", this.NDVIValues2, {hidden: true});

                            this.chart.addSeries("Urban", this.NDVIValues4, {hidden: true});
                            this.chart.addSeries("NDVI Vegetation", this.NDVIValues);
                            this.chart.render();
                            this.legend.refresh();

                        }
                        

                        this.chart.connectToPlot("default", lang.hitch(this, this.clickdata));
                        html.set(this.pointgraph, "Pick point on map to reset location.Pick point on graph to set image date");

                        domStyle.set("slider1", "display", "none");
                        domStyle.set("slider2", "display", "none");
                        domStyle.set("slider3", "display", "none");
                        domStyle.set(dom.byId("loadingts1"), "display", "none");
                     
                    }), lang.hitch(this, function (error)
                    {
                        domStyle.set(dom.byId("loadingts1"), "display", "none");
                    }));

                },
                clickdata: function (evt)
                {

                    var type2 = evt.type;
                    if (type2 === "onclick")
                    {

                        this.datesclick = (evt.x - 1);

                        for (var g = 0; g < this.graphid.length; g++)
                        {

                            if ((this.graphid[g].date === this.NDVIData[this.datesclick].acqDate))
                            {

                                this.slider.set("value", g);
                                this.sliderChange();

                            }
                            if ((this.graphid[g].date === this.NDVIData2[this.datesclick].acqDate))
                            {

                                this.slider.set("value", g);
                                this.sliderChange();

                            }
                            if ((this.graphid[g].date === this.NDVIData4[this.datesclick].acqDate))
                            {

                                this.slider.set("value", g);
                                this.sliderChange();

                            }
                        }

                    }
                },
                setFilterDiv: function () {
                    if (registry.byId("timeFilter1").get("checked")) {
                        if (!this.slider) {
                            this.timeSliderShow();
                        } else {
                            this.timeSliderRefresh();
                        }
                        domStyle.set(this.filterDiv1, "display", "block");
                        
                        if(this.abb == null)
                        {
                            
                        this.abb = this.map.on("click", lang.hitch(this, this.addgraphics));}
                    if(this.clickhandle === null)
                    {
                        this.clickhandle = this.map.on("click", lang.hitch(this, this.temporalprof));
                    }

                    } else {
                        domStyle.set(this.filterDiv1, "display", "none");
                        registry.byId("timeDialog").hide();
                        this.item = false;
                        this.clear();
                         html.set(this.temporalpro1, "");
                         if(this.abb != null)
                         {
                             this.abb.remove();
                             this.abb = null;
                         }
                         if(this.clickhandle != null)
                         {
                             this.clickhandle.remove();
                             this.clickhandle = null;
                         }
                             
                        // this.map.graphics.clear();
                        if (this.mosaicBackup) {
                            var mr = new MosaicRule(this.mosaicBackup);
                        } else {
                            var mr = new MosaicRule({"mosaicMethod": "esriMosaicNone", "ascending": true, "mosaicOperation": "MT_FIRST"});
                        }
                        this.primaryLayer.setMosaicRule(mr);
                    }
                },
                timeSliderShow: function () {
                    if (this.primaryLayer && registry.byId("timeFilter1").get("checked")) {
                        if (this.graphid !== [])
                        {
                            this.graphid = [];
                        }
                        var layer = this.primaryLayer;
                        var extent = new Extent(this.map.extent);
                        var xlength = (extent.xmax - extent.xmin) / 4;
                        var ylength = (extent.ymax - extent.ymin) / 4;
                        var xminnew = extent.xmin + xlength;
                        var xmaxnew = extent.xmax - xlength;
                        var yminnew = extent.ymin + ylength;
                        var ymaxnew = extent.ymax - ylength;
                        var extentnew = new Extent(xminnew, yminnew, xmaxnew, ymaxnew, extent.spatialReference);
                        var query = new Query();
                        query.geometry = extentnew;
                        query.outFields = [this.dateField];
                        query.where = "Category = 1";
                        query.orderByFields = [this.dateField];
                        query.returnGeometry = false;
                        this.showLoading();

                        var queryTask = new QueryTask(this.primaryLayer.url);
                        queryTask.execute(query, lang.hitch(this, function (result) {
                            this.orderedFeatures = result.features;





                            this.orderedDates = [];
                            for (var a in this.orderedFeatures) {
                                this.orderedDates.push(this.orderedFeatures[a].attributes[this.dateField]);
                            }


                            this.featureLength = this.orderedFeatures.length;

                            var sliderNode = domConstruct.create("div", {}, this.timeSliderDiv, "first");

                            var rulesNode = domConstruct.create("div", {}, sliderNode, "first");
                            this.sliderRules = new HorizontalRule({
                                id: "slider1",
                                container: "bottomDecoration",
                                count: this.featureLength,
                                style: "height:5px;"
                            }, rulesNode);

                            var labels = [];
                            for (var i = 0; i < this.orderedDates.length; i++) {
                                labels[i] = locale.format(new Date(this.orderedDates[i]), {selector: "date", datePattern: "dd/MM/yy"}); //formatLength: "short"});
                            }

                            for (var i = 0; i < this.orderedDates.length; i++) {
                                this.graphid.push({
                                    date: this.orderedDates[i],
                                    //obj: this.orderedFeatures[i].attributes.OBJECTID,
                                  //  name: this.orderedFeatures[i].attributes.GroupName
                                });
                            }

                            var labelsNode = domConstruct.create("div", {}, sliderNode, "second");
                            this.sliderLabels = new HorizontalRuleLabels({
                                id: "slider2",
                                container: "bottomDecoration",
                                labelStyle: "height:1em;font-size:75%;color:gray;",
                                labels: [labels[0], labels[this.orderedDates.length - 1]]
                            }, labelsNode);

                            this.slider = new HorizontalSlider({
                                id: "slider3",
                                name: "slider",
                                value: 0,
                                minimum: 0,
                                maximum: this.featureLength - 1,
                                discreteValues: this.featureLength,
                                showButtons: true,
                                onChange: lang.hitch(this, this.sliderChange)
                            }, sliderNode);

                            this.slider.startup();
                            this.sliderRules.startup();
                            this.sliderLabels.startup();

                            var polygonJson = {"rings": [[[extent.xmin, extent.ymin], [extent.xmin, extent.ymax], [extent.xmax, extent.ymax], [extent.xmax, extent.ymin],
                                        [extent.xmin, extent.ymin]]], "spatialReference": {"wkid": 102100}};
                            var polygon = new Polygon(polygonJson);
                            var imageTask = new ImageServiceIdentifyTask(this.primaryLayer.url);
                            var imageParams = new ImageServiceIdentifyParameters();
                            imageParams.geometry = new Point(polygon.getCentroid());
                            imageParams.returnGeometry = false;
                            imageTask.execute(imageParams, lang.hitch(this, function (data) {
                                if (data.catalogItems.features[0]) {
                                    var maxVisible = data.catalogItems.features[0].attributes.OBJECTID;
                                    for (var z in this.orderedFeatures) {
                                        if (this.orderedFeatures[z].attributes.OBJECTID == maxVisible) {
                                            var index = z;
                                        }
                                    }
                                    this.slider.set("value", index);
                                    this.sliderChange();
                                }
                                html.set(this.dateRange, locale.format(new Date(this.orderedDates[this.featureLength - 1]), {selector: "date", formatLength: "long"}));
                                //html.set(this.imageCount, "1");
                                this.hideLoading();
                            }), lang.hitch(this, function (error) {
                                this.hideLoading();
                                this.slider.set("value", 0);
                                this.sliderChange();
                            }));
                            this.hideLoading();
                        }),lang.hitch(this, function(error){
                            this.hideLoading();
                        }));


                    }
                },
                timeSliderHide: function () {
                    this.sliderRules.destroy();
                    this.sliderLabels.destroy();
                    this.slider.destroy();
                },
                sliderChange: function () {
                    if (registry.byId("timeFilter1").get("checked")) {

                        this.sliderValue = this.slider.get("value");

                        var aqDate = this.orderedFeatures[this.slider.get("value")].attributes[this.dateField];

                        var featureSelect = [];
                        this.featureIds = [];


                        featureSelect.push(this.orderedFeatures[this.slider.get("value")]);
                        this.featureIds.push(this.orderedFeatures[this.slider.get("value")].attributes.OBJECTID);
                        this.featureid = this.orderedFeatures[this.slider.get("value")].attributes.OBJECTID;
                        html.set(this.dateRange, locale.format(new Date(aqDate), {selector: "date", formatLength: "long"}));

                        var mr = new MosaicRule();
                        mr.method = MosaicRule.METHOD_LOCKRASTER;
                        mr.ascending = true;
                        mr.operation = "MT_FIRST";
                        mr.lockRasterIds = this.featureIds;
                        this.primaryLayer.setMosaicRule(mr);
                         }

                },
                timeSliderRefresh: function () {
                    if (this.slider) {
                        this.timeSliderHide();
                        this.timeSliderShow();
                         registry.byId("timeDialog").hide();
                         this.clear();
                        this.item = false;
                    }
                },
                showLoading: function () {
                    esri.show(dom.byId("loadingts1"));
                },
                hideLoading: function () {
                    esri.hide(dom.byId("loadingts1"));
                }
            });

            clazz.hasLocale = false;
            return clazz;
        });