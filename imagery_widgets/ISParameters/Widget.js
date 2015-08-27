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
    'jimu/BaseWidget',
    "dojo/on",
    "dijit/registry",
    "dojo/_base/lang",
    'dojo/dom-construct',
    "dojo/dom",
    "dijit/form/Select",
    "dijit/form/HorizontalSlider",
    "dijit/form/HorizontalRule", 
    "dijit/form/HorizontalRuleLabels",
    "dijit/form/Button",
    "dijit/form/NumberTextBox"
],
        function(
                declare,
                _WidgetsInTemplateMixin,
                BaseWidget,
                on, registry, lang, domConstruct, dom) {
            var clazz = declare([BaseWidget, _WidgetsInTemplateMixin], {
                name: 'ISParameters',
                baseClass: 'jimu-widget-ISParameters',
                layerInfos: [],
                legend: null,
                primaryLayer: null,
                startup: function() {
                    this.inherited(arguments);
                    domConstruct.place('<img id="loadingip" style="position: absolute;top:0;bottom: 0;left: 0;right: 0;margin:auto;z-index:100;" src="' + require.toUrl('jimu') + '/images/loading.gif">', this.domNode);
                    this.hideLoading();
                },
                postCreate: function() {
                    registry.byId("format").on("change", lang.hitch(this, this.checkQualityDisable));
                    registry.byId("ipapply").on("click", lang.hitch(this, this.applyParams));
                    if (this.map) {
                        this.map.on("update-end", lang.hitch(this, this.refreshData));
                        this.map.on("update-start", lang.hitch(this, this.showLoading));
                        this.map.on("update-end", lang.hitch(this, this.hideLoading));
                    }
                },
                onOpen: function() {
                    this.refreshData();
                },
                refreshData: function() {
                    if (this.map.layerIds) {
                        if (this.map.getLayer("resultLayer")) {
                            this.primaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 2]);
                            this.secondaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 3]);
                        } else {
                            this.primaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 1]);
                            this.secondaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 2]);
                        }

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
                    }
                },
                applyParams: function() {
                    if (this.primaryLayer) {
                        this.applyParamsOnLayer(this.primaryLayer);
                    }
                    if (this.secondaryLayer) {
                        this.applyParamsOnLayer(this.secondaryLayer);
                    }
                },
                applyParamsOnLayer: function(imageServiceLayer) {
                    if (registry.byId("interpolation").get("value") != "Default") {
                        imageServiceLayer.setInterpolation(registry.byId("interpolation").get("value"), true);
                    } else {
                        imageServiceLayer.setInterpolation('', true);
                    }

                    if (registry.byId("format").get("value") != "Default") {
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
                checkQualityDisable: function() {
                    if (registry.byId("format").get("value") == "jpgpng" || registry.byId("format").get("value") == "jpg") {
                        registry.byId("quality").set("disabled", false);
                    } else {
                        registry.byId("quality").set("disabled", true);
                    }
                },
                showLoading: function() {
                    esri.show(dom.byId("loadingip"));
                },
                hideLoading: function() {
                    esri.hide(dom.byId("loadingip"));
                }
            });

            clazz.hasLocale = false;
            clazz.hasSettingPage = false;
            clazz.hasSettingUIFile = false;
            clazz.hasSettingLocale = false;
            clazz.hasSettingStyle = false;
            return clazz;
        });