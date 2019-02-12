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
        "dojo/text!./template/ResultsWidgetTemplate.html",
        "dijit/_WidgetBase",
        "dijit/_TemplatedMixin",
        "dijit/_WidgetsInTemplateMixin",
        "dojo/_base/window",
        "dojo/dom-class",
        "dojo/_base/lang",
        "../BaseDiscoveryMixin",
        "dojo/Evented",
        "./base/ResultList/ResultList",
        "dijit/form/CheckBox",
        "./base/LayerSupport/ArchiveResultsGraphicsLayerSupport",
        "./base/LayerSupport/ResultImageServiceLayerSupport",
        "./model/ModelSupport",
        "./base/CommonDates",
        "./base/ResultFilter/ResultFilter",
        "./base/ResultSort/ResultSort",
        "./base/ReorderPreviews/ReorderPreviews",
        "./base/Analysis/AnalysisWidget",
        "./FeatureFilter",
        "dojo/_base/connect",
        "dojo/topic",
        "dojo/dom-construct",
        "dojo/dom-attr",
        "./base/Export/ExportResultsManager"
    ],
    function (declare, template, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, window, domClass, lang, BaseDiscoveryMixin, Evented, ResultList, CheckBox, ArchiveResultsGraphicsLayerSupport, ResultImageServiceLayerSupport, ModelSupport, CommonDates, ResultFilter, ResultSort, ReorderPreviews, AnalysisWidget, FeatureFilter, con, topic, domConstruct, domAttr, ExportResultsManager) {
        return declare([_WidgetBase, _TemplatedMixin, ModelSupport, Evented, BaseDiscoveryMixin, _WidgetsInTemplateMixin], {
            exportEnabled: false,
            iconEnabled: false,
            showAcquisitionDateFilter: true,
            showCloudCoverFilter: true,
            createResultFilter: false,
            _defaultNoResultsMessage: "There were no results returned for your search area",
            _defaultMinDateRangeFilterDelta: 86400000,
            showLayerManipulation: false,
            resultLayerClipRasterFunctionTemplate: null,
            templateString: template,
            thumbnailLoadErrorImage: "",
            archiveServiceTokenRefreshListeners: null,
            minUniqueValuesForTimeSlider: 30,
            widgetsInTemplate: true,
            CART_COUNT_CHANGED: "cartCountChanged",
            CLEAR_REQUEST: "clearRequest",
            ZOOM_TO_SEARCH_EXTENT: "zoomToSearchExtent",
            constructor: function (params) {

                lang.mixin(this, params || {});
                if (!this.minDateRangeFilterDelta && this.minDateRangeFilterDelta !== 0) {
                    this.minDateRangeFilterDelta = this._defaultMinDateRangeFilterDelta
                }
            },
            postCreate: function () {
                this.inherited(arguments);

                //create the container for the overlay widgets
                this.overlayContainer = domConstruct.create("div", {className: "discoveryOverlayContainer"});
                domConstruct.place(this.overlayContainer, this.domNode);

                //listen for requests on downloadable cart items
                topic.subscribe("discovery:getDownloadableCartItems", lang.hitch(this, this._handleGetDownloadableCartItems));
                topic.subscribe("discovery:getCartItems", lang.hitch(this, this._handleGetCartItems));
                topic.subscribe("discovery:getResultById", lang.hitch(this, this._handleGetResultById));


                this.defaultSearchCompleteDateRangePercent = this.defaultSearchCompleteDateRangePercent || 1.00;
                this.createResultList();
                this._createLayerSupport();
                if (this.createResultFilter) {
                    this._createResultFilter();
                }
                else {
                    this.hideResultFilterButton();

                }

                if (this.sortOptions && this.sortOptions.length > 0) {
                    this._createResultSort();
                }
                else {
                    this.hideSortButton();

                }

                if (this.showLayerManipulation) {
                    this._createAnalysisWidget();
                }
                else {
                    this._hideNode(this.analysisIcon);
                }
                this._createReorderPreviews();
                domAttr.set(this.noSearchResultsMessageContainer, "innerHTML", this.noResultsMessage || this._defaultNoResultsMessage);

                if (!this.exportEnabled) {
                    this._hideNode(this.exportResultsIcon);
                }


            },
            clear: function () {
                this.currentSearchGeometry = null;
                this.resultList.clear();
                if (this.resultFilter) {
                    this.showResultFilterIcon();
                    this.resultFilter.clear();
                }
                if (this.resultSort) {
                    this.resultSort.clear();
                }
                this.reorderPreviews.clear();
                this.hideReorderPreview();
                this.hideReorderPreviewButton();
                if (this.resultFilter) {
                    this.hideResultFilter();
                    this.resultFilter.showFilters();
                }
                this.showResultFilterButton();
                this.hideAnalysis();
                this.hideSort();
                this.hideCartIcon();
                if (this.archiveGraphicsLayerSupport) {
                    this.archiveGraphicsLayerSupport.clear();

                    this.archiveGraphicsLayerSupport.currentSearchGeometry = null;
                }
                if (this.archiveImageServiceLayerSupport) {
                    this.archiveImageServiceLayerSupport.clear();
                    this.archiveImageServiceLayerSupport.currentSearchGeometry = null;
                }
                if (this.analysisWidget) {
                    this.analysisWidget.clear();
                }
                this._deactivateButton(this.toggleCartItemsIcon);
            },
            closeCurrentResultPopup: function () {
                this.resultList.closeCurrentResultPopup();
            },
            _createReorderPreviews: function () {
                this.reorderPreviews = new ReorderPreviews({
                    nls: this.nls
                });
                this.reorderPreviews.placeAt(this.overlayContainer);
                this.reorderPreviews.on("orderChanged", lang.hitch(this, this.handleReorderPreviewImages));
                this.reorderPreviews.on("addItemToCart", lang.hitch(this, this._handleAddToCartRequest));
                this.reorderPreviews.on("removeItemFromCart", lang.hitch(this, this._handleRemoveFromCartRequest));
                this.reorderPreviews.on("removePreview", lang.hitch(this, this._handleRemovePreviewRequest));
                this.reorderPreviews.on("showExtentGeometry", lang.hitch(this, this.showExtentGeometry));
                this.reorderPreviews.on("hideExtentGeometry", lang.hitch(this, this.hideExtentGeometry));
            },
            _createAnalysisWidget: function () {
                if (this.analysisWidget) {
                    return;
                }
                this.analysisWidget = new AnalysisWidget({
                    nls: this.nls
                });
                this.analysisWidget.placeAt(this.overlayContainer);
            },
            _createResultSort: function () {
                this.resultSort = new ResultSort({
                    nls: this.nls,
                    sortOptions: this.sortOptions
                });
                this.resultSort.placeAt(this.overlayContainer);
                this.resultSort.on("sortChange", lang.hitch(this, this.handleSortChange));
            },
            _createResultFilter: function () {
                var defaultCloudCover = this.defaultCloudCover;
                if (!defaultCloudCover && defaultCloudCover !== 0) {
                    defaultCloudCover = 10;
                }
                this.resultFilter = new ResultFilter({
                    nls: this.nls,
                    showCloudCoverFilter: this.showCloudCoverFilter,
                    showAcquisitionDateFilter: this.showAcquisitionDateFilter,
                    defaultCloudCover: defaultCloudCover,
                    useUTCDate: this.useUTCDate,
                    dateFormat: this.dateFormat
                });
                this.resultFilter.placeAt(this.overlayContainer);
                this.resultFilter.on("refreshResults", lang.hitch(this, this.refreshResults));
                this.resultFilter.on("showCartItemsOnly", lang.hitch(this, this.setCartOnlyFilter));
                this.resultFilter.on("clearCartItemsOnly", lang.hitch(this, this.clearCartOnlyFilter));
                this.resultFilter.on("clearPreviews", lang.hitch(this, this.clearPreviews));

                if (!this.iconEnabled) {
                    this.resultFilter.hideIconPlatformsContainer();
                }

            },
            getCloudCover: function () {
                if (this.resultFilter) {
                    return this.resultFilter.getCloudCover();
                }
                return null;
            },
            exportResultsToCSV: function () {
                if (!this.exportResultsManager) {
                    this.exportResultsManager = new ExportResultsManager({
                        useUTCDate: this.useUTCDate,
                        dateFormat: this.dateFormat
                    });
                }
                var resultListItems = this.resultList.getUnfilteredResults();
                this.exportResultsManager.resultFeaturesToCSV(resultListItems);

            },
            createResultList: function () {
                this._createResultList();
                this.resultList.placeAt(this.resultEntriesContainer);
                this.resultList.on("cartCountChanged", lang.hitch(this, this._onCartCountChanged));
                this.resultList.on("itemAddedToCart", lang.hitch(this, this.handleItemAddedToCart));
                this.resultList.on("itemRemovedFromCart", lang.hitch(this, this.handleItemRemovedFromCart));
                this.resultList.on("zoomToResult", lang.hitch(this, this.zoomToResult));
                this.resultList.on("hideExtentGeometry", lang.hitch(this, this.hideExtentGeometry));
                this.resultList.on("showExtentGeometry", lang.hitch(this, this.showExtentGeometry));
                this.resultList.on("hideMapImageThumb", lang.hitch(this, this.hideMapImageThumb));
                this.resultList.on("showMapImageThumb", lang.hitch(this, this.showMapImageThumb));
                this.resultList.on("togglePreviewItem", lang.hitch(this, this.togglePreviewItemFromList));
                this.resultList.on("refreshPreviewItems", lang.hitch(this, this.handleRefreshPreviewItems));
                this.resultList.on("refreshResults", lang.hitch(this, this.refreshResults));
            },
            _createResultList: function () {
                this.resultList = new ResultList({
                    nls: this.nls,
                    useUTCDate: this.useUTCDate,
                    dateFormat: this.dateFormat,
                    thumbnailLoadErrorImage: this.thumbnailLoadErrorImage
                });

            },
            handleRefreshPreviewItems: function () {
                if (this.archiveImageServiceLayerSupport) {
                    var visiblePreviewCount;
                    visiblePreviewCount = this.archiveImageServiceLayerSupport.refreshPreviews();

                    if (visiblePreviewCount > 1) {
                        this.showReorderPreviewButton();
                    }
                    else {
                        this.hideReorderPreviewButton();
                    }
                }
            },
            _createLayerSupport: function () {
                this.archiveGraphicsLayerSupport = new ArchiveResultsGraphicsLayerSupport({map: this.map});
            },
            _createImageServiceLayerSupport: function () {
                if (this.analysisWidget) {
                    this.analysisWidget.clear();
                }
                if (this.archiveImageServiceLayerSupport) {
                    this.archiveImageServiceLayerSupport.clear();
                    if (this.imageServiceLayerAddedListener) {
                        this.imageServiceLayerAddedListener.remove();
                        this.imageServiceLayerAddedListener = null;
                    }
                }
                this.archiveImageServiceLayerSupport = new ResultImageServiceLayerSupport({
                    map: this.map,
                    rasterFunctionTemplate: this.resultLayerClipRasterFunctionTemplate
                });
                if (this.currentSearchGeometry) {
                    this.archiveImageServiceLayerSupport.currentSearchGeometry = this.currentSearchGeometry;
                }
                this.imageServiceLayerAddedListener = this.archiveImageServiceLayerSupport.on("layerAdded", lang.hitch(this, this.handleImageLayerAdded));

            },
            handleImageLayerAdded: function (layer) {
                if (this.analysisWidget) {
                    this.analysisWidget.addLayer(layer);
                }
            },
            _handleRemovePreviewRequest: function (feature) {
                this.resultList._handleRemovePreviewRequest(feature);
            },
            _handleRemoveFromCartRequest: function (feature) {
                this.resultList._handleRemoveFromCartRequest(feature);

            },
            _handleAddToCartRequest: function (feature) {
                this.resultList._handleAddToCartRequest(feature);
            },
            toggleCartItemsOnly: function () {
                if (this.isCartOnlyMode()) {
                    this.clearCartOnlyFilter();
                }
                else {
                    this.setCartOnlyFilter();
                }
            },
            setCartOnlyFilter: function () {
                if (this.resultFilter) {
                    this.hideResultFilterIcon();
                    if (!this.archiveImageServiceLayerSupport.hasItemsOnMap()) {
                        this.hideResultFilter();
                        this.hideResultFilterButton();
                    }
                    else {
                        this.showResultFilterButton();
                    }

                    this.resultFilter.hideFilters();
                }
                this.resultList.setInCartOnlyMode();
                this._activeButton(this.toggleCartItemsIcon);

            },
            clearCartOnlyFilter: function () {
                if (this.resultFilter) {
                    this.showResultFilterIcon();
                    this.resultFilter.showFilters();
                    this.showResultFilterButton();
                }
                this._deactivateButton(this.toggleCartItemsIcon);
                this.resultList.clearCartOnlyMode();
                this.refreshResults();
            },

            handleCloudCoverChange: function (value) {
                this.refreshResults();
            },
            handleDateChange: function (value) {
                if (value && value.length === 2) {
                    this.refreshResults();
                }
            },
            setAutomaticFieldConfiguration: function (automaticFieldConfiguration) {
                this.automaticFieldConfiguration = automaticFieldConfiguration;
                this.resultList.setAutomaticFieldConfiguration(this.automaticFieldConfiguration);
            },
            setInstantFieldConfiguration: function (instantFieldConfiguration) {
                this.instantFieldConfiguration = instantFieldConfiguration;
                this.resultList.setInstantFieldConfiguration(this.instantFieldConfiguration);
            },
            setResults: function (resultItems, resultServices, searchGeometry) {
                if (!resultItems || resultItems.length === 0) {
                    this.showNoResultsContainer();
                    return;

                }

                this.showResultsContainer();
                this.currentSearchGeometry = searchGeometry;
                this._createImageServiceLayerSupport(resultServices);
                if (!resultItems) {
                    return;
                }
                var commonDates, dateDelta;
                if (this.archiveImageServiceLayerSupport) {
                    this.archiveImageServiceLayerSupport.clear();
                    this.archiveImageServiceLayerSupport.currentSearchGeometry = searchGeometry;
                    this.archiveGraphicsLayerSupport.currentSearchGeometry = searchGeometry;
                }
                if (this.resultSort) {
                    this.resultSort.createSorter();
                }
                if (this.resultFilter) {
                    commonDates = new CommonDates(resultItems, this.useUTCDate);

                    dateDelta = (commonDates.getMax() - commonDates.getMin());
                    if (commonDates.getUniqueCount() > 0 && (dateDelta >= this.minDateRangeFilterDelta)) {
                        this.resultFilter.createDateSlider(commonDates.getMin(), commonDates.getMax(), commonDates.getUniqueCount(), commonDates.getMin());
                    }
                    else {
                        this.resultFilter.destroyDateSlider();
                    }
                    //set the icon platforms

                    if (this.iconEnabled) {
                        var uniquePlatforms = {}, uniquePlatformArray = [];

                        for (var i = 0; i < resultItems.length; i++) {
                            if (resultItems[i][this.COMMON_FIELDS.IS_ICON_RESULT]) {
                                uniquePlatforms[resultItems[i].attributes.PlatformName] = resultItems[i].attributes.PlatformName;
                            }
                        }
                        for (var key in uniquePlatforms) {
                            if (uniquePlatforms.hasOwnProperty(key)) {
                                uniquePlatformArray.push(key);
                            }
                        }
                        this.resultFilter.setIconPlatformFilter(uniquePlatformArray.sort());
                    }
                }
                this.resultList.setResults(resultItems);
                this.showMessage(this.nls.searchReturned + " " + resultItems.length + " " + this.nls.result + (resultItems.length === 1 ? "" : "s"));
                //set the filters
                this.refreshResults();
            },
            _createArchiveServiceTokenRefreshListeners: function () {
                //creates listeners for token change so we can update the thumbnail tokens in the result set

            },
            clearPreviews: function () {
                this.resultList.clearPreviews();
                this.archiveImageServiceLayerSupport.clear();
                this.hideReorderPreview();
                this.hideReorderPreviewButton();
                if (this.isCartOnlyMode()) {
                    this.hideResultFilter();
                    this.hideResultFilterButton();
                }
                if (this.analysisWidget) {
                    this.analysisWidget.showNoLayersActiveContainer();
                }
            },
            removeAllItemsFromCart: function () {
                this.resultList.removeAllItemsFromCart();
            },
            isCartOnlyMode: function () {
                return this.isButtonActive(this.toggleCartItemsIcon);
            },
            refreshResults: function () {
                if (this.isCartOnlyMode()) {
                    return;
                }
                this.resultList.setResultFilter(this._createFeatureFilter());
            },
            _createFeatureFilter: function () {
                return new FeatureFilter(this._getCurrentFeatureFilterParameters());
            },
            _getCurrentFeatureFilterParameters: function () {
                var fullCloudCoverValue, dateRange, cloudCoverDecimalValue, featureFilterParameters, featureFilter;
                fullCloudCoverValue = this.getCloudCover();
                featureFilterParameters = {};

                if (fullCloudCoverValue) {
                    cloudCoverDecimalValue = (fullCloudCoverValue * 0.01);
                }
                else if (fullCloudCoverValue === 0) {
                    cloudCoverDecimalValue = 0;
                }
                if (this.resultFilter) {
                    dateRange = this.resultFilter.getDateRange();
                    if (dateRange) {
                        if (dateRange.start) {
                            featureFilterParameters.startDate = dateRange.start;
                        }
                        if (dateRange.end) {
                            featureFilterParameters.endDate = dateRange.end;
                        }
                    }
                    featureFilterParameters.selectedIconPlatforms = this.resultFilter.getSelectedIconPlatforms();
                }
                featureFilterParameters.filteredArchiveSensorTypes = [];
                featureFilterParameters.cloudCover = cloudCoverDecimalValue;
                return featureFilterParameters;
            },
            handleSortChange: function (sortObj) {
                if (!sortObj) {
                    return;
                }
                this.resultList.setSort(sortObj);
                this.resultSort.hide();
                if (domClass.contains(this.toggleResultSortIcon, "active")) {
                    domClass.remove(this.toggleResultSortIcon, "active");
                }
            },
            _handleGetDownloadableCartItems: function (callback) {
                if (callback && lang.isFunction(callback)) {
                    callback(this.getDownloadableCartItems());
                }
            },
            getDownloadableCartItems: function () {
                var i, currentCartItem, allCartItems = this.resultList.getCartItems(), downloadableCartItems = [];
                if (allCartItems && allCartItems.archive) {
                    for (i = 0; i < allCartItems.archive.length; i++) {
                        currentCartItem = allCartItems.archive[i];
                        if (currentCartItem && currentCartItem[this.COMMON_FIELDS.SERVICE_FIELD].downloadEnabled) {
                            downloadableCartItems.push(currentCartItem);
                        }
                    }
                }
                return downloadableCartItems;
            },
            getCartItemCount: function () {
                return this.resultList.getCartItemCount();
            },
            _handleGetCartItems: function (callback) {
                if (callback && lang.isFunction(callback)) {
                    callback(this.getCartItems());
                }
            },
            getCartItems: function () {
                return this.resultList.getCartItems();
            },
            _onCartCountChanged: function (count) {
                if (!count || count === 0) {
                    this.hideCartIcon();
                }
                else {
                    this.showCartIcon();
                }
                this.emit(this.CART_COUNT_CHANGED, count);
            },
            handleItemAddedToCart: function (feature) {
                this.reorderPreviews.itemAddedToCart(feature);
            },
            handleItemRemovedFromCart: function (feature) {
                this.reorderPreviews.itemRemovedFromCart(feature);
            },
            zoomToResult: function (feature) {
                if (feature && feature.geometry && feature.geometry.getExtent) {
                    this.map.setExtent(feature.geometry.getExtent());
                }
            },
            showMapImageThumb: function (feature) {
                this.archiveGraphicsLayerSupport.showThumbnail(feature);
            },
            hideMapImageThumb: function () {
                this.archiveGraphicsLayerSupport.clearMapThumbnails();
            },
            showExtentGeometry: function (feature) {
                this.archiveGraphicsLayerSupport.showExtentGeometry(feature);
            },
            hideExtentGeometry: function () {
                this.archiveGraphicsLayerSupport.clearExtentGeometries();
            },
            togglePreviewItemFromList: function (feature, callback) {
                this.togglePreviewItem(feature, callback);

            },
            togglePreviewItem: function (feature, callback) {
                this.archiveImageServiceLayerSupport.toggleItemOnMap(feature, callback);
                if (this.archiveImageServiceLayerSupport.hasItemsOnMap()) {
                    this.showResultFilterButton();
                    if (this.analysisWidget) {
                        this.analysisWidget.showLayersActiveContainer();
                    }
                    if (this.resultFilter) {
                        this.resultFilter.showClearPreviewsContainer();
                    }
                    if (this.isReorderPreviewButtonHidden() && this.archiveImageServiceLayerSupport.hasMultipleItemsOnMap()) {
                        this.showReorderPreviewButton();
                    }
                }
                else {
                    if (this.resultFilter) {
                        this.resultFilter.hideClearPreviewsContainer();
                    }
                    if (this.analysisWidget) {
                        this.analysisWidget.showNoLayersActiveContainer();
                    }
                }
                var previewFeatures = this.getPreviewFeatures();
                if (!previewFeatures || previewFeatures.length < 2) {
                    if (this.reorderPreviews.isVisible()) {
                        this.hideReorderPreview();
                    }
                    this.hideReorderPreviewButton();
                }
                else {
                    if (this.reorderPreviews.isVisible()) {
                        this.reorderPreviews.setPreviewFeatures(previewFeatures);
                    }
                }
            },
            handleUserClear: function () {
                this.emit(this.CLEAR_REQUEST);
            },
            getPreviewFeatures: function () {
                return this.archiveImageServiceLayerSupport.getVisibleOrderedPreviewItemFeatures();
            },
            handleReorderPreviewImages: function (features) {
                this.reorderPreviews.showSpinner();
                this.archiveImageServiceLayerSupport.setOrderedPreviewItemFeatures(features).then(lang.hitch(this, function () {
                    this.reorderPreviews.hideSpinner();
                }));

            },
            _handleGetResultById: function (resultId, callback) {
                if (callback && lang.isFunction(callback) && this.resultList) {
                    callback(this.resultList.getResultById(resultId));
                }
            },
            clearTooltips: function () {
                this.resultList.closeCurrentResultPopup();
            }
        });
    });
