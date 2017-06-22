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
    "dijit/registry",
    "dojo/_base/lang",
    "dojo/dom",
    "dojo/html",
    'dojo/dom-construct',
    "esri/dijit/LayerSwipe",
    "dijit/form/HorizontalSlider",
    "dijit/form/HorizontalRule",
    "dijit/form/HorizontalRuleLabels",
    "dojo/dom-style",
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
                registry,
                lang,
                dom,
                html,
                domConstruct,
                LayerSwipe, HorizontalSlider, HorizontalRule, HorizontalRuleLabels, domStyle) {
            var clazz = declare([BaseWidget, _WidgetsInTemplateMixin], {
                templateString: template,
                name: 'ISCompare',
                baseClass: 'jimu-widget-ISCompare',
                layerInfos: [],
                primaryLayerIndex: null,
                secondaryLayerIndex: null,
                primaryLayer: null,
                secondaryLayer: null,
                layerSwipe: null,
                layerList: null,
                startup: function () {
                    this.inherited(arguments);
                    domConstruct.place('<img id="loadingCompare" style="position: absolute;top:0;bottom: 0;left: 0;right: 0;margin:auto;z-index:100;" src="' + require.toUrl('jimu') + '/images/loading.gif">', this.domNode);
                    this.hideLoading();
                },
                onOpen: function () {
                    this.refreshData();
                    if (this.map)
                        this.refreshHandler = this.map.on("update-end", lang.hitch(this, this.refreshData));
                    this.setSwipe();
                },
                onClose: function () {
                    if (this.refreshHandler) {
                        this.refreshHandler.remove();
                        this.refreshHandler = null;
                    }
                    if (this.layerSwipe) {
                        this.layerSwipe.destroy();
                        this.layerSwipe = null;
                    }
                    if (this.layerSwipeHorizontal) {
                        this.layerSwipeHorizontal.destroy();
                        this.layerSwipeHorizontal = null;
                    }
                },
                refreshData: function () {
                    if (this.map.layerIds) {

                        if (this.map.resultLayer || this.map.getLayer("resultLayer")) {
                            this.resultLayer = this.map.resultLayer ? this.map.getLayer(this.map.resultLayer) : this.map.getLayer("resultLayer");
                            if (this.resultLayer.visible) {
                                if (this.config.compareTool === "slider")
                                    domStyle.set("resultOpacity", "display", "block");
                                else
                                    domStyle.set("resultOpacity", "display", "none");
                            } else {
                                this.resultLayer = null;
                                domStyle.set("resultOpacity", "display", "none");
                            }
                        }
                        if (this.map.primaryLayer && this.map.getLayer(this.map.primaryLayer).visible) {
                            this.primaryLayer = this.map.getLayer(this.map.primaryLayer);
                            if (this.map.secondaryLayer && this.map.getLayer(this.map.secondaryLayer).visible) {
                                this.secondaryLayer = this.map.getLayer(this.map.secondaryLayer);
                            } else
                                this.secondaryLayer = null;
                        } else if (this.map.secondaryLayer && this.map.getLayer(this.map.secondaryLayer).visible) {
                            this.secondaryLayer = this.map.getLayer(this.map.secondaryLayer);
                            this.primaryLayer = null;
                        } else {
                            this.primaryLayer = null;
                            this.secondaryLayer = null;

                            for (var i = this.map.layerIds.length - 1; i >= 0; i--) {
                                var layer = this.map.getLayer(this.map.layerIds[i]);
                                if (layer && layer.visible && layer.serviceDataType && layer.serviceDataType.substr(0, 16) === "esriImageService" && layer.id !== this.map.resultLayer && layer.id !== "resultLayer") {
                                    this.primaryLayer = layer;
                                    break;
                                }
                            }
                            for (var j = this.map.layerIds.length - 1; j >= 0; j--) {
                                var layer = this.map.getLayer(this.map.layerIds[j]);
                                if (layer && layer.visible && layer.serviceDataType && layer.serviceDataType.substr(0, 16) === "esriImageService" && layer.id !== this.map.resultLayer && layer.id !== "resultLayer" && this.primaryLayer && layer.id !== this.primaryLayer.id) {
                                    this.secondaryLayer = layer;
                                    break;
                                }
                            }
                            
                        }
                        if (this.secondaryLayer)
                            var secTitle = (this.secondaryLayer.arcgisProps && this.secondaryLayer.arcgisProps.title) ? this.secondaryLayer.arcgisProps.title : (this.secondaryLayer.title || this.secondaryLayer.name || this.secondaryLayer.id);
                        else
                            var secTitle = "Basemap";
                        if (this.primaryLayer)
                            var priTitle = (this.primaryLayer.arcgisProps && this.primaryLayer.arcgisProps.title) ? this.primaryLayer.arcgisProps.title : (this.primaryLayer.title || this.primaryLayer.name || this.primaryLayer.id);
                        else
                            var priTitle = "Basemap";
                        if (this.resultLayer) {
                            if (this.config.compareTool === "slider")
                                html.set(this.resultLayerDescription, "Transparency Slider: <b>" + (this.resultLayer.title || this.resultLayer.name || this.resultLayer.id) + "</b> and <b>" + ((priTitle === "Basemap" && secTitle !== priTitle) ? secTitle : priTitle) + "</b><br>");
                            else
                                html.set(this.resultLayerDescription, "Horizontal Swipe: <b>" + (this.resultLayer.title || this.resultLayer.name || this.resultLayer.id) + "</b> and <b>" + ((priTitle === "Basemap" && secTitle !== priTitle) ? secTitle : priTitle) + "</b><br>");
                            registry.byId("resultOpacity").set("value", 1 - this.resultLayer.opacity);
                        } else
                            html.set(this.resultLayerDescription, "");
                        if (priTitle === secTitle && priTitle === "Basemap") {
                            if (this.layerSwipe)
                                this.layerSwipe.destroy();
                            html.set(this.compareLayerDescription, "");
                        } else if(priTitle === secTitle && this.primaryLayer.id === this.secondaryLayer.id){
                            html.set(this.compareLayerDescription, "Vertical Swipe: <b>" + priTitle + "</b> and <b>Basemap</b><br>");
                        }
                        else {
                            if (priTitle !== "Basemap")
                                html.set(this.compareLayerDescription, "Vertical Swipe: <b>" + priTitle + "</b> and <b>" + secTitle + "</b><br>");
                            else
                                html.set(this.compareLayerDescription, "Vertical Swipe: <b>" + secTitle + "</b> and <b>" + priTitle + "</b><br>");
                        }

                        if (!this.primaryLayer && !this.secondaryLayer && !this.resultLayer)
                            html.set(this.noLayerNotification, "No visible Imagery Layers available for comparison.");
                        else
                            html.set(this.noLayerNotification, "");
                    }
                },
                postCreate: function () {
                    registry.byId("resultOpacity").on("change", lang.hitch(this, this.changePrimaryOpacity));
                    /*           if (this.config.compareTool !== "both") {
                     if (this.config.compareTool === "swipe") {
                     domStyle.set(registry.byId("primaryOpacity").domNode, "display", "none");
                     domStyle.set(this.id + "_panel", "visibility", "hidden");
                     this.refreshData();
                     registry.byId("compare").set("value", "Swipe");
                     }
                     domStyle.set(registry.byId("compare").domNode, "display", "none");
                     }*/
                    if (this.map) {
                        this.map.on("update-start", lang.hitch(this, this.showLoading));
                        this.map.on("update-end", lang.hitch(this, this.hideLoading));
                    }
                },
                changePrimaryOpacity: function (value) {
                    if (this.resultLayer)
                        this.resultLayer.setOpacity(1 - value);
                },
                setSwipe: function () {
                    if (document.getElementById("swipewidget") && this.layerSwipe)
                        this.layerSwipe.destroy();
                    if (this.config.compareTool === "swipe") {
                        if (document.getElementById("swipewidgetHorizontal") && this.layerSwipeHorizontal)
                            this.layerSwipeHorizontal.destroy();
                        domConstruct.place("<div id='swipewidgetHorizontal'></div>", "map", "first");
                    }
                    domConstruct.place("<div id='swipewidget'></div>", "map", "first");
                    var layers = [];
                  
                    if (this.secondaryLayer && this.primaryLayer && (JSON.stringify(this.secondaryLayer.renderingRule) !== JSON.stringify(this.primaryLayer.renderingRule) || JSON.stringify(this.secondaryLayer.mosaicRule) !== JSON.stringify(this.primaryLayer.mosaicRule))) {
                        for (var a in this.map.layerIds) {
                            if (this.map.layerIds[a] === this.primaryLayer.id)
                            {
                                var primaryIndex = parseInt(a);
                            }
                            if (this.map.layerIds[a] === this.secondaryLayer.id)
                            {
                                var secondaryIndex = parseInt(a);
                            }
                        }

                        if (primaryIndex > secondaryIndex) {
                            for (var a = primaryIndex; a > secondaryIndex; a--) {

                                layers.push(this.map.getLayer(this.map.layerIds[a]));

                            }
                        } else {

                            for (var a = secondaryIndex; a > primaryIndex; a--) {
                                layers.push(this.map.getLayer(this.map.layerIds[a]));
                            }
                        }
                    } else
                    {
                        if(this.primaryLayer && this.secondaryLayer && this.secondaryLayer.id !== this.primaryLayer.id){
                            layers.push(this.primaryLayer);
                            layers.push(this.secondaryLayer);
                            var priTitle = (this.primaryLayer.arcgisProps && this.primaryLayer.arcgisProps.title) ? this.primaryLayer.arcgisProps.title : (this.primaryLayer.title || this.primaryLayer.name || this.primaryLayer.id);
                            html.set(this.compareLayerDescription, "Vertical Swipe: <b>" + priTitle + "</b> and <b>Basemap</b><br>");
                        }else if (this.primaryLayer)
                            layers.push(this.primaryLayer);
                        else if (this.secondaryLayer)
                            layers.push(this.secondaryLayer);

                    }
                    registry.byId("resultOpacity").set("value", 0);
                    if (layers.length > 0) {
                        this.layerSwipe = new LayerSwipe({
                            type: "vertical",
                            map: this.map,
                            invertPlacement: (this.secondaryLayer && primaryIndex < secondaryIndex) ? false : true,
                            layers: layers
                        }, dom.byId("swipewidget"));
                        this.layerSwipe.startup();
                    }
                    if (this.resultLayer && this.config.compareTool === "swipe") {
                        this.layerSwipeHorizontal = new LayerSwipe({
                            type: "horizontal",
                            top: 500,
                            map: this.map,
                            layers: [this.resultLayer]
                        }, dom.byId("swipewidgetHorizontal"));
                        this.layerSwipeHorizontal.startup();
                    }
                },
                showLoading: function () {
                    domStyle.set("loadingCompare", "display", "block");
                },
                hideLoading: function () {
                    domStyle.set("loadingCompare", "display", "none");
                }
            });

            clazz.hasLocale = false;
            clazz.hasSettingPage = false;
            clazz.hasSettingUIFile = false;
            clazz.hasSettingLocale = false;
            clazz.hasSettingStyle = false;
            return clazz;
        });