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
    "dijit/registry",
    "dojo/_base/lang",
    "dojo/dom-style",
    'dojo/dom-construct',
    "esri/request",
    "dojo/html",
    "esri/layers/RasterFunction",
    "dijit/form/Select",
    "dijit/form/HorizontalSlider",
    "dijit/form/Button",
    "dijit/form/NumberSpinner",
    "dijit/form/CheckBox",
    "dijit/form/HorizontalRuleLabels",
    "dijit/form/NumberTextBox",
    "dijit/TooltipDialog",
    "dijit/form/DropDownButton",
    "dijit/Tooltip"
],
        function (
                declare,
                _WidgetsInTemplateMixin,
                BaseWidget,
                registry, lang, domStyle, domConstruct, esriRequest, html, RasterFunction) {
            var clazz = declare([BaseWidget, _WidgetsInTemplateMixin], {
                name: 'ISRenderer',
                baseClass: 'jimu-widget-ISRenderer',
                previousImageServiceLayerUrl: null,
                imageServiceLayer: null,
                startup: function () {
                    this.inherited(arguments);
                    domConstruct.place('<img id="loadingid" style="position: absolute;top:0;bottom: 0;left: 0;right: 0;margin:auto;z-index:100;" src="' + require.toUrl('jimu') + '/images/loading.gif">', this.domNode);
                    this.hideLoading();
                },
                postCreate: function () {
                    registry.byId("Gamma").on("change", lang.hitch(this, this.changeGammaLabel));
                    registry.byId("Gamma_label").on("change", lang.hitch(this, this.changeGammaSlider));

                    registry.byId("idapply").on("click", lang.hitch(this, this.applyParams));
                    registry.byId("service_functions").on("change", lang.hitch(this, this.checkStretchDiv));
                    registry.byId("StretchType").on("change", lang.hitch(this, this.checkStretchTypeDiv));
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
                    this.previousImageServiceLayerUrl = null;
                },
                refreshData: function () {
                    if (this.map.layerIds) {
                        if (this.map.primaryLayer) {
                            this.imageServiceLayer = this.map.getLayer(this.map.primaryLayer);
                        } else {
                            for (var a = this.map.layerIds.length - 1; a >= 0; a--) {
                                var layerObject = this.map.getLayer(this.map.layerIds[a]);
                                var title = layerObject.arcgisProps && layerObject.arcgisProps.title ? layerObject.arcgisProps.title : layerObject.title;
                                if (layerObject && layerObject.visible && layerObject.serviceDataType && layerObject.serviceDataType.substr(0, 16) === "esriImageService" && layerObject.id !== "resultLayer" && layerObject.id !== "scatterResultLayer" && layerObject.id !== this.map.resultLayer && (!title || ((title).charAt(title.length - 1)) !== "_")) {
                                    this.imageServiceLayer = layerObject;
                                    break;
                                } else
                                    this.imageServiceLayer = null;
                            }
                        }
                        if (this.imageServiceLayer) {
                            domStyle.set(this.rendererContainer, "display", "block");
                            html.set(this.rendererErrorContainer, "");
                            if (this.imageServiceLayer.url !== this.previousImageServiceLayerUrl) {
                                this.populateBands();
                                this.populateServiceFunctions();
                            }
                            if (this.imageServiceLayer.bandIds) {
                                var bands = this.imageServiceLayer.bandIds;
                                registry.byId("Red").set("value", bands[0]);
                                registry.byId("Green").set("value", bands[1]);
                                registry.byId("Blue").set("value", bands[2]);
                            }

                            if (this.imageServiceLayer.renderingRule) {
                                var rrule = new RasterFunction(this.imageServiceLayer.renderingRule);
                                if (rrule.functionName == "Stretch") {
                                    var arguments = rrule.functionArguments;
                                    if (arguments.DRA) {
                                        registry.byId("DRA").set("checked", arguments.DRA);
                                    }
                                    registry.byId("StretchType").set("value", arguments.StretchType);
                                    if (arguments.MaxPercent) {
                                        registry.byId("MaxPercent").set("value", arguments.MaxPercent);
                                    }
                                    if (arguments.MinPercent) {
                                        registry.byId("MaxPercent").set("value", arguments.MinPercent);
                                    }
                                    if (arguments.NumberOfStandardDeviations) {
                                        registry.byId("NumberOfStandardDeviations").set("value", arguments.NumberOfStandardDeviations);
                                    }
                                    registry.byId("Gamma_label").set("value", arguments.Gamma[0]);
                                }
                            }
                        } else {
                            domStyle.set(this.rendererContainer, "display", "none");
                            html.set(this.rendererErrorContainer, "No visible Imagery Layers in the map.");
                        }
                    }
                },
                populateBands: function () {
                    this.previousImageServiceLayerUrl = this.imageServiceLayer.url;
                    var bandCount = this.imageServiceLayer.bandCount;
                    registry.byId("Red").removeOption(registry.byId('Red').getOptions());
                    registry.byId("Green").removeOption(registry.byId('Green').getOptions());
                    registry.byId("Blue").removeOption(registry.byId('Blue').getOptions());

                    registry.byId("Red").addOption({label: '-', value: ''});
                    registry.byId("Green").addOption({label: '-', value: ''});
                    registry.byId("Blue").addOption({label: '-', value: ''});

                    for (var i = 0; i < bandCount; i++) {
                        registry.byId("Red").addOption({label: '' + (i + 1) + '', value: '' + i + ''});
                        registry.byId("Green").addOption({label: '' + (i + 1) + '', value: '' + i + ''});
                        registry.byId("Blue").addOption({label: '' + (i + 1) + '', value: '' + i + ''});
                    }
                },
                changeGammaLabel: function () {
                    registry.byId("Gamma_label").set("value", parseFloat(Math.pow(10, (registry.byId("Gamma").get("value") / 10))).toFixed(2));
                },
                changeGammaSlider: function () {
                    registry.byId("Gamma").set("value", 10 * ((Math.log(registry.byId("Gamma_label").get("value")) / Math.log(10))));
                },
                applyParams: function () {
                    if (registry.byId("service_functions").get("value") != "None") {
                        var rasterFunction = new RasterFunction();
                        rasterFunction.functionName = registry.byId("service_functions").get("value");
                        var arguments = {};
                        if (registry.byId("service_functions").get("value") == "Stretch") {
                            this.imageServiceLayer.setBandIds([registry.byId("Red").get("value"), registry.byId("Green").get("value"), registry.byId("Blue").get("value")], true);
                            arguments.DRA = registry.byId("DRA").get("checked");
                            arguments.UseGamma = true;
                            arguments.Gamma = [parseFloat(registry.byId("Gamma_label").get("value").toFixed(2)), parseFloat(registry.byId("Gamma_label").get("value").toFixed(2)), parseFloat(registry.byId("Gamma_label").get("value").toFixed(2))];
                            arguments.StretchType = parseInt(registry.byId("StretchType").get("value"));
                            switch (registry.byId("StretchType").get("value")) {
                                case '3' :
                                {
                                    arguments.NumberOfStandardDeviations = registry.byId("NumberOfStandardDeviations").get("value");
                                    break;
                                }
                                case '6':
                                {
                                    arguments.MaxPercent = registry.byId("MaxPercent").get("value");
                                    arguments.MinPercent = registry.byId("MinPercent").get("value");
                                    break;
                                }
                            }
                        } else {
                            this.imageServiceLayer.setBandIds([], true);
                        }
                        rasterFunction.functionArguments = arguments;
                        rasterFunction.variableName = "Raster";
                        this.imageServiceLayer.setRenderingRule(rasterFunction, true);
                    } else {
                        this.imageServiceLayer.setRenderingRule('', true);
                    }

                    this.imageServiceLayer.refresh();
                },
                populateServiceFunctions: function () {

                    if (this.imageServiceLayer.rasterFunctionInfos && this.imageServiceLayer.name)
                    {
                        var title = this.imageServiceLayer.title || this.imageServiceLayer.name || "";
                        html.set(this.activeLayerName, title);
                        var data = this.imageServiceLayer.rasterFunctionInfos;
                        this.rendererRR(data);
                    } else
                    {
                        var request = esriRequest({
                            url: this.imageServiceLayer.url,
                            content: {
                                f: "json"
                            },
                            handleAs: "json",
                            callbackParamName: "callback"
                        });
                        request.then(lang.hitch(this, function (data) {
                            var title = data.title || data.name || "";
                            html.set(this.activeLayerName, title);
                            this.rendererRR(data.rasterFunctionInfos);
                        }), function (error) {
                            console.log("Request failed");
                        });
                    }
                },
                rendererRR: function (data) {

                    registry.byId("service_functions").removeOption(registry.byId('service_functions').getOptions());

                    if (this.imageServiceLayer) {
                        for (var i = 0; i < data.length; i++) {
                            registry.byId("service_functions").addOption({label: data[i].name, value: data[i].name});
                        }
                    }
                    registry.byId("service_functions").addOption({label: "Stretch", value: "Stretch"});
                    if (this.imageServiceLayer.renderingRule) {
                        var rrule = new RasterFunction(this.imageServiceLayer.renderingRule);
                        registry.byId("service_functions").set("value", rrule.functionName);
                        if (rrule.functionName == "Stretch") {
                            registry.byId("StretchType").set("value", rrule.functionArguments.StretchType);
                            registry.byId("DRA").set("checked", rrule.functionArguments.DRA);
                            registry.byId("Gamma_label").set("value", rrule.functionArguments.Gamma[0]);
                            switch (rrule.functionArguments.StretchType) {
                                case '3' :
                                {
                                    registry.byId("NumberOfStandardDeviations").set("value", rrule.functionArguments.NumberOfStandardDeviations);
                                    break;
                                }
                                case '6' :
                                {
                                    registry.byId("MaxPercent").set("value", rrule.functionArguments.MaxPercent);
                                    registry.byId("MinPercent").set("value", rrule.functionArguments.MinPercent);
                                    break;
                                }
                            }
                        }
                    }
                    this.checkStretchDiv();

                },
                checkStretchDiv: function () {
                    if (registry.byId("service_functions").get("value") == "Stretch") {
                        domStyle.set(this.stretchDiv, "display", "inline");
                        this.checkStretchTypeDiv();
                    } else {
                        domStyle.set(this.stretchDiv, "display", "none");
                    }
                },
                checkStretchTypeDiv: function () {
                    switch (registry.byId("StretchType").get("value")) {
                        case '5':
                        {
                            domStyle.set(this.StdDev, "display", "none");
                            domStyle.set(this.PercentClip, "display", "none");
                            break;
                        }
                        case '3':
                        {
                            domStyle.set(this.StdDev, "display", "inline");
                            domStyle.set(this.PercentClip, "display", "none");
                            break;
                        }
                        case '6':
                        {
                            domStyle.set(this.StdDev, "display", "none");
                            domStyle.set(this.PercentClip, "display", "inline");
                            break;
                        }

                    }
                },
                showLoading: function () {
                    domStyle.set("loadingid", "display", "block");
                },
                hideLoading: function () {
                    domStyle.set("loadingid", "display", "none");
                }

            });

            clazz.hasLocale = false;
            clazz.hasSettingPage = false;
            clazz.hasSettingUIFile = false;
            clazz.hasSettingLocale = false;
            clazz.hasSettingStyle = false;
            return clazz;
        });