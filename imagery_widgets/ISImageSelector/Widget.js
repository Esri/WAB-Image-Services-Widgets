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
    "dojo/html",
    "dojo/dom-class",
    "dojo/dom",
    "esri/layers/MosaicRule",
    "esri/tasks/query",
    "esri/tasks/QueryTask",
    "esri/geometry/Extent",
    "dojo/date/locale",
    "dojo/html",
    "dojo/dom-construct",
    "dijit/form/HorizontalSlider",
    "dijit/form/HorizontalRule",
    "dijit/form/HorizontalRuleLabels",
    "esri/graphic",
    "esri/symbols/SimpleLineSymbol",
    "esri/symbols/SimpleFillSymbol",
    "esri/Color",
    "esri/InfoTemplate",
    "esri/geometry/mathUtils",
    "dojo/dom-style",
    "esri/layers/ArcGISImageServiceLayer",
    "esri/layers/ImageServiceParameters",
    "esri/tasks/ImageServiceIdentifyTask",
    "esri/tasks/ImageServiceIdentifyParameters",
    "esri/geometry/Polygon",
    "esri/geometry/Point",
    "esri/request",
    "dijit/form/Select",
    "dijit/form/Button",
    "dijit/form/NumberSpinner",
    "dijit/form/CheckBox",
    "dijit/form/TextBox",
    "dijit/form/DropDownButton",
    "dijit/TooltipDialog",
    "dijit/Tooltip"
],
        function (
                declare,
                _WidgetsInTemplateMixin,
                template,
                BaseWidget,
                registry,
                lang,
                html,
                domClass,
                dom,
                MosaicRule,
                Query, QueryTask, Extent, locale, html, domConstruct, HorizontalSlider, HorizontalRule, HorizontalRuleLabels, Graphic, SimpleLineSymbol, SimpleFillSymbol, Color, InfoTemplate, mathUtils, domStyle, ArcGISImageServiceLayer, ImageServiceParameters, ImageServiceIdentifyTask, ImageServiceIdentifyParameters, Polygon, Point, esriRequest) {
            var clazz = declare([BaseWidget, _WidgetsInTemplateMixin], {
                templateString: template,
                name: 'ISImageSelector',
                baseClass: 'jimu-widget-ISImageSelector',
                primaryLayer: null,
                secondaryLayer: null,
                orderedDates: null,
                sliderRules: null,
                sliderLabels: null,
                slider: null,
                features: null,
                sliderValue: null,
                featureIds: [],
                responseAlert: false,
                defaultMosaicRule: null,
                mapZoomFactor: 2.0,
                previousValue: null,
                mapWidthPanFactor: 0.75,
                startup: function () {
                    this.inherited(arguments);
                    domConstruct.place('<img id="loadingImageSelector" style="position: absolute;top:0;bottom: 0;left: 0;right: 0;margin:auto;z-index:100;" src="' + require.toUrl('jimu') + '/images/loading.gif">', this.domNode);
                    this.hideLoading();
                    if (this.config.display === "both") {

                        domStyle.set(this.imageSelectorContainer, "display", "inline-block");
                    } else {
                        if (this.config.display === "dropdown")
                            this.imageDisplayFormat();
                        domStyle.set(this.imageSelectorContainer, "display", "none");
                    }
                },
                postCreate: function () {
                    this.layerInfos = this.config;

                    registry.byId("dropDownImageList").on("click", lang.hitch(this, this.imageDisplayFormat));
                    registry.byId("imageSelectorDropDown").on("change", lang.hitch(this, this.sliderDropDownSelection, "dropDown"));
                    registry.byId("saveSceneBtn").on("click", lang.hitch(this, this.createSecondary));
                    registry.byId("subtractValue").on("change", lang.hitch(this, this.sliderChange));
                    registry.byId("subtractDateString").on("change", lang.hitch(this, this.sliderChange));
                    registry.byId("refreshImageSliderBtn").on("click", lang.hitch(this, this.imageSliderRefresh));
                    registry.byId("show").on("change", lang.hitch(this, this.sliderChange));
                    registry.byId("imageSelector").on("change", lang.hitch(this, this.setFilterDiv));
                    if (this.map) {
                        this.map.on("update-end", lang.hitch(this, this.refreshData));
                        if (this.config.autoRefresh)
                            this.map.on("extent-change", lang.hitch(this, this.mapExtentChange));
                        this.map.on("update-start", lang.hitch(this, this.showLoading));
                        this.map.on("update-end", lang.hitch(this, this.hideLoading));
                    }


                },
                onOpen: function () {
                    if (!this.previousInfo) {
                        this.previousInfo = {
                            extent: this.map.extent,
                            level: this.map.getLevel()
                        };
                        this.previousExtentChangeLevel = this.previousInfo.level;
                    }
                    if (this.map.getLevel() >= this.config.zoomLevel) {
                        this.refreshData();
                    } else {
                        registry.byId("imageSelector").set("checked", false);
                        registry.byId("imageSelector").set("disabled", true);
                        html.set(this.errorDiv, "Zoom in to select images.");
                    }
                },
                checkField: function (currentVersion)
                {
                    if (currentVersion >= 10.21) {
                        if (this.layerInfos[this.label]) {
                            if (this.layerInfos[this.label].imageField && this.layerInfos[this.label].objectID && this.layerInfos[this.label].category) {
                                this.imageField = this.layerInfos[this.label].imageField;

                                for (var a in this.primaryLayer.fields) {
                                    if (this.imageField === this.primaryLayer.fields[a].name) {
                                        this.imageFieldType = this.primaryLayer.fields[a].type;
                                        break;
                                    }
                                }
                                this.objectID = this.layerInfos[this.label].objectID;
                                this.categoryField = this.layerInfos[this.label].category;
                                registry.byId("imageSelector").set("disabled", false);
                                html.set(this.errorDiv, "");
                            } else {
                                registry.byId("imageSelector").set("checked", false);
                                registry.byId("imageSelector").set("disabled", true);
                                if (!this.layerInfos[this.label].imageField) {
                                    html.set(this.errorDiv, "Field is not specified.");
                                } else if (!this.layerInfos[this.label].objectID) {
                                    html.set(this.errorDiv, "No ObjectID field.");
                                } else {
                                    html.set(this.errorDiv, "No Category field.");
                                }
                            }
                        } else {
                            registry.byId("imageSelector").set("checked", false);
                            registry.byId("imageSelector").set("disabled", true);
                            html.set(this.errorDiv, "Cannot perform action for layer.");
                        }
                    } else {
                        registry.byId("imageSelector").set("checked", false);
                        registry.byId("imageSelector").set("disabled", true);
                        html.set(this.errorDiv, "Services pre 10.2.1 not supported.");
                    }
                },
                refreshData: function () {
                    if (this.map.layerIds && this.map.getLevel() >= this.config.zoomLevel) {
                        this.prevPrimary = this.primaryLayer;
                        if (this.map.primaryLayer) {
                            this.primaryLayer = this.map.getLayer(this.map.primaryLayer);
                        } else {
                            for (var a = this.map.layerIds.length - 1; a >= 0; a--) {
                                var layerObject = this.map.getLayer(this.map.layerIds[a]);
                                var title = layerObject.arcgisProps && layerObject.arcgisProps.title ? layerObject.arcgisProps.title : layerObject.title;
                                if (layerObject && layerObject.visible && layerObject.serviceDataType && layerObject.serviceDataType.substr(0, 16) === "esriImageService" && layerObject.id !== "scatterResultLayer" && layerObject.id !== "resultLayer" && layerObject.id !== this.map.resultLayer && (!title || ((title).charAt(title.length - 1)) !== "_")) {
                                    this.primaryLayer = layerObject;
                                    break;
                                } else
                                    this.primaryLayer = null;
                            }

                        }

                        if (this.primaryLayer) {

                            this.prevMosaicBackup = this.mosaicBackup;
                            this.label = this.primaryLayer.id;
                            this.defaultMosaicRule = this.primaryLayer.defaultMosaicRule;
                            if (!this.prevPrimary || this.prevPrimary.url !== this.primaryLayer.url) {
                                this.mosaicBackup = this.primaryLayer.mosaicRule;
                                this.primaryLayer.on("visibility-change", lang.hitch(this, this.sliderChange));
                            } else if (this.prevPrimary.url === this.primaryLayer.url && this.primaryLayer.mosaicRule) {
                                if (this.primaryLayer.mosaicRule.method !== "esriMosaicLockRaster") {
                                    this.mosaicBackup = this.primaryLayer.mosaicRule;
                                }
                            }


                            var currentVersion = this.primaryLayer.currentVersion;

                            if (this.layerInfos[this.label] && this.primaryLayer.currentVersion)
                            {
                                var currentVersion = this.primaryLayer.currentVersion;
                                this.checkField(currentVersion);
                                dom.byId("imageSelectorLayerTitle").innerHTML = this.primaryLayer.visible ? ("Layer: <b>" + this.layerInfos[this.label].title + "</b>") : "Layer: <b>" + this.layerInfos[this.label].title + " (Visibility Off)</b>";
                            } else if (this.layerInfos[this.label] && !this.primaryLayer.currentVersion) {
                                dom.byId("imageSelectorLayerTitle").innerHTML = this.primaryLayer.visible ? "Layer: <b>" + this.layerInfos[this.label].title + "</b>" : "Layer: <b>" + this.layerInfos[this.label].title + " (Visibility Off)</b>";
                                var layersRequest = esriRequest({
                                    url: this.primaryLayer.url,
                                    content: {f: "json"},
                                    handleAs: "json",
                                    callbackParamName: "callback"
                                });
                                layersRequest.then(lang.hitch(this, function (data) {
                                    var currentVersion = data.currentVersion;
                                    this.checkField(currentVersion);
                                }));
                            } else if (!this.layerInfos[this.label]) {
                                dom.byId("imageSelectorLayerTitle").innerHTML = this.primaryLayer.visible ? ("Layer: <b>" + this.primaryLayer.name || this.primaryLayer.id + "</b>") : ("Layer: <b>" + this.primaryLayer.name || this.primaryLayer.id + " (Visibility Off)</b>");
                                var layersRequest = esriRequest({
                                    url: this.primaryLayer.url,
                                    content: {f: "json"},
                                    handleAs: "json",
                                    callbackParamName: "callback"
                                });
                                layersRequest.then(lang.hitch(this, function (data) {
                                    var currentVersion = data.currentVersion;
                                    var obj = {};
                                    var regExp = new RegExp(/acq[a-z]*[_]?Date/i);
                                    for (var a in data.fields) {
                                        if (data.fields[a].type === "esriFieldTypeOID") {
                                            obj.objectID = data.fields[a].name;
                                        }
                                        if (data.fields[a].name === "Category") {
                                            obj.category = data.fields[a].name;
                                        }
                                        if (regExp.test(data.fields[a].name)) {
                                            obj.imageField = data.fields[a].name;
                                        } else if (!obj.imageField && data.fields[a].type === "esriFieldTypeDate") {
                                            obj.imageField = data.fields[a].name;
                                        }
                                    }
                                    obj.title = this.primaryLayer.name || this.primaryLayer.id;
                                    this.layerInfos[this.label] = obj;
                                    this.checkField(currentVersion);
                                }));
                            }

                            if (!this.slider) {
                                this.imageSliderShow();
                            } else {
                                if (this.primaryLayer && this.prevPrimary !== this.primaryLayer) {
                                    this.previousValue = null;
                                    registry.byId("imageSelector").set("checked", false);
                                    if (this.prevPrimary) {
                                        if (this.prevMosaicBackup)
                                            this.prevPrimary.setMosaicRule(new MosaicRule(this.prevMosaicBackup));
                                        else
                                            this.prevPrimary.setMosaicRule(new MosaicRule(this.prevPrimary.defaultMosaicRule));
                                    }
                                }
                            }
                        } else {
                            if (this.prevPrimary) {
                                if (this.prevMosaicBackup)
                                    this.prevPrimary.setMosaicRule(new MosaicRule(this.prevMosaicBackup));
                                else
                                    this.prevPrimary.setMosaicRule(new MosaicRule(this.prevPrimary.defaultMosaicRule));
                            }
                            registry.byId("imageSelector").set("checked", false);
                            registry.byId("imageSelector").set("disabled", true);
                            html.set(this.errorDiv, "No visible Imagery Layers in the map.");
                        }
                    }
                },
                mapExtentChange: function (evt) {
                    var validZoomLevel = (evt.lod.level >= this.config.zoomLevel);
                    if (validZoomLevel) {
                        var needsUpdate = false;
                        if (evt.levelChange) {
                            var zoomLevelChange = Math.abs(evt.lod.level - this.previousInfo.level);
                            if (zoomLevelChange >= this.mapZoomFactor) {
                                console.info("LARGE zoom: ", evt);
                                needsUpdate = true;
                            } else {
                                if (this.previousExtentChangeLevel < this.config.minZoomLevel) {
                                    console.info("THRESHOLD zoom: ", evt);
                                    needsUpdate = true;
                                }
                            }
                        }

                        var panDistance = Math.abs(mathUtils.getLength(evt.extent.getCenter(), this.previousInfo.extent.getCenter()));
                        var previousMapWidth = (this.previousInfo.extent.getWidth() * this.mapWidthPanFactor);
                        if (panDistance > previousMapWidth) {
                            console.info("LARGE pan: ", evt);
                            needsUpdate = true;
                        }

                        if (needsUpdate) {
                            this.imageSliderRefresh();
                        }
                    } else {
                        registry.byId("imageSelector").set("checked", false);
                        registry.byId("imageSelector").set("disabled", true);
                        html.set(this.errorDiv, "Zoom in to select images.");
                    }
                    this.previousExtentChangeLevel = evt.lod.level;
                },
                setFilterDiv: function () {

                    if (registry.byId("imageSelector").get("checked")) {
                        // document.getElementById("imageSelectorLabel").innerHTML = "Disable Image Selector";
                        if (!this.slider) {
                            this.imageSliderShow();
                        } else {
                            this.imageSliderRefresh();
                        }
                        domStyle.set(this.selectorDiv, "display", "block");

                    } else {
                        //   document.getElementById("imageSelectorLabel").innerHTML = "Enable Image Selector";
                        domStyle.set(this.selectorDiv, "display", "none");
                        this.map.graphics.clear();
                        if (this.mosaicBackup)
                            var mr = new MosaicRule(this.mosaicBackup);
                        else
                            var mr = new MosaicRule(this.defaultMosaicRule);
                        if (this.primaryLayer)
                            this.primaryLayer.setMosaicRule(mr);
                    }
                },
                imageDisplayFormat: function () {
                    if (domClass.contains(registry.byId("dropDownImageList").domNode, "dropDownSelected")) {

                        domClass.remove(registry.byId("dropDownImageList").domNode, "dropDownSelected");
                        document.getElementById("switchDisplayTooltip").innerHTML = "Show images in drop down list.";
                        document.getElementById("switchDisplayImage").src = "./widgets/ISImageSelector/images/dropdownlist.png";
                    } else {
                        domClass.add(registry.byId("dropDownImageList").domNode, "dropDownSelected");
                        document.getElementById("switchDisplayTooltip").innerHTML = "Show images on slider.";
                        document.getElementById("switchDisplayImage").src = "./widgets/ISImageSelector/images/slider.png";
                    }
                    this.imageDisplayFormat2();
                },
                imageDisplayFormat2: function () {
                    if (!domClass.contains(registry.byId("dropDownImageList").domNode, "dropDownSelected")) {
                        domStyle.set(this.imageRange, "display", "inline-block");
                        domStyle.set("dropDownOption", "display", "none");
                        domStyle.set(this.slider.domNode, "display", "block");
                        domStyle.set(this.sliderRules.domNode, "display", "block");
                        domStyle.set(this.sliderLabels.domNode, "display", "block");

                    } else {
                        if (this.slider) {
                            domStyle.set(this.slider.domNode, "display", "none");
                            domStyle.set(this.sliderRules.domNode, "display", "none");
                            domStyle.set(this.sliderLabels.domNode, "display", "none");
                        }
                        domStyle.set("dropDownOption", "display", "inline-block");
                    }
                },
                imageSliderShow: function () {
                    if (this.primaryLayer && registry.byId("imageSelector").get("checked")) {
                        domStyle.set(this.selectorDiv, "display", "block");
                        var extent = this.map.extent;
                        var xminnew = ((extent.xmax + extent.xmin) / 2) - ((extent.xmax - extent.xmin) * this.config.searchExtent / 200);
                        var xmaxnew = ((extent.xmax + extent.xmin) / 2) + ((extent.xmax - extent.xmin) * this.config.searchExtent / 200);
                        var yminnew = ((extent.ymax + extent.ymin) / 2) - ((extent.ymax - extent.ymin) * this.config.searchExtent / 200);
                        var ymaxnew = ((extent.ymax + extent.ymin) / 2) + ((extent.ymax - extent.ymin) * this.config.searchExtent / 200);
                        var extentnew = new Extent(xminnew, yminnew, xmaxnew, ymaxnew, extent.spatialReference);
                        var query = new Query();
                        query.geometry = extentnew;
                        query.outFields = [this.imageField];
                        if (this.primaryLayer.mosaicRule && this.primaryLayer.mosaicRule.where)
                            var layerFilter = this.primaryLayer.mosaicRule.where;
                        query.where = layerFilter ? this.categoryField + " = 1 AND " + layerFilter : this.categoryField + " = 1";
                        query.orderByFields = [this.imageField];
                        query.returnGeometry = true;
                        this.showLoading();
                        var queryTask = new QueryTask(this.primaryLayer.url);
                        queryTask.execute(query, lang.hitch(this, function (result) {
                            this.previousInfo = {
                                extent: this.map.extent,
                                level: this.map.getLevel()
                            };

                            this.orderedFeatures = result.features;

                            if (this.orderedFeatures.length > 0) {
                                this.orderedDates = [];
                                for (var a in this.orderedFeatures) {
                                    if (!this.config.listImagesSeparate) {
                                        if (parseInt(a) < 1)
                                            this.orderedDates.push({value: this.orderedFeatures[a].attributes[this.imageField], id: this.orderedFeatures[a].attributes[this.objectID]});
                                        else {
                                            if (this.imageFieldType === "esriFieldTypeDate") {
                                                var tempValue = locale.format(new Date(this.orderedDates[this.orderedDates.length - 1].value), {selector: "date", formatLength: "short"});
                                                var tempCurrentValue = locale.format(new Date(this.orderedFeatures[a].attributes[this.imageField]), {selector: "date", formatLength: "short"});
                                                if (tempValue !== tempCurrentValue)
                                                    this.orderedDates.push({value: this.orderedFeatures[a].attributes[this.imageField], id: this.orderedFeatures[a].attributes[this.objectID]});
                                            } else {
                                                if (this.orderedDates[this.orderedDates.length - 1].value !== this.orderedFeatures[a].attributes[this.imageField])
                                                    this.orderedDates.push({value: this.orderedFeatures[a].attributes[this.imageField], id: this.orderedFeatures[a].attributes[this.objectID]});
                                            }
                                        }
                                    } else {
                                        this.orderedDates.push({value: this.orderedFeatures[a].attributes[this.imageField], id: this.orderedFeatures[a].attributes[this.objectID]});
                                    }
                                }
                                this.featureLength = this.orderedDates.length;
                                this.imageSliderHide();
                                var sliderNode = domConstruct.create("div", {}, this.imageSliderDiv, "first");

                                var rulesNode = domConstruct.create("div", {}, sliderNode, "first");
                                this.sliderRules = new HorizontalRule({
                                    container: "bottomDecoration",
                                    count: this.featureLength,
                                    style: "height:5px;"
                                }, rulesNode);

                                var labels = [];

                                if (this.imageFieldType === "esriFieldTypeDate") {

                                    for (var i = 0; i < this.orderedDates.length; i++) {
                                        labels[i] = locale.format(new Date(this.orderedDates[i].value), {selector: "date", formatLength: "short"});
                                    }
                                } else {

                                    for (var i = 0; i < this.orderedDates.length; i++) {
                                        labels[i] = this.orderedDates[i].value;
                                    }
                                }

                                var labelsNode = domConstruct.create("div", {}, sliderNode, "second");
                                this.sliderLabels = new HorizontalRuleLabels({
                                    container: "bottomDecoration",
                                    labelStyle: "height:1em;font-size:75%;color:gray;",
                                    labels: [labels[0], labels[this.orderedDates.length - 1]]
                                }, labelsNode);

                                this.slider = new HorizontalSlider({
                                    name: "slider",
                                    value: 0,
                                    minimum: 0,
                                    maximum: this.featureLength - 1,
                                    discreteValues: this.featureLength,
                                    onChange: lang.hitch(this, this.sliderDropDownSelection, "slider")
                                }, sliderNode);

                                this.slider.startup();
                                this.sliderRules.startup();
                                this.sliderLabels.startup();
                                this.imageDisplayFormat2();
                                registry.byId("imageSelectorDropDown").removeOption(registry.byId("imageSelectorDropDown").getOptions());

                                for (var v = this.orderedDates.length - 1; v >= 0; v--) {
                                    registry.byId("imageSelectorDropDown").addOption({label: (this.imageFieldType === "esriFieldTypeDate" ? locale.format(new Date(this.orderedDates[v].value), {selector: "date", formatLength: "long"}) : this.orderedDates[v].value.toString()), value: "" + v + ""});
                                }


                                if (this.previousValue) {
                                    var index = null;
                                    for (var i in this.orderedDates) {
                                        if (this.orderedDates[i].value === this.previousValue.value && this.orderedDates[i].id === this.previousValue.id) {
                                            var index = i;
                                            break;
                                        } else if (this.orderedDates[i].value <= this.previousValue.value) {
                                            var index = i;
                                        }
                                    }
                                    if (index)
                                        this.setSliderValue(index);
                                    else
                                        this.selectDisplayedImage();
                                } else {
                                    this.selectDisplayedImage();
                                }
                            } else {
                                html.set(this.errorDiv, "No scenes in current extent.");
                                domStyle.set(this.selectorDiv, "display", "none");
                                html.set(this.imageRange, "");
                                html.set(this.imageCount, "");
                                this.hideLoading();
                            }
                        }));

                    }
                },
                selectDisplayedImage: function () {
                    var request = new esriRequest({
                        url: this.primaryLayer.url + "/getSamples",
                        content: {
                            geometry: JSON.stringify(this.map.extent.getCenter()),
                            geometryType: "esriGeometryPoint",
                            returnGeometry: false,
                            sampleCount: 1,
                            mosaicRule: this.layerInfos[this.primaryLayer.id].defaultMosaicRule ? JSON.stringify(this.layerInfos[this.primaryLayer.id].defaultMosaicRule.toJson()) : null,
                            outFields: this.imageField,
                            f: "json"
                        },
                        handleAs: "json",
                        callbackParamName: "callback"
                    });
                    request.then(lang.hitch(this, function (bestScene) {
                        var maxVisible = bestScene.samples[0].attributes[this.imageField];
                        var index = null;
                        for (var z in this.orderedDates) {
                            if (this.orderedDates[z].value === maxVisible) {
                                index = z;
                                break;
                            }
                        }

                        if (!index)
                            var index = this.orderedDates.length - 1;

                        this.setSliderValue(index);
                    }), lang.hitch(this, function () {


                        var imageTask = new ImageServiceIdentifyTask(this.primaryLayer.url);
                        var imageParams = new ImageServiceIdentifyParameters();
                        imageParams.geometry = this.map.extent.getCenter();

                        imageParams.mosaicRule = this.layerInfos[this.primaryLayer.id].defaultMosaicRule;
                        imageParams.returnGeometry = false;
                        imageTask.execute(imageParams, lang.hitch(this, function (data) {
                            var index;

                            if (data.catalogItems.features[0]) {
                                var maxVisible = data.catalogItems.features[0].attributes[this.imageField];
                                for (var z in this.orderedDates) {
                                    if (this.orderedDates[z].value === maxVisible) {
                                        index = z;
                                    }
                                }
                            }
                            if (!index)
                                var index = this.orderedDates.length - 1;

                            this.setSliderValue(index);
                        }), lang.hitch(this, function (error) {
                            this.setSliderValue(this.orderedDates.length - 1);
                        }));
                    }));
                },
                setSliderValue: function (index) {
                    this.imageDisplayFormat2();
                    registry.byId("imageSelectorDropDown").set("value", index);
                    this.slider.set("value", index);
                    if (this.imageFieldType === "esriFieldTypeDate")
                        html.set(this.imageRange, "Date(s): <b>" + locale.format(new Date(this.orderedDates[index].value), {selector: "date", formatLength: "long"}) + "</b>");
                    else
                        html.set(this.imageRange, this.imageField + ": <b>" + this.orderedDates[index].value + "</b>");
                    html.set(this.imageCount, "1");
                    this.hideLoading();
                },
                imageSliderHide: function () {
                    if (this.slider) {
                        this.sliderRules.destroy();
                        this.sliderLabels.destroy();
                        this.slider.destroy();
                    }
                    this.sliderRules = null;
                    this.sliderLabels = null;
                    this.slider = null;
                },
                sliderDropDownSelection: function (value) {
                    if (!domClass.contains(registry.byId("dropDownImageList").domNode, "dropDownSelected") && value === "slider") {
                        this.valueSelected = this.slider.get("value");
                        registry.byId("imageSelectorDropDown").set("value", this.valueSelected);
                        this.sliderChange();
                    } else if (domClass.contains(registry.byId("dropDownImageList").domNode, "dropDownSelected") && value === "dropDown") {
                        this.valueSelected = registry.byId("imageSelectorDropDown").get("value");
                        this.slider.set("value", this.valueSelected);
                        this.sliderChange();
                    }
                },
                sliderChange: function () {
                    if (registry.byId("imageSelector").get("checked")) {
                        var aqDate = this.orderedDates[this.valueSelected].value;
                        this.previousValue = this.orderedDates[this.valueSelected];
                        var featureSelect = [];
                        this.featureIds = [];
                        if (this.imageFieldType === "esriFieldTypeDate") {
                            domStyle.set("ageDiv", "display", "inline-block");
                            var compareDate = new Date(aqDate);
                            var compareValue = registry.byId("subtractValue").get("value");
                            if (compareValue !== 0) {
                                switch (registry.byId("subtractDateString").get("value")) {
                                    case "days" :
                                    {
                                        compareDate.setDate(compareDate.getDate() - compareValue);
                                        break;
                                    }
                                    case "weeks" :
                                    {
                                        compareDate.setDate(compareDate.getDate() - (compareValue * 7));
                                        break;
                                    }
                                    case "months" :
                                    {
                                        compareDate.setMonth(compareDate.getMonth() - compareValue);
                                        break;
                                    }
                                    case  "years" :
                                    {
                                        compareDate.setFullYear(compareDate.getFullYear() - compareValue);
                                        break;
                                    }
                                }
                                for (var i = this.orderedFeatures.length - 1; i >= 0; i--) {

                                    if ((locale.format(new Date(this.orderedFeatures[i].attributes[this.imageField]), {selector: "date", datePattern: "yyyy/MM/dd"}) <= locale.format(new Date(aqDate), {selector: "date", datePattern: "yyyy/MM/dd"})) && (locale.format(new Date(this.orderedFeatures[i].attributes[this.imageField]), {selector: "date", datePattern: "yyyy/MM/dd"}) >= locale.format(compareDate, {selector: "date", datePattern: "yyyy/MM/dd"}))) {
                                        featureSelect.push(this.orderedFeatures[i]);
                                        this.featureIds.push(this.orderedFeatures[i].attributes[this.objectID]);
                                    }
                                }

                                html.set(this.imageRange, "Date(s): <b>" + locale.format(compareDate, {selector: "date", formatLength: "long"}) + " - " + locale.format(new Date(aqDate), {selector: "date", formatLength: "long"}) + "</b>");
                            } else {

                                if (!this.config.listImagesSeparate) {
                                    for (var c in this.orderedFeatures) {
                                        var tempValue = locale.format(new Date(this.orderedDates[this.valueSelected].value), {selector: "date", formatLength: "short"});
                                        var tempCurrentValue = locale.format(new Date(this.orderedFeatures[c].attributes[this.imageField]), {selector: "date", formatLength: "short"});

                                        if (tempValue === tempCurrentValue) {
                                            featureSelect.push(this.orderedFeatures[c]);
                                            this.featureIds.push(this.orderedFeatures[c].attributes[this.objectID]);
                                        }
                                    }
                                } else {

                                    featureSelect.push(this.orderedFeatures[this.valueSelected]);

                                    this.featureIds.push(this.orderedFeatures[this.valueSelected].attributes[this.objectID]);
                                }
                                html.set(this.imageRange, "Date(s): <b>" + locale.format(new Date(aqDate), {selector: "date", formatLength: "long"}) + "</b>");

                            }
                        } else
                        {
                            domStyle.set("ageDiv", "display", "none");
                            if (!this.config.listImagesSeparate) {
                                for (var c in this.orderedFeatures) {
                                    if (this.orderedFeatures[c].attributes[this.imageField] === this.orderedDates[this.valueSelected].value) {
                                        featureSelect.push(this.orderedFeatures[c]);
                                        this.featureIds.push(this.orderedFeatures[c].attributes[this.objectID]);
                                    }
                                }
                            } else {

                                featureSelect.push(this.orderedFeatures[this.valueSelected]);
                                this.featureIds.push(this.orderedFeatures[this.valueSelected].attributes[this.objectID]);
                            }
                            html.set(this.imageRange, this.imageField + ": <b>" + aqDate + "</b>");
                        }
                        this.map.graphics.clear();
                        var count = 0;

                        if (this.primaryLayer.visible) {
                            for (var i = 0; i < featureSelect.length; i++) {
                                if (registry.byId("show").get("value") === "footprint") {
                                    var geometry = featureSelect[i].geometry;
                                    var sms = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([0, 255, 255]), 2), new Color([0, 255, 255, 0.15]));
                                    var attr = featureSelect[i].attributes;
                                    if (this.imageFieldType === "esriFieldTypeDate")
                                        attr[this.imageField] = locale.format(new Date(attr[this.imageField]), {selector: "date", formatLength: "long"});
                                    var infoTemplate = new InfoTemplate("Attributes", "${*}");
                                    var graphic = new Graphic(geometry, sms, attr, infoTemplate);
                                    this.map.graphics.add(graphic);
                                    if (count === 19) {
                                        if (!this.responseAlert) {
                                            this.responseAlert = confirm("Number of footprints selected exceed 20. Only first 20 will be displayed. Press OK not to warn again.");
                                        }
                                        count++;
                                        break;
                                    }
                                }
                                count++;
                            }
                        }

                        html.set(this.imageCount, "" + count + "");

                        if (registry.byId("show").get("value") === "image") {
                            var mr = new MosaicRule();
                            mr.method = MosaicRule.METHOD_LOCKRASTER;
                            mr.ascending = true;
                            mr.operation = "MT_FIRST";
                            mr.lockRasterIds = this.featureIds;
                            this.primaryLayer.setMosaicRule(mr);
                        } else {
                            if (this.mosaicBackup) {
                                var mr = new MosaicRule(this.mosaicBackup);
                            } else {
                                var mr = new MosaicRule(this.defaultMosaicRule);
                            }
                            this.primaryLayer.setMosaicRule(mr);
                        }
                    }
                },
                createSecondary: function () {
                    if (this.map.getLayer("secondaryLayer"))
                    {
                        this.map.getLayer("secondaryLayer").suspend();
                        this.map.removeLayer(this.map.getLayer("secondaryLayer"));
                    }
                    var params, mosaicRule, renderingRule, secondLayer, popupInfo;
                    var layer = this.primaryLayer;
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
                                visible: true,
                                infoTemplate: popupInfo
                            });
                    var title = (layer.arcgisProps && layer.arcgisProps.title) ? layer.arcgisProps.title : (layer.title || layer.name || layer.id);
                    if (this.imageFieldType !== "esriFieldTypeDate")
                        secondLayer.title = title + "_2";
                    else
                        secondLayer.title = title + "-" + locale.format(new Date(this.previousValue.value), {selector: "date", formatLength: "long"});

                    for (var a in this.map.layerIds) {
                        if (this.map.layerIds[a] === layer.id)
                        {
                            var position = a;
                            break;
                        }
                    }
                    this.map.addLayer(secondLayer, position);
                },
                imageSliderRefresh: function () {
                    if (this.slider) {
                        this.imageSliderHide();
                        this.imageSliderShow();
                    }
                },
                showLoading: function () {
                    domStyle.set("loadingImageSelector", "display", "block");
                },
                hideLoading: function () {
                    domStyle.set("loadingImageSelector", "display", "none");
                }
            });

            clazz.hasLocale = false;
            return clazz;
        });