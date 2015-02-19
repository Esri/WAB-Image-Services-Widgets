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
    "dijit/form/Select",
    "dijit/form/Button",
    "dijit/form/NumberSpinner",
    "dijit/form/CheckBox",
    "dijit/form/TextBox",
    "dijit/form/DropDownButton",
    "dijit/TooltipDialog"

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
                domConstruct,
                RasterFunction,
                MosaicRule,
                ArcGISImageServiceLayer,
                ImageServiceParameters,
                domConstruct, LayerSwipe, HorizontalSlider, HorizontalRule, HorizontalRuleLabels, domStyle) {
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
                startup: function() {
                    this.inherited(arguments);
                    domConstruct.place('<img id="loadingic" style="position: absolute;top:0;bottom: 0;left: 0;right: 0;margin:auto;z-index:100;" src="' + require.toUrl('jimu') + '/images/loading.gif">', this.domNode);
                    this.hideLoading();
                },
                onOpen: function() {
                    this.refreshData();
                },
                refreshData: function() {
                    if (this.map.layerIds) {
                        for (var i = 1; i < this.map.layerIds.length; i++) {
                            var layer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - i]);
                            if (layer.visible) {
                                this.primaryLayer = layer;
                                break;
                            }
                        }
                        registry.byId("primaryOpacity").set("value", 1 - this.primaryLayer.opacity);
                    }
                },
                postCreate: function() {
                    
                    registry.byId("primaryOpacity").on("change", lang.hitch(this, this.changePrimaryOpacity));
                    registry.byId("compare").on("change", lang.hitch(this, this.setSwipe));
                    if (this.map) {
                        this.map.on("update-end", lang.hitch(this, this.refreshData));
                        this.map.on("update-start", lang.hitch(this, this.showLoading));
                        this.map.on("update-end", lang.hitch(this, this.hideLoading));
                    }
                },            
                changePrimaryOpacity: function() {
                    this.primaryLayer.setOpacity(1 - registry.byId("primaryOpacity").get("value"));
                },
                setSwipe: function() {
                    domConstruct.place("<div id='swipewidget'></div>", "map", "after");// earlier the widget was created in the postCreate method but now it is created every time the setSwipe function is called 
                    if (registry.byId("compare").get("value") == "Swipe") {
                        registry.byId("primaryOpacity").set("value", 0);
                        this.layerSwipe = new LayerSwipe({
                            type: "vertical",
                            map: this.map,
                            layers: [this.primaryLayer]
                        }, dom.byId("swipewidget"));
                        this.layerSwipe.startup();
                        domStyle.set(registry.byId("primaryOpacity").domNode, "display", "none");
                    } else {
                        this.layerSwipe.destroy(); //if the transparency option is selected the swipewidget is destroyed
                        domStyle.set(registry.byId("primaryOpacity").domNode, "display", "inline-block");
                        registry.byId("primaryOpacity").set("value", 0);
                    }
                },
                // updateSwipe function is never used in this code. it can be removed
//                updateSwipe: function() { 
//                    if (this.layerSwipe) {
//                        this.layerSwipe.destroy();
//                        this.setSwipe();
//                    }
//                },
                showLoading: function() {
                    esri.show(dom.byId("loadingic"));
                },
                hideLoading: function() {
                    esri.hide(dom.byId("loadingic"));
                }
            });

            clazz.hasLocale = false;
            clazz.hasSettingPage = false;
            clazz.hasSettingUIFile = false;
            clazz.hasSettingLocale = false;
            clazz.hasSettingStyle = false;
            return clazz;
        });