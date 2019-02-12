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
    'dojo/_base/declare',
    'dojo/_base/lang',
    "esri/tasks/QueryTask",
    "esri/tasks/query",
    "dojo/Deferred",
    "../BaseDiscoveryMixin",
    "esri/geometry/Extent",
    "esri/geometry/Polygon",
    "esri/tasks/Geoprocessor",
    "esri/SpatialReference",
    "../GeometryUtils"

],
    function (declare, lang, QueryTask, Query, Deferred, BaseDiscoveryMixin, Extent, Polygon, Geoprocessor, SpatialReference, GeometryUtils) {
        return declare([ BaseDiscoveryMixin], {
            nls: {
                invalidGeometry:"Invalid Geometry",
                iconError: "Icon Error"
            },
            outputSpatialReference: null,
            jsonOutputParameterName: "featureclass_output",
            iconGpUrl: "",
            iconSearchMixin: {
                imagemode: "NaturalColor",
                format: "FeatureClass"
            },
            constructor: function (params) {
                lang.mixin(this, params || {});
                if (!this.outputSpatialReference) {
                    this.outputSpatialReference = new SpatialReference({wkid: 102100});
                }
                this.geometryUtils = new GeometryUtils({
                    nls: this.nls,
                    mapSpatialReference: this.outputSpatialReference
                })
            },
            performIconSearches: function (geometry, userQueryParameters, iconSearchParameters) {
                var i, def = new Deferred(), bbox, srs, gpTaskParameters, queryString;
                var extent = geometry;
                if (!(geometry instanceof Polygon) && !(geometry instanceof Extent)) {
                    def.resolve({error: true, message: this.nls.invalidGeometry});
                }
                else {
                    if (geometry instanceof Polygon) {
                        extent = geometry.getExtent();
                    }
                    bbox = extent.xmin + "," + extent.ymin + "," + extent.xmax + "," + extent.ymax;
                    srs = extent.spatialReference.wkid;
                    queryString = this._getQueryString(userQueryParameters);

                    gpTaskParameters = lang.mixin({
                        bbox: bbox,
                        srs: srs
                    }, this.iconSearchMixin);
                    if (iconSearchParameters) {
                        if (iconSearchParameters.imagemode) {
                            gpTaskParameters.imagemode = iconSearchParameters.imagemode;
                        }
                        if (iconSearchParameters.queryParts) {
                            if (queryString.length > 0) {
                                queryString += ",";
                            }
                            queryString += iconSearchParameters.queryParts.join(",");
                        }
                    }
                    if (queryString && queryString.length > 0) {
                        gpTaskParameters['query'] = queryString;
                    }
                    if (!this.iconGeoprocessor) {
                        this.iconGeoprocessor = new Geoprocessor(this.iconGpUrl);
                    }
                    this.iconGeoprocessor.submitJob(gpTaskParameters, lang.hitch(this, this._handleIconSearchResponse, def), null,
                        lang.hitch(this, this._handleIconSearchError, def));
                }
                return def;
            },
            _handleIconSearchError: function (def, error) {
                def.resolve({error: true, message: this.nls.iconError});
            },
            _handleIconSearchResponse: function (deferred, responseObj) {
                //get the json output
                this.iconGeoprocessor.getResultData(
                    responseObj.jobId,
                    this.jsonOutputParameterName,
                    lang.hitch(this, this._iconResponseCallback,
                        deferred), lang.hitch(this,
                        this._handleIconSearchError, deferred)
                );

            },
            _iconResponseCallback: function (def, iconResponseData) {
                //convert all the feature geometries to the maps spatial reference
                var features = iconResponseData.value ? iconResponseData.value.features : [];
                this.geometryUtils.projectFeaturesToMapSR(features, function () {
                    def.resolve(iconResponseData.value);
                });
            },
            _getQueryString: function (userQueryParameters) {
                var queryString = "", queryParmeters = [];
                if (userQueryParameters) {
                    if ((userQueryParameters[this.SEARCH_FIELDS.CLOUD_COVER] || userQueryParameters[this.SEARCH_FIELDS.CLOUD_COVER] === 0)) {
                        queryParmeters.push("maxcloudcover=" + userQueryParameters[this.SEARCH_FIELDS.CLOUD_COVER]);
                    }
                    if (userQueryParameters[this.SEARCH_FIELDS.ACQUISITION_DATE]) {
                        var acquisitionDateQueryPart = "(";
                        if (userQueryParameters[this.SEARCH_FIELDS.ACQUISITION_DATE][0]) {
                            queryParmeters.push("minacqdate='" + this.getDateString(userQueryParameters[this.SEARCH_FIELDS.ACQUISITION_DATE][0], true, 'yyyyMMdd') + "'");

                        }
                        if (userQueryParameters[this.SEARCH_FIELDS.ACQUISITION_DATE][1]) {
                            queryParmeters.push("maxacqdate='" + this.getDateString(userQueryParameters[this.SEARCH_FIELDS.ACQUISITION_DATE][1], true, 'yyyyMMdd') + "'");
                        }
                    }
                }
                return queryParmeters.join(",");
            }

        });
    });
