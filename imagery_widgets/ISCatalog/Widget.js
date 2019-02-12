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
        "jimu/BaseWidget",
        "dojo/_base/lang",
	"dojo/dom-style",
        "dojo/dom-construct",
        "./model/ModelSupport",
        "dojo/_base/window",
        "./base/BaseDiscoveryMixin",
        "./base/DrawManager",
        "./base/IconSearch/IconSearch",
        "./base/ArchiveSearch/ArchiveSearch",
        "./mixin/ArchiveResultProcessorMixin",
        "./mixin/IconResultProcessorMixin",
        "./base/CheckoutWidget/CheckoutWidget",
        "./base/Results/ResultsWidget",
        "esri/urlUtils",
        "./base/SearchFilter/SearchFilter",
        "./base/SearchFilter/IconSearchFilter",
        "./base/SearchSourcesWidget/SearchSourcesWidget",
        "./base/UserAwareMixin",
        "esri/geometry/Point",        
        "esri/tasks/BufferParameters",
        "./base/SearchByBoundsWidget/SearchByBoundsWidget",
        "esri/config",        
        "./widgets/ISCatalog/lib/filesaver/Blob.js",
        "./widgets/ISCatalog/lib/filesaver/FileSaver.js",
        "./widgets/ISCatalog/lib/papa_parse.js"
    ],
    function (declare, BaseWidget, lang, domStyle, domConstruct, ModelSupport, window, BaseDiscoveryMixin, DrawManager, IconSearch, ArchiveSearch, ArchiveResultProcessorMixin, IconResultProcessorMixin, CheckoutWidget, ResultsWidget, urlUtils, SearchFilter, IconSearchFilter, SearchSourcesWidget, UserAwareMixin, Point, BufferParameters, SearchByBoundsWidget, esriConfig) {
        return declare([BaseWidget, UserAwareMixin, ModelSupport, ArchiveResultProcessorMixin, IconResultProcessorMixin, BaseDiscoveryMixin], {
            currentArchiveResponse: null,
            currentIconResponse: null,
            messageEntriesContainerClass: "imageDiscoveryMessages",
            name: 'Image Discovery',
            baseClass: 'jimu-widget-image-discovery',
            instantResultsFeatureSetSchema: null,
            automaticResultsFeatureSetSchema: null,
            resultsWidgetsFootprintsVisibleBeforeClose: false,
            postCreate: function () {
                this.inherited(arguments);
                if (this.config.discoveryTools) {
                    lang.mixin(this.discoveryTools, this.config.discoveryTools);
                }
                this.setVisibleDiscoveryTools();
                if (!this.config.searchServices || !this.config.searchServices.length || this.config.searchServices.length < 2) {
                    this.disableSearchServicesCheckboxesView();
                }
                this.appProxyUrl = this.appConfig.httpProxy;
                this.portalUrl = this.appConfig.portalUrl;
                this._createSearchFilter();
                //check for proxying
                var i, proxyHosts, proxyRule;
                if (this.config && this.config.proxyConfig) {
                    proxyHosts = this.config.proxyConfig.proxyHosts;
                    if (proxyHosts && proxyHosts.length) {
                        for (i = 0; i < proxyHosts.length; i++) {
                            proxyRule = {
                                urlPrefix: proxyHosts[i],
                                proxyUrl: this.config.proxyConfig.proxyUrl
                            };
                            urlUtils.addProxyRule(proxyRule);
                        }
                    }
                }
	        this.map.on("extent-change", lang.hitch(this, this.extentChange));               
                this._initResultsWidget();
                //create progress bar
                this.initProgressBar();
                this._createDrawManager();
                this._createArchiveSearch();
                if (this.config.iconConfiguration) {
                    this._createIconSearch();
                    this._createIconSearchFilter();
                }
                this._createCheckoutWidget();
                this._createSearchSourcesWidget();
                this._createSearchByBoundsWidget();
                if (this.config.shoppingCartButtonLabel) {
                    this.setShoppingCartLabel(this.config.shoppingCartButtonLabel);
                }
                if (!this.config.showLayerManipulation || !this.config.searchServices || !this.config.searchServices.length) {
                    domConstruct.destroy(this.analysisTutorialEntry);
                }
            },
            onOpen: function () {
                    if(this.map.getLevel() < 10) {
                            domStyle.set(this.imageDiscoveryZoomError, "display", "block");
                            domStyle.set(this.imageDiscoveryMainFunctionality, "display", "none");
                    }
                    else {
                            domStyle.set(this.imageDiscoveryZoomError, "display", "none");
                            domStyle.set(this.imageDiscoveryMainFunctionality, "display", "block");
                    }
            },
            extentChange: function (evt) {
                    if(!this.currentArchiveResponse){
                            if(evt.levelChange) {
                                    if(this.map.getLevel() < 10) {
                                            domStyle.set(this.imageDiscoveryZoomError, "display", "block");
                                            domStyle.set(this.imageDiscoveryMainFunctionality, "display", "none");
                                    }
                                    else {
                                            domStyle.set(this.imageDiscoveryZoomError, "display", "none");
                                            domStyle.set(this.imageDiscoveryMainFunctionality, "display", "block");
                                    }
                            }
                    }
            },
            _createSearchByBoundsWidget: function () {
                this.searchByBoundsWidget = new SearchByBoundsWidget({
                    nls: this.nls,
                    map: this.map,
                    utmSearchConfiguration: this.config.utmSearchConfiguration
                });
                this.searchByBoundsWidget.on("enableSearchButton", lang.hitch(this, this.enableSearchButton));
                this.searchByBoundsWidget.on("disableSearchButton", lang.hitch(this, this.disableSearchButton));
                this.searchByBoundsWidget.placeAt(this.discoveryActionSearchByBoundsInputs);
            },
            _createSearchSourcesWidget: function () {
                this.searchSourcesWidget = new SearchSourcesWidget({
                    searchServices: this.config.searchServices
                });
                this.searchSourcesWidget.placeAt(this.searchSourcesContainer);
            },
            _createSearchFilter: function () {
                if (!this.searchFilter) {
                    var showAcquisitionDateFilter = false;
                    var showCloudCoverFilter = false;
                    for (var i = 0; i < this.config.searchServices.length; i++) {
                        if (this.config.searchServices[i].commonFields) {
                            if (this.config.searchServices[i].commonFields.cloudCover) {
                                showCloudCoverFilter = true;
                            }
                            if (this.config.searchServices[i].commonFields.acquisitionDate) {
                                showAcquisitionDateFilter = true;
                            }
                        }
                        if (showCloudCoverFilter && showAcquisitionDateFilter) {
                            break;
                        }
                    }
                    if (this.config.iconConfiguration) {
                        if (!showCloudCoverFilter) {
                            showCloudCoverFilter = true;
                        }
                        if (!showAcquisitionDateFilter) {
                            showAcquisitionDateFilter = true;
                        }
                    }
                    this.searchFilter = new SearchFilter({
                        nls: this.nls,
                        showCloudCover: showCloudCoverFilter,
                        showAcquisitionDate: showAcquisitionDateFilter
                    });
                    this.searchFilter.placeAt(this.searchFilterContainer);
                }
            },
            destroy: function () {
                this.clear();
                this.inherited(arguments);
            },
            clear: function () {
                this.drawManager.clear();
                if (this.resultsWidget) {
                    this.resultsWidget.clear();
                }
                this.disableSearchButton();
                this.showSearchSourcesWidget();
                this.showPreSearchText();
                this.hideResultsContainer();
                this.showSearchActionsContainer();
                this.updateOrderItemsCount(0);
                this.hideReviewAndSubmitButton();
                this.showSearchFilter();
                this.showIconSearchFilter();
                this.clearSearchViews();

            },
            showView: function () {
                if (this.resultsWidget) {
                    this.resultsWidget.show();
                }
                this.drawManager.showExtentGraphic();
            },
            hideView: function () {
                if (this.resultsWidget) {
                    this.resultsWidget.hide();
                }
                this.drawManager.hideExtentGraphic();
            },
            /**
             * creates the shopping cart messaging modal widget
             * @private
             */
            _createCheckoutWidget: function () {
                if (!this.checkoutWidget) {
                    this.checkoutWidget = new CheckoutWidget({
                        portalUrl: this.appConfig.portalUrl,
                        nls: this.nls,
                        map: this.map,
                        webmapConfiguration: this.config.webmap,
                        csvExportEnabled: this.config.csvExportEnabled,
                        reportingConfiguration: this.config.reporting,
                        hasDownloadService: this.hasDownloadService(),
                        useUTCDate: this.config.useUTCDate,
                        dateFormat: this.config.dateFormat,
                        thumbnailLoadErrorImage: this.config.thumbnailLoadErrorImage

                    });
                    this.checkoutWidget.placeAt(window.body());
                    this.checkoutWidget.on("removeItemFromCart", lang.hitch(this, this._handleCheckoutWidgetRemoveItemFromCartRequest));
                }
            },
            _handleCheckoutWidgetRemoveItemFromCartRequest: function (feature) {
                if (!this.checkoutWidget) {
                    return;
                }
                this.resultsWidget._handleRemoveFromCartRequest(feature);
                //need to validate the items in the cart again in case the min archive area hasn't been met
                var cartItems = this.resultsWidget.getCartItems();
                if (!cartItems || !cartItems.archive || !cartItems.archive.length) {
                    this.checkoutWidget.hide();
                }
            },
            _createIconSearchFilter: function () {
                this.iconSearchFilter = new IconSearchFilter({
                    nls: this.nls
                });
                domConstruct.place(this.iconSearchFilter.domNode, this.iconSearchFilterContainer);
            },
            _createIconSearch: function () {
                this._iconSearch = new IconSearch({
                    nls: this.nls,
                    iconGpUrl: this.config.iconConfiguration.url,
                    outputSpatialReference: this.map.extent.spatialReference
                });
            },
            _createArchiveSearch: function () {
                this._archiveSearch = new ArchiveSearch({nls: this.nls, searchServices: this.config.searchServices});
            },
            _createDrawManager: function () {
                this.drawManager = new DrawManager({map: this.map, drawConstraints: this.config.drawConstraints});
                this.drawManager.on(this.drawManager.DRAW_END, lang.hitch(this, this.handleDrawEnd));
            },
            _initResultsWidget: function () {
                if (!this.resultsWidget) {
                    this.resultsWidget = this._createResultsWidget();
                    this.resultsWidget.placeAt(this.resultsContainer);
                    this.resultsWidget.on(this.resultsWidget.CART_COUNT_CHANGED, lang.hitch(this, this._handleCartCountChanged));
                    this.resultsWidget.on(this.resultsWidget.CLEAR_REQUEST, lang.hitch(this, this.clear));
                    this.resultsWidget.on(this.resultsWidget.ZOOM_TO_SEARCH_EXTENT, lang.hitch(this, this.handleZoomToSearchExtent));
                }
            },
            _createResultsWidget: function () {
                return new ResultsWidget(this._getResultsWidgetParameters());
            },
            _getResultsWidgetParameters: function () {
                var hasCloudCoverFieldOnService = false;
                var hasAcquisitionDateOnService = false;
                if (this.config.searchServices && this.config.searchServices.length > 0) {
                    for (var i = 0; i < this.config.searchServices.length; i++) {
                        if (this.config.searchServices[i].commonFields) {
                            if (this.config.searchServices[i].commonFields.cloudCover) {
                                hasCloudCoverFieldOnService = true;
                            }
                            if (this.config.searchServices[i].commonFields.acquisitionDate) {
                                hasAcquisitionDateOnService = true;
                            }
                        }
                    }
                }
                var params = {
                    nls: this.nls,
                    exportEnabled: this.config.csvExportEnabled,
                    minDateRangeFilterDelta: this.config.minDateRangeFilterDelta,
                    createResultFilter: hasCloudCoverFieldOnService || hasAcquisitionDateOnService,
                    showCloudCoverFilter: hasCloudCoverFieldOnService,
                    showAcquisitionDateFilter: hasAcquisitionDateOnService,
                    showLayerManipulation: this.config.showLayerManipulation && (this.config.searchServices && this.config.searchServices.length > 0),
                    useUTCDate: this.config.useUTCDate,
                    dateFormat: this.config.dateFormat,
                    thumbnailLoadErrorImage: this.config.thumbnailLoadErrorImage,
                    defaultCloudCover: this.config.defaultCloudCover,
                    defaultSearchCompleteDateRangePercent: this.config.defaultSearchCompleteDateRangePercent,
                    sortOptions: this.config.sortOptions,
                    map: this.map,
                    resultLayerClipRasterFunctionTemplate: this.config.resultLayerClipRasterFunctionTemplate,
                    iconEnabled: this.config.iconConfiguration && this.config.iconConfiguration.url ? true : false
                };
                if (this.config.noResultsMessage) {
                    params.noResultsMessage = this.config.noResultsMessage;

                }
                return params;
            },
            handleDrawEnd: function (graphic) {
                var pointBufferValue = this.pointDrawBufferValue.get("value");
                if (graphic && graphic.geometry && graphic.geometry instanceof Point && (esriConfig.defaults && esriConfig.defaults.geometryService) && !isNaN(pointBufferValue)) {
                    this.bufferPoint(graphic);
                }
                else {
                    this.drawManager.setMapGraphic(graphic);
                    this._performSearch();
                }
            },
            bufferPoint: function (graphic) {
                var pointBufferValue = this.pointDrawBufferValue.get("value"), bufferUnits = this.pointDrawBufferUnits.get("value");
                if (!isNaN(pointBufferValue)) {
                    var callback = lang.hitch(this, this.handlePointBufferResponse);
                    var errback = lang.hitch(this, this.handlePointBufferError, graphic);
                    var params = new BufferParameters();
                    params.geometries = [graphic.geometry];
                    params.distances = [pointBufferValue];
                    params.unit = parseInt(bufferUnits, 10);
                    params.bufferSpatialReference = graphic.geometry.spatialReference;
                    params.outSpatialReference = this.map.extent.spatialReference;
                    esriConfig.defaults.geometryService.buffer(params, callback, errback);
                }
            },
            handlePointBufferError: function (graphic) {
                this.drawManager.setMapGraphic(graphic);
            },
            handlePointBufferResponse: function (geometries) {
                if (geometries && geometries.length > 0) {
                    var graphic = this.drawManager.getGeometryGraphic(geometries[0]);
                    this.drawManager.setMapGraphic(graphic);
                    this._performSearchFromGeometry(graphic.geometry);
                }
            },
            _handleSearchButtonClicked: function () {
                if (this.isBoundsSearchVisible()) {
                    this.searchByBoundsWidget.getBoundsSearchGeometry().then(lang.hitch(this, function (geometry) {
                        if (!geometry) {
                            return;
                        }
                        var graphic = this.drawManager.getGeometryGraphic(geometry);
                        this.drawManager.setMapGraphic(graphic);
                        this._performSearchFromGeometry(geometry);
                    }));
                }

            },
            _performSearchFromGeometry: function (geometry) {
                if (!geometry) {
                    return;
                }
                this.currentArchiveResponse = null;
                this.currentIconResponse = null;
                var cloudCover, startDate, endDate, userQueryParameters = {}, searchServices;
                searchServices = this.searchSourcesWidget.getActiveSources();
                if ((!searchServices || searchServices.length === 0) && !this._iconSearch) {
                    this.clear();
                    return;
                }
                this.hideSearchSourcesWidget();
                this.hideSearchFilter();
                this.hideIconSearchFilter();
                if (this.resultsWidget) {
                    this.resultsWidget.clear();
                }
                this.hideSearchActionsContainer();
                this.hideResultsContainer();
                this.showDuringSearchText();
                this.clearSearchViews();
                this.showProgressBar();
                cloudCover = this.searchFilter.getCloudCover();
                startDate = this.searchFilter.getStartDate();
                endDate = this.searchFilter.getEndDate();
                userQueryParameters[this.SEARCH_FIELDS.ACQUISITION_DATE] = [startDate, endDate];
                if (cloudCover !== 100) {
                    userQueryParameters[this.SEARCH_FIELDS.CLOUD_COVER] = cloudCover;
                }
                this._iconResults = null;
                if (this._iconSearch) {
                    this._iconSearch.performIconSearches(geometry, userQueryParameters, this.iconSearchFilter.getSearchParameters()).then(lang.hitch(this, function (result) {
                        this._iconResults = result;
                        if (this._archiveResults || !searchServices || searchServices.length === 0) {
                            this._handleQueryResponse(geometry, this._archiveResults, this._iconResults);
                        }
                    }));
                }
                this._archiveResults = null;
                if (searchServices && searchServices.length > 0) {
                    this._archiveSearch.performArchiveSearches(geometry, userQueryParameters, searchServices).then(lang.hitch(this, function (results) {
                        this._archiveResults = results;
                        if (!this._iconSearch || this._iconResults) {
                            this._handleQueryResponse(geometry, this._archiveResults, this._iconResults);
                        }
                    }));
                }
            },
            /**
             * listener for search button click
             * @private
             */
            _performSearch: function () {
                var extentGraphic;
                extentGraphic = this.drawManager.getSearchGraphic();
                if (!extentGraphic || !extentGraphic.geometry) {
                    return;
                }
                this._performSearchFromGeometry(extentGraphic.geometry);

            },
            handleZoomToSearchExtent: function () {
                var searchExtentGraphic = this.drawManager.getSearchGraphic();
                if (this.map && searchExtentGraphic && searchExtentGraphic.geometry) {
                    this.map.setExtent(searchExtentGraphic.geometry);
                }
            },
            _handleQueryResponse: function (geometry, archiveResults, iconResults) {
                var i, currentResult;
                if (archiveResults) {
                    for (i = 0; i < archiveResults.length; i++) {
                        currentResult = archiveResults[i];
                        if (!currentResult) {
                            this.showError(this.nls.errorQueryingService);
                        }
                        else if (currentResult.error) {
                            if (currentResult.searchService) {
                                this.showError(this.nls.errorQueryingService + " " + archiveResults[i].searchService.label || "");
                            }
                            else {
                                this.showError(this.nls.errorQueryingService);
                            }
                        }
                    }
                }
                if (iconResults) {
                    iconResults.searchService = this.config.iconConfiguration ? this.config.iconConfiguration.serviceConfiguration : {};
                }
                this.currentIconResponse = iconResults;
                this.currentArchiveResponse = archiveResults;
                this._handleSearchComplete(geometry);
            },
            _handleSearchComplete: function (geometry) {
                var allResults = [], processedArchiveResults, processedIconResults, responseTimeMS = new Date().getTime();
                if (this.currentArchiveResponse) {
                    processedArchiveResults = this.createArchiveResults(this.currentArchiveResponse, responseTimeMS);
                    allResults = processedArchiveResults.items;
                }
                if (this.currentIconResponse) {
                    processedIconResults = this.createIconResults(this.currentIconResponse, responseTimeMS);
                    allResults = allResults.concat(processedIconResults.items);
                }
                if (!allResults || allResults.length === 0) {
                    this._hideNode(this.imageDiscoveryCheckoutContainer);

                }
                else {
                    this._showNode(this.imageDiscoveryCheckoutContainer)

                }
                this.resultsWidget.setResults(allResults, processedArchiveResults ? processedArchiveResults.resultServices : null, this.drawManager.currentSearchGraphic.geometry);
                this.__displayResultData();
            },
            __displayResultData: function () {
                this.showResultsContainer();
                this.hideProgressBar();
                this.hideDuringSearchText();
                this.hideSearchActionsContainer();
            },
            activateDraw: function (mode) {
                this.drawManager.activateTaskingDraw(mode);
            },
            deactivateDraw: function () {
                this.drawManager.deactivateTaskingDraw();
                this.currentArchiveResponse = null;
                if(this.map.getLevel() < 10) {
                        domStyle.set(this.imageDiscoveryZoomError, "display", "block");
                        domStyle.set(this.imageDiscoveryMainFunctionality, "display", "none");
                }
                else {
                        domStyle.set(this.imageDiscoveryZoomError, "display", "none");
                        domStyle.set(this.imageDiscoveryMainFunctionality, "display", "block");
                }
            },            
            reviewAndSubmitOrder: function () {
                if (!this.resultsWidget || this.checkoutClickDisabled) {
                    return;
                }
                this.resultsWidget.clearTooltips();
                var cartItems = this.resultsWidget.getCartItems();
                //todo: review and submit
                this.resultsWidget.hideDetailsWidget();
                if (cartItems && cartItems.archive && cartItems.archive.length) {
                    this.checkoutWidget.handleStartCheckout(cartItems.archive).then(
                        lang.hitch(this, this._startCheckout),
                        lang.hitch(this, this._handleCheckoutCancel));
                }
                this.resultsWidget.closeCurrentResultPopup();
            },
            _handleCartCountChanged: function (count) {
                if (count < 1) {
                    this.hideReviewAndSubmitButton();
                }
                else {
                    this.showReviewAndSubmitButton();
                }
                this.updateOrderItemsCount(count);
            },
            hasDownloadService: function () {
                return this.config && this.config.imageryDownloadService && this.config.imageryDownloadService.url;
            }
        });
    });
