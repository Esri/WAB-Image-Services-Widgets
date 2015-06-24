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
  "esri/request",
  "esri/layers/RasterFunction",
  "esri/layers/MosaicRule",
  "esri/tasks/query",
  "esri/tasks/QueryTask",
  "esri/geometry/Extent",
  "esri/layers/ArcGISImageServiceLayer",
  "esri/layers/ImageServiceParameters",
  "dojo/dom-construct",
  "dojo/dom-style",
  "dojo/html",
  "esri/geometry/Polygon",
  "dojo/i18n!./nls/strings",
  "esri/arcgis/Portal",
  "esri/dijit/PopupTemplate",
  "esri/symbols/SimpleMarkerSymbol",
  "esri/symbols/SimpleLineSymbol",
  "esri/Color",
  "esri/tasks/GeometryService", "esri/tasks/ProjectParameters",
  "esri/SpatialReference",
  "esri/units",
  "esri/geometry/scaleUtils",
  "esri/geometry/webMercatorUtils",
  "dojox/gfx",
  "dojox/gfx/fx",
  "esri/dijit/Popup",
  "esri/symbols/SimpleFillSymbol",
  "esri/symbols/PictureMarkerSymbol",
  "esri/graphic",
  "dojox/json/ref",
  "dijit/form/Select",
  "dijit/form/Button",
  "dijit/form/RadioButton",
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
                Legend,
                arcgisUtils,
                on,
                registry,
                lang,
                dom,
                domConstruct,
                esriRequest,
                RasterFunction,
                MosaicRule,
                Query, QueryTask, Extent,
                ArcGISImageServiceLayer,
                ImageServiceParameters,
                domConstruct, domStyle, html, Polygon, strings, arcgisPortal, PopupTemplate, SimpleMarkerSymbol, SimpleLineSymbol, Color, GeometryService, ProjectParameters, SpatialReference, units, scaleUtils, webMercatorUtils, gfx, gfxfx, Popup, SimpleFillSymbol, PictureMarkerSymbol, Graphic) {
          var clazz = declare([BaseWidget, _WidgetsInTemplateMixin], {
            templateString: template,
            name: 'OrientedImagery',
            baseClass: 'jimu-widget-OrientedImagery',
            layerInfos: [],
            primaryLayerIndex: null,
            secondaryLayerIndex: null,
            primaryLayer: null,
            secondaryLayer: null,
            layerSwipe: null,
            layerList: null,
            saveResult: null,
            position: null,
            refNum: 3,
            imgSource: null,
            prevSelection: null,
            navigationTool: null,
            startup: function () {
              this.inherited(arguments);
              domConstruct.place('<img id="loadingOrientedImagery" style="position: absolute;top:0;bottom: 0;left: 0;right: 0;margin:auto;z-index:100;" src="' + require.toUrl('jimu') + '/images/loading.gif">', this.domNode);
              this.hideLoading();
            },
            postCreate: function () {

              registry.byId("selectCameraType").on("change", lang.hitch(this, this.selectFeatureService));
              registry.byId("imagePoints").on("change", lang.hitch(this, this.turningOnOffFeatures, 'imagePoints'));
              registry.byId("coveragePolygon").on("change", lang.hitch(this, this.turningOnOffFeatures, "coveragePolygon"));
              registry.byId("arrow").on("change", lang.hitch(this, this.turningOnOffFeatures, "arrow"));
              this.loadFeatureServicesFromConfig();
              this.queryFeatureService();

              if (this.map) {
                this.map.on("click", lang.hitch(this, this.createBoundingBox));
                this.map.on("update-start", lang.hitch(this, this.showLoading));
                this.map.on("update-end", lang.hitch(this, this.hideLoading));
              }
            },
            onOpen: function () {
            },
            selectFeatureService: function () {
              this.map.graphics.clear();
              this.queryFeatureService();
            },
            loadFeatureServicesFromConfig: function () {
              for (var k = 0; k <= this.config.featureService.length - 1; k++) {
                registry.byId("selectCameraType").addOption({label: this.config.featureService[k].label, value: k});
              }
            },
            showImage: function () {
              domStyle.set("imageButton", "display", "none");
              domStyle.set("imageAndNavigation", "display", "block");
              this.animation.play();
            },
            turningOnOffFeatures: function (selectedFeatures) {
              switch (selectedFeatures) {
                case 'imagePoints' :
                {

                  if (this.map.graphics.graphics.length > this.featureLength) {
                    if (registry.byId("imagePoints").get("checked")) {
                      for (var s = 0; s <= this.map.graphics.graphics.length - 1; s++) {
                        if (this.map.graphics.graphics[s].symbol.style == "circle")
                          this.map.graphics.graphics[s].show();
                      }
                    }
                    else {
                      for (var s = 0; s <= this.map.graphics.graphics.length - 1; s++) {
                        if (this.map.graphics.graphics[s].symbol.style == "circle")
                          this.map.graphics.graphics[s].hide();
                      }
                    }
                  } else {
                    if (registry.byId("imagePoints").get("checked")) {
                      this.map.graphics.show();
                    } else {
                      this.map.graphics.hide();
                    }
                  }

                  break;
                }
                case 'coveragePolygon' :
                {
                  if (registry.byId("coveragePolygon").get("checked")) {
                    for (var s = 0; s <= this.map.graphics.graphics.length - 1; s++) {
                      if (this.map.graphics.graphics[s].symbol.style == "none") {
                        this.map.graphics.graphics[s].show();
                      }
                    }
                  } else {
                    for (var s = 0; s <= this.map.graphics.graphics.length - 1; s++) {
                      if (this.map.graphics.graphics[s].symbol.style == "none") {
                        this.map.graphics.graphics[s].hide();
                      }
                    }
                  }
                  break;
                }
                case 'arrow' :
                {
                  if (registry.byId("arrow").get("checked")) {
                    for (var s = 0; s <= this.map.graphics.graphics.length - 1; s++) {
                      if (this.map.graphics.graphics[s].symbol.angle) {
                        this.map.graphics.graphics[s].show();
                      }
                    }
                  } else {
                    for (var s = 0; s <= this.map.graphics.graphics.length - 1; s++) {
                      if (this.map.graphics.graphics[s].symbol.angle) {
                        this.map.graphics.graphics[s].hide();
                      }
                    }
                  }
                  break;
                }
              }
            },
            queryFeatureService: function () {

              var value = registry.byId("selectCameraType").get("value");
              this.url = this.config.featureService[value].url;

              var query = new Query();
              query.outFields = ["*"];
              query.where = "1=1";
              query.outSpatialReference = new SpatialReference(102100);
              query.returnGeometry = true;
              query.spatialRelationship = Query.SPATIAL_REL_INTERSECTS;

              var queryTask = new QueryTask(this.url);
              queryTask.execute(query, lang.hitch(this, function (response) {
                this.addGraphicsOnMap(response.features);
                this.features = response.features;

                var getMapMaximumZoomLevel = this.map.getMaxZoom();
                this.map.centerAndZoom(this.features[0].geometry, getMapMaximumZoomLevel);
                this.addGraphicsOnMap(response.features);
                for (var d = 0; d <= this.features.length - 1; d++) {
                  if (this.map.graphics.graphics[d].symbol.angle) {
                    this.map.graphics.remove(this.map.graphics.graphics[d]);
                  }
                }
                for (var p = 0; p <= this.features.length - 1; p++) {
                  this.showHideDirectionArrow(this.features[p]);
                }
                for (var i = 0; i <= this.features.length - 1; i++) {
                  if (this.features[i].attributes.AvgHtAG == null) {
                    this.features[i].attributes.AvgHtAG = 1.8;
                  }
                  if (this.features[i].attributes.CamHeading == null) {
                    this.features[i].attributes.CamHeading = 0;
                  }
                  if (this.features[i].attributes.CamPitch == null) {
                    this.features[i].attributes.CamPitch = 90;
                  }
                  if (this.features[i].attributes.CamRoll == null) {
                    this.features[i].attributes.CamRoll = 0;
                  }
                  if (this.features[i].attributes.FarDist == null) {
                    this.features[i].attributes.FarDist = 20;
                  }
                  if (this.features[i].attributes.HFOV == null) {
                    this.features[i].attributes.HFOV = 60;
                  }
                  if (this.features[i].attributes.VFOV == null) {
                    this.features[i].attributes.VFOV = 40;
                  }
                }

                this.hideLoading();
              }));
            },
            activate: function (imageAttributes, number, xco, yco) {
              for (var a = 0; a <= this.features.length - 1; a++) {
                if (this.map.graphics.graphics[a].symbol.color.b == 255) {
                  this.map.graphics.graphics[a].setSymbol(this.symbol);
                }
              }


              for (var z = 0; z <= this.features.length - 1; z++) {
                if (this.map.graphics.graphics[z].geometry.x == imageAttributes.geometry.x && this.map.graphics.graphics[z].geometry.y == imageAttributes.geometry.y) {
                  this.map.graphics.graphics[z].setSymbol(this.highlightSymbol);

                }

              }

              document.getElementById("img").src = require.toUrl("jimu") + "/images/loading.gif";
              xco = xco - 100;
              yco = yco - 100;
              var nom = (xco * 0) + (yco * 50);
              var denom1 = Math.sqrt(((Math.pow(xco, 2)) + Math.pow(yco, 2)));
              var denom2 = Math.sqrt(((Math.pow(0, 2)) + Math.pow(50, 2)));
              var formula = (nom / (denom1 * denom2));
              this.angleToRotate = (Math.acos(formula) * 180) / Math.PI;
              /*if(xco> 150 && yco > 150){
               this.angleToRotate = Math.abs(this.angleToRotate);
               }else {
               if(xco>150 && yco < 150){
               this.angleToRotate = 180 + this.angleToRotate;
               }else {*/
              if (xco < 0 && yco < 0) {
                this.angleToRotate = 360 - this.angleToRotate;
              } else {
                if (xco < 0 && yco > 0) {
                  this.angleToRotate = 360 - this.angleToRotate;
                }
              }


              this.animation = new gfxfx.animateTransform({
                duration: 700,
                shape: this.group,
                transform: [{
                    name: "rotategAt",
                    start: [0, 100, 100],
                    end: [this.angleToRotate, 100, 100]
                  }]

              });

              if (this.prevSelection != null) {
                this.group.children[this.prevSelection].setFill("blue");
              }
              this.group.children[number].setFill("red");


              document.getElementById("img").src = imageAttributes.attributes.ImageRef;
              if (!registry.byId("imageDialog").open) {
                registry.byId("imageDialog").show();
              }
              domConstruct.destroy("imageDialog_underlay");
              this.animation.play();

              this.prevSelection = number;

              this.hideLoading();
            },
            createNavigationTool: function () {
              this.navigationTool = gfx.createSurface("navigationTool", 200, 200);
              this.group = this.navigationTool.createGroup();
              (this.group.createCircle({cx: 100, cy: 100, r: 80}).setStroke("blue"));
              on(this.navigationTool, "mouseenter", lang.hitch(this, function () {
                this.group.children[0].setFill("white");
              }));
              on(this.navigationTool, "mouseleave", lang.hitch(this, function () {
                this.group.children[0].setFill(null);
              }));
              this.group.createText({x: 160, y: 100, text: "N", align: "start"}).setFill("red");

            },
            addGraphicsOnMap: function (features) {
              this.highlightSymbol = new SimpleMarkerSymbol();
              this.highlightSymbol.setStyle(SimpleMarkerSymbol.STYLE_CIRCLE);
              this.highlightSymbol.setSize(20);
              this.highlightSymbol.setColor(new Color([0, 0, 255, 0.5]));
              this.symbol = new SimpleMarkerSymbol();
              this.symbol.setStyle(SimpleMarkerSymbol.STYLE_CIRCLE);
              this.symbol.setSize(10);
              this.symbol.setColor(new Color([255, 0, 0, 0.5]));
              this.map.graphics.clear();
              for (var i = 0; i <= features.length - 1; i++) {
                var graphic = features[i];
                graphic.setSymbol(this.symbol);
                this.map.graphics.add(graphic);
              }
              this.featureLength = features.length;
            },
            addPointOnMap: function (evt1) {
              var symbol = new SimpleMarkerSymbol();
              symbol.setStyle(SimpleMarkerSymbol.STYLE_CROSS);
              symbol.setSize(20);
              symbol.setColor(new Color([19, 34, 200, 0.5]));
              this.map.graphics.add(new Graphic(evt1.mapPoint, symbol));
            },
            showHideCoveragePolygon: function (polygon) {
              var symbol = new SimpleFillSymbol();
              symbol.setStyle(SimpleFillSymbol.STYLE_NULL);
              symbol.setOutline(new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([255, 0, 0]), 2));
              symbol.setColor(new Color([0, 255, 0, 0.5]));
              this.map.graphics.add(new Graphic(polygon, symbol));

              this.map.graphics.graphics[this.map.graphics.graphics.length - 1].hide();
            },
            showHideDirectionArrow: function (feature) {
              var symbol = new PictureMarkerSymbol();
              // var x= this.selectedPoint.x - geometry.x;
              // var y = this.selectedPoint.y - geometry.y;
              // this.angle = (Math.atan2((0-y),x)*180)/Math.PI;

              //symbol.setUrl(require.toUrl('jimu') + '/images/arrow.png');
              symbol.setUrl(require.toUrl("widgets") + "/OrientedImagery/images/arrow.png");
              symbol.setAngle(feature.attributes.CamHeading - 90);
              symbol.setWidth(60);
              symbol.setHeight(40);
              this.map.graphics.add(new Graphic(feature.geometry, symbol));
              this.map.graphics.graphics[this.map.graphics.graphics.length - 1].hide();
            },
            createBoundingBox: function (evt) {
              this.showLoading();

              if (this.map.graphics.graphics.length > this.featureLength) {


                for (var w = (this.map.graphics.graphics.length - 1); w >= 0; w--) {
                  if (this.map.graphics.graphics[w].symbol.style == "none")
                    this.map.graphics.remove(this.map.graphics.graphics[w]);
                }
                for (var v = this.map.graphics.graphics.length - 1; v >= 0; v--) {
                  if (this.map.graphics.graphics[v].symbol.style === "cross")
                    this.map.graphics.remove(this.map.graphics.graphics[v]);
                }
              }
              //registry.byId("coveragePolygon").set("checked",false);
              // registry.byId("arrow").set("checked",false);

              this.addPointOnMap(evt);
              document.getElementById("img").src = require.toUrl("jimu") + "/images/loading.gif";

              if (registry.byId("imageDialog").open) {
                // registry.byId("imageDialog").hide();
              }
              this.refNum = 3;
              this.prevSelection = null;

              if (this.navigationTool != null) {
                if (this.navigationTool.children.length != 0) {

                  this.navigationTool.destroy();

                }
              }
              this.selectedPoint = evt.mapPoint;

              var attributes = this.features[0].attributes;
              this.farDistance = attributes.FarDist;
              this.xmin = this.selectedPoint.x - this.farDistance;
              this.xmax = this.selectedPoint.x + this.farDistance;
              this.ymin = this.selectedPoint.y - this.farDistance;
              this.ymax = this.selectedPoint.y + this.farDistance;

              var boundingBox = new Extent(this.xmin, this.ymin, this.xmax, this.ymax, new SpatialReference({wkid: 102100}));
              this.imagesInRange = [];
              for (var i = 0; i <= this.features.length - 1; i++) {
                if (boundingBox.contains(this.features[i].geometry)) {

                  this.coveragePolygon(this.features[i]);
                }
              }
              if (registry.byId("coveragePolygon").get("checked")) {
                this.turningOnOffFeatures("coveragePolygon");
              }
              if (this.imagesInRange.length == 0) {
                html.set(this.noImage, "No image available of the selected asset.");
                registry.byId("imageDialog").hide();
                this.hideLoading();
              } else {
                html.set(this.noImage, "");
                this.calculatingGeometricValues();
                if (this.suitability.length !== 0) {
                  this.activate(this.suitability[0].imageAttribute, 3, this.group.children[3].shape.cx, this.group.children[3].shape.cy);
                }
              }
            },
            coveragePolygon: function (feature) {
              var NearDistance = (feature.attributes.AvgHtAG * Math.sin(((feature.attributes.CamPitch - (feature.attributes.VFOV / 2)) * Math.PI) / 180));

              var p1x = feature.geometry.x + (NearDistance * Math.sin((((feature.attributes.CamHeading - (feature.attributes.HFOV) / 2)) * Math.PI) / 180));
              var p1y = feature.geometry.y + (NearDistance * Math.cos((((feature.attributes.CamHeading - (feature.attributes.HFOV) / 2)) * Math.PI) / 180));
              var p2x = feature.geometry.x + (this.farDistance * Math.sin((((feature.attributes.CamHeading - (feature.attributes.HFOV) / 2)) * Math.PI) / 180));
              var p2y = feature.geometry.y + (this.farDistance * Math.cos((((feature.attributes.CamHeading - (feature.attributes.HFOV) / 2)) * Math.PI) / 180));
              var p3x = feature.geometry.x + (NearDistance * Math.sin((((feature.attributes.CamHeading + (feature.attributes.HFOV) / 2)) * Math.PI) / 180));
              var p3y = feature.geometry.y + (NearDistance * Math.cos((((feature.attributes.CamHeading + (feature.attributes.HFOV) / 2)) * Math.PI) / 180));
              var p4x = feature.geometry.x + (this.farDistance * Math.sin((((feature.attributes.CamHeading + (feature.attributes.HFOV) / 2)) * Math.PI) / 180));
              var p4y = feature.geometry.y + (this.farDistance * Math.cos((((feature.attributes.CamHeading + (feature.attributes.HFOV) / 2)) * Math.PI) / 180));
              if (NearDistance < 0) {
                var polygonJson = {"rings": [[[p2x, p2y], [p4x, p4y], [p1x, p1y], [p2x, p2y]]], "spatialReference": {"wkid": 102100}};
              } else {
                var polygonJson = {"rings": [[[p2x, p2y], [p4x, p4y], [p3x, p3y], [p1x, p1y], [p2x, p2y]]], "spatialReference": {"wkid": 102100}};
              }

              var polygon = new Polygon(polygonJson);

              this.polygon1 = polygon;
              if (polygon.contains(this.selectedPoint)) {

                this.imagesInRange.push(feature);
                this.showHideCoveragePolygon(polygon);

              }
            },
            calculatingGeometricValues: function () {
              this.createNavigationTool();
              this.selectBestImage();
              for (var i = 0; i <= this.suitability.length - 1; i++) {
                var x1 = this.selectedPoint.y - this.suitability[i].imageAttribute.geometry.y;
                var x2 = this.selectedPoint.x - this.suitability[i].imageAttribute.geometry.x;
                this.angle = (Math.atan2(x1, x2) * 180) / Math.PI;
                this.angle = this.angle + 180;
                this.x = Math.sin((this.angle * Math.PI) / 180) * 50 + 100;
                this.y = Math.cos((this.angle * Math.PI) / 180) * 50 + 100;
                this.group.createLine({x1: 100, y1: 100, x2: this.x, y2: this.y}).setStroke("blue");
                (this.group.createCircle({cx: this.x, cy: this.y, r: 5}).setFill('blue').setStroke('blue')).on("click", lang.hitch(this, this.activate, this.suitability[i].imageAttribute, this.refNum, this.x, this.y));
                this.refNum = this.refNum + 2;
              }


            },
            selectBestImage: function () {
              this.suitability = [];
              for (var i = 0; i <= this.imagesInRange.length - 1; i++) {
                var CamToTarget = (Math.atan2((this.imagesInRange[i].geometry.y - this.selectedPoint.y), (this.imagesInRange[i].geometry.x - this.selectedPoint.x)) * 180) / Math.PI;
                var dd = this.imagesInRange[i].attributes.CamHeading - CamToTarget;
                if (dd < 0) {
                  dd = dd + 360;
                }
                var F = 2 * (Math.abs(CamToTarget - this.imagesInRange[i].attributes.CamHeading) / this.imagesInRange[i].attributes.HFOV);
                var Distance = Math.sqrt((Math.pow((this.selectedPoint.x - this.imagesInRange[i].geometry.x), 2) + (Math.pow((this.selectedPoint.y - this.imagesInRange[i].geometry.y), 2))));
                var suitability = (Distance * (F + 1));
                this.suitability.push({"suitability": suitability, "imageAttribute": this.imagesInRange[i]});
                this.suitability.sort(function (a, b) {
                  return a.suitability - b.suitability
                });

              }
            },
            showLoading: function () {
              esri.show(dom.byId("loadingOrientedImagery"));
            },
            hideLoading: function () {
              esri.hide(dom.byId("loadingOrientedImagery"));
            }
          });
          clazz.hasLocale = false;
          return clazz;
        });