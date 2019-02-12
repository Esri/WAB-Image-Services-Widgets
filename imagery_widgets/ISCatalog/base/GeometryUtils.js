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
    "dojo/_base/lang",
    "esri/tasks/ProjectParameters",
    "esri/SpatialReference",
    "esri/geometry/webMercatorUtils",
    'esri/config'
],
    function (declare, lang, ProjectParameters, SpatialReference, webMercatorUtils, esriConfig) {
        return declare([ ], {
            WEB_MERCATOR_WKID: 102100,
            WGS_84_WKID: 4326,
            map: null,
            geometryService: null,
            //pass map reference and optional geometry service
            constructor: function (params) {
                lang.mixin(this, params || {});
                if (!this.mapSpatialReference) {
                    this.mapSpatialReference = new SpatialReference({wkid: 102100});
                }
                if (!this.geometryService) {
                    this.geometryService = esriConfig.defaults.geometryService;
                }
                this.projectErrorDefaultCallback = lang.hitch(this, this.handleProjectionError);
            },
            projectFeaturesToMapSR: function (features, callback, options, errback) {
                var geometries = [], i;
                for (i = 0; i < features.length; i++) {
                    geometries.push(features[i].geometry);
                }
                this.projectGeometriesToMapSR(geometries, function (geometries) {
                    for (i = 0; i < geometries.length; i++) {
                        features[i].geometry = geometries[i];
                        callback(features);
                    }
                }, options, errback);

            },
            projectGeometriesToMapSR: function (geometries, callback, options, errback) {
                if (geometries == null) {
                    if (errback && lang.isFunction(errback)) {
                        errback(this.nls.noProjectGeometries);
                    }
                    return;
                }
                if (callback == null || !lang.isFunction(callback) || this.mapSpatialReference == null) {
                    if (errback && lang.isFunction(errback)) {
                        errback(this.nls.cannotProcessProject);
                    }
                    return;
                }
                if (!lang.isArray(geometries)) {
                    geometries = [geometries];
                }
                if (geometries.length < 0) {
                    callback([]);
                }
                //attempt client side projects
                var projectedGeometries = this.geometryToMapSpatialReference(geometries);
                if (projectedGeometries != null && lang.isArray(projectedGeometries)) {
                    callback(projectedGeometries);
                }
                else {
                    this._handleServerSideProject(geometries, callback, options, errback);
                }
            },
            _handleServerSideProject: function (geometries, callback, options, errback) {
                if (options == null) {
                    options = {};
                }
                var params = new ProjectParameters();
                params.geometries = geometries;
                params.outSR = this.mapSpatialReference;
                if (options.transformation) {
                    params.transformation = options.transformation;
                }
                if (errback == null || !lang.isFunction(errback)) {
                    errback = this.projectErrorDefaultCallback;
                }
                this.geometryService.project(params, callback, errback);
            },
            geometryToMapSpatialReference: function (geometries) {
                if (geometries == null) {
                    return null;
                }
                if (!lang.isArray(geometries)) {
                    geometries = [geometries];
                }

                if (geometries.length < 1) {
                    return [];
                }
                if (this.mapSpatialReference.wkid == geometries[0].spatialReference.wkid) {
                    return geometries;
                }
                var projectedGeometries = null;
                //see if we can project on the client
                if ((this.mapSpatialReference.wkid === this.WEB_MERCATOR_WKID || this.mapSpatialReference.wkid === this.WGS_84_WKID)
                    && geometries[0].spatialReference.wkid === this.WEB_MERCATOR_WKID || geometries[0].spatialReference.wkid === this.WGS_84_WKID) {
                    //should be able to convert client side
                    var converter = null;
                    if (this.mapSpatialReference.wkid === this.WEB_MERCATOR_WKID && geometries[0].spatialReference.wkid === this.WGS_84_WKID) {
                        converter = webMercatorUtils.geographicToWebMercator;
                    }
                    else if (geometries[0].spatialReference.wkid === this.WEB_MERCATOR_WKID && this.mapSpatialReference.wkid === this.WGS_84_WKID) {
                        converter = webMercatorUtils.webMercatorToGeographic;
                    }
                    if (lang.isFunction(converter)) {
                        projectedGeometries = [];
                        for (var i = 0; i < geometries.length; i++) {
                            projectedGeometries.push(converter(geometries[i]));

                        }
                    }
                }
                return projectedGeometries;
            },
            handleProjectionError: function (err) {
            }
        });
    })
;

