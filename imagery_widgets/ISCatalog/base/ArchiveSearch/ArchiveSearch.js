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
    "../BaseDiscoveryMixin"
],
    function (declare, lang, QueryTask, Query, Deferred, BaseDiscoveryMixin) {
        return declare([ BaseDiscoveryMixin], {
            nls:{
                noServiceToSearch:"No service to search"
            },
            fieldTypeWrappers: {
                esriFieldTypeDate: {
                    prefix: "date '",
                    suffix: "'"
                }
            },
            constructor: function (params) {
                lang.mixin(this,params || {});
            },
            performArchiveSearches: function (geometry, userQueryParameters, searchServices) {
                var i, def = new Deferred();
                this.searchResponses = [];
                for (i = 0; i < searchServices.length; i++) {
                    this._performArchiveSearch(geometry, searchServices[i], userQueryParameters).then(lang.hitch(this, this._handleArchiveSearchResponse, def, searchServices));
                }
                return def;
            },
            _handleArchiveSearchResponse: function (deferred, searchServices, responseObj) {
                this.searchResponses.push(responseObj);
                if (this.searchResponses.length === searchServices.length) {
                    //complete
                    deferred.resolve(this.searchResponses);
                }
            },
            _performArchiveSearch: function (geometry, searchService, userQueryParameters) {
                var queryTask, query, def;
                def = new Deferred();
                if (!searchService) {
                    def.resolve({error: true, message: this.nls.noServiceToSearch});
                    return def;
                }
                queryTask = searchService.queryTask;
                if (!queryTask) {
                    queryTask = new QueryTask(searchService.url);
                    searchService.queryTask = queryTask;
                }
                query = new Query();
                query.where = this._getQueryString(searchService, userQueryParameters);
                query.geometry = geometry;
                query.spatialRelationship = Query.SPATIAL_REL_INTERSECTS;
                query.returnGeometry = true;
                query.outFields = ["*"];
                searchService.queryTask.execute(query, lang.hitch(this, this._handleQueryFeaturesResponse, searchService, def), lang.hitch(this, this._handleQueryFeaturesError, searchService, def));
                return def;
            },
            _handleQueryFeaturesResponse: function (searchService, deferred, response) {
                deferred.resolve({error: false, searchService: searchService, response: response});
            },
            _handleQueryFeaturesError: function (searchService, deferred, err) {
                deferred.resolve({error: true, searchService: searchService, response: null});
            },
            _getQueryString: function (searchService, userQueryParameters) {
                var queryString = "", queryParmeters = [];
                if (searchService.queryWhereClauseAppend) {
                    queryParmeters.push(searchService.queryWhereClauseAppend);
                }
                if (userQueryParameters && searchService.commonFields) {
                    if (searchService.commonFields.cloudCover && (userQueryParameters[this.SEARCH_FIELDS.CLOUD_COVER] || userQueryParameters[this.SEARCH_FIELDS.CLOUD_COVER] === 0)) {
                        queryParmeters.push(searchService.commonFields.cloudCover + " <= " + userQueryParameters[this.SEARCH_FIELDS.CLOUD_COVER]);
                    }
                    if (searchService.commonFields.acquisitionDate && userQueryParameters[this.SEARCH_FIELDS.ACQUISITION_DATE]) {
                        var acquisitionDateQueryPart = "(";
                        if (userQueryParameters[this.SEARCH_FIELDS.ACQUISITION_DATE][0]) {
                            queryParmeters.push(searchService.commonFields.acquisitionDate + " >= " +
                                this.fieldTypeWrappers.esriFieldTypeDate.prefix + userQueryParameters[this.SEARCH_FIELDS.ACQUISITION_DATE][0] + this.fieldTypeWrappers.esriFieldTypeDate.suffix);
                        }
                        if (userQueryParameters[this.SEARCH_FIELDS.ACQUISITION_DATE][1]) {
                            queryParmeters.push(searchService.commonFields.acquisitionDate + " <= " +
                                this.fieldTypeWrappers.esriFieldTypeDate.prefix + userQueryParameters[this.SEARCH_FIELDS.ACQUISITION_DATE][1] + this.fieldTypeWrappers.esriFieldTypeDate.suffix);
                        }
                    }
                }
                return queryParmeters.join(" AND ");
            }
        });
    });