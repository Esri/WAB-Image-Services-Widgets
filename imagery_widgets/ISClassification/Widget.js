define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/event",
    "dojo/_base/Color",
    "dojo/parser",
    "dojo/dom",
    "dojo/dom-style",
    "dijit/registry",
    "dojo/on",
    "dojo/html",
    "dojo/json",
    "dojo/request",
    'jimu/BaseWidget',
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/Dialog",
    "dijit/form/ComboBox",
    "dijit/form/Button",
    "dijit/form/RadioButton",
    "dijit/form/DropDownButton",
    "dijit/ColorPalette",
    "dojo/store/Memory",
    "dojo/store/Observable",
    "dojo/data/ObjectStore",
    "dojox/grid/DataGrid",
    "dojo/text!./Widget.html",
    'dojo/dom-construct',
    "esri/layers/RasterFunction",
    "esri/map",
    "esri/request",
    "esri/layers/ArcGISImageServiceLayer",
    "esri/layers/GraphicsLayer",
    "esri/toolbars/draw",
    "esri/toolbars/edit",
    "esri/graphic",
    "esri/symbols/SimpleMarkerSymbol",
    "esri/symbols/SimpleLineSymbol",
    "esri/symbols/SimpleFillSymbol",
    "esri/tasks/geometry",
    "dojo/Stateful"
], function (declare, lang, event, dojoColor, parser, dom, domStyle, registry, on, html, JSON, dojoRequest, BaseWidget, _TemplatedMixin, _WidgetsInTemplateMixin,
        Dialog, ComboBox, Button, RadioButton, DropDownButton, ColorPalette, memory, Observable, objectStore, dataGrid, template, domConstruct, RasterFunction) {
    var clazz = declare([BaseWidget, _TemplatedMixin, _WidgetsInTemplateMixin], {
        name: 'ISClassification',
        baseClass: 'jimu-widget-ISClassification',
        templateString: template,
        //properties and default values 
        map: null, //map control
        imageServiceLayer: null,
        classDefinitions: "./ISClassification/nlcd2011.json", //class definitions used when classification

        classifier: null, //current signature 
        trainingSites: null, //training sites 

        _editTb: null, _drawTb: null, _editHdl: null,
        _trainingStore: null, _classDefStore: null,
        _runningIndex: 0,
        _previousGraphics: [],
        _graphicsLayer: null, //layer used to contain training sites
        _analyticLayer: null, //layer used to render classification results

        //setters for public properties
        _setClassDefinitionsAttr: function (newClassDefs) {
            var theWidget = this;
//            if (typeof (newClassDefs) === "string") {
//                //./ClassificationWidget/data/nlcd2011.json
//                dojoRequest(newClassDefs, {handleAs: "json"}).then(function(defs) {
//                    theWidget._setClassDefinitions(defs);
//                }, function(err) {
//                    theWidget._setClassDefinitions(null);
//                });
//            } else {
//                theWidget._setClassDefinitions(newClassDefs);
//            }
            theWidget._setClassDefinitions(theWidget.config.nlcdData);
        },
        _setClassDefinitions: function (newClassDefs) {
            var clsStore = new memory({data: {identifier: "id", items: []}});
            if (dojo.isArray(newClassDefs) && newClassDefs.length > 0) {
                var len = newClassDefs.length;
                for (var i = 0; i < len; i++) {
                    var item = newClassDefs[i];
                    if ((item.id || item.id === 0)
                            && item.name) {
                        if ((item.value || item.value === 0))
                            item.name = item.value + " - " + item.name;
                        clsStore.put(item);
                    }
                }
            }
            this._set("classDefinitions", clsStore.data);
            this._classDefStore = clsStore;
            if (this.classCombo) {
                this.classCombo.set("store", this._classDefStore);
            }
        },
        _setClassifierAttr: function (inClassifier) {
            //void setter, make it readonly
            //this._set("classifier", inClassifier);
        },
        _getClassifierAttr: function () {
            return this.classifier;
        },
        _setTrainingSitesAttr: function (inTrainingSites) {
            //void setter, make it readonly
            //this._set("trainingSites", inTrainingSites);
        },
        _getTrainingSitesAttr: function () {
            return this.trainingSites;
        },
        //before startup
        postCreate: function () {
            var theWidget = this; //'this' can be confusing
            this.inherited(arguments);

            if (!theWidget.classDefinitions) {
                theWidget._setClassDefinitionsAttr(null);//populate combo
            }

            //wiring
            this.own(
                    on(this.panRadio, "click", lang.hitch(this, "_onRadioClick", 0)),
                    on(this.drawRadio, "click", lang.hitch(this, "_onRadioClick", 1)),
                    on(this.editRadio, "click", lang.hitch(this, "_onRadioClick", 2))
                    );

            if (this.map) {
                this.map.on("update-end", lang.hitch(this, this.refreshData));
                this.map.on("update-start", lang.hitch(this, this.showLoading));
                this.map.on("update-end", lang.hitch(this, this.hideLoading));
            }
        },
        onOpen: function () {
            this.refreshData();
            if (!this._graphicsLayer) {
                this._graphicsLayer = new esri.layers.GraphicsLayer();
                this._graphicsLayer.id = this._guid();//to ensure unique id
                this.map.addLayer(this._graphicsLayer);
            } else {
                this._graphicsLayer.show();
            }
        },
        refreshData: function () {
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
            if (!this.imageServiceLayer) {
                html.set(this.classificationErrorNode, "No visible Imagery Layers in the map.");
                domStyle.set("classificationDiv", "display", "none");
            } else if (parseFloat(this.imageServiceLayer.version) < 10.5) {
                this.imageServiceLayer = null;
                html.set(this.classificationErrorNode, "Image Services published on ArcGIS Server v10.5 or higher are supported.");
                domStyle.set("classificationDiv", "display", "none");
            } else {
                html.set(this.classificationErrorNode, "");
                domStyle.set("classificationDiv", "display", "block");
            }
        },
        startup: function () {
            this.inherited(arguments);
            var theWidget = this;

            this._trainingStore = new Observable(new memory({data: {identifier: "ID", items: []}}));
            //observe changes on all records
            this._trainingStore.query({}).observe(function (object, removedFrom, insertedInto) {
                var is0 = (theWidget._trainingStore.data.length === 0);
                theWidget.removeBtn.set("disabled", is0);
                theWidget.editRadio.set("disabled", is0);
                var gt1 = (theWidget._trainingStore.data.length > 1);
                theWidget.classifyBtn.set("disabled", !gt1);

                if (insertedInto >= 0) {
                    //not remove
                    var ts = theWidget._trainingStore.query({LULC: object.LULC});
                    for (var i = 0; i < ts.length; i++) {
                        ts[i].COLOR = object.COLOR;
                    }
                }

                //update the grid
                var myGrid = registry.byId("trainingGrid");
                if (myGrid)
                    myGrid.setStore(new dojo.data.ObjectStore({objectStore: theWidget._trainingStore}));

                //update the graphics
                var gras = theWidget._graphicsLayer.graphics;
                for (var i = 0; i < gras.length; i++) {
                    if (insertedInto >= 0) {
                        //update
                        if (((gras[i] || {}).attributes || {}).LULC === object.LULC) {
                            gras[i].setSymbol(theWidget._makeFillSymbol(object.COLOR));
                        }
                    } else {
                        //remove
                        if (((gras[i] || {}).attributes || {}).CLIENTID === object.ID) {
                            theWidget._graphicsLayer.remove(gras[i]);
                            break;
                        }
                    }
                }
            }, true);//second param meaning all edits (put and add) will trigger event

            var myGrid = registry.byId("trainingGrid");
            if (!myGrid) {
                var gridLayout = [[{field: "ID", name: "ID", width: '30px'}, {field: "LULC", name: "Name", width: 'auto'},
                        {
                            field: "COLOR", name: "Color", width: '50px', formatter: function (color, row) {
                                var cp = new ColorPalette({palette: '7x10'});
                                on(cp, "change", function (col) {
                                    //change color in grid, not must, because underlying store is updated and grid will follow
                                    domStyle.set("colorSwatch" + row, "backgroundColor", col);
                                    //change color in store
                                    var t = theWidget._trainingStore.get(theWidget._trainingStore.data[row].ID);
                                    if (t) {
                                        t.COLOR = col;
                                        theWidget._trainingStore.put(t); //trigger store change event
                                    }
                                })
                                var ddb = new DropDownButton({
                                    label: "<span id=\"colorSwatch" + row + "\" style=\"border: 0; background-color:" + color + ";\">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>",
                                    dropDown: cp,
                                    id: "ddb" + row
                                });
                                ddb._destroyOnRemove = true;
                                return ddb;
                            }
                        }]];
                myGrid = new dataGrid({
                    id: "trainingGrid",
                    store: new objectStore({objectStore: this._trainingStore}),
                    structure: gridLayout
                });

                on(myGrid, "rowDblClick", function () {
                    var dataItem = myGrid.selection.getSelected();
                    if (dataItem && dataItem.length > 0) {
                        var graphics = theWidget._graphicsLayer.graphics;
                        var len = graphics.length;
                        for (var i = 0; i < len; i++) {
                            if (graphics[i].attributes.CLIENTID === dataItem[0].ID) {
                                theWidget.map.setExtent(graphics[i].geometry.getExtent(), true);//guanrantee display full polygon
                                return;
                            }
                        }
                    }
                });

                this.gridNode.appendChild(myGrid.domNode);
                myGrid.startup();
            }
            domConstruct.place('<img id="loadingicl" style="position: absolute;top:0;bottom: 0;left: 0;right: 0;margin:auto;z-index:100;" src="' + require.toUrl('jimu') + '/images/loading.gif">', this.domNode);
            this.hideLoading();
        },
        onClose: function () {
            //when tear down
            this.inherited(arguments);
            this.panRadio.set("checked", true);
            this._onRadioClick(0);
            if (this._graphicsLayer) {
//                this.map.removeLayer(this._graphicsLayer);
                this._graphicsLayer.hide();
            }
//            if (this._analyticLayer) {
//                this.map.removeLayer(this._analyticLayer);
//            }

//            if (this._trainingStore.data.length > 0) {
//                var data = this._trainingStore.data;
//                var ids = [];
//                for (var i in data) {
//                    ids.push(data[i].ID);
//                }
//                for (i in ids) {
//                    this._trainingStore.remove(ids[i]);
//                }
//            }
//            this._analyticLayer = null;
//            this._graphicsLayer = null;
//            this.unclassifyBtn.set("disabled", true);
        },
        _onRadioClick: function (panDrawEdit) {
            var theWidget = this;
            if (this._editTb && 'deactivate' in this._editTb) {
                this._editTb.deactivate();
            }
            if (this._drawTb && 'deactivate' in this._drawTb) {
                this._drawTb.deactivate();
            }
            if (this._editHdl) {
                this._editHdl.remove();
            }
            switch (panDrawEdit) { //0-pan, 1-draw, 2-edit
                case 0:
                    theWidget.enableWebMapPopup();
                    break;
                case 1: //draw new polygon
                    theWidget.disableWebMapPopup();
                    if (!theWidget._drawTb) {
                        theWidget._drawTb = new esri.toolbars.Draw(theWidget.map);
                        on(theWidget._drawTb, "draw-end", function (evt) {
                            theWidget._onDrawEnd(evt.geometry);
                        });
                    }
                    theWidget._drawTb.activate(esri.toolbars.Draw["POLYGON"]);
                    break;
                case 2: //eidt vertices of existing polygon
                    theWidget.disableWebMapPopup();
                    if (!theWidget._editTb) {
                        theWidget._editTb = new esri.toolbars.Edit(theWidget.map);
                    }
                    theWidget._editHdl = on(theWidget._graphicsLayer, "click", function (evt) {
                        event.stop(evt);//stop propagation, so onMapClick is not called
                        var options = {allowAddVertices: true, allowDeleteVertices: true, uniformScaling: true};
                        theWidget._editTb.activate(esri.toolbars.Edit.EDIT_VERTICES, evt.graphic, options);
                    });
                    on(theWidget.map, "click", function (evt) {
                        if (theWidget._editTb && 'deactivate' in theWidget._editTb)
                            theWidget._editTb.deactivate();
                    });
                    break;
            }
        },
        _onDrawEnd: function (geometry) {
            var graphic = new esri.Graphic(geometry, null, {"CLIENTID": this._runningIndex++, "LULC": ""});
            this._previousGraphics = [graphic];
            this.selectClassDialog.show();
        },
        _onAddTrainingClick: function () {
            var theWidget = this;
            var lulc = theWidget.classCombo.get("value");
            if (lulc.length === 0) {
                var msg = '<p><font color="red">';
                msg += '[ ' + lulc + ' ] is not a valid class';
                msg += '</font></p>';
                theWidget.selInfoNode.innerHTML = msg;
                setTimeout(function () {
                    theWidget.selInfoNode.innerHTML = "";
                }, 5000);
                return;
            }

            this.selectClassDialog.hide();
            for (var i = 0; i < this._previousGraphics.length; i++) {
                var t = {
                    ID: theWidget._previousGraphics[i].attributes.CLIENTID,
                    LULC: lulc,
                    COLOR: (function () {
                        //first check if there are existing in training
                        var t = theWidget._trainingStore.query({LULC: lulc});
                        if (t && t.length > 0) {
                            return t[0].COLOR;
                        }
                        //if not found, get color from classDef
                        t = theWidget._classDefStore.query({name: lulc});
                        if (t && t.length > 0) {
                            return t[0].color;
                        }
                        //if neither, return random color
                        return dojoColor.fromArray([Math.floor(Math.random() * 250), Math.floor(Math.random() * 250), Math.floor(Math.random() * 250)]).toHex();
                    }())
                }
                //add type in class to store
                var c = this._classDefStore.query({name: lulc});
                if (c && c.length === 0) {
                    this._classDefStore.add({id: "TYPEIN" + t.ID, value: t.LULC, name: t.LULC});
                    if (this.classCombo) {
                        this.classCombo.set("store", this._classDefStore);
                    }
                }
                //add graphic to map
                this._previousGraphics[i].setSymbol(theWidget._makeFillSymbol(t.COLOR));
                this._previousGraphics[i].attributes.LULC = t.LULC;
                this._graphicsLayer.add(this._previousGraphics[i]);
                //this will trigger store change event
                this._trainingStore.add(t);
            }
        },
        _onCancelTrainingClick: function () {
            this.selectClassDialog.hide();
        },
        _onRemoveClick: function () {
            var theWidget = this;
            var myGrid = registry.byId("trainingGrid");
            if (!myGrid)
                return;
            var dataItem = myGrid.selection.getSelected();
            if (dataItem && dataItem.length >= 1) {
                //this will trigger store change event
                this._trainingStore.remove(dataItem[0].ID);
            }
        },
        _onClassifyClick: function () {
            this.classifyBtn.set("label", "Processing...");
            this.classifyBtn.set("disabled", true);

            var theWidget = this;
            var graphics = this._graphicsLayer.graphics;
            var trainingSites; //memory store of training samples, each LULC class is one record having all polygons
            var len = graphics.length;

            for (var i = 0; i < len; i++) {
                var lulc = ((graphics[i] || {}).attributes || {}).LULC;
                if (lulc && lulc.length > 0) {
                    if (trainingSites) {
                        var mySite = trainingSites.query({name: lulc});
                        if (mySite && mySite.length === 1) {
                            var rings = this._toPolygon(graphics[i].geometry).rings;
                            for (var j = 0; j < rings.length; j++) {
                                mySite[0].geometry.addRing(rings[j]);
                            }
                        } else {
                            trainingSites.put({id: i, name: lulc, geometry: this._toPolygon(graphics[i].geometry)});
                        }
                    } else {
                        trainingSites = new memory({data: [{id: i, name: lulc, geometry: this._toPolygon(graphics[i].geometry)}]});
                    }
                }
            }
            this.trainingSites = trainingSites.data;//for external use

            var cont = {classDescriptions: JSON.stringify({"classes": trainingSites.data}), f: "json"};
            if (this.imageServiceLayer.renderingRule)
                cont.renderingRule = JSON.stringify(this.imageServiceLayer.renderingRule.toJson());
            if (this.imageServiceLayer.mosaicRule)
                cont.mosaicRule = JSON.stringify(this.imageServiceLayer.mosaicRule.toJson());
            esri.request({
                url: this.imageServiceLayer.url + "/computeClassStatistics",
                content: cont
            }, {usePost: false}).then(function (response, io) {
                theWidget.classifier = response.GSG;//for external use
                var rasterFunciton = {rasterFunction: "Colormap", rasterFunctionArguments: {Colormap: [], Raster: {}}, outputPixelType: "U8"};
                rasterFunciton.rasterFunctionArguments.Colormap = (function () {
                    var cm = [];
                    var d = trainingSites.data;
                    for (var i = 0; i < d.length; i++) {
                        cm.push([d[i].id].concat(
                                function () {
                                    var a = theWidget._trainingStore.query({LULC: d[i].name});
                                    if (a && a.length > 0) {
                                        return dojoColor.fromString(a[0].COLOR).toRgb();
                                    } else {
                                        return [Math.floor(Math.random() * 250), Math.floor(Math.random() * 250), Math.floor(Math.random() * 250)]
                                    }
                                }()));
                    }
                    return cm;
                }());

                rasterFunciton.rasterFunctionArguments.Raster = {
                    rasterFunction: "MLClassify",
                    rasterFunctionArguments: {
                        SignatureFile: response.GSG,
                        Raster: (function () {
                            if (theWidget.imageServiceLayer.renderingRule) {
                                var rf = theWidget.imageServiceLayer.renderingRule.toJson();
                                //rf.rasterFunctionArguments = { Raster: "$$" };

                                return rf;
                            }
                            return "$$";
                        }())
                    },
                    outputPixelType: "U8"
                };

                if (!theWidget._analyticLayer) {
                    var alyr = new esri.layers.ArcGISImageServiceLayer(theWidget.imageServiceLayer.url, {id: "resultLayer"});
                    if (theWidget.imageServiceLayer.mosaicRule)
                        alyr.setMosaicRule(theWidget.imageServiceLayer.mosaicRule);
                    alyr.setVisibility(false);
                    alyr.setImageFormat("png24");
                    theWidget._analyticLayer = alyr;
                    theWidget.map.addLayer(alyr);
                }


                theWidget._analyticLayer.setRenderingRule(new RasterFunction(rasterFunciton));


                theWidget._analyticLayer.setVisibility(true);
//                theWidget.imageServiceLayer.setVisibility(false);

                theWidget.classifyBtn.set("label", "Classify");
                theWidget.classifyBtn.set("disabled", true);
                theWidget.unclassifyBtn.set("disabled", false);
            }, function (err, io) {
                console.log(err);
                var msg = '<p><font color="red">';
                msg += err.message;
                if (err.details && err.details.length >= 0)
                    msg += " (" + err.details[0] + ")";
                msg += '</font></p>';
                theWidget.infoNode.innerHTML = msg;
                setTimeout(function () {
                    theWidget.infoNode.innerHTML = "";
                }, 5000);

                theWidget.classifyBtn.set("label", "Classify");
                theWidget.classifyBtn.set("disabled", false);
                theWidget.unclassifyBtn.set("disabled", true);
            });
        },
        _onUnclassifyClick: function () {
            this.classifyBtn.set("disabled", false);
            this.unclassifyBtn.set("disabled", true);
            this.imageServiceLayer.setVisibility(true);
//            this._analyticLayer.setVisibility(false);
            this.map.removeLayer(this._analyticLayer);
            this._analyticLayer = null;
        },
        _makeFillSymbol: function (inColor) {
            var lineColor, fillColor;
            if (inColor) {
                lineColor = new dojoColor(inColor);
                lineColor.a = 1;
                fillColor = new dojoColor(inColor);
                fillColor.a = 0.2;
            } else {
                r = Math.floor(Math.random() * 250);
                g = Math.floor(Math.random() * 250);
                b = Math.floor(Math.random() * 250);
                lineColor = new dojoColor([r, g, b, 1]);
                fillColor = new dojoColor([r, g, b, 0.2]);
            }
            var symbol = new esri.symbol.SimpleFillSymbol(esri.symbol.SimpleFillSymbol.STYLE_SOLID,
                    new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, lineColor, 4), fillColor);
            return symbol;
        },
        _toPolygon: function (geometry) {
            if (geometry.type === "polygon") {
                return (new esri.geometry.Polygon(geometry.toJson()));
            } else if (geometry.type === "extent") {
                var ext = new esri.geometry.Extent(geometry.toJson());
                var poly = new esri.geometry.Polygon(geometry.spatialReference);
                poly.addRing([[ext.xmin, ext.ymin], [ext.xmin, ext.ymax], [ext.xmax, ext.ymax], [ext.xmax, ext.ymin], [ext.xmin, ext.ymin]]);
                return poly;
            }
            return null;
        },
        _guid: function () {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        },
        disableWebMapPopup: function () {
            if (this.map && this.map.webMapResponse) {
                var handler = this.map.webMapResponse.clickEventHandle;
                if (handler) {
                    handler.remove();
                    this.map.webMapResponse.clickEventHandle = null;
                }
            }
        },
        enableWebMapPopup: function () {
            if (this.map && this.map.webMapResponse) {
                var handler = this.map.webMapResponse.clickEventHandle;
                var listener = this.map.webMapResponse.clickEventListener;
                if (listener && !handler) {
                    this.map.webMapResponse.clickEventHandle = on(this.map, 'click', lang.hitch(this.map, listener));
                }
            }
        },
        showLoading: function () {
            esri.show(dom.byId("loadingicl"));
        },
        hideLoading: function () {
            esri.hide(dom.byId("loadingicl"));
        }
    });
    clazz.hasLocale = false;
    clazz.hasSettingPage = false;
    clazz.hasSettingUIFile = false;
    clazz.hasSettingLocale = false;
    clazz.hasSettingStyle = false;
    return clazz;
});

