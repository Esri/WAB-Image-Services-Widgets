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
        "dojo/dom-construct",
        "dojo/dom-class",
        "dojo/dom-attr",
        "dojo/topic",
        "dojo/date/locale",
        "dojo/_base/array",
        "./LoaderMixin"
    ],
    function (declare, lang, domConstruct, domClass, domAttr, topic, locale, array, LoaderMixin) {
        return declare([ LoaderMixin], {
            _hideNode: function (node) {
                if (!domClass.contains(node, "hidden")) {
                    domClass.add(node, "hidden");
                }
            },
            _showNode: function (node) {
                if (domClass.contains(node, "hidden")) {
                    domClass.remove(node, "hidden");
                }
            },
            fileSizeUnits: ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
            _defaultDateConfig: {
                useUTCDate: true,
                dateFormat: "MM/dd/yyyy"
            },
            validEmailRegExp: new RegExp(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/),
            featureLayerRegExp: new RegExp(/\/[0-9]+$/i),
            kmlExtensionRegExp: new RegExp(/\.kml/i),
            mapServiceNameRegExp: new RegExp(/.*\/(.*)\/MapServer\/?$/),
            geocodeServiceNameRegExp: new RegExp(/.*\/(.*)\/GeocodeServer\/?$/),
            imageServiceNameRegExp: new RegExp(/.*\/(.*)\/ImageServer\/?$/),
            globeServiceNameRegExp: new RegExp(/.*\/(.*)\/GlobeServer\/?$/),
            gpServerServiceNameRegExp: new RegExp(/.*\/(.*)\/GPServer\/?$/),
            featureServerServiceNameRegExp: new RegExp(/.*\/(.*)\/FeatureServer\/?$/),
            numberToStringWithCommasRegexp: new RegExp(/\B(?=(\d{3})+(?!\d))/g),
            messageEntryClass: "imageDiscoveryMessage",
            packageName: "Discovery",
            SERVICE_TYPES: {
                GEOMETRY_SERVER: "GeometryServer",
                GLOBE_SERVER: "GlobeServer",
                GP_SERVER: "GPServer",
                GP_TASK: "GPTask",
                IMAGE_SERVER: "ImageServer",
                MAP_SERVER: "MapServer",
                WEB_MAP: "WebMap",
                PORTAL_SERVER: "PortalServer",
                GEOCODE_SERVER: "GeocodeServer",
                FEATURE_LAYER: "FeatureLayer",
                FEATURE_SERVER: "FeatureServer",
                KML: "KMLLayer",
                OPEN_STREET_MAP: "OpenStreetMap",
                WMS_LAYER: "WMSLayer"
            },
            COMMON_FIELDS: {
                IS_DOWNLOADABLE: "__isDownloadable",
                DISABLE_IMAGE_PREVIEW: "__disableImagePreview",
                CART_ONLY_FEATURE: "__cartOnlyFeature",
                ADDED_TO_CART_FIELD: "__addedToCart",
                RESULT_ID_FIELD: "__id",
                DATE_FIELD: "__commonDate",
                IS_PREVIEW_FIELD: "__isPreviewed",
                CLOUD_COVER_FIELD: "__commonCloudCover",
                THUMBNAIL_FIELD: "__tumbnailUrl",
                FILTERED_FIELD: "__filtered",
                SERVICE_FIELD: "__service",
                SERVICE_LABEL: "__serviceLabel",
                MOST_RECENT_DELTA: "__mostRecentDelta",
                INTERSECT_EXTENT: "__intersectExtent",
                DOWNLOAD_SIZE: "__downloadSize",
                DOWNLOAD_BYTE_SIZE: "__downloadByteSize",
                SHOW_THUMB_ON_HOVER: "__showThumbOnHover",
                RASTER_PREVIEW_BY_WHERE_CLAUSE: "__previewImageByWhereClause",
                SERVICE_URL: "__serviceUrl",
                WHERE_CLAUSE_PART: "__whereClausePart",
                WHERE_CLAUSE_PREVIEW_FIELD: "__wherClausePreviewField",
                WHERE_CLAUSE_PREVIEW_VALUE: "__wherClausePreviewValue",
                IS_ICON_RESULT: "__isIconResult"
            },
            SEARCH_FIELDS: {
                ACQUISITION_DATE: "acquisitionDate",
                CLOUD_COVER: "cloudCover"
            },
            ICON_SEARCH_FIELDS: {
                MAX_ACQUISITION: "maxacqdate",
                MIN_ACQUISITION: "minacqdate",
                MAX_CLOUD_COVER: "maxcloudcover",
                MIN_GSD: "mingds",
                MAX_GSD: "maxgsd"
            },
            ESRI_GEOMETRY_TYPES: {
                POINT: "esriGeometryPoint",
                LINE: "esriGeometryPolyline",
                POLYGON: "esriGeometryPolygon",
                ENVELOPE: "esriGeometryEnvelope"
            },
            CART_LABELS: {
                ADD_TO_CART: "Add to Cart",
                REMOVE_FROM_CART: "Remove",
                REMOVE_FROM_CART_FULL: "Remove from Cart"
            },
            ESRI_FIELD_TYPES: {
                OBJECT_ID: "esriFieldTypeOID",
                DATE: "esriFieldTypeDate"
            },
            CURRENT_SEARCH_GEOMETRY_TOPIC: "discovery:CurrentSearchGraphic",
            ADD_MESSAGE_TOPIC: "messaging:add",
            showMessage: function (message, duration) {
                var messageElement;
                messageElement = domConstruct.create("div", {className: this.messageEntryClass});
                domConstruct.place(domConstruct.create("i", {className: "fa fa-flag" }), messageElement);
                domConstruct.place(domConstruct.create("span", {innerHTML: message}), messageElement);
                topic.publish("messaging:add", messageElement, duration || 5000);
            },
            showError: function (message, duration) {
                var messageElement;
                messageElement = domConstruct.create("div", {className: this.messageEntryClass, style: {color: "red"}});
                domConstruct.place(domConstruct.create("i", {className: "fa fa-exclamation", style: {color: "red"}}), messageElement);
                domConstruct.place(domConstruct.create("span", {innerHTML: message}), messageElement);
                topic.publish("messaging:add", messageElement, duration || 5000);
            },
            /**
             * adds commas to the passed number/string
             * @param x
             * @return {String}
             */
            numberToStringWithCommas: function (x) {
                var parts = x.toString().split(".");
                parts[0] = parts[0].replace(this.numberToStringWithCommasRegexp, ",");
                return parts.join(".");
            },
            getCostString: function (cost) {
                if (!cost) {
                    return "$0 USD";
                }
                cost = cost.toFixed(2).toString();
                //    cost = cost.replace(".00", "");
                return "$" + this.numberToStringWithCommas(cost) + " USD";
            },
            getAreaString: function (area) {
                if (!area) {
                    return "0 sq km";
                }
                return this.numberToStringWithCommas(Math.round(area)) + " sq km";
            },
            getArchiveDetailsString: function (feature, detailFields, dateConfig) {
                if (!detailFields || detailFields.length === 0) {
                    return null;
                }
                if (!dateConfig) {
                    dateConfig = this._defaultDateConfig;
                }
                else {
                    if (!dateConfig.useUTCDate && dateConfig.useUTCDate !== false) {
                        dateConfig.useUTCDate = this._defaultDateConfig.useUTCDate;
                    }
                    if (!dateConfig.dateFormat) {
                        dateConfig.dateFormat = this._defaultDateConfig.dateFormat;
                    }
                }
                var serviceConfiguration, hasEntry = false, attributes, i, li, list, value, displayField, outerContainer = domConstruct.create("div");
                serviceConfiguration = feature[this.COMMON_FIELDS.SERVICE_FIELD];
                attributes = feature.attributes;
                list = domConstruct.create("ul", {className: "detailsPopupList"});
                domConstruct.place(list, outerContainer);
                for (i = 0; i < detailFields.length; i++) {
                    value = null;
                    displayField = detailFields[i];
                    if (displayField.displayValue) {
                        value = displayField.displayValue;
                    }
                    else {
                        if (attributes[displayField.name] || attributes[displayField.name] === 0) {
                            value = attributes[displayField.name];
                        }
                        else if (feature[displayField.name] || feature[displayField.name] === 0) {
                            value = feature[displayField.name];
                        }
                        if (displayField.valueReplacementMap && (displayField.valueReplacementMap[value] || displayField.valueReplacementMap[value] === 0)) {
                            value = displayField.valueReplacementMap[value];
                        }
                    }
                    if (value || value === 0) {
                        li = domConstruct.create("li", {className: ""});
                        if (array.indexOf(serviceConfiguration.__fieldConfiguration.dateFields, displayField.name) > -1) {
                            value = this.getDateString(value, dateConfig.useUTCDate, dateConfig.dateFormat);
                        }
                        else {
                            if ((displayField.precision || displayField.precision === 0) && value.toFixed) {
                                value = value.toFixed(displayField.precision);
                            }
                            if (displayField.displayMultiplier) {
                                value = Math.ceil(value * displayField.displayMultiplier);
                            }
                        }
                        value = value.toString();
                        if (displayField.valuePrepend) {
                            value = displayField.valuePrepend + value;
                        }
                        if (displayField.valueAppend) {
                            value += displayField.valueAppend;
                        }
                        domAttr.set(li, "innerHTML", displayField.label + (displayField.label.length > 0 ? ": " : "") + value);
                        hasEntry = true;
                        if (displayField.cssClasses) {
                            domClass.add(li, displayField.cssClasses);
                        }
                        domConstruct.place(li, list);
                    }
                }
                if (hasEntry) {
                    return outerContainer.innerHTML;
                }
                return null;
            },
            /**
             * takes in ms and converts to JS date object
             * @param value ms from epoch
             * @returns {Date}
             * @private
             * @param useUTCDate
             */
            _getDate: function (value, useUTCDate) {
                var date = new Date(value);
                if (useUTCDate) {
                    date = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());
                }
                return date;
            },
            /**
             * takes in JS Date object and formats it as a string
             * @param dateValue Date object
             * @returns {Date}
             * @private
             * @param useUTCDate
             * @param dateFormat
             */
            getDateString: function (dateValue, useUTCDate, dateFormat) {
                return locale.format(this._getDate(dateValue, useUTCDate ? true : false), {selector: "date", datePattern: dateFormat || this._defaultDateConfig.dateFormat});
            },

            getFileNameFromAtEndOfPath: function (fileString) {
                if (fileString == null) {
                    return "";
                }
                if (fileString.lastIndexOf('\\') > -1) {
                    return fileString.substring(fileString.lastIndexOf("\\") + 1, fileString.length);
                }
                if (fileString.lastIndexOf('/') > -1) {
                    return fileString.substring(fileString.lastIndexOf("/") + 1, fileString.length);
                }
                return fileString;

            },
            endsWith: function (testString, match) {
                var lastIndex = testString.lastIndexOf(match);
                return (lastIndex != -1) && (lastIndex + match.length == testString.length);
            },
            getServiceTypeFromUrl: function (url) {
                if (this.endsWith(url, this.SERVICE_TYPES.MAP_SERVER) || this.endsWith(url, this.SERVICE_TYPES.MAP_SERVER + "/")) {
                    return this.SERVICE_TYPES.MAP_SERVER;
                }
                else if (this.endsWith(url, this.SERVICE_TYPES.IMAGE_SERVER) || this.endsWith(url, this.SERVICE_TYPES.IMAGE_SERVER + "/")) {
                    return this.SERVICE_TYPES.IMAGE_SERVER;
                }
                else if (this.endsWith(url, this.SERVICE_TYPES.GP_SERVER) || this.endsWith(url, this.SERVICE_TYPES.GP_SERVER + "/")) {
                    return this.SERVICE_TYPES.GP_SERVER;
                }
                else if (this.endsWith(url, this.SERVICE_TYPES.GLOBE_SERVER) || this.endsWith(url, this.SERVICE_TYPES.GLOBE_SERVER + "/")) {
                    return this.SERVICE_TYPES.GLOBE_SERVER;
                }
                else if (this.endsWith(url, this.SERVICE_TYPES.GEOCODE_SERVER) || this.endsWith(url, this.SERVICE_TYPES.GEOCODE_SERVER + "/")) {
                    return this.SERVICE_TYPES.GEOCODE_SERVER;
                }
                else if (this.kmlExtensionRegExp.test(url)) {
                    return this.SERVICE_TYPES.KML
                }
                else if (this.isFeatureLayer(url)) {
                    return this.SERVICE_TYPES.FEATURE_SERVER;
                }
                else return null;
            },
            isFeatureLayer: function (url) {
                var isMapService, isFeatureService;
                isFeatureService = url.indexOf("/" + this.SERVICE_TYPES.FEATURE_SERVER + "/") > -1;
                isMapService = url.indexOf("/" + this.SERVICE_TYPES.MAP_SERVER + "/") > -1;
                if (isFeatureService || isMapService) {
                    return this.featureLayerRegExp.test(url);
                }
                return false;
            },
            getServiceNameFromUrl: function (url) {
                var type = this.getServiceTypeFromUrl(url);
                if (type) {
                    var regexp = null;
                    if (type == this.SERVICE_TYPES.MAP_SERVER) {
                        regexp = this.mapServiceNameRegExp;
                    }
                    else if (type == this.SERVICE_TYPES.IMAGE_SERVER) {
                        regexp = this.imageServiceNameRegExp;
                    }
                    else if (type == this.SERVICE_TYPES.GP_SERVER) {
                        regexp = this.gpServerServiceNameRegExp;
                    }
                    else if (type == this.SERVICE_TYPES.GLOBE_SERVER) {
                        regexp = this.globeServiceNameRegExp;
                    }
                    else if (type == this.SERVICE_TYPES.FEATURE_SERVER) {
                        regexp = this.featureServerServiceNameRegExp;
                    }
                    else if (type == this.SERVICE_TYPES.GEOCODE_SERVER) {
                        regexp = this.geocodeServiceNameRegExp;
                    }
                    else {
                        return url;
                    }
                    var res = regexp.exec(url);
                    if (res != undefined && res[1] != undefined) {
                        return res[1].replace("_", " ");
                    }
                    return url;
                }
                else {
                    return url;
                }
            },
            humanFileSize: function (bytes) {
                if (bytes < 1024) return bytes + ' B';
                var u = -1;
                do {
                    bytes /= 1024;
                    ++u;
                } while (bytes >= 1024);
                return bytes.toFixed(1) + ' ' + this.fileSizeUnits[u];
            },
            getDownloadSizeForDownloadItemArray: function (downloadItems) {
                if (!downloadItems || !downloadItems.length) {
                    return 0;
                }
                var i, totalSize = 0;
                for (i = 0; i < downloadItems.length; i++) {
                    totalSize += downloadItems[i].size;
                }
                return totalSize;
            },
            isValidEmail: function (email) {
                return this.validEmailRegExp.test(email);
            },
            handleProjectGeometriesToMapSR: function (geometries, callback, options, errback) {
                if (geometries == null) {
                    if (errback && lang.isFunction(errback)) {
                        errback("No geometries to project");
                    }
                    return;
                }
                if (callback == null || !lang.isFunction(callback) || this.mapSpatialReference == null) {
                    if (errback && lang.isFunction(errback)) {
                        errback("Cannot process project");
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
                var projectedGeometries = PROJECTION_UTILS.geometryToMapSpatialReference(geometries);
                if (projectedGeometries != null && lang.isArray(projectedGeometries)) {
                    callback(projectedGeometries);
                }
                else {
                    this._handleServerSideProject(geometries, callback, options, errback);
                }
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
            }
        });
    });

