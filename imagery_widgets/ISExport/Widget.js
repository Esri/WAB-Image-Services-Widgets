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
    'jimu/BaseWidget', "dojo/html",
    "dijit/registry",
    "dojo/_base/lang",
    "dojo/dom-style", "esri/geometry/webMercatorUtils",
    "esri/request",
    "dojo/i18n!esri/nls/jsapi",
    'dojo/dom-construct', "esri/arcgis/Portal", "esri/Color", "esri/toolbars/draw", "dojo/dom-attr", "esri/layers/RasterFunction", "dijit/form/SimpleTextarea", "dijit/form/TextBox", "dijit/form/CheckBox"
],
        function (
                declare,
                _WidgetsInTemplateMixin,
                template,
                BaseWidget, html,
                registry,
                lang, domStyle, webMercatorUtils, esriRequest, bundle, domConstruct, arcgisPortal, Color, Draw, domAttr, RasterFunction) {
            var clazz = declare([BaseWidget, _WidgetsInTemplateMixin], {
                templateString: template,
                name: 'ISExport',
                baseClass: 'jimu-widget-ISExport',
                startup: function () {
                    this.inherited(arguments);
                    domConstruct.place('<img id="loadingISExport" style="position: absolute;top:0;bottom: 0;left: 0;right: 0;margin:auto;z-index:100;" src="' + require.toUrl('jimu') + '/images/loading.gif">', this.domNode);
                    this.hideLoading();
                    this.setSavingType();
                },
                postCreate: function () {
                    registry.byId("saveAndExportOption").on("change", lang.hitch(this, function (value) {
                        if (value === "agol") {
                            domStyle.set("saveAgolContainer", "display", "block");
                            domStyle.set("exportSaveContainer", "display", "none");
                            this.toolbarForExport.deactivate();
                            for (var k in this.map.graphics.graphics)
                            {
                                if (this.map.graphics.graphics[k].geometry.type === "polygon") {
                                    if (this.map.graphics.graphics[k].symbol.color.r === 200)
                                    {
                                        this.map.graphics.remove(this.map.graphics.graphics[k]);
                                        break;
                                    }
                                }
                            }
                            this.geometry = null;
                        } else {
                            if (registry.byId("defineExtent").checked)
                                this.toolbarForExport.activate(Draw.POLYGON);
                            domStyle.set("saveAgolContainer", "display", "none");
                            domStyle.set("exportSaveContainer", "display", "block");
                        }
                    }));
                    registry.byId("submitAgolBtn").on("click", lang.hitch(this, function () {
                        if (registry.byId("itemTitle").get("value") && registry.byId("itemTags").get("value"))
                            this.saveLayerToArcGIS();
                        else if (!registry.byId("itemTitle").get("value"))
                            html.set(this.successNotification, "Title is required.");
                        else if (!registry.byId("itemTags").get("value"))
                            html.set(this.successNotification, "Tag(s) is required.");
                    }));
                    registry.byId("exportBtn").on("click", lang.hitch(this, this.exportLayer));
                    registry.byId("defineExtent").on("change", lang.hitch(this, this.activatePolygon));
                    if (this.map) {
                        this.map.on("update-start", lang.hitch(this, this.showLoading));
                        this.map.on("update-end", lang.hitch(this, this.hideLoading));
                    }
                    if (this.config.exportMode !== "agol")
                    {
                        this.toolbarForExport = new Draw(this.map);
                        dojo.connect(this.toolbarForExport, "onDrawComplete", lang.hitch(this, this.getExtent));
                    }

                },
                setSavingType: function () {
                    if (this.config.exportMode === "both") {
                        domStyle.set("selectExportDisplay", "display", "block");
                        if (registry.byId("saveAndExportOption").get("value") === "agol")
                            domStyle.set("saveAgolContainer", "display", "block");
                        else
                            domStyle.set("exportSaveContainer", "display", "block");
                    } else if (this.config.exportMode === "agol") {
                        domStyle.set("selectExportDisplay", "display", "none");
                        domStyle.set("saveAgolContainer", "display", "block");
                        domStyle.set("exportSaveContainer", "display", "none");
                    } else {
                        domStyle.set("selectExportDisplay", "display", "none");
                        domStyle.set("saveAgolContainer", "display", "none");
                        domStyle.set("exportSaveContainer", "display", "block");
                    }
                },
                onOpen: function () {
                    if (this.config.exportMode !== "agol") {
                        var info = {};
                        info.levelChange = true;
                        this.updateValues(info);
                        this.extentchangeHandler = this.map.on("extent-change", lang.hitch(this, this.updateValues));
                    }

                },
                saveLayerToArcGIS: function () {

                    domStyle.set("loadingISExport", "display", "block");
                    this.refreshData();
                    html.set(this.successNotification, "");
                    if (this.imageServiceLayer) {
                        var extent = this.map.geographicExtent.xmin + "," + this.map.geographicExtent.ymin + "," + this.map.geographicExtent.xmax + "," + this.map.geographicExtent.ymax;
                        var spatialReference = this.map.extent.spatialReference.wkid;
                        var mosaicRule = this.imageServiceLayer.mosaicRule ? this.imageServiceLayer.mosaicRule.toJson() : null;
                        var bandIds = this.imageServiceLayer.bandIds ? [this.imageServiceLayer.bandIds] : [];
                        var renderingRule = this.imageServiceLayer.renderingRule ? this.imageServiceLayer.renderingRule.toJson() : null;
                        var opacity = this.imageServiceLayer.opacity ? this.imageServiceLayer.opacity : 1;
                        var interpolation = this.imageServiceLayer.interpolation ? this.imageServiceLayer.interpolation : "RSP_NearestNeighbor";
                        var format = this.imageServiceLayer.format ? this.imageServiceLayer.format : "jpgpng";
                        var compressionQuality = this.imageServiceLayer.compressionQuality ? this.imageServiceLayer.compressionQuality : 100;
                        var itemData = {
                            "id": this.imageServiceLayer.id,
                            "visibility": true,
                            "bandIds": bandIds,
                            "opacity": opacity,
                            "title": registry.byId("itemTitle").get("value"),
                            "timeAnimation": false,
                            "renderingRule": renderingRule,
                            "mosaicRule": mosaicRule,
                            "interpolation": interpolation,
                            "format": format,
                            "compressionQuality": compressionQuality
                        };
                        if (this.appConfig && this.appConfig.portalUrl)
                            var portalUrl = this.appConfig.portalUrl.includes("arcgis.com") ? "http://www.arcgis.com" : this.appConfig.portalUrl;
                        else
                            var portalUrl = "http://www.arcgis.com";
                        var portal = new arcgisPortal.Portal(portalUrl);
                        bundle.identity.lblItem = "Account";
                        var tempText = (bundle.identity.info).split("access the item on");
                        bundle.identity.info = tempText[0] + tempText[1];

                        portal.signIn().then(lang.hitch(this, function (loggedInUser) {

                            var url = loggedInUser.userContentUrl;
                            var addItemRequest = esriRequest({
                                url: url + "/addItem",
                                content: {f: "json",
                                    title: registry.byId("itemTitle").get("value"),
                                    type: "Image Service",
                                    url: this.imageServiceLayer.url,
                                    description: registry.byId("itemDescription").get("value"),
                                    tags: registry.byId("itemTags").get("value"),
                                    extent: extent,
                                    spatialReference: spatialReference,
                                    text: JSON.stringify(itemData)
                                },
                                handleAs: "json",
                                callbackParamName: "callback"
                            }, {usePost: true});
                            addItemRequest.then(lang.hitch(this, function (result) {
                                html.set(this.successNotification, "<br />Layer saved.");
                                setTimeout(lang.hitch(this, function () {
                                    html.set(this.successNotification, "");
                                }), 4000);
                                domStyle.set("loadingISExport", "display", "none");

                            }), lang.hitch(this, function (error) {
                                html.set(this.successNotification, "Error! " + error);
                                domStyle.set("loadingISExport", "display", "none");
                            }));
                        }));
                    } else {
                        html.set(this.successNotification, "Error! No Imagery Layer visible on the map.");
                    }
                },
                updateValues: function (info) {
                    if (info.levelChange && !this.geometry) {
                        this.refreshData();
                        var widthMax = this.map.width;

                        var width = (this.map.extent.xmax - this.map.extent.xmin);
                        var height = (this.map.extent.ymax - this.map.extent.ymin);

                        var psx = width / widthMax;
                        var psy = height / widthMax;
                        var servicePixel = (this.imageServiceLayer && this.imageServiceLayer.pixelSizeX) ? this.imageServiceLayer.pixelSizeX : 0;
                        var ps = Math.max(psx, psy, servicePixel);
                        var ps = parseFloat(ps) + 0.001;
                        registry.byId("pixelSize").set("value", ps.toFixed(3));
                    }
                    this.previousSpatialReference = registry.byId("outputSp").get("value");
                    this.getUTMZones();
                },
                activatePolygon: function () {
                    if (registry.byId("defineExtent").checked) {
                        this.toolbarForExport.activate(Draw.POLYGON);

                    } else {
                        this.toolbarForExport.deactivate();
                        for (var k in this.map.graphics.graphics)
                        {
                            if (this.map.graphics.graphics[k].geometry.type === "polygon") {
                                if (this.map.graphics.graphics[k].symbol.color.r === 200)
                                {
                                    this.map.graphics.remove(this.map.graphics.graphics[k]);
                                    break;
                                }
                            }
                        }
                        this.geometry = null;
                    }
                },
                getExtent: function (geometry) {
                    var geometry = geometry.geometry;
                    for (var k in this.map.graphics.graphics)
                    {
                        if (this.map.graphics.graphics[k].geometry.type === "polygon") {
                            if (this.map.graphics.graphics[k].symbol.color.r === 200)
                            {
                                this.map.graphics.remove(this.map.graphics.graphics[k]);
                                break;
                            }
                        }
                    }
                    var symbol = new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new Color([200, 0, 0]), 2);
                    var graphic = new esri.Graphic(geometry, symbol);
                    this.map.graphics.add(graphic);
                    this.geometryClip = geometry;
                    this.geometry = geometry.getExtent();
                    var width = (this.geometry.xmax - this.geometry.xmin);
                    var height = (this.geometry.ymax - this.geometry.ymin);
                    var psx = width / this.map.width;
                    var psy = height / this.map.width;
                    var servicePixel = (this.imageServiceLayer && this.imageServiceLayer.pixelSizeX) ? this.imageServiceLayer.pixelSizeX : 0;
                    var ps = Math.max(psx, psy, servicePixel);
                    var ps = parseFloat(ps) + 0.001;
                    registry.byId("pixelSize").set("value", ps.toFixed(3));
                },
                getUTMZones: function () {
                    var mapCenter = this.map.extent.getCenter();
                    if (this.map.extent.spatialReference.wkid !== 102100 && this.map.extent.spatialReference.wkid !== 3857) {
                        var mapCenter = webMercatorUtils.project(mapCenter, new SpatailReference({wkid: 102100}));
                    }

                    var y = Math.pow(2.718281828, (mapCenter.y / 3189068.5));

                    var sinvalue = (y - 1) / (y + 1);
                    var y1 = Math.asin(sinvalue) / 0.017453292519943295;

                    var x = mapCenter.x / 6378137.0;
                    x = x / 0.017453292519943295;
                    var utm = parseInt((x + 180) / 6) + 1;
                    if (y1 > 0)
                        var wkid = 32600 + utm;
                    else
                        var wkid = 32500 + utm;
                    if (registry.byId("outputSp").getOptions())
                        registry.byId("outputSp").removeOption(registry.byId('outputSp').getOptions());
                    if (utm !== 1) {
                        registry.byId("outputSp").addOption({label: "WGS84 UTM Zone " + (utm - 1) + "", value: wkid - 1});
                    } else
                        registry.byId("outputSp").addOption({label: "WGS84 UTM Zone " + (utm + 59) + "", value: wkid + 59});
                    registry.byId("outputSp").addOption({label: "WGS84 UTM Zone " + utm + "", value: wkid});
                    if (utm !== 60)
                        registry.byId("outputSp").addOption({label: "WGS84 UTM Zone " + (utm + 1) + "", value: wkid + 1});
                    else
                        registry.byId("outputSp").addOption({label: "WGS84 UTM Zone " + utm - 59 + "", value: wkid - 59});

                    registry.byId("outputSp").addOption({label: "WebMercatorAS", value: 102100});
                    var srsList = registry.byId("outputSp").getOptions();
                    var temp;
                    for (var a in srsList) {
                        if (this.previousSpatialReference === srsList[a].value)
                        {
                            temp = this.previousSpatialReference;
                            break;
                        } else
                            temp = wkid;
                    }
                    registry.byId("outputSp").set("value", temp);
                },
                exportLayer: function () {
                    this.refreshData();
                    if (this.imageServiceLayer) {
                        if (registry.byId("defineExtent").checked)
                        {
                            var bbox = (this.geometry.xmin + ", " + this.geometry.ymin + ", " + this.geometry.xmax + ", " + this.geometry.ymax).toString();
                            var width = (this.geometry.xmax - this.geometry.xmin);
                            var height = (this.geometry.ymax - this.geometry.ymin);


                        } else
                        {
                            var bbox = (this.map.extent.xmin + ", " + this.map.extent.ymin + ", " + this.map.extent.xmax + ", " + this.map.extent.ymax).toString();
                            var width = (this.map.extent.xmax - this.map.extent.xmin);
                            var height = (this.map.extent.ymax - this.map.extent.ymin);
                        }

                        var pixelsize = parseFloat(registry.byId("pixelSize").get("value"));

                        var widthMax = this.map.width;
                        var heightMax = this.map.height;

                        var psx = width / widthMax;
                        var psy = height / widthMax;

                        if (pixelsize === "")
                            pixelsize = psx;
                        var ps = Math.max(psx, psy, pixelsize);

                        if ((width / pixelsize) > widthMax || (height / pixelsize) > widthMax) {
                            var size = "";
                            document.getElementById("errorPixelSize").innerHTML = "PixelSize of export is restricted to " + ps.toFixed(3) + " for this extent.";
                            domStyle.set("loadingISExport", "display", "none");
                        } else {
                            var size = (parseInt(width / ps)).toString() + ", " + (parseInt(height / ps)).toString();
                            document.getElementById("errorPixelSize").innerHTML = "";

                            if (this.imageServiceLayer.renderingRule) {
                                var raster = registry.byId("renderer").checked ? this.imageServiceLayer.renderingRule : new RasterFunction({"rasterFunction": "None"});
                                var renderingRule = raster;
                            } else
                                var renderingRule = null;
                            if (registry.byId("defineExtent").checked) {

                                var rasterClip = new RasterFunction();
                                rasterClip.functionName = "Clip";
                                var clipArguments = {};
                                clipArguments.ClippingGeometry = this.geometryClip;
                                clipArguments.ClippingType = 1;
                                if (raster)
                                    clipArguments.Raster = raster;
                                rasterClip.functionArguments = clipArguments;

                                var renderingRule = JSON.stringify(rasterClip.toJson());
                            } else {
                                var renderingRule = renderingRule ? JSON.stringify(renderingRule.toJson()) : null;
                            }

                            var format = "tiff";
                            var compression = "LZ77";
                            var mosaicRule = this.imageServiceLayer.mosaicRule ? JSON.stringify(this.imageServiceLayer.mosaicRule.toJson()) : null;
                            var band = this.imageServiceLayer.bandIds ? (this.imageServiceLayer.bandIds).toString() : "";
                            var noData = "";

                            var layersRequest = esriRequest({
                                url: this.imageServiceLayer.url + "/exportImage",
                                content: {
                                    f: "json",
                                    bbox: bbox,
                                    size: size,
                                    compression: compression,
                                    format: format,
                                    interpolation: this.imageServiceLayer.interpolation ? this.imageServiceLayer.interpolation : "RSP_NearestNeighbor",
                                    renderingRule: renderingRule,
                                    mosaicRule: mosaicRule,
                                    bandIds: band,
                                    imageSR: registry.byId("outputSp").get("value"),
                                    noData: noData
                                },
                                handleAs: "json",
                                callbackParamName: "callback"
                            });

                            layersRequest.then(lang.hitch(this, function (data) {

                                domAttr.set("linkDownload", "href", data.href);

                                domAttr.set("linkDownload", "target", "_self");
                                (document.getElementById("linkDownload")).click();
                                domStyle.set("loadingISExport", "display", "none");

                            }), lang.hitch(this, function (error) {
                                domStyle.set("loadingISExport", "display", "none");
                            }));
                        }
                    } else {
                        document.getElementById("errorPixelSize").innerHTML = "Error! No Imagery Layer visible on the map.";
                    }
                },
                refreshData: function () {
                    if (this.map.layerIds) {
                        this.imageServiceLayer = null;
                        if ((this.map.resultLayer && this.map.getLayer(this.map.resultLayer).visible) || (this.map.getLayer("resultLayer") && this.map.getLayer("resultLayer").visible)) {
                            this.imageServiceLayer = this.map.resultLayer ? this.map.getLayer(this.map.resultLayer) : this.map.getLayer("resultLayer");
                        } else if (this.map.primaryLayer && this.map.getLayer(this.map.primaryLayer).visible) {
                            this.imageServiceLayer = this.map.getLayer(this.map.primaryLayer);
                        } else if (this.map.secondaryLayer && this.map.getLayer(this.map.secondaryLayer).visible) {
                            this.imageServiceLayer = this.map.getLayer(this.map.secondaryLayer);
                        } else {
                            for (var a = this.map.layerIds.length - 1; a >= 0; a--) {
                                var layerObject = this.map.getLayer(this.map.layerIds[a]);
                                if (layerObject && layerObject.serviceDataType && layerObject.serviceDataType.substr(0, 16) === "esriImageService" && layerObject.visible) {
                                    this.imageServiceLayer = layerObject;
                                    break;
                                }
                            }

                        }
                    }
                    if (this.imageServiceLayer) {
                        html.set(this.exportLayerTitle, "Layer: <b>" + (this.imageServiceLayer.arcgisProps ? this.imageServiceLayer.arcgisProps.title : (this.imageServiceLayer.title || this.imageServiceLayer.name || this.imageServiceLayer.id)) + "</b>");
                        this.setSavingType();

                    } else {
                        html.set(this.exportLayerTitle, "No visible imagery layers on the map.");
                        domStyle.set("exportSaveContainer", "display", "none");
                        domStyle.set("saveAgolContainer", "display", "none");
                        domStyle.set("selectExportDisplay", "display", "none");
                    }
                },
                showLoading: function () {
                    domStyle.set("loadingISExport", "display", "block");
                },
                hideLoading: function () {
                    domStyle.set("loadingISExport", "display", "none");
                }
            });

            clazz.hasLocale = false;
            return clazz;
        });