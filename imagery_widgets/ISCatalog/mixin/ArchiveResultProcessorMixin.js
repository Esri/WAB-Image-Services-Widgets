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
    "../base/BaseDiscoveryMixin",
    "esri/IdentityManager"
],
    function (declare, BaseDiscoveryMixin, IdentityManager) {
        return declare([ BaseDiscoveryMixin], {
            createArchiveResults: function (results, responseTimeMS) {
                var resultItems = [], i, currentResult, searchServicesWithResults = [];
                for (i = 0; i < results.length; i++) {
                    currentResult = results[i];
                    if (!currentResult || currentResult.error || !currentResult.response || !currentResult.response.features || currentResult.response.features.length === 0) {
                        continue;
                    }
                    searchServicesWithResults.push(currentResult.searchService);
                    if (!currentResult.error) {
                        resultItems = resultItems.concat(this._createArchiveResultEntries(currentResult, responseTimeMS));
                    }
                }
                return {items: resultItems, resultServices: searchServicesWithResults};
            },
            _createArchiveResultEntries: function (result, responseTimeMS) {
                var i, thumbnailUrl, currentQueryResponse, currentSearchService, currentFeature, archiveResults = [], currentCloudCover, archiveCloudCoverField, serviceCredential, serviceToken, acquisitionDateField;
                currentQueryResponse = result.response;
                currentCloudCover = this.resultsWidget ? this.resultsWidget.getCloudCover() : null;
                if (!currentQueryResponse || !currentQueryResponse.features || currentQueryResponse.features.length === 0) {
                    return [];
                }
                currentSearchService = result.searchService;

                if (currentSearchService && currentSearchService.commonFields) {
                    archiveCloudCoverField = currentSearchService.commonFields.cloudCover;
                    acquisitionDateField = currentSearchService.commonFields.acquisitionDate;
                }
                serviceCredential = IdentityManager.findCredential(currentSearchService.url);
                if (serviceCredential) {
                    if (serviceCredential.token) {
                        serviceToken = serviceCredential.token;
                    }
                }
                if (!currentSearchService.__fieldConfiguration) {
                    this._createArchiveFieldConfiguration(currentSearchService, currentQueryResponse.fields);
                }
                for (i = 0; i < currentQueryResponse.features.length; i++) {
                    currentFeature = currentQueryResponse.features[i];
                    if (!currentFeature.attributes[archiveCloudCoverField]) {
                        currentFeature.attributes[archiveCloudCoverField] = 0;
                    }
                    currentFeature[this.COMMON_FIELDS.CLOUD_COVER_FIELD] = currentFeature.attributes[archiveCloudCoverField];
                    currentFeature[this.COMMON_FIELDS.FILTERED_FIELD] = false;

                    if (currentCloudCover !== 1) {
                        if (currentFeature[this.COMMON_FIELDS.CLOUD_COVER_FIELD] > 1) {
                            //cloud cover is 0 - 100 we want 0.0 to 1.0
                            currentFeature[this.COMMON_FIELDS.CLOUD_COVER_FIELD] *= 0.01;
                        }
                        if ((!currentFeature[this.COMMON_FIELDS.CLOUD_COVER_FIELD] && currentFeature[this.COMMON_FIELDS.CLOUD_COVER_FIELD] !== 0) || currentFeature[this.COMMON_FIELDS.CLOUD_COVER_FIELD] > currentCloudCover) {
                            currentFeature[this.COMMON_FIELDS.FILTERED_FIELD] = true;
                        }
                    }
                    //todo: need to have a unique id
                    currentFeature[this.COMMON_FIELDS.RESULT_ID_FIELD] = currentSearchService.label + "_" + i;
                    currentFeature[this.COMMON_FIELDS.SERVICE_LABEL] = currentSearchService.label;
                    currentFeature[this.COMMON_FIELDS.SERVICE_URL] = currentSearchService.url;
                    currentFeature[this.COMMON_FIELDS.SERVICE_FIELD] = currentSearchService;
                    currentFeature[this.COMMON_FIELDS.ADDED_TO_CART_FIELD] = false;
                    currentFeature[this.COMMON_FIELDS.IS_PREVIEW_FIELD] = false;
                    currentFeature[this.COMMON_FIELDS.IS_DOWNLOADABLE] = currentSearchService.downloadEnabled;
                    currentFeature[this.COMMON_FIELDS.DATE_FIELD] = acquisitionDateField ? currentFeature.attributes[acquisitionDateField] : null;

                    //get the delta from the result time and the response time
                    currentFeature[this.COMMON_FIELDS.MOST_RECENT_DELTA] = Math.abs(currentFeature[this.COMMON_FIELDS.DATE_FIELD] - responseTimeMS);
                    //create thumbnail url
                    thumbnailUrl = this.joinUrl(currentSearchService.url, currentFeature.attributes[currentSearchService.__fieldConfiguration.objectIdFieldName]);
                    thumbnailUrl = this.joinUrl(thumbnailUrl, "thumbnail");
                    if (serviceToken) {
                        thumbnailUrl += "?token=" + serviceToken;
                    }
                    if (currentSearchService.proxyThumbnails && this.appProxyUrl) {
                        thumbnailUrl = this.appProxyUrl + "?" + thumbnailUrl;
                    }
                    currentFeature[this.COMMON_FIELDS.THUMBNAIL_FIELD] = thumbnailUrl;

                    archiveResults.push(currentFeature);
                }
                return archiveResults;
            },
            _createArchiveFieldConfiguration: function (searchService, fields) {
                var i, currentField;
                searchService.__fieldConfiguration = {fields: fields, dateFields: []};
                for (i = 0; i < fields.length; i++) {
                    currentField = fields[i];
                    if (currentField.type === this.ESRI_FIELD_TYPES.OBJECT_ID) {
                        searchService.__fieldConfiguration.objectIdFieldName = currentField.name;
                    }
                    else if (currentField.type === this.ESRI_FIELD_TYPES.DATE) {
                        searchService.__fieldConfiguration.dateFields.push(currentField.name);
                    }
                }
            }
        });
    });
