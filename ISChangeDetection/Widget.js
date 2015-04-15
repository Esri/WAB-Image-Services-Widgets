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
    "dojo/html",
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
                RasterFunction,
                MosaicRule,
                html,
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
                startup: function () {
                    this.inherited(arguments);
                    domConstruct.place('<img id="loadingicd" style="position: absolute;top:0;bottom: 0;left: 0;right: 0;margin:auto;z-index:100;" src="' + require.toUrl('jimu') + '/images/loading.gif">', this.domNode);
                    this.hideLoading();
                },
                onOpen: function () {
                    this.refreshData();
                },
                refreshData: function () {
                    if (this.map.layerIds) {
                        if (this.map.getLayer("resultLayer"))
                        {

                            this.primaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 2]);
                            this.secondaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 3]);

                        }
                        else
                        {
                            this.primaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 1]);
                            this.secondaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 2]);

                        }
                        if (this.secondaryLayer !== undefined && this.primaryLayer !== undefined) {
                            if ((this.primaryLayer.mosaicRule !== null) && (this.primaryLayer.mosaicRule.lockRasterIds !== null) && (this.secondaryLayer.mosaicRule !== null) && (this.secondaryLayer.mosaicRule.lockRasterIds !== null))
                            {
                                dojo.style(dojo.byId("cd"), "display", "block");
                                html.set(this.chooseraster, "");
                            }
                            else
                            {
                                dojo.style(dojo.byId("cd"), "display", "none");
                                html.set(this.chooseraster, "First use time slider to select an image for both primary and secondary images");
                            }

                        }
                        else
                        {
                            dojo.style(dojo.byId("cd"), "display", "none");
                            html.set(this.chooseraster, "First use time slider to select an image for both primary and secondary images");
                        }
                    }
                },
                postCreate: function () {
                    registry.byId("icdapply").on("click", lang.hitch(this, this.detectChange));

                    if (this.map) {
                        this.map.on("update-end", lang.hitch(this, this.refreshData));
                        this.map.on("update-start", lang.hitch(this, this.showLoading));
                        this.map.on("update-end", lang.hitch(this, this.hideLoading));
                    }
                },
                detectChange: function () {

                    if (this.map.getLayer("resultLayer"))
                    {
                        this.map.removeLayer(this.map.getLayer('resultLayer'));
                        this.primaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 1]);
                        this.secondaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 2]);

                    }

                    dojo.style(dojo.byId("cd"), "display", "block");
                    html.set(this.chooseraster, "");
                    var raster1 = new RasterFunction();
                    raster1.functionName = "Grayscale";
                    var args1 = {};
                    args1.Raster = "$" + this.primaryLayer.mosaicRule.lockRasterIds;
                    //args1.VisibleBandID = 4;
                    // args1.InfraredBandID = 5;
                    args1.ConversionParameters = [0.299, 0.387, 0.314];
                    raster1.functionArguments = args1;

                    var raster2 = new RasterFunction();
                    raster2.functionName = "Grayscale";
                    var args2 = {};
                    args2.Raster = "$" + this.secondaryLayer.mosaicRule.lockRasterIds;
                    args2.ConversionParameters = [0.299, 0.387, 0.314];
                    //args2.VisibleBandID = 4;
                    // args2.InfraredBandID = 5;
                    raster2.functionArguments = args2;
                    var raster3 = new RasterFunction();
                    raster3.functionName = "Arithmetic";
                    raster3.OutputPixelType = "U8";
                    var args = {};
                    args.Raster = raster1;
                    args.Raster2 = raster2;
                    args.Operation = "2";
                    args.ExtentType = 0;
                    args.CellsizeType = 1;
                    raster3.functionArguments = args;
                    var params = new ImageServiceParameters();

                    params.renderingRule = raster3;

                    var elevationProfileLayer = new ArcGISImageServiceLayer(
                            this.primaryLayer.url,
                            {
                                id: "resultLayer",
                                imageServiceParameters: params
                            });
                    this.map.addLayer(elevationProfileLayer);


                },
                showLoading: function () {
                    esri.show(dom.byId("loadingicd"));
                },
                hideLoading: function () {
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