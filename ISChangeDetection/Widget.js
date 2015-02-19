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
    "esri/layers/RasterFunction",
    "esri/layers/MosaicRule",
    "esri/layers/ArcGISImageServiceLayer",
    "esri/layers/ImageServiceParameters",
    "dojo/dom-construct",
    "esri/dijit/LayerSwipe",
    "dijit/form/HorizontalSlider",
    "dijit/form/HorizontalRule",
    "dijit/form/HorizontalRuleLabels",
    "dijit/form/Select",
    "dijit/form/Button",
    "dijit/form/NumberSpinner",
    "dijit/form/CheckBox",
    "dijit/form/TextBox",
    "dijit/form/DropDownButton",
    "dijit/TooltipDialog",
    "dijit/form/NumberTextBox"

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
                RasterFunction,
                MosaicRule,
                ArcGISImageServiceLayer,
                ImageServiceParameters,
                domConstruct, LayerSwipe, HorizontalSlider, HorizontalRule, HorizontalRuleLabels) {
            var clazz = declare([BaseWidget, _WidgetsInTemplateMixin], {
                templateString: template,
                name: 'ISChangeDetection',
                baseClass: 'jimu-widget-ISChangeDetection',
                layerInfos: [],
                primaryLayerIndex: null,
                secondaryLayerIndex: null,
                primaryLayer: null,
                secondaryLayer: null,
                layerSwipe: null,
                layerList: null,
                startup: function() {
                    this.inherited(arguments);
                    domConstruct.place('<img id="loadingicd" style="position: absolute;top:0;bottom: 0;left: 0;right: 0;margin:auto;z-index:100;" src="' + require.toUrl('jimu') + '/images/loading.gif">', this.domNode);
                    this.hideLoading();
                },
                onOpen: function() {
                    this.refreshData();
                },
                refreshData: function() {
                    if (this.map.layerIds) {
                        this.primaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 1]);
                    }
                },
                postCreate: function() {
                    registry.byId("icdapply").on("click", lang.hitch(this, this.detectChange));
                    if (this.map) {
                        this.map.on("update-end", lang.hitch(this, this.refreshData));
                        this.map.on("update-start", lang.hitch(this, this.showLoading));
                        this.map.on("update-end", lang.hitch(this, this.hideLoading));
                    }
                },
                detectChange: function() {
                    var rrule = new RasterFunction();
                    rrule.rasterFunction = "Arithmetic";
                    rrule.outputPixelType = "U8";

                    var raster1 = new RasterFunction();
                    raster1.rasterFunction = "NDVI";
                    var args1 = {};
                    args1.Raster = "$" + registry.byId("raster1").get("value");
                    args1.VisibleBandID = 4;
                    args1.InfraredBandID = 5;
                    raster1.rasterFunctionArguments = args1;

                    var raster2 = new RasterFunction();
                    raster2.rasterFunction = "NDVI";
                    var args2 = {};
                    args2.Raster = "$" + registry.byId("raster2").get("value");
                    args2.VisibleBandID = 4;
                    args2.InfraredBandID = 5;
                    raster2.rasterFunctionArguments = args2;

                    var argmain = {};
                    argmain.Raster = raster1;
                    argmain.Raster2 = raster2;
                    argmain.Operation = "2";
                    argmain.ExtentType = 0;
                    argmain.CellsizeType = 1;
                    rrule.rasterFunctionArguments = argmain;

                    var mainRule = new RasterFunction();
                    mainRule.functionName = "Remap";
                    var args = {};
                    args.Raster = rrule;
                    args.InputRanges = [0, 1, 10, 255];
                    args.OutputValues = [0, 255];
                    mainRule.arguments = args;
                    mainRule.variableName = "Raster";

                    var mrule = new MosaicRule();
                    mrule.method = MosaicRule.METHOD_LOCKRASTER;
                    mrule.lockRasterIds = [registry.byId("raster1").get("value"), registry.byId("raster2").get("value")];

                    var params = new ImageServiceParameters();
                    params.mosaicRule = mrule;
                    params.renderingRule = mainRule;

                    var elevationProfileLayer = new ArcGISImageServiceLayer(
                            this.primaryLayer.url,
                            {
                                id: "resultLayer",
                                imageServiceParameters: params
                            });
                    this.map.addLayer(elevationProfileLayer);
                },
                showLoading: function() {
                    esri.show(dom.byId("loadingicd"));
                },
                hideLoading: function() {
                    esri.hide(dom.byId("loadingicd"));
                }
            });

            clazz.hasLocale = false;
            clazz.hasSettingPage = false;
            clazz.hasSettingUIFile = false;
            clazz.hasSettingLocale = false;
            clazz.hasSettingStyle = false;
            return clazz;
        });