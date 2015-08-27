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
    'esri/dijit/Legend',
    "esri/arcgis/utils",
    "dojo/on",
    "dijit/registry",
    "dojo/_base/lang",
    "dojo/html",
    "dojo/dom",
    "dojo/dom-style",
    "esri/request",
    "esri/layers/RasterFunction",
    "esri/layers/MosaicRule",
    'dojo/dom-construct',
    "dojo/parser",
    "dijit/form/Select",
    "dijit/form/HorizontalSlider",
    "dijit/form/Button",
    "dijit/form/NumberSpinner",
    "dijit/form/CheckBox",
    "dijit/form/HorizontalRuleLabels",
    "dijit/form/TextBox"
],
        function (
                declare,
                _WidgetsInTemplateMixin,
                BaseWidget,
                Legend,
                arcgisUtils, on, registry, lang, html, dom, domStyle, esriRequest, RasterFunction, MosaicRule, domConstruct) {
            var clazz = declare([BaseWidget, _WidgetsInTemplateMixin], {
                name: 'ISDisplayOrder',
                baseClass: 'jimu-widget-ISDisplayOrder',
                layerInfos: [],
                legend: null,
                imageServiceLayer: null,
                startup: function () {
                    this.inherited(arguments);
                    domConstruct.place('<img id="loadingido" style="position: absolute;top:0;bottom: 0;left: 0;right: 0;margin:auto;z-index:100;" src="' + require.toUrl('jimu') + '/images/loading.gif">', this.domNode);
                    this.hideLoading();
                },
                postCreate: function () {
                    registry.byId("mosaicMethod").on("change", lang.hitch(this, this.checkFields));
                    registry.byId("mrapply").on("click", lang.hitch(this, this.applyMosaic));
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
                            this.imageServiceLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 2]);
                        } else {
                            this.imageServiceLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 1]);
                        }
                        this.populateAttributes();
                        this.checkFields();
                    }
                },
                populateAttributes: function () {

                    if (this.imageServiceLayer.fields)
                    {
                        registry.byId("sortField").removeOption(registry.byId('sortField').getOptions());

                        for (var i = 0; i < this.imageServiceLayer.fields.length; i++) {
                            registry.byId("sortField").addOption({label: this.imageServiceLayer.fields[i].name, value: this.imageServiceLayer.fields[i].name});
                        }
                        this.displaymosaic();
                    }
                    else {


                        var request = esriRequest({
                            url: this.imageServiceLayer.url,
                            content: {
                                f: "json"
                            },
                            handleAs: "json",
                            callbackParamName: "callback"
                        });

                        request.then(lang.hitch(this, function (data) {
                            registry.byId("sortField").removeOption(registry.byId('sortField').getOptions());

                            for (var i = 0; i < data.fields.length; i++) {
                                registry.byId("sortField").addOption({label: data.fields[i].name, value: data.fields[i].name});
                            }
                            this.displaymosaic();
                        }), function (error) {
                            console.log("Request failed");
                        });
                    }
                },
                displaymosaic: function () {
                    if (this.imageServiceLayer.mosaicRule) {
                        var mosaic = new MosaicRule(this.imageServiceLayer.mosaicRule);
                        registry.byId("mosaicMethod").set("value", mosaic.method);
                        registry.byId("mosaicOperation").set("value", mosaic.operation);

                        if (mosaic.method != "esriMosaicSeamline") {
                            registry.byId("ascending").set("checked", !mosaic.ascending);
                        } else {
                            registry.byId("ascending").set("checked", false);
                        }

                        if (mosaic.method == "esriMosaicAttribute") {
                            registry.byId("sortField").set("value", mosaic.sortField);
                            registry.byId("sortValue").set("value", mosaic.sortValue);
                        }

                        if (mosaic.method == "esriMosaicLockRaster") {
                            registry.byId("lockRasterIds").set("value", mosaic.lockRasterIds.toString());
                        }
                    } else {
                        registry.byId("mosaicMethod").set("value", 'esriMosaicNone');
                    }

                },
                checkFields: function () {
                    switch (registry.byId("mosaicMethod").get("value")) {
                        case "esriMosaicAttribute" :
                        {
                            domStyle.set(this.attribute, "display", "block");
                            domStyle.set(this.lockraster, "display", "none");
                            domStyle.set(this.notseamline, "display", "block");
                            if (!registry.byId("mosaicOperation").getOptions('OPERATION_MIN')) {
                                registry.byId("mosaicOperation").addOption({label: 'Minimum of pixel values', value: 'OPERATION_MIN'});
                                registry.byId("mosaicOperation").addOption({label: 'Maximum of pixel values', value: 'OPERATION_MAX'});
                                registry.byId("mosaicOperation").addOption({label: 'Average of pixel values', value: 'OPERATION_MEAN'});
                            }
                            break;
                        }
                        case "esriMosaicNone" :

                        case "esriMosaicCenter" :

                        case "esriMosaicNorthwest" :

                        case "esriMosaicNadir" :
                        {
                            domStyle.set(this.attribute, "display", "none");
                            domStyle.set(this.lockraster, "display", "none");
                            domStyle.set(this.notseamline, "display", "block");
                            if (!registry.byId("mosaicOperation").getOptions('OPERATION_MIN')) {
                                registry.byId("mosaicOperation").addOption({label: 'Minimum of pixel values', value: 'OPERATION_MIN'});
                                registry.byId("mosaicOperation").addOption({label: 'Maximum of pixel values', value: 'OPERATION_MAX'});
                                registry.byId("mosaicOperation").addOption({label: 'Average of pixel values', value: 'OPERATION_MEAN'});
                            }
                            break;
                        }

                        case "esriMosaicSeamline" :
                        {
                            domStyle.set(this.attribute, "display", "none");
                            domStyle.set(this.lockraster, "display", "none");
                            domStyle.set(this.notseamline, "display", "none");
                            registry.byId("mosaicOperation").removeOption(['OPERATION_MIN', 'OPERATION_MAX', 'OPERATION_MEAN']);
                            break;
                        }
                        case "esriMosaicLockRaster" :
                        {
                            domStyle.set(this.attribute, "display", "none");
                            domStyle.set(this.lockraster, "display", "block");
                            domStyle.set(this.notseamline, "display", "block");
                            if (!registry.byId("mosaicOperation").getOptions('OPERATION_MIN')) {
                                registry.byId("mosaicOperation").addOption({label: 'Minimum of pixel values', value: 'OPERATION_MIN'});
                                registry.byId("mosaicOperation").addOption({label: 'Maximum of pixel values', value: 'OPERATION_MAX'});
                                registry.byId("mosaicOperation").addOption({label: 'Average of pixel values', value: 'OPERATION_MEAN'});
                            }
                            break;
                        }
                    }
                },
                applyMosaic: function () {
                    var mr = new MosaicRule();
                    mr.method = registry.byId("mosaicMethod").get("value");
                    mr.operation = registry.byId("mosaicOperation").get("value");
                    switch (registry.byId("mosaicMethod").get("value")) {
                        case "esriMosaicAttribute" :
                        {
                            mr.ascending = !registry.byId("ascending").get("checked");
                            mr.sortField = registry.byId("sortField").get("value");
                            mr.sortValue = registry.byId("sortValue").get("value");
                            break;
                        }
                        case "esriMosaicNone" :

                        case "esriMosaicCenter" :

                        case "esriMosaicNorthwest" :

                        case "esriMosaicNadir" :
                        {
                            mr.ascending = !registry.byId("ascending").get("checked");
                            break;
                        }

                        case "esriMosaicSeamline" :
                        {
                            break;
                        }
                        case "esriMosaicLockRaster" :
                        {
                            mr.ascending = !registry.byId("ascending").get("checked");
                            var temp = registry.byId('lockRasterIds').get('value');
                            var ids = temp.split(',');
                            for (var x in ids) {
                                ids[x] = parseInt(ids[x], 10);
                            }
                            mr.lockRasterIds = ids;
                            break;
                        }
                    }
                    this.imageServiceLayer.setMosaicRule(mr);
                },
                showLoading: function () {
                    esri.show(dom.byId("loadingido"));
                },
                hideLoading: function () {
                    esri.hide(dom.byId("loadingido"));
                }
            });

            clazz.hasLocale = false;
            clazz.hasSettingPage = false;
            clazz.hasSettingUIFile = false;
            clazz.hasSettingLocale = false;
            clazz.hasSettingStyle = false;
            return clazz;
        });