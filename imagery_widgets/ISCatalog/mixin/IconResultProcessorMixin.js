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
    "esri/geometry/jsonUtils",
    "../base/BaseDiscoveryMixin",
    "esri/IdentityManager"
],
    function (declare, GeometryJsonUtils, BaseDiscoveryMixin, IdentityManager) {
        return declare([ BaseDiscoveryMixin], {
            createIconResults: function (result, responseTimeMS) {
                var resultItems = [];
                if (!result || result.error || !result.features || result.features.length === 0) {
                    return {items: []};
                }
                return {items: this._createIconResultEntries(result, responseTimeMS)};
            },
            _createIconResultEntries: function (result, responseTimeMS) {
                var i, currentQueryResponse, currentSearchService, currentFeature, iconResults = [], currentCloudCover, archiveCloudCoverField, serviceCredential, serviceToken, acquisitionDateField;
                currentQueryResponse = result.response;
                currentCloudCover = this.resultsWidget ? this.resultsWidget.getCloudCover() : null;
                if (!result || !result.features || result.features.length === 0) {
                    return [];
                }
                currentSearchService = result.searchService;
                if (currentSearchService && currentSearchService.commonFields) {
                    archiveCloudCoverField = currentSearchService.commonFields.cloudCover;
                    acquisitionDateField = currentSearchService.commonFields.acquisitionDate;
                }
                if (!currentSearchService.__fieldConfiguration) {
                    this._createIconFieldConfiguration(currentSearchService, result.fields);
                }
                for (i = 0; i < result.features.length; i++) {
                    currentFeature = result.features[i];
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
                    currentFeature[this.COMMON_FIELDS.IS_ICON_RESULT] = true;
                    currentFeature[this.COMMON_FIELDS.RESULT_ID_FIELD] = currentSearchService.label + "_" + i;
                    currentFeature[this.COMMON_FIELDS.SERVICE_LABEL] = currentSearchService.label;
                    currentFeature[this.COMMON_FIELDS.SERVICE_FIELD] = currentSearchService;
                    currentFeature[this.COMMON_FIELDS.ADDED_TO_CART_FIELD] = false;
                    currentFeature[this.COMMON_FIELDS.IS_PREVIEW_FIELD] = false;
                    currentFeature[this.COMMON_FIELDS.IS_DOWNLOADABLE] = currentSearchService.downloadEnabled;
                    currentFeature[this.COMMON_FIELDS.DISABLE_IMAGE_PREVIEW] = currentFeature.attributes.ImageService && currentFeature.attributes.ImageService != 'N/A' ? false : true;
                    currentFeature[this.COMMON_FIELDS.RASTER_PREVIEW_BY_WHERE_CLAUSE] = true;
                    currentFeature[this.COMMON_FIELDS.WHERE_CLAUSE_PREVIEW_FIELD] = "Name";
                    currentFeature[this.COMMON_FIELDS.WHERE_CLAUSE_PREVIEW_VALUE] = "'" + currentFeature.attributes.ISName + "'";
                    currentFeature[this.COMMON_FIELDS.SERVICE_URL] = currentFeature.attributes.ImageService && currentFeature.attributes.ImageService != 'N/A' ? currentFeature.attributes.ImageService : null;
                    currentFeature[this.COMMON_FIELDS.SHOW_THUMB_ON_HOVER] = this._showThumbOnHover(currentFeature);
                    currentFeature[this.COMMON_FIELDS.DATE_FIELD] = acquisitionDateField ? currentFeature.attributes[acquisitionDateField] : null;

                    //get the delta from the result time and the response time
                    currentFeature[this.COMMON_FIELDS.MOST_RECENT_DELTA] = Math.abs(currentFeature[this.COMMON_FIELDS.DATE_FIELD] - responseTimeMS);

                    //parse the geometry
                    currentFeature.geometry = GeometryJsonUtils.fromJson(currentFeature.geometry);


                    if (this.config.iconConfiguration.serviceConfiguration.thumbnailField) {
                        currentFeature[this.COMMON_FIELDS.THUMBNAIL_FIELD] = currentFeature.attributes[this.config.iconConfiguration.serviceConfiguration.thumbnailField];
                    }
                    iconResults.push(currentFeature);
                }
                return iconResults;
            },
            _showThumbOnHover: function (feature) {
                if (!feature || !feature.attributes) {
                    return false;
                }
                //  if (!feature.attributes.ImageService || feature.attributes.ImageService === 'N/A') {
                return feature.attributes.BrowseURL != null && feature.attributes.BrowseURL.length > 0;
                //  }
                // return false;
            },
            _createIconFieldConfiguration: function (searchService, fields) {
                //get the icon object id field
                searchService.__fieldConfiguration = {objectIdFieldName: this.config.iconConfiguration.serviceConfiguration.featureIdField, fields: fields, dateFields: []};
                var i, currentField;
                for (i = 0; i < fields.length; i++) {
                    currentField = fields[i];
                    if (currentField.type === this.ESRI_FIELD_TYPES.DATE) {
                        searchService.__fieldConfiguration.dateFields.push(currentField.name);
                    }
                }
            }

        });
    });
