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
        "esri/layers/ArcGISImageServiceLayer",
        "esri/layers/MosaicRule" ,
        "esri/layers/RasterFunction",
        "dojo/_base/array",
        "../../../BaseDiscoveryMixin",
        "dojo/on" ,
        "dojo/Deferred",
        "dojo/Evented",
        "dojo/topic"
    ],
    function (declare, lang, ArcGISImageServiceLayer, MosaicRule, RasterFunction, array, BaseDiscoveryMixin, on, Deferred, Evented,topic) {
        return declare([ BaseDiscoveryMixin, Evented], {
            LAYER_ADDED: "layerAdded",
            constructor: function (params) {
                this._orderedPreviewItemFeatures = [];
                this.currentSearchGeometry = null;
                this.map = params.map;
                this.rasterFunctionTemplate = params.rasterFunctionTemplate;
                this.lockRasterLayersByUrl = {};
                this.whereClauseLayersByUrl = {};
                this.whereClauseQueryPartsByUrl = {};
                this.currentMosaicOperation = MosaicRule.OPERATION_FIRST;

                topic.subscribe("discovery:getSearchResultLayersHash",
                    lang.hitch(this, function (callback) {
                        if (callback && lang.isFunction(callback)) {
                            callback(this.lockRasterLayersByUrl);

                        }
                    }));
            },
            clear: function () {
                var key;
                for (key in this.lockRasterLayersByUrl) {
                    if (this.lockRasterLayersByUrl.hasOwnProperty(key)) {
                        this.map.removeLayer(this.lockRasterLayersByUrl[key]);
                    }
                }
                for (key in this.whereClauseLayersByUrl) {
                    if (this.whereClauseLayersByUrl.hasOwnProperty(key)) {
                        this.map.removeLayer(this.whereClauseLayersByUrl[key]);
                    }
                }
                this.lockRasterLayersByUrl = {};
                this.whereClauseQueryPartsByUrl = {};
                this.whereClauseLayersByUrl = {};
                this._orderedPreviewItemFeatures = [];
            },
            getVisibleOrderedPreviewItemFeatures: function () {
                var i, currentFeature, visibleOrderedFeatures = [];
                if (this._orderedPreviewItemFeatures) {
                    for (i = 0; i < this._orderedPreviewItemFeatures.length; i++) {
                        currentFeature = this._orderedPreviewItemFeatures[i];
                        if (currentFeature && !currentFeature[this.COMMON_FIELDS.FILTERED_FIELD]) {
                            visibleOrderedFeatures.push(currentFeature);
                        }
                    }
                }
                return visibleOrderedFeatures;
            },
            refreshPreviews: function () {
                var currentLockRasterArray, currentLayer, i, key, lockRastersByUrl = {}, currentService, currentFeature, currentLockRasterByUrl, existingLayerMosaicRule, visibleFeatureCount = 0;
                if (this._orderedPreviewItemFeatures) {
                    for (key in this.lockRasterLayersByUrl) {
                        if (this.lockRasterLayersByUrl.hasOwnProperty(key)) {
                            lockRastersByUrl[key] = [];
                        }
                    }
                    //TODO where clause update
                    for (i = 0; i < this._orderedPreviewItemFeatures.length; i++) {
                        currentFeature = this._orderedPreviewItemFeatures[i];
                        if (currentFeature) {
                            if (!currentFeature[this.COMMON_FIELDS.FILTERED_FIELD]) {
                                currentService = currentFeature[this.COMMON_FIELDS.SERVICE_FIELD];
                                currentLockRasterByUrl = lockRastersByUrl[currentService.url];
                                if (currentService && currentLockRasterByUrl) {
                                    currentLockRasterByUrl.push(currentFeature.attributes[currentService.__fieldConfiguration.objectIdFieldName]);
                                }
                            }
                        }
                    }
                    for (key in lockRastersByUrl) {
                        if (lockRastersByUrl.hasOwnProperty(key)) {
                            currentLayer = this.lockRasterLayersByUrl[key];
                            if (currentLayer) {
                                existingLayerMosaicRule = currentLayer.mosaicRule;
                                currentLockRasterArray = lockRastersByUrl[key];
                                visibleFeatureCount += currentLockRasterArray.length;
                                if (currentLockRasterArray.length > 0) {
                                    if (!currentLayer.visible) {
                                        currentLayer.show();
                                    }
                                    if (!this.arraysContainSameElements(currentLockRasterArray, existingLayerMosaicRule.lockRasterIds)) {
                                        this.setLockRasterByUrl(key, currentLockRasterArray);
                                    }
                                }
                                else {
                                    currentLayer.hide();
                                }
                            }
                        }
                    }
                }
                return visibleFeatureCount;
            },
            arraysContainSameElements: function (arrayOne, arrayTwo) {
                if (!arrayOne || !arrayTwo || (arrayOne.length !== arrayTwo.length)) {
                    return false;
                }
                var i;
                for (i = 0; i < arrayOne.length; i++) {
                    if (array.indexOf(arrayTwo, arrayOne[i]) < 0) {
                        return false;
                    }
                }
                return true;

            },
            setOrderedPreviewItemFeatures: function (newOrderArray) {
                var servicesUpdates = 0, def = new Deferred();
                if (!newOrderArray || newOrderArray.length === 0) {
                    this.clearLockRasters(true);
                    def.resolve();
                }
                else {
                    this.clearLockRasters(false);
                    var groupedObjectIdsByServiceUrl = {}, currentFeature, currentFeatureObjectId, currentFeatureService, servicesToReload = 0, firstFeatureLayer = null, i, key;
                    for (i = 0; i < newOrderArray.length; i++) {
                        currentFeature = newOrderArray[i];
                        if (currentFeature && currentFeature.attributes) {
                            currentFeatureService = currentFeature[this.COMMON_FIELDS.SERVICE_FIELD];
                            if (currentFeatureService) {
                                currentFeatureObjectId = currentFeature.attributes[currentFeatureService.__fieldConfiguration.objectIdFieldName];
                                if (currentFeatureObjectId || currentFeatureObjectId === 0) {
                                    if (!firstFeatureLayer) {
                                        firstFeatureLayer = this.lockRasterLayersByUrl[currentFeatureService.url];
                                    }
                                    if (!groupedObjectIdsByServiceUrl[currentFeatureService.url]) {
                                        groupedObjectIdsByServiceUrl[currentFeatureService.url] = [];
                                        servicesToReload++;
                                    }
                                    groupedObjectIdsByServiceUrl[currentFeatureService.url].push(currentFeatureObjectId);
                                }
                            }
                        }
                    }
                    if (firstFeatureLayer) {
                        //move this layer to the top
                        this.map.reorderLayer(firstFeatureLayer, this.map.layerIds.length - 1);
                    }
                    //set the sorted lock rasters for each layer

                    this._orderedPreviewItemFeatures = newOrderArray;
                    //update the lock rasters for each
                    for (key in groupedObjectIdsByServiceUrl) {
                        if (groupedObjectIdsByServiceUrl.hasOwnProperty(key)) {
                            this.setLockRasterByUrl(key, groupedObjectIdsByServiceUrl[key], function () {
                                servicesUpdates++;
                                if (servicesUpdates >= servicesToReload) {
                                    def.resolve();
                                }

                            });
                        }
                    }
                }
                return def;
            },
            /**
             * sets up the search service image service layer
             * @param searchService
             * @param feature
             * @param addToHash
             */
            createSearchServiceLayer: function (feature, searchService, addToHash) {
                var def = new Deferred();
                if (!searchService) {
                    return null;
                }
                var layer, mosaicRule, renderingRule, url = feature[this.COMMON_FIELDS.SERVICE_URL];
                layer = addToHash[url];
                if (!layer) {
                    layer = new ArcGISImageServiceLayer(url);
                    addToHash[url] = layer;
                    layer.on("load", lang.hitch(this, function (searchService, evt) {
                        if (evt && evt.layer) {
                            evt.layer.label = searchService.label;
                            this.emit(this.LAYER_ADDED, evt.layer);

                        }
                        def.resolve(((evt && evt.layer) ? evt.layer : null));
                    }, searchService));


                    mosaicRule = feature[this.COMMON_FIELDS.RASTER_PREVIEW_BY_WHERE_CLAUSE] ? this._createWhereClauseMosaicRule() : this._createLockRasterMosaicRule();
                    layer.setMosaicRule(mosaicRule);
                    if (this.currentSearchGeometry && this.rasterFunctionTemplate) {
                        renderingRule = new RasterFunction(lang.mixin({}, this.rasterFunctionTemplate));
                        renderingRule.functionArguments.ClippingGeometry = this.currentSearchGeometry;
                        layer.setRenderingRule(renderingRule);
                    }
                    this.map.addLayer(layer);
                    layer.hide();
                }
                return def;
            },
            clearLockRasters: function (refresh) {
                this._orderedPreviewItemFeatures = [];
                var key, mosaicRule;
                for (key in this.lockRasterLayersByUrl) {
                    if (this.lockRasterLayersByUrl.hasOwnProperty(key)) {
                        mosaicRule = this._createLockRasterMosaicRule();
                        if (this.lockRasterLayersByUrl[key]) {
                            if (refresh) {
                                this.lockRasterLayersByUrl[key].setMosaicRule(mosaicRule);
                            }
                            else {
                                this.lockRasterLayersByUrl[key].setMosaicRule(mosaicRule, true);
                            }
                        }
                    }
                }
            },
            /**
             * toggles the passed lock raster id on the map layer
             */
            toggleItemOnMap: function (feature, callback) {
                var layer, service;
                if (!feature || !feature.attributes) {
                    return;
                }

                service = feature[this.COMMON_FIELDS.SERVICE_FIELD];
                if (!service) {
                    if (callback && lang.isFunction(callback)) {
                        callback();
                    }
                    return;
                }
                this.getServiceLayer(feature, service).then(lang.hitch(this, this._toggleItemOnLayer, feature, callback));
            },
            _toggleItemOnLayer: function (feature, callback, layer) {
                var idx, layerMosaicRule, attributes, id, featureIdxInOrderedArray;
                if (!layer) {
                    if (callback && lang.isFunction(callback)) {
                        callback();
                    }
                    return;
                }
                if (feature[this.COMMON_FIELDS.RASTER_PREVIEW_BY_WHERE_CLAUSE]) {
                    var whereClausePartsByField = this.whereClauseQueryPartsByUrl[layer.url];
                    var featureClauseField = feature[this.COMMON_FIELDS.WHERE_CLAUSE_PREVIEW_FIELD];
                    var featureClauseValue = feature[this.COMMON_FIELDS.WHERE_CLAUSE_PREVIEW_VALUE];
                    if (!whereClausePartsByField[featureClauseField]) {
                        whereClausePartsByField[featureClauseField] = [];
                    }
                    var featureClauseFieldValueArray = whereClausePartsByField[featureClauseField];
                    idx = array.indexOf(featureClauseFieldValueArray, featureClauseValue);
                    if (idx > -1) {
                        //turn off
                        featureClauseFieldValueArray.splice(idx, 1);
                    }
                    else {
                        // turn on
                        featureClauseFieldValueArray.push(featureClauseValue);
                    }
                    //currently only handling strings
                    var newWhereClauseParts = [];
                    for (var fieldName in whereClausePartsByField) {
                        if (whereClausePartsByField.hasOwnProperty(fieldName) && whereClausePartsByField[fieldName].length > 0) {
                            if (whereClausePartsByField[fieldName].length > 1) {
                                newWhereClauseParts.push(fieldName + " IN (" + whereClausePartsByField[fieldName].join(",") + ")");
                            }
                            else {
                                newWhereClauseParts.push(fieldName + " = " + whereClausePartsByField[fieldName][0]);
                            }
                        }
                    }

                    if (newWhereClauseParts.length < 1) {
                        layer.hide();
                    }
                    else {
                        if (!layer.visible) {
                            layer.show();
                        }
                        layer.setMosaicRule(this._createWhereClauseMosaicRule(newWhereClauseParts.join(" OR ")));
                    }
                }
                else {
                    attributes = feature.attributes;
                    layerMosaicRule = layer.mosaicRule;
                    if (!layerMosaicRule) {
                        return;
                    }
                    id = attributes[feature[this.COMMON_FIELDS.SERVICE_FIELD].__fieldConfiguration.objectIdFieldName];
                    if (!id && id !== 0) {
                        return;
                    }
                    idx = array.indexOf(layerMosaicRule.lockRasterIds, id);
                    if (idx < 0) {
                        //add to the ordered preview item list
                        this._orderedPreviewItemFeatures.unshift(feature);
                        layerMosaicRule.lockRasterIds.unshift(id);
                        this.map.reorderLayer(layer, this.map.layerIds.length - 1);
                        layer.setMosaicRule(layerMosaicRule);
                        if (!layer.visible) {
                            layer.show();
                        }
                    }
                    else {
                        //remove from the ordered preview item list
                        featureIdxInOrderedArray = array.indexOf(this._orderedPreviewItemFeatures, feature);
                        if (featureIdxInOrderedArray > -1) {
                            this._orderedPreviewItemFeatures.splice(featureIdxInOrderedArray, 1);
                        }

                        layerMosaicRule.lockRasterIds.splice(idx, 1);
                        layer.setMosaicRule(layerMosaicRule);
                        if (layerMosaicRule.lockRasterIds.length === 0) {
                            layer.refresh();
                            layer.hide();
                        }
                    }
                }
                if (callback) {
                    on.once(layer, "update-end", callback);
                }
            },
            getServiceLayer: function (feature, service) {
                var def = new Deferred();
                var url = feature[this.COMMON_FIELDS.SERVICE_URL];

                if (feature[this.COMMON_FIELDS.RASTER_PREVIEW_BY_WHERE_CLAUSE]) {
                    if (this.whereClauseLayersByUrl[url]) {
                        def.resolve(this.whereClauseLayersByUrl[url])
                    }
                    else {
                        this.whereClauseQueryPartsByUrl[url] = [];
                        this.createSearchServiceLayer(feature, service, this.whereClauseLayersByUrl).then(function (layer) {
                            def.resolve(layer);
                        })
                    }
                }
                else {
                    if (this.lockRasterLayersByUrl[url]) {
                        def.resolve(this.lockRasterLayersByUrl[url])
                    }
                    else {
                        this.createSearchServiceLayer(feature, service, this.lockRasterLayersByUrl).then(function (layer) {
                            def.resolve(layer);
                        })
                    }
                }
                return def;
            },
            setLockRasterByUrl: function (serviceUrl, lockRasters, onCompleteCallback) {
                var layer, mosaicRule;
                layer = this.lockRasterLayersByUrl[serviceUrl];
                mosaicRule = layer.mosaicRule;
                if (!layer || !mosaicRule) {
                    return;
                }
                mosaicRule.lockRasterIds = lockRasters;
                layer.setMosaicRule(mosaicRule);
                if (onCompleteCallback) {
                    on.once(layer, "update-end", onCompleteCallback);
                }
            },
            hasItemsOnMap: function () {
                var key, currentLayer, currentMosaicRule;
                for (key in this.lockRasterLayersByUrl) {
                    if (this.lockRasterLayersByUrl.hasOwnProperty(key)) {
                        currentLayer = this.lockRasterLayersByUrl[key];
                        currentMosaicRule = currentLayer ? currentLayer.mosaicRule : null;
                        if (currentMosaicRule && currentMosaicRule.lockRasterIds && currentMosaicRule.lockRasterIds.length > 0) {
                            return true;
                        }
                    }
                }
                return false;
            },
            hasMultipleItemsOnMap: function () {
                var key, currentLayer, currentMosaicRule, currentCount = 0;
                for (key in this.lockRasterLayersByUrl) {
                    if (this.lockRasterLayersByUrl.hasOwnProperty(key)) {
                        currentLayer = this.lockRasterLayersByUrl[key];
                        currentMosaicRule = currentLayer ? currentLayer.mosaicRule : null;
                        if (currentMosaicRule && currentMosaicRule.lockRasterIds && currentMosaicRule.lockRasterIds.length > 0) {
                            currentCount += currentMosaicRule.lockRasterIds.length;
                            if (currentCount > 1) {
                                return true;
                            }
                        }
                    }
                }
                return false;
            },
            /**
             * creates a new mosaic rule for the layer
             * @private
             */
            _createWhereClauseMosaicRule: function (whereClause) {
                var mosaicRule = new MosaicRule();
                mosaicRule.method = MosaicRule.METHOD_NONE;
                mosaicRule.ascending = true;
                mosaicRule.operation = this.currentMosaicOperation;
                mosaicRule.where = whereClause;
                return mosaicRule;
            },
            /**
             * creates a new mosaic rule for the layer
             * @private
             */
            _createLockRasterMosaicRule: function () {
                var mosaicRule = new MosaicRule();
                mosaicRule.method = MosaicRule.METHOD_LOCKRASTER;
                mosaicRule.ascending = true;
                mosaicRule.operation = this.currentMosaicOperation;
                mosaicRule.lockRasterIds = [];
                return mosaicRule;
            },
            hide: function () {
                var key;
                for (key in this.lockRasterLayersByUrl) {
                    if (this.lockRasterLayersByUrl.hasOwnProperty(key)) {
                        //this.lockRasterLayersByUrl[key].hide();
                    }
                }
            },
            show: function () {
                var key;
                for (key in this.lockRasterLayersByUrl) {
                    if (this.lockRasterLayersByUrl.hasOwnProperty(key)) {
                        this.lockRasterLayersByUrl[key].show();
                    }
                }

            }
        });
    })
;