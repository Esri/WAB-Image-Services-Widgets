//////////////////////////////////////////////////////////////////////////////
// Copyright 2013 Esri
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
//////////////////////////////////////////////////////////////////////////////

define([
    "dojo/_base/declare",
    "dojo/topic",
    "dojo/_base/lang",
    "./PortalWebMapAnnotationTemplates",
    "esri/geometry/Polygon",
    "esri/geometry/Polyline",
    "esri/geometry/Point",
    "esri/geometry/Extent",
    "esri/SpatialReference"
],
    function (declare, topic, lang, PortalWebMapAnnotationTemplates, Polygon, Polyline, Point, Extent, SpatialReference) {
        return declare(
            [PortalWebMapAnnotationTemplates],
            {
                pointIconUrl: "",

                constructor: function () {
                    //get point icon url
                    var portalPublisherConfig = null;
//                    topic.publish(VIEWER_GLOBALS.EVENTS.CONFIGURATION.GET_ENTRY, "portalPublisher", function (portalPublisherConf) {
//                        portalPublisherConfig = portalPublisherConf;
//                    });
                    if (portalPublisherConfig != null && lang.isObject(portalPublisherConfig)) {
                        this.pointIconUrl = portalPublisherConfig.pointIconUrl;
                    }

                },
                createAnnotationLayer: function (host) {
                    var allGraphics;
                    topic.publish(VIEWER_GLOBALS.EVENTS.DRAW.USER.GET_USER_GRAPHICS, lang.hitch(this, function (gra) {
                        allGraphics = gra;
                    }));
                    if (allGraphics == null || !lang.isArray(allGraphics)) {
                        return null;
                    }
                    var sortedGeometries = this._sortGeometries(allGraphics);

                    if (sortedGeometries == null) {
                        return null;
                    }
                    //check to see if there are graphics
                    if (sortedGeometries.points.length == 0 && sortedGeometries.lines.length == 0 && sortedGeometries.polygons.length == 0) {
                        return null;

                    }
                    var annotationLayerObject = lang.mixin({id: ("mapNotes_" + new Date().getTime()), featureCollection: {layers: []} }, this.annotationLayerRootMixin);
                    var lineLayerTemplate = this.getLineLayerTemplate();
                    var pointLayerTemplate = this.getPointLayerTemplate();
                    if (host != "") {
                        this.preprocessPointLayerDefinition(host, pointLayerTemplate);
                    }
                    var polygonLayerTemplate = this.getPolygonLayerTemplate();
                    var textLayerDefinition = this.getTextLayerTemplate();


                    //add the graphics to the layers
                    if (sortedGeometries.points.length > 0) {
                        this._applyPointGeometriesToLayer(sortedGeometries.points, pointLayerTemplate);
                        pointLayerTemplate.nextObjectId = 1;
                    }
                    if (sortedGeometries.lines.length > 0) {
                        this._applyLineGeometriesToLayer(sortedGeometries.lines, lineLayerTemplate);
                        pointLayerTemplate.nextObjectId = 1;
                    }
                    if (sortedGeometries.polygons.length > 0) {
                        this._applyPolygonGeometriesToLayer(sortedGeometries.polygons, polygonLayerTemplate);
                        pointLayerTemplate.nextObjectId = 1;
                    }

                    //push the geometry layers to the annotation layer
                    annotationLayerObject.featureCollection.layers.push(polygonLayerTemplate);
                    annotationLayerObject.featureCollection.layers.push(lineLayerTemplate);
                    annotationLayerObject.featureCollection.layers.push(textLayerDefinition);
                    annotationLayerObject.featureCollection.layers.push(pointLayerTemplate);

                    return annotationLayerObject;

                },
                _applyPolygonGeometriesToLayer: function (polygons, layer) {
                    if (lang.isObject(layer) && layer.featureSet != null && lang.isObject(layer.featureSet) && layer.featureSet.features != null && lang.isArray(layer.featureSet.features)) {
                        var currentPolygon;
                        for (var i = 0; i < polygons.length; i++) {
                            currentPolygon = polygons[i];
                            layer.featureSet.features.push({
                                geometry: {
                                    rings: currentPolygon.rings,
                                    spatialReference: { wkid: currentPolygon.spatialReference.wkid }
                                },
                                attributes: {
                                    TYPEID: 0,
                                    VISIBLE: 1,
                                    TITLE: "Area",
                                    OBJECTID: i
                                }
                            })
                        }
                    }
                },
                _applyLineGeometriesToLayer: function (lines, layer) {
                    if (lang.isObject(layer) && lang.isObject(layer.featureSet) && lang.isArray(layer.featureSet.features)) {
                        var currentLine;
                        for (var i = 0; i < lines.length; i++) {
                            currentLine = lines[i];
                            layer.featureSet.features.push({
                                geometry: {
                                    paths: currentLine.paths,
                                    spatialReference: { wkid: currentLine.spatialReference.wkid }
                                },
                                attributes: {
                                    TYPEID: 0,
                                    VISIBLE: 1,
                                    TITLE: "Line",
                                    OBJECTID: i
                                }
                            })
                        }
                    }
                },
                _applyPointGeometriesToLayer: function (points, layer) {
                    if (lang.isObject(layer) && lang.isObject(layer.featureSet) && lang.isArray(layer.featureSet.features)) {
                        var currentPoint;
                        for (var i = 0; i < points.length; i++) {
                            currentPoint = points[i];
                            layer.featureSet.features.push({
                                geometry: {
                                    x: currentPoint.x,
                                    y: currentPoint.y,
                                    spatialReference: { wkid: currentPoint.spatialReference.wkid }
                                },
                                attributes: {
                                    TYPEID: 0,
                                    VISIBLE: 1,
                                    TITLE: "Point",
                                    OBJECTID: i
                                }
                            })
                        }
                    }
                },
                _sortGeometries: function (graphics) {
                    //returns object with "point","line","polygon" members
                    var graphicsObject = { points: [], lines: [], polygons: [] };
                    var currentGraphic;
                    for (var i = 0; i < graphics.length; i++) {
                        currentGraphic = graphics[i];
                        if (lang.isObject(currentGraphic.geometry)) {
                            if (currentGraphic.geometry instanceof Polygon) {
                                graphicsObject.polygons.push(currentGraphic.geometry);

                            }
                            else if (currentGraphic.geometry instanceof Polyline) {
                                graphicsObject.lines.push(currentGraphic.geometry);

                            }
                            else if (currentGraphic.geometry instanceof Point) {

                                graphicsObject.points.push(currentGraphic.geometry);
                            }
                            else if (currentGraphic.geometry instanceof Extent) {
                                var asPoly = this._extentToPolygon(currentGraphic.geometry);
                                if (asPoly != null) {
                                    graphicsObject.polygons.push(asPoly);
                                }
                            }
                        }
                    }
                    return graphicsObject;

                },
                _extentToPolygon: function (extentGeometry) {
                    if (extentGeometry == null || !lang.isObject(extentGeometry.spatialReference)) {
                        return null;
                    }
                    //left, right, top, bottom, wkid
                    var left = extentGeometry.xmin;
                    var right = extentGeometry.xmax;
                    var top = extentGeometry.ymax;
                    var bottom = extentGeometry.ymin;
                    var wkid = extentGeometry.spatialReference.wkid;

                    var spatialReference = new SpatialReference({ wkid: wkid });
                    var polygonGeometry = new Polygon(spatialReference);
                    var bottomLeft = new Point(left, bottom);
                    var topLeft = new Point(left, top);
                    var topRight = new Point(right, top);
                    var bottomRight = new Point(right, bottom);
                    polygonGeometry.addRing([bottomLeft, topLeft, topRight, bottomRight, bottomLeft]);
                    return polygonGeometry;
                },

                getLineLayerTemplate: function () {
                    var lineLayer = lang.mixin({ nextObjectId: 0, featureSet: { geometryType: VIEWER_GLOBALS.ESRI_GEOMETRY_TYPES.LINE, features: []} }, this.annotationLayerMixin);
                    var lineLayerDefinition = lang.mixin({ templates: [] }, this.genericLayerDefinitionMixin);
                    lang.mixin(lineLayerDefinition, this.lineLayerDefinitionMixin);
                    lineLayer.layerDefinition = lineLayerDefinition;
                    return lineLayer;

                },
                getPointLayerTemplate: function () {
                    var pointLayer = lang.mixin({ nextObjectId: 0, featureSet: { geometryType: VIEWER_GLOBALS.ESRI_GEOMETRY_TYPES.POINT, features: []} }, this.annotationLayerMixin);
                    var pointLayerDefinition = lang.mixin({ templates: [] }, this.genericLayerDefinitionMixin);
                    lang.mixin(pointLayerDefinition, this.pointLayerDefinitionMixin);
                    pointLayer.layerDefinition = pointLayerDefinition;
                    return pointLayer;
                },
                getPolygonLayerTemplate: function () {
                    var polygonLayer = lang.mixin({ nextObjectId: 0, featureSet: { geometryType: VIEWER_GLOBALS.ESRI_GEOMETRY_TYPES.POLYGON, features: []} }, this.annotationLayerMixin);
                    var polygonLayerDefinition = lang.mixin({ templates: [] }, this.genericLayerDefinitionMixin);
                    lang.mixin(polygonLayerDefinition, this.polygonLayerDefinitionMixin);
                    polygonLayer.layerDefinition = polygonLayerDefinition;
                    return polygonLayer;

                },
                getTextLayerTemplate: function () {
                    var textLayer = lang.mixin({ nextObjectId: 0, featureSet: { geometryType: VIEWER_GLOBALS.ESRI_GEOMETRY_TYPES.POINT, features: []} }, this.annotationLayerMixin);
                    var textLayerDefinition = lang.mixin({ templates: [] }, this.genericLayerDefinitionMixin);
                    lang.mixin(textLayerDefinition, this.textLayerDefinitionMixin);
                    //add the text field to the fields
                    textLayerDefinition.fields.push(
                        {
                            name: "TEXT",
                            type: VIEWER_GLOBALS.ESRI_FIELD_TYPES.STRING,
                            alias: "Text",
                            length: 255,
                            editable: true
                        }
                    );
                    textLayer.layerDefinition = textLayerDefinition;
                    return textLayer;
                },
                preprocessPointLayerDefinition: function (host, pointLayerObject) {
                    if (!lang.isObject(pointLayerObject) || !lang.isObject(pointLayerObject.layerDefinition)) {
                        return;
                    }
                    var layerDefinition = pointLayerObject.layerDefinition;
                    var shinyFound = false;
                    var stickFound = false;
                    if (layerDefinition.drawingInfo && layerDefinition.drawingInfo.renderer && lang.isArray(layerDefinition.drawingInfo.renderer.uniqueValueInfos)) {
                        var currValInfo;
                        for (var i = 0; i < layerDefinition.drawingInfo.renderer.uniqueValueInfos.length; i++) {
                            currValInfo = layerDefinition.drawingInfo.renderer.uniqueValueInfos[i];
                            if (currValInfo.label === "Stickpin") {
                                if (lang.isObject(currValInfo.symbol)) {
                                    stickFound = true;
                                    currValInfo.symbol.url = this.pointIconUrl;
                                }
                            }
                            else if (currValInfo.label === "Pushpin") {
                                if (lang.isObject(currValInfo.symbol)) {
                                    shinyFound = true;
                                    currValInfo.symbol.url = this.pointIconUrl;
                                }
                            }
                            if (stickFound && shinyFound) {
                                return;
                            }
                        }
                    }
                }
            });
    });