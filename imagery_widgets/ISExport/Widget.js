///////////////////////////////////////////////////////////////////////////
// Copyright 2018 Esri. All Rights Reserved.
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
    "dojo/dom-style", "esri/geometry/webMercatorUtils", "esri/SpatialReference", "esri/tasks/GeometryService", "esri/tasks/ProjectParameters", "dojo/Deferred", "esri/geometry/Extent", "esri/geometry/Polygon",
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
                lang, domStyle, webMercatorUtils, SpatialReference, GeometryService, ProjectParameters, Deferred, Extent, Polygon, esriRequest, bundle, domConstruct, arcgisPortal, Color, Draw, domAttr, RasterFunction) {
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
                            registry.byId("defineExtent").set("checked", false);

                            if (registry.byId("defineAgolExtent").checked) {
                                this.toolbarForExport.activate(Draw.POLYGON);
                                this.map.setInfoWindowOnClick(false);
                            }
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

                            registry.byId("defineAgolExtent").set("checked", false);
                            if (registry.byId("defineExtent").checked) {
                                this.toolbarForExport.activate(Draw.POLYGON);
                                this.map.setInfoWindowOnClick(false);
                            }
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
                    registry.byId("defineAgolExtent").on("change", lang.hitch(this, this.activatePolygon));
                    if (this.map) {
                        this.map.on("update-start", lang.hitch(this, this.showLoading));
                        this.map.on("update-end", lang.hitch(this, this.hideLoading));
                    }
                    if (this.config.exportMode !== "agol")
                    {
                        this.toolbarForExport = new Draw(this.map);
                        dojo.connect(this.toolbarForExport, "onDrawComplete", lang.hitch(this, this.getExtent));
                    }
                    this.geometryService = new GeometryService("https://utility.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer");
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
                        if (!this.extentchangeHandler)
                            this.extentchangeHandler = this.map.on("extent-change", lang.hitch(this, this.updateValues));
                    }

                },
                onClose: function () {
                    if (this.extentchangeHandler) {
                        this.extentchangeHandler.remove();
                        this.extentchangeHandler = null;
                    }
                    registry.byId("defineExtent").set("checked", false);
                    registry.byId("defineAgolExtent").set("checked", false);
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
                        if (this.imageServiceLayer.id === "resultLayer") {
                            if (this.imageServiceLayer.changeMode === "mask" || this.imageServiceLayer.changeMode === "threshold") {
                                var renderer = this.modifyRenderingRule(this.imageServiceLayer.changeMode, this.imageServiceLayer.renderingRule);
                            } else if (this.imageServiceLayer.maskMethod) {
                                var renderer = this.modifyRenderer(this.imageServiceLayer.maskMethod, this.imageServiceLayer.renderingRule);
                            } else
                                var renderer = this.imageServiceLayer.renderingRule;
                        } else
                            var renderer = this.imageServiceLayer.renderingRule;
                        if (registry.byId("defineAgolExtent").checked) {

                            var rasterClip = new RasterFunction();
                            rasterClip.functionName = "Clip";
                            var clipArguments = {};
                            clipArguments.ClippingGeometry = this.geometryClip;
                            clipArguments.ClippingType = 1;
                            if (this.imageServiceLayer.renderingRule)
                                clipArguments.Raster = renderer;
                            else
                                clipArguments.Raster = "$$";
                            rasterClip.functionArguments = clipArguments;

                            var renderingRule = rasterClip.toJson();
                        } else {
                            var renderingRule = renderer ? renderer.toJson() : null;
                        }

                        var opacity = this.imageServiceLayer.opacity ? this.imageServiceLayer.opacity : 1;
                        var interpolation = this.imageServiceLayer.interpolation ? this.imageServiceLayer.interpolation : "RSP_NearestNeighbor";
                        var format = this.imageServiceLayer.format && this.imageServiceLayer.id !== "resultLayer" ? this.imageServiceLayer.format : "jpgpng";
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
                                html.set(this.successNotification, "<br />" + this.nls.layerSaved);
                                setTimeout(lang.hitch(this, function () {
                                    html.set(this.successNotification, "");
                                }), 4000);
                                domStyle.set("loadingISExport", "display", "none");

                            }), lang.hitch(this, function (error) {
                                html.set(this.successNotification, this.nls.error + error);
                                domStyle.set("loadingISExport", "display", "none");
                            }));
                        }));
                    } else {
                        html.set(this.successNotification, this.nls.errorNotification);
                    }
                },
                updateValues: function (info) {
                    this.getMapPointInWebMercator(this.map.extent, "extent").then(lang.hitch(this, function (extent) {

                        if (extent !== "error") {
                            this.mapExtent = extent;
                            if (info.levelChange && !this.geometry) {
                                this.refreshData();
                                var widthMax = this.map.width;

                                var width = (extent.xmax - extent.xmin);
                                var height = (extent.ymax - extent.ymin);

                                var psx = width / widthMax;
                                var psy = height / widthMax;
                                var servicePixel = (this.imageServiceLayer && this.imageServiceLayer.pixelSizeX) ? this.imageServiceLayer.pixelSizeX : 0;
                                var ps = Math.max(psx, psy, servicePixel);
                                var ps = parseFloat(ps) + 0.001;
                                registry.byId("pixelSize").set("value", ps.toFixed(3));
                            }
                        }
                        this.previousSpatialReference = registry.byId("outputSp").get("value");
                        this.getUTMZones(extent);

                    }));
                },
                activatePolygon: function () {
                    if (registry.byId("defineExtent").checked || registry.byId("defineAgolExtent").checked) {
                        this.toolbarForExport.activate(Draw.POLYGON);
                        this.map.setInfoWindowOnClick(false);
                    } else {
                        this.toolbarForExport.deactivate();
                        this.map.setInfoWindowOnClick(true);
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
                    this.getMapPointInWebMercator(geometry, "polygon").then(lang.hitch(this, function (geometry) {
                        if (geometry !== "error") {
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
                        }
                    }));
                },
                getUTMZones: function (extent) {
                    if (registry.byId("outputSp").getOptions())
                        registry.byId("outputSp").removeOption(registry.byId('outputSp').getOptions());

                    if (extent !== "error") {
                        var mapCenter = extent.getCenter();
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

                        if (utm !== 1) {
                            registry.byId("outputSp").addOption({label: this.nls.utmZone + (utm - 1) + "", value: wkid - 1});
                        } else
                            registry.byId("outputSp").addOption({label: this.nls.utmZone + (utm + 59) + "", value: wkid + 59});
                        registry.byId("outputSp").addOption({label: this.nls.utmZone + utm + "", value: wkid});
                        if (utm !== 60)
                            registry.byId("outputSp").addOption({label: this.nls.utmZone + (utm + 1) + "", value: wkid + 1});
                        else
                            registry.byId("outputSp").addOption({label: this.nls.utmZone + (utm - 59) + "", value: wkid - 59});

                    } else {
                        var wkid = this.map.extent.spatialReference.wkid;
                        registry.byId("outputSp").addOption({label: this.nls.WKID + wkid, value: wkid});
                   
                    registry.byId("outputSp").addOption({label: this.nls.webMercatorAs, value: 102100});
                    if (this.imageServiceLayer.hasOwnProperty("spatialReference") && this.imageServiceLayer.spatialReference.wkid !== 102100)
                        registry.byId("outputSp").addOption({label: this.nls.default, value: this.imageServiceLayer.spatialReference.wkid});
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

                }
				},
                getMapPointInWebMercator: function (geometry, type) {
                    var dfd = new Deferred();
                    if (this.map.extent.spatialReference.wkid !== 102100 && this.map.extent.spatialReference.wkid !== 3857) {
                        if (webMercatorUtils.canProject(this.map.extent.spatialReference.wkid, new SpatialReference(102100))) {
                            geometry = webMercatorUtils.project(geometry, new SpatialReference({wkid: 102100}));
                        } else {
                            var params = new ProjectParameters();
                            params.geometries = [geometry];
                            params.outSR = new SpatialReference(102100);
                            this.geometryService.project(params, lang.hitch(this, function (response) {

                                if (response && response.length > 0) {
                                    response[0].spatialReference = {"wkid": 102100};
                                    response[0] = type === "extent" ? new Extent(response[0]) : new Polygon(response[0]);
                                    return dfd.resolve(response[0]);
                                } else
                                    return dfd.resolve("error");
                            }), lang.hitch(this, function () {
                                return dfd.resolve("error");
                            }));
                        }
                    } else
                        return dfd.resolve(geometry);
                    return dfd.promise;
                },
                exportLayer: function () {
                    this.refreshData();
                    if (this.imageServiceLayer) {
                        if (registry.byId("defineExtent").checked)
                        {
                            var bbox = (this.geometry.xmin + ", " + this.geometry.ymin + ", " + this.geometry.xmax + ", " + this.geometry.ymax).toString();
                            var width = (this.geometry.xmax - this.geometry.xmin);
                            var height = (this.geometry.ymax - this.geometry.ymin);
                            var bboxSR = this.geometry.spatialReference;

                        } else
                        {
                            var bbox = (this.mapExtent.xmin + ", " + this.mapExtent.ymin + ", " + this.mapExtent.xmax + ", " + this.mapExtent.ymax).toString();
                            var width = (this.mapExtent.xmax - this.mapExtent.xmin);
                            var height = (this.mapExtent.ymax - this.mapExtent.ymin);
                            var bboxSR = this.mapExtent.spatialReference;
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
                            document.getElementById("errorPixelSize").innerHTML = this.nls.pixelSizeRestricted + ps.toFixed(3) + this.nls.thisExtent;
                            domStyle.set("loadingISExport", "display", "none");
                        } else {
                            var size = (parseInt(width / ps)).toString() + ", " + (parseInt(height / ps)).toString();
                            document.getElementById("errorPixelSize").innerHTML = "";

                            if (this.imageServiceLayer.renderingRule) {

                                if (this.imageServiceLayer.id === "resultLayer") {
                                    if (this.imageServiceLayer.changeMode === "mask" || this.imageServiceLayer.changeMode === "threshold")
                                        var renderer = this.modifyRenderingRule(this.imageServiceLayer.changeMode, this.imageServiceLayer.renderingRule);
                                    else if (this.imageServiceLayer.maskMethod) {
                                        var renderer = this.modifyRenderer(this.imageServiceLayer.maskMethod, this.imageServiceLayer.renderingRule);
                                    } else
                                        var renderer = this.imageServiceLayer.renderingRule;
                                } else
                                    var renderer = this.imageServiceLayer.renderingRule;

                                var raster = registry.byId("renderer").checked ? renderer : new RasterFunction({"rasterFunction": "None"});
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
                                    bboxSR: JSON.stringify(bboxSR),
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

                                domAttr.set("linkDownload", "target", "_blank");
                                (document.getElementById("linkDownload")).click();
                                domStyle.set("loadingISExport", "display", "none");

                            }), lang.hitch(this, function (error) {
                                domStyle.set("loadingISExport", "display", "none");
                            }));
                        }
                    } else {
                        document.getElementById("errorPixelSize").innerHTML = this.nls.errorPixelSize;
                    }
                },
                modifyRenderingRule: function (mode, renderer) {
                    if (mode === "mask") {
                        var positiveRange = registry.byId("positiveRange").get("value");
                        var negativeRange = registry.byId("negativeRange").get("value");

                        var remap = new RasterFunction();
                        remap.functionName = "Remap";
                        var remapArg = {};
                        remapArg.InputRanges = [-5, negativeRange, positiveRange, 5];
                        remapArg.OutputValues = [0, 1];
                        remapArg.AllowUnmatched = false;
                        remapArg.Raster = renderer;
                        remap.outputPixelType = "U8";
                        remap.functionArguments = remapArg;
                        var raster3 = remap;
                    } else {
                        if (renderer.rasterFunction)
                            var rendererTemp = renderer.rasterFunction;
                        else
                            var rendererTemp = renderer.functionName;

                        if (rendererTemp === "CompositeBand") {
                            var raster1 = renderer.functionArguments.Rasters[0];
                            var raster2 = renderer.functionArguments.Rasters[1];
                        } else
                        {
                            var raster1 = renderer.functionArguments.Raster.functionArguments.Rasters[0];
                            var raster2 = renderer.functionArguments.Raster.functionArguments.Rasters[1];
                        }
                        var thresholdValue = registry.byId("thresholdValue").get("value");
                        var differenceValue = registry.byId("differenceValue").get("value");
                        var remapRaster1 = new RasterFunction();
                        remapRaster1.functionName = "Remap";
                        var remapRaster1Arg = {};
                        remapRaster1Arg.InputRanges = [-1, thresholdValue, thresholdValue, 1];
                        remapRaster1Arg.OutputValues = [0, 1];
                        remapRaster1Arg.AllowUnmatched = false;
                        remapRaster1Arg.Raster = raster1;
                        remapRaster1.functionArguments = remapRaster1Arg;
                        remapRaster1.outputPixelType = "U8";

                        var remapRaster2 = new RasterFunction();
                        remapRaster2.functionName = "Remap";
                        var remapRaster2Arg = {};
                        remapRaster2Arg.InputRanges = [-1, thresholdValue, thresholdValue, 1];
                        remapRaster2Arg.OutputValues = [0, 1];
                        remapRaster2Arg.AllowUnmatched = false;
                        remapRaster2Arg.Raster = raster2;
                        remapRaster2.functionArguments = remapRaster2Arg;
                        remapRaster2.outputPixelType = "U8";

                        var arithmetic = new RasterFunction();
                        arithmetic.functionName = "Arithmetic";
                        var arithmeticArg = {};
                        arithmeticArg.Operation = 2;
                        arithmeticArg.ExtentType = 1;
                        arithmeticArg.CellsizeType = 0;
                        arithmeticArg.Raster = remapRaster1;
                        arithmeticArg.Raster2 = remapRaster2;
                        arithmetic.functionArguments = arithmeticArg;
                        arithmetic.outputPixelType = "F32";

                        var remapArithmetic = new RasterFunction();
                        remapArithmetic.functionName = "Remap";
                        var remapArithmeticArg = {};
                        remapArithmeticArg.InputRanges = [-1.1, -0.01];
                        remapArithmeticArg.OutputValues = [1];
                        remapArithmeticArg.NoDataRanges = [0, 0];
                        remapArithmeticArg.AllowUnmatched = true;
                        remapArithmeticArg.Raster = arithmetic;
                        remapArithmetic.functionArguments = remapArithmeticArg;
                        remapArithmetic.outputPixelType = "F32";
                        var arithmetic2 = new RasterFunction();
                        arithmetic2.functionName = "Arithmetic";
                        arithmetic2.outputPixelType = "F32";
                        var arithmeticArg2 = {};
                        arithmeticArg2.Raster = raster1;
                        arithmeticArg2.Raster2 = raster2;
                        arithmeticArg2.Operation = 2;
                        arithmeticArg2.ExtentType = 1;
                        arithmeticArg2.CellsizeType = 0;
                        arithmetic2.functionArguments = arithmeticArg2;


                        var remapDifference = new RasterFunction();
                        remapDifference.functionName = "Remap";
                        remapDifference.outputPixelType = "F32";
                        var remapDifferenceArg = {};
                        remapDifferenceArg.NoDataRanges = [(-1 * differenceValue), differenceValue];
                        remapDifferenceArg.AllowUnmatched = true;
                        remapDifferenceArg.Raster = arithmetic2;
                        remapDifference.functionArguments = remapDifferenceArg;

                        var arithmetic3 = new RasterFunction();
                        arithmetic3.functionName = "Arithmetic";
                        arithmetic3.outputPixelType = "F32";
                        var arithmeticArg3 = {};
                        arithmeticArg3.Raster = remapArithmetic;
                        arithmeticArg3.Raster2 = remapDifference;
                        arithmeticArg3.Operation = 3;
                        arithmeticArg3.ExtentType = 1;
                        arithmeticArg3.CellsizeType = 0;
                        arithmetic3.functionArguments = arithmeticArg3;

                        var remapArithmetic3 = new RasterFunction();
                        remapArithmetic3.functionName = "Remap";
                        remapArithmetic3.outputPixelType = "U8";
                        var remapArithmeticArg3 = {};
                        remapArithmeticArg3.InputRanges = [-5, 0, 0, 5];
                        remapArithmeticArg3.OutputValues = [0, 1];
                        remapArithmeticArg3.AllowUnmatched = false;
                        remapArithmeticArg3.Raster = arithmetic3;
                        remapArithmetic3.functionArguments = remapArithmeticArg3;


                        if (rendererTemp === "Clip") {
                            var tempRenderer = lang.clone(renderer);
                            tempRenderer.functionArguments.Raster = remapArithmetic3;
                            var raster3 = tempRenderer;
                        } else
                            var raster3 = remapArithmetic3;
                    }
                    var colormap = new RasterFunction();
                    colormap.functionName = "Colormap";
                    var colormapArg = {};
                    colormapArg.Colormap = this.imageServiceLayer.changeMethod === "burn" ? [[0, 255, 69, 0], [1, 0, 252, 0]] : [[0, 255, 0, 255], [1, 0, 252, 0]];
                    colormapArg.Raster = raster3;
                    colormap.outputPixelType = "U8";
                    colormap.functionArguments = colormapArg;

                    return colormap;
                },
                modifyRenderer: function (maskProperties, renderer) {
                    var remap = new RasterFunction();
                    remap.functionName = "Remap";
                    var argsRemap = {};
                    argsRemap.Raster = renderer;
                    if (maskProperties.method === "less") {
                        argsRemap.InputRanges = [maskProperties.range[0], maskProperties.value];
                        argsRemap.NoDataRanges = [maskProperties.value, maskProperties.range[1]];
                    } else {
                        argsRemap.InputRanges = [maskProperties.value, maskProperties.range[1]];
                        argsRemap.NoDataRanges = [maskProperties.range[0], maskProperties.value];
                    }
                    argsRemap.OutputValues = [1];
                    remap.functionArguments = argsRemap;
                    remap.outputPixelType = 'U8';

                    var color = maskProperties.color;
                    var colorMask = [[1, parseInt(color[0]), parseInt(color[1]), parseInt(color[2])]];

                    var colormap = new RasterFunction();
                    colormap.functionName = "Colormap";
                    colormap.outputPixelType = "U8";
                    var argsColor = {};
                    argsColor.Colormap = colorMask;
                    argsColor.Raster = remap;
                    colormap.functionArguments = argsColor;

                    return colormap;
                },
                refreshData: function () {
                    if (this.map.layerIds) {
                        this.imageServiceLayer = null;
                        if ((this.map.resultLayer && this.map.getLayer(this.map.resultLayer).visible) || (this.map.getLayer("resultLayer") && this.map.getLayer("resultLayer").visible)) {
                            this.imageServiceLayer = this.map.resultLayer ? this.map.getLayer(this.map.resultLayer) : this.map.getLayer("resultLayer");
                        } else if (this.map.primaryLayer && this.map.getLayer(this.map.primaryLayer).visible) {
                            var layer = this.map.getLayer(this.map.primaryLayer);
                            if(!layer.tileMode && !layer.virtualTileInfo)
                            this.imageServiceLayer = layer;
                        } else if (this.map.secondaryLayer && this.map.getLayer(this.map.secondaryLayer).visible) {
                            var layer = this.map.getLayer(this.map.secondaryLayer);;
                            if(!layer.tileMode && !layer.virtualTileInfo)
                            this.imageServiceLayer = layer;
                        } else {
                            for (var a = this.map.layerIds.length - 1; a >= 0; a--) {
                                var layerObject = this.map.getLayer(this.map.layerIds[a]);
                                if (layerObject && layerObject.serviceDataType && layerObject.serviceDataType.substr(0, 16) === "esriImageService" && layerObject.visible && (!layerObject.tileMode && !layerObject.virtualTileInfo)) {
                                    this.imageServiceLayer = layerObject;
                                    break;
                                }
                            }

                        }
                    }

                    if (this.imageServiceLayer) {
                        html.set(this.exportLayerTitle, this.nls.layer + ": <b>" + (this.imageServiceLayer.arcgisProps ? this.imageServiceLayer.arcgisProps.title : (this.imageServiceLayer.title || this.imageServiceLayer.name || this.imageServiceLayer.id)) + "</b>");
                        this.setSavingType();

                    } else {
                        html.set(this.exportLayerTitle, this.nls.exportLayerMsg);
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