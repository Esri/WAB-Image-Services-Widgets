///////////////////////////////////////////////////////////////////////////
// Copyright (c) 2016 Esri. All Rights Reserved.
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
    "dojo/_base/declare",
    'jimu/BaseWidget',
    'esri/layers/ImageServiceParameters',
    'esri/layers/RasterLayer',
    "dojo/_base/lang",
    "dojo/_base/Color",
    'dojo/dom',
    'dojo/dom-style',
    'dojo/dom-class',
    'dojo/dom-construct',
    "dijit/_WidgetsInTemplateMixin",
    "dojo/text!./Widget.html",
    "dojo/on",
    "dojo/html",
    'esri/request',
    'dijit/registry', "esri/layers/RasterFunction",
    './Palette',
    'dijit/Tooltip',
    'esri/symbols/SimpleLineSymbol',
    'esri/graphic',
    'esri/toolbars/draw',
    'esri/geometry/Polygon',
    'dijit/form/DropDownButton',
    'dijit/form/Button',
    'dijit/form/CheckBox',
    'dijit/TooltipDialog',
    'dijit/ColorPalette',
    "dojo/domReady!"
], function (declare,
        BaseWidget,
        ImageServiceParameters,
        RasterLayer,
        lang,
        Color,
        dom,
        domStyle,
        domClass,
        domConstruct,
        _WidgetsInTemplateMixin,
        template, on, html, esriRequest, registry, RasterFunction, Palette, Tooltip, SimpleLineSymbol, Graphic, Draw, Polygon) {

    return declare([BaseWidget, _WidgetsInTemplateMixin], {
        templateString: template,
        name: 'ISScatterplot',
        baseClass: 'jimu-widget-ISScatterplot',
        //public 
        myColor: {
            colors: {
                background: new Color([0, 0, 0, 0]), //cannot be white
                text: new Color([0, 0, 0, 1]),
                disabled: new Color([205, 205, 205, 1]), //cannot be white
                draw: new Color([0, 245, 245]) //cannot be white
            },
            freqRamp: {
                //colors should not overlap with ramp, otherwise behavior may not be correct
                start: new Color([140, 200, 240, 1]),
                end: new Color([240, 10, 10, 1]),
                breaks: 200,
                cover: function (r, g, b) {
                    //checks if color rgb is in freqRamp range
                    for (var i = 0; i <= this.breaks; i++) {
                        if (this.between(r, this.start.r, this.end.r, i) && this.between(g, this.start.g, this.end.g, i) && this.between(b, this.start.b, this.end.b, i))
                            return true;
                    }
                    return false;
                },
                between: function (x, a, b, i) {
                    //checks if value lies in specified range
                    if (x === Math.round(a + (b - a) * (i / this.breaks)))
                        return true;
                    return false;
                },
                colorAt: function (idx) {
                    //ensure idx is b/w breaks and 0
                    idx = idx > this.breaks ? this.breaks : idx;
                    idx = idx < 0 ? 0 : idx;
                    var r = Math.round(this.start.r + (this.end.r - this.start.r) * (idx / this.breaks));
                    var g = Math.round(this.start.g + (this.end.g - this.start.g) * (idx / this.breaks));
                    var b = Math.round(this.start.b + (this.end.b - this.start.b) * (idx / this.breaks));
                    var a = this.start.a + (this.end.a - this.start.a) * (idx / this.breaks);
                    return new Color([r, g, b, a]);
                }
            }
        },
        rasterLayer: null,
        layer: null,
        bandNames: [],
        getContext: false, refreshPlot: false,
        createLayerFlag: null, mapClickEnabled: true,
        mask: false,
        _plotCan: null, _plotCtx: null, _plotData: null,
        _marg: 20, //margin of plot canvas
        _bandX: 1, _bandY: 2, //band index of x, y 
        prevLayer: null,
        xMinLabel: "", xMaxLabel: "",
        yMinLabel: "", yMaxLabel: "",
        /*
         * Functions:
         * 
         * isCanvasSupported - checks if browser supports HTML5 cnavas
         * 
         * cover - checks if rgb value is not equal to 
         * rgb value of background or disabled color
         * 
         * pixValToXY - converts pixel values to x and y coordinates
         * 
         * computeHistograms - computes min max for the AOI
         * 
         * initialiseHandlers - defines map event handlers and
         * band change handlers
         * 
         * postCreate - gets config data. creates loading icons.
         * sets initial vals
         * 
         * startup - creates marker, tooltip and palette
         * 
         * onOpen - displays plot
         * 
         * _populateDropDown - populates X and Y drop downs
         *  with band names and sets value
         * 
         * createRasterLayer - applies RFT and creates raster layer
         * 
         * pixelFilter - pixel filter function for raster layer.
         * gets pixel block data
         * 
         * getCanvasCtx - gets plot canvas context.
         * defines mouse events for plot canvas.
         * 
         * refresh - calculates and draws plot based on extent
         * 
         * _restore - restores the plot data to reset the plot
         * 
         * _drawAxis - draws x and y axis on canvas
         * 
         * _drawLegend - draws freq legend on canvas
         * 
         * onClose - removes handlers and resultLayer.
         * clears plot
         * 
         * _redraw - draws curve connecting the points as the user draws
         * 
         * _closeCurve - fills and closes shape drawn by user
         * 
         * _deselectPix - recolors plot points outside
         * the shape drawn to disabled color
         * 
         * _recolorPix - recolors plot points inside the shape drawn from
         * intermediate fill color to plot data color
         * 
         * _filterImage - applies mask and draw color to the raster layer
         * 
         * _onMapClick - places marker on the plot for a point on map
         * 
         * _changeDrawColor - changes the draw color when user selects palette color
         * 
         */

        isCanvasSupported: function () {
            //checks for HTML5 canvas support

            var elem = document.createElement('canvas');
            return !!(elem.getContext && elem.getContext('2d'));
        },
        cover: function (r, g, b) {
            //returns true if rgb is not 
            //disabled or background rbg.

            if (r === this.myColor.colors.disabled.r && g === this.myColor.colors.disabled.g && b === this.myColor.colors.disabled.b)
                return false;
            else if (r === this.myColor.colors.background.r && g === this.myColor.colors.background.g && b === this.myColor.colors.background.b)
                return false;
            return true;
        },
        pixValToXY: function (pixvalx, pixvaly, w, h) {
            //converts pixel to appropriate x and y value

            //0 based xy system in plot canvas
            var x = Math.round((pixvalx - 0) / (255 - 0) * (w - 1));
            var y = h - 1 - Math.round((pixvaly - 0) / (255 - 0) * (h - 1));
            return [x, y];
        },
        computeHistograms: function (raster) {
            var xDistance = this.map.extent.xmax - this.map.extent.xmin;
            var yDistance = this.map.extent.ymax - this.map.extent.ymin;
            this.pixelSizeX = xDistance / this.map.width;
            this.pixelSizeY = yDistance / this.map.height;
            var geometry, geometryType;
            if (this.polygons && this.polygons.rings.length > 0) {
                geometry = this.polygons;
                geometryType = 'esriGeometryPolygon';
            } else {
                geometry = this.map.extent;
                geometryType = 'esriGeometryEnvelope';
            }
            if (this.layer.pixelType === "U8" && this.xSelect.get("value") !== this.ySelect.get("value")) {
                this.xmin = 0;
                this.xmax = 255;
                this.xMinLabel = 0;
                this.xMaxLabel = 1;
                this.ymin = 0;
                this.ymax = 255;
                this.yMinLabel = 0;
                this.yMaxLabel = 1;

            } else {
                var histogramRequest = new esriRequest({
                    url: this.layer.url + '/computehistograms',
                    content: {
                        f: 'json',
                        geometry: JSON.stringify(geometry.toJson()),
                        geometryType: geometryType,
                        renderingRule: JSON.stringify(raster.toJson()),
                        pixelSize: '{"x":' + this.pixelSizeX + ',"y":' + this.pixelSizeY + '}'
                    },
                    handleAs: 'json',
                    callbackParamName: 'callback'
                });
                histogramRequest.then(lang.hitch(this, function (result) {
                    this.xmin = this.layer.pixelType === "U8" ? 0 : result.histograms[0].min;
                    this.xmax = this.layer.pixelType === "U8" ? 255 : result.histograms[0].max;
                    if (this.xSelect.get("value") !== this.ySelect.get("value")) {
                        this.ymin = result.histograms[1].min;
                        this.ymax = result.histograms[1].max;
                        if (this.layer.minValues.length && this.layer.maxValues.length) {
                            this.xMinLabel = ((this.xmin - this.layer.minValues[this.xSelect.get('value')]) / (this.layer.maxValues[this.xSelect.get('value')] - this.layer.minValues[this.xSelect.get('value')])).toFixed(2);
                            this.xMaxLabel = ((this.xmax - this.layer.minValues[this.xSelect.get('value')]) / (this.layer.maxValues[this.xSelect.get('value')] - this.layer.minValues[this.xSelect.get('value')])).toFixed(2);
                            this.yMinLabel = ((this.ymin - this.layer.minValues[this.ySelect.get('value')]) / (this.layer.maxValues[this.ySelect.get('value')] - this.layer.minValues[this.ySelect.get('value')])).toFixed(2);
                            this.yMaxLabel = ((this.ymax - this.layer.minValues[this.ySelect.get('value')]) / (this.layer.maxValues[this.ySelect.get('value')] - this.layer.minValues[this.ySelect.get('value')])).toFixed(2);
                        } else {
                            this.xMinLabel = 0;
                            this.xMaxLabel = 1;
                            this.yMinLabel = 0;
                            this.yMaxLabel = 1;
                        }
                    } else {
                        this.yData = result.histograms[0].counts.slice(0);
                        var temp = result.histograms[0].counts.slice(0);
                        temp.sort(function (a, b) {
                            return a - b;
                        });
                        this.ymin = temp[0];
                        this.ymax = temp[temp.length - 1];
                        this.yMinLabel = this.ymin;
                        this.yMaxLabel = this.ymax;
                        for (var a in this.yData) {
                            this.yData[a] = Math.round(((this.yData[a] - this.ymin) / (this.ymax - this.ymin)) * 255);
                        }
                        if (this.layer.minValues.length && this.layer.maxValues.length && this.layer.pixelType !== "U8") {
                            this.xMinLabel = ((this.xmin - this.layer.minValues[this.xSelect.get('value')]) / (this.layer.maxValues[this.xSelect.get('value')] - this.layer.minValues[this.xSelect.get('value')])).toFixed(2);
                            this.xMaxLabel = ((this.xmax - this.layer.minValues[this.xSelect.get('value')]) / (this.layer.maxValues[this.xSelect.get('value')] - this.layer.minValues[this.xSelect.get('value')])).toFixed(2);
                        } else {
                            this.xMinLabel = 0;
                            this.xMaxLabel = 1;
                        }
                    }
                    if (this._plotCan)
                        this._restore();
                }));
            }
        },
        initialiseHandlers: function () {
            //initialise map and band change handlers

            this.bandChangeHandler1 = on(this.xSelect, "change", lang.hitch(this, function (val) {
                this.mapClickEnabled = true;
                domStyle.set('band-error', 'display', 'none');
                if (this.createLayerFlag)
                    this.createRasterLayer();
            }));
            this.bandChangeHandler2 = on(this.ySelect, "change", lang.hitch(this, function (val) {
                this.mapClickEnabled = true;
                domStyle.set('band-error', 'display', 'none');
                if (this.createLayerFlag)
                    this.createRasterLayer();
            }));

            //map handlers
            this.map.on("update-start", lang.hitch(this, this.showLoading));
            this.map.on("update-end", lang.hitch(this, this.hideLoading));
            this.mapUpdateHandler = this.map.on("update-end", lang.hitch(this, function () {
                var imageLayerArray = [];
                if (this.map.primaryLayer) {
                    for (var m in this.map.layerIds) {
                        if (this.map.layerIds[m] === this.map.primaryLayer)
                        {
                            imageLayerArray.push(m);
                            break;
                        }
                    }
                } else {
                    for (var d = this.map.layerIds.length - 1; d >= 0; d--) {
                        var layer = this.map.getLayer(this.map.layerIds[d]);
                        var title = layer.arcgisProps && layer.arcgisProps.title ? layer.arcgisProps.title : layer.title;
                        if (layer && layer.visible && layer.serviceDataType && layer.serviceDataType.substr(0, 16) === "esriImageService" && layer.id !== this.map.resultLayer && layer.id !== "resultLayer" && layer.id !== "scatterResultLayer" && (!title || ((title).charAt(title.length - 1)) !== "_")) {
                            imageLayerArray.push(d);
                            break;
                        }

                    }
                }
                if (imageLayerArray.length > 0)
                    var index = this.map.layerIds.length - imageLayerArray[0];
                else
                    var index = null;
                if (index) {
                    domStyle.set("scatterplotNode", "display", "block");
                    html.set(this.scatterplotErrorContainer, "");
                    if (this.layer !== this.map.getLayer(this.map.layerIds[this.map.layerIds.length - index])) {
                        this.layer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - index]);
                        if (this.map.getLayer("scatterResultLayer")) {
                            this.map.getLayer('scatterResultLayer').suspend();
                            this.map.removeLayer(this.map.getLayer('scatterResultLayer'));
                        }

                        this._populateDropDown();

                    }
                } else {
                    domStyle.set("scatterplotNode", "display", "none");
                    html.set(this.scatterplotErrorContainer, "No visible imagery Layers in the map.");
                }
                if (this.layer) {
                    html.set(this.scatterPlotLayerTitle, "Layer: <b>" + (this.layer.title || this.layer.arcgisProps.title || this.layer.name || this.layer.id) + "</b>");
                }
            }));
            this.mapClickHandler = this.map.on("click", lang.hitch(this, function (e) {
                if (this.mapClickEnabled)
                    this._onMapClick(e);
            }));
            this.extentChangeHandler = this.map.on("extent-change", lang.hitch(this, function (evt) {
                this.refreshPlot = true;
                if (this.rasterLayer) {
                    if (this._plotCtx && (evt.extent.xmin !== this.extentCheck.xmin || evt.extent.ymin !== this.extentCheck.ymin)) {
                        this._plotCtx.clearRect(0, 0, this._plotCan.width, this._plotCan.height);
                        this._plotData = null;
                    }
                    this.extentCheck = evt.extent;
                    if (this.polygons && this.polygons.rings.length > 0)
                        this.computeHistograms(this.rasterLayer.renderingRule.functionArguments.Raster.functionArguments.Raster);
                    else
                        this.computeHistograms(this.rasterLayer.renderingRule.functionArguments.Raster);
                }
            }));
            this.layerAddHandler = this.map.on("layer-add-result", lang.hitch(this, function (result) {
                if (result.layer.id === "scatterResultLayer")
                    this.getcontext = true;
            }));
        },
        postCreate: function () {
            //get color from config
            this.myColor.freqRamp.start = new Color(this.config.start);
            this.myColor.freqRamp.end = new Color(this.config.end);

            //create loading icon
            domConstruct.place('<img id="loadingIcon" style="display:none;position: absolute;top:0;bottom: 0;left: 0;right: 0;margin:auto;z-index:100;" src="' + require.toUrl('jimu') + '/images/loading.gif">', this.domNode);
            domConstruct.place('<img id="mapLoadingIcon" style="display:none;position: absolute;top:0;bottom: 0;left: 0;right: 0;margin:auto;z-index:100;" src="' + require.toUrl('jimu') + '/images/loading.gif">', "map");

            //set flags
            this.clickX = [];
            this.clickY = [];
            this.extentCheck = this.map.extent;
            this.paint = false;
            this.supportFlag = this.isCanvasSupported();

            on(this.changeColor, "click", lang.hitch(this, function () {
                domStyle.set('changeColorSection', 'display', 'block');
            }));
            on(this.closeEdit, "click", lang.hitch(this, function () {
                domStyle.set('changeColorSection', 'display', 'none');
            }));
            registry.byId("defineAOI").on("change", lang.hitch(this, function (val) {
                if (val) {
                    this.polygons = null;
                    this.polygons = new Polygon(this.map.spatialReference);
                    this.toolbarAreas.activate(Draw.POLYGON);
                    for (var k = this.map.graphics.graphics.length - 1; k >= 0; k--) {
                        if (this.map.graphics.graphics[k].geometry.type === "polygon") {
                            if (this.map.graphics.graphics[k].symbol.color.r === 200) {
                                this.map.graphics.remove(this.map.graphics.graphics[k]);
                            }
                        }
                    }
                    this.turnOffClick = true;
                    domStyle.set(this.applyAOI.domNode, 'display', 'block');
                    domStyle.set(this.resetAOI.domNode, 'display', 'none');
                    this.applyAOI.set('disabled', true);
                } else {
                    this.toolbarAreas.deactivate();
                    this.turnOffClick = false;
                    domStyle.set(this.applyAOI.domNode, 'display', 'none');
                    if (!this.autoTurnOff) {
                        for (var k = this.map.graphics.graphics.length - 1; k >= 0; k--) {
                            if (this.map.graphics.graphics[k].geometry.type === "polygon") {
                                if (this.map.graphics.graphics[k].symbol.color.r === 200) {
                                    this.map.graphics.remove(this.map.graphics.graphics[k]);
                                }
                            }
                        }
                        this.polygons = null;
                        if (this.map.getLayer("scatterResultLayer")) {
                            this.createRasterLayer();
                        }
                    } else {
                        this.autoTurnOff = false;
                    }
                }
            }));

            this.applyAOI.on("click", lang.hitch(this, function () {
                domStyle.set(this.applyAOI.domNode, 'display', 'none');
                domStyle.set(this.resetAOI.domNode, 'display', 'block');
                this.createRasterLayer();
                this.autoTurnOff = true;
                registry.byId("defineAOI").set('checked', false);
            }));

            this.resetAOI.on("click", lang.hitch(this, function () {
                this.polygons = null;
                if (this.map.getLayer("scatterResultLayer")) {
                    this.createRasterLayer();
                }
                this.toolbarAreas.deactivate();
                this.turnOffClick = false;
                for (var k = this.map.graphics.graphics.length - 1; k >= 0; k--) {
                    if (this.map.graphics.graphics[k].geometry.type === "polygon") {
                        if (this.map.graphics.graphics[k].symbol.color.r === 200) {
                            this.map.graphics.remove(this.map.graphics.graphics[k]);
                        }
                    }
                }
                domStyle.set(this.resetAOI.domNode, 'display', 'none');
            }));

            this.toolbarAreas = new Draw(this.map);
            dojo.connect(this.toolbarAreas, "onDrawEnd", lang.hitch(this, function (geometry) {
                this.applyAOI.set('disabled', false);
                var symbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([200, 0, 0]), 2);
                var graphic = new Graphic(geometry, symbol);
                this.map.graphics.add(graphic);
                this.polygons.addRing(geometry.rings[0]);
            }));
        },
        startup: function () {
            this.inherited(arguments);
            //create marker
            domConstruct.place('<img id="marker" style="display:none;position: absolute;z-index:100;" src="widgets/ISScatterplot/images/marker.png">', "canvasBlock");

            //create tooltip
            this.pointTooltip = new Tooltip({
                connectId: ["marker"]
            });

            //create palette
            this.drawPalette = new Palette({
                palette: "7x10",
                onChange: lang.hitch(this, this.changeDrawColor)
            }, "drawColorPalette").startup();
        },
        onOpen: function () {
            this.layer = null;
            if (this.supportFlag) {
                this.initialiseHandlers();
                if (this.map.getLayer("scatterResultLayer"))
                    this.map.removeLayer(this.map.getLayer("scatterResultLayer"));
                domStyle.set(dom.byId('scatterplotNode'), 'display', 'block');
                domStyle.set(dom.byId('noCanvasSupport'), 'display', 'none');
                if (this.map.primaryLayer) {
                    this.layer = this.map.getLayer(this.map.primaryLayer);
                    this._populateDropDown();
                } else {
                    for (var a = this.map.layerIds.length - 1; a >= 0; a--) {
                        var layer = this.map.getLayer(this.map.layerIds[a]);
                        var title = layer.arcgisProps && layer.arcgisProps.title ? layer.arcgisProps.title : layer.title;
                        if (layer && layer.visible && layer.serviceDataType && layer.serviceDataType.substr(0, 16) === "esriImageService" && layer.id !== this.map.resultLayer && layer.id !== "resultLayer" && layer.id !== "scatterResultLayer" && (!title || ((title).charAt(title.length - 1)) !== "_")) {
                            this.layer = layer;
                            this._populateDropDown();
                            break;
                        }
                    }
                }
                if (this.layer) {
                    html.set(this.scatterPlotLayerTitle, "Layer: <b>" + (this.layer.title || this.layer.arcgisProps.title || this.layer.name || this.layer.id) + "</b>");
                    domStyle.set("scatterplotNode", "display", "block");
                    html.set(this.scatterplotErrorContainer, "");
                } else {
                    domStyle.set("scatterplotNode", "display", "none");
                    html.set(this.scatterplotErrorContainer, "No visible imagery Layers in the map.");
                }
            } else {
                domStyle.set(dom.byId('scatterplotNode'), 'display', 'none');
                domStyle.set(dom.byId('noCanvasSupport'), 'display', 'block');
            }
        },
        _populateDropDown: function () {
            //when values of the bands are set in drop-down down
            //do not create layer on change in drop-down value
            this.createLayerFlag = false;

            //Regular expressions to match red and nir bands 
            var nirExp = new RegExp(/N[a-z]*I[a-z]*R[_]?[1]?/i);
            var redExp = new RegExp(/^red/i);
            //default band values
            var redIndex = 1, nirIndex = 2;

            //Band name request
            //If Band Name is not found in keyProperties
            //default values (Band_1,Band_2..) are used.
            //No result if request fails.
            var request = new esriRequest({
                url: this.layer.url + '/1/info/keyProperties',
                content: {f: 'json'},
                handleAs: 'json',
                callbackParam: 'callback'
            });
            request.then(lang.hitch(this, function (response) {
                this.xSelect.removeOption(this.xSelect.getOptions());
                this.ySelect.removeOption(this.ySelect.getOptions());
                this.bandNames.splice(0, this.bandNames.length);

                var bandProp = response.BandProperties;
                if (bandProp) {
                    for (var i = 0; i < this.layer.bandCount; i++) {
                        if (bandProp[i] && bandProp[i].BandName) {
                            this.xSelect.addOption({"value": i, "label": bandProp[i].BandName});
                            this.ySelect.addOption({"value": i, "label": bandProp[i].BandName});
                            this.bandNames.push(bandProp[i].BandName);
                            if (redExp.test(bandProp[i].BandName)) {
                                redIndex = i;
                            }
                            if (nirExp.test(bandProp[i].BandName)) {
                                nirIndex = i;
                            }
                        } else {
                            var num = i + 1;
                            this.xSelect.addOption({"value": i, "label": "Band_" + num.toString()});
                            this.ySelect.addOption({"value": i, "label": "Band_" + num.toString()});
                            this.bandNames.push("Band_" + num.toString());
                        }
                    }
                } else {
                    for (var i = 0; i < this.layer.bandCount; i++) {
                        var num = i + 1;
                        this.xSelect.addOption({"value": i, "label": "Band_" + num.toString()});
                        this.ySelect.addOption({"value": i, "label": "Band_" + num.toString()});
                        this.bandNames.push("Band_" + num.toString());
                    }
                }

                //assign Bands to Drop Down
                if (!this.prevLayer || this.prevLayer.url !== this.layer.url) {
                    if (this.layer.bandCount < 3) {
                        this._bandX = 0;
                        this._bandY = this.layer.bandCount - 1;
                    } else {
                        this._bandX = redIndex;
                        this._bandY = nirIndex;
                    }
                }
                this.xSelect.set('value', this._bandX);
                this.ySelect.set('value', this._bandY);

                //create RasterLayer
                this.mapClickEnabled = true;
                this.createRasterLayer();
                this.prevLayer = this.layer;
            }), lang.hitch(this, function (err) {
                console.log(err);
                if (this.layer.bandCount) {
                    for (var i = 0; i < this.layer.bandCount; i++) {
                        var num = i + 1;
                        this.xSelect.addOption({"value": i, "label": "Band_" + num.toString()});
                        this.ySelect.addOption({"value": i, "label": "Band_" + num.toString()});
                        this.bandNames.push("Band_" + num.toString());
                    }
                    if (!this.prevLayer || this.prevLayer.url !== this.layer.url) {
                        if (this.layer.bandCount < 3) {
                            this._bandX = 0;
                            this._bandY = this.layer.bandCount - 1;
                        } else {
                            this._bandX = redIndex;
                            this._bandY = nirIndex;
                        }
                    }
                    this.xSelect.set('value', this._bandX);
                    this.ySelect.set('value', this._bandY);

                    //create RasterLayer
                    this.mapClickEnabled = true;
                    this.createRasterLayer();
                    this.prevLayer = this.layer;
                } else {
                    this.xSelect.removeOption(this.xSelect.getOptions());
                    this.ySelect.removeOption(this.ySelect.getOptions());
                    this.bandNames.splice(0, this.bandNames.length);
                }
            }));
        },
        createRasterLayer: function () {
            if (this._plotCtx) {
                this._plotCtx.clearRect(0, 0, this._plotCan.width, this._plotCan.height); //clear the entire canvas as user's drawing can extend outside the plot as well
                this._plotData = null;
            }
            var renderingRule;
            domStyle.set('marker', 'display', 'none');
            this._bandX = this.xSelect.get("value");
            this._bandY = this.ySelect.get("value");

            this.mask = false;

            this.showLoading();
            var extractBand = new RasterFunction();
            extractBand.functionName = "ExtractBand";
            var extractBandArg = {};
            if (this.xSelect.get("value") !== this.ySelect.get("value"))
                extractBandArg.BandIds = [parseInt(this.xSelect.get("value")), parseInt(this.ySelect.get("value"))];
            else
                extractBandArg.BandIds = [parseInt(this.xSelect.get("value"))];
            extractBand.functionArguments = extractBandArg;

            this.computeHistograms(extractBand);

            var clip = new RasterFunction();
            clip.functionName = "Clip";
            var clipArg = {};
            clipArg.ClippingGeometry = this.polygons;
            clipArg.ClippingType = 1;
            clipArg.Raster = extractBand;
            clip.functionArguments = clipArg;

            var stretch = new RasterFunction();
            stretch.functionName = "Stretch";
            var stretchArg = {};
            stretchArg.StretchType = 5;
            stretchArg.DRA = true;
            stretchArg.Min = 0;
            stretchArg.Max = 255;
            if (this.polygons && this.polygons.rings.length > 0) {
                stretchArg.Raster = clip;
            } else {
                stretchArg.Raster = extractBand;
            }
            stretch.functionArguments = stretchArg;
            stretch.outputPixelType = "U8";

            if (this.layer.pixelType !== "U8") {
                renderingRule = stretch;
            } else {
                if (this.polygons && this.polygons.rings.length > 0) {
                    renderingRule = clip;
                } else {
                    renderingRule = extractBand;
                }
            }

            var params = new ImageServiceParameters();
            params.renderingRule = renderingRule;
            params.format = "lerc";

            if (this.layer.pixelType !== "U8") {
                if (this.layer.pixelType === "F32") {
                    params.compressionTolerance = 0.1;
                } else {
                    params.compressionTolerance = 0.5;
                }
            }

            if (this.layer.mosaicRule)
                params.mosaicRule = this.layer.mosaicRule;

            if (this.rasterLayer && this.rasterLayer.url === this.layer.url) {
                if (params.mosaicRule)
                    this.rasterLayer.setMosaicRule(params.mosaicRule, true);
                this.rasterLayer.setRenderingRule(params.renderingRule, false);
                this.refreshPlot = true;
            } else {
                this.rasterLayer = new RasterLayer(this.layer.url, {
                    id: "scatterResultLayer",
                    imageServiceParameters: params,
                    visible: true,
                    pixelFilter: lang.hitch(this, this.pixelFilter)
                });

                this.rasterLayer.on("load", lang.hitch(this, function () {
                    this.createLayerFlag = true;
                }));
                for (var a = this.map.layerIds.length - 1; a >= 0; a--) {
                    if (this.layer.id === this.map.layerIds[a]) {
                        var index = a + 1;
                        break;
                    }
                }
                this.map.addLayer(this.rasterLayer, index);
            }

        },
        pixelFilter: function (pixelData) {
            //set values

            this.xData = pixelData.pixelBlock.pixels[0];
            this.xNoData = pixelData.pixelBlock.statistics[0].noDataValue;
            if (this.xSelect.get("value") !== this.ySelect.get("value")) {
                this.yData = pixelData.pixelBlock.pixels[1];
                this.yNoData = pixelData.pixelBlock.statistics[1].noDataValue;
            } else {
                this.yNoData = -999;
            }
            if (this.getcontext === true) {
                this.getcontext = false;
                this.getCanvasCtx();
            }
            if (this.refreshPlot === true) {
                this.refreshPlot = false;
                this.refresh();
            }

            //set mask
            if (this.mask)
                this._filterImage(pixelData.pixelBlock);
            else {
                if (!pixelData.pixelBlock.mask) {
                    pixelData.pixelBlock.mask = new Uint8Array(this.xData.length);
                }
                for (var i = 0; i < this.xData.length; i++) {
                    pixelData.pixelBlock.mask[i] = 0;
                }
            }

        },
        getCanvasCtx: function () {
            this._plotCan = this.ScatterPlotWidgetCanvas;
            this._plotCtx = this._plotCan.getContext('2d');
            this.refresh();

            this._plotCan.onmousedown = lang.hitch(this, function (e) {
                this.mask = false;
                this.refresh();
                this.paint = true;
//        this._restore();

                this.clickX.push(e.offsetX);
                this.clickY.push(e.offsetY);
                this._redraw();
            });
            this._plotCan.onmousemove = lang.hitch(this, function (e) {
                if (this.paint) {
                    //adds click only if point lies above
                    //the freq legend
                    if (!(e.offsetY > (this._plotCan.height - 20))) {
                        this.clickX.push(e.offsetX);
                        this.clickY.push(e.offsetY);
                    }
                    this._redraw();
                }
            });
            this._plotCan.onmouseup = lang.hitch(this, function (e) {
                this.paint = false;
                this._closeCurve();
                if (this.clickX.length < 3) {
                    this.mask = false;
                    this._restore();//single click will restore
                    this.rasterLayer.redraw();
                } else {
                    var pData = this._plotCtx.getImageData(0, 0, this._plotCan.width, this._plotCan.height - 20);
                    this._deselectPix(pData);
                    this._plotCtx.putImageData(pData, 0, 0);
                    pData = this._plotCtx.getImageData(this._marg, this._marg, this._plotCan.width - 2 * this._marg, this._plotCan.height - 2 * this._marg - 20);
                    this._recolorPix(pData);
                    this._plotCtx.clearRect(0, 0, this._plotCan.width, this._plotCan.height);
                    this._plotCtx.putImageData(pData, this._marg, this._marg);
                    this._drawAxis();
                    this._drawLegend();
                    //redraw the drawing
                    this._redraw();
                    this._plotCtx.strokeStyle = this.myColor.colors.draw.toHex();
                    this._plotCtx.lineJoin = "round";
                    this._plotCtx.lineWidth = 3;
                    this._plotCtx.beginPath();
                    this._plotCtx.moveTo(this.clickX[0], this.clickY[0]);
                    this._plotCtx.lineTo(this.clickX[this.clickX.length - 1], this.clickY[this.clickY.length - 1]);
                    this._plotCtx.closePath();
                    this._plotCtx.stroke();
                    if (this.xSelect.get("value") === this.ySelect.get("value")) {
                        this.saveXPoints = this.clickX.slice(0);
                        this.saveXPoints.sort(function (a, b) {
                            return a - b;
                        });

                    }
                    this.mask = true;
                    this.rasterLayer.redraw();
                }

                this.trueClickX = [];
                this.trueClickY = [];
                for (var g = 0; g < this.clickX.length; g++) {
                    //subtract 20 from the click to account for margin
                    this.trueClickX[g] = this.xmin + (this.clickX[g] - 20) * (this.xmax - this.xmin) / 255;
                    this.trueClickY[g] = this.ymin + (255 - (this.clickY[g] - 20)) * (this.ymax - this.ymin) / 255;
                    if (this.layer.pixelType === "F32") {
                        this.trueClickX[g] = this.trueClickX[g].toFixed(2);
                        this.trueClickY[g] = this.trueClickY[g].toFixed(2);
                    } else {
                        this.trueClickX[g] = parseInt(this.trueClickX[g]);
                        this.trueClickY[g] = parseInt(this.trueClickY[g]);
                    }
                }


                this.clickX = [];
                this.clickY = [];
            });
        },
        refresh: function () {
            //calculates and draws plot based on extent.
            //if shape is present, redraws that as well.

            var plotData, w, h;
            this._plotCtx.clearRect(0, 0, this._plotCan.width, this._plotCan.height); //empty the plot
            this._plotData = this._plotCtx.getImageData(this._marg, this._marg, this._plotCan.width - 2 * this._marg, this._plotCan.height - 2 * this._marg - 20);
            plotData = this._plotData.data;
            w = this._plotData.width;
            h = this._plotData.height;

            //calculate frequency of each (xData,yData) pair
            if (this.xSelect.get("value") !== this.ySelect.get("value")) {
                for (var i = 0; i < this.xData.length; i++) {
                    if (this.xData[i] === this.xNoData || this.yData[i] === this.yNoData)
                        continue;
                    var coords = this.pixValToXY(this.xData[i], this.yData[i], w, h);
                    var index = (coords[0] + coords[1] * w) * 4;
                    var freq = plotData[index];
                    if (isNaN(freq)) {
                        continue;
                    }
                    plotData[index] = freq + 1;
                }
            } else {

                for (var i = 0; i < this.xData.length; i++) {
                    if (this.xData[i] === this.xNoData || this.yData[this.xData[i]] === this.yNoData)
                        continue;
                    var coords = this.pixValToXY(this.xData[i], this.yData[this.xData[i]], w, h);
                    var index = (coords[0] + coords[1] * w) * 4;
                    var freq = plotData[index];
                    if (isNaN(freq)) {
                        continue;
                    }
                    plotData[index] = freq + 1;

                    for (var n = coords[1] + 1; n <= 255; n++) {
                        index = (coords[0] + n * w) * 4;
                        plotData[index] = freq;
                    }
                }
            }
            //colors point on graph based on frequency

            for (var i = 0; i <= plotData.length; i = i + 4) {
                var freq = plotData[i];
                var c;
                if (isNaN(freq)) {
                    continue;
                }
                if (freq === 0) {
                    c = this.myColor.colors.background;
                } else {
                    c = this.myColor.freqRamp.colorAt(freq);
                }
                plotData[i] = c.r;
                plotData[i + 1] = c.g;
                plotData[i + 2] = c.b;
                plotData[i + 3] = Math.round(255 * c.a);
            }
            //sets the data
            this._restore();
            //checks and redraws shape
            if (this.mask) {
                for (var g = 0; g < this.trueClickX.length; g++) {
                    var x = parseInt(((this.trueClickX[g] - this.xmin) / (this.xmax - this.xmin)) * 255);
                    var y = 255 - parseInt(((this.trueClickY[g] - this.ymin) / (this.ymax - this.ymin)) * 255);
                    if (x > 255 + this._marg)
                        x = 255 + this._marg;
                    else if (x < -this._marg)
                        x = -this._marg;
                    if (y > 255 + this._marg)
                        y = 255 + this._marg;
                    else if (y < -this._marg)
                        y = -this._marg;
                    this.clickX[g] = x + this._marg;
                    this.clickY[g] = y + this._marg;
                }
                this._closeCurve();

                var pData = this._plotCtx.getImageData(0, 0, this._plotCan.width, this._plotCan.height - 20);
                this._deselectPix(pData);
                this._plotCtx.putImageData(pData, 0, 0);
                pData = this._plotCtx.getImageData(this._marg, this._marg, this._plotCan.width - 2 * this._marg, this._plotCan.height - 2 * this._marg - 20);
                this._recolorPix(pData);
                this._plotCtx.clearRect(0, 0, this._plotCan.width, this._plotCan.height);
                this._plotCtx.putImageData(pData, this._marg, this._marg);
                this._drawAxis();
                this._drawLegend();
                //redraw the drawing
                this._redraw();
                this._plotCtx.strokeStyle = this.myColor.colors.draw.toHex();
                this._plotCtx.lineJoin = "round";
                this._plotCtx.lineWidth = 3;
                this._plotCtx.beginPath();
                this._plotCtx.moveTo(this.clickX[0], this.clickY[0]);
                this._plotCtx.lineTo(this.clickX[this.clickX.length - 1], this.clickY[this.clickY.length - 1]);
                this._plotCtx.closePath();
                this._plotCtx.stroke();
                this.rasterLayer.redraw();
                this.clickX = [];
                this.clickY = [];
            }
        },
        _restore: function () {
            //restores the original data
            if (this._plotCtx)
                this._plotCtx.clearRect(0, 0, this._plotCan.width, this._plotCan.height);
            if (this._plotData) {
                this._plotCtx.putImageData(this._plotData, this._marg, this._marg);
            }
            this._drawAxis();
            this._drawLegend();
        },
        _drawAxis: function () {
            //creates the x and y axis for plot
            var w = this._plotCan.width;
            var h = this._plotCan.height;
            this._plotCtx.strokeStyle = this.myColor.colors.text.toHex();
            this._plotCtx.lineJoin = "round";
            this._plotCtx.lineWidth = 1;
            //axes
            this._plotCtx.beginPath();
            this._plotCtx.moveTo(this._marg - 1, this._marg); //upper-left
            this._plotCtx.lineTo(this._marg - 1, h - this._marg - 19); //bottom-left
            this._plotCtx.lineTo(w - this._marg + 1, h - this._marg - 19); //bottom-right
            this._plotCtx.stroke();
            //x-axis labels
            this._plotCtx.textAlign = "center";
            this._plotCtx.fillText(this.xMinLabel, this._marg + 5, h - 20 - this._marg / 2);
            this._plotCtx.fillText(this.bandNames[this.xSelect.get("value")], w / 2, h - 20 - this._marg / 2);
            this._plotCtx.fillText(this.xMaxLabel, w - this._marg, h - 20 - this._marg / 2);
            this._plotCtx.save();
            //y-axis labels
            this._plotCtx.rotate(-Math.PI / 2);
            this._plotCtx.fillText(this.yMinLabel, -w + this._marg, this._marg / 2);
            if (this.xSelect.get("value") !== this.ySelect.get("value"))
                this._plotCtx.fillText(this.bandNames[this.ySelect.get("value")], -h / 2, this._marg / 2);
            else
                this._plotCtx.fillText("Frequency", -h / 2, this._marg / 2);
            this._plotCtx.fillText(this.yMaxLabel, -this._marg, this._marg / 2);
            this._plotCtx.restore();
        },
        _drawLegend: function () {
            //creates the freq Legend
            var w = this._plotCan.width;
            var h = this._plotCan.height;

            this._plotCtx.fillText("freq: 1", 20, h - 10);
            this._plotCtx.fillText(this.myColor.freqRamp.breaks + "+", w - 20, h - 10);
            var grd = this._plotCtx.createLinearGradient(40, 0, w - 40, 0);
            grd.addColorStop(0, this.myColor.freqRamp.start.toHex());
            grd.addColorStop(1, this.myColor.freqRamp.end.toHex());
            var fstemp = this._plotCtx.fillStyle;
            this._plotCtx.fillStyle = grd;
            this._plotCtx.fillRect(40, h - 20, w - 80, 10);
            this._plotCtx.fillStyle = fstemp;
        },
        onClose: function () {
            this.bandChangeHandler1.remove();
            this.bandChangeHandler2.remove();
            this.mapClickHandler.remove();
            this.extentChangeHandler.remove();
            this.layerAddHandler.remove();
            this.mapUpdateHandler.remove();
            domStyle.set('marker', 'display', 'none');
            if (this.map.getLayer("scatterResultLayer")) {
                if (this.map.getLayer("scatterResultLayer").updating)
                    this.map.getLayer("scatterResultLayer").suspend();
                this.map.removeLayer(this.map.getLayer("scatterResultLayer"));
                this.rasterLayer = null;
            }
            if (this._plotCtx)
                this._plotCtx.clearRect(0, 0, this._plotCan.width, this._plotCan.height);
            for (var k = this.map.graphics.graphics.length - 1; k >= 0; k--) {
                if (this.map.graphics.graphics[k].geometry.type === "polygon" && this.map.graphics.graphics[k].symbol.color.r === 200)
                    this.map.graphics.remove(this.map.graphics.graphics[k]);
            }
            this.autoTurnOff = true;
            registry.byId("defineAOI").set('checked', false);
            domStyle.set(this.applyAOI.domNode, 'display', 'none');
            domStyle.set(this.resetAOI.domNode, 'display', 'none');
            this.polygons = null;
        },
        _redraw: function () {
            //draws the curve while user is drawing
            var ctx = this._plotCtx;
            //style settings
            ctx.strokeStyle = this.myColor.colors.draw.toHex();
            ctx.lineJoin = "round";
            ctx.lineWidth = 3;

            //redraws current curve
            for (var i = 0; i < this.clickX.length; i++) {
                ctx.beginPath();
                if (i)
                    ctx.moveTo(this.clickX[i - 1], this.clickY[i - 1]);
                else
                    ctx.moveTo(this.clickX[i], this.clickY[i]);
                ctx.lineTo(this.clickX[i], this.clickY[i]);
                ctx.closePath();
                ctx.stroke();
            }
        },
        _closeCurve: function () {
            //connects the last drawn point to first
            //and colours pixels inside drawn shape
            //to intermediate color white

            var ctx = this._plotCtx;
            //style settings
            ctx.strokeStyle = this.myColor.colors.draw.toHex();
            var fstyle = ctx.fillStyle; //stores original fill type
            ctx.fillStyle = "#fff";
            ctx.lineJoin = "round";
            ctx.lineWidth = 3;

            //redraws entire curve
            ctx.beginPath();
            ctx.moveTo(this.clickX[0], this.clickY[0]);
            for (var i = 0; i < this.clickX.length; i++) {
                ctx.lineTo(this.clickX[i], this.clickY[i]);
            }
            ctx.fill();
            ctx.stroke();

            //restore fill type
            ctx.fillStyle = fstyle;

            //join first and last point to close shape
            ctx.beginPath();
            ctx.moveTo(this.clickX[0], this.clickY[0]);
            ctx.lineTo(this.clickX[this.clickX.length - 1], this.clickY[this.clickY.length - 1]);
            ctx.closePath();
            ctx.stroke();
        },
        _deselectPix: function (pData) {
            //disable pixels by coloring pixels
            //ouside the drawing to grey
            var ramp = this.myColor.freqRamp;

            for (var i = 0; i < pData.height; i++) {
                for (var j = 0; j < pData.width; j++) {
                    var idx = (i * pData.width + j) * 4;
                    if (ramp.cover(pData.data[idx], pData.data[idx + 1], pData.data[idx + 2])) {
                        pData.data[idx] = this.myColor.colors.disabled.r;
                        pData.data[idx + 1] = this.myColor.colors.disabled.g;
                        pData.data[idx + 2] = this.myColor.colors.disabled.b;
                        pData.data[idx + 3] = Math.round(this.myColor.colors.disabled.a * 255);
                    }
                }
            }
        },
        _recolorPix: function (pData) {
            //recolors white pixels inside drawing to
            //original color
            for (var i = 0; i <= pData.data.length; i = i + 4) {
                if (pData.data[i] === 255 && pData.data[i + 1] === 255 && pData.data[i + 2] === 255) {
                    pData.data[i] = this._plotData.data[i];
                    pData.data[i + 1] = this._plotData.data[i + 1];
                    pData.data[i + 2] = this._plotData.data[i + 2];
                    pData.data[i + 3] = this._plotData.data[i + 3];
                }
            }
        },
        _filterImage: function (pixelBlock) {
            //apply mask on raster layer
            var pw = this._plotCan.width - 2 * this._marg;
            var ph = this._plotCan.height - 2 * this._marg - 20;//20 in height because of freq legend
            var plotData = this._plotCtx.getImageData(this._marg, this._marg, pw, ph);
            var drawClr = this.myColor.colors.draw;

            if (!pixelBlock.mask) {
                pixelBlock.mask = new Uint8Array(this.xData.length);
            }
            var pr = new Uint8Array(this.xData.length);
            var pg = new Uint8Array(this.xData.length);
            var pb = new Uint8Array(this.xData.length);
            if (this.saveXPoints && this.saveXPoints.length > 0) {
                var min = this.saveXPoints[0] - 20;
                var max = this.saveXPoints[this.saveXPoints.length - 1] - 20;
            }
            for (var i = 0; i < this.xData.length; i++) {
                if (this.xSelect.get("value") !== this.ySelect.get("value")) {
                    var coords = this.pixValToXY(this.xData[i], this.yData[i], pw, ph); //get plot coordinate
                    var index = (coords[0] + coords[1] * pw) * 4; //get index for pixel in imageData array
                    if (plotData.data[index] && (this.cover(plotData.data[index], plotData.data[index + 1], plotData.data[index + 2]))) {
                        pr[i] = drawClr.r;
                        pg[i] = drawClr.g;
                        pb[i] = drawClr.b;
                        pixelBlock.mask[i] = 1;
                    } else {
                        pixelBlock.mask[i] = 0;
                    }
                } else {
                    var coords = this.pixValToXY(this.xData[i], this.yData[this.xData[i]], pw, ph);
                    if (coords[0] >= min && coords[0] <= max) {
                        pr[i] = drawClr.r;
                        pg[i] = drawClr.g;
                        pb[i] = drawClr.b;
                        pixelBlock.mask[i] = 1;
                    } else {
                        pixelBlock.mask[i] = 0;
                    }
                }
            }
            pixelBlock.pixelType = "U8";
            pixelBlock.pixels = [pr, pg, pb];
        },
        _onMapClick: function (e) {
            //marks the point clicked on plot
            if (!this.turnOffClick) {
                var idx = e.offsetX + e.offsetY * this.map.width;
                var valx = this.xData[idx];
                if (this.xSelect.get("value") !== this.ySelect.get("value"))
                    var valy = this.yData[idx];
                else
                    var valy = this.yData[valx];
                if (valx === this.xNoData || valy === this.yNoData)
                    return;
                var trueValX = this.xmin + valx * (this.xmax - this.xmin) / 255;
                var trueValY = this.ymin + valy * (this.ymax - this.ymin) / 255;
                if (this.layer.pixelType === "F32") {
                    trueValX = trueValX.toFixed(2);
                    trueValY = trueValY.toFixed(2);
                } else {
                    trueValX = Math.round(trueValX);
                    trueValY = Math.round(trueValY);
                }
                this.pointTooltip.set('label', trueValX + ',' + trueValY);
                var w = this._plotCan.width - 2 * this._marg;
                var h = this._plotCan.height - 2 * this._marg - 20;

                var xy = this.pixValToXY(valx, valy, w, h);
                var top = this.ScatterPlotWidgetCanvas.offsetTop + this._marg + xy[1] - 8;//subtract half the image height
                var left = this.ScatterPlotWidgetCanvas.offsetLeft + this._marg + xy[0] - 8;//subtract half the image width
                domStyle.set('marker', 'top', top + 'px');
                domStyle.set('marker', 'left', left + 'px');
                domStyle.set('marker', 'display', 'block');
            }
        },
        changeDrawColor: function () {
            //changes the draw color

            var drawcolor;
            registry.byId("drawColorButton").closeDropDown();
            if (registry.byId("drawColorPalette")) {
                drawcolor = new Color(registry.byId("drawColorPalette").get('value'));
            }
            if (this.myColor.freqRamp.cover(drawcolor.r, drawcolor.g, drawcolor.b)) {
                domStyle.set('draw-color-error', 'display', 'block');
            } else {
                domStyle.set('draw-color-error', 'display', 'none');
                this.prevDraw = this.myColor.colors.draw;
                this.myColor.colors.draw = drawcolor;
                if (this.mask && this._plotCtx)
                    this.refresh();
            }
        },
        showLoading: function () {
            domStyle.set('loadingIcon', 'display', 'block');
            domStyle.set('mapLoadingIcon', 'display', 'block');
            domClass.remove(this.ScatterPlotWidgetCanvas, 'draw-active');
        },
        hideLoading: function () {
            domStyle.set('loadingIcon', 'display', 'none');
            domStyle.set('mapLoadingIcon', 'display', 'none');
            domClass.add(this.ScatterPlotWidgetCanvas, 'draw-active');
        }

    });
});