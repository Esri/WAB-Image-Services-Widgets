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
    'dojo/dom-construct',
    "esri/layers/RasterFunction",
    "esri/layers/MosaicRule",
    "esri/layers/ArcGISImageServiceLayer",
    "esri/layers/ImageServiceParameters",
    "dojo/dom-construct",
    "esri/dijit/LayerSwipe",
    "dijit/form/HorizontalSlider",
    "dijit/form/HorizontalRule",
    "dijit/form/HorizontalRuleLabels",
    "dojo/dom-style",
    "esri/dijit/PopupTemplate",
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
                Legend,
                arcgisUtils,
                on,
                registry,
                lang,
                dom,
                domConstruct,
                RasterFunction,
                MosaicRule,
                ArcGISImageServiceLayer,
                ImageServiceParameters,
                domConstruct, LayerSwipe, HorizontalSlider, HorizontalRule, HorizontalRuleLabels, domStyle, PopupTemplate) {
            var clazz = declare([BaseWidget, _WidgetsInTemplateMixin], {
                templateString: template,
                name: 'ISLayers',
                baseClass: 'jimu-widget-ISLayers',
                layerInfos: [],
                primaryLayerIndex: null,
                secondaryLayerIndex: null,
                primaryLayer: null,
                secondaryLayer: null,
                layerSwipe: null,
                layerList: null,
                flagval: false,
                handlerercd: null,
                startup: function () {
                    this.inherited(arguments);
                    domConstruct.place('<img id="loadingil" style="position: absolute;top:0;bottom: 0;left: 0;right: 0;margin:auto;z-index:100;" src="' + require.toUrl('jimu') + '/images/loading.gif">', this.domNode);
                    this.hideLoading();
                },
                postCreate: function () {
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

                    domConstruct.place("<div id='swipewidget'></div>", "map", "after");
                    registry.byId("imageView").on("change", lang.hitch(this, this.createLayer));
                    registry.byId("secondary").on("change", lang.hitch(this, this.makeSecondary));
                    registry.byId("secondaryBtn").on("click", lang.hitch(this, this.makeSecondary1));
                    registry.byId("toggleLayers").on("click", lang.hitch(this, this.toggleLayers));
                    registry.byId("primaryShow").on("change", lang.hitch(this, this.primaryVisibility));
                    registry.byId("secondaryShow").on("change", lang.hitch(this, this.secondaryVisibility));
                    registry.byId("resultShow").on("change", lang.hitch(this, this.resultVisibility));

                    if (this.map) {
                        this.map.on("update-end", lang.hitch(this, this.refreshData));
                        this.map.on("update-start", lang.hitch(this, this.showLoading));
                        this.map.on("update-end", lang.hitch(this, this.hideLoading));
                    }
                },
                onOpen: function () {
                    this.refreshData();
                },
                refreshData: function () {
                    if (this.map.layerIds) {
                        if (this.map.getLayer("resultLayer")) {
                            this.resultLayer = this.map.getLayer("resultLayer");
                            domStyle.set(this.result, "display", "block");
                            this.primaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 2]);
                            this.secondaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 3]);
                            registry.byId("resultShow").set("checked", this.resultLayer.visible);
                        } else {
                            this.resultLayer = '';
                            domStyle.set(this.result, "display", "none");
                            this.primaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 1]);
                            this.secondaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 2]);

                        }
                    }

                },
                populateServices: function () {
                    if (this.map.webMapResponse) {
                        var mainLayers = this.map.webMapResponse.itemInfo.itemData.operationalLayers;
                    }
                    this.layerList = [];
                    registry.byId("imageView").removeOption(registry.byId('imageView').getOptions());
                    registry.byId("secondary").removeOption(registry.byId('secondary').getOptions());
                    for (var i = 0; i < mainLayers.length; i++) {
                        this.layerList[i] = mainLayers[mainLayers.length - i - 1].layerObject;
                        this.layerList[i].title = mainLayers[mainLayers.length - i - 1].title;
                        registry.byId("imageView").addOption({label: this.layerList[i].title, value: "" + i + ""});
                        registry.byId("secondary").addOption({label: this.layerList[i].title, value: "" + i + ""});
                    }

                    if (this.config.webmapId) {
                        var getItem = arcgisUtils.getItem(this.config.webmapId);

                        getItem.then(lang.hitch(this, function (response) {
                            var j = 0;
                            for (var i = response.itemData.operationalLayers.length - 1; i >= 0; i--) {


                                this.layerList.push(response.itemData.operationalLayers[i]);
                                registry.byId("imageView").addOption({label: response.itemData.operationalLayers[i].title, value: "" + (j + mainLayers.length) + ""});
                                registry.byId("secondary").addOption({label: response.itemData.operationalLayers[i].title, value: "" + (j + mainLayers.length) + ""});
                                j++;
                            }
                        }));
                    }



                    if (!this.secondaryLayerIndex) {
                        //registry.byId("secondary").set("value", this.layerList[1].title);

                        {
                            registry.byId("secondary").attr('value', "1");
                            this.secondaryLayerIndex = 1;
                        }
                    }
                },
                createLayer: function () {
                    if (this.primaryLayer) {
                        this.map.removeLayer(this.primaryLayer);

                    }

                    this.primaryLayerIndex = registry.byId("imageView").get("value");

                    var params = new ImageServiceParameters();

                    if (this.toggle) {
                        if (this.secondaryBackup.mosaicRule) {
                            var mosaicRule = new MosaicRule(this.secondaryBackup.mosaicRule);
                            params.mosaicRule = mosaicRule;
                        }
                        if (this.secondaryBackup.renderingRule) {
                            var renderingRule = new RasterFunction(lang.clone(this.secondaryBackup.renderingRule));
                            params.renderingRule = renderingRule;
                        }
                        if (this.secondaryBackup.bandIds) {
                            params.bandIds = this.secondaryBackup.bandIds;
                        }

                        if (this.secondaryBackup.format) {
                            params.format = this.secondaryBackup.format;
                        }

                        if (this.secondaryBackup.interpolation) {
                            params.interpolation = this.secondaryBackup.interpolation;
                        }

                        var elevationProfileLayer = new ArcGISImageServiceLayer(
                                this.layerList[this.primaryLayerIndex].url,
                                {
                                    id: "primaryLayer",
                                    imageServiceParameters: params,
                                    opacity: this.secondaryBackup.opacity,
                                    visible: registry.byId("primaryShow").get("checked"),
                                    infoTemplate: this.secondaryBackup.infoTemplate
                                });
                    } else {

                        if (this.layerList[this.primaryLayerIndex].mosaicRule) {
                            var mosaicRule = new MosaicRule(this.layerList[this.primaryLayerIndex].mosaicRule);
                            params.mosaicRule = mosaicRule;
                        }
                        if (this.layerList[this.primaryLayerIndex].renderingRule) {
                            var renderingRule = new RasterFunction(lang.clone(this.layerList[this.primaryLayerIndex].renderingRule));
                            params.renderingRule = renderingRule;
                        }
                        if (this.layerList[this.primaryLayerIndex].bandIds) {
                            params.bandIds = this.layerList[this.primaryLayerIndex].bandIds;
                        }

                        if (this.layerList[this.primaryLayerIndex].format) {
                            params.format = this.layerList[this.primaryLayerIndex].format;
                        }

                        if (this.layerList[this.primaryLayerIndex].interpolation) {
                            params.interpolation = this.layerList[this.primaryLayerIndex].interpolation;
                        }

                        var popupInfo = "";

                        if (this.layerList[this.primaryLayerIndex].popupInfo) {
                            popupInfo = new PopupTemplate(this.layerList[this.primaryLayerIndex].popupInfo);
                        }

                        var elevationProfileLayer = new ArcGISImageServiceLayer(
                                this.layerList[this.primaryLayerIndex].url,
                                {
                                    id: "primaryLayer",
                                    imageServiceParameters: params,
                                    visible: registry.byId("primaryShow").get("checked"),
                                    infoTemplate: popupInfo
                                });
                    }

                    if (this.resultLayer) {
                        this.map.addLayer(elevationProfileLayer, this.map.layerIds.length - 1);
                        this.map.on("layer-add-result", lang.hitch(this, function () {
                            this.primaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 2]);
                        }));
                    } else {
                        this.map.addLayer(elevationProfileLayer, this.map.layerIds.length);
                        this.map.on("layer-add-result", lang.hitch(this, function () {
                            this.primaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 1]);
                        }));
                    }

                    this.toggle = false;
                },
                makeSecondary1: function ()
                {
                    this.flagval = true;

                    if (this.secondaryLayer) {

                        this.map.removeLayer(this.secondaryLayer);
                    }

                    this.secondaryLayerIndex = registry.byId("imageView").get("value");
                    ;
                    registry.byId("secondary").attr("value", "" + this.secondaryLayerIndex + "");

                    var params = new ImageServiceParameters();

                    if (this.primaryLayer.mosaicRule) {
                        var mosaicRule = new MosaicRule(this.primaryLayer.mosaicRule);
                        params.mosaicRule = mosaicRule;
                    }

                    if (this.primaryLayer.renderingRule) {
                        var renderingRule = new RasterFunction(lang.clone(this.primaryLayer.renderingRule));
                        params.renderingRule = renderingRule;
                    }

                    if (this.primaryLayer.bandIds) {
                        params.bandIds = this.primaryLayer.bandIds;
                    }

                    if (this.primaryLayer.format) {
                        params.format = this.primaryLayer.format;
                    }

                    if (this.primaryLayer.interpolation) {
                        params.interpolation = this.primaryLayer.interpolation;
                    }

                    var secondLayer = new ArcGISImageServiceLayer(
                            this.layerList[this.secondaryLayerIndex].url,
                            {
                                id: "secondaryLayer",
                                imageServiceParameters: params,
                                opacity: this.primaryLayer.opacity,
                                visible: registry.byId("secondaryShow").get("checked"),
                                infoTemplate: this.primaryLayer.infoTemplate
                            });

                    if (this.resultLayer) {
                        this.map.addLayer(secondLayer, this.map.layerIds.length - 2);
                        this.map.on("layer-add-result", lang.hitch(this, function () {
                            this.secondaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 3]);
                        }));
                    } else {
                        this.map.addLayer(secondLayer, this.map.layerIds.length - 1);
                        this.map.on("layer-add-result", lang.hitch(this, function () {
                            this.secondaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 2]);
                        }));
                    }


                },
                makeSecondary: function () {
                    if (this.flagval)
                    {

                        this.flagval = false;
                    }
                    else
                    {
                        if (this.secondaryLayer) {
                            this.map.removeLayer(this.secondaryLayer);

                        }

                        this.secondaryLayerIndex = registry.byId("secondary").get("value");




                        var secondLayer = new ArcGISImageServiceLayer(
                                this.layerList[this.secondaryLayerIndex].url,
                                {
                                    id: "secondaryLayer",
                                    // imageServiceParameters: params,
                                    // opacity: this.primaryLayer.opacity,
                                    visible: registry.byId("secondaryShow").get("checked"),
                                    infoTemplate: this.layerList[this.secondaryLayerIndex].url.infoTemplate
                                });

                        if (this.resultLayer) {
                            this.map.addLayer(secondLayer, this.map.layerIds.length - 2);
                            this.map.on("layer-add-result", lang.hitch(this, function () {
                                this.secondaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 3]);
                            }));
                        } else {
                            this.map.addLayer(secondLayer, this.map.layerIds.length - 1);
                            this.map.on("layer-add-result", lang.hitch(this, function () {
                                this.secondaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 2]);
                            }));
                        }
                        //}
                        // this.toggle = false;
                    }
                },
                toggleLayers: function () {
                    if (registry.byId("secondary").get("value")) {
                        this.toggle = true;
                        var indextemp = this.secondaryLayerIndex;
                        this.secondaryBackup = this.secondaryLayer;
                        var indextemp1 = this.primaryLayerIndex;
                        this.primaryBackup = this.primaryLayer;

                        if (indextemp != registry.byId("imageView").get("value")) {

                            registry.byId("imageView").set("value", "" + indextemp + "");
                        } else {
                            this.createLayer();

                        }
                        if (indextemp1 != registry.byId("secondary").get("value")) {
                            registry.byId("secondary").set("value", "" + indextemp1 + "");

                        } else {

                            this.makeSecondary1();
                        }
                    }
                },
                primaryVisibility: function () {
                    if (registry.byId("primaryShow").get("checked")) {

                        this.primaryLayer.show();
                    } else {
                        this.primaryLayer.hide();
                    }
                },
                secondaryVisibility: function () {
                    if (registry.byId("secondaryShow").get("checked")) {

                        this.secondaryLayer.show();


                    } else {
                        this.secondaryLayer.hide();
                    }
                },
                resultVisibility: function () {
                    if (registry.byId("resultShow").get("checked")) {
                        this.resultLayer.show();
                    } else {
                        this.resultLayer.hide();
                    }
                },
                showLoading: function () {
                    esri.show(dom.byId("loadingil"));
                },
                hideLoading: function () {
                    esri.hide(dom.byId("loadingil"));
                }
            });

            clazz.hasLocale = false;
            return clazz;
        });