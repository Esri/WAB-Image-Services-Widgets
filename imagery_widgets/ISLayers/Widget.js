///////////////////////////////////////////////////////////////////////////
// Copyright (c) 2017 Esri. All Rights Reserved.
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
    "esri/arcgis/utils",
    "dijit/registry",
    "dojo/_base/lang",
    'dojo/dom-construct',
    "esri/request",
    "esri/layers/RasterFunction",
    "esri/layers/MosaicRule",
    "esri/layers/ArcGISImageServiceLayer",
    "esri/layers/ImageServiceParameters",
    "dojo/dom-construct",
    "dojo/dom-style",
    "dojo/html",
    "esri/arcgis/Portal",
    "esri/dijit/PopupTemplate",
    "dojox/json/ref",
    "dijit/form/Select",
    "dijit/form/Button",
    "dijit/form/NumberSpinner",
    "dijit/form/CheckBox",
    "dijit/form/TextBox",
    "dijit/form/DropDownButton",
    "dijit/TooltipDialog"

],
        function (
                declare,
                _WidgetsInTemplateMixin,
                template,
                BaseWidget,
                arcgisUtils,
                registry,
                lang,
                domConstruct,
                esriRequest,
                RasterFunction,
                MosaicRule,
                ArcGISImageServiceLayer,
                ImageServiceParameters,
                domConstruct,
                domStyle,
                html,
                arcgisPortal,
                PopupTemplate) {
            var clazz = declare([BaseWidget, _WidgetsInTemplateMixin], {
                templateString: template,
                name: 'ISLayers',
                baseClass: 'jimu-widget-ISLayers',
                layerInfos: [],
                primaryLayer: null,
                secondaryLayer: null,
                layerList: null,
                saveResult: null,
                storeResultLayerProperties: true,
                resultLayerList: [],
                startup: function () {
                    this.inherited(arguments);
                    domConstruct.place('<img id="loadingIsLayers" style="position: absolute;top:0;bottom: 0;left: 0;right: 0;margin:auto;z-index:100;" src="' + require.toUrl('jimu') + '/images/loading.gif">', this.domNode);
                    this.hideLoading();
                },
                postCreate: function () {
                    this.getPrimaryPositionIndex();
                    this.populateServices();
                    this.refreshData();
                    if (this.resultLayer) {
                        registry.byId("resultShow").set("checked", this.resultLayer.visible);
                    }
                    if (this.primaryLayer) {
                        registry.byId("primaryShow").set("checked", this.primaryLayer.visible);
                    }
                    if (this.secondaryLayer) {
                        registry.byId("secondaryShow").set("checked", this.secondaryLayer.visible);
                    }
                    registry.byId("imageView").on("change", lang.hitch(this, function (value) {
                        if (this.primaryLayer && ((this.secondaryLayer && this.secondaryLayer.id !== this.primaryLayer.id) || !this.secondaryLayer))
                            this.primaryLayer.hide();
                        if (value.includes("extraLayers")) {
                            var temp = parseInt(value.split("extraLayers_")[1]);

                            this.loadNewPrimaryLayer(this.layerList[this.layerList.length - temp - 1]);

                        } else {
                            if (value !== "select")
                            {
                                this.primaryLayer = this.map.getLayer(value);
                                this.map.primaryLayer = value;
                                this.map.reorderLayer(this.primaryLayer, this.primaryIndex);
                                this.primaryLayer.show();
                            } else {
                                this.primaryLayer = null;
                                this.map.primaryLayer = false;

                            }
                        }
                        this.map.onUpdateEnd();
                    }));
                    registry.byId("secondary").on("change", lang.hitch(this, function (value) {
                        if (this.secondaryLayer && ((this.primaryLayer && this.secondaryLayer.id !== this.primaryLayer.id) || !this.primaryLayer))
                            this.secondaryLayer.hide();
                        if (value.includes("extraLayers")) {
                            var temp = parseInt(value.split("extraLayers_")[1]);

                            this.loadNewSecondaryLayer(this.layerList[this.layerList.length - temp - 1]);

                        } else {
                            if (value !== "select")
                            {
                                this.secondaryLayer = this.map.getLayer(value);
                                this.map.secondaryLayer = value;
                                if ((!this.secondaryLayer.arcgisProps || ((this.secondaryLayer.arcgisProps.title).charAt(this.secondaryLayer.arcgisProps.title.length - 1)) !== "_") && (!this.secondaryLayer.title || ((this.secondaryLayer.title).charAt(this.secondaryLayer.title.length - 1)) !== "_"))
                                    this.map.reorderLayer(this.secondaryLayer, this.secondaryIndex);
                                else
                                    this.map.reorderLayer(this.secondaryLayer, this.resultIndex);
                                this.secondaryLayer.show();
                            } else {
                                this.secondaryLayer = null;
                                this.map.secondaryLayer = false;
                            }
                        }
                        this.map.onUpdateEnd();
                    }));

                    registry.byId("secondaryBtn").on("click", lang.hitch(this, this.makeSecondary));
                    registry.byId("toggleLayers").on("click", lang.hitch(this, this.toggleLayers));
                    registry.byId("primaryShow").on("change", lang.hitch(this, this.primaryVisibility));
                    registry.byId("secondaryShow").on("change", lang.hitch(this, this.secondaryVisibility));
                    registry.byId("resultShow").on("change", lang.hitch(this, this.resultVisibility));
                    registry.byId("saveIconBtn").on("click", lang.hitch(this, this.createResultLayer));
                    if (this.map) {
                        this.map.on("update-end", lang.hitch(this, this.refreshData));
                        this.map.on("update-start", lang.hitch(this, this.showLoading));
                        this.map.on("update-end", lang.hitch(this, this.hideLoading));
                        this.map.on("layer-add-result", lang.hitch(this, this.addLayerEvent));
                        this.map.on("layer-remove", lang.hitch(this, this.getPrimaryPositionIndex));
                        this.map.on("layer-reorder", lang.hitch(this, this.getPrimaryPositionIndex));
                    }
                },
                getPrimaryPositionIndex: function () {
                    for (var a = this.map.layerIds.length - 1; a >= 0; a--) {
                        var layer = this.map.getLayer(this.map.layerIds[a]);
                        if (layer && layer.serviceDataType && layer.serviceDataType.substr(0, 16) === "esriImageService" && layer.id !== "resultLayer" && layer.id !== this.map.resultLayer && (!layer.arcgisProps || ((layer.arcgisProps.title).charAt(layer.arcgisProps.title.length - 1)) !== "_") && (!layer.title || ((layer.title).charAt(layer.title.length - 1)) !== "_")) {
                            this.primaryIndex = (a === 0 ? 1 : a);
                            this.secondaryIndex = this.primaryIndex - 1;
                            this.resultIndex = this.primaryIndex + 1;
                            break;
                        }
                    }

                },
                onOpen: function () {
                    this.refreshData();
                },
                onClose: function () {
                    domStyle.set("loadingIsLayers", "display", "none");
                },
                refreshData: function () {

                    if (this.map.layerIds) {
                        if (this.map.getLayer("resultLayer")) {
                            this.resultLayer = this.map.getLayer("resultLayer");
                            domStyle.set(this.result, "display", "block");
                            registry.byId("resultShow").set("checked", this.resultLayer ? this.resultLayer.visible : false);
                        } else {
                            this.resultLayer = '';
                            domStyle.set(this.result, "display", "none");
                        }
                    }
                    if (this.primaryLayer) {
                        if (this.primaryLayer.visible)
                            registry.byId("primaryShow").set("checked", true);
                        else
                            registry.byId("primaryShow").set("checked", false);
                    }
                    if (this.secondaryLayer) {
                        if (this.secondaryLayer.visible)
                            registry.byId("secondaryShow").set("checked", true);
                        else
                            registry.byId("secondaryShow").set("checked", false);
                    }
                    if (this.resultLayer) {
                        if (this.resultLayer.visible)
                            registry.byId("resultShow").set("checked", true);
                        else
                            registry.byId("resultShow").set("checked", false);
                    }

                },
                populateServices: function () {
                    var mainLayers, getItem, j;
                    if (this.map.itemInfo) {
                        mainLayers = this.map.itemInfo.itemData.operationalLayers;
                        this.layerList1 = [];
                        registry.byId("imageView").removeOption(registry.byId('imageView').getOptions());
                        registry.byId("secondary").removeOption(registry.byId('secondary').getOptions());
                        registry.byId("imageView").addOption({label: "Select primary layer", value: "select"});
                        registry.byId("secondary").addOption({label: "Select secondary layer", value: "select"});
                        var k = 0;
                        var skipLayer;

                        for (var i = mainLayers.length - 1; i >= 0; i--) {
                            if ((mainLayers[i].layerObject && mainLayers[i].layerObject.serviceDataType && mainLayers[i].layerObject.serviceDataType.substr(0, 16) === "esriImageService") || (mainLayers[i].layerType && mainLayers[i].layerType === "ArcGISImageServiceLayer")) {
                                skipLayer = false;
                                this.map.getLayer(mainLayers[i].layerObject.id).hide();
                                this.layerList1[k] = mainLayers[i].layerObject;
                                this.layerList1[k].title = mainLayers[i].title || mainLayers[i].layerObject.name || mainLayers[i].id;
                                if (((this.layerList1[k].title).charAt(this.layerList1[k].title.length - 1)) !== "_")
                                    registry.byId("imageView").addOption({label: this.layerList1[k].title, value: mainLayers[i].id});
                                registry.byId("secondary").addOption({label: this.layerList1[k].title, value: mainLayers[i].id});
                                k++;
                            }
                        }
                        if (registry.byId("imageView").getOptions().length < 1)
                        {
                            registry.byId("imageView").addOption({label: "No Imagery layer", value: "select"});
                            registry.byId("secondary").addOption({label: "No Imagery layer", value: "select"});
                        }
                        for (var b in this.layerList1) {
                            if (this.config.primaryLayer && this.config.primaryLayer === this.layerList1[b].id)
                            {
                                registry.byId("imageView").set("value", this.config.primaryLayer);
                            }
                            if (this.config.secondaryLayer && this.config.secondaryLayer === this.layerList1[b].id)
                                registry.byId("secondary").set("value", this.config.secondaryLayer);
                        }
                    }
                },
                createResultLayer: function () {

                    var params, secondLayer, popupInfo;
                    params = new ImageServiceParameters();
                    var layer = this.map.getLayer("resultLayer");
                    for (var a in this.map.layerIds) {
                        if (layer.id === this.map.layerIds[a]) {
                            var index = a;
                            break;
                        }
                    }
                    if (layer.mosaicRule) {
                        params.mosaicRule = layer.mosaicRule;
                    }
                    if (layer.renderingRule) {
                        params.renderingRule = layer.renderingRule;
                    }
                    if (layer.bandIds) {
                        params.bandIds = layer.bandIds;
                    }
                    if (layer.format) {
                        params.format = layer.format;
                    }
                    if (layer.interpolation) {
                        params.interpolation = layer.interpolation;
                    }

                    popupInfo = "";
                    if (layer.popupInfo) {
                        popupInfo = new PopupTemplate(layer.popupInfo);
                    }
                    secondLayer = new ArcGISImageServiceLayer(
                            layer.url,
                            {
                                id: layer.title + "_result_",
                                imageServiceParameters: params,
                                visible: false,
                                infoTemplate: popupInfo

                            });
                    secondLayer.title = layer.title + "_result_";

                    this.map.addLayer(secondLayer, this.resultIndex + 1);
                    registry.byId("secondary").addOption({label: secondLayer.id, value: secondLayer.id});

                },
                addLayerEvent: function (result) {
                    this.getPrimaryPositionIndex();
                    if (result.layer.id === "secondaryLayer" && !this.noOptionAdded) {
                        var option = registry.byId("secondary").getOptions();
                        for (var a in option) {
                            if (option[a].value === "secondaryLayer") {
                                registry.byId("secondary").removeOption(registry.byId("secondary").getOptions()[a]);
                            }
                        }
                        registry.byId("secondary").addOption({
                            label: result.layer.title,
                            value: "secondaryLayer"
                        });
                        registry.byId("secondary").set("value", "secondaryLayer");
                    }
                },
                loadNewPrimaryLayer: function (layer) {
                    if (this.map.primaryLayer) {
                        for (var a in this.map.layerIds) {
                            if (this.map.layerIds[a] === this.map.primaryLayer)
                            {
                                var resultPos = a;
                                break;
                            }
                        }
                        if (this.map.getLayer("primaryLayer")) {
                            this.map.getLayer("primaryLayer").suspend();
                            this.map.removeLayer(this.map.getLayer("primaryLayer"));
                        }
                    } else if (this.map.getLayer("resultLayer")) {
                        for (var a in this.map.layerIds) {
                            if (this.map.layerIds[a] === "resultLayer")
                            {
                                var resultPos = a;
                                break;
                            } else
                                var resultPos = null;
                        }
                    } else
                        var resultPos = null;

                    var params = new ImageServiceParameters();
                    if (layer.mosaicRule) {
                        var mosaicRule = new MosaicRule(layer.mosaicRule);
                        params.mosaicRule = mosaicRule;
                    }
                    if (layer.renderingRule) {
                        var renderingRule = new RasterFunction(lang.clone(layer.renderingRule));
                        params.renderingRule = renderingRule;
                    }
                    if (layer.bandIds) {
                        params.bandIds = layer.bandIds;
                    }
                    if (layer.format) {
                        params.format = layer.format;
                    }
                    if (layer.interpolation) {
                        params.interpolation = layer.interpolation;
                    }
                    var popupInfo = "";
                    if (layer.popupInfo) {
                        popupInfo = new PopupTemplate(layer.popupInfo);
                    }
                    var firstLayer = new ArcGISImageServiceLayer(
                            layer.url,
                            {
                                id: "primaryLayer",
                                imageServiceParameters: params,
                                visible: registry.byId("primaryShow").get("checked"),
                                infoTemplate: popupInfo
                            });
                    firstLayer.title = layer.title;
                    if (resultPos)
                        this.map.addLayer(firstLayer, resultPos);
                    else
                        this.map.addLayer(firstLayer);

                    this.map.primaryLayer = "primaryLayer";
                    this.primaryLayer = firstLayer;
                },
                loadNewSecondaryLayer: function (layer) {
                    var resultPos;
                    /*if (this.map.getLayer("secondaryLayer")) {
                     for (var a in this.map.layerIds) {
                     if (this.map.layerIds[a] === "secondaryLayer")
                     {
                     var resultPos = a;
                     break;
                     } else
                     var resultPos = null;
                     }
                     this.map.getLayer("secondaryLayer").suspend();
                     this.map.removeLayer(this.map.getLayer("secondaryLayer"));
                     }
                     if (this.map.getLayer(this.map.primaryLayer)) {
                     for (var a in this.map.layerIds) {
                     if (this.map.layerIds[a] === this.map.primaryLayer)
                     {
                     var resultPos = a;
                     break;
                     }
                     }
                     }*/
                    if (this.map.getLayer("secondaryLayer"))
                    {
                        this.map.getLayer("secondaryLayer").suspend();
                        this.map.removeLayer(this.map.getLayer("secondaryLayer"));
                    }
                    this.noOptionAdded = true;
                    var params = new ImageServiceParameters();
                    if (layer.mosaicRule) {
                        var mosaicRule = new MosaicRule(layer.mosaicRule);
                        params.mosaicRule = mosaicRule;
                    }
                    if (layer.renderingRule) {
                        var renderingRule = new RasterFunction(lang.clone(layer.renderingRule));
                        params.renderingRule = renderingRule;
                    }
                    if (layer.bandIds) {
                        params.bandIds = layer.bandIds;
                    }
                    if (layer.format) {
                        params.format = layer.format;
                    }
                    if (layer.interpolation) {
                        params.interpolation = layer.interpolation;
                    }
                    var popupInfo = "";
                    if (layer.popupInfo) {
                        popupInfo = new PopupTemplate(layer.popupInfo);
                    }
                    var secondLayer = new ArcGISImageServiceLayer(
                            layer.url,
                            {
                                id: "secondaryLayer",
                                imageServiceParameters: params,
                                visible: true,
                                infoTemplate: popupInfo
                            });
                    secondLayer.title = layer.title;
                    //  if (resultPos)
                    //   this.map.addLayer(secondLayer, resultPos);
                    // else
                    this.map.addLayer(secondLayer, this.secondaryIndex);

                    this.map.secondaryLayer = "secondaryLayer";
                    this.secondaryLayer = secondLayer;
                },
                makeSecondary: function () {
                    if (registry.byId("imageView").get("value") !== "select") {
                        if (this.map.getLayer("secondaryLayer"))
                        {
                            var layer = this.map.getLayer("secondaryLayer");
                            layer.suspend();
                            this.map.removeLayer(layer);
                        }
                        var primaryLayer = this.map.getLayer(registry.byId("imageView").get("value")) ? this.map.getLayer(registry.byId("imageView").get("value")) : this.map.getLayer("primaryLayer");

                        for (var a in this.map.layerIds)
                        {
                            if (primaryLayer.id === this.map.layerIds[a]) {
                                var primaryLayerPosition = a;
                                break;
                            }
                        }
                        this.createSecondary(primaryLayer, primaryLayerPosition);
                    }
                },
                createSecondary: function (layer, previousSecondaryLayerIndex) {

                    var params, secondLayer, popupInfo;
                    params = new ImageServiceParameters();
                    if (layer.mosaicRule) {
                        params.mosaicRule = layer.mosaicRule;
                    }
                    if (layer.renderingRule) {
                        params.renderingRule = layer.renderingRule;
                    }
                    if (layer.bandIds) {
                        params.bandIds = layer.bandIds;
                    }
                    if (layer.format) {
                        params.format = layer.format;
                    }
                    if (layer.interpolation) {
                        params.interpolation = layer.interpolation;
                    }
                    popupInfo = "";
                    if (layer.popupInfo) {
                        popupInfo = new PopupTemplate(layer.popupInfo);
                    }

                    secondLayer = new ArcGISImageServiceLayer(
                            layer.url,
                            {
                                id: "secondaryLayer",
                                imageServiceParameters: params,
                                visible: registry.byId("secondaryShow").get("checked"),
                                infoTemplate: popupInfo
                            });
                    secondLayer.title = layer.title + "_2";
                    this.noOptionAdded = false;
                    this.map.addLayer(secondLayer, previousSecondaryLayerIndex);
                },
                toggleLayers: function () {
                    var layerExists;
                    var primaryValue = registry.byId("imageView").get("value");
                    var primaryList = registry.byId("imageView").getOptions();
                    var secondaryValue = registry.byId("secondary").get("value");
                    for (var a in primaryList) {
                        if (primaryList[a].value === secondaryValue)
                        {
                            layerExists = true;
                            break;
                        } else
                            layerExists = false;
                    }
                    registry.byId("imageView").set("value", (layerExists ? secondaryValue : "select"));
                    registry.byId("secondary").set("value", primaryValue);

                },
                primaryVisibility: function () {
                    if (registry.byId("primaryShow").get("checked")) {
                        if (this.primaryLayer && !this.primaryLayer.visible) {
                            this.primaryLayer.show();
                        }
                    } else {
                        if (this.primaryLayer && this.primaryLayer.visible)
                            this.primaryLayer.hide();
                    }
                },
                secondaryVisibility: function () {
                    if(registry.byId("secondary").get("value") !== registry.byId("imageView").get("value")){
                    if (registry.byId("secondaryShow").get("checked")) {
                        if (this.secondaryLayer && !this.secondaryLayer.visible)
                            this.secondaryLayer.show();
                    } else {
                        if (this.secondaryLayer && this.secondaryLayer.visible)
                            this.secondaryLayer.hide();
                    }
                }
                },
                resultVisibility: function () {
                    if (registry.byId("resultShow").get("checked")) {
                        if (this.resultLayer && !this.resultLayer.visible)
                            this.resultLayer.show();
                    } else {
                        if (this.resultLayer && this.resultLayer.visible)
                            this.resultLayer.hide();
                    }
                },
                showLoading: function () {
                    if (document.getElementById("loadingIsLayers"))
                        domStyle.set("loadingIsLayers", "display", "block");
                },
                hideLoading: function () {
                    if (document.getElementById("loadingIsLayers"))
                        domStyle.set("loadingIsLayers", "display", "none");
                }
            });
            clazz.hasLocale = false;
            return clazz;
        });
