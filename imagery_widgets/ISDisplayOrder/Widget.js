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
    "dojo/html",
    "dojo/dom-style",
    "esri/request",
    "esri/layers/MosaicRule",
    "esri/toolbars/draw",
    "esri/graphic",
    "esri/symbols/SimpleMarkerSymbol",
    "esri/symbols/SimpleLineSymbol",
    "esri/Color", "dojo/date/locale",
    'dojo/dom-construct',
    "dojo/parser",
    "dijit/form/Select",
    "dijit/form/HorizontalSlider",
    "dijit/form/Button",
    "dijit/form/NumberSpinner",
    "dijit/form/CheckBox",
    "dijit/form/HorizontalRuleLabels",
    "dijit/form/TextBox",
    "dijit/form/DateTextBox"
],
        function (
                declare,
                _WidgetsInTemplateMixin,
                BaseWidget,
                registry, lang, html, domStyle, esriRequest, MosaicRule, Draw, Graphic, SimpleMarkerSymbol, SimpleLineSymbol, Color, locale, domConstruct) {
            var clazz = declare([BaseWidget, _WidgetsInTemplateMixin], {
                name: 'ISDisplayOrder',
                baseClass: 'jimu-widget-ISDisplayOrder',
                previousImageServiceLayerUrl: null,
                imageServiceLayer: null,
                startup: function () {
                    this.inherited(arguments);
                    domConstruct.place('<img id="loadingDisplayOrder" style="position: absolute;top:0;bottom: 0;left: 0;right: 0;margin:auto;z-index:100;" src="' + require.toUrl('jimu') + '/images/loading.gif">', this.domNode);
                    this.hideLoading();
                },
                postCreate: function () {
                    registry.byId("mosaicMethod").on("change", lang.hitch(this, this.checkFields));
                    registry.byId("mrapply").on("click", lang.hitch(this, this.applyMosaic));
                    registry.byId("sortField").on("change", lang.hitch(this, function (value) {
                        if (this.saveFields[value] === "esriFieldTypeDate") {
                            domStyle.set(registry.byId("sortValueDate").domNode, "display", "inline-block");
                            domStyle.set(registry.byId("sortValue").domNode, "display", "none");
                        } else {
                            domStyle.set(registry.byId("sortValueDate").domNode, "display", "none");
                            domStyle.set(registry.byId("sortValue").domNode, "display", "inline-block");
                        }

                    }));
                    if (this.map) {
                        this.map.on("update-start", lang.hitch(this, this.showLoading));
                        this.map.on("update-end", lang.hitch(this, this.hideLoading));
                    }
                    this.toolbarDisplayOrder = new Draw(this.map);
                    dojo.connect(this.toolbarDisplayOrder, "onDrawComplete", lang.hitch(this, this.addGraphic));
                },
                onOpen: function () {
                    this.refreshData();
                    if (this.map) {
                        this.refreshHandler = this.map.on("update-end", lang.hitch(this, this.refreshData));
                    }
                },
                clearGraphic: function () {
                    for (var a in this.map.graphics.graphics) {
                        if (this.map.graphics.graphics[a].geometry && this.map.graphics.graphics[a].geometry.type === "point" && this.map.graphics.graphics[a].symbol && this.map.graphics.graphics[a].symbol.color.r === 255) {
                            this.map.graphics.remove(this.map.graphics.graphics[a]);
                            break;
                        }
                    }
                },
                onClose: function () {
                    if (this.refreshHandler) {
                        this.refreshHandler.remove();
                        this.refreshHandler = null;
                    }
                    this.previousImageServiceLayerUrl = null;
                    this.clearGraphic();
                    this.toolbarDisplayOrder.deactivate();
                },
                addGraphic: function (geometry) {
                    this.clearGraphic();
                    var symbol = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 20,
                            new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                                    new Color([255, 0, 0]), 1),
                            new Color([255, 0, 0, 0.35]));
                    var graphic = new Graphic(geometry.geometry, symbol);
                    this.map.graphics.add(graphic);
                    this.viewPoint = geometry.geometry;
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
                            domStyle.set(this.displayOrderContainer, "display", "block");
                            html.set(this.displayOrderErrorContainer, "");
                            html.set(this.displayOrderLayerTitle, "Layer: <b>" + (this.imageServiceLayer.title || this.imageServiceLayer.arcgisProps.title || this.imageServiceLayer.name || this.imageServiceLayer.id) + "</b>");
                            if (this.previousImageServiceLayerUrl !== this.imageServiceLayer.url) {
                                this.populateAttributes();
                                this.checkFields();
                            }
                        } else {
                            domStyle.set(this.displayOrderContainer, "display", "none");
                            html.set(this.displayOrderErrorContainer, "No visible Imagery Layers in the map.");
                        }
                    }
                },
                populateAttributes: function () {
                    this.previousImageServiceLayerUrl = this.imageServiceLayer.url;
                    if (this.imageServiceLayer.fields)
                    {
                        registry.byId("sortField").removeOption(registry.byId('sortField').getOptions());
                        this.saveFields = [];
                        for (var i = 0; i < this.imageServiceLayer.fields.length; i++) {
                            registry.byId("sortField").addOption({label: this.imageServiceLayer.fields[i].name, value: this.imageServiceLayer.fields[i].name});
                            this.saveFields[this.imageServiceLayer.fields[i].name] = this.imageServiceLayer.fields[i].type;
                        }
                        if (this.saveFields[this.imageServiceLayer.fields[0].name] === "esriFieldTypeDate") {
                            domStyle.set(registry.byId("sortValueDate").domNode, "display", "inline-block");
                            domStyle.set(registry.byId("sortValue").domNode, "display", "none");
                        } else {
                            domStyle.set(registry.byId("sortValueDate").domNode, "display", "none");
                            domStyle.set(registry.byId("sortValue").domNode, "display", "inline-block");
                        }
                        this.displaymosaic();
                    } else {


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
                            this.saveFields = [];
                            for (var i = 0; i < data.fields.length; i++) {
                                registry.byId("sortField").addOption({label: data.fields[i].name, value: data.fields[i].name});
                                this.saveFields[data.fields[i].name] = data.fields[i].type;
                            }

                            if (this.saveFields[data.fields[0].name] === "esriFieldTypeDate") {
                                domStyle.set(registry.byId("sortValueDate").domNode, "display", "inline-block");
                                domStyle.set(registry.byId("sortValue").domNode, "display", "none");
                            } else {
                                domStyle.set(registry.byId("sortValueDate").domNode, "display", "none");
                                domStyle.set(registry.byId("sortValue").domNode, "display", "inline-block");
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
                            if (this.saveFields[mosaic.sortField] === "esriFieldTypeDate") {
                                registry.byId("sortValueDate").set("value", locale.format(new Date(mosaic.sortValue), {selector: "date", datePattern: "yyyy-MM-dd"}));
                            } else {
                                registry.byId("sortValue").set("value", mosaic.sortValue);
                            }
                        }

                        if (mosaic.method == "esriMosaicLockRaster") {
                            registry.byId("lockRasterIds").set("value", mosaic.lockRasterIds.toString());
                        }
                    } else {
                        registry.byId("mosaicMethod").set("value", 'esriMosaicNone');
                    }

                },
                checkFields: function () {
                    this.clearGraphic();
                    this.toolbarDisplayOrder.deactivate();
                    switch (registry.byId("mosaicMethod").get("value")) {
                        case "esriMosaicAttribute" :
                        {
                            domStyle.set(this.attribute, "display", "block");
                            domStyle.set(this.dropDownDisplayOrderOptions.domNode, "display", "inline");
                            domStyle.set(this.lockraster, "display", "none");
                            domStyle.set(this.notseamline, "display", "block");
                            if (!registry.byId("mosaicOperation").getOptions('MT_MIN')) {
                                registry.byId("mosaicOperation").addOption({label: 'Minimum of pixel values', value: 'MT_MIN'});
                                registry.byId("mosaicOperation").addOption({label: 'Maximum of pixel values', value: 'MT_MAX'});
                                registry.byId("mosaicOperation").addOption({label: 'Average of pixel values', value: 'MT_MEAN'});
                            }
                            break;
                        }
                        case "esriMosaicNone" :

                        case "esriMosaicCenter" :

                        case "esriMosaicNorthwest" :

                        case "esriMosaicNadir" :
                        {
                            domStyle.set(this.attribute, "display", "none");
                            domStyle.set(this.dropDownDisplayOrderOptions.domNode, "display", "inline");
                            domStyle.set(this.lockraster, "display", "none");
                            domStyle.set(this.notseamline, "display", "block");
                            if (!registry.byId("mosaicOperation").getOptions('MT_MIN')) {
                                registry.byId("mosaicOperation").addOption({label: 'Minimum of pixel values', value: 'MT_MIN'});
                                registry.byId("mosaicOperation").addOption({label: 'Maximum of pixel values', value: 'MT_MAX'});
                                registry.byId("mosaicOperation").addOption({label: 'Average of pixel values', value: 'MT_MEAN'});
                            }
                            break;
                        }

                        case "esriMosaicSeamline" :
                        {
                            domStyle.set(this.attribute, "display", "none");
                            domStyle.set(this.dropDownDisplayOrderOptions.domNode, "display", "inline");
                            domStyle.set(this.lockraster, "display", "none");
                            domStyle.set(this.notseamline, "display", "none");
                            registry.byId("mosaicOperation").removeOption(['MT_MIN', 'MT_MAX', 'MT_MEAN']);
                            break;
                        }
                        case "esriMosaicLockRaster" :
                        {
                            domStyle.set(this.attribute, "display", "none");
                            domStyle.set(this.dropDownDisplayOrderOptions.domNode, "display", "inline");
                            domStyle.set(this.lockraster, "display", "block");
                            domStyle.set(this.notseamline, "display", "block");
                            if (!registry.byId("mosaicOperation").getOptions('MT_MIN')) {
                                registry.byId("mosaicOperation").addOption({label: 'Minimum of pixel values', value: 'MT_MIN'});
                                registry.byId("mosaicOperation").addOption({label: 'Maximum of pixel values', value: 'MT_MAX'});
                                registry.byId("mosaicOperation").addOption({label: 'Average of pixel values', value: 'MT_MEAN'});
                            }
                            break;
                        }
                        case "esriMosaicViewpoint":
                        {
                            domStyle.set(this.attribute, "display", "none");
                            domStyle.set(this.dropDownDisplayOrderOptions.domNode, "display", "inline");
                            domStyle.set(this.lockraster, "display", "none");
                            domStyle.set(this.notseamline, "display", "block");
                            if (!registry.byId("mosaicOperation").getOptions('MT_MIN')) {
                                registry.byId("mosaicOperation").addOption({label: 'Minimum of pixel values', value: 'MT_MIN'});
                                registry.byId("mosaicOperation").addOption({label: 'Maximum of pixel values', value: 'MT_MAX'});
                                registry.byId("mosaicOperation").addOption({label: 'Average of pixel values', value: 'MT_MEAN'});
                            }
                            this.toolbarDisplayOrder.activate(Draw.POINT);
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
                            if (this.saveFields[mr.sortField] === "esriFieldTypeDate") {
                                var date = new Date(registry.byId("sortValueDate").get("value"));
                                date = date.getFullYear() + "/" + (date.getMonth() + 1) + "/" + date.getDate();
                                mr.sortValue = date;
                            } else
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
                        case "esriMosaicViewpoint" :
                        {
                            mr.ascending = !registry.byId("ascending").get("checked");
                            mr.viewpoint = this.viewPoint;
                        }
                    }
                    this.imageServiceLayer.setMosaicRule(mr);
                },
                showLoading: function () {
                    domStyle.set("loadingDisplayOrder", "display", "block");
                },
                hideLoading: function () {
                    domStyle.set("loadingDisplayOrder", "display", "none");
                }
            });

            clazz.hasLocale = false;
            clazz.hasSettingPage = false;
            clazz.hasSettingUIFile = false;
            clazz.hasSettingLocale = false;
            clazz.hasSettingStyle = false;
            return clazz;
        });