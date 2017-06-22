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
    'jimu/BaseWidget',
    "dojo/dom-style",
    "dojo/html",
    "dijit/registry",
    "dojo/_base/lang",
    'dojo/dom-construct',
    "dijit/form/Select",
    "dijit/form/HorizontalSlider",
    "dijit/form/HorizontalRule",
    "dijit/form/HorizontalRuleLabels",
    "dijit/form/Button",
    "dijit/form/NumberTextBox"
],
        function (
                declare,
                _WidgetsInTemplateMixin,
                BaseWidget,
                domStyle, html, registry, lang, domConstruct) {
            var clazz = declare([BaseWidget, _WidgetsInTemplateMixin], {
                name: 'ISDisplayParameters',
                baseClass: 'jimu-widget-ISDisplayParameters',
                primaryLayer: null,
                startup: function () {
                    this.inherited(arguments);
                    domConstruct.place('<img id="loadingParameter" style="position: absolute;top:0;bottom: 0;left: 0;right: 0;margin:auto;z-index:100;" src="' + require.toUrl('jimu') + '/images/loading.gif">', this.domNode);
                    this.hideLoading();
                },
                postCreate: function () {
                    registry.byId("format").on("change", lang.hitch(this, this.checkQualityDisable));
                    registry.byId("ipapply").on("click", lang.hitch(this, this.applyParams));
                    if (this.map) {
                        this.map.on("update-start", lang.hitch(this, this.showLoading));
                        this.map.on("update-end", lang.hitch(this, this.hideLoading));
                    }
                },
                onOpen: function () {
                    this.refreshData();
                    if (this.map)
                        this.refreshHandler = this.map.on("update-end", lang.hitch(this, this.refreshData));
                },
                onClose: function () {
                    if (this.refreshHandler) {
                        this.refreshHandler.remove();
                        this.refreshHandler = null;
                    }
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
                            domStyle.set(this.displayParametersContainer, "display", "block");
                            html.set(this.displayParametersErrorContainer, "");
                            html.set(this.parametersLayerTitle, "Layer: <b>" + ((this.primaryLayer.arcgisProps && this.primaryLayer.arcgisProps.title) ? this.primaryLayer.arcgisProps.title : (this.primaryLayer.title || this.primaryLayer.name || this.primaryLayer.id)) + "</b>");

                            if (this.primaryLayer.interpolation) {
                                registry.byId("interpolation").set("value", this.primaryLayer.interpolation);
                            } else {
                                registry.byId("interpolation").set("value", 'Default');
                            }

                            if (this.primaryLayer.format) {
                                registry.byId("format").set("value", this.primaryLayer.format);
                            } else {
                                registry.byId("format").set("value", 'Default');
                            }
                            this.checkQualityDisable();

                            if (this.primaryLayer.compressionQuality) {
                                registry.byId("quality").set("value", this.primaryLayer.compressionQuality);
                            }
                        } else {
                            domStyle.set(this.displayParametersContainer, "display", "none");
                            html.set(this.displayParametersErrorContainer, "No visible Imagery Layers in the map.");
                        }
                    }
                },
                applyParams: function () {
                    if (this.primaryLayer) {
                        this.applyParamsOnLayer(this.primaryLayer);
                    }
                },
                applyParamsOnLayer: function (imageServiceLayer) {
                    if (registry.byId("interpolation").get("value") !== "Default") {
                        imageServiceLayer.setInterpolation(registry.byId("interpolation").get("value"), true);
                    } else {
                        imageServiceLayer.setInterpolation('', true);
                    }

                    if (registry.byId("format").get("value") !== "Default") {
                        imageServiceLayer.setImageFormat(registry.byId("format").get("value"), true);
                    } else {
                        imageServiceLayer.setImageFormat('', true);
                    }

                    if (!registry.byId("quality").get("disabled")) {
                        imageServiceLayer.setCompressionQuality(registry.byId("quality").get("value"), true);
                    } else {
                        imageServiceLayer.setCompressionQuality('', true);
                    }
                    imageServiceLayer.refresh();
                },
                checkQualityDisable: function () {
                    if (registry.byId("format").get("value") === "jpgpng" || registry.byId("format").get("value") === "jpg") {
                        domStyle.set(this.qualityParameterDiv, "display", "inline-block");
                        registry.byId("quality").set("disabled", false);
                    } else {
                        registry.byId("quality").set("disabled", true);
                        domStyle.set(this.qualityParameterDiv, "display", "none");
                    }
                },
                showLoading: function () {
                    domStyle.set("loadingParameter", "display", "block");
                },
                hideLoading: function () {
                    domStyle.set("loadingParameter", "display", "none");
                }
            });

            clazz.hasLocale = false;
            clazz.hasSettingPage = false;
            clazz.hasSettingUIFile = false;
            clazz.hasSettingLocale = false;
            clazz.hasSettingStyle = false;
            return clazz;
        });